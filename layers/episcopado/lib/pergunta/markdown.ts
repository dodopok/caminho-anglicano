/**
 * Markdown mínimo das respostas do agente, como árvore (sem HTML): parágrafos, títulos, listas,
 * negrito, itálico, código, links internos, chamadas de nota "[1, 2]" e o marcador "[[bloco N]]".
 * Renderizado por componentes Vue: nada do texto do modelo vira HTML cru.
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'strong'; c: Inline[] }
  | { t: 'em'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; c: Inline[] }
  | { t: 'cites'; ns: number[] }

export type Block =
  | { type: 'p'; c: Inline[] }
  | { type: 'h'; level: 2 | 3 | 4; c: Inline[] }
  | { type: 'ul' | 'ol'; items: Inline[][] }
  | { type: 'bloco'; n: number }

const INLINE = /\*\*([^*]+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\[(\d+(?:,\s*\d+)*)\]|(?<![\w*])\*(?!\s)([^*]+?)\*(?![\w*])|(?<!\w)_(?!\s)([^_]+?)_(?!\w)/g

export function parseInline(text: string): Inline[] {
  const out: Inline[] = []
  let last = 0
  for (const m of text.matchAll(INLINE)) {
    if (m.index! > last) out.push({ t: 'text', v: text.slice(last, m.index) })
    last = m.index! + m[0].length
    if (m[1] !== undefined) out.push({ t: 'strong', c: parseInline(m[1]) })
    else if (m[2] !== undefined) out.push({ t: 'code', v: m[2] })
    else if (m[3] !== undefined) out.push({ t: 'link', href: m[4], c: parseInline(m[3]) })
    else if (m[5] !== undefined) out.push({ t: 'cites', ns: m[5].split(/,\s*/).map(Number) })
    else out.push({ t: 'em', c: parseInline(m[6] ?? m[7]) })
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) })
  return out
}

export function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', c: parseInline(para.join(' ')) })
    para = []
    if (list) blocks.push({ type: list.type, items: list.items.map(parseInline) })
    list = null
  }
  for (const raw of md.replace(/\r/g, '').split('\n')) {
    const line = raw.trim()
    const bloco = /^\[\[bloco (\d+)\]\]$/i.exec(line)
    const heading = /^(#{1,4})\s+(.+)$/.exec(line)
    const ul = /^[-*•]\s+(.+)$/.exec(line)
    const ol = /^\d+[.)]\s+(.+)$/.exec(line)
    if (!line) flush()
    else if (bloco) {
      flush()
      blocks.push({ type: 'bloco', n: Number(bloco[1]) })
    } else if (heading) {
      flush()
      blocks.push({ type: 'h', level: Math.min(4, Math.max(2, heading[1].length + 1)) as 2 | 3 | 4, c: parseInline(heading[2]) })
    } else if (ul || ol) {
      const type = ul ? 'ul' : 'ol'
      if (para.length || (list && list.type !== type)) flush()
      list ??= { type, items: [] }
      list.items.push((ul ?? ol)![1])
    } else if (list && /^\s{2,}/.test(raw)) {
      list.items[list.items.length - 1] += ` ${line}`
    } else {
      if (list) flush()
      para.push(line)
    }
  }
  flush()
  return blocks
}

/** Texto parcial durante o streaming: tira as citações cruas "[c:…]" (inclusive a que ainda está chegando). */
export function stripRawCites(text: string): string {
  return text.replace(/\s*\[c:[^\]]*\]/g, '').replace(/\s*\[c:[^\]]*$/, '').replace(/\s*\[c?$/, '')
}
