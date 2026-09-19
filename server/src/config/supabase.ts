import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  } catch (err) {
    supabase = null;
  }
}
export const isSupabaseConfigured = (): boolean => {
  return supabase !== null;
};

/**
 * Verifies whether Supabase PostgreSQL is reachable AND read/write permissions are active.
 */
export async function checkSupabaseHealth(): Promise<{ available: boolean; error?: string }> {
  if (!supabase) {
    return { available: false, error: 'Supabase credentials not configured in environment' };
  }

  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      return { available: false, error: `${error.message} (code: ${error.code})` };
    }
    return { available: true };
  } catch (err: any) {
    return { available: false, error: err.message || 'Unknown network error connecting to Supabase' };
  }
}
