import type { Church, ChurchFilters } from '~/types/church'

export function useChurches() {
  const { $supabase } = useNuxtApp()

  async function fetchChurches(filters?: ChurchFilters): Promise<Church[]> {
    try {
      let query = ($supabase as any)
        .from('churches')
        .select('*')
        .order('name')

      if (filters?.jurisdiction) {
        query = query.eq('jurisdiction', filters.jurisdiction)
      }

      if (filters?.searchQuery) {
        query = query.or(
          `name.ilike.%${filters.searchQuery}%,city.ilike.%${filters.searchQuery}%,address.ilike.%${filters.searchQuery}%`
        )
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return (data || []) as Church[]
    } catch (error) {
      console.error('Error fetching churches:', error)
      throw error
    }
  }

  async function fetchChurchById(id: string): Promise<Church | null> {
    try {
      const { data, error } = await ($supabase as any)
        .from('churches')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw error
      }

      return data as Church
    } catch (error) {
      console.error('Error fetching church:', error)
      throw error
    }
  }

  return {
    fetchChurches,
    fetchChurchById
  }
}
