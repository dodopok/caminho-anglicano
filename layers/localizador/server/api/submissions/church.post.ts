import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { ChurchSubmissionSchema } from '~/layers/admin/server/utils/validation'
import { rateLimit, RateLimits } from '~/layers/admin/server/utils/rateLimit'
import { sanitizeForLog } from '~/layers/admin/server/utils/sanitization'
import { sendTelegramNotification, type ChurchSubmissionData } from '~/layers/admin/server/utils/telegram'

export default defineEventHandler(async (event) => {
  // Apply strict rate limiting for public submissions
  await rateLimit(event, RateLimits.PUBLIC_SUBMIT)

  const config = useRuntimeConfig()
  const body = await readBody(event)

  // Validate input data with Zod schema
  let validatedData: z.infer<typeof ChurchSubmissionSchema>
  try {
    validatedData = ChurchSubmissionSchema.parse(body)
  }
  catch (error: unknown) {
    throw createError({
      statusCode: 400,
      message: 'Dados inválidos',
      data: error instanceof z.ZodError ? error.issues : undefined,
    })
  }

  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.supabaseServiceKey as string,
  )

  try {
    const result = await supabase
      .from('church_submissions')
      .insert({
        jurisdiction: validatedData.jurisdiction,
        name: validatedData.name,
        address: validatedData.address,
        schedules: validatedData.schedules || null,
        description: validatedData.description || null,
        pastors: validatedData.pastors || null,
        responsible_email: validatedData.responsibleEmail,
        website: validatedData.website || null,
        instagram: validatedData.instagram || null,
        youtube: validatedData.youtube || null,
        spotify: validatedData.spotify || null,
        status: 'pending',
      })
      .select()
      .single()

    const { data, error } = result as { data: unknown; error: unknown }

    if (error) {
      throw error
    }

    // Envia notificação para o Telegram (não bloqueia o fluxo principal)
    if (data) {
      sendTelegramNotification('church_submission', data as ChurchSubmissionData).catch((err) => {
        console.error('Erro ao enviar notificação do Telegram:', err)
      })
    }

    return {
      success: true,
      data,
    }
  }
  catch (error) {
    console.error('Error submitting church:', sanitizeForLog(error))

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Erro ao enviar submissão',
    })
  }
})
