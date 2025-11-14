import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export default defineEventHandler(async (event) => {
  // Ensure user is admin
  await requireAdmin(event)

  const config = useRuntimeConfig()
  const query = getQuery(event)

  const status = query.status as string || 'pending'

  // Create Supabase client
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )

  try {
    let queryBuilder = supabase
      .from('bulk_church_submissions')
      .select('*', { count: 'exact' })

    // Filter by status
    if (status && status !== 'all') {
      queryBuilder = queryBuilder.eq('status', status)
    }

    // Order by submitted_at descending
    queryBuilder = queryBuilder.order('submitted_at', { ascending: false })

    const { data, error, count } = await queryBuilder

    if (error) {
      throw error
    }

    return {
      submissions: data || [],
      count: count || 0,
    }
  }
  catch (error: any) {
    console.error('Error fetching bulk submissions:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch bulk submissions',
    })
  }
})
