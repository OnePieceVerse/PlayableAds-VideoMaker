'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, translations, TranslationKey } from './locales';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const defaultLocale: Locale = 'en'; // 默认使用英文

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

  // 修复t函数，确保在找不到翻译时返回键名
  const t = (key: TranslationKey): string => {
    if (!mounted) {
      // 服务器端渲染时，始终使用默认语言
      return translations[defaultLocale][key] || key;
    }
    
    // 客户端渲染时，使用当前语言，如果找不到则回退到英语，再找不到则返回键名
    return (
      (translations[locale] && translations[locale][key]) || 
      (translations['en'] && translations['en'][key]) || 
      key
    );
  };

  // 在服务器端渲染时，使用默认语言
  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ 
        locale: defaultLocale, 
        setLocale, 
        t 
      }}>
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