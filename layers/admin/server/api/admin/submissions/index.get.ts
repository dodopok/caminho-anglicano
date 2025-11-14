import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export default defineEventHandler(async (event) => {
  // Ensure user is admin
  await requireAdmin(event)

  const config = useRuntimeConfig()
  const query = getQuery(event)

  // Create Supabase client
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )

  try {
    // Build query
    let queryBuilder = supabase
      .from('church_submissions')
      .select('*')
      .order('submitted_at', { ascending: false })

    // Filter by status if provided
    if (query.status && query.status !== 'all') {
      queryBuilder = queryBuilder.eq('status', query.status as string)
    }

    // Search by name if provided
    if (query.search) {
      queryBuilder = queryBuilder.ilike('name', `%${query.search}%`)
    }

    const { data, error } = await queryBuilder

    if (error) {
      throw error
    }

    return {
      submissions: data || [],
      count: data?.length || 0,
    }
  }
  catch (error: unknown) {
    console.error('Error fetching submissions:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to fetch submissions',
    })
  }
})
