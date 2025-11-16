import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string
  )
  const id = getRouterParam(event, 'id')

  const { error } = await client
    .from('liturgy_people')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }

  return { success: true }
})
