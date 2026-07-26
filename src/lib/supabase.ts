/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  const localUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('custom_supabase_url') || '' : '';
  const localKey = typeof localStorage !== 'undefined' ? localStorage.getItem('custom_supabase_key') || '' : '';

  let url = (localUrl || envUrl).trim();
  const key = (localKey || envKey).trim();

  // If previous broken URL is stored, auto-correct to active project URL
  if (url.includes('oaiqcswlhvjdcadhxijr')) {
    url = 'https://yoditrjvnncxiaakgtnf.supabase.co';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('custom_supabase_url', url);
    }
  }

  if (!url) {
    url = 'https://yoditrjvnncxiaakgtnf.supabase.co';
  }

  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  url = url.replace(/\/+$/, '');

  return {
    url: url || 'https://placeholder.supabase.co',
    key: key || 'placeholder',
    isConfigured: Boolean(url && key && !url.includes('placeholder'))
  };
};

export const getConfig = getSupabaseConfig;

const config = getSupabaseConfig();

export const supabase = createClient(
  config.url,
  config.key
);

