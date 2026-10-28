import { z } from 'zod'

/**
 * Contrato público do `POST /api/episcopado/pergunta` (SSE), para o site e o app: o que vem em cada
 * evento. Publicado como `schemas/pergunta-resposta.json` por `pnpm episcopado:schemas`; os testes
 * conferem que os blocos montados pelo servidor seguem estes schemas.
 */

const Status = z.enum(['confirmed', 'probable', 'contested'])
const PersonRef = z.object({ id: z.string(), name: z.string() })

const Step = z.object({ person: PersonRef, date: z.string().nullable(), status: Status.optional(), via: z.enum(['principal', 'co']).optional() })
const Origin = z.object({ label: z.string(), person: PersonRef }).nullable()

export const SuccessionViewSchema = z.object({
  person: PersonRef,
  steps: z.array(Step),
  end: z.enum(['unknown_consecrator', 'no_episcopate', 'cycle']).nullable(),
  origin: Origin,
  alt: z.array(Step),
  altOrigin: Origin
})

export const BlocoSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('tabela'),
    titulo: z.string().nullable(),
    colunas: z.array(z.string()),
    linhas: z.array(z.array(z.union([z.string(), z.number(), z.null()]))),
    total: z.number().describe('Linhas da consulta até o limite de 501 ("mais de 500")'),
    truncado: z.boolean(),
    consulta: z.string().describe('SQL que gerou o bloco')
  }),
  z.object({
    tipo: z.literal('grafico'),
    forma: z.enum(['barras', 'linha']),
    titulo: z.string().nullable(),
    x: z.string(),
    y: z.string(),
    labels: z.array(z.string()),
    data: z.array(z.number()),
    consulta: z.string()
  }),
  z.object({
    tipo: z.literal('linha_do_tempo'),
    titulo: z.string().nullable(),
    itens: z.array(z.object({ data: z.string(), texto: z.string(), claim: z.string().nullable() })),
    consulta: z.string()
  }),
  z.object({ tipo: z.literal('sucessao'), titulo: z.string().nullable(), view: SuccessionViewSchema }),
  z.object({
    tipo: z.literal('caminho'),
    titulo: z.string().nullable(),
    de: z.string(),
    para: z.string(),
    modo: z.enum(['sagracoes', 'tudo']),
    steps: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        kind: z.enum(['person', 'jurisdiction']),
        year: z.number().optional(),
        claim: z.string().nullable().optional(),
        via: z.object({ kind: z.string(), status: Status, year: z.number().optional(), reversed: z.boolean() }).optional()
      })
    )
  })
])

export const FootnoteSchema = z.object({
  n: z.number(),
  source: z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    author: z.string().nullable().optional(),
    publisher: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    archive_url: z.string().nullable().optional(),
    published: z.string().nullable().optional(),
    level: z.enum(['primary', 'secondary', 'tertiary'])
  }),
  quote: z.string().optional(),
  page: z.string().optional()
})

/** Evento `resposta` (uma vez, no fim). Em acerto de cache vem só com `cache: true`, sem `meta`. */
export const RespostaEventSchema = z.object({
  markdown: z.string().describe('Texto final; "[1, 2]" são chamadas para `notas`; "[[bloco N]]" posiciona um bloco'),
  notas: z.array(FootnoteSchema),
  blocos: z.array(BlocoSchema),
  resumo: z.string().describe('Devolva em `historico` na próxima pergunta da conversa'),
  cache: z.boolean().optional(),
  meta: z
    .object({
      resultado: z.enum(['ok', 'nao_sabe', 'recusa', 'parcial', 'abortada', 'erro']),
      rodadas: z.number(),
      duracaoMs: z.number(),
      citacoesRemovidas: z.number()
    })
    .optional()
})

export const StatusEventSchema = z.object({ type: z.literal('status'), ferramenta: z.string(), texto: z.string() })
export const BlocoEventSchema = z.object({ type: z.literal('bloco'), n: z.number(), bloco: BlocoSchema })
export const TextoEventSchema = z.object({ type: z.literal('texto'), rodada: z.number(), delta: z.string() })
