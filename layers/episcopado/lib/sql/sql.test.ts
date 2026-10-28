// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { buildGraph } from '../graph'
import type { Base } from '../schemas'
import { toTsv } from './child'
import { memorySqlite, writeSqliteFile } from './file'
import { guardSql } from './guard'
import { createSqlRunner } from './runner'
import { TABLES } from './schema'

const s1 = [{ source: 's', quote: 'trecho um' }]

const base: Base = {
  people: [
    { id: 'a', name: 'Ana', aliases: ['Dona Ana'], birth: { date: 'c.1950', sources: s1 }, ordinations: [{ order: 'episcopate', date: '1990', jurisdiction: 'velha', principal_consecrator: null, status: 'confirmed', sources: s1 }] },
    {
      id: 'b',
      name: 'Bento',
      ordinations: [
        { order: 'presbyterate', date: '2001-05', jurisdiction: 'velha', ordained_by: 'a', status: 'probable', sources: s1 },
        {
          order: 'episcopate',
          date: '2012-12-08',
          jurisdiction: 'nova',
          principal_consecrator: 'a',
          co_consecrators: ['c'],
          status: 'contested',
          sources: s1,
          discrepancies: [{ field: 'date', value: '2018-12-08', sources: [{ source: 's', quote: 'outra data' }] }]
        }
      ],
      affiliations: [{ jurisdiction: 'nova', diocese: 'dio', role: 'diocesan_bishop', start: '2012', end: '2020', end_reason: 'retirement', status: 'confirmed', sources: s1 }],
      events: [{ type: 'resignation', date: '2020', description: 'Renunciou.', status: 'confirmed', sources: s1 }]
    },
    { id: 'c', name: 'Caio' }
  ],
  jurisdictions: [
    { id: 'velha', name: 'Igreja Velha', type: 'national_church', country: 'BR' },
    { id: 'nova', name: 'Igreja Nova', acronym: 'IN', type: 'province', country: 'BR', founded: { date: '2005', sources: s1 }, relations: [{ type: 'schism_from', target: 'velha', date: '2005', led_by: ['b'], status: 'confirmed', sources: s1 }] },
    { id: 'dio', name: 'Diocese Um', type: 'diocese', relations: [{ type: 'part_of', target: 'nova', status: 'confirmed', sources: s1 }] }
  ],
  sources: [{ id: 's', type: 'news', title: 'Notícia', url: 'https://exemplo.org', level: 'secondary' }]
}

const graph = buildGraph(base)
const db = memorySqlite(base, graph)
const all = (sql: string) => db.prepare(sql).all() as Record<string, unknown>[]

describe('buildSqlite', () => {
  it('cria todas as tabelas com as contagens da base', () => {
    const count = (t: string) => (db.prepare(`SELECT count(*) AS n FROM ${t}`).get() as { n: number }).n
    expect(TABLES.map((t) => [t, count(t)])).toEqual([
      ['people', 3],
      ['person_aliases', 1],
      ['jurisdictions', 3],
      ['jurisdiction_ancestors', 4],
      ['ordinations', 3],
      ['co_consecrators', 1],
      ['affiliations', 1],
      ['relations', 2],
      ['relation_leaders', 1],
      ['events', 1],
      ['sources', 1],
      ['claim_sources', 9],
      ['discrepancies', 1]
    ])
  })

  it('gera claim_id estável, ano das datas parciais e colunas derivadas', () => {
    expect(all('SELECT claim_id, "order", year, status FROM ordinations ORDER BY claim_id')).toEqual([
      { claim_id: 'p:a/ordinations/0', order: 'episcopate', year: 1990, status: 'confirmed' },
      { claim_id: 'p:b/ordinations/0', order: 'presbyterate', year: 2001, status: 'probable' },
      { claim_id: 'p:b/ordinations/1', order: 'episcopate', year: 2012, status: 'contested' }
    ])
    expect(all("SELECT birth_year, brazil, highest_order FROM people WHERE id = 'a'")).toEqual([{ birth_year: 1950, brazil: 1, highest_order: 'episcopate' }])
  })

  it('resolve a hierarquia por part_of em qualquer profundidade', () => {
    expect(all("SELECT ancestor, depth FROM jurisdiction_ancestors WHERE jurisdiction = 'dio' ORDER BY depth")).toEqual([
      { ancestor: 'dio', depth: 0 },
      { ancestor: 'nova', depth: 1 }
    ])
  })

  it('não aceita escrita depois de montado', () => {
    expect(() => db.exec("INSERT INTO people (id, name, brazil) VALUES ('x', 'X', 0)")).toThrow()
  })
})

describe('guardSql', () => {
  it('aceita SELECT e WITH e embrulha com LIMIT', () => {
    expect(guardSql('SELECT 1;')).toEqual({ ok: true, sql: 'SELECT * FROM (\nSELECT 1\n) LIMIT 501' })
    expect(guardSql('-- contagem\nWITH x AS (SELECT 1) SELECT * FROM x').ok).toBe(true)
  })

  it('recusa escrita, PRAGMA, ATTACH e mais de um statement', () => {
    for (const q of ['DELETE FROM people', 'PRAGMA query_only = OFF', "ATTACH 'x' AS y", 'SELECT 1; DROP TABLE people', '/* */ INSERT INTO people VALUES (1)', '']) {
      expect(guardSql(q).ok).toBe(false)
    }
  })

  it('um comentário no fim não engole o LIMIT', () => {
    const g = guardSql('SELECT id FROM people -- tudo')
    expect(g.ok && db.prepare(g.sql).all().length).toBe(3)
  })
})

describe('toTsv', () => {
  it('formata cabeçalho e linhas sem tabs ou quebras dentro das células', () => {
    expect(toTsv(['a', 'b'], [[1, 'x\ty'], [null, 'linha\nnova']])).toBe('a\tb\n1\tx y\n\tlinha nova')
  })
})

describe('createSqlRunner', () => {
  const dir = mkdtempSync(join(tmpdir(), 'episcopado-sql-'))
  const file = writeSqliteFile(base, graph, join(dir, 'base.sqlite'))
  const runner = createSqlRunner(file)
  afterAll(() => {
    runner.kill()
    rmSync(dir, { recursive: true, force: true })
  })

  it('consulta num processo filho e devolve colunas e linhas', async () => {
    const r = await runner.run('SELECT id, name FROM people ORDER BY id')
    expect(r.columns).toEqual(['id', 'name'])
    expect(r.rows).toEqual([['a', 'Ana'], ['b', 'Bento'], ['c', 'Caio']])
    expect(r.truncated).toBe(false)
  })

  it('trunca linhas, células e tamanho dentro do filho', async () => {
    const r = await runner.run('WITH n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 900) SELECT i, substr(hex(randomblob(400)), 1, 800) AS t FROM n', { maxRows: 20, maxCell: 50 })
    expect(r.rows).toHaveLength(20)
    expect(r.total).toBe(501)
    expect(r.truncated).toBe(true)
    expect(String(r.rows[0][1]).length).toBe(51)
  })

  it('recusa escrita mesmo que passasse pela guarda', async () => {
    await expect(runner.run("SELECT * FROM people WHERE id = 'a'")).resolves.toBeTruthy()
    await expect(runner.run('DELETE FROM people')).rejects.toThrow(/SELECT ou WITH/)
  })

  it('mata uma consulta infinita no prazo e sobe outro filho na chamada seguinte', async () => {
    const t0 = Date.now()
    await expect(runner.run('WITH x(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM x) SELECT count(*) FROM x', { timeoutMs: 300 })).rejects.toThrow(/cancelada/)
    expect(Date.now() - t0).toBeLessThan(2000)
    const r = await runner.run('SELECT count(*) AS n FROM people')
    expect(r.rows).toEqual([[3]])
  })

  it('erro de SQL volta como mensagem, sem derrubar o filho', async () => {
    await expect(runner.run('SELECT nada FROM people')).rejects.toThrow(/no such column/)
    expect((await runner.run('SELECT 1 AS um')).rows).toEqual([[1]])
  })
})
