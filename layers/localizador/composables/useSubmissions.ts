import type { ChurchSubmission, BulkChurchSubmission } from '../types/church'

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
  async function submitChurch(data: ChurchSubmissionInput): Promise<ChurchSubmission> {
    try {
      const response = await $fetch<{ success: boolean; data: ChurchSubmission }>('/api/submissions/church', {
        method: 'POST',
        body: data
      })

      return response.data
    } catch (error) {
      console.error('Error submitting church:', error)
      throw error
    }
  }

  async function submitBulkChurches(bulkData: string): Promise<BulkChurchSubmission> {
    try {
      const response = await $fetch<{ success: boolean; data: BulkChurchSubmission }>('/api/submissions/bulk', {
        method: 'POST',
        body: { bulkData }
      })

      return response.data
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
