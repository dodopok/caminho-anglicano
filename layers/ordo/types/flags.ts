/**
 * The Feature flags tab's contract: `/api/v1/admin/feature_flags*` and
 * `/api/v1/admin/feature_flag_changes*` (estevao-api; the contract is
 * notes/painel-flags-livros/API-flags.md). Times come out in Brasília, ISO
 * 8601 with the offset (`2026-12-07T09:00:00.000-03:00`); a time sent without
 * an offset is read as Brasília too.
 */

export type FlagKind = 'feature' | 'prayer_book'

/** The general rule, for everyone without a rule of their own. `null`: no rule, counts as off. */
export type FlagRule = 'on' | 'off' | 'percentage'

/** What the switch shows: `on` (on, or 100%), `partial` (1–99%, or people chosen), `off`. */
export type FlagState = 'on' | 'partial' | 'off'

export interface FeatureFlag {
  key: string
  name: string
  description: string | null
  kind: FlagKind
  /** Only in book flags. */
  prayer_book_code: string | null
  prayer_book_name: string | null
  /** `false`: the book already left pre-release in the catalogue; the flag hides nothing. */
  prayer_book_release_gated: boolean | null
  requires_premium: boolean
  /** Requires login. */
  targeted: boolean
  rule: FlagRule | null
  /** 0–100, only with `rule: "percentage"`. */
  percentage: number | null
  state: FlagState
  /** People with a rule of their own that turns it on ("pessoas escolhidas"). */
  users_count: number
  /** People with a rule of their own that turns it off. */
  users_off_count: number
  /** Accounts that see it today (anonymous people are not counted). */
  reach_estimate: number | null
  enable_at: string | null
  disable_at: string | null
  /** A schedule more than 10 minutes late that the job did not apply. */
  schedule_overdue: boolean
  created_at: string | null
  updated_at: string | null
}

export type ScheduleAction = 'enable' | 'disable'

export interface ScheduledChange {
  key: string
  name: string
  description: string | null
  kind: FlagKind
  action: ScheduleAction
  scheduled_at: string
  overdue: boolean
}

export interface PrereleaseBook {
  key: string
  prayer_book_code: string
  name: string
  state: FlagState
  users_count: number
  reach_estimate: number | null
}

export interface FlagsSummary {
  counts: {
    total: number
    on: number
    partial: number
    off: number
    scheduled: number
    overdue: number
    feature: number
    prayer_book: number
    /** Per-person rules turned on, across every flag. */
    user_rules: number
  }
  /** Up to 5 coming scheduled changes, the overdue ones first. */
  next_scheduled: ScheduledChange[]
  /** Book flags whose book is in pre-release and that are not on for everyone. */
  prerelease_books: PrereleaseBook[]
}

export type FlagChangeAction =
  | 'create'
  | 'details'
  | 'rule'
  | 'schedule'
  | 'scheduled_enable'
  | 'scheduled_disable'
  | 'users_add'
  | 'users_remove'
  | 'delete'

export type UndoBlockedReason = 'undone' | 'expired' | 'superseded' | 'flag_deleted'

/** The part of a flag a change touched, before or after it. */
export interface FlagChangeState {
  key?: string
  name?: string
  description?: string | null
  kind?: FlagKind
  prayer_book_code?: string | null
  requires_premium?: boolean
  targeted?: boolean
  rule?: FlagRule | null
  percentage?: number | null
  enable_at?: string | null
  disable_at?: string | null
  /** users_add (after) */
  user_ids?: number[]
  enabled?: boolean
  /** users_add / users_remove (before): only who already had a rule. */
  rules?: Array<{ user_id: number; enabled: boolean }>
  /** delete (before) */
  users?: Array<{ user_id: number; enabled: boolean }>
}

export interface FlagChange {
  id: number
  flag_key: string
  flag_name: string | null
  action: FlagChangeAction
  before: FlagChangeState | null
  after: FlagChangeState | null
  created_at: string
  undone_at: string | null
  undoable: boolean
  undo_blocked_reason: UndoBlockedReason | null
}

export interface FlagsListResponse {
  flags: FeatureFlag[]
  summary: FlagsSummary
  /** The 10 latest changes of the last 30 days, of every flag. */
  recent_changes: FlagChange[]
}

export interface FlagUserRule {
  id: number
  name: string | null
  email: string | null
  premium_active: boolean
  /** The person's own rule: on or off. */
  enabled: boolean
  /** Whether the person sees it in the end (on, but without Ordo+ on a flag that needs it: false). */
  visible: boolean
  since: string | null
}

export interface PageMeta {
  page: number
  per_page: number
  total: number
}

/** `GET /feature_flags/:key`, and the answer of create and update. */
export interface FlagDetail extends FeatureFlag {
  users: FlagUserRule[]
  users_meta: PageMeta
  /** Up to 50 changes of this flag in the last 30 days, newest first. */
  changes: FlagChange[]
}

export interface FlagCreateInput {
  key?: string
  name: string
  description?: string | null
  kind: FlagKind
  prayer_book_code?: string | null
  requires_premium: boolean
  targeted: boolean
  rule: FlagRule
  percentage?: number | null
  enable_at?: string | null
  disable_at?: string | null
}

export type FlagUpdateInput = Partial<Pick<FlagCreateInput, 'name' | 'description' | 'requires_premium' | 'targeted' | 'rule' | 'percentage' | 'enable_at' | 'disable_at'>>

export interface FlagChangeResponse {
  change: FlagChange | null
}

export interface FlagUsersResponse {
  change: FlagChange | null
  users: FlagUserRule[]
}

export interface FlagUndoResponse {
  change: FlagChange
  flag: FeatureFlag | null
}

export interface FlagChangesResponse {
  changes: FlagChange[]
  meta: PageMeta
}

export type FlagCheckStop = 'premium' | 'login' | 'user_rule' | 'general_rule' | 'no_rule' | 'availability' | 'released'

export interface AdminUserMatch {
  id: number
  name: string | null
  email: string | null
  premium_active: boolean
}

export interface FlagCheckStep {
  step: 'premium' | 'login' | 'user_rule' | 'general_rule' | 'no_rule' | 'availability'
  required?: boolean
  passed?: boolean
  value?: boolean | null
  rule?: FlagRule | null
  percentage?: number | null
  bucket?: number | null
}

export interface FlagCheckResponse {
  key: string
  user: AdminUserMatch | null
  install_id: string | null
  visible: boolean
  stopped_at: FlagCheckStop
  /** 0–99: the person's fixed number for this flag's percentage. */
  bucket: number | null
  rule: FlagRule | null
  percentage: number | null
  user_rule: boolean | null
  steps: FlagCheckStep[]
}
