import { createClient } from '@supabase/supabase-js';

const urlSupabase = import.meta.env.VITE_SUPABASE_URL || '';
const claveAnonimaSupabase = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const clienteSupabase = createClient(urlSupabase, claveAnonimaSupabase);
