import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '__CLOUD_SUPABASE_URL__'
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '__CLOUD_SUPABASE_ANON_KEY__'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
