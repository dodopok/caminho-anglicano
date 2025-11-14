import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

type Church = Database['public']['Tables']['churches']['Row']

export default defineEventHandler(async (event) => {
  // Ensure user is admin
  await requireAdmin(event)

  const config = useRuntimeConfig()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Church ID is required',
    })
  }

  // Create Supabase client with service key (bypasses RLS)
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )

  try {
    // Check if church exists
    const { data: existingChurch, error: fetchError } = await supabase
      .from('churches')
      .select('id, name')
      .eq('id', id)
      .single<Pick<Church, 'id' | 'name'>>()

    if (fetchError || !existingChurch) {
      throw createError({
        statusCode: 404,
        message: 'Church not found',
      })
    }

    const churchName = existingChurch.name

    // Delete the church
    const { error: deleteError } = await supabase
      .from('churches')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw createError({
        statusCode: 500,
        message: deleteError.message,
      })
    }

    return {
      success: true,
      message: `Church "${churchName}" deleted successfully`,
    }
  }
  catch (error: unknown) {
    console.error('Error deleting church:', error)

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to delete church',
    })
  }
})
