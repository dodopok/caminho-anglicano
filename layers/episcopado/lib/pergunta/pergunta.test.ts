// @vitest-environment node
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildGraph } from '../graph'
import { loadBase } from '../load'
import type { Base } from '../schemas'
import type { SqlResult } from '../sql/runner'
import { indexBase } from '../views'
import { blocoFromSql, BlocoError } from './blocos'
import { createBriefs } from './briefs'
import { BlocoSchema, RespostaEventSchema } from './contrato'
import { claimInfo, CLAIM_PATTERN, consecrationClaim, edgeClaim } from './claims'
import { finalizeText, internalLinkOk } from './citacoes'
import { claimsIn, mensagensDoHistorico, resumoDe } from './historico'
import { parseInline, parseMarkdown, stripRawCites } from './markdown'
import { buildSystemPrompt } from './prompt'

const s1 = [{ source: 's', quote: 'trecho um' }]
const s2 = [{ source: 't', quote: 'trecho dois' }]

const base: Base = {
  people: [
    { id: 'a', name: 'Ana', sources: s1, ordinations: [{ order: 'episcopate', date: '1990', jurisdiction: 'velha', principal_consecrator: null, status: 'confirmed', sources: s1 }] },
    {
      id: 'b',
      name: 'Bento',
      ordinations: [
        { order: 'presbyterate', date: '2001-05', jurisdiction: 'velha', ordained_by: 'a', status: 'probable', sources: s1 },
        { order: 'episcopate', date: '2012-12-08', jurisdiction: 'nova', principal_consecrator: 'a', co_consecrators: ['c'], status: 'contested', sources: [...s1, ...s2] }
      ],
      affiliations: [{ jurisdiction: 'nova', role: 'primate', start: '2018', status: 'confirmed', sources: s2 }],
      events: [{ type: 'resignation', date: '2020', description: 'Renunciou.', status: 'confirmed', sources: s2 }]
    },
    { id: 'c', name: 'Caio' }
  ],
  jurisdictions: [
    { id: 'velha', name: 'Igreja Velha', type: 'national_church', country: 'BR' },
    { id: 'nova', name: 'Igreja Nova', acronym: 'IN', type: 'province', country: 'BR', relations: [{ type: 'schism_from', target: 'velha', date: '2005', led_by: ['b'], status: 'confirmed', sources: s2 }] }
  ],
  sources: [
    { id: 's', type: 'news', title: 'Notícia', url: 'https://exemplo.org', level: 'secondary' },
    { id: 't', type: 'official_document', title: 'Ata', level: 'primary' }
  ]
}
const index = indexBase(base)
const graph = buildGraph(base)
const exists = (id: string) => graph.nodes.some((n) => n.id === id)

describe('claims', () => {
  it('acha as fontes de cada tipo de afirmação', () => {
    expect(claimInfo(index, 'p:b/ordinations/1')?.sources).toHaveLength(2)
    expect(claimInfo(index, 'p:b/affiliations/0')?.status).toBe('confirmed')
    expect(claimInfo(index, 'j:nova/relations/0')?.sources).toEqual(s2)
    expect(claimInfo(index, 'p:a')?.sources).toEqual(s1)
    expect(claimInfo(index, 'p:b/ordinations/9')).toBeNull()
    expect(claimInfo(index, 'p:x/ordinations/0')).toBeNull()
  })

  it('reconhece ids citáveis dentro de texto e células', () => {
    expect('ver p:b/ordinations/1, j:nova e p:a/birth'.match(CLAIM_PATTERN)).toEqual(['p:b/ordinations/1', 'j:nova', 'p:a/birth'])
  })

  it('liga passos de sucessão e de caminho às afirmações', () => {
    expect(consecrationClaim(index, 'b')).toBe('p:b/ordinations/1')
    expect(edgeClaim(index, 'p:a', { id: 'p:b', via: { kind: 'consecration', status: 'contested', reversed: false } })).toBe('p:b/ordinations/1')
    expect(edgeClaim(index, 'p:b', { id: 'p:c', via: { kind: 'co_consecration', status: 'contested', reversed: true } })).toBe('p:b/ordinations/1')
    expect(edgeClaim(index, 'j:nova', { id: 'j:velha', via: { kind: 'schism_from', status: 'confirmed', reversed: false } })).toBe('j:nova/relations/0')
    expect(edgeClaim(index, 'p:b', { id: 'j:nova', via: { kind: 'affiliation', status: 'confirmed', reversed: false } })).toBe('p:b/affiliations/0')
  })
})

describe('finalizeText', () => {
  it('numera as citações vistas, prioriza fontes primárias e apaga as não vistas ou inexistentes', () => {
    const seen = new Set(['p:b/ordinations/1', 'j:nova/relations/0'])
    const r = finalizeText('Sagrado em 2012 [c:p:b/ordinations/1]. Cisma [c:j:nova/relations/0][c:p:a]. Inventado [c:p:z/events/0].', seen, index, exists)
    expect(r.markdown).toBe('Sagrado em 2012 [1, 2]. Cisma [1]. Inventado.')
    expect(r.notas.map((n) => n.source.id)).toEqual(['t', 's'])
    expect(r.notas[0].quote).toBe('trecho dois')
    expect(r.raw).toContain('[c:p:b/ordinations/1]')
    expect(r.citacoes).toBe(4)
    expect(r.removidas).toEqual(['p:a', 'p:z/events/0'])
  })

  it('mantém links internos válidos e tira os demais', () => {
    const r = finalizeText('[Bento](/episcopado/pessoa/b), [X](/episcopado/pessoa/x), [site](https://exemplo.org), [rede](/episcopado?no=p:b)', new Set(), index, exists)
    expect(r.markdown).toBe('[Bento](/episcopado/pessoa/b), X, site, [rede](/episcopado?no=p:b)')
    expect(internalLinkOk('/episcopado/jurisdicao/nova', exists)).toBe(true)
    expect(internalLinkOk('/episcopado?no=p:nada', exists)).toBe(false)
  })
})

describe('blocoFromSql', () => {
  const result: SqlResult = { columns: ['decada', 'n', 'claim_id'], rows: [[1990, 2, 'p:a/ordinations/0'], [2000, '3', null]], total: 2, truncated: false, ms: 1 }

  it('monta tabela, gráfico e linha do tempo com os dados do servidor', () => {
    expect(blocoFromSql({ forma: 'tabela', titulo: 'T', x: null, y: null }, result, 'SELECT 1')).toMatchObject({ tipo: 'tabela', colunas: result.columns, linhas: result.rows })
    expect(blocoFromSql({ forma: 'barras', titulo: null, x: 'decada', y: 'n' }, result, 'q')).toMatchObject({ tipo: 'grafico', labels: ['1990', '2000'], data: [2, 3] })
    expect(blocoFromSql({ forma: 'linha_do_tempo', titulo: null, x: 'decada', y: 'n' }, result, 'q')).toMatchObject({ itens: [{ data: '1990', texto: '2', claim: 'p:a/ordinations/0' }, { data: '2000', texto: '3', claim: null }] })
  })

  it('recusa tabelas que o leitor não consegue ler, com a correção para o modelo', () => {
    const tabela = { forma: 'tabela' as const, titulo: null, x: null, y: null }
    const longo = 'x'.repeat(200)
    const notas: SqlResult = { columns: ['name', 'notes', 'claim_id'], rows: [['A', longo, longo], ['B', 'curta', null]], total: 2, truncated: false, ms: 1 }
    expect(() => blocoFromSql(tabela, notas, 'q')).toThrow(/coluna "notes" tem texto longo.*substr\(notes, 1, 80\)/)
    const poucas: SqlResult = { ...notas, rows: [['A', longo, null], ...Array.from({ length: 4 }, () => ['B', 'curta', null])] }
    expect(blocoFromSql(tabela, poucas, 'q')).toMatchObject({ tipo: 'tabela' })
    const muitas: SqlResult = { columns: ['name'], rows: Array.from({ length: 300 }, (_, i) => [`p${i}`]), total: 300, truncated: false, ms: 1 }
    expect(() => blocoFromSql(tabela, muitas, 'q')).toThrow(/300 linhas é demais.*LIMIT 200/)
    expect(() => blocoFromSql(tabela, { ...muitas, total: 501, truncated: true }, 'q')).toThrow(/mais de 500 linhas/)
    expect(blocoFromSql({ forma: 'barras', titulo: null, x: 'name', y: 'n' }, { columns: ['name', 'n'], rows: Array.from({ length: 100 }, (_, i) => [`d${i}`, i]), total: 100, truncated: false, ms: 1 }, 'q')).toMatchObject({ tipo: 'grafico' })
  })

  it('segue o contrato público dos blocos', () => {
    for (const forma of ['tabela', 'barras', 'linha_do_tempo'] as const) {
      expect(BlocoSchema.safeParse(blocoFromSql({ forma, titulo: null, x: 'decada', y: 'n' }, result, 'q')).success).toBe(true)
    }
    const fin = finalizeText('Fato [c:p:b/ordinations/1].', new Set(['p:b/ordinations/1']), index, exists)
    expect(RespostaEventSchema.safeParse({ markdown: fin.markdown, notas: fin.notas, blocos: [], resumo: fin.raw }).success).toBe(true)
  })

  it('recusa colunas inexistentes ou não numéricas', () => {
    expect(() => blocoFromSql({ forma: 'barras', titulo: null, x: 'decada', y: 'nada' }, result, 'q')).toThrow(BlocoError)
    expect(() => blocoFromSql({ forma: 'linha', titulo: null, x: 'n', y: 'claim_id' }, result, 'q')).toThrow(/numérica/)
  })
})

describe('histórico', () => {
  it('resume a resposta com as consultas dos blocos e recupera os ids citáveis', () => {
    const resumo = resumoDe('Texto [c:p:b/ordinations/1].', [{ tipo: 'tabela', titulo: 'X', colunas: ['a'], linhas: [[1]], total: 1, truncado: false, consulta: 'SELECT a FROM t' }])
    expect(resumo).toContain('[bloco 1] tabela "X" (1 linhas): SELECT a FROM t')
    expect(claimsIn(resumo)).toEqual(['p:b/ordinations/1'])
    expect(mensagensDoHistorico([{ pergunta: 'P', resumo }])).toEqual([{ role: 'user', content: 'P' }, { role: 'assistant', content: resumo }])
  })
})

describe('markdown', () => {
  it('reconhece negrito, itálico, código, links e notas', () => {
    expect(parseInline('**A** e *b* com `c`, [d](/x) [1, 2]')).toEqual([
      { t: 'strong', c: [{ t: 'text', v: 'A' }] },
      { t: 'text', v: ' e ' },
      { t: 'em', c: [{ t: 'text', v: 'b' }] },
      { t: 'text', v: ' com ' },
      { t: 'code', v: 'c' },
      { t: 'text', v: ', ' },
      { t: 'link', href: '/x', c: [{ t: 'text', v: 'd' }] },
      { t: 'text', v: ' ' },
      { t: 'cites', ns: [1, 2] }
    ])
  })

  it('separa parágrafos, títulos, listas e marcadores de bloco', () => {
    const blocks = parseMarkdown('### Título\nlinha um\nlinha dois\n\n- a\n- b\n1. c\n\n[[bloco 2]]\nfim')
    expect(blocks.map((b) => b.type)).toEqual(['h', 'p', 'ul', 'ol', 'bloco', 'p'])
    expect(blocks[1]).toEqual({ type: 'p', c: [{ t: 'text', v: 'linha um linha dois' }] })
  })

  it('esconde citações cruas durante o streaming', () => {
    expect(stripRawCites('Fato [c:p:a/ordinations/0]. Outro [c:p:b/ord')).toBe('Fato. Outro')
  })
})

describe('base real', () => {
  const real = loadBase(fileURLToPath(new URL('../../data', import.meta.url))).base
  const realGraph = buildGraph(real)
  const briefs = createBriefs(real)

  it('fichas enxutas cabem no limite mesmo nas maiores (Cavalcanti, IEAB, Recife)', () => {
    for (const id of ['robinson-cavalcanti', 'miguel-uchoa']) expect(briefs.person(id)!.text.length).toBeLessThan(16_000)
    for (const id of ['ieab', 'diocese-anglicana-recife', 'tec']) expect(briefs.jurisdiction(id)!.text.length).toBeLessThan(16_000)
    const b = briefs.person('miguel-uchoa')!
    expect(b.claims.every((c) => claimInfo(indexBase(real), c) || c.endsWith('/birth') || c.endsWith('/death'))).toBe(true)
  })

  it('o system prompt fica estável e com tamanho conhecido', () => {
    const prompt = buildSystemPrompt(real, realGraph)
    expect(prompt).toBe(buildSystemPrompt(real, realGraph))
    expect(prompt.length).toBeLessThan(26_000)
    expect(prompt).toContain('ieab = IEAB')
  })
})

describe('exemplos', () => {
  it('troca o nome nas perguntas de pessoa e monta o link com contexto', async () => {
    const { EXEMPLOS, exemplosDaFicha, perguntaLink } = await import('./exemplos')
    expect(EXEMPLOS.gerais.flatMap((g) => g.perguntas).length).toBeGreaterThanOrEqual(10)
    expect(exemplosDaFicha('person', 'Ana')[0]).toBe('Quem sagrou ou ordenou Ana?')
    expect(exemplosDaFicha('jurisdiction', 'IN').every((q) => !q.includes('{nome}'))).toBe(true)
    expect(perguntaLink('Quem sagrou Ana?', 'p:a')).toBe('/episcopado/pergunte?q=Quem+sagrou+Ana%3F&p=p%3Aa')
  })
})
