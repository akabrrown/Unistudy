import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeColors, ThemeColors } from './constants/theme';
import { apiFetch } from './api';
import { supabase } from './supabase';

export type DisplayTheme = 'dark' | 'light';
export type TextSize = 'small' | 'normal' | 'large';
export type ModelTier = 'default' | 'fast' | 'smart';

export interface MobileSettings {
  theme: DisplayTheme;
  highContrast: boolean;
  dyslexiaFont: boolean;
  textSize: TextSize;
  lowBandwidth: boolean;
  selectedModelTier: ModelTier;
  aiPersonality: string;
}

const defaultSettings: MobileSettings = {
  theme: 'dark',
  highContrast: false,
  dyslexiaFont: false,
  textSize: 'normal',
  lowBandwidth: false,
  selectedModelTier: 'default',
  aiPersonality: 'neutral',
};

const SETTINGS_STORAGE_KEY = 'unistudy_mobile_settings';

interface SettingsContextType {
  settings: MobileSettings;
  colors: ThemeColors;
  updateSettings: (updates: Partial<MobileSettings>) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<MobileSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  // Load local preferences on mount
  useEffect(() => {
    async function loadStoredSettings() {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings(prev => ({ ...prev, ...parsed }));
        }

        // Try syncing from backend if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          try {
            const serverSettings = await apiFetch('/settings/accessibility');
            if (serverSettings) {
              setSettings(prev => ({
                ...prev,
                highContrast: Boolean(serverSettings.high_contrast),
                lowBandwidth: Boolean(serverSettings.low_bandwidth),
                theme: (serverSettings.theme === 'light' || serverSettings.theme === 'dark') ? serverSettings.theme : prev.theme,
              }));
            }
          } catch {
            // Graceful fallback to local settings
          }
        }
      } catch (e) {
        console.warn('Failed to load settings:', e);
      } finally {
        setLoading(false);
      }
    }

    loadStoredSettings();
  }, []);

  const updateSettings = useCallback(async (updates: Partial<MobileSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next)).catch(console.warn);
      
      // Also sync model tier specifically for api headers
      if (updates.selectedModelTier) {
        AsyncStorage.setItem('unistudy-model-preference', updates.selectedModelTier).catch(console.warn);
      }

      // Sync to backend if logged in
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          apiFetch('/settings/accessibility', {
            method: 'PUT',
            body: JSON.stringify({
              high_contrast: next.highContrast,
              low_bandwidth: next.lowBandwidth,
              theme: next.theme,
            }),
          }).catch(() => {});
        }
      });

      return next;
    });
  }, []);

  const isDark = settings.theme === 'dark';
  const colors = getThemeColors(isDark, settings.highContrast);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        colors,
        updateSettings,
        loading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

