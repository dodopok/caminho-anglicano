import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  // Validação básica
  if (!body.bulkData || typeof body.bulkData !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Dados em formato inválido'
    })
  }

  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string
  )

  try {
    const result = await supabase
      .from('bulk_church_submissions')
      .insert({
        bulk_data: body.bulkData,
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
    console.error('Error submitting bulk churches:', error)
    throw createError({
      statusCode: 500,
      message: 'Erro ao enviar submissão em lote'
    })
  }
})
