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
  isSaved?: boolean;
}

interface ImageHotspotsProps {
  formData: Record<string, any>;
  updateFormData: (field: string, value: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

// 系统音频选项
const SYSTEM_AUDIO_OPTIONS = [
  { id: 'upbeat-1', name: 'Upbeat Energy', category: 'Energetic', duration: '0:30' },
  { id: 'ambient-1', name: 'Ambient Flow', category: 'Ambient', duration: '0:45' },
  { id: 'corporate-1', name: 'Corporate Professional', category: 'Corporate', duration: '0:30' },
  { id: 'tech-1', name: 'Tech Innovation', category: 'Technology', duration: '0:40' },
  { id: 'nature-1', name: 'Nature Sounds', category: 'Nature', duration: '1:00' },
  { id: 'classical-1', name: 'Classical Elegance', category: 'Classical', duration: '0:50' }
];

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
  const [selectedAudio, setSelectedAudio] = useState<any>(formData.audio || null);
  const [audioType, setAudioType] = useState<'upload' | 'system'>('system');

  // Initialize with existing hotspots if available
  useEffect(() => {
    if (formData.hotspots && formData.hotspots.length > 0) {
      setHotspots(formData.hotspots);
      const savedCount = formData.hotspots.filter((h: Hotspot) => h.isSaved).length;
      setHotspotCounter(savedCount + 1);
    }
  }, [formData.hotspots]);

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
  const updateHotspot = (hotspotId: string, updates: Partial<Hotspot>) => {
    setHotspots(prev => prev.map(h => 
      h.id === hotspotId ? { ...h, ...updates } : h
    ));
  };

  // URL validation function
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Save hotspot
  const saveHotspot = () => {
    if (!selectedHotspot) return;

    const currentHotspot = getSelectedHotspot();
    
    // 验证URL是否填写和格式是否正确
    if (currentHotspot?.action === "url") {
      if (!currentHotspot.url.trim()) {
        setError("URL is required when action type is URL");
        return;
      }
      if (!isValidUrl(currentHotspot.url)) {
        setError("Please enter a valid URL (e.g., https://example.com)");
        return;
      }
    }

    const updates: Partial<Hotspot> = {
      isSaved: true,
      title: hotspotTitle || `Hotspot ${hotspotCounter - 1}`
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

  // Audio upload
  const onAudioDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setError(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("type", "audio");
      uploadFormData.append("step", "audio_upload");

      const response = await fetch(API_PATHS.upload, {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const data = await response.json();

      const audioData = {
        type: 'uploaded',
        file: file,
        url: getFullUrl(data.url),
        name: file.name,
        duration: data.metadata?.duration || 0,
      };

      setSelectedAudio(audioData);
      updateFormData("audio", audioData);

    } catch (error) {
      console.error("Error uploading audio:", error);
      setError(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps: getAudioRootProps, getInputProps: getAudioInputProps, isDragActive: isAudioDragActive } = useDropzone({
    onDrop: onAudioDrop,
    accept: {
      "audio/*": [".mp3", ".wav", ".m4a", ".ogg"]
    },
    multiple: false,
    disabled: uploading
  });

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

  // Select system audio
  const selectSystemAudio = (audio: any) => {
    const audioData = {
      type: 'system',
      id: audio.id,
      name: audio.name,
      category: audio.category,
      duration: audio.duration,
      url: `/api/system-audio/${audio.id}.mp3`,
    };

    setSelectedAudio(audioData);
    updateFormData("audio", audioData);
  };

  // Handle hotspot image dragging
  const handleHotspotImageMouseDown = useCallback((e: React.MouseEvent, hotspotId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const hotspot = hotspots.find(h => h.id === hotspotId);
    if (!hotspot?.hotspotImage) return;

    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const initialClientX = e.clientX;
    const initialClientY = e.clientY;
    const initialX = hotspot.hotspotImage.x;
    const initialY = hotspot.hotspotImage.y;

    setIsDragging(true);
    setSelectedHotspot(hotspotId);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!rect) return;

      const deltaX = moveEvent.clientX - initialClientX;
      const deltaY = moveEvent.clientY - initialClientY;

      const deltaPercentX = (deltaX / rect.width) * 100;
      const deltaPercentY = (deltaY / rect.height) * 100;

      const newX = Math.max(0, Math.min(100, initialX + deltaPercentX));
      const newY = Math.max(0, Math.min(100, initialY + deltaPercentY));

      updateHotspot(hotspotId, {
        hotspotImage: {
          ...hotspot.hotspotImage!,
          x: newX,
          y: newY
        }
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [hotspots]);

  // Update form data when hotspots change
  useEffect(() => {
    const currentHotspots = formData.hotspots || [];
    if (JSON.stringify(currentHotspots) !== JSON.stringify(hotspots)) {
      updateFormData("hotspots", hotspots);
    }
  }, [hotspots, formData.hotspots, updateFormData]);

  return (
    <div className="space-y-6">
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
            <button className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors">
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Landscape Mode
            </button>
          </div>
          <div 
            ref={imageContainerRef}
            className="bg-black rounded-lg overflow-hidden relative transition-all duration-300 aspect-[9/16] max-w-[400px] mx-auto"
          >
            {formData.image?.url ? (
              <>
                <img
                  ref={imageRef}
                  src={formData.image.url}
                  alt="Uploaded image"
                  className="w-full h-full object-contain"
                />
                {/* Render hotspot images */}
                {hotspots
                  .filter(hotspot => hotspot.hotspotImage && hotspot.isSaved)
                  .map((hotspot) => (
                    <div
                      key={hotspot.id}
                      className={`absolute cursor-move select-none ${isDragging && selectedHotspot === hotspot.id ? 'z-10' : ''}`}
                      style={{
                        left: `${hotspot.hotspotImage!.x}%`,
                        top: `${hotspot.hotspotImage!.y}%`,
                        width: `${hotspot.hotspotImage!.scale}px`,
                        height: `${hotspot.hotspotImage!.scale}px`,
                      }}
                      onMouseDown={(e) => handleHotspotImageMouseDown(e, hotspot.id)}
                    >
                      <img
                        src={hotspot.hotspotImage!.url}
                        alt={hotspot.hotspotImage!.name}
                        className="w-full h-full object-cover rounded"
                        draggable={false}
                      />
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
          {/* Add Hotspot Button - Top Right */}
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
          
          {/* Hotspot Editing Area */}
          {selectedHotspot && (
            <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
              <h3 className="text-lg font-medium mb-4">Edit Hotspot</h3>
              
              <div className="space-y-4">
                {/* Hotspot Title Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hotspot Title
                  </label>
                  <input
                    type="text"
                    value={hotspotTitle}
                    onChange={(e) => setHotspotTitle(e.target.value)}
                    placeholder="Enter hotspot title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Hotspot Image Upload - Only show if no image uploaded */}
                {!getSelectedHotspot()?.hotspotImage && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hotspot Image
                    </label>
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
                  </div>
                )}

                {/* Show uploaded hotspot image info */}
                {getSelectedHotspot()?.hotspotImage && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hotspot Image
                    </label>
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden mr-2">
                          <img src={getSelectedHotspot()?.hotspotImage?.url} alt={getSelectedHotspot()?.hotspotImage?.name} className="w-full h-full object-cover" />
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
                  </div>
                )}

                {/* Position Controls - In one row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      X Position (%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={getSelectedHotspot()?.hotspotImage?.x || 40}
                      onChange={(e) => {
                        const currentHotspot = getSelectedHotspot();
                        if (currentHotspot?.hotspotImage) {
                          updateHotspot(selectedHotspot, {
                            hotspotImage: {
                              ...currentHotspot.hotspotImage,
                              x: parseInt(e.target.value)
                            }
                          });
                        }
                      }}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {getSelectedHotspot()?.hotspotImage?.x || 40}%
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
                      value={getSelectedHotspot()?.hotspotImage?.y || 40}
                      onChange={(e) => {
                        const currentHotspot = getSelectedHotspot();
                        if (currentHotspot?.hotspotImage) {
                          updateHotspot(selectedHotspot, {
                            hotspotImage: {
                              ...currentHotspot.hotspotImage,
                              y: parseInt(e.target.value)
                            }
                          });
                        }
                      }}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {getSelectedHotspot()?.hotspotImage?.y || 40}%
                    </div>
                  </div>
                </div>

                {/* Scale Control */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scale (%)
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={getSelectedHotspot()?.hotspotImage?.scale || 60}
                    onChange={(e) => {
                      const currentHotspot = getSelectedHotspot();
                      if (currentHotspot?.hotspotImage) {
                        updateHotspot(selectedHotspot, {
                          hotspotImage: {
                            ...currentHotspot.hotspotImage,
                            scale: parseInt(e.target.value)
                          }
                        });
                      }
                    }}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {getSelectedHotspot()?.hotspotImage?.scale || 60}%
                  </div>
                </div>

                {/* Action Type */}
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

                {/* URL Input */}
                {getSelectedHotspot()?.action === "url" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={getSelectedHotspot()?.url || ""}
                      onChange={(e) => updateHotspot(selectedHotspot, { url: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Popup Content */}
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

                      {/* Display uploaded popup images */}
                      <div className="mt-2 space-y-2">
                        {(getSelectedHotspot()?.popupContent?.images || []).map((image) => (
                          <div key={image.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gray-200 rounded overflow-hidden mr-2">
                                <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
                              </div>
                              <span className="text-sm truncate max-w-[120px]" title={image.name}>{image.name}</span>
                            </div>
                            <button
                              onClick={() => removePopupImage(image.id)}
                              className="text-red-500 hover:text-red-700"
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

                {/* Audio Selection - 添加在URL/Popup下方 */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-700 mb-3">Audio Selection</h4>
                  
                  {/* Audio Type Selection */}
                  <div className="mb-4">
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setAudioType('system')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          audioType === 'system'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        System Audio
                      </button>
                      <button
                        onClick={() => setAudioType('upload')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          audioType === 'upload'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Upload Audio
                      </button>
                    </div>
                  </div>

                  {/* System Audio Dropdown */}
                  {audioType === 'system' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Audio
                      </label>
                      <select
                        value={selectedAudio?.id || ''}
                        onChange={(e) => {
                          const audio = SYSTEM_AUDIO_OPTIONS.find(a => a.id === e.target.value);
                          if (audio) selectSystemAudio(audio);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Choose an audio track</option>
                        {SYSTEM_AUDIO_OPTIONS.map((audio) => (
                          <option key={audio.id} value={audio.id}>
                            {audio.name} ({audio.category}) - {audio.duration}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Upload Audio */}
                  {audioType === 'upload' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Upload Audio File
                      </label>
                      <div
                        {...getAudioRootProps()}
                        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                          isAudioDragActive
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-300 hover:border-blue-400"
                        } ${uploading ? "opacity-50" : ""}`}
                      >
                        <input {...getAudioInputProps()} />
                        {uploading ? (
                          <p className="text-sm text-gray-600">Uploading...</p>
                        ) : (
                          <>
                            <svg className="w-6 h-6 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                            <p className="text-sm text-gray-600">
                              Drop audio file here or click to upload
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Selected Audio Display */}
                  {selectedAudio && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{selectedAudio.name}</div>
                          <div className="text-xs text-gray-500">
                            {selectedAudio.type === 'system' ? selectedAudio.category : 'Uploaded File'}
                            {selectedAudio.duration && ` • ${selectedAudio.duration}`}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedAudio(null);
                            updateFormData("audio", null);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Save Hotspot Button */}
                <div className="pt-4">
                  <button
                    onClick={saveHotspot}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Save Hotspot
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hotspots List */}
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
                          {hotspot.hotspotImage && (
                            <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden">
                              <img src={hotspot.hotspotImage.url} alt={hotspot.hotspotImage.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{hotspot.title || `Hotspot ${hotspot.id}`}</div>
                            <div className="text-sm text-gray-500">
                              Position: {hotspot.hotspotImage?.x || 0}%, {hotspot.hotspotImage?.y || 0}% | 
                              Scale: {hotspot.hotspotImage?.scale || 0}% | 
                              {hotspot.action === 'url' ? `URL: ${hotspot.url}` : `Popup: ${hotspot.popupContent?.title || 'Untitled'}`}
                            </div>
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
          disabled={hotspots.filter(h => h.isSaved).length === 0}
          className="px-6 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default ImageHotspots;
