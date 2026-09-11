export interface CountryMapLocation {
  id: string
  name: string
  path: string
}

export interface CountryMapDatum {
  code: string
  count: number
  percent: number
  name: string
  hasGeometry: boolean
}

const BLUE_LOW = [224, 239, 247] as const
const BLUE_HIGH = [25, 87, 126] as const

export const normalizeCountryCode = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  const normalized = value.trim().toLowerCase()
  return /^[a-z]{2}$/.test(normalized) ? normalized : null
}

export const normalizeCountryCounts = (counts?: Record<string, number | null | undefined>) =>
  Object.entries(counts || {}).reduce<Record<string, number>>((result, [code, value]) => {
    const normalizedCode = normalizeCountryCode(code) || code.trim().toLowerCase()
    const count = Number(value)
    if (!normalizedCode || !Number.isFinite(count) || count <= 0) return result

    result[normalizedCode] = (result[normalizedCode] || 0) + count
    return result
  }, {})

export const countryPercent = (count: number, total: number) => {
  if (total <= 0 || count <= 0) return 0

  return Math.round((count / total) * 1000) / 10
}

export const countryFill = (count: number, maximum: number) => {
  if (count <= 0 || maximum <= 0) return '#f7faf7'

  // Square-root scaling keeps smaller communities visible while preserving
  // the continuous relationship between count and color.
  const intensity = Math.sqrt(Math.min(count / maximum, 1))
  const channels = BLUE_LOW.map((channel, index) => Math.round(channel + (BLUE_HIGH[index] - channel) * intensity))
  return `rgb(${channels.join(', ')})`
}

export const createCountryMapData = (
  counts: Record<string, number | null | undefined> | undefined,
  total: number | null | undefined,
  locations: readonly CountryMapLocation[],
  nameForCode: (code: string, fallback?: string) => string
): CountryMapDatum[] => {
  const normalizedCounts = normalizeCountryCounts(counts)
  const geometryCodes = new Set(locations.map(location => location.id.toLowerCase()))
  const denominator = Math.max(Number(total) || 0, Object.values(normalizedCounts).reduce((sum, count) => sum + count, 0))

  return Object.entries(normalizedCounts)
    .map(([code, count]) => {
      const location = locations.find(item => item.id.toLowerCase() === code)
      return {
        code,
        count,
        percent: countryPercent(count, denominator),
        name: nameForCode(code, location?.name),
        hasGeometry: geometryCodes.has(code)
      }
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}
