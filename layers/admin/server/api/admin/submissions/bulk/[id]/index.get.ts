import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

type BulkSubmission = Database['public']['Tables']['bulk_church_submissions']['Row']

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const id = getRouterParam(event, 'id')

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
    const { data, error } = await supabase
      .from('bulk_church_submissions')
      .select('*')
      .eq('id', id)
      .single<BulkSubmission>()

    if (error || !data) {
      throw createError({
        statusCode: 404,
        message: 'Bulk submission not found',
      })
    }

    return data
  }
  catch (error: any) {
    console.error('Error fetching bulk submission:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch bulk submission',
    })
  }
})
