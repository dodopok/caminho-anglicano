import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string
  )
  const body = await readBody(event)

  // Separar schedules do resto dos dados
  const { schedules, ...serviceData } = body

  // Criar o serviço
  const { data: service, error: serviceError } = await client
    .from('liturgy_services')
    .insert(serviceData)
    .select()
    .single()

  if (serviceError) {
    throw createError({
      statusCode: 500,
      message: serviceError.message
    })
  }

  // Criar as escalas se existirem
  if (schedules && schedules.length > 0) {
    const schedulesData = schedules.map((schedule: { ministry_id: string; person_id: string }) => ({
      ...schedule,
      service_id: service.id
    }))

    const { error: schedulesError } = await client
      .from('liturgy_schedules')
      .insert(schedulesData)

    if (schedulesError) {
      // Se falhar ao criar escalas, deletar o serviço criado
      await client.from('liturgy_services').delete().eq('id', service.id)

      throw createError({
        statusCode: 500,
        message: schedulesError.message
      })
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
    .eq('id', service.id)
    .single()

  return fullService
})
