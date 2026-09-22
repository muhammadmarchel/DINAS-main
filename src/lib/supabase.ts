import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL atau Anon Key belum ditemukan di file environment (.env).');
}

export const supabase = createClient(
  supabaseUrl || 'https://woifpptidyicmtmtpiuf.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWZwcHRpZHlpY210bXRwaXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NTk1ODIsImV4cCI6MjEwNTUzNTU4Mn0.l6Mvd9GKVuATa23LBJll5Cdvy97FtT_dB6H-ABZB4Mg'
);
