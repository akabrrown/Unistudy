'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  FileText,
  Sparkles,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Download,
  WifiOff,
  ArrowDown,
} from 'lucide-react';
import { toast } from 'sonner';

interface GradingReport {
  score: number;
  grade: string;
  thesis_score?: number;
  evidence_score?: number;
  structure_score?: number;
  grammar_score?: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  grammar: string;
  perfect_essay: string;
}

export default function EssayGraderPage() {
  const [prompt, setPrompt] = useState('');
  const [essay, setEssay] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [report, setReport] = useState<GradingReport | null>(null);
  const [copiedPerfect, setCopiedPerfect] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const modelEssayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOffline(!navigator.onLine);
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleGrade = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setErrorMsg('You appear to be offline. Reconnect to grade your essay.');
      toast.error('Offline: internet connection required to grade essays.');
      return;
    }
    if (prompt.trim().length < 10) {
      toast.error('Please enter a prompt/topic of at least 10 characters');
      return;
    }
    if (essay.trim().length < 50) {
      toast.error('Essay is too short to grade (minimum 50 characters)');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setReport(null);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      const res = await fetch('/api/ai/grade-essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, essay }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to grade essay');

      setReport(data.report);
      toast.success('Essay graded & 100/100 model essay generated!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to grade essay';
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPerfectEssay = async () => {
    if (!report?.perfect_essay) return;
    try {
      await navigator.clipboard.writeText(report.perfect_essay);
      setCopiedPerfect(true);
      toast.success('Copied 100/100 model essay to clipboard');
      setTimeout(() => setCopiedPerfect(false), 2000);
    } catch {
      toast.error('Unable to access clipboard');
    }
  };

  const handleDownloadPerfectEssay = () => {
    if (!report?.perfect_essay) return;
    const content = `Prompt: ${prompt.trim()}\n\n--- 100/100 Model Essay ---\n\n${report.perfect_essay}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'perfect-100-essay.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleToggleSpeech = () => {
    if (!report?.perfect_essay) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(report.perfect_essay);
    utterance.rate = 0.98;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const scrollToModelEssay = () => {
    modelEssayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const perfectParagraphs = report?.perfect_essay
    ? report.perfect_essay
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  const perfectWordCount = report?.perfect_essay
    ? report.perfect_essay.split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            Essay Grader
          </h1>
          <p className="text-muted-foreground mt-1">
            Get instant, university-level rubric feedback plus a complete 100/100 model essay revision.
          </p>
        </div>
        {isOffline && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-medium">
            <WifiOff className="w-4 h-4" />
            Offline mode detected
          </div>
        )}
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
                <span className="text-xs text-muted-foreground">
                  {essay.split(/\s+/).filter((w) => w.length > 0).length} words
                </span>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleGrade}
              disabled={loading || !prompt || !essay}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {loading ? 'Grading & Crafting 100/100 Essay...' : 'Grade My Essay'}
            </Button>
          </div>
        </div>

        {/* Output Column */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col h-full min-h-[600px]">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
            <h2 className="text-lg font-semibold">Grading Report</h2>
            {report?.perfect_essay && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={scrollToModelEssay}
                className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                View 100/100 Essay
                <ArrowDown className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="font-medium text-foreground">Analyzing arguments...</p>
              <p className="text-xs mt-1">Evaluating rubric criteria and drafting 100/100 exemplar</p>
            </div>
          ) : errorMsg ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Could not complete grading</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={handleGrade} disabled={isOffline}>
                Try Again
              </Button>
            </div>
          ) : report ? (
            <div className="flex-1 space-y-6 overflow-y-auto pr-2">
              <div className="flex items-center gap-6 p-6 rounded-xl bg-subtle/50 border border-border">
                <div className="flex flex-col items-center justify-center w-24 h-24 rounded-full border-4 border-primary bg-background shrink-0">
                  <span className="text-3xl font-bold text-primary">{report.grade}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{report.score}/100</h3>
                  <p className="text-sm text-muted-foreground mt-1">Estimated Grade</p>
                </div>
              </div>

              {(report.thesis_score !== undefined ||
                report.evidence_score !== undefined ||
                report.structure_score !== undefined ||
                report.grammar_score !== undefined) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { label: 'Thesis', value: report.thesis_score },
                    { label: 'Evidence', value: report.evidence_score },
                    { label: 'Structure', value: report.structure_score },
                    { label: 'Grammar', value: report.grammar_score },
                  ]
                    .filter((item) => typeof item.value === 'number')
                    .map((item) => (
                      <div key={item.label} className="rounded-lg border border-border bg-background/60 px-3 py-2 text-center">
                        <div className="text-base font-bold text-foreground">{item.value}%</div>
                        <div className="text-[11px] text-muted-foreground">{item.label}</div>
                      </div>
                    ))}
                </div>
              )}

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
                    {report.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" /> Areas for Improvement
                  </h4>
                  <ul className="list-disc list-inside text-sm text-red-800 dark:text-red-300 space-y-1">
                    {report.weaknesses.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
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
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Paste your essay and prompt on the left</p>
                <p className="text-xs mt-1">
                  Your detailed grading report and 100/100 model essay will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 100/100 Model Essay Card */}
      {report?.perfect_essay && (
        <div
          ref={modelEssayRef}
          className="bg-card border border-emerald-500/30 rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 bg-emerald-500/10 border-b border-emerald-500/20">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">100/100 Model Essay</h2>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    100 / 100 Benchmark
                  </span>
                  <span className="text-xs text-muted-foreground">{perfectWordCount} words</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Exemplary A+ version demonstrating sharpened thesis framing, analytical evidence, counterargument synthesis, and academic polish.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleSpeech}
                className="gap-1.5"
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {isSpeaking ? 'Stop' : 'Listen'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyPerfectEssay}
                className="gap-1.5"
              >
                {copiedPerfect ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copiedPerfect ? 'Copied' : 'Copy'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadPerfectEssay}
                className="gap-1.5"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-5 bg-background/40 select-text">
            {perfectParagraphs.map((paragraph, idx) => (
              <p
                key={idx}
                className="text-sm sm:text-base text-foreground/95 leading-7 font-serif tracking-[0.005em]"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
