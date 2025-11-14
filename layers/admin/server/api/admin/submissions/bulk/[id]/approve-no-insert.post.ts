import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

type BulkSubmission = Database['public']['Tables']['bulk_church_submissions']['Row']

export default defineEventHandler(async (event) => {
  // Ensure user is admin
  await requireAdmin(event)

  const config = useRuntimeConfig()
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ review_notes: string }>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Bulk submission ID is required',
    })
  }

  if (!body.review_notes || body.review_notes.trim() === '') {
    throw createError({
      statusCode: 400,
      message: 'review_notes é obrigatório',
    })
  }

  // Create Supabase client
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.supabaseServiceKey,
  )

  try {
    // 1. Get the bulk submission
    const { data: bulkSubmission, error: fetchError } = await supabase
      .from('bulk_church_submissions')
      .select('*')
      .eq('id', id)
      .single<BulkSubmission>()

    if (fetchError || !bulkSubmission) {
      throw createError({
        statusCode: 404,
        message: 'Bulk submission not found',
      })
    }

    // Check if already processed
    if (bulkSubmission.status !== 'pending') {
      throw createError({
        statusCode: 400,
        message: `Bulk submission already ${bulkSubmission.status}`,
      })
    }

    // 2. Update bulk submission status to approved
    const { error: updateError } = await supabase
      .from('bulk_church_submissions')
      .update({
        status: 'approved' as const,
        reviewed_at: new Date().toISOString(),
        review_notes: body.review_notes,
      } as never)
      .eq('id', id)

    if (updateError) {
      throw createError({
        statusCode: 500,
        message: 'Failed to update bulk submission status',
      })
    }

    return {
      success: true,
      message: 'Submissão aprovada sem criar igrejas',
    }
  }
  catch (error: unknown) {
    console.error('Error approving bulk submission:', error)

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to approve bulk submission',
    })
  }
})
