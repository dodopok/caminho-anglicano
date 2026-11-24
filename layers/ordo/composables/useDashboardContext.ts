import type { InjectionKey, Ref } from 'vue'
import type { DashboardData, DashboardSectionName } from '../types/dashboard'

/**
 * What the page knows about the data while the panels draw it: which
 * sections are still on their way (each card shows its own skeleton instead
 * of a zero), and the same sections for the window just before the period, so
 * a card can say whether its number went up or down.
 */
export interface DashboardContext {
  isPending: (...sections: DashboardSectionName[]) => boolean
  /** The previous window's data; null when there is nothing to compare with ("Desde sempre"). */
  previous: Readonly<Ref<DashboardData | null>>
  /** "30 dias anteriores", "período anterior". */
  previousLabel: Readonly<Ref<string>>
  isPreviousPending: (...sections: DashboardSectionName[]) => boolean
}

const KEY: InjectionKey<DashboardContext> = Symbol('ordo-dashboard-context')

export const provideDashboardContext = (context: DashboardContext) => {
  provide(KEY, context)
  return context
}

const idle: DashboardContext = {
  isPending: () => false,
  previous: computed(() => null),
  previousLabel: computed(() => ''),
  isPreviousPending: () => false
}

export const useDashboardContext = (): DashboardContext => inject(KEY, idle)
