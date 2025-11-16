import { serverSupabaseClient } from '#supabase/server'
import { sendWhatsAppBulk } from '../../../../utils/whatsapp'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const id = getRouterParam(event, 'id')
  const config = useRuntimeConfig()

  // Get service with schedules and people
  const { data: service, error } = await client
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

  if (error || !service) {
    throw createError({
      statusCode: 404,
      message: 'Serviço não encontrado'
    })
  }

  // Check if Evolution API is configured
  const evolutionApiUrl = config.evolutionApiUrl as string | undefined
  const evolutionApiKey = config.evolutionApiKey as string | undefined
  const evolutionInstance = config.evolutionInstanceName as string | undefined

  if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstance) {
    throw createError({
      statusCode: 500,
      message: 'Evolution API não configurada. Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME no .env'
    })
  }

  const evolutionConfig = {
    apiUrl: evolutionApiUrl,
    apiKey: evolutionApiKey,
    instanceName: evolutionInstance
  }

  // Prepare messages
  const messages = service.schedules
    ?.filter((schedule) => schedule.person?.whatsapp && !schedule.notified)
    .map((schedule) => {
      const person = schedule.person!
      const ministry = schedule.ministry!

      // Format date
      const serviceDate = new Date(service.service_date + 'T12:00:00')
      const dateStr = serviceDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })

      const timeStr = service.service_time ? `às ${service.service_time.substring(0, 5)}` : ''

      // Build message
      const message = `
🙏 *Escala de Ministério - ${service.liturgical_week || 'Culto'}*

Olá ${person.name}!

Você foi escalado(a) para:
📋 *Ministério:* ${ministry.name}
📅 *Data:* ${dateStr} ${timeStr}
⛪ *Tipo:* ${service.service_type?.name || 'Culto'}

${service.liturgical_season ? `🎨 *Tempo Litúrgico:* ${service.liturgical_season}` : ''}

Por favor, confirme sua presença respondendo esta mensagem.

Se não puder comparecer, avise o quanto antes para encontrarmos um substituto.

Obrigado! 🙌
`.trim()

      return {
        number: person.whatsapp!,
        message,
        scheduleId: schedule.id
      }
    }) || []

  if (messages.length === 0) {
    return {
      success: true,
      message: 'Nenhuma notificação para enviar (todos já foram notificados ou não têm WhatsApp cadastrado)',
      sent: 0,
      failed: 0
    }
  }

  // Send messages
  const results = await sendWhatsAppBulk(
    evolutionConfig,
    messages.map(m => ({ number: m.number, message: m.message }))
  )

  // Update notification status for successful sends
  const successfulScheduleIds = results
    .map((result, index) => result.success ? messages[index].scheduleId : null)
    .filter((id): id is string => id !== null)

  if (successfulScheduleIds.length > 0) {
    await client
      .from('liturgy_schedules')
      .update({
        notified: true,
        notified_at: new Date().toISOString()
      })
      .in('id', successfulScheduleIds)
  }

  // Count results
  const sent = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  return {
    success: true,
    message: `${sent} notificação(ões) enviada(s), ${failed} falha(s)`,
    sent,
    failed,
    details: results.map((result, index) => ({
      number: messages[index].number,
      success: result.success,
      error: result.error
    }))
  }
})
