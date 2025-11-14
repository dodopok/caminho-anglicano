import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'
import { rateLimit, RateLimits } from '~/layers/admin/server/utils/rateLimit'
import { logAudit, AuditAction, getAdminEmail } from '~/layers/admin/server/utils/auditLog'
import { sanitizeForLog } from '~/layers/admin/server/utils/sanitization'

type ChurchSubmission = Database['public']['Tables']['church_submissions']['Row']
type Church = Database['public']['Tables']['churches']['Row']

export default defineEventHandler(async (event) => {
  // Ensure user is admin
  await requireAdmin(event)

  // Apply rate limiting (geocoding is expensive)
  await rateLimit(event, RateLimits.GEOCODING)

  const config = useRuntimeConfig()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Submission ID is required',
    })
  }

  // Create Supabase client
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )

  try {
    // 1. Get the submission
    const { data: submission, error: fetchError } = await supabase
      .from('church_submissions')
      .select('*')
      .eq('id', id)
      .single<ChurchSubmission>()

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

    // 2. Geocode the address
    const geocodeResult = await geocodeAddress(submission.address)

    // 3. Find jurisdiction ID
    const jurisdictionId = await findJurisdictionId(submission.jurisdiction)

    if (!jurisdictionId) {
      throw createError({
        statusCode: 400,
        message: `Jurisdiction "${submission.jurisdiction}" not found. Please update the submission with a valid jurisdiction.`,
      })
    }

    // 4. Transform submission to church format
    const churchData = await transformSubmission(submission, {
      geocodeResult,
      jurisdictionId,
    })

    // 5. Insert into churches table
    const { data: newChurch, error: insertError } = await supabase
      .from('churches')
      .insert(churchData as never)
      .select()
      .single<Church>()

    if (insertError) {
      throw insertError
    }

    // 6. Update submission status
    const { error: updateError } = await supabase
      .from('church_submissions')
      .update({
        status: 'approved' as const,
        reviewed_at: new Date().toISOString()
      } as never)
      .eq('id', id)

    if (updateError) {
      // Rollback: delete the inserted church
      if (newChurch?.id) {
        await supabase.from('churches').delete().eq('id', newChurch.id)
      }
      throw updateError
    }

    // Log audit trail
    const adminEmail = await getAdminEmail(event)
    await logAudit(event, {
      action: AuditAction.SUBMISSION_APPROVED,
      resource_type: 'submission',
      resource_id: id,
      admin_email: adminEmail,
      metadata: {
        church_id: newChurch?.id,
        church_name: submission.name,
      },
    })

    return {
      success: true,
      church: newChurch,
      message: 'Submission approved and church created successfully',
    }
  }
  catch (error: unknown) {
    console.error('Error approving submission:', sanitizeForLog(error))

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to approve submission',
    })
  }
})
