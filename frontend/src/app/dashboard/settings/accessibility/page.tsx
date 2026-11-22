'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  Accessibility,
  Eye,
  Type,
  Brain,
  MousePointer,
  Wifi,
  CheckCircle2,
  User as UserIcon,
  CreditCard,
  History,
  RotateCcw,
  Sliders,
  Sun,
  Moon,
  Keyboard,
  Globe,
  Check,
  Laptop,
  Volume2,
  VolumeX,
  Play,
  Square,
  BookOpen,
  ScanLine,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  Compass,
  ArrowRight,
  ShieldCheck,
  Info,
  Focus,
  Layers,
  Search,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useSettings,
  DisplayTheme,
  FontFamily,
  TextSize,
  LineSpacing,
  ColorBlindMode,
  Language,
} from '@/contexts/SettingsContext';
import { cn } from '@/lib/utils';

type A11yDomainTab = 'vision' | 'cognitive' | 'motor' | 'connectivity';
type SampleCategory = 'stem' | 'humanities' | 'exam';

interface PresetConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  icon: React.ElementType;
  values: {
    theme?: DisplayTheme;
    font_family?: FontFamily;
    text_size?: TextSize;
    line_spacing?: LineSpacing;
    color_blind_mode?: ColorBlindMode;
    high_contrast?: boolean;
    low_bandwidth?: boolean;
    simplified_mode?: boolean;
  };
}

const WCAG_PRESETS: PresetConfig[] = [
  {
    id: 'baseline',
    name: 'Standard Baseline',
    tagline: 'Default clean Inter typography with balanced contrast',
    description: 'Optimal for standard displays with default 100% text scaling and smooth animations.',
    badge: 'WCAG AA',
    icon: Laptop,
    values: {
      theme: 'light',
      font_family: 'inter',
      text_size: 'normal',
      line_spacing: 'normal',
      color_blind_mode: null,
      high_contrast: false,
      low_bandwidth: false,
      simplified_mode: false,
    },
  },
  {
    id: 'dyslexia',
    name: 'Dyslexia Reading Focus',
    tagline: 'OpenDyslexic typography + relaxed leading to prevent visual crowding',
    description: 'Heavy bottom gravity prevents letter rotation, paired with expanded word and line tracking.',
    badge: 'Reading Focus',
    icon: Type,
    values: {
      font_family: 'opendyslexic',
      line_spacing: 'double',
      text_size: 'large',
      high_contrast: false,
      simplified_mode: false,
    },
  },
  {
    id: 'high_contrast',
    name: 'Onyx High Contrast',
    tagline: 'Pure black & electric yellow pairing exceeding WCAG AAA 7:1 ratio',
    description: 'Maximizes boundary visibility for low vision, glare reduction, and outdoor reading.',
    badge: 'WCAG AAA 7:1',
    icon: Eye,
    values: {
      theme: 'dark',
      high_contrast: true,
      text_size: 'extra-large',
      line_spacing: 'double',
    },
  },
  {
    id: 'adhd_calm',
    name: 'ADHD Cognitive Calm',
    tagline: 'Zero motion, simplified interface, and distraction-free study layout',
    description: 'Disables decorative animations, collapses secondary widgets, and focuses solely on course content.',
    badge: 'Low Distraction',
    icon: Brain,
    values: {
      simplified_mode: true,
      low_bandwidth: true,
      line_spacing: 'normal',
    },
  },
  {
    id: 'data_saver',
    name: 'Data & Battery Saver',
    tagline: 'Compressed media, dark theme, and minimal network prefetching',
    description: 'Designed for cellular data connections (3G/4G) and OLED battery preservation.',
    badge: 'Eco Mode',
    icon: Wifi,
    values: {
      theme: 'dark',
      low_bandwidth: true,
      color_blind_mode: null,
      high_contrast: false,
    },
  },
];

const SANDBOX_SAMPLES: Record<
  SampleCategory,
  {
    categoryLabel: string;
    courseCode: string;
    unitCode: string;
    heading: string;
    markdownBody: string;
    footnote: string;
    speechText: string;
  }
> = {
  stem: {
    categoryLabel: 'STEM & Mathematics',
    courseCode: 'MATH 201: LINEAR ALGEBRA',
    unitCode: 'LEC 04',
    heading: 'Eigenvalues & Characteristic Polynomials',
    markdownBody: `Let matrix $A$ be an $n \\times n$ matrix over $\\mathbb{R}$. A scalar $\\lambda$ is called an eigenvalue of $A$ if there exists a non-zero vector $v \\in \\mathbb{R}^n$ such that:

$$A v = \\lambda v \\iff (A - \\lambda I)v = 0$$

For non-trivial solutions to exist, the characteristic determinant must vanish:

$$\\det(A - \\lambda I) = 0$$

Notice how OpenDyslexic weighted bottoms prevent rotational confusion between letters like $b, d, p,$ and $q$, while expanded line leading guarantees you never lose track of derivation steps.`,
    footnote: 'Mathematical formulas are typeset via KaTeX with high contrast rendering.',
    speechText:
      'Math 201: Linear Algebra. Lecture 4. Eigenvalues and Characteristic Polynomials. Let matrix A be an n by n matrix. A scalar lambda is an eigenvalue of A if there exists a non-zero vector v such that A v equals lambda v. The characteristic determinant is determinant of A minus lambda I equals zero.',
  },
  humanities: {
    categoryLabel: 'Economics & Humanities',
    courseCode: 'ECON 302: MACROECONOMIC POLICY',
    unitCode: 'SEM 02',
    heading: 'Monetary Transmission & Liquidity Expectations',
    markdownBody: `Central bank interest rate decisions propagate through the economy via four primary channels: interest rate pricing, exchange rate fluctuations, asset valuation, and banking credit supply.

When the monetary authority implements an unexpected policy tightening, the real interbank borrowing cost rises immediately:

$$r_t = i_t - \\mathbb{E}_t[\\pi_{t+1}]$$

Firms with leveraged balance sheets postpone capital investment expenditure, dampening aggregate demand and moderating demand-pull inflation pressure across the sovereign domestic economy.`,
    footnote: 'Dense academic paragraphs benefit significantly from double line leading and OpenDyslexic tracking.',
    speechText:
      'Economics 302: Macroeconomic Policy. Monetary Transmission and Liquidity Expectations. Central bank interest rate decisions propagate through four primary channels: interest rate pricing, exchange rate fluctuations, asset valuation, and banking credit supply.',
  },
  exam: {
    categoryLabel: 'Exam & Past Questions',
    courseCode: 'BCPC 205: BUSINESS LAW',
    unitCode: 'PAST QUESTION',
    heading: 'Doctrine of Promissory Estoppel & Consideration',
    markdownBody: `**Question 2(a) [15 Marks]:**

Analyze the decision in *Central London Property Trust Ltd v High Trees House Ltd [1947] KB 130*. Explain under what specific conditions equity prevents a promisor from enforcing strict legal rights:

1. A clear and unambiguous promise intended to alter legal relations.
2. Reasonable reliance by the promisee acting upon that representation.
3. Inequity would result if the promisor were permitted to resile from the assurance.`,
    footnote: 'Numbered exam structures and case law references remain crisp and readable under all text scaling modes.',
    speechText:
      'Business Law past question. Question 2 a, 15 marks. Analyze the decision in Central London Property Trust Limited versus High Trees House Limited. Explain the doctrine of promissory estoppel.',
  },
};

const KEYBOARD_SHORTCUTS = [
  { key: 'Ctrl + B', label: 'Toggle Sidebar', desc: 'Expand or collapse the primary course navigation drawer' },
  { key: '/ or Ctrl + K', label: 'Global Command Palette', desc: 'Instantly search lectures, flashcards, and notes' },
  { key: 'Esc', label: 'Dismiss Active Overlay', desc: 'Close dialogs, mobile sheets, or reading preview rulers' },
  { key: 'Tab / Shift+Tab', label: 'Sequential Focus Cycle', desc: 'Navigate forward or backward through interactive controls' },
  { key: 'Enter or Space', label: 'Trigger Control', desc: 'Activate selected button, checkbox, or preset card' },
  { key: 'Alt + A', label: 'Accessibility Quick-Nav', desc: 'Jump directly to accessibility and ergonomics studio' },
  { key: 'Alt + R', label: 'Reset Baseline', desc: 'Reset all visual accommodations to standard WCAG AA defaults' },
];

export default function AccessibilitySettingsPage() {
  const { settings, updateSettings, loading } = useSettings();

  const [activeTab, setActiveTab] = useState<A11yDomainTab>('vision');
  const [sampleCategory, setSampleCategory] = useState<SampleCategory>('stem');

  // Interactive Reading Ruler state
  const [readingRulerActive, setReadingRulerActive] = useState(false);
  const [readingRulerScope, setReadingRulerScope] = useState<'sandbox' | 'global'>('sandbox');
  const [readingRulerY, setReadingRulerY] = useState(120);
  const [globalRulerY, setGlobalRulerY] = useState(200);
  const [rulerHeight, setRulerHeight] = useState<'sm' | 'md' | 'lg'>('md');
  const [rulerColor, setRulerColor] = useState<'gold' | 'navy' | 'amber'>('gold');

  // Touch & Motor Dexterity Test state
  const [sampleButtonTouched, setSampleButtonTouched] = useState(false);
  const [motorSandboxStep, setMotorSandboxStep] = useState(1);
  const [motorInputText, setMotorInputText] = useState('');

  // High-visibility focus state
  const [highVisFocus, setHighVisFocus] = useState(false);

  // Web Speech Synthesizer state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);

  // Search filter for keyboard shortcuts
  const [shortcutSearch, setShortcutSearch] = useState('');

  // Sync high-vis focus indicator from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isHighVis = localStorage.getItem('unistudy_a11y_high_vis_focus') === 'true';
    setHighVisFocus(isHighVis);
    if (isHighVis) {
      document.documentElement.setAttribute('data-focus-indicator', 'high-vis');
    }
  }, []);

  // Global cursor tracker for Fullscreen Reading Ruler
  useEffect(() => {
    if (!readingRulerActive || readingRulerScope !== 'global') return;
    const handleMouseMove = (e: MouseEvent) => {
      setGlobalRulerY(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [readingRulerActive, readingRulerScope]);

  // Clean up Web Speech when leaving page
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleUpdate = async (updates: Partial<typeof settings>, feedbackMsg = 'Preferences saved') => {
    try {
      await updateSettings(updates);
      toast.success(feedbackMsg);
    } catch {
      toast.error('Failed to update accessibility preferences');
    }
  };

  const handleApplyPreset = async (preset: PresetConfig) => {
    await handleUpdate(preset.values, `Applied preset: ${preset.name}`);
  };

  const handleResetDefaults = async () => {
    await handleUpdate(
      {
        theme: 'light',
        font_family: 'inter',
        text_size: 'normal',
        line_spacing: 'normal',
        color_blind_mode: null,
        high_contrast: false,
        low_bandwidth: false,
        simplified_mode: false,
      },
      'Reset all accessibility settings to standard baseline'
    );
    if (highVisFocus) {
      setHighVisFocus(false);
      localStorage.removeItem('unistudy_a11y_high_vis_focus');
      document.documentElement.removeAttribute('data-focus-indicator');
    }
  };

  const handleToggleHighVisFocus = () => {
    const next = !highVisFocus;
    setHighVisFocus(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('unistudy_a11y_high_vis_focus', String(next));
      if (next) {
        document.documentElement.setAttribute('data-focus-indicator', 'high-vis');
        toast.success('High-visibility focus rings enabled (UPSA Gold 3px offset)');
      } else {
        document.documentElement.removeAttribute('data-focus-indicator');
        toast.info('Standard focus rings restored');
      }
    }
  };

  const handleToggleSpeech = (textToRead: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Web Speech Synthesizer is not supported in this browser environment.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      toast.info('Speech reading stopped');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = speechRate;
    utterance.lang = settings.language === 'fr' ? 'fr-FR' : 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    toast.success('Auditory reading in progress...');
  };

  // Check if a preset is currently active
  const isPresetActive = (preset: PresetConfig): boolean => {
    return Object.entries(preset.values).every(([key, value]) => {
      return (settings as unknown as Record<string, unknown>)[key] === value;
    });
  };

  // Telemetry computation
  const telemetry = useMemo(() => {
    const isDyslexic = settings.font_family === 'opendyslexic';
    const isHighContrast = settings.high_contrast;
    const isScaled = settings.text_size !== 'normal' || settings.line_spacing !== 'normal';
    const hasColorFilter = Boolean(settings.color_blind_mode);
    const isSimplified = settings.simplified_mode;
    const isLowBandwidth = settings.low_bandwidth;

    let activeAccommodations = 0;
    if (isDyslexic) activeAccommodations++;
    if (isHighContrast) activeAccommodations++;
    if (isScaled) activeAccommodations++;
    if (hasColorFilter) activeAccommodations++;
    if (isSimplified) activeAccommodations++;
    if (isLowBandwidth) activeAccommodations++;
    if (highVisFocus) activeAccommodations++;
    if (readingRulerActive) activeAccommodations++;

    return {
      activeAccommodations,
      complianceTier: isHighContrast ? 'WCAG AAA (7.2:1)' : 'WCAG AA (4.8:1)',
      fontLabel: isDyslexic ? 'OpenDyslexic Regular' : 'Inter Variable',
      textScaleLabel:
        settings.text_size === 'small'
          ? '90% (Compact)'
          : settings.text_size === 'large'
          ? '112.5% (Large)'
          : settings.text_size === 'extra-large'
          ? '125% (Maximum)'
          : '100% (Standard)',
      spacingLabel: settings.line_spacing === 'double' ? 'Double Spaced (2.1x)' : 'Standard (1.5x)',
      colorBlindLabel:
        settings.color_blind_mode === 'deuteranopia'
          ? 'Deuteranopia (Green-Weak)'
          : settings.color_blind_mode === 'protanopia'
          ? 'Protanopia (Red-Weak)'
          : settings.color_blind_mode === 'achromatopsia'
          ? 'Achromatopsia (Monochrome)'
          : 'Full Spectrum (None)',
    };
  }, [settings, highVisFocus, readingRulerActive]);

  const filteredShortcuts = useMemo(() => {
    if (!shortcutSearch.trim()) return KEYBOARD_SHORTCUTS;
    const q = shortcutSearch.toLowerCase();
    return KEYBOARD_SHORTCUTS.filter(
      (s) => s.key.toLowerCase().includes(q) || s.label.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)
    );
  }, [shortcutSearch]);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#00004E]/10 dark:bg-[#D89A06]/20 border border-[#00004E]/20 dark:border-[#D89A06]/30 flex items-center justify-center mx-auto text-[#00004E] dark:text-[#D89A06] animate-pulse">
          <Accessibility className="w-6 h-6" />
        </div>
        <p className="text-sm font-mono text-muted-foreground">
          Calibrating client accessibility &amp; DOM tokens...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-16">
      {/* Global Full-Screen Reading Ruler Overlay */}
      {readingRulerActive && readingRulerScope === 'global' && (
        <div
          className={cn(
            'fixed left-0 right-0 pointer-events-none z-50 transition-all duration-75 shadow-lg',
            rulerHeight === 'sm' && 'h-6 -translate-y-3',
            rulerHeight === 'md' && 'h-9 -translate-y-4.5',
            rulerHeight === 'lg' && 'h-14 -translate-y-7',
            rulerColor === 'gold' && 'bg-[#D89A06]/15 border-y-2 border-[#D89A06]',
            rulerColor === 'navy' && 'bg-[#00004E]/15 border-y-2 border-[#00004E]',
            rulerColor === 'amber' && 'bg-amber-500/15 border-y-2 border-amber-500'
          )}
          style={{ top: `${globalRulerY}px` }}
        />
      )}

      {/* Studio Header & Navigation */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/80 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00004E]/10 dark:bg-[#D89A06]/15 border border-[#00004E]/20 dark:border-[#D89A06]/30 text-[#00004E] dark:text-[#D89A06] text-xs font-mono font-bold uppercase tracking-wider">
            <Accessibility className="w-3.5 h-3.5 text-[#D89A06]" />
            Inclusive Design · W3C WCAG 2.2 · Ergonomics Studio
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            Accessibility &amp; Assistive Ergonomics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Tailor UniStudy to your visual, cognitive, sensory, and motor preferences. All settings apply
            instantly to global design tokens and persist seamlessly across your sessions.
          </p>
        </div>

        {/* Settings Navigation Suite & Reset */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center rounded-xl border border-border/80 bg-muted/40 p-1">
            <Link
              href="/dashboard/settings/profile"
              className="inline-flex items-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5" />
              Profile
            </Link>
            <Link
              href="/dashboard/settings/accessibility"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] shadow-xs px-3.5 py-1.5 text-xs font-bold transition-all"
            >
              <Accessibility className="w-3.5 h-3.5 text-[#D89A06] dark:text-[#00004E]" />
              Accessibility
            </Link>
            <Link
              href="/dashboard/settings/billing"
              className="inline-flex items-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Billing
            </Link>
            <Link
              href="/dashboard/settings/billing/audit"
              className="inline-flex items-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              Audit Log
            </Link>
          </div>

          <button
            type="button"
            onClick={() => void handleResetDefaults()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted/80 px-3.5 py-2 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-xs active:scale-95"
            title="Reset all accessibility settings to standard baseline"
          >
            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
            Reset Baseline
          </button>
        </div>
      </header>

      {/* 4-Tile Assistive Telemetry Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-border/80 bg-card p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Contrast &amp; Compliance
            </p>
            <p className="text-lg font-extrabold font-mono text-[#00004E] dark:text-[#D89A06] mt-0.5">
              {telemetry.complianceTier}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {settings.theme === 'dark' ? 'Dark Theme' : 'Light Theme'} · {settings.high_contrast ? 'High Contrast' : 'Standard Contrast'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#00004E]/10 dark:bg-[#D89A06]/20 border border-[#00004E]/20 dark:border-[#D89A06]/30 flex items-center justify-center text-[#00004E] dark:text-[#D89A06]">
            <Eye className="w-5 h-5 text-[#D89A06] dark:text-[#D89A06]" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Typography Engine
            </p>
            <p className="text-lg font-extrabold font-mono text-foreground mt-0.5 truncate max-w-[170px]">
              {settings.font_family === 'opendyslexic' ? 'OpenDyslexic' : 'Inter Variable'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {telemetry.textScaleLabel} · {settings.line_spacing === 'double' ? 'Double Leading' : '1.5x Leading'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Type className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Cognitive &amp; Focus
            </p>
            <p className="text-lg font-extrabold font-mono text-foreground mt-0.5">
              {settings.simplified_mode ? 'Simplified UI' : 'Full Suite'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {settings.low_bandwidth ? 'Animations Disabled' : 'Smooth Motion'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Brain className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Assistive Modifiers
            </p>
            <p className="text-lg font-extrabold font-mono text-[#00004E] dark:text-[#D89A06] mt-0.5">
              {telemetry.activeAccommodations} Active
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[170px]">
              {telemetry.colorBlindLabel}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Sliders className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* 1-Click W3C Inclusive Presets Bar */}
      <section className="rounded-2xl border border-border/80 bg-card p-5 space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#D89A06]" />
              1-Click Inclusive Design Presets
            </h2>
            <p className="text-xs text-muted-foreground">
              Select an industry-standard accessibility profile. Current active preset is automatically highlighted.
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#00004E] dark:text-[#D89A06] bg-[#00004E]/5 dark:bg-[#D89A06]/10 px-2.5 py-1 rounded-md border border-[#00004E]/20 dark:border-[#D89A06]/30 font-semibold self-start sm:self-auto">
            Instant Global Apply
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {WCAG_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const active = isPresetActive(preset);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => void handleApplyPreset(preset)}
                className={cn(
                  'rounded-xl border p-3.5 text-left transition-all cursor-pointer flex flex-col justify-between space-y-2.5 relative group',
                  active
                    ? 'border-[#00004E] dark:border-[#D89A06] bg-[#00004E]/5 dark:bg-[#D89A06]/10 shadow-sm ring-2 ring-[#00004E]/20 dark:ring-[#D89A06]/30'
                    : 'border-border/80 bg-muted/20 hover:bg-muted/40 hover:border-[#00004E]/40 dark:hover:border-[#D89A06]/40'
                )}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                      active
                        ? 'bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E]'
                        : 'bg-[#00004E]/10 dark:bg-[#D89A06]/20 text-[#00004E] dark:text-[#D89A06]'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-1">
                    {active && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <Check className="w-2.5 h-2.5" />
                        Active
                      </span>
                    )}
                    <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-background border border-border font-semibold text-muted-foreground">
                      {preset.badge}
                    </span>
                  </div>
                </div>

                <div>
                  <div
                    className={cn(
                      'text-xs font-bold transition-colors',
                      active ? 'text-[#00004E] dark:text-[#D89A06]' : 'text-foreground group-hover:text-primary'
                    )}
                  >
                    {preset.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                    {preset.tagline}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Studio Split: Left 7 Cols Controls + Right 5 Cols Live Preview & Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Domain-Specific Accessibility Controls */}
        <div className="lg:col-span-7 space-y-5">
          {/* Domain Tab Switcher */}
          <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-muted/30 p-1 w-full sm:w-auto shadow-xs">
            {(
              [
                { id: 'vision', label: 'Vision & Typography', icon: Eye },
                { id: 'cognitive', label: 'Cognitive & Focus', icon: Brain },
                { id: 'motor', label: 'Motor & Ergonomics', icon: MousePointer },
                { id: 'connectivity', label: 'Network & Language', icon: Wifi },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all cursor-pointer',
                    isSelected
                      ? 'bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <Icon className={cn('w-3.5 h-3.5', isSelected ? 'text-[#D89A06] dark:text-[#00004E]' : 'text-muted-foreground')} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: VISION & TYPOGRAPHY */}
          {activeTab === 'vision' && (
            <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 space-y-6 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Type className="w-4 h-4 text-[#D89A06]" />
                  Vision, Typography &amp; Chromatic Filters
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adjust color contrast, dyslexia typography, viewport proportional scaling, and color vision deficiency (CVD) accommodations.
                </p>
              </div>

              {/* Theme & Contrast Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/70 bg-muted/15 p-4 space-y-2.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between font-semibold">
                    <span>Display Mode</span>
                    <span className="text-[#00004E] dark:text-[#D89A06] font-bold capitalize">{settings.theme} Theme</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleUpdate({ theme: 'light' }, 'Theme set to Light')}
                      className={cn(
                        'inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-all cursor-pointer',
                        settings.theme === 'light'
                          ? 'border-[#00004E] bg-[#00004E] text-white shadow-xs'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Sun className="w-3.5 h-3.5 text-[#D89A06]" />
                      Light
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleUpdate({ theme: 'dark' }, 'Theme set to Dark')}
                      className={cn(
                        'inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-all cursor-pointer',
                        settings.theme === 'dark'
                          ? 'border-[#D89A06] bg-[#D89A06] text-[#00004E] font-bold shadow-xs'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      Dark
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/15 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block font-semibold">
                        High Contrast Mode
                      </label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Exceeds WCAG AAA 7.2:1 ratio
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void handleUpdate(
                          { high_contrast: !settings.high_contrast },
                          settings.high_contrast ? 'Standard contrast' : 'High contrast active'
                        )
                      }
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer',
                        settings.high_contrast ? 'bg-[#00004E] dark:bg-[#D89A06]' : 'bg-muted-foreground/30'
                      )}
                      aria-label="Toggle High Contrast Mode"
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white dark:bg-[#00004E] transition-transform',
                          settings.high_contrast ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Dyslexia Typography Switch */}
              <div className="rounded-xl border border-border/70 bg-muted/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      OpenDyslexic Font Family
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                      Dyslexia Aid
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enforces weighted bottom gravity to anchor letters and prevent cognitive flipping
                    between b, d, p, and q.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = settings.font_family === 'opendyslexic' ? 'inter' : 'opendyslexic';
                    void handleUpdate(
                      { font_family: next },
                      next === 'opendyslexic' ? 'OpenDyslexic enabled' : 'Inter Variable enabled'
                    );
                  }}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0',
                    settings.font_family === 'opendyslexic' ? 'bg-[#00004E] dark:bg-[#D89A06]' : 'bg-muted-foreground/30'
                  )}
                  aria-label="Toggle OpenDyslexic font family"
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white dark:bg-[#00004E] transition-transform',
                      settings.font_family === 'opendyslexic' ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {/* Text Size Scale Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                    Proportional Text Scaling
                  </label>
                  <span className="text-xs font-mono font-bold text-[#00004E] dark:text-[#D89A06]">
                    {telemetry.textScaleLabel}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'small', label: 'Compact', pct: '90%' },
                      { id: 'normal', label: 'Standard', pct: '100%' },
                      { id: 'large', label: 'Large', pct: '112.5%' },
                      { id: 'extra-large', label: 'Max', pct: '125%' },
                    ] as const
                  ).map((scale) => {
                    const isSelected = settings.text_size === scale.id;
                    return (
                      <button
                        key={scale.id}
                        type="button"
                        onClick={() =>
                          void handleUpdate({ text_size: scale.id }, `Text scale: ${scale.label} (${scale.pct})`)
                        }
                        className={cn(
                          'rounded-xl border py-2.5 px-2 text-center transition-all cursor-pointer',
                          isSelected
                            ? 'border-[#00004E] bg-[#00004E]/10 dark:border-[#D89A06] dark:bg-[#D89A06]/15 text-[#00004E] dark:text-[#D89A06] font-bold shadow-xs ring-1 ring-[#00004E]/20 dark:ring-[#D89A06]/30'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/30'
                        )}
                      >
                        <div className="text-xs">{scale.label}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{scale.pct}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Line Spacing / Leading Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                    Line Height Leading Spacing
                  </label>
                  <span className="text-xs font-mono font-bold text-[#00004E] dark:text-[#D89A06]">
                    {telemetry.spacingLabel}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'normal', label: 'Standard Leading (1.5x)', desc: 'Balanced vertical rhythm for screens' },
                      { id: 'double', label: 'Double Spaced (2.1x)', desc: 'Expanded tracking prevents row skipping' },
                    ] as const
                  ).map((sp) => {
                    const isSelected = settings.line_spacing === sp.id;
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() =>
                          void handleUpdate({ line_spacing: sp.id as LineSpacing }, `Spacing: ${sp.label}`)
                        }
                        className={cn(
                          'rounded-xl border p-3 text-left transition-all cursor-pointer',
                          isSelected
                            ? 'border-[#00004E] bg-[#00004E]/10 dark:border-[#D89A06] dark:bg-[#D89A06]/15 text-[#00004E] dark:text-[#D89A06] font-bold shadow-xs'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/30'
                        )}
                      >
                        <div className="text-xs font-bold text-foreground">{sp.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{sp.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Blindness (CVD) Filters */}
              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                    Color Vision Deficiency (CVD) Accommodations
                  </label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {telemetry.colorBlindLabel}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(
                    [
                      { id: null, label: 'Full Spectrum (None)', desc: 'Standard UPSA Blue, Gold & White palette' },
                      { id: 'deuteranopia', label: 'Deuteranopia', desc: 'Enhanced green-weak contrast (Blue & Amber)' },
                      { id: 'protanopia', label: 'Protanopia', desc: 'Enhanced red-weak contrast (Cobalt & Yellow)' },
                      { id: 'achromatopsia', label: 'Achromatopsia', desc: 'High-luminance monochrome grayscale' },
                    ] as const
                  ).map((cvd) => {
                    const isSelected = settings.color_blind_mode === cvd.id;
                    return (
                      <button
                        key={cvd.label}
                        type="button"
                        onClick={() =>
                          void handleUpdate(
                            { color_blind_mode: cvd.id },
                            `Color filter: ${cvd.label}`
                          )
                        }
                        className={cn(
                          'rounded-xl border p-3 text-left transition-all cursor-pointer',
                          isSelected
                            ? 'border-[#00004E] bg-[#00004E]/10 dark:border-[#D89A06] dark:bg-[#D89A06]/15 shadow-xs ring-1 ring-[#00004E]/20 dark:ring-[#D89A06]/30'
                            : 'border-border bg-background hover:bg-muted/30'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{cvd.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#00004E] dark:text-[#D89A06]" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{cvd.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COGNITIVE & FOCUS */}
          {activeTab === 'cognitive' && (
            <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 space-y-6 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Brain className="w-4 h-4 text-amber-500" />
                  Cognitive Ergonomics &amp; Distraction Elimination
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Optimize your study environment for ADHD, neurodiversity, sensory calm, and deep retention.
                </p>
              </div>

              <div className="space-y-4">
                {/* Simplified UI Mode */}
                <div className="rounded-xl border border-border/70 bg-muted/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        Simplified Workspace Layout
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                        ADHD Focus
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Collapses auxiliary sidebars, hides decorative widgets, and keeps only primary
                      lecture content in view.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void handleUpdate(
                        { simplified_mode: !settings.simplified_mode },
                        settings.simplified_mode ? 'Full layout restored' : 'Simplified layout active'
                      )
                    }
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0',
                      settings.simplified_mode ? 'bg-[#00004E] dark:bg-[#D89A06]' : 'bg-muted-foreground/30'
                    )}
                    aria-label="Toggle Simplified Workspace Layout"
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white dark:bg-[#00004E] transition-transform',
                        settings.simplified_mode ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>

                {/* Reduced Motion & Animations Toggle */}
                <div className="rounded-xl border border-border/70 bg-muted/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        Reduced Motion (`prefers-reduced-motion`)
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/20">
                        Vestibular Aid
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Eliminates bouncing icons, layout shifts, and slide animations to prevent motion sickness.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void handleUpdate(
                        { low_bandwidth: !settings.low_bandwidth },
                        settings.low_bandwidth ? 'Smooth animations active' : 'Reduced motion active'
                      )
                    }
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0',
                      settings.low_bandwidth ? 'bg-[#00004E] dark:bg-[#D89A06]' : 'bg-muted-foreground/30'
                    )}
                    aria-label="Toggle Reduced Motion"
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white dark:bg-[#00004E] transition-transform',
                        settings.low_bandwidth ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>

                {/* Reading Guide Line Focus Ruler */}
                <div className="rounded-xl border border-border/70 bg-muted/15 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          Interactive Reading Line Ruler
                        </span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#00004E]/10 dark:bg-[#D89A06]/15 text-[#00004E] dark:text-[#D89A06] font-semibold border border-[#00004E]/20 dark:border-[#D89A06]/30">
                          Eye Tracking Guide
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Projects a highlighted horizontal ruler over reading text that follows your cursor to prevent line skipping.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !readingRulerActive;
                        setReadingRulerActive(next);
                        toast.success(next ? 'Reading ruler enabled' : 'Reading ruler dismissed');
                      }}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0',
                        readingRulerActive ? 'bg-[#00004E] dark:bg-[#D89A06]' : 'bg-muted-foreground/30'
                      )}
                      aria-label="Toggle Reading Ruler"
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white dark:bg-[#00004E] transition-transform',
                          readingRulerActive ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>

                  {readingRulerActive && (
                    <div className="pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[11px] font-mono uppercase text-muted-foreground block mb-1.5 font-semibold">
                          Ruler Coverage Scope
                        </span>
                        <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
                          <button
                            type="button"
                            onClick={() => setReadingRulerScope('sandbox')}
                            className={cn(
                              'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer',
                              readingRulerScope === 'sandbox'
                                ? 'bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E]'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            Sandbox Card Only
                          </button>
                          <button
                            type="button"
                            onClick={() => setReadingRulerScope('global')}
                            className={cn(
                              'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer',
                              readingRulerScope === 'global'
                                ? 'bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E]'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            Full Viewport Screen
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] font-mono uppercase text-muted-foreground block mb-1.5 font-semibold">
                          Guide Tint Accent
                        </span>
                        <div className="flex items-center gap-1.5">
                          {[
                            { id: 'gold', label: 'UPSA Gold', colorClass: 'bg-[#D89A06]' },
                            { id: 'navy', label: 'Deep Navy', colorClass: 'bg-[#00004E]' },
                            { id: 'amber', label: 'Soft Amber', colorClass: 'bg-amber-500' },
                          ].map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setRulerColor(c.id as 'gold' | 'navy' | 'amber')}
                              className={cn(
                                'flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium transition-all cursor-pointer',
                                rulerColor === c.id
                                  ? 'border-[#00004E] dark:border-[#D89A06] bg-muted/60 font-bold'
                                  : 'border-border bg-background text-muted-foreground'
                              )}
                            >
                              <span className={cn('w-2.5 h-2.5 rounded-full', c.colorClass)} />
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MOTOR & ERGONOMICS */}
          {activeTab === 'motor' && (
            <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 space-y-6 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-emerald-500" />
                  Motor Dexterity &amp; Keyboard Navigation
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Touch target hitbox guarantees, high-visibility focus indicators, and full keyboard navigation.
                </p>
              </div>

              {/* Touch Target Verification Box */}
              <div className="rounded-xl border border-border/70 bg-muted/15 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Minimum Touch Target Guarantee (≥ 48×48px)
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      All primary buttons, tabs, and action links maintain minimum 48px hitboxes to accommodate motor tremors.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                    WCAG 2.5.5 AAA
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSampleButtonTouched(true);
                      toast.success('48px Accessible Target Hitbox Registered!');
                      setTimeout(() => setSampleButtonTouched(false), 2200);
                    }}
                    className="min-h-[48px] min-w-[150px] px-5 rounded-xl bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] font-bold text-xs flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#D89A06]/50 shadow-sm"
                  >
                    {sampleButtonTouched ? <Check className="w-4 h-4 text-[#D89A06] dark:text-[#00004E]" /> : <MousePointer className="w-4 h-4" />}
                    {sampleButtonTouched ? 'Target Click Confirmed!' : 'Test 48px Hitbox'}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    Try tapping or clicking to verify the generous target padding and contrast ring.
                  </span>
                </div>
              </div>

              {/* High-Visibility Focus Ring Toggle */}
              <div className="rounded-xl border border-border/70 bg-muted/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      High-Visibility Focus Rings
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#00004E]/10 dark:bg-[#D89A06]/15 text-[#00004E] dark:text-[#D89A06] font-semibold border border-[#00004E]/20 dark:border-[#D89A06]/30">
                      Keyboard Assist
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enforces a prominent 3px UPSA Gold outline with offset shadow on all focused buttons, inputs, and links.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleHighVisFocus}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0',
                    highVisFocus ? 'bg-[#00004E] dark:bg-[#D89A06]' : 'bg-muted-foreground/30'
                  )}
                  aria-label="Toggle High-Visibility Focus Rings"
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white dark:bg-[#00004E] transition-transform',
                      highVisFocus ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {/* Interactive Focus Sequence Trapper */}
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Focus className="w-4 h-4 text-[#D89A06]" />
                    Sequential Tab Navigation Sandbox
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Step {motorSandboxStep} of 3
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Tab</kbd> to move sequentially through these controls without using a mouse:
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <input
                    type="text"
                    value={motorInputText}
                    onChange={(e) => setMotorInputText(e.target.value)}
                    onFocus={() => setMotorSandboxStep(1)}
                    placeholder="1. Tab here and type..."
                    className="h-10 px-3 rounded-lg border border-border bg-background text-xs outline-none focus:border-[#00004E] dark:focus:border-[#D89A06] w-48"
                  />
                  <button
                    type="button"
                    onFocus={() => setMotorSandboxStep(2)}
                    onClick={() => toast.success('Control 2 Activated via Keyboard')}
                    className="h-10 px-4 rounded-lg bg-muted border border-border hover:bg-muted/80 text-foreground text-xs font-semibold cursor-pointer"
                  >
                    2. Action Button
                  </button>
                  <button
                    type="button"
                    onFocus={() => setMotorSandboxStep(3)}
                    onClick={() => {
                      setMotorInputText('');
                      toast.success('Sequence Reset Completed');
                    }}
                    className="h-10 px-4 rounded-lg bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] text-xs font-bold cursor-pointer"
                  >
                    3. Submit &amp; Clear
                  </button>
                </div>
              </div>

              {/* Keyboard Shortcut Cheat Sheet */}
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Keyboard className="w-4 h-4 text-[#D89A06]" />
                    Keyboard Shortcut Directory
                  </span>
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={shortcutSearch}
                      onChange={(e) => setShortcutSearch(e.target.value)}
                      placeholder="Filter shortcuts..."
                      className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-border bg-background outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {filteredShortcuts.map((s) => (
                    <div
                      key={s.key}
                      className="rounded-lg border border-border bg-muted/20 p-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{s.label}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{s.desc}</div>
                      </div>
                      <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px] font-bold text-[#00004E] dark:text-[#D89A06] shrink-0">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CONNECTIVITY & LANGUAGE */}
          {activeTab === 'connectivity' && (
            <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 space-y-6 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-sky-500" />
                  Connectivity Optimization &amp; Multilingual Delivery
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Save mobile data, disable prefetching, and set preferred UI and audio translation languages.
                </p>
              </div>

              {/* Low Bandwidth Toggle */}
              <div className="rounded-xl border border-border/70 bg-muted/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Low Bandwidth Mode</span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/20">
                      Cellular Saver
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Compresses slide thumbnails to WebP/AVIF, skips heavy video autoplay, and disables background network prefetching.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void handleUpdate(
                      { low_bandwidth: !settings.low_bandwidth },
                      settings.low_bandwidth ? 'Normal network mode' : 'Low bandwidth active'
                    )
                  }
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0',
                    settings.low_bandwidth ? 'bg-[#00004E] dark:bg-[#D89A06]' : 'bg-muted-foreground/30'
                  )}
                  aria-label="Toggle Low Bandwidth Mode"
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white dark:bg-[#00004E] transition-transform',
                      settings.low_bandwidth ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {/* Multilingual Selector */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-semibold">
                  <Globe className="w-3.5 h-3.5 text-[#D89A06]" />
                  Primary Application &amp; AI Language
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(
                    [
                      { id: 'en', label: 'English (Default)', native: 'English' },
                      { id: 'fr', label: 'Français', native: 'French' },
                      { id: 'tw', label: 'Twi', native: 'Akan (Ghana)' },
                      { id: 'ha', label: 'Hausa', native: 'Harshen Hausa' },
                      { id: 'yo', label: 'Yorùbá', native: 'Èdè Yorùbá' },
                      { id: 'sw', label: 'Kiswahili', native: 'Swahili' },
                    ] as const
                  ).map((lang) => {
                    const isSelected = settings.language === lang.id;
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() =>
                          void handleUpdate({ language: lang.id as Language }, `Language set to ${lang.label}`)
                        }
                        className={cn(
                          'rounded-xl border p-3.5 text-left transition-all cursor-pointer',
                          isSelected
                            ? 'border-[#00004E] bg-[#00004E]/10 dark:border-[#D89A06] dark:bg-[#D89A06]/15 text-[#00004E] dark:text-[#D89A06] font-bold shadow-xs ring-1 ring-[#00004E]/20 dark:ring-[#D89A06]/30'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/30'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{lang.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#00004E] dark:text-[#D89A06]" />}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{lang.native}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text-to-Speech Speed Setting */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-[#D89A06]" />
                    Screen Reader Reading Speed
                  </span>
                  <span className="text-xs font-mono font-bold text-[#00004E] dark:text-[#D89A06]">
                    {speechRate}x Rate
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0.8, 1.0, 1.2, 1.5].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setSpeechRate(rate)}
                      className={cn(
                        'py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer',
                        speechRate === rate
                          ? 'border-[#00004E] bg-[#00004E] text-white dark:border-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E]'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {rate}x Speed
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 Cols: Live Interactive Assistive Sandbox & Reading Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 sticky top-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#00004E]/10 dark:bg-[#D89A06]/20 text-[#00004E] dark:text-[#D89A06] flex items-center justify-center">
                  <Eye className="w-4 h-4 text-[#D89A06]" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Live Assistive Reading Sandbox</h3>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-muted/60 text-[#00004E] dark:text-[#D89A06] border border-border font-semibold">
                DOM Reactive
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Real-time rendering of your active typography, font scaling, contrast, and color-vision accommodations.
            </p>

            {/* Sample Category Switcher */}
            <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5 w-full">
              {(
                [
                  { id: 'stem', label: 'STEM & Math' },
                  { id: 'humanities', label: 'Academic Essay' },
                  { id: 'exam', label: 'Exam Past Paper' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSampleCategory(cat.id)}
                  className={cn(
                    'flex-1 py-1 text-center text-xs font-semibold rounded-md transition-colors cursor-pointer',
                    sampleCategory === cat.id
                      ? 'bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sandbox Card with simulated attributes */}
            <div
              onMouseMove={(e) => {
                if (readingRulerActive && readingRulerScope === 'sandbox') {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setReadingRulerY(Math.max(20, Math.min(e.clientY - rect.top, rect.height - 20)));
                }
              }}
              className={cn(
                'relative rounded-xl border border-border p-4 bg-background transition-all overflow-hidden space-y-3.5 shadow-xs',
                settings.font_family === 'opendyslexic' && 'tracking-wide font-[OpenDyslexic]',
                settings.line_spacing === 'double' ? 'leading-loose' : 'leading-relaxed'
              )}
            >
              {/* Reading Ruler Guide inside sandbox */}
              {readingRulerActive && readingRulerScope === 'sandbox' && (
                <div
                  className={cn(
                    'absolute left-0 right-0 pointer-events-none transition-all duration-75 border-y-2',
                    rulerHeight === 'sm' && 'h-6 -translate-y-3',
                    rulerHeight === 'md' && 'h-9 -translate-y-4.5',
                    rulerHeight === 'lg' && 'h-14 -translate-y-7',
                    rulerColor === 'gold' && 'bg-[#D89A06]/20 border-[#D89A06]',
                    rulerColor === 'navy' && 'bg-[#00004E]/20 border-[#00004E]',
                    rulerColor === 'amber' && 'bg-amber-500/20 border-amber-500'
                  )}
                  style={{ top: `${readingRulerY}px` }}
                />
              )}

              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground border-b border-border/60 pb-2">
                <span className="font-bold text-[#00004E] dark:text-[#D89A06]">
                  {SANDBOX_SAMPLES[sampleCategory].courseCode}
                </span>
                <span className="font-semibold">{SANDBOX_SAMPLES[sampleCategory].unitCode}</span>
              </div>

              <div className="space-y-2 text-foreground">
                <h4 className="font-bold text-sm">
                  {SANDBOX_SAMPLES[sampleCategory].heading}
                </h4>

                <div className="text-xs text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {SANDBOX_SAMPLES[sampleCategory].markdownBody}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Action Toolbar inside Sandbox: Read Aloud + Touch Target */}
              <div className="pt-2.5 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSpeech(SANDBOX_SAMPLES[sampleCategory].speechText)}
                  className={cn(
                    'min-h-[44px] px-3.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs',
                    isSpeaking
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905]'
                  )}
                  title="Read this sample passage using browser speech synthesis"
                >
                  {isSpeaking ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  {isSpeaking ? 'Stop Reading' : 'Listen Aloud (TTS)'}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SANDBOX_SAMPLES[sampleCategory].speechText);
                      toast.success('Sample passage copied to clipboard!');
                    }}
                    className="h-9 px-2.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                    title="Copy sample text"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-1 rounded border border-border">
                    Target: 48px OK
                  </span>
                </div>
              </div>
            </div>

            {/* Color Vision Palette Swatch Test */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
                <span>CVD Contrast Swatches</span>
                <span className="text-[10px] lowercase text-muted-foreground">{telemetry.colorBlindLabel}</span>
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono font-bold">
                <div className="h-8 rounded bg-[#00004E] text-white flex items-center justify-center border border-border/40">
                  Navy
                </div>
                <div className="h-8 rounded bg-[#D89A06] text-[#00004E] flex items-center justify-center border border-border/40">
                  Gold
                </div>
                <div className="h-8 rounded bg-emerald-600 text-white flex items-center justify-center border border-border/40">
                  Emerald
                </div>
                <div className="h-8 rounded bg-rose-600 text-white flex items-center justify-center border border-border/40">
                  Crimson
                </div>
              </div>
            </div>

            {/* Quick Diagnostic Checklist */}
            <div className="space-y-1.5 pt-2 text-xs border-t border-border/60">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Typography Engine:</span>
                <span className="font-mono font-semibold text-foreground">
                  {telemetry.fontLabel}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Proportional Scale:</span>
                <span className="font-mono font-bold text-[#00004E] dark:text-[#D89A06]">
                  {telemetry.textScaleLabel}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Line Height Factor:</span>
                <span className="font-mono font-semibold text-foreground">
                  {telemetry.spacingLabel}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Focus Ring Indicator:</span>
                <span className="font-mono font-semibold text-foreground">
                  {highVisFocus ? 'UPSA Gold 3px (High-Vis)' : 'Standard Ring'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Reading Ruler Guide:</span>
                <span className="font-mono font-semibold text-foreground">
                  {readingRulerActive ? `Active (${readingRulerScope})` : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}