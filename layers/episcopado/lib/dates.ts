/**
 * Datas parciais no formato EDTF simplificado usado pela base:
 *   "2019-03-16" | "2019-03" | "2019" | "c.1890" | "1890/1895"
 *
 * Toda data vira um intervalo [min, max] em "AAAA-MM-DD" para que comparações
 * com datas incompletas só acusem erro quando a ordem é *certamente* inválida.
 */

export const DATE_PATTERN = /^\d{4}(-\d{2}(-\d{2})?)?$|^c\.\d{4}$|^\d{4}\/\d{4}$/

export interface DateRange {
  min: string
  max: string
  approximate: boolean
}

const LAST_DAY = ['31', '29', '31', '30', '31', '30', '31', '31', '30', '31', '30', '31']

// Margem para datas "c.AAAA": circa cobre alguns anos para cada lado.
const CIRCA_MARGIN = 5

export function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const [, month, day] = value.replace(/^c\./, '').split('-')
  if (month && (Number(month) < 1 || Number(month) > 12)) return false
  if (day && (Number(day) < 1 || Number(day) > Number(LAST_DAY[Number(month) - 1]))) return false
  return true
}

export function rangeOf(value: string): DateRange {
  if (value.includes('/')) {
    const [start, end] = value.split('/')
    return { min: `${start}-01-01`, max: `${end}-12-31`, approximate: true }
  }

  const approximate = value.startsWith('c.')
  const clean = value.replace(/^c\./, '')
  const [year, month, day] = clean.split('-')

  if (approximate) {
    const y = Number(year)
    return {
      min: `${String(y - CIRCA_MARGIN).padStart(4, '0')}-01-01`,
      max: `${String(y + CIRCA_MARGIN).padStart(4, '0')}-12-31`,
      approximate
    }
  }
  if (day) return { min: clean, max: clean, approximate }
  if (month) return { min: `${year}-${month}-01`, max: `${year}-${month}-${LAST_DAY[Number(month) - 1]}`, approximate }
  return { min: `${year}-01-01`, max: `${year}-12-31`, approximate }
}

/** `a` é certamente anterior a `b` (estritamente), mesmo considerando a imprecisão. */
export function definitelyBefore(a: string, b: string): boolean {
  return rangeOf(a).max < rangeOf(b).min
}

/** Ano usado para ordenar e para o controle de ano do grafo. */
export function yearOf(value: string): number {
  const { min, max } = rangeOf(value)
  return Math.round((Number(min.slice(0, 4)) + Number(max.slice(0, 4))) / 2)
}
