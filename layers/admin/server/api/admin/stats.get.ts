import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Create Supabase client
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )

  try {
    // Get pending submissions count
    const { count: pendingCount } = await supabase
      .from('church_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // Get approved this week
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const { count: approvedThisWeek } = await supabase
      .from('church_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('reviewed_at', oneWeekAgo.toISOString())

    // Get rejected this week
    const { count: rejectedThisWeek } = await supabase
      .from('church_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected')
      .gte('reviewed_at', oneWeekAgo.toISOString())

    // Get total churches
    const { count: totalChurches } = await supabase
      .from('churches')
      .select('*', { count: 'exact', head: true })

    // Get recent submissions (last 10)
    const { data: recentSubmissions } = await supabase
      .from('church_submissions')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(10)

    return {
      pendingCount: pendingCount || 0,
      approvedThisWeek: approvedThisWeek || 0,
      rejectedThisWeek: rejectedThisWeek || 0,
      totalChurches: totalChurches || 0,
      recentSubmissions: recentSubmissions || [],
    }
  }
  catch (error: any) {
    console.error('Error fetching stats:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch statistics',
    })
  }
})
