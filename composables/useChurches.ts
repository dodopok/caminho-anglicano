import type { Church, ChurchFilters } from '~/types/church'

export function useChurches() {
  const { $supabase } = useNuxtApp()

  async function fetchChurches(filters?: ChurchFilters): Promise<Church[]> {
    try {
      let query = ($supabase as any)
        .from('churches')
        .select(`
          *,
          jurisdiction:jurisdictions(*)
        `)
        .order('name')

      if (filters?.jurisdictionId) {
        query = query.eq('jurisdiction_id', filters.jurisdictionId)
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

      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        jurisdictionId: row.jurisdiction_id,
        jurisdiction: row.jurisdiction ? {
          id: row.jurisdiction.id,
          slug: row.jurisdiction.slug,
          name: row.jurisdiction.name,
          fullName: row.jurisdiction.full_name,
          color: row.jurisdiction.color,
          description: row.jurisdiction.description,
          website: row.jurisdiction.website,
          active: row.jurisdiction.active,
          displayOrder: row.jurisdiction.display_order,
          createdAt: row.jurisdiction.created_at,
          updatedAt: row.jurisdiction.updated_at
        } : undefined,
        address: row.address,
        city: row.city,
        state: row.state,
        postalCode: row.postal_code,
        latitude: row.latitude,
        longitude: row.longitude,
        schedules: row.schedules || [],
        description: row.description,
        pastors: row.pastors || [],
        responsibleEmail: row.responsible_email,
        socialMedia: row.social_media || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
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
