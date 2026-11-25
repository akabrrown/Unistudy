'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api/client';
import { NextIntlClientProvider } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

export type DisplayTheme = 'light' | 'dark';
export type FontFamily = 'inter' | 'opendyslexic';
export type TextSize = 'small' | 'normal' | 'large' | 'extra-large';
export type LineSpacing = 'normal' | 'double';
export type ColorBlindMode = null | 'deuteranopia' | 'protanopia' | 'achromatopsia';

export type AIPersonality = 'encouraging' | 'strict' | 'funny' | 'neutral' | 'motivational' | 'empathetic' | 'curious';
export type AIReadingLevel = 'simplified' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type AITone = 'academic' | 'casual';
export type LearningStyle = null | 'visual' | 'auditory' | 'reading_writing' | 'kinaesthetic';

export type Language = 'en' | 'fr' | 'tw' | 'ha' | 'yo' | 'sw';
export type Region = 'north-america' | 'europe' | 'africa' | 'asia' | 'south-america' | 'oceania';

export interface UserSettings {
  theme: DisplayTheme;
  font_family: FontFamily;
  text_size: TextSize;
  line_spacing: LineSpacing;
  color_blind_mode: ColorBlindMode;
  high_contrast: boolean;

  ai_tutor_name: string;
  ai_personality: AIPersonality;
  ai_reading_level: AIReadingLevel;
  ai_tone: AITone;
  learning_style: LearningStyle;

  language: Language;
  region: Region;
  low_bandwidth: boolean;
  simplified_mode: boolean;

  // Client-persisted assistive preferences (zero DB schema coupling)
  reduced_motion?: boolean;
  reading_ruler?: boolean;
  reading_ruler_height?: number;
}

const defaultSettings: UserSettings = {
  theme: 'light',
  font_family: 'inter',
  text_size: 'normal',
  region: 'africa',
  line_spacing: 'normal',
  color_blind_mode: null,
  high_contrast: false,

  ai_tutor_name: 'Uni',
  ai_personality: 'neutral',
  ai_reading_level: 'intermediate',
  ai_tone: 'academic',
  learning_style: null,

  language: 'en',
  low_bandwidth: false,
  simplified_mode: false,
  reduced_motion: false,
  reading_ruler: false,
  reading_ruler_height: 44,
};

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const SETTINGS_CACHE_KEY = 'unistudy_settings_cache_v1';
const CLIENT_A11Y_KEY = 'unistudy_client_a11y_v1';
const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

interface ClientA11yPrefs {
  reduced_motion?: boolean;
  reading_ruler?: boolean;
  reading_ruler_height?: number;
}

function readClientA11yPrefs(): ClientA11yPrefs {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CLIENT_A11Y_KEY);
    return raw ? (JSON.parse(raw) as ClientA11yPrefs) : {};
  } catch {
    return {};
  }
}

function writeClientA11yPrefs(prefs: ClientA11yPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = readClientA11yPrefs();
    localStorage.setItem(CLIENT_A11Y_KEY, JSON.stringify({ ...existing, ...prefs }));
  } catch {
    // ignore storage errors
  }
}

function readCachedSettings(): UserSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { settings?: UserSettings; cachedAt?: number };
    if (parsed.settings && typeof parsed.cachedAt === 'number' && Date.now() - parsed.cachedAt < SETTINGS_CACHE_TTL_MS) {
      return { ...parsed.settings, ...readClientA11yPrefs() };
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function writeCachedSettings(next: UserSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({ settings: next, cachedAt: Date.now() }));
  } catch {
    // ignore storage errors
  }
}

function getActiveTheme(): DisplayTheme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function GlobalReadingRuler({ active, height = 44 }: { active: boolean; height?: number }) {
  const [yPos, setYPos] = useState(240);

  useEffect(() => {
    if (!active) return;
    const onMove = (e: MouseEvent) => setYPos(e.clientY);
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [active]);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 pointer-events-none z-[90] border-y-2 border-[#D89A06] bg-[#FEF8E7]/25 dark:bg-[#D89A06]/10"
      style={{
        top: Math.max(0, yPos - height / 2),
        height,
      }}
    />
  );
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(() => ({
    ...defaultSettings,
    theme: typeof window !== 'undefined' ? getActiveTheme() : 'light',
    ...(typeof window !== 'undefined' ? readClientA11yPrefs() : {}),
  }));
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    async function loadMessages(lang: string) {
      try {
        const mod = await import(`../messages/${lang}.json`);
        setMessages(mod.default);
      } catch (err) {
        console.error('Failed to load translations for locale', lang);
      }
    }
    loadMessages(settings.language);
  }, [settings.language]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const activeTheme = getActiveTheme();
        const clientPrefs = readClientA11yPrefs();
        const cached = readCachedSettings();
        if (cached) {
          const merged = { ...defaultSettings, ...cached, ...clientPrefs, theme: activeTheme };
          setSettings(merged);
          applyDOMChanges(merged);
          setLoading(false);
          return;
        }

        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          const merged = { ...defaultSettings, ...clientPrefs, theme: activeTheme };
          setSettings(merged);
          applyDOMChanges(merged);
          setLoading(false);
          return;
        }

        const data = await apiFetch('/settings/accessibility');
        if (data && data.settings) {
          const localStoredTheme = typeof window !== 'undefined' ? (localStorage.getItem('theme') as DisplayTheme) : null;
          const resolvedTheme = localStoredTheme || data.settings.theme || activeTheme;
          const merged = { ...defaultSettings, ...data.settings, ...clientPrefs, theme: resolvedTheme };
          setSettings(merged);
          applyDOMChanges(merged);
          writeCachedSettings(merged);
          return;
        }
      } catch (err) {
        console.warn('Settings unavailable, using defaults:', err instanceof Error ? err.message : err);
        const activeTheme = getActiveTheme();
        const merged = { ...defaultSettings, ...readClientA11yPrefs(), theme: activeTheme };
        setSettings(merged);
        applyDOMChanges(merged);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (updates.theme && typeof window !== 'undefined') {
      localStorage.setItem('theme', updates.theme);
      if (updates.theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    }

    const clientPatch: ClientA11yPrefs = {};
    if (typeof updates.reduced_motion === 'boolean') clientPatch.reduced_motion = updates.reduced_motion;
    if (typeof updates.reading_ruler === 'boolean') clientPatch.reading_ruler = updates.reading_ruler;
    if (typeof updates.reading_ruler_height === 'number') clientPatch.reading_ruler_height = updates.reading_ruler_height;
    if (Object.keys(clientPatch).length > 0) {
      writeClientA11yPrefs(clientPatch);
    }

    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    applyDOMChanges(newSettings);
    writeCachedSettings(newSettings);

    // Strip client-only fields before sending to backend PATCH endpoint
    const {
      reduced_motion: _rm,
      reading_ruler: _rr,
      reading_ruler_height: _rrh,
      ...serverUpdates
    } = updates;

    if (Object.keys(serverUpdates).length === 0) return;

    try {
      await apiFetch('/settings/accessibility', {
        method: 'PATCH',
        body: JSON.stringify(serverUpdates),
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      <GlobalReadingRuler
        active={Boolean(settings.reading_ruler)}
        height={settings.reading_ruler_height || 44}
      />
      {messages ? (
        <NextIntlClientProvider locale={settings.language} messages={messages}>
          {children}
        </NextIntlClientProvider>
      ) : (
        children
      )}
    </SettingsContext.Provider>
  );
}

function applyDOMChanges(settings: UserSettings) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (settings.language) {
    root.setAttribute('lang', settings.language);
  }

  if (settings.theme === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else if (settings.theme === 'light') {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }

  if (settings.high_contrast) {
    root.setAttribute('data-contrast', 'high');
  } else {
    root.removeAttribute('data-contrast');
  }

  root.setAttribute('data-font', settings.font_family);
  root.setAttribute('data-text-size', settings.text_size);
  root.setAttribute('data-spacing', settings.line_spacing);

  if (settings.color_blind_mode) {
    root.setAttribute('data-color-blind', settings.color_blind_mode);
  } else {
    root.removeAttribute('data-color-blind');
  }

  if (settings.low_bandwidth) {
    root.setAttribute('data-animations', 'off');
  } else {
    root.removeAttribute('data-animations');
  }

  if (settings.reduced_motion || settings.low_bandwidth) {
    root.setAttribute('data-reduced-motion', 'true');
  } else {
    root.removeAttribute('data-reduced-motion');
  }

  if (settings.simplified_mode) {
    root.setAttribute('data-simplified', 'true');
  } else {
    root.removeAttribute('data-simplified');
  }
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
