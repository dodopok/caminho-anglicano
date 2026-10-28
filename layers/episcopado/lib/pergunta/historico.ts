import { z } from 'zod'
import type { Bloco } from './blocos'
import { CLAIM_PATTERN } from './claims'

/**
 * Conversa sem estado no servidor: o cliente reenvia, para cada turno anterior, a pergunta e o `resumo`
 * que o próprio servidor devolveu (texto com as citações `[c:id]` e as consultas dos blocos mostrados).
 * Nunca se reenviam chamadas e resultados de ferramenta crus.
 */

export const LIMITE_TURNOS = 6
export const LIMITE_RESUMO = 2000

export const TurnoSchema = z.object({
  pergunta: z.string().trim().min(1).max(1000),
  resumo: z.string().max(LIMITE_RESUMO + 200)
})
export type Turno = z.infer<typeof TurnoSchema>

/** Resumo compacto de uma resposta, para a próxima pergunta da mesma conversa. */
export function resumoDe(raw: string, blocos: Bloco[]): string {
  const desc = blocos.map((b, i) => {
    const n = i + 1
    switch (b.tipo) {
      case 'tabela':
        return `[bloco ${n}] tabela${b.titulo ? ` "${b.titulo}"` : ''} (${b.linhas.length} linhas): ${b.consulta}`
      case 'grafico':
        return `[bloco ${n}] gráfico de ${b.forma} (x=${b.x}, y=${b.y}): ${b.consulta}`
      case 'linha_do_tempo':
        return `[bloco ${n}] linha do tempo (${b.itens.length} itens): ${b.consulta}`
      case 'sucessao':
        return `[bloco ${n}] sucessão de p:${b.view.person.id}`
      case 'caminho':
        return `[bloco ${n}] caminho de ${b.de} a ${b.para} (${b.modo})`
    }
  })
  const tail = desc.length ? `\n\nBlocos mostrados:\n${desc.join('\n')}` : ''
  const room = Math.max(400, LIMITE_RESUMO - tail.length)
  const text = raw.length > room ? `${raw.slice(0, room)}…` : raw
  return `${text}${tail}`.slice(0, LIMITE_RESUMO)
}

/** Ids citáveis que aparecem num texto (para valerem de novo numa continuação). */
export function claimsIn(text: string): string[] {
  return [...text.matchAll(CLAIM_PATTERN)].map((m) => m[0])
}

export function mensagensDoHistorico(historico: Turno[]): { role: 'user' | 'assistant'; content: string }[] {
  return historico.slice(-LIMITE_TURNOS).flatMap((t) => [
    { role: 'user' as const, content: t.pergunta },
    { role: 'assistant' as const, content: t.resumo.slice(0, LIMITE_RESUMO) }
  ])
}
