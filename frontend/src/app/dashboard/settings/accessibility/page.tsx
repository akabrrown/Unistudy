'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
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
  RotateCcw,
  Sliders,
  Sun,
  Moon,
  Keyboard,
  Globe,
  Check,
  Laptop,
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

export default function AccessibilitySettingsPage() {
  const { settings, updateSettings, loading } = useSettings();

  const [activeTab, setActiveTab] = useState<A11yDomainTab>('vision');
  const [readingRulerActive, setReadingRulerActive] = useState(false);
  const [readingRulerY, setReadingRulerY] = useState(120);
  const [sampleButtonTouched, setSampleButtonTouched] = useState(false);

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

    return {
      activeAccommodations,
      complianceTier: isHighContrast ? 'WCAG AAA (7:1+)' : 'WCAG AA (4.5:1+)',
      fontLabel: isDyslexic ? 'OpenDyslexic Regular' : 'Inter Variable',
      textScaleLabel:
        settings.text_size === 'small'
          ? '87.5%'
          : settings.text_size === 'large'
          ? '115%'
          : settings.text_size === 'extra-large'
          ? '130%'
          : '100%',
      spacingLabel: settings.line_spacing === 'double' ? 'Double (2.0)' : 'Standard (1.5)',
      colorBlindLabel:
        settings.color_blind_mode === 'deuteranopia'
          ? 'Deuteranopia (Green)'
          : settings.color_blind_mode === 'protanopia'
          ? 'Protanopia (Red)'
          : settings.color_blind_mode === 'achromatopsia'
          ? 'Achromatopsia (Mono)'
          : 'Full Spectrum (None)',
    };
  }, [settings]);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto p-8 text-center space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary animate-pulse">
          <Accessibility className="w-5 h-5" />
        </div>
        <p className="text-sm font-mono text-muted-foreground">
          Calibrating client accessibility &amp; DOM tokens...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-12">
      {/* Studio Header & Settings Suite Navigation */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-mono uppercase tracking-wider">
            <Accessibility className="w-3.5 h-3.5" />
            Inclusive Design · W3C WCAG 2.2 · Ergonomics Studio
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            Accessibility &amp; Assistive Ergonomics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Tailor UniStudy to your visual, cognitive, sensory, and motor preferences. Changes apply
            immediately to global design tokens and synchronize across devices.
          </p>
        </div>

        {/* Settings Suite Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-xl border border-border bg-muted/40 p-1">
            <Link
              href="/dashboard/settings/profile"
              className="inline-flex items-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5" />
              Profile
            </Link>
            <Link
              href="/dashboard/settings/accessibility"
              className="inline-flex items-center gap-1.5 rounded-lg bg-background text-foreground shadow-xs px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <Accessibility className="w-3.5 h-3.5 text-primary" />
              Accessibility
            </Link>
            <Link
              href="/dashboard/settings/billing"
              className="inline-flex items-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Billing
            </Link>
          </div>

          <button
            type="button"
            onClick={() => void handleResetDefaults()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-muted px-3.5 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
            Reset Baseline
          </button>
        </div>
      </header>

      {/* 4-Tile Assistive Telemetry Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Contrast &amp; Compliance
            </p>
            <p className="text-lg font-bold font-mono text-foreground mt-0.5">
              {telemetry.complianceTier}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Theme: {settings.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Eye className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Typography Engine
            </p>
            <p className="text-lg font-bold font-mono text-foreground mt-0.5 truncate max-w-[170px]">
              {settings.font_family === 'opendyslexic' ? 'OpenDyslexic' : 'Inter'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Scale: {telemetry.textScaleLabel} · Leading: {telemetry.spacingLabel}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Type className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Cognitive &amp; Bandwidth
            </p>
            <p className="text-lg font-bold font-mono text-foreground mt-0.5">
              {settings.simplified_mode ? 'Simplified UI' : 'Full Suite'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {settings.low_bandwidth ? 'Data Saver (Animations Off)' : 'Fluid Motion Active'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Brain className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Chromatic Spectrum Filter
            </p>
            <p className="text-lg font-bold font-mono text-foreground mt-0.5 truncate max-w-[170px]">
              {settings.color_blind_mode ? settings.color_blind_mode : 'Standard RGB'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {telemetry.activeAccommodations} active assistive modifier(s)
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
            <Sliders className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* 1-Click W3C Inclusive Presets Bar */}
      <section className="rounded-2xl border border-border/80 bg-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              1-Click Inclusive Design Presets
            </h2>
            <p className="text-xs text-muted-foreground">
              Quickly switch between industry-standard accessibility configurations curated for
              specific reading and cognitive profiles.
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border">
            Instant Global Apply
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
          {WCAG_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => void handleApplyPreset(preset)}
                className="rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/40 hover:border-primary/40 p-3 text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-background border border-border font-semibold text-muted-foreground">
                    {preset.badge}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    {preset.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
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
          <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/30 p-1 w-full sm:w-auto">
            {(
              [
                { id: 'vision', label: 'Vision & Typography', icon: Eye },
                { id: 'cognitive', label: 'Cognitive & Focus', icon: Brain },
                { id: 'motor', label: 'Motor & Ergonomics', icon: MousePointer },
                { id: 'connectivity', label: 'Network & Language', icon: Wifi },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                    activeTab === tab.id
                      ? 'bg-background text-foreground shadow-xs border border-border/60'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: VISION & TYPOGRAPHY */}
          {activeTab === 'vision' && (
            <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" />
                  Vision, Typography &amp; Chromatic Filters
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adjust color contrast, dyslexia typography, scale factors, and color-vision
                  deficiency accommodations.
                </p>
              </div>

              {/* Theme & Contrast Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/70 bg-muted/15 p-4 space-y-2.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Display Mode</span>
                    <span className="text-foreground font-semibold capitalize">{settings.theme}</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleUpdate({ theme: 'light' }, 'Theme set to Light')}
                      className={cn(
                        'inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-colors cursor-pointer',
                        settings.theme === 'light'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      Light
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleUpdate({ theme: 'dark' }, 'Theme set to Dark')}
                      className={cn(
                        'inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-colors cursor-pointer',
                        settings.theme === 'dark'
                          ? 'border-primary bg-primary text-primary-foreground'
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
                      <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                        High Contrast Mode
                      </label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Exceeds WCAG AAA 7:1 ratio
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
                        settings.high_contrast ? 'bg-primary' : 'bg-muted-foreground/30'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
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
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-semibold">
                      Dyslexia Aid
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enforces weighted bottom gravity to anchor letters and prevent cognitive flipping
                    (b/d, p/q).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = settings.font_family === 'opendyslexic' ? 'inter' : 'opendyslexic';
                    void handleUpdate(
                      { font_family: next },
                      next === 'opendyslexic' ? 'OpenDyslexic enabled' : 'Inter enabled'
                    );
                  }}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0',
                    settings.font_family === 'opendyslexic' ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      settings.font_family === 'opendyslexic' ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {/* Text Size Scale Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    Viewport Text Scaling
                  </label>
                  <span className="text-xs font-mono font-bold text-primary">
                    {telemetry.textScaleLabel}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'small', label: 'Compact', pct: '87.5%' },
                      { id: 'normal', label: 'Standard', pct: '100%' },
                      { id: 'large', label: 'Large', pct: '115%' },
                      { id: 'extra-large', label: 'Max', pct: '130%' },
                    ] as const
                  ).map((scale) => (
                    <button
                      key={scale.id}
                      type="button"
                      onClick={() =>
                        void handleUpdate({ text_size: scale.id }, `Text scale: ${scale.label}`)
                      }
                      className={cn(
                        'rounded-xl border py-2.5 px-2 text-center transition-all cursor-pointer',
                        settings.text_size === scale.id
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <div className="text-xs">{scale.label}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{scale.pct}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Spacing / Leading Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    Line Height Leading Spacing
                  </label>
                  <span className="text-xs font-mono font-bold text-primary">
                    {telemetry.spacingLabel}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'normal', label: 'Standard Leading (1.5)', desc: 'Balanced vertical rhythm' },
                      { id: 'double', label: 'Double Spaced (2.0)', desc: 'Expanded vertical eye tracking' },
                    ] as const
                  ).map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() =>
                        void handleUpdate({ line_spacing: sp.id as LineSpacing }, `Spacing: ${sp.label}`)
                      }
                      className={cn(
                        'rounded-xl border p-3 text-left transition-colors cursor-pointer',
                        settings.line_spacing === sp.id
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <div className="text-xs font-bold text-foreground">{sp.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{sp.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Blindness (CVD) Filters */}
              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                    Color Vision Deficiency (CVD) Accommodations
                  </label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {telemetry.colorBlindLabel}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    [
                      { id: null, label: 'Full Spectrum (None)', desc: 'Standard system color palette' },
                      { id: 'deuteranopia', label: 'Deuteranopia', desc: 'Enhanced green-weak contrast (Blue/Orange)' },
                      { id: 'protanopia', label: 'Protanopia', desc: 'Enhanced red-weak contrast (Blue/Yellow)' },
                      { id: 'achromatopsia', label: 'Achromatopsia', desc: 'High-luminance monochrome greyscale' },
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
                            ? 'border-primary bg-primary/10 shadow-xs'
                            : 'border-border bg-background hover:bg-muted/30'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{cvd.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
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
            <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Brain className="w-4 h-4 text-amber-500" />
                  Cognitive Ergonomics &amp; Distraction Elimination
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Optimize your workspace for ADHD, sensory calm, and deep focus revision.
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
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-semibold">
                        ADHD Focus
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Hides non-essential widgets and collapses auxiliary sidebars to keep only primary
                      reading content visible.
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
                      settings.simplified_mode ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
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
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-500 font-semibold">
                        Vestibular Aid
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Disables smooth layout shifts, pulsing highlights, and bouncing indicators to
                      prevent vestibular motion sickness.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void handleUpdate(
                        { low_bandwidth: !settings.low_bandwidth },
                        settings.low_bandwidth ? 'Animations active' : 'Reduced motion active'
                      )
                    }
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0',
                      settings.low_bandwidth ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        settings.low_bandwidth ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>

                {/* Reading Guide Line Focus Ruler */}
                <div className="rounded-xl border border-border/70 bg-muted/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        Interactive Reading Line Ruler
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                        Eye Guide
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Projects a highlighted horizontal ruler over text that follows your cursor to
                      prevent skipping lines while reading dense papers.
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
                      readingRulerActive ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        readingRulerActive ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MOTOR & ERGONOMICS */}
          {activeTab === 'motor' && (
            <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-emerald-500" />
                  Motor Dexterity &amp; Keyboard Navigation
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Touch target padding guidelines, high-visibility focus indicators, and keyboard
                  navigation shortcuts.
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
                      All buttons, links, and form inputs maintain generous hitboxes for motor tremor
                      and touchscreen reliability.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-semibold">
                    WCAG 2.5.5
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSampleButtonTouched(true);
                      toast.success('48px Accessible Target Click Registered');
                      setTimeout(() => setSampleButtonTouched(false), 2000);
                    }}
                    className="min-h-[48px] min-w-[140px] px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] cursor-pointer focus:outline-none focus:ring-4 focus:ring-primary/40"
                  >
                    {sampleButtonTouched ? <Check className="w-4 h-4" /> : <MousePointer className="w-4 h-4" />}
                    Test Touch Target
                  </button>
                  <span className="text-xs text-muted-foreground">
                    Try tabbing or clicking above to verify focus ring thickness.
                  </span>
                </div>
              </div>

              {/* Keyboard Shortcut Cheat Sheet */}
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Keyboard className="w-4 h-4 text-primary" />
                    Essential Keyboard Shortcuts
                  </span>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">
                    Platform Standard
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5 flex items-center justify-between">
                    <span className="text-muted-foreground">Toggle Collapsible Sidebar</span>
                    <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px] font-bold">
                      Ctrl + B
                    </kbd>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5 flex items-center justify-between">
                    <span className="text-muted-foreground">Focus Global Search Bar</span>
                    <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px] font-bold">
                      / or Ctrl + K
                    </kbd>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5 flex items-center justify-between">
                    <span className="text-muted-foreground">Dismiss Active Modal / Sheet</span>
                    <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px] font-bold">
                      Esc
                    </kbd>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5 flex items-center justify-between">
                    <span className="text-muted-foreground">Cycle Forward / Backward</span>
                    <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px] font-bold">
                      Tab / Shift+Tab
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CONNECTIVITY & LANGUAGE */}
          {activeTab === 'connectivity' && (
            <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-sky-500" />
                  Connectivity Optimization &amp; Multilingual Delivery
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Save mobile data, disable prefetching, and set preferred UI and audio translation
                  languages.
                </p>
              </div>

              {/* Low Bandwidth Toggle */}
              <div className="rounded-xl border border-border/70 bg-muted/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Low Bandwidth Mode</span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-500 font-semibold">
                      Cellular Saver
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Aggressively compresses slide thumbnails, skips high-res video autoplay, and
                    disables network prefetching to save bandwidth.
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
                    settings.low_bandwidth ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      settings.low_bandwidth ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {/* Multilingual Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  Primary Application &amp; AI Language
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'en', label: 'English (Default)', native: 'English' },
                      { id: 'fr', label: 'Français', native: 'French' },
                      { id: 'tw', label: 'Twi', native: 'Ghana Akan' },
                      { id: 'ha', label: 'Hausa', native: 'Harshen Hausa' },
                      { id: 'yo', label: 'Yorùbá', native: 'Èdè Yorùbá' },
                      { id: 'sw', label: 'Kiswahili', native: 'Swahili' },
                    ] as const
                  ).map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() =>
                        void handleUpdate({ language: lang.id as Language }, `Language set to ${lang.label}`)
                      }
                      className={cn(
                        'rounded-xl border p-3 text-left transition-all cursor-pointer',
                        settings.language === lang.id
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <div className="text-xs font-bold text-foreground">{lang.label}</div>
                      <div className="text-[10px] text-muted-foreground">{lang.native}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 Cols: Live Interactive Assistive Sandbox & Reading Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 sticky top-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Live Assistive Reading Sandbox</h3>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border font-semibold">
                DOM Reactive
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              This card reflects your active typography, font scaling, contrast, and color blindness
              filter in real time.
            </p>

            {/* Sandbox Card with simulated attributes */}
            <div
              onMouseMove={(e) => {
                if (readingRulerActive) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setReadingRulerY(Math.max(20, Math.min(e.clientY - rect.top, rect.height - 20)));
                }
              }}
              className={cn(
                'relative rounded-xl border border-border p-4 bg-background transition-all overflow-hidden space-y-3.5',
                settings.font_family === 'opendyslexic' && 'tracking-wide font-[OpenDyslexic]',
                settings.line_spacing === 'double' ? 'leading-loose' : 'leading-relaxed'
              )}
            >
              {/* Reading Ruler Guide */}
              {readingRulerActive && (
                <div
                  className="absolute left-0 right-0 h-7 bg-primary/20 border-y-2 border-primary pointer-events-none transition-all duration-75"
                  style={{ top: `${readingRulerY - 14}px` }}
                />
              )}

              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground border-b border-border/60 pb-2">
                <span className="font-bold text-primary">MATH 201: LINEAR ALGEBRA</span>
                <span>LEC 04</span>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-foreground text-sm">
                  Eigenvalues &amp; Characteristic Polynomials
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Let matrix A be an n × n matrix over ℝ. A scalar λ is called
                  an eigenvalue of A if there exists a non-zero vector v such that Av = λv.
                  The characteristic equation is defined by:
                </p>

                <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5 text-center font-mono text-xs text-foreground font-bold">
                  det(A - λI) = 0
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Notice how OpenDyslexic weighted bottoms prevent confusion between b, d, p, and q,
                  while increased line leading prevents visual skipping between rows.
                </p>
              </div>

              {/* Accessible Interactive Target Preview */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="min-h-[44px] px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Primary Action
                </button>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Target: 44×44px OK
                </span>
              </div>
            </div>

            {/* Quick Diagnostic Checklist */}
            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Typography Engine:</span>
                <span className="font-mono font-semibold text-foreground">
                  {telemetry.fontLabel}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Text Scale Factor:</span>
                <span className="font-mono font-semibold text-primary">
                  {telemetry.textScaleLabel}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Leading Line Height:</span>
                <span className="font-mono font-semibold text-foreground">
                  {telemetry.spacingLabel}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Color Vision Modifier:</span>
                <span className="font-mono font-semibold text-foreground">
                  {telemetry.colorBlindLabel}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Distraction Reducer:</span>
                <span className="font-mono font-semibold text-foreground">
                  {settings.simplified_mode ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
