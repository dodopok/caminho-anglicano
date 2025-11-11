import type { ChurchSubmission, BulkChurchSubmission } from '~/types/church'

interface ChurchSubmissionInput {
  jurisdiction: string
  name: string
  address: string
  schedules?: string
  description?: string
  pastors?: string
  responsibleEmail: string
  website?: string
  instagram?: string
  youtube?: string
  spotify?: string
}

export function useSubmissions() {
  const { $supabase } = useNuxtApp()

  async function submitChurch(data: ChurchSubmissionInput): Promise<ChurchSubmission> {
    try {
      const { data: submission, error } = await ($supabase as any)
        .from('church_submissions')
        .insert({
          jurisdiction: data.jurisdiction,
          name: data.name,
          address: data.address,
          schedules: data.schedules,
          description: data.description,
          pastors: data.pastors,
          responsible_email: data.responsibleEmail,
          website: data.website,
          instagram: data.instagram,
          youtube: data.youtube,
          spotify: data.spotify,
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return submission as ChurchSubmission
    } catch (error) {
      console.error('Error submitting church:', error)
      throw error
    }
  }

  async function submitBulkChurches(bulkData: string): Promise<BulkChurchSubmission> {
    try {
      const { data: submission, error } = await ($supabase as any)
        .from('bulk_church_submissions')
        .insert({
          bulk_data: bulkData,
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return submission as BulkChurchSubmission
    } catch (error) {
      console.error('Error submitting bulk churches:', error)
      throw error
    }
  }

  return {
    submitChurch,
    submitBulkChurches
  }
}
