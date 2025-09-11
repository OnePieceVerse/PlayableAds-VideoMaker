"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/app/i18n/LanguageContext";
import { API_PATHS, getFullUrl } from "@/config/api";

type PlatformOption = "google" | "facebook" | "applovin" | "moloco" | "tiktok" | "all";

// Define a DefaultHotspotSvg component for the preview
const DefaultHotspotSvg = () => (
  <svg 
    className="w-full h-full text-white animate-pulse-scale" 
    viewBox="0 0 1448 1024" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0px 0px 3px rgba(0, 0, 0, 0.5))' }}
  >
    <path 
      d="M954.678313 549.757097l-211.405341-125.742315c-7.740635-4.644381-12.729044-1.032085-11.008903 7.740635l44.895682 243.227953c1.720141 8.944734 7.224593 10.148833 12.385016 2.752225 0 0 28.726356-41.111372 52.29229-66.225432l45.239711 67.257517c4.300353 6.364522 13.073072 8.084663 19.26558 3.784311l15.137242-10.492861c6.364522-4.300353 7.912649-13.245087 3.612296-19.609609l-45.239711-67.257517c30.274483-12.55703 72.933983-23.049891 72.933983-23.049891 8.77272-2.236183 9.63279-7.740635 1.892155-12.385016z m-246.668234 79.642533c-0.860071-0.344028-1.720141-0.516042-2.580212-0.516042-72.933983-17.029397-125.742315-84.1149-124.882244-161.349236 1.032085-90.307408 74.310096-162.897363 163.241391-162.037292 84.286914 1.032085 152.920544 67.601545 159.285066 151.200403v0.172015c0 0.860071 0 1.720141 0.172014 2.408197 0.860071 5.332437 4.644381 9.63279 9.460776 11.180917 0.860071 0.172014 1.720141 0.344028 2.408198 0.516043h2.580212c7.224593-0.516042 12.901058-6.536536 13.073072-13.933143v-0.172014c0-0.688056 0-1.204099-0.172014-1.892156-1.376113-20.297665-6.020494-39.907274-13.589115-58.656811-9.288762-23.049891-22.705863-43.691584-39.907273-61.409038-17.201411-17.889467-37.327062-31.82261-59.688897-41.799429-23.221905-10.320847-47.991937-15.653284-73.450025-15.997312-25.630102-0.344028-50.400134 4.472367-73.794053 14.277171-22.705863 9.460776-43.003528 23.049891-60.548967 40.423316-17.545439 17.373425-31.478582 37.843104-41.283387 60.548967-10.148833 23.565933-15.48127 48.679993-15.653284 74.654124-0.516042 46.959852 15.997312 92.543591 46.271796 127.978498 26.490173 30.790526 61.581052 52.29229 100.45624 61.409038 0.860071 0.344028 1.720141 0.516042 2.580212 0.516042 0.516042 0 1.032085 0.172014 1.548127 0.172014 7.740635 0.172014 14.105157-6.192508 14.105157-13.933143 0-6.536536-3.956325-11.868974-9.63279-13.761129z" 
      fill="currentColor"
    />
  </svg>
);

interface StepProps {
  formData: Record<string, any>;
  updateFormData: (field: string, value: any) => void;
  prevStep: () => void;
  nextStep: () => void;
}

const ExportAd: React.FC<StepProps> = ({ formData, updateFormData, prevStep, nextStep }) => {
  const { t } = useLanguage();
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformOption>(formData.platform || "all");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportUrl, setExportUrl] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [appName, setAppName] = useState(formData.appName || "");
  const [appVersion, setAppVersion] = useState(formData.appVersion || "1.0.0");
  const [language, setLanguage] = useState(formData.language || "en");
  
  // For image preview
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  // Count saved hotspots
  const savedHotspots = formData.hotspots?.filter((h: any) => h.isSaved) || [];
  
  const handlePlatformSelect = (platform: PlatformOption) => {
    setSelectedPlatform(platform);
    updateFormData("platform", platform);
  };

  const handleGenerate = async () => {
    // Save app name, version and language to form data
    updateFormData("appName", appName);
    updateFormData("appVersion", appVersion);
    updateFormData("language", language);
    
    // Simulated export process
    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    
    try {
      // Simulate export progress
      const timer = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 95) {
            clearInterval(timer);
            return 95;
          }
          return prev + 5;
        });
      }, 200);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(timer);
      setExportProgress(100);
      setExportComplete(true);
      setExportUrl("https://example.com/playable-ad-preview");
      
      // Update form data
      updateFormData("exportedUrl", "https://example.com/playable-ad-preview");
      updateFormData("exportedPlatform", selectedPlatform);
      updateFormData("exportedDate", new Date().toISOString());
    } catch (error) {
      setExportError("An error occurred during export. Please try again.");
      setIsExporting(false);
    }
  };

  const platforms = [
    { id: "google", name: "Google Ads", color: "bg-blue-100 text-blue-600" },
    { id: "facebook", name: "Facebook", color: "bg-indigo-100 text-indigo-600" },
    { id: "tiktok", name: "TikTok", color: "bg-rose-100 text-rose-600" },
    { id: "applovin", name: "AppLovin", color: "bg-violet-100 text-violet-600" },
    { id: "moloco", name: "Moloco", color: "bg-teal-100 text-teal-600" },
    { id: "all", name: "All Platforms", color: "bg-gray-100 text-gray-600" }
  ];

  const languages = [
    { id: "en", name: "English" },
    { id: "zh", name: "中文" },
    { id: "ja", name: "日本語" },
    { id: "ko", name: "한국어" },
    { id: "es", name: "Español" },
    { id: "fr", name: "Français" },
    { id: "de", name: "Deutsch" }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">{t('export')}</h2>
        <p className="text-gray-600">Preview your interactive image and export it to your chosen platform</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left side: Interactive Image Preview */}
        <div>
          <h3 className="text-lg font-medium mb-4">Interactive Image Preview</h3>
          
          <div 
            ref={imageContainerRef}
            className="bg-black rounded-lg overflow-hidden relative transition-all duration-300 aspect-[9/16] max-w-[400px] mx-auto"
          >
            {formData.image?.url ? (
              <>
                <img
                  src={formData.image.url}
                  alt="Uploaded image"
                  className="w-full h-full object-contain"
                />
                
                {/* Render hotspots */}
                {savedHotspots.map((hotspot: any) => (
                  <div
                    key={hotspot.id}
                    className="absolute cursor-pointer"
                    style={{
                      left: `${hotspot.useDefaultSvg ? hotspot.x : (hotspot.hotspotImage?.x || hotspot.x)}%`,
                      top: `${hotspot.useDefaultSvg ? hotspot.y : (hotspot.hotspotImage?.y || hotspot.y)}%`,
                      width: `${hotspot.useDefaultSvg ? (hotspot.scale || 60) : (hotspot.hotspotImage?.scale || 60)}px`,
                      height: `${hotspot.useDefaultSvg ? (hotspot.scale || 60) : (hotspot.hotspotImage?.scale || 60)}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {hotspot.useDefaultSvg ? (
                      <div className="w-full h-full overflow-hidden">
                        <DefaultHotspotSvg />
                      </div>
                    ) : (
                      <img
                        src={hotspot.hotspotImage!.url}
                        alt={hotspot.hotspotImage!.name}
                        className="w-full h-full object-cover rounded animate-pulse-scale"
                        draggable={false}
                      />
                    )}
                  </div>
                ))}
                
                {/* Render CTA button if exists */}
                {formData.ctaButton && (
                  <div
                    className="absolute cursor-pointer"
                    style={{
                      left: `${formData.ctaButton.position.left}%`,
                      top: `${formData.ctaButton.position.top}%`,
                      width: `${formData.ctaButton.scale * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <img
                      src={formData.ctaButton.image.url}
                      alt="CTA Button"
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="bg-gray-200 w-full h-full flex items-center justify-center">
                <p className="text-gray-500">No image available</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Right side: Export options */}
        <div>
          <h3 className="text-lg font-medium mb-4">Export Options</h3>
          
          {!isExporting && !exportComplete ? (
            <>
              <div>
                <h4 className="font-medium mb-3">Select Export Platform</h4>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => handlePlatformSelect(platform.id as PlatformOption)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedPlatform === platform.id
                          ? `border-blue-500 ${platform.color}`
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-xl mb-1">
                          {platform.id === "google" && "🔵"}
                          {platform.id === "facebook" && "📘"}
                          {platform.id === "tiktok" && "🎵"}
                          {platform.id === "applovin" && "📱"}
                          {platform.id === "moloco" && "🎯"}
                          {platform.id === "all" && "🌐"}
                        </div>
                        <div className="font-medium text-sm">{platform.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      App Name
                    </label>
                    <input
                      type="text"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      placeholder="Enter app name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      App Version
                    </label>
                    <input
                      type="text"
                      value={appVersion}
                      onChange={(e) => setAppVersion(e.target.value)}
                      placeholder="1.0.0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {languages.map((lang) => (
                        <option key={lang.id} value={lang.id}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-medium mb-2">Export Summary</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Project Type: Interactive {formData.projectType}</p>
                    <p>• Image: {formData.image?.name || "Not uploaded"}</p>
                    <p>• Hotspots: {savedHotspots.length}</p>
                    {formData.audio && <p>• Audio: {formData.audio.name}</p>}
                    {formData.ctaButton && <p>• CTA Button: Added</p>}
                  </div>
                </div>
                
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={handleGenerate}
                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Generate Playable Ad
                  </button>
                  
                  <button
                    disabled
                    className="w-full py-3 px-4 bg-gray-200 text-gray-500 rounded-md font-medium flex items-center justify-center cursor-not-allowed"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                    Download (Generate First)
                  </button>
                </div>
                
                <div className="flex justify-between pt-6">
                  <button
                    onClick={prevStep}
                    className="px-6 py-2 rounded-md text-gray-700 font-medium border border-gray-300 hover:bg-gray-50"
                  >
                    Back
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              {isExporting && !exportComplete ? (
                <div className="text-center">
                  <div className="mb-4">
                    <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium mb-2">Generating Your Ad</h4>
                  <p className="text-gray-600 mb-4">Please wait while we prepare your interactive ad...</p>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${exportProgress}%` }}></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{exportProgress}% complete</p>
                </div>
              ) : exportComplete ? (
                <div className="text-center">
                  <div className="mb-4 text-green-500">
                    <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium mb-2">Generation Complete!</h4>
                  <p className="text-gray-600 mb-4">Your interactive ad has been successfully generated.</p>
                  
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h5 className="font-medium text-sm mb-2">Ad Details</h5>
                    <div className="text-sm text-gray-600">
                      <p>• Platform: {platforms.find(p => p.id === selectedPlatform)?.name}</p>
                      <p>• App Name: {appName || "Not specified"}</p>
                      <p>• Version: {appVersion}</p>
                      <p>• Language: {languages.find(l => l.id === language)?.name}</p>
                      <p>• Export Date: {new Date().toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-3">
                    <a
                      href={exportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                      Preview Ad
                    </a>
                    
                    <button
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors inline-flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                      </svg>
                      Download Ad Package
                    </button>
                    
                    <button
                      onClick={() => {
                        setExportComplete(false);
                        setIsExporting(false);
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Back to Export Options
                    </button>
                  </div>
                </div>
              ) : null}
              
              {exportError && (
                <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-md text-center">
                  {exportError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportAd;
