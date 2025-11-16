import type { LiturgicalDate, LiturgicalSeason, LiturgicalColor } from '../types'

/**
 * Calcula a Páscoa usando o algoritmo de Gauss
 * Retorna a data da Páscoa para um dado ano
 */
export function calculateEaster(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month - 1, day)
}

/**
 * Calcula o ano litúrgico (A, B ou C)
 * Baseado no ciclo trienal do Lecionário Comum Revisado
 */
export function getLiturgicalYear(date: Date): 'A' | 'B' | 'C' {
  // O ano litúrgico começa no 1º Domingo do Advento
  // Para simplificar, usamos o ano civil
  const year = date.getFullYear()
  const remainder = year % 3

  if (remainder === 0) return 'A'
  if (remainder === 1) return 'B'
  return 'C'
}

/**
 * Calcula o 1º Domingo do Advento
 * (4 domingos antes do Natal)
 */
export function getFirstAdventSunday(year: number): Date {
  const christmas = new Date(year, 11, 25) // 25 de dezembro
  const dayOfWeek = christmas.getDay()

  // Quantos dias até o domingo anterior ao Natal
  const daysToSunday = dayOfWeek === 0 ? 7 : dayOfWeek
  const sundayBeforeChristmas = new Date(year, 11, 25 - daysToSunday)

  // 4º domingo do Advento é o último domingo antes do Natal
  // Então voltamos 3 semanas
  const firstAdvent = new Date(sundayBeforeChristmas)
  firstAdvent.setDate(sundayBeforeChristmas.getDate() - 21)

  return firstAdvent
}

/**
 * Calcula informações litúrgicas para uma data específica
 */
export function getLiturgicalInfo(date: Date): LiturgicalDate {
  const year = date.getFullYear()
  const easter = calculateEaster(year)
  const firstAdvent = getFirstAdventSunday(year)
  const firstAdventNextYear = getFirstAdventSunday(year + 1)

  // Datas importantes
  const ashWednesday = new Date(easter)
  ashWednesday.setDate(easter.getDate() - 46) // 46 dias antes da Páscoa

  const pentecost = new Date(easter)
  pentecost.setDate(easter.getDate() + 49) // 50 dias após a Páscoa

  const christmas = new Date(year, 11, 25)
  const epiphany = new Date(year, 0, 6)

  // Determinar a estação litúrgica
  let season: LiturgicalSeason
  let week: string
  let color: LiturgicalColor

  // Advento
  if (date >= firstAdvent && date < christmas) {
    season = 'Advento'
    const weeksFromStart = Math.floor((date.getTime() - firstAdvent.getTime()) / (7 * 24 * 60 * 60 * 1000))
    week = `${weeksFromStart + 1}º Domingo do Advento`
    color = 'Roxo'
  }
  // Natal (25 de dezembro até Epifania - 6 de janeiro)
  else if (date >= christmas && (date.getMonth() === 11 || (date.getMonth() === 0 && date < epiphany))) {
    season = 'Natal'
    week = date.getDate() === 25 ? 'Natal do Senhor' : 'Tempo de Natal'
    color = 'Branco'
  }
  // Epifania (6 de janeiro até Quarta-feira de Cinzas)
  else if (date >= epiphany && date < ashWednesday) {
    season = 'Epifania'
    const sundaysSinceEpiphany = Math.floor((date.getTime() - epiphany.getTime()) / (7 * 24 * 60 * 60 * 1000))
    week = date.getDate() === 6 ? 'Epifania do Senhor' : `${sundaysSinceEpiphany}º Domingo após Epifania`
    color = 'Verde'
  }
  // Quaresma (Quarta-feira de Cinzas até Sábado antes da Páscoa)
  else if (date >= ashWednesday && date < easter) {
    const daysUntilEaster = Math.floor((easter.getTime() - date.getTime()) / (24 * 60 * 60 * 1000))

    if (daysUntilEaster <= 7) {
      season = 'Semana Santa'
      week = 'Semana Santa'
      color = 'Vermelho'
    } else {
      season = 'Quaresma'
      const sundaysSinceAsh = Math.floor((date.getTime() - ashWednesday.getTime()) / (7 * 24 * 60 * 60 * 1000))
      week = `${sundaysSinceAsh + 1}º Domingo da Quaresma`
      color = 'Roxo'
    }
  }
  // Páscoa (Domingo de Páscoa até Pentecostes)
  else if (date >= easter && date < pentecost) {
    season = 'Páscoa'
    const daysSinceEaster = Math.floor((date.getTime() - easter.getTime()) / (24 * 60 * 60 * 1000))
    const weeksSinceEaster = Math.floor(daysSinceEaster / 7)
    week = weeksSinceEaster === 0 ? 'Domingo de Páscoa' : `${weeksSinceEaster}º Domingo da Páscoa`
    color = 'Branco'
  }
  // Pentecostes (dia específico)
  else if (date.getTime() === pentecost.getTime()) {
    season = 'Pentecostes'
    week = 'Domingo de Pentecostes'
    color = 'Vermelho'
  }
  // Tempo Comum (após Pentecostes até Advento)
  else if (date > pentecost && date < firstAdventNextYear) {
    season = 'Tempo Comum'
    const sundaysSincePentecost = Math.floor((date.getTime() - pentecost.getTime()) / (7 * 24 * 60 * 60 * 1000))
    week = `${sundaysSincePentecost}º Domingo após Pentecostes`
    color = 'Verde'
  }
  // Tempo Comum (antes da Quaresma - fallback)
  else {
    season = 'Tempo Comum'
    week = 'Tempo Comum'
    color = 'Verde'
  }

  return {
    season,
    week,
    color,
    year: getLiturgicalYear(date)
  }
}

/**
 * Verifica se uma data é domingo
 */
export function isSunday(date: Date): boolean {
  return date.getDay() === 0
}

/**
 * Retorna o próximo domingo a partir de uma data
 */
export function getNextSunday(date: Date): Date {
  const result = new Date(date)
  const daysUntilSunday = (7 - date.getDay()) % 7
  result.setDate(date.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday))
  return result
}

/**
 * Retorna todos os domingos de um mês
 */
export function getSundaysInMonth(year: number, month: number): Date[] {
  const sundays: Date[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // eslint-disable-next-line prefer-const
  let current = new Date(firstDay)

  // Avançar até o primeiro domingo
  while (current.getDay() !== 0 && current <= lastDay) {
    current.setDate(current.getDate() + 1)
  }

  // Coletar todos os domingos
  while (current <= lastDay) {
    sundays.push(new Date(current))
    current.setDate(current.getDate() + 7)
  }

  return sundays
}

/**
 * Formata data litúrgica para exibição
 */
export function formatLiturgicalDate(liturgicalInfo: LiturgicalDate): string {
  return liturgicalInfo.week
}

/**
 * Retorna a cor em formato hexadecimal
 */
export function getLiturgicalColorHex(color: LiturgicalColor): string {
  const colors: Record<LiturgicalColor, string> = {
    'Roxo': '#9333EA',
    'Branco': '#FFFFFF',
    'Verde': '#16A34A',
    'Vermelho': '#DC2626',
    'Preto': '#000000'
  }
  return colors[color]
}

/**
 * Retorna a cor Tailwind CSS
 */
export function getLiturgicalColorClass(color: LiturgicalColor): string {
  const colors: Record<LiturgicalColor, string> = {
    'Roxo': 'bg-purple-600',
    'Branco': 'bg-white border border-gray-300',
    'Verde': 'bg-green-600',
    'Vermelho': 'bg-red-600',
    'Preto': 'bg-black'
  }
  return colors[color]
}
