import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  // Validação básica
  if (!body.name || !body.address || !body.responsibleEmail || !body.jurisdiction) {
    throw createError({
      statusCode: 400,
      message: 'Dados obrigatórios faltando'
    })
  }

  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string
  )

  try {
    const result = await supabase
      .from('church_submissions')
      .insert({
        jurisdiction: body.jurisdiction,
        name: body.name,
        address: body.address,
        schedules: body.schedules || null,
        description: body.description || null,
        pastors: body.pastors || null,
        responsible_email: body.responsibleEmail,
        website: body.website || null,
        instagram: body.instagram || null,
        youtube: body.youtube || null,
        spotify: body.spotify || null,
        status: 'pending'
      })
      .select()
      .single()

    const { data, error } = result as { data: unknown; error: unknown }

    if (error) {
      throw error
    }

    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('Error submitting church:', error)
    throw createError({
      statusCode: 500,
      message: 'Erro ao enviar submissão'
    })
  }
})
