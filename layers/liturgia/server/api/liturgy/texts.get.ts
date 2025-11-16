import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string
  )
  const query = getQuery(event)

  let queryBuilder = client
    .from('liturgy_texts')
    .select('*')
    .order('category', { ascending: true })
    .order('display_order', { ascending: true })

  if (query.category) {
    queryBuilder = queryBuilder.eq('category', query.category as string)
  }

  if (query.active === 'true') {
    queryBuilder = queryBuilder.eq('is_active', true)
  }

  const { data, error } = await queryBuilder

  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }

  return data
})
