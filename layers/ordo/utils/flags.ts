import type {
  FeatureFlag,
  FlagChange,
  FlagChangeState,
  FlagCheckStop,
  FlagRule,
  FlagState,
  ScheduleAction,
  UndoBlockedReason
} from '../types/flags'

/**
 * The Feature flags tab's rules, kept out of the components so they can be
 * read and tested on their own: a flag's state and audience, who a change of
 * the general rule touches, when it needs the key typed, how a change reads
 * in the history, and every time in Brasília.
 */

export type FlagKindFilter = 'all' | 'feature' | 'prayer_book'
export type FlagStateFilter = 'all' | FlagState | 'scheduled'

/** A general-rule change that touches more people than this asks for the key typed. */
export const TYPED_CONFIRMATION_THRESHOLD = 100
/** How long a change stays in Últimas mudanças, ready to undo. */
export const UNDO_DAYS = 30
/** The percentage shortcuts beside the field. */
export const PERCENT_CHIPS = [1, 5, 10, 25, 50] as const

const DAY = 86_400_000
export const formatFlagCount = (value: number) => value.toLocaleString('pt-BR')
const plural = (count: number, one: string, many: string) => `${formatFlagCount(count)} ${count === 1 ? one : many}`
export const peopleCount = (count: number) => plural(count, 'pessoa', 'pessoas')

/** The API sends `state`; an older answer without it is read from the rule. */
export const flagState = (flag: Pick<FeatureFlag, 'rule' | 'percentage' | 'users_count'> & { state?: FlagState | null }): FlagState => {
  if (flag.state) return flag.state
  const percentage = flag.percentage ?? 0
  if (flag.rule === 'on' || (flag.rule === 'percentage' && percentage >= 100)) return 'on'
  if ((flag.rule === 'percentage' && percentage > 0) || flag.users_count > 0) return 'partial'
  return 'off'
}

export const STATE_LABEL: Record<FlagState, string> = { on: 'Ligada', partial: 'Parcial', off: 'Desligada' }
export const STATE_DOT: Record<FlagState, string> = { on: '', partial: 'op-dot--info', off: 'op-dot--quiet' }
export const KIND_LABEL = { feature: 'Recurso', prayer_book: 'Livro' } as const

export const isScheduled = (flag: Pick<FeatureFlag, 'enable_at' | 'disable_at'>) => Boolean(flag.enable_at || flag.disable_at)

/** A book flag whose book is still hidden in the catalogue. */
export const isPrerelease = (flag: FeatureFlag) => flag.kind === 'prayer_book' && flag.prayer_book_release_gated !== false

/** Everyone the "on" rule reaches, by the flag's requirements. */
export const everyoneLabel = (flag: Pick<FeatureFlag, 'requires_premium' | 'targeted'>) =>
  flag.requires_premium ? 'Todos com Ordo+' : flag.targeted ? 'Todos com login' : 'Todos'

/** "Quem vê", in a few words: "Todos com Ordo+", "10% + 14 pessoas", "Ninguém". */
export const audienceLabel = (flag: FeatureFlag) => {
  const state = flagState(flag)
  if (state === 'on') return everyoneLabel(flag)
  if (state === 'off') return 'Ninguém'
  const parts: string[] = []
  if (flag.rule === 'percentage' && flag.percentage) parts.push(`${flag.percentage}%`)
  if (flag.users_count > 0) parts.push(peopleCount(flag.users_count))
  return parts.join(' + ')
}

export const ruleLabel = (rule: FlagRule | null | undefined, percentage?: number | null) => {
  if (rule === 'on') return 'ligada para todos'
  if (rule === 'percentage') return `${percentage ?? 0}%`
  return 'desligada'
}

/** The line under "Quem vê": how many people today, or the general rule when nobody else sees it. */
export const audienceDetail = (flag: FeatureFlag) => {
  const state = flagState(flag)
  if (state === 'off' || (state === 'partial' && flag.rule !== 'percentage')) return `regra geral: ${ruleLabel(flag.rule, flag.percentage)}`
  if (flag.reach_estimate === null || flag.reach_estimate === undefined) return ''
  return `≈ ${peopleCount(flag.reach_estimate)} ${state === 'on' ? 'hoje' : 'veem hoje'}`
}

/**
 * The accounts that pass a flag's requirements (all of them, or those with
 * Ordo+), as the API counts its reach. Read from the flag itself when its rule
 * says it (on, or a percentage), or else from another flag with the same
 * requirement that is on for everyone. Null when nothing tells.
 */
export const audienceBase = (flag: FeatureFlag, flags: FeatureFlag[] = []): number | null => {
  const reach = flag.reach_estimate
  const known = reach !== null && reach !== undefined
  if (known && flag.rule === 'on') return reach + flag.users_off_count
  // A flag on for everyone with the same requirement counts the base exactly;
  // a percentage only lets it be worked back, rounded.
  const twin = flags.find(other => other.key !== flag.key && other.rule === 'on' && other.requires_premium === flag.requires_premium && other.reach_estimate !== null)
  if (twin) return twin.reach_estimate! + twin.users_off_count
  if (known && flag.rule === 'percentage' && (flag.percentage ?? 0) > 0) {
    return Math.round(Math.max(reach - flag.users_count, 0) * 100 / flag.percentage!) + flag.users_count + flag.users_off_count
  }
  return null
}

/** How many people would see the flag under another general rule; per-person rules stay. */
export const projectedReach = (flag: FeatureFlag, rule: FlagRule, percentage: number | null, base: number | null) => {
  if (rule === 'off') return flag.users_count
  if (base === null) return null
  if (rule === 'on') return Math.max(base - flag.users_off_count, 0)
  const free = Math.max(base - flag.users_count - flag.users_off_count, 0)
  return Math.round(free * Math.min(Math.max(percentage ?? 0, 0), 100) / 100) + flag.users_count
}

/**
 * Who a change of the general rule touches: whoever sees the flag now or
 * would see it after. When the API gives no way to tell how many people the
 * new rule reaches, a change that widens it counts as reaching many: the key
 * is asked for rather than trusting a guess.
 */
export const ruleChangeImpact = (flag: FeatureFlag, rule: FlagRule, percentage: number | null, base: number | null) => {
  const now = flag.reach_estimate ?? 0
  const after = projectedReach(flag, rule, percentage, base)
  const widens = rule === 'on' || (rule === 'percentage' && (percentage ?? 0) > (flag.rule === 'percentage' ? flag.percentage ?? 0 : 0))
  return {
    now,
    after,
    /** People who stop seeing it (positive) or start (negative). */
    lost: after === null ? null : now - after,
    typed: needsTypedConfirmation(Math.max(now, after ?? 0)) || (after === null && widens)
  }
}

export const needsTypedConfirmation = (reach: number | null | undefined) => (reach ?? 0) > TYPED_CONFIRMATION_THRESHOLD

/** The key a flag gets from its name: lowercase, no accents, words joined by `_`. */
export const suggestKey = (name: string) => name
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^[0-9_]+/, '')
  .replace(/_+$/g, '')
  .slice(0, 63)
  .replace(/_+$/g, '')

export const BOOK_KEY_PREFIX = 'prayer_book_'
export const bookFlagKey = (code: string) => `${BOOK_KEY_PREFIX}${code}`
/** The API's rule for a feature key: `^[a-z][a-z0-9_]{1,62}$`, not starting with `prayer_book_`. */
export const validKey = (key: string) => /^[a-z][a-z0-9_]{1,62}$/.test(key) && !key.startsWith(BOOK_KEY_PREFIX)
export const validBookCode = (code: string) => /^[a-z][a-z0-9_]{1,50}$/.test(code)

/** Whether a typed confirmation matches: the exact key, ignoring spaces around it. */
export const confirmationMatches = (typed: string, expected: string) => typed.trim() === expected

export const validPercentage = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 99

/** The percentage rule in plain words, for the card that sets it. */
export const percentageExplanation = (percentage: number) => [
  'Cada pessoa recebe um número fixo de 0 a 99, tirado da chave da flag e do id da pessoa (sem login, do id da instalação).',
  `Vê quem tem número menor que ${percentage}.`,
  'Subir a porcentagem mantém quem já via e soma mais gente.',
  'Baixar tira primeiro os números mais altos, os últimos que entraram.',
  'Cada flag sorteia um grupo diferente, porque a chave entra na conta.',
  'Quem não entrou na conta e não tem id de instalação fica fora da porcentagem.',
  'A regra própria de uma pessoa sempre vence a porcentagem.'
]

export const STOP_LABEL: Record<FlagCheckStop, string> = {
  premium: 'parou em Ordo+: a flag exige e a pessoa não tem',
  login: 'parou em login: a flag exige e a pessoa não entrou',
  user_rule: 'decidiu a regra própria da pessoa',
  general_rule: 'decidiu a regra geral',
  no_rule: 'sem regra: conta como desligada',
  availability: 'passou pela regra, mas a pessoa não rezou nenhum ofício este ano',
  released: 'o livro já saiu do pré-lançamento: todos veem'
}

// ---------- Time, always in Brasília ----------

/**
 * Brasília has kept UTC−3 all year since daylight saving ended in 2019. A
 * time typed in the panel is sent with that offset; display goes through the
 * time zone database, so it would follow a future change.
 */
export const BRASILIA_TZ = 'America/Sao_Paulo'
const BRASILIA_OFFSET = '-03:00'
const MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.']

interface BrasiliaParts { year: number; month: number; day: number; hour: string; minute: string; weekday: string }

const BRASILIA_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BRASILIA_TZ,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'long',
  hourCycle: 'h23'
})

export const brasiliaParts = (value: string | Date): BrasiliaParts | null => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const parts = Object.fromEntries(BRASILIA_FORMAT.formatToParts(date).map(part => [part.type, part.value]))
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: String(parts.hour).padStart(2, '0'),
    minute: String(parts.minute).padStart(2, '0'),
    weekday: String(parts.weekday)
  }
}

/**
 * "29 nov., 00:00" in Brasília, whatever the browser's zone; the year only
 * when it is not this year's; `weekday` puts the day first: "domingo, 7 dez., 09:00".
 */
export const formatBrasilia = (value: string | null | undefined, { now = new Date(), weekday = false, time = true } = {}) => {
  if (!value) return ''
  const parts = brasiliaParts(value)
  if (!parts) return ''
  const thisYear = brasiliaParts(now)?.year
  const date = `${parts.day} ${MONTHS[parts.month - 1]}${parts.year !== thisYear ? ` ${parts.year}` : ''}`
  return `${weekday ? `${parts.weekday}, ` : ''}${date}${time ? `, ${parts.hour}:${parts.minute}` : ''}`
}

/** The value of a `datetime-local` field for an instant, as read in Brasília. */
export const toBrasiliaInput = (value: string | null | undefined) => {
  if (!value) return ''
  const parts = brasiliaParts(value)
  if (!parts) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${parts.hour}:${parts.minute}`
}

/** A `datetime-local` value typed in Brasília, with its offset, as the API takes it. */
export const fromBrasiliaInput = (value: string | null | undefined) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const stamped = `${value}:00${BRASILIA_OFFSET}`
  return Number.isNaN(new Date(stamped).getTime()) ? null : stamped
}

/** Whether a typed Brasília time is still ahead. */
export const isFutureBrasilia = (value: string | null | undefined, now = new Date()) => {
  const stamped = fromBrasiliaInput(value)
  return Boolean(stamped) && new Date(stamped!).getTime() > now.getTime()
}

/** "há 5 min", "há 3 dias", "ontem"; a date after a week. Days counted in Brasília. */
export const relativeTime = (value: string | null | undefined, now = new Date()) => {
  if (!value) return ''
  const date = new Date(value)
  const diff = now.getTime() - date.getTime()
  if (Number.isNaN(diff)) return ''
  if (diff < 60_000) return 'agora'
  if (diff < 3_600_000) return `há ${Math.floor(diff / 60_000)} min`
  const today = brasiliaParts(now)!
  const then = brasiliaParts(date)!
  const days = Math.round((Date.UTC(today.year, today.month - 1, today.day) - Date.UTC(then.year, then.month - 1, then.day)) / DAY)
  if (days <= 0) return `há ${Math.floor(diff / 3_600_000)} h`
  if (days === 1) return 'ontem'
  if (days <= 7) return `há ${days} dias`
  return formatBrasilia(value, { now, time: false })
}

export const scheduleSentence = (action: ScheduleAction, at: string, { now = new Date(), weekday = false } = {}) =>
  `${action === 'enable' ? 'liga para todos' : 'desliga'} em ${formatBrasilia(at, { now, weekday })}`

/** The flag's scheduled changes, earliest first. */
export const flagSchedules = (flag: Pick<FeatureFlag, 'enable_at' | 'disable_at'>) => [
  flag.enable_at ? { action: 'enable' as const, at: flag.enable_at } : null,
  flag.disable_at ? { action: 'disable' as const, at: flag.disable_at } : null
].filter((item): item is { action: ScheduleAction; at: string } => Boolean(item))
  .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

// ---------- History ----------

const changedPeople = (state: FlagChangeState | null) => state?.user_ids?.length ?? state?.rules?.length ?? 0

/** One change in a sentence, without the flag's name: "regra geral de desligada para 10%". */
export const describeChange = (change: FlagChange, now = new Date()) => {
  const { before, after } = change
  switch (change.action) {
    case 'create':
      return `criada, ${ruleLabel(after?.rule, after?.percentage)}`
    case 'rule':
      return `regra geral de ${ruleLabel(before?.rule, before?.percentage)} para ${ruleLabel(after?.rule, after?.percentage)}`
    case 'scheduled_enable':
      return 'o agendamento ligou para todos'
    case 'scheduled_disable':
      return 'o agendamento desligou'
    case 'schedule': {
      const parts: string[] = []
      if (after?.enable_at) parts.push(`ligar em ${formatBrasilia(after.enable_at, { now })}`)
      if (after?.disable_at) parts.push(`desligar em ${formatBrasilia(after.disable_at, { now })}`)
      return parts.length ? `agendada para ${parts.join(' e ')}` : 'agendamento cancelado'
    }
    case 'users_add': {
      const count = changedPeople(after)
      return after?.enabled === false ? `regra própria desligada para ${peopleCount(count)}` : `mais ${peopleCount(count)}`
    }
    case 'users_remove':
      return `menos ${peopleCount(changedPeople(before) || 1)}`
    case 'delete':
      return 'apagada, com as regras e o agendamento'
    case 'details': {
      const changed: string[] = []
      if (after && 'name' in after) changed.push(`nome: ${after.name}`)
      if (after && 'description' in after) changed.push('descrição')
      if (after && 'requires_premium' in after) changed.push(after.requires_premium ? 'passa a exigir Ordo+' : 'deixa de exigir Ordo+')
      if (after && 'targeted' in after) changed.push(after.targeted ? 'passa a exigir login' : 'deixa de exigir login')
      return changed.length ? changed.join(', ') : 'detalhes editados'
    }
    default:
      return 'mudou'
  }
}

export const UNDO_BLOCKED_LABEL: Record<UndoBlockedReason, string> = {
  undone: 'desfeita',
  expired: 'mais de 30 dias',
  superseded: 'desfaça a mais nova antes',
  flag_deleted: 'desfaça a remoção antes'
}

/** Whether Desfazer is offered: the API says it works, and it is inside the 30 days. */
export const canUndo = (change: FlagChange, now = new Date()) =>
  change.undoable
  && !change.undone_at
  && now.getTime() - new Date(change.created_at).getTime() < UNDO_DAYS * DAY

/** Why Desfazer is not offered, in a few words; null when it is. */
export const undoBlockedLabel = (change: FlagChange, now = new Date()) => {
  if (canUndo(change, now)) return null
  if (change.undone_at) return UNDO_BLOCKED_LABEL.undone
  if (change.undo_blocked_reason) return UNDO_BLOCKED_LABEL[change.undo_blocked_reason]
  return UNDO_BLOCKED_LABEL.expired
}

/** The API's 409/422 codes, said for the person at the panel. */
export const FLAG_ERRORS: Record<string, string> = {
  FEATURE_FLAG_NOT_FOUND: 'Esta flag não existe mais (pode ter sido apagada).',
  FEATURE_FLAG_KEY_TAKEN: 'Já existe uma flag com esta chave.',
  FEATURE_FLAG_CHANGE_NOT_FOUND: 'Esta mudança não existe mais.',
  UNDO_EXPIRED: 'Esta mudança tem mais de 30 dias e não pode mais ser desfeita.',
  ALREADY_UNDONE: 'Esta mudança já foi desfeita.',
  UNDO_CONFLICT: 'Uma mudança mais nova na mesma parte da flag ainda vale. Desfaça ela antes.',
  FEATURE_FLAG_DELETED: 'A flag foi apagada. Desfaça a remoção antes.',
  USER_NOT_FOUND: 'Esta pessoa não existe.',
  USER_RULE_NOT_FOUND: 'Esta pessoa já não tem regra própria nesta flag.',
  QUERY_TOO_SHORT: 'Digite pelo menos 3 letras.'
}

// ---------- Filters ----------

export const matchesFilters = (flag: FeatureFlag, filters: { state: FlagStateFilter; kind: FlagKindFilter; search: string }) => {
  if (filters.kind !== 'all' && flag.kind !== filters.kind) return false
  if (filters.state === 'scheduled' && !isScheduled(flag)) return false
  if (filters.state !== 'all' && filters.state !== 'scheduled' && flagState(flag) !== filters.state) return false
  const term = filters.search.trim().toLowerCase()
  if (!term) return true
  return [flag.name, flag.key, flag.description || '', flag.prayer_book_code || ''].some(text => text.toLowerCase().includes(term))
}

export const STATE_SLUGS: Record<Exclude<FlagStateFilter, 'all'>, string> = { on: 'ligadas', partial: 'parciais', off: 'desligadas', scheduled: 'agendadas' }
export const KIND_SLUGS: Record<Exclude<FlagKindFilter, 'all'>, string> = { feature: 'recursos', prayer_book: 'livros' }

export const stateFromSlug = (slug?: string): FlagStateFilter =>
  (Object.entries(STATE_SLUGS).find(([, value]) => value === slug)?.[0] as FlagStateFilter | undefined) || 'all'
export const kindFromSlug = (slug?: string): FlagKindFilter =>
  (Object.entries(KIND_SLUGS).find(([, value]) => value === slug)?.[0] as FlagKindFilter | undefined) || 'all'
