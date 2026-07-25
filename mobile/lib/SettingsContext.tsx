import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SettingsState = {
  theme: 'light' | 'dark' | 'system';
  font: 'inter' | 'opendyslexic';
  contrast: 'normal' | 'high';
  lowBandwidth: boolean;
  simplifiedUI: boolean;
  aiTutorName: string;
  aiPersonality: 'neutral' | 'encouraging' | 'strict' | 'funny' | 'motivational' | 'empathetic' | 'curious';
  aiReadingLevel: 'simplified' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
  aiTone: 'academic' | 'casual';
};

type SettingsContextType = {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
};

const defaultSettings: SettingsState = {
  theme: 'system',
  font: 'inter',
  contrast: 'normal',
  lowBandwidth: false,
  simplifiedUI: false,
  aiTutorName: 'Uni',
  aiPersonality: 'encouraging',
  aiReadingLevel: 'intermediate',
  aiTone: 'casual',
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSetting: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('@settings');
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const updateSetting = async <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await AsyncStorage.setItem('@settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save setting', e);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
};
