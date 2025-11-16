import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string
  )
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  // Separar schedules do resto dos dados
  const { schedules, ...serviceData } = body

  // Atualizar o serviço
  const { error: serviceError } = await client
    .from('liturgy_services')
    .update(serviceData)
    .eq('id', id)
    .select()
    .single()

  if (serviceError) {
    throw createError({
      statusCode: 500,
      message: serviceError.message
    })
  }

  // Se houver schedules, deletar as antigas e criar novas
  if (schedules) {
    // Deletar escalas antigas
    await client
      .from('liturgy_schedules')
      .delete()
      .eq('service_id', id)

    // Criar novas escalas
    if (schedules.length > 0) {
      const schedulesData = schedules.map((schedule: { ministry_id: string; person_id: string }) => ({
        ...schedule,
        service_id: id
      }))

      const { error: schedulesError } = await client
        .from('liturgy_schedules')
        .insert(schedulesData)

      if (schedulesError) {
        throw createError({
          statusCode: 500,
          message: schedulesError.message
        })
      }
    }
  }

  // Buscar serviço completo com relações
  const { data: fullService } = await client
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

  return fullService
})
