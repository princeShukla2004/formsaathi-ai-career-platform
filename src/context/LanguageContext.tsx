import React, { createContext, useContext, useEffect, useState } from 'react';
import { TRANSLATIONS } from '../i18n/translations';
import type { LanguageCode } from '../types';

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem('formsaathi_lang');
      if (saved === 'en' || saved === 'hi') return saved;
    } catch {
      // ignore
    }
    return 'en';
  });

  useEffect(() => {
    try {
      localStorage.setItem('formsaathi_lang', language);
    } catch {
      // ignore
    }
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: LanguageCode) => setLanguageState(lang);

  const t = (key: string): string => {
    return TRANSLATIONS[language][key] ?? TRANSLATIONS.en[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
