import type Anthropic from '@anthropic-ai/sdk'
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { successionView } from '../app'
import type { Graph } from '../graph'
import { shortestPath } from '../paths'
import type { Base } from '../schemas'
import { searchNodes } from '../search'
import { toTsv } from '../sql/child'
import { createSqlRunner, type SqlResult } from '../sql/runner'
import type { BaseIndex, Footnote } from '../views'
import { blocoFromSql, BlocoError, type Bloco, type PathStepView } from './blocos'
import type { Briefs } from './briefs'
import { CLAIM_PATTERN, consecrationClaim, edgeClaim } from './claims'
import { finalizeText } from './citacoes'
import { claimsIn, mensagensDoHistorico, resumoDe, type Turno } from './historico'

/**
 * O agente "Pergunte à Rede": uma pergunta em linguagem natural, cinco ferramentas só de leitura sobre a
 * base e uma resposta em texto (streaming) com blocos montados pelo servidor. Independente do Nitro:
 * o endpoint e o script de avaliação chamam `perguntar` do mesmo jeito.
 */

export interface AgentDeps {
  client: Anthropic
  base: Base
  index: BaseIndex
  graph: Graph
  briefs: Briefs
  /** System prompt de `buildSystemPrompt` (o mesmo texto em toda pergunta, para o cache). */
  prompt: string
  /** Arquivo SQLite de `writeSqliteFile`. */
  sqlFile: string
}

export type Effort = 'low' | 'medium' | 'high'

export interface AgentSettings {
  model: string
  effort: Effort
  /** Sonnet 5.5: 'between_tools' desliga o thinking (só com effort ≤ high). */
  thinking?: 'between_tools' | null
  maxIterations?: number
  maxTokens?: number
}

export interface PerguntaInput {
  pergunta: string
  historico?: Turno[]
  /** "p:id" ou "j:id": a ficha em que o leitor está. */
  contexto?: string | null
  /** AAAA-MM-DD, para perguntas sobre "hoje"/"atual". */
  hoje?: string
}

export type AgentEvent =
  | { type: 'status'; ferramenta: string; texto: string }
  | { type: 'bloco'; n: number; bloco: Bloco }
  | { type: 'texto'; rodada: number; delta: string }

export type Resultado = 'ok' | 'nao_sabe' | 'recusa' | 'parcial' | 'abortada' | 'erro'

export interface Usage {
  input: number
  cacheRead: number
  cacheWrite: number
  output: number
}

export interface Resposta {
  markdown: string
  notas: Footnote[]
  blocos: Bloco[]
  /** Vai de volta no `historico` da próxima pergunta da conversa. */
  resumo: string
  meta: {
    modelo: string
    effort: Effort
    thinking: string | null
    resultado: Resultado
    rodadas: number
    ferramentas: { nome: string; ms: number; erro?: string }[]
    citacoes: number
    citacoesRemovidas: number
    usage: Usage
    custoUsd: number
    duracaoMs: number
  }
}

/** US$ por milhão de tokens: entrada, saída, leitura e escrita (5 min) de cache. */
export const PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 }
}

export function costOf(model: string, u: Usage): number {
  const p = PRICES[model]
  if (!p) return 0
  return (u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite) / 1e6
}

const SQL_ROWS_FOR_MODEL = 100
const SQL_ROWS_WHEN_SHOWN = 20
const SQL_CHARS_FOR_MODEL = 16_000
/** Lembrete no resultado da ferramenta: o bloco já mostra os itens; o texto resume. */
const SHOWN_NOTE = 'O leitor já vê todos os itens no bloco: no texto, NÃO os liste um a um; resuma em poucas frases (quantos, extremos, o que chama atenção) e cite só os casos que nomear.'

const STATUS_DEFAULT: Record<string, string> = {
  buscar: 'Procurando nomes na base…',
  sql: 'Consultando a base…',
  ficha: 'Lendo uma ficha…',
  sucessao: 'Subindo a linha de sucessão…',
  caminho: 'Procurando a ligação entre os dois…'
}

const NO_ANSWER = 'Não consegui montar uma resposta para esta pergunta. Tente reformular ou perguntar algo mais específico.'

export async function perguntar(
  deps: AgentDeps,
  settings: AgentSettings,
  input: PerguntaInput,
  options: { onEvent?: (e: AgentEvent) => void; signal?: AbortSignal } = {}
): Promise<Resposta> {
  const t0 = Date.now()
  const { index, graph, briefs } = deps
  const emit = options.onEvent ?? (() => {})
  const nodeIds = new Set(graph.nodes.map((n) => n.id))
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]))
  const seen = new Set<string>()
  const blocos: Bloco[] = []
  const ferramentas: Resposta['meta']['ferramentas'] = []
  const sql = createSqlRunner(deps.sqlFile)
  const see = (ids: Iterable<string>) => {
    for (const id of ids) seen.add(id)
  }
  const show = (bloco: Bloco) => {
    blocos.push(bloco)
    emit({ type: 'bloco', n: blocos.length, bloco })
    return blocos.length
  }
  const timed = async <T>(nome: string, fn: () => Promise<T> | T): Promise<T> => {
    const t = Date.now()
    try {
      const r = await fn()
      ferramentas.push({ nome, ms: Date.now() - t })
      return r
    } catch (error) {
      ferramentas.push({ nome, ms: Date.now() - t, erro: String((error as Error).message ?? error).slice(0, 300) })
      throw error
    }
  }
  const resolvePerson = (raw: string) => {
    const id = raw.replace(/^p:/, '')
    return index.people.has(id) ? id : (index.formerPeople.get(id) ?? null)
  }
  const resolveNode = (raw: string) => {
    if (nodeIds.has(raw)) return raw
    const bare = raw.replace(/^[pj]:/, '')
    const p = index.people.has(bare) ? bare : index.formerPeople.get(bare)
    if (p && !raw.startsWith('j:')) return `p:${p}`
    const j = index.jurisdictions.has(bare) ? bare : index.formerJurisdictions.get(bare)
    if (j && !raw.startsWith('p:')) return `j:${j}`
    return null
  }
  const nodeLabel = (id: string) => {
    const n = nodes.get(id)
    return n ? `${id} (${n.label})` : id
  }

  const buscar = betaZodTool({
    name: 'buscar',
    description: 'Acha pessoas e jurisdições por nome, apelido ou sigla (sem acento, por prefixo). Devolve ids "p:…"/"j:…".',
    inputSchema: z.object({
      q: z.string().describe('Nome, apelido ou sigla'),
      limite: z.number().nullable().describe('Máximo de resultados, 1 a 10 (padrão 8)')
    }),
    strict: true,
    run: ({ q, limite }) =>
      timed('buscar', () => {
        const results = searchNodes(graph.nodes, q, Math.min(10, Math.max(1, Math.round(limite ?? 8))))
        if (!results.length) return `Nada encontrado para "${q}". Tente outra grafia, só o sobrenome ou a sigla.`
        return results
          .map(({ node: n }) => {
            const what = n.kind === 'person' ? (n.order ? `${n.order}${n.inferredOrder ? ' (inferido)' : ''}` : 'pessoa') : `${n.jurisdictionType}${n.diocesan ? ' (diocesana)' : ''}`
            const years = n.startYear || n.endYear ? ` · ${n.startYear ?? '?'}–${n.endYear ?? ''}` : ''
            const extra = n.search.filter((s) => s !== n.label).slice(0, 2).join('; ')
            return `${n.id} · ${n.label}${extra ? ` (${extra})` : ''} · ${what}${years}${n.country ? ` · ${n.country}` : ''}`
          })
          .join('\n')
      })
  })

  const MostrarSchema = z
    .object({
      forma: z.enum(['tabela', 'barras', 'linha', 'linha_do_tempo']),
      titulo: z.string().nullable().describe('Título curto do bloco'),
      x: z.string().nullable().describe('barras/linha: coluna dos rótulos; linha_do_tempo: coluna da data ou do ano'),
      y: z.string().nullable().describe('barras/linha: coluna numérica; linha_do_tempo: coluna do texto do item')
    })
    .nullable()
    .describe('Preencha para exibir o resultado ao leitor como bloco; null só para explorar')

  const sqlTool = betaZodTool({
    name: 'sql',
    description:
      'Consulta SQL (SQLite, só SELECT/WITH) na base achatada; esquema no system prompt. Sem `mostrar`, devolve até 100 linhas em TSV. Com `mostrar`, exibe o resultado ao leitor (até 500 linhas) e devolve as 20 primeiras.',
    inputSchema: z.object({
      consulta: z.string().describe('Um único SELECT ou WITH'),
      motivo: z.string().describe('O que a consulta busca, em poucas palavras, para o leitor acompanhar (ex.: "Contando sagrações por década")'),
      mostrar: MostrarSchema
    }),
    strict: true,
    run: ({ consulta, mostrar }) =>
      timed('sql', async () => {
        const result: SqlResult = await sql.run(consulta, { timeoutMs: 2000 })
        for (const row of result.rows) for (const v of row) if (typeof v === 'string') see(v.match(CLAIM_PATTERN) ?? [])
        const head = (n: number) => {
          let tsv = toTsv(result.columns, result.rows.slice(0, n))
          if (tsv.length > SQL_CHARS_FOR_MODEL) tsv = `${tsv.slice(0, SQL_CHARS_FOR_MODEL)}\n…(cortado)`
          return tsv
        }
        const count = result.total > 500 ? 'mais de 500 linhas' : `${result.total} linha(s)`
        if (mostrar) {
          if (!result.rows.length) return `A consulta não devolveu linhas; nada foi mostrado.\n${head(0)}`
          let bloco: Bloco
          try {
            bloco = blocoFromSql(mostrar, result, consulta)
          } catch (error) {
            if (error instanceof BlocoError) throw new Error(`Bloco não mostrado: ${error.message}`)
            throw error
          }
          const n = show(bloco)
          const shown = Math.min(result.rows.length, SQL_ROWS_WHEN_SHOWN)
          return `bloco ${n} mostrado ao leitor (${mostrar.forma}, ${count}${result.truncated ? `; o bloco exibe ${result.rows.length}` : ''}). ${SHOWN_NOTE} Primeiras ${shown} linhas:\n${head(SQL_ROWS_WHEN_SHOWN)}`
        }
        const shown = Math.min(result.rows.length, SQL_ROWS_FOR_MODEL)
        return `${count}${result.total > shown ? `; mostrando ${shown}` : ''}:\n${head(SQL_ROWS_FOR_MODEL)}`
      })
  })

  const ficha = betaZodTool({
    name: 'ficha',
    description: 'Ficha enxuta de uma pessoa ("p:id") ou jurisdição ("j:id"): ordenações, vínculos, eventos, relações, membros, com o claim_id de cada afirmação.',
    inputSchema: z.object({ id: z.string().describe('"p:<id>" ou "j:<id>"') }),
    strict: true,
    run: ({ id }) =>
      timed('ficha', () => {
        const node = resolveNode(id)
        if (!node) throw new Error(`"${id}" não existe. Use buscar para achar o id.`)
        const brief = node.startsWith('p:') ? briefs.person(node.slice(2)) : briefs.jurisdiction(node.slice(2))
        if (!brief) throw new Error(`"${id}" não existe.`)
        see(brief.claims)
        return brief.text
      })
  })

  const sucessao = betaZodTool({
    name: 'sucessao',
    description: 'Linha de sucessão apostólica de um bispo, sagrante principal por sagrante principal, até onde a base alcança (e a origem: Cantuária, Roma, Utrecht, Escócia).',
    inputSchema: z.object({
      id: z.string().describe('"p:<id>" do bispo'),
      mostrar: z.boolean().describe('true para exibir a linha ao leitor')
    }),
    strict: true,
    run: ({ id, mostrar }) =>
      timed('sucessao', () => {
        const pid = resolvePerson(id)
        const view = pid ? successionView(index, pid) : null
        if (!view) throw new Error(`"${id}" não é uma pessoa da base. Use buscar.`)
        // Cada linha é a sagração DESTA pessoa e quem a sagrou (o passo seguinte), para não trocar datas de passo.
        const line = (steps: typeof view.steps) =>
          steps
            .map((s, i) => {
              const c = consecrationClaim(index, s.person.id)
              if (c) seen.add(c)
              const next = steps[i + 1]
              const by = next ? `por p:${next.person.id} (${next.person.name})${next.via === 'co' ? ' como co-sagrante' : ''}` : '(quem a sagrou não está na base ou é o fim da linha)'
              return `${i + 1}. p:${s.person.id} (${s.person.name}) foi sagrado em ${s.date ?? 'data não registrada'} ${by}${s.status ? ` · ${s.status}` : ''}${c ? ` [${c}]` : ''}`
            })
            .join('\n')
        const end = { unknown_consecrator: 'sagrante desconhecido na base', no_episcopate: 'sem sagração episcopal registrada', cycle: 'ciclo nos dados' } as const
        const parts = [
          `SUCESSÃO de p:${view.person.id} (${view.person.name}), por sagrantes principais: ${view.steps.length} passos; ` +
            (view.origin ? `alcança ${view.origin.label} em p:${view.origin.person.id}` : `para: ${view.end ? end[view.end] : 'fim da base'}`),
          line(view.steps)
        ]
        if (view.alt.length) {
          parts.push(`LINHA ALTERNATIVA (por co-sagrantes, até a sagração mais antiga alcançável): ${view.altOrigin ? `alcança ${view.altOrigin.label}` : 'sem origem reconhecida'}`, line(view.alt))
        }
        if (mostrar) parts.push(`bloco ${show({ tipo: 'sucessao', titulo: `Sucessão de ${view.person.name}`, view })} mostrado ao leitor. ${SHOWN_NOTE}`)
        return parts.join('\n')
      })
  })

  const caminho = betaZodTool({
    name: 'caminho',
    description: 'Caminho mais curto entre duas pessoas ou jurisdições na rede. modo "sagracoes" segue só ordenações e sagrações; "tudo" aceita vínculos e relações entre igrejas.',
    inputSchema: z.object({
      de: z.string().describe('"p:<id>" ou "j:<id>"'),
      para: z.string().describe('"p:<id>" ou "j:<id>"'),
      modo: z.enum(['sagracoes', 'tudo']),
      mostrar: z.boolean().describe('true para exibir o caminho ao leitor')
    }),
    strict: true,
    run: ({ de, para, modo, mostrar }) =>
      timed('caminho', () => {
        const a = resolveNode(de)
        const b = resolveNode(para)
        if (!a || !b) throw new Error(`${!a ? de : para} não existe na base. Use buscar.`)
        const result = shortestPath(graph, a, b, modo === 'tudo' ? 'all' : 'ordinations')
        if (!result) return `Não há caminho entre ${nodeLabel(a)} e ${nodeLabel(b)} no modo "${modo}".${modo === 'sagracoes' ? ' Tente modo "tudo".' : ''}`
        const steps: PathStepView[] = result.steps.map((s, i) => {
          const n = nodes.get(s.id)!
          const claim = i > 0 ? edgeClaim(index, result.steps[i - 1].id, s) : null
          if (claim) seen.add(claim)
          return { ...s, label: n.label, kind: n.kind, year: n.startYear, claim }
        })
        const text = steps
          .map((s, i) => (i === 0 ? nodeLabel(s.id) : `  —${s.via!.kind}${s.via!.reversed ? ' (inverso)' : ''}${s.via!.year ? ` ${s.via!.year}` : ''}, ${s.via!.status}${s.claim ? ` [${s.claim}]` : ''}→ ${nodeLabel(s.id)}`))
          .join('\n')
        const tail = mostrar ? `\nbloco ${show({ tipo: 'caminho', titulo: null, de: a, para: b, modo, steps })} mostrado ao leitor. ${SHOWN_NOTE}` : ''
        return `CAMINHO (${steps.length - 1} ligações):\n${text}${tail}`
      })
  })

  // Mensagens: histórico compacto + a pergunta (com a ficha em que o leitor está, se houver).
  const historico = input.historico ?? []
  for (const t of historico) see(claimsIn(t.resumo))
  let contextoText = ''
  if (input.contexto) {
    const node = resolveNode(input.contexto)
    const brief = node ? (node.startsWith('p:') ? briefs.person(node.slice(2)) : briefs.jurisdiction(node.slice(2))) : null
    if (brief) {
      see(brief.claims)
      contextoText = `O leitor está na ficha abaixo; "ele", "ela", "esta igreja" se referem a ela.\n${brief.text}\n\n`
    }
  }
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...mensagensDoHistorico(historico),
    { role: 'user', content: `${contextoText}${input.hoje ? `(Hoje é ${input.hoje}.)\n` : ''}Pergunta: ${input.pergunta}` }
  ]

  const usage: Usage = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 }
  let rodadas = 0
  let resultado: Resultado = 'ok'
  let finalText = ''
  try {
    const runner = deps.client.beta.messages.toolRunner(
      {
        model: settings.model,
        max_tokens: settings.maxTokens ?? 8000,
        max_iterations: settings.maxIterations ?? 8,
        stream: true,
        thread: false,
        output_config: { effort: settings.effort },
        ...(settings.thinking === 'between_tools' ? { thinking: { type: 'between_tools' as const } } : {}),
        system: [{ type: 'text', text: deps.prompt, cache_control: { type: 'ephemeral' } }],
        tools: [buscar, sqlTool, ficha, sucessao, caminho],
        messages
      },
      { signal: options.signal }
    )
    let lastStop: string | null = null
    for await (const stream of runner) {
      rodadas++
      const rodada = rodadas
      stream.on('text', (delta) => emit({ type: 'texto', rodada, delta }))
      const msg = await stream.finalMessage()
      usage.input += msg.usage.input_tokens
      usage.cacheRead += msg.usage.cache_read_input_tokens ?? 0
      usage.cacheWrite += msg.usage.cache_creation_input_tokens ?? 0
      usage.output += msg.usage.output_tokens
      lastStop = msg.stop_reason
      const text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
      if (text.trim()) finalText = text
      for (const b of msg.content) {
        if (b.type === 'tool_use') {
          const motivo = (b.input as { motivo?: string })?.motivo
          emit({ type: 'status', ferramenta: b.name, texto: motivo ? `${motivo.trim().replace(/[.…\s]+$/, '')}…` : (STATUS_DEFAULT[b.name] ?? 'Consultando…') })
        }
      }
      if (msg.stop_reason === 'refusal') {
        resultado = 'recusa'
        break
      }
    }
    if (resultado === 'ok' && lastStop === 'tool_use') resultado = 'parcial'
    if (resultado === 'ok' && lastStop === 'max_tokens') resultado = 'parcial'
  } catch (error) {
    if (options.signal?.aborted) resultado = 'abortada'
    else {
      resultado = 'erro'
      ferramentas.push({ nome: 'modelo', ms: 0, erro: String((error as Error).message ?? error).slice(0, 300) })
    }
  } finally {
    sql.kill()
  }

  if (resultado === 'recusa') finalText = 'Não consigo responder a esta pergunta. Tente reformular.'
  if (!finalText.trim()) finalText = NO_ANSWER
  const fin = finalizeText(finalText, seen, index, (id) => nodeIds.has(id))
  if (resultado === 'ok' && /^\s*A base não registra/i.test(fin.markdown)) resultado = 'nao_sabe'
  return {
    markdown: fin.markdown,
    notas: fin.notas,
    blocos,
    resumo: resumoDe(fin.raw, blocos),
    meta: {
      modelo: settings.model,
      effort: settings.effort,
      thinking: settings.thinking ?? null,
      resultado,
      rodadas,
      ferramentas,
      citacoes: fin.citacoes,
      citacoesRemovidas: fin.removidas.length,
      usage,
      custoUsd: costOf(settings.model, usage),
      duracaoMs: Date.now() - t0
    }
  }
}
