
export interface VideoAnalysis {
  duration: number;
  main_topic: string;
  primary_emotion: string;
  viral_potential: number;
  trend_reasoning: string; // New: AI explanation of trend
}

export interface Hashtags {
  bn: string[];
  en: string[];
}

export interface Caption {
  clip_id: number;
  bn_main: string;
  en_sub: string;
  hashtags: Hashtags;
  voiceover_script: string; // New: AI suggested script
  vfx_suggestions: string; // New: AI instructions for zooms/overlays
}

export interface BestClip {
  id: number;
  start: number;
  end: number;
  duration: number;
  hook: string;
  reason: string;
  energy: string;
}

/** 
 * Interface for thumbnail metadata associated with a clip.
 * Added to fix the import error in ClipCard.tsx.
 */
export interface Thumbnail {
  clip_id: number;
  description: string;
}

export interface ShortsFactoryResponse {
  video_analysis: VideoAnalysis;
  best_clips: BestClip[];
  captions: Caption[];
  thumbnails: Thumbnail[];
  seo: {
    titles: string[];
    best_time: string;
    tags: string[];
  };
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface AppState {
  user: UserProfile | null;
  isAnalyzing: boolean;
  videoUrl: string | null;
  analysisResults: ShortsFactoryResponse | null;
  error: string | null;
  progress: string;
  isYouTubeConnected: boolean;
  youtubeToken: string | null;
  supabaseReady: boolean;
}
