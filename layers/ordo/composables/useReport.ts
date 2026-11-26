import { isSessionError, OrdoApiError } from '../types/dashboard'

/**
 * One report the screen reads on its own: its answer, its error, whether it
 * is on its way, and whether the API in use simply does not have it yet.
 *
 * Áudio and Uso are built ahead of some of their endpoints. Until those are
 * deployed the API answers 404 (or 405/501 behind some proxies); the card
 * that depends on one shows a short "em breve" instead of an error, and the
 * rest of the tab carries on.
 */
export const SOON_STATUSES = [404, 405, 501] as const

export const isNotDeployed = (error: unknown) =>
  error instanceof OrdoApiError && (SOON_STATUSES as readonly number[]).includes(error.status)

export interface Report<T> {
  data: T | null
  error: unknown
  loading: boolean
  /** The endpoint is not deployed yet: draw "em breve", not an error. */
  soon: boolean
  /** Read at least once (successfully or not). */
  settled: boolean
}

export const errorText = (error: unknown, fallback = 'Não foi possível ler este relatório.') => {
  if (!error || isSessionError(error) || isNotDeployed(error)) return null
  if (error instanceof OrdoApiError && error.status === 403) return 'Sua conta não tem acesso de administrador.'
  if (error instanceof Error && error.message) return error.message
  return fallback
}

/**
 * A reactive report and its loader. Each `load` supersedes the previous one:
 * an older answer that arrives late never overwrites a newer one.
 */
export const createReport = <T>(read: () => Promise<T>, { lazy = true } = {}) => {
  const state = reactive({ data: null, error: null, loading: !lazy, soon: false, settled: false }) as Report<T>
  let generation = 0

  const load = async (reader: () => Promise<T> = read) => {
    const current = ++generation
    state.loading = true
    // The error stays until the new answer arrives, so a reread (the live poll)
    // does not flash it away and back.
    try {
      const data = await reader()
      if (current !== generation) return
      state.data = data
      state.error = null
      state.soon = false
    } catch (error) {
      if (current !== generation) return
      state.error = error
      state.soon = isNotDeployed(error)
      if (!isSessionError(error)) state.data = null
    } finally {
      if (current === generation) {
        state.loading = false
        state.settled = true
      }
    }
  }

  const reset = () => {
    generation += 1
    state.data = null
    state.error = null
    state.loading = false
    state.soon = false
    state.settled = false
  }

  return { state, load, reset }
}
