import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

type BulkSubmissionUpdate = Database['public']['Tables']['bulk_church_submissions']['Update']

export default defineEventHandler(async (event) => {
  // Ensure user is admin
  await requireAdmin(event)

  const config = useRuntimeConfig()
  const id = getRouterParam(event, 'id')
  const body = await readBody<BulkSubmissionUpdate>(event)

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
      .update(body as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  }
  catch (error: unknown) {
    console.error('Error updating bulk submission:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to update bulk submission',
    })
  }
})
