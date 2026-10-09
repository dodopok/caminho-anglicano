import { ORDER_LABEL } from './labels'
import type { TOrdination } from './schemas'
import type { BaseIndex, JurisdictionRef, PersonRef } from './views'

/**
 * Efemérides: ordenações e sagrações cujo dia e mês caem numa janela do calendário
 * ("nesta semana", "neste dia"). Só entram datas completas (AAAA-MM-DD).
 */

export interface Ephemeris {
  person: PersonRef
  order: TOrdination['order']
  /** Descrição curta: "sagrado bispo", "ordenado presbítero", "ordenada diácona"... */
  label: string
  date: string
  year: number
  /** "MM-DD", para agrupar por dia. */
  monthDay: string
  jurisdiction: JurisdictionRef | null
  status: TOrdination['status']
}

const EVENT_LABEL: Record<TOrdination['order'], string> = {
  diaconate: 'ordenação diaconal',
  presbyterate: 'ordenação presbiteral',
  episcopate: 'sagração episcopal'
}

/** "MM-DD" de uma data; o ano é irrelevante (29 de fevereiro cai em 1º de março nos anos comuns). */
export function monthDay(date: Date): string {
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

/** Os `days` dias a partir de `start` (inclusive), como "MM-DD". */
export function windowDays(start: Date, days: number): string[] {
  const out: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i))
    out.push(monthDay(d))
  }
  return out
}

/**
 * Efemérides dentro da janela, na ordem do calendário e, no mesmo dia, da mais antiga
 * para a mais recente. `days` conta a partir de `start` (inclusive).
 */
export function ephemerides(index: BaseIndex, start: Date, days = 7): Ephemeris[] {
  const window = windowDays(start, days)
  const rank = new Map(window.map((md, i) => [md, i]))
  const out: Ephemeris[] = []
  for (const p of index.people.values()) {
    for (const o of p.ordinations ?? []) {
      if (!o.date || !/^\d{4}-\d{2}-\d{2}$/.test(o.date)) continue
      if (o.mode && o.mode !== 'normal') continue
      const md = o.date.slice(5)
      if (!rank.has(md)) continue
      const j = o.jurisdiction ? index.jurisdictions.get(o.jurisdiction) : undefined
      out.push({
        person: { id: p.id, name: p.name },
        order: o.order,
        label: EVENT_LABEL[o.order],
        date: o.date,
        year: Number(o.date.slice(0, 4)),
        monthDay: md,
        jurisdiction: o.jurisdiction ? { id: o.jurisdiction, name: j?.name ?? o.jurisdiction, acronym: j?.acronym } : null,
        status: o.status
      })
    }
  }
  return out.sort((a, b) => rank.get(a.monthDay)! - rank.get(b.monthDay)! || a.year - b.year || a.person.name.localeCompare(b.person.name, 'pt-BR'))
}

export { ORDER_LABEL }
