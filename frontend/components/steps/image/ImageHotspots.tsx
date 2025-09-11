"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "@/app/i18n/LanguageContext";
import { API_PATHS, getFullUrl } from "@/config/api";
import { useDropzone } from "react-dropzone";

interface PopupImage {
  id: string;
  url: string;
  name: string;
}

interface PopupContent {
  title: string;
  images: PopupImage[];
}

interface Hotspot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  title: string;
  action: string;
  url: string;
  popupContent?: PopupContent;
  hotspotImage?: {
    id: string;
    url: string;
    name: string;
    x: number;
    y: number;
    scale: number;
  };
  useDefaultSvg?: boolean;
  isSaved?: boolean;
}

interface ImageHotspotsProps {
  formData: Record<string, any>;
  updateFormData: (field: string, value: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const ImageHotspots: React.FC<ImageHotspotsProps> = ({
  formData,
  updateFormData,
  nextStep,
  prevStep,
}) => {
  const { t } = useLanguage();
  const [hotspots, setHotspots] = useState<Hotspot[]>(formData.hotspots || []);
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [hotspotTitle, setHotspotTitle] = useState("");
  const [hotspotCounter, setHotspotCounter] = useState(1);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showPopup, setShowPopup] = useState<Hotspot | null>(null);
  const [isLandscape, setIsLandscape] = useState(false); // Add landscape mode state

  // Removed audio-related code

  // Initialize with existing hotspots if available
  useEffect(() => {
    if (!isInitialized && formData.hotspots && formData.hotspots.length > 0) {
      setHotspots(formData.hotspots);
      
      // Find the maximum hotspot number to ensure incrementing numbers
      let maxNumber = 0;
      formData.hotspots.forEach((h: Hotspot) => {
        if (h.title && h.title.startsWith('Hotspot ')) {
          const match = h.title.match(/Hotspot (\d+)/);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });
      
      setHotspotCounter(maxNumber + 1);
      setIsInitialized(true);
    }
  }, [formData.hotspots, isInitialized]);

  // Update image size when it loads
  useEffect(() => {
    if (imageRef.current) {
      const updateImageSize = () => {
        if (imageRef.current) {
          const { naturalWidth, naturalHeight, width, height } = imageRef.current;
          setImageSize({ width: naturalWidth, height: naturalHeight });
          setScale(width / naturalWidth);
        }
      };

      updateImageSize();
      window.addEventListener("resize", updateImageSize);
      return () => window.removeEventListener("resize", updateImageSize);
    }
  }, []);

  // Add a new hotspot button
  const addNewHotspot = () => {
    const newId = `hotspot-${Date.now()}`;
    const newHotspot = {
      id: newId,
      x: 40,
      y: 40,
      width: 20,
      height: 20,
      label: "",
      title: `Hotspot ${hotspotCounter}`,
      action: "url",
      url: "",
      popupContent: {
        title: "",
        images: []
      },
      useDefaultSvg: true, // Default to using the SVG
      isSaved: false
    };

    setHotspots(prev => [...prev, newHotspot]);
    setSelectedHotspot(newId);
    setIsEditing(true);
    setHotspotTitle(`Hotspot ${hotspotCounter}`);
    setHotspotCounter(prev => prev + 1);
  };

  // Get selected hotspot
  const getSelectedHotspot = () => {
    return hotspots.find(h => h.id === selectedHotspot);
  };

  // Update hotspot
  const updateHotspot = useCallback((hotspotId: string, updates: Partial<Hotspot>) => {
    setHotspots(prev => prev.map(h => 
      h.id === hotspotId ? { ...h, ...updates } : h
    ));
  }, []);

  // 改进的URL验证函数
  const isValidUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      // 检查协议是否为 http 或 https
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return false;
      }
      // 检查是否有有效的域名
      if (!urlObj.hostname || urlObj.hostname.length === 0) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  // Save hotspot
  const saveHotspot = () => {
    if (!selectedHotspot) return;

    const currentHotspot = getSelectedHotspot();
    
    // 清除错误
    setUrlError(null);
    setTitleError(null);

    // 验证标题是否唯一
    const title = hotspotTitle || `Hotspot ${hotspotCounter - 1}`;
    const isDuplicateTitle = hotspots.some(h => 
      h.id !== selectedHotspot && 
      h.title?.toLowerCase() === title.toLowerCase()
    );

    if (isDuplicateTitle) {
      setTitleError("Hotspot title must be unique");
      return;
    }
    
    // 验证URL是否填写和格式是否正确
    if (currentHotspot?.action === "url") {
      if (!currentHotspot.url.trim()) {
        setUrlError("URL is required when action type is URL");
        return;
      }
      if (!isValidUrl(currentHotspot.url)) {
        setUrlError("Please enter a valid URL (e.g., https://example.com)");
        return;
      }
    }

    const updates: Partial<Hotspot> = {
      isSaved: true,
      title: title
    };

    updateHotspot(selectedHotspot, updates);
    setSelectedHotspot(null);
    setIsEditing(false);
    setHotspotTitle("");
    setError(null);
  };

  // Delete hotspot
  const deleteHotspot = (hotspotId: string) => {
    setHotspots(prev => prev.filter(h => h.id !== hotspotId));
    if (selectedHotspot === hotspotId) {
      setSelectedHotspot(null);
      setIsEditing(false);
    }
  };

  // Edit hotspot
  const editHotspot = (hotspotId: string) => {
    const hotspot = hotspots.find(h => h.id === hotspotId);
    if (hotspot) {
      setSelectedHotspot(hotspotId);
      setIsEditing(true);
      setHotspotTitle(hotspot.title || "");
    }
  };

  // Hotspot image upload
  const onHotspotImageDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !selectedHotspot) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setError(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("type", "image");
      uploadFormData.append("step", "image_upload");

      const response = await fetch(API_PATHS.upload, {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const data = await response.json();

      const hotspotImage = {
        id: `hotspot-image-${Date.now()}`,
        url: getFullUrl(data.url),
        name: file.name,
        x: 40,
        y: 40,
        scale: 60
      };

      updateHotspot(selectedHotspot, { hotspotImage });
    } catch (error) {
      console.error("Error uploading hotspot image:", error);
      setError(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps: getHotspotImageRootProps, getInputProps: getHotspotImageInputProps, isDragActive: isHotspotImageDragActive } = useDropzone({
    onDrop: onHotspotImageDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]
    },
    multiple: false,
    disabled: uploading
  });

  // Popup image upload
  const onPopupImageDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !selectedHotspot) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setError(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("type", "image");
      uploadFormData.append("step", "image_upload");

      const response = await fetch(API_PATHS.upload, {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const data = await response.json();

      const popupImage = {
        id: `popup-image-${Date.now()}`,
        url: getFullUrl(data.url),
        name: file.name
      };

      const currentHotspot = getSelectedHotspot();
      if (currentHotspot) {
        const updatedPopupContent: PopupContent = {
          title: currentHotspot.popupContent?.title || "",
          images: [...(currentHotspot.popupContent?.images || []), popupImage]
        };
        updateHotspot(selectedHotspot, { popupContent: updatedPopupContent });
      }
    } catch (error) {
      console.error("Error uploading popup image:", error);
      setError(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps: getPopupImageRootProps, getInputProps: getPopupImageInputProps, isDragActive: isPopupImageDragActive } = useDropzone({
    onDrop: onPopupImageDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]
    },
    multiple: true,
    disabled: uploading
  });

  // Audio upload functions removed

  // Update popup title
  const updatePopupTitle = (title: string) => {
    if (!selectedHotspot) return;
    const currentHotspot = getSelectedHotspot();
    if (currentHotspot) {
      const updatedPopupContent: PopupContent = {
        title,
        images: currentHotspot.popupContent?.images || []
      };
      updateHotspot(selectedHotspot, { popupContent: updatedPopupContent });
    }
  };

  // Remove popup image
  const removePopupImage = (imageId: string) => {
    if (!selectedHotspot) return;
    const currentHotspot = getSelectedHotspot();
    if (currentHotspot) {
      const updatedPopupContent: PopupContent = {
        title: currentHotspot.popupContent?.title || "",
        images: (currentHotspot.popupContent?.images || []).filter(img => img.id !== imageId)
      };
      updateHotspot(selectedHotspot, { popupContent: updatedPopupContent });
    }
  };

  // Audio-related functions removed

  // Handle hotspot click for all action types
  const handleHotspotClick = (hotspot: Hotspot) => {
    if (hotspot.action === 'popup' && hotspot.popupContent) {
      // 显示弹窗
      setShowPopup(hotspot);
    } else if (hotspot.action === 'url' && hotspot.url) {
      // 如果是URL操作，在新窗口打开URL
      if (hotspot.isSaved) {
        window.open(hotspot.url, '_blank');
      }
    }
  };

  // Handle hotspot image dragging
  const handleHotspotImageMouseDown = useCallback((e: React.MouseEvent, hotspotId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const hotspot = hotspots.find(h => h.id === hotspotId);
    if (!hotspot) return;
    
    // 仅在编辑模式下允许拖拽，否则直接处理点击事件
    if (isEditing && selectedHotspot === hotspotId) {
      // 编辑模式 - 设置拖拽
    } else if (hotspot.isSaved) {
      // 如果是已保存的热点，直接处理点击事件
      handleHotspotClick(hotspot);
      return;
    }
    
    // Store initial position for drag detection
    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;
    
    // Set up for potential drag operation
    const handleClickDetectionMove = (moveEvent: MouseEvent) => {
      // Check if the mouse has moved more than a few pixels (indicating a drag vs a click)
      if (Math.abs(moveEvent.clientX - startX) > 5 || Math.abs(moveEvent.clientY - startY) > 5) {
        hasMoved = true;
      }
    };
    
    // Handle mouse up to determine if this was a click or drag
    const handleClickDetectionUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleClickDetectionMove);
      document.removeEventListener('mouseup', handleClickDetectionUp);
      
      // If the mouse didn't move much, treat it as a click
      if (!hasMoved && !isEditing && hotspot.isSaved) {
        handleHotspotClick(hotspot);
      }
    };
    
    document.addEventListener('mousemove', handleClickDetectionMove);
    document.addEventListener('mouseup', handleClickDetectionUp);

    // Setup for dragging functionality
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const initialClientX = e.clientX;
    const initialClientY = e.clientY;
    
    // Get initial position based on whether we're using default SVG or custom image
    const initialX = hotspot.useDefaultSvg ? hotspot.x : (hotspot.hotspotImage?.x || 0);
    const initialY = hotspot.useDefaultSvg ? hotspot.y : (hotspot.hotspotImage?.y || 0);

    setIsDragging(true);
    setSelectedHotspot(hotspotId);

    const handleDragMove = (moveEvent: MouseEvent) => {
      if (!rect) return;

      const deltaX = moveEvent.clientX - initialClientX;
      const deltaY = moveEvent.clientY - initialClientY;

      const deltaPercentX = (deltaX / rect.width) * 100;
      const deltaPercentY = (deltaY / rect.height) * 100;

      const newX = Math.max(0, Math.min(100, initialX + deltaPercentX));
      const newY = Math.max(0, Math.min(100, initialY + deltaPercentY));

      setHotspots(prev => prev.map(h => 
        h.id === hotspotId ? 
          h.useDefaultSvg ? 
            {
              ...h,
              x: newX,
              y: newY
            } 
          : {
              ...h,
              hotspotImage: h.hotspotImage ? {
                ...h.hotspotImage,
                x: newX,
                y: newY
              } : undefined
            }
        : h
      ));
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  }, [hotspots, isEditing, selectedHotspot, handleHotspotClick]);

  // Update form data when hotspots change
  useEffect(() => {
    if (!isDragging) {
      const currentHotspots = formData.hotspots || [];
      if (JSON.stringify(currentHotspots) !== JSON.stringify(hotspots)) {
        updateFormData("hotspots", hotspots);
      }
    }
  }, [hotspots, formData.hotspots, updateFormData, isDragging]);

  // Add toggle landscape mode function
  const toggleLandscapeMode = () => {
    setIsLandscape(!isLandscape);
  };

  // First, let's add a default SVG hotspot component
const DefaultHotspotSvg = () => (
  <svg 
    className="w-full h-full text-white animate-pulse-scale" 
    viewBox="0 0 1448 1024" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0px 0px 3px rgba(0, 0, 0, 0.5))' }}
  >
    <path 
      d="M954.678313 549.757097l-211.405341-125.742315c-7.740635-4.644381-12.729044-1.032085-11.008903 7.740635l44.895682 243.227953c1.720141 8.944734 7.224593 10.148833 12.385016 2.752225 0 0 28.726356-41.111372 52.29229-66.225432l45.239711 67.257517c4.300353 6.364522 13.073072 8.084663 19.26558 3.784311l15.137242-10.492861c6.364522-4.300353 7.912649-13.245087 3.612296-19.609609l-45.239711-67.257517c30.274483-12.55703 72.933983-23.049891 72.933983-23.049891 8.77272-2.236183 9.63279-7.740635 1.892155-12.385016z m-246.668234 79.642533c-0.860071-0.344028-1.720141-0.516042-2.580212-0.516042-72.933983-17.029397-125.742315-84.1149-124.882244-161.349236 1.032085-90.307408 74.310096-162.897363 163.241391-162.037292 84.286914 1.032085 152.920544 67.601545 159.285066 151.200403v0.172015c0 0.860071 0 1.720141 0.172014 2.408197 0.860071 5.332437 4.644381 9.63279 9.460776 11.180917 0.860071 0.172014 1.720141 0.344028 2.408198 0.516043h2.580212c7.224593-0.516042 12.901058-6.536536 13.073072-13.933143v-0.172014c0-0.688056 0-1.204099-0.172014-1.892156-1.376113-20.297665-6.020494-39.907274-13.589115-58.656811-9.288762-23.049891-22.705863-43.691584-39.907273-61.409038-17.201411-17.889467-37.327062-31.82261-59.688897-41.799429-23.221905-10.320847-47.991937-15.653284-73.450025-15.997312-25.630102-0.344028-50.400134 4.472367-73.794053 14.277171-22.705863 9.460776-43.003528 23.049891-60.548967 40.423316-17.545439 17.373425-31.478582 37.843104-41.283387 60.548967-10.148833 23.565933-15.48127 48.679993-15.653284 74.654124-0.516042 46.959852 15.997312 92.543591 46.271796 127.978498 26.490173 30.790526 61.581052 52.29229 100.45624 61.409038 0.860071 0.344028 1.720141 0.516042 2.580212 0.516042 0.516042 0 1.032085 0.172014 1.548127 0.172014 7.740635 0.172014 14.105157-6.192508 14.105157-13.933143 0-6.536536-3.956325-11.868974-9.63279-13.761129z" 
      fill="currentColor"
    />
  </svg>
);

  // Now let's modify the interface to include useDefaultSvg flag
  interface Hotspot {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    title: string;
    action: string;
    url: string;
    popupContent?: PopupContent;
    hotspotImage?: {
      id: string;
      url: string;
      name: string;
      x: number;
      y: number;
      scale: number;
    };
    useDefaultSvg?: boolean;
    isSaved?: boolean;
    scale?: number; // For default SVG scale
  }

  return (
    <div className="space-y-6">
      {/* Removed global popup - it will be displayed in the image preview */}
      
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">{t('addHotspots')}</h2>
        <p className="text-gray-600">Add interactive hotspots to your image</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left side: Image preview (5 columns) */}
        <div className="md:col-span-5">
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
                ? "aspect-video" 
                : "aspect-[9/16] max-w-[400px] mx-auto"
            }`}
          >
            {formData.image?.url ? (
              <>
                <img
                  ref={imageRef}
                  src={formData.image.url}
                  alt="Uploaded image"
                  className="w-full h-full object-contain"
                />
                {/* Popup overlay within the image container */}
                {showPopup && (
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="bg-white rounded-lg shadow-xl p-3 m-2 max-w-[80%] max-h-[80%] overflow-y-auto border border-gray-200 relative">
                      <button 
                        onClick={() => setShowPopup(null)}
                        className="absolute right-2 top-2 bg-white rounded-full p-1 shadow-sm text-gray-500 hover:text-gray-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                      
                      {showPopup.popupContent?.title && (
                        <h3 className="text-base font-semibold mb-3 pr-6 text-center">{showPopup.popupContent.title}</h3>
                      )}
                      
                                              <div className="space-y-2">
                          {showPopup.popupContent?.images && showPopup.popupContent.images.length > 0 ? (
                            showPopup.popupContent.images.map((image) => (
                              <div key={image.id} className="bg-gray-50 rounded-lg overflow-hidden flex justify-center">
                                <img 
                                  src={image.url} 
                                  alt="" 
                                  className="max-w-full max-h-40 object-contain"
                                  style={{ maxWidth: '100%' }}
                                />
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 italic text-sm text-center">No images in this popup</p>
                          )}
                        </div>
                    </div>
                  </div>
                )}
                {hotspots
                  .filter(hotspot => hotspot.hotspotImage || hotspot.useDefaultSvg)
                  .map((hotspot) => (
                    <div
                      key={hotspot.id}
                      className={`absolute cursor-move select-none ${isDragging && selectedHotspot === hotspot.id ? 'z-10' : ''}`}
                      style={{
                        left: `${hotspot.useDefaultSvg ? hotspot.x : (hotspot.hotspotImage?.x || hotspot.x)}%`,
                        top: `${hotspot.useDefaultSvg ? hotspot.y : (hotspot.hotspotImage?.y || hotspot.y)}%`,
                        width: `${hotspot.useDefaultSvg ? (hotspot.scale || 60) : (hotspot.hotspotImage?.scale || 60)}px`,
                        height: `${hotspot.useDefaultSvg ? (hotspot.scale || 60) : (hotspot.hotspotImage?.scale || 60)}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      onMouseDown={(e) => handleHotspotImageMouseDown(e, hotspot.id)}
                    >
                      {hotspot.useDefaultSvg ? (
                        <div 
                          className="w-full h-full overflow-hidden animate-pulse-scale"
                        >
                          <DefaultHotspotSvg />
                        </div>
                      ) : (
                        <img
                          src={hotspot.hotspotImage!.url}
                          alt={hotspot.hotspotImage!.name}
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

        {/* Right side: Hotspot properties (7 columns) */}
        <div className="md:col-span-7">
          <div className="flex justify-end mb-4">
            <button
              onClick={addNewHotspot}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Add Hotspot
            </button>
          </div>
          
          {selectedHotspot && (
            <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
              <h3 className="text-lg font-medium mb-4">{getSelectedHotspot()?.isSaved ? "Edit Hotspot" : "New Hotspot"}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hotspot Title
                  </label>
                  <input
                    type="text"
                    value={hotspotTitle}
                    onChange={(e) => setHotspotTitle(e.target.value)}
                    placeholder="Enter hotspot title"
                    className={`w-full px-3 py-2 border ${titleError ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {titleError && (
                    <p className="text-red-500 text-sm mt-1">{titleError}</p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hotspot Style
                  </label>
                  
                  <div className="flex space-x-4 mb-3">
                    <button
                      onClick={() => updateHotspot(selectedHotspot, { useDefaultSvg: true, hotspotImage: undefined })}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        getSelectedHotspot()?.useDefaultSvg
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Default Icon
                    </button>
                    <button
                      onClick={() => updateHotspot(selectedHotspot, { useDefaultSvg: false })}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        !getSelectedHotspot()?.useDefaultSvg
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Custom Image
                    </button>
                  </div>
                  
                  {!getSelectedHotspot()?.useDefaultSvg && !getSelectedHotspot()?.hotspotImage && (
                    <div
                      {...getHotspotImageRootProps()}
                      className={`border-2 border-dashed rounded-lg p-4 mb-3 text-center cursor-pointer transition-colors ${
                        isHotspotImageDragActive
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300 hover:border-blue-400"
                      } ${uploading ? "opacity-50" : ""}`}
                    >
                      <input {...getHotspotImageInputProps()} />
                      {uploading ? (
                        <p className="text-sm text-gray-600">Uploading...</p>
                      ) : (
                        <>
                          <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                          </svg>
                          <p className="text-sm text-gray-600">
                            Drop hotspot image here or click to upload
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {getSelectedHotspot()?.useDefaultSvg && (
                                          <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-center mb-2">
                        <div className="w-16 h-16 overflow-hidden">
                          <DefaultHotspotSvg />
                        </div>
                      </div>
                      <p className="text-sm text-center text-gray-600">Default hotspot icon with animation</p>
                    </div>
                  )}

                  {!getSelectedHotspot()?.useDefaultSvg && getSelectedHotspot()?.hotspotImage && (
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden mr-2">
                          <img src={getSelectedHotspot()?.hotspotImage?.url} alt={getSelectedHotspot()?.hotspotImage?.name} className="w-full h-full object-cover animate-pulse-scale" />
                        </div>
                        <span className="text-sm truncate max-w-[200px]" title={getSelectedHotspot()?.hotspotImage?.name}>
                          {getSelectedHotspot()?.hotspotImage?.name}
                        </span>
                      </div>
                      <button
                        onClick={() => updateHotspot(selectedHotspot, { hotspotImage: undefined })}
                        className="text-red-500 hover:text-red-700"
                        title="Remove hotspot image"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      X Position (%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={getSelectedHotspot()?.useDefaultSvg ? (getSelectedHotspot()?.x || 40) : (getSelectedHotspot()?.hotspotImage?.x || 40)}
                      onChange={(e) => {
                        const currentHotspot = getSelectedHotspot();
                        const newX = parseInt(e.target.value);
                        if (currentHotspot?.useDefaultSvg) {
                          updateHotspot(selectedHotspot, {
                            x: newX
                          });
                        } else if (currentHotspot?.hotspotImage) {
                          updateHotspot(selectedHotspot, {
                            hotspotImage: {
                              ...currentHotspot.hotspotImage,
                              x: newX
                            }
                          });
                        }
                      }}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {getSelectedHotspot()?.useDefaultSvg ? (getSelectedHotspot()?.x || 40) : (getSelectedHotspot()?.hotspotImage?.x || 40)}%
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Y Position (%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={getSelectedHotspot()?.useDefaultSvg ? (getSelectedHotspot()?.y || 40) : (getSelectedHotspot()?.hotspotImage?.y || 40)}
                      onChange={(e) => {
                        const currentHotspot = getSelectedHotspot();
                        const newY = parseInt(e.target.value);
                        if (currentHotspot?.useDefaultSvg) {
                          updateHotspot(selectedHotspot, {
                            y: newY
                          });
                        } else if (currentHotspot?.hotspotImage) {
                          updateHotspot(selectedHotspot, {
                            hotspotImage: {
                              ...currentHotspot.hotspotImage,
                              y: newY
                            }
                          });
                        }
                      }}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {getSelectedHotspot()?.useDefaultSvg ? (getSelectedHotspot()?.y || 40) : (getSelectedHotspot()?.hotspotImage?.y || 40)}%
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scale (%)
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={getSelectedHotspot()?.useDefaultSvg ? 60 : (getSelectedHotspot()?.hotspotImage?.scale || 60)}
                    onChange={(e) => {
                      const currentHotspot = getSelectedHotspot();
                      const newScale = parseInt(e.target.value);
                      if (currentHotspot?.useDefaultSvg) {
                        // For default SVG, we only update the scale visually
                        // We can store it in a separate field if needed
                        updateHotspot(selectedHotspot, {
                          scale: newScale
                        });
                      } else if (currentHotspot?.hotspotImage) {
                        updateHotspot(selectedHotspot, {
                          hotspotImage: {
                            ...currentHotspot.hotspotImage,
                            scale: newScale
                          }
                        });
                      }
                    }}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {getSelectedHotspot()?.useDefaultSvg ? (getSelectedHotspot()?.scale || 60) : (getSelectedHotspot()?.hotspotImage?.scale || 60)}%
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action Type
                  </label>
                  <select
                    value={getSelectedHotspot()?.action || "url"}
                    onChange={(e) => updateHotspot(selectedHotspot, { action: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="url">URL</option>
                    <option value="popup">Popup</option>
                  </select>
                </div>

                {getSelectedHotspot()?.action === "url" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={getSelectedHotspot()?.url || ""}
                      onChange={(e) => {
                        updateHotspot(selectedHotspot, { url: e.target.value });
                        setUrlError(null);
                      }}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {urlError && (
                      <p className="text-red-500 text-sm mt-1">{urlError}</p>
                    )}
                  </div>
                )}

                {getSelectedHotspot()?.action === "popup" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Popup Title
                      </label>
                      <input
                        type="text"
                        value={getSelectedHotspot()?.popupContent?.title || ""}
                        onChange={(e) => updatePopupTitle(e.target.value)}
                        placeholder="Enter popup title"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Popup Images
                      </label>
                      <div
                        {...getPopupImageRootProps()}
                        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                          isPopupImageDragActive
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-300 hover:border-blue-400"
                        } ${uploading ? "opacity-50" : ""}`}
                      >
                        <input {...getPopupImageInputProps()} />
                        {uploading ? (
                          <p className="text-sm text-gray-600">Uploading...</p>
                        ) : (
                          <>
                            <svg className="w-6 h-6 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                            <p className="text-sm text-gray-600">
                              Drop images here or click to upload
                            </p>
                          </>
                        )}
                      </div>

                      <div className="mt-2 space-y-2">
                        {(getSelectedHotspot()?.popupContent?.images || []).map((image) => (
                          <div key={image.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div className="flex items-center overflow-hidden">
                              <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden mr-2 flex-shrink-0">
                                <img src={image.url} alt={image.name} className="w-full h-full object-contain" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-sm block truncate" title={image.name}>{image.name}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => removePopupImage(image.id)}
                              className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Audio selection section removed */}

                <div className="pt-4 flex space-x-2">
                  <button
                    onClick={saveHotspot}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Save Hotspot
                  </button>
                  <button
                    onClick={() => {
                      setSelectedHotspot(null);
                      setIsEditing(false);
                      setError(null);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {hotspots.filter(h => h.isSaved).length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Saved Hotspots</h3>
              <div className="space-y-3">
                {hotspots
                  .filter(h => h.isSaved)
                  .map((hotspot) => (
                    <div key={hotspot.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {hotspot.useDefaultSvg ? (
                            <div className="w-10 h-10 overflow-hidden">
                              <DefaultHotspotSvg />
                            </div>
                          ) : hotspot.hotspotImage && (
                            <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden">
                              <img src={hotspot.hotspotImage.url} alt={hotspot.hotspotImage.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{hotspot.title || `Hotspot ${hotspot.id}`}</div>
                            <div className="text-sm text-gray-500">
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                <span>Left: {Math.round(hotspot.useDefaultSvg ? hotspot.x : (hotspot.hotspotImage?.x || 0))}%</span>
                                <span>Top: {Math.round(hotspot.useDefaultSvg ? hotspot.y : (hotspot.hotspotImage?.y || 0))}%</span>
                                <span>Scale: {Math.round(hotspot.useDefaultSvg ? (hotspot.scale || 60) : (hotspot.hotspotImage?.scale || 60))}%</span>
                                <span>{hotspot.action === 'url' ? `URL: ${hotspot.url}` : `Popup: ${hotspot.popupContent?.title || 'Untitled'}`}</span>
                              </div>
                            </div>
                            
                                                          {/* Show popup images if action is popup and there are images */}
                            {hotspot.action === 'popup' && hotspot.popupContent?.images && hotspot.popupContent.images.length > 0 && (
                              <div className="mt-2 flex space-x-2 overflow-hidden pb-1 max-w-full">
                                {hotspot.popupContent.images.slice(0, 5).map((image) => (
                                  <div key={image.id} className="w-10 h-10 flex-shrink-0 bg-gray-200 rounded overflow-hidden">
                                    <img src={image.url} alt="" className="w-full h-full object-cover" />
                                  </div>
                                ))}
                                {hotspot.popupContent.images.length > 5 && (
                                  <div className="w-10 h-10 flex-shrink-0 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-xs">
                                    +{hotspot.popupContent.images.length - 5}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => editHotspot(hotspot.id)}
                            className="text-blue-500 hover:text-blue-700"
                            title="Edit hotspot"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteHotspot(hotspot.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Delete hotspot"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
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
          onClick={nextStep}
          className="px-6 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
        >
          {hotspots.filter(h => h.isSaved).length === 0 ? "Skip & Continue" : "Continue"}
        </button>
      </div>
    </div>
  );
};

export default ImageHotspots;
