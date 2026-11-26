import { officeMeta } from './series'
import type {
  AdminPrayerBook,
  AdminPrayerBookDetailResponse,
  AdminPrayerBookFlag,
  AdminPrayerBookPdf,
  AdminPrayerBookSwitch,
  AdminPrayerBooksResponse,
  AdminRetentionWindow
} from '../types/books'
import type { AudioReadinessBook, AudioReadinessResponse } from '../types/audio'
import type { AudioPrayerBook, CountMap, DashboardData, RetentionSegment, RetentionWindow } from '../types/dashboard'
import type { UsageBreakdownResponse, UsageContentRow } from '../types/usage'

/**
 * The Livros tab's data, shaped once for the gallery, the ranking and a
 * book's page. Each number comes from the best source the API in use has:
 * the admin endpoint (`/admin/prayer_books`) when it is deployed, the reports
 * that already exist otherwise. A number no source has stays `null` and is
 * drawn as "—" or "em breve", never as zero.
 */

// --- Address -------------------------------------------------------------------

export const BOOKS_VIEWS = ['galeria', 'ranking'] as const
export type BooksView = typeof BOOKS_VIEWS[number]

export const RANKING_SORTS = ['rezaram', 'usam', 'chegaram', 'oficios', 'retorno', 'voz', 'nome'] as const
export type RankingSort = typeof RANKING_SORTS[number]

export const RANKING_SORT_LABELS: Record<RankingSort, string> = {
  rezaram: 'quem mais rezou',
  usam: 'quem mais usa hoje',
  chegaram: 'quem mais chegou',
  oficios: 'ofícios por pessoa',
  retorno: 'quem mais volta em 7 dias',
  voz: 'menos voz primeiro',
  nome: 'nome'
}

export const COMPARE_METRICS = ['pessoas', 'oficios', 'chegadas'] as const
export type CompareMetric = typeof COMPARE_METRICS[number]

export const MAX_COMPARED = 4

const CODE = /^[a-z0-9][a-z0-9_-]{0,63}$/i

/** `comparar=loc_2015,locb_2008`: up to four valid codes, no repeats. */
export const parseCompare = (value?: string | null): string[] => {
  if (!value) return []
  const out: string[] = []
  for (const raw of value.split(',')) {
    const code = raw.trim()
    if (CODE.test(code) && !out.includes(code)) out.push(code)
    if (out.length === MAX_COMPARED) break
  }
  return out
}

/** Adds or removes a book; a fifth is refused (the list comes back unchanged). */
export const toggleCompare = (list: string[], code: string): string[] => {
  if (list.includes(code)) return list.filter(item => item !== code)
  if (list.length >= MAX_COMPARED || !CODE.test(code)) return list
  return [...list, code]
}

export const compareToQuery = (list: string[]) => list.length ? list.join(',') : null

export interface BooksFilters {
  search: string
  language: string
  premium: boolean
  prerelease: boolean
}

export interface BooksAddress {
  view: BooksView
  book: string | null
  compare: string[]
  sort: RankingSort
  filters: BooksFilters
}

/** The tab's place in the URL: `?aba=livros&vista=ranking&ordem=voz&comparar=a,b`. */
export const parseBooksQuery = (values: Record<string, string | undefined>): BooksAddress => ({
  view: (BOOKS_VIEWS as readonly string[]).includes(values.vista || '') ? values.vista as BooksView : 'galeria',
  book: values.livro && CODE.test(values.livro) ? values.livro : null,
  compare: parseCompare(values.comparar),
  sort: (RANKING_SORTS as readonly string[]).includes(values.ordem || '') ? values.ordem as RankingSort : 'rezaram',
  filters: {
    search: (values.busca || '').slice(0, 80),
    language: values.idioma || '',
    premium: values.ordomais === '1',
    prerelease: values.prelancamento === '1'
  }
})

// --- Words -----------------------------------------------------------------------

export const LANGUAGE_LABELS: Record<string, string> = {
  'pt-BR': 'Português (Brasil)',
  'pt-PT': 'Português (Portugal)',
  pt: 'Português',
  en: 'English',
  'en-US': 'English (EUA)',
  'en-CA': 'English (Canadá)',
  'en-GB': 'English (Reino Unido)',
  'en-NZ': 'English (Nova Zelândia)',
  'en-AU': 'English (Austrália)',
  es: 'Español',
  cy: 'Cymraeg',
  fr: 'Français',
  la: 'Latim'
}

export const languageLabel = (language?: string | null) => language ? LANGUAGE_LABELS[language] || language : 'Sem idioma'

export const formatCount = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value) ? '—' : Math.round(value).toLocaleString('pt-BR')

export const formatRate = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value) ? '—' : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`

export const formatPerPerson = (completions: number | null, people: number | null) =>
  completions !== null && people ? (completions / people).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'

export const formatBytes = (bytes?: number | null) => {
  if (!bytes) return null
  const mb = bytes / 1_000_000
  return mb >= 1 ? `${mb.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(bytes / 1000)).toLocaleString('pt-BR')} kB`
}

export interface Pill {
  text: string
  tone: 'op-pill--ok' | 'op-pill--info' | 'op-pill--warn' | 'op-pill--danger' | 'op-pill--quiet'
}

/** The narration of the next 4 weeks in the default Bible, as a pill. */
export const narrationPill = (value: number | null): Pill => {
  if (value === null) return { text: 'Voz —', tone: 'op-pill--quiet' }
  const rounded = Math.floor(value)
  if (rounded >= 100) return { text: 'Voz 100%', tone: 'op-pill--ok' }
  if (rounded >= 90) return { text: `Voz ${rounded}%`, tone: 'op-pill--info' }
  if (rounded > 0) return { text: `Voz ${rounded}%`, tone: 'op-pill--warn' }
  return { text: 'Sem voz', tone: 'op-pill--danger' }
}

export const narrationColor = (value: number | null) =>
  value === null ? 'var(--op-ink-faint)' : value >= 90 ? 'var(--op-ok)' : value >= 60 ? 'var(--op-gold-ink)' : 'var(--op-warn)'

export const narrationCell = (value: number | null) =>
  value === null ? '' : value >= 100 ? 'op-cell--100' : value >= 90 ? 'op-cell--90' : value >= 60 ? 'op-cell--70' : value > 0 ? 'op-cell--40' : 'op-cell--0'

/**
 * The catalog's covers live on this site (`https://caminhoanglicano.com.br/
 * locs/thumbs/loc-2015.png`): read them from the same origin, in the lighter
 * WebP every one of them also has. Any other address is used as it is.
 */
export const coverSrc = (url?: string | null): string | null => {
  if (!url) return null
  try {
    const parsed = new URL(url, 'https://caminhoanglicano.com.br')
    if (/(^|\.)caminhoanglicano\.com\.br$/.test(parsed.hostname) && parsed.pathname.startsWith('/locs/thumbs/')) {
      return parsed.pathname.replace(/\.(png|jpe?g)$/i, '.webp')
    }
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null
  } catch {
    return null
  }
}

// --- Rows ------------------------------------------------------------------------

/** The public catalog's book, with the fields it sends that the Áudio type leaves out. */
export type CatalogBook = AudioPrayerBook & { thumbnail_url?: string | null; pdf_url?: string | null }

export interface BookRow {
  code: string
  name: string
  /** The name, with the language when another book has the same name ("ACNA - 2019 (en)"). */
  label: string
  description: string | null
  language: string | null
  jurisdiction: string | null
  year: number | null
  recommended: boolean
  isDefault: boolean
  premium: boolean
  gated: boolean
  externalOnly: boolean
  cover: string | null
  offices: string[]
  defaultBible: string | null
  /** People with this book chosen today (preference). */
  usingToday: number | null
  /** People who chose it at onboarding, ever. */
  chosenAtStart: number | null
  newUsers: number | null
  newUsersPrevious: number | null
  praying: number | null
  prayingPrevious: number | null
  completions: number | null
  completionsPrevious: number | null
  d7: number | null
  /** People the 7-day return was measured on; null when the source does not say. */
  d7Eligible: number | null
  spark: number[] | null
  /** The default Bible's narration over the next 4 weeks, %. */
  narration: number | null
  /** undefined: the API in use cannot say; null: no PDF in the manifest. */
  pdf: AdminPrayerBookPdf | null | undefined
  pdfUrl: string | null
  /** undefined: the API in use cannot say. */
  documents: number | null | undefined
  pdfOpens: number | null
  documentOpens: number | null
  shares: number | null
  weeklyPrayers: number | null
  flag: AdminPrayerBookFlag | null | undefined
}

export interface BookSources {
  admin?: AdminPrayerBooksResponse | null
  catalog?: CatalogBook[] | null
  readiness?: Pick<AudioReadinessResponse, 'books'> | null
  dashboard?: DashboardData | null
  previous?: DashboardData | null
  pdfOpens?: UsageBreakdownResponse | null
  documentOpens?: UsageBreakdownResponse | null
}

const num = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null

/** A count map's value; a book missing from a map that did load counted nothing. */
const fromMap = (map: CountMap | undefined | null, code: string): number | null => map ? num(map[code]) ?? 0 : null

const fromBreakdown = (report: UsageBreakdownResponse | null | undefined, code: string): number | null => {
  if (!report?.rows) return null
  return report.rows.filter(row => row.value === code).reduce((sum, row) => sum + (row.count || 0), 0)
}

const rateOf = (window?: RetentionWindow | null) => {
  if (!window || window.eligible === 0) return null
  return num(window.eligible_rate ?? window.rate)
}

/** The default Bible's coverage, or the first one that was computed. */
export const defaultNarration = (book?: AudioReadinessBook | null): number | null => {
  if (!book?.bibles?.length) return null
  const bible = book.bibles.find(item => item.default && item.computed) || book.bibles.find(item => item.computed)
  return num(bible?.totals?.percentage)
}

/** Names repeat across languages (ACNA - 2019 in pt-BR, en and es): add the language to tell them apart. */
const labelsFor = (books: Array<{ code: string; name: string; language?: string | null }>) => {
  const seen = new Map<string, number>()
  books.forEach(book => seen.set(book.name, (seen.get(book.name) || 0) + 1))
  return (book: { name: string; language?: string | null }) =>
    (seen.get(book.name) || 0) > 1 && book.language ? `${book.name} (${book.language})` : book.name
}

export const buildBookRows = (sources: BookSources): BookRow[] => {
  const adminBooks = sources.admin?.prayer_books || null
  const catalog = sources.catalog || []
  const base: Array<AdminPrayerBook | CatalogBook> = adminBooks || catalog
  const dashboard = sources.dashboard || {}
  const previous = sources.previous || null
  const readiness = new Map((sources.readiness?.books || []).map(book => [book.prayer_book_code, book]))
  const catalogByCode = new Map(catalog.map(book => [book.code, book]))
  const completionsBy = (data: DashboardData | null) => data?.completions?.by_prayer_book
    ? new Map(data.completions.by_prayer_book.map(row => [row.code, num(row.completions) ?? 0]))
    : null
  const completionsNow = completionsBy(dashboard)
  const completionsThen = completionsBy(previous)
  const retention = new Map((dashboard.retention?.by_prayer_book || []).filter(row => row.prayer_book_code).map(row => [row.prayer_book_code as string, row]))
  const chosen = dashboard.prayer_books?.usage_by_prayer_book
    ? new Map(dashboard.prayer_books.usage_by_prayer_book.map(row => [row.code, num(row.users) ?? 0]))
    : null
  const label = labelsFor(base)

  return base.map((book): BookRow => {
    const admin = adminBooks ? book as AdminPrayerBook : null
    const listed = catalogByCode.get(book.code) || (adminBooks ? null : book as CatalogBook)
    const metrics = admin?.metrics || null
    const before = admin?.previous || null
    const coverage = readiness.get(book.code)
    const pick = (fromAdmin: number | null | undefined, fallback: number | null) => num(fromAdmin) ?? fallback
    return {
      code: book.code,
      name: book.name,
      label: label(book),
      description: book.description || null,
      language: book.language || null,
      jurisdiction: book.jurisdiction || null,
      year: num(book.year),
      recommended: Boolean(book.is_recommended),
      isDefault: Boolean(admin?.is_default),
      premium: Boolean(book.premium_required),
      gated: Boolean(admin?.release_gated),
      externalOnly: Boolean(admin?.external_only),
      cover: coverSrc(admin?.thumbnail_url || admin?.image_url || listed?.thumbnail_url),
      offices: admin?.offices || listed?.available_offices || coverage?.offices || [],
      defaultBible: admin?.default_bible_version || coverage?.default_bible_version || null,
      usingToday: pick(metrics?.users_current, num(coverage?.readers)),
      chosenAtStart: pick(metrics?.onboarding_users, chosen ? chosen.get(book.code) ?? 0 : null),
      newUsers: pick(metrics?.new_users, fromMap(dashboard.onboarding?.choices?.prayer_books, book.code)),
      newUsersPrevious: pick(before?.new_users, fromMap(previous?.onboarding?.choices?.prayer_books, book.code)),
      praying: num(metrics?.praying_users),
      prayingPrevious: num(before?.praying_users),
      completions: pick(metrics?.completions, completionsNow ? completionsNow.get(book.code) ?? 0 : null),
      completionsPrevious: pick(before?.completions, completionsThen ? completionsThen.get(book.code) ?? 0 : null),
      d7: metrics ? num(metrics.d7_rate) : rateOf(retention.get(book.code)?.d7),
      d7Eligible: metrics ? num(metrics.d7_eligible) : num(retention.get(book.code)?.d7?.eligible),
      spark: admin?.spark?.length ? admin.spark.map(value => num(value) ?? 0) : null,
      narration: pick(admin?.narration_pct, defaultNarration(coverage)),
      pdf: admin ? admin.pdf ?? null : undefined,
      pdfUrl: listed?.pdf_url || null,
      documents: admin ? num(admin.documents_count) : undefined,
      pdfOpens: fromBreakdown(sources.pdfOpens, book.code),
      documentOpens: fromBreakdown(sources.documentOpens, book.code),
      shares: fromMap(dashboard.shared_offices?.by_prayer_book, book.code),
      weeklyPrayers: fromMap(dashboard.weekly_prayers?.generated_by_prayer_book, book.code),
      flag: admin ? admin.flag ?? null : undefined
    }
  })
}

// --- Filters, groups and order ------------------------------------------------

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const filterBooks = (rows: BookRow[], filters: BooksFilters) => {
  const query = fold(filters.search.trim())
  return rows.filter((row) => {
    if (filters.premium && !row.premium) return false
    if (filters.prerelease && !row.gated) return false
    if (filters.language && row.language !== filters.language) return false
    if (!query) return true
    return [row.name, row.code, row.jurisdiction || '', String(row.year || '')].some(field => fold(field).includes(query))
  })
}

export const languagesOf = (rows: BookRow[]) =>
  [...new Set(rows.map(row => row.language).filter((language): language is string => Boolean(language)))]
    .sort((a, b) => languageLabel(a).localeCompare(languageLabel(b), 'pt-BR'))

export interface BookGroup {
  id: 'pt' | 'en' | 'rest'
  title: string
  note: string
  books: BookRow[]
}

const groupOf = (language: string | null): BookGroup['id'] => {
  if (language?.toLowerCase().startsWith('pt')) return 'pt'
  if (language === 'en') return 'en'
  return 'rest'
}

const byNumber = (read: (row: BookRow) => number | null) => (a: BookRow, b: BookRow) => {
  const x = read(a)
  const y = read(b)
  if (x === null && y === null) return a.name.localeCompare(b.name, 'pt-BR')
  if (x === null) return 1
  if (y === null) return -1
  return y - x || a.name.localeCompare(b.name, 'pt-BR')
}

/**
 * The gallery's shelves: Portuguese, English, then every other language and
 * edition. Inside each, whoever prayed most comes first; before the API
 * counts that per book, whoever uses it most today.
 */
export const groupBooks = (rows: BookRow[]): BookGroup[] => {
  const praying = rows.some(row => row.praying !== null)
  const order = praying ? byNumber(row => row.praying) : byNumber(row => row.usingToday)
  const how = praying ? 'quem mais rezou primeiro' : 'quem mais usa hoje primeiro'
  const pick = (id: BookGroup['id']) => rows.filter(row => groupOf(row.language) === id).sort(order)
  const pt = pick('pt')
  const rest = pick('rest')
  const ptLanguages = [...new Set(pt.map(row => row.language))].filter(Boolean)
  const restLanguages = [...new Set(rest.map(row => row.language))].filter(Boolean)
  return ([
    { id: 'pt', title: 'Português', note: ptLanguages.length > 1 ? `${ptLanguages.join(' e ')} · ${how}` : how, books: pt },
    { id: 'en', title: 'English', note: how, books: pick('en') },
    { id: 'rest', title: 'Outras línguas e edições', note: restLanguages.length ? `${restLanguages.join(', ')} · ${how}` : how, books: rest }
  ] as BookGroup[]).filter(group => group.books.length)
}

const perPerson = (row: BookRow) => row.completions !== null && row.praying ? row.completions / row.praying : null

export const sortBooks = (rows: BookRow[], sort: RankingSort) => {
  const list = [...rows]
  if (sort === 'nome') return list.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  if (sort === 'voz') {
    return list.sort((a, b) => {
      if (a.narration === null && b.narration === null) return a.name.localeCompare(b.name, 'pt-BR')
      if (a.narration === null) return 1
      if (b.narration === null) return -1
      return a.narration - b.narration || a.name.localeCompare(b.name, 'pt-BR')
    })
  }
  const read: Record<Exclude<RankingSort, 'nome' | 'voz'>, (row: BookRow) => number | null> = {
    rezaram: row => row.praying ?? row.usingToday,
    usam: row => row.usingToday,
    chegaram: row => row.newUsers,
    oficios: perPerson,
    retorno: row => row.d7
  }
  return list.sort(byNumber(read[sort]))
}

// --- Summary -------------------------------------------------------------------

export interface Segment {
  text: string
  strong?: boolean
}

const sum = (values: Array<number | null>) => {
  const known = values.filter((value): value is number => value !== null)
  return known.length ? known.reduce((total, value) => total + value, 0) : null
}

export interface CatalogCounts {
  total: number
  languages: number
  open: number
  prerelease: number
  premium: number
  usingToday: number | null
  newUsers: number | null
  newUsersPrevious: number | null
}

export const catalogCounts = (rows: BookRow[]): CatalogCounts => ({
  total: rows.length,
  languages: new Set(rows.map(row => row.language).filter(Boolean)).size,
  open: rows.filter(row => !row.gated).length,
  prerelease: rows.filter(row => row.gated).length,
  premium: rows.filter(row => row.premium).length,
  usingToday: sum(rows.map(row => row.usingToday)),
  newUsers: sum(rows.map(row => row.newUsers)),
  newUsersPrevious: sum(rows.map(row => row.newUsersPrevious))
})

const plural = (count: number, one: string, many: string) => `${count.toLocaleString('pt-BR')} ${count === 1 ? one : many}`

const listNames = (names: string[]) => names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`

/**
 * The band at the top of the gallery, written only from the data: how many
 * books, who most people use, who arrived, who grew, what is in pre-release
 * and how many books still lack a voice.
 */
export const booksSummary = (rows: BookRow[], phrase: string): { headline: string; detail: Segment[] } => {
  const counts = catalogCounts(rows)
  let headline = `${plural(counts.total, 'livro', 'livros')} em ${plural(counts.languages, 'idioma', 'idiomas')}.`
  const top = [...rows].filter(row => row.usingToday !== null).sort(byNumber(row => row.usingToday))[0]
  if (top && counts.usingToday) {
    const share = (top.usingToday || 0) / counts.usingToday
    if (share > 0.5) headline += ` Mais da metade de quem tem um livro escolhido usa o ${top.label}.`
    else if (share >= 0.2) headline += ` O ${top.label} é o livro de ${formatRate(share * 100)} de quem tem um escolhido.`
  }

  const detail: Segment[] = []
  if (counts.newUsers !== null) {
    const opening = phrase.charAt(0).toLocaleUpperCase('pt-BR') + phrase.slice(1)
    detail.push({ text: `${opening}, ` }, { text: plural(counts.newUsers, 'pessoa', 'pessoas'), strong: true }, { text: counts.newUsers === 1 ? ' chegou e escolheu um livro.' : ' chegaram e escolheram um livro.' })
  }
  // Growth only counts where there were people to grow from.
  const grower = rows
    .filter(row => row.newUsers !== null && row.newUsersPrevious !== null && row.newUsersPrevious >= 10)
    .map(row => ({ row, change: ((row.newUsers as number) - (row.newUsersPrevious as number)) / (row.newUsersPrevious as number) * 100 }))
    .filter(item => item.change >= 1)
    .sort((a, b) => b.change - a.change)[0]
  if (grower) detail.push({ text: `${detail.length ? ' ' : ''}O ` }, { text: grower.row.label, strong: true }, { text: ` foi o que mais cresceu (+${Math.round(grower.change)}%).` })
  const gated = rows.filter(row => row.gated)
  if (gated.length) {
    detail.push({ text: `${detail.length ? ' ' : ''}${gated.length === 1 ? 'O ' : 'Os livros '}` }, { text: listNames(gated.map(row => row.label)), strong: true }, { text: gated.length === 1 ? ' segue em pré-lançamento.' : ' seguem em pré-lançamento.' })
  }
  const known = rows.filter(row => row.narration !== null)
  const quiet = known.filter(row => (row.narration as number) < 60).length
  if (known.length && quiet) {
    detail.push({ text: `${detail.length ? ' ' : ''}` }, { text: plural(quiet, 'livro', 'livros'), strong: true }, { text: quiet === 1 ? ' ainda tem menos de 60% de voz.' : ' ainda têm menos de 60% de voz.' })
  }
  return { headline, detail }
}

// --- Ranking ---------------------------------------------------------------------

export const SHARE_COLORS = ['var(--op-s1)', 'var(--op-s2)', 'var(--op-s3)', 'var(--op-s4)', 'var(--op-s6)']
export const COMPARE_COLORS = ['var(--op-s1)', 'var(--op-s2)', 'var(--op-s3)', 'var(--op-s4)']

export interface ShareRow {
  label: string
  code: string | null
  share: number
  color: string
}

/** The five books most people prayed with, and everyone else; null before the API counts people per book. */
export const prayingShare = (rows: BookRow[], top = 5): ShareRow[] | null => {
  const known = rows.filter(row => row.praying !== null && (row.praying as number) > 0)
  const total = known.reduce((total, row) => total + (row.praying as number), 0)
  if (!total) return null
  const sorted = [...known].sort(byNumber(row => row.praying))
  const head = sorted.slice(0, top).map((row, index) => ({ label: row.label, code: row.code, share: (row.praying as number) / total * 100, color: SHARE_COLORS[index] }))
  const rest = sorted.length - head.length
  if (!rest) return head
  return [...head, { label: `Outros ${rest}`, code: null, share: Math.max(0, 100 - head.reduce((sum, row) => sum + row.share, 0)), color: 'var(--op-s8)' }]
}

const csvCell = (value: string | number | null) => {
  if (value === null) return ''
  const text = String(value)
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** The ranking as CSV: numbers per book only, never a person. */
export const booksCsv = (rows: BookRow[]) => {
  const header = ['posicao', 'codigo', 'livro', 'idioma', 'usam_hoje', 'chegaram', 'rezaram', 'oficios', 'oficios_por_pessoa', 'voltam_7_dias_pct', 'voz_pct', 'pdf', 'documentos', 'pre_lancamento', 'ordo_mais']
  const lines = rows.map((row, index) => [
    index + 1,
    row.code,
    row.name,
    row.language,
    row.usingToday,
    row.newUsers,
    row.praying,
    row.completions,
    perPerson(row) === null ? null : Math.round((perPerson(row) as number) * 10) / 10,
    row.d7 === null ? null : Math.round(row.d7 * 10) / 10,
    row.narration === null ? null : Math.round(row.narration * 10) / 10,
    row.pdf === undefined ? null : row.pdf?.published ? 'sim' : 'nao',
    row.documents ?? null,
    row.gated ? 'sim' : 'nao',
    row.premium ? 'sim' : 'nao'
  ].map(csvCell).join(','))
  return [header.join(','), ...lines].join('\n')
}

export interface ChartLine {
  code: string
  color: string
  values: Array<number | null>
  path: string
  last: number | null
}

/**
 * Lines for the comparison chart, on a 1000×260 box. `index` rescales each
 * line so its first day with data is 100, which puts a small book beside a
 * large one.
 */
export const chartLines = (series: Array<{ code: string; values: Array<number | null> }>, { index = false } = {}) => {
  const scaled = series.map((line) => {
    if (!index) return line
    const first = line.values.find(value => value !== null && value > 0) ?? null
    return { ...line, values: line.values.map(value => value === null || !first ? null : value / first * 100) }
  })
  const max = Math.max(1, ...scaled.flatMap(line => line.values.filter((value): value is number => value !== null)))
  const top = niceMax(max)
  const lines: ChartLine[] = scaled.map((line, position) => {
    const count = Math.max(1, line.values.length - 1)
    let path = ''
    let pen = false
    line.values.forEach((value, i) => {
      if (value === null) {
        pen = false
        return
      }
      path += `${pen ? 'L' : 'M'}${(i / count * 1000).toFixed(1)},${(250 - value / top * 240).toFixed(1)} `
      pen = true
    })
    const known = line.values.filter((value): value is number => value !== null)
    return { code: line.code, color: COMPARE_COLORS[position % COMPARE_COLORS.length], values: line.values, path: path.trim(), last: known.length ? known[known.length - 1] : null }
  })
  return { lines, max: top }
}

/** A round ceiling for an axis: 1.180 → 1.200, 37 → 40. */
export const niceMax = (value: number) => {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]
  return (steps.find(step => step * magnitude >= value) || 10) * magnitude
}

// --- A book's page ---------------------------------------------------------------

export interface RetentionBars {
  /** People who arrived by this book in the cohort measured. */
  users: number | null
  rows: Array<{ label: string; rate: number | null; overall: number | null }>
  /** Fewer than 20 people reached day 7: too few to say. */
  tooFew: boolean
}

export const MIN_RETENTION_PEOPLE = 20

const overallRate = (segments: RetentionSegment[], key: 'd1' | 'd7' | 'd30') => {
  let retained = 0
  let eligible = 0
  segments.forEach((segment) => {
    const window = segment[key]
    if (!window?.eligible) return
    retained += window.users || 0
    eligible += window.eligible
  })
  return eligible ? retained / eligible * 100 : null
}

const adminRate = (window?: AdminRetentionWindow | null) => window && window.eligible !== 0 ? num(window.rate) : null

/**
 * "Quem chegou, voltou?": the book's cohort beside everyone's. The admin
 * detail measures every book; before it, `retention.by_prayer_book` only
 * lists the 8 largest, and a book outside them has no bars.
 */
export const retentionFor = (
  detail: AdminPrayerBookDetailResponse['retention'] | null | undefined,
  dashboard: DashboardData | null | undefined,
  code: string
): RetentionBars | null => {
  if (detail?.book) {
    const book = detail.book
    const all = detail.all || null
    const eligible = num(book.d7?.eligible)
    return {
      users: num(book.users),
      tooFew: eligible !== null && eligible < MIN_RETENTION_PEOPLE,
      rows: [
        { label: '1 dia', rate: adminRate(book.d1), overall: adminRate(all?.d1) },
        { label: '7 dias', rate: adminRate(book.d7), overall: adminRate(all?.d7) },
        { label: '30 dias', rate: adminRate(book.d30), overall: adminRate(all?.d30) }
      ]
    }
  }
  const segments = dashboard?.retention?.by_prayer_book
  const segment = segments?.find(row => row.prayer_book_code === code)
  if (!segment) return null
  const all = segments || []
  const eligible = num(segment.d7?.eligible)
  return {
    users: num(segment.users),
    tooFew: eligible !== null && eligible < MIN_RETENTION_PEOPLE,
    rows: [
      { label: '1 dia', rate: rateOf(segment.d1), overall: overallRate(all, 'd1') },
      { label: '7 dias', rate: rateOf(segment.d7), overall: overallRate(all, 'd7') },
      { label: '30 dias', rate: rateOf(segment.d30), overall: overallRate(all, 'd30') }
    ]
  }
}

export interface NarrationRow {
  bible: string
  name: string
  note: string
  total: number | null
  cells: Array<{ office: string; value: number | null }>
}

/** The book's Bibles worth showing (the default and those with readers), with coverage per office. */
export const narrationRows = (book?: AudioReadinessBook | null): NarrationRow[] => {
  if (!book) return []
  const offices = book.offices?.length ? book.offices : ['morning', 'midday', 'evening', 'compline']
  return book.bibles
    .filter(bible => bible.default || bible.featured || bible.computed)
    .sort((a, b) => Number(b.default) - Number(a.default) || (b.readers || 0) - (a.readers || 0))
    .map((bible) => {
      const share = num(bible.share)
      const sharePart = share !== null ? `${formatRate(share * 100)} dos leitores` : bible.readers ? `${formatCount(bible.readers)} leitores` : ''
      return {
        bible: bible.bible_version,
        name: bible.name,
        note: [bible.default ? 'padrão' : '', sharePart, bible.computed ? '' : 'não calculada'].filter(Boolean).join(' · '),
        total: bible.computed ? num(bible.totals?.percentage) : null,
        cells: offices.map(office => ({ office, value: bible.computed ? num(bible.by_office?.[office]?.percentage) : null }))
      }
    })
}

export interface OfficeShare {
  office: string
  label: string
  color: string
  share: number
}

export const officeShares = (map?: CountMap | null): OfficeShare[] => {
  const entries = Object.entries(map || {}).filter(([, value]) => value > 0)
  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  if (!total) return []
  return entries
    .map(([office, value]) => ({ office, label: officeMeta(office).label, color: officeMeta(office).color, share: value / total * 100, order: officeMeta(office).order }))
    .sort((a, b) => a.order - b.order)
    .map(({ order: _order, ...rest }) => rest)
}

export interface SwitchBars {
  rows: Array<{ code: string | null; label: string; users: number; width: number }>
  total: number
}

/** The three largest, then "Outros", each as a share of the largest row. */
export const switchBars = (list: AdminPrayerBookSwitch[] | undefined | null, labels: Record<string, string> = {}, top = 3, total?: number | null): SwitchBars => {
  const sorted = [...(list || [])].filter(item => item.users > 0).sort((a, b) => b.users - a.users)
  const head = sorted.slice(0, top)
  const rest = sorted.slice(top).reduce((sum, item) => sum + item.users, 0)
  const rows: Array<{ code: string | null; label: string; users: number }> = head.map(item => ({
    code: item.code,
    label: item.code === null ? 'Sem primeiro acesso' : labels[item.code] || item.name || item.code,
    users: item.users
  }))
  if (rest) rows.push({ code: null, label: 'Outros', users: rest })
  const max = Math.max(1, ...rows.map(row => row.users))
  return {
    rows: rows.map(row => ({ ...row, width: row.users / max * 100 })),
    total: num(total) ?? sorted.reduce((sum, item) => sum + item.users, 0)
  }
}

export interface DocumentRow {
  title: string
  slug: string
  opens: number | null
}

/** The book's documents in their order, with the opens the telemetry counted for each slug. */
export const documentRows = (
  documents: Array<{ title: string; slug: string; order?: number | null }> | null | undefined,
  content?: UsageContentRow[] | null
): DocumentRow[] => {
  const opens = content
    ? content.filter(row => row.event === 'document_opened' || row.content_kind === 'document').reduce<Record<string, number>>((map, row) => {
        map[row.content_slug] = (map[row.content_slug] || 0) + row.count
        return map
      }, {})
    : null
  return [...(documents || [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title, 'pt-BR'))
    .map(doc => ({ title: doc.title, slug: doc.slug, opens: opens ? opens[doc.slug] ?? 0 : null }))
}

/** What a book in pre-release still lacks, in words. */
export const missingForLaunch = (row: BookRow, documents: number | null) => {
  const missing: Segment[][] = []
  if (row.narration !== null && row.narration < 100) missing.push([{ text: `${formatRate(100 - Math.floor(row.narration))} da narração`, strong: true }, { text: ' das próximas 4 semanas' }])
  if (row.pdf === null || (row.pdf && !row.pdf.published)) missing.push([{ text: 'o ' }, { text: 'PDF', strong: true }])
  if (documents === 0) missing.push([{ text: 'os ' }, { text: 'documentos', strong: true }])
  return missing
}
