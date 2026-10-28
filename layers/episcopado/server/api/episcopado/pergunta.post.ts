import { z } from 'zod'
import { perguntar, type AgentEvent } from '../../../lib/pergunta/agent'
import { TurnoSchema } from '../../../lib/pergunta/historico'

/**
 * Pergunte à Rede: pergunta em linguagem natural sobre a base, respondida por um agente com ferramentas
 * só de leitura. Responde em SSE: eventos `status`, `bloco`, `texto` (streaming do texto do modelo), e uma
 * única `resposta` no fim (texto com notas, blocos, resumo para continuar a conversa). Ver
 * docs/EPISCOPADO-PERGUNTE.md e o contrato em docs/EPISCOPADO-API.md.
 */

const BodySchema = z.object({
  pergunta: z.string().trim().min(3, 'pergunta curta demais').max(1000, 'pergunta longa demais (máx. 1000 caracteres)'),
  historico: z.array(TurnoSchema).max(6).optional(),
  contexto: z.string().regex(/^[pj]:[a-z0-9]+(-[a-z0-9]+)*$/).nullable().optional(),
  app: z.string().trim().max(80).optional()
})

const DEADLINE_MS = 60_000
let emAndamento = 0

export default defineEventHandler(async (event) => {
  const parsed = BodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos', data: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) })
  }
  const { pergunta, historico = [], contexto = null, app = null } = parsed.data

  let state: Awaited<ReturnType<typeof useEpiscopadoAgent>>
  try {
    state = await useEpiscopadoAgent()
  } catch (error) {
    if (error instanceof PerguntaUnavailable) throw createError({ statusCode: 503, statusMessage: 'Indisponível', message: error.message })
    throw error
  }
  const settings = perguntaSettings()
  const perguntaNorm = normalizePergunta(pergunta)
  const ipHash = hashIp(getRequestIP(event, { xForwardedFor: true }))

  // Perguntas de exemplo (sem histórico) saem do cache exato: instantâneas e sem custo de IA.
  let cached: Awaited<ReturnType<typeof cachedResposta>> = null
  if (!historico.length) {
    try {
      cached = await cachedResposta(state.version, perguntaNorm, contexto)
    } catch (error) {
      console.error('[episcopado]', (error as Error).message)
    }
  }

  let reservaId: number | null = null
  if (!cached) {
    if (emAndamento >= PERGUNTA_LIMITS.simultaneasPorInstancia) {
      throw createError({ statusCode: 503, statusMessage: 'Ocupado', message: 'Muita gente perguntando agora; tente de novo em um minuto.' })
    }
    let reserva: Awaited<ReturnType<typeof reservarPergunta>>
    try {
      reserva = await reservarPergunta({ version: state.version, ipHash, app, contexto, pergunta, perguntaNorm, historicoN: historico.length, modelo: settings.model })
    } catch (error) {
      console.error('[episcopado]', (error as Error).message)
      throw createError({ statusCode: 503, statusMessage: 'Indisponível', message: 'Pergunte à Rede indisponível no momento; tente mais tarde.' })
    }
    if (!reserva.ok) {
      setResponseHeader(event, 'Retry-After', reserva.motivo === 'ip' ? 3600 : 86_400)
      throw createError({
        statusCode: 429,
        statusMessage: 'Limite atingido',
        message: reserva.motivo === 'ip' ? 'Você fez muitas perguntas na última hora; tente mais tarde.' : 'O limite de perguntas de hoje acabou; volte amanhã.'
      })
    }
    reservaId = reserva.id
  }

  const stream = createEventStream(event)
  const send = (name: string, data: unknown) => stream.push({ event: name, data: JSON.stringify(data) })

  if (cached) {
    void (async () => {
      await send('resposta', { ...cached, cache: true })
      await registrarCache({ version: state.version, ipHash, app, contexto, pergunta, perguntaNorm })
      await stream.close()
    })()
    return stream.send()
  }

  const controller = new AbortController()
  const deadline = setTimeout(() => controller.abort(), DEADLINE_MS)
  stream.onClosed(() => controller.abort())
  const fria = state.fresh
  state.fresh = false
  emAndamento++

  void (async () => {
    try {
      const resposta = await perguntar(
        state.deps,
        settings,
        { pergunta, historico, contexto, hoje: new Date().toISOString().slice(0, 10) },
        { signal: controller.signal, onEvent: (e: AgentEvent) => void send(e.type, e) }
      )
      if (resposta.meta.resultado === 'abortada' && !controller.signal.aborted) resposta.meta.resultado = 'erro'
      const { meta } = resposta
      await send('resposta', {
        markdown: resposta.markdown,
        notas: resposta.notas,
        blocos: resposta.blocos,
        resumo: resposta.resumo,
        meta: { resultado: meta.resultado, rodadas: meta.rodadas, duracaoMs: meta.duracaoMs, citacoesRemovidas: meta.citacoesRemovidas }
      })
      await registrarResposta(reservaId, resposta, fria)
    } catch (error) {
      console.error('[episcopado] pergunta falhou:', error)
      await send('erro', { mensagem: 'Algo deu errado ao responder. Tente de novo.' })
    } finally {
      clearTimeout(deadline)
      emAndamento--
      await stream.close()
    }
  })()
  return stream.send()
})
