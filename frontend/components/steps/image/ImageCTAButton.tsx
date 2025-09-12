"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/app/i18n/LanguageContext";
import { useDropzone } from "react-dropzone";
import { API_PATHS, getFullUrl } from "@/config/api";

interface CTAButton {
  id: string;
  type: "fulltime";
  image: {
    id: string;
    url: string;
  };
  position: {
    left: number;
    top: number;
  };
  scale: number;
}

interface StepProps {
  formData: Record<string, any>;
  updateFormData: (field: string, value: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const CTAButtonStep: React.FC<StepProps> = ({
  formData,
  updateFormData,
  nextStep,
  prevStep,
}) => {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // CTA Button states
  const [currentButton, setCurrentButton] = useState<CTAButton | null>(formData.ctaButton || null);
  const [position, setPosition] = useState({ left: 20, top: 20 });
  const [scale, setScale] = useState(0.2); // 20% of screen width
  const [isDragging, setIsDragging] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Initialize with existing CTA button if available
  useEffect(() => {
    if (formData.ctaButton) {
      setCurrentButton(formData.ctaButton);
      setPosition(formData.ctaButton.position);
      setScale(formData.ctaButton.scale);
    }
  }, [formData.ctaButton]);

  // Toggle landscape mode
  const toggleLandscapeMode = () => {
    setIsLandscape(!isLandscape);
  };

  // CTA Button image upload
  const onCTAButtonDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    try {
      setError(null);
      setUploading(true);

      // Create form data for upload
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("type", "image");
      uploadFormData.append("step", "cta_buttons");

      // Upload to backend API
      const response = await fetch(API_PATHS.upload, {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();

      // Create a new CTA button
      const newButton: CTAButton = {
        id: `button_${Date.now()}`,
        type: "fulltime",
        image: {
          id: data.file_id,
          url: getFullUrl(data.url),
        },
        position: { ...position },
        scale: scale,
      };

      setCurrentButton(newButton);
      updateFormData("ctaButton", newButton);
      setUploading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onCTAButtonDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    disabled: uploading,
    maxFiles: 1,
  });

  // Handle CTA button position change
  const handlePositionChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    axis: "left" | "top"
  ) => {
    const value = parseInt(e.target.value);
    setPosition((prev) => ({
      ...prev,
      [axis]: value,
    }));

    if (currentButton) {
      const updatedButton = {
        ...currentButton,
        position: {
          ...currentButton.position,
          [axis]: value,
        },
      };
      setCurrentButton(updatedButton);
      updateFormData("ctaButton", updatedButton);
    }
  };

  // Handle CTA button scale change
  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const newScale = value / 100;
    setScale(newScale);

    if (currentButton) {
      const updatedButton = {
        ...currentButton,
        scale: newScale,
      };
      setCurrentButton(updatedButton);
      updateFormData("ctaButton", updatedButton);
    }
  };

  // Start dragging CTA button
  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    
    // Get image element
    const imgElement = e.currentTarget as HTMLDivElement;
    const imgRect = imgElement.getBoundingClientRect();
    
    // Calculate mouse position relative to image (percentage)
    const offsetX = (e.clientX - imgRect.left) / imgRect.width;
    const offsetY = (e.clientY - imgRect.top) / imgRect.height;
    
    setIsDragging(true);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const containerRect = imageContainerRef.current?.getBoundingClientRect();
      if (!containerRect) return;
      
      // Calculate new position, considering mouse offset within image
      const newX = moveEvent.clientX - containerRect.left - (imgRect.width * offsetX);
      const newY = moveEvent.clientY - containerRect.top - (imgRect.height * offsetY);
      
      // Convert mouse position to percentage position, adding half of offset
      const newPercentageX = ((newX + imgRect.width / 2) / containerRect.width) * 100;
      const newPercentageY = ((newY + imgRect.height / 2) / containerRect.height) * 100;
      
      // Limit to 0-100 range
      const newPosition = {
        left: Math.max(0, Math.min(100, newPercentageX)),
        top: Math.max(0, Math.min(100, newPercentageY)),
      };
      
      setPosition(newPosition);
      
      if (currentButton) {
        const updatedButton = {
          ...currentButton,
          position: newPosition,
        };
        setCurrentButton(updatedButton);
        updateFormData("ctaButton", updatedButton);
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    
    e.preventDefault();
    e.stopPropagation();
  };

  // Remove CTA button
  const removeCTAButton = () => {
    setCurrentButton(null);
    updateFormData("ctaButton", null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">{t('addCTAButton')}</h2>
        <p className="text-gray-600">Add a call-to-action button to your interactive image</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left side: Image preview and CTA button */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-800">Image Preview</h3>
            <button
              onClick={toggleLandscapeMode}
              className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              {isLandscape ? "Portrait Mode" : "Landscape Mode"}
            </button>
          </div>
          
          <div 
            ref={imageContainerRef}
            className={`bg-black rounded-lg overflow-hidden relative transition-all duration-300 ${
              isLandscape 
                ? "aspect-video max-w-[600px] mx-auto flex items-center justify-center" 
                : "aspect-[9/16] max-w-[400px] mx-auto"
            }`}
          >
            {formData.image?.url ? (
              <>
                <img
                  src={formData.image.url}
                  alt="Uploaded image"
                  className="w-full h-full object-contain"
                />
                
                {/* CTA Button preview */}
                {currentButton && (
                  <div
                    className={`absolute ${isDragging ? 'pointer-events-none' : 'cursor-move'}`}
                    style={{
                      left: `${position.left}%`,
                      top: `${position.top}%`,
                      transform: `translate(-50%, -50%)`,
                      width: `${scale * 100}%`,
                      transition: isDragging ? 'none' : 'all 0.05s ease-out',
                      touchAction: 'none',
                      zIndex: 10
                    }}
                    onMouseDown={startDrag}
                  >
                    <img
                      src={currentButton.image.url}
                      alt="CTA Button"
                      className="pointer-events-none w-full h-full object-contain animate-pulse-scale"
                      draggable="false"
                    />
                  </div>
                )}
                
                {/* Display hotspots if any */}
                {formData.hotspots?.filter((h: any) => h.isSaved).map((hotspot: any) => (
                  <div
                    key={hotspot.id}
                    className="absolute"
                    style={{
                      left: `${hotspot.useDefaultSvg ? hotspot.x : (hotspot.hotspotImage?.x || hotspot.x)}%`,
                      top: `${hotspot.useDefaultSvg ? hotspot.y : (hotspot.hotspotImage?.y || hotspot.y)}%`,
                      width: `${hotspot.hotspotImage?.scale || 60}px`,
                      height: `${hotspot.hotspotImage?.scale || 60}px`,
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'none'
                    }}
                  >
                    {hotspot.useDefaultSvg ? (
                      <div className="w-full h-full overflow-hidden animate-pulse-scale">
                        {/* We would need to include DefaultHotspotSvg here */}
                      </div>
                    ) : (
                      <img
                        src={hotspot.hotspotImage.url}
                        alt={hotspot.hotspotImage.name}
                        className="w-full h-full object-cover rounded animate-pulse-scale"
                        draggable={false}
                      />
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="bg-gray-200 w-full h-full flex items-center justify-center">
                <p className="text-gray-500">No image available</p>
              </div>
            )}
          </div>
        </div>

        {/* Right side: CTA button options */}
        <div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Full-time CTA Button</h3>
            
            {!currentButton ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Button Image
                </label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-blue-400"
                  } ${uploading ? "opacity-50" : ""}`}
                >
                  <input {...getInputProps()} />
                  {uploading ? (
                    <p className="text-sm text-gray-600">Uploading...</p>
                  ) : (
                    <>
                      <svg className="w-6 h-6 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                      </svg>
                      <p className="text-sm text-gray-600">
                        Drop button image here or click to upload
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Button preview */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-800 mb-3">Button Preview</h4>
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 flex-shrink-0 rounded overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center">
                      <img
                        src={currentButton.image.url}
                        alt="Button preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-grow">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500">Type:</p>
                          <p className="font-medium">Full-time</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Position:</p>
                          <p className="font-medium">{position.left.toFixed(0)}% left, {position.top.toFixed(0)}% top</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Scale:</p>
                          <p className="font-medium">{Math.round(scale * 100)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Position and scale controls */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Left Position (%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={position.left}
                        onChange={(e) => handlePositionChange(e, "left")}
                        className="w-full"
                      />
                      <div className="text-center text-xs text-gray-500 mt-1">
                        {position.left.toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Top Position (%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={position.top}
                        onChange={(e) => handlePositionChange(e, "top")}
                        className="w-full"
                      />
                      <div className="text-center text-xs text-gray-500 mt-1">
                        {position.top.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Button Width (% of screen)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={scale * 100}
                      onChange={handleScaleChange}
                      className="w-full"
                    />
                    <div className="flex justify-center text-xs text-gray-500 mt-1">
                      <span className="font-medium">{Math.round(scale * 100)}%</span>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <button
                      onClick={removeCTAButton}
                      className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                    >
                      Remove CTA Button
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h5 className="text-sm font-medium text-blue-800">About CTA Buttons</h5>
                <div className="mt-1 text-sm text-blue-700">
                  <p>A call-to-action button will be visible throughout your interactive image.</p>
                  <p className="mt-1">This button helps drive user engagement and conversions.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <button
          onClick={prevStep}
          className="px-6 py-2 rounded-md text-gray-700 font-medium border border-gray-300 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          disabled={!currentButton}
          className={`px-6 py-2 rounded-md ${
            !currentButton ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          } text-white font-medium`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default CTAButtonStep; 