// Mocked answers for the Livros tab, shaped like notes/painel-flags-livros/
// API-livros.md (types/books.ts): GET /api/v1/admin/prayer_books and
// /:code, the CMS documents of a book, and the PDF and document opens by book.
// Books, codes, languages, years and covers are the real catalog's; every
// number is an example (they follow the approved mockups). Today is
// 2026-11-26. Served only by layers/ordo/.playground; the site never imports it.
//
//   handle({ method, pathname, query, scenario }) → { status, json } | null
//   cms(pathname)                                 → { status, json } | null
//
// Scenarios:
//   normal    the admin endpoints are deployed (livros-01..06)
//   sem-api   they answer 404, as on an API from before them: the tab falls
//             back to the public catalog, Áudio's coverage and the dashboard

const TODAY = '2026-11-26'
const DAY = 86_400_000
const parse = value => new Date(`${value}T12:00:00Z`)
const iso = date => date.toISOString().slice(0, 10)
const addDays = (value, n) => iso(new Date(parse(value).getTime() + n * DAY))
const daysBetween = (start, end) => Math.round((parse(end) - parse(start)) / DAY) + 1
const datesIn = (start, end) => {
  const out = []
  for (let day = start; day <= end && out.length < 400; day = addDays(day, 1)) out.push(day)
  return out
}
const noise = (seed, index) => {
  const x = Math.sin(seed * 9301 + index * 49297) * 233280
  return x - Math.floor(x) - 0.5
}
const thumb = name => `https://caminhoanglicano.com.br/locs/thumbs/${name}.png`

const ALL_OFFICES = ['morning', 'midday', 'evening', 'compline']

// [code, name, jurisdiction, language, year, thumb, flags, using, new (30 d), Δ new %, praying, offices, narration, d7, docs, pdf pages]
// flags: r recommended, p Ordo+, g pre-release, d the app's default
const BOOKS = [
  ['loc_2015', 'IEAB - 2015', 'Igreja Episcopal Anglicana do Brasil', 'pt-BR', 2015, 'loc-2015', 'rd', 6840, 412, 12, 2611, 17980, 100, 41, 6, 412],
  ['locb_2008', 'LOCb - 2008', 'Diocese do Recife', 'pt-BR', 2008, 'locb-2008', '', 1120, 64, 3, 402, 2540, 96, 38, 4, 388],
  ['loc_1662', 'IARB - 1662', 'Igreja Anglicana Reformada do Brasil', 'pt-BR', 1662, 'loc-1662', '', 540, 38, -6, 207, 1310, 88, 36, 5, 0],
  ['loc_2021', 'IAB - 2021', 'Igreja Anglicana no Brasil', 'pt-BR', 2021, 'loc-2021', '', 420, 33, 9, 151, 940, 64, 33, 3, 0],
  ['loc_2019', 'ACNA - 2019', 'Anglican Church in North America', 'pt-BR', 2019, 'loc-2019', 'p', 380, 29, 15, 160, 1080, 100, 47, 4, 0],
  ['loc_1987', 'IECB - 1987', 'Igreja Episcopal Carismática do Brasil', 'pt-BR', 1987, 'loc-1987', '', 310, 21, 0, 118, 690, 72, 31, 2, 296],
  ['loc_1928_pt', 'LOC - 1928 (Português)', 'Igreja Episcopal dos EUA', 'pt-BR', 1928, 'loc-1928', '', 260, 17, -11, 88, 520, 40, 29, 3, 0],
  ['loc_1549', 'LOC - 1549', 'Igreja da Inglaterra', 'pt-BR', 1549, 'loc-1549', 'p', 95, 6, 20, 31, 170, 0, 26, 1, 0],
  ['awrv_2025_pt', 'LOC Proposto - 2025', 'Apologia Anglicana', 'pt-BR', 2025, 'awrv_2025_en', 'p', 44, 9, 80, 19, 98, 0, 24, 0, 0],
  ['loc_2027', 'REB - 2027', 'Rede Episcopal Brasileira', 'pt-BR', 2027, 'loc-2027', 'g', 6, 0, 0, 6, 84, 91, null, 0, 0],
  ['loc_1991_pt', 'Igreja Lusitana - 1991', 'Igreja Lusitana', 'pt-PT', 1991, 'loc-1991-pt', 'r', 340, 26, 11, 128, 820, 78, 37, 3, 0],
  ['loc_2019_en', 'ACNA - 2019', 'Anglican Church in North America', 'en', 2019, 'loc-2019', '', 1480, 188, 24, 610, 4120, 100, 44, 5, 822],
  ['loc_1662_en', 'BCP 1662', 'Church of England', 'en', 1662, 'bcp-1662', '', 690, 71, 5, 266, 1720, 100, 39, 6, 704],
  ['loc_1979_en', 'TEC - 1979', 'The Episcopal Church', 'en', 1979, 'loc-1979', '', 520, 52, -3, 214, 1390, 84, 35, 3, 1001],
  ['loc_1928_en', 'TEC - 1928', 'The Episcopal Church', 'en', 1928, 'loc-1928-en', '', 240, 22, 4, 96, 610, 76, 34, 3, 611],
  ['cw_2005_en', 'Common Worship 2005', 'Church of England', 'en', 2005, 'cw_2005_en', '', 210, 24, 14, 80, 470, 58, 32, 2, 0],
  ['rec_2005_en', 'REC - 2005', 'Reformed Episcopal Church', 'en', 2005, 'rec-2005-en', '', 150, 13, -8, 60, 380, 66, 30, 4, 640],
  ['dwdo_2021', 'Divine Worship - 2021', 'Personal Ordinariates', 'en', 2021, 'dwdo-2021', '', 130, 15, 7, 52, 330, 30, 31, 1, 0],
  ['awrv_2025_en', 'Proposed BCP - 2025', 'Apologia Anglicana', 'en', 2025, 'awrv_2025_en', '', 70, 11, 38, 27, 150, 0, 27, 0, 0],
  ['loc_1549_en', 'BCP 1549', 'Church of England', 'en', 1549, 'loc_1549_en', 'p', 60, 4, 0, 21, 110, 0, 25, 2, 0],
  ['loc_1984_en', 'Church in Wales - 1984', 'The Church in Wales', 'en', 1984, 'welsh-1984', '', 45, 3, -25, 14, 70, 12, 22, 1, 410],
  ['loc_1962_en', 'BCP 1962 (Canada)', 'Anglican Church of Canada', 'en-CA', 1962, 'loc_1962_en', '', 180, 14, 2, 70, 440, 70, 33, 3, 760],
  ['bas_1985_en', 'BAS 1985 (Canada)', 'Anglican Church of Canada', 'en-CA', 1985, 'bas_1985_en', '', 160, 12, -4, 63, 410, 64, 32, 2, 932],
  ['loc_1928_eng', 'BCP 1928 (England)', 'Church of England (proposto)', 'en-GB', 1928, 'loc_1928_eng', '', 55, 5, 0, 19, 100, 20, 23, 1, 690],
  ['loc_2019_es', 'ACNA - 2019', 'Anglican Church in North America', 'es', 2019, 'loc-2019', '', 230, 31, 19, 92, 560, 82, 34, 3, 790],
  ['loc_1979_es', 'TEC - 1979 (Español)', 'The Episcopal Church', 'es', 1979, 'loc-1979', '', 120, 15, 6, 44, 260, 0, 28, 2, 980],
  ['loc_1984_cy', 'Yr Eglwys yng Nghymru - 1984', 'Yr Eglwys yng Nghymru', 'cy', 1984, 'welsh-1984', '', 12, 1, 0, 4, 22, 0, 20, 1, 0]
].map(([code, name, jurisdiction, language, year, cover, flags, using, newUsers, delta, praying, completions, narration, d7, docs, pages], index) => ({
  code, name, jurisdiction, language, year, cover, using, newUsers, delta, praying, completions, narration, d7, docs, pages,
  order: index + 1,
  recommended: flags.includes('r'),
  premium: flags.includes('p'),
  gated: flags.includes('g'),
  isDefault: flags.includes('d'),
  seed: index + 1
}))

const DESCRIPTIONS = {
  loc_2015: 'O Livro de Oração Comum da Igreja Episcopal Anglicana do Brasil, com o Ofício Diário, as coletas e o lecionário dominical e diário.',
  loc_2027: 'Livro de Oração Comum da Rede Episcopal Brasileira (2027): Ofício Diário, Ofício para Famílias e Indivíduos e o Lecionário Comum Revisado Expandido.'
}

// Everyone in the 30-day window: 1.136 arrived (+9,1%), 4.812 prayed (+9%).
const TOTALS = { new_users: 1136, new_previous: 1041, praying: 4812, praying_previous: 4415, users_current: 14707, onboarding_users: 15020 }

const windowOf = (params) => {
  const end = params.get('end_date') || TODAY
  const start = params.get('start_date') || addDays(end, -29)
  return { start_date: start, end_date: end }
}
const previousOf = (period) => {
  const days = daysBetween(period.start_date, period.end_date)
  const end = addDays(period.start_date, -1)
  return { start_date: addDays(end, -(days - 1)), end_date: end }
}

// A window longer or shorter than 30 days scales the period numbers; people
// grow slower than counts, since the same people come back.
const scaleFor = period => daysBetween(period.start_date, period.end_date) / 30
const people = (value, scale) => Math.round(value * Math.min(1, scale) ** 0.6 * Math.max(1, scale) ** 0.35)
const counted = (value, scale) => Math.round(value * scale)
const before = (value, delta) => Math.round(value / (1 + delta / 100))

const metricsFor = (book, period, previous = false) => {
  const scale = scaleFor(period)
  const newUsers = counted(book.newUsers, scale)
  const praying = people(book.praying, scale)
  const completions = counted(book.completions, scale)
  if (!previous) {
    return {
      users_current: book.using,
      onboarding_users: onboardingUsers(book),
      new_users: newUsers,
      praying_users: praying,
      completions,
      d7_rate: book.d7,
      d7_eligible: book.gated ? 6 : Math.round(newUsers * 0.73)
    }
  }
  return {
    new_users: before(newUsers, book.delta),
    praying_users: before(praying, 6),
    completions: before(completions, 8),
    d7_rate: book.d7 === null ? null : Math.max(0, book.d7 - 2),
    d7_eligible: book.gated ? 6 : Math.round(before(newUsers, book.delta) * 0.73)
  }
}

// Daily praying people, Sundays higher; a gentle trend for the books that grew.
const dailyShape = (book, dates, seed) => dates.map((date, index) => {
  const sunday = parse(date).getUTCDay() === 0 ? 0.32 : 0
  const trend = 1 + (book.delta / 100) * (index / Math.max(1, dates.length - 1) - 0.5) * 0.6
  return Math.max(0, (1 + 0.08 * Math.sin(index / 1.6 + seed) + sunday + 0.08 * noise(seed, index)) * trend)
})

const sparkFor = (book, period) => {
  const dates = datesIn(period.start_date, period.end_date)
  const perDay = people(book.praying, scaleFor(period)) / 4.4 / Math.max(1, scaleFor(period)) ** 0.65
  const daily = dailyShape(book, dates, book.seed).map(value => value * perDay)
  if (dates.length <= 92) return { bucket: 'day', dates, values: daily.map(Math.round) }
  // Weeks from Monday; the first point starts on start_date.
  const weeks = []
  dates.forEach((date, index) => {
    const monday = parse(date).getUTCDay() === 1
    if (!weeks.length || monday) weeks.push({ date, total: 0 })
    weeks[weeks.length - 1].total += daily[index] * 2.6
  })
  return { bucket: 'week', dates: weeks.map(week => week.date), values: weeks.map(week => Math.round(week.total)) }
}

// Switches: who uses the book today but chose another at the first access, and the contrary.
const SWITCHES = {
  loc_2015: {
    came: [['locb_2008', 410], ['loc_1662', 260], ['loc_2021', 110], [null, 60]],
    went: [['loc_2019_en', 960], ['locb_2008', 620], ['loc_1662', 240], ['loc_2021', 200]]
  }
}
const switchesFor = (book) => {
  if (SWITCHES[book.code]) return SWITCHES[book.code]
  if (book.gated) return { came: [['loc_2015', 6]], went: [] }
  const neighbours = BOOKS.filter(other => other.code !== book.code && !other.gated && other.language.slice(0, 2) === book.language.slice(0, 2)).slice(0, 3)
  const came = Math.round(book.using * 0.12)
  const went = Math.round(book.using * 0.15)
  return {
    came: neighbours.map((other, index) => [other.code, Math.round(came * [0.5, 0.3, 0.2][index])]),
    went: neighbours.map((other, index) => [other.code, Math.round(went * [0.45, 0.35, 0.2][index])])
  }
}
const total = list => list.reduce((sum, [, users]) => sum + users, 0)
const onboardingUsers = (book) => {
  const { came, went } = switchesFor(book)
  return book.using - total(came) + total(went)
}
const nameOf = code => BOOKS.find(book => book.code === code)?.name || null

const DOCUMENT_TITLES = [
  ['Os Trinta e Nove Artigos de Religião', 'trinta-e-nove-artigos', 412],
  ['Quadrilátero de Chicago-Lambeth', 'quadrilatero-de-lambeth', 188],
  ['Catecismo', 'catecismo', 164],
  ['Credo de Santo Atanásio', 'credo-de-santo-atanasio', 97],
  ['Calendário e tabelas', 'calendario-e-tabelas', 61],
  ['Prefácio da edição', 'prefacio', 23]
]
const documentsFor = book => DOCUMENT_TITLES.slice(0, book.docs).map(([title, slug], index) => ({
  title,
  slug: book.code === 'loc_2015' && index !== 2 ? slug : `${slug}-${book.code.replaceAll('_', '-')}`,
  order: index + 1
}))

const flagFor = book => book.gated ? { key: `prayer_book_${book.code}`, rule: 'off', users_count: 6, scheduled: null } : null

const serialize = (book, period, compare) => {
  const spark = sparkFor(book, period)
  return {
    code: book.code,
    name: book.name,
    description: DESCRIPTIONS[book.code] || `${book.jurisdiction}: Ofício Diário, coletas e lecionário.`,
    language: book.language,
    jurisdiction: book.jurisdiction,
    year: book.year,
    order: book.order,
    is_default: book.isDefault,
    is_recommended: book.recommended,
    premium_required: book.premium,
    release_gated: book.gated,
    external_only: false,
    thumbnail_url: thumb(book.cover),
    image_url: null,
    offices: ALL_OFFICES,
    default_bible_version: book.language.startsWith('pt') ? 'nvi' : book.language === 'es' ? 'rvr' : 'nrsvue',
    pdf: book.pages ? { published: true, pages: book.pages, bytes: book.pages * 44_700 } : null,
    documents_count: book.docs,
    narration_pct: book.narration,
    flag: flagFor(book),
    metrics: metricsFor(book, period),
    ...(compare ? { previous: metricsFor(book, period, true) } : {}),
    spark: spark.values
  }
}

const notFound = (error, code = 'NOT_FOUND') => ({ status: 404, json: { error, code } })
const ok = json => ({ status: 200, json })

const list = (params) => {
  const period = windowOf(params)
  const compare = params.get('compare') === 'previous'
  const scale = scaleFor(period)
  const spark = sparkFor(BOOKS[0], period)
  return ok({
    period,
    ...(compare ? { previous_period: previousOf(period) } : {}),
    generated_at: `${TODAY}T10:42:00-03:00`,
    spark: { bucket: spark.bucket, dates: spark.dates },
    totals: {
      books: BOOKS.length,
      users_current: TOTALS.users_current,
      onboarding_users: TOTALS.onboarding_users,
      new_users: counted(TOTALS.new_users, scale),
      praying_users: people(TOTALS.praying, scale),
      completions: BOOKS.reduce((sum, book) => sum + counted(book.completions, scale), 0),
      unattributed_users: 12,
      ...(compare ? { previous: { new_users: counted(TOTALS.new_previous, scale), praying_users: people(TOTALS.praying_previous, scale), completions: BOOKS.reduce((sum, book) => sum + before(counted(book.completions, scale), 8), 0) } } : {})
    },
    prayer_books: BOOKS.map(book => serialize(book, period, compare))
  })
}

const seriesFor = (book, period, seed) => {
  const dates = datesIn(period.start_date, period.end_date)
  const shape = dailyShape(book, dates, seed)
  const sum = shape.reduce((a, b) => a + b, 0) || 1
  const scale = scaleFor(period)
  const prayingPerDay = people(book.praying, scale) / 4.4 / Math.max(1, scale) ** 0.65
  return dates.map((date, index) => ({
    date,
    praying_users: Math.round(shape[index] * prayingPerDay),
    completions: Math.round(shape[index] / sum * counted(book.completions, scale)),
    new_users: Math.round(shape[index] / sum * counted(book.newUsers, scale))
  }))
}

const retentionWindow = (users, rate) => ({ users: Math.round(users * rate / 100), eligible: users, rate })

const detail = (code, params) => {
  const book = BOOKS.find(item => item.code === code)
  if (!book) return notFound(`Prayer Book '${code}' not found`, 'PRAYER_BOOK_NOT_FOUND')
  const period = windowOf(params)
  const compare = params.get('compare') === 'previous'
  const metrics = metricsFor(book, period)
  const spark = sparkFor(book, period)
  const { came, went } = switchesFor(book)
  const share = { morning: 47, midday: 11, evening: 27, compline: 15 }
  const cohort = book.gated ? 6 : metrics.new_users
  return ok({
    period,
    ...(compare ? { previous_period: previousOf(period) } : {}),
    generated_at: `${TODAY}T10:42:00-03:00`,
    prayer_book: serialize(book, period, compare),
    spark: { bucket: spark.bucket, dates: spark.dates },
    series: seriesFor(book, period, book.seed),
    ...(compare ? { previous_series: seriesFor({ ...book, praying: before(book.praying, 6), completions: before(book.completions, 8), newUsers: before(book.newUsers, book.delta) }, previousOf(period), book.seed + 1.3) } : {}),
    by_office_type: Object.fromEntries(Object.entries(share).map(([office, weight]) => [office, Math.round(metrics.completions * weight / 100)])),
    retention: {
      book: { users: cohort, d1: retentionWindow(cohort, book.gated ? 83 : 58), d7: book.gated ? { users: 5, eligible: 6, rate: 83.3 } : retentionWindow(cohort, book.d7), d30: retentionWindow(cohort, book.gated ? 67 : 27) },
      all: { users: TOTALS.new_users, d1: retentionWindow(TOTALS.new_users, 52), d7: retentionWindow(TOTALS.new_users, 37), d30: retentionWindow(TOTALS.new_users, 24) }
    },
    switches: {
      onboarding_users: onboardingUsers(book),
      users_current: book.using,
      came_from: { total: total(came), books: came.map(([from, users]) => ({ code: from, name: from ? nameOf(from) : null, users })) },
      went_to: { total: total(went), books: went.map(([to, users]) => ({ code: to, name: nameOf(to), users })) }
    },
    premium_users: Math.round(book.using * 0.148),
    clients: book.gated
      ? { app: 1240, web: 0, other: 0, total: 1240 }
      : { app: Math.round(book.completions * 6.7), web: Math.round(book.completions * 2.73), other: 310, total: Math.round(book.completions * 6.7) + Math.round(book.completions * 2.73) + 310 },
    readiness: {
      cover: true,
      offices: ALL_OFFICES,
      lectionary_until: '2026-12-23',
      narration_pct: book.narration,
      narration_computed_at: `${TODAY}T03:12:00-03:00`,
      pdf: Boolean(book.pages),
      documents: book.docs
    },
    documents: documentsFor(book)
  })
}

// PDF and document opens per book (usage breakdown), and each document's opens.
const opensByBook = (params) => {
  const event = params.get('event')
  const period = windowOf(params)
  const scale = scaleFor(period)
  const rows = BOOKS.filter(book => event === 'pdf_opened' ? book.pages : book.docs).map(book => {
    const base = event === 'pdf_opened' ? book.praying * 0.43 : book.docs * book.praying * 0.09
    return { value: book.code, count: Math.round(base * scale), user_days: Math.round(base * scale * 0.7) }
  }).filter(row => row.count > 0)
  return ok({ period, dimension: 'book', filter: { event }, rows })
}

const documentOpens = (params) => {
  const book = BOOKS.find(item => item.code === params.get('book'))
  const period = windowOf(params)
  if (!book) return { status: 400, json: { error: 'Unknown book', code: 'INVALID_FILTER' } }
  const scale = scaleFor(period)
  const factor = book.praying / 2611
  const rows = documentsFor(book).map((doc, index) => ({
    content_kind: 'document', content_slug: doc.slug, title: doc.title, event: 'document_opened',
    count: Math.round(DOCUMENT_TITLES[index][2] * factor * scale), user_days: Math.round(DOCUMENT_TITLES[index][2] * factor * scale * 0.8)
  }))
  return ok({ period, filter: { content_kind: 'document', book: book.code }, rows })
}

export function handle ({ method = 'GET', pathname, query, scenario = 'normal' }) {
  if (method !== 'GET') return null
  const params = query instanceof URLSearchParams ? query : new URLSearchParams(query || '')
  const deployed = scenario !== 'sem-api'

  if (pathname === '/api/v1/admin/prayer_books') return deployed ? list(params) : notFound('Not found')
  const one = pathname.match(/^\/api\/v1\/admin\/prayer_books\/([^/]+)$/)
  if (one) return deployed ? detail(decodeURIComponent(one[1]), params) : notFound('Not found')

  if (pathname === '/api/v1/admin/usage/breakdown' && params.get('dimension') === 'book' && ['pdf_opened', 'document_opened'].includes(params.get('event'))) return opensByBook(params)
  // An API from before `book=` ignores it: usage.mjs answers with every slug.
  if (deployed && pathname === '/api/v1/admin/usage/content' && params.get('book')) return documentOpens(params)
  return null
}

/** The CMS's public `GET /api/prayer-book-documents/by-code/:code`, under /__mock/cms. */
export function cms (pathname) {
  const match = pathname.match(/\/prayer-book-documents\/by-code\/([^/]+)$/)
  if (!match) return null
  const book = BOOKS.find(item => item.code === decodeURIComponent(match[1]))
  const docs = book ? documentsFor(book) : []
  return ok({ data: docs.map((doc, index) => ({ id: 400 + index, documentId: `mock-${doc.slug}`, title: doc.title, slug: doc.slug, prayer_book_code: book.code, order: doc.order })) })
}
