"use client";

import React, { useState, useRef } from "react";
import { useLanguage } from "@/app/i18n/LanguageContext";
import { useDropzone } from "react-dropzone";
import { API_PATHS, getFullUrl } from "@/config/api";

interface AudioUploadProps {
  formData: Record<string, any>;
  updateFormData: (field: string, value: any) => void;
  nextStep: () => void;
  prevStep: () => void;
  returnToProjectSelection: () => void;
}

// 系统自带的音频列表
const SYSTEM_AUDIO_OPTIONS = [
  {
    id: 'upbeat-1',
    name: 'Upbeat Energy',
    category: 'Energetic',
    duration: '0:30',
    description: 'High-energy track perfect for action content'
  },
  {
    id: 'ambient-1',
    name: 'Ambient Flow',
    category: 'Ambient',
    duration: '0:45',
    description: 'Calm and peaceful background music'
  },
  {
    id: 'corporate-1',
    name: 'Corporate Professional',
    category: 'Corporate',
    duration: '0:30',
    description: 'Professional and trustworthy tone'
  },
  {
    id: 'tech-1',
    name: 'Tech Innovation',
    category: 'Technology',
    duration: '0:40',
    description: 'Modern and innovative sound'
  },
  {
    id: 'nature-1',
    name: 'Nature Sounds',
    category: 'Nature',
    duration: '1:00',
    description: 'Natural ambient sounds'
  },
  {
    id: 'classical-1',
    name: 'Classical Elegance',
    category: 'Classical',
    duration: '0:50',
    description: 'Elegant classical music'
  }
];

const AudioUpload: React.FC<AudioUploadProps> = ({
  formData,
  updateFormData,
  nextStep,
  prevStep,
  returnToProjectSelection,
}) => {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<any>(null);
  const [audioType, setAudioType] = useState<'upload' | 'system'>('system');
  const audioRef = useRef<HTMLAudioElement>(null);

  const onDrop = async (acceptedFiles: File[]) => {
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
      setUploading(false);
    }
  };

  const onDropRejected = (fileRejections: any[]) => {
    setError("Please select a valid audio file (MP3, WAV, M4A, OGG)");
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "audio/*": [".mp3", ".wav", ".m4a", ".ogg"]
    },
    multiple: false,
    disabled: uploading,
  });

  const selectSystemAudio = (audio: any) => {
    const audioData = {
      type: 'system',
      id: audio.id,
      name: audio.name,
      category: audio.category,
      duration: audio.duration,
      description: audio.description,
      url: `/api/system-audio/${audio.id}.mp3`, // 假设系统音频的URL格式
    };

    setSelectedAudio(audioData);
    updateFormData("audio", audioData);
  };

  const playAudio = () => {
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
        <h2 className="text-2xl font-semibold text-gray-800">Add Audio</h2>
        <p className="text-gray-600">Choose audio for your playable ad</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Audio Type Selection */}
      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setAudioType('system')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              audioType === 'system'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            System Audio Library
          </button>
          <button
            onClick={() => setAudioType('upload')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              audioType === 'upload'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Upload Your Own
          </button>
        </div>
      </div>

      {/* System Audio Library */}
      {audioType === 'system' && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">Choose from System Audio Library</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SYSTEM_AUDIO_OPTIONS.map((audio) => (
              <div
                key={audio.id}
                onClick={() => selectSystemAudio(audio)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedAudio?.id === audio.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{audio.name}</h4>
                  <span className="text-sm text-gray-500">{audio.duration}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{audio.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    {audio.category}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // 这里可以添加预览功能
                    }}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Audio */}
      {audioType === 'upload' && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">Upload Audio File</h3>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-blue-400"
            } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input {...getInputProps()} />
            
            {uploading ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto">
                  <svg className="animate-spin h-16 w-16 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-700">Uploading audio...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <div>
                  <p className="text-gray-700">
                    {isDragActive ? "Drop the audio file here" : "Drag and drop your audio file here, or click to select"}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">Supported formats: MP3, WAV, M4A, OGG</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Audio Preview */}
      {selectedAudio && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">Selected Audio</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium">{selectedAudio.name}</h4>
                <p className="text-sm text-gray-600">
                  {selectedAudio.type === 'system' ? selectedAudio.category : 'Uploaded File'}
                  {selectedAudio.duration && ` • ${selectedAudio.duration}`}
                </p>
              </div>
              <button
                onClick={playAudio}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Play
              </button>
            </div>
            {selectedAudio.url && (
              <audio
                ref={audioRef}
                src={selectedAudio.url}
                controls
                className="w-full"
              />
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-6">
        <button
          onClick={nextStep}
          disabled={!selectedAudio || uploading}
          className="px-6 py-2 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default AudioUpload;
