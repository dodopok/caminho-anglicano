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

export interface UsageBreakdownResponse {
  period: UsagePeriod
  dimension: UsageDimension
  filter: { feature?: string; event?: string }
  /** `value: null` is "unknown". */
  rows: Array<{ value: string | null; count: number }>
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
}

export interface UsageFunnel {
  key: 'office' | 'share' | 'paywall' | string
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
}

export interface UsageContentResponse {
  period: UsagePeriod
  filter: { content_kind?: string }
  rows: UsageContentRow[]
}
