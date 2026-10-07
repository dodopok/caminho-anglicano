import type { EdgeKind } from './graph'
import type { TAffiliation, TEvent, TJurisdiction, TOrdination, TRelation, TSource } from './schemas'

/** Rótulos em pt-BR dos valores de enum da base. */

export const ORDER_LABEL: Record<TOrdination['order'], string> = {
  diaconate: 'Diaconato',
  presbyterate: 'Presbiterato',
  episcopate: 'Episcopado'
}

export const OFFICE_LABEL: Record<NonNullable<TOrdination['office']>, string> = {
  diocesan: 'bispo diocesano',
  coadjutor: 'bispo coadjutor',
  suffragan: 'bispo sufragâneo',
  auxiliary: 'bispo auxiliar',
  missionary: 'bispo missionário',
  primate: 'primaz',
  other: 'outro'
}

export const ROLE_LABEL: Record<TAffiliation['role'], string> = {
  member: 'Membro',
  clergy: 'Clero',
  deacon: 'Diácono',
  priest: 'Presbítero',
  bishop: 'Bispo',
  diocesan_bishop: 'Bispo diocesano',
  coadjutor_bishop: 'Bispo coadjutor',
  suffragan_bishop: 'Bispo sufragâneo',
  auxiliary_bishop: 'Bispo auxiliar',
  missionary_bishop: 'Bispo missionário',
  primate: 'Primaz',
  archbishop: 'Arcebispo',
  founder: 'Fundador',
  other: 'Outro'
}

export const END_REASON_LABEL: Record<NonNullable<TAffiliation['end_reason']>, string> = {
  left: 'saída',
  schism: 'cisma',
  transfer: 'transferência',
  resignation: 'renúncia',
  deposition: 'deposição',
  retirement: 'aposentadoria',
  death: 'falecimento',
  term_end: 'fim do mandato',
  other: 'outro'
}

export const EVENT_LABEL: Record<TEvent['type'], string> = {
  deposition: 'Deposição',
  resignation: 'Renúncia',
  excommunication: 'Excomunhão',
  reconciliation: 'Reconciliação',
  conversion: 'Conversão',
  death: 'Falecimento',
  other: 'Evento'
}

/** Relação lida a partir da jurisdição de origem ("IAB é cisma de IEAB"). */
export const RELATION_LABEL: Record<TRelation['type'], string> = {
  schism_from: 'Cisma de',
  successor_of: 'Sucessora de',
  merged_with: 'Fundiu-se com',
  member_of: 'Membro de',
  part_of: 'Parte de',
  in_communion_with: 'Em comunhão com',
  broke_communion_with: 'Rompeu comunhão com',
  recognized_by: 'Reconhecida por'
}

/** Mesma relação lida a partir do alvo ("IEAB: deu origem por cisma a IAB"). */
export const RELATION_INVERSE_LABEL: Record<TRelation['type'], string> = {
  schism_from: 'Deu origem por cisma a',
  successor_of: 'Sucedida por',
  merged_with: 'Fundiu-se com',
  member_of: 'Membros',
  part_of: 'Inclui',
  in_communion_with: 'Em comunhão com',
  broke_communion_with: 'Teve comunhão rompida por',
  recognized_by: 'Reconhece'
}

export const JURISDICTION_TYPE_LABEL: Record<TJurisdiction['type'], string> = {
  communion: 'Comunhão',
  province: 'Província',
  national_church: 'Igreja nacional',
  diocese: 'Diocese',
  missionary_district: 'Distrito missionário',
  network: 'Rede',
  religious_order: 'Ordem religiosa',
  other: 'Outro'
}

export const TRADITION_LABEL: Record<NonNullable<TJurisdiction['tradition']>, string> = {
  anglican: 'Anglicana',
  reformed_episcopal: 'Episcopal reformada',
  continuing_anglican: 'Anglicana continuante',
  charismatic_episcopal: 'Episcopal carismática',
  roman_catholic: 'Católica romana',
  independent_catholic: 'Católica independente',
  orthodox: 'Ortodoxa',
  other: 'Outra'
}

export const SOURCE_TYPE_LABEL: Record<TSource['type'], string> = {
  official_document: 'Documento oficial',
  minutes: 'Ata',
  news: 'Notícia',
  book: 'Livro',
  article: 'Artigo',
  thesis: 'Tese',
  institutional_site: 'Site institucional',
  social_media: 'Rede social',
  wikidata: 'Wikidata',
  wikipedia: 'Wikipédia',
  blog: 'Blog',
  personal_testimony: 'Testemunho pessoal',
  other: 'Outro'
}

export const STATUS_LABEL = {
  confirmed: 'Confirmado',
  probable: 'Provável',
  contested: 'Contestado'
} as const

/** O que cada selo de status significa (tooltip e legenda). */
export const STATUS_DESCRIPTION: Record<keyof typeof STATUS_LABEL, string> = {
  confirmed: 'Sustentado por fonte primária ou por fontes independentes que concordam entre si.',
  probable: 'Sustentado por uma única fonte secundária, por testemunho ou por dedução; ainda falta confirmação documental.',
  contested: 'As fontes divergem. Todas as versões estão registradas, cada uma com suas próprias fontes.'
}

export const SOURCE_LEVEL_LABEL: Record<TSource['level'], string> = {
  primary: 'Fonte primária',
  secondary: 'Fonte secundária',
  tertiary: 'Fonte terciária'
}

export const SOURCE_LEVEL_DESCRIPTION: Record<TSource['level'], string> = {
  primary: 'Documento produzido por quem participou do fato: ata, comunicado oficial, carta pastoral, registro da própria igreja.',
  secondary: 'Relato de terceiros sobre o fato: notícia, livro, artigo, tese ou testemunho.',
  tertiary: 'Compilação de outras fontes, como Wikipédia ou Wikidata.'
}

/** Campos que podem aparecer em `discrepancies`. */
export const FIELD_LABEL: Record<string, string> = {
  date: 'data',
  start: 'início',
  end: 'fim',
  place: 'local',
  jurisdiction: 'jurisdição',
  diocese: 'diocese',
  principal_consecrator: 'sagrante principal',
  co_consecrators: 'co-sagrantes',
  ordained_by: 'ordenante',
  office: 'cargo',
  mode: 'modo',
  role: 'função',
  end_reason: 'motivo do fim',
  led_by: 'liderada por',
  target: 'jurisdição',
  type: 'tipo',
  description: 'descrição'
}

/** Nome em pt-BR do país a partir do código ISO 3166-1 (os que aparecem na base). */
export const COUNTRY_LABEL: Record<string, string> = {
  BR: 'Brasil',
  US: 'Estados Unidos',
  GB: 'Reino Unido',
  CA: 'Canadá',
  AR: 'Argentina',
  PT: 'Portugal',
  NG: 'Nigéria',
  KE: 'Quênia',
  FK: 'Ilhas Malvinas',
  UG: 'Uganda',
  RW: 'Ruanda',
  AU: 'Austrália',
  ZA: 'África do Sul',
  CL: 'Chile',
  UY: 'Uruguai',
  PY: 'Paraguai',
  BO: 'Bolívia',
  PE: 'Peru',
  MX: 'México',
  ES: 'Espanha',
  IE: 'Irlanda'
}

export function countryName(code: string | null | undefined): string {
  return code ? COUNTRY_LABEL[code] ?? code : ''
}

export const EDGE_LABEL: Record<EdgeKind, string> = {
  consecration: 'Sagração (principal)',
  co_consecration: 'Co-sagração',
  presbyteral_ordination: 'Ordenação presbiteral',
  diaconal_ordination: 'Ordenação diaconal',
  affiliation: 'Vínculo',
  ...RELATION_LABEL
}

const MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.']

/** "2012-12-08" → "8 dez. 2012"; "2012-12" → "dez. 2012"; "c.1890" → "c. 1890"; "1890/1895" → "1890–1895". */
export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  if (value.includes('/')) return value.replace('/', '–')
  if (value.startsWith('c.')) return `c. ${value.slice(2)}`
  const [year, month, day] = value.split('-')
  if (day) return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`
  if (month) return `${MONTHS[Number(month) - 1]} ${year}`
  return year
}

/** "2009" + "2018" → "2009–2018"; só início → "desde 2009"; só fim → "até 2018". */
export function formatPeriod(start?: string | null, end?: string | null): string {
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`
  if (start) return `desde ${formatDate(start)}`
  if (end) return `até ${formatDate(end)}`
  return ''
}
