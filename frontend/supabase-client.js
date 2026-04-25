// ── Supabase client configuration ────────────────────────────
// This file connects your frontend directly to Supabase
// It handles auth, database reads, and real-time updates

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Your Supabase project credentials
// These are SAFE to put in frontend code — they are public keys
// Security is enforced by Row Level Security (RLS) in Supabase
const SUPABASE_URL  = 'https://vtadskpcatmsgvngefbg.supabase.co';
const SUPABASE_ANON = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0YWRza3BjYXRtc2d2bmdlZmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDEyNzMsImV4cCI6MjA5MjQ3NzI3M30.QWF_g3T07JoYHmV1UcBRS6JBrT97_qISO5frfyLchz0;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);