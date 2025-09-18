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

      // Update form data with the uploaded image
      updateFormData("image", {
        id: data.file_id,
        file: file,
        url: getFullUrl(data.url),
        width: data.metadata?.width || 0,
        height: data.metadata?.height || 0,
      });
      
      // 保存project_id到formData
      if (data.project_id) {
        updateFormData("project_id", data.project_id);
      }

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
    if (!uploading) {
      open();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">{t('uploadImage')}</h2>
        <p className="text-gray-600">Upload the image you want to use for your playable ad</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

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
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <div>
              <p className="text-gray-700">
                {isDragActive ? "Drop the image here" : formData.image?.url ? "Replace image" : "Drag and drop your image here, or click to select"}
              </p>
              <p className="text-sm text-gray-500 mt-2">Supported formats: PNG, JPG, JPEG, GIF, WebP, SVG</p>
            </div>
          </div>
        )}
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

      <div className="flex justify-end pt-6">
        <button
          onClick={nextStep}
          disabled={!formData.image || uploading}
          className="px-6 py-2 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default ImageUpload;
