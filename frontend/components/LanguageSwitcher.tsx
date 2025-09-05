'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/app/i18n/LanguageContext';
import { Locale } from '@/app/i18n/locales';

// 语言配置，包含显示名称和国旗
const languageOptions = {
  zh: {
    name: '中文',
    flag: '🇨🇳',
    label: '中文'
  },
  en: {
    name: 'English',
    flag: '🇺🇸',
    label: 'English'
  }
};

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // 切换下拉菜单状态
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // 切换语言
  const changeLanguage = (newLocale: Locale) => {
    setLocale(newLocale);
    setIsOpen(false);
  };
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-2 py-2 px-3 rounded-md bg-white border border-gray-200 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        aria-label="选择语言"
      >
        <span className="text-lg">{languageOptions[locale].flag}</span>
        <span className="text-sm font-medium text-gray-700">{languageOptions[locale].name}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 animate-fadeIn">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {Object.entries(languageOptions).map(([code, { name, flag }]) => (
              <button
                key={code}
                onClick={() => changeLanguage(code as Locale)}
                className={`flex items-center w-full px-4 py-2 text-sm ${
                  locale === code
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                role="menuitem"
              >
                <span className="text-lg mr-3">{flag}</span>
                <span>{name}</span>
                {locale === code && (
                  <svg className="ml-auto w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 