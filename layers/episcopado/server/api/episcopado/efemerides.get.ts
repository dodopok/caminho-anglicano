import { ephemerides } from '../../../lib/ephemerides'

/**
 * Ordenações e sagrações cujo dia e mês caem numa janela do calendário.
 * `?dia=MM-DD` (padrão: hoje, UTC) e `?dias=7` (1 a 31).
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const days = Math.min(Math.max(Number(query.dias) || 7, 1), 31)
  let start = new Date()
  if (typeof query.dia === 'string' && /^\d{2}-\d{2}$/.test(query.dia)) {
    const [month, day] = query.dia.split('-').map(Number)
    start = new Date(Date.UTC(start.getUTCFullYear(), month - 1, day))
    if (Number.isNaN(start.getTime())) throw createError({ statusCode: 400, statusMessage: 'Dia inválido' })
  }
  const { index } = await useEpiscopado()
  return { start: `${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`, days, items: ephemerides(index, start, days) }
})
