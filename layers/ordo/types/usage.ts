/**
 * The usage dashboard's contract: `GET /api/v1/admin/usage/...` in the API
 * (estevao-api, `Api::V1::Admin::UsageController`, Swagger tag
 * "Admin - Usage"). Every report reads the daily rollups and echoes the
 * period it covered.
 */
export interface UsagePeriod {
  start_date: string
  end_date: string
}

export interface UsageQuery {
  start_date: string
  end_date: string
}

export interface UsageTopFeature {
  feature: string
  count: number
  errors: number
  /** Each day's distinct people, added up: someone active on three days counts three times. */
  user_days: number
}

export interface UsageTopEvent {
  event: string
  source: 'domain' | 'client'
  /** The feature the event belongs to (API-uso.md §2); null for session and navigation events. */
  feature?: string | null
  count: number
  user_days: number
}

/** Polled routes, counted without a row per request. */
export interface UsageTopCounter {
  feature: string | null
  action: string | null
  client: string | null
  count: number
}

export interface UsageTopResponse {
  period: UsagePeriod
  /** Echoed by an API that filters the events by feature (`top?feature=`). */
  filter?: { feature?: string }
  features: UsageTopFeature[]
  events: UsageTopEvent[]
  counters: UsageTopCounter[]
}

export interface UsageSeriesPoint {
  date: string
  count: number
  users: number
}

export interface UsageSeriesResponse {
  period: UsagePeriod
  filter: { feature?: string; event?: string }
  series: UsageSeriesPoint[]
}

export type UsageDimension = 'client' | 'platform' | 'book' | 'language' | 'purpose' | 'app_version'
/** Dimensions the nightly rollup does not split yet (PROPOSTA §2, item 3). */
export type UsageNewDimension = 'premium' | 'logged_in' | 'office_type'

export interface UsageBreakdownRow {
  value: string | null
  count: number
  /** People-days, for app_version, premium, logged_in and office_type (API-uso.md §4). */
  user_days?: number
}

export interface UsageBreakdownResponse {
  period: UsagePeriod
  dimension: UsageDimension | UsageNewDimension
  filter: { feature?: string; event?: string }
  /** `value: null` is "unknown". */
  rows: UsageBreakdownRow[]
}

/** `series?group_by=feature`: one series per feature in one call (item 1). */
export interface UsageGroupedSeriesResponse {
  period: UsagePeriod
  group_by: 'feature'
  groups: Array<{ feature: string; count?: number; user_days?: number; series: UsageSeriesPoint[] }>
}

export interface UsageWindows {
  dau: number
  wau: number
  mau: number
}

export interface UsageActivePoint extends UsageWindows {
  date: string
  by_client: Record<string, UsageWindows>
  /** People seen on both the app and the web in the window. */
  app_and_web: UsageWindows
}

export interface UsageActiveUsersResponse {
  period: UsagePeriod
  series: UsageActivePoint[]
}

export interface UsageFunnelStep {
  event: string
  count: number
  user_days: number
  /** Person-days that reached this step in order (per-person funnels, API-uso.md §6). */
  reached?: number
}

export interface UsageFunnel {
  key: 'office' | 'share' | 'paywall' | 'first_access' | string
  /** One person walks the whole funnel; sharing is not (someone else opens the link). */
  per_user: boolean
  steps: UsageFunnelStep[]
  /** Person-days on which the last step followed the first, within `raw_window`. */
  started?: number
  converted?: number
  rate?: number | null
}

export interface UsageFunnelsResponse {
  period: UsagePeriod
  /** The part of the period the raw events (90 days) still cover; null when none. */
  raw_window: UsagePeriod | null
  funnels: UsageFunnel[]
}

export interface UsageContentRow {
  content_kind: string | null
  content_slug: string
  event: string | null
  count: number
  user_days: number
  /**
   * The content's name, resolved by the API from the CMS (the portal cannot:
   * the CMS needs a token). Null when the API does not know it; an API from
   * before the field leaves it out. Either way the slug is read as words.
   */
  title?: string | null
  /** The feast day of a saint or a liturgical date (`YYYY-MM-DD` or `MM-DD`). */
  date?: string | null
  /** One point per day, with `with_series=true` (API-uso.md §5). */
  series?: Array<{ date: string; count: number; users?: number }>
}

/** `content?slug=`: one slug's daily opens (item 5). */
export interface UsageContentSeriesResponse {
  period: UsagePeriod
  slug?: string
  filter?: { content_kind?: string; content_slug?: string }
  /** The slug's name, as in the list's rows (null when the API does not know it). */
  title?: string | null
  rows?: UsageContentRow[]
  series: Array<{ date: string; count: number; user_days?: number; users?: number }>
}

export interface UsageSourceStatus {
  source: 'request' | 'domain' | 'client' | string
  client: string | null
  last_hour?: number
  today?: number
  last_event_at?: string | null
  first_day?: string | null
  first_event_at?: string | null
}

export type UsageDayState = 'closed' | 'closing' | 'open' | 'no_data'

/** `GET admin/usage/status` (API-uso.md §7). */
export interface UsageStatusResponse {
  generated_at?: string
  today?: string
  period?: UsagePeriod
  telemetry?: { enabled?: boolean; hmac_configured?: boolean; buffer?: string; queued?: number | null }
  retention?: { raw_days?: number; raw_since?: string | null }
  rollup?: {
    version?: number
    first_day?: string | null
    first_event_at?: string | null
    /** The most recent day the nightly rollup has closed; null before the first one. */
    last_closed_day?: string | null
    rolled_at?: string | null
    settled_through?: string | null
    next_run_at?: string | null
    stale_days?: number
  }
  sources?: UsageSourceStatus[]
  days?: Array<{ date: string; state: UsageDayState; events?: number }>
}

export interface UsageContentResponse {
  period: UsagePeriod
  filter: { content_kind?: string; content_slug?: string }
  rows: UsageContentRow[]
}
