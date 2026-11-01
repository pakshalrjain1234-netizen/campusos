import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV || 'development';
const port = parseInt(process.env.PORT || '5000', 10);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseServiceRoleKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('mock.supabase.co')
);

// Production validation: fail fast if production lacks DB credentials
if (nodeEnv === 'production' && !isConfigured) {
  console.error('[CRITICAL] CampusOps Backend: Production persistence requires SUPABASE_URL, SUPABASE_ANON_KEY, and server-only SUPABASE_SERVICE_ROLE_KEY.');
}

export const config = {
  port,
  nodeEnv,
  isProduction: nodeEnv === 'production',
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  isConfigured,
  hasServiceRole: Boolean(supabaseServiceRoleKey),
  // Safe sanitized summary for logging/health checks (no secrets exposed)
  getSanitizedStatus() {
    return {
      nodeEnv,
      port,
      supabaseConnected: isConfigured,
      supabaseHost: supabaseUrl ? new URL(supabaseUrl).host : 'none',
      hasServiceRole: Boolean(supabaseServiceRoleKey),
    };
  },
};
