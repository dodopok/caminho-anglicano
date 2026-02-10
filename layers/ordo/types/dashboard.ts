export interface DashboardOverview {
  total_users: number
  premium_users: number
  free_users: number
  premium_conversion_rate: number
  total_completions: number
  total_journals: number
  avg_completions_per_user: number
}

export interface TopStreaker {
  email: string
  longest_streak: number
  current_streak: number
}

export interface DashboardUsers {
  new_users_in_period: number
  active_last_7_days: number
  active_last_30_days: number
  avg_current_streak: number
  avg_longest_streak: number
  top_streakers: TopStreaker[]
}

export interface TopCompleter {
  email: string
  completions: number
}

export interface DailyCompletion {
  date: string
  count: number
}

export interface DashboardCompletions {
  total_in_period: number
  avg_duration_seconds: number
  by_office_type: Record<string, number>
  by_hour: Record<string, number>
  top_completers: TopCompleter[]
  daily_completions: DailyCompletion[]
}

export interface PrayerBookUsage {
  code: string
  name: string
  users: number
}

export interface DashboardPrayerBooks {
  usage_by_prayer_book: PrayerBookUsage[]
  most_used: PrayerBookUsage
}

export interface TopWriter {
  email: string
  journals: number
}

export interface DashboardJournals {
  total_in_period: number
  users_with_journals: number
  by_entry_type: Record<string, number>
  by_office_type: Record<string, number>
  top_writers: TopWriter[]
}

export interface DashboardAudio {
  total_sessions: number
  completed_sessions: number
  failed_sessions: number
  running_sessions: number
  texts_with_audio: number
  total_texts: number
  audio_coverage_percentage: number
  total_texts_processed: number
  total_texts_failed: number
}

export interface DashboardNotifications {
  total_in_period: number
  sent: number
  failed: number
  success_rate: number
  by_type: Record<string, number>
}

export interface TopAdoptedRule {
  title: string
  adoptions: number
}

export interface DashboardLifeRules {
  total_rules: number
  public_rules: number
  approved_rules: number
  total_adoptions: number
  top_adopted: TopAdoptedRule[]
}

export interface DailyShare {
  date: string
  count: number
}

export interface DashboardSharedOffices {
  total_in_period: number
  unique_users_sharing: number
  by_office_type: Record<string, number>
  by_prayer_book: Record<string, number>
  daily_shares: DailyShare[]
}

export interface DailyActiveUser {
  date: string
  active_users: number
}

export interface DashboardEngagement {
  dau: number
  wau: number
  mau: number
  dau_wau_ratio: number
  wau_mau_ratio: number
  daily_active_trend: DailyActiveUser[]
}

export interface DashboardData {
  overview: DashboardOverview
  users: DashboardUsers
  completions: DashboardCompletions
  prayer_books: DashboardPrayerBooks
  journals: DashboardJournals
  audio: DashboardAudio
  notifications: DashboardNotifications
  life_rules: DashboardLifeRules
  shared_offices: DashboardSharedOffices
  engagement: DashboardEngagement
}

export interface DashboardFilters {
  start_date?: string
  end_date?: string
}
