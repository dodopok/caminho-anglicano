import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)

  // Create Supabase client
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )

  try {
    // Build query with jurisdiction join
    let queryBuilder = supabase
      .from('churches')
      .select(`
        *,
        jurisdiction:jurisdictions(id, name, slug, color)
      `)
      .order('name', { ascending: true })

    // Filter by jurisdiction if provided
    if (query.jurisdiction_id) {
      queryBuilder = queryBuilder.eq('jurisdiction_id', query.jurisdiction_id as string)
    }

    // Search by name if provided
    if (query.search) {
      queryBuilder = queryBuilder.ilike('name', `%${query.search}%`)
    }

    // Filter by state if provided
    if (query.state) {
      queryBuilder = queryBuilder.eq('state', query.state as string)
    }

    const { data, error } = await queryBuilder

    if (error) {
      throw error
    }

    return {
      churches: data || [],
      count: data?.length || 0,
    }
  }
  catch (error: any) {
    console.error('Error fetching churches:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch churches',
    })
  }
})
