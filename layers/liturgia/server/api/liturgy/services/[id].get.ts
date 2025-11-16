import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string
  )
  const id = getRouterParam(event, 'id')

  const { data, error } = await client
    .from('liturgy_services')
    .select(`
      *,
      service_type:liturgy_service_types(*),
      schedules:liturgy_schedules(
        *,
        ministry:liturgy_ministries(*),
        person:liturgy_people(*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    throw createError({
      statusCode: 404,
      message: 'Serviço não encontrado'
    })
  }

  return data
})
