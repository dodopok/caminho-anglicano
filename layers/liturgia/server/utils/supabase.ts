import { createClient } from '@supabase/supabase-js'

export function getSupabaseClient() {
  const config = useRuntimeConfig()

  return createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string
  )
}
