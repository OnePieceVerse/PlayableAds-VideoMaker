"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/app/i18n/LanguageContext";
import { useDropzone } from "react-dropzone";
import { API_PATHS, getFullUrl } from "@/config/api";

interface AudioUploadProps {
  formData: Record<string, any>;
  updateFormData: (field: string, value: any) => void;
  nextStep: () => void;
  prevStep: () => void;
  isOptional?: boolean;
}

const AudioUpload: React.FC<AudioUploadProps> = ({
  formData,
  updateFormData,
  nextStep,
  prevStep,
  isOptional = false,
}) => {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<any>(formData.audio || null);
  const [audioType, setAudioType] = useState<'upload' | 'system'>('system');
  const audioRef = useRef<HTMLAudioElement>(null);
  const [systemAudioList, setSystemAudioList] = useState<any[]>([]);

  // 获取系统音频列表
  useEffect(() => {
    const fetchSystemAudio = async () => {
      try {
        console.log('Fetching system audio list from backend');
        // 使用API_PATHS中的配置
        const response = await fetch(API_PATHS.systemAudio);
        if (response.ok) {
          const audioList = await response.json();
          console.log('Received system audio list:', audioList.length);
          
          // 使用原始的后端URL
          setSystemAudioList(audioList);
        } else {
          console.error('Failed to fetch system audio, status:', response.status);
        }
      } catch (error) {
        console.error('Failed to fetch system audio:', error);
      }
    };
    fetchSystemAudio();
  }, []);

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

  // Select system audio
  const selectSystemAudio = (audio: any) => {
    // 使用getFullUrl从配置中获取完整URL
    const url = getFullUrl(audio.url);
    
    console.log('Using audio URL from config:', url);
    
    const audioData = {
      type: 'system',
      id: audio.id,
      name: audio.name,
      category: audio.category,
      duration: audio.duration,
      url: url,
    };

    setSelectedAudio(audioData);
    updateFormData("audio", audioData);
  };

  // Play audio preview
  const playAudioPreview = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">{t('addAudioOptional')}</h2>
        <p className="text-gray-600">Add background audio to your playable ad (optional step)</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div>
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Background Audio</h3>
          
          <div className="mb-4">
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setAudioType('system');
                  if (selectedAudio?.type === 'uploaded') {
                    setSelectedAudio(null);
                    updateFormData("audio", null);
                  }
                }}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  audioType === 'system'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                System Audio
              </button>
              <button
                onClick={() => {
                  setAudioType('upload');
                  if (selectedAudio?.type === 'system') {
                    setSelectedAudio(null);
                    updateFormData("audio", null);
                  }
                }}
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

          {audioType === 'system' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Audio
              </label>
              <select
                value={selectedAudio?.id || ''}
                onChange={(e) => {
                  const audio = systemAudioList.find(a => a.id === e.target.value);
                  if (audio) selectSystemAudio(audio);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose an audio track</option>
                {systemAudioList.map((audio) => (
                  <option key={audio.id} value={audio.id}>
                    {audio.name} ({audio.category}) - {audio.duration}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                <div className="flex items-center space-x-2">
                  <button
                    onClick={playAudioPreview}
                    className="flex items-center px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Preview
                  </button>
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
              {selectedAudio.url && (
                <audio
                  ref={audioRef}
                  src={selectedAudio.url}
                  className="w-full mt-2"
                  controls
                />
              )}
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
          {selectedAudio ? "Continue" : "Skip & Continue"}
        </button>
      </div>
    </div>
  );
};

export default AudioUpload; 