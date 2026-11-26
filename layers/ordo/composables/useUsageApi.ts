import { useOrdoApi } from './useOrdoApi'
import { OrdoApiError, type DashboardResponse } from '../types/dashboard'
import type {
  UsageActiveUsersResponse,
  UsageBreakdownResponse,
  UsageContentResponse,
  UsageContentSeriesResponse,
  UsageDimension,
  UsageFunnelsResponse,
  UsageGroupedSeriesResponse,
  UsageNewDimension,
  UsageQuery,
  UsageSeriesPoint,
  UsageSeriesResponse,
  UsageStatusResponse,
  UsageTopResponse
} from '../types/usage'

/**
 * The Uso tab's reports: `GET /api/v1/admin/usage/*` (estevao-api,
 * `Api::V1::Admin::UsageController`), plus the reports PROPOSTA §2 asks for.
 * A report the API in use does not have answers 404; the screen turns that
 * into "em breve" (see useReport). An unknown breakdown dimension answers 400
 * `INVALID_DIMENSION` instead, so it is read the same way here.
 */
export interface CalendarDay {
  date: string
  celebration_name?: string | null
  week_name?: string | null
  color_code?: string | null
}

/** The part of `GET admin/audio/readiness` the Público section reads. */
export interface AudioReadinessSummary {
  computed_at?: string | null
  books?: Array<{
    prayer_book_code: string
    name?: string
    bibles?: Array<{ default?: boolean; computed?: boolean; totals?: { percentage?: number | null } | null }>
  }>
}

type Extra = Record<string, string | number | undefined>

const notDeployed = (error: unknown) => {
  if (error instanceof OrdoApiError && error.status === 400 && ['INVALID_DIMENSION', 'INVALID_FILTER'].includes(error.payload?.code || error.code || '')) {
    return new OrdoApiError(error.message, 404, error.payload, error.requestId)
  }
  return error
}

export const useUsageApi = () => {
  const { request } = useOrdoApi()

  const path = (report: string, period: UsageQuery | null, extra: Extra = {}) => {
    const params = new URLSearchParams(period ? { start_date: period.start_date, end_date: period.end_date } : {})
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    })
    const query = params.toString()
    return `/api/v1/admin/usage/${report}${query ? `?${query}` : ''}`
  }

  const clampLimit = (limit: number) => Math.min(Math.max(limit, 1), 100)

  const top = (period: UsageQuery, limit = 50, feature?: string) =>
    request<UsageTopResponse>(path('top', period, { limit: clampLimit(limit), feature }))

  const series = (period: UsageQuery, filter: { feature?: string; event?: string } = {}) =>
    request<UsageSeriesResponse>(path('series', period, filter))

  const breakdown = async (period: UsageQuery, dimension: UsageDimension | UsageNewDimension, filter: { feature?: string; event?: string } = {}) => {
    try {
      return await request<UsageBreakdownResponse>(path('breakdown', period, { dimension, ...filter }))
    } catch (error) {
      throw notDeployed(error)
    }
  }

  const activeUsers = (period: UsageQuery) => request<UsageActiveUsersResponse>(path('active_users', period))
  const funnels = (period: UsageQuery) => request<UsageFunnelsResponse>(path('funnels', period))
  /** `with_series` (API-uso.md §5) gives each row its daily series; an older API ignores it. */
  const content = (period: UsageQuery, limit = 100, withSeries = false) =>
    request<UsageContentResponse>(path('content', period, { limit: clampLimit(limit), with_series: withSeries ? 'true' : undefined }))

  /** New (API-uso.md §7): what the telemetry receives, the last closed day and each day's state. */
  const status = (period?: UsageQuery) => request<UsageStatusResponse>(path('status', period || null))

  /** New (item 5): one slug's daily opens. */
  const contentSeries = (period: UsageQuery, slug: string) =>
    request<UsageContentSeriesResponse>(path('content', period, { slug }))

  /**
   * Each feature's daily series. One call with `group_by=feature` (item 1)
   * when the API has it; otherwise one call per feature, which works today.
   * An API that ignores the parameter answers the overall series: no `groups`.
   */
  const featureSeries = async (period: UsageQuery, features: string[]): Promise<{ series: Record<string, UsageSeriesPoint[]>; grouped: boolean }> => {
    if (!features.length) return { series: {}, grouped: false }
    try {
      const response = await request<UsageGroupedSeriesResponse | UsageSeriesResponse>(path('series', period, { group_by: 'feature' }))
      if ('groups' in response && Array.isArray(response.groups)) {
        return { series: Object.fromEntries(response.groups.map(group => [group.feature, group.series || []])), grouped: true }
      }
    } catch (error) {
      if (error instanceof OrdoApiError && error.status === 401) throw error
    }
    const settled = await Promise.allSettled(features.map(feature => series(period, { feature })))
    return {
      series: Object.fromEntries(features.flatMap((feature, index) => {
        const result = settled[index]
        return result.status === 'fulfilled' ? [[feature, result.value.series || []]] : []
      })),
      grouped: false
    }
  }

  /** The offices marked as prayed, by office, from /dashboard (completions table, not telemetry). */
  const completions = (period: UsageQuery) => {
    const params = new URLSearchParams({ start_date: period.start_date, end_date: period.end_date, sections: 'completions' })
    return request<DashboardResponse>(`/api/v1/dashboard?${params.toString()}`)
  }

  /** The liturgical calendar of a month, as a reader of `prayerBook` sees it. */
  const calendarMonth = (year: number, month: number, prayerBook = 'loc_2015') => {
    const params = new URLSearchParams({ preferences: JSON.stringify({ prayer_book_code: prayerBook }) })
    return request<CalendarDay[]>(`/api/v1/calendar/${year}/${month}?${params.toString()}`)
  }

  /** Áudio's stored coverage (API-audio.md §1): the narration column beside each book. */
  const narrationCoverage = () => request<AudioReadinessSummary>('/api/v1/admin/audio/readiness?days=28')

  return { narrationCoverage, top, series, breakdown, activeUsers, funnels, content, status, contentSeries, featureSeries, completions, calendarMonth, request }
}
