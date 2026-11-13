'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  FileText,
  Award,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Download,
  WifiOff,
  Activity,
  RefreshCw,
  Columns2,
  SlidersHorizontal,
  BookOpen,
  Scale,
  Beaker,
  Globe2,
  Upload,
  Trash2,
  Clock,
  Eye,
  Edit3,
  ArrowRightLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { analyzeEssayDraftMetrics } from '../../../../../shared/lib/essayGrader';
import { cn } from '@/lib/utils';

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

type DisciplineId = 'humanities' | 'social' | 'stem' | 'law';
type EditorTab = 'write' | 'xray';
type OutputTab = 'rubric' | 'exemplar' | 'compare';

interface EssayHistoryEntry {
  id: string;
  prompt: string;
  essay: string;
  discipline: DisciplineId;
  report: GradingReport;
  modelUsed: string | null;
  timestamp: string;
}

const HISTORY_STORAGE_KEY = 'unistudy_essay_grader_history_v1';

const DISCIPLINE_PRESETS: {
  id: DisciplineId;
  label: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  samplePrompt: string;
  sampleEssay: string;
}[] = [
  {
    id: 'humanities',
    label: 'Humanities & History',
    badge: 'Historiography & Textual Evidence',
    icon: BookOpen,
    samplePrompt:
      'Evaluate the extent to which the printing press was the primary catalyst for the European Scientific Revolution between 1500 and 1700.',
    sampleEssay: `The invention of movable-type printing by Johannes Gutenberg in the mid-fifteenth century altered how knowledge circulated across Europe. Before the printing press, astronomical tables and anatomical treatises were copied by hand in monastic scriptoria, which introduced transcription errors and limited access to elite patrons. Once print shops emerged in Venice, Basel, and Nuremberg, scholars could compare identical editions of classical texts by Ptolemy and Galen against their own empirical observations.

However, attributing the Scientific Revolution solely to print technology overlooks the institutional and navigational pressures of the sixteenth century. Maritime expansion demanded accurate celestial navigation, motivating royal patronage of observatories and mathematical instruments such as the telescope and micrometer. Nicolaus Copernicus's De revolutionibus (1543) and Andreas Vesalius's De humani corporis fabrica (1543) owed their corrective power to standardized woodcut diagrams and reproducible data tables, yet those breakthroughs first required a methodological shift toward direct dissection and quantitative measurement.

In conclusion, the printing press operated as an indispensable multiplier rather than a solitary cause. By preventing the loss of incremental findings and enabling rapid peer refutation across national borders, print culture transformed isolated insights into a cumulative scientific enterprise.`,
  },
  {
    id: 'social',
    label: 'Social Sciences & Policy',
    badge: 'Empirical Causal Analysis',
    icon: Globe2,
    samplePrompt:
      'Critically assess whether unconditional cash transfers are more effective than in-kind subsidies at reducing rural poverty in Sub-Saharan Africa.',
    sampleEssay: `Unconditional cash transfers (UCTs) and in-kind subsidies represent two competing fiscal instruments for poverty alleviation across developing economies. Proponents of UCTs argue that liquidity-constrained households possess superior local information regarding their most urgent marginal needs, whether agricultural inputs, preventative healthcare, or school fees. Randomized evaluations in Kenya and Zambia demonstrate that mobile-money transfers increase household dietary diversity and livestock asset accumulation with lower administrative overhead than physical food distribution networks.

Conversely, in-kind provision remains necessary when rural markets suffer from severe supply inelasticity or transport bottlenecks. Injecting cash into isolated districts during seasonal grain shortages can trigger localized price inflation, eroding the real purchasing power of the transfer. Furthermore, targeted subsidies for fortified staples or antimalarial bed nets address positive externalities that individual household utility maximization may undervalue.

Ultimately, fiscal policy should pair baseline mobile cash transfers with targeted public-goods provisioning in infrastructure-poor regions, balancing household autonomy against market-supply constraints.`,
  },
  {
    id: 'stem',
    label: 'STEM & Technical Writing',
    badge: 'Methodology & Quantitative Precision',
    icon: Beaker,
    samplePrompt:
      'Discuss the trade-offs between lithium-iron-phosphate (LFP) and nickel-manganese-cobalt (NMC) cathode chemistries for grid-scale energy storage systems.',
    sampleEssay: `Grid-scale battery energy storage systems (BESS) require a different optimization profile from electric passenger vehicles, prioritizing cycle longevity, thermal runaway resistance, and levelized cost of storage (LCOS) over gravimetric energy density. Lithium-iron-phosphate (LiFePO4 or LFP) cathodes feature a strong covalent phosphorus-oxygen bond within an olivine crystal lattice, yielding a thermal runaway onset temperature near 270 degrees Celsius and sustaining over 6,000 deep charge-discharge cycles with minimal capacity fade.

By contrast, nickel-manganese-cobalt (NMC) layered oxides deliver higher specific energy (typically 220 to 260 Wh/kg at the cell level) and superior cold-weather discharge kinetics, but their reliance on cobalt and Class 1 nickel introduces supply-chain volatility and lower oxygen-release thresholds under overcharge faults. While NMC remains advantageous for weight-constrained mobility applications, stationary utility installations overwhelmingly favor LFP because land footprint is rarely the binding constraint compared to fire suppression safety and 15-year calendar life.`,
  },
  {
    id: 'law',
    label: 'Law & Argumentative',
    badge: 'Precedent & Counter-Argument',
    icon: Scale,
    samplePrompt:
      'Should strict liability apply to autonomous vehicle manufacturers when level-4 self-driving systems cause traffic collisions?',
    sampleEssay: `Traditional tort negligence frameworks allocate liability by evaluating whether a human driver breached the reasonable-person standard of care. As SAE Level 4 autonomous vehicles assume full operational control within designated operational design domains, proving discrete software negligence imposes prohibitive discovery burdens on injured plaintiffs who must audit proprietary neural-network weights and sensor-fusion logs.

Shifting to a strict products-liability regime internalizes accident costs onto the party best positioned to mitigate algorithmic risk through over-the-air updates and fleet-wide telemetry. Critics contend that blanket strict liability could chill safety-enhancing automation even when autonomous fleets statistically outperform human motorists. A balanced statutory framework should therefore impose rebuttable strict liability on manufacturers while establishing a statutory cap or comparative-fault carve-out when collisions result from third-party traffic violations or owner tampering.`,
  },
];

interface SentenceInspection {
  text: string;
  wordCount: number;
  severity: 'normal' | 'dense' | 'very_dense';
}

function analyzeSentencesForXRay(essayText: string): {
  paragraphs: SentenceInspection[][];
  denseCount: number;
  veryDenseCount: number;
  shortParagraphCount: number;
} {
  const trimmed = essayText.trim();
  if (!trimmed) {
    return { paragraphs: [], denseCount: 0, veryDenseCount: 0, shortParagraphCount: 0 };
  }

  let denseCount = 0;
  let veryDenseCount = 0;
  let shortParagraphCount = 0;

  const rawParas = trimmed
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const paragraphs = rawParas.map((para) => {
    const paraWords = para.split(/\s+/).filter(Boolean).length;
    if (paraWords < 40) shortParagraphCount++;

    const rawSentences = para.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [para];
    return rawSentences
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const wc = s.split(/\s+/).filter(Boolean).length;
        let severity: SentenceInspection['severity'] = 'normal';
        if (wc > 36) {
          severity = 'very_dense';
          veryDenseCount++;
        } else if (wc > 26) {
          severity = 'dense';
          denseCount++;
        }
        return { text: s, wordCount: wc, severity };
      });
  });

  return { paragraphs, denseCount, veryDenseCount, shortParagraphCount };
}

export default function EssayGraderPage() {
  const [discipline, setDiscipline] = useState<DisciplineId>('humanities');
  const [editorTab, setEditorTab] = useState<EditorTab>('write');
  const [outputTab, setOutputTab] = useState<OutputTab>('rubric');

  const [prompt, setPrompt] = useState('');
  const [essay, setEssay] = useState('');
  const [loading, setLoading] = useState(false);
  const [regeneratingEssay, setRegeneratingEssay] = useState(false);
  const [streamStage, setStreamStage] = useState<string | null>(null);
  const [streamEssayText, setStreamEssayText] = useState('');
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [report, setReport] = useState<GradingReport | null>(null);
  const [copiedPerfect, setCopiedPerfect] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [history, setHistory] = useState<EssayHistoryEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as EssayHistoryEntry[];
        if (Array.isArray(parsed)) return parsed.slice(0, 10);
      }
    } catch {
      // Ignore storage read errors
    }
    return [];
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const persistHistory = useCallback((next: EssayHistoryEntry[]) => {
    setHistory(next);
    try {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next.slice(0, 10)));
    } catch {
      // Ignore quota errors
    }
  }, []);

  const draftMetrics = useMemo(() => analyzeEssayDraftMetrics(essay), [essay]);
  const xrayData = useMemo(() => analyzeSentencesForXRay(essay), [essay]);
  const promptReady = prompt.trim().length >= 10;
  const essayReady = essay.trim().length >= 50;

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

  const saveReportToHistory = useCallback(
    (finalReport: GradingReport, activeModel: string | null) => {
      const entry: EssayHistoryEntry = {
        id: `essay-${Date.now()}`,
        prompt: prompt.trim(),
        essay: essay.trim(),
        discipline,
        report: finalReport,
        modelUsed: activeModel,
        timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      };
      setHistory((prev) => {
        const next = [entry, ...prev.slice(0, 9)];
        try {
          window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota
        }
        return next;
      });
    },
    [prompt, essay, discipline]
  );

  const consumeEssayStream = async (body: ReadableStream<Uint8Array>) => {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let receivedProgress = false;
    let completedNormally = false;
    let latestModel: string | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        const eventMatch = block.match(/^event:\s*(.+)$/m);
        const dataMatch = block.match(/^data:\s*(.+)$/m);
        if (!dataMatch) continue;

        const eventName = eventMatch ? eventMatch[1].trim() : 'message';
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(dataMatch[1]) as Record<string, unknown>;
        } catch {
          continue;
        }

        if (eventName === 'status' && typeof payload.message === 'string') {
          setStreamStage(payload.message);
        } else if (eventName === 'rubric' && payload.report) {
          receivedProgress = true;
          setReport(payload.report as GradingReport);
          if (typeof payload.modelUsed === 'string') {
            latestModel = payload.modelUsed;
            setModelUsed(payload.modelUsed);
          }
        } else if (eventName === 'essay_chunk' && typeof payload.delta === 'string') {
          receivedProgress = true;
          setStreamEssayText((prev) => prev + payload.delta);
        } else if (eventName === 'done') {
          receivedProgress = true;
          completedNormally = true;
          if (typeof payload.modelUsed === 'string') {
            latestModel = payload.modelUsed;
            setModelUsed(payload.modelUsed);
          }
          if (payload.report) {
            const doneReport = payload.report as GradingReport;
            setReport(doneReport);
            setStreamEssayText(doneReport.perfect_essay || '');
            saveReportToHistory(doneReport, latestModel);
            toast.success('Essay graded & 100/100 exemplar ready!');
          } else if (typeof payload.perfect_essay === 'string') {
            const cleanedEssay = payload.perfect_essay;
            setStreamEssayText(cleanedEssay);
            setReport((prev) => (prev ? { ...prev, perfect_essay: cleanedEssay } : prev));
            toast.success('100/100 exemplar regenerated from Areas for Improvement!');
          }
        } else if (eventName === 'error') {
          throw new Error(
            typeof payload.error === 'string' ? payload.error : 'Real-time grading failed'
          );
        }
      }
    }

    if (!completedNormally && !receivedProgress) {
      throw new Error('Real-time grading stream ended unexpectedly');
    }
  };

  const handleGrade = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setErrorMsg('You appear to be offline. Reconnect to grade your essay.');
      toast.error('Offline: internet connection required to grade essays.');
      return;
    }
    if (!promptReady) {
      toast.error('Please enter a prompt/topic of at least 10 characters');
      return;
    }
    if (!essayReady) {
      toast.error('Essay is too short to grade (minimum 50 characters)');
      return;
    }

    setLoading(true);
    setOutputTab('rubric');
    setStreamStage('Connecting to real-time academic rubric grader...');
    setStreamEssayText('');
    setModelUsed(null);
    setErrorMsg(null);
    setReport(null);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      const res = await fetch('/api/ai/grade-essay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ prompt, essay, stream: true }),
      });

      const contentType = res.headers.get('content-type') || '';

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Grading failed (${res.status})`);
      }

      if (contentType.includes('text/event-stream') && res.body) {
        await consumeEssayStream(res.body);
      } else {
        const data = await res.json();
        setReport(data.report);
        setStreamEssayText(data.report?.perfect_essay || '');
        if (data.modelUsed) setModelUsed(data.modelUsed);
        if (data.report) saveReportToHistory(data.report, data.modelUsed || null);
        toast.success('Essay graded & 100/100 model essay generated!');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to grade essay';
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setStreamStage(null);
    }
  };

  const handleRegenerateFromImprovements = async () => {
    if (!report || !promptReady || !essayReady || loading || regeneratingEssay) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error('Offline: internet connection required to regenerate essay.');
      return;
    }

    setRegeneratingEssay(true);
    setOutputTab('exemplar');
    setStreamStage('Regenerating 100/100 essay from Areas for Improvement...');
    setStreamEssayText('');
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      const res = await fetch('/api/ai/grade-essay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          prompt,
          essay,
          stream: true,
          mode: 'regenerate_essay',
          weaknesses: report.weaknesses,
          grammar: report.grammar,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Regeneration failed (${res.status})`);
      }

      if (contentType.includes('text/event-stream') && res.body) {
        await consumeEssayStream(res.body);
      } else {
        const data = await res.json();
        if (data.perfect_essay) {
          setStreamEssayText(data.perfect_essay);
          setReport((prev) => (prev ? { ...prev, perfect_essay: data.perfect_essay } : prev));
          toast.success('100/100 essay regenerated from Areas for Improvement!');
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to regenerate 100/100 essay');
    } finally {
      setRegeneratingEssay(false);
      setStreamStage(null);
    }
  };

  const displayedPerfectEssay = streamEssayText || report?.perfect_essay || '';

  const handleCopyPerfectEssay = async () => {
    if (!displayedPerfectEssay) return;
    try {
      await navigator.clipboard.writeText(displayedPerfectEssay);
      setCopiedPerfect(true);
      toast.success('Copied 100/100 model essay to clipboard');
      setTimeout(() => setCopiedPerfect(false), 2000);
    } catch {
      toast.error('Unable to access clipboard');
    }
  };

  const handleDownloadPerfectEssay = (ext: 'txt' | 'md' = 'md') => {
    if (!displayedPerfectEssay) return;
    const content =
      ext === 'md'
        ? `# Academic Essay Evaluation & 100/100 Exemplar\n\n## Assignment Prompt\n${prompt.trim()}\n\n## Score Summary\n- **Overall Score:** ${report?.score ?? 100}/100 (${report?.grade ?? 'A+'})\n- **Thesis & Argument:** ${report?.thesis_score ?? '--'}%\n- **Evidence & Rigor:** ${report?.evidence_score ?? '--'}%\n- **Structure & Flow:** ${report?.structure_score ?? '--'}%\n- **Grammar & Academic Tone:** ${report?.grammar_score ?? '--'}%\n\n## 100/100 Model Essay\n\n${displayedPerfectEssay}\n`
        : `Prompt: ${prompt.trim()}\n\n--- 100/100 Model Essay ---\n\n${displayedPerfectEssay}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `perfect-100-essay.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleToggleSpeech = () => {
    if (!displayedPerfectEssay) return;
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
    const utterance = new SpeechSynthesisUtterance(displayedPerfectEssay);
    utterance.rate = 0.98;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleLoadSamplePreset = (presetId?: DisciplineId) => {
    const targetId = presetId || discipline;
    const preset = DISCIPLINE_PRESETS.find((p) => p.id === targetId) || DISCIPLINE_PRESETS[0];
    setDiscipline(preset.id);
    setPrompt(preset.samplePrompt);
    setEssay(preset.sampleEssay);
    setErrorMsg(null);
    toast(`Loaded ${preset.label} sample prompt & draft`);
  };

  const handleUploadDraftFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;
    if (uploaded.size > 2 * 1024 * 1024) {
      toast.error('Text file exceeds 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEssay(reader.result.slice(0, 30000));
        toast.success(`Imported draft from ${uploaded.name}`);
      }
    };
    reader.readAsText(uploaded);
  };

  const handleReset = () => {
    setPrompt('');
    setEssay('');
    setReport(null);
    setStreamEssayText('');
    setErrorMsg(null);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const draftParagraphs = useMemo(
    () =>
      essay
        .trim()
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean),
    [essay]
  );

  const perfectParagraphs = useMemo(
    () =>
      displayedPerfectEssay
        ? displayedPerfectEssay
            .split(/\n{2,}/)
            .map((p) => p.trim())
            .filter(Boolean)
        : [],
    [displayedPerfectEssay]
  );

  const perfectWordCount = useMemo(
    () => (displayedPerfectEssay ? displayedPerfectEssay.split(/\s+/).filter(Boolean).length : 0),
    [displayedPerfectEssay]
  );

  const readabilityBadge = useMemo(() => {
    if (draftMetrics.words === 0) {
      return { label: 'Awaiting Draft', tone: 'text-muted-foreground' };
    }
    if (draftMetrics.avgWordsPerSentence > 28) {
      return { label: 'Dense Academic Syntax', tone: 'text-amber-500' };
    }
    if (draftMetrics.avgWordsPerSentence < 11) {
      return { label: 'Short / Fragmented Cadence', tone: 'text-amber-500' };
    }
    return { label: 'Optimal Academic Flow', tone: 'text-emerald-500' };
  }, [draftMetrics]);

  return (
    <div className="max-w-[1380px] mx-auto pb-12 space-y-5">
      {/* Studio Command Header */}
      <header className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-wider text-[11px] text-primary font-semibold">
              Academic Evaluation Suite
            </span>
            <span aria-hidden="true">/</span>
            <span>4-Axis Rubric Matrix + Live 100/100 Exemplar Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-primary" strokeWidth={1.75} />
            Essay Grader &amp; Exemplar Studio
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Evaluate drafts against university rubric criteria (Thesis, Evidence, Structure, Diction),
            inspect sentence-level readability, and stream a 100/100 honors revision side by side.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isOffline && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-medium">
              <WifiOff className="w-3.5 h-3.5" />
              Offline
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={handleUploadDraftFile}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted px-3.5 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-primary" />
            Import .TXT / .MD
          </button>

          <button
            type="button"
            onClick={() => handleLoadSamplePreset()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 px-3.5 py-2 text-xs font-semibold text-primary transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Load Sample Essay
          </button>

          {(prompt || essay || report) && (
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

      {/* 4-Tile Live Writing & Evaluation Telemetry Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Manuscript Volume
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {draftMetrics.words}{' '}
              <span className="text-xs font-normal text-muted-foreground">words</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {draftMetrics.paragraphs} paras · {draftMetrics.sentences} sentences · ~
              {draftMetrics.estimatedReadMinutes || 0}m read
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Sentence Cadence
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {draftMetrics.avgWordsPerSentence}{' '}
              <span className="text-xs font-normal text-muted-foreground">words/sent</span>
            </p>
            <p className={cn('text-[11px] font-medium mt-0.5', readabilityBadge.tone)}>
              {readabilityBadge.label}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Rubric Standing
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {report ? `${report.score}/100 (${report.grade})` : 'Unscored'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {loading
                ? streamStage || 'Evaluating live...'
                : report
                ? `${report.strengths.length} strengths · ${report.weaknesses.length} fixes`
                : promptReady && essayReady
                ? 'Ready for evaluation'
                : 'Enter prompt & 50+ char draft'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Award className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              100/100 Exemplar &amp; Archive
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {perfectWordCount > 0 ? `${perfectWordCount} words` : `${history.length} saved`}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {perfectWordCount > 0
                ? `${perfectParagraphs.length} paragraphs rewritten`
                : `${history.length} graded essays in archive`}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* Discipline Rubric Bar */}
      <section className="rounded-2xl border border-border/80 bg-card p-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono uppercase tracking-wider text-[11px] text-muted-foreground font-semibold">
            Discipline Lens:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {DISCIPLINE_PRESETS.map((preset) => {
              const Icon = preset.icon;
              const active = discipline === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDiscipline(preset.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                    active
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-border/70 bg-background/60 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleLoadSamplePreset(discipline)}
          className="text-xs font-mono text-primary hover:underline self-start md:self-auto cursor-pointer"
        >
          Load {DISCIPLINE_PRESETS.find((d) => d.id === discipline)?.label} example →
        </button>
      </section>

      {/* Main 12-Column Split Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (6 cols): Prompt Input, Manuscript Editor / Readability X-Ray, & History */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-4">
            {/* Assignment Prompt Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  1. Assignment Prompt / Question Rubric
                </label>
                <span
                  className={cn(
                    'text-[11px] font-mono tabular-nums',
                    promptReady ? 'text-emerald-500' : 'text-muted-foreground'
                  )}
                >
                  {prompt.trim().length}/4000 chars
                </span>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Paste the exact essay question, assignment prompt, or grading instructions..."
                className="w-full rounded-xl border border-border bg-background p-3 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y min-h-[84px] max-h-[180px]"
              />
            </div>

            {/* Editor Header & Write vs Readability X-Ray Switcher */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  2. Student Manuscript
                </label>

                <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
                  <button
                    type="button"
                    onClick={() => setEditorTab('write')}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                      editorTab === 'write'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Manuscript Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab('xray')}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                      editorTab === 'xray'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Readability X-Ray
                    {xrayData.denseCount + xrayData.veryDenseCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-mono">
                        {xrayData.denseCount + xrayData.veryDenseCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {editorTab === 'write' ? (
                <textarea
                  value={essay}
                  onChange={(e) => setEssay(e.target.value)}
                  placeholder="Write or paste your academic essay here (minimum 50 characters)..."
                  className="w-full rounded-xl border border-border bg-background p-4 text-xs sm:text-sm leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y min-h-[340px] max-h-[560px]"
                />
              ) : (
                <div className="rounded-xl border border-border bg-background p-4 min-h-[340px] max-h-[560px] overflow-y-auto space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/70 text-[11px]">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/25 border border-amber-500/50" />
                        Dense sentence (27–36 words): <strong>{xrayData.denseCount}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/25 border border-rose-500/50" />
                        Very dense (&gt;36 words): <strong>{xrayData.veryDenseCount}</strong>
                      </span>
                    </div>
                    <span className="font-mono text-muted-foreground">
                      Hemingway Syntax Inspector
                    </span>
                  </div>

                  {xrayData.paragraphs.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-12 text-center">
                      Enter your essay draft to inspect sentence length complexity and paragraph
                      balance.
                    </p>
                  ) : (
                    <div className="space-y-3.5 text-xs sm:text-sm leading-7">
                      {xrayData.paragraphs.map((sentences, pIdx) => (
                        <p key={pIdx} className="space-x-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mr-1.5 select-none">
                            ¶{pIdx + 1}
                          </span>
                          {sentences.map((sent, sIdx) => (
                            <span
                              key={sIdx}
                              title={`${sent.wordCount} words`}
                              className={cn(
                                'rounded px-1 py-0.5 transition-colors',
                                sent.severity === 'very_dense'
                                  ? 'bg-rose-500/15 text-foreground border-b border-rose-500/50'
                                  : sent.severity === 'dense'
                                  ? 'bg-amber-500/15 text-foreground border-b border-amber-500/50'
                                  : 'text-foreground/90'
                              )}
                            >
                              {sent.text}{' '}
                            </span>
                          ))}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Live Draft Readiness Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/25 px-3.5 py-2 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                  <span>
                    <strong className="text-foreground">{draftMetrics.words}</strong> words
                  </span>
                  <span>
                    <strong className="text-foreground">{draftMetrics.sentences}</strong> sents
                  </span>
                  <span>
                    <strong className="text-foreground">{draftMetrics.paragraphs}</strong> paras
                  </span>
                  <span>
                    <strong className="text-foreground">{ xrayData.denseCount + xrayData.veryDenseCount }</strong> long sents
                  </span>
                </div>

                <span
                  className={cn(
                    'inline-flex items-center gap-1 font-semibold text-[11px]',
                    promptReady && essayReady
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  )}
                >
                  <Activity className="w-3.5 h-3.5" />
                  {!promptReady
                    ? 'Prompt needs 10+ chars'
                    : !essayReady
                    ? `Add ${Math.max(0, 50 - essay.trim().length)} more chars`
                    : draftMetrics.hasMultiParagraphStructure
                    ? 'Multi-paragraph structure ready'
                    : 'Ready (tip: use 3+ paragraphs)'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGrade}
              disabled={loading || !promptReady || !essayReady}
              className={cn(
                'w-full rounded-xl py-2.5 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                loading || !promptReady || !essayReady
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:opacity-95 cursor-pointer shadow-xs'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {streamStage || 'Evaluating Rubric & Writing 100/100 Exemplar...'}
                </>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4" />
                  Evaluate Essay &amp; Generate 100/100 Exemplar
                </>
              )}
            </button>
          </div>

          {/* Evaluation History Shelf */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                3. Graded Essay Archive ({history.length})
              </h2>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => persistHistory([])}
                  className="text-[11px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                >
                  Clear Archive
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border/60 rounded-xl">
                Previously graded essays and their 100/100 exemplars will be saved here.
              </p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-xl border border-border/70 bg-background/60 hover:bg-muted/40 p-2.5 flex items-center justify-between gap-2 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setPrompt(item.prompt);
                        setEssay(item.essay);
                        setDiscipline(item.discipline);
                        setReport(item.report);
                        setStreamEssayText(item.report.perfect_essay || '');
                        setModelUsed(item.modelUsed);
                        setErrorMsg(null);
                      }}
                      className="text-left flex-1 min-w-0 cursor-pointer flex items-center gap-2.5"
                    >
                      <span className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary leading-none">
                          {item.report.grade}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground mt-0.5">
                          {item.report.score}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {item.prompt}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {item.timestamp} · {item.essay.split(/\s+/).filter(Boolean).length} words
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => persistHistory(history.filter((h) => h.id !== item.id))}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive opacity-70 group-hover:opacity-100 cursor-pointer"
                      title="Delete archived evaluation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (6 cols): Turnitin × Grammarly Rubric Scorecard, 100/100 Exemplar & Side-by-Side Diff */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-4 min-h-[600px] flex flex-col">
            {/* Output Studio Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/70">
              <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setOutputTab('rubric')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                    outputTab === 'rubric'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Rubric Scorecard
                </button>
                <button
                  type="button"
                  onClick={() => setOutputTab('exemplar')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                    outputTab === 'exemplar'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Award className="w-3.5 h-3.5 text-emerald-500" />
                  100/100 Exemplar
                  {perfectWordCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-mono">
                      Ready
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOutputTab('compare')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                    outputTab === 'compare'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  Draft vs 100/100
                </button>
              </div>

              <div className="flex items-center gap-2">
                {(loading || regeneratingEssay) && streamStage && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Streaming
                  </span>
                )}
                {!loading && modelUsed && (
                  <span className="text-[11px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                    {modelUsed}
                  </span>
                )}
              </div>
            </div>

            {/* Output Body */}
            {loading && !report ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                <Loader2 className="w-9 h-9 animate-spin text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {streamStage || 'Evaluating Academic Rubric Criteria...'}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Scoring thesis originality, empirical evidence, structural transitions, and
                    drafting your 100/100 benchmark essay.
                  </p>
                </div>
              </div>
            ) : errorMsg ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-sm font-semibold text-foreground">
                    Could not complete grading
                  </h3>
                  <p className="text-xs text-muted-foreground">{errorMsg}</p>
                </div>
                <button
                  type="button"
                  onClick={handleGrade}
                  disabled={isOffline}
                  className="rounded-xl border border-border bg-background hover:bg-muted px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  Retry Evaluation
                </button>
              </div>
            ) : !report ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-base font-semibold text-foreground">
                    University Rubric &amp; 100/100 Exemplar Studio
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Submit your prompt and draft on the left (or load one of the 4 academic
                    discipline samples above) to receive a 4-axis Turnitin-style rubric breakdown
                    plus a live-streamed 100/100 model revision.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleLoadSamplePreset()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background hover:bg-muted px-3.5 py-2 text-xs font-semibold text-foreground cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  Load Sample Essay to Preview
                </button>
              </div>
            ) : outputTab === 'rubric' ? (
              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {/* Score Banner + 4-Axis Rubric Bars */}
                <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl border-2 border-primary bg-background flex flex-col items-center justify-center shrink-0">
                        <span className="text-2xl font-bold text-primary leading-none">
                          {report.grade}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground mt-1">
                          GRADE
                        </span>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold font-mono tabular-nums text-foreground">
                            {report.score}/100
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Composite Rubric Score
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {DISCIPLINE_PRESETS.find((d) => d.id === discipline)?.label} Evaluation
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOutputTab('exemplar')}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer self-start sm:self-auto"
                    >
                      <Award className="w-3.5 h-3.5" />
                      Open 100/100 Exemplar →
                    </button>
                  </div>

                  {/* 4-Axis Progress Bars */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/70">
                    {[
                      { label: 'Thesis & Argument', value: report.thesis_score ?? report.score },
                      { label: 'Evidence & Rigor', value: report.evidence_score ?? report.score },
                      { label: 'Structure & Flow', value: report.structure_score ?? report.score },
                      { label: 'Grammar & Diction', value: report.grammar_score ?? report.score },
                    ].map((axis) => (
                      <div
                        key={axis.label}
                        className="rounded-xl border border-border/70 bg-background/70 p-2.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{axis.label}</span>
                          <span className="font-mono font-bold tabular-nums text-foreground">
                            {axis.value}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-300',
                              axis.value >= 85
                                ? 'bg-emerald-500'
                                : axis.value >= 70
                                ? 'bg-primary'
                                : 'bg-amber-500'
                            )}
                            style={{ width: `${Math.min(100, Math.max(0, axis.value))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Examiner Synthesis */}
                <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-1.5">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                    Examiner Narrative Critique
                  </h3>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    {report.feedback}
                  </p>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-3.5 space-y-2">
                    <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Demonstrated Strengths ({report.strengths.length})
                    </h4>
                    <ul className="space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200">
                      {report.strengths.map((s, i) => (
                        <li key={i} className="leading-snug flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 p-3.5 space-y-2">
                    <h4 className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Actionable Fixes ({report.weaknesses.length})
                    </h4>
                    <ul className="space-y-1.5 text-xs text-rose-900 dark:text-rose-200">
                      {report.weaknesses.map((w, i) => (
                        <li key={i} className="leading-snug flex items-start gap-1.5">
                          <span className="text-rose-500 mt-0.5">•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Grammar & Scholarly Register */}
                <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                      Syntax, Mechanics &amp; Scholarly Tone
                    </h4>
                    <button
                      type="button"
                      onClick={handleRegenerateFromImprovements}
                      disabled={loading || regeneratingEssay}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer disabled:opacity-40"
                    >
                      <RefreshCw
                        className={cn('w-3 h-3', regeneratingEssay && 'animate-spin')}
                      />
                      Apply Fixes to 100/100 Exemplar
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{report.grammar}</p>
                </div>
              </div>
            ) : outputTab === 'exemplar' ? (
              <div className="flex-1 flex flex-col space-y-3">
                {/* Exemplar Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-foreground">
                      100/100 Benchmark Revision
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      ({perfectWordCount} words · {perfectParagraphs.length} paras)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleRegenerateFromImprovements}
                      disabled={loading || regeneratingEssay}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background hover:bg-muted px-2.5 py-1 text-xs font-medium cursor-pointer disabled:opacity-40"
                    >
                      <RefreshCw
                        className={cn('w-3.5 h-3.5', regeneratingEssay && 'animate-spin')}
                      />
                      {regeneratingEssay ? 'Rewriting...' : 'Regenerate'}
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleSpeech}
                      disabled={!displayedPerfectEssay}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background hover:bg-muted px-2.5 py-1 text-xs font-medium cursor-pointer disabled:opacity-40"
                    >
                      {isSpeaking ? (
                        <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                      {isSpeaking ? 'Stop' : 'Listen'}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyPerfectEssay}
                      disabled={!displayedPerfectEssay}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background hover:bg-muted px-2.5 py-1 text-xs font-medium cursor-pointer disabled:opacity-40"
                    >
                      {copiedPerfect ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copiedPerfect ? 'Copied' : 'Copy'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadPerfectEssay('md')}
                      disabled={!displayedPerfectEssay}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background hover:bg-muted px-2.5 py-1 text-xs font-medium cursor-pointer disabled:opacity-40"
                    >
                      <Download className="w-3.5 h-3.5" />
                      .MD
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadPerfectEssay('txt')}
                      disabled={!displayedPerfectEssay}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background hover:bg-muted px-2.5 py-1 text-xs font-medium cursor-pointer disabled:opacity-40"
                    >
                      <Download className="w-3.5 h-3.5" />
                      .TXT
                    </button>
                  </div>
                </div>

                {/* Exemplar Body */}
                <div className="flex-1 rounded-xl border border-border bg-background p-5 max-h-[500px] overflow-y-auto space-y-4 select-text">
                  {perfectParagraphs.length === 0 ? (
                    <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                      <p>Streaming 100/100 model essay revision...</p>
                    </div>
                  ) : (
                    perfectParagraphs.map((paragraph, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1 shrink-0 select-none">
                          ¶{idx + 1}
                        </span>
                        <p className="text-xs sm:text-sm text-foreground/95 leading-7 font-serif">
                          {paragraph}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Side-by-Side Paragraph Comparison View */
              <div className="flex-1 flex flex-col space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
                    Paragraph-by-Paragraph Structural Comparison
                  </span>
                  <span className="font-mono text-[11px]">
                    Draft ({draftMetrics.words}w) → 100/100 Model ({perfectWordCount}w)
                  </span>
                </div>

                <div className="flex-1 max-h-[510px] overflow-y-auto space-y-3 pr-1">
                  {Array.from({
                    length: Math.max(draftParagraphs.length, perfectParagraphs.length, 1),
                  }).map((_, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground border-b border-border/60 pb-1.5">
                        <span>Paragraph {idx + 1}</span>
                        <span>Original Draft vs 100/100 Revision</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-lg bg-muted/30 border border-border/60 p-3 text-xs leading-relaxed text-muted-foreground">
                          <span className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                            Submitted Draft
                          </span>
                          {draftParagraphs[idx] || (
                            <span className="italic opacity-60">
                              No corresponding paragraph in original draft
                            </span>
                          )}
                        </div>
                        <div className="rounded-lg bg-emerald-500/6 border border-emerald-500/20 p-3 text-xs leading-relaxed text-foreground font-serif">
                          <span className="block text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1 font-sans">
                            100/100 Exemplar
                          </span>
                          {perfectParagraphs[idx] || (
                            <span className="italic text-muted-foreground">
                              Consolidated into preceding paragraphs
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
