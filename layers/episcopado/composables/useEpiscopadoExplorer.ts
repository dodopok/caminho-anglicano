import type { EdgeGroup } from '../lib/style'

export interface ExplorerFilters {
  showPeople: boolean
  showJurisdictions: boolean
  groups: Record<EdgeGroup, boolean>
  /** 'brazil' = só o núcleo brasileiro; 'all' = rede inteira. */
  scope: 'brazil' | 'all'
}

export const DEFAULT_FILTERS: ExplorerFilters = {
  showPeople: true,
  showJurisdictions: true,
  groups: { ordinations: true, affiliations: true, relations: true },
  scope: 'brazil'
}

/**
 * Estado do explorador que sobrevive à ida para uma ficha e volta:
 * filtros e a trilha dos nós visitados nesta sessão.
 */
export function useEpiscopadoExplorer() {
  const filters = useState<ExplorerFilters>('episcopado-filters', () => structuredClone(DEFAULT_FILTERS))
  const trail = useState<string[]>('episcopado-trail', () => [])

  /** Registra uma visita, sem repetir o último e com tamanho limitado. */
  function visit(id: string) {
    const list = trail.value
    if (list[list.length - 1] === id) return
    const existing = list.indexOf(id)
    if (existing !== -1) list.splice(existing, 1)
    list.push(id)
    if (list.length > 12) list.splice(0, list.length - 12)
  }

  return { filters, trail, visit }
}
