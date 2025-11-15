import type { Church, ChurchFilters } from '../types/church'

export function useChurches() {
  async function fetchChurches(filters?: ChurchFilters): Promise<Church[]> {
    try {
      // Se houver filtro de jurisdição, usa rota específica (melhor cache)
      if (filters?.jurisdictionId) {
        const data = await $fetch<Church[]>(`/api/churches/jurisdiction/${filters.jurisdictionId}`)

        // Aplicar filtro de busca no client-side se necessário
        if (filters.searchQuery) {
          const searchTerm = filters.searchQuery.toLowerCase()
          return data.filter(church =>
            church.name.toLowerCase().includes(searchTerm) ||
            church.city.toLowerCase().includes(searchTerm) ||
            church.address.toLowerCase().includes(searchTerm)
          )
        }

        return data
      }

      // Se houver apenas busca ou nenhum filtro, usa rota geral
      const params: Record<string, string> = {}
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
