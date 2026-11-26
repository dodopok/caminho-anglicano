import { rangeForPreset, type PeriodPreset, type PeriodValue } from './period'
import type { QueryPatch } from '../composables/usePortalQuery'

/**
 * The portal's address: `/portal-do-ordo?aba=operacao&vista=regras`. Keys and
 * values are Portuguese so a copied link reads like the screen it opens.
 */
export type PortalTab = 'overview' | 'growth' | 'practice' | 'platform' | 'usage' | 'operations' | 'audio'

export const TAB_SLUGS: Record<PortalTab, string> = {
  overview: 'visao-geral',
  growth: 'pessoas',
  practice: 'pratica',
  platform: 'negocio',
  usage: 'uso',
  operations: 'operacao',
  audio: 'audio'
}

export const DEFAULT_TAB: PortalTab = 'overview'

export const tabFromSlug = (slug?: string): PortalTab =>
  (Object.entries(TAB_SLUGS).find(([, value]) => value === slug)?.[0] as PortalTab | undefined) || DEFAULT_TAB

/** Keys that belong to the whole portal; every other key belongs to one tab. */
export const GLOBAL_KEYS = ['aba', 'periodo', 'de', 'ate'] as const

const PRESET_SLUGS: Record<Exclude<PeriodPreset, 'custom'>, string> = {
  '7d': '7d',
  '30d': '30d',
  '90d': '90d',
  '12m': '12m',
  all: 'tudo'
}

const DEFAULT_PRESET = '30d'
const DATE = /^\d{4}-\d{2}-\d{2}$/

const validDate = (value?: string) => Boolean(value && DATE.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime()))

export const periodFromQuery = (values: Record<string, string>, today = new Date()): PeriodValue => {
  const { de: start, ate: end } = values
  if (validDate(start) && validDate(end) && start! <= end!) return { preset: 'custom', start: start!, end: end! }
  const preset = (Object.entries(PRESET_SLUGS).find(([, slug]) => slug === values.periodo)?.[0] || DEFAULT_PRESET) as Exclude<PeriodPreset, 'custom'>
  return rangeForPreset(preset, today)
}

export const periodToQuery = (period: PeriodValue): QueryPatch => {
  if (period.preset === 'custom') return { periodo: null, de: period.start, ate: period.end }
  return { periodo: period.preset === DEFAULT_PRESET ? null : PRESET_SLUGS[period.preset], de: null, ate: null }
}

/** Where a link inside the portal leads: a tab and, optionally, a place in it. */
export interface PortalLocation {
  tab: PortalTab
  params?: QueryPatch
}

/** The query that opens `location`, keeping the period and dropping the old tab's keys. */
export const queryForLocation = (current: Record<string, string>, location: PortalLocation): QueryPatch => {
  const patch: QueryPatch = {}
  for (const key of Object.keys(current)) {
    if (!(GLOBAL_KEYS as readonly string[]).includes(key)) patch[key] = null
  }
  patch.aba = location.tab === DEFAULT_TAB ? null : TAB_SLUGS[location.tab]
  return { ...patch, ...(location.params || {}) }
}

export const PORTAL_LOGIN = '/portal-do-ordo/login'

/** Only a path inside the portal may be a return address after login, never another site. */
export const portalReturnPath = (value: unknown) => {
  const path = Array.isArray(value) ? value[0] : value
  return typeof path === 'string' && /^\/portal-do-ordo(?:[/?]|$)/.test(path) && !path.startsWith(PORTAL_LOGIN)
    ? path
    : '/portal-do-ordo'
}
