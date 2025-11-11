import type { Jurisdiction } from '~/types/church'

export function useJurisdictions() {
  const { $supabase } = useNuxtApp()

  async function fetchJurisdictions(): Promise<Jurisdiction[]> {
    try {
      const { data, error } = await ($supabase as any)
        .from('jurisdictions')
        .select('*')
        .eq('active', true)
        .order('display_order')

      if (error) {
        throw error
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        fullName: row.full_name,
        color: row.color,
        description: row.description,
        website: row.website,
        active: row.active,
        displayOrder: row.display_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    } catch (error) {
      console.error('Error fetching jurisdictions:', error)
      throw error
    }
  }

  async function fetchJurisdictionById(id: string): Promise<Jurisdiction | null> {
    try {
      const { data, error } = await ($supabase as any)
        .from('jurisdictions')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw error
      }

      if (!data) return null

      return {
        id: data.id,
        slug: data.slug,
        name: data.name,
        fullName: data.full_name,
        color: data.color,
        description: data.description,
        website: data.website,
        active: data.active,
        displayOrder: data.display_order,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (error) {
      console.error('Error fetching jurisdiction:', error)
      throw error
    }
  }

  return {
    fetchJurisdictions,
    fetchJurisdictionById
  }
}
