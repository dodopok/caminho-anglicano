import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AgentDeps, AgentSettings, Effort, Resposta } from '../../lib/pergunta/agent'
import { createAgentDeps } from '../../lib/pergunta/deps'

/**
 * Peças do servidor para o "Pergunte à Rede": dependências do agente (uma vez por instância e versão
 * da base), configuração do modelo e o registro no Supabase (limites, cache exato, log, lacunas).
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
// Limites e log no Supabase
// ---------------------------------------------------------------------------

export const PERGUNTA_LIMITS = { porIpHora: 20, porDia: 400, simultaneasPorInstancia: 8 }

let supabaseClient: SupabaseClient | null | undefined

function supabase(): SupabaseClient | null {
  if (supabaseClient !== undefined) return supabaseClient
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl as string | undefined
  const key = config.supabaseServiceKey as string | undefined
  supabaseClient = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null
  if (!supabaseClient) console.warn('[episcopado] Pergunte à Rede sem Supabase: sem limites, cache nem log (só para desenvolvimento).')
  return supabaseClient
}

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
  const { data, error } = await q.order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw new Error(`cache: ${error.message}`)
  return (data as CachedResposta | null) ?? null
}

/** `ok: false` traz o motivo (limite do IP na última hora ou teto do dia). */
export interface Reserva {
  ok: boolean
  id: number | null
  motivo?: 'ip' | 'dia'
}

/** Reserva a pergunta (limites) e cria a linha do log. Sem Supabase (dev): sempre permite, sem log. */
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
  if (!db) return { ok: true, id: null }
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
  })
  // Falha fechada: com o Supabase configurado e fora do ar, não se roda sem teto.
  if (error) throw new Error(`limites: ${error.message}`)
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
  if (error) console.error('[episcopado] falha ao registrar pergunta:', error.message)
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
  })
  if (error) console.error('[episcopado] falha ao registrar acerto de cache:', error.message)
}
