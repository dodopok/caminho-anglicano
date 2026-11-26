// Mocked Áudio API for the portal playground (example data, shaped like the
// /api/v1/admin/audio/* contract: types/audio.ts, types/dashboard.ts).
// Served only by layers/ordo/.playground; the site never imports it.
//
//   import { handle, NOW } from './audio.mjs'
//   handle({ method, pathname, query, body, scenario }) -> { status, json } | null
//
// Scenarios: `normal` (audio-01..04, 06) and `provedor-fora` (audio-05).
// Times are fixed: freeze the browser clock at NOW[scenario] (Playwright:
// page.clock.install({ time: new Date(NOW[scenario]) })) and run with
// TZ=America/Sao_Paulo so "Hoje", "termina ~15:40" read like the mockups.

export const NOW = {
  normal: '2026-11-26T15:10:00-03:00',
  'provedor-fora': '2026-11-26T14:05:00-03:00'
}

const TODAY = '2026-11-26'
const PRICE = 0.015
const OFFICES = ['morning', 'midday', 'evening', 'compline']
const OFFICE_SIZE = { morning: 44, midday: 19, evening: 42, compline: 26 }
const CHARS_PER_CLIP = 141

const addDays = (date, days) => {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
const at = (date, hm) => `${date}T${hm}:00.000-03:00`
const cost = (characters, estimated) => ({ usd: Math.round(characters / 1000 * PRICE * 10000) / 10000, usd_per_1k_characters: PRICE, characters, provider: 'fish', provider_name: 'Fish Audio', ...(estimated === undefined ? {} : { estimated }) })
const pct = (ready, missing) => ready + missing ? Math.round(ready / (ready + missing) * 1000) / 10 : null
const hash = text => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

// --- Books --------------------------------------------------------------------
const PRAYER_BOOKS = [
  { id: '1', code: 'loc_2015', name: 'LOC 2015', full_name: 'Livro de Oração Comum 2015 (IEAB)', language: 'pt-BR', jurisdiction: 'IEAB', year: 2015, is_recommended: true, available_offices: OFFICES },
  { id: '2', code: 'loc_2027', name: 'LOC 2027', full_name: 'Livro de Oração Comum 2027', language: 'pt-BR', year: 2027, available_offices: OFFICES },
  { id: '3', code: 'loc_2019_en', name: 'BCP 2019', full_name: 'Book of Common Prayer 2019 (ACNA)', language: 'en', year: 2019, available_offices: OFFICES },
  { id: '4', code: 'loc_1662_en', name: 'BCP 1662', full_name: 'Book of Common Prayer 1662', language: 'en', year: 1662, available_offices: ['morning', 'evening'] },
  { id: '5', code: 'bas_1985_en', name: 'BAS 1985', full_name: 'Book of Alternative Services 1985', language: 'en', year: 1985, available_offices: OFFICES },
  { id: '6', code: 'loc_1979_es', name: 'LOC 1979 (es)', full_name: 'Libro de Oración Común 1979', language: 'es', year: 1979, available_offices: OFFICES }
]
const READINESS_NAMES = {
  loc_2015: 'Livro de Oração Comum 2015',
  loc_2027: 'Livro de Oração Comum 2027',
  loc_2019_en: 'Book of Common Prayer 2019',
  loc_1662_en: 'Book of Common Prayer 1662',
  bas_1985_en: 'Book of Alternative Services 1985',
  loc_1979_es: 'Libro de Oración Común 1979'
}

// Per book: its Bibles with the share of readers and the coverage by office (null = not computed).
const BIBLES = {
  loc_2015: [
    { v: 'nvi', name: 'NVI', full: 'Nova Versão Internacional', def: true, share: 0.66, by: { morning: 100, midday: 100, evening: 100, compline: 100 } },
    { v: 'nvt', name: 'NVT', full: 'Nova Versão Transformadora', share: 0.18, by: { morning: 96, midday: 100, evening: 94, compline: 100 } },
    { v: 'naa', name: 'NAA', full: 'Nova Almeida Atualizada', share: 0.06, by: { morning: 41, midday: 60, evening: 38, compline: 100 } },
    { v: 'ara', name: 'ARA', full: 'Almeida Revista e Atualizada', share: 0.004, by: null },
    { v: 'acf', name: 'ACF', full: 'Almeida Corrigida Fiel', share: 0.002, by: null }
  ],
  loc_2027: [
    { v: 'nvi', name: 'NVI', full: 'Nova Versão Internacional', def: true, share: 0.9, by: { morning: 91, midday: 100, evening: 84, compline: 100 } },
    { v: 'nvt', name: 'NVT', full: 'Nova Versão Transformadora', share: 0.03, by: null },
    { v: 'ara', name: 'ARA', full: 'Almeida Revista e Atualizada', share: 0.01, by: null }
  ],
  loc_2019_en: [
    { v: 'nrsvue', name: 'NRSVUE', full: 'New Revised Standard Version Updated Edition', def: true, share: 0.7, by: { morning: 100, midday: 100, evening: 100, compline: 100 } },
    { v: 'kjv', name: 'KJV', full: 'King James Version', share: 0.22, by: { morning: 78, midday: 100, evening: 71, compline: 100 } },
    { v: 'niv', name: 'NIV', full: 'New International Version', share: 0.02, by: null }
  ],
  loc_1662_en: [
    { v: 'kjv', name: 'KJV', full: 'King James Version', def: true, share: 1, by: { morning: 100, evening: 100 } }
  ],
  bas_1985_en: [
    { v: 'nrsvue', name: 'NRSVUE', full: 'New Revised Standard Version Updated Edition', def: true, share: 0.95, by: { morning: 58, midday: 80, evening: 55, compline: 74 } }
  ],
  loc_1979_es: [
    { v: 'rvr', name: 'RVR', full: 'Reina-Valera Revisada', def: true, share: 1, by: { morning: 0, midday: 0, evening: 0, compline: 0 } }
  ]
}

const officeCount = (office, percentage, days) => {
  const total = OFFICE_SIZE[office] * days
  const missing = Math.round(total * (100 - percentage) / 100)
  return { ready_clips: total - missing, missing_clips: missing, missing_characters: missing * CHARS_PER_CLIP, percentage: pct(total - missing, missing) }
}

const bibleEntry = (code, item, days, readers) => {
  const computed = Boolean(item.by)
  const byOffice = computed ? Object.fromEntries(Object.entries(item.by).map(([office, value]) => [office, officeCount(office, value, days)])) : null
  const totals = computed ? Object.values(byOffice).reduce((sum, value) => ({
    ready_clips: sum.ready_clips + value.ready_clips,
    missing_clips: sum.missing_clips + value.missing_clips,
    missing_characters: sum.missing_characters + value.missing_characters
  }), { ready_clips: 0, missing_clips: 0, missing_characters: 0 }) : null
  if (totals) {
    totals.percentage = pct(totals.ready_clips, totals.missing_clips)
    totals.days_covered = days
  }
  return {
    bible_version: item.v,
    name: item.name,
    full_name: item.full,
    default: Boolean(item.def),
    readers: Math.round(readers * item.share),
    share: item.share,
    featured: Boolean(item.def) || item.share >= 0.05,
    computed,
    computed_at: computed ? at(TODAY, '00:47') : null,
    totals,
    by_office: byOffice
  }
}

const READERS = { loc_2015: 4120, loc_2027: 1890, loc_2019_en: 2210, loc_1662_en: 640, bas_1985_en: 980, loc_1979_es: 310 }

const readiness = days => {
  const books = Object.entries(BIBLES).map(([code, bibles]) => ({
    prayer_book_code: code,
    name: READINESS_NAMES[code],
    language: PRAYER_BOOKS.find(book => book.code === code).language,
    offices: PRAYER_BOOKS.find(book => book.code === code).available_offices,
    readers: READERS[code],
    default_bible_version: bibles.find(item => item.def).v,
    bibles: bibles.map(item => bibleEntry(code, item, days, READERS[code]))
  }))
  return {
    days,
    start_date: TODAY,
    end_date: addDays(TODAY, days - 1),
    computed_at: at(TODAY, '00:52'),
    featured_share: 0.05,
    run: { id: 12, status: 'completed', started_at: at(TODAY, '00:45'), finished_at: at(TODAY, '00:52'), duration_seconds: 430.2, offices_checked: 3248, books: 6, error_message: null },
    // Example: the default Bible of every book, 94% with 312 trechos missing (28 days).
    summary: days === 28
      ? { ready_clips: 4888, missing_clips: 312, missing_characters: 44_100, percentage: 94.0, books: 6, books_complete: 3 }
      : { ready_clips: 1222, missing_clips: 78, missing_characters: 11_000, percentage: 94.0, books: 6, books_complete: 3 },
    books
  }
}

// --- Day by day ----------------------------------------------------------------
// A level per office per day for LOC 2015 × NAA (4 ready … 0 nothing), the
// pattern of audio-02; other book × Bible pairs spread their percentage.
const NAA_PATTERN = {
  morning: '3332213021121302311032121022',
  midday: '4443444443433343343344443434',
  evening: '2221312021120202211020212120',
  compline: '4444444444444444444444444444'
}
const LEVEL_MISSING = { 4: 0, 3: 0.05, 2: 0.4, 1: 0.75, 0: 1 }
const WEEK_TARGETS = [512, 436, 418, 390]

const levelFor = (code, version, office, index) => {
  if (code === 'loc_2015' && version === 'naa') return Number(NAA_PATTERN[office]?.[index % 28] ?? 4)
  const bible = (BIBLES[code] || []).find(item => item.v === version) || (BIBLES[code] || []).find(item => item.def)
  const target = bible?.by?.[office]
  if (target === undefined || target === null) return 4
  if (target >= 100) return 4
  if (target === 0) return 0
  const noise = (hash(`${code}${version}${office}${index}`) % 100) / 100
  const missing = (100 - target) / 100 * 2 * noise
  return missing <= 0.02 ? 4 : missing <= 0.1 ? 3 : missing <= 0.5 ? 2 : missing < 0.95 ? 1 : 0
}

const buildRows = (code, version, start, days, offices) => {
  const rows = []
  for (let index = 0; index < days; index += 1) {
    const date = addDays(start, index)
    const dayIndex = Math.round((new Date(`${date}T12:00:00Z`) - new Date(`${TODAY}T12:00:00Z`)) / 86_400_000)
    offices.forEach(office => {
      const total = OFFICE_SIZE[office] || 20
      const missing = Math.round(total * LEVEL_MISSING[levelFor(code, version, office, dayIndex)])
      rows.push({ date, office_type: office, ready_clips: total - missing, missing_clips: missing, missing_characters: missing * CHARS_PER_CLIP, variant: (hash(`${date}${office}`) % 0xffffff).toString(16).padStart(6, '0') })
    })
  }
  // The receipt of audio-04: 1.904 ready, 1.756 to narrate (512 / 436 / 418 / 390 a week), 248.300 characters.
  if (code === 'loc_2015' && version === 'naa' && start === TODAY && days === 28 && offices.length === 4) {
    WEEK_TARGETS.forEach((target, week) => {
      const slice = rows.filter(row => Math.floor((new Date(`${row.date}T12:00:00Z`) - new Date(`${TODAY}T12:00:00Z`)) / 86_400_000 / 7) === week)
      const have = slice.reduce((sum, row) => sum + row.missing_clips, 0) || 1
      slice.forEach(row => {
        const total = row.ready_clips + row.missing_clips
        row.missing_clips = Math.min(total, Math.round(row.missing_clips * target / have))
      })
      // Rounding and full offices leave a remainder: spread it where there is room.
      let left = target - slice.reduce((sum, row) => sum + row.missing_clips, 0)
      for (let pass = 0; left !== 0 && pass < 50; pass += 1) {
        for (const row of slice) {
          if (!left) break
          // The office's size, not ready + missing: ready is only updated after this loop.
          const total = OFFICE_SIZE[row.office_type] || 20
          if (row.office_type === 'compline') continue
          if (left > 0 && row.missing_clips < total && row.missing_clips > 0) { row.missing_clips += 1; left -= 1 }
          else if (left < 0 && row.missing_clips > 0) { row.missing_clips -= 1; left += 1 }
        }
      }
      slice.forEach(row => {
        const total = OFFICE_SIZE[row.office_type]
        row.ready_clips = total - row.missing_clips
        row.missing_characters = row.missing_clips * CHARS_PER_CLIP
      })
    })
    const ready = rows.reduce((sum, row) => sum + row.ready_clips, 0)
    let extra = ready - 1904
    for (const row of rows) {
      if (!extra) break
      if (row.office_type === 'compline' && row.ready_clips > 0 && extra > 0) { row.ready_clips -= 1; extra -= 1 }
    }
    const characters = rows.reduce((sum, row) => sum + row.missing_characters, 0)
    const last = [...rows].reverse().find(row => row.missing_clips)
    if (last) last.missing_characters += 248_300 - characters
  }
  return rows
}

const sumRows = rows => rows.reduce((sum, row) => ({
  ready_clips: sum.ready_clips + row.ready_clips,
  missing_clips: sum.missing_clips + row.missing_clips,
  missing_characters: sum.missing_characters + row.missing_characters
}), { ready_clips: 0, missing_clips: 0, missing_characters: 0 })

const bySource = (missingClips, missingCharacters, readyClips) => {
  const scripture = Math.round(missingClips * 0.962)
  const texts = Math.round(missingClips * 0.031)
  const collects = Math.max(0, missingClips - scripture - texts)
  const characters = (part, share) => Math.round(missingCharacters * share)
  return [
    { source: 'scripture', ready_clips: Math.round(readyClips * 0.22), missing_clips: scripture, missing_characters: characters(scripture, 0.9657) },
    { source: 'office_texts', ready_clips: Math.round(readyClips * 0.58), missing_clips: texts, missing_characters: characters(texts, 0.0278) },
    { source: 'collects', ready_clips: Math.round(readyClips * 0.05), missing_clips: collects, missing_characters: characters(collects, 0.0065) },
    { source: 'psalms', ready_clips: Math.round(readyClips * 0.15), missing_clips: 0, missing_characters: 0 }
  ].sort((a, b) => b.missing_characters - a.missing_characters)
}

const ITEMS = [
  ['opening_sentence', 'Sentença de abertura do Advento', 'office_texts'],
  ['invitatory', 'Venite', 'office_texts'],
  ['psalm', 'Salmo 122', 'psalms'],
  ['first_reading', 'Isaías 2.1-5', 'scripture'],
  ['canticle_1', 'Te Deum laudamus', 'office_texts'],
  ['second_reading', 'Romanos 13.11-14', 'scripture'],
  ['canticle_2', 'Benedictus Dominus Deus', 'office_texts'],
  ['creed', 'Credo Apostólico', 'office_texts'],
  ['lords_prayer', 'Pai Nosso', 'office_texts'],
  ['collect', 'Coleta do 1º Domingo do Advento', 'collects'],
  ['prayers', 'Orações pelo mundo e pela Igreja', 'office_texts'],
  ['dismissal', 'Bênção final', 'office_texts']
]

const itemsFor = row => {
  let missing = row.missing_clips
  return ITEMS.map(([section, label, source]) => {
    const clips = source === 'scripture' ? 4 : 2
    const lacking = source === 'scripture' ? Math.min(clips, missing) : 0
    missing -= lacking
    return {
      section, label, source,
      status: lacking === 0 ? 'ready' : lacking < clips ? 'partial' : 'missing',
      ready_clips: clips - lacking, missing_clips: lacking, missing_characters: lacking * 245,
      audio_url: lacking < clips ? 'https://example.invalid/clip.mp3' : null
    }
  })
}

const estimate = generation => {
  const code = generation.prayer_book_code
  const book = PRAYER_BOOKS.find(item => item.code === code)
  const version = generation.preferences?.bible_version || (BIBLES[code] || []).find(item => item.def)?.v
  const offices = (generation.offices?.length ? generation.offices : book?.available_offices || OFFICES).filter(office => (book?.available_offices || OFFICES).includes(office))
  const days = Math.min(Math.max(Number(generation.days) || 1, 1), 31)
  const rows = buildRows(code, version, generation.start_date || TODAY, days, offices)
  const totals = sumRows(rows)
  const missing = totals.missing_characters
  const detailRows = rows.map(row => ({
    ...row,
    by_source: bySource(row.missing_clips, row.missing_characters, row.ready_clips),
    ...(generation.include_items ? { items: itemsFor(row) } : {})
  }))
  return {
    estimate: {
      prayer_book_code: code,
      start_date: generation.start_date || TODAY,
      days,
      offices,
      variants: 1,
      provider: { provider: 'fish', model: 's1', voice: 'Ricardo', language: book?.language || 'pt-BR' },
      ...totals,
      estimated_cost: Math.round(missing / 1000 * PRICE * 100) / 100,
      cost: cost(missing),
      by_source: bySource(totals.missing_clips, missing, totals.ready_clips),
      rows: detailRows
    }
  }
}

// The day in the book's calendar (readiness/:book `calendar[].liturgical_day`).
// Example data for the screenshots: Advent 2026 starts on 29 November.
const LITURGICAL_FIXED = {
  '2026-11-29': ['1º Domingo do Advento', 'purple', 'sunday'],
  '2026-11-30': ['Santo André, Apóstolo', 'red', 'feast'],
  '2026-12-06': ['2º Domingo do Advento', 'purple', 'sunday'],
  '2026-12-13': ['3º Domingo do Advento', 'rose', 'sunday'],
  '2026-12-20': ['4º Domingo do Advento', 'purple', 'sunday'],
  '2026-12-21': ['São Tomé, Apóstolo', 'red', 'feast']
}
const WEEKDAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const liturgicalDay = date => {
  const fixed = LITURGICAL_FIXED[date]
  if (fixed) return { name: fixed[0], color: fixed[1], rank: fixed[2] }
  const weekday = WEEKDAY_NAMES[new Date(`${date}T12:00:00`).getDay()]
  if (date < '2026-11-29') return { name: `${weekday} da semana de Cristo Rei`, color: 'green', rank: 'feria' }
  const week = date < '2026-12-06' ? 1 : date < '2026-12-13' ? 2 : date < '2026-12-20' ? 3 : 4
  return { name: `${weekday} da ${week}ª semana do Advento`, color: 'purple', rank: 'feria' }
}

const readinessDetail = (code, version, days) => {
  const book = PRAYER_BOOKS.find(item => item.code === code)
  if (!book) return { status: 404, json: { error: 'Livro não encontrado', code: 'NOT_FOUND' } }
  const bibles = BIBLES[code]
  const chosen = bibles.find(item => item.v === version) || bibles.find(item => item.def)
  const list = bibles.map(item => {
    const entry = bibleEntry(code, item, days, READERS[code])
    return { bible_version: item.v, name: item.name, default: entry.default, featured: entry.featured, computed: entry.computed, percentage: entry.totals?.percentage ?? null, share: item.share }
  })
  const base = { prayer_book_code: code, name: READINESS_NAMES[code], bible_version: chosen.v, bible_name: chosen.name, default: Boolean(chosen.def), days, start_date: TODAY, end_date: addDays(TODAY, days - 1), offices: book.available_offices, bibles: list }
  if (!chosen.by) return { status: 200, json: { ...base, computed: false, computed_at: null, totals: null, cost: null, by_source: [], calendar: [] } }
  const rows = buildRows(code, chosen.v, TODAY, days, book.available_offices)
  let totals = { ...sumRows(rows) }
  if (code === 'loc_2015' && chosen.v === 'naa' && days === 28) totals = { ready_clips: 1904, missing_clips: 1756, missing_characters: 248_300 }
  totals.percentage = pct(totals.ready_clips, totals.missing_clips)
  totals.days_covered = days
  const calendar = []
  rows.forEach(row => {
    let day = calendar.find(item => item.date === row.date)
    if (!day) calendar.push(day = { date: row.date, offices: {}, liturgical_day: liturgicalDay(row.date) })
    day.offices[row.office_type] = { ready_clips: row.ready_clips, missing_clips: row.missing_clips, missing_characters: row.missing_characters, percentage: pct(row.ready_clips, row.missing_clips) }
  })
  return {
    status: 200,
    json: { ...base, computed: true, computed_at: at(TODAY, '00:47'), totals, cost: cost(totals.missing_characters), by_source: bySource(totals.missing_clips, totals.missing_characters, totals.ready_clips), calendar }
  }
}

// --- Runs --------------------------------------------------------------------
const officeParams = (start, days, bible) => ({ prayer_book_code: undefined, start_date: start, days, offices: OFFICES, preferences: bible ? { bible_version: bible } : {} })
const withCost = run => ({ ...run, provider: 'fish', cost: run.cost || (run.generated_characters ? cost(run.generated_characters, false) : null) })

const NORMAL_RUNS = [
  withCost({
    id: 1851, kind: 'generate_office', status: 'running', prayer_book_code: 'loc_2027',
    parameters: { ...officeParams(TODAY, 28, 'nvi'), prayer_book_code: 'loc_2027' },
    total_items: 120, processed_items: 74, progress_percentage: 61.7, generated_clips: 318, skipped_clips: 1210, generated_characters: 41_870,
    waiting_for_provider: false, character_budget: null, actions: { retry: false, cancel: true, try_now: false },
    requested_by: '42', created_at: at(TODAY, '14:21'), started_at: at(TODAY, '14:22'), completed_at: null,
    attempts: [{ event: 'requested', at: at(TODAY, '14:21'), by: '42' }, { event: 'started', at: at(TODAY, '14:22'), attempt: 1, processed_items: 0, total_items: 120 }]
  }),
  withCost({
    id: 1849, kind: 'generate_office', status: 'completed', prayer_book_code: 'loc_2015',
    parameters: { ...officeParams(TODAY, 28, 'nvt'), prayer_book_code: 'loc_2015' },
    total_items: 112, processed_items: 112, progress_percentage: 100, generated_clips: 412, skipped_clips: 1906, generated_characters: 61_230,
    actions: { retry: false, cancel: false, try_now: false },
    requested_by: '42', created_at: at(TODAY, '09:14'), started_at: at(TODAY, '09:14'), completed_at: at(TODAY, '09:52'),
    attempts: [{ event: 'requested', at: at(TODAY, '09:14'), by: '42' }, { event: 'started', at: at(TODAY, '09:14'), attempt: 1 }, { event: 'completed', at: at(TODAY, '09:52'), attempt: 1, processed_items: 112 }]
  }),
  withCost({
    id: 1842, kind: 'generate_office', status: 'failed', prayer_book_code: 'bas_1985_en',
    parameters: { prayer_book_code: 'bas_1985_en', start_date: '2026-11-25', days: 28, offices: OFFICES, preferences: { bible_version: 'nrsvue' } },
    total_items: 112, processed_items: 42, progress_percentage: 37.5, generated_clips: 140, skipped_clips: 380, generated_characters: 19_800,
    error_message: 'Fish Audio recusou o pedido: crédito insuficiente (402).',
    actions: { retry: true, cancel: false, try_now: false },
    requested_by: '42', created_at: at('2026-11-25', '21:40'), started_at: at('2026-11-25', '21:41'), completed_at: at('2026-11-25', '22:52'),
    attempts: [
      { event: 'requested', at: at('2026-11-25', '21:40'), by: '42' },
      { event: 'started', at: at('2026-11-25', '21:41'), attempt: 1, processed_items: 0, total_items: 112 },
      { event: 'waiting', at: at('2026-11-25', '21:58'), attempt: 1, reason: 'provider_outage', provider: 'fish', http_status: '503', next_attempt_at: at('2026-11-25', '22:03'), message: 'Fish Audio fora do ar (503); nova tentativa às 22:03 (tentativa 2 de 4)', processed_items: 31, generated_clips: 98, generated_characters: 14_100 },
      { event: 'resumed', at: at('2026-11-25', '22:03'), attempt: 2, processed_items: 31, total_items: 112 },
      { event: 'failed', at: at('2026-11-25', '22:52'), attempt: 2, reason: 'provider_rejected', provider: 'fish', http_status: '402', message: 'ExternalServiceRejected: insufficient balance', processed_items: 42, generated_clips: 140, generated_characters: 19_800 }
    ]
  }),
  withCost({
    id: 1841, kind: 'regenerate_clip', status: 'completed', prayer_book_code: 'loc_2015',
    parameters: { clip_id: 5521, text: 'Ó Deus, que fizeste deste dia santíssimo resplandecer com a glória da ressurreição', additional_instructions: 'pausa após “Senhor”' },
    total_items: 1, processed_items: 1, generated_clips: 1, generated_characters: 180,
    actions: { retry: false, cancel: false, try_now: false },
    requested_by: '42', created_at: at('2026-11-25', '21:03'), started_at: at('2026-11-25', '21:03'), completed_at: at('2026-11-25', '21:03'), attempts: []
  }),
  withCost({
    id: 1830, kind: 'generate_catalog', status: 'completed', prayer_book_code: 'loc_2019_en',
    parameters: { prayer_book_code: 'loc_2019_en', generate: false, translations: ['kjv'] },
    total_items: 4, processed_items: 4, generated_clips: 0, generated_characters: 0,
    result: { generate: false, clips: 61_220, generated: 0, missing_characters: 3_610_000, sources: ['liturgical_texts', 'collects', 'prayer_book_psalter', 'kjv'] },
    cost: cost(3_610_000, true), actions: { retry: false, cancel: false, try_now: false },
    requested_by: '42', created_at: at('2026-11-23', '16:20'), started_at: at('2026-11-23', '16:20'), completed_at: at('2026-11-23', '16:31'), attempts: []
  }),
  withCost({
    id: 1829, kind: 'generate_office', status: 'completed', prayer_book_code: 'loc_2015',
    parameters: { prayer_book_code: 'loc_2015', start_date: '2026-11-23', days: 28, offices: OFFICES, preferences: { bible_version: 'nvi' } },
    total_items: 112, processed_items: 112, generated_clips: 96, skipped_clips: 3540, generated_characters: 12_400,
    actions: { retry: false, cancel: false, try_now: false },
    requested_by: '42', created_at: at('2026-11-23', '08:00'), started_at: at('2026-11-23', '08:00'), completed_at: at('2026-11-23', '08:54'),
    attempts: [
      { event: 'requested', at: at('2026-11-23', '08:00'), by: '42' },
      { event: 'started', at: at('2026-11-23', '08:00'), attempt: 1 },
      { event: 'waiting', at: at('2026-11-23', '08:10'), attempt: 1, reason: 'provider_outage', http_status: '503', next_attempt_at: at('2026-11-23', '08:15') },
      { event: 'resumed', at: at('2026-11-23', '08:15'), attempt: 2 },
      { event: 'completed', at: at('2026-11-23', '08:54'), attempt: 2, processed_items: 112 }
    ]
  }),
  withCost({
    id: 1828, kind: 'cleanup_clips', status: 'completed', prayer_book_code: null,
    parameters: { profile_status: 'legacy' }, total_items: 2314, processed_items: 2314, result: { deleted_clips: 2314 },
    actions: { retry: false, cancel: false, try_now: false },
    requested_by: '42', created_at: at('2026-11-23', '07:41'), started_at: at('2026-11-23', '07:41'), completed_at: at('2026-11-23', '07:44'), attempts: []
  })
]

const waitingAttempts = (start, processed, clips) => [
  { event: 'requested', at: at(TODAY, start), by: '42' },
  { event: 'started', at: at(TODAY, start), attempt: 1 },
  { event: 'waiting', at: at(TODAY, '13:58'), attempt: 1, reason: 'provider_outage', provider: 'fish', http_status: '503', next_attempt_at: at(TODAY, '14:03') },
  { event: 'resumed', at: at(TODAY, '14:03'), attempt: 2 },
  { event: 'waiting', at: at(TODAY, '14:05'), attempt: 2, reason: 'provider_outage', provider: 'fish', http_status: '503', next_attempt_at: at(TODAY, '14:20'), message: 'Fish Audio fora do ar (503); nova tentativa às 14:20 (tentativa 3 de 4)', processed_items: processed, generated_clips: clips }
]

const DOWN_RUNS = [
  withCost({
    id: 1860, kind: 'generate_office', status: 'queued', prayer_book_code: 'loc_2027',
    parameters: { prayer_book_code: 'loc_2027', start_date: TODAY, days: 28, offices: OFFICES, preferences: { bible_version: 'nvi' } },
    total_items: 120, processed_items: 58, progress_percentage: 48.3, generated_clips: 244, generated_characters: 31_900,
    waiting_for_provider: true, next_attempt_at: at(TODAY, '14:20'),
    error_message: 'Fish Audio fora do ar (503); nova tentativa às 14:20 (tentativa 3 de 4).',
    actions: { retry: false, cancel: true, try_now: true },
    requested_by: '42', created_at: at(TODAY, '13:12'), started_at: at(TODAY, '13:12'), attempts: waitingAttempts('13:12', 58, 244)
  }),
  withCost({
    id: 1861, kind: 'generate_office', status: 'queued', prayer_book_code: 'bas_1985_en',
    parameters: { prayer_book_code: 'bas_1985_en', start_date: TODAY, days: 28, offices: OFFICES, preferences: { bible_version: 'nrsvue' } },
    total_items: 112, processed_items: 13, progress_percentage: 11.6, generated_clips: 51, generated_characters: 7_200,
    waiting_for_provider: true, next_attempt_at: at(TODAY, '14:20'),
    error_message: 'Fish Audio fora do ar (503); nova tentativa às 14:20 (tentativa 3 de 4).',
    actions: { retry: false, cancel: true, try_now: true },
    requested_by: '42', created_at: at(TODAY, '13:40'), started_at: at(TODAY, '13:40'), attempts: waitingAttempts('13:40', 13, 51)
  }),
  ...NORMAL_RUNS.filter(run => run.status !== 'running').map(run => run.id === 1849 ? run : run)
]

const runsFor = scenario => scenario === 'provedor-fora' ? DOWN_RUNS : NORMAL_RUNS

const runsPage = (scenario, query) => {
  let list = [...runsFor(scenario)]
  const counts = {
    all: 57,
    queued: list.filter(run => run.status === 'queued').length,
    running: list.filter(run => run.status === 'running').length,
    waiting: list.filter(run => run.waiting_for_provider).length,
    completed: 52,
    failed: list.filter(run => run.status === 'failed').length,
    cancelled: 3
  }
  const status = query.get('status')
  if (status) {
    const wanted = status.split(',')
    list = list.filter(run => wanted.some(item => item === 'waiting' ? run.waiting_for_provider : item === 'active' ? ['queued', 'running'].includes(run.status) : run.status === item))
  }
  if (query.get('kind')) list = list.filter(run => query.get('kind').split(',').includes(run.kind))
  if (query.get('prayer_book_code')) list = list.filter(run => run.prayer_book_code === query.get('prayer_book_code'))
  if (query.get('before')) list = list.filter(run => run.id < Number(query.get('before')))
  const limit = Number(query.get('limit') || 20)
  const page = list.slice(0, limit)
  const hasMore = !status && !query.get('kind') && !query.get('prayer_book_code') && !query.get('before')
  return {
    operations: page,
    pagination: { limit, count: page.length, has_more: hasMore, next_before: hasMore ? page[page.length - 1]?.id ?? null : null },
    counts
  }
}

// --- Summary and provider ------------------------------------------------------
const summaryFor = scenario => {
  const down = scenario === 'provedor-fora'
  return {
    total_clips: 48_212,
    total_characters: 7_900_000,
    total_duration_seconds: 763_200,
    current_clips: 46_362,
    stale_clips: 1_200,
    legacy_clips: 650,
    silence_clips: 312,
    pending_candidates: 3,
    recent: { window_days: 7, clips: 826, characters: 115_400 },
    by_prayer_book: PRAYER_BOOKS.map((book, index) => ({ prayer_book_code: book.code, clips: 12_000 - index * 1500, sources: 6 })),
    operations: down
      ? { failed_last_24_hours: 1, recent_failures: [{ id: 1858, kind: 'regenerate_clip', prayer_book_code: 'loc_2015', error_message: 'Fish Audio não respondeu em 60 s depois de 6 tentativas.', completed_at: at(TODAY, '13:59') }] }
      : { failed_last_24_hours: 0, recent_failures: [] },
    user_usage: { unique_users: 1_284, used_assets: 4_210, total_accesses: 29_870, by_type: { audio_clip: 18_420, background_track: 9_310, liturgical_text: 2_140 }, top_background_tracks: [] },
    active_operations: down ? 2 : 1,
    profiles: [
      { provider: 'fish', model: 's1', voice: 'Ricardo', language: 'pt-BR', profile_status: 'current', configuration_fingerprint: 'ab12cd34ef56aa', clips: 31_200 },
      { provider: 'fish', model: 's1', voice: 'Daniel', language: 'en', profile_status: 'current', configuration_fingerprint: 'cd34ef56ab12bb', clips: 15_162 }
    ],
    worker_queue: down
      ? { total: 3, by_state: { orphaned: 3 }, purgeable: 3, jobs: [
        { id: 91, active_job_id: 'j91', class_name: 'PrewarmOfficeAudioJob', queue_name: 'audio', created_at: at(TODAY, '13:20'), state: 'orphaned', purgeable: true },
        { id: 92, active_job_id: 'j92', class_name: 'PrewarmOfficeAudioJob', queue_name: 'audio', created_at: at(TODAY, '13:22'), state: 'orphaned', purgeable: true },
        { id: 93, active_job_id: 'j93', class_name: 'RegenerateAudioClipJob', queue_name: 'audio', created_at: at(TODAY, '13:29'), state: 'orphaned', purgeable: true }
      ] }
      : { total: 1, by_state: { running: 1 }, purgeable: 0, jobs: [{ id: 90, active_job_id: 'j90', class_name: 'GenerateOfficeAudioJob', queue_name: 'audio', created_at: at(TODAY, '14:21'), state: 'running', claimed: true, purgeable: false }] }
  }
}

const providerFor = scenario => {
  const profiles = [
    { provider: 'fish', model: 's1', voice: 'Ricardo', language: 'pt-BR', speed: 1.0, configuration_fingerprint: 'ab12cd34ef56aa' },
    { provider: 'fish', model: 's1', voice: 'Daniel', language: 'en', speed: 1.0, configuration_fingerprint: 'cd34ef56ab12bb' }
  ]
  if (scenario === 'provedor-fora') {
    return {
      provider: 'fish', provider_name: 'Fish Audio', status: 'down', checked_at: NOW[scenario],
      last_success_at: at(TODAY, '13:57'), last_clip_at: at(TODAY, '13:57'), down_since: at(TODAY, '13:58'),
      last_error: { at: at(TODAY, '14:05'), kind: 'outage', http_status: '503', message: 'Fish Audio fora do ar (503); nova tentativa às 14:20 (tentativa 3 de 4)', operation_id: 1860 },
      waiting_operations: 2, next_attempt_at: at(TODAY, '14:20'), usd_per_1k_characters: PRICE, profiles
    }
  }
  return {
    provider: 'fish', provider_name: 'Fish Audio', status: 'up', checked_at: NOW[scenario],
    last_success_at: at(TODAY, '15:07'), last_clip_at: at(TODAY, '15:07'), down_since: null, last_error: null,
    waiting_operations: 0, next_attempt_at: null, usd_per_1k_characters: PRICE, profiles
  }
}

const TRANSLATIONS = {
  loc_2015: [['nvi', 'NVI', 'Nova Versão Internacional', true], ['nvt', 'NVT', 'Nova Versão Transformadora', true], ['naa', 'NAA', 'Nova Almeida Atualizada'], ['ara', 'ARA', 'Almeida Revista e Atualizada'], ['acf', 'ACF', 'Almeida Corrigida Fiel']],
  loc_2027: [['nvi', 'NVI', 'Nova Versão Internacional', true], ['nvt', 'NVT', 'Nova Versão Transformadora'], ['ara', 'ARA', 'Almeida Revista e Atualizada']],
  loc_2019_en: [['nrsvue', 'NRSVUE', 'New Revised Standard Version Updated Edition', true], ['kjv', 'KJV', 'King James Version'], ['niv', 'NIV', 'New International Version']],
  loc_1662_en: [['kjv', 'KJV', 'King James Version', true]],
  bas_1985_en: [['nrsvue', 'NRSVUE', 'New Revised Standard Version Updated Edition', true]],
  loc_1979_es: [['rvr', 'RVR', 'Reina-Valera Revisada', true]]
}

// Narration events of the usage telemetry: 6.204 started (5.539 the 30 days before), 3.598 ended.
const narrationSeries = (query) => {
  const start = query.get('start_date')
  const end = query.get('end_date')
  const event = query.get('event')
  const days = Math.round((new Date(`${end}T12:00:00Z`) - new Date(`${start}T12:00:00Z`)) / 86_400_000) + 1
  const before = end < '2026-10-27'
  const total = event === 'narration_ended' ? 3598 : before ? 5539 : 6204
  const weights = Array.from({ length: days }, (_, index) => 1 + (new Date(`${addDays(start, index)}T12:00:00Z`).getUTCDay() === 0 ? 0.6 : 0) + (hash(`${event}${index}`) % 20) / 100)
  const sum = weights.reduce((a, b) => a + b, 0)
  let left = total
  const series = weights.map((weight, index) => {
    const count = index === days - 1 ? left : Math.round(total * weight / sum)
    left -= count
    return { date: addDays(start, index), count, users: Math.round(count * 0.42) }
  })
  return { period: { start_date: start, end_date: end }, filter: { event }, series }
}

const CLIPS = [
  {
    id: 5521, text: 'Ó Deus, que fizeste deste dia santíssimo resplandecer com a glória da ressurreição do Senhor, concede-nos…', kind: 'collect', line_type: 'officiant', provider: 'fish', voice: 'Ricardo', model: 's1', language: 'pt-BR', duration: 9.4, character_count: 180,
    profile_status: 'current', configuration_fingerprint: 'ab12cd34ef56aa', instructions_sha256: 'ff00aa11bb22', created_at: at('2026-11-20', '10:12'), audio_url: 'https://example.invalid/clip.mp3',
    usages: [{ prayer_book_code: 'loc_2015', source_name: 'collects', source_key: 'easter_day' }],
    customization: { instructions: 'pausa após “Senhor”' },
    candidates: [{ id: 901, status: 'pending', duration: 9.8, custom_instructions: 'pausa após “Senhor”', audio_url: 'https://example.invalid/candidate.mp3', created_at: at('2026-11-25', '21:03') }]
  },
  {
    id: 4410, text: 'Bendito sejas, Senhor, Deus de nossos pais: louvado e exaltado para sempre.', kind: 'canticle', line_type: 'congregation', provider: 'fish', voice: 'Ricardo', model: 's1', language: 'pt-BR', duration: 5.2, character_count: 74,
    profile_status: 'stale', configuration_fingerprint: '99aa88bb77cc', created_at: at('2026-10-02', '08:40'), audio_url: 'https://example.invalid/clip2.mp3',
    usages: [{ prayer_book_code: 'loc_2015', source_name: 'benedictus_es_domine' }, { prayer_book_code: 'loc_2027', source_name: 'benedictus_es_domine' }], candidates: []
  }
]

// --- Router --------------------------------------------------------------------
const ok = json => ({ status: 200, json })

export function handle ({ method = 'GET', pathname, query, body, scenario = 'normal' }) {
  const params = query instanceof URLSearchParams ? query : new URLSearchParams(query || '')
  const base = '/api/v1/admin/audio'

  if (method === 'GET' && pathname === '/api/v1/prayer_books') return ok({ data: PRAYER_BOOKS })
  if (method === 'GET' && pathname === '/api/v1/admin/usage/series' && (params.get('event') || '').startsWith('narration_')) return ok(narrationSeries(params))

  if (!pathname.startsWith(base)) return null
  const path = pathname.slice(base.length)

  if (method === 'GET' && path === '/summary') return ok(summaryFor(scenario))
  if (method === 'GET' && path === '/provider') return ok(providerFor(scenario))
  if (method === 'GET' && path === '/readiness') {
    const days = Number(params.get('days') || 28)
    if (![7, 28].includes(days)) return { status: 422, json: { error: 'days deve ser 7 ou 28', code: 'INVALID_AUDIO_READINESS' } }
    return ok(readiness(days))
  }
  const detail = path.match(/^\/readiness\/([^/]+)$/)
  if (method === 'GET' && detail) return readinessDetail(decodeURIComponent(detail[1]), params.get('bible_version'), Number(params.get('days') || 28))

  if (method === 'GET' && path === '/operations') return ok(runsPage(scenario, params))
  const one = path.match(/^\/operations\/(\d+)$/)
  if (method === 'GET' && one) {
    const run = runsFor(scenario).find(item => item.id === Number(one[1]))
    return run ? ok({ operation: run }) : { status: 404, json: { error: 'Não encontrada', code: 'NOT_FOUND' } }
  }
  const action = path.match(/^\/operations\/(\d+)\/(retry|cancel|try_now)$/)
  if (method === 'POST' && action) {
    const run = runsFor(scenario).find(item => item.id === Number(action[1]))
    if (!run) return { status: 404, json: { error: 'Não encontrada', code: 'NOT_FOUND' } }
    const status = action[2] === 'cancel' ? 'cancelled' : 'queued'
    return { status: action[2] === 'cancel' ? 200 : 202, json: { operation: { ...run, status, next_attempt_at: action[2] === 'try_now' ? NOW[scenario] : run.next_attempt_at, actions: { retry: status === 'cancelled', cancel: status === 'queued', try_now: false } }, cancel_pending: false } }
  }
  if (method === 'POST' && path === '/operations/acknowledge_failures') return ok({ acknowledged: 1 })
  if (method === 'POST' && path === '/worker_queue/purge') return ok({ scope: body?.scope || 'dead', purged_jobs: 3, cancelled_operations: 0 })
  if (method === 'GET' && path === '/worker_queue') return ok(summaryFor(scenario).worker_queue)

  if (method === 'POST' && path === '/generations/estimate') return ok(estimate(body?.generation || {}))
  if (method === 'POST' && path === '/generations') {
    const generation = body?.generation || {}
    return { status: 202, json: { operation: { id: 1870, kind: 'generate_office', status: 'queued', prayer_book_code: generation.prayer_book_code, parameters: generation, character_budget: generation.character_budget ?? null, created_at: NOW[scenario], attempts: [{ event: 'requested', at: NOW[scenario], by: '42' }], actions: { retry: false, cancel: true, try_now: false } } } }
  }
  if (method === 'POST' && path === '/catalog/generations') {
    const catalog = body?.catalog || {}
    return { status: 202, json: { operation: { id: 1871, kind: 'generate_catalog', status: 'queued', prayer_book_code: catalog.prayer_book_code, parameters: { ...catalog, generate: !catalog.dry_run }, created_at: NOW[scenario], attempts: [] } } }
  }
  if (method === 'GET' && path === '/catalog/translations') {
    const code = params.get('prayer_book_code')
    return ok({ prayer_book_code: code, translations: [...(TRANSLATIONS[code] || []).map(([c, name, full, recommended]) => ({ code: c, name, full_name: full, language: PRAYER_BOOKS.find(book => book.code === code)?.language, is_recommended: Boolean(recommended), kind: 'bible' })), { code: `${code}_psalter`, name: 'Saltério do livro', full_name: 'Saltério do livro', kind: 'psalter' }] })
  }
  if (method === 'GET' && path === '/clips') return ok({ clips: CLIPS, pagination: { total: CLIPS.length, limit: 20, offset: 0, count: CLIPS.length } })
  const clipUrl = path.match(/^\/clips\/(\d+)\/url$/)
  if (method === 'GET' && clipUrl) return ok({ id: Number(clipUrl[1]), url: 'https://example.invalid/clip.mp3', expires_in: 3600 })
  if (method === 'POST' && path === '/cleanup/preview') return ok({ total_clips: 650, total_characters: 61_000, total_duration_seconds: 3_900 })
  return null
}
