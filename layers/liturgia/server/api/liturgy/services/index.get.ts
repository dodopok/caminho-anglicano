import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const query = getQuery(event)

  let queryBuilder = client
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
    .order('service_date', { ascending: false })

  // Filtros
  if (query.startDate) {
    queryBuilder = queryBuilder.gte('service_date', query.startDate as string)
  }

  if (query.endDate) {
    queryBuilder = queryBuilder.lte('service_date', query.endDate as string)
  }

  if (query.status) {
    queryBuilder = queryBuilder.eq('status', query.status as string)
  }

  if (query.serviceTypeId) {
    queryBuilder = queryBuilder.eq('service_type_id', query.serviceTypeId as string)
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
