import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

type BulkSubmission = Database['public']['Tables']['bulk_church_submissions']['Row']

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ reviewNotes: string }>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Bulk submission ID is required',
    })
  }

  if (!body.reviewNotes) {
    throw createError({
      statusCode: 400,
      message: 'Review notes are required for rejection',
    })
  }

  // Create Supabase client
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )

  try {
    // Get the submission first to check status
    const { data: submission, error: fetchError } = await supabase
      .from('bulk_church_submissions')
      .select('status')
      .eq('id', id)
      .single<Pick<BulkSubmission, 'status'>>()

    if (fetchError || !submission) {
      throw createError({
        statusCode: 404,
        message: 'Bulk submission not found',
      })
    }

    // Check if already processed
    if (submission.status !== 'pending') {
      throw createError({
        statusCode: 400,
        message: `Bulk submission already ${submission.status}`,
      })
    }

    // Update submission status to rejected
    const { data, error } = await supabase
      .from('bulk_church_submissions')
      .update({
        status: 'rejected' as const,
        reviewed_at: new Date().toISOString(),
        review_notes: body.reviewNotes,
      } as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      success: true,
      submission: data,
      message: 'Bulk submission rejected successfully',
    }
  }
  catch (error: any) {
    console.error('Error rejecting bulk submission:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to reject bulk submission',
    })
  }
})
