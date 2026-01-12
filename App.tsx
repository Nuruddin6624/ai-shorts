
import React, { useState, useEffect } from 'react';
import { AppState, ShortsFactoryResponse, UserProfile } from './types';
import { analyzeVideoContent } from './services/geminiService';
import VideoUploader from './components/VideoUploader';
import ClipCard from './components/ClipCard';
import { YouTubeService } from './services/youtubeService';
import { SupabaseService, initSupabase, getSupabaseConfig } from './services/supabaseService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    user: null,
    isAnalyzing: false,
    videoUrl: null,
    analysisResults: null,
    error: null,
    progress: "Offline",
    isYouTubeConnected: false,
    youtubeToken: null,
    supabaseReady: false
  });

  const [showSettings, setShowSettings] = useState(false);
  const [sbConfig, setSbConfig] = useState({
    url: '',
    key: ''
  });
  const [isEnvConfigured, setIsEnvConfigured] = useState(false);

  // Supabase Auth and State Recovery
  useEffect(() => {
    const config = getSupabaseConfig();
    
    if (config.source === 'env') {
      setIsEnvConfigured(true);
      setSbConfig({ url: 'Configured via Environment', key: '****************' });
    } else {
      setSbConfig({ url: config.url, key: config.key });
    }

    const supabase = initSupabase();
    if (supabase) {
      setState(prev => ({ ...prev, supabaseReady: true, progress: "Ready" }));
      
      // Check current session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          updateUser(session.user);
          loadLastProject();
        }
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          updateUser(session.user);
        } else {
          setState(prev => ({ ...prev, user: null }));
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const updateUser = (sbUser: any) => {
    const profile: UserProfile = {
      id: sbUser.id,
      email: sbUser.email || '',
      full_name: sbUser.user_metadata?.full_name,
      avatar_url: sbUser.user_metadata?.avatar_url
    };
    setState(prev => ({ ...prev, user: profile }));
  };

  const loadLastProject = async () => {
    const results = await SupabaseService.getLatestProject();
    if (results) setState(prev => ({ ...prev, analysisResults: results }));
  };

  const handleSupabaseLogin = async () => {
    try {
      await SupabaseService.loginWithGoogle();
    } catch (err: any) {
      setState(prev => ({ ...prev, error: "Supabase Connection Error: " + err.message }));
      // Only show settings if not configured via Env
      if (!isEnvConfigured) setShowSettings(true);
    }
  };

  const saveConfig = () => {
    if (isEnvConfigured) return; // Prevent editing if env vars are set
    localStorage.setItem('supabase_url', sbConfig.url);
    localStorage.setItem('supabase_anon_key', sbConfig.key);
    setShowSettings(false);
    window.location.reload();
  };

  const handleUpload = async (file: File, frames: string[]) => {
    setState(prev => ({ 
      ...prev, 
      isAnalyzing: true, 
      videoUrl: URL.createObjectURL(file),
      progress: "SCANNING_FRAMES",
      error: null
    }));

    try {
      const results = await analyzeVideoContent({ name: file.name, size: file.size, type: file.type }, frames);
      setState(prev => ({ 
        ...prev, 
        isAnalyzing: false, 
        analysisResults: results,
        progress: "FACTORY_COMPLETE"
      }));
      
      // Sync to Supabase
      if (state.user) {
        await SupabaseService.saveProject(results);
      }
    } catch (err: any) {
      setState(prev => ({ ...prev, isAnalyzing: false, error: err.message, progress: "ERROR" }));
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header / Real-time Status */}
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
             <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
             </svg>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter italic uppercase leading-none">
              Shorts<span className="text-blue-500">Factory</span> <span className="text-[10px] not-italic bg-white/10 px-1.5 py-0.5 rounded text-white/50">RT-v2.5</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full animate-pulse ${state.supabaseReady ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">System: {state.progress}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {state.user ? (
            <div className="flex items-center gap-3 bg-white/5 pl-1 pr-4 py-1 rounded-full border border-white/10">
               <img src={state.user.avatar_url} className="w-8 h-8 rounded-full border border-blue-500/50" alt="User" />
               <span className="text-xs font-bold truncate max-w-[100px]">{state.user.full_name}</span>
               <button onClick={() => initSupabase()?.auth.signOut()} className="text-[10px] font-black text-red-400/60 hover:text-red-400">LOGOUT</button>
            </div>
          ) : (
            <button 
              onClick={handleSupabaseLogin}
              className="px-4 py-2 bg-white text-black text-xs font-black rounded-full hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.94l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              GMAIL LOGIN
            </button>
          )}
          
          <button onClick={() => setShowSettings(true)} className={`p-2 transition-colors ${isEnvConfigured ? 'text-green-500' : 'text-slate-500 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-12">
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <div className="glass-panel max-w-md w-full p-8 rounded-3xl space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                Supabase Config 
                {isEnvConfigured && <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-1 rounded-full">ENV ACTIVE</span>}
              </h2>
              
              {isEnvConfigured ? (
                 <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                   <p className="text-green-400 text-xs font-bold text-center">
                     Configuration loaded securely from Vercel Environment Variables.
                   </p>
                 </div>
              ) : (
                <div className="space-y-4">
                  <input type="text" value={sbConfig.url} onChange={e => setSbConfig({...sbConfig, url: e.target.value})} placeholder="Supabase URL" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-xs" />
                  <input type="text" value={sbConfig.key} onChange={e => setSbConfig({...sbConfig, key: e.target.value})} placeholder="Anon Key" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-xs" />
                  <button onClick={saveConfig} className="w-full py-3 bg-blue-600 rounded-xl font-bold">SAVE & RELOAD</button>
                </div>
              )}
              
              <button onClick={() => setShowSettings(false)} className="w-full py-2 text-slate-500">Close</button>
            </div>
          </div>
        )}

        {!state.analysisResults && !state.isAnalyzing && (
          <div className="text-center py-20 animate-fade-in">
             <h2 className="text-7xl font-black tracking-tighter leading-none mb-6">
               <span className="gradient-text">MASS-PRODUCE</span> VIRAL SHORTS.
             </h2>
             <p className="text-slate-400 text-lg max-w-xl mx-auto mb-12">
               Upload your video and let Gemini AI analyze, crop, and script your next 5 viral hits with real-time cloud sync.
             </p>
             <VideoUploader onUpload={handleUpload} isProcessing={state.isAnalyzing} />
          </div>
        )}

        {state.isAnalyzing && (
          <div className="py-20 text-center space-y-8">
            <div className="w-32 h-32 mx-auto relative">
               <div className="absolute inset-0 border-[8px] border-blue-500/20 rounded-full"></div>
               <div className="absolute inset-0 border-[8px] border-blue-500 rounded-full border-t-transparent animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center text-blue-500 font-black text-2xl">AI</div>
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black italic">{state.progress}</h3>
              <p className="text-slate-500 uppercase tracking-widest text-[10px] font-bold">Extraction in progress...</p>
            </div>
          </div>
        )}

        {state.analysisResults && (
          <div className="space-y-12 animate-fade-in">
            <div className="flex items-center justify-between bg-white/5 p-6 rounded-3xl border border-white/10">
               <div className="flex gap-10">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Viral Potential</p>
                    <p className="text-3xl font-black gradient-text">{state.analysisResults.video_analysis.viral_potential}/10</p>
                  </div>
                  <div className="max-w-md">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Trend Insight</p>
                    <p className="text-xs text-slate-300 italic">"{state.analysisResults.video_analysis.trend_reasoning}"</p>
                  </div>
               </div>
               <button onClick={() => setState(prev => ({...prev, analysisResults: null}))} className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest">New Session</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
               {state.analysisResults.best_clips.map(clip => (
                 <ClipCard 
                   key={clip.id} 
                   clip={clip} 
                   caption={state.analysisResults?.captions.find(c => c.clip_id === clip.id)}
                   thumbnail={state.analysisResults?.thumbnails.find(t => t.clip_id === clip.id)}
                   videoUrl={state.videoUrl}
                   youtubeToken={state.youtubeToken}
                   onConnectYouTube={() => {}} 
                 />
               ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
