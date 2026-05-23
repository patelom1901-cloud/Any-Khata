import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { translations, Locale, TranslationKey } from '../constants/i18n/index';

// For React Native / Expo environment
const __DEV__ = process.env.NODE_ENV !== 'production';

export const useTranslation = () => {
  const selectedLanguage = useAuthStore((state) => state.selectedLanguage) as Locale;

  const t = useCallback((key: TranslationKey): string => {
    const langDict = translations[selectedLanguage];
    let val = langDict?.[key as keyof typeof langDict];
    
    // Fallback to English if translation is missing or empty
    if (!val || val.trim() === '') {
      val = (translations['en'] as any)[key];
      
      // Future-Proofing: Warn in development if a string is missing
      if (__DEV__ && !val) {
        console.warn(`[i18n] Missing translation for key: "${key}" in locale: "${selectedLanguage}"`);
      }
    }
    
    return val || (key as string); 
  }, [selectedLanguage]);

  return { t, selectedLanguage };
};
