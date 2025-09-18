"use client";

import React, { useState, useRef } from "react";
import { useLanguage } from "@/app/i18n/LanguageContext";
import { useDropzone } from "react-dropzone";
import { API_PATHS, getFullUrl } from "@/config/api";

interface VideoUploadProps {
  formData: Record<string, any>;
  updateFormData: (field: string, value: any) => void;
  nextStep: () => void;
  prevStep: () => void;
  returnToProjectSelection: () => void;
}

const VideoUpload: React.FC<VideoUploadProps> = ({
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
      uploadFormData.append("type", "video");
      uploadFormData.append("step", "video_upload");

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

      // Update form data with the uploaded video
      updateFormData("video", {
        file: file,
        url: getFullUrl(data.url),
        metadata: {
          width: data.metadata?.width || 0,
          height: data.metadata?.height || 0,
          duration: data.metadata?.duration || 0,
        },
        id: data.file_id, // Add the file_id from the response
      });

      // Save project_id to formData
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
      console.error("Error uploading video:", error);
      setError(error instanceof Error ? error.message : "Upload failed. Please try again.");
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const onDropRejected = (fileRejections: any[]) => {
    console.log("Files rejected:", fileRejections);
    setError("Please select a valid video file (MP4, MOV, AVI, WebM)");
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "video/*": [".mp4", ".mov", ".avi", ".webm"]
    },
    multiple: false,
    disabled: uploading,
  });

  const handleContinue = () => {
    if (formData.video) {
      nextStep();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">{t('uploadVideo')}</h2>
        <p className="text-gray-600">Upload the video you want to use for your playable ad</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div
        {...getRootProps()}
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
              <p className="text-lg font-medium text-gray-700">Uploading video...</p>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 4v16M17 4v16M3 8h18M3 16h18"></path>
            </svg>
            <div>
              <p className="text-gray-700">
                {isDragActive ? "Drop the video here" : formData.video?.url ? "Replace video" : "Drag and drop your video here, or click to select"}
              </p>
              <p className="text-sm text-gray-500 mt-2">Supported formats: MP4, WebM, OGG</p>
            </div>
          </div>
        )}
      </div>

      {/* Video Preview - Below upload component */}
      {formData.video?.url && (
        <div className="mb-6">
          <div className="flex justify-center">
            <video
              src={formData.video.url}
              controls
              className="max-w-full h-auto max-h-[600px] rounded-lg shadow-lg"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end pt-6">
        <button
          onClick={handleContinue}
          disabled={!formData.video || uploading}
          className="px-6 py-2 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default VideoUpload;
