import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string
  )

  const { data, error } = await client
    .from('liturgy_service_types')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }

  return data
})
