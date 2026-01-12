
import React, { useRef, useState } from 'react';

interface VideoUploaderProps {
  onUpload: (file: File, frames: string[]) => void;
  isProcessing: boolean;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onUpload, isProcessing }) => {
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractFrames = async (file: File): Promise<string[]> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.preload = 'auto';

      const frames: string[] = [];
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const duration = video.duration;
        const totalFramesToExtract = 8;
        const interval = duration / (totalFramesToExtract + 1);
        let currentTime = interval;
        let count = 0;

        const captureFrame = () => {
          if (count < totalFramesToExtract) {
            video.currentTime = currentTime;
          } else {
            resolve(frames);
          }
        };

        video.onseeked = () => {
          if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg', 0.6));
            count++;
            currentTime += interval;
            setProgress(Math.round((count / totalFramesToExtract) * 100));
            captureFrame();
          }
        };

        captureFrame();
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const frames = await extractFrames(file);
      onUpload(file, frames);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const frames = await extractFrames(file);
      onUpload(file, frames);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div 
        className={`relative h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800/50'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          accept="video/*" 
          className="hidden" 
          onChange={handleFileChange}
          disabled={isProcessing}
        />
        
        {isProcessing ? (
          <div className="text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-lg font-medium text-blue-400">Extracting Viral Highlights... {progress}%</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-4 bg-slate-700 p-4 rounded-full inline-block">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload Long Video</h3>
            <p className="text-slate-400 mb-6">Drag and drop your MP4, MOV or AVI here</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20"
            >
              Select Video
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploader;
