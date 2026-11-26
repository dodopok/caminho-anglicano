import { toDateInput } from './period'
import { OrdoApiError } from '../types/dashboard'
import type { AudioOperation, AudioEstimateRow } from '../types/dashboard'
import type {
  AudioAttempt,
  AudioCalendarDay,
  AudioCoverageCount,
  AudioLiturgicalDay,
  AudioOffice,
  AudioProviderHealth,
  AudioReadinessBible,
  AudioReadinessBook,
  AudioReadinessResponse,
  AudioRun,
  AudioSource
} from '../types/audio'

/**
 * Words and numbers for the Áudio tab. Everything here is pure: the panel
 * hands in the API's payloads and `now`, and draws what comes back.
 */

// ---------------------------------------------------------------------------
// Numbers and time

const MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.']
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const parseDay = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`)
const asDate = (value?: string | Date | null) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const number = (value?: number | null) => new Intl.NumberFormat('pt-BR').format(value || 0)

/** "US$ 3,72"; tiny amounts keep a cent ("US$ 0,01"), never "US$ 0,00" for a real cost. */
export const usd = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const rounded = value > 0 && value < 0.01 ? 0.01 : value
  return `US$ ${rounded.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** "US$ 0,015 por mil caracteres" */
export const pricePerThousand = (value?: number | null) => value === null || value === undefined
  ? null
  : `US$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} por mil caracteres`

/** 7,9 mi · 212 mil · 948 */
export const compact = (value?: number | null) => {
  const amount = value || 0
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (amount >= 10_000) return `${Math.round(amount / 1000).toLocaleString('pt-BR')} mil`
  return number(amount)
}

export const clock = (value?: string | Date | null) => {
  const date = asDate(value)
  return date ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''
}

/** "26 nov." */
export const shortDay = (value: string) => {
  const date = parseDay(value)
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}

/** "Domingo, 29 de novembro" */
export const longDay = (value: string) => {
  const date = parseDay(value)
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS_LONG[date.getMonth()]}`
}

export const addDays = (value: string, days: number) => {
  const date = parseDay(value)
  date.setDate(date.getDate() + days)
  return toDateInput(date)
}

export const dateRange = (start: string, days: number) => Array.from({ length: Math.max(0, days) }, (_, index) => addDays(start, index))

/** "26 nov. a 23 dez." / "26 nov. – 2 dez." */
export const spanLabel = (start: string, days: number, joiner = ' a ') => {
  if (days <= 1) return shortDay(start)
  const end = addDays(start, days - 1)
  const a = parseDay(start)
  const b = parseDay(end)
  if (joiner !== ' a ' && a.getMonth() === b.getMonth()) return `${a.getDate()}${joiner}${b.getDate()} ${MONTHS[b.getMonth()]}`
  return `${shortDay(start)}${joiner}${shortDay(end)}`
}

/** "Hoje", "Ontem", "Segunda, 23 de novembro" */
export const dayLabel = (value: string | Date, now = new Date()) => {
  const date = asDate(value)
  if (!date) return ''
  const day = toDateInput(date)
  const today = toDateInput(now)
  if (day === today) return 'Hoje'
  if (day === addDays(today, -1)) return 'Ontem'
  return longDay(day)
}

/** "38 min", "1 h 10 min" */
export const minutesText = (minutes: number) => {
  const total = Math.max(1, Math.round(minutes))
  if (total < 60) return `${total} min`
  const hours = Math.floor(total / 60)
  const rest = total % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

export const plural = (count: number, one: string, many: string) => `${number(count)} ${count === 1 ? one : many}`

const WORDS = ['Nenhuma', 'Uma', 'Duas', 'Três', 'Quatro', 'Cinco']
export const countWord = (count: number) => WORDS[count] || number(count)

// ---------------------------------------------------------------------------
// Offices, sources, providers

export const OFFICE_ORDER = ['morning', 'midday', 'evening', 'compline'] as const

export const OFFICE_TITLES: Record<string, string> = {
  morning: 'Oração da Manhã',
  midday: 'Oração do Meio-dia',
  evening: 'Oração da Noite',
  compline: 'Completas'
}

export const officeOrder = (offices: AudioOffice[]) => [...new Set(offices)].sort((a, b) => {
  const ia = OFFICE_ORDER.indexOf(a as typeof OFFICE_ORDER[number])
  const ib = OFFICE_ORDER.indexOf(b as typeof OFFICE_ORDER[number])
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
})

export const sourceLabel = (source: AudioSource, bible?: string | null) => ({
  scripture: bible ? `Leituras bíblicas (${bible})` : 'Leituras bíblicas',
  office_texts: 'Textos fixos do ofício',
  collects: 'Coletas',
  psalms: 'Salmos (saltério do livro)'
}[source] || source)

/** The column "Fonte" of a day's trechos. */
export const sourceShort = (source: AudioSource, bible?: string | null) => ({
  scripture: bible ? `Bíblia ${bible}` : 'Bíblia',
  office_texts: 'Textos do livro',
  collects: 'Coletas',
  psalms: 'Saltério do livro'
}[source] || source)

const PROVIDER_NAMES: Record<string, string> = { fish: 'Fish Audio', openai: 'OpenAI', elevenlabs: 'ElevenLabs', google: 'Google' }
export const providerName = (code?: string | null) => code ? PROVIDER_NAMES[code] || code : 'o provedor de voz'

export const PROVIDER_SITES: Record<string, string> = {
  fish: 'https://fish.audio',
  openai: 'https://platform.openai.com',
  elevenlabs: 'https://elevenlabs.io'
}

// ---------------------------------------------------------------------------
// Coverage

export type CoverageBucket = '100' | '90' | '70' | '40' | '0' | 'na'

/** The matrix cell: 100% · 90–99% · 60–89% · 1–59% · nada · the book has no such office. */
export const coverageBucket = (percentage?: number | null): CoverageBucket => {
  if (percentage === null || percentage === undefined) return 'na'
  if (percentage >= 100) return '100'
  if (percentage >= 90) return '90'
  if (percentage >= 60) return '70'
  if (percentage > 0) return '40'
  return '0'
}

/** A day's square: tudo pronto · quase (90%+) · metade ou mais · pouco · nada. */
export const calendarBucket = (cell?: AudioCoverageCount | null) => {
  if (!cell) return 'op-cna'
  const total = (cell.ready_clips || 0) + (cell.missing_clips || 0)
  if (!total) return 'op-cna'
  const percentage = cell.percentage ?? cell.ready_clips / total * 100
  if (percentage >= 100) return 'op-c4'
  if (percentage >= 90) return 'op-c3'
  if (percentage >= 50) return 'op-c2'
  if (percentage > 0) return 'op-c1'
  return 'op-c0'
}

/** 99,6% is not done: it reads 99%, and anything above zero is at least "<1%". */
export const coverageText = (percentage?: number | null) => {
  if (percentage === null || percentage === undefined) return '—'
  if (percentage >= 100) return '100%'
  if (percentage > 0 && percentage < 1) return '<1%'
  return `${Math.floor(percentage)}%`
}

export const percentOf = (ready = 0, missing = 0) => ready + missing ? Math.round(ready / (ready + missing) * 1000) / 10 : null

export const sharePercent = (share?: number | null) => share === null || share === undefined ? null : Math.round(share * 100)

/** The Bibles a book shows: the default and the ones ≥ 5% of its readers chose; the rest behind "mostrar todas". */
export const visibleBibles = <T extends Pick<AudioReadinessBible, 'default' | 'featured' | 'share'>>(bibles: T[], showAll = false, featuredShare = 0.05) =>
  showAll ? bibles : bibles.filter(bible => bible.default || bible.featured || (bible.share ?? 0) >= featuredShare)

export const defaultBible = (book: AudioReadinessBook) => book.bibles.find(bible => bible.default) || book.bibles[0] || null

export interface CoverageRow {
  key: string
  book: AudioReadinessBook
  bible: AudioReadinessBible
  first: boolean
  note: string
  running: number | null
}

/**
 * The matrix, a row per book × Bible. `runningFor` says whether a generation
 * is narrating that book (and how far it got) so the row says "gerando agora".
 */
export const coverageRows = (
  readiness: AudioReadinessResponse | null,
  { showAll = false, runningFor }: { showAll?: boolean; runningFor?: (code: string, bible: string) => number | null } = {}
): CoverageRow[] => {
  const rows: CoverageRow[] = []
  let namedReaders = false
  for (const book of readiness?.books || []) {
    visibleBibles(book.bibles, showAll, readiness?.featured_share).forEach((bible, index) => {
      const running = runningFor?.(book.prayer_book_code, bible.bible_version) ?? null
      let note: string
      if (bible.default) {
        const never = bible.computed && (bible.totals?.ready_clips || 0) === 0
        note = running !== null ? 'padrão · gerando agora' : never ? 'padrão · nunca gerado' : 'padrão do livro'
      } else {
        const share = sharePercent(bible.share)
        note = share === null ? 'não escolhida' : `escolhida por ${share < 1 && (bible.share || 0) > 0 ? '<1' : share}%${namedReaders ? '' : ' dos leitores'}`
        if (share !== null) namedReaders = true
        if (!bible.computed) note = `${note} · não calculada`
      }
      rows.push({ key: `${book.prayer_book_code}:${bible.bible_version}`, book, bible, first: index === 0, note, running })
    })
  }
  return rows
}

export const hiddenBibleCount = (readiness: AudioReadinessResponse | null) =>
  (readiness?.books || []).reduce((sum, book) => sum + book.bibles.length - visibleBibles(book.bibles, false, readiness?.featured_share).length, 0)

export const totalBibleCount = (readiness: AudioReadinessResponse | null) =>
  (readiness?.books || []).reduce((sum, book) => sum + book.bibles.length, 0)

export const matrixOffices = (readiness: AudioReadinessResponse | null) => officeOrder((readiness?.books || []).flatMap(book => book.offices))

export interface CoverageListItem {
  code: string
  bible: string
  percentage: number | null
  note: string
}

/** The phone's list: each book's default Bible, the worst first. */
export const worstFirst = (readiness: AudioReadinessResponse | null, runningFor?: (code: string) => boolean): CoverageListItem[] =>
  (readiness?.books || [])
    .map(book => {
      const bible = defaultBible(book)
      const percentage = bible?.totals?.percentage ?? null
      const note = runningFor?.(book.prayer_book_code) ? 'gerando' : percentage === 0 ? 'nunca gerado' : ''
      return { code: book.prayer_book_code, bible: bible?.name || '', percentage, note }
    })
    .sort((a, b) => (a.percentage ?? 101) - (b.percentage ?? 101) || a.code.localeCompare(b.code))

export const coverageColor = (percentage?: number | null) => {
  if (percentage === null || percentage === undefined) return 'var(--op-ink-faint)'
  if (percentage >= 100) return 'var(--op-ok)'
  if (percentage >= 90) return 'var(--op-action)'
  if (percentage > 0) return 'var(--op-warn)'
  return 'var(--op-danger)'
}

// ---------------------------------------------------------------------------
// Calendar (office × day)

export type CalendarCells = Record<string, Partial<Record<AudioOffice, AudioCoverageCount>>>

/** The calendar from the stored detail, or from the estimate's rows (summed over variants). */
export const calendarFromDays = (days: AudioCalendarDay[]): CalendarCells =>
  Object.fromEntries(days.map(day => [day.date.slice(0, 10), { ...day.offices }]))

/** Each day's name in the book's calendar, by date; days the API does not name are left out. */
export type LiturgicalDays = Record<string, AudioLiturgicalDay>

export const liturgicalDaysFrom = (days: AudioCalendarDay[] | null | undefined): LiturgicalDays =>
  Object.fromEntries((days || [])
    .filter(day => day.liturgical_day?.name?.trim())
    .map(day => [day.date.slice(0, 10), { ...day.liturgical_day!, name: day.liturgical_day!.name.trim() }]))

/** "Domingo, 29 de novembro · 1º Domingo do Advento", or just the date when the day has no name. */
export const dayTitle = (date: string, liturgical?: AudioLiturgicalDay | null) =>
  liturgical?.name ? `${longDay(date)} · ${liturgical.name}` : longDay(date)

export const calendarFromRows = (rows: AudioEstimateRow[]): CalendarCells => {
  const cells: CalendarCells = {}
  rows.forEach(row => {
    if (!row.date || !row.office_type) return
    const date = row.date.slice(0, 10)
    const day = cells[date] || (cells[date] = {})
    const current = day[row.office_type] || { ready_clips: 0, missing_clips: 0, missing_characters: 0, percentage: null }
    const ready = current.ready_clips + (row.ready_clips || 0)
    const missing = current.missing_clips + (row.missing_clips || 0)
    day[row.office_type] = { ready_clips: ready, missing_clips: missing, missing_characters: current.missing_characters + (row.missing_characters || 0), percentage: percentOf(ready, missing) }
  })
  return cells
}

export interface CalendarColumn {
  date: string
  initial: string
  day: number
  sunday: boolean
  today: boolean
}

export const calendarColumns = (start: string, days: number, today: string): CalendarColumn[] =>
  dateRange(start, days).map(date => {
    const value = parseDay(date)
    return { date, initial: WEEKDAY_INITIALS[value.getDay()], day: value.getDate(), sunday: value.getDay() === 0, today: date === today }
  })

/** The square opened first: the nearest office with something missing, or today's first. */
export const firstGap = (cells: CalendarCells, columns: CalendarColumn[], offices: AudioOffice[]) => {
  for (const column of columns) {
    for (const office of offices) {
      if ((cells[column.date]?.[office]?.missing_clips || 0) > 0) return { date: column.date, office }
    }
  }
  return columns[0] && offices[0] ? { date: columns[0].date, office: offices[0] } : null
}

// ---------------------------------------------------------------------------
// Cost

/** The provider's price per thousand characters, from whatever knows it. */
export const pricePer1k = (...sources: Array<{ usd_per_1k_characters?: number | null } | number | null | undefined>) => {
  for (const source of sources) {
    if (typeof source === 'number' && Number.isFinite(source)) return source
    if (source && typeof source === 'object' && typeof source.usd_per_1k_characters === 'number') return source.usd_per_1k_characters
  }
  return null
}

export const costOf = (characters: number, price: number | null) => price === null ? null : characters / 1000 * price

/** What a run cost (or, for a dry run, would cost). */
export const runCost = (run: AudioRun, price: number | null): { usd: number; estimated: boolean } | null => {
  if (run.cost && typeof run.cost.usd === 'number') return { usd: run.cost.usd, estimated: Boolean(run.cost.estimated) }
  if (isDryRun(run)) {
    const missing = typeof run.result?.missing_characters === 'number' ? run.result.missing_characters : null
    const usdValue = missing === null ? null : costOf(missing, price)
    return usdValue === null ? null : { usd: usdValue, estimated: true }
  }
  if (!run.generated_characters) return null
  const usdValue = costOf(run.generated_characters, price)
  return usdValue === null ? null : { usd: usdValue, estimated: false }
}

export interface WeekCost {
  label: string
  missing: number
  characters: number
  usd: number | null
}

/** The estimate's rows, week by week from the first day. */
export const weeklyCost = (rows: AudioEstimateRow[], start: string, days: number, price: number | null): WeekCost[] => {
  const weeks: WeekCost[] = []
  for (let offset = 0; offset < days; offset += 7) {
    const length = Math.min(7, days - offset)
    weeks.push({ label: spanLabel(addDays(start, offset), length, ' – '), missing: 0, characters: 0, usd: null })
  }
  rows.forEach(row => {
    if (!row.date) return
    const index = Math.floor((parseDay(row.date).getTime() - parseDay(start).getTime()) / 86_400_000 / 7)
    const week = weeks[index]
    if (!week) return
    week.missing += row.missing_clips || 0
    week.characters += row.missing_characters || 0
  })
  weeks.forEach(week => { week.usd = costOf(week.characters, price) })
  return weeks
}

// The provider narrates a few thousand characters a minute; the runs that
// finished say how fast it really was here.
const DEFAULT_CHARS_PER_MINUTE = 3500

export const charactersPerMinute = (runs: AudioOperation[]) => {
  const rates = runs
    .filter(run => run.status === 'completed' && run.kind === 'generate_office' && (run.generated_characters || 0) > 2000 && run.started_at && run.completed_at)
    .map(run => (run.generated_characters || 0) / Math.max(1, (new Date(run.completed_at!).getTime() - new Date(run.started_at!).getTime()) / 60_000))
    .filter(rate => Number.isFinite(rate) && rate > 0)
    .sort((a, b) => a - b)
  return rates.length ? rates[Math.floor(rates.length / 2)] : DEFAULT_CHARS_PER_MINUTE
}

export const durationEstimate = (characters: number, runs: AudioOperation[] = []) =>
  characters > 0 ? `cerca de ${minutesText(characters / charactersPerMinute(runs))}` : 'nada a narrar'

// ---------------------------------------------------------------------------
// Runs

export const isLive = (run: AudioOperation) => run.status === 'queued' || run.status === 'running'
export const isWaiting = (run: AudioRun) => run.status === 'queued' && (Boolean(run.waiting_for_provider) || Boolean(run.next_attempt_at))
export const isDryRun = (run: AudioOperation) => run.kind === 'generate_catalog' && (run.parameters?.generate === false || run.parameters?.dry_run === true || run.result?.generate === false)

const param = <T>(run: AudioOperation, key: string) => run.parameters?.[key] as T | undefined

export const runBible = (run: AudioOperation) => {
  const preferences = param<Record<string, unknown>>(run, 'preferences')
  const bible = preferences?.bible_version
  return typeof bible === 'string' && bible ? bible.toUpperCase() : null
}

export const runOffices = (run: AudioOperation) => {
  const offices = param<string[]>(run, 'offices')
  return Array.isArray(offices) ? offices : []
}

export const runTitle = (run: AudioOperation) => {
  const start = param<string>(run, 'start_date')
  const days = Number(param<number>(run, 'days') || 0)
  switch (run.kind) {
    case 'generate_office': return start ? `Ofícios de ${spanLabel(start, days || 1)}` : 'Ofícios por datas'
    case 'generate_catalog': return isDryRun(run) ? 'Simulação do livro inteiro' : 'Livro inteiro'
    case 'regenerate_clip': return 'Nova tentativa de um clip'
    case 'cleanup_clips': return param<string>(run, 'profile_status') === 'stale' ? 'Limpeza de clips com instruções antigas' : 'Limpeza de clips sem registro de versão'
    case 'index_catalog': return 'Indexação do catálogo'
    default: return 'Operação de áudio'
  }
}

export const KIND_LABELS: Record<string, string> = {
  generate_office: 'Ofícios por datas',
  generate_catalog: 'Livro inteiro',
  regenerate_clip: 'Nova tentativa de clip',
  cleanup_clips: 'Limpeza',
  index_catalog: 'Indexação'
}

export type Tone = 'info' | 'ok' | 'gold' | 'warn' | 'danger' | 'quiet'

export interface RunStatus {
  key: 'running' | 'waiting' | 'queued' | 'completed' | 'listen' | 'dry' | 'failed' | 'cancelled'
  label: string
  tone: Tone
  icon: 'refresh' | 'clock' | 'check' | 'pen' | 'alert' | 'close'
}

export const runStatus = (run: AudioRun, { pendingCandidates = 0 } = {}): RunStatus => {
  if (isWaiting(run)) return { key: 'waiting', label: run.next_attempt_at ? `Nova tentativa às ${clock(run.next_attempt_at)}` : 'Esperando o provedor', tone: 'gold', icon: 'clock' }
  if (run.status === 'running') return { key: 'running', label: 'Rodando', tone: 'info', icon: 'refresh' }
  if (run.status === 'queued') return { key: 'queued', label: 'Na fila', tone: 'quiet', icon: 'clock' }
  if (run.status === 'failed') return { key: 'failed', label: 'Falhou', tone: 'danger', icon: 'alert' }
  if (run.status === 'cancelled') return { key: 'cancelled', label: 'Cancelada', tone: 'quiet', icon: 'close' }
  if (isDryRun(run)) return { key: 'dry', label: 'Simulação', tone: 'quiet', icon: 'check' }
  if (run.kind === 'regenerate_clip' && pendingCandidates > 0) return { key: 'listen', label: 'Espera você ouvir', tone: 'gold', icon: 'pen' }
  return { key: 'completed', label: 'Concluída', tone: 'ok', icon: 'check' }
}

/** When a running generation should end, from how long it took to get this far. */
export const estimateFinish = (run: AudioOperation, now = new Date()) => {
  const started = asDate(run.started_at)
  const done = run.processed_items || 0
  const total = run.total_items || 0
  if (run.status !== 'running' || !started || !done || !total || done >= total) return null
  const elapsed = now.getTime() - started.getTime()
  if (elapsed <= 0) return null
  return new Date(now.getTime() + elapsed / done * (total - done))
}

export const runProgress = (run: AudioOperation) => {
  if (run.progress_percentage !== null && run.progress_percentage !== undefined) return Math.round(run.progress_percentage)
  return run.total_items ? Math.round((run.processed_items || 0) / run.total_items * 100) : null
}

const durationBetween = (from?: string | null, to?: string | null) => {
  const a = asDate(from)
  const b = asDate(to)
  return a && b && b > a ? (b.getTime() - a.getTime()) / 60_000 : null
}

/** The right-hand time of a run: "14:52 · termina ~15:40", "09:14 · levou 38 min", "21:40 · parou 22:52". */
export const runTime = (run: AudioRun, now = new Date(), { withDay = false } = {}) => {
  const startedAt = run.started_at || run.created_at
  const day = withDay && startedAt ? `${dayLabel(startedAt, now).toLowerCase()}, ` : ''
  const start = `${day}${clock(startedAt)}`
  if (isWaiting(run)) return `começou ${clock(startedAt)}`
  if (run.status === 'running') {
    const finish = estimateFinish(run, now)
    return finish ? `${withDay ? 'começou ' : ''}${clock(startedAt)} · termina ~${clock(finish)}` : `começou ${clock(startedAt)}`
  }
  if (run.status === 'queued') return `pedida ${clock(run.created_at)}`
  if (run.status === 'failed') return `${start} · parou ${clock(run.completed_at)}`
  const took = durationBetween(run.started_at, run.completed_at)
  return took === null ? start : `${start} · ${withDay ? '' : 'levou '}${minutesText(took)}`
}

export interface RunGroup {
  label: string
  runs: AudioRun[]
}

/** Runs grouped by the day they were asked for, newest first. */
export const groupRunsByDay = (runs: AudioRun[], now = new Date()): RunGroup[] => {
  const groups: RunGroup[] = []
  runs.forEach(run => {
    const label = dayLabel(run.created_at || run.started_at || now, now)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.runs.push(run)
    else groups.push({ label, runs: [run] })
  })
  return groups
}

export type FailureKind = 'credit' | 'key' | 'budget' | 'outage' | 'timeout' | 'error'

/** What went wrong, from the run's last error and history. */
export const classifyFailure = (message?: string | null, attempts: AudioAttempt[] = []): FailureKind => {
  const last = [...attempts].reverse().find(attempt => attempt.event === 'failed' || attempt.event === 'waiting')
  if (last?.reason === 'budget') return 'budget'
  const status = last?.http_status || ''
  const text = `${message || ''} ${last?.message || ''}`.toLowerCase()
  if (/budgetexceeded|limite de gasto/.test(text)) return 'budget'
  if (status === '402' || /\b402\b|insufficient|cr[eé]dito|credit|quota|payment/.test(text)) return 'credit'
  if (status === '401' || status === '403' || /\b401\b|\b403\b|unauthori[sz]ed|api key|chave/.test(text)) return 'key'
  if (/timeout|timed out|n[aã]o respondeu|deadline/.test(text)) return 'timeout'
  if (/^5\d\d$/.test(status) || /\b50[0-4]\b|outage|unavailable|fora do ar|bad gateway/.test(text)) return 'outage'
  return 'error'
}

export interface FailureCopy {
  happened: string
  todo: string
}

export const failureCopy = (run: AudioRun, provider: string, price: number | null): FailureCopy => {
  const kind = classifyFailure(run.error_message, run.attempts)
  const saved = run.generated_clips || 0
  const done = run.processed_items || 0
  const total = run.total_items || 0
  const left = Math.max(0, total - done)
  const unit = run.kind === 'generate_office' ? 'ofícios' : 'itens'
  const leftCharacters = done && left ? Math.round((run.generated_characters || 0) / done * left / 100) * 100 : null
  const leftCost = leftCharacters === null ? null : costOf(leftCharacters, price)
  const reuse = saved
    ? ` Os ${number(saved)} clips salvos são reaproveitados${left ? `; só os ${number(left)} ${unit} restantes são narrados${leftCharacters ? ` (≈ ${number(leftCharacters)} caracteres${leftCost === null ? '' : `, ${usd(leftCost)}`})` : ''}` : ''}.`
    : ''
  switch (kind) {
    case 'credit': return {
      happened: `a ${provider} recusou com “crédito insuficiente” (402). Esse erro não se resolve esperando, então a API não tentou de novo.`,
      todo: `recarregue os créditos na ${provider} e toque em “Tentar de novo”.${reuse}`
    }
    case 'key': return {
      happened: `a ${provider} recusou a chave de acesso (401). Esse erro não se resolve esperando, então a API não tentou de novo.`,
      todo: `confira a chave da ${provider} configurada na API e toque em “Tentar de novo”.${reuse}`
    }
    case 'budget': return {
      happened: 'a geração chegou ao limite de gasto que foi pedido e parou antes de passar dele.',
      todo: `peça de novo com um limite maior, se o custo fizer sentido.${reuse}`
    }
    case 'outage': return {
      happened: `a ${provider} ficou fora do ar e não voltou depois das novas tentativas.`,
      todo: `quando a ${provider} voltar, toque em “Tentar de novo”.${reuse}`
    }
    case 'timeout': return {
      happened: `a ${provider} não respondeu a tempo.`,
      todo: `toque em “Tentar de novo”; se repetir, veja se a ${provider} está no ar.${reuse}`
    }
    default: return {
      happened: run.error_message ? `a geração parou com um erro: ${run.error_message}` : 'a geração parou com um erro.',
      todo: `tente de novo; se repetir, o erro completo está em “Copiar erro”.${reuse}`
    }
  }
}

/** The run's headline in the detail: "bas_1985_en parou no meio". */
export const runHeadline = (run: AudioRun) => {
  const subject = run.prayer_book_code || runTitle(run)
  if (isWaiting(run)) return `${subject} espera o provedor`
  if (run.status === 'running') return `${subject} em andamento`
  if (run.status === 'queued') return `${subject} na fila`
  if (run.status === 'cancelled') return `${subject} cancelada`
  if (run.status === 'failed') return (run.processed_items || 0) > 0 && (run.processed_items || 0) < (run.total_items || 0) ? `${subject} parou no meio` : `${subject} falhou`
  return `${subject} concluída`
}

// The waits between attempts after an outage (Audio::ProviderOutageRetry): 5,
// 15 and 30 minutes; the fourth failure ends the run.
export const RETRY_WAITS = [5, 15, 30]
export const MAX_ATTEMPTS = RETRY_WAITS.length + 1

/** The next attempt and, if it fails too, the last one. */
export const retrySchedule = (run: AudioRun) => {
  const next = asDate(run.next_attempt_at)
  if (!next) return null
  const waiting = [...(run.attempts || [])].reverse().find(attempt => attempt.event === 'waiting')
  if (!waiting?.attempt) return { next, last: null, attempt: null }
  const attempt = waiting.attempt + 1
  const rest = RETRY_WAITS.slice(waiting.attempt).reduce((sum, minutes) => sum + minutes, 0)
  return { next, last: rest ? new Date(next.getTime() + rest * 60_000) : null, attempt }
}

export interface TimelineItem {
  key: string
  text: string
  detail: string
  tone: 'quiet' | 'info' | 'gold' | 'danger' | 'ok'
}

const REJECTION_TEXT: Record<string, string> = { 402: 'crédito insuficiente', 401: 'chave recusada', 403: 'acesso negado' }

/** The run's history in words. Without attempts (older API or run) it falls back to its timestamps. */
export const runTimeline = (run: AudioRun, now = new Date()): TimelineItem[] => {
  const attempts = run.attempts || []
  const provider = providerName(run.provider)
  const when = (at?: string | null, sameDay = true) => {
    if (!at) return ''
    return sameDay ? clock(at) : `${dayLabel(at, now).toLowerCase()}, ${clock(at)}`
  }
  const unit = run.kind === 'generate_office' ? 'ofícios prontos' : 'itens prontos'
  if (!attempts.length) {
    const items: TimelineItem[] = [{ key: 'requested', text: 'Pedida pelo portal', detail: [when(run.created_at, false), run.requested_by].filter(Boolean).join(' · '), tone: 'quiet' }]
    if (run.started_at) items.push({ key: 'started', text: 'Começou', detail: when(run.started_at), tone: 'info' })
    if (run.completed_at) {
      const failed = run.status === 'failed'
      items.push({ key: 'end', text: failed ? 'Falhou' : run.status === 'cancelled' ? 'Cancelada' : 'Concluída', detail: `${when(run.completed_at)}${run.processed_items ? ` · ${number(run.processed_items)} ${unit}` : ''}`, tone: failed ? 'danger' : run.status === 'cancelled' ? 'quiet' : 'ok' })
    }
    return items
  }
  return attempts.map((attempt, index) => {
    const ready = attempt.processed_items ? ` · ${number(attempt.processed_items)} ${unit}` : ''
    const key = `${attempt.event}-${index}`
    switch (attempt.event) {
      case 'requested': return { key, text: 'Pedida pelo portal', detail: [when(attempt.at, false), attempt.by ? 'admin' : ''].filter(Boolean).join(' · '), tone: 'quiet' }
      case 'started': {
        const days = Number(param<number>(run, 'days') || 0)
        const offices = runOffices(run).length
        const bible = runBible(run)
        const scope = [days ? plural(days, 'dia', 'dias') : '', offices ? plural(offices, 'ofício', 'ofícios') : '', bible || ''].filter(Boolean).join(', ')
        return { key, text: scope ? `Começou: ${scope}` : 'Começou', detail: when(attempt.at), tone: 'info' }
      }
      case 'waiting': {
        const waited = durationBetween(attempt.at, attempt.next_attempt_at)
        return {
          key,
          text: `${providerName(attempt.provider) || provider} fora do ar${attempt.http_status ? ` (${attempt.http_status})` : ''}${waited ? ` · esperou ${minutesText(waited)}` : ''}`,
          detail: `${when(attempt.at)}${attempt.attempt ? ` · tentativa ${attempt.attempt + 1} de ${MAX_ATTEMPTS}` : ''}`,
          tone: 'gold'
        }
      }
      case 'resumed': return { key, text: 'Retomou de onde parou', detail: `${when(attempt.at)}${ready}`, tone: 'info' }
      case 'retried': return { key, text: 'Pedida de novo', detail: when(attempt.at, false), tone: 'info' }
      case 'try_now': return { key, text: 'Tentativa antecipada para agora', detail: when(attempt.at), tone: 'info' }
      case 'completed': return { key, text: 'Concluída', detail: `${when(attempt.at)}${ready}`, tone: 'ok' }
      case 'cancelled': return { key, text: 'Cancelada', detail: when(attempt.at), tone: 'quiet' }
      case 'failed': {
        let text = 'Falhou'
        if (attempt.reason === 'budget') text = 'Parou no limite de gasto'
        else if (attempt.reason === 'provider_rejected') text = `Recusado: ${REJECTION_TEXT[attempt.http_status || ''] || 'o provedor recusou'}${attempt.http_status ? ` (${attempt.http_status})` : ''}`
        else if (attempt.reason === 'provider_outage') text = `${provider} não voltou${attempt.http_status ? ` (${attempt.http_status})` : ''}`
        return { key, text, detail: `${when(attempt.at)}${ready}`, tone: 'danger' }
      }
      default: return { key, text: attempt.event, detail: when(attempt.at), tone: 'quiet' }
    }
  })
}

export const parametersLine = (run: AudioOperation) => Object.entries(run.parameters || {})
  .map(([key, value]) => {
    if (Array.isArray(value)) return `${key}: ${value.join(', ')}`
    if (value && typeof value === 'object') return Object.entries(value as Record<string, unknown>).map(([inner, innerValue]) => `${inner}: ${String(innerValue)}`).join(' · ')
    return `${key}: ${String(value)}`
  })
  .filter(Boolean)
  .join(' · ')

// ---------------------------------------------------------------------------
// The sentence on top

export interface SummaryPart {
  text: string
  strong?: boolean
}

export interface AudioSummary {
  tone: 'ok' | 'warn' | 'danger' | 'info'
  title: string
  parts: SummaryPart[]
  incident: boolean
}

export interface AudioSummaryInput {
  readiness: AudioReadinessResponse | null
  bookName: (code: string) => string
  provider: AudioProviderHealth | null
  providerLabel: string
  runs: AudioRun[]
  pendingCandidates: number
  failures: number
  deadJobs: number
  now?: Date
}

export const providerIsDown = (provider: AudioProviderHealth | null) => provider?.status === 'down' || provider?.status === 'rejecting'

/**
 * The tab in one sentence. A provider that is down (or runs waiting for it)
 * is the whole story; otherwise: how much of the next four weeks has voice,
 * what is missing most, what runs now, and how many things ask for someone.
 */
export const buildAudioSummary = (input: AudioSummaryInput): AudioSummary => {
  const now = input.now || new Date()
  const waiting = input.runs.filter(isWaiting)
  if (providerIsDown(input.provider) || waiting.length) {
    const since = input.provider?.down_since ? clock(input.provider.down_since) : ''
    const rejecting = input.provider?.status === 'rejecting'
    const title = rejecting
      ? `A ${input.providerLabel} está recusando os pedidos${since ? ` desde ${since}` : ''}.`
      : `A ${input.providerLabel} não responde${since ? ` desde ${since}` : ''}.`
    const parts: SummaryPart[] = []
    if (waiting.length) {
      const schedule = retrySchedule(waiting[0])
      const next = clock(input.provider?.next_attempt_at || schedule?.next)
      parts.push({ text: plural(waiting.length, 'geração', 'gerações'), strong: true })
      parts.push({ text: `${waiting.length === 1 ? ' está esperando e tenta' : ' estão esperando e tentam'} de novo sozinha${waiting.length === 1 ? '' : 's'}` })
      if (next) parts.push({ text: ' às ' }, { text: next, strong: true })
      if (schedule?.attempt) parts.push({ text: ` (tentativa ${schedule.attempt} de ${MAX_ATTEMPTS})` })
      parts.push({ text: '. Nada do que já foi gerado se perdeu.' })
      if (schedule?.last) parts.push({ text: ` Se às ${clock(schedule.last)} ainda falhar, ${waiting.length === 1 ? 'ela para e aparece' : 'elas param e aparecem'} aqui como falha.` })
    } else if (rejecting) {
      parts.push({ text: 'Erros de crédito ou de chave não se resolvem esperando: as gerações falham na hora até alguém corrigir na conta do provedor.' })
    } else {
      parts.push({ text: 'Nenhuma geração está esperando agora; as próximas esperam e tentam de novo sozinhas.' })
    }
    parts.push({ text: ' Os leitores continuam ouvindo os clips que já existem.' })
    return { tone: 'danger', title, parts, incident: true }
  }

  const summary = input.readiness?.computed_at ? input.readiness.summary : null
  const percentage = summary?.percentage ?? null
  const books = input.readiness?.computed_at ? input.readiness.books : []
  const defaults = books.map(book => ({ code: book.prayer_book_code, bible: defaultBible(book) }))
  const lacking = defaults
    .filter(item => item.bible?.computed && (item.bible.totals?.percentage ?? 100) < 90 && (item.bible.totals?.percentage ?? 0) > 0)
    .sort((a, b) => (a.bible?.totals?.percentage ?? 0) - (b.bible?.totals?.percentage ?? 0))
    .slice(0, 2)
  const silent = defaults.filter(item => item.bible?.computed && (item.bible.totals?.ready_clips || 0) === 0 && (item.bible.totals?.missing_clips || 0) > 0).slice(0, 2)
  const gaps = lacking.length + silent.length > 0

  const asks = (input.pendingCandidates > 0 ? 1 : 0) + (input.failures > 0 ? 1 : 0) + (input.deadJobs > 0 ? 1 : 0) + (gaps ? 1 : 0)
  const lead = percentage === null ? '' : percentage >= 100 && !gaps ? 'Tudo pronto. ' : percentage >= 90 ? 'Quase tudo pronto. ' : 'Falta voz em parte dos ofícios. '
  const askText = asks === 0 ? 'Nada pede você.' : `${countWord(asks)} ${asks === 1 ? 'coisa pede' : 'coisas pedem'} você.`
  const parts: SummaryPart[] = []

  if (percentage !== null) {
    parts.push({ text: `Nas próximas ${Math.round((input.readiness?.days || 28) / 7)} semanas, ` }, { text: coverageText(percentage), strong: true }, { text: ' dos trechos que os ofícios vão pedir já têm narração na Bíblia padrão de cada livro.' })
    if (lacking.length) {
      parts.push({ text: ' Falta mais em ' })
      lacking.forEach((item, index) => {
        if (index) parts.push({ text: ' e em ' })
        parts.push({ text: input.bookName(item.code), strong: true }, { text: ` (${coverageText(item.bible?.totals?.percentage)})` })
      })
    }
    if (silent.length) {
      parts.push({ text: lacking.length ? ' e ' : ' ' })
      silent.forEach((item, index) => {
        if (index) parts.push({ text: ' e ' })
        parts.push({ text: `${index || lacking.length ? 'o ' : 'O '}` }, { text: input.bookName(item.code), strong: true })
      })
      parts.push({ text: silent.length === 1 ? ' ainda não tem voz.' : ' ainda não têm voz.' })
    } else if (lacking.length) parts.push({ text: '.' })
  } else {
    if (input.pendingCandidates) parts.push({ text: plural(input.pendingCandidates, 'tentativa espera', 'tentativas esperam'), strong: true }, { text: ' você ouvir. ' })
    if (input.failures) parts.push({ text: plural(input.failures, 'geração falhou', 'gerações falharam'), strong: true }, { text: ' nas últimas 24 horas. ' })
    if (input.deadJobs) parts.push({ text: plural(input.deadJobs, 'tarefa travada segura', 'tarefas travadas seguram'), strong: true }, { text: ' a fila. ' })
  }

  const running = input.runs.filter(run => run.status === 'running')
  if (running.length) {
    const finish = estimateFinish(running[0], now)
    parts.push({ text: running.length === 1 ? ' Uma geração roda agora' : ` ${countWord(running.length)} gerações rodam agora` })
    if (finish) parts.push({ text: ` e ${running.length === 1 ? 'termina' : 'a primeira termina'} por volta das ` }, { text: clock(finish), strong: true })
    parts.push({ text: '.' })
  }
  return { tone: asks ? 'warn' : 'ok', title: `${lead}${askText}`.trim(), parts, incident: false }
}

// ---------------------------------------------------------------------------
// Ordering a generation

/**
 * The API refuses a generation identical to one already running (409
 * AUDIO_GENERATION_ALREADY_RUNNING) and names it: `{ error, code, operation }`,
 * or only `operation_id`. Not an error for the operator: there is a run to open.
 */
export const alreadyRunning = (error: unknown): { id: number | string | null; operation: AudioRun | null } | null => {
  if (!(error instanceof OrdoApiError) || error.status !== 409) return null
  const payload = (error.payload || {}) as { code?: string; operation?: AudioRun | null; operation_id?: number | string | null }
  if (payload.code && payload.code !== 'AUDIO_GENERATION_ALREADY_RUNNING') return null
  const operation = payload.operation && payload.operation.id !== undefined ? payload.operation : null
  return { id: operation?.id ?? payload.operation_id ?? null, operation }
}

/** How many other generations share the worker, from the estimate, the summary, or the runs on screen. */
export const runningNowCount = (
  estimate: { running_generations?: { count?: number | null } | null; running_operations?: number | null; active_operations?: number | null } | null | undefined,
  summaryActive: number | null | undefined,
  runs: AudioOperation[]
) => {
  // API-audio.md §6: `estimate.running_generations.count` is every generation active right now.
  const fromEstimate = estimate?.running_generations?.count ?? estimate?.running_operations ?? estimate?.active_operations
  if (typeof fromEstimate === 'number') return fromEstimate
  if (typeof summaryActive === 'number') return summaryActive
  return runs.filter(isLive).length
}

export const runningNowText = (count: number) => count > 0
  ? `${count === 1 ? '1 geração rodando' : `${number(count)} gerações rodando`} agora — esta vai dividir o worker e pode demorar mais`
  : null
