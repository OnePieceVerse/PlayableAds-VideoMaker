"use client";

import React, { useState, useRef, useEffect } from "react";
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
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");

  // Initialize with existing hotspots if available
  useEffect(() => {
    if (formData.hotspots && formData.hotspots.length > 0) {
      setHotspots(formData.hotspots);
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

      // Set initial size
      updateImageSize();

      // Update on window resize
      window.addEventListener("resize", updateImageSize);
      return () => window.removeEventListener("resize", updateImageSize);
    }
  }, []);

  // Add a new hotspot button
  const addNewHotspot = () => {
    // Create a new hotspot with default values
    const newId = `hotspot-${Date.now()}`;
    const newHotspot = {
      id: newId,
      x: 40,
      y: 40,
      width: 20,
      height: 20,
      label: "New Hotspot",
      action: "url",
      url: "",
      popupContent: { title: "", images: [] },
      isSaved: false,
    };
    
    setHotspots(prev => [...prev, newHotspot]);
    setSelectedHotspot(newId);
    setIsEditing(true);
  };

  // Handle selecting a hotspot
  const handleHotspotClick = (e: React.MouseEvent, hotspotId: string) => {
    e.stopPropagation();
    if (!isEditing) {
      setSelectedHotspot(hotspotId);
    }
  };

  // Handle hotspot image drag start
  const handleHotspotImageMouseDown = (e: React.MouseEvent, hotspotId: string) => {
    e.stopPropagation();
    if (!isEditing) return;
    
    const hotspot = hotspots.find(h => h.id === hotspotId);
    if (!hotspot?.hotspotImage) return;
    
    setIsDragging(true);
    setSelectedHotspot(hotspotId);
    
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left) / (rect.width / 100);
      const y = (e.clientY - rect.top) / (rect.height / 100);
      setDragOffset({
        x: x - hotspot.hotspotImage.x,
        y: y - hotspot.hotspotImage.y
      });
    }
  };

  // Handle mouse move for dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedHotspot || !imageContainerRef.current) return;
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, (e.clientX - rect.left) / (rect.width / 100) - dragOffset.x));
    const y = Math.max(0, Math.min(100, (e.clientY - rect.top) / (rect.height / 100) - dragOffset.y));
    
    updateHotspot(selectedHotspot, {
      hotspotImage: {
        ...getSelectedHotspot()?.hotspotImage!,
        x,
        y
      }
    });
  };

  // Handle mouse up for dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Update hotspot properties
  const updateHotspot = (hotspotId: string, updates: Partial<Hotspot>) => {
    setHotspots(prev =>
      prev.map(hotspot =>
        hotspot.id === hotspotId ? { ...hotspot, ...updates } : hotspot
      )
    );
  };

  // Update hotspot dimensions
  const updateHotspotDimensions = (hotspotId: string, dimension: 'x' | 'y' | 'width' | 'height', value: string) => {
    const numValue = parseFloat(value);
    updateHotspot(hotspotId, { [dimension]: numValue });
  };

  // Update hotspot image scale
  const updateHotspotImageScale = (hotspotId: string, scale: number) => {
    updateHotspot(hotspotId, {
      hotspotImage: {
        ...getSelectedHotspot()?.hotspotImage!,
        scale
      }
    });
  };

  // Delete a hotspot
  const deleteHotspot = (hotspotId: string) => {
    setHotspots(prev => prev.filter(hotspot => hotspot.id !== hotspotId));
    if (selectedHotspot === hotspotId) {
      setSelectedHotspot(null);
      setIsEditing(false);
    }
  };

  // Save hotspot
  const saveHotspot = () => {
    updateHotspot(selectedHotspot!, { isSaved: true });
    setIsEditing(false);
    setSelectedHotspot(null);
  };

  // Get selected hotspot
  const getSelectedHotspot = () => {
    return hotspots.find(hotspot => hotspot.id === selectedHotspot);
  };

  // Update popup title
  const updatePopupTitle = (title: string) => {
    setPopupTitle(title);
    if (selectedHotspot) {
      const currentHotspot = getSelectedHotspot();
      updateHotspot(selectedHotspot, {
        popupContent: {
          title,
          images: currentHotspot?.popupContent?.images || []
        }
      });
    }
  };

  // Handle hotspot image upload
  const onHotspotImageDrop = async (acceptedFiles: File[]) => {
    if (!selectedHotspot) return;

    setUploading(true);
    try {
      const file = acceptedFiles[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "image");
      formData.append("step", "image_upload");

      const response = await fetch(API_PATHS.upload, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      const hotspotImage = {
        id: `hotspot-image-${Date.now()}`,
        url: getFullUrl(data.url),
        name: file.name,
        x: 50,
        y: 50,
        scale: 100,
      };

      updateHotspot(selectedHotspot, { hotspotImage });
    } catch (error) {
      console.error("Error uploading hotspot image:", error);
      setError("Failed to upload hotspot image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Handle popup image upload
  const onPopupImageDrop = async (acceptedFiles: File[]) => {
    if (!selectedHotspot) return;

    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "image");
        formData.append("step", "image_upload");

        const response = await fetch(API_PATHS.upload, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed with status ${response.status}`);
        }

        const data = await response.json();
        const newImage = {
          id: `image-${Date.now()}-${Math.random()}`,
          url: getFullUrl(data.url),
          name: file.name,
        };

        const currentHotspot = getSelectedHotspot();
        if (currentHotspot) {
          updateHotspot(selectedHotspot, {
            popupContent: {
              title: currentHotspot.popupContent?.title || "",
              images: [...(currentHotspot.popupContent?.images || []), newImage]
            }
          });
        }
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      setError("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps: getHotspotImageRootProps, getInputProps: getHotspotImageInputProps, isDragActive: isHotspotImageDragActive } = useDropzone({
    onDrop: onHotspotImageDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"]
    },
    multiple: false
  });

  const { getRootProps: getPopupImageRootProps, getInputProps: getPopupImageInputProps, isDragActive: isPopupImageDragActive } = useDropzone({
    onDrop: onPopupImageDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"]
    },
    multiple: true
  });

  // Remove popup image
  const removePopupImage = (imageId: string) => {
    if (!selectedHotspot) return;

    const currentHotspot = getSelectedHotspot();
    if (currentHotspot?.popupContent?.images) {
      updateHotspot(selectedHotspot, {
        popupContent: {
          title: currentHotspot.popupContent.title,
          images: currentHotspot.popupContent.images.filter(img => img.id !== imageId)
        }
      });
    }
  };

  // Save hotspots and continue
  const handleSave = () => {
    // Only save hotspots that are marked as saved
    const savedHotspots = hotspots.filter(hotspot => hotspot.isSaved);
    updateFormData("hotspots", savedHotspots);
    nextStep();
  };

  // Get saved hotspots for display
  const savedHotspots = hotspots.filter(hotspot => hotspot.isSaved);

  return (
    <div className="mx-auto">
      <h2 className="text-2xl font-bold mb-6">{t('addHotspots')}</h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left side: Image with hotspots (5 columns) */}
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
            className="bg-black rounded-lg overflow-hidden relative transition-all duration-300 aspect-[9/16] max-w-[400px] mx-auto"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div 
              className="relative w-full h-full overflow-hidden"
              ref={imageContainerRef}
            >
              {formData.image?.url ? (
                <>
                  <img
                    ref={imageRef}
                    src={formData.image.url}
                    alt="Interactive Image"
                    className="w-full h-full object-contain"
                  />
                  {/* Render hotspot images only */}
                  {hotspots.map(hotspot => (
                    hotspot.hotspotImage && (
                      <div
                        key={hotspot.id}
                        className={`absolute cursor-move ${isDragging && selectedHotspot === hotspot.id ? 'z-10' : ''}`}
                        style={{
                          left: `${hotspot.hotspotImage.x}%`,
                          top: `${hotspot.hotspotImage.y}%`,
                          width: `${hotspot.hotspotImage.scale}px`,
                          height: `${hotspot.hotspotImage.scale}px`,
                        }}
                        onMouseDown={(e) => handleHotspotImageMouseDown(e, hotspot.id)}
                      >
                        <img
                          src={hotspot.hotspotImage.url}
                          alt={hotspot.hotspotImage.name}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    )
                  ))}
                </>
              ) : (
                <div className="bg-gray-200 w-full h-full flex items-center justify-center">
                  <p className="text-gray-500">No image available</p>
                </div>
              )}
            </div>
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
                        <span className="text-sm truncate max-w-[150px]">{getSelectedHotspot()?.hotspotImage?.name}</span>
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

                {/* Position and Scale controls - only show if hotspot image exists */}
                {getSelectedHotspot()?.hotspotImage && (
                  <>
                    {/* Position controls in one row */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Position
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">X Position</label>
                          <div className="flex items-center">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="1"
                              value={getSelectedHotspot()?.hotspotImage?.x || 0}
                              onChange={(e) => updateHotspot(selectedHotspot, {
                                hotspotImage: {
                                  ...getSelectedHotspot()?.hotspotImage!,
                                  x: parseFloat(e.target.value)
                                }
                              })}
                              className="w-full mr-2"
                            />
                            <span className="text-sm w-10 text-center">{Math.round(getSelectedHotspot()?.hotspotImage?.x || 0)}%</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Y Position</label>
                          <div className="flex items-center">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="1"
                              value={getSelectedHotspot()?.hotspotImage?.y || 0}
                              onChange={(e) => updateHotspot(selectedHotspot, {
                                hotspotImage: {
                                  ...getSelectedHotspot()?.hotspotImage!,
                                  y: parseFloat(e.target.value)
                                }
                              })}
                              className="w-full mr-2"
                            />
                            <span className="text-sm w-10 text-center">{Math.round(getSelectedHotspot()?.hotspotImage?.y || 0)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Scale
                      </label>
                      <div className="flex items-center">
                        <input
                          type="range"
                          min="20"
                          max="200"
                          step="5"
                          value={getSelectedHotspot()?.hotspotImage?.scale || 100}
                          onChange={(e) => updateHotspotImageScale(selectedHotspot, parseInt(e.target.value))}
                          className="w-full mr-2"
                        />
                        <span className="text-sm w-10 text-center">{getSelectedHotspot()?.hotspotImage?.scale || 100}%</span>
                      </div>
                    </div>
                  </>
                )}
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action Type
                  </label>
                  <select
                    value={getSelectedHotspot()?.action || "url"}
                    onChange={(e) =>
                      updateHotspot(selectedHotspot, { action: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="url">Open URL</option>
                    <option value="popup">Show Popup</option>
                  </select>
                </div>
                
                {getSelectedHotspot()?.action === "url" && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL
                    </label>
                    <input
                      type="text"
                      value={getSelectedHotspot()?.url || ""}
                      onChange={(e) =>
                        updateHotspot(selectedHotspot, { url: e.target.value })
                      }
                      placeholder="https://example.com"
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {getSelectedHotspot()?.action === "popup" && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Popup Title
                    </label>
                    <input
                      type="text"
                      value={popupTitle}
                      onChange={(e) => updatePopupTitle(e.target.value)}
                      placeholder="Enter popup title"
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                    />
                    
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Popup Images
                    </label>
                    
                    {/* Image upload area */}
                    <div
                      {...getPopupImageRootProps()}
                      className={`border-2 border-dashed rounded-lg p-4 mb-3 text-center cursor-pointer transition-colors ${
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
                          <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                          </svg>
                          <p className="text-sm text-gray-600">
                            Drop images here or click to upload
                          </p>
                        </>
                      )}
                    </div>
                    
                    {/* Display uploaded images */}
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {(() => {
                        const selectedHotspot = getSelectedHotspot();
                        const popupImages = selectedHotspot?.popupContent?.images || [];
                        
                        return popupImages.length > 0 ? (
                          popupImages.map((image) => (
                            <div key={image.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden mr-2">
                                  <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
                                </div>
                                <span className="text-sm truncate max-w-[150px]">{image.name}</span>
                              </div>
                              <button
                                onClick={() => removePopupImage(image.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Remove image"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 italic">No images added yet</p>
                        );
                      })()}
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2">
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
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Hotspot List - Only show saved hotspots */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium mb-2">Hotspots ({savedHotspots.length})</h4>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
              {savedHotspots.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {savedHotspots.map(hotspot => (
                    <li
                      key={hotspot.id}
                      className={`px-4 py-2 cursor-pointer ${
                        selectedHotspot === hotspot.id
                          ? "bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        setSelectedHotspot(hotspot.id);
                        setIsEditing(true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            {/* Hotspot image thumbnail */}
                            {hotspot.hotspotImage && (
                              <div className="w-8 h-8 bg-gray-200 rounded overflow-hidden mr-2">
                                <img 
                                  src={hotspot.hotspotImage.url} 
                                  alt={hotspot.hotspotImage.name} 
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                            )}
                            <div className="text-sm font-medium">{hotspot.label || "Unnamed Hotspot"}</div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {hotspot.hotspotImage ? (
                              `Position: (${Math.round(hotspot.hotspotImage.x)}%, ${Math.round(hotspot.hotspotImage.y)}%) | Scale: ${hotspot.hotspotImage.scale}%`
                            ) : (
                              "No image uploaded"
                            )}
                          </div>
                          {/* Popup content preview */}
                          {hotspot.action === "popup" && hotspot.popupContent && (
                            <div className="text-xs text-gray-500 mt-1">
                              {hotspot.popupContent.title && (
                                <div>Title: {hotspot.popupContent.title}</div>
                              )}
                              {hotspot.popupContent.images && hotspot.popupContent.images.length > 0 && (
                                <div>Images: {hotspot.popupContent.images.length} {hotspot.popupContent.images.length === 1 ? 'image' : 'images'}</div>
                              )}
                            </div>
                          )}
                          {/* URL preview */}
                          {hotspot.action === "url" && hotspot.url && (
                            <div className="text-xs text-gray-500 mt-1">
                              URL: {hotspot.url}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            hotspot.action === "url" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {hotspot.action === "url" ? "URL" : "Popup"}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedHotspot(hotspot.id);
                              setIsEditing(true);
                            }}
                            className="text-blue-500 hover:text-blue-700"
                            title="Edit hotspot"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHotspot(hotspot.id);
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="Delete hotspot"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No hotspots created yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={prevStep}
          className="px-6 py-2 rounded-md text-gray-700 font-medium border border-gray-300 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default ImageHotspots;
