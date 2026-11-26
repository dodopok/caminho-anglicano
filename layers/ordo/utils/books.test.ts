import { describe, expect, it } from 'vitest'
import {
  booksCsv,
  booksSummary,
  buildBookRows,
  chartLines,
  coverSrc,
  documentRows,
  filterBooks,
  groupBooks,
  missingForLaunch,
  narrationPill,
  niceMax,
  parseBooksQuery,
  parseCompare,
  prayingShare,
  retentionFor,
  sortBooks,
  switchBars,
  toggleCompare,
  type BookRow,
  type CatalogBook
} from './books'
import type { AdminPrayerBook, AdminPrayerBooksResponse } from '../types/books'
import type { DashboardData } from '../types/dashboard'

const adminBook = (code: string, extra: Partial<AdminPrayerBook> = {}): AdminPrayerBook => ({
  code,
  name: code.toUpperCase(),
  language: 'pt-BR',
  year: 2015,
  thumbnail_url: `https://caminhoanglicano.com.br/locs/thumbs/${code}.png`,
  pdf: null,
  documents_count: 0,
  narration_pct: 50,
  flag: null,
  metrics: { users_current: 10, onboarding_users: 20, new_users: 5, praying_users: 8, completions: 40, d7_rate: 30, d7_eligible: 40 },
  previous: { new_users: 4, praying_users: 8, completions: 30 },
  spark: [1, 2, 3],
  ...extra
})

const admin = (books: AdminPrayerBook[]): AdminPrayerBooksResponse => ({ prayer_books: books })

const row = (extra: Partial<BookRow>): BookRow => ({
  ...buildBookRows({ admin: admin([adminBook('x')]) })[0],
  ...extra
})

describe('o endereço da aba Livros', () => {
  it('lê vista, livro, comparação, ordem e filtros da URL e ignora o que não vale', () => {
    expect(parseBooksQuery({ aba: 'livros' })).toEqual({
      view: 'galeria',
      book: null,
      compare: [],
      sort: 'rezaram',
      filters: { search: '', language: '', premium: false, prerelease: false }
    })
    expect(parseBooksQuery({ vista: 'ranking', livro: 'loc_2015', comparar: 'loc_2015,locb_2008', ordem: 'voz', busca: 'ieab', idioma: 'pt-BR', ordomais: '1', prelancamento: '1' })).toEqual({
      view: 'ranking',
      book: 'loc_2015',
      compare: ['loc_2015', 'locb_2008'],
      sort: 'voz',
      filters: { search: 'ieab', language: 'pt-BR', premium: true, prerelease: true }
    })
    const odd = parseBooksQuery({ vista: 'mosaico', livro: '../../etc', ordem: 'popular' })
    expect(odd.view).toBe('galeria')
    expect(odd.book).toBeNull()
    expect(odd.sort).toBe('rezaram')
  })

  it('compara no máximo quatro livros, sem repetir', () => {
    expect(parseCompare('a,b,a,c,<x>,d,e')).toEqual(['a', 'b', 'c', 'd'])
    expect(toggleCompare(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
    expect(toggleCompare(['a', 'b'], 'a')).toEqual(['b'])
    expect(toggleCompare(['a', 'b', 'c', 'd'], 'e')).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('as linhas de cada livro', () => {
  it('prefere o endpoint novo, inclusive para livros em pré-lançamento', () => {
    const rows = buildBookRows({
      admin: admin([adminBook('loc_2015', { is_default: true }), adminBook('loc_2027', { release_gated: true, flag: { key: 'prayer_book_loc_2027', rule: 'off', users_count: 6 } })]),
      // The other sources disagree; the admin numbers win.
      readiness: { books: [{ prayer_book_code: 'loc_2015', name: 'x', offices: [], readers: 999, bibles: [] }] },
      dashboard: { onboarding: { choices: { prayer_books: { loc_2015: 77 } } } }
    })
    expect(rows.map(item => item.code)).toEqual(['loc_2015', 'loc_2027'])
    expect(rows[0]).toMatchObject({ usingToday: 10, newUsers: 5, praying: 8, isDefault: true, narration: 50, cover: '/locs/thumbs/loc_2015.webp', pdf: null, documents: 0, flag: null })
    expect(rows[1]).toMatchObject({ gated: true, flag: { key: 'prayer_book_loc_2027', users_count: 6 } })
  })

  it('sem o endpoint novo, usa o catálogo, os leitores do Áudio e o painel, e deixa vazio o que ninguém conta', () => {
    const catalog: CatalogBook[] = [
      { id: '1', code: 'loc_2015', name: 'LOC 2015', language: 'pt-BR', pdf_url: 'https://api/pdf', thumbnail_url: null },
      { id: '2', code: 'bas_1985_en', name: 'BAS 1985', language: 'en' }
    ]
    const dashboard: DashboardData = {
      onboarding: { choices: { prayer_books: { loc_2015: 40 } } },
      completions: { by_prayer_book: [{ code: 'loc_2015', name: 'LOC', completions: 300 }] },
      prayer_books: { usage_by_prayer_book: [{ code: 'loc_2015', name: 'LOC', users: 900 }] },
      shared_offices: { by_prayer_book: { loc_2015: 12 } },
      retention: { by_prayer_book: [{ prayer_book_code: 'loc_2015', users: 50, d7: { users: 10, eligible: 40, rate: 20, eligible_rate: 25 } }] }
    }
    const rows = buildBookRows({
      catalog,
      readiness: { books: [{ prayer_book_code: 'loc_2015', name: 'x', offices: ['morning'], readers: 4120, bibles: [{ bible_version: 'nvi', name: 'NVI', default: true, featured: true, computed: true, totals: { ready_clips: 9, missing_clips: 1, missing_characters: 10, percentage: 90 } }] }] },
      dashboard,
      previous: { onboarding: { choices: { prayer_books: {} } } }
    })
    const [ieab, bas] = rows
    expect(ieab).toMatchObject({ usingToday: 4120, newUsers: 40, newUsersPrevious: 0, completions: 300, chosenAtStart: 900, shares: 12, d7: 25, d7Eligible: 40, narration: 90, pdfUrl: 'https://api/pdf' })
    // Nobody counts these before the admin endpoint: empty, never zero.
    expect(ieab).toMatchObject({ praying: null, spark: null, pdf: undefined, documents: undefined, flag: undefined, gated: false })
    // A book missing from a map that loaded counted nothing; a section that did not load says nothing.
    expect(bas).toMatchObject({ usingToday: null, newUsers: 0, completions: 0, d7: null, weeklyPrayers: null })
  })

  it('diz o idioma quando dois livros têm o mesmo nome', () => {
    const rows = buildBookRows({ admin: admin([adminBook('a', { name: 'ACNA - 2019', language: 'pt-BR' }), adminBook('b', { name: 'ACNA - 2019', language: 'en' }), adminBook('c', { name: 'BCP 1662' })]) })
    expect(rows.map(item => item.label)).toEqual(['ACNA - 2019 (pt-BR)', 'ACNA - 2019 (en)', 'BCP 1662'])
  })

  it('lê as capas do próprio site em WebP e recusa endereços estranhos', () => {
    expect(coverSrc('https://caminhoanglicano.com.br/locs/thumbs/loc-2015.png')).toBe('/locs/thumbs/loc-2015.webp')
    expect(coverSrc('https://www.caminhoanglicano.com.br/locs/thumbs/bas_1985_en.jpg')).toBe('/locs/thumbs/bas_1985_en.webp')
    expect(coverSrc('https://cdn.example.org/capa.png')).toBe('https://cdn.example.org/capa.png')
    expect(coverSrc('javascript:alert(1)')).toBeNull()
    expect(coverSrc(null)).toBeNull()
  })
})

describe('galeria e ranking', () => {
  const rows = buildBookRows({
    admin: admin([
      adminBook('loc_2015', { name: 'IEAB - 2015', language: 'pt-BR', metrics: { users_current: 600, new_users: 50, praying_users: 300, completions: 900 }, previous: { new_users: 40 }, narration_pct: 100 }),
      adminBook('loc_1991_pt', { name: 'Igreja Lusitana - 1991', language: 'pt-PT', metrics: { users_current: 100, new_users: 30, praying_users: 50, completions: 100 }, previous: { new_users: 10 }, narration_pct: 40, premium_required: true }),
      adminBook('loc_2019_en', { name: 'ACNA - 2019', language: 'en', metrics: { users_current: 200, new_users: 20, praying_users: 100, completions: 500 }, previous: { new_users: 20 }, narration_pct: 0 }),
      adminBook('loc_2019_es', { name: 'ACNA - 2019', language: 'es', metrics: { users_current: 50, new_users: 0, praying_users: 0, completions: 0 }, previous: { new_users: 0 }, narration_pct: null }),
      adminBook('loc_2027', { name: 'REB - 2027', language: 'pt-BR', release_gated: true, metrics: { users_current: 6, new_users: 0, praying_users: 6, completions: 84 }, previous: null, narration_pct: 91 })
    ])
  })

  it('agrupa por idioma e põe primeiro quem mais rezou', () => {
    const groups = groupBooks(rows)
    expect(groups.map(group => group.id)).toEqual(['pt', 'en', 'rest'])
    expect(groups[0].books.map(item => item.code)).toEqual(['loc_2015', 'loc_1991_pt', 'loc_2027'])
    expect(groups[0].note).toBe('pt-BR e pt-PT · quem mais rezou primeiro')
    expect(groups[2].note).toBe('es · quem mais rezou primeiro')
  })

  it('antes do endpoint novo, ordena por quem usa hoje', () => {
    const withoutPraying = rows.map(item => ({ ...item, praying: null }))
    expect(groupBooks(withoutPraying)[0].note).toBe('pt-BR e pt-PT · quem mais usa hoje primeiro')
  })

  it('filtra por busca sem acento, idioma, Ordo+ e pré-lançamento', () => {
    const base = { search: '', language: '', premium: false, prerelease: false }
    expect(filterBooks(rows, { ...base, search: 'lusitana' }).map(item => item.code)).toEqual(['loc_1991_pt'])
    expect(filterBooks(rows, { ...base, search: 'LOC_2019' }).map(item => item.code)).toEqual(['loc_2019_en', 'loc_2019_es'])
    expect(filterBooks(rows, { ...base, language: 'en' }).map(item => item.code)).toEqual(['loc_2019_en'])
    expect(filterBooks(rows, { ...base, premium: true }).map(item => item.code)).toEqual(['loc_1991_pt'])
    expect(filterBooks(rows, { ...base, prerelease: true }).map(item => item.code)).toEqual(['loc_2027'])
  })

  it('ordena o ranking por qualquer número, com os vazios no fim', () => {
    expect(sortBooks(rows, 'usam').map(item => item.code)).toEqual(['loc_2015', 'loc_2019_en', 'loc_1991_pt', 'loc_2019_es', 'loc_2027'])
    expect(sortBooks(rows, 'voz').map(item => item.code)).toEqual(['loc_2019_en', 'loc_1991_pt', 'loc_2027', 'loc_2015', 'loc_2019_es'])
    expect(sortBooks(rows, 'oficios')[0].code).toBe('loc_2027')
  })

  it('escreve o resumo só com os dados', () => {
    const summary = booksSummary(rows, 'nos últimos 30 dias')
    expect(summary.headline).toBe('5 livros em 4 idiomas. Mais da metade de quem tem um livro escolhido usa o IEAB - 2015.')
    const text = summary.detail.map(part => part.text).join('')
    expect(text).toBe('Nos últimos 30 dias, 100 pessoas chegaram e escolheram um livro. O Igreja Lusitana - 1991 foi o que mais cresceu (+200%). O REB - 2027 segue em pré-lançamento. 2 livros ainda têm menos de 60% de voz.')
    expect(summary.detail.filter(part => part.strong).map(part => part.text)).toEqual(['100 pessoas', 'Igreja Lusitana - 1991', 'REB - 2027', '2 livros'])
  })

  it('não inventa crescimento nem voz quando não há base', () => {
    const quiet = rows.map(item => ({ ...item, newUsersPrevious: null, narration: null, gated: false, newUsers: null }))
    expect(booksSummary(quiet, 'nos últimos 7 dias').detail).toEqual([])
  })

  it('divide quem reza entre os cinco maiores e os outros', () => {
    const many = [...rows, ...['a', 'b'].map(code => row({ code, label: code, praying: 10 }))]
    const share = prayingShare(many)!
    expect(share).toHaveLength(6)
    expect(share[0]).toMatchObject({ code: 'loc_2015', label: 'IEAB - 2015' })
    expect(share[5].label).toBe('Outros 1')
    expect(Math.round(share.reduce((total, item) => total + item.share, 0))).toBe(100)
    expect(prayingShare(rows.map(item => ({ ...item, praying: null })))).toBeNull()
  })

  it('exporta o ranking em CSV só com números de livros', () => {
    const csv = booksCsv(sortBooks(rows, 'rezaram'))
    const [header, first] = csv.split('\n')
    expect(header).toBe('posicao,codigo,livro,idioma,usam_hoje,chegaram,rezaram,oficios,oficios_por_pessoa,voltam_7_dias_pct,voz_pct,pdf,documentos,pre_lancamento,ordo_mais')
    // No 7-day return measured for it: an empty cell, not 0.
    expect(first).toBe('1,loc_2015,IEAB - 2015,pt-BR,600,50,300,900,3,,100,nao,0,nao,nao')
    expect(csv).not.toMatch(/@/)
  })

  it('desenha as linhas da comparação em números ou em índice', () => {
    const { lines, max } = chartLines([{ code: 'a', values: [100, 200, null, 400] }, { code: 'b', values: [10, 20, 30, 40] }])
    expect(max).toBe(400)
    expect(lines[0].path.startsWith('M0.0,190.0')).toBe(true)
    // A day without data breaks the line instead of dropping to zero.
    expect(lines[0].path.match(/M/g)).toHaveLength(2)
    expect(lines[0].last).toBe(400)
    const indexed = chartLines([{ code: 'a', values: [100, 200] }, { code: 'b', values: [10, 40] }], { index: true })
    expect(indexed.lines[1].values).toEqual([100, 400])
    expect(niceMax(1180)).toBe(1200)
    expect(niceMax(37)).toBe(40)
  })

  it('dá o selo de voz pelo que falta', () => {
    expect(narrationPill(100).tone).toBe('op-pill--ok')
    expect(narrationPill(99.6)).toEqual({ text: 'Voz 99%', tone: 'op-pill--info' })
    expect(narrationPill(0).text).toBe('Sem voz')
    expect(narrationPill(null).text).toBe('Voz —')
  })
})

describe('a página de um livro', () => {
  it('mede o retorno pelo endpoint novo e avisa quando há poucas pessoas', () => {
    const bars = retentionFor({ book: { users: 6, d1: { users: 5, eligible: 6, rate: 83.3 }, d7: { users: 5, eligible: 6, rate: 83.3 }, d30: { users: 0, eligible: 0, rate: null } }, all: { d7: { users: 400, eligible: 1000, rate: 40 } } }, null, 'loc_2027')!
    expect(bars.tooFew).toBe(true)
    expect(bars.rows.map(item => item.rate)).toEqual([83.3, 83.3, null])
    expect(bars.rows[1].overall).toBe(40)
  })

  it('sem o endpoint novo, usa retention.by_prayer_book (só os 8 maiores) e nada para os outros', () => {
    const dashboard: DashboardData = {
      retention: {
        by_prayer_book: [
          { prayer_book_code: 'loc_2015', users: 300, d7: { users: 60, eligible: 200, rate: 20, eligible_rate: 30 } },
          { prayer_book_code: 'loc_2019_en', users: 100, d7: { users: 40, eligible: 100, rate: 40, eligible_rate: 40 } }
        ]
      }
    }
    const bars = retentionFor(null, dashboard, 'loc_2015')!
    expect(bars.tooFew).toBe(false)
    expect(bars.rows[1].rate).toBe(30)
    expect(bars.rows[1].overall).toBeCloseTo(100 / 300 * 100)
    expect(retentionFor(null, dashboard, 'loc_1549')).toBeNull()
  })

  it('resume as trocas em três livros e "Outros", e nomeia quem não tem primeiro acesso', () => {
    const bars = switchBars([
      { code: 'a', name: 'A', users: 400 },
      { code: null, name: null, users: 20 },
      { code: 'b', name: null, users: 200 },
      { code: 'c', name: 'C', users: 100 },
      { code: 'd', name: 'D', users: 50 }
    ], { b: 'Livro B' }, 3, 770)
    expect(bars.rows.map(item => [item.label, item.users])).toEqual([['A', 400], ['Livro B', 200], ['C', 100], ['Outros', 70]])
    expect(bars.rows[0].width).toBe(100)
    expect(bars.total).toBe(770)
    expect(switchBars([{ code: null, users: 5 }]).rows[0].label).toBe('Sem primeiro acesso')
  })

  it('põe os documentos na ordem do CMS, com as aberturas de cada um', () => {
    const docs = documentRows(
      [{ title: 'Catecismo', slug: 'catecismo', order: 2 }, { title: 'Artigos', slug: 'artigos', order: 1 }],
      [{ content_kind: 'document', content_slug: 'catecismo', event: 'document_opened', count: 12, user_days: 9 }, { content_kind: 'saint', content_slug: 'artigos', event: 'post_opened', count: 99, user_days: 9 }]
    )
    expect(docs).toEqual([{ title: 'Artigos', slug: 'artigos', opens: 0 }, { title: 'Catecismo', slug: 'catecismo', opens: 12 }])
    // Without the telemetry the opens are unknown, not zero.
    expect(documentRows([{ title: 'A', slug: 'a' }], null)[0].opens).toBeNull()
  })

  it('diz o que falta para lançar um livro em pré-lançamento', () => {
    const missing = missingForLaunch(row({ gated: true, narration: 91, pdf: null }), 0)
    expect(missing.map(parts => parts.map(part => part.text).join(''))).toEqual(['9% da narração das próximas 4 semanas', 'o PDF', 'os documentos'])
    expect(missingForLaunch(row({ gated: true, narration: 100, pdf: { published: true } }), 3)).toEqual([])
  })
})
