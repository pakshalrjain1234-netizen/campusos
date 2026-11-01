import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getMetaEnv = (): Record<string, any> | null => {
  try {
    return Function('return typeof import.meta !== "undefined" ? import.meta.env : null')();
  } catch {
    return null;
  }
};

const metaEnv = getMetaEnv();

const getEnvVar = (key: string): string => {
  if (metaEnv && metaEnv[key]) {
    return metaEnv[key];
  }
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key] || '';
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
const isExplicitDemo = getEnvVar('VITE_DEMO_MODE') === 'true';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('mock.supabase.co')
);

// Determine if running in demo mode
export const isDemoModeActive = isExplicitDemo || !isSupabaseConfigured;

// In production, log an explicit warning if Supabase is not configured
const isProd = Boolean(metaEnv?.PROD || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'));
if (isProd && !isSupabaseConfigured) {
  console.warn(
    '[CampusOps Security Warning] Supabase credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not configured. Application is operating in offline demo mode. Persistence is disabled.'
  );
}

/**
 * Standard frontend Supabase client.
 * Uses only VITE_SUPABASE_ANON_KEY.
 * Service-role keys are strictly forbidden in client-side code.
 */
let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase: SupabaseClient = clientInstance as SupabaseClient;

export function getSupabaseClient(): SupabaseClient {
  return supabase;
}
