// Mock answers for the Uso tab, shaped like API-uso.md and the existing
// /api/v1/admin/usage/* reports (types/usage.ts). Example data only (numbers
// follow the approved mockups). Today is 2026-11-26. Served only by
// layers/ordo/.playground; the site never imports it.
//
//   handle({ method, pathname, query, body, scenario }) → { status, json } | null
//
// Scenarios:
//   normal          uso-01..05, uso-07 (30 dias: 27 out – 25 nov vs 27 set – 26 out)
//   antes-do-resumo uso-06 state 1: telemetry since 25 nov 18:12, no rollup yet
//   dias-faltando   uso-06 state 2: telemetry since 12 nov; the previous window has no data
//   status-nulo     the reports as in normal, but the status lost its bookkeeping after a
//                   deploy: rollup.last_closed_day null and no days (production, nov 2026)

const TODAY = '2026-11-26'
const DAY = 86_400_000
const parse = value => new Date(`${value}T12:00:00Z`)
const iso = date => date.toISOString().slice(0, 10)
const addDays = (value, n) => iso(new Date(parse(value).getTime() + n * DAY))
const datesIn = (start, end) => {
  const out = []
  for (let day = start; day <= end && out.length < 800; day = addDays(day, 1)) out.push(day)
  return out
}
const weekday = value => parse(value).getUTCDay()

// Deterministic noise, so every screenshot run draws the same lines.
const noise = (seed, index) => {
  const x = Math.sin(seed * 9301 + index * 49297) * 233280
  return x - Math.floor(x) - 0.5
}
const shape = (dates, { mean, trend = 0, sunday = 0.18, wobble = 0.12, seed = 1 }) => dates.map((date, index) => {
  const t = dates.length > 1 ? index / (dates.length - 1) - 0.5 : 0
  const value = mean * (1 + trend * t + (weekday(date) === 0 ? sunday : 0) + wobble * noise(seed, index))
  return Math.max(0, value)
})
// Scales a shape so it adds up to `total` exactly.
const toTotal = (values, totalValue) => {
  const sum = values.reduce((a, b) => a + b, 0) || 1
  const out = values.map(value => Math.floor(value / sum * totalValue))
  let rest = totalValue - out.reduce((a, b) => a + b, 0)
  for (let i = out.length - 1; rest > 0 && i >= 0; i -= 1, rest -= 1) out[i] += 1
  return out
}

const range = query => {
  const end = query.get('end_date') || addDays(TODAY, -1)
  const start = query.get('start_date') || addDays(end, -29)
  return { start_date: start, end_date: end }
}
const isPrevious = period => period.end_date < '2026-10-27'

// When the telemetry started in each scenario (null: before the first event).
const STARTED = { normal: '2026-08-01', 'antes-do-resumo': '2026-11-25', 'dias-faltando': '2026-11-12', 'status-nulo': '2026-08-01' }
const CLOSED = { normal: '2026-11-25', 'antes-do-resumo': null, 'dias-faltando': '2026-11-25', 'status-nulo': '2026-11-25' }
const hasData = (scenario, date) => {
  const closed = CLOSED[scenario]
  return Boolean(closed) && date >= STARTED[scenario] && date <= closed
}
// Zero on the days without telemetry (the API sends zero; `status.days` says why).
const mask = (scenario, dates, values) => values.map((value, index) => hasData(scenario, dates[index]) ? value : 0)
// The share of a window's data a scenario keeps, so totals stay coherent.
const kept = (scenario, period) => {
  const dates = datesIn(period.start_date, period.end_date)
  return dates.filter(date => hasData(scenario, date)).length / Math.max(dates.length, 1)
}

// --- Features ------------------------------------------------------------------

// [feature, count now, count before, errors now, errors before, people-days now, people-days before, trend]
const FEATURES = [
  ['office', 412300, 385300, 412, 380, 29900, 28100, 0.08],
  ['readings', 128400, 123500, 257, 240, 18300, 17600, 0.04],
  ['calendar', 54200, 58900, 0, 0, 9800, 10600, -0.12],
  ['catalog', 48900, 47900, 0, 0, 12100, 11800, 0.02],
  ['completion', 31420, 28306, 0, 0, 24100, 21800, 0.11],
  ['audio', 22610, 20190, 68, 60, 4900, 4380, 0.14],
  ['preferences', 19700, 19650, 0, 0, 6100, 6080, 0],
  ['rosary', 6120, 5190, 0, 0, 1410, 1190, 0.25],
  ['pdf', 2410, 2340, 77, 9, 1120, 1090, 0.03],
  ['journal', 2210, 2150, 0, 0, 940, 910, 0.02],
  ['favorites', 1980, 1900, 0, 0, 820, 800, 0.03],
  ['share', 1720, 1760, 0, 0, 1210, 1240, -0.02],
  ['celebrations', 1650, 1490, 0, 0, 1020, 940, 0.1],
  ['premium', 1540, 1500, 4, 3, 1310, 1280, 0.02],
  ['account', 1320, 1290, 2, 2, 980, 960, 0],
  ['explanation', 1180, 1120, 0, 0, 760, 720, 0.04],
  ['background_music', 980, 900, 0, 0, 410, 380, 0.08],
  ['widgets', 870, 860, 0, 0, 0, 0, 0],
  ['life_rules', 640, 610, 0, 0, 280, 270, 0.04],
  ['devices', 410, 400, 0, 0, 0, 0, 0],
  ['life_rule_exams', 390, 350, 0, 0, 170, 150, 0.1],
  ['prayer_requests', 340, 330, 0, 0, 190, 185, 0],
  ['prayer_groups', 220, 200, 0, 0, 120, 110, 0.08],
  ['wrapped', 160, 0, 0, 0, 140, 0, 0.3],
  ['developer_portal', 90, 80, 0, 0, 30, 28, 0],
  ['admin', 60, 55, 0, 0, 4, 4, 0]
]

// [event, source, feature, count now, before, people-days now, before]
const EVENTS = [
  ['office_opened', 'client', 'office', 9800, 9240, 6100, 5760],
  ['office_completed', 'domain', 'completion', 31420, 28306, 24100, 21800],
  ['office_tool_used', 'client', 'office', 2870, 2790, 1300, 1260],
  ['reading_variant_toggled', 'client', 'office', 640, 636, 410, 405],
  ['office_completion_removed', 'domain', 'completion', 610, 607, 540, 536],
  ['narration_started', 'client', 'audio', 6204, 5539, 1284, 1150],
  ['narration_ended', 'client', 'audio', 3598, 3160, 1020, 900],
  ['share_sheet_opened', 'client', 'share', 2410, 2420, 1900, 1910],
  ['share_performed', 'client', 'share', 1380, 1408, 1100, 1120],
  ['share_link_opened', 'client', 'share', 3920, 3860, 3400, 3350],
  ['paywall_viewed', 'client', 'premium', 1870, 1790, 1870, 1790],
  ['purchase_finished', 'client', 'premium', 64, 58, 64, 58],
  ['page_viewed', 'client', null, 48200, 45100, 9800, 9200],
  ['post_opened', 'client', 'celebrations', 11420, 9300, 8800, 7300],
  ['document_opened', 'client', 'pdf', 1650, 1580, 1300, 1250],
  ['rosary_started', 'client', 'rosary', 1210, 1020, 980, 830],
  ['onboarding_started', 'client', 'account', 410, 390, 380, 362],
  ['onboarding_completed', 'client', 'account', 300, 288, 290, 280]
]

const topReport = (scenario, period, feature) => {
  const before = isPrevious(period)
  const factor = kept(scenario, period)
  const pick = (now, then) => Math.round((before ? then : now) * factor)
  let features = FEATURES.map(([name, c, cp, e, ep, u, up]) => ({ feature: name, count: pick(c, cp), errors: pick(e, ep), user_days: pick(u, up) })).filter(row => row.count > 0)
  let events = EVENTS.map(([event, source, owner, c, cp, u, up]) => ({ event, source, feature: owner, count: pick(c, cp), user_days: pick(u, up) })).filter(row => row.count > 0)
  if (feature) {
    features = features.filter(row => row.feature === feature)
    events = events.filter(row => row.feature === feature)
  }
  return { period, filter: feature ? { feature } : {}, features, events: events.sort((a, b) => b.count - a.count), counters: [] }
}

const featureRow = name => FEATURES.find(row => row[0] === name)
const featureSeries = (scenario, period, name) => {
  const row = featureRow(name)
  if (!row) return []
  const dates = datesIn(period.start_date, period.end_date)
  const before = isPrevious(period)
  const seed = FEATURES.indexOf(row) + (before ? 50 : 1)
  const counts = mask(scenario, dates, toTotal(shape(dates, { mean: 1, trend: row[7], seed }), Math.round((before ? row[2] : row[1]) * kept(scenario, period))))
  const usersTotal = name === 'office' ? (before ? 940 : 997) * dates.length : Math.round((before ? row[6] : row[5]))
  const users = mask(scenario, dates, toTotal(shape(dates, { mean: 1, trend: row[7], seed: seed + 7 }), Math.round(usersTotal * kept(scenario, period))))
  return dates.map((date, index) => ({ date, count: counts[index], users: users[index] }))
}
const eventSeries = (scenario, period, name) => {
  const row = EVENTS.find(item => item[0] === name)
  const dates = datesIn(period.start_date, period.end_date)
  if (!row) return dates.map(date => ({ date, count: 0, users: 0 }))
  const before = isPrevious(period)
  const seed = EVENTS.indexOf(row) + (before ? 70 : 11)
  const counts = mask(scenario, dates, toTotal(shape(dates, { mean: 1, trend: 0.1, seed }), Math.round((before ? row[4] : row[3]) * kept(scenario, period))))
  const users = mask(scenario, dates, toTotal(shape(dates, { mean: 1, trend: 0.1, seed: seed + 3 }), Math.round((before ? row[6] : row[5]) * kept(scenario, period))))
  return dates.map((date, index) => ({ date, count: counts[index], users: users[index] }))
}
const overallSeries = (scenario, period) => {
  const dates = datesIn(period.start_date, period.end_date)
  const before = isPrevious(period)
  const totalCount = FEATURES.reduce((sum, row) => sum + (before ? row[2] : row[1]), 0)
  const counts = mask(scenario, dates, toTotal(shape(dates, { mean: 1, trend: 0.08, seed: before ? 91 : 9 }), Math.round(totalCount * kept(scenario, period))))
  const people = activeDaily(scenario, period)
  return dates.map((date, index) => ({ date, count: counts[index], users: people[index] }))
}

// --- People ----------------------------------------------------------------------

// DAU per day: 1.046 on average now (peak 1.325 on Sunday 22 nov), 987 before.
const activeDaily = (scenario, period) => {
  const dates = datesIn(period.start_date, period.end_date)
  const before = isPrevious(period)
  let values = shape(dates, { mean: before ? 970 : 1024, trend: before ? 0.06 : 0.1, sunday: 0.18, seed: before ? 3 : 7 }).map(Math.round)
  if (!before && scenario === 'normal') values = values.map((value, index) => dates[index] === '2026-11-22' ? 1325 : value)
  if (scenario === 'dias-faltando') values = values.map((value, index) => dates[index] === '2026-11-12' ? 310 : value)
  return mask(scenario, dates, values)
}

const activeUsers = (scenario, period) => {
  const dates = datesIn(period.start_date, period.end_date)
  const before = isPrevious(period)
  const dau = activeDaily(scenario, period)
  const last = dates.length - 1
  const series = dates.map((date, index) => {
    if (!dau[index]) return { date, dau: 0, wau: 0, mau: 0, by_client: {}, app_and_web: { dau: 0, wau: 0, mau: 0 } }
    const progress = (index + 1) / dates.length
    const mau = Math.round((before ? 4415 : 4812) * (0.94 + 0.06 * progress))
    const wau = Math.round(mau * 0.5)
    const appShare = 3322 / 4812
    const webShare = 1832 / 4812
    const bothShare = 342 / 4812
    const point = {
      date,
      dau: dau[index],
      wau,
      mau,
      by_client: {
        app: { dau: Math.round(dau[index] * 0.78), wau: Math.round(wau * 0.75), mau: Math.round(mau * appShare) },
        web: { dau: Math.round(dau[index] * 0.24), wau: Math.round(wau * 0.29), mau: Math.round(mau * webShare) }
      },
      app_and_web: { dau: Math.round(dau[index] * 0.02), wau: Math.round(wau * 0.05), mau: Math.round(mau * bothShare) }
    }
    if (index === last && !before && scenario === 'normal') {
      point.mau = 4812
      point.by_client = { app: { dau: 812, wau: 1810, mau: before ? 3105 : 3322 }, web: { dau: 251, wau: 690, mau: 1832 } }
      point.app_and_web = { dau: 17, wau: 96, mau: 342 }
    }
    if (index === last && before) {
      point.by_client = { app: { dau: 760, wau: 1700, mau: 3105 }, web: { dau: 220, wau: 610, mau: 1607 } }
      point.app_and_web = { dau: 14, wau: 80, mau: 283 }
    }
    return point
  })
  return { period, series }
}

// --- Breakdowns ---------------------------------------------------------------------

const BOOKS = [
  ['loc_2015', 221900, 209300, 189700], ['loc_2019_en', 86800, 79600, 74200], ['loc_1662_en', 43400, 43200, 37100],
  ['loc_2027', 38600, 29500, 33000], ['bas_1985_en', 24100, 25100, 20600], ['loc_1979_es', 15400, 13750, 9800],
  ['loc_1928_us', 9100, 8800, 7900], ['loc_1979_us', 8200, 8000, 7100], ['bcp_2004_ie', 6100, 5900, 5200],
  ['loc_1987', 5400, 5300, 4700], ['loc_1662_pt', 4900, 4700, 4200], ['bcp_1962_ca', 4100, 4000, 3500],
  ['loc_2019_pt', 3600, 3300, 3100], ['bcp_1928_en', 3000, 2900, 2600], ['loc_1549_en', 2400, 2300, 2100],
  ['bcp_2011_nz', 2000, 1900, 1700], ['loc_1979_br', 1700, 1650, 1450], ['bcp_1960_cy', 1200, 1100, 1000],
  ['loc_2004_es', 900, 860, 760]
]

const breakdown = (scenario, period, query) => {
  const dimension = query.get('dimension')
  const feature = query.get('feature')
  const event = query.get('event')
  const before = isPrevious(period)
  const factor = kept(scenario, period)
  const scale = value => Math.round(value * factor)
  let rows
  if (dimension === 'client') {
    rows = feature === 'office'
      ? [['app', 287400], ['web', 108900], ['api_key', 11200], ['site', 3900], ['mcp', 900]]
      : [['app', 334000], ['web', 136000], ['api_key', 8000], ['widget', 2000], ['device', 700], ['mcp', 500]]
  } else if (dimension === 'platform') {
    rows = [['ios', 196000], ['android', 129000], ['web_desktop', 91000], ['web_mobile', 57000], ['webview_ios', 4000]]
  } else if (dimension === 'language') {
    rows = [['pt-BR', 292000], ['en', 163000], ['es', 19000], ['cy', 1200], [null, 2900]]
  } else if (dimension === 'book') {
    rows = BOOKS.map(([code, now, then, office]) => [code, feature === 'office' ? office : before ? then : now])
  } else if (dimension === 'app_version') {
    const versions = [['1.45.0', 287400, 21000], ['1.44.2', 71800, 5300], ['1.43.2', 23900, 1760], ['1.42.0', 9600, 700], ['1.40.1', 6400, 470], [null, 9100, 800]]
    return { status: 200, json: { period, dimension, filter: {}, rows: versions.map(([value, count, people]) => ({ value, count: scale(count), user_days: scale(people) })) } }
  } else if (dimension === 'premium') {
    rows = [['free', 301200, 24100], ['premium', 92100, 5300], [null, 1200, 310]]
  } else if (dimension === 'logged_in') {
    rows = [['logged_in', 268000, 19800], ['anonymous', 124300, 9600], [null, 2200, 300]]
  } else if (dimension === 'office_type') {
    rows = event === 'office_opened'
      ? [['morning', 4600, 3100], ['evening', 2900, 1800], ['compline', 1400, 900], ['midday', 900, 300]]
      : [['morning', 198000, 14100], ['evening', 104000, 7400], ['compline', 61000, 4300], ['midday', 41000, 2900], [null, 8300, 1200]]
  } else {
    return { status: 400, json: { error: 'unknown dimension', code: 'INVALID_DIMENSION' } }
  }
  return { status: 200, json: { period, dimension, filter: feature ? { feature } : event ? { event } : {}, rows: rows.map(([value, count, people]) => ({ value, count: scale(count), ...(people !== undefined ? { user_days: scale(people) } : {}) })) } }
}

// --- Funnels ------------------------------------------------------------------------

const funnels = (scenario, period) => {
  const before = isPrevious(period)
  const factor = kept(scenario, period)
  const s = value => Math.round(value * factor)
  const office = before ? { started: 5760, converted: 3951 } : { started: 6100, converted: 4330 }
  const paywall = before ? { started: 1790, converted: 58 } : { started: 1870, converted: 64 }
  const first = before ? { started: 362, reached: 274, converted: 110 } : { started: 380, reached: 285, converted: 120 }
  const rate = (a, b) => s(a) ? s(b) / s(a) : null
  return {
    period,
    raw_window: factor ? period : null,
    funnels: [
      { key: 'office', per_user: true, steps: [{ event: 'office_opened', count: s(9800), user_days: s(6100), reached: s(office.started) }, { event: 'office_completed', count: s(31420), user_days: s(24100), reached: s(office.converted) }], started: s(office.started), converted: s(office.converted), rate: rate(office.started, office.converted) },
      { key: 'share', per_user: false, steps: [{ event: 'share_sheet_opened', count: s(2410), user_days: s(1900) }, { event: 'share_performed', count: s(before ? 1408 : 1380), user_days: s(1100) }, { event: 'share_link_opened', count: s(3920), user_days: s(3400) }] },
      { key: 'paywall', per_user: true, steps: [{ event: 'paywall_viewed', count: s(1870), user_days: s(paywall.started), reached: s(paywall.started) }, { event: 'purchase_finished', count: s(64), user_days: s(64), reached: s(paywall.converted) }], started: s(paywall.started), converted: s(paywall.converted), rate: rate(paywall.started, paywall.converted) },
      { key: 'first_access', per_user: true, steps: [{ event: 'onboarding_started', count: s(410), user_days: s(first.started), reached: s(first.started) }, { event: 'onboarding_completed', count: s(300), user_days: s(290), reached: s(first.reached) }, { event: 'office_completed', count: s(31420), user_days: s(24100), reached: s(first.converted) }], started: s(first.started), converted: s(first.converted), rate: rate(first.started, first.converted) }
    ]
  }
}

// --- Content -----------------------------------------------------------------------

// [kind, slug, event, opens now, before, people-days now, feast day]
const CONTENT = [
  ['saint', 'todos-os-santos', 'post_opened', 3840, 210, 2910, '2026-11-01'],
  ['saint', 'cristo-rei', 'post_opened', 2960, 180, 2240, '2026-11-22'],
  ['saint', 'fieis-defuntos', 'post_opened', 1720, 120, 1390, '2026-11-02'],
  ['saint', 'santo-andre-apostolo', 'post_opened', 1310, 160, 1020, '2026-11-30'],
  ['saint', 'sao-martinho-de-tours', 'post_opened', 940, 90, 770, '2026-11-11'],
  ['saint', 'hilda-de-whitby', 'post_opened', 610, 70, 540, '2026-11-19'],
  ['saint', 'richard-hooker', 'post_opened', 580, 60, 460, '2026-11-03'],
  ['saint', 'santa-cecilia', 'post_opened', 420, 50, 390, '2026-11-22'],
  ...Array.from({ length: 56 }, (_, index) => ['saint', `santo-exemplo-${index + 1}`, 'post_opened', 380 - index * 6, 300 - index * 5, 300 - index * 5, `2026-${String(1 + (index % 12)).padStart(2, '0')}-${String(1 + (index % 27)).padStart(2, '0')}`]),
  ['document', 'trinta-e-nove-artigos', 'document_opened', 812, 790, 640, null],
  ['document', 'catecismo-loc-2015', 'document_opened', 540, 520, 430, null],
  ['document', 'quadrilatero-de-lambeth', 'document_opened', 298, 300, 250, null],
  ...Array.from({ length: 15 }, (_, index) => ['document', `documento-exemplo-${index + 1}`, 'document_opened', 240 - index * 12, 230 - index * 12, 200 - index * 10, null]),
  ...Array.from({ length: 41 }, (_, index) => ['post', `artigo-exemplo-${index + 1}`, 'post_opened', 520 - index * 11, 500 - index * 11, 400 - index * 9, null]),
  ...Array.from({ length: 9 }, (_, index) => ['rosary', `rosario-exemplo-${index + 1}`, 'rosary_started', 300 - index * 25, 250 - index * 22, 240 - index * 20, null])
]

// `title` as the API resolves it from the CMS; the example rows have none
// (null), to show the slug read as words.
const TITLES = {
  'todos-os-santos': 'Todos os Santos',
  'cristo-rei': 'Cristo Rei',
  'fieis-defuntos': 'Fiéis Defuntos',
  'santo-andre-apostolo': 'Santo André, Apóstolo',
  'sao-martinho-de-tours': 'São Martinho de Tours',
  'hilda-de-whitby': 'Santa Hilda de Whitby',
  'richard-hooker': 'Richard Hooker, Presbítero',
  'santa-cecilia': 'Santa Cecília, Mártir',
  'trinta-e-nove-artigos': 'Os Trinta e Nove Artigos de Religião',
  'catecismo-loc-2015': 'Catecismo (LOC 2015)',
  'quadrilatero-de-lambeth': 'Quadrilátero de Lambeth-Chicago'
}

const contentSeries = (period, opens, feast, seed) => {
  const dates = datesIn(period.start_date, period.end_date)
  const peak = feast ? dates.indexOf(feast) : -1
  const weights = dates.map((date, index) => {
    if (feast && peak >= 0) return 1 + 90 * Math.exp(-((index - peak) ** 2) / 2.2)
    if (feast && feast > period.end_date) return 1 + 100 * Math.exp((index - dates.length) / 4)
    return 1 + 0.3 * noise(seed, index)
  })
  return toTotal(weights, opens).map((count, index) => ({ date: dates[index], count, users: Math.round(count * 0.8) }))
}

const content = (scenario, period, query) => {
  const before = isPrevious(period)
  const factor = kept(scenario, period)
  const slug = query.get('slug')
  const withSeries = query.get('with_series') === 'true'
  const limit = Number(query.get('limit') || 100)
  const rows = CONTENT
    .filter(row => !slug || row[1] === slug)
    .map(([kind, contentSlug, event, now, then, people, feast], index) => {
      const opens = Math.round((before ? then : now) * factor)
      return {
        content_kind: kind, content_slug: contentSlug, title: TITLES[contentSlug] || null, event, count: opens, user_days: Math.round(people * factor * (before ? then / now : 1)),
        ...(withSeries || slug ? { series: contentSeries(period, opens, feast, index + 1) } : {})
      }
    })
    .filter(row => row.count > 0)
    .sort((a, b) => b.count - a.count)
  if (slug) return { period, filter: { content_slug: slug }, title: TITLES[slug] || null, rows: rows.map(row => ({ ...row, series: undefined })), series: rows[0]?.series || [] }
  // Each kind gets its share of the limit, as the API ranks per row.
  return { period, filter: {}, rows: rows.slice(0, Math.max(limit, 140)) }
}

// --- Status -------------------------------------------------------------------------

const status = (scenario, query) => {
  if (scenario === 'status-nulo') {
    const normal = status('normal', query)
    return { ...normal, rollup: { ...normal.rollup, first_day: null, last_closed_day: null, rolled_at: null, settled_through: null }, days: [] }
  }
  const end = query.get('end_date') || TODAY
  const start = query.get('start_date') || addDays(end, -29)
  const closed = CLOSED[scenario]
  const started = STARTED[scenario]
  const days = datesIn(start, end).map(date => {
    if (date >= TODAY || (closed && date > closed) || (!closed && date >= started)) return { date, state: 'open', events: 0 }
    if (date < started || !closed) return { date, state: 'no_data', events: 0 }
    return { date, state: date >= addDays(closed, -2) ? 'closing' : 'closed', events: 81200 }
  })
  const firstEventAt = scenario === 'antes-do-resumo' ? '2026-11-25T18:12:40-03:00' : `${started}T18:12:40-03:00`
  return {
    generated_at: '2026-11-26T15:04:05-03:00',
    time_zone: 'America/Sao_Paulo',
    today: TODAY,
    period: { start_date: start, end_date: end },
    telemetry: { enabled: true, hmac_configured: true, buffer: 'redis', queued: 37 },
    retention: { raw_days: 90, raw_since: '2026-08-29', identity_link_days: 365 },
    rollup: {
      version: 2,
      first_day: closed ? started : null,
      first_event_at: firstEventAt,
      last_closed_day: closed,
      rolled_at: closed ? '2026-11-26T00:31:12-03:00' : null,
      settled_through: closed ? addDays(closed, -2) : null,
      next_run_at: '2026-11-27T00:30:00-03:00',
      stale_days: 0
    },
    last_hour: { since: '2026-11-26T14:04:05-03:00', total: 4210 },
    sources: [
      { source: 'request', client: 'app', last_hour: 3100, today: 51200, last_event_at: '2026-11-26T15:03:59-03:00', first_day: closed ? started : null, first_event_at: firstEventAt },
      { source: 'request', client: 'web', last_hour: 900, today: 14100, last_event_at: '2026-11-26T15:03:40-03:00', first_day: closed ? started : null, first_event_at: firstEventAt },
      { source: 'client', client: 'web', last_hour: 210, today: 3900, last_event_at: '2026-11-26T15:02:11-03:00', first_day: closed ? started : null, first_event_at: scenario === 'antes-do-resumo' ? '2026-11-25T19:40:02-03:00' : firstEventAt },
      { source: 'client', client: 'app', last_hour: 0, today: 0, last_event_at: null, first_day: null, first_event_at: null }
    ],
    days
  }
}

// --- Other reads the Uso tab makes ----------------------------------------------------

const PRAYER_BOOKS = [
  ['loc_2015', 'LOC 2015'], ['loc_2019_en', 'BCP 2019'], ['loc_1662_en', 'BCP 1662'], ['loc_2027', 'LOC 2027'],
  ['bas_1985_en', 'BAS 1985'], ['loc_1979_es', 'LOC 1979 (es)']
].map(([code, name], index) => ({ id: String(index + 1), code, name, available_offices: ['morning', 'midday', 'evening', 'compline'], is_recommended: index === 0 }))

const CALENDAR = {
  '2026-11': [
    { date: '2026-11-26', celebration_name: null, week_name: 'Semana após Cristo Rei', color_code: 'green' },
    { date: '2026-11-29', celebration_name: null, week_name: '1º Domingo do Advento', color_code: 'purple' },
    { date: '2026-11-30', celebration_name: 'Santo André, apóstolo', week_name: null, color_code: 'red' }
  ],
  '2026-12': [
    { date: '2026-12-06', celebration_name: null, week_name: '2º Domingo do Advento', color_code: 'purple' },
    { date: '2026-12-08', celebration_name: 'Conceição de Maria', week_name: null, color_code: 'white' }
  ]
}

const ok = json => ({ status: 200, json })

export function handle ({ method = 'GET', pathname, query, scenario = 'normal' }) {
  const params = query instanceof URLSearchParams ? query : new URLSearchParams(query || {})
  if (method !== 'GET') return null
  const empty = scenario === 'antes-do-resumo'

  if (pathname === '/api/v1/admin/usage/status') return ok(status(scenario, params))
  if (pathname === '/api/v1/admin/usage/catalog') return null

  if (pathname.startsWith('/api/v1/admin/usage/')) {
    const period = range(params)
    const report = pathname.slice('/api/v1/admin/usage/'.length)
    if (report === 'top') return ok(empty ? { period, filter: {}, features: [], events: [], counters: [] } : topReport(scenario, period, params.get('feature')))
    if (report === 'active_users') return ok(activeUsers(scenario, period))
    if (report === 'series') {
      if (params.get('group_by') === 'feature') {
        return ok({
          period,
          group_by: 'feature',
          groups: empty ? [] : FEATURES.map(([name]) => {
            const series = featureSeries(scenario, period, name)
            return { feature: name, count: series.reduce((a, b) => a + b.count, 0), user_days: series.reduce((a, b) => a + b.users, 0), series }
          }).filter(group => group.count > 0)
        })
      }
      const feature = params.get('feature')
      const event = params.get('event')
      const series = feature ? featureSeries(scenario, period, feature) : event ? eventSeries(scenario, period, event) : overallSeries(scenario, period)
      return ok({ period, filter: feature ? { feature } : event ? { event } : {}, series })
    }
    if (report === 'breakdown') {
      if (empty) return ok({ period, dimension: params.get('dimension'), filter: {}, rows: [] })
      return breakdown(scenario, period, params)
    }
    if (report === 'funnels') return ok(empty ? { period, raw_window: null, funnels: funnels(scenario, { start_date: '2000-01-01', end_date: '2000-01-01' }).funnels } : funnels(scenario, period))
    if (report === 'content') return ok(empty ? { period, filter: {}, rows: [] } : content(scenario, period, params))
    return { status: 404, json: { error: 'Not found' } }
  }

  // /api/v1/dashboard (completions by office) is answered by dashboard.mjs.
  if (pathname === '/api/v1/prayer_books') return ok({ data: PRAYER_BOOKS })
  const calendar = /^\/api\/v1\/calendar\/(\d{4})\/(\d{1,2})$/.exec(pathname)
  if (calendar) return ok(CALENDAR[`${calendar[1]}-${calendar[2].padStart(2, '0')}`] || [])
  return null
}
