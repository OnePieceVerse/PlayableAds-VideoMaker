"use client";

import React, { useState, useRef, useEffect } from "react";

// 定义类型
type Platform = "google" | "facebook" | "applovin" | "all" | "";
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
  formData: Record<string, any>;
  updateFormData: (field: string, value: any) => void;
  prevStep: () => void;
}

const ExportAd: React.FC<StepProps> = ({ formData, updateFormData, prevStep }) => {
  const [platform, setPlatform] = useState<Platform>("");
  const [language, setLanguage] = useState<Language>("");
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
      const response = await fetch(`http://localhost:8080/api/project-files-info?project_id=${formData.project_id}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch files info");
      }
      
      const data = await response.json();
      if (data.success) {
        // 处理文件信息，去除重复
        const processedData = processFilesInfo(data);
        setFilesInfo(processedData);
      } else {
        console.error("Error fetching files info:", data.error);
      }
    } catch (error) {
      console.error("Error fetching files info:", error);
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
      fetchFilesInfo();
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

  const handlePlatformChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPlatform(e.target.value as Platform);
    setResult(null);
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

  const generateAd = async () => {
    try {
      setErrorMessage(null);
      setGenerating(true);
      
      // 准备请求数据
      const requestData = {
        video_id: formData.video?.id || "",
        project_id: formData.project_id,
        platform: platform,
        language: language,
        version: version,
        app_name: appName,
        pause_frames: formData.pauseFrames?.length ? formData.pauseFrames.map((frame: any) => ({
          time: frame.time,
          image_id: frame.image?.id,
          position: {
            left: (frame.position?.left || 0) / 100,
            top: (frame.position?.top || 0) / 100
          },
          scale: frame.scale || 1.0
        })) : [],
        cta_buttons: formData.ctaButtons?.length ? formData.ctaButtons.map((button: any) => ({
          type: button.type || "endscreen",
          image_id: button.image?.id,
          position: {
            left: (button.position?.left || 0) / 100,
            top: (button.position?.top || 0) / 100
          },
          scale: button.scale || 1.0,
          time: button.time || 0
        })) : [],
        banners: formData.banners ? (
          Array.isArray(formData.banners) 
            ? (formData.banners.length > 0 
                ? formData.banners.map((banner: any) => ({
                    type: banner.type || "left",
                    image_id: banner.image?.id,
                    position: {
                      left: (banner.position?.left || 0) / 100,
                      top: (banner.position?.top || 0) / 100
                    },
                    scale: banner.scale || 1.0
                  }))
                : []
              )
            : ((formData.banners.left?.image?.id || formData.banners.right?.image?.id) 
                ? {
                    left_image_id: formData.banners.left?.image?.id || null,
                    right_image_id: formData.banners.right?.image?.id || null,
                    left_position: formData.banners.left?.position 
                      ? {
                          left: (formData.banners.left.position.left || 0) / 100,
                          top: (formData.banners.left.position.top || 0) / 100
                        }
                      : null,
                    right_position: formData.banners.right?.position
                      ? {
                          left: (formData.banners.right.position.left || 0) / 100,
                          top: (formData.banners.right.position.top || 0) / 100
                        }
                      : null,
                    left_scale: formData.banners.left?.scale || 1.0,
                    right_scale: formData.banners.right?.scale || 1.0
                  }
                : null
              )
        ) : null
      };
      
      // 打印请求数据，用于调试
      console.log("Request data:", requestData);
      console.log("FormData:", formData);
      
      // 发送请求到后端
      const response = await fetch("http://localhost:8080/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate ad: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // 确保URL是完整的URL
        if (data.preview_url) {
          data.previewUrl = `http://localhost:8080${data.preview_url}`;
        }
        
        if (data.file_url) {
          data.fileUrl = `http://localhost:8080${data.file_url}`;
        }
        
        setResult(data);
      } else {
        setErrorMessage(`Failed to generate ad: ${data.error}`);
      }
    } catch (error: any) {
      setErrorMessage(`Error generating ad: ${error.message || String(error)}`);
    } finally {
      setGenerating(false);
    }
  };

  const downloadAd = () => {
    try {
      // 获取原始文件路径
      const originalPath = result?.file_url || '';
      
      // 构建下载URL
      const downloadUrl = `http://localhost:8080/api/download-file?file_path=${encodeURIComponent(originalPath.replace(/^\//, ''))}`;
      
      // 在新窗口中打开下载URL
      window.open(downloadUrl, '_blank');
    } catch (error) {
      setErrorMessage("Failed to download file. Please try again.");
    }
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
                  src={result.previewUrl || `http://localhost:8080${result.preview_url}`}
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
            <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1">
              Target Platform <span className="text-red-500">*</span>
            </label>
            <select
              id="platform"
              value={platform}
              onChange={handlePlatformChange}
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Platform</option>
              <option value="all">All Platforms</option>
              <option value="google">Google Ads</option>
              <option value="facebook">Facebook Ads</option>
              <option value="applovin">AppLovin</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Select the platform where your ad will be displayed
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
              Language <span className="text-red-500">*</span>
            </label>
            <select
              id="language"
              value={language}
              onChange={handleLanguageChange}
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Language</option>
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
                    Video: {filesInfo?.video_files?.length || 0} 
                    {filesInfo?.video_files && filesInfo.video_files.length > 0 && ` (${filesInfo.human_total_video_size})`}
                  </p>
                  <p className="text-xs text-gray-600">
                    Images: {filesInfo?.image_files?.length || 0} 
                    {filesInfo?.image_files && filesInfo.image_files.length > 0 && ` (${filesInfo.human_total_image_size})`}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Elements:</p>
                  <p className="text-xs text-gray-600">
                    Pause Frames: {formData.pauseFrames?.length || 0}
                  </p>
                  <p className="text-xs text-gray-600">
                    CTA Buttons: {formData.ctaButtons?.length || 0}
                  </p>
                  <p className="text-xs text-gray-600">
                    Banners: {
                      Array.isArray(formData.banners) 
                        ? formData.banners.length 
                        : (formData.banners?.left ? 1 : 0) + (formData.banners?.right ? 1 : 0)
                    }
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
              disabled={generating || !formData.video || result !== null || platform === "" || language === ""}
              className={`w-full py-3 rounded-md font-medium ${
                generating || !formData.video || result !== null || platform === "" || language === ""
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
                <>Generate {platform === "all" ? "All Ads" : `${platform.charAt(0).toUpperCase() + platform.slice(1)} Ad`}</>
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
                    Ad generated successfully! You can preview it in the left panel.
                  </p>
                </div>
                
                <button
                  onClick={downloadAd}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  Download {platform === "all" ? "All Platforms" : platform.charAt(0).toUpperCase() + platform.slice(1)} Ad ({appName})
                </button>
              </div>
            )}
          </div>

          <div className="mt-4">
            <button
              onClick={prevStep}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportAd; 