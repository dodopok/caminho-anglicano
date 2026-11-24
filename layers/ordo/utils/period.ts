export type PeriodPreset = '7d' | '30d' | '90d' | '12m' | 'all' | 'custom'

export interface PeriodValue {
  preset: PeriodPreset
  start: string
  end: string
}

/** The API's "since forever": the history starts long before this date. */
export const ALL_TIME_START = '1970-01-01'

export const toDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Inclusive ranges ending today: "30 dias" is today and the 29 days before. */
export const rangeForPreset = (preset: Exclude<PeriodPreset, 'custom'>, today = new Date()): PeriodValue => {
  const end = toDateInput(today)
  const start = new Date(today)
  if (preset === '7d') start.setDate(start.getDate() - 6)
  if (preset === '30d') start.setDate(start.getDate() - 29)
  if (preset === '90d') start.setDate(start.getDate() - 89)
  if (preset === '12m') {
    start.setDate(1)
    start.setMonth(start.getMonth() - 11)
  }
  return { preset, start: preset === 'all' ? ALL_TIME_START : toDateInput(start), end }
}

/** Long ranges read better month by month than as hundreds of daily points. */
export const groupsByMonth = (value: PeriodValue) => {
  if (value.preset === 'all' || value.preset === '12m') return true
  const start = new Date(`${value.start}T12:00:00`)
  const end = new Date(`${value.end}T12:00:00`)
  return (end.getTime() - start.getTime()) / 86_400_000 > 120
}

export const periodShortLabel = (value: PeriodValue) => {
  if (value.preset === '7d') return '7 dias'
  if (value.preset === '30d') return '30 dias'
  if (value.preset === '90d') return '90 dias'
  if (value.preset === '12m') return '12 meses'
  if (value.preset === 'all') return 'Histórico'
  return 'Período'
}
