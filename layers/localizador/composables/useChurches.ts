import type { Church, ChurchFilters } from '../types/church'

export function useChurches() {
  async function fetchChurches(filters?: ChurchFilters): Promise<Church[]> {
    try {
      const params: Record<string, string> = {}

      if (filters?.jurisdictionId) {
        params.jurisdiction = filters.jurisdictionId
      }

      if (filters?.searchQuery) {
        params.search = filters.searchQuery
      }

      const data = await $fetch<Church[]>('/api/churches', {
        params
      })

      return data
    } catch (error) {
      console.error('Error fetching churches:', error)
      throw error
    }
  }

  async function fetchChurchById(id: string): Promise<Church | null> {
    try {
      const data = await $fetch<Church>(`/api/churches/${id}`)
      return data
    } catch (error) {
      console.error('Error fetching church:', error)
      throw error
    }
  }

  async function fetchChurchBySlug(slug: string): Promise<Church | null> {
    try {
      const data = await $fetch<Church>(`/api/churches/slug/${slug}`)
      return data
    } catch (error) {
      console.error('Error fetching church by slug:', error)
      throw error
    }
  }

  return {
    fetchChurches,
    fetchChurchById,
    fetchChurchBySlug
  }
}
