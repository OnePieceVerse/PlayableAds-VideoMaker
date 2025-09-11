"use client";

import React, { useState, useRef, useEffect } from "react";
import { API_PATHS, getFullUrl } from "@/config/api";

// 定义错误类型
interface ErrorType {
  message: string;
}

// 定义类型
type PlatformOption = "google" | "facebook" | "applovin" | "moloco" | "tiktok" | "all";
type Language = "en" | "zh" | "";

interface FileInfo {
  name: string;
  size: number;
  human_size: string;
}

interface FilesInfo {
  success: boolean;
  project_id: string;
  video_files: FileInfo[];
  image_files: FileInfo[];
  other_files: FileInfo[];
  total_video_size: number;
  total_image_size: number;
  human_total_video_size: string;
  human_total_image_size: string;
  estimated_html_size: number;
  human_estimated_html_size: string;
}

interface StepProps {
  nextStep: () => void;
  formData: Record<string, any>;
  updateFormData: (field: string, value: any) => void;
  prevStep: () => void;
}

const ExportAd: React.FC<StepProps> = ({ formData, updateFormData, nextStep, prevStep }) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformOption[]>([]);
  const [language, setLanguage] = useState<Language>("en");
  const [version, setVersion] = useState<string>("v1");
  const [appName, setAppName] = useState<string>("PlayableAds");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filesInfo, setFilesInfo] = useState<FilesInfo | null>(null);
  const [loadingFilesInfo, setLoadingFilesInfo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  
  // 调试输出
  console.log("formData in ImageExportAd:", formData);
  console.log("Button disabled state:", generating || !formData.image || selectedPlatforms.length === 0 || language === "");
  console.log("formData.image:", formData.image);
  console.log("selectedPlatforms:", selectedPlatforms);
  console.log("language:", language);
  
  // 组件加载时自动选择Google平台
  useEffect(() => {
    if (selectedPlatforms.length === 0) {
      setSelectedPlatforms(["google"]);
    }
  }, []);

  // 处理文件信息，去除重复文件
  const processFilesInfo = (data: FilesInfo) => {
    // 创建一个映射来跟踪已经处理过的文件内容
    const processedFiles = new Map();
    
    // 处理视频文件
    const uniqueVideoFiles = data.video_files.filter(file => {
      const key = file.name;
      if (!processedFiles.has(key)) {
        processedFiles.set(key, true);
        return true;
      }
      return false;
    });
    
    // 处理图片文件
    const uniqueImageFiles = data.image_files.filter(file => {
      const key = file.name;
      if (!processedFiles.has(key)) {
        processedFiles.set(key, true);
        return true;
      }
      return false;
    });
    
    // 处理其他文件
    const uniqueOtherFiles = data.other_files.filter(file => {
      const key = file.name;
      if (!processedFiles.has(key)) {
        processedFiles.set(key, true);
        return true;
      }
      return false;
    });
    
    return {
      ...data,
      video_files: uniqueVideoFiles,
      image_files: uniqueImageFiles,
      other_files: uniqueOtherFiles
    };
  };

  // 获取项目文件信息
  const fetchFilesInfo = async () => {
    try {
      setLoadingFilesInfo(true);
      // Check if project_id exists and is valid
      if (!formData.project_id) {
        console.log("No project_id available, skipping files info fetch");
        setLoadingFilesInfo(false);
        return;
      }
      
      const response = await fetch(API_PATHS.projectFilesInfo(formData.project_id));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch files info: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success) {
        // 处理文件信息，去除重复
        const processedData = processFilesInfo(data);
        setFilesInfo(processedData);
      } else {
        console.error("Error fetching files info:", data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error fetching files info:", error);
      // Don't set error message in UI to avoid disrupting user experience
      setFilesInfo(null);
    } finally {
      setLoadingFilesInfo(false);
    }
  };

  useEffect(() => {
    if (formData.video && videoRef.current) {
      videoRef.current.src = formData.video.url;
      videoRef.current.load();
    }
    
    // 如果有project_id，获取文件大小信息
    if (formData.project_id) {
      try {
        fetchFilesInfo();
      } catch (error) {
        console.error("Error in fetchFilesInfo effect:", error);
      }
    }
  }, [formData.video, formData.project_id]);

  // 添加消息监听器，接收来自iframe的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'adLoaded') {
        console.log('Ad loaded in iframe');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);
  
  const toggleOrientation = () => {
    setIsLandscape(!isLandscape);
  };



  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
    setResult(null);
  };

  const handleVersionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVersion(e.target.value);
    setResult(null);
  };

  const handleAppNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAppName(e.target.value);
    setResult(null);
  };

  
  const handlePlatformChange = (platform: PlatformOption) => {
    setSelectedPlatforms(prev => {
      if (platform === "all") {
        // 如果选择"all"，清空其他选择
        return ["all"];
      } else {
        // 如果选择具体平台，移除"all"并切换当前平台
        const filtered = prev.filter(p => p !== "all");
        if (filtered.includes(platform)) {
          return filtered.filter(p => p !== platform);
        } else {
          return [...filtered, platform];
        }
      }
    });
    setResult(null);
  };

  const isPlatformSelected = (platform: PlatformOption) => {
    return selectedPlatforms.includes(platform);
  };
const generateAd = async () => {
    try {
      setErrorMessage(null);
      setGenerating(true);
      
      // 验证必要参数
      if (!formData.image || selectedPlatforms.length === 0) {
        setErrorMessage("Please select an image and platform(s) before generating.");
        setGenerating(false);
        return;
      }
      
      // 验证project_id是否存在
      if (!formData.project_id) {
        setErrorMessage("Project ID is missing. Please try uploading the image again.");
        setGenerating(false);
        return;
      }
      
      // 获取图片方向
      let orientation = "portrait"; // 默认竖屏
      if (isLandscape) {
        orientation = "landscape";
      }
      
      // 准备请求数据
      const requestData = {
        project_id: formData.project_id,
        images: [formData.image.id],
        platforms: selectedPlatforms, // 使用 selectedPlatforms 数组
        language: language,
        version: version,
        app_name: appName,
        orientation: orientation,
        hotspots: formData.hotspots?.length ? formData.hotspots.map((hotspot: any) => ({
          left: hotspot.position?.left || hotspot.x || 0,
          top: hotspot.position?.top || hotspot.y || 0,
          type: hotspot.type || hotspot.action || "popup",
          url: hotspot.url || "",
          modalImgs: hotspot.popupContent?.images?.map((img: any) => img.id) || [],
          modalText: hotspot.popupContent?.title || hotspot.title || "",
          imgIndex: 0 // 只有一张主图，所以索引为0
        })) : [],
        cta_buttons: formData.ctaButton ? [{
          type: "endscreen",
          image_id: formData.ctaButton.image?.id,
          position: {
            left: (formData.ctaButton.position?.left || 0) / 100,
            top: (formData.ctaButton.position?.top || 0) / 100
          },
          scale: formData.ctaButton.scale || 1.0
        }] : [],
        audio_files: formData.audio ? [formData.audio.id] : []
      };
      
      // 发送请求
      console.log("Sending request to", API_PATHS.generateImage);
      console.log("Request data:", requestData);
      
      const response = await fetch(API_PATHS.generateImage, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });
      
      console.log("Response status:", response.status);
      
      // 处理响应
      const data = await response.json();
      console.log("Response data:", data);
      
      if (data.success) {
        // 确保URL是完整的URL
        if (data.preview_url) {
          data.previewUrl = getFullUrl(data.preview_url);
        }
        
        if (data.file_url) {
          data.fileUrl = getFullUrl(data.file_url);
        }
        
        setResult(data);
        setGenerating(false);
        // 获取文件信息
        fetchFilesInfo();
      } else {
        setErrorMessage(data.error || "Failed to generate ad. Please try again.");
        setGenerating(false);
      }
    } catch (err: ErrorType | unknown) {
      console.error("Error generating ad:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate ad. Please try again.";
      setErrorMessage(errorMessage);
      setGenerating(false);
    } finally {
      setGenerating(false);
    }
  };

  const downloadAd = () => {
    try {
      // 检查是否是ZIP文件（多平台）
      if (result?.file_url && result.file_url.includes(".zip")) {
        // 对于ZIP文件，使用项目ID和文件名
        const fileName = result.file_url.split("/").pop();
        const downloadUrl = API_PATHS.download(formData.project_id, fileName);
        window.open(downloadUrl, "_blank");
      } else {
        // 对于单个HTML文件，使用原来的逻辑
        // 确保使用file_url而不是preview_url
        const originalPath = result?.file_url || "";
        
        // 检查是否是Google、Moloco或TikTok平台，如果是，需要特殊处理
        if ((selectedPlatforms.includes("google") || selectedPlatforms.includes("moloco") || selectedPlatforms.includes("tiktok")) && selectedPlatforms.length === 1) {
          // 对于Google、Moloco和TikTok平台，文件URL应该指向ZIP文件
          const projectId = formData.project_id;
          const safeAppName = encodeURIComponent(appName);
          const versionStr = encodeURIComponent(version);
          const lang = encodeURIComponent(language || "en");
          const platform = selectedPlatforms.includes("google") ? "google" : 
                           selectedPlatforms.includes("moloco") ? "moloco" : "tiktok";
          
          // 构建ZIP文件名
          const zipFileName = `${safeAppName}-${platform}-${lang}-${versionStr}.zip`;
          const downloadUrl = API_PATHS.download(projectId, zipFileName);
          window.open(downloadUrl, "_blank");
        } else {
          // 对于其他平台，使用原始file_url
          const downloadUrl = API_PATHS.downloadFile(originalPath);
          window.open(downloadUrl, "_blank");
        }
      }
    } catch (error) {
      setErrorMessage("Failed to download file. Please try again.");
    }
  };

  // 刷新预览
  const refreshPreview = () => {
    // 增加refreshKey触发iframe重新加载
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Export Ad</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左侧：预览区域 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-800">
              {result ? "Ad Preview" : "Preview Area"}
            </h3>
            <div className="flex space-x-2">
              {result && (
                <button
                  className="flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                  onClick={refreshPreview}
                  title="Refresh Preview"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  <span>Refresh</span>
                </button>
              )}
              <button
                className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                onClick={toggleOrientation}
              >
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                {isLandscape ? "Portrait Mode" : "Landscape Mode"}
              </button>
            </div>
          </div>

          <div
            className={`bg-black rounded-lg overflow-hidden transition-all duration-300 ${
              isLandscape 
                ? "aspect-video" 
                : "aspect-[9/16] max-w-[400px] mx-auto"
            }`}
          >
            {result && (result.previewUrl || result.preview_url) ? (
              <React.Fragment>
                <iframe
                  ref={iframeRef}
                  key={`preview-iframe-${refreshKey}`}
                  src={result.previewUrl || getFullUrl(result.preview_url)}
                  className={`w-full h-full border-0 ${isLandscape ? "" : "transform rotate-0"}`}
                  title="Playable Ad Preview"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock allow-modals"
                  style={{
                    transform: isLandscape ? "rotate(0deg)" : "rotate(0deg)",
                  }}
                />
              </React.Fragment>
            ) : generating ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-white text-lg">Generating your ad...</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <div className="text-center p-6">
                  <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <h3 className="text-white text-lg font-medium mb-2">No Preview Available</h3>
                  <p className="text-gray-300 text-sm mb-4">Configure options and click "Generate Ad" to create your playable ad</p>
                </div>
              </div>
            )}
          </div>

          {/* 添加Back按钮到视频下方 */}
          <div className="flex justify-between mt-4">
            <button
              onClick={prevStep}
              className="px-6 py-2 rounded-md text-gray-700 font-medium border border-gray-300 hover:bg-gray-50"
            >
              Back
            </button>
          </div>
          {/* 预览区域结束 */}
        </div>

        {/* 右侧：配置和生成按钮 */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">Ad Configuration</h3>
          
          {errorMessage && (
            <div className="mb-6">
              <div className="bg-red-50 p-4 rounded-md border border-red-200">
                <p className="text-red-700 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Platforms <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handlePlatformChange("all")}
                className={`px-4 py-2 rounded-md border transition-colors ${
                  isPlatformSelected("all")
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                All Platforms
                {isPlatformSelected("all") && (
                  <svg className="h-4 w-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </button>
              <button
                onClick={() => handlePlatformChange("google")}
                className={`px-4 py-2 rounded-md border transition-colors ${
                  isPlatformSelected("google")
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Google
                {isPlatformSelected("google") && (
                  <svg className="h-4 w-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </button>
              <button
                onClick={() => handlePlatformChange("facebook")}
                className={`px-4 py-2 rounded-md border transition-colors ${
                  isPlatformSelected("facebook")
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Facebook
                {isPlatformSelected("facebook") && (
                  <svg className="h-4 w-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </button>
              <button
                onClick={() => handlePlatformChange("applovin")}
                className={`px-4 py-2 rounded-md border transition-colors ${
                  isPlatformSelected("applovin")
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                AppLovin
                {isPlatformSelected("applovin") && (
                  <svg className="h-4 w-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </button>
              <button
                onClick={() => handlePlatformChange("moloco")}
                className={`px-4 py-2 rounded-md border transition-colors ${
                  isPlatformSelected("moloco")
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Moloco
                {isPlatformSelected("moloco") && (
                  <svg className="h-4 w-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </button>
              <button
                onClick={() => handlePlatformChange("tiktok")}
                className={`px-4 py-2 rounded-md border transition-colors ${
                  isPlatformSelected("tiktok")
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                TikTok
                {isPlatformSelected("tiktok") && (
                  <svg className="h-4 w-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Select one or more platforms where your ad will be displayed
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={handleLanguageChange}
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="en">English</option>
              <option value="zh">Chinese</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Select the language for your ad
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="appName" className="block text-sm font-medium text-gray-700 mb-1">
              App Name
            </label>
            <input
              type="text"
              id="appName"
              value={appName}
              onChange={handleAppNameChange}
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="PlayableAds"
            />
                          <p className="text-sm text-gray-500 mt-1">
                Enter your application name (e.g., CandyCrush, FarmVille, TikTok)
              </p>
          </div>

          <div className="mb-6">
            <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">
              Version
            </label>
            <input
              type="text"
              id="version"
              value={version}
              onChange={handleVersionChange}
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="v1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter the version for your ad (e.g., v1, v2, beta)
            </p>
          </div>

          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-700 mb-2">Ad Content Summary</h4>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              {/* 简化的内容摘要 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Media Files:</p>
                  <p className="text-xs text-gray-600">
                    Main Images: {formData.image ? 1 : 0} 
                    {filesInfo?.image_files && filesInfo.image_files.length > 0 && ` (${filesInfo.human_total_image_size})`}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Elements:</p>
                  <p className="text-xs text-gray-600">
                    Hotspots: {formData.hotspots?.length || 0}
                  </p>
                  <p className="text-xs text-gray-600">
                    CTA Button: {formData.ctaButton ? 1 : 0}
                  </p>
                  <p className="text-xs text-gray-600">
                    Audio Files: {formData.audio ? 1 : 0}
                  </p>
                </div>
              </div>
              
              {/* 总大小信息 */}
              {filesInfo && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Estimated HTML Size:</span> {filesInfo.human_estimated_html_size}
                  </p>
                </div>
              )}
              
              {loadingFilesInfo && (
                <div className="text-center py-2">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-sm text-gray-500">Loading file info...</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <button
              onClick={generateAd}
              disabled={generating || !formData.image || selectedPlatforms.length === 0 || language === ""}
              className={`w-full py-3 rounded-md font-medium ${
                generating || !formData.image || selectedPlatforms.length === 0 || language === ""
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {generating ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : (
                <>Generate {selectedPlatforms.length === 1 && selectedPlatforms[0] === "all" ? "All Ads" : selectedPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}</>
              )}
            </button>
            
            {/* 生成成功提示和下载按钮 */}
            {result && (
              <div className="mt-4 space-y-4">
                <div className="bg-green-50 p-4 rounded-md border border-green-200">
                  <p className="text-green-700 flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Ad generated successfully for {selectedPlatforms.length === 1 && selectedPlatforms[0] === "all" ? "All Platforms" : selectedPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}! You can preview it in the left panel.
                  </p>
                </div>
                
                <button
                  onClick={downloadAd}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  Download {selectedPlatforms.length === 1 && selectedPlatforms[0] === "all" ? "All Platforms" : selectedPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")} Ad ({appName})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportAd; 