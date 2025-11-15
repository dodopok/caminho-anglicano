import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'
import { BulkApprovalSchema } from '~/layers/admin/server/utils/validation'
import { rateLimit, RateLimits } from '~/layers/admin/server/utils/rateLimit'
import { logAudit, AuditAction, getAdminEmail } from '~/layers/admin/server/utils/auditLog'
import { sanitizeForLog } from '~/layers/admin/server/utils/sanitization'

type BulkSubmission = Database['public']['Tables']['bulk_church_submissions']['Row']

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
      message: 'Bulk submission ID is required',
    })
  }

  // Validate input
  let validatedData: z.infer<typeof BulkApprovalSchema>
  try {
    validatedData = BulkApprovalSchema.parse(body)
  }
  catch (error: unknown) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input data',
      data: error instanceof z.ZodError ? error.issues : undefined,
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
      .from('bulk_church_submissions')
      .select('status')
      .eq('id', id)
      .single<Pick<BulkSubmission, 'status'>>()

    if (fetchError || !submission) {
      throw createError({
        statusCode: 404,
        message: 'Bulk submission not found',
      })
    }

    // Check if already processed
    if (submission.status !== 'pending') {
      throw createError({
        statusCode: 400,
        message: `Bulk submission already ${submission.status}`,
      })
    }

    // Update submission status to rejected
    const { data, error } = await supabase
      .from('bulk_church_submissions')
      .update({
        status: 'rejected' as const,
        reviewed_at: new Date().toISOString(),
        review_notes: validatedData.review_notes,
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
      action: AuditAction.BULK_SUBMISSION_REJECTED,
      resource_type: 'bulk_submission',
      resource_id: id,
      admin_email: adminEmail,
      metadata: {
        review_notes: validatedData.review_notes,
      },
    })

    return {
      success: true,
      submission: data,
      message: 'Bulk submission rejected successfully',
    }
  }
  catch (error: unknown) {
    console.error('Error rejecting bulk submission:', sanitizeForLog(error))

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to reject bulk submission',
    })
  }
})
