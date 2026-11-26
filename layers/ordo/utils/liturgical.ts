import type { DashboardLiturgicalToday } from '../types/dashboard'

export interface LiturgicalTheme {
  name: string
  line?: string
  note?: string
  color: string
  wash: string
  ink: string
}

// The liturgical colours as the site and the Ordo Web draw them, toned so the
// accent stays readable on paper. White feasts are drawn in gold, as in the app.
const PALETTE: Record<string, Omit<LiturgicalTheme, 'name' | 'line' | 'note'>> = {
  green: { color: '#3f7a46', wash: '#e4efe3', ink: '#2f6a37' },
  purple: { color: '#6b4a93', wash: '#ece6f2', ink: '#4a2e67' },
  violet: { color: '#6b4a93', wash: '#ece6f2', ink: '#4a2e67' },
  white: { color: '#c9a227', wash: '#f2e9d2', ink: '#7a5e10' },
  gold: { color: '#c9a227', wash: '#f2e9d2', ink: '#7a5e10' },
  red: { color: '#b3283a', wash: '#f6e3e3', ink: '#8e1f2c' },
  rose: { color: '#c4788e', wash: '#f6e6ec', ink: '#8a3d55' },
  blue: { color: '#2d5fb8', wash: '#e3edf7', ink: '#123fa0' },
  black: { color: '#4a5f76', wash: '#eceef1', ink: '#0d2744' }
}

const COLOR_ALIASES: Record<string, string> = {
  verde: 'green',
  roxo: 'purple',
  violeta: 'violet',
  branco: 'white',
  dourado: 'gold',
  vermelho: 'red',
  rosa: 'rose',
  azul: 'blue',
  preto: 'black'
}

/** A liturgical colour code (English or Portuguese) as the portal draws it; null when unknown. */
export const liturgicalColor = (code?: string | null): string | null => {
  const raw = (code || '').trim().toLocaleLowerCase('pt-BR')
  if (!raw) return null
  return PALETTE[COLOR_ALIASES[raw] || raw]?.color || null
}

const COLOR_NAMES: Record<string, string> = {
  green: 'verde', purple: 'roxo', violet: 'roxo', white: 'branco', gold: 'dourado', red: 'vermelho', rose: 'rosa', blue: 'azul', black: 'preto'
}

/** "roxo", for the screen reader and the tooltip; null when unknown. */
export const liturgicalColorName = (code?: string | null): string | null => {
  const raw = (code || '').trim().toLocaleLowerCase('pt-BR')
  if (!raw) return null
  return COLOR_NAMES[COLOR_ALIASES[raw] || raw] || null
}

const shortDate = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export const liturgicalTheme = (today: DashboardLiturgicalToday): LiturgicalTheme => {
  const rawColor = (today.color_code || today.color_label || 'green').toLocaleLowerCase('pt-BR')
  const palette = PALETTE[COLOR_ALIASES[rawColor] || rawColor] || PALETTE.green
  const season = today.season || 'Tempo litúrgico'
  const line = [
    today.proper ? `Próprio ${today.proper}` : null,
    today.week ? `${today.week}ª semana` : null,
    today.cycle ? `ano ${today.cycle}` : null
  ].filter(Boolean).join(' · ')
  const days = today.days_remaining_in_season
  const ends = shortDate(today.season_ends_on)
  let note: string | undefined
  if (days === 0) note = `Último dia: ${season}`
  else if (days === 1) note = `Termina amanhã${ends ? `, ${ends}` : ''}`
  else if (typeof days === 'number' && days > 0 && days <= 14) note = `Faltam ${days} dias${ends ? ` · termina em ${ends}` : ''}`

  return {
    ...palette,
    name: today.celebration_name || season,
    line: today.celebration_name ? [season, line].filter(Boolean).join(' · ') : line,
    note
  }
}
