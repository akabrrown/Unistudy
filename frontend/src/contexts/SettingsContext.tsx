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

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
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
        const data = await apiFetch('/settings/accessibility');
        if (data && data.settings) {
          setSettings(data.settings);
          applyDOMChanges(data.settings);
          return;
        }
      } catch (err) {
        // If the backend complains about a missing auth header, skip auth and use default settings
        if (err instanceof Error && err.message.includes('Missing')) {
          console.warn('Missing auth header; using default client settings');
          // Apply default settings defined earlier in this file
          setSettings(defaultSettings);
          applyDOMChanges(defaultSettings);
        } else {
          console.error('Failed to load user settings:', err);
        }
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    // Optimistic update
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    applyDOMChanges(newSettings);
    
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
  } else {
    root.classList.remove('dark');
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
  } else {
    root.removeAttribute('data-animations');
  }
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
