'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface GradingReport {
  score: number;
  grade: string;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  grammar: string;
}

export default function EssayGraderPage() {
  const [prompt, setPrompt] = useState('');
  const [essay, setEssay] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<GradingReport | null>(null);

  const handleGrade = async () => {
    if (prompt.trim().length < 10) {
      toast.error('Please enter a valid prompt/topic');
      return;
    }
    if (essay.trim().length < 50) {
      toast.error('Essay is too short to grade');
      return;
    }

    setLoading(true);
    setReport(null);

    try {
      const res = await fetch('/api/ai/grade-essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, essay }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to grade essay');

      setReport(data.report);
      toast.success('Essay graded successfully!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-amber-500" />
          AI Essay Grader
        </h1>
        <p className="text-muted-foreground mt-1">Get instant, university-level feedback on your essays and assignments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Column */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Essay Prompt / Topic</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., Discuss the impact of the Industrial Revolution on modern society."
                className="w-full bg-background border border-border rounded-lg p-3 h-24 focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Your Essay</label>
              <textarea 
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder="Paste your essay here..."
                className="w-full bg-background border border-border rounded-lg p-3 h-96 focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
              <div className="flex justify-end mt-1">
                <span className="text-xs text-muted-foreground">{essay.split(/\s+/).filter(w => w.length > 0).length} words</span>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleGrade}
              disabled={loading || !prompt || !essay}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {loading ? 'Grading...' : 'Grade My Essay'}
            </Button>
          </div>
        </div>

        {/* Output Column */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col h-full min-h-[600px]">
          <h2 className="text-lg font-semibold mb-4 border-b border-border pb-2">Grading Report</h2>
          
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p>Analyzing arguments...</p>
              <p className="text-xs mt-1">Checking grammar and structure</p>
            </div>
          ) : report ? (
            <div className="flex-1 space-y-6 overflow-y-auto pr-2">
              <div className="flex items-center gap-6 p-6 rounded-xl bg-subtle/50 border border-border">
                <div className="flex flex-col items-center justify-center w-24 h-24 rounded-full border-4 border-primary bg-background">
                  <span className="text-3xl font-bold text-primary">{report.grade}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{report.score}/100</h3>
                  <p className="text-sm text-muted-foreground mt-1">Estimated Grade</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                  Overall Feedback
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {report.feedback}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4" /> Strengths
                  </h4>
                  <ul className="list-disc list-inside text-sm text-green-800 dark:text-green-300 space-y-1">
                    {report.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" /> Areas for Improvement
                  </h4>
                  <ul className="list-disc list-inside text-sm text-red-800 dark:text-red-300 space-y-1">
                    {report.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Grammar & Tone</h4>
                <p className="text-sm text-muted-foreground bg-subtle p-3 rounded-lg">
                  {report.grammar}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-center">
              <div>
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Paste your essay and prompt on the left</p>
                <p className="text-xs mt-1">Your detailed grading report will appear here.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
