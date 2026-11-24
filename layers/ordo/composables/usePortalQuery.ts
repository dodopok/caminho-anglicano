import type { InjectionKey, Ref } from 'vue'

/**
 * Where the operator is in the portal, kept in the URL query so a reload (F5),
 * a bookmark or a link from the attention band opens the same place: the tab,
 * the period, a sub-tab, a queue's filters, the rosary open in review.
 *
 * The page owns the router; the panels only read and write keys through this
 * store, which they inject. Without a provider (a component test) the store
 * lives in memory and behaves the same way.
 */
export type QueryValue = string | number | null | undefined
export type QueryPatch = Record<string, QueryValue>

export interface PortalQueryRouter {
  read: () => Record<string, unknown>
  write: (query: Record<string, string>, push: boolean) => unknown
}

export interface PortalQuery {
  values: Readonly<Ref<Record<string, string>>>
  get: (key: string) => string | undefined
  /** Merges `patch` (null or '' removes a key). `push` adds a history entry. */
  set: (patch: QueryPatch, options?: { push?: boolean }) => void
  /** Adopts the URL after navigation the store did not make (back/forward). */
  sync: (raw: Record<string, unknown>) => void
}

const KEY: InjectionKey<PortalQuery> = Symbol('ordo-portal-query')

const clean = (input: Record<string, unknown>) => {
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(input || {})) {
    const value = Array.isArray(raw) ? raw[0] : raw
    if (value === null || value === undefined || value === '') continue
    out[key] = String(value)
  }
  return out
}

const sameQuery = (a: Record<string, string>, b: Record<string, string>) => {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key])
}

export const createPortalQuery = (router?: PortalQueryRouter): PortalQuery => {
  const values = shallowRef<Record<string, string>>(clean(router?.read() || {}))
  let scheduled = false
  let pushNext = false
  // The last query this store sent to the router. Until it lands, the route
  // still shows an older URL, and adopting it would undo the newer change.
  let inflight: Record<string, string> | null = null

  // Several keys often change in the same tick (a tab and its filters); they
  // reach the router as one navigation, not one per key.
  const flush = () => {
    scheduled = false
    const push = pushNext
    pushNext = false
    if (!router) return
    const sent = { ...values.value }
    inflight = sent
    Promise.resolve(router.write(sent, push)).catch(() => {}).finally(() => {
      if (inflight !== sent) return
      inflight = null
      sync(router.read())
    })
  }

  const set: PortalQuery['set'] = (patch, { push = false } = {}) => {
    const removed = new Set(Object.entries(patch).filter(([, value]) => value === null || value === undefined || value === '').map(([key]) => key))
    const next = Object.fromEntries([
      ...Object.entries(values.value).filter(([key]) => !removed.has(key) && !(key in patch)),
      ...Object.entries(patch).filter(([key]) => !removed.has(key)).map(([key, value]) => [key, String(value)])
    ]) as Record<string, string>
    if (sameQuery(next, values.value)) return
    values.value = next
    pushNext = pushNext || push
    if (!router || scheduled) return
    scheduled = true
    queueMicrotask(flush)
  }

  function sync (raw: Record<string, unknown>) {
    if (scheduled || inflight) return
    const next = clean(raw)
    if (!sameQuery(next, values.value)) values.value = next
  }

  return { values, get: key => values.value[key], set, sync }
}

export const providePortalQuery = (query: PortalQuery) => {
  provide(KEY, query)
  return query
}

export const usePortalQuery = () => inject(KEY, null) ?? createPortalQuery()

/**
 * One key as a writable value. Anything outside `allowed` reads as the
 * fallback, and the fallback itself is never written, so the default view
 * keeps a clean URL.
 */
export const useQueryParam = <T extends string>(
  key: string,
  fallback: T,
  allowed?: readonly T[],
  options: { push?: boolean; query?: PortalQuery } = {}
) => {
  const query = options.query ?? usePortalQuery()
  return computed<T>({
    get: () => {
      const value = query.values.value[key]
      return value !== undefined && (!allowed || allowed.includes(value as T)) ? value as T : fallback
    },
    set: value => query.set({ [key]: value === fallback ? null : value }, { push: options.push })
  })
}
