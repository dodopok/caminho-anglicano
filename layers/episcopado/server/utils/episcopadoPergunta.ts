import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AgentDeps, AgentSettings, Effort, Resposta } from '../../lib/pergunta/agent'
import { createAgentDeps } from '../../lib/pergunta/deps'
import { createLimitesMemoria } from '../../lib/pergunta/limites'

/**
 * Peças do servidor para o "Pergunte à Rede": dependências do agente (uma vez por instância e versão
 * da base), configuração do modelo e o registro no Supabase (limites, cache exato, log, lacunas).
 * Sem Supabase (não configurado ou fora do ar), a pergunta segue com limites em memória, sem cache nem log.
 */

interface AgentState {
  version: string
  deps: AgentDeps
  /** A primeira pergunta desta instância pagou a montagem do banco. */
  fresh: boolean
}

let agentState: Promise<AgentState> | null = null

export class PerguntaUnavailable extends Error {}

export function useEpiscopadoAgent(): Promise<AgentState> {
  const config = useRuntimeConfig()
  // `runtimeConfig` lê o ambiente no build; em runtime vale NUXT_ANTHROPIC_API_KEY ou, aqui, ANTHROPIC_API_KEY.
  const apiKey = (config.anthropicApiKey as string | undefined) || process.env.ANTHROPIC_API_KEY
  if (!apiKey) return Promise.reject(new PerguntaUnavailable('Pergunte à Rede desativado neste ambiente: configure ANTHROPIC_API_KEY.'))
  if (!agentState || import.meta.dev) {
    agentState = useEpiscopado().then(({ base, index, graph, manifest }) => {
      const deps = createAgentDeps({ client: new Anthropic({ apiKey }), base, index, graph, version: manifest.version, dir: tmpdir() })
      return { version: manifest.version, deps, fresh: true }
    })
    agentState.catch(() => (agentState = null))
  }
  return agentState
}

export function perguntaSettings(): AgentSettings {
  const config = useRuntimeConfig()
  const env = process.env
  const model = (config.episcopadoPerguntaModel as string) || env.EPISCOPADO_PERGUNTA_MODEL || 'claude-sonnet-5-5'
  const effort = ((config.episcopadoPerguntaEffort as string) || env.EPISCOPADO_PERGUNTA_EFFORT || 'medium') as Effort
  const thinking = (config.episcopadoPerguntaThinking || env.EPISCOPADO_PERGUNTA_THINKING) === 'between_tools' ? 'between_tools' : null
  return { model, effort, thinking }
}

// ---------------------------------------------------------------------------
// Limites e log no Supabase (com limites em memória quando ele não responde)
// ---------------------------------------------------------------------------

export const PERGUNTA_LIMITS = { porIpHora: 20, porDia: 400, simultaneasPorInstancia: 8 }

/** Uma chamada ao Supabase não segura a pergunta mais que isso. */
const SUPABASE_TIMEOUT_MS = 2500
/** Depois de uma falha, o Supabase fica de fora por um tempo (sem pagar o timeout em cada pergunta). */
const SUPABASE_PAUSA_MS = 5 * 60_000

const limitesMemoria = createLimitesMemoria(PERGUNTA_LIMITS)
let supabaseClient: SupabaseClient | null | undefined
let supabaseForaAte = 0

function supabase(): SupabaseClient | null {
  if (supabaseClient === undefined) {
    const config = useRuntimeConfig()
    const url = config.public.supabaseUrl as string | undefined
    const key = config.supabaseServiceKey as string | undefined
    supabaseClient = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null
    if (!supabaseClient) console.warn('[episcopado] Pergunte à Rede sem Supabase: limites em memória por instância, sem cache nem log.')
  }
  return Date.now() < supabaseForaAte ? null : supabaseClient
}

function supabaseFalhou(onde: string, message: string): void {
  supabaseForaAte = Date.now() + SUPABASE_PAUSA_MS
  console.error(`[episcopado] Supabase falhou (${onde}): ${message.replace(/\.$/, '')}. Limites em memória, sem cache nem log, pelos próximos ${SUPABASE_PAUSA_MS / 60_000} min.`)
}

const timeout = () => AbortSignal.timeout(SUPABASE_TIMEOUT_MS)

/** Chave do cache exato: sem acento, caixa, pontuação nem espaços repetidos. */
export function normalizePergunta(q: string): string {
  return q.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 500)
}

export function hashIp(ip: string | undefined): string | null {
  if (!ip) return null
  const salt = (useRuntimeConfig().episcopadoIpSalt as string) || 'episcopado'
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32)
}

export interface CachedResposta {
  markdown: string
  notas: Resposta['notas']
  blocos: Resposta['blocos']
  resumo: string
}

export async function cachedResposta(version: string, perguntaNorm: string, contexto: string | null): Promise<CachedResposta | null> {
  const db = supabase()
  if (!db) return null
  let q = db
    .from('episcopado_perguntas')
    .select('markdown, notas, blocos, resumo')
    .eq('version', version)
    .eq('pergunta_norm', perguntaNorm)
    .eq('historico_n', 0)
    .eq('resultado', 'ok')
  q = contexto ? q.eq('contexto', contexto) : q.is('contexto', null)
  const { data, error } = await q.order('created_at', { ascending: false }).limit(1).abortSignal(timeout()).maybeSingle()
  if (error) {
    supabaseFalhou('cache', error.message)
    return null
  }
  return (data as CachedResposta | null) ?? null
}

/** `ok: false` traz o motivo (limite do IP na última hora ou teto do dia). */
export interface Reserva {
  ok: boolean
  id: number | null
  motivo?: 'ip' | 'dia'
}

/**
 * Reserva a pergunta (limites) e cria a linha do log. Sem Supabase, ou com ele fora do ar, usa os limites
 * em memória da instância e não há log (`id: null`).
 */
export async function reservarPergunta(row: {
  version: string
  ipHash: string | null
  app: string | null
  contexto: string | null
  pergunta: string
  perguntaNorm: string
  historicoN: number
  modelo: string
}): Promise<Reserva> {
  const db = supabase()
  if (db) {
    const reserva = await reservarNoSupabase(db, row)
    if (reserva) return reserva
  }
  const r = limitesMemoria.reservar(row.ipHash)
  return 'motivo' in r ? { ok: false, id: null, motivo: r.motivo } : { ok: true, id: null }
}

async function reservarNoSupabase(db: SupabaseClient, row: Parameters<typeof reservarPergunta>[0]): Promise<Reserva | null> {
  const { data, error } = await db.rpc('episcopado_reservar_pergunta', {
    p_version: row.version,
    p_ip_hash: row.ipHash ?? 'sem-ip',
    p_app: row.app,
    p_contexto: row.contexto,
    p_pergunta: row.pergunta,
    p_pergunta_norm: row.perguntaNorm,
    p_historico_n: row.historicoN,
    p_modelo: row.modelo,
    p_limite_ip_hora: PERGUNTA_LIMITS.porIpHora,
    p_limite_dia: PERGUNTA_LIMITS.porDia
  }).abortSignal(timeout())
  if (error) {
    supabaseFalhou('limites', error.message)
    return null
  }
  const r = data as { id: number | null; motivo?: 'ip' | 'dia' }
  return r.id ? { ok: true, id: r.id } : { ok: false, id: null, motivo: r.motivo ?? 'dia' }
}

export async function registrarResposta(id: number | null, resposta: Resposta, fria: boolean): Promise<void> {
  const db = supabase()
  if (!db || !id) return
  const blocos = JSON.stringify(resposta.blocos).length <= 64_000 ? resposta.blocos : null
  const { meta } = resposta
  const { error } = await db
    .from('episcopado_perguntas')
    .update({
      effort: meta.effort,
      thinking: meta.thinking,
      resultado: meta.resultado,
      rodadas: meta.rodadas,
      duracao_ms: meta.duracaoMs,
      fria,
      tokens_in: meta.usage.input,
      tokens_cache_read: meta.usage.cacheRead,
      tokens_cache_write: meta.usage.cacheWrite,
      tokens_out: meta.usage.output,
      custo_usd: Number(meta.custoUsd.toFixed(5)),
      citacoes: meta.citacoes,
      citacoes_removidas: meta.citacoesRemovidas,
      ferramentas: meta.ferramentas,
      markdown: resposta.markdown,
      notas: resposta.notas,
      blocos,
      resumo: resposta.resumo
    })
    .eq('id', id)
    .abortSignal(timeout())
  if (error) supabaseFalhou('registro', error.message)
}

export async function registrarCache(row: { version: string; ipHash: string | null; app: string | null; contexto: string | null; pergunta: string; perguntaNorm: string }): Promise<void> {
  const db = supabase()
  if (!db) return
  const { error } = await db.from('episcopado_perguntas').insert({
    version: row.version,
    ip_hash: row.ipHash,
    app: row.app,
    contexto: row.contexto,
    pergunta: row.pergunta,
    pergunta_norm: row.perguntaNorm,
    resultado: 'cache'
  }).abortSignal(timeout())
  if (error) supabaseFalhou('registro do cache', error.message)
}
