import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

type ChurchUpdate = Database['public']['Tables']['churches']['Update']

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const id = getRouterParam(event, 'id')
  const body = await readBody<ChurchUpdate & { address?: string }>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Church ID is required',
    })
  }

  // Create Supabase client
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )

  try {
    // If address changed, re-geocode
    if (body.address) {
      const geocodeResult = await geocodeAddress(body.address)

      body.latitude = geocodeResult.latitude
      body.longitude = geocodeResult.longitude
      body.city = geocodeResult.city
      body.state = geocodeResult.state
      body.postal_code = geocodeResult.postalCode
    }

    // Update the church
    const { data, error } = await supabase
      .from('churches')
      .update(body as any)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  }
  catch (error: any) {
    console.error('Error updating church:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to update church',
    })
  }
})
