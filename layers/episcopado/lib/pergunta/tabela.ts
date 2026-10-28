import { END_REASON_LABEL, EVENT_LABEL, JURISDICTION_TYPE_LABEL, ORDER_LABEL, RELATION_LABEL, ROLE_LABEL, formatDate } from '../labels'

/**
 * Rótulos das tabelas do Pergunte à Rede (as colunas vêm do SQL do modelo): cabeçalhos e valores do banco em
 * pt-BR, inclusive listas agregadas por `group_concat` ("bishop,auxiliary_bishop" → "Bispo auxiliar").
 */

/** Cabeçalhos comuns em pt-BR; os demais aparecem como o modelo os nomeou. */
export const COLUMN_LABEL: Record<string, string> = {
  name: 'Nome', nome: 'Nome', person: 'Pessoa', order: 'Ordem', date: 'Data', year: 'Ano', status: 'Status',
  jurisdiction: 'Jurisdição', diocese: 'Diocese', role: 'Papel', papel: 'Papel', papeis: 'Papéis', onde: 'Onde',
  start_date: 'Início', end_date: 'Fim', start_year: 'Início', end_year: 'Fim', desde: 'Desde', ate: 'Até',
  end_reason: 'Motivo do fim', principal_consecrator: 'Sagrante principal', ordained_by: 'Ordenante', type: 'Tipo',
  target: 'Alvo', source_jurisdiction: 'Jurisdição', acronym: 'Sigla', place: 'Local'
}

const VALUE_LABEL: Record<string, Record<string, string>> = {
  order: ORDER_LABEL,
  role: ROLE_LABEL,
  papel: ROLE_LABEL,
  papeis: ROLE_LABEL,
  roles: ROLE_LABEL,
  end_reason: END_REASON_LABEL,
  type: { ...RELATION_LABEL, ...EVENT_LABEL, ...JURISDICTION_TYPE_LABEL }
}

export function columnLabel(col: string): string {
  return COLUMN_LABEL[col] ?? col.replace(/_/g, ' ')
}

/** Valor de uma célula para exibir: datas formatadas, valores do banco traduzidos, listas traduzidas item a item. */
export function displayValue(col: string, v: unknown): unknown {
  if (typeof v !== 'string') return v
  if (/(^|_)date$|^data$/.test(col)) return formatDate(v) || v
  const labels = VALUE_LABEL[col]
  if (!labels) return v
  if (labels[v]) return labels[v]
  const parts = [...new Set(v.split(/\s*,\s*/).filter(Boolean))]
  if (parts.length < 2 || !parts.every((p) => labels[p])) return v
  // "Bispo" genérico ao lado de um papel episcopal específico não diz nada a mais.
  const specific = parts.filter((p) => p !== 'bishop')
  return specific.map((p, i) => (i ? labels[p]!.toLowerCase() : labels[p])).join(', ')
}
