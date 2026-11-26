import type { AudioEstimate, AudioEstimateRow, AudioGenerationRequest, AudioCatalogRequest, AudioOperation, AudioProfile } from './dashboard'

/**
 * The Áudio tab's new contract (notes/painel-redesign/API-audio.md in the
 * design notes; estevao-api `Api::V1::Admin::Audio*`). Everything here is
 * optional on purpose: an API from before these endpoints answers 404, or
 * returns the old payload without the new fields, and the screen degrades.
 */

export type AudioOffice = 'morning' | 'midday' | 'evening' | 'compline' | string

/** US$ = characters / 1000 × the provider's price per thousand. */
export interface AudioCost {
  usd: number | null
  usd_per_1k_characters: number | null
  characters: number
  provider?: string | null
  provider_name?: string | null
  /** A dry run: what it would cost, nothing was bought. */
  estimated?: boolean
}

export interface AudioCoverageCount {
  ready_clips: number
  missing_clips: number
  missing_characters: number
  /** ready / (ready + missing) × 100, one decimal; null when there is nothing to narrate. */
  percentage: number | null
  days_covered?: number
}

export interface AudioReadinessBible {
  bible_version: string
  name: string
  full_name?: string | null
  default: boolean
  readers?: number
  share?: number
  featured: boolean
  computed: boolean
  computed_at?: string | null
  totals?: AudioCoverageCount | null
  by_office?: Record<AudioOffice, AudioCoverageCount> | null
  /** Only in the book detail's list. */
  percentage?: number | null
}

export interface AudioReadinessBook {
  prayer_book_code: string
  name: string
  language?: string | null
  offices: AudioOffice[]
  readers?: number
  default_bible_version?: string | null
  bibles: AudioReadinessBible[]
}

export interface AudioReadinessRun {
  id: number
  status: 'running' | 'completed' | 'partial' | 'failed' | string
  started_at?: string | null
  finished_at?: string | null
  duration_seconds?: number | null
  offices_checked?: number
  books?: number
  error_message?: string | null
}

export interface AudioReadinessResponse {
  days: number
  start_date: string
  end_date: string
  computed_at: string | null
  featured_share?: number
  run?: AudioReadinessRun | null
  summary?: AudioCoverageCount & { books?: number; books_complete?: number }
  books: AudioReadinessBook[]
}

export type AudioSource = 'scripture' | 'psalms' | 'collects' | 'office_texts' | string

export interface AudioSourceCount {
  source: AudioSource
  ready_clips: number
  missing_clips: number
  missing_characters: number
}

export interface AudioCalendarDay {
  date: string
  offices: Record<AudioOffice, AudioCoverageCount>
}

export interface AudioReadinessDetail {
  prayer_book_code: string
  name: string
  bible_version: string
  bible_name?: string
  default?: boolean
  days: number
  start_date: string
  end_date: string
  computed: boolean
  computed_at?: string | null
  offices: AudioOffice[]
  totals: AudioCoverageCount | null
  cost: AudioCost | null
  by_source: AudioSourceCount[]
  calendar: AudioCalendarDay[]
  bibles: AudioReadinessBible[]
}

export type AudioProviderStatus = 'up' | 'down' | 'rejecting' | 'unknown'

export interface AudioProviderHealth {
  provider: string
  provider_name: string
  status: AudioProviderStatus | string
  checked_at?: string | null
  last_success_at?: string | null
  last_clip_at?: string | null
  down_since?: string | null
  last_error?: {
    at?: string | null
    kind?: 'outage' | 'rejected' | string
    http_status?: string | null
    message?: string | null
    operation_id?: number | string | null
  } | null
  waiting_operations?: number
  next_attempt_at?: string | null
  usd_per_1k_characters?: number | null
  profiles?: AudioProfile[]
}

export type AudioAttemptEvent = 'requested' | 'started' | 'resumed' | 'waiting' | 'completed' | 'failed' | 'cancelled' | 'retried' | 'try_now' | string

export interface AudioAttempt {
  event: AudioAttemptEvent
  at: string
  attempt?: number
  by?: string | null
  reason?: 'provider_outage' | 'provider_rejected' | 'budget' | 'cancelled' | 'error' | string
  provider?: string | null
  http_status?: string | null
  message?: string | null
  next_attempt_at?: string | null
  processed_items?: number
  total_items?: number
  generated_clips?: number
  generated_characters?: number
}

/** An operation with the fields the new API adds; every one is optional. */
export interface AudioRun extends AudioOperation {
  provider?: string | null
  waiting_for_provider?: boolean
  character_budget?: number | null
  cost?: AudioCost | null
  actions?: { retry?: boolean; cancel?: boolean; try_now?: boolean } | null
  /** Absent: an API from before the history. `[]`: an operation from before it. */
  attempts?: AudioAttempt[]
}

export type AudioRunStatusFilter = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting' | 'active'

export interface AudioRunFilters {
  status?: AudioRunStatusFilter | ''
  kind?: string
  prayer_book_code?: string
  before?: number | string
  limit?: number
}

export interface AudioRunCounts {
  all?: number
  queued?: number
  running?: number
  waiting?: number
  completed?: number
  failed?: number
  cancelled?: number
}

export interface AudioRunsPage {
  operations: AudioRun[]
  /** Null on an API that does not page yet: the list is the latest runs. */
  pagination: { limit: number; count: number; has_more: boolean; next_before: number | string | null } | null
  /** Null on an API that does not count yet. */
  counts: AudioRunCounts | null
}

export interface AudioEstimateItem {
  section: string
  label: string
  source: AudioSource
  status: 'ready' | 'partial' | 'missing' | string
  ready_clips: number
  missing_clips: number
  missing_characters: number
  audio_url?: string | null
}

export interface AudioEstimateRowDetail extends AudioEstimateRow {
  by_source?: AudioSourceCount[]
  items?: AudioEstimateItem[]
}

export interface AudioEstimateDetail extends AudioEstimate {
  cost?: AudioCost | null
  /** Generations already queued or running (the worker is shared). */
  /** API-audio.md §6: the generations active right now (all of them, in the estimate). */
  running_generations?: { count?: number | null; operations?: Array<Partial<AudioOperation>> } | null
  running_operations?: number | null
  active_operations?: number | null
  by_source?: AudioSourceCount[]
  rows?: AudioEstimateRowDetail[]
}

export interface AudioEstimateRequest extends AudioGenerationRequest {
  include_items?: boolean
}

export interface AudioGenerationOrder extends AudioGenerationRequest {
  /** Stop when the run would narrate more than this; absent = no limit. */
  character_budget?: number
}

export interface AudioCatalogOrder extends AudioCatalogRequest {
  character_budget?: number
}
