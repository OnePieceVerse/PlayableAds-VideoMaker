"use client";

import React, { useState } from "react";
import { useLanguage } from "@/app/i18n/LanguageContext";
import NavbarClient from "@/components/NavbarClient";
import StepIndicator from "@/components/StepIndicator";
import ProjectTypeSelection from "@/components/steps/ProjectTypeSelection";
import VideoUpload from "@/components/steps/VideoUpload";
import ImageUpload from "@/components/steps/ImageUpload";
import ImageHotspots from "@/components/steps/ImageHotspots";
import AudioUpload from "@/components/steps/AudioUpload";
import PauseFrames from "@/components/steps/PauseFrames";
import CTAButtons from "@/components/steps/CTAButtons";
import BannerUpload from "@/components/steps/BannerUpload";
import ExportAd from "@/components/steps/ExportAd";

const CreatePage: React.FC = () => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [projectType, setProjectType] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    video: null,
    image: null,
    audio: null,
    pauseFrames: [],
    ctaButtons: [],
    banners: { left: null, right: null },
    hotspots: [],
    platform: "all",
    projectType: null,
  });

  // Define steps based on project type - 移除视频流程中的Add Audio步骤
  const videoSteps = [
    { id: 1, title: t('chooseProjectType'), completed: false },
    { id: 2, title: t('uploadVideo'), completed: false },
    { id: 3, title: t('addPauseFrames'), completed: false },
    { id: 4, title: t('addCTAButtons'), completed: false },
    { id: 5, title: t('addBannersOptional'), completed: false },
    { id: 6, title: t('export'), completed: false },
  ];

  const imageSteps = [
    { id: 1, title: t('chooseProjectType'), completed: false },
    { id: 2, title: t('uploadImage'), completed: false },
    { id: 3, title: t('addHotspots'), completed: false },
    { id: 4, title: t('export'), completed: false },
  ];

  const steps = projectType === 'image' ? imageSteps : videoSteps;

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleProjectTypeSelect = (type: "video" | "image") => {
    setProjectType(type);
    updateFormData("projectType", type);
    nextStep();
  };

  const returnToProjectSelection = () => {
    setCurrentStep(1);
    setProjectType(null);
    updateFormData("projectType", null);
  };

  const renderStep = () => {
    if (projectType === 'video') {
      switch (currentStep) {
        case 2:
          return (
            <VideoUpload
              formData={formData}
              updateFormData={updateFormData}
              nextStep={nextStep}
              prevStep={prevStep}
              returnToProjectSelection={returnToProjectSelection}
            />
          );
        case 3:
          return (
            <PauseFrames
              formData={formData}
              updateFormData={updateFormData}
              nextStep={nextStep}
              prevStep={prevStep}
            />
          );
        case 4:
          return (
            <CTAButtons
              formData={formData}
              updateFormData={updateFormData}
              nextStep={nextStep}
              prevStep={prevStep}
            />
          );
        case 5:
          return (
            <BannerUpload
              formData={formData}
              updateFormData={updateFormData}
              nextStep={nextStep}
              prevStep={prevStep}
            />
          );
        case 6:
          return (
            <ExportAd
              formData={formData}
              updateFormData={updateFormData}
              nextStep={nextStep}
              prevStep={prevStep}
            />
          );
        default:
          return null;
      }
    } else if (projectType === 'image') {
      switch (currentStep) {
        case 2:
          return (
            <ImageUpload
              formData={formData}
              updateFormData={updateFormData}
              nextStep={nextStep}
              prevStep={prevStep}
              returnToProjectSelection={returnToProjectSelection}
            />
          );
        case 3:
          return (
            <ImageHotspots
              formData={formData}
              updateFormData={updateFormData}
              nextStep={nextStep}
              prevStep={prevStep}
            />
          );
        case 4:
          return (
            <ExportAd
              formData={formData}
              updateFormData={updateFormData}
              nextStep={nextStep}
              prevStep={prevStep}
            />
          );
        default:
          return null;
      }
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavbarClient />
      <div className="container mx-auto px-4 py-8">
        {projectType && (
          <div className="mb-8">
            <a 
              className="text-blue-600 hover:text-blue-800 flex items-center" 
              href="/"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"></path>
              </svg>
              返回首页
            </a>
          </div>
        )}
        
        {projectType && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">创建试玩广告</h1>
            <div className="w-full">
              <StepIndicator steps={steps} currentStep={currentStep} />
            </div>
          </div>
        )}
        
        <div className="mt-8">
          {currentStep === 1 ? (
            <>
              <h2 className="text-2xl font-bold mb-6 text-center">{t('chooseProjectType')}</h2>
              <ProjectTypeSelection onSelectProjectType={handleProjectTypeSelect} />
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6">
              {renderStep()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePage;
