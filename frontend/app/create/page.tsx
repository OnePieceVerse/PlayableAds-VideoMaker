"use client";

import React, { useState } from "react";
import { useLanguage } from "@/app/i18n/LanguageContext";
import NavbarClient from "@/components/NavbarClient";
import StepIndicator from "@/components/StepIndicator";
import ProjectTypeSelection from "@/components/steps/ProjectTypeSelection";
import VideoUpload from "@/components/steps/VideoUpload";
import ImageUpload from "@/components/steps/ImageUpload";
import ImageHotspots from "@/components/steps/ImageHotspots";
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
    pauseFrames: [],
    ctaButtons: [],
    banners: { left: null, right: null },
    hotspots: [],
    platform: "all",
    projectType: null,
  });

  // Define steps based on project type
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
      <div className="py-8">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          {projectType && <StepIndicator steps={steps} currentStep={currentStep} />}
          
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
    </div>
  );
};

export default CreatePage;
