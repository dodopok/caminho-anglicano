export const DASHBOARD_SECTION_NAMES = [
  'overview',
  'users',
  'completions',
  'prayer_books',
  'journals',
  'audio',
  'notifications',
  'life_rules',
  'shared_offices',
  'engagement',
  'moderation',
  'health',
  'retention',
  'onboarding',
  'premium',
  'geography',
  'custom_rosaries',
  'weekly_prayers',
  'favorites',
  'api',
  'developers'
] as const

export type DashboardSectionName = typeof DASHBOARD_SECTION_NAMES[number]
export type DashboardScope = 'period' | 'lifetime' | 'window' | 'today'

export interface DashboardSectionMeta {
  scope?: DashboardScope
  metric_scopes?: Record<string, DashboardScope>
}

export type CountMap = Record<string, number>

export interface DashboardPeriod {
  start_date: string
  end_date: string
}

export interface DashboardOverview extends DashboardSectionMeta {
  total_users?: number
  premium_users?: number
  free_users?: number
  premium_conversion_rate?: number
  total_completions?: number
  total_journals?: number
  users_with_completions?: number
  avg_completions_per_user?: number
  avg_completions_denominator?: string
}

export interface TopStreaker {
  id: number | string
  name: string
  longest_streak?: number
  current_streak?: number
}

export interface DashboardUsers extends DashboardSectionMeta {
  new_users_in_period?: number
  daily_new_users?: CountMap
  active_users_in_period?: number
  active_fcm_tokens?: number
  platform_breakdown?: CountMap
  top_streakers?: TopStreaker[]
  avg_current_streak?: number
  avg_longest_streak?: number
}

export interface TopCompleter {
  id: number | string
  name: string
  completions?: number
}

export interface DailyCompletion {
  date: string
  count: number
}

export interface CompletionPrayerBookUsage {
  code: string
  name: string
  completions?: number
}

export interface DashboardCompletions extends DashboardSectionMeta {
  total_in_period?: number
  by_office_type?: CountMap
  by_hour?: CountMap
  top_completers?: TopCompleter[]
  daily_completions?: DailyCompletion[]
  avg_duration_seconds?: number
  by_prayer_book?: CompletionPrayerBookUsage[]
}

export interface PrayerBookUsage {
  code: string
  name: string
  users?: number
}

export interface BibleVersionChoice {
  code: string
  name: string
  users?: number
}

export interface DashboardPrayerBooks extends DashboardSectionMeta {
  usage_by_prayer_book?: PrayerBookUsage[]
  onboarding_choices_by_prayer_book?: PrayerBookUsage[]
  completion_usage_by_prayer_book?: CompletionPrayerBookUsage[]
  most_used?: PrayerBookUsage | null
  most_used_by_completions?: CompletionPrayerBookUsage | null
  bible_version_choices?: BibleVersionChoice[]
  unattributed_completions?: number
}

export interface TopWriter {
  id: number | string
  name: string
  journals?: number
}

export interface DashboardJournals extends DashboardSectionMeta {
  total_in_period?: number
  by_entry_type?: CountMap
  by_office_type?: CountMap
  top_writers?: TopWriter[]
  users_with_journals?: number
}

export interface AudioVoiceCoverage {
  voice: string
  total_texts?: number
  texts_with_audio?: number
  coverage_percentage?: number
  missing_characters?: number
}

export interface AudioPrayerBookCoverage {
  prayer_book_id: number | string
  code?: string
  total_texts?: number
  texts_with_audio?: number
  coverage_percentage?: number
  by_voice?: AudioVoiceCoverage[]
}

export interface DashboardAudio extends DashboardSectionMeta {
  total_sessions?: number
  completed_sessions?: number
  failed_sessions?: number
  running_sessions?: number
  texts_with_audio?: number
  total_texts?: number
  audio_coverage_percentage?: number
  total_texts_processed?: number
  total_texts_failed?: number
  by_prayer_book?: AudioPrayerBookCoverage[]
  by_voice?: AudioVoiceCoverage[]
  estimated_missing_characters?: CountMap
  estimated_missing_cost?: number
  cost_per_1000_characters?: number
}

export interface DashboardNotifications extends DashboardSectionMeta {
  total_in_period?: number
  sent?: number
  failed?: number
  success_rate?: number
  by_type?: CountMap
  failures_last_24_hours?: number
  delivery_status_counts?: CountMap
  delivery_status_by_platform?: Record<string, CountMap>
}

export interface TopAdoptedRule {
  id?: number | string
  title: string
  adoptions?: number
}

export interface DashboardLifeRules extends DashboardSectionMeta {
  total_rules?: number
  public_rules?: number
  approved_rules?: number
  pending_rules?: number
  oldest_pending_at?: string | null
  oldest_pending_age_seconds?: number | null
  top_adopted?: TopAdoptedRule[]
  total_adoptions?: number
}

export interface DailyShare {
  date: string
  count: number
}

export interface DashboardSharedOffices extends DashboardSectionMeta {
  total_in_period?: number
  by_office_type?: CountMap
  by_prayer_book?: CountMap
  daily_shares?: DailyShare[]
  unique_users_sharing?: number
}

export interface DailyActiveUser {
  date: string
  active_users: number
}

export interface DashboardEngagement extends DashboardSectionMeta {
  dau?: number
  wau?: number
  mau?: number
  dau_wau_ratio?: number
  wau_mau_ratio?: number
  daily_active_trend?: DailyActiveUser[]
}

export interface DashboardModerationRosaries {
  pending_now?: number
  oldest_pending_at?: string | null
  oldest_pending_age_seconds?: number | null
  approved_in_period?: number
  rejected_in_period?: number
  approval_rate?: number
  average_response_time_seconds?: number
  reentries_in_period?: number
  total_reentries?: number
  approved_without_strapi?: number
}

export interface DashboardModerationLifeRules {
  pending_now?: number
  oldest_pending_at?: string | null
  oldest_pending_age_seconds?: number | null
}

export interface DashboardModeration extends DashboardSectionMeta {
  custom_rosaries?: DashboardModerationRosaries
  life_rules?: DashboardModerationLifeRules
}

export interface AudioSessionSummary {
  id: number | string
  prayer_book_code?: string
  started_at?: string
}

export interface ExpiringApiKey {
  id: number | string
  name: string
  expires_at?: string
}

export interface DashboardHealth extends DashboardSectionMeta {
  notifications?: {
    failures_last_24_hours?: number
    failed_by_type?: CountMap
  }
  audio_sessions?: {
    failed?: number
    running?: number
    stale_running?: number
    stale_running_sessions?: AudioSessionSummary[]
  }
  api_keys?: {
    expiring_next_30_days?: number
    expiring_keys?: ExpiringApiKey[]
  }
}

export interface RetentionCohort {
  week_start: string
  users?: number
  d1?: { users?: number; rate?: number }
  d7?: { users?: number; rate?: number }
  d30?: { users?: number; rate?: number }
}

export interface DashboardRetention extends DashboardSectionMeta {
  cohorts?: RetentionCohort[]
}

export interface DashboardOnboarding extends DashboardSectionMeta {
  funnel?: {
    registered?: number
    onboarding_completed?: number
    first_prayer?: number
    prayed_seven_times?: number
    rates?: CountMap
  }
  choices?: {
    modes?: CountMap
    prayer_books?: CountMap
    bible_versions?: CountMap
    languages?: CountMap
  }
}

export interface DashboardPremium extends DashboardSectionMeta {
  active_now?: number
  new_in_period?: number
  expiring_next_30_days?: number
  expired?: number
  churn_rate?: number
  renewals_in_period?: number
  expired_in_period?: number
  renewal_rate?: number | null
  renewal_rate_available?: boolean
  renewal_rate_note?: string | null
}

export interface DashboardGeography extends DashboardSectionMeta {
  total_users?: number
  explicit_country_users?: number
  country_coverage_percentage?: number
  default_timezone_users?: number
  derived_country_users?: number
  ambiguous_or_unknown_timezone_users?: number
  by_country?: CountMap
  by_language?: CountMap
}

export interface DashboardCustomRosaries extends DashboardSectionMeta {
  created_in_period?: number
  public_in_period?: number
  by_share_status?: CountMap
  by_locale?: CountMap
  average_blocks?: number
  average_expanded_steps?: number
  users_near_limit?: number
  near_limit_threshold?: number
}

export interface DashboardWeeklyPrayers extends DashboardSectionMeta {
  prayer_requests_created?: number
  prayer_request_users?: number
  prayer_requests_by_week?: CountMap
  weekly_prayers_generated?: number
  weekly_prayer_users?: number
  generated_by_week?: CountMap
  generated_for_week?: CountMap
  generated_by_language?: CountMap
  generated_by_prayer_book?: CountMap
  daily_generated?: DailyShare[]
  perplexity_usage_proxy?: number
}

export interface FavoritePost {
  post_slug: string
  favorites?: number
}

export interface DashboardFavorites extends DashboardSectionMeta {
  created_in_period?: number
  users_with_favorites?: number
  by_kind?: CountMap
  top_posts?: FavoritePost[]
}

export interface ApiTopEndpoint {
  endpoint: string
  requests?: number
}

export interface ApiTopKey {
  id: number | string
  name: string
  requests?: number
  active?: boolean
}

export interface ApiNearDailyLimit {
  id: number | string
  name: string
  requests_today?: number
  daily_limit?: number
}

export interface DashboardApi extends DashboardSectionMeta {
  requests_in_period?: number
  requests_by_day?: Array<{ date: string; requests?: number }>
  top_endpoints?: ApiTopEndpoint[]
  top_keys?: ApiTopKey[]
  keys?: {
    active?: number
    inactive?: number
    expired?: number
  }
  near_daily_limit?: ApiNearDailyLimit[]
}

export interface DeveloperKeyCount {
  id: number | string
  name: string
  keys?: number
}

export interface DashboardDevelopers extends DashboardSectionMeta {
  registered?: number
  approved?: number
  pending_approval?: number
  with_api_keys?: number
  api_keys?: {
    total?: number
    active?: number
    inactive?: number
  }
  keys_by_developer?: DeveloperKeyCount[]
}

export interface DashboardData {
  overview?: DashboardOverview
  users?: DashboardUsers
  completions?: DashboardCompletions
  prayer_books?: DashboardPrayerBooks
  journals?: DashboardJournals
  audio?: DashboardAudio
  notifications?: DashboardNotifications
  life_rules?: DashboardLifeRules
  shared_offices?: DashboardSharedOffices
  engagement?: DashboardEngagement
  moderation?: DashboardModeration
  health?: DashboardHealth
  retention?: DashboardRetention
  onboarding?: DashboardOnboarding
  premium?: DashboardPremium
  geography?: DashboardGeography
  custom_rosaries?: DashboardCustomRosaries
  weekly_prayers?: DashboardWeeklyPrayers
  favorites?: DashboardFavorites
  api?: DashboardApi
  developers?: DashboardDevelopers
}

export interface DashboardResponse {
  period: DashboardPeriod
  sections: DashboardSectionName[]
  data: DashboardData
}

export interface DashboardFilters {
  start_date?: string
  end_date?: string
  sections?: DashboardSectionName[]
}

export type LifeRuleStatus = 'pending' | 'approved' | 'all'

export interface LifeRuleStep {
  id: number | string
  order?: number
  title: string
  description?: string
}

export interface LifeRuleOwner {
  id: number | string
  name: string
}

export interface LifeRule {
  id: number | string
  icon?: string
  title: string
  description?: string
  is_public?: boolean
  approved?: boolean
  adoption_count?: number
  created_at?: string
  updated_at?: string
  pending_since?: string | null
  owner?: LifeRuleOwner | null
  steps?: LifeRuleStep[]
}

export interface LifeRulePagination {
  total: number
  limit: number
  offset: number
  count: number
}

export interface LifeRulesResponse {
  life_rules: LifeRule[]
  pagination: LifeRulePagination
}

export type CustomRosaryShareStatus = 'private' | 'pending_review' | 'approved' | 'rejected'

export interface CustomRosaryAuthor {
  id: number | string
  name: string
  email?: string
}

export interface CustomRosaryStep {
  id?: number | string
  client_id?: string
  position?: number
  step_type?: string
  title?: string
  display_title?: string
  text?: string
  repeat_count?: number
}

export interface CustomRosaryBlock {
  id?: number | string
  client_id?: string
  position?: number
  name?: string
  repeat_count?: number
  in_cycle?: boolean
  steps?: CustomRosaryStep[]
}

export interface CustomRosaryPrayer {
  id: number | string
  client_id?: string
  title: string
  description?: string
  locale?: string
  cycle_repeat?: number
  is_public?: boolean
  share_status?: CustomRosaryShareStatus
  created_at?: string
  updated_at?: string
  author?: CustomRosaryAuthor | null
  moderation_note?: string | null
  strapi_slug?: string | null
  reviewed_at?: string | null
  moderation_reentry_count?: number
  last_moderation_reentry_at?: string | null
  blocks?: CustomRosaryBlock[]
  expanded_steps?: CustomRosaryStep[]
}

export interface CustomRosaryListResponse {
  custom_rosary_prayers: CustomRosaryPrayer[]
}

export interface CustomRosaryDetailResponse {
  custom_rosary_prayer: CustomRosaryPrayer
}

export interface LifeRulesQuery {
  status?: LifeRuleStatus
  search?: string
  limit?: number
  offset?: number
}

export interface CustomRosaryQuery {
  share_status?: Exclude<CustomRosaryShareStatus, 'private'>
}

export interface OrdoApiErrorPayload {
  error?: string
  code?: string
  request_id?: string
  parameter?: string
  invalid_sections?: string[]
  available_sections?: string[]
}

export class OrdoApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly requestId?: string
  readonly payload?: OrdoApiErrorPayload

  constructor(message: string, status: number, payload?: OrdoApiErrorPayload, requestId?: string) {
    super(message)
    this.name = 'OrdoApiError'
    this.status = status
    this.code = payload?.code
    this.requestId = requestId || payload?.request_id
    this.payload = payload
  }
}

export const isSessionError = (error: unknown): error is OrdoApiError =>
  error instanceof OrdoApiError && error.status === 401
