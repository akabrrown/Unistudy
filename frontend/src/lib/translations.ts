type Language = 'en' | 'fr' | 'tw' | 'ha' | 'yo' | 'sw';

interface Translations {
  [key: string]: { [lang in Language]?: string };
}

const translations: Translations = {
  'accessibility.title': {
    en: 'Accessibility & Preferences',
    fr: 'Accessibilité & Préférences',
    tw: 'Accessibility & Preferences',
    ha: 'Accessibility & Preferences',
    yo: 'Accessibility & Preferences',
    sw: 'Accessibility & Preferences',
  },
  'accessibility.description': {
    en: 'Tailor UniStudy to your reading needs, internet connection, and learning style.',
    fr: "Adaptez UniStudy à vos besoins de lecture, connexion internet et style d'apprentissage.",
    tw: 'Tailor UniStudy to your reading needs, internet connection, and learning style.',
    ha: 'Tailor UniStudy to your reading needs, internet connection, and learning style.',
    yo: 'Tailor UniStudy to your reading needs, internet connection, and learning style.',
    sw: 'Tailor UniStudy to your reading needs, internet connection, and learning style.',
  },
  // Add more keys as needed
};

import { useSettings } from '@/contexts/SettingsContext';
import { useCallback } from 'react';

export function useTranslation() {
  const { settings } = useSettings();
  const t = useCallback(
    (key: string) => {
      const entry = translations[key] ?? {};
      return entry[settings.language] ?? entry['en'] ?? key;
    },
    [settings.language]
  );
  return { t };
}
