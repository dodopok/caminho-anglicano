import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'
import { rateLimit, RateLimits } from '~/layers/admin/server/utils/rateLimit'
import { logAudit, AuditAction, getAdminEmail } from '~/layers/admin/server/utils/auditLog'
import { sanitizeForLog } from '~/layers/admin/server/utils/sanitization'

type ChurchSubmission = Database['public']['Tables']['church_submissions']['Row']

export default defineEventHandler(async (event) => {
  // Ensure user is admin
  await requireAdmin(event)

  // Apply rate limiting
  await rateLimit(event, RateLimits.ADMIN_WRITE)

  const config = useRuntimeConfig()
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Submission ID is required',
    })
  }

  if (!body.review_notes) {
    throw createError({
      statusCode: 400,
      message: 'Review notes are required for rejection',
    })
  }

  // Create Supabase client
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )

  try {
    // Get the submission first to check status
    const { data: submission, error: fetchError } = await supabase
      .from('church_submissions')
      .select('status')
      .eq('id', id)
      .single<Pick<ChurchSubmission, 'status'>>()

    if (fetchError || !submission) {
      throw createError({
        statusCode: 404,
        message: 'Submission not found',
      })
    }

    // Check if already processed
    if (submission.status !== 'pending') {
      throw createError({
        statusCode: 400,
        message: `Submission already ${submission.status}`,
      })
    }

    // Update submission status to rejected
    const { data, error } = await supabase
      .from('church_submissions')
      .update({
        status: 'rejected' as const,
        reviewed_at: new Date().toISOString(),
        review_notes: body.review_notes,
      } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Log audit trail
    const adminEmail = await getAdminEmail(event)
    await logAudit(event, {
      action: AuditAction.SUBMISSION_REJECTED,
      resource_type: 'submission',
      resource_id: id,
      admin_email: adminEmail,
      metadata: {
        review_notes: body.review_notes,
      },
    })

    return {
      success: true,
      submission: data,
      message: 'Submission rejected successfully',
    }
  }
  catch (error: any) {
    console.error('Error rejecting submission:', sanitizeForLog(error))

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to reject submission',
    })
  }
})
