import { toDateInput, type PeriodValue } from './period'
import type { UsageActivePoint, UsageContentRow, UsageQuery } from '../types/usage'

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

/** The same slug opened through two events (or two kinds) adds up to one line. */
export const groupContent = (rows: UsageContentRow[]) => {
  const groups: Record<ContentGroup, Map<string, { slug: string; count: number; userDays: number }>> = {
    saints: new Map(),
    documents: new Map(),
    posts: new Map(),
    rosaries: new Map()
  }
  rows.forEach(row => {
    const group = contentGroup(row)
    if (!group || !row.content_slug) return
    const current = groups[group].get(row.content_slug) || { slug: row.content_slug, count: 0, userDays: 0 }
    current.count += row.count || 0
    current.userDays += row.user_days || 0
    groups[group].set(row.content_slug, current)
  })
  const sorted = (map: Map<string, { slug: string; count: number; userDays: number }>) =>
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
