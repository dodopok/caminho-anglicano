import type { DashboardData, DashboardFilters } from '../types/dashboard'

export const useOrdoApi = () => {
  const config = useRuntimeConfig()
  const { getToken } = useFirebaseAuth()
  const baseURL = config.public.ordoApiBaseUrl

  const fetchDashboard = async (filters?: DashboardFilters): Promise<DashboardData> => {
    const token = await getToken()

    if (!token) {
      console.error('Token is null or undefined')
      throw new Error('Não autenticado')
    }

    console.log('Fetching dashboard with token:', token.substring(0, 20) + '...')

    const params = new URLSearchParams()
    if (filters?.start_date) params.append('start_date', filters.start_date)
    if (filters?.end_date) params.append('end_date', filters.end_date)

    const url = `${baseURL}/api/v1/dashboard${params.toString() ? `?${params.toString()}` : ''}`

    console.log('Fetching from:', url)

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Dashboard API error:', response.status, errorText)
      throw new Error(`Erro ao buscar dashboard: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    // A API retorna { period: {...}, data: {...} }
    // Retornamos apenas a parte data
    return result.data || result
  }

  return {
    fetchDashboard
  }
}
