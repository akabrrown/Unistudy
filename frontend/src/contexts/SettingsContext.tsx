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
}

const defaultSettings: UserSettings = {
  theme: 'light',
  font_family: 'inter',
  text_size: 'normal',
  region: 'north-america',
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
};

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const SETTINGS_CACHE_KEY = 'unistudy_settings_cache_v1';
const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

function readCachedSettings(): UserSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { settings?: UserSettings; cachedAt?: number };
    if (parsed.settings && typeof parsed.cachedAt === 'number' && Date.now() - parsed.cachedAt < SETTINGS_CACHE_TTL_MS) {
      return parsed.settings;
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

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(() => ({
    ...defaultSettings,
    theme: typeof window !== 'undefined' ? getActiveTheme() : 'light',
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
        const cached = readCachedSettings();
        if (cached) {
          const merged = { ...cached, theme: activeTheme };
          setSettings(merged);
          applyDOMChanges(merged);
          setLoading(false);
          return;
        }

        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // No user session active; retain active theme without sending unauthenticated requests
          const merged = { ...defaultSettings, theme: activeTheme };
          setSettings(merged);
          setLoading(false);
          return;
        }

        const data = await apiFetch('/settings/accessibility');
        if (data && data.settings) {
          const localStoredTheme = typeof window !== 'undefined' ? (localStorage.getItem('theme') as DisplayTheme) : null;
          const resolvedTheme = localStoredTheme || data.settings.theme || activeTheme;
          const merged = { ...data.settings, theme: resolvedTheme };
          setSettings(merged);
          applyDOMChanges(merged);
          writeCachedSettings(merged);
          return;
        }
      } catch (err) {
        // Fall back to defaults on any error: network failure, FK constraint, missing profile, etc.
        console.warn('Settings unavailable, using defaults:', err instanceof Error ? err.message : err);
        const activeTheme = getActiveTheme();
        const merged = { ...defaultSettings, theme: activeTheme };
        setSettings(merged);
        applyDOMChanges(merged);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    // If theme is updated, synchronize with localStorage for next-themes immediately
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

    // Optimistic update
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    applyDOMChanges(newSettings);
    writeCachedSettings(newSettings);
    
    try {
      await apiFetch('/settings/accessibility', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error("Failed to save settings:", err);
      // rollback could be implemented here
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
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

// Side-effects function to append classes to body tag
function applyDOMChanges(settings: UserSettings) {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  // Set language attribute for UI localization
  if (settings.language) {
    root.setAttribute('lang', settings.language);
  }
  
  // Theme
  if (settings.theme === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else if (settings.theme === 'light') {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }

  // High Contrast
  if (settings.high_contrast) {
    root.setAttribute('data-contrast', 'high');
  } else {
    root.removeAttribute('data-contrast');
  }
  
  // Typography
  root.setAttribute('data-font', settings.font_family);
  root.setAttribute('data-text-size', settings.text_size);
  root.setAttribute('data-spacing', settings.line_spacing);
  
  // Accessibility Vision
  if (settings.color_blind_mode) {
    root.setAttribute('data-color-blind', settings.color_blind_mode);
  } else {
    root.removeAttribute('data-color-blind');
  }

  // Performance
  if (settings.low_bandwidth) {
    root.setAttribute('data-animations', 'off');
    root.setAttribute('data-reduced-motion', 'true');
  } else {
    root.removeAttribute('data-animations');
    root.removeAttribute('data-reduced-motion');
  }

  // Cognitive Simplified Layout Mode
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
