import { createClient } from '@supabase/supabase-js'
import { BulkChurchDataSchema } from '~/layers/admin/server/utils/validation'
import { rateLimit, RateLimits } from '~/layers/admin/server/utils/rateLimit'
import { sanitizeForLog } from '~/layers/admin/server/utils/sanitization'

export default defineEventHandler(async (event) => {
  // Apply strict rate limiting for public bulk submissions (even stricter)
  await rateLimit(event, {
    maxRequests: 3,
    windowMs: 10 * 60 * 1000, // 3 requests per 10 minutes
    message: 'Too many bulk submissions. Please try again later.',
  })

  const config = useRuntimeConfig()
  const body = await readBody(event)

  // Validate that bulkData is a string
  if (!body.bulkData || typeof body.bulkData !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Dados em formato inválido',
    })
  }

  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string,
  )

  try {
    const result = await supabase
      .from('bulk_church_submissions')
      .insert({
        bulk_data: body.bulkData,
        status: 'pending',
      })
      .select()
      .single()

    const { data, error } = result as { data: unknown; error: unknown }

    if (error) {
      throw error
    }

    return {
      success: true,
      data,
    }
  }
  catch (error) {
    console.error('Error submitting bulk churches:', sanitizeForLog(error))

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Erro ao enviar submissão em lote',
    })
  }
})
