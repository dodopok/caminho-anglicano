import type { ComputedRef, InjectionKey, Ref } from 'vue'
import { createReport, type Report } from './useReport'
import type { PeriodValue } from '../utils/period'
import type { PortalTab } from '../utils/portalRoute'
import type { UsageSection, UsageWindow } from '../utils/usage'
import type { UsageActiveUsersResponse, UsageQuery, UsageSeriesResponse, UsageStatusResponse, UsageTopResponse } from '../types/usage'

/**
 * What every section of the Uso tab shares: the window it reads (and the one
 * before, for the comparisons), the reports more than one section needs, and
 * the way to move between sections. The tab root provides it.
 */
export interface UsageCore {
  active: Report<UsageActiveUsersResponse>
  activePrevious: Report<UsageActiveUsersResponse>
  top: Report<UsageTopResponse>
  topPrevious: Report<UsageTopResponse>
  status: Report<UsageStatusResponse>
  offices: Report<UsageSeriesResponse>
  officesPrevious: Report<UsageSeriesResponse>
}

export interface UsageContext {
  period: ComputedRef<PeriodValue>
  window: ComputedRef<UsageWindow>
  previous: ComputedRef<UsageQuery | null>
  /** "30 dias anteriores" */
  previousLabel: ComputedRef<string>
  monthly: ComputedRef<boolean>
  reloadKey: ComputedRef<number>
  today: () => Date
  core: UsageCore
  bookNames: Ref<Record<string, string>>
  /** The app sends its own events (from 1.46); until then client events are web only. */
  appEvents: ComputedRef<boolean>
  open: (section: UsageSection, params?: { recurso?: string | null }) => void
  openTab: (tab: PortalTab) => void
}

const KEY: InjectionKey<UsageContext> = Symbol('ordo-usage-context')

export const provideUsageContext = (context: UsageContext) => {
  provide(KEY, context)
  return context
}

export const useUsageContext = (): UsageContext => {
  const context = inject(KEY, null)
  if (!context) throw new Error('useUsageContext() outside the Uso tab')
  return context
}

/**
 * A report of one section, read again whenever the window or the refresh
 * button changes. `read` gets the current window and the previous one.
 */
export const useWindowReport = <T>(read: (window: UsageQuery, previous: UsageQuery | null) => Promise<T>, extraKey?: () => unknown) => {
  const context = useUsageContext()
  const report = createReport<T>(() => read(context.window.value, context.previous.value), { lazy: false })
  const key = computed(() => [context.window.value.start_date, context.window.value.end_date, context.reloadKey.value, extraKey?.()].join('|'))
  watch(key, () => report.load(), { immediate: true })
  return report.state
}
