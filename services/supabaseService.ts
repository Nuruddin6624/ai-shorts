
import { createClient } from '@supabase/supabase-js';

// Configuration helper: Checks Environment Variables first (Vercel/Vite/Next), then LocalStorage
export const getSupabaseConfig = () => {
  // Support for various build tools (Standard, Next.js, Vite)
  const envUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const envKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

  if (envUrl && envKey) {
    return { url: envUrl, key: envKey, source: 'env' };
  }

  return {
    url: localStorage.getItem('supabase_url') || '',
    key: localStorage.getItem('supabase_anon_key') || '',
    source: 'local'
  };
};

export const initSupabase = () => {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return null;
  return createClient(url, key);
};

export class SupabaseService {
  static async loginWithGoogle() {
    const supabase = initSupabase();
    if (!supabase) throw new Error("Supabase not configured");
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'select_account'
        }
      }
    });
    
    if (error) throw error;
    return data;
  }

  static async saveProject(results: any) {
    const supabase = initSupabase();
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('shorts_projects')
      .upsert({
        user_id: user.id,
        results: results,
        updated_at: new Date()
      });

    if (error) console.error("Error saving to Supabase", error);
  }

  static async getLatestProject() {
    const supabase = initSupabase();
    if (!supabase) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('shorts_projects')
      .select('results')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data?.results;
  }
}
