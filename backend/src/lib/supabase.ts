import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

export const supabaseAdmin = config.supabaseServiceKey
  ? createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

export const supabaseAnon = config.supabaseAnonKey
  ? createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;
