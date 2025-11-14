import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'
import { ChurchUpdateSchema } from '~/layers/admin/server/utils/validation'
import { rateLimit, RateLimits } from '~/layers/admin/server/utils/rateLimit'
import { logAudit, AuditAction, getAdminEmail } from '~/layers/admin/server/utils/auditLog'
import { sanitizeForLog } from '~/layers/admin/server/utils/sanitization'

type ChurchUpdate = Database['public']['Tables']['churches']['Update']

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
      message: 'Church ID is required',
    })
  }

  // Validate and sanitize input - prevents mass assignment
  let validatedData: any
  try {
    validatedData = ChurchUpdateSchema.parse(body)
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
    let updateData: Partial<ChurchUpdate> = {}

    // Only include fields that are actually present and valid
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.jurisdiction_id !== undefined) updateData.jurisdiction_id = validatedData.jurisdiction_id
    if (validatedData.schedules !== undefined) updateData.schedules = validatedData.schedules
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.pastors !== undefined) updateData.pastors = validatedData.pastors
    if (validatedData.social_media !== undefined) updateData.social_media = validatedData.social_media as any

    // If address changed, re-geocode
    if (validatedData.address) {
      const geocodeResult = await geocodeAddress(validatedData.address)

      updateData = {
        ...updateData,
        address: validatedData.address,
        latitude: geocodeResult.latitude,
        longitude: geocodeResult.longitude,
        city: geocodeResult.city,
        state: geocodeResult.state,
        postal_code: geocodeResult.postalCode,
      }
    }

    // Update the church
    const { data, error } = await supabase
      .from('churches')
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
      action: AuditAction.CHURCH_UPDATED,
      resource_type: 'church',
      resource_id: id,
      admin_email: adminEmail,
      metadata: {
        updated_fields: Object.keys(updateData),
      },
    })

    return data
  }
  catch (error: unknown) {
    console.error('Error updating church:', sanitizeForLog(error))

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to update church',
    })
  }
})
