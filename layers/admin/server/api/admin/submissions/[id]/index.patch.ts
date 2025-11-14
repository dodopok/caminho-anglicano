import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'
import { SubmissionUpdateSchema } from '~/layers/admin/server/utils/validation'
import { rateLimit, RateLimits } from '~/layers/admin/server/utils/rateLimit'
import { logAudit, AuditAction, getAdminEmail } from '~/layers/admin/server/utils/auditLog'
import { sanitizeForLog } from '~/layers/admin/server/utils/sanitization'

type ChurchSubmissionUpdate = Database['public']['Tables']['church_submissions']['Update']

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

  // Validate and sanitize input - prevents mass assignment
  let validatedData: any
  try {
    validatedData = SubmissionUpdateSchema.parse(body)
  }
  catch (error: any) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input data',
      data: error.errors,
    })
  }

  // Create Supabase client
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )

  try {
    // Only allow updating specific fields (whitelist approach)
    const updateData: Partial<ChurchSubmissionUpdate> = {}

    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.address !== undefined) updateData.address = validatedData.address
    if (validatedData.jurisdiction !== undefined) updateData.jurisdiction = validatedData.jurisdiction
    if (validatedData.responsible_email !== undefined) updateData.responsible_email = validatedData.responsible_email
    if (validatedData.schedules !== undefined) updateData.schedules = validatedData.schedules
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.pastors !== undefined) updateData.pastors = validatedData.pastors
    if (validatedData.website !== undefined) updateData.website = validatedData.website
    if (validatedData.instagram !== undefined) updateData.instagram = validatedData.instagram
    if (validatedData.youtube !== undefined) updateData.youtube = validatedData.youtube
    if (validatedData.spotify !== undefined) updateData.spotify = validatedData.spotify
    if (validatedData.status !== undefined) updateData.status = validatedData.status as any
    if (validatedData.review_notes !== undefined) updateData.review_notes = validatedData.review_notes

    const { data, error } = await supabase
      .from('church_submissions')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Log audit trail
    const adminEmail = await getAdminEmail(event)
    await logAudit(event, {
      action: AuditAction.SUBMISSION_UPDATED,
      resource_type: 'submission',
      resource_id: id,
      admin_email: adminEmail,
      metadata: {
        updated_fields: Object.keys(updateData),
      },
    })

    return data
  }
  catch (error: unknown) {
    console.error('Error updating submission:', sanitizeForLog(error))

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to update submission',
    })
  }
})
