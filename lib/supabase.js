import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ✅ AGGIUNGIAMO SOLO LA CONFIGURAZIONE AUTH
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,      // ← FIX: Auto-refresh quando scade
    persistSession: true,         // ← FIX: Salva in localStorage
    detectSessionInUrl: true,     // ← Rileva sessione da URL
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
})
