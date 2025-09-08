"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import config, { API_PATHS, getFullUrl } from "@/config/api";

interface PauseFrame {
  id: string;
  time: number;
  image: {
    id: string;
    url: string;
  };
  position: {
    left: number;
    top: number;
  };
  scale: number; // 添加缩放比例属性
  buttonImage?: {  // 添加可选的按钮图片
    id: string;
    url: string;
  };
  buttonPosition?: { // 添加按钮位置
    left: number;
    top: number;
  };
  buttonScale?: number; // 添加按钮缩放比例
}

interface PauseFramesProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const PauseFrames: React.FC<PauseFramesProps> = ({
  formData,
  updateFormData,
  nextStep,
  prevStep,
}) => {
  const [currentFrame, setCurrentFrame] = useState<PauseFrame | null>(null);
  const [pauseTime, setPauseTime] = useState(0);
  const [position, setPosition] = useState({ left: 50, top: 50 });
  const [scale, setScale] = useState(0.2); // 20% of screen width
  const [buttonPosition, setButtonPosition] = useState({ left: 50, top: 50 }); // 按钮位置
  const [buttonScale, setButtonScale] = useState(0.2); // 按钮缩放比例
  const [uploading, setUploading] = useState(false);
  const [buttonUploading, setButtonUploading] = useState(false); // 添加按钮图片上传状态
  const [error, setError] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(false); // 添加横竖屏状态
  const [isDraggingButton, setIsDraggingButton] = useState(false); // 添加是否正在拖动按钮的状态
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // 添加编辑状态
  const [editingFrame, setEditingFrame] = useState<PauseFrame | null>(null); // 添加正在编辑的帧
  const [isDraggingSlider, setIsDraggingSlider] = useState(false); // 添加是否正在拖动滑块的状态
  const [showFrameEditor, setShowFrameEditor] = useState(false); // 添加是否显示帧编辑器的状态
  const [showFrameSelector, setShowFrameSelector] = useState(false); // 添加是否显示帧选择器的状态
  const [isCopyingFrame, setIsCopyingFrame] = useState(false); // 添加是否正在复制帧的状态
  const [showConfirmDialog, setShowConfirmDialog] = useState(false); // 添加确认弹框状态
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null); // 添加确认动作
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
          console.log('PauseFrames - 视频元素实际宽高:', {
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
        console.log('PauseFrames - 视频元数据加载完成:', {
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

  // 当编辑状态变化时，确保视频暂停
  useEffect(() => {
    if (isEditing && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isEditing]);

  // 当视频播放时更新时间
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setPauseTime(parseFloat(videoRef.current.currentTime.toFixed(2)));
    }
  };

  // 当视频暂停时更新时间
  const handleVideoPause = () => {
    if (videoRef.current) {
      setPauseTime(parseFloat(videoRef.current.currentTime.toFixed(2)));
    }
  };

  // 当视频被拖动后自动播放
  const handleVideoSeeked = () => {
    // 只有在非拖动滑块状态且非复制帧状态下才自动播放
    // 编辑状态下不自动播放
    if (!isDraggingSlider && !isCopyingFrame && !isEditing && videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(e => console.error('Auto play failed:', e));
    }
  };

  // 创建新的暂停帧
  const createNewPauseFrame = () => {
    // 如果当前有未保存的帧，先提示保存
    if (currentFrame && !isEditing) {
      setConfirmAction(() => {
        if (window.confirm("You have an unsaved pause frame. Would you like to save it first?")) {
          addPauseFrame();
          return () => {}; // No action needed after confirmation
        } else {
          setCurrentFrame(null);
          return () => {}; // No action needed after cancellation
        }
      });
    }
    
    // 重置当前帧为null，以便开始新的帧
    setCurrentFrame(null);
    setIsEditing(false);
    setEditingFrame(null);
    setError(null);
    setShowFrameEditor(true);
  };

  // 添加暂停帧
  const addPauseFrame = () => {
    if (!currentFrame) {
      setError("Please upload a guide image first");
      return;
    }

    // 检查是否存在相同暂停时间的帧
    const existingFrameWithSameTime = formData.pauseFrames.find(
      (frame: PauseFrame) => Math.abs(frame.time - pauseTime) < 0.1
    );

    if (existingFrameWithSameTime) {
      setError(`A pause frame already exists at ${pauseTime.toFixed(1)}s. Please adjust the pause time to continue.`);
      return;
    }

    // 更新当前帧的所有值，包括最新的暂停时间和按钮图片信息
    const updatedFrame: PauseFrame = {
      ...currentFrame,
      time: pauseTime,
      position: { ...position },
      scale: scale,
    };

    // 如果有buttonImage，确保包含完整的buttonImage、buttonPosition和buttonScale
    if (currentFrame.buttonImage) {
      updatedFrame.buttonImage = {
        id: currentFrame.buttonImage.id,
        url: currentFrame.buttonImage.url
      };
      updatedFrame.buttonPosition = { ...buttonPosition };
      updatedFrame.buttonScale = buttonScale;
      
      console.log("Adding frame with button image:", updatedFrame.buttonImage.id);
    }

    // 添加当前帧到列表
    const updatedFrames = [...formData.pauseFrames, updatedFrame];
    updateFormData("pauseFrames", updatedFrames);

    // 重置当前帧
    setCurrentFrame(null);
    
    // 隐藏帧编辑器
    setShowFrameEditor(false);
    
    // 清除错误
    setError(null);
  };

  // 复制指定的暂停帧
  const copySpecifiedFrame = (frame: PauseFrame) => {
    // 如果当前有未保存的帧，先提示保存
    if (currentFrame && !isEditing) {
      setConfirmAction(() => {
        if (window.confirm("You have an unsaved pause frame. Would you like to save it first?")) {
          addPauseFrame();
          return () => {}; // No action needed after confirmation
        } else {
          setCurrentFrame(null);
          return () => {}; // No action needed after cancellation
        }
      });
    }

    // 将视频定位到帧的时间点并确保暂停
    if (videoRef.current) {
      videoRef.current.currentTime = frame.time;
      videoRef.current.pause();
      // 禁止视频播放
      // videoRef.current.controls = false;
      
      // 禁用视频的所有可能导致播放的事件
      const disableVideo = () => {
        videoRef.current?.pause();
        return false;
      };
      
      // 添加事件拦截
      videoRef.current.onplay = disableVideo;
      videoRef.current.onclick = disableVideo;
      videoRef.current.onkeydown = disableVideo;
    }
    
    // 设置编辑状态
    setIsEditing(true);
    setEditingFrame(frame);
    setPauseTime(frame.time);
    setPosition(frame.position);
    setScale(frame.scale || 1);
    setButtonPosition(frame.buttonPosition || { left: 50, top: 50 });
    setButtonScale(frame.buttonScale || 0.2);
    setShowFrameEditor(true);
  };

  // 移除暂停帧
  const removePauseFrame = (id: string) => {
    if (window.confirm("Are you sure you want to delete this pause frame?")) {
      updateFormData("pauseFrames", formData.pauseFrames.filter((frame: PauseFrame) => frame.id !== id));
    }
  };

  // 保存编辑
  const saveEdit = () => {
    if (!editingFrame) return;

    // 更新编辑中的帧
    const updatedFrame: PauseFrame = {
      ...editingFrame,
      time: pauseTime,
      position: { ...position },
      scale: scale,
    };
    
    // 如果有buttonImage，确保包含完整的buttonImage、buttonPosition和buttonScale
    if (editingFrame.buttonImage) {
      updatedFrame.buttonImage = {
        id: editingFrame.buttonImage.id,
        url: editingFrame.buttonImage.url
      };
      updatedFrame.buttonPosition = { ...buttonPosition };
      updatedFrame.buttonScale = buttonScale;
      
      console.log("Saving frame with button image:", updatedFrame.buttonImage.id);
    }
    
    // 更新帧列表
    const updatedFrames = formData.pauseFrames.map((frame: PauseFrame) => 
      frame.id === updatedFrame.id ? updatedFrame : frame
    );
    
    updateFormData("pauseFrames", updatedFrames);
    
    // 重置编辑状态
    setIsEditing(false);
    setEditingFrame(null);
    setShowFrameEditor(false);
  };

  // 取消编辑
  const cancelEdit = () => {
    if (confirmAction) {
      confirmAction();
    } else {
      setIsEditing(false);
      setEditingFrame(null);
      setError(null);
      setShowFrameEditor(false);
      setShowFrameSelector(false);
      setIsCopyingFrame(false);
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };

  // 拖动视频区域
  const startDrag = useCallback((e: React.MouseEvent) => {
    // 移除 isEditing 检查，允许在编辑模式下拖动
    if (isDraggingButton) return;

    const rect = videoRect;
    if (!rect) return;

    // 获取图片元素
    const imgElement = e.currentTarget as HTMLDivElement;
    const imgRect = imgElement.getBoundingClientRect();
    
    // 计算鼠标在图片内的相对位置（百分比）
    const offsetX = (e.clientX - imgRect.left) / imgRect.width;
    const offsetY = (e.clientY - imgRect.top) / imgRect.height;

    setIsDragging(true);
    
    // 添加鼠标移动和鼠标释放事件监听
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!rect) return;
      
      // 计算新位置，考虑鼠标在图片内的偏移
      const newX = moveEvent.clientX - rect.x;
      const newY = moveEvent.clientY - rect.y;
      
      // 将鼠标位置转换为百分比位置
      const newPercentageX = (newX / rect.width) * 100;
      const newPercentageY = (newY / rect.height) * 100;
      
      // 设置新位置，确保图片不会超出边界
      setPosition({
        left: Math.max(0, Math.min(100, newPercentageX)),
        top: Math.max(0, Math.min(100, newPercentageY))
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    e.preventDefault();
    e.stopPropagation();
  }, [isDraggingButton, videoRect]);

  // 拖动按钮图片
  const startButtonDrag = useCallback((e: React.MouseEvent) => {
    // 移除 isEditing 检查，允许在编辑模式下拖动
    if (isDragging) return;

    const rect = videoRect;
    if (!rect) return;

    // 获取图片元素
    const imgElement = e.currentTarget as HTMLDivElement;
    const imgRect = imgElement.getBoundingClientRect();
    
    // 计算鼠标在图片内的相对位置（百分比）
    const offsetX = (e.clientX - imgRect.left) / imgRect.width;
    const offsetY = (e.clientY - imgRect.top) / imgRect.height;

    setIsDraggingButton(true);
    
    // 添加鼠标移动和鼠标释放事件监听
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!rect) return;
      
      // 计算新位置，考虑鼠标在图片内的偏移
      const newX = moveEvent.clientX - rect.x;
      const newY = moveEvent.clientY - rect.y;
      
      // 将鼠标位置转换为百分比位置
      const newPercentageX = (newX / rect.width) * 100;
      const newPercentageY = (newY / rect.height) * 100;
      
      // 设置新位置，确保图片不会超出边界
      setButtonPosition({
        left: Math.max(0, Math.min(100, newPercentageX)),
        top: Math.max(0, Math.min(100, newPercentageY))
      });
    };
    
    const handleMouseUp = () => {
      setIsDraggingButton(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    e.preventDefault();
    e.stopPropagation();
  }, [isDragging, videoRect]);

  // 拖动结束
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setIsDraggingButton(false);
  }, []);

  // 时间变化
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setPauseTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  // 时间变化结束
  const handleTimeChangeEnd = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  // 位置变化
  const handlePositionChange = (e: React.ChangeEvent<HTMLInputElement>, axis: 'left' | 'top') => {
    const percentage = parseFloat(e.target.value);
    if (axis === 'left') {
      setPosition(prev => ({ ...prev, left: percentage }));
    } else {
      setPosition(prev => ({ ...prev, top: percentage }));
    }
  };

  // 缩放变化
  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = parseFloat(e.target.value) / 100;
    setScale(percentage);
  };

  // 按钮位置变化
  const handleButtonPositionChange = (e: React.ChangeEvent<HTMLInputElement>, axis: 'left' | 'top') => {
    const percentage = parseFloat(e.target.value);
    if (axis === 'left') {
      setButtonPosition(prev => ({ ...prev, left: percentage }));
    } else {
      setButtonPosition(prev => ({ ...prev, top: percentage }));
    }
  };

  // 按钮缩放变化
  const handleButtonScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = parseFloat(e.target.value) / 100;
    setButtonScale(percentage);
  };

  // 文件上传处理
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

      // 添加文件到FormData
      const uploadFormData = new FormData();
      uploadFormData.append("file", acceptedFiles[0]);
      uploadFormData.append("type", "image");
      uploadFormData.append("step", "pause_frames");
      uploadFormData.append("project_id", formData.project_id);

      // Upload to backend API
      const response = await fetch(API_PATHS.upload, {
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

      // 如果是编辑模式，更新编辑中的帧
      if (isEditing && editingFrame) {
        const updatedFrame: PauseFrame = {
          ...editingFrame,
          image: {
            id: data.file_id,
            url: getFullUrl(data.url),
          }
        };
        setEditingFrame(updatedFrame);
      } else {
        // 创建新的暂停帧
        const newFrame: PauseFrame = {
          id: `frame_${Date.now()}`,
          time: pauseTime,
          image: {
            id: data.file_id,
            url: getFullUrl(data.url),
          },
          position: { ...position },
          scale: 0.2, // 20% of screen width
        };
        setCurrentFrame(newFrame);
      }
      
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

  // 按钮图片上传处理
  const onButtonImageDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file for the button");
      return;
    }

    try {
      setError(null);
      setButtonUploading(true);

      // 添加文件到FormData
      const uploadFormData = new FormData();
      uploadFormData.append("file", acceptedFiles[0]);
      uploadFormData.append("type", "image");  // 使用后端支持的"image"类型
      uploadFormData.append("step", "pause_frames");
      uploadFormData.append("project_id", formData.project_id);
      // 可以添加一个自定义字段来标识这是按钮图片
      uploadFormData.append("image_usage", "button");  // 这个字段在后端可能会被忽略，但不会导致错误

      // Upload to backend API
      const response = await fetch(API_PATHS.upload, {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload button image");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to upload button image");
      }

      // 更新当前帧或编辑中的帧
      if (isEditing && editingFrame) {
        const updatedFrame: PauseFrame = {
          ...editingFrame,
          buttonImage: {
            id: data.file_id,
            url: getFullUrl(data.url),
          },
          buttonPosition: buttonPosition, // 保存按钮位置
          buttonScale: buttonScale, // 保存按钮缩放
        };
        setEditingFrame(updatedFrame);
      } else if (currentFrame) {
        const updatedFrame: PauseFrame = {
          ...currentFrame,
          buttonImage: {
            id: data.file_id,
            url: getFullUrl(data.url),
          },
          buttonPosition: buttonPosition, // 保存按钮位置
          buttonScale: buttonScale, // 保存按钮缩放
        };
        setCurrentFrame(updatedFrame);
      }
      
      setButtonUploading(false);
    } catch (err: any) {
      setError(err.message || "An error occurred during button image upload");
      setButtonUploading(false);
    }
  };

  // 按钮图片的dropzone
  const { 
    getRootProps: getButtonRootProps, 
    getInputProps: getButtonInputProps, 
    isDragActive: isButtonDragActive 
  } = useDropzone({
    onDrop: onButtonImageDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    disabled: buttonUploading,
    maxFiles: 1,
  });

  // 继续按钮
  const handleContinue = () => {
    if (formData.pauseFrames.length === 0) {
      alert("Please add at least one pause frame.");
      return;
    }
    nextStep();
  };

  // 切换横竖屏
  const toggleOrientation = () => {
    setIsLandscape(!isLandscape);
    // 如果当前有未保存的帧，先提示保存
    if (currentFrame && !isEditing) {
      setConfirmAction(() => {
        if (window.confirm("You have an unsaved pause frame. Would you like to save it first?")) {
          addPauseFrame();
          return () => {}; // No action needed after confirmation
        } else {
          setCurrentFrame(null);
          return () => {}; // No action needed after cancellation
        }
      });
    }
  };

  // 编辑暂停帧
  const editPauseFrame = (frame: PauseFrame) => {
    // 如果当前有未保存的帧，先提示保存
    if (currentFrame && !isEditing) {
      setConfirmAction(() => {
        if (window.confirm("You have an unsaved pause frame. Would you like to save it first?")) {
          addPauseFrame();
          return () => {}; // No action needed after confirmation
        } else {
          setCurrentFrame(null);
          return () => {}; // No action needed after cancellation
        }
      });
    }
    
    // 将视频定位到帧的时间点并确保暂停
    if (videoRef.current) {
      videoRef.current.currentTime = frame.time;
      videoRef.current.pause();
      // 禁止视频播放
      videoRef.current.controls = false;
      
      // 禁用视频的所有可能导致播放的事件
      const disableVideo = () => {
        videoRef.current?.pause();
        return false;
      };
      
      // 添加事件拦截
      videoRef.current.onplay = disableVideo;
      videoRef.current.onclick = disableVideo;
      videoRef.current.onkeydown = disableVideo;
    }
    
    // 设置编辑状态
    setIsEditing(true);
    setEditingFrame(frame);
    setPauseTime(frame.time);
    setPosition(frame.position);
    setScale(frame.scale || 1);
    setButtonPosition(frame.buttonPosition || { left: 50, top: 50 });
    setButtonScale(frame.buttonScale || 0.2);
    setShowFrameEditor(true);
  };

  // 显示帧选择器
  const showCopyFrameSelector = () => {
    if (formData.pauseFrames.length === 0) {
      setError("No frames to copy");
      return;
    }
    setShowFrameSelector(true);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Add Pause Frames</h2>
        <p className="text-gray-600">
          Add frames that will pause the video at specific times
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左侧：视频预览 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-800">Video Preview</h3>
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
              className="w-full h-full object-contain"
              onTimeUpdate={handleVideoTimeUpdate}
              onPause={handleVideoPause}
              onSeeked={handleVideoSeeked}
            />
            
            {/* 编辑时添加透明遮罩层，阻止视频交互 */}
            {isEditing && (
              <div 
                className="absolute inset-0 bg-transparent z-5" 
                onClick={(e) => {
                  // 只有点击视频区域才阻止事件
                  if (e.target === e.currentTarget) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (videoRef.current) videoRef.current.pause();
                  }
                }}
              />
            )}
            
            {/* 按钮图片预览 - 放在引导图片下方 */}
            {currentFrame?.buttonImage && videoRect && (
              <div
                className={`absolute ${isDraggingButton ? 'pointer-events-none' : 'cursor-move'}`}
                style={{
                  left: `${buttonPosition.left}%`,
                  top: `${buttonPosition.top}%`,
                  transform: `translate(-50%, -50%)`,
                  width: `${buttonScale * 100}%`,
                  zIndex: 10,
                  transition: isDraggingButton ? 'none' : 'transform 0.1s ease-out'
                }}
                onMouseDown={startButtonDrag}
              >
                <img 
                  src={currentFrame.buttonImage.url} 
                  alt="Button" 
                  className="pointer-events-none w-full h-full object-contain"
                  draggable="false"
                />
              </div>
            )}
            
            {/* 编辑中的按钮图片预览 */}
            {isEditing && editingFrame?.buttonImage && videoRect && (
              <div
                className={`absolute ${isDraggingButton ? 'pointer-events-none' : 'cursor-move'}`}
                style={{
                  left: `${buttonPosition.left}%`,
                  top: `${buttonPosition.top}%`,
                  transform: `translate(-50%, -50%)`,
                  width: `${buttonScale * 100}%`,
                  zIndex: 10,
                  transition: isDraggingButton ? 'none' : 'transform 0.1s ease-out'
                }}
                onMouseDown={startButtonDrag}
              >
                <img 
                  src={editingFrame.buttonImage.url} 
                  alt="Button" 
                  className="pointer-events-none w-full h-full object-contain"
                  draggable="false"
                />
              </div>
            )}
            
            {/* 当前帧预览 - 放在按钮图片上方 */}
            {currentFrame && videoRect && (
              <div
                className={`absolute ${isDragging ? 'pointer-events-none' : 'cursor-move'}`}
                style={{
                  left: `${position.left}%`,
                  top: `${position.top}%`,
                  transform: `translate(-50%, -50%)`,
                  width: `${scale * 100}%`,
                  zIndex: 20,
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
                onMouseDown={startDrag}
              >
                <img 
                  src={currentFrame.image.url} 
                  alt="Guide" 
                  className="pointer-events-none w-full h-full object-contain"
                  draggable="false"
                />
              </div>
            )}
            
            {/* 编辑中的帧预览 - 放在按钮图片上方 */}
            {isEditing && editingFrame && videoRect && (
              <div
                className={`absolute ${isDragging ? 'pointer-events-none' : 'cursor-move'}`}
                style={{
                  left: `${position.left}%`,
                  top: `${position.top}%`,
                  transform: `translate(-50%, -50%)`,
                  width: `${scale * 100}%`,
                  zIndex: 20,
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
                onMouseDown={startDrag}
              >
                <img 
                  src={editingFrame.image.url} 
                  alt="Guide" 
                  className="pointer-events-none w-full h-full object-contain"
                  draggable="false"
                />
              </div>
            )}
          </div>
        </div>

        {/* 右侧：帧配置和列表 */}
        <div>
          {/* 简化的操作区域 */}
          {!showFrameSelector && !showFrameEditor && !isEditing && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={createNewPauseFrame}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <svg
                    className="h-4 w-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Create New Frame
                </button>
              
                {formData.pauseFrames.length > 0 && (
                  <button
                    onClick={showCopyFrameSelector}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <svg
                      className="h-4 w-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy Frame
                  </button>
                )}
              </div>
              
              <p className="text-xs text-gray-600 mt-2 text-center">
                {formData.pauseFrames.length === 0 
                  ? "Click 'Create New Frame' to add your first pause frame"
                  : "Create a new frame or copy settings from an existing frame"
                }
              </p>
            </div>
          )}

          {/* 帧选择器 - 只在需要时显示 */}
          {showFrameSelector && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-800 mb-3">
                Select Frame to Copy
              </h4>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {formData.pauseFrames.map((frame: PauseFrame, index: number) => (
                  <button
                    key={frame.id}
                    onClick={() => copySpecifiedFrame(frame)}
                    className="w-full flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center">
                      <img
                        src={frame.image.url}
                        alt="Frame preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="ml-3 flex-grow min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        Frame #{index + 1} ({frame.time.toFixed(1)}s)
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        Position: {frame.position.left.toFixed(0)}% left, {frame.position.top.toFixed(0)}% top • Scale: {frame.scale ? `${frame.scale.toFixed(1)}x` : '1.0x'}
                      </p>
                    </div>
                    <svg
                      className="h-4 w-4 text-gray-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                ))}
              </div>
              
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setShowFrameSelector(false)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* 图片上传和帧配置区域 - 只在需要时显示 */}
          {showFrameEditor && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-800">
                  {isEditing ? "Edit Pause Frame" : "Create Pause Frame"}
                </h4>
                <button
                  onClick={() => {
                    setShowFrameEditor(false);
                    setCurrentFrame(null);
                    setIsEditing(false);
                    setEditingFrame(null);
                    setError(null);
                  }}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>

              {/* 帧预览 */}
              {(currentFrame || (isEditing && editingFrame)) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-800 mb-3">Frame Preview</h5>
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 flex-shrink-0 rounded overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center">
                      <img
                        src={(currentFrame || editingFrame)?.image.url}
                        alt="Frame preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-grow">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500">Time:</p>
                          <p className="font-medium">{pauseTime.toFixed(1)}s</p>
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
                          <p className="font-medium text-green-600">
                            {isEditing ? "Editing" : "Ready to add"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 配置选项 */}
              <div className="space-y-4">
                {/* 图片上传区域 */}
                {!currentFrame && !editingFrame && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frame Image
                    </label>
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                        isDragActive
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300 hover:border-blue-400"
                      } ${uploading ? "opacity-75" : ""}`}
                    >
                      <input {...getInputProps()} />
                      <div className="space-y-2">
                        <svg
                          className="mx-auto h-8 w-8 text-gray-400"
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
                          <p className="text-gray-700">Uploading image...</p>
                        ) : (
                          <p className="text-gray-700">
                            {isDragActive
                              ? "Drop the image here"
                              : "Drag and drop your guide image here, or click to select"}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Supported formats: PNG, JPG, GIF, WebP
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 时间控制 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pause Time (seconds)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={formData.video.metadata?.duration || 30}
                    step="0.1"
                    value={pauseTime}
                    onChange={handleTimeChange}
                    onInput={(e) => {
                      // 实时更新视频位置
                      if (videoRef.current) {
                        const newTime = parseFloat((e.target as HTMLInputElement).value);
                        videoRef.current.currentTime = newTime;
                      }
                    }}
                    onMouseUp={handleTimeChangeEnd}
                    onTouchEnd={handleTimeChangeEnd}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0s</span>
                    <span className="font-medium">{pauseTime.toFixed(1)}s</span>
                    <span>{(formData.video.metadata?.duration || 30).toFixed(1)}s</span>
                  </div>
                </div>

                {/* 位置控制 - Guide Image */}
                {(currentFrame || editingFrame) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Guide Image Position & Size
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
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
                        <label className="block text-xs font-medium text-gray-700 mb-1">
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
                    
                    {/* 缩放控制 */}
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Guide Image Width (% of screen)
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="1"
                        value={scale * 100}
                        onChange={handleScaleChange}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>10%</span>
                        <span className="font-medium">{Math.round(scale * 100)}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mt-2">
                      <p className="text-xs text-blue-700 flex items-center">
                        <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        You can position the guide image by dragging it directly on the video preview.
                      </p>
                    </div>
                  </div>
                )}

                {/* 可选的Button Image组件 */}
                {(currentFrame || editingFrame) && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Button Image (Optional)
                      </label>
                      <div className="text-xs text-blue-600">Continues playback on click</div>
                    </div>
                    
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-xs text-gray-600">
                        Add a button image to continue the playback flow. When users click on this button during the pause frame, the video will resume playing.
                        {!currentFrame?.buttonImage && !editingFrame?.buttonImage && (
                          <span className="block mt-1 text-gray-500 italic">
                            If no button image is provided, a default "click_area.png" will be used.
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* 显示已上传的按钮图片或上传区域 */}
                    {(currentFrame?.buttonImage || (isEditing && editingFrame?.buttonImage)) ? (
                      <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
                        <div className="flex items-center space-x-3">
                          <div className="h-12 w-12 flex-shrink-0 rounded overflow-hidden bg-gray-100 border border-gray-300 flex items-center justify-center">
                            <img
                              src={(currentFrame?.buttonImage || editingFrame?.buttonImage)?.url}
                              alt="Button"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Button Image</p>
                            <p className="text-xs text-gray-500">Custom button uploaded</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (isEditing && editingFrame) {
                              // 移除编辑帧中的按钮图片
                              const { buttonImage, buttonPosition, buttonScale, ...rest } = editingFrame;
                              setEditingFrame(rest as PauseFrame);
                            } else if (currentFrame) {
                              // 移除当前帧中的按钮图片
                              const { buttonImage, buttonPosition, buttonScale, ...rest } = currentFrame;
                              setCurrentFrame(rest as PauseFrame);
                            }
                          }}
                          className="px-3 py-1 text-xs text-red-600 hover:text-red-800 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div 
                        {...getButtonRootProps()}
                        className={`border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors ${
                          isButtonDragActive ? 'bg-blue-50 border-blue-400' : ''
                        } ${buttonUploading ? 'opacity-70' : ''}`}
                      >
                        <input {...getButtonInputProps()} />
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
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        {buttonUploading ? (
                          <p className="text-sm text-gray-600 mt-1">Uploading...</p>
                        ) : (
                          <p className="text-sm text-gray-600 mt-1">
                            {isButtonDragActive 
                              ? "Drop the button image here" 
                              : "Click to upload a button image"}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Recommended: "Continue", "Play", or "Next" styled buttons
                        </p>
                      </div>
                    )}
                    
                    {/* 添加按钮位置和缩放控制 */}
                    {(currentFrame?.buttonImage || (isEditing && editingFrame?.buttonImage)) && (
                      <div className="mt-4 space-y-4">
                        <h5 className="text-sm font-medium text-gray-700">Button Position & Size</h5>
                        
                        {/* 按钮位置控制 */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Left Position (%)
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={buttonPosition.left}
                              onChange={(e) => handleButtonPositionChange(e, "left")}
                              className="w-full"
                            />
                            <div className="text-center text-xs text-gray-500 mt-1">
                              {buttonPosition.left.toFixed(0)}%
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Top Position (%)
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={buttonPosition.top}
                              onChange={(e) => handleButtonPositionChange(e, "top")}
                              className="w-full"
                            />
                            <div className="text-center text-xs text-gray-500 mt-1">
                              {buttonPosition.top.toFixed(0)}%
                            </div>
                          </div>
                        </div>
                        
                        {/* 按钮缩放控制 */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Button Width (% of screen)
                          </label>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            step="1"
                            value={buttonScale * 100}
                            onChange={handleButtonScaleChange}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>10%</span>
                            <span className="font-medium">{Math.round(buttonScale * 100)}%</span>
                            <span>100%</span>
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                          <p className="text-xs text-blue-700 flex items-center">
                            <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            You can also position the button by clicking and dragging it directly on the video preview.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-md text-center text-sm">
                  {error}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="mt-6">
                {isEditing ? (
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
                    onClick={addPauseFrame}
                    disabled={!currentFrame || uploading}
                    className={`w-full py-3 rounded-lg font-medium ${
                      !currentFrame || uploading
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {!currentFrame ? "Upload Image First" : "Add Pause Frame"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 已添加的帧列表 - 始终显示，不再受showFrameEditor条件影响 */}
          {formData.pauseFrames.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-800">Your Pause Frames ({formData.pauseFrames.length})</h4>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {formData.pauseFrames.map((frame: PauseFrame, index: number) => (
                  <div
                    key={frame.id}
                    className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                  >
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                      <div className="font-medium text-gray-700">
                        Frame #{index + 1} <span className="text-sm font-normal text-gray-500">({frame.time.toFixed(1)}s)</span>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => editPauseFrame(frame)}
                          className="p-1 text-blue-500 hover:text-blue-700"
                          title="Edit frame"
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
                        <button
                          onClick={() => removePauseFrame(frame.id)}
                          className="p-1 text-red-500 hover:text-red-700"
                          title="Delete frame"
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
                    <div className="p-3 flex items-start">
                      <div className="flex space-x-2">
                        <div className="h-12 w-12 flex-shrink-0 rounded overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center">
                          <img
                            src={frame.image.url}
                            alt="Guide"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        {frame.buttonImage && (
                          <div className="h-12 w-12 flex-shrink-0 rounded overflow-hidden bg-gray-100 border border-gray-300 flex items-center justify-center relative">
                            <img
                              src={frame.buttonImage.url}
                              alt="Button"
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute bottom-0 right-0 bg-blue-500 text-white text-xs px-1 rounded-tl">BTN</div>
                          </div>
                        )}
                      </div>
                      <div className="ml-3 flex-grow min-w-0">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-gray-500">Position:</p>
                            <p className="font-medium truncate">{frame.position.left.toFixed(0)}% left, {frame.position.top.toFixed(0)}% top</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Scale:</p>
                            <p className="font-medium">{frame.scale ? `${frame.scale.toFixed(1)}x` : '1.0x'}</p>
                          </div>
                          {frame.buttonImage && (
                            <div className="col-span-2">
                              <p className="text-gray-500">Button:</p>
                              <p className="font-medium text-xs truncate">
                                Pos: {frame.buttonPosition?.left.toFixed(0)}% L, {frame.buttonPosition?.top.toFixed(0)}% T • 
                                Scale: {frame.buttonScale ? `${frame.buttonScale.toFixed(1)}x` : '0.2x'}
                              </p>
                            </div>
                          )}
                        </div>
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
          disabled={formData.pauseFrames.length === 0}
          className={`px-6 py-2 rounded-md font-medium ${
            formData.pauseFrames.length === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          Continue
        </button>
      </div>

      {/* 确认弹框 */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Unsaved Changes
            </h3>
            <p className="text-gray-600 mb-6">
              You have an unsaved pause frame. Would you like to save it first?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  if (confirmAction) {
                    confirmAction();
                  }
                  setShowConfirmDialog(false);
                  setConfirmAction(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save & Continue
              </button>
              <button
                onClick={() => {
                  setCurrentFrame(null);
                  setShowConfirmDialog(false);
                  setConfirmAction(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PauseFrames; 