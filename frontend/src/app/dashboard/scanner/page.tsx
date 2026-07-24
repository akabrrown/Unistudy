'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileText, Loader2, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api/client';

export default function NotesScannerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setTranscription('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await apiFetch('/ai/scan-notes', {
        method: 'POST',
        body: formData,
      });

      setTranscription(data.transcription);
      toast('Notes successfully transcribed!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcription);
    toast('Copied to clipboard');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary">Handwritten Notes Scanner</h1>
          <p className="text-muted-foreground mt-1">Upload a photo of your handwriting, and AI will digitize it instantly.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Column */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">1. Upload Image</h2>
          
          <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center bg-subtle/30 text-center relative hover:bg-subtle transition-colors cursor-pointer min-h-[300px]">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-[250px] object-contain rounded-lg" />
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-sm font-medium">Click or drag image here</p>
                <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG</p>
              </div>
            )}
          </div>

          <Button 
            className="w-full mt-4" 
            disabled={!file || loading}
            onClick={handleUpload}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            {loading ? 'Transcribing with Gemini...' : 'Scan Notes'}
          </Button>
        </div>

        {/* Result Column */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">2. Digital Output</h2>
            {transcription && (
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="w-4 h-4 mr-2" /> Copy
              </Button>
            )}
          </div>
          
          <div className="flex-1 bg-background border border-border rounded-xl p-6 overflow-y-auto min-h-[300px] max-h-[500px]">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p>AI is reading your handwriting...</p>
              </div>
            ) : transcription ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {transcription}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>Your digital notes will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
