import type { CountMap } from '../types/dashboard'

export interface DashboardMapItem {
  key: string
  label: string
  value: number
}

export const useOrdoDashboardPresentation = () => {
  const asNumber = (value: number | null | undefined) => value ?? 0

  const formatNumber = (value: number | null | undefined) =>
    new Intl.NumberFormat('pt-BR').format(asNumber(value))

  const formatDecimal = (value: number | null | undefined, digits = 1) =>
    asNumber(value).toLocaleString('pt-BR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    })

  const formatPercent = (value: number | null | undefined) =>
    value === null || value === undefined
      ? '—'
      : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

  const formatDuration = (seconds: number | null | undefined) => {
    const totalSeconds = asNumber(seconds)
    if (totalSeconds < 60) return `${Math.round(totalSeconds)} s`

    const minutes = Math.floor(totalSeconds / 60)
    const remainingSeconds = Math.round(totalSeconds % 60)
    return remainingSeconds ? `${minutes} min ${remainingSeconds} s` : `${minutes} min`
  }

  const formatDate = (value?: string | null) => {
    if (!value) return '—'
    const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value)
    if (Number.isNaN(date.getTime())) return '—'

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTimestamp = (value?: string | null) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'

    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const humanizeKey = (value: string) => {
    const labels: Record<string, string> = {
      morning: 'Manhã',
      midday: 'Meio-dia',
      evening: 'Noite',
      compline: 'Completas',
      late_evening: 'Fim da noite',
      android: 'Android',
      ios: 'iOS',
      web: 'Web',
      unknown: 'Não identificado',
      pending_review: 'Em revisão',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      private: 'Privado',
      sent: 'Enviado',
      failed: 'Falhou',
      invalid: 'Inválido',
      basic: 'Básico',
      traditional: 'Tradicional'
    }

    return labels[value] || value.replaceAll('_', ' ')
  }

  const scopeLabel = (scope?: string) => {
    if (scope === 'lifetime') return 'base total'
    if (scope === 'today') return 'hoje'
    if (scope === 'window') return 'janela móvel'
    return 'período'
  }

  const mapItems = (map?: CountMap): DashboardMapItem[] => Object.entries(map || {})
    .map(([key, value]) => ({ key, label: humanizeKey(key), value: asNumber(value) }))
    .sort((a, b) => b.value - a.value)

  const maxItemValue = (items: Array<{ value: number }>) => Math.max(...items.map(item => item.value), 1)

  const createDateRange = (start: string, end: string) => {
    const dates: string[] = []
    const cursor = new Date(`${start}T12:00:00`)
    const finalDate = new Date(`${end}T12:00:00`)
    if (Number.isNaN(cursor.getTime()) || Number.isNaN(finalDate.getTime()) || cursor > finalDate) return dates

    while (cursor <= finalDate && dates.length < 370) {
      const year = cursor.getFullYear()
      const month = String(cursor.getMonth() + 1).padStart(2, '0')
      const day = String(cursor.getDate()).padStart(2, '0')
      dates.push(`${year}-${month}-${day}`)
      cursor.setDate(cursor.getDate() + 1)
    }

    return dates
  }

  const formatChartLabel = (value: string) => {
    const date = new Date(`${value}T12:00:00`)
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  return {
    asNumber,
    formatNumber,
    formatDecimal,
    formatPercent,
    formatDuration,
    formatDate,
    formatTimestamp,
    humanizeKey,
    scopeLabel,
    mapItems,
    maxItemValue,
    createDateRange,
    formatChartLabel
  }
}
