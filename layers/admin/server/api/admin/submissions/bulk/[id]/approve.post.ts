import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'
import { BulkChurchDataSchema } from '~/layers/admin/server/utils/validation'
import { rateLimit, RateLimits } from '~/layers/admin/server/utils/rateLimit'
import { logAudit, AuditAction, getAdminEmail } from '~/layers/admin/server/utils/auditLog'
import { sanitizeForLog } from '~/layers/admin/server/utils/sanitization'

type BulkSubmission = Database['public']['Tables']['bulk_church_submissions']['Row']
type Church = Database['public']['Tables']['churches']['Row']
type ChurchInsert = Database['public']['Tables']['churches']['Insert']

interface BulkChurchData {
  name: string
  jurisdiction: string
  address: string
  schedules?: string
  description?: string
  pastors?: string
  responsible_email: string
  website?: string
  instagram?: string
  youtube?: string
  spotify?: string
}

export default defineEventHandler(async (event) => {
  // Ensure user is admin
  await requireAdmin(event)

  // Apply rate limiting (geocoding is very expensive for bulk)
  await rateLimit(event, RateLimits.GEOCODING)

  const config = useRuntimeConfig()
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ review_notes?: string }>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Bulk submission ID is required',
    })
  }

  // Create Supabase client
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )

  try {
    // 1. Get the bulk submission
    const { data: bulkSubmission, error: fetchError } = await supabase
      .from('bulk_church_submissions')
      .select('*')
      .eq('id', id)
      .single<BulkSubmission>()

    if (fetchError || !bulkSubmission) {
      throw createError({
        statusCode: 404,
        message: 'Bulk submission not found',
      })
    }

    // Check if already processed
    if (bulkSubmission.status !== 'pending') {
      throw createError({
        statusCode: 400,
        message: `Bulk submission already ${bulkSubmission.status}`,
      })
    }

    // 2. Parse and validate bulk_data JSON
    let churchesData: BulkChurchData[]
    try {
      const parsedData = JSON.parse(bulkSubmission.bulk_data)
      // Validate with Zod schema
      churchesData = BulkChurchDataSchema.parse(parsedData)
    }
    catch (parseError: any) {
      throw createError({
        statusCode: 400,
        message: 'Invalid bulk_data format',
        data: parseError.errors || parseError.message,
      })
    }

    // 3. Process each church
    const insertedChurches: Church[] = []
    const errors: string[] = []

    for (let i = 0; i < churchesData.length; i++) {
      const churchData = churchesData[i]

      try {
        // Validate required fields
        if (!churchData.name || !churchData.address || !churchData.responsible_email || !churchData.jurisdiction) {
          errors.push(`Church #${i + 1}: Missing required fields`)
          continue
        }

        // Geocode the address
        const geocodeResult = await geocodeAddress(churchData.address)

        // Find jurisdiction ID
        const jurisdictionId = await findJurisdictionId(churchData.jurisdiction)

        if (!jurisdictionId) {
          errors.push(`Church #${i + 1} (${churchData.name}): Jurisdiction "${churchData.jurisdiction}" not found`)
          continue
        }

        // Transform submission to church format
        const transformedChurch = await transformSubmission(
          {
            name: churchData.name,
            jurisdiction: churchData.jurisdiction,
            address: churchData.address,
            schedules: churchData.schedules || null,
            description: churchData.description || null,
            pastors: churchData.pastors || null,
            responsible_email: churchData.responsible_email,
            website: churchData.website || null,
            instagram: churchData.instagram || null,
            youtube: churchData.youtube || null,
            spotify: churchData.spotify || null,
          } as any,
          {
            geocodeResult,
            jurisdictionId,
          },
        )

        // Insert into churches table
        const { data: newChurch, error: insertError } = await supabase
          .from('churches')
          .insert(transformedChurch as never)
          .select()
          .single<Church>()

        if (insertError) {
          errors.push(`Church #${i + 1} (${churchData.name}): ${insertError.message}`)
          continue
        }

        if (newChurch) {
          insertedChurches.push(newChurch)
        }
      }
      catch (error: any) {
        errors.push(`Church #${i + 1} (${churchData.name || 'Unknown'}): ${error.message}`)
      }
    }

    // 4. Check if any churches were successfully inserted
    if (insertedChurches.length === 0) {
      throw createError({
        statusCode: 400,
        message: `Failed to insert any churches. Errors: ${errors.join('; ')}`,
      })
    }

    // 5. Update bulk submission status
    const { error: updateError } = await supabase
      .from('bulk_church_submissions')
      .update({
        status: 'approved' as const,
        reviewed_at: new Date().toISOString()
      } as never)
      .eq('id', id)

    if (updateError) {
      // Don't rollback churches, but log the error
      console.error('Failed to update bulk submission status:', sanitizeForLog(updateError))
    }

    // Log audit trail
    const adminEmail = await getAdminEmail(event)
    await logAudit(event, {
      action: AuditAction.BULK_SUBMISSION_APPROVED,
      resource_type: 'bulk_submission',
      resource_id: id,
      admin_email: adminEmail,
      metadata: {
        inserted_count: insertedChurches.length,
        total_count: churchesData.length,
        error_count: errors.length,
        review_notes: body.review_notes,
      },
    })

    return {
      success: true,
      insertedCount: insertedChurches.length,
      totalCount: churchesData.length,
      churches: insertedChurches,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length > 0
        ? `Aprovado com ${insertedChurches.length}/${churchesData.length} igrejas criadas. Algumas falharam.`
        : `${insertedChurches.length} igrejas criadas!`,
    }
  }
  catch (error: any) {
    console.error('Error approving bulk submission:', sanitizeForLog(error))

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to approve bulk submission',
    })
  }
})
