"use client";

import { useState, useRef, useEffect } from "react";

interface RequestData {
  video_id: string;
  pause_frames: Array<{
    time: number;
    image_id: string;
    position: { left: number; top: number };
  }>;
  cta_buttons: Array<{
    type: string;
    image_id: string;
    position: { left: number; top: number };
    start_time?: number;
  }>;
  platform: string;
  banners?: {
    left_image_id?: string;
    right_image_id?: string;
  };
}

interface ExportAdProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
  prevStep: () => void;
}

const ExportAd: React.FC<ExportAdProps> = ({
  formData,
  updateFormData,
  prevStep,
}) => {
  const [platform, setPlatform] = useState<string>(formData.platform || "google");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [result, setResult] = useState<{
    fileUrl: string;
    previewUrl?: string;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const handlePlatformChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPlatform(e.target.value);
    updateFormData("platform", e.target.value);
  };

  // 切换横竖屏
  const toggleOrientation = () => {
    setIsLandscape(!isLandscape);
  };

  // 当视频被拖动后自动播放
  const handleVideoSeeked = () => {
    // 只有在非拖动滑块状态下才自动播放
    if (!isDraggingSlider && videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(e => console.error('Auto play failed:', e));
    }
  };

  const generateAd = async () => {
    try {
      setError(null);
      setGenerating(true);

      // Prepare request data
      const requestData: RequestData = {
        video_id: formData.video.id,
        pause_frames: formData.pauseFrames.map((frame: any) => ({
          time: frame.time,
          image_id: frame.image.id,
          position: frame.position,
        })),
        cta_buttons: formData.ctaButtons.map((button: any) => ({
          type: button.type,
          image_id: button.image.id,
          position: button.position,
          start_time: button.startTime,
        })),
        platform: platform,
      };

      // Add banners if they exist
      if (formData.banners?.left || formData.banners?.right) {
        requestData.banners = {};
        if (formData.banners.left) {
          requestData.banners.left_image_id = formData.banners.left.id;
        }
        if (formData.banners.right) {
          requestData.banners.right_image_id = formData.banners.right.id;
        }
      }

      // Send request to backend
      const response = await fetch("http://localhost:8080/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error("Failed to generate ad");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate ad");
      }

      // Set result
      setResult({
        fileUrl: `http://localhost:8080${data.file_url}`,
        previewUrl: data.preview_url
          ? `http://localhost:8080${data.preview_url}`
          : undefined,
      });

      setGenerating(false);
    } catch (err: any) {
      setError(err.message || "An error occurred during generation");
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Export Ad</h2>
        <p className="text-gray-600">
          Generate your playable ad for the selected platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            className={`bg-black rounded-lg overflow-hidden transition-all duration-300 ${
              isLandscape 
                ? "aspect-video" 
                : "aspect-[9/16] max-w-[400px] mx-auto"
            }`}
          >
            <video
              ref={videoRef}
              src={formData.video.url}
              className="w-full h-full object-contain pointer-events-none"
              onSeeked={handleVideoSeeked}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Ad Configuration
          </h3>

          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <label
                htmlFor="platform"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Target Platform
              </label>
              <select
                id="platform"
                value={platform}
                onChange={handlePlatformChange}
                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="google">Google Ads</option>
                <option value="facebook">Facebook Ads</option>
                <option value="applovin">AppLovin</option>
              </select>
            </div>

            <div className="pt-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Summary
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium">Video:</span>{" "}
                  {formData.video.metadata?.duration
                    ? `${formData.video.metadata.duration.toFixed(1)}s`
                    : "Uploaded"}
                </p>
                <p>
                  <span className="font-medium">Pause Frames:</span>{" "}
                  {formData.pauseFrames.length} added
                </p>
                <p>
                  <span className="font-medium">CTA Buttons:</span>{" "}
                  {formData.ctaButtons.length} added
                </p>
                <p>
                  <span className="font-medium">Banners:</span>{" "}
                  {formData.banners?.left && formData.banners?.right
                    ? "Left and Right"
                    : formData.banners?.left
                    ? "Left only"
                    : formData.banners?.right
                    ? "Right only"
                    : "None"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={generateAd}
              disabled={generating}
              className={`w-full py-3 rounded-md font-medium ${
                generating
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {generating ? "Generating..." : "Generate Ad"}
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-md text-center">
              {error}
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Result</h3>

            {!result ? (
              <div className="bg-gray-50 rounded-lg h-64 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  {generating ? (
                    <div className="space-y-3">
                      <svg
                        className="animate-spin h-8 w-8 text-blue-500 mx-auto"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <p>Generating your playable ad...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <svg
                        className="h-12 w-12 text-gray-400 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p>Click "Generate Ad" to create your playable ad</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {result.previewUrl && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
                    <div className="bg-black rounded-lg overflow-hidden">
                      <video
                        src={result.previewUrl}
                        className="w-full h-auto"
                        controls
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Download</h4>
                  <a
                    href={result.fileUrl}
                    download="playable-ad.zip"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Download Ad Package
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between pt-6">
        <button
          onClick={prevStep}
          className="px-6 py-2 rounded-md text-gray-700 font-medium border border-gray-300 hover:bg-gray-50"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default ExportAd; 