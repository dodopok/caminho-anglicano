import { z } from 'zod'
import { isValidDate } from './dates'

/**
 * Schemas da Rede do Episcopado Histórico.
 *
 * Entidades (pessoa, jurisdição, fonte) vivem em arquivos YAML, um por
 * entidade. Afirmações (ordenações, vínculos, relações, eventos) ficam dentro
 * do arquivo da entidade que as "recebe" e sempre carregam fontes e status.
 */

export const Id = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id deve ser um slug: minúsculas, números e hífens')

export const PartialDate = z
  .string()
  .refine(isValidDate, 'data inválida: use AAAA-MM-DD, AAAA-MM, AAAA, c.AAAA ou AAAA/AAAA')

export const Status = z.enum(['confirmed', 'probable', 'contested'])

export const SourceRef = z.strictObject({
  source: Id,
  /** Citação literal, no idioma original, que sustenta a afirmação. */
  quote: z.string().min(1).optional(),
  page: z.string().optional()
})

export const Discrepancy = z.strictObject({
  field: z.string(),
  value: z.union([z.string(), z.array(z.string()), z.null()]),
  sources: z.array(SourceRef).min(1),
  notes: z.string().optional()
})

const claimFields = {
  status: Status,
  sources: z.array(SourceRef).min(1, 'toda afirmação precisa de ao menos uma fonte'),
  discrepancies: z.array(Discrepancy).optional(),
  notes: z.string().optional()
}

export const Order = z.enum(['diaconate', 'presbyterate', 'episcopate'])

export const Ordination = z
  .strictObject({
    order: Order,
    date: PartialDate.nullable(),
    place: z.string().nullable().optional(),
    jurisdiction: Id.nullable(),
    /** Bispo ordenante (diaconato e presbiterato). */
    ordained_by: Id.nullable().optional(),
    /** Sagrante principal (episcopado). */
    principal_consecrator: Id.nullable().optional(),
    co_consecrators: z.array(Id).optional(),
    office: z
      .enum(['diocesan', 'coadjutor', 'suffragan', 'auxiliary', 'missionary', 'primate', 'other'])
      .nullable()
      .optional(),
    mode: z.enum(['normal', 'conditional', 'reordination']).optional(),
    ...claimFields
  })
  .superRefine((o, ctx) => {
    if (o.order === 'episcopate' && o.ordained_by !== undefined) {
      ctx.addIssue({ code: 'custom', message: 'episcopado usa principal_consecrator/co_consecrators, não ordained_by' })
    }
    if (o.order !== 'episcopate' && (o.principal_consecrator !== undefined || o.co_consecrators !== undefined)) {
      ctx.addIssue({ code: 'custom', message: `${o.order} usa ordained_by, não principal_consecrator/co_consecrators` })
    }
  })

export const Role = z.enum([
  'member',
  'clergy',
  'deacon',
  'priest',
  'bishop',
  'diocesan_bishop',
  'coadjutor_bishop',
  'suffragan_bishop',
  'auxiliary_bishop',
  'missionary_bishop',
  'primate',
  'archbishop',
  'founder',
  'other'
])

export const EndReason = z.enum([
  'left',
  'schism',
  'transfer',
  'resignation',
  'deposition',
  'retirement',
  'death',
  'term_end',
  'other'
])

export const Affiliation = z.strictObject({
  jurisdiction: Id,
  role: Role,
  role_description: z.string().optional(),
  /** Diocese/distrito dentro da jurisdição, quando ela também é uma entidade. */
  diocese: Id.nullable().optional(),
  start: PartialDate.nullable().optional(),
  end: PartialDate.nullable().optional(),
  end_reason: EndReason.nullable().optional(),
  ...claimFields
})

export const Event = z.strictObject({
  type: z.enum(['deposition', 'resignation', 'excommunication', 'reconciliation', 'conversion', 'death', 'other']),
  date: PartialDate.nullable(),
  jurisdiction: Id.nullable().optional(),
  description: z.string(),
  ...claimFields
})

export const DatedFact = z.strictObject({
  date: PartialDate.nullable(),
  place: z.string().nullable().optional(),
  sources: z.array(SourceRef).min(1)
})

export const Photo = z.strictObject({
  url: z.url(),
  license: z.string(),
  author: z.string().optional(),
  source: Id.optional()
})

export const Person = z.strictObject({
  id: Id,
  name: z.string().min(1),
  full_name: z.string().nullable().optional(),
  aliases: z.array(z.string()).optional(),
  /** Ids anteriores, para redirecionar links antigos após renomear. */
  former_ids: z.array(Id).optional(),
  birth: DatedFact.nullable().optional(),
  death: DatedFact.nullable().optional(),
  photo: Photo.nullable().optional(),
  wikidata: z.string().regex(/^Q\d+$/).nullable().optional(),
  links: z.array(z.url()).optional(),
  biography: z.string().optional(),
  /** Fontes que sustentam a biografia. */
  sources: z.array(SourceRef).optional(),
  ordinations: z.array(Ordination).optional(),
  affiliations: z.array(Affiliation).optional(),
  events: z.array(Event).optional()
})

export const RelationType = z.enum([
  'schism_from',
  'successor_of',
  'merged_with',
  'member_of',
  'part_of',
  'in_communion_with',
  'broke_communion_with',
  'recognized_by'
])

export const Relation = z.strictObject({
  type: RelationType,
  target: Id,
  date: PartialDate.nullable().optional(),
  end: PartialDate.nullable().optional(),
  led_by: z.array(Id).optional(),
  ...claimFields
})

export const Jurisdiction = z.strictObject({
  id: Id,
  acronym: z.string().nullable().optional(),
  name: z.string().min(1),
  aliases: z.array(z.string()).optional(),
  former_ids: z.array(Id).optional(),
  type: z.enum([
    'communion',
    'province',
    'national_church',
    'diocese',
    'missionary_district',
    'network',
    'religious_order',
    'other'
  ]),
  tradition: z
    .enum([
      'anglican',
      'reformed_episcopal',
      'continuing_anglican',
      'charismatic_episcopal',
      'roman_catholic',
      'independent_catholic',
      'orthodox',
      'other'
    ])
    .optional(),
  country: z.string().length(2).nullable().optional(),
  founded: DatedFact.nullable().optional(),
  dissolved: DatedFact.nullable().optional(),
  /** Slug da tabela `jurisdictions` do Localizador, para ligar às igrejas. */
  locator_slug: z.string().nullable().optional(),
  wikidata: z.string().regex(/^Q\d+$/).nullable().optional(),
  website: z.url().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  description: z.string().optional(),
  sources: z.array(SourceRef).optional(),
  relations: z.array(Relation).optional()
})

export const Source = z
  .strictObject({
    id: Id,
    type: z.enum([
      'official_document',
      'minutes',
      'news',
      'book',
      'article',
      'thesis',
      'institutional_site',
      'social_media',
      'wikidata',
      'wikipedia',
      'blog',
      'personal_testimony',
      'other'
    ]),
    title: z.string().min(1),
    author: z.string().nullable().optional(),
    publisher: z.string().nullable().optional(),
    url: z.url().nullable().optional(),
    /** Snapshot arquivado (Wayback Machine). */
    archive_url: z.url().nullable().optional(),
    published: PartialDate.nullable().optional(),
    accessed: PartialDate.nullable().optional(),
    language: z.string().optional(),
    level: z.enum(['primary', 'secondary', 'tertiary']),
    notes: z.string().optional()
  })
  .superRefine((s, ctx) => {
    const offline = ['personal_testimony', 'book', 'minutes', 'official_document']
    if (!offline.includes(s.type) && !s.url) {
      ctx.addIssue({ code: 'custom', message: `fonte do tipo ${s.type} precisa de url` })
    }
    if (s.type === 'personal_testimony' && !s.author) {
      ctx.addIssue({ code: 'custom', message: 'personal_testimony precisa de author (quem afirmou)' })
    }
  })

export type TPerson = z.infer<typeof Person>
export type TJurisdiction = z.infer<typeof Jurisdiction>
export type TSource = z.infer<typeof Source>
export type TOrdination = z.infer<typeof Ordination>
export type TAffiliation = z.infer<typeof Affiliation>
export type TRelation = z.infer<typeof Relation>
export type TEvent = z.infer<typeof Event>
export type TSourceRef = z.infer<typeof SourceRef>

export interface Base {
  people: TPerson[]
  jurisdictions: TJurisdiction[]
  sources: TSource[]
}
