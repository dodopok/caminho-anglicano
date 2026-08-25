import {
  OrdoApiError,
  normalizeRosaryCategories,
  type RosaryCategoriesResponse,
  type RosaryCategorySelection,
  type CustomRosaryDetailResponse,
  type CustomRosaryListResponse,
  type CustomRosaryQuery,
  type DashboardFilters,
  type DashboardResponse,
  type LifeRulesQuery,
  type LifeRulesResponse,
  type OrdoApiErrorPayload
} from '../types/dashboard'

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

export const useOrdoApi = () => {
  const config = useRuntimeConfig()
  const { getToken, invalidateSession } = useFirebaseAuth()
  const baseURL = String(config.public.ordoApiBaseUrl || '').replace(/\/$/, '')

  const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const token = await getToken()

    if (!token) {
      await invalidateSession()
      throw new OrdoApiError('Sua sessão do Firebase expirou. Faça login novamente.', 401, {
        code: 'AUTHENTICATION_REQUIRED'
      })
    }

    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${token}`)
    headers.set('Accept', 'application/json')

    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(`${baseURL}${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    })

    const requestId = response.headers.get('x-request-id') || undefined
    let payload: unknown = null

    try {
      payload = await response.json() as unknown
    } catch {
      payload = null
    }

    if (!response.ok) {
      const errorPayload = payload && typeof payload === 'object'
        ? payload as OrdoApiErrorPayload
        : undefined
      const message = errorPayload?.error || `A API do Ordo respondeu com status ${response.status}.`

      if (response.status === 401) {
        await invalidateSession()
      }

      throw new OrdoApiError(message, response.status, errorPayload, requestId)
    }

    return payload as T
  }

  const fetchDashboard = async (filters: DashboardFilters = {}): Promise<DashboardResponse> => {
    const params = new URLSearchParams()

    if (filters.start_date) params.set('start_date', filters.start_date)
    if (filters.end_date) params.set('end_date', filters.end_date)

    const sections = [...new Set(filters.sections || [])]
    if (sections.length) params.set('sections', sections.join(','))

    const query = params.toString()
    return request<DashboardResponse>(`/api/v1/dashboard${query ? `?${query}` : ''}`)
  }

  const fetchLifeRules = async (query: LifeRulesQuery = {}): Promise<LifeRulesResponse> => {
    const params = new URLSearchParams()
    params.set('status', query.status || 'pending')
    if (query.search?.trim()) params.set('search', query.search.trim())
    params.set('limit', String(Math.min(Math.max(query.limit || 20, 1), 100)))
    params.set('offset', String(Math.max(query.offset || 0, 0)))

    return request<LifeRulesResponse>(`/api/v1/admin/life_rules?${params.toString()}`)
  }

  const fetchCustomRosaries = async (query: CustomRosaryQuery = {}): Promise<CustomRosaryListResponse> => {
    const params = new URLSearchParams()
    if (query.share_status) params.set('share_status', query.share_status)
    if (query.search?.trim()) params.set('search', query.search.trim())
    if (query.sort) params.set('sort', query.sort)
    if (query.direction) params.set('direction', query.direction)
    params.set('limit', String(Math.min(Math.max(query.limit || 20, 1), 100)))
    params.set('offset', String(Math.max(query.offset || 0, 0)))

    return request<CustomRosaryListResponse>(
      `/api/v1/admin/custom_rosary_prayers?${params.toString()}`
    )
  }

  const fetchCustomRosary = async (id: number | string): Promise<CustomRosaryDetailResponse> =>
    request<CustomRosaryDetailResponse>(`/api/v1/admin/custom_rosary_prayers/${id}`)

  // Rails contract: this endpoint is admin-authenticated by the Firebase
  // bearer token. It intentionally returns only compact category metadata.
  const fetchRosaryCategories = async (): Promise<RosaryCategoriesResponse> => {
    const payload = await request<unknown>('/api/v1/admin/rosary_categories')
    return normalizeRosaryCategories(payload)
  }

  // Rails resolves an existing category by documentId/slug, or creates and
  // assigns the new category from these editorial fields before publication.
  const approveCustomRosary = async (id: number | string, category: RosaryCategorySelection, strapiSlug: string) => {
    const normalizedStrapiSlug = strapiSlug.trim()
    if (!normalizedStrapiSlug) throw new Error('O slug no Strapi é obrigatório para aprovar o rosário.')

    return request<CustomRosaryDetailResponse>(`/api/v1/admin/custom_rosary_prayers/${id}/approve`, {
      method: 'POST',
      body: {
        category,
        strapi_slug: normalizedStrapiSlug
      }
    })
  }

  const rejectCustomRosary = async (id: number | string, reason?: string) =>
    request<CustomRosaryDetailResponse>(`/api/v1/admin/custom_rosary_prayers/${id}/reject`, {
      method: 'POST',
      body: reason?.trim() ? { reason: reason.trim() } : undefined
    })

  return {
    fetchDashboard,
    fetchLifeRules,
    fetchCustomRosaries,
    fetchCustomRosary,
    fetchRosaryCategories,
    approveCustomRosary,
    rejectCustomRosary,
    request,
  }
}
