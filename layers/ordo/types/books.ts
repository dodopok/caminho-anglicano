import type { CountMap } from './dashboard'

/**
 * The Livros tab's admin endpoints (estevao-api, notes/painel-flags-livros/
 * API-livros.md): `GET /api/v1/admin/prayer_books` and
 * `GET /api/v1/admin/prayer_books/:code`. Every field is optional on purpose:
 * until the API is deployed both answer 404 and the tab falls back to the
 * reports that already exist; an older build may leave fields out. `null` is
 * "cannot be measured" (drawn as "—"); `0` is a real zero.
 */

export interface AdminPrayerBooksPeriod {
  start_date: string
  end_date: string
}

/** Each point of a book's `spark`: one day up to 92 days, one week (from Monday) above. */
export interface AdminPrayerBooksSpark {
  bucket: 'day' | 'week' | string
  dates: string[]
}

export interface AdminPrayerBookPdf {
  published: boolean
  pages?: number | null
  bytes?: number | null
}

export interface AdminPrayerBookFlag {
  key: string
  /** The global rule; null means no rule (the default: off). */
  rule?: 'on' | 'off' | string | null
  /** People with a rule of their own turned on (the testers of a book in pre-release). */
  users_count?: number | null
  /** Reserved for step 3 (Flags); null today. */
  scheduled?: unknown
}

/** One book's numbers for a window. */
export interface AdminPrayerBookMetrics {
  /** "Usam hoje": people whose preference today is this book (whole base). */
  users_current?: number | null
  /** "Escolheram ao chegar": the book of the first access (whole base). */
  onboarding_users?: number | null
  /** "Chegaram": accounts created in the period with this book at the first access. */
  new_users?: number | null
  /** "Rezaram": distinct people with an office in this book in the period. */
  praying_users?: number | null
  completions?: number | null
  /** % of who arrived by this book and prayed on day 7; null with nobody eligible. */
  d7_rate?: number | null
  /** How many had reached day 7 (under 20: too few to measure). */
  d7_eligible?: number | null
}

export interface AdminPrayerBook {
  code: string
  name: string
  description?: string | null
  language?: string | null
  jurisdiction?: string | null
  year?: number | null
  order?: number | null
  /** The app's default book (the "Padrão" pill). */
  is_default?: boolean
  is_recommended?: boolean
  /** Ordo+. */
  premium_required?: boolean
  /** Pre-release: only people the book's flag lets in can see it. */
  release_gated?: boolean
  external_only?: boolean
  thumbnail_url?: string | null
  image_url?: string | null
  offices?: string[] | null
  default_bible_version?: string | null
  /** null: no PDF in the manifest. */
  pdf?: AdminPrayerBookPdf | null
  /** Published CMS documents; null when the CMS did not answer. */
  documents_count?: number | null
  /** The default Bible's narration over the next 4 weeks (0–100); null if never computed. */
  narration_pct?: number | null
  flag?: AdminPrayerBookFlag | null
  metrics?: AdminPrayerBookMetrics | null
  /** Only with `compare=previous`. */
  previous?: AdminPrayerBookMetrics | null
  /** `praying_users` at each of the response's `spark.dates`. */
  spark?: number[] | null
}

export interface AdminPrayerBooksTotals extends AdminPrayerBookMetrics {
  books?: number
  /** Preferences pointing at a code outside the catalog. */
  unattributed_users?: number | null
  previous?: AdminPrayerBookMetrics | null
}

export interface AdminPrayerBooksResponse {
  period?: AdminPrayerBooksPeriod | null
  previous_period?: AdminPrayerBooksPeriod | null
  /** When the numbers were computed (server cache of 10 minutes). */
  generated_at?: string | null
  spark?: AdminPrayerBooksSpark | null
  totals?: AdminPrayerBooksTotals | null
  prayer_books: AdminPrayerBook[]
}

export interface AdminPrayerBookDay {
  date: string
  praying_users?: number | null
  completions?: number | null
  new_users?: number | null
}

export interface AdminRetentionWindow {
  users?: number | null
  eligible?: number | null
  rate?: number | null
}

export interface AdminRetentionCohort {
  users?: number | null
  d1?: AdminRetentionWindow | null
  d7?: AdminRetentionWindow | null
  d30?: AdminRetentionWindow | null
}

export interface AdminPrayerBookSwitch {
  /** null: no first access on record. */
  code: string | null
  /** null for a code outside the catalog. */
  name?: string | null
  users: number
}

export interface AdminPrayerBookSwitchSide {
  total?: number | null
  books?: AdminPrayerBookSwitch[] | null
}

export interface AdminPrayerBookSwitches {
  onboarding_users?: number | null
  users_current?: number | null
  came_from?: AdminPrayerBookSwitchSide | null
  went_to?: AdminPrayerBookSwitchSide | null
}

export interface AdminPrayerBookReadiness {
  cover?: boolean | null
  offices?: string[] | null
  lectionary_until?: string | null
  narration_pct?: number | null
  narration_computed_at?: string | null
  pdf?: boolean | null
  documents?: number | null
}

export interface AdminPrayerBookDocument {
  slug: string
  title: string
  order?: number | null
}

export interface AdminPrayerBookDetailResponse {
  period?: AdminPrayerBooksPeriod | null
  previous_period?: AdminPrayerBooksPeriod | null
  generated_at?: string | null
  prayer_book: AdminPrayerBook
  spark?: AdminPrayerBooksSpark | null
  /** One point per day of the period. */
  series?: AdminPrayerBookDay[] | null
  /** Only with compare: the previous window's days, in the same order. */
  previous_series?: AdminPrayerBookDay[] | null
  by_office_type?: CountMap | null
  retention?: { book?: AdminRetentionCohort | null; all?: AdminRetentionCohort | null } | null
  switches?: AdminPrayerBookSwitches | null
  premium_users?: number | null
  clients?: { app?: number | null; web?: number | null; other?: number | null; total?: number | null } | null
  readiness?: AdminPrayerBookReadiness | null
  /** Published CMS documents in the CMS order; null when the CMS did not answer. */
  documents?: AdminPrayerBookDocument[] | null
}

/** CMS `GET /api/prayer-book-documents/by-code/:code` (public, published only, no content). */
export interface CmsPrayerBookDocument {
  id?: number
  documentId?: string
  title: string
  slug: string
  prayer_book_code?: string
  order?: number | null
}

export interface CmsPrayerBookDocumentsResponse {
  data: CmsPrayerBookDocument[]
}
