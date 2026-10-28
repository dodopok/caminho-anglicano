import type { Footnote, BaseIndex } from '../views'
import { claimInfo } from './claims'

/**
 * Fecha o texto do agente: cada `[c:<claim_id>]` vira uma nota numerada (fonte + trecho literal),
 * desde que a afirmação exista e tenha sido devolvida por alguma ferramenta nesta pergunta. O resto
 * é apagado e contado. Links internos para fichas inexistentes perdem o link e ficam só com o texto.
 */

export interface Finalized {
  /** Markdown com as citações trocadas por "[1]", "[2, 3]". */
  markdown: string
  /** O mesmo texto com as citações válidas ainda como `[c:id]` (vai para o histórico da conversa). */
  raw: string
  notas: Footnote[]
  citacoes: number
  removidas: string[]
}

const CITE = /\[c:([^\]]+)\]/g
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g

export interface NodeExists {
  (nodeId: string): boolean
}

/** Valida um href interno do explorador ou das fichas; links externos não são permitidos. */
export function internalLinkOk(href: string, exists: NodeExists): boolean {
  const ficha = /^\/episcopado\/(pessoa|jurisdicao|fonte)\/([a-z0-9-]+)\/?$/.exec(href)
  if (ficha) return ficha[1] === 'fonte' ? true : exists(`${ficha[1] === 'pessoa' ? 'p' : 'j'}:${ficha[2]}`)
  if (/^\/episcopado\/?(\?.*)?$/.test(href)) {
    const params = new URLSearchParams(href.split('?')[1] ?? '')
    return [params.get('no'), params.get('ficha')].every((id) => !id || exists(id))
  }
  return /^\/episcopado\/(pergunte|fontes)\/?$/.test(href)
}

/** Notas por afirmação: as mais fortes (primárias, com trecho) primeiro; o resto fica na ficha. */
export const NOTES_PER_CLAIM = 2
const LEVEL_RANK: Record<string, number> = { primary: 0, secondary: 1, tertiary: 2 }

export function bestSources<T extends { source: string; quote?: string }>(index: BaseIndex, refs: T[], limit = NOTES_PER_CLAIM): T[] {
  const rank = (r: T) => (LEVEL_RANK[index.sources.get(r.source)?.level ?? 'tertiary'] ?? 2) * 2 + (r.quote ? 0 : 1)
  return refs
    .map((r, i) => ({ r, i }))
    .sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i)
    .slice(0, limit)
    .map(({ r }) => r)
}

export function finalizeText(text: string, seen: Set<string>, index: BaseIndex, exists: NodeExists): Finalized {
  const notas: Footnote[] = []
  const numbers = new Map<string, number>()
  const removidas: string[] = []
  let citacoes = 0

  const note = (source: string, quote?: string, page?: string): number | null => {
    const s = index.sources.get(source)
    if (!s) return null
    const key = `${source}\u0000${quote ?? ''}\u0000${page ?? ''}`
    let n = numbers.get(key)
    if (!n) {
      n = notas.length + 1
      numbers.set(key, n)
      notas.push({
        n,
        source: { id: s.id, type: s.type, title: s.title, author: s.author, publisher: s.publisher, url: s.url, archive_url: s.archive_url, published: s.published, level: s.level },
        quote,
        page
      })
    }
    return n
  }

  const validIds = (inner: string) => {
    const ids = inner.split(/[,;\s]+/).map((x) => x.replace(/^c:/, '').trim()).filter(Boolean)
    const ok: string[] = []
    for (const id of ids) {
      citacoes++
      const info = seen.has(id) ? claimInfo(index, id) : null
      if (info?.sources.length) ok.push(id)
      else removidas.push(id)
    }
    return ok
  }

  let raw = ''
  let markdown = ''
  let last = 0
  for (const m of text.matchAll(CITE)) {
    const before = text.slice(last, m.index)
    raw += before
    markdown += before
    last = m.index! + m[0].length
    const ok = validIds(m[1])
    if (!ok.length) continue
    raw += ok.map((id) => `[c:${id}]`).join('')
    const ns = [...new Set(ok.flatMap((id) => bestSources(index, claimInfo(index, id)!.sources).map((s) => note(s.source, s.quote, s.page)).filter((n): n is number => n !== null)))]
    if (ns.length) markdown += `[${ns.sort((a, b) => a - b).join(', ')}]`
  }
  raw += text.slice(last)
  markdown += text.slice(last)

  // Citações vizinhas ("[c:a][c:b]") viram um só grupo de notas: "[1, 2][1, 3]" → "[1, 2, 3]".
  const GRUPOS = /\[(\d+(?:, \d+)*)\]\s*\[(\d+(?:, \d+)*)\]/
  while (GRUPOS.test(markdown)) {
    markdown = markdown.replace(GRUPOS, (_, a: string, b: string) => `[${[...new Set(`${a}, ${b}`.split(', ').map(Number))].sort((x, y) => x - y).join(', ')}]`)
  }

  const fixLinks = (s: string) => s.replace(LINK, (whole, label: string, href: string) => (internalLinkOk(href, exists) ? whole : label))
  // Citações apagadas deixam espaço antes da pontuação ("frase [c:x]." → "frase .").
  const tidy = (s: string) => fixLinks(s).replace(/[ \t]+([.,;:!?])/g, '$1').replace(/[ \t]{2,}/g, ' ')
  return { markdown: tidy(markdown), raw: tidy(raw), notas, citacoes, removidas }
}
