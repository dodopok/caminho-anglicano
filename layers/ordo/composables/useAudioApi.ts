import { useOrdoApi } from './useOrdoApi'
import type { AudioOperationResponse } from '../types/dashboard'
import type {
  AudioCatalogOrder,
  AudioEstimateDetail,
  AudioEstimateRequest,
  AudioGenerationOrder,
  AudioProviderHealth,
  AudioReadinessDetail,
  AudioReadinessResponse,
  AudioRun,
  AudioRunFilters,
  AudioRunsPage
} from '../types/audio'

/**
 * The Áudio tab's newer endpoints (API-audio.md): the stored coverage, the
 * provider's health, runs with filters and pages, retry / cancel / try now,
 * the estimate's items and the spending limit. Each one may answer 404 on an
 * API from before it; the callers turn that into "em breve".
 */
export const useAudioApi = () => {
  const { request } = useOrdoApi()
  const base = '/api/v1/admin/audio'

  const fetchReadiness = (days: 7 | 28 = 28) =>
    request<AudioReadinessResponse>(`${base}/readiness?days=${days}`)

  const fetchReadinessBook = (code: string, { bibleVersion, days = 28 }: { bibleVersion?: string; days?: 7 | 28 } = {}) => {
    const params = new URLSearchParams({ days: String(days) })
    if (bibleVersion) params.set('bible_version', bibleVersion)
    return request<AudioReadinessDetail>(`${base}/readiness/${encodeURIComponent(code)}?${params}`)
  }

  const fetchProvider = () => request<AudioProviderHealth>(`${base}/provider`)

  // An API from before the filters ignores them and answers { operations }:
  // the page then has no `pagination` and no `counts`, and the list filters
  // what it got.
  const fetchRuns = async (filters: AudioRunFilters = {}): Promise<AudioRunsPage> => {
    const params = new URLSearchParams({ limit: String(Math.min(Math.max(filters.limit || 20, 1), 100)) })
    if (filters.status) params.set('status', filters.status)
    if (filters.kind) params.set('kind', filters.kind)
    if (filters.prayer_book_code) params.set('prayer_book_code', filters.prayer_book_code)
    if (filters.before !== undefined && filters.before !== null && filters.before !== '') params.set('before', String(filters.before))
    const response = await request<Partial<AudioRunsPage>>(`${base}/operations?${params}`)
    return {
      operations: response.operations || [],
      pagination: response.pagination || null,
      counts: response.counts || null
    }
  }

  const fetchRun = (id: number | string) => request<{ operation: AudioRun }>(`${base}/operations/${id}`)

  const retryRun = (id: number | string) => request<{ operation: AudioRun }>(`${base}/operations/${id}/retry`, { method: 'POST' })
  const cancelRun = (id: number | string) => request<{ operation: AudioRun; cancel_pending?: boolean }>(`${base}/operations/${id}/cancel`, { method: 'POST' })
  const tryRunNow = (id: number | string) => request<{ operation: AudioRun }>(`${base}/operations/${id}/try_now`, { method: 'POST' })

  const estimate = (generation: AudioEstimateRequest) =>
    request<{ estimate: AudioEstimateDetail }>(`${base}/generations/estimate`, { method: 'POST', body: { generation } })

  const enqueueGeneration = (generation: AudioGenerationOrder) =>
    request<AudioOperationResponse>(`${base}/generations`, { method: 'POST', body: { generation } })

  const enqueueCatalog = (catalog: AudioCatalogOrder) =>
    request<AudioOperationResponse>(`${base}/catalog/generations`, { method: 'POST', body: { catalog } })

  return {
    fetchReadiness,
    fetchReadinessBook,
    fetchProvider,
    fetchRuns,
    fetchRun,
    retryRun,
    cancelRun,
    tryRunNow,
    estimate,
    enqueueGeneration,
    enqueueCatalog
  }
}
