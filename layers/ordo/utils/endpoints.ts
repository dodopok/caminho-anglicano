/**
 * The API records each key's calls as "controller#action" (`calendar#day`).
 * The panel names them the way a developer reads the docs, keeping the raw
 * code beside it for anyone who needs to grep.
 */
const CONTROLLERS: Record<string, string> = {
  calendar: 'Calendário',
  days: 'Dias',
  readings: 'Leituras',
  collects: 'Coletas',
  passages: 'Passagens bíblicas',
  celebrations: 'Celebrações',
  liturgical_explanations: 'Explicações litúrgicas',
  prayer_books: 'Livros de oração',
  bible_versions: 'Bíblias',
  years: 'Anos litúrgicos',
  daily_office: 'Ofício diário',
  lectionary: 'Lecionário',
  preferences: 'Preferências'
}

const ACTIONS: Record<string, string> = {
  index: 'lista',
  show: 'um item',
  today: 'hoje',
  day: 'um dia',
  month: 'um mês',
  year: 'um ano',
  overview: 'visão do ano',
  year_seasons: 'tempos do ano',
  year_key_dates: 'datas principais',
  year_celebrations: 'celebrações do ano'
}

export const endpointLabel = (endpoint: string) => {
  const [controller = '', action = ''] = endpoint.split('#')
  const subject = CONTROLLERS[controller]
  if (!subject) return endpoint
  const verb = ACTIONS[action] || action.replaceAll('_', ' ')
  return verb ? `${subject} · ${verb}` : subject
}
