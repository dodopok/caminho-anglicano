import { toDateInput, type PeriodValue } from './period'
import type { OrdoIconName } from '../components/ordo/Icon.vue'
import type {
  UsageActivePoint,
  UsageActiveUsersResponse,
  UsageBreakdownRow,
  UsageContentRow,
  UsageContentSeriesResponse,
  UsageFunnel,
  UsageQuery,
  UsageDayState,
  UsageSeriesResponse,
  UsageStatusResponse,
  UsageTopFeature,
  UsageTopResponse
} from '../types/usage'

/**
 * Words for the usage dashboard. The API speaks the catalogue's names
 * (`config/usage_events.yml` in estevao-api); the screen speaks Portuguese.
 * A name the API learns before this file does still shows, as itself.
 */

export const FEATURE_LABELS: Record<string, string> = {
  office: 'Ofício',
  completion: 'Ofício concluído',
  readings: 'Leituras',
  calendar: 'Calendário',
  celebrations: 'Celebrações',
  explanation: 'Explicações',
  catalog: 'Catálogo (livros, Bíblias)',
  preferences: 'Preferências',
  account: 'Conta',
  premium: 'Ordo+',
  share: 'Compartilhamento',
  pdf: 'PDF',
  audio: 'Narração',
  background_music: 'Música de fundo',
  wrapped: 'Retrospectiva',
  widgets: 'Widgets',
  devices: 'Aparelhos',
  journal: 'Diário',
  favorites: 'Favoritos',
  prayer_requests: 'Pedidos de oração',
  prayer_groups: 'Grupos de oração',
  rosary: 'Rosário',
  life_rules: 'Regra de vida',
  life_rule_exams: 'Exame da regra',
  admin: 'Admin',
  developer_portal: 'Portal de desenvolvedores',
  telemetry: 'Telemetria'
}

/** The catalogue's features, in its order: the choices for the daily series. */
export const FEATURES = Object.keys(FEATURE_LABELS)

export const EVENT_LABELS: Record<string, string> = {
  app_opened: 'Abriu o app',
  screen_viewed: 'Viu uma tela',
  page_viewed: 'Viu uma página',
  visit_started: 'Começou uma visita',
  link_opened: 'Abriu um link do Ordo',
  cta_clicked: 'Tocou num convite',
  permission_requested: 'Pedido de permissão',
  external_link_opened: 'Abriu um link externo',
  office_opened: 'Abriu um ofício',
  office_closed: 'Fechou um ofício',
  office_tool_used: 'Usou uma ferramenta do ofício',
  office_completed: 'Concluiu um ofício',
  office_completion_removed: 'Desmarcou um ofício',
  reading_opened: 'Abriu uma leitura',
  reading_variant_toggled: 'Trocou a versão da leitura',
  day_selected: 'Escolheu um dia',
  narration_started: 'Começou a narração',
  narration_ended: 'Terminou a narração',
  narration_control_used: 'Controlou a narração',
  background_music_action: 'Música de fundo',
  share_sheet_opened: 'Abriu o compartilhamento',
  share_option_changed: 'Mudou uma opção do compartilhamento',
  share_performed: 'Compartilhou',
  share_link_created: 'Criou um link compartilhado',
  share_link_opened: 'Abriram um link compartilhado',
  qr_scanned: 'Leu um QR code',
  wrapped_page_viewed: 'Viu uma página da retrospectiva',
  wrapped_closed: 'Fechou a retrospectiva',
  document_opened: 'Abriu um documento',
  pdf_opened: 'Abriu um PDF',
  office_exported: 'Exportou um ofício',
  rosary_started: 'Começou um rosário',
  rosary_ended: 'Terminou um rosário',
  rosary_control_used: 'Controlou o rosário',
  custom_rosary_changed: 'Editou um rosário próprio',
  exam_suggestion_answered: 'Respondeu uma sugestão do exame',
  rule_reminder_requested: 'Pediu lembrete da regra',
  life_rule_exam_completed: 'Concluiu um exame da regra',
  journal_editor_opened: 'Abriu o diário',
  favorite_toggled: 'Favoritou ou desfavoritou',
  prayer_group_created: 'Criou um grupo de oração',
  group_call_joined: 'Entrou numa chamada de grupo',
  group_call_left: 'Saiu de uma chamada de grupo',
  group_call_control_used: 'Controlou a chamada de grupo',
  group_session_finished: 'Encerrou um encontro de grupo',
  notification_opened: 'Abriu uma notificação',
  push_sent: 'Notificação enviada',
  widget_state_reported: 'Estado do widget',
  device_linked: 'Vinculou um aparelho',
  onboarding_started: 'Começou o primeiro acesso',
  onboarding_step_completed: 'Passou um passo do primeiro acesso',
  onboarding_completed: 'Terminou o primeiro acesso',
  onboarding_saved: 'Salvou o primeiro acesso',
  auth_started: 'Começou a entrar',
  auth_finished: 'Terminou de entrar',
  login_prompt_shown: 'Viu o convite para entrar',
  login_prompt_answered: 'Respondeu o convite para entrar',
  signed_out: 'Saiu da conta',
  account_created: 'Criou a conta',
  account_deleted: 'Excluiu a conta',
  premium_gate_shown: 'Esbarrou num recurso do Ordo+',
  paywall_viewed: 'Viu a tela do Ordo+',
  paywall_plan_selected: 'Escolheu um plano',
  purchase_started: 'Começou uma compra',
  purchase_finished: 'Terminou uma compra',
  premium_status_changed: 'Mudou o status do Ordo+',
  store_link_clicked: 'Foi para a loja',
  preference_changed: 'Mudou uma preferência',
  settings_action: 'Ação nas configurações',
  post_opened: 'Abriu um artigo ou santo',
  search_performed: 'Buscou',
  list_filtered: 'Filtrou uma lista',
  action_failed: 'Uma ação falhou'
}

export const CLIENT_LABELS: Record<string, string> = {
  app: 'App',
  web: 'Web',
  widget: 'Widget',
  device: 'Aparelho vinculado',
  api_key: 'Chave de API',
  mcp: 'MCP',
  site: 'Site (oficio.app)',
  portal: 'Portal',
  unknown: 'Não identificado'
}

export const PLATFORM_LABELS: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
  web_desktop: 'Web no computador',
  web_mobile: 'Web no celular',
  webview_ios: 'Web dentro do app (iOS)',
  webview_android: 'Web dentro do app (Android)'
}

export const SOURCE_LABELS: Record<string, string> = {
  client: 'App ou web',
  domain: 'Servidor'
}

export const FUNNEL_LABELS: Record<string, { title: string; description: string }> = {
  office: {
    title: 'Ofício',
    description: 'De abrir um ofício a marcá-lo como rezado.'
  },
  share: {
    title: 'Compartilhamento',
    description: 'Quem abre o compartilhamento, quem envia e quantas vezes o link é aberto por outra pessoa.'
  },
  paywall: {
    title: 'Ordo+',
    description: 'De ver a tela do Ordo+ a terminar a compra.'
  },
  first_access: {
    title: 'Primeiro acesso',
    description: 'De abrir o app pela primeira vez a rezar o primeiro ofício.'
  }
}

const words = (value: string) => {
  const text = value.replaceAll('_', ' ').trim()
  return text ? text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1) : value
}

export const featureLabel = (name?: string | null) => name ? FEATURE_LABELS[name] || words(name) : 'Sem recurso'
export const eventLabel = (name?: string | null) => name ? EVENT_LABELS[name] || words(name) : 'Sem evento'
export const clientLabel = (name?: string | null) => name ? CLIENT_LABELS[name] || words(name) : 'Não identificado'
export const platformLabel = (name?: string | null) => name ? PLATFORM_LABELS[name] || words(name) : 'Não identificada'

/** The API refuses periods longer than this (start and end included). */
export const USAGE_MAX_DAYS = 366

const parse = (value: string) => new Date(`${value}T12:00:00`)

/**
 * The portal's period as the usage API accepts it: at most 366 days, ending
 * on the period's last day. "Desde sempre" and long custom ranges are cut to
 * the last 366 days, and `clamped` says so on screen.
 */
export const usagePeriod = (period: PeriodValue): UsageQuery & { clamped: boolean } => {
  const end = parse(period.end)
  const earliest = new Date(end)
  earliest.setDate(earliest.getDate() - (USAGE_MAX_DAYS - 1))
  const start = parse(period.start)
  if (Number.isNaN(start.getTime()) || start < earliest) {
    return { start_date: toDateInput(earliest), end_date: period.end, clamped: true }
  }
  return { start_date: period.start, end_date: period.end, clamped: false }
}

/**
 * The most recent day the nightly rollup has closed. Today (and, before
 * 03:30 UTC, yesterday) is still all zeros, so "people today" would read 0.
 */
export const latestActiveDay = (series: UsageActivePoint[]): UsageActivePoint | null => {
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const point = series[index]
    if (point.dau || point.wau || point.mau) return point
  }
  return null
}

export type ContentGroup = 'saints' | 'documents' | 'posts' | 'rosaries'

const SAINT_KINDS = new Set(['saint', 'commemoration', 'season'])
const POST_KINDS = new Set(['post', 'article'])

/**
 * Which list a content row belongs to. Saints and liturgical days arrive as
 * `post_opened` with a kind; documents and rosaries carry no kind, only their
 * event.
 */
export const contentGroup = (row: Pick<UsageContentRow, 'content_kind' | 'event'>): ContentGroup | null => {
  if (row.content_kind && SAINT_KINDS.has(row.content_kind)) return 'saints'
  if (row.event === 'document_opened' || row.content_kind === 'document' || row.content_kind === 'prayer_book_pdf') return 'documents'
  if (row.event === 'rosary_started' || row.content_kind === 'rosary') return 'rosaries'
  if ((row.content_kind && POST_KINDS.has(row.content_kind)) || row.event === 'post_opened') return 'posts'
  return null
}

export interface ContentItem {
  slug: string
  count: number
  userDays: number
  title: string | null
  date: string | null
  /** Daily opens, when the API sends each row's series (`with_series=true`). */
  series: Array<{ date: string; count: number }> | null
}

/** The same slug opened through two events (or two kinds) adds up to one line. */
export const groupContent = (rows: UsageContentRow[]) => {
  const groups: Record<ContentGroup, Map<string, ContentItem>> = {
    saints: new Map(),
    documents: new Map(),
    posts: new Map(),
    rosaries: new Map()
  }
  rows.forEach(row => {
    const group = contentGroup(row)
    if (!group || !row.content_slug) return
    const current = groups[group].get(row.content_slug) || { slug: row.content_slug, count: 0, userDays: 0, title: null, date: null, series: null }
    if (row.series) {
      const byDate = new Map((current.series || []).map(point => [point.date, point.count]))
      row.series.forEach(point => byDate.set(point.date, (byDate.get(point.date) || 0) + (point.count || 0)))
      current.series = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }))
    }
    current.count += row.count || 0
    current.userDays += row.user_days || 0
    current.title = current.title || row.title?.trim() || null
    current.date = current.date || row.date || null
    groups[group].set(row.content_slug, current)
  })
  const sorted = (map: Map<string, ContentItem>) =>
    [...map.values()].sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug))
  return {
    saints: sorted(groups.saints),
    documents: sorted(groups.documents),
    posts: sorted(groups.posts),
    rosaries: sorted(groups.rosaries)
  }
}

/** The API's 0–1 rate as a percentage with one decimal, or null. */
export const ratePercent = (rate?: number | null) =>
  rate === null || rate === undefined || !Number.isFinite(rate) ? null : Math.round(rate * 1000) / 10

// --- The redesigned tab ------------------------------------------------------

export type UsageSection = 'resumo' | 'recursos' | 'publico' | 'funis' | 'conteudo'
export const USAGE_SECTIONS: Array<{ id: UsageSection; label: string }> = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'recursos', label: 'Recursos' },
  { id: 'publico', label: 'Público' },
  { id: 'funis', label: 'Funis' },
  { id: 'conteudo', label: 'Conteúdo' }
]

/** The icon beside each feature in the ranking. */
export const FEATURE_ICONS: Record<string, OrdoIconName> = {
  office: 'book',
  completion: 'check',
  readings: 'book',
  calendar: 'calendar',
  celebrations: 'star',
  explanation: 'info',
  catalog: 'layers',
  preferences: 'pen',
  account: 'people',
  premium: 'star',
  share: 'share',
  pdf: 'table',
  audio: 'audio',
  background_music: 'audio',
  wrapped: 'star',
  widgets: 'overview',
  devices: 'globe',
  journal: 'pen',
  favorites: 'heart',
  prayer_requests: 'heart',
  prayer_groups: 'people',
  rosary: 'heart',
  life_rules: 'check',
  life_rule_exams: 'check',
  admin: 'lock',
  developer_portal: 'key',
  telemetry: 'activity'
}
export const featureIcon = (feature: string): OrdoIconName => FEATURE_ICONS[feature] || 'activity'

/**
 * The events that happen inside a feature. Used only while the API's `top`
 * does not filter its events by feature (PROPOSTA §2, item 4); the screen
 * says the list is fixed in the portal.
 */
export const FEATURE_EVENTS: Record<string, string[]> = {
  office: ['office_opened', 'office_completed', 'office_tool_used', 'reading_variant_toggled', 'office_completion_removed', 'office_closed', 'day_selected'],
  completion: ['office_completed', 'office_completion_removed'],
  readings: ['reading_opened', 'reading_variant_toggled'],
  calendar: ['day_selected'],
  audio: ['narration_started', 'narration_ended', 'narration_control_used'],
  background_music: ['background_music_action'],
  share: ['share_sheet_opened', 'share_option_changed', 'share_performed', 'share_link_created', 'share_link_opened', 'qr_scanned'],
  pdf: ['pdf_opened', 'office_exported', 'document_opened'],
  wrapped: ['wrapped_page_viewed', 'wrapped_closed'],
  rosary: ['rosary_started', 'rosary_ended', 'rosary_control_used', 'custom_rosary_changed'],
  life_rules: ['rule_reminder_requested', 'exam_suggestion_answered'],
  life_rule_exams: ['life_rule_exam_completed', 'exam_suggestion_answered'],
  journal: ['journal_editor_opened'],
  favorites: ['favorite_toggled'],
  prayer_groups: ['prayer_group_created', 'group_call_joined', 'group_call_left', 'group_call_control_used', 'group_session_finished'],
  premium: ['premium_gate_shown', 'paywall_viewed', 'paywall_plan_selected', 'purchase_started', 'purchase_finished', 'premium_status_changed', 'store_link_clicked'],
  account: ['auth_started', 'auth_finished', 'login_prompt_shown', 'login_prompt_answered', 'signed_out', 'account_created', 'account_deleted'],
  preferences: ['preference_changed', 'settings_action'],
  devices: ['device_linked'],
  widgets: ['widget_state_reported'],
  celebrations: ['post_opened'],
  explanation: ['post_opened']
}

/** The funnel that belongs to a feature's detail. */
export const FEATURE_FUNNEL: Record<string, string> = { office: 'office', completion: 'office', share: 'share', premium: 'paywall' }

const DAY_MS = 86_400_000
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const addDays = (value: string, days: number) => {
  const date = parse(value)
  date.setDate(date.getDate() + days)
  return toDateInput(date)
}

export const daysBetween = (start: string, end: string) => Math.round((parse(end).getTime() - parse(start).getTime()) / DAY_MS) + 1

export const datesIn = (start: string, end: string) => {
  const total = Math.max(0, Math.min(daysBetween(start, end), 800))
  return Array.from({ length: total }, (_, index) => addDays(start, index))
}

/** "25 nov." */
export const shortDate = (value: string) => {
  const date = parse(value.slice(0, 10))
  return Number.isNaN(date.getTime()) ? value : `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}.`
}

/** "27 out. – 25 nov." */
export const windowLabel = (window: UsageQuery | null) => window ? `${shortDate(window.start_date)} – ${shortDate(window.end_date)}` : ''

export interface UsageWindow extends UsageQuery {
  /** Cut to the API's 366 days. */
  clamped: boolean
  /** Moved back a day because the period ended today, which the nightly rollup has not closed. */
  shifted: boolean
}

/**
 * The window the Uso tab reads for the portal's period. The nightly rollup
 * closes a day in the early hours of the next, so a period that ends today
 * would end on a day of zeros: it is read one day earlier, keeping its length
 * ("30 dias" are the 30 days up to yesterday, as the API's own default).
 */
export const usageWindow = (period: PeriodValue, today = new Date()): UsageWindow => {
  const todayKey = toDateInput(today)
  const yesterday = addDays(todayKey, -1)
  let { start, end } = period
  let shifted = false
  if (end >= todayKey) {
    // A preset keeps its length; a custom range only loses the open days.
    if (period.preset !== 'custom' && period.preset !== 'all') start = addDays(start, -(daysBetween(yesterday, end) - 1))
    end = yesterday
    shifted = true
    if (start > end) start = end
  }
  const capped = usagePeriod({ preset: period.preset, start, end })
  return { start_date: capped.start_date, end_date: capped.end_date, clamped: capped.clamped, shifted }
}

/** The window of the same length just before; none for "Desde sempre". */
export const comparedWindow = (period: PeriodValue, window: UsageQuery): UsageQuery | null => {
  if (period.preset === 'all') return null
  const days = daysBetween(window.start_date, window.end_date)
  const end = addDays(window.start_date, -1)
  return { start_date: addDays(end, -(days - 1)), end_date: end }
}

/** "nos últimos 30 dias", "de 3 out. a 9 nov." */
export const periodPhrase = (period: PeriodValue, window: UsageQuery) => {
  if (period.preset === '7d') return 'nos últimos 7 dias'
  if (period.preset === '30d') return 'nos últimos 30 dias'
  if (period.preset === '90d') return 'nos últimos 90 dias'
  if (period.preset === '12m') return 'nos últimos 12 meses'
  if (period.preset === 'all') return `nos últimos ${daysBetween(window.start_date, window.end_date)} dias`
  return `de ${shortDate(window.start_date)} a ${shortDate(window.end_date)}`
}

/** Trailing moving average, so Sundays do not saw the sparkline. */
export const movingAverage = (values: number[], size = 7) => values.map((_, index) => {
  const slice = values.slice(Math.max(0, index - size + 1), index + 1)
  return slice.reduce((sum, value) => sum + value, 0) / slice.length
})

/** One value per day of the window (missing days are zero). */
export const dailyValues = <T extends { date: string }>(series: T[] | undefined, window: UsageQuery, read: (point: T) => number) => {
  const map = new Map((series || []).map(point => [point.date.slice(0, 10), read(point)]))
  return datesIn(window.start_date, window.end_date).map(date => map.get(date) ?? 0)
}

export const total = (values: number[]) => values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0)

/**
 * Which days of the window have no telemetry at all. With the API's status
 * the line is where telemetry started; without it, a window whose previous
 * window is empty started recording inside it, so its leading zeros are
 * days without telemetry, not days without people.
 */
export const telemetryGaps = (dates: string[], values: number[], { startedOn, previousHasData, states }: { startedOn?: string | null; previousHasData: boolean; states?: Map<string, UsageDayState> | null }) => {
  if (states?.size) return dates.map(date => states.get(date) === 'no_data' || (!states.has(date) && Boolean(startedOn) && date < (startedOn as string).slice(0, 10)))
  if (startedOn) return dates.map(date => date < startedOn.slice(0, 10))
  if (previousHasData) return dates.map(() => false)
  const first = values.findIndex(value => value > 0)
  if (first < 0) return dates.map(() => false)
  return dates.map((_, index) => index < first)
}

/**
 * The last days the nightly rollup may still rewrite: it closes yesterday and
 * redoes the two days before. The API's status says it day by day; without
 * it, the two days before today.
 */
export const closingDays = (dates: string[], today = new Date(), states?: Map<string, UsageDayState> | null) => {
  if (states?.size) {
    const last = [...dates].reverse().findIndex(date => !['closing', 'open'].includes(states.get(date) || ''))
    return last < 0 ? dates.length : last
  }
  const todayKey = toDateInput(today)
  const from = addDays(todayKey, -2)
  return dates.filter(date => date >= from && date < todayKey).length
}

export interface ActiveNumbers {
  /** Distinct people in the window, or in the 30 days up to its last day when the window is longer. */
  people: number | null
  peopleWindow: 'dia' | 'semana' | 'mes'
  perDay: number | null
  latest: UsageActivePoint | null
}

/** People in the period from the daily windows the API keeps (DAU, WAU, MAU). */
export const activeNumbers = (series: UsageActivePoint[] | undefined, window: UsageQuery, gaps?: boolean[]): ActiveNumbers => {
  const points = series || []
  const latest = latestActiveDay(points)
  const days = daysBetween(window.start_date, window.end_date)
  const peopleWindow = days <= 1 ? 'dia' : days <= 7 ? 'semana' : 'mes'
  const key = peopleWindow === 'dia' ? 'dau' : peopleWindow === 'semana' ? 'wau' : 'mau'
  const dates = datesIn(window.start_date, window.end_date)
  const byDate = new Map(points.map(point => [point.date.slice(0, 10), point.dau || 0]))
  const lastDay = latest?.date.slice(0, 10)
  // Only the days that have data count for the average: not the days before
  // the telemetry existed, nor the ones the rollup has not closed yet.
  const counted = dates.filter((date, index) => !gaps?.[index] && (!lastDay || date <= lastDay))
  const perDay = latest && counted.length ? total(counted.map(date => byDate.get(date) || 0)) / counted.length : null
  return { people: latest ? latest[key] : null, peopleWindow, perDay, latest }
}

export interface SentencePart { text: string; bold?: boolean }

const pct = (value: number) => `${Math.abs(value) < 10 ? Math.abs(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : Math.round(Math.abs(value))}%`
const changeOf = (current: number | null | undefined, previous: number | null | undefined) =>
  current === null || current === undefined || !previous ? null : (current - previous) / previous * 100
const fmt = (value: number) => Math.round(value).toLocaleString('pt-BR')

export interface UsageMove {
  feature: string
  kind: 'up' | 'down' | 'errors'
  /** Percent change, or the error rate now (errors). */
  value: number
  title: string
  detail: string
}

/**
 * What moved most against the previous window: the biggest rises and falls
 * among features with enough use to mean something, and a feature whose
 * error rate jumped.
 */
export const buildMoves = (current: UsageTopFeature[] = [], previous: UsageTopFeature[] = [], { minCount = 100, limit = 4 } = {}): UsageMove[] => {
  const before = new Map(previous.map(row => [row.feature, row]))
  const changes = current
    .map(row => ({ row, was: before.get(row.feature), change: changeOf(row.count, before.get(row.feature)?.count) }))
    .filter(item => item.change !== null && item.was && Math.max(item.row.count, item.was.count) >= minCount) as Array<{ row: UsageTopFeature; was: UsageTopFeature; change: number }>
  const rises = changes.filter(item => item.change >= 5).sort((a, b) => b.change - a.change).slice(0, 2)
  const falls = changes.filter(item => item.change <= -5).sort((a, b) => a.change - b.change).slice(0, 1)
  const errors = current
    .filter(row => row.count >= minCount)
    .map(row => {
      const was = before.get(row.feature)
      const now = row.errors / row.count * 100
      const then = was?.count ? was.errors / was.count * 100 : 0
      return { row, now, then }
    })
    .filter(item => item.now >= 1 && item.now >= item.then * 2)
    .sort((a, b) => b.now - a.now)
    .slice(0, 1)
  const label = (feature: string) => featureLabel(feature)
  return [
    ...rises.map(({ row, was, change }) => ({ feature: row.feature, kind: 'up' as const, value: change, title: `${label(row.feature)} +${pct(change)}.`, detail: `${fmt(row.user_days)} pessoas-dia (antes ${fmt(was.user_days)}).` })),
    ...falls.map(({ row, was, change }) => ({ feature: row.feature, kind: 'down' as const, value: change, title: `${label(row.feature)} −${pct(change)}.`, detail: `${fmt(row.count)} vezes (antes ${fmt(was.count)}).` })),
    ...errors.map(({ row, now, then }) => ({ feature: row.feature, kind: 'errors' as const, value: now, title: `Erros em ${label(row.feature)}: ${now.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`, detail: `dos pedidos (antes ${then.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%).` }))
  ].slice(0, limit)
}

// The article each feature takes in a sentence ("o Rosário", "a Narração",
// "as Leituras"); masculine singular when not listed.
const FEATURE_ARTICLES: Record<string, 'a' | 'os' | 'as'> = {
  readings: 'as',
  celebrations: 'as',
  explanation: 'as',
  preferences: 'as',
  account: 'a',
  audio: 'a',
  background_music: 'a',
  wrapped: 'a',
  life_rules: 'a',
  favorites: 'os',
  prayer_requests: 'os',
  prayer_groups: 'os',
  widgets: 'os',
  devices: 'os'
}
export const featureArticle = (feature: string) => FEATURE_ARTICLES[feature] || 'o'
const isPlural = (feature: string) => ['os', 'as'].includes(featureArticle(feature))

/** The period in one sentence: people first, offices prayed right beside. */
export const summarySentence = (input: {
  people: number | null
  peoplePrevious?: number | null
  offices: number | null
  officesPrevious?: number | null
  perDay: number | null
  phrase: string
  previousLabel: string
  moves: UsageMove[]
}): { title: string; parts: SentencePart[] } => {
  const { people, offices, perDay, phrase, previousLabel, moves } = input
  const title = people === null
    ? `Ainda sem pessoas contadas ${phrase}.`
    : offices === null
      ? `${fmt(people)} pessoas usaram o Ordo ${phrase}.`
      : `${fmt(people)} pessoas usaram o Ordo e rezaram ${fmt(offices)} ofícios ${phrase}.`
  const parts: SentencePart[] = []
  const officeChange = changeOf(offices, input.officesPrevious)
  const peopleChange = changeOf(people, input.peoplePrevious)
  const more = (change: number, noun: string) => `${pct(change)} ${change >= 0 ? 'mais' : 'menos'} ${noun}`
  if (officeChange !== null && peopleChange !== null) {
    parts.push({ text: 'São ' }, { text: more(officeChange, 'ofícios'), bold: true }, { text: ` que nos ${previousLabel}, com ` }, { text: more(peopleChange, 'pessoas'), bold: true }, { text: '. ' })
  } else if (peopleChange !== null) {
    parts.push({ text: 'São ' }, { text: more(peopleChange, 'pessoas'), bold: true }, { text: ` que nos ${previousLabel}. ` })
  }
  const rises = moves.filter(move => move.kind === 'up')
  const fall = moves.find(move => move.kind === 'down')
  if (rises.length) {
    rises.forEach((move, index) => {
      parts.push({ text: index ? ` e ${featureArticle(move.feature)} ` : `O que mais cresceu foi ${featureArticle(move.feature)} ` })
      parts.push({ text: featureLabel(move.feature), bold: true }, { text: ` (+${pct(move.value)})` })
    })
    parts.push({ text: fall ? '; ' : '. ' })
  }
  if (fall) {
    const article = featureArticle(fall.feature)
    parts.push({ text: `${rises.length ? article : article.charAt(0).toUpperCase() + article.slice(1)} ` })
    parts.push({ text: featureLabel(fall.feature), bold: true }, { text: ` ${isPlural(fall.feature) ? 'caíram' : 'caiu'} ${pct(fall.value)}. ` })
  }
  if (perDay !== null) parts.push({ text: 'Em média, ' }, { text: `${fmt(perDay)} pessoas`, bold: true }, { text: ' abrem o Ordo por dia.' })
  return { title, parts }
}

export interface RankedFeature {
  feature: string
  label: string
  icon: OrdoIconName
  count: number
  userDays: number
  /** The measure the ranking is sorted by. */
  value: number
  /** 0–100, against the first row. */
  bar: number
  previous: number | null
  errorRate: number | null
}

export const rankFeatures = (current: UsageTopFeature[] = [], previous: UsageTopFeature[] | null = null, measure: 'vezes' | 'pessoas' = 'vezes'): RankedFeature[] => {
  const before = new Map((previous || []).map(row => [row.feature, row]))
  // A previous window with no data at all (before the telemetry existed)
  // compares with nothing: "—", not "antes, nenhum" on every row.
  const comparable = Boolean(previous?.some(row => row.count > 0))
  const read = (row: UsageTopFeature) => measure === 'pessoas' ? row.user_days : row.count
  const rows = [...current].sort((a, b) => read(b) - read(a) || a.feature.localeCompare(b.feature))
  const top = Math.max(...rows.map(read), 1)
  return rows.map(row => {
    const was = before.get(row.feature)
    return {
      feature: row.feature,
      label: featureLabel(row.feature),
      icon: featureIcon(row.feature),
      count: row.count,
      userDays: row.user_days,
      value: read(row),
      bar: read(row) / top * 100,
      previous: comparable ? (was ? read(was) : 0) : null,
      errorRate: row.count ? row.errors / row.count * 100 : null
    }
  })
}

export interface AudienceSplit {
  app: number
  web: number
  both: number
  appOnly: number
  webOnly: number
  people: number
}

/** App only, web only and both, in one window of the day: "só app" is app minus both. */
export const audienceSplit = (point: UsageActivePoint | null, window: 'dia' | 'semana' | 'mes'): AudienceSplit | null => {
  if (!point) return null
  const key = window === 'dia' ? 'dau' : window === 'semana' ? 'wau' : 'mau'
  const app = point.by_client?.app?.[key] || 0
  const web = point.by_client?.web?.[key] || 0
  const both = Math.min(point.app_and_web?.[key] || 0, app, web)
  return { app, web, both, appOnly: app - both, webOnly: web - both, people: app + web - both }
}

/** The clients that are not people: keys, widgets, linked devices, MCP. */
export const NON_PERSON_CLIENTS = ['api_key', 'widget', 'device', 'mcp', 'site']

/** "196 mil", "1,2 mil", "870". */
export const compactNumber = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (value >= 10_000) return `${Math.round(value / 1000).toLocaleString('pt-BR')} mil`
  if (value >= 1000) return `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return Math.round(value).toLocaleString('pt-BR')
}

/** "41%", "<1%". */
export const shareText = (value: number, sum: number) => {
  if (!sum) return '—'
  const share = value / sum * 100
  if (share > 0 && share < 1) return '<1%'
  return `${Math.round(share)}%`
}

/** The newest app versions and the rest folded as "mais antigas". */
export const versionGroups = (rows: UsageBreakdownRow[] = [], keep = 3) => {
  const known = rows.filter(row => row.value)
  const byVersion = [...known].sort((a, b) => compareVersions(b.value || '', a.value || ''))
  const head = byVersion.slice(0, keep)
  const tail = byVersion.slice(keep)
  const read = (row: UsageBreakdownRow) => row.user_days ?? row.count
  const out = head.map(row => ({ key: row.value as string, label: row.value as string, value: read(row) }))
  const rest = total(tail.map(read))
  if (rest) out.push({ key: 'older', label: 'mais antigas', value: rest })
  return { rows: out, people: rows.some(row => row.user_days !== undefined) }
}

export const compareVersions = (a: string, b: string) => {
  const pa = a.split(/[.-]/).map(part => Number.parseInt(part, 10) || 0)
  const pb = b.split(/[.-]/).map(part => Number.parseInt(part, 10) || 0)
  for (let index = 0; index < Math.max(pa.length, pb.length); index += 1) {
    const diff = (pa[index] || 0) - (pb[index] || 0)
    if (diff) return diff
  }
  return 0
}

/** "7 de cada 10", or "3 de cada 100" when it is under one in ten. */
export const ratioWords = (rate: number) => {
  if (rate >= 0.095) return { count: Math.round(rate * 10), of: 10 }
  return { count: Math.max(Math.round(rate * 100), rate > 0 ? 1 : 0), of: 100 }
}

export interface FunnelView {
  key: string
  title: string
  description: string
  perUser: boolean
  say: SentencePart[]
  steps: Array<{ label: string; value: number; width: number; badge: string; ok?: boolean }>
  drop: { afterStep: number; text: string } | null
  rate: number | null
}

const FUNNEL_STEP_LABELS: Record<string, string[]> = {
  office: ['Abriu um ofício', 'Marcou como rezado'],
  share: ['Abriu o compartilhamento', 'Compartilhou', 'Link aberto por outra pessoa'],
  paywall: ['Viu a tela do Ordo+', 'Terminou a compra'],
  first_access: ['Começou o primeiro acesso', 'Terminou o primeiro acesso', 'Rezou o primeiro ofício']
}

const percentText = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: value < 10 && value % 1 ? 1 : value > 90 && value % 1 ? 1 : 0 })}%`

/** A funnel told in words: who starts, who gets to the end, where most stop. */
export const funnelView = (funnel: UsageFunnel): FunnelView => {
  const meta = FUNNEL_LABELS[funnel.key] || { title: words(funnel.key), description: '' }
  const labels = FUNNEL_STEP_LABELS[funnel.key] || []
  const label = (index: number) => labels[index] || eventLabel(funnel.steps[index]?.event)
  if (funnel.key === 'share' || !funnel.per_user) {
    const counts = funnel.steps.map(step => step.count)
    const first = counts[0] || 0
    const sent = counts[1] || 0
    const opened = counts[2] || 0
    const sendRate = first ? sent / first : 0
    const perSend = sent ? opened / sent : 0
    const say: SentencePart[] = first
      ? [{ text: 'De cada 10 vezes que alguém abre o compartilhamento, ' }, { text: String(Math.round(sendRate * 10)), bold: true }, { text: ' terminam em envio.' }, ...(funnel.steps.length > 2 && sent ? [{ text: ' Cada envio é aberto, em média, ' }, { text: `${perSend.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} vezes`, bold: true }, { text: ' por outra pessoa.' }] : [])]
      : [{ text: 'Ninguém abriu o compartilhamento no período.' }]
    return {
      key: funnel.key,
      title: meta.title,
      description: meta.description,
      perUser: false,
      say,
      steps: counts.map((value, index) => index === 2
        ? { label: label(index), value, width: 100, badge: `× ${perSend.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por envio`, ok: true }
        : { label: label(index), value, width: first ? value / first * 100 : 0, badge: first ? percentText(Math.round(value / first * 100)) : '—' }),
      drop: first && sent < first ? { afterStep: 0, text: `${Math.round((1 - sendRate) * 100)}% desistiram antes de enviar` } : null,
      rate: first ? sendRate : null
    }
  }
  const started = funnel.started ?? funnel.steps[0]?.user_days ?? 0
  const converted = funnel.converted ?? funnel.steps[funnel.steps.length - 1]?.user_days ?? 0
  const rate = funnel.rate ?? (started ? converted / started : null)
  // `reached` counts the person-days that got to each step in order; an API
  // without it gives the first and the last step only.
  const values = funnel.steps.every(step => typeof step.reached === 'number')
    ? funnel.steps.map(step => step.reached as number)
    : funnel.steps.length > 2 ? funnel.steps.map(step => step.user_days) : [started, converted]
  const ratio = rate === null ? null : ratioWords(rate)
  const sayFor: Record<string, (n: string) => SentencePart[]> = {
    office: n => [{ text: 'Em ' }, { text: n, bold: true }, { text: ' dias em que alguém abre um ofício, ele termina marcado como rezado.' }],
    paywall: n => [{ text: 'Em ' }, { text: n, bold: true }, { text: ' dias em que alguém vê a tela do Ordo+ na web, a compra termina. As compras do app ainda não entram aqui.' }],
    first_access: n => [{ text: 'Em ' }, { text: n, bold: true }, { text: ' dias em que alguém começa o primeiro acesso, reza o primeiro ofício no mesmo dia.' }]
  }
  const say = ratio && started
    ? (sayFor[funnel.key] || ((n: string) => [{ text: 'Em ' }, { text: n, bold: true }, { text: ' dias, o caminho chega ao fim.' }]))(`${ratio.count} de cada ${ratio.of}`)
    : [{ text: 'Ninguém começou este caminho no período.' }]
  // Where most are lost: the biggest fall between two steps in a row.
  let dropAt = 0
  let dropSize = 0
  values.slice(1).forEach((value, index) => {
    const size = values[index] - value
    if (size > dropSize) { dropSize = size; dropAt = index }
  })
  const lost = values[dropAt] ? dropSize / values[dropAt] * 100 : null
  const DROP: Record<string, string[]> = {
    office: ['fecharam sem marcar'],
    paywall: ['saíram sem comprar'],
    first_access: ['pararam antes de terminar o primeiro acesso', 'terminaram sem rezar no mesmo dia']
  }
  const dropText = DROP[funnel.key]?.[dropAt] || DROP[funnel.key]?.[0] || 'pararam no caminho'
  return {
    key: funnel.key,
    title: meta.title,
    description: meta.description,
    perUser: true,
    say,
    steps: values.map((value, index) => ({
      label: label(index),
      value,
      width: values[0] ? value / values[0] * 100 : 0,
      badge: values[0] ? percentText(Math.round(value / values[0] * 1000) / 10) : '—'
    })),
    drop: lost !== null && lost > 0 && started ? { afterStep: dropAt, text: `${percentText(Math.round(lost * 10) / 10)} ${dropText}` } : null,
    rate
  }
}

const SMALL_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'os', 'as', 'em', 'no', 'na', 'of', 'the', 'and'])

/** `santo-andre-apostolo` → "Santo Andre Apostolo": the slug read as words while the API has no title. */
export const humanizeSlug = (slug: string) => slug
  .split(/[-_]+/)
  .filter(Boolean)
  .map((word, index) => index && SMALL_WORDS.has(word) ? word : word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1))
  .join(' ')

/** The name the API sends (`title`), or the slug read as words when it is null or missing. */
export const contentTitle = (row: Pick<UsageContentRow, 'content_slug' | 'title'>) => row.title?.trim() || humanizeSlug(row.content_slug)

/** `content?slug=`'s name: the response's `title`, or the first of its rows that has one. */
export const seriesTitle = (response: Pick<UsageContentSeriesResponse, 'title' | 'rows'> | null | undefined) =>
  response?.title?.trim() || response?.rows?.find(row => row.title?.trim())?.title?.trim() || null

/** A feast day inside the window: comparing it with the window before says nothing. */
export const dateInWindow = (date: string | null | undefined, window: UsageQuery) => {
  if (!date) return false
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10) >= window.start_date && date.slice(0, 10) <= window.end_date
  const match = /^(\d{2})-(\d{2})$/.exec(date)
  if (!match) return false
  return datesIn(window.start_date, window.end_date).some(day => day.slice(5) === `${match[1]}-${match[2]}`)
}

/**
 * A feast day that fell inside the window, read from its daily opens when the
 * API sends no date: one day with several times the usual opens, not at the
 * window's last days (a feast still to come climbs towards the end instead).
 */
export const spikeInside = (values: number[] | null | undefined) => {
  if (!values || values.length < 7) return false
  const peak = values.reduce((best, value, index) => value > values[best] ? index : best, 0)
  if (peak >= values.length - 3) return false
  const rest = values.filter((_, index) => Math.abs(index - peak) > 2)
  const usual = rest.length ? total(rest) / rest.length : 0
  return values[peak] >= Math.max(usual * 5, 5)
}

/**
 * Before the first nightly rollup every report is empty. Data wins: when the
 * people series, the top features or a series has any count in the window,
 * the rollup has run, whatever the status says (after a deploy the status can
 * lose its bookkeeping and report `last_closed_day: null` over real numbers).
 * Only when the reports are empty does the status decide; without it, the
 * empty reports say the same.
 */
export const beforeFirstRollup = (
  status: UsageStatusResponse | null,
  active: UsageActiveUsersResponse | null,
  top: UsageTopResponse | null,
  series: Array<UsageSeriesResponse | null> = []
) => {
  const hasData = Boolean(latestActiveDay(active?.series || []))
    || (top?.features || []).some(row => (row.count || 0) > 0 || (row.user_days || 0) > 0)
    || series.some(response => (response?.series || []).some(point => (point.count || 0) > 0))
  if (hasData) return false
  if (status?.rollup && 'last_closed_day' in status.rollup) return !status.rollup.last_closed_day
  if (!active || !top) return false
  return true
}

const timeOf = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** The status line in the top bar: until which day the numbers go and when that day closed. */
export const usageLiveText = (status: UsageStatusResponse | null, window: UsageQuery, today = new Date(), firstRollupPending = false) => {
  const yesterday = addDays(toDateInput(today), -1)
  if (firstRollupPending) {
    const next = status?.rollup?.next_run_at
    return next ? `Primeiro resumo: ${shortDate(next.slice(0, 10))}, ${timeOf(next)}` : 'Primeiro resumo na próxima madrugada'
  }
  const closed = status?.rollup?.last_closed_day
  const day = closed && closed < window.end_date ? closed : window.end_date >= yesterday ? yesterday : window.end_date
  const until = day === yesterday ? `Dados até ontem, ${shortDate(day)}` : `Dados até ${shortDate(day)}`
  const closedAt = timeOf(status?.rollup?.rolled_at)
  return closedAt ? `${until} · fechados às ${closedAt}` : `${until} · fecham às 00:30`
}

/**
 * The events of one feature from a `top` answer. An API that filters by
 * feature echoes `filter.feature` and its events are the answer; otherwise
 * the portal's own list picks them (`filtered: false`).
 */
export const featureEvents = (response: UsageTopResponse | null, feature: string) => {
  const events = response?.events || []
  if (response?.filter?.feature === feature) return { events, filtered: true }
  if (events.some(row => row.feature !== undefined)) return { events: events.filter(row => row.feature === feature), filtered: true }
  const known = new Set(FEATURE_EVENTS[feature] || [])
  return { events: events.filter(row => known.has(row.event)), filtered: false }
}

/** Each day's state from the API's status (closed, closing, open, no_data). */
export const dayStates = (status: UsageStatusResponse | null) => new Map((status?.days || []).map(day => [day.date, day.state]))

/** When the telemetry started, from the API's status. */
export const telemetryStart = (status: UsageStatusResponse | null) => status?.rollup?.first_event_at || status?.rollup?.first_day || null

/** One source × client of the status ("client/app" is the app's own events, from 1.46). */
export const statusSource = (status: UsageStatusResponse | null, source: string, client?: string | null) =>
  (status?.sources || []).filter(row => row.source === source && (client === undefined || row.client === client))

/** The app already sends its own events: its client row has a first day or events today. */
export const appSendsEvents = (status: UsageStatusResponse | null) =>
  statusSource(status, 'client', 'app').some(row => Boolean(row.first_day) || (row.today || 0) > 0)
