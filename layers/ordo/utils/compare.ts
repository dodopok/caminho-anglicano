import { toDateInput, type PeriodValue } from './period'

/**
 * Period over period. A count changes by a percentage ("+18%"), a rate by
 * percentage points ("+2,1 p.p."), and a duration usually wants to go down.
 * Small moves read as "estável" so noise is not dressed up as a trend.
 */
export type ComparisonKind = 'count' | 'rate' | 'duration'

export interface Comparison {
  direction: 'up' | 'down' | 'flat'
  tone: 'good' | 'bad' | 'neutral'
  text: string
  previousText: string
}

interface Options {
  kind?: ComparisonKind
  lowerIsBetter?: boolean
  /** How the previous value is written in the tooltip; defaults to a plain number. */
  format?: (value: number) => string
}

const FLAT_PERCENT = 1
const FLAT_POINTS = 0.5

const number = (value: number, digits = 0) => value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const comparePeriods = (
  current: number | null | undefined,
  previous: number | null | undefined,
  { kind = 'count', lowerIsBetter = kind === 'duration', format }: Options = {}
): Comparison | null => {
  if (current === null || current === undefined || previous === null || previous === undefined) return null
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null

  const previousText = format ? format(previous) : kind === 'rate' ? `${number(previous, 1)}%` : number(previous)
  const tone = (direction: Comparison['direction']): Comparison['tone'] => {
    if (direction === 'flat') return 'neutral'
    return (direction === 'up') !== lowerIsBetter ? 'good' : 'bad'
  }

  if (kind === 'rate') {
    const points = current - previous
    const direction = Math.abs(points) < FLAT_POINTS ? 'flat' : points > 0 ? 'up' : 'down'
    return {
      direction,
      tone: tone(direction),
      text: direction === 'flat' ? 'estável' : `${points > 0 ? '+' : '−'}${number(Math.abs(points), 1)} p.p.`,
      previousText
    }
  }

  // Nothing then and nothing now is not a trend worth a chip.
  if (previous === 0 && current === 0) return null
  if (previous === 0) return { direction: 'up', tone: tone('up'), text: 'antes, nenhum', previousText }

  const change = (current - previous) / Math.abs(previous) * 100
  const direction = Math.abs(change) < FLAT_PERCENT ? 'flat' : change > 0 ? 'up' : 'down'
  const size = Math.abs(change)
  return {
    direction,
    tone: tone(direction),
    text: direction === 'flat' ? 'estável' : `${change > 0 ? '+' : '−'}${number(size, size < 10 ? 1 : 0)}%`,
    previousText
  }
}

/**
 * The window of the same length that ends the day before `period` starts.
 * "Desde sempre" has none.
 */
export const previousPeriod = (period: PeriodValue): { start: string; end: string; days: number } | null => {
  if (period.preset === 'all') return null
  const start = new Date(`${period.start}T12:00:00`)
  const end = new Date(`${period.end}T12:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  const previousEnd = new Date(start)
  previousEnd.setDate(previousEnd.getDate() - 1)
  const previousStart = new Date(previousEnd)
  previousStart.setDate(previousStart.getDate() - (days - 1))
  return { start: toDateInput(previousStart), end: toDateInput(previousEnd), days }
}

/** "30 dias anteriores", "12 meses anteriores", or the dates for a custom range. */
export const previousLabel = (period: PeriodValue) => {
  if (period.preset === '7d') return '7 dias anteriores'
  if (period.preset === '30d') return '30 dias anteriores'
  if (period.preset === '90d') return '90 dias anteriores'
  if (period.preset === '12m') return '12 meses anteriores'
  const window = previousPeriod(period)
  return window ? `${window.days} dias anteriores` : ''
}
