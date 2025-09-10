"use client";

import React, { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { API_PATHS, getFullUrl } from "@/config/api";

// 定义错误类型
interface ErrorType {
  message: string;
}

interface VideoUploadProps {
  prevStep: () => void;
  formData: any;
  updateFormData: (field: string, value: any) => void;
  nextStep: () => void;
  returnToProjectSelection: () => void;
}

const VideoUpload: React.FC<VideoUploadProps> = ({
  prevStep,
  formData,
  updateFormData,
  nextStep,
  returnToProjectSelection,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // 当视频元数据加载完成后，根据宽高比自动设置方向
  useEffect(() => {
    if (formData.video && formData.video.metadata) {
      const { width, height } = formData.video.metadata;
      if (width && height) {
        // 如果宽度大于高度，则为横屏，否则为竖屏
        setIsLandscape(width > height);
        
        // 打印视频元数据中的宽高
        console.log('VideoUpload - 视频元数据中的宽高:', {
          width,
          height,
          isLandscape: width > height,
          metadata: formData.video.metadata
        });
      }
    }
  }, [formData.video]);
  
  // 添加视频元数据加载事件监听
  useEffect(() => {
    const handleVideoMetadata = () => {
      if (videoRef.current) {
        console.log('VideoUpload - 视频元素实际宽高:', {
          videoWidth: videoRef.current.videoWidth,
          videoHeight: videoRef.current.videoHeight,
          duration: videoRef.current.duration,
          clientWidth: videoRef.current.clientWidth,
          clientHeight: videoRef.current.clientHeight
        });
      }
    };
    
    if (videoRef.current) {
      videoRef.current.addEventListener('loadedmetadata', handleVideoMetadata);
    }
    
    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadedmetadata', handleVideoMetadata);
      }
    };
  }, []);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Check if file is a video
    if (!file.type.startsWith("video/")) {
      setError("Please upload a video file");
      return;
    }

    try {
      setError(null);
      setUploading(true);
      
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 5;
        });
      }, 100);

      // 添加文件到FormData
      const uploadFormData = new FormData();
      uploadFormData.append("file", acceptedFiles[0]);
      uploadFormData.append("type", "video");
      uploadFormData.append("step", "video_upload");
      // 不传递project_id，让后端自动创建

      // Upload to backend API
      const response = await fetch(API_PATHS.upload, {
        method: "POST",
        body: uploadFormData,
      });

      clearInterval(interval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error("Failed to upload video");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to upload video");
      }

      // 保存项目ID（后端自动创建）
      if (data.project_id) {
        setProjectId(data.project_id);
        updateFormData("project_id", data.project_id);
      }

      // Update form data with video information
      updateFormData("video", {
        id: data.file_id,
        url: getFullUrl(data.url),
        metadata: data.metadata,
        name: data.file_id,
        originalName: acceptedFiles[0].name
      });

      // 根据视频宽高设置方向
      if (data.metadata && data.metadata.width && data.metadata.height) {
        // 如果宽度大于高度，则为横屏，否则为竖屏
        setIsLandscape(data.metadata.width > data.metadata.height);
      }

      // Wait a moment to show 100% progress
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);

    } catch (err: ErrorType | unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred during upload";
      setError(errorMessage);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": []
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleContinue = () => {
    if (formData.video) {
      // 更新视频方向
      updateFormData("video", {
        ...formData.video,
        type: isLandscape ? "landscape" : "portrait",
      });
      nextStep();
    }
  };

  const toggleOrientation = () => {
    setIsLandscape(!isLandscape);
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error("Video error:", e);
    setError("Video failed to load. Please try uploading again.");
  };

  const handleVideoLoadStart = () => {
    console.log("Video load started");
  };

  const handleVideoCanPlay = () => {
    console.log("Video can play");
  };

  const handleVideoLoadedData = () => {
    console.log("Video data loaded");
  };

  const handleVideoSeeked = () => {
    if (videoRef.current) {
      const { videoWidth, videoHeight } = videoRef.current;
      // 如果宽度大于高度，则为横屏，否则为竖屏
      setIsLandscape(videoWidth > videoHeight);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Upload Video</h2>
        <p className="text-gray-600">
          Upload the video you want to use for your playable ad
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400"
        } ${uploading ? "opacity-75" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 4v16M17 4v16M3 8h18M3 16h18"
            />
          </svg>
          {uploading ? (
            <div className="space-y-3">
              <p className="text-gray-700">Uploading video...</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500">{uploadProgress}%</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-700">
                {isDragActive
                  ? "Drop the video file here"
                  : "Drag and drop your video here, or click to select"}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Supported formats: MP4, WebM, OGG
              </p>
              {projectId && (
                <p className="text-xs text-gray-400 mt-1">
                  Project ID: {projectId}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-center">
          {error}
        </div>
      )}

      {formData.video && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-800">Preview</h3>
            <button
              onClick={toggleOrientation}
              className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              <svg
                className="h-4 w-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isLandscape ? "Portrait Mode" : "Landscape Mode"}
            </button>
          </div>
          
          <div 
            ref={videoContainerRef}
            className={`bg-black rounded-lg overflow-hidden transition-all duration-300 ${
              isLandscape 
                ? "aspect-video" 
                : "aspect-[9/16] max-w-[400px] mx-auto"
            }`}
          >
            <video
              ref={videoRef}
              src={formData.video.url}
              className="w-full h-full object-contain"
              controls
              onSeeked={handleVideoSeeked}
              onLoadedMetadata={handleVideoSeeked}
              onError={handleVideoError}
              onLoadStart={handleVideoLoadStart}
              onCanPlay={handleVideoCanPlay}
              onLoadedData={handleVideoLoadedData}
              playsInline
              preload="metadata"
              crossOrigin="anonymous"
              autoPlay={false}
              loop={false}
              width="100%"
              height="100%"
              poster=""
              disablePictureInPicture
              disableRemotePlayback
              style={{ display: 'block' }}
            />
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div className="text-sm text-gray-600">
              <p>
                <span className="font-medium">Duration:</span>{" "}
                {formData.video.metadata?.duration
                  ? `${formData.video.metadata.duration.toFixed(2)}s`
                  : "Unknown"}
              </p>
              <p>
                <span className="font-medium">Size:</span>{" "}
                {formData.video.metadata?.size
                  ? `${(formData.video.metadata.size / (1024 * 1024)).toFixed(
                      2
                    )} MB`
                  : "Unknown"}
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <p>
                <span className="font-medium">Resolution:</span>{" "}
                {formData.video.metadata?.width && formData.video.metadata?.height
                  ? `${formData.video.metadata.width} x ${formData.video.metadata.height}`
                  : "Unknown"}
              </p>
              <p>
                <span className="font-medium">Format:</span>{" "}
                {formData.video.metadata?.format || "Unknown"}
              </p>
            </div>
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
          onClick={handleContinue}
          disabled={!formData.video || uploading}
          className={`px-6 py-2 rounded-md text-white font-medium ${
            !formData.video || uploading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default VideoUpload; 