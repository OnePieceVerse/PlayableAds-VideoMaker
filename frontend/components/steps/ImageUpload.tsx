"use client";

import React, { useState, useRef } from "react";
import { useLanguage } from "@/app/i18n/LanguageContext";
import { useDropzone } from "react-dropzone";
import { API_PATHS, getFullUrl } from "@/config/api";

interface ImageUploadProps {
  formData: Record<string, any>;
  updateFormData: (field: string, value: any) => void;
  nextStep: () => void;
  prevStep: () => void;
  returnToProjectSelection: () => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  formData,
  updateFormData,
  nextStep,
  prevStep,
  returnToProjectSelection,
}) => {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    console.log("onDrop triggered with files:", acceptedFiles);
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("type", "image");
      uploadFormData.append("step", "image_upload");

      const response = await fetch(API_PATHS.upload, {
        method: "POST",
        body: uploadFormData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload error:", errorText);
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("Upload response:", data);

      // Update form data with the uploaded image
      updateFormData("image", {
        file: file,
        url: getFullUrl(data.url),
        width: data.metadata?.width || 0,
        height: data.metadata?.height || 0,
      });

      setUploadProgress(100);
      
      // Small delay to show 100% progress, then stop uploading state
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);

    } catch (error) {
      console.error("Error uploading image:", error);
      setError(error instanceof Error ? error.message : "Upload failed. Please try again.");
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const onDropRejected = (fileRejections: any[]) => {
    console.log("Files rejected:", fileRejections);
    setError("Please select a valid image file (PNG, JPG, JPEG, GIF, WebP, SVG)");
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]
    },
    multiple: false,
    disabled: uploading,
    noClick: false,
    noKeyboard: false
  });

  const handleClick = () => {
    console.log("Upload area clicked");
    if (!uploading) {
      open();
    }
  };

  return (
    <div className="mx-auto">
      <h2 className="text-2xl font-bold mb-6">{t('uploadImage')}</h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Upload Component - Always visible at the top */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div
          {...getRootProps()}
          onClick={handleClick}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-blue-400"
          } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input {...getInputProps()} />
          
          {uploading ? (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto">
                <svg className="animate-spin h-16 w-16 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700">Uploading image...</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-1">{uploadProgress}%</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {isDragActive ? "Drop the image here" : formData.image?.url ? "Replace image" : "Upload an image"}
                </p>
                <p className="text-gray-500">
                  {formData.image?.url 
                    ? "Drag and drop a new image file here, or click to select a different image"
                    : "Drag and drop an image file here, or click to select"
                  }
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Supports PNG, JPG, JPEG, GIF, WebP, SVG
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview - Below upload component */}
      {formData.image?.url && (
        <div className="mb-6">
          <div className="flex justify-center">
            <img
              src={formData.image.url}
              alt="Uploaded image"
              className="max-w-full h-auto max-h-[600px] rounded-lg shadow-lg"
            />
          </div>
        </div>
      )}

      <div className="flex justify-between pt-6">
        <button
          onClick={returnToProjectSelection}
          className="px-6 py-2 rounded-md text-gray-700 font-medium border border-gray-300 hover:bg-gray-50"
        >
          Back to Selection
        </button>
        <button
          onClick={nextStep}
          disabled={!formData.image || uploading}
          className="px-6 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default ImageUpload;
