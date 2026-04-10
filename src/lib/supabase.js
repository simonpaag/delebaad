import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bryekgvqzzunqaqndzyh.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyeWVrZ3Zxenp1bnFhcW5kenloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzY3NzIsImV4cCI6MjA5MDIxMjc3Mn0.VKGgsQC6pCHgdIriEzFdXKowm00PYUWFrMH1PROXv-4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
