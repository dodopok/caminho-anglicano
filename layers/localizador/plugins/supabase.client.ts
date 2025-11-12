import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const supabaseUrl = config.public.supabaseUrl
  const supabaseAnonKey = config.public.supabaseAnonKey

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be provided')
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

  return {
    provide: {
      supabase
    }
  }
})
