/**
 * Metadados das unidades federativas brasileiras usados nas páginas
 * de navegação por localidade (/igrejas/localidade/...).
 */

export type Region = 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul'

export interface BrazilState {
  code: string
  name: string
  region: Region
}

export const BRAZIL_STATES: BrazilState[] = [
  { code: 'AC', name: 'Acre', region: 'Norte' },
  { code: 'AL', name: 'Alagoas', region: 'Nordeste' },
  { code: 'AP', name: 'Amapá', region: 'Norte' },
  { code: 'AM', name: 'Amazonas', region: 'Norte' },
  { code: 'BA', name: 'Bahia', region: 'Nordeste' },
  { code: 'CE', name: 'Ceará', region: 'Nordeste' },
  { code: 'DF', name: 'Distrito Federal', region: 'Centro-Oeste' },
  { code: 'ES', name: 'Espírito Santo', region: 'Sudeste' },
  { code: 'GO', name: 'Goiás', region: 'Centro-Oeste' },
  { code: 'MA', name: 'Maranhão', region: 'Nordeste' },
  { code: 'MT', name: 'Mato Grosso', region: 'Centro-Oeste' },
  { code: 'MS', name: 'Mato Grosso do Sul', region: 'Centro-Oeste' },
  { code: 'MG', name: 'Minas Gerais', region: 'Sudeste' },
  { code: 'PA', name: 'Pará', region: 'Norte' },
  { code: 'PB', name: 'Paraíba', region: 'Nordeste' },
  { code: 'PR', name: 'Paraná', region: 'Sul' },
  { code: 'PE', name: 'Pernambuco', region: 'Nordeste' },
  { code: 'PI', name: 'Piauí', region: 'Nordeste' },
  { code: 'RJ', name: 'Rio de Janeiro', region: 'Sudeste' },
  { code: 'RN', name: 'Rio Grande do Norte', region: 'Nordeste' },
  { code: 'RS', name: 'Rio Grande do Sul', region: 'Sul' },
  { code: 'RO', name: 'Rondônia', region: 'Norte' },
  { code: 'RR', name: 'Roraima', region: 'Norte' },
  { code: 'SC', name: 'Santa Catarina', region: 'Sul' },
  { code: 'SP', name: 'São Paulo', region: 'Sudeste' },
  { code: 'SE', name: 'Sergipe', region: 'Nordeste' },
  { code: 'TO', name: 'Tocantins', region: 'Norte' }
]

export const REGIONS: Region[] = ['Sudeste', 'Sul', 'Nordeste', 'Centro-Oeste', 'Norte']

const STATE_BY_CODE = new Map(BRAZIL_STATES.map(state => [state.code, state]))

/** Normaliza um parâmetro de rota ("sp", " Sp ") para a sigla oficial ("SP"). */
export function normalizeStateCode(value: string | undefined | null): string {
  return (value || '').trim().toUpperCase()
}

/** Retorna true quando a sigla corresponde a uma UF brasileira. */
export function isValidStateCode(value: string | undefined | null): boolean {
  return STATE_BY_CODE.has(normalizeStateCode(value))
}

/** Nome por extenso da UF, com fallback para a própria sigla. */
export function getStateName(value: string | undefined | null): string {
  const code = normalizeStateCode(value)
  return STATE_BY_CODE.get(code)?.name || code
}

/** Região da UF, ou undefined quando a sigla não é reconhecida. */
export function getStateRegion(value: string | undefined | null): Region | undefined {
  return STATE_BY_CODE.get(normalizeStateCode(value))?.region
}
