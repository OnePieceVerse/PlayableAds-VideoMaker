"use client";

import React, { useState } from "react";
import { useLanguage } from "@/app/i18n/LanguageContext";

type PlatformOption = "google" | "facebook" | "applovin" | "moloco" | "tiktok" | "all";

interface StepProps {
  formData: Record<string, any>;
  updateFormData: (field: string, value: any) => void;
  prevStep: () => void;
  nextStep: () => void;
}

const ExportAd: React.FC<StepProps> = ({ formData, updateFormData, prevStep, nextStep }) => {
  const { t } = useLanguage();
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformOption>(formData.platform || "all");

  const handlePlatformSelect = (platform: PlatformOption) => {
    setSelectedPlatform(platform);
    updateFormData("platform", platform);
  };

  const handleExport = () => {
    // Export logic here
    console.log("Exporting for platform:", selectedPlatform);
    nextStep();
  };

  const platforms = [
    { id: "google", name: "Google Ads", color: "bg-blue-100 text-blue-600" },
    { id: "facebook", name: "Facebook", color: "bg-indigo-100 text-indigo-600" },
    { id: "tiktok", name: "TikTok", color: "bg-rose-100 text-rose-600" },
    { id: "applovin", name: "AppLovin", color: "bg-violet-100 text-violet-600" },
    { id: "moloco", name: "Moloco", color: "bg-teal-100 text-teal-600" },
    { id: "all", name: "All Platforms", color: "bg-gray-100 text-gray-600" }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">{t('export')}</h2>
        <p className="text-gray-600">Select the platform where you want to export your playable ad</p>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-4">Select Export Platform</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => handlePlatformSelect(platform.id as PlatformOption)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedPlatform === platform.id
                  ? `border-blue-500 ${platform.color}`
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">
                  {platform.id === "google" && "🔵"}
                  {platform.id === "facebook" && "📘"}
                  {platform.id === "tiktok" && "🎵"}
                  {platform.id === "applovin" && "📱"}
                  {platform.id === "moloco" && "🎯"}
                  {platform.id === "all" && "🌐"}
                </div>
                <div className="font-medium">{platform.name}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h4 className="font-medium mb-2">Export Summary</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Platform: {platforms.find(p => p.id === selectedPlatform)?.name}</p>
            <p>• Project Type: {formData.projectType}</p>
            {formData.video && <p>• Video: Uploaded</p>}
            {formData.image && <p>• Image: Uploaded</p>}
            {formData.audio && <p>• Audio: {formData.audio.name}</p>}
            {formData.pauseFrames?.length > 0 && <p>• Pause Frames: {formData.pauseFrames.length}</p>}
            {formData.ctaButtons?.length > 0 && <p>• CTA Buttons: {formData.ctaButtons.length}</p>}
            {formData.banners && (formData.banners.left || formData.banners.right) && <p>• Banners: Added</p>}
            {formData.hotspots?.length > 0 && <p>• Hotspots: {formData.hotspots.filter((h: any) => h.isSaved).length}</p>}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <button
          onClick={handleExport}
          className="px-6 py-2 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700"
        >
          Export Ad
        </button>
      </div>
    </div>
  );
};

export default ExportAd;
