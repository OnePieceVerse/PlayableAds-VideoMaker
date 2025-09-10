"use client";

import React from "react";
import { useLanguage } from "@/app/i18n/LanguageContext";

interface ProjectTypeSelectionProps {
  onSelectProjectType: (type: "video" | "image") => void;
}

const ProjectTypeSelection: React.FC<ProjectTypeSelectionProps> = ({
  onSelectProjectType,
}) => {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 max-w-5xl mx-auto">
      {/* Interactive Video Card */}
      <div 
        className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden cursor-pointer"
        onClick={() => onSelectProjectType("video")}
      >
        <div className="h-48 bg-blue-100 flex items-center justify-center">
          <svg className="w-20 h-20 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">{t('interactiveVideo')}</h3>
          <p className="text-gray-600">{t('interactiveVideoDesc')}</p>
          <div className="mt-6 flex justify-end">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              {t('startCreatingNow')}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Image Card */}
      <div 
        className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden cursor-pointer"
        onClick={() => onSelectProjectType("image")}
      >
        <div className="h-48 bg-green-100 flex items-center justify-center">
          <svg className="w-20 h-20 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">{t('interactiveImage')}</h3>
          <p className="text-gray-600">{t('interactiveImageDesc')}</p>
          <div className="mt-6 flex justify-end">
            <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
              {t('startCreatingNow')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTypeSelection; 