import type { Jurisdiction } from '../types/church'

// Estado global compartilhado
const jurisdictions = ref<Jurisdiction[]>([])
const isLoaded = ref(false)

export function useJurisdictions() {
  async function fetchJurisdictions(): Promise<Jurisdiction[]> {
    // Se já carregou, retorna do cache
    if (isLoaded.value && jurisdictions.value.length > 0) {
      return jurisdictions.value
    }

    try {
      const data = await $fetch<Jurisdiction[]>('/api/jurisdictions')
      jurisdictions.value = data
      isLoaded.value = true
      return data
    } catch (error) {
      console.error('Error fetching jurisdictions:', error)
      throw error
    }
  }

  function getJurisdictionById(id: string): Jurisdiction | undefined {
    return jurisdictions.value.find(j => j.id === id)
  }

  function getJurisdictionBySlug(slug: string): Jurisdiction | undefined {
    return jurisdictions.value.find(j => j.slug === slug)
  }

  function getJurisdictionColor(id: string): string {
    return getJurisdictionById(id)?.color || '#6B7280'
  }

  function getJurisdictionName(id: string): string {
    return getJurisdictionById(id)?.name || ''
  }

  function getJurisdictionSlug(id: string): string {
    return getJurisdictionById(id)?.slug || ''
  }

  return {
    jurisdictions: readonly(jurisdictions),
    isLoaded: readonly(isLoaded),
    fetchJurisdictions,
    getJurisdictionById,
    getJurisdictionBySlug,
    getJurisdictionColor,
    getJurisdictionName,
    getJurisdictionSlug
  }
}
