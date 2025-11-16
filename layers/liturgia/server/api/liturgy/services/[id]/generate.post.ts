import { serverSupabaseClient } from '#supabase/server'
import { generateLiturgyHTML } from '../../../../utils/generate-liturgy-document'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const format = body.format || 'html' // html, docx, pdf

  // Buscar serviço completo
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

  // Buscar textos litúrgicos padrão (se houver)
  const { data: texts } = await client
    .from('liturgy_texts')
    .select('*')
    .eq('is_default', true)

  const textsMap: Record<string, string> = {}
  if (texts) {
    texts.forEach((text) => {
      textsMap[text.category] = text.content
    })
  }

  // Gerar HTML
  const html = generateLiturgyHTML({
    service,
    texts: {
      confession: textsMap.confession,
      absolution: textsMap.absolution,
      eucharisticPrayer: textsMap.eucharistic_prayer,
      creed: textsMap.creed,
      blessing: textsMap.blessing,
      dismissal: textsMap.dismissal
    }
  })

  if (format === 'html') {
    // Retornar HTML para exibição/preview
    setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
    return html
  }

  if (format === 'docx') {
    // TODO: Implementar geração DOCX real com biblioteca 'docx'
    // Por enquanto, retornar HTML que pode ser salvo como .doc
    const filename = `liturgia-${service.service_date}.doc`
    setHeader(event, 'Content-Type', 'application/msword')
    setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
    return html
  }

  if (format === 'pdf') {
    // TODO: Implementar geração PDF com puppeteer ou jsPDF
    // Por enquanto, retornar HTML para impressão
    throw createError({
      statusCode: 501,
      message: 'Geração de PDF ainda não implementada. Use a opção de impressão do navegador.'
    })
  }

  throw createError({
    statusCode: 400,
    message: 'Formato inválido. Use: html, docx ou pdf'
  })
})
