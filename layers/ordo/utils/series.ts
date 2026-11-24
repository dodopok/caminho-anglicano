import type { TrendPoint } from '../components/ordo/TrendChart.vue'
import type { OrdoIconName } from '../components/ordo/Icon.vue'

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const parse = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`)

const datesBetween = (start: string, end: string) => {
  const out: string[] = []
  const cursor = parse(start)
  const last = parse(end)
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime())) return out
  while (cursor <= last && out.length < 800) {
    out.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

export type DailyInput = Record<string, number | null | undefined> | Array<{ date: string; value: number | null | undefined }>

const toMap = (input: DailyInput) => {
  const map: Record<string, number> = {}
  if (Array.isArray(input)) input.forEach(item => { map[item.date.slice(0, 10)] = (map[item.date.slice(0, 10)] || 0) + Number(item.value || 0) })
  else Object.entries(input || {}).forEach(([date, value]) => { map[date.slice(0, 10)] = (map[date.slice(0, 10)] || 0) + Number(value || 0) })
  return map
}

/**
 * One point per day between `start` and `end` (missing days are zero), or one
 * per month when `monthly` is set: the monthly value is the sum, or the daily
 * average with `average` — "pessoas por dia" must not add up a month of days.
 */
export const buildSeries = (input: DailyInput, start: string, end: string, { monthly = false, average = false } = {}): TrendPoint[] => {
  const map = toMap(input)
  const keys = Object.keys(map).sort()
  const first = start < '2000-01-01' && keys.length ? keys[0] : start
  const days = datesBetween(first, end)
  if (!monthly) {
    return days.map(date => {
      const day = parse(date)
      return {
        key: date,
        tick: `${day.getDate()} ${MONTHS[day.getMonth()]}`,
        title: `${WEEKDAYS[day.getDay()]}, ${day.getDate()} de ${MONTHS[day.getMonth()]}.`,
        value: map[date] || 0,
        strong: day.getDay() === 0
      }
    })
  }
  const months = new Map<string, { total: number; days: number }>()
  days.forEach(date => {
    const month = date.slice(0, 7)
    const bucket = months.get(month) || { total: 0, days: 0 }
    bucket.total += map[date] || 0
    bucket.days += 1
    months.set(month, bucket)
  })
  return Array.from(months.entries()).map(([month, bucket]) => {
    const date = parse(`${month}-01`)
    return {
      key: month,
      tick: `${MONTHS[date.getMonth()]}/${String(date.getFullYear()).slice(2)}`,
      title: `${MONTHS[date.getMonth()]}. de ${date.getFullYear()}`,
      value: average ? bucket.total / Math.max(bucket.days, 1) : bucket.total
    }
  })
}

export const lastValues = (points: TrendPoint[], count = 30) => points.slice(-count).map(point => point.value)

export interface OfficeMeta {
  label: string
  icon: OrdoIconName
  color: string
  tint: string
  order: number
}

// The colours of the hours in the app: morning blue, midday orange, evening
// green, compline purple. Checked for colour-blind separation with labels.
// The Little Hours (prima, terça, noa) come from books that print the
// monastic course; they sit between the main offices in the order the day
// runs, the same order as `DailyOffice::OfficeTypes::ALL` in the API.
export const OFFICE_META: Record<string, OfficeMeta> = {
  morning: { label: 'Manhã', icon: 'morning', color: 'var(--op-s1)', tint: 'rgba(23, 84, 207, .1)', order: 1 },
  prime: { label: 'Prima', icon: 'prime', color: 'var(--op-s7)', tint: 'rgba(168, 128, 26, .13)', order: 2 },
  terce: { label: 'Terça', icon: 'terce', color: 'var(--op-s6)', tint: 'rgba(43, 127, 142, .12)', order: 3 },
  midday: { label: 'Meio-dia', icon: 'midday', color: 'var(--op-s2)', tint: 'rgba(196, 112, 31, .12)', order: 4 },
  none: { label: 'Noa', icon: 'none', color: 'var(--op-s8)', tint: 'rgba(95, 111, 134, .13)', order: 5 },
  evening: { label: 'Noite', icon: 'evening', color: 'var(--op-s3)', tint: 'rgba(61, 143, 95, .12)', order: 6 },
  compline: { label: 'Completas', icon: 'compline', color: 'var(--op-s4)', tint: 'rgba(122, 85, 176, .12)', order: 7 },
  late_evening: { label: 'Fim da noite', icon: 'late', color: 'var(--op-s5)', tint: 'rgba(208, 69, 122, .12)', order: 8 }
}

/** An office the API learns before the panel does still reads as words, after the known ones. */
export const officeMeta = (key: string): OfficeMeta => {
  const known = OFFICE_META[key]
  if (known) return known
  const words = key.replaceAll('_', ' ').trim()
  return {
    label: words ? words.charAt(0).toLocaleUpperCase('pt-BR') + words.slice(1) : 'Sem tipo',
    icon: 'clock',
    color: 'var(--op-ink-soft)',
    tint: 'rgba(13, 39, 68, .06)',
    order: 99
  }
}

export const SERIES_COLORS = ['var(--op-s1)', 'var(--op-s2)', 'var(--op-s4)', 'var(--op-s3)', 'var(--op-s5)']
