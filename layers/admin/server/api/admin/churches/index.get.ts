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
    // Pagination parameters
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 10
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Build query with jurisdiction join
    let queryBuilder = supabase
      .from('churches')
      .select(`
        *,
        jurisdiction:jurisdictions(id, name, slug, color)
      `, { count: 'exact' })
      .order('name', { ascending: true })
      .range(from, to)

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

    const { data, error, count } = await queryBuilder

    if (error) {
      throw error
    }

    return {
      churches: data || [],
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
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
