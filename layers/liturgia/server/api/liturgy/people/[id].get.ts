import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string
  )
  const id = getRouterParam(event, 'id')

  const { data, error } = await client
    .from('liturgy_people')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw createError({
      statusCode: 404,
      message: 'Pessoa não encontrada'
    })
  }

  return data
})
