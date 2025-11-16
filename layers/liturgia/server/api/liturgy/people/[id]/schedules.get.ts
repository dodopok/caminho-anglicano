import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string
  )
  const personId = getRouterParam(event, 'id')
  const query = getQuery(event)

  // Filter: upcoming, past, or all
  const filter = query.filter as string || 'upcoming'

  let queryBuilder = client
    .from('liturgy_schedules')
    .select(`
      *,
      service:liturgy_services(
        *,
        service_type:liturgy_service_types(*)
      ),
      ministry:liturgy_ministries(*)
    `)
    .eq('person_id', personId)
    .order('service(service_date)', { ascending: filter === 'past' ? false : true })

  // Apply date filter
  const today = new Date().toISOString().split('T')[0]

  if (filter === 'upcoming') {
    queryBuilder = queryBuilder.gte('service.service_date', today)
  } else if (filter === 'past') {
    queryBuilder = queryBuilder.lt('service.service_date', today)
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
