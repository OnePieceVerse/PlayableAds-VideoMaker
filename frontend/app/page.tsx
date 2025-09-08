'use client';

import Link from "next/link";
import { useLanguage } from "@/app/i18n/LanguageContext";
import NavbarClient from "@/components/NavbarClient";
import { useState, useEffect } from "react";
import { TranslationKey } from "@/app/i18n/locales";

// Feature Card Component
function FeatureCard({ 
  title, 
  description, 
  icon,
  color
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300">
      <div className={`w-14 h-14 ${color} rounded-lg flex items-center justify-center mb-6`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

export default function Home() {
  const { t } = useLanguage();
  
  // 使用状态来存储翻译后的文本
  const [translations, setTranslations] = useState<Record<TranslationKey, string>>({
    // 设置初始值为空字符串，避免水合错误
    statsAdsCreated: '',
    statsPlatformsSupported: '',
    statsUserSatisfaction: '',
    workflowTitle: '',
    workflowHeading: '',
    workflowDescription: '',
    step1Title: '',
    step1Description: '',
    step2Title: '',
    step2Description: '',
    step3Title: '',
    step3Description: '',
    platformTitle: '',
    platformHeading: '',
    platformDescription: '',
    // 其他需要的翻译键...
  } as Record<TranslationKey, string>);

  // 在客户端加载后更新翻译
  useEffect(() => {
    const keys: TranslationKey[] = [
      'statsAdsCreated',
      'statsPlatformsSupported',
      'statsUserSatisfaction',
      'workflowTitle',
      'workflowHeading',
      'workflowDescription',
      'step1Title',
      'step1Description',
      'step2Title',
      'step2Description',
      'step3Title',
      'step3Description',
      'platformTitle',
      'platformHeading',
      'platformDescription',
      'features',
      'whyChoose',
      'whyChooseSubtitle',
      'feature1Title',
      'feature1Description',
      'feature2Title',
      'feature2Description',
      'feature3Title',
      'feature3Description',
      'feature4Title',
      'feature4Description',
      'feature5Title',
      'feature5Description',
      'feature6Title',
      'feature6Description',
      'ctaTitle',
      'ctaDescription',
      'getStartedFree',
      'heroTitle',
      'heroDescription',
      'startCreatingNow',
      'watchDemo',
      'appName'
    ];
    
    const newTranslations = {} as Record<TranslationKey, string>;
    keys.forEach(key => {
      newTranslations[key] = t(key);
    });
    
    setTranslations(newTranslations);
  }, [t]);
  
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <NavbarClient key="home-page-navbar" />
      
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 opacity-70"></div>
          <div className="absolute top-20 left-20 w-64 h-64 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-20 left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center">
            {/* Logo/Icon */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-sky-400 to-indigo-500 rounded-2xl mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Main Title */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-gray-900">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {translations.heroTitle}
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed mb-12">
              {translations.heroDescription}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <Link 
                href="/create" 
                className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <span className="flex items-center">
                  {translations.startCreatingNow}
                  <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
              <button className="px-8 py-4 bg-white text-gray-800 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-sm hover:shadow">
                {translations.watchDemo}
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="text-3xl font-bold text-blue-600 mb-2">10K+</div>
                <div className="text-gray-600" suppressHydrationWarning>{translations.statsAdsCreated}</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="text-3xl font-bold text-indigo-600 mb-2">5+</div>
                <div className="text-gray-600" suppressHydrationWarning>{translations.statsPlatformsSupported}</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="text-3xl font-bold text-teal-600 mb-2">99%</div>
                <div className="text-gray-600" suppressHydrationWarning>{translations.statsUserSatisfaction}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white relative">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-50 to-white opacity-50"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-600 font-medium text-sm rounded-full mb-4">
              {translations.features}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
              {translations.whyChoose}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {translations.whyChooseSubtitle}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              title={translations.feature1Title}
              description={translations.feature1Description}
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              }
              color="text-blue-600 bg-blue-100"
            />
            <FeatureCard 
              title={translations.feature2Title}
              description={translations.feature2Description}
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
              }
              color="text-indigo-600 bg-indigo-100"
            />
            <FeatureCard 
              title={translations.feature3Title}
              description={translations.feature3Description}
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              }
              color="text-teal-600 bg-teal-100"
            />
            <FeatureCard 
              title={translations.feature4Title}
              description={translations.feature4Description}
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              }
              color="text-cyan-600 bg-cyan-100"
            />
            <FeatureCard 
              title={translations.feature5Title}
              description={translations.feature5Description}
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              }
              color="text-sky-600 bg-sky-100"
            />
            <FeatureCard 
              title={translations.feature6Title}
              description={translations.feature6Description}
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              color="text-violet-600 bg-violet-100"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-b from-white to-sky-50 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-indigo-100 text-indigo-600 font-medium text-sm rounded-full mb-4" suppressHydrationWarning>
              {translations.workflowTitle}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900" suppressHydrationWarning>
              {translations.workflowHeading}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto" suppressHydrationWarning>
              {translations.workflowDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 text-center relative">
              <div className="absolute -top-5 -right-5 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
                1
              </div>
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">{translations.step1Title}</h3>
              <p className="text-gray-600">{translations.step1Description}</p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 text-center relative">
              <div className="absolute -top-5 -right-5 w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
                2
              </div>
              <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">{translations.step2Title}</h3>
              <p className="text-gray-600">{translations.step2Description}</p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 text-center relative">
              <div className="absolute -top-5 -right-5 w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
                3
              </div>
              <div className="w-16 h-16 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">{translations.step3Title}</h3>
              <p className="text-gray-600">{translations.step3Description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Support Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-teal-100 text-teal-600 font-medium text-sm rounded-full mb-4" suppressHydrationWarning>
              {translations.platformTitle}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900" suppressHydrationWarning>
              {translations.platformHeading}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto" suppressHydrationWarning>
              {translations.platformDescription}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-4xl mx-auto">
            {[
              { name: 'Google Ads', color: 'bg-blue-100 text-blue-600' },
              { name: 'Facebook', color: 'bg-indigo-100 text-indigo-600' },
              { name: 'TikTok', color: 'bg-rose-100 text-rose-600' },
              { name: 'AppLovin', color: 'bg-violet-100 text-violet-600' },
              { name: 'Moloco', color: 'bg-teal-100 text-teal-600' }
            ].map((platform, index) => (
              <div key={index} className="text-center">
                <div className={`w-full aspect-square ${platform.color} rounded-xl flex items-center justify-center mb-4 shadow-sm hover:shadow-md transition-shadow duration-300`}>
                  <span className="font-bold">{platform.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-50 to-indigo-50 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
              {translations.ctaTitle}
            </h2>
            <p className="text-xl text-gray-700 mb-10">
              {translations.ctaDescription}
            </p>
            <Link 
              href="/create" 
              className="inline-block px-10 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              {translations.getStartedFree}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center mb-4">
                <svg className="w-8 h-8 text-blue-500 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-xl font-bold text-gray-900">{translations.appName}</span>
              </div>
              <p className="text-gray-500">© {new Date().getFullYear()} All rights reserved.</p>
            </div>
            <div className="flex space-x-8">
              <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">Terms</a>
              <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">Privacy</a>
              <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
