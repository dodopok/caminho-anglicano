import type { InjectionKey, Ref } from 'vue'
import type { OrdoIconName } from '../components/ordo/Icon.vue'

/**
 * The page head belongs to the page, but a tab with sections may need to say
 * where in it the operator is: Áudio's "Cobertura · loc_2015" titles the page
 * with the book's name and puts "Gerar o que falta" beside it; Uso's
 * "Recursos · Ofício" titles it "Ofício". A panel sets what it needs here and
 * the page draws it; anything left out falls back to the tab's own head.
 */
export interface PortalHeadAction {
  key: string
  label: string
  icon?: OrdoIconName
  variant?: 'primary' | 'secondary' | 'link' | 'ghost'
  disabled?: boolean
  onClick: () => void
}

export interface PortalHeadLive {
  text: string
  /** `busy` pulses blue (work running); `idle` is the steady green dot. */
  tone?: 'busy' | 'idle' | 'warn'
}

export interface PortalHead {
  title?: string
  description?: string
  /** A third crumb after the tab: "Execuções", "Recursos · Ofício". */
  crumb?: string
  actions?: PortalHeadAction[]
  live?: PortalHeadLive
}

export interface PortalHeadStore {
  head: Readonly<Ref<PortalHead>>
  set: (head: PortalHead) => void
  clear: () => void
}

const KEY: InjectionKey<PortalHeadStore> = Symbol('ordo-portal-head')

export const createPortalHead = (): PortalHeadStore => {
  const head = shallowRef<PortalHead>({})
  return {
    head,
    set: value => { head.value = value },
    clear: () => { head.value = {} }
  }
}

export const providePortalHead = (store: PortalHeadStore) => {
  provide(KEY, store)
  return store
}

/**
 * Keeps the page head in step with `source` while the calling panel is
 * mounted, and gives it back to the page when the panel goes away.
 */
export const usePortalHead = (source?: () => PortalHead) => {
  const store = inject(KEY, null) ?? createPortalHead()
  if (source) {
    watchEffect(() => store.set(source()))
    onScopeDispose(() => store.clear())
  }
  return store
}
