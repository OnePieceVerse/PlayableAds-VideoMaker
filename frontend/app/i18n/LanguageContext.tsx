'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, translations, TranslationKey } from './locales';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const defaultLocale: Locale = 'zh'; // 默认使用中文

const LanguageContext = createContext<LanguageContextType>({
  locale: defaultLocale,
  setLocale: () => {},
  t: (key) => key,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 从本地存储中获取语言设置，如果没有则使用默认语言
    try {
      const savedLocale = localStorage.getItem('locale') as Locale | null;
      if (savedLocale && (savedLocale === 'zh' || savedLocale === 'en')) {
        setLocaleState(savedLocale);
        document.documentElement.lang = savedLocale;
      }
    } catch (error) {
      console.error('Failed to access localStorage:', error);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem('locale', newLocale);
    } catch (error) {
      console.error('Failed to write to localStorage:', error);
    }
    document.documentElement.lang = newLocale;
  };

  const t = (key: TranslationKey): string => {
    return translations[locale][key] || translations['en'][key] || key;
  };

  // 在客户端水合之前，使用服务器端默认值
  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ locale: defaultLocale, setLocale, t: (key) => translations[defaultLocale][key] || key }}>
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
} 