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
  type AudioCleanupPreview,
  type AudioClipFilters,
  type AudioClipsResponse,
  type AudioEstimateResponse,
  type AudioGenerationRequest,
  type AudioOperationResponse,
  type AudioOperationsResponse,
  type AudioPrayerBooksResponse,
  type DashboardAudio,
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

  const fetchAudioSummary = async (): Promise<DashboardAudio> =>
    request<DashboardAudio>('/api/v1/admin/audio/summary')

  const audioFilterParams = (filters: AudioClipFilters = {}) => {
    const params = new URLSearchParams()
    const keys: Array<keyof AudioClipFilters> = [
      'kind', 'provider', 'model', 'voice', 'language', 'speed', 'fingerprint',
      'q', 'created_after', 'created_before', 'prayer_book_code', 'source_name',
      'profile_status', 'sort', 'direction', 'limit', 'offset'
    ]

    keys.forEach(key => {
      const value = filters[key]
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        params.set(key, String(value))
      }
    })

    return params
  }

  const fetchAudioClips = async (filters: AudioClipFilters = {}): Promise<AudioClipsResponse> => {
    const query = audioFilterParams(filters).toString()
    return request<AudioClipsResponse>(`/api/v1/admin/audio/clips${query ? `?${query}` : ''}`)
  }

  const fetchAudioClipUrl = async (id: number | string): Promise<{ id: number | string; url: string; expires_in: number }> =>
    request<{ id: number | string; url: string; expires_in: number }>(`/api/v1/admin/audio/clips/${id}/url`)

  const fetchAudioOperations = async (limit = 20): Promise<AudioOperationsResponse> =>
    request<AudioOperationsResponse>(`/api/v1/admin/audio/operations?limit=${Math.min(Math.max(limit, 1), 100)}`)

  const fetchAudioOperation = async (id: number | string): Promise<AudioOperationResponse> =>
    request<AudioOperationResponse>(`/api/v1/admin/audio/operations/${id}`)

  const estimateAudioGeneration = async (generation: AudioGenerationRequest): Promise<AudioEstimateResponse> =>
    request<AudioEstimateResponse>('/api/v1/admin/audio/generations/estimate', {
      method: 'POST',
      body: { generation }
    })

  const enqueueAudioGeneration = async (generation: AudioGenerationRequest): Promise<AudioOperationResponse> =>
    request<AudioOperationResponse>('/api/v1/admin/audio/generations', {
      method: 'POST',
      body: { generation }
    })

  const regenerateAudioClip = async (id: number | string): Promise<AudioOperationResponse> =>
    request<AudioOperationResponse>(`/api/v1/admin/audio/clips/${id}/regenerate`, { method: 'POST' })

  const previewAudioCleanup = async (filters: AudioClipFilters): Promise<AudioCleanupPreview> =>
    request<AudioCleanupPreview>('/api/v1/admin/audio/cleanup/preview', {
      method: 'POST',
      body: { cleanup: filters }
    })

  const enqueueAudioCleanup = async (filters: AudioClipFilters): Promise<AudioOperationResponse> =>
    request<AudioOperationResponse>('/api/v1/admin/audio/cleanup', {
      method: 'POST',
      body: { cleanup: filters }
    })

  const reindexAudioCatalog = async (prayerBookCode?: string): Promise<AudioOperationResponse> =>
    request<AudioOperationResponse>('/api/v1/admin/audio/catalog/reindex', {
      method: 'POST',
      body: prayerBookCode ? { prayer_book_code: prayerBookCode } : undefined
    })

  const fetchAudioPrayerBooks = async (): Promise<AudioPrayerBooksResponse> =>
    request<AudioPrayerBooksResponse>('/api/v1/prayer_books')

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
    fetchAudioSummary,
    fetchAudioClips,
    fetchAudioClipUrl,
    fetchAudioOperations,
    fetchAudioOperation,
    estimateAudioGeneration,
    enqueueAudioGeneration,
    regenerateAudioClip,
    previewAudioCleanup,
    enqueueAudioCleanup,
    reindexAudioCatalog,
    fetchAudioPrayerBooks,
    fetchLifeRules,
    fetchCustomRosaries,
    fetchCustomRosary,
    fetchRosaryCategories,
    approveCustomRosary,
    rejectCustomRosary,
    request,
  }
}
