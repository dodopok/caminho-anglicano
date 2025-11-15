import type { Church, Jurisdiction } from '../../localizador/types/church'

export interface ChurchStats {
  totalChurches: number
  churchesByJurisdiction: Record<string, { count: number; jurisdiction: Jurisdiction }>
  churchesByState: Record<string, number>
  topStates: Array<{ state: string; count: number }>
}

export const useChurchStats = () => {
  const churches = ref<Church[]>([])
  const jurisdictions = ref<Jurisdiction[]>([])
  const selectedJurisdiction = ref<string | null>(null)
  const loading = ref(true)
  const error = ref<Error | null>(null)

  const fetchData = async () => {
    try {
      loading.value = true
      error.value = null

      const [churchesData, jurisdictionsData] = await Promise.all([
        $fetch<Church[]>('/api/churches'),
        $fetch<Jurisdiction[]>('/api/jurisdictions')
      ])

      churches.value = churchesData
      jurisdictions.value = jurisdictionsData
    }
    catch (e) {
      error.value = e as Error
    }
    finally {
      loading.value = false
    }
  }

  const filteredChurches = computed(() => {
    if (!selectedJurisdiction.value) {
      return churches.value
    }
    return churches.value.filter(church => church.jurisdictionId === selectedJurisdiction.value)
  })

  const stats = computed<ChurchStats>(() => {
    const churchesToAnalyze = filteredChurches.value

    // Total de igrejas
    const totalChurches = churchesToAnalyze.length

    // Igrejas por jurisdição
    const churchesByJurisdiction: Record<string, { count: number; jurisdiction: Jurisdiction }> = {}

    churchesToAnalyze.forEach(church => {
      const jurisdiction = jurisdictions.value.find(j => j.id === church.jurisdictionId)
      if (jurisdiction) {
        if (!churchesByJurisdiction[church.jurisdictionId]) {
          churchesByJurisdiction[church.jurisdictionId] = {
            count: 0,
            jurisdiction
          }
        }
        churchesByJurisdiction[church.jurisdictionId].count++
      }
    })

    // Igrejas por estado
    const churchesByState: Record<string, number> = {}

    churchesToAnalyze.forEach(church => {
      if (church.state) {
        churchesByState[church.state] = (churchesByState[church.state] || 0) + 1
      }
    })

    // Top 3 estados
    const topStates = Object.entries(churchesByState)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([state, count]) => ({ state, count }))

    return {
      totalChurches,
      churchesByJurisdiction,
      churchesByState,
      topStates
    }
  })

  return {
    churches,
    jurisdictions,
    selectedJurisdiction,
    loading,
    error,
    stats,
    fetchData
  }
}
