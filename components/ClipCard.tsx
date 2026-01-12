
import React, { useState, useRef } from 'react';
import { BestClip, Caption, Thumbnail } from '../types';
import { YouTubeService } from '../services/youtubeService';

interface ClipCardProps {
  clip: BestClip;
  caption: Caption | undefined;
  thumbnail: Thumbnail | undefined;
  videoUrl: string | null;
  youtubeToken: string | null;
  onConnectYouTube: () => void;
}

const ClipCard: React.FC<ClipCardProps> = ({ clip, caption, thumbnail, videoUrl, youtubeToken, onConnectYouTube }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlobUrl, setGeneratedBlobUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'info' | 'vfx' | 'voice'>('info');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleGenerateShort = async () => {
    if (!videoUrl || !videoRef.current || !canvasRef.current) return;
    setIsGenerating(true);
    setProgress(0);
    chunksRef.current = [];

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 720;
    canvas.height = 1280;
    video.currentTime = clip.start;

    await new Promise((resolve) => {
      const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(null); };
      video.addEventListener('seeked', onSeeked);
    });

    const drawFrame = () => {
      if (video.paused || video.ended) return;
      const cw = canvas.width;
      const ch = canvas.height;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const scale = Math.max(cw / vw, ch / vh);
      const x = (cw - vw * scale) / 2;
      const y = (ch - vh * scale) / 2;
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(video, x, y, vw * scale, vh * scale);
      requestAnimationFrame(drawFrame);
    };

    const canvasStream = (canvas as any).captureStream(30);
    const videoStream = (video as any).captureStream ? (video as any).captureStream() : (video as any).mozCaptureStream ? (video as any).mozCaptureStream() : null;
    const audioTrack = videoStream?.getAudioTracks()[0];
    
    const combinedStream = new MediaStream([
      canvasStream.getVideoTracks()[0],
      ...(audioTrack ? [audioTrack] : [])
    ]);

    const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9' });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setGeneratedBlobUrl(URL.createObjectURL(blob));
      setIsGenerating(false);
    };

    recorder.start();
    video.play();
    drawFrame();

    const duration = clip.end - clip.start;
    const updateInterval = setInterval(() => {
      const elapsed = video.currentTime - clip.start;
      const p = Math.min(Math.round((elapsed / duration) * 100), 99);
      setProgress(p);
      if (video.currentTime >= clip.end || video.ended) {
        clearInterval(updateInterval);
        video.pause();
        recorder.stop();
      }
    }, 100);
  };

  return (
    <div className="glass-panel rounded-[2rem] overflow-hidden flex flex-col h-full group hover:border-blue-500/50 transition-all">
      <video ref={videoRef} src={videoUrl || ''} className="hidden" muted playsInline crossOrigin="anonymous" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Clip Header */}
      <div className="p-5 flex items-center justify-between bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-500 text-xs font-black">
             {clip.id}
           </div>
           <span className="text-xs font-bold text-white/60 tracking-widest">{clip.energy} ENERGY</span>
        </div>
        <div className="text-[10px] font-black text-slate-500 bg-white/5 px-2 py-1 rounded-full uppercase italic">
          {clip.duration.toFixed(0)} Seconds
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 space-y-4 flex-grow">
        {isGenerating ? (
          <div className="aspect-[9/16] max-h-64 mx-auto rounded-3xl bg-slate-900 border border-blue-500/30 flex flex-col items-center justify-center gap-4">
             <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">{progress}% Render</p>
          </div>
        ) : generatedBlobUrl ? (
          <div className="aspect-[9/16] max-h-64 mx-auto rounded-3xl bg-black border border-white/10 overflow-hidden shadow-2xl">
             <video src={generatedBlobUrl} controls className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tabs for AI Data */}
            <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
               {(['info', 'vfx', 'voice'] as const).map(tab => (
                 <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                 >
                   {tab}
                 </button>
               ))}
            </div>

            <div className="min-h-[140px] animate-fade-in">
              {activeTab === 'info' && (
                <div className="space-y-3">
                   <p className="text-sm font-bold leading-relaxed">{caption?.bn_main}</p>
                   <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{caption?.en_sub}</p>
                </div>
              )}
              {activeTab === 'vfx' && (
                <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-2xl">
                   <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">AI Visual Directives</h4>
                   <p className="text-xs text-purple-200/80 leading-relaxed font-medium">{caption?.vfx_suggestions}</p>
                </div>
              )}
              {activeTab === 'voice' && (
                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-2xl">
                   <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Voiceover Script</h4>
                   <p className="text-xs text-blue-200/80 leading-relaxed font-mono">{caption?.voiceover_script}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Area */}
      <div className="p-6 pt-0 mt-auto">
        {!generatedBlobUrl ? (
          <button 
            onClick={handleGenerateShort}
            disabled={isGenerating}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-900/30 transition-all flex items-center justify-center gap-3"
          >
            <span>Run AI Extraction</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </button>
        ) : (
          <div className="flex gap-2">
            <button className="flex-1 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl">YouTube Post</button>
            <a href={generatedBlobUrl} download={`clip_${clip.id}.webm`} className="p-3 bg-white/10 text-white rounded-xl hover:bg-white/20">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClipCard;
