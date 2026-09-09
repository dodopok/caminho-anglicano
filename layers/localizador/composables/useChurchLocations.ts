import type { ChurchLocations } from '../types/church'

/**
 * Diretório de estados/cidades com igrejas cadastradas.
 * Usa useAsyncData para que os dados venham no HTML (SSR/prerender).
 */
export function useChurchLocations() {
  return useAsyncData<ChurchLocations>(
    'church-locations',
    () => $fetch<ChurchLocations>('/api/churches/locations'),
    {
      default: () => ({ states: [], totalStates: 0, totalCities: 0, totalChurches: 0 })
    }
  )
}
