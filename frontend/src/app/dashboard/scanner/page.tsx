'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Camera,
  UploadCloud,
  FileText,
  Loader2,
  Copy,
  Check,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sigma,
  Table2,
  BookOpen,
  ListChecks,
  Columns2,
  Eye,
  Code2,
  Clock,
  ClipboardPaste,
  FileCode2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api/client';
import { cn } from '@/lib/utils';

type ScanMode = 'full' | 'equations' | 'tables' | 'summary';
type StudioViewMode = 'preview' | 'split' | 'raw';

interface ScanHistoryItem {
  id: string;
  title: string;
  mode: ScanMode;
  markdown: string;
  equationCount: number;
  wordCount: number;
  createdAt: string;
}

const STORAGE_KEY = 'unistudy_scanner_history_v1';

const SCAN_MODES: {
  id: ScanMode;
  label: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'full',
    label: 'Full Lecture Notes',
    badge: 'Markdown + KaTeX',
    description: 'Preserves headings, bullet hierarchies, GFM tables, and inline/block formulas.',
    icon: BookOpen,
  },
  {
    id: 'equations',
    label: 'STEM Equations & Proofs',
    badge: 'LaTeX Focus',
    description: 'Prioritizes symbolic derivations, matrices, integrals, and multi-line proofs.',
    icon: Sigma,
  },
  {
    id: 'tables',
    label: 'Tables & Data Grids',
    badge: 'GFM Tables',
    description: 'Converts handwritten comparison charts, lab logs, and matrices into Markdown tables.',
    icon: Table2,
  },
  {
    id: 'summary',
    label: 'Notes + Exam Takeaways',
    badge: 'Revision Ready',
    description: 'Transcribes the page verbatim and appends a structured exam takeaway summary.',
    icon: ListChecks,
  },
];

const SAMPLE_STEM_TRANSCRIPTION = `## Lecture 07: Fourier Transform & Damped Harmonic Oscillators

### 1. Second-Order Differential Equation of Motion
For a mass $m$ attached to a spring of stiffness $k$ with viscous damping coefficient $b$, Newton's second law yields:

$$m\\frac{d^2x}{dt^2} + b\\frac{dx}{dt} + kx = 0$$

Dividing through by $m$ and defining the natural angular frequency $\\omega_0 = \\sqrt{\\frac{k}{m}}$ and damping parameter $\\gamma = \\frac{b}{2m}$:

$$\\ddot{x} + 2\\gamma\\dot{x} + \\omega_0^2 x = 0$$

### 2. Regime Classification Table

| Damping Regime | Condition | Characteristic Roots $r_{1,2}$ | Physical Behavior |
| :--- | :--- | :--- | :--- |
| **Underdamped** | $\\gamma < \\omega_0$ | $-\\gamma \\pm i\\omega_d$ | Decaying sinusoidal oscillation with $\\omega_d = \\sqrt{\\omega_0^2 - \\gamma^2}$ |
| **Critically Damped** | $\\gamma = \\omega_0$ | $-\\gamma, -\\gamma$ | Fastest return to equilibrium without overshoot |
| **Overdamped** | $\\gamma > \\omega_0$ | $-\\gamma \\pm \\sqrt{\\gamma^2 - \\omega_0^2}$ | Slow exponential decay with two real time constants |

### 3. Continuous Fourier Transform Pair
To analyze driven frequency response in the spectral domain $\\omega$:

$$\\hat{f}(\\omega) = \\int_{-\\infty}^{\\infty} f(t)\\,e^{-i\\omega t}\\,dt, \\qquad f(t) = \\frac{1}{2\\pi}\\int_{-\\infty}^{\\infty} \\hat{f}(\\omega)\\,e^{i\\omega t}\\,d\\omega$$

- **Parseval's Energy Theorem:** Total energy in the time domain equals spectral energy:
  $$\\int_{-\\infty}^{\\infty} |f(t)|^2\\,dt = \\frac{1}{2\\pi}\\int_{-\\infty}^{\\infty} |\\hat{f}(\\omega)|^2\\,d\\omega$$
`;

function extractLatexSnips(markdown: string): { raw: string; isBlock: boolean }[] {
  if (!markdown.trim()) return [];
  const results: { raw: string; isBlock: boolean }[] = [];
  const seen = new Set<string>();

  const blockRegex = /\$\$([\s\S]+?)\$\$/g;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(markdown)) !== null) {
    const formula = match[1].trim();
    if (formula && !seen.has(formula)) {
      seen.add(formula);
      results.push({ raw: formula, isBlock: true });
    }
  }

  const withoutBlocks = markdown.replace(/\$\$[\s\S]+?\$\$/g, '');
  const inlineRegex = /\$([^\n$]+?)\$/g;
  while ((match = inlineRegex.exec(withoutBlocks)) !== null) {
    const formula = match[1].trim();
    if (formula && formula.length > 2 && !seen.has(formula)) {
      seen.add(formula);
      results.push({ raw: formula, isBlock: false });
    }
  }

  return results.slice(0, 16);
}

function inferScanTitle(markdown: string, fallbackName?: string): string {
  const headingMatch = markdown.match(/^#{1,3}\s+(.+)$/m);
  if (headingMatch?.[1]) {
    return headingMatch[1].replace(/[*_`#]/g, '').trim().slice(0, 64);
  }
  const firstLine = markdown
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 3);
  if (firstLine) {
    return firstLine.replace(/[*_`#$]/g, '').trim().slice(0, 64);
  }
  return fallbackName || 'Handwritten Note Scan';
}

async function normalizeUploadImageFile(file: File): Promise<{ file: File; previewUrl: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawDataUrl) {
        resolve({ file, previewUrl: URL.createObjectURL(file) });
        return;
      }

      const isStandardSmall =
        file.size <= 1_000_000 && /^image\/(png|jpeg|jpg|webp)$/i.test(file.type);
      if (isStandardSmall) {
        resolve({ file, previewUrl: rawDataUrl });
        return;
      }

      const img = new window.Image();
      img.onload = () => {
        try {
          const maxDim = 1800;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ file, previewUrl: rawDataUrl });
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.86);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve({ file, previewUrl: compressedDataUrl });
                return;
              }
              const cleanName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
              const normalizedFile = new File([blob], cleanName, { type: 'image/jpeg' });
              resolve({ file: normalizedFile, previewUrl: compressedDataUrl });
            },
            'image/jpeg',
            0.86
          );
        } catch {
          resolve({ file, previewUrl: rawDataUrl });
        }
      };
      img.onerror = () => {
        resolve({ file, previewUrl: rawDataUrl });
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export default function NotesScannerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('full');
  const [viewMode, setViewMode] = useState<StudioViewMode>('preview');
  const [transcription, setTranscription] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ScanHistoryItem[];
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 12);
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return [];
  });
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const persistHistory = useCallback((next: ScanHistoryItem[]) => {
    setHistory(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 12)));
    } catch {
      // Ignore quota errors
    }
  }, []);

  const processSelectedFile = useCallback(async (rawFile: File | null | undefined) => {
    if (!rawFile) return;
    if (!rawFile.type.startsWith('image/')) {
      setError('Please upload a valid PNG, JPEG, or WebP image.');
      toast.error('Please upload a valid PNG, JPEG, or WebP image.');
      return;
    }
    if (rawFile.size > 12 * 1024 * 1024) {
      setError('Image exceeds 12 MB. Please select a smaller photo or screenshot.');
      toast.error('Image exceeds 12 MB.');
      return;
    }

    setError(null);
    setZoom(100);
    setRotation(0);
    const { file: normalizedFile, previewUrl } = await normalizeUploadImageFile(rawFile);
    setFile(normalizedFile);
    setPreview(previewUrl);
  }, []);

  useEffect(() => {
    const onWindowPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const pastedFile = item.getAsFile();
          if (pastedFile) {
            processSelectedFile(pastedFile);
            toast('Image pasted from clipboard');
            break;
          }
        }
      }
    };
    window.addEventListener('paste', onWindowPaste);
    return () => window.removeEventListener('paste', onWindowPaste);
  }, [processSelectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processSelectedFile(droppedFile);
    }
  };

  const handleScanNotes = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', scanMode);

      let resultText = '';

      // Primary route: Next.js /api/ai/scan-notes (supports mode directive & MixTeX normalization)
      try {
        const localRes = await fetch('/api/ai/scan-notes', {
          method: 'POST',
          body: formData,
        });
        if (localRes.ok) {
          const payload = (await localRes.json()) as { transcription?: string };
          if (payload?.transcription) {
            resultText = payload.transcription;
          }
        }
      } catch {
        // Fall back to Express backend /ai/scan-notes
      }

      if (!resultText) {
        const backendForm = new FormData();
        backendForm.append('file', file);
        const data = (await apiFetch('/ai/scan-notes', {
          method: 'POST',
          body: backendForm,
        })) as { transcription?: string };
        if (data?.transcription) {
          resultText = data.transcription;
        }
      }

      if (!resultText.trim()) {
        throw new Error('Could not transcribe image. Please ensure handwriting is legible and retry.');
      }

      setTranscription(resultText);

      const snips = extractLatexSnips(resultText);
      const words = resultText
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;

      const entry: ScanHistoryItem = {
        id: `scan-${Date.now()}`,
        title: inferScanTitle(resultText, file.name),
        mode: scanMode,
        markdown: resultText,
        equationCount: snips.length,
        wordCount: words,
        createdAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      };

      persistHistory([entry, ...history.slice(0, 11)]);
      toast.success('Notes transcribed into Markdown & LaTeX');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to scan notes';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const latexSnips = useMemo(() => extractLatexSnips(transcription), [transcription]);

  const docStats = useMemo(() => {
    const trimmed = transcription.trim();
    if (!trimmed) {
      return { words: 0, chars: 0, lines: 0, readMins: 0 };
    }
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    const chars = trimmed.length;
    const lines = trimmed.split('\n').length;
    const readMins = Math.max(1, Math.ceil(words / 180));
    return { words, chars, lines, readMins };
  }, [transcription]);

  const triggerCopy = async (text: string, key: string, label: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(label);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1800);
    } catch {
      toast.error('Clipboard access unavailable');
    }
  };

  const handleDownload = (ext: 'md' | 'tex') => {
    if (!transcription.trim()) return;
    const baseTitle = inferScanTitle(transcription, file?.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'scanned-notes';

    const content =
      ext === 'tex'
        ? [
            '\\documentclass[11pt]{article}',
            '\\usepackage{amsmath,amssymb,amsfonts,booktabs,geometry}',
            '\\geometry{margin=1in}',
            '\\begin{document}',
            '',
            transcription,
            '',
            '\\end{document}',
          ].join('\n')
        : transcription;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseTitle}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadSample = () => {
    setError(null);
    setTranscription(SAMPLE_STEM_TRANSCRIPTION);
    toast('Loaded sample STEM lecture transcription');
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setTranscription('');
    setError(null);
    setZoom(100);
    setRotation(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    persistHistory(history.filter((item) => item.id !== id));
  };

  return (
    <div className="max-w-[1380px] mx-auto pb-12 space-y-5">
      {/* Studio Command Header */}
      <header className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-wider text-[11px] text-primary font-semibold">
              Optical STEM Studio
            </span>
            <span aria-hidden="true">/</span>
            <span>MixTeX LaTeX + GFM Markdown Digitizer</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Camera className="w-6 h-6 text-primary" strokeWidth={1.75} />
            Handwritten Notes &amp; STEM Scanner
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Convert whiteboard photos, handwritten derivations, and lab tables into editable Markdown
            and KaTeX-ready LaTeX with zero hallucinated facts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted px-3.5 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
          >
            <Sigma className="w-3.5 h-3.5 text-primary" />
            Load STEM Sample
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 px-3.5 py-2 text-xs font-semibold text-primary transition-colors cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Select Page Image
          </button>

          {(file || transcription) && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background hover:bg-muted px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </header>

      {/* 4-Tile Live OCR Telemetry Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Vision Engine
            </p>
            <p className="text-sm font-bold text-foreground mt-0.5">MixTeX + Gemini OCR</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Strict T=0.1 Verbatim Mode</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <FileCode2 className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Detected Equations
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {latexSnips.length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {latexSnips.filter((s) => s.isBlock).length} display ·{' '}
              {latexSnips.filter((s) => !s.isBlock).length} inline
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Sigma className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Document Volume
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {docStats.words} <span className="text-xs font-normal text-muted-foreground">words</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {docStats.chars} chars · ~{docStats.readMins} min study
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Session Archive
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {history.length} <span className="text-xs font-normal text-muted-foreground">pages</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Saved in browser storage</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* Main 12-Column Side-by-Side Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (5 cols): Source Page Capture, Mode Selector & History */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Extraction Mode Selector */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                1. OCR Extraction Profile
              </h2>
              <span className="text-[11px] text-muted-foreground font-mono">
                KaTeX $ / $$ Normalized
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SCAN_MODES.map((m) => {
                const Icon = m.icon;
                const active = scanMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setScanMode(m.id)}
                    className={cn(
                      'text-left rounded-xl border p-3 transition-all cursor-pointer flex flex-col justify-between gap-1.5',
                      active
                        ? 'border-primary bg-primary/8 shadow-xs'
                        : 'border-border/70 bg-background/60 hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Icon className={cn('w-3.5 h-3.5', active ? 'text-primary' : 'text-muted-foreground')} />
                        {m.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                      {m.description}
                    </p>
                    <span className="text-[10px] font-mono text-primary/90 font-medium">
                      {m.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Source Image Dropzone & Inspector */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                2. Source Page Inspector
              </h2>

              {preview && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(75, z - 25))}
                    title="Zoom out"
                    className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono tabular-nums px-1.5 text-muted-foreground">
                    {zoom}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(200, z + 25))}
                    title="Zoom in"
                    className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    title="Rotate 90°"
                    className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => {
                if (!preview) fileInputRef.current?.click();
              }}
              className={cn(
                'relative rounded-xl border-2 border-dashed transition-all min-h-[290px] flex flex-col items-center justify-center overflow-hidden',
                isDragging
                  ? 'border-primary bg-primary/10'
                  : preview
                  ? 'border-border bg-muted/20 p-3'
                  : 'border-border/80 bg-muted/15 hover:bg-muted/30 cursor-pointer p-6 text-center'
              )}
            >
              {preview ? (
                <div className="w-full h-full flex flex-col items-center justify-center overflow-auto max-h-[360px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Handwritten note preview"
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      transformOrigin: 'center center',
                    }}
                    className="max-h-[310px] object-contain rounded-lg transition-transform duration-150"
                  />
                </div>
              ) : (
                <div className="space-y-3 max-w-xs">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Drop handwritten page or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports PNG, JPG, WebP · Auto-compresses large camera photos
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
                    <ClipboardPaste className="w-3.5 h-3.5 text-primary" />
                    Press Ctrl+V anywhere to paste screenshot
                  </div>
                </div>
              )}
            </div>

            {file && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/25 px-3 py-2 text-xs">
                <div className="truncate">
                  <p className="font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {(file.size / 1024).toFixed(1)} KB · {file.type || 'image/jpeg'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium cursor-pointer"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                    }}
                    className="p-1.5 rounded-lg border border-border bg-background hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                    title="Remove image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              disabled={!file || loading}
              onClick={handleScanNotes}
              className={cn(
                'w-full rounded-xl py-2.5 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                !file || loading
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:opacity-95 cursor-pointer shadow-xs'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Digitizing Handwriting &amp; Equations...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  Scan &amp; Transcribe Page
                </>
              )}
            </button>
          </div>

          {/* 3. Recent Session Scans Shelf */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                3. Recent Scans Archive
              </h2>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => persistHistory([])}
                  className="text-[11px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border/60 rounded-xl">
                Scanned pages in this session will be archived here for instant recall.
              </p>
            ) : (
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-xl border border-border/70 bg-background/60 hover:bg-muted/40 p-2.5 flex items-center justify-between gap-2 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setTranscription(item.markdown);
                        setScanMode(item.mode);
                      }}
                      className="text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {item.createdAt} · {item.wordCount} words · {item.equationCount} eqs
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteHistoryItem(item.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive opacity-70 group-hover:opacity-100 cursor-pointer"
                      title="Remove from archive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 cols): Mathpix-Style Dual-Mode Output & Formula Snip Studio */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-4">
            {/* Output Studio Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/70">
              <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1 self-start">
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                    viewMode === 'preview'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Rendered
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                    viewMode === 'split'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  Split Studio
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('raw')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                    viewMode === 'raw'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Raw Markdown / LaTeX
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!transcription.trim()}
                  onClick={() =>
                    triggerCopy(transcription, 'all-md', 'Copied full Markdown & LaTeX')
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background hover:bg-muted disabled:opacity-40 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                >
                  {copiedKey === 'all-md' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  Copy Markdown
                </button>

                <button
                  type="button"
                  disabled={!transcription.trim()}
                  onClick={() => handleDownload('md')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background hover:bg-muted disabled:opacity-40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  .MD
                </button>

                <button
                  type="button"
                  disabled={!transcription.trim()}
                  onClick={() => handleDownload('tex')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background hover:bg-muted disabled:opacity-40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  .TEX
                </button>
              </div>
            </div>

            {/* Document Viewport */}
            {loading ? (
              <div className="min-h-[430px] rounded-xl border border-border/70 bg-background/50 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Running MixTeX Vision OCR (Temperature 0.1)...
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Extracting headings, GFM tables, and normalizing inline ($...$) and block
                    ($$...$$) LaTeX equations.
                  </p>
                </div>
              </div>
            ) : !transcription.trim() ? (
              <div className="min-h-[430px] rounded-xl border border-dashed border-border/80 bg-background/40 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-base font-semibold text-foreground">
                    Ready to Digitize Handwritten Notes
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Upload or paste a photo of your lecture notebook, whiteboard derivation, or
                    worked problem sheet on the left, or load the sample STEM page to inspect live
                    KaTeX rendering and equation snips.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3.5 py-2 text-xs font-semibold cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Upload Note Photo
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background hover:bg-muted px-3.5 py-2 text-xs font-semibold text-foreground cursor-pointer"
                  >
                    <Sigma className="w-3.5 h-3.5 text-primary" />
                    Inspect Sample STEM Output
                  </button>
                </div>
              </div>
            ) : viewMode === 'preview' ? (
              <div className="min-h-[430px] max-h-[620px] overflow-y-auto rounded-xl border border-border/80 bg-background p-5 sm:p-6">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {transcription}
                  </ReactMarkdown>
                </div>
              </div>
            ) : viewMode === 'raw' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground px-1">
                  <span>Editable Markdown + LaTeX Source</span>
                  <span>
                    {docStats.lines} lines · {docStats.chars} chars
                  </span>
                </div>
                <textarea
                  value={transcription}
                  onChange={(e) => setTranscription(e.target.value)}
                  spellCheck={false}
                  className="w-full min-h-[430px] max-h-[620px] rounded-xl border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[430px]">
                <div className="flex flex-col">
                  <span className="text-[11px] font-mono text-muted-foreground mb-1.5 px-1">
                    Markdown / LaTeX Source
                  </span>
                  <textarea
                    value={transcription}
                    onChange={(e) => setTranscription(e.target.value)}
                    spellCheck={false}
                    className="flex-1 min-h-[410px] max-h-[580px] rounded-xl border border-border bg-background p-3.5 font-mono text-xs leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-mono text-muted-foreground mb-1.5 px-1">
                    Live KaTeX &amp; GFM Preview
                  </span>
                  <div className="flex-1 min-h-[410px] max-h-[580px] overflow-y-auto rounded-xl border border-border bg-background p-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {transcription}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Extracted LaTeX Formula Snip Inspector (Mathpix-style) */}
          {latexSnips.length > 0 && (
            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Sigma className="w-3.5 h-3.5 text-primary" />
                    Extracted LaTeX Formula Snips ({latexSnips.length})
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Click any detected equation to copy its raw LaTeX expression for Overleaf, Anki,
                    or the Math Solver.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    triggerCopy(
                      latexSnips.map((s) => (s.isBlock ? `$$${s.raw}$$` : `$${s.raw}$`)).join('\n\n'),
                      'all-eqs',
                      'Copied all extracted equations'
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background hover:bg-muted px-3 py-1.5 text-xs font-semibold text-foreground cursor-pointer shrink-0"
                >
                  {copiedKey === 'all-eqs' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  Copy All Equations
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                {latexSnips.map((snip, idx) => {
                  const snipKey = `snip-${idx}`;
                  return (
                    <button
                      key={snipKey}
                      type="button"
                      onClick={() =>
                        triggerCopy(snip.raw, snipKey, 'Copied LaTeX formula to clipboard')
                      }
                      className="group text-left rounded-xl border border-border/70 bg-background/70 hover:border-primary/50 hover:bg-muted/30 p-3 transition-all cursor-pointer flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold">
                          {snip.isBlock ? 'Display $$' : 'Inline $'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-primary font-mono">
                          {copiedKey === snipKey ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy LaTeX
                            </>
                          )}
                        </span>
                      </div>

                      <div className="overflow-x-auto py-1 text-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {snip.isBlock ? `$$${snip.raw}$$` : `$${snip.raw}$`}
                        </ReactMarkdown>
                      </div>

                      <code className="text-[11px] font-mono text-muted-foreground truncate block bg-muted/40 rounded px-2 py-1">
                        {snip.raw}
                      </code>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
