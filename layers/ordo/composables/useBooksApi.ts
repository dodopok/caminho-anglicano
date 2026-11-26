import { useOrdoApi } from './useOrdoApi'
import { useUsageApi } from './useUsageApi'
import { OrdoApiError, type AudioPrayerBooksResponse } from '../types/dashboard'
import type { AudioReadinessResponse } from '../types/audio'
import type {
  AdminPrayerBookDetailResponse,
  AdminPrayerBooksResponse,
  CmsPrayerBookDocumentsResponse
} from '../types/books'
import type { UsageContentResponse, UsageQuery } from '../types/usage'
import type { CatalogBook } from '../utils/books'

export const DEFAULT_CMS_BASE_URL = 'https://cms.caminhoanglicano.com.br/api'

/**
 * What the Livros tab reads. The admin endpoints (API-livros.md) carry almost
 * everything; until they are deployed they answer 404 and the tab draws the
 * same screens from the public catalog, Áudio's stored coverage, the
 * dashboard and the usage telemetry.
 */
export const useBooksApi = () => {
  const { request } = useOrdoApi()
  const usage = useUsageApi()
  const config = useRuntimeConfig()
  const apiBase = String(config.public.ordoApiBaseUrl || '').replace(/\/$/, '')
  const cmsBase = String(config.public.ordoCmsBaseUrl || DEFAULT_CMS_BASE_URL).replace(/\/$/, '')

  const query = (window: UsageQuery, compare: boolean) => {
    const params = new URLSearchParams({ start_date: window.start_date, end_date: window.end_date })
    if (compare) params.set('compare', 'previous')
    return params.toString()
  }

  /** Every book, pre-release included, with its numbers for the window. */
  const list = (window: UsageQuery, compare = true) =>
    request<AdminPrayerBooksResponse>(`/api/v1/admin/prayer_books?${query(window, compare)}`)

  /** One book's page: series, retention, switches, readiness and documents. */
  const detail = (code: string, window: UsageQuery, compare = true) =>
    request<AdminPrayerBookDetailResponse>(`/api/v1/admin/prayer_books/${encodeURIComponent(code)}?${query(window, compare)}`)

  /** The public catalog (no books in pre-release): the list before the admin endpoint. */
  const catalog = async () => (await request<AudioPrayerBooksResponse>('/api/v1/prayer_books')).data as CatalogBook[]

  /** Áudio's stored coverage of the next 4 weeks; `readers` per book is "usam hoje" before the admin endpoint. */
  const readiness = () => request<AudioReadinessResponse>('/api/v1/admin/audio/readiness?days=28')

  /** PDF or document opens per book, from the usage telemetry. */
  const opensByBook = (window: UsageQuery, event: 'pdf_opened' | 'document_opened') => usage.breakdown(window, 'book', { event })

  /** Document opens by slug; `book=` narrows them to the book once the API has the filter (an older API ignores it). */
  const documentOpens = (window: UsageQuery, code: string) => {
    const params = new URLSearchParams({ start_date: window.start_date, end_date: window.end_date, content_kind: 'document', book: code, limit: '100' })
    return request<UsageContentResponse>(`/api/v1/admin/usage/content?${params.toString()}`)
  }

  /** The CMS's published documents of a book (a public route: no token is sent). */
  const cmsDocuments = async (code: string) => {
    const response = await fetch(`${cmsBase}/prayer-book-documents/by-code/${encodeURIComponent(code)}`, { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new OrdoApiError(`O CMS respondeu com status ${response.status}.`, response.status)
    return (await response.json() as CmsPrayerBookDocumentsResponse).data || []
  }

  /** The published PDF, served by the API. */
  const pdfUrl = (code: string) => `${apiBase || 'https://api.oficio.app'}/api/v1/prayer_books/${encodeURIComponent(code)}/pdf`

  /** The CMS editor, filtered to the book's documents. */
  const cmsEditorUrl = (code: string) => {
    const origin = cmsBase.startsWith('http') ? new URL(cmsBase).origin : 'https://cms.caminhoanglicano.com.br'
    return `${origin}/admin/content-manager/collection-types/api::prayer-book-document.prayer-book-document?filters[$and][0][prayer_book_code][$eq]=${encodeURIComponent(code)}`
  }

  return { list, detail, catalog, readiness, opensByBook, documentOpens, cmsDocuments, pdfUrl, cmsEditorUrl, request }
}
