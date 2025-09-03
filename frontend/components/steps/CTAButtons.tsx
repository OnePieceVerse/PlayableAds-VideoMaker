"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface CTAButton {
  id: string;
  type: "fulltime" | "endscreen";
  image: {
    id: string;
    url: string;
  };
  position: {
    left: number;
    top: number;
  };
  scale: number; // 添加缩放比例属性
  startTime?: number;
}

interface CTAButtonsProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const CTAButtons: React.FC<CTAButtonsProps> = ({
  formData,
  updateFormData,
  nextStep,
  prevStep,
}) => {
  const [currentButton, setCurrentButton] = useState<CTAButton | null>(null);
  const [buttonType, setButtonType] = useState<"fulltime" | "endscreen">("fulltime");
  const [position, setPosition] = useState({ left: 20, top: 20 });
  const [scale, setScale] = useState(0.2); // 20% of screen width
  const [startTime, setStartTime] = useState(0.1);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(false); // 添加横竖屏状态
  const [isDraggingSlider, setIsDraggingSlider] = useState(false); // 添加是否正在拖动滑块的状态
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedButtonType, setSelectedButtonType] = useState<"fulltime" | "endscreen" | null>(null);
  const [editingButton, setEditingButton] = useState<CTAButton | null>(null); // 添加编辑状态
  const [videoRect, setVideoRect] = useState<any>(null); // 存储视频实际显示区域

  // 当组件加载时，根据视频方向设置横竖屏状态
  useEffect(() => {
    // 每次都根据视频原始宽高判断，不保留之前的设置
    if (formData.video && formData.video.metadata) {
      const { width, height } = formData.video.metadata;
      if (width && height) {
        setIsLandscape(width > height);
      }
    }
  }, [formData.video]);

  // 计算视频的实际显示区域
  const calculateVideoRect = useCallback(() => {
    if (!containerRef.current || !videoRef.current) return null;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const videoElement = videoRef.current;
    
    // 默认视频区域与容器相同
    let rect = {
      left: containerRect.left,
      top: containerRect.top,
      width: containerRect.width,
      height: containerRect.height,
      right: containerRect.right,
      bottom: containerRect.bottom,
      x: containerRect.x,
      y: containerRect.y
    };
    
    // 使用视频的原始宽高，而不是显示尺寸
    const videoWidth = formData.video?.metadata?.width || videoElement.videoWidth;
    const videoHeight = formData.video?.metadata?.height || videoElement.videoHeight;
    
    if (videoWidth && videoHeight) {
      console.log('使用视频原始宽高:', videoWidth, videoHeight);
      
      // 计算视频在容器中的实际显示区域
      const containerAspect = containerRect.width / containerRect.height;
      const videoAspect = videoWidth / videoHeight;
      
      if (containerAspect > videoAspect) {
        // 视频高度填满容器，宽度居中
        const displayedVideoWidth = containerRect.height * videoAspect;
        const horizontalPadding = (containerRect.width - displayedVideoWidth) / 2;
        rect = {
          left: containerRect.left + horizontalPadding,
          top: containerRect.top,
          width: displayedVideoWidth,
          height: containerRect.height,
          right: containerRect.left + horizontalPadding + displayedVideoWidth,
          bottom: containerRect.top + containerRect.height,
          x: containerRect.left + horizontalPadding,
          y: containerRect.top
        };
      } else {
        // 视频宽度填满容器，高度居中
        const displayedVideoHeight = containerRect.width / videoAspect;
        const verticalPadding = (containerRect.height - displayedVideoHeight) / 2;
        rect = {
          left: containerRect.left,
          top: containerRect.top + verticalPadding,
          width: containerRect.width,
          height: displayedVideoHeight,
          right: containerRect.left + containerRect.width,
          bottom: containerRect.top + verticalPadding + displayedVideoHeight,
          x: containerRect.left,
          y: containerRect.top + verticalPadding
        };
      }
    }
    
    return rect;
  }, [formData.video]);

  // 在视频加载完成和窗口大小变化时更新视频区域
  useEffect(() => {
    const updateVideoRect = () => {
      const rect = calculateVideoRect();
      if (rect) {
        setVideoRect(rect);
        
        // 打印视频的实际宽高
        if (videoRef.current) {
          console.log('视频元素实际宽高:', {
            videoWidth: videoRef.current.videoWidth,
            videoHeight: videoRef.current.videoHeight,
            displayWidth: rect.width,
            displayHeight: rect.height,
            containerWidth: containerRef.current?.getBoundingClientRect().width,
            containerHeight: containerRef.current?.getBoundingClientRect().height
          });
        }
      }
    };
    
    // 视频元数据加载完成时更新
    const handleVideoMetadata = () => {
      updateVideoRect();
      
      // 视频元数据加载完成时打印宽高
      if (videoRef.current) {
        console.log('视频元数据加载完成:', {
          videoWidth: videoRef.current.videoWidth,
          videoHeight: videoRef.current.videoHeight,
          duration: videoRef.current.duration
        });
      }
    };
    
    // 窗口大小变化时更新
    window.addEventListener('resize', updateVideoRect);
    
    if (videoRef.current) {
      videoRef.current.addEventListener('loadedmetadata', handleVideoMetadata);
    }
    
    // 初始更新
    updateVideoRect();
    
    return () => {
      window.removeEventListener('resize', updateVideoRect);
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadedmetadata', handleVideoMetadata);
      }
    };
  }, [calculateVideoRect]);

  // Check if we have a video
  if (!formData.video) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Please upload a video first</p>
        <button
          onClick={prevStep}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Go Back
        </button>
      </div>
    );
  }

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setStartTime(parseFloat(videoRef.current.currentTime.toFixed(2)));
    }
  };

  const handleVideoPause = () => {
    if (videoRef.current) {
      setStartTime(parseFloat(videoRef.current.currentTime.toFixed(2)));
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setStartTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      // 拖动时暂停视频
      videoRef.current.pause();
    }
    setIsDraggingSlider(true);
  };

  // 处理时间滑块释放
  const handleTimeChangeEnd = () => {
    setIsDraggingSlider(false);
  };

  const handlePositionChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    axis: "left" | "top"
  ) => {
    const value = parseInt(e.target.value);
    setPosition((prev) => ({
      ...prev,
      [axis]: value,
    }));
  };

  // 处理缩放滑块变化
  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setScale(value / 100); // Convert percentage to scale factor
  };

  // 切换横竖屏
  const toggleOrientation = () => {
    setIsLandscape(!isLandscape);
  };

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !videoRect) return;
    
    setIsDragging(true);
    
    // 记录初始点击位置与当前按钮位置的偏移量
    const initialX = e.clientX;
    const initialY = e.clientY;
    const initialLeft = position.left;
    const initialTop = position.top;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!videoRect) return;
      
      // 计算鼠标移动的距离（相对于初始点击位置）
      const deltaX = moveEvent.clientX - initialX;
      const deltaY = moveEvent.clientY - initialY;
      
      // 将移动距离转换为百分比
      const deltaXPercent = (deltaX / videoRect.width) * 100;
      const deltaYPercent = (deltaY / videoRect.height) * 100;
      
      // 基于初始位置和移动距离计算新位置
      const newLeft = initialLeft + deltaXPercent;
      const newTop = initialTop + deltaYPercent;
      
      // 限制在0-100范围内
      setPosition({
        left: Math.max(0, Math.min(100, newLeft)),
        top: Math.max(0, Math.min(100, newTop)),
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const onDrop = async (acceptedFiles: File[]) => {
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
      uploadFormData.append("project_id", formData.project_id); // 添加项目ID

      // Upload to backend API
      const response = await fetch("http://localhost:8080/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to upload image");
      }

      // Create a new CTA button
      const newButton: CTAButton = {
        id: `button_${Date.now()}`,
        type: selectedButtonType || buttonType,
        image: {
          id: data.file_id,
          url: `http://localhost:8080${data.url}`,
        },
        position: { ...position },
        scale: scale, // 使用当前的scale值
      };

      if ((selectedButtonType || buttonType) === "endscreen") {
        newButton.startTime = startTime;
        // 如果是 End Screen 按钮，禁止视频播放
        if (videoRef.current) {
          videoRef.current.pause();
        }
      } else {
        // 如果是 Full-time 按钮，将视频重置到开始时间并禁止播放
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.pause();
        }
        setStartTime(0);
      }

      setCurrentButton(newButton);
      setUploading(false);
    } catch (err: any) {
      setError(err.message || "An error occurred during upload");
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    disabled: uploading,
    maxFiles: 1,
  });

  // 创建一个新的CTA按钮
  const addCTAButton = () => {
    if (!currentButton) {
      setError("Please upload a CTA button image first");
      return;
    }

    const buttonTypeToAdd = selectedButtonType || buttonType;

    // 检查是否已存在同类型的按钮
    const existingButtonOfSameType = formData.ctaButtons.find(
      (button: CTAButton) => button.type === buttonTypeToAdd
    );

    if (existingButtonOfSameType) {
      setError(`A ${buttonTypeToAdd === "fulltime" ? "Full-time" : "End Screen"} button already exists. You can only add one button of each type.`);
      return;
    }

    // 验证 End Screen 按钮的时间
    if (buttonTypeToAdd === "endscreen" && startTime === 0) {
      setError("End Screen button cannot start at 0s. Please set a valid time (minimum 0.1s).");
      return;
    }

    // 更新当前按钮的所有值，确保类型正确
    const updatedButton: CTAButton = {
      ...currentButton,
      type: buttonTypeToAdd,
      position: { ...position },
      scale: scale
    };

    // 如果是 End Screen 按钮，确保包含开始时间
    if (buttonTypeToAdd === "endscreen") {
      updatedButton.startTime = startTime;
    }

    // Add the current button to the list
    const updatedButtons = [...formData.ctaButtons, updatedButton];
    updateFormData("ctaButtons", updatedButtons);

    // Reset current button and selected type
    setCurrentButton(null);
    setSelectedButtonType(null);
    setError(null);
    
    // 不重置位置和缩放，保留当前值
  };

  const removeCTAButton = (buttonId: string) => {
    const updatedButtons = formData.ctaButtons.filter(
      (button: CTAButton) => button.id !== buttonId
    );
    updateFormData("ctaButtons", updatedButtons);
    setEditingButton(null);
    setCurrentButton(null);
    setSelectedButtonType(null);
    setError(null);
    
    // 不重置位置和缩放，保留当前值
  };

  const editCTAButton = (button: CTAButton) => {
    setEditingButton(button);
    setCurrentButton(button);
    setButtonType(button.type);
    setPosition({ left: button.position.left, top: button.position.top });
    setScale(button.scale);
    setStartTime(button.startTime || 0);
    setSelectedButtonType(button.type);
  };

  const saveEdit = () => {
    if (!editingButton || !currentButton) return;

    // 验证 End Screen 按钮的时间
    if (editingButton.type === "endscreen" && startTime === 0) {
      setError("End Screen button cannot start at 0s. Please set a valid time.");
      return;
    }

    const updatedButton: CTAButton = {
      ...editingButton,
      position: { ...position },
      scale: scale,
      startTime: editingButton.type === "endscreen" ? startTime : undefined
    };

    const updatedButtons = formData.ctaButtons.map((btn: CTAButton) => 
      btn.id === editingButton.id ? updatedButton : btn
    );

    updateFormData("ctaButtons", updatedButtons);
    setEditingButton(null);
    setCurrentButton(null);
    setSelectedButtonType(null);
    setError(null);
    
    // 不重置位置和缩放，保留当前值
  };

  const cancelEdit = () => {
    setEditingButton(null);
    setCurrentButton(null);
    setSelectedButtonType(null);
    setError(null);
    
    // 不重置位置和缩放，保留当前值
  };

  const handleContinue = () => {
    // 检查是否添加了两个 CTA 按钮
    const fulltimeButtons = formData.ctaButtons.filter((button: CTAButton) => button.type === "fulltime");
    const endscreenButtons = formData.ctaButtons.filter((button: CTAButton) => button.type === "endscreen");
    
    if (fulltimeButtons.length === 0) {
      setError("Please add at least one Full-time CTA button");
      return;
    }
    
    if (endscreenButtons.length === 0) {
      setError("Please add at least one End Screen CTA button");
      return;
    }

    // If there's a current button that hasn't been added yet, add it
    if (currentButton) {
      if (window.confirm("You have an unsaved CTA button. Would you like to save it before continuing?")) {
        addCTAButton();
      }
    }

    nextStep();
  };

  // 当视频被拖动后自动播放
  const handleVideoSeeked = () => {
    // 只有在非拖动滑块状态下才自动播放
    // 如果是 Full-time 或 End Screen 按钮，禁止自动播放
    if (!isDraggingSlider && 
        (selectedButtonType || buttonType) === null &&
        videoRef.current && 
        videoRef.current.paused) {
      videoRef.current.play().catch(e => console.error('Auto play failed:', e));
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          Add CTA Buttons
        </h2>
        <p className="text-gray-600">
          Add call-to-action buttons to your playable ad
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-800">Video</h3>
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
            ref={containerRef}
            className={`bg-black rounded-lg overflow-hidden relative transition-all duration-300 ${
              isLandscape 
                ? "aspect-video" 
                : "aspect-[9/16] max-w-[400px] mx-auto"
            }`}
          >
            <video
              ref={videoRef}
              src={formData.video.url}
              className="w-full h-full object-contain pointer-events-none"
              onTimeUpdate={handleVideoTimeUpdate}
              onPause={handleVideoPause}
              onSeeked={handleVideoSeeked}
            />
            
            {/* Current button preview */}
            {currentButton && videoRect && (
              <div
                className={`absolute cursor-move ${isDragging ? 'pointer-events-none' : ''}`}
                style={{
                  left: `${position.left}%`,
                  top: `${position.top}%`,
                  transform: `translate(-50%, -50%)`,
                  width: `${scale * 100}%`,
                }}
                onMouseDown={startDrag}
              >
                <img 
                  src={currentButton.image.url} 
                  alt="CTA Button" 
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-medium text-gray-800">
                CTA Buttons ({formData.ctaButtons.length}/2)
              </h3>
              <div className="flex space-x-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  formData.ctaButtons.some((btn: CTAButton) => btn.type === "fulltime")
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {formData.ctaButtons.some((btn: CTAButton) => btn.type === "fulltime") ? "✓" : "○"} Full-time
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  formData.ctaButtons.some((btn: CTAButton) => btn.type === "endscreen")
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {formData.ctaButtons.some((btn: CTAButton) => btn.type === "endscreen") ? "✓" : "○"} End Screen
                </span>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setCurrentButton(null);
                  setError(null);
                  setButtonType("fulltime");
                  setSelectedButtonType("fulltime");
                  // 触发文件选择
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      onDrop([file]);
                    }
                  };
                  input.click();
                }}
                disabled={formData.ctaButtons.some((btn: CTAButton) => btn.type === "fulltime")}
                className={`px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                  formData.ctaButtons.some((btn: CTAButton) => btn.type === "fulltime")
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
              >
                + Full-time Button
              </button>
              <button
                onClick={() => {
                  setCurrentButton(null);
                  setError(null);
                  setButtonType("endscreen");
                  setSelectedButtonType("endscreen");
                  // 触发文件选择
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      onDrop([file]);
                    }
                  };
                  input.click();
                }}
                disabled={formData.ctaButtons.some((btn: CTAButton) => btn.type === "endscreen")}
                className={`px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                  formData.ctaButtons.some((btn: CTAButton) => btn.type === "endscreen")
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
              >
                + End Screen Button
              </button>
            </div>
          </div>
          
          {/* 简化的操作区域 */}
          {!currentButton && (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <div className="space-y-4">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  />
                </svg>
                <div>
                  <h4 className="text-lg font-medium text-gray-800 mb-2">
                    Add Call-to-Action Buttons
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Click one of the buttons above to add a Full-time or End Screen CTA button
                  </p>
                  
                  {/* 添加按钮显示逻辑说明 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h5 className="text-sm font-medium text-blue-800">Button Display Logic</h5>
                        <div className="mt-1 text-sm text-blue-700">
                          <p><strong>Full-time Button:</strong> Shows throughout the video until the End Screen button appears.</p>
                          <p><strong>End Screen Button:</strong> Shows at the specified time and replaces the Full-time button.</p>
                          <p className="mt-1 text-blue-600"><em>Note: Only one button is visible at a time.</em></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="text-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-2xl mb-2">⏱️</div>
                    <h5 className="font-medium text-gray-800">Full-time Button</h5>
                  </div>
                  <div className="text-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-2xl mb-2">🎯</div>
                    <h5 className="font-medium text-gray-800">End Screen Button</h5>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 按钮配置区域 - 只在有按钮时显示 */}
          {currentButton && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-800">
                  {editingButton ? "Edit" : "Configure"} {(selectedButtonType || buttonType) === "fulltime" ? "Full-time" : "End Screen"} Button
                </h4>
                <button
                  onClick={() => {
                    setCurrentButton(null);
                    setError(null);
                    setSelectedButtonType(null);
                    setEditingButton(null);
                  }}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
              

              
              {/* 按钮预览 */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h5 className="text-sm font-medium text-gray-800 mb-3">Button Preview</h5>
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
                        <p className="font-medium">{(selectedButtonType || buttonType) === "fulltime" ? "Full-time" : "End Screen"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Position:</p>
                        <p className="font-medium">{position.left.toFixed(0)}% left, {position.top.toFixed(0)}% top</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Scale:</p>
                        <p className="font-medium">{scale.toFixed(1)}x</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Status:</p>
                        <p className="font-medium text-green-600">Ready to add</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 配置选项 */}
              <div className="space-y-4">
                {/* 图片上传区域 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Button Image
                  </label>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                      isDragActive
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-blue-400"
                    } ${uploading ? "opacity-75" : ""}`}
                  >
                    <input {...getInputProps()} />
                    <div className="space-y-2">
                      <svg
                        className="mx-auto h-6 w-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {uploading ? (
                        <p className="text-gray-700 text-sm">Uploading image...</p>
                      ) : (
                        <p className="text-gray-700 text-sm">
                          {isDragActive
                            ? "Drop the button image here"
                            : "Drag and drop your button image here, or click to select"}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Supported formats: PNG, JPG, GIF, WebP
                      </p>
                    </div>
                  </div>
                </div>

                {(selectedButtonType || buttonType) === "endscreen" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time (seconds)
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max={formData.video.metadata?.duration || 30}
                      step="0.1"
                      value={startTime}
                      onChange={handleTimeChange}
                      onMouseUp={handleTimeChangeEnd}
                      onTouchEnd={handleTimeChangeEnd}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0.1s</span>
                      <span className="font-medium">{startTime.toFixed(1)}s</span>
                      <span>{(formData.video.metadata?.duration || 30).toFixed(1)}s</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      End Screen button cannot start at 0s. Minimum time is 0.1s.
                    </p>
                  </div>
                )}

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
                    value={scale * 100} // Convert scale back to percentage for input
                    onChange={handleScaleChange}
                    className="w-full"
                  />
                  <div className="flex justify-center text-xs text-gray-500 mt-1">
                    <span className="font-medium">{Math.round(scale * 100)}%</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-md text-center text-sm">
                  {error}
                </div>
              )}

              <div className="mt-6">
                {editingButton ? (
                  <div className="flex space-x-3">
                    <button
                      onClick={saveEdit}
                      className="flex-1 py-3 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={addCTAButton}
                    disabled={uploading}
                    className={`w-full py-3 rounded-lg font-medium ${
                      uploading
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {uploading ? "Uploading..." : `Add ${(selectedButtonType || buttonType) === "fulltime" ? "Full-time" : "End Screen"} Button`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 已添加的按钮列表 */}
          {formData.ctaButtons.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-800 mb-3">Your CTA Buttons</h4>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                {formData.ctaButtons.map((button: CTAButton, index: number) => (
                  <div
                    key={button.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
                  >
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center">
                        <img
                          src={button.image.url}
                          alt="CTA Button"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="ml-3 flex-grow min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          Button #{index + 1} ({button.type === "fulltime" ? "Full-time" : "End Screen"})
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {button.type === "endscreen" && button.startTime !== undefined
                            ? button.startTime === 0
                              ? `⚠️ Invalid time (0.0s) - Please edit to set a valid time • `
                              : `Appears at ${button.startTime.toFixed(1)}s • `
                            : "Shows until End Screen button appears • "}
                          {button.position.left.toFixed(0)}% left, {button.position.top.toFixed(0)}% top
                          {button.scale ? ` • Width: ${Math.round(button.scale * 100)}%` : ''}
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        {(button.type === "endscreen" && button.startTime === 0) && (
                          <button
                            onClick={() => editCTAButton(button)}
                            className="p-1 text-orange-500 hover:text-orange-700 flex-shrink-0"
                            title="Edit button time"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => removeCTAButton(button.id)}
                          className="p-1 text-red-500 hover:text-red-700 flex-shrink-0"
                          title="Delete button"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          onClick={handleContinue}
          disabled={!formData.ctaButtons.some((btn: CTAButton) => btn.type === "fulltime") || 
                   !formData.ctaButtons.some((btn: CTAButton) => btn.type === "endscreen")}
          className={`px-6 py-2 rounded-md font-medium ${
            !formData.ctaButtons.some((btn: CTAButton) => btn.type === "fulltime") || 
            !formData.ctaButtons.some((btn: CTAButton) => btn.type === "endscreen")
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default CTAButtons; 