import type { Bloco } from '../lib/pergunta/blocos'
import type { Footnote } from '../lib/views'

/**
 * Conversa com o Pergunte à Rede no navegador: envia a pergunta, lê o SSE do POST (status, blocos,
 * texto em streaming, resposta final) e guarda o resumo de cada resposta para as continuações.
 */

export interface PerguntaTurno {
  id: number
  pergunta: string
  status: string | null
  texto: string
  blocos: Bloco[]
  notas: Footnote[]
  resumo: string | null
  resultado: string | null
  erro: string | null
  done: boolean
  cache: boolean
}

interface SseMessage {
  event: string
  data: string
}

/** Quebra um fluxo SSE em mensagens; devolve o que sobrou (mensagem incompleta). */
export function parseSse(buffer: string): { messages: SseMessage[]; rest: string } {
  const parts = buffer.replace(/\r/g, '').split('\n\n')
  const rest = parts.pop() ?? ''
  const messages = parts.flatMap((part) => {
    let event = 'message'
    const data: string[] = []
    for (const line of part.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
    }
    return data.length ? [{ event, data: data.join('\n') }] : []
  })
  return { messages, rest }
}

export function useEpiscopadoPergunta(contexto: Ref<string | null>) {
  const turnos = ref<PerguntaTurno[]>([])
  const busy = ref(false)
  let controller: AbortController | null = null
  let seq = 0

  const historico = () =>
    turnos.value
      .filter((t) => t.done && t.resumo && !t.erro)
      .slice(-6)
      .map((t) => ({ pergunta: t.pergunta, resumo: t.resumo! }))

  async function perguntar(pergunta: string) {
    const q = pergunta.trim()
    if (!q || busy.value) return
    const turno = reactive<PerguntaTurno>({ id: ++seq, pergunta: q, status: 'Lendo a pergunta…', texto: '', blocos: [], notas: [], resumo: null, resultado: null, erro: null, done: false, cache: false })
    const body = { pergunta: q, historico: historico(), contexto: contexto.value }
    turnos.value.push(turno)
    busy.value = true
    controller = new AbortController()
    let rodada = 0
    try {
      const res = await fetch('/api/episcopado/pergunta', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify(body),
        signal: controller.signal
      })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.data?.[0]?.message || data?.message || data?.statusMessage || `Erro ${res.status}`)
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        const { messages, rest } = parseSse(buffer + value)
        buffer = rest
        for (const m of messages) {
          const data = JSON.parse(m.data)
          if (m.event === 'status') turno.status = data.texto
          else if (m.event === 'bloco') turno.blocos.push(data.bloco)
          else if (m.event === 'texto') {
            // Texto de uma rodada nova substitui o da anterior (o modelo "pensando alto" antes de consultar).
            if (data.rodada !== rodada) {
              rodada = data.rodada
              turno.texto = ''
            }
            turno.texto += data.delta
            turno.status = null
          } else if (m.event === 'resposta') {
            turno.texto = data.markdown
            turno.notas = data.notas ?? []
            turno.blocos = data.blocos ?? turno.blocos
            turno.resumo = data.resumo ?? null
            turno.resultado = data.meta?.resultado ?? (data.cache ? 'ok' : null)
            turno.cache = !!data.cache
            turno.done = true
          } else if (m.event === 'erro') throw new Error(data.mensagem)
        }
      }
      if (!turno.done) throw new Error('A resposta foi interrompida. Tente de novo.')
    } catch (error) {
      if ((error as Error).name === 'AbortError') turno.erro = 'Pergunta cancelada.'
      else turno.erro = (error as Error).message || 'Não foi possível responder agora.'
    } finally {
      turno.status = null
      turno.done = true
      busy.value = false
      controller = null
    }
  }

  function cancelar() {
    controller?.abort()
  }

  function limpar() {
    cancelar()
    turnos.value = []
  }

  onBeforeUnmount(cancelar)
  return { turnos, busy, perguntar, cancelar, limpar }
}
