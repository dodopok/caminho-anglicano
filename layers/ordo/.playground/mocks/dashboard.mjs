// Mock answers for the Portal do Ordo's main tabs (Visão geral, Pessoas &
// hábito, Prática & conteúdo, Negócio & API, Operação), shaped like
// types/dashboard.ts and docs/dashboard-api.md. Example data only.
//
//   handle({ method, pathname, query, body, scenario }) → { status, json } | null
//
// Owns:
//   GET  /api/v1/dashboard?start_date&end_date&sections=a,b
//   GET  /api/v1/dashboard/developers/:id?start_date&end_date
//   GET  /api/v1/admin/life_rules?status&search&limit&offset
//   GET  /api/v1/admin/custom_rosary_prayers?share_status&search&sort&direction&limit&offset
//   GET  /api/v1/admin/custom_rosary_prayers/:id
//   POST /api/v1/admin/custom_rosary_prayers/:id/approve | /reject
//   GET  /api/v1/admin/rosary_categories
//
// Scenarios:
//   normal  a small Anglican daily-office app: ~12k accounts, ~3k praying a month,
//           ~1.1k core faithful, ~250 on Ordo+, five developers with API keys
//   vazio   an empty base: zeros, empty lists, nothing in review
//
// Every number comes from day-by-day arrays computed once at import (from the
// app's launch to today), so any window, from 7 days to "desde sempre", is a
// sum over them: the window before a period gives slightly smaller totals, and
// the sections agree with one another. Deterministic: string-hash PRNG, fixed
// "now". Approve/reject decisions live in memory until reset() or a restart.

export const TODAY = '2026-11-26'
export const NOW = '2026-11-26T15:10:00-03:00'
const NOW_MS = Date.parse(NOW)
const DAY = 86_400_000

// When each part of the history starts.
const LAUNCH = '2024-10-01' // first account; "Desde sempre" fits the panels' 800-day series cap
const FAVORITES_LAUNCH = '2025-03-03'
const WEEKLY_LAUNCH = '2025-09-01'
const EXAMS_LAUNCH = '2026-02-18'
const ROSARY_LAUNCH = '2026-04-07'

// --- Dates -------------------------------------------------------------------

const parse = value => Date.UTC(+value.slice(0, 4), +value.slice(5, 7) - 1, +value.slice(8, 10))
const fmt = ms => new Date(ms).toISOString().slice(0, 10)
const addDays = (value, n) => fmt(parse(value) + n * DAY)
const diffDays = (from, to) => Math.round((parse(to) - parse(from)) / DAY)
const weekday = value => new Date(parse(value)).getUTCDay()
const weekStart = value => addDays(value, -((weekday(value) + 6) % 7)) // Monday
const isDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && fmt(parse(value)) === value
const between = (value, start, end) => value >= start && value <= end
// A timestamp `days`/`hours`/`minutes` before now, as Rails serializes it.
const ago = (days, hours = 0, minutes = 0) => new Date(NOW_MS - ((days * 24 + hours) * 60 + minutes) * 60_000).toISOString()
const at = (date, time = '12:00:00') => new Date(`${date}T${time}-03:00`).toISOString()

// --- Deterministic noise -----------------------------------------------------

const hash = text => {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
// One mulberry32 step seeded by the key: a uniform number in [0, 1).
const rand = key => {
  let t = (hash(key) + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const jitter = (key, amplitude) => 1 + (rand(key) - 0.5) * 2 * amplitude
const hex = (key, length) => Array.from({ length }, (_, i) => Math.floor(rand(`${key}:${i}`) * 16).toString(16)).join('')
const base36 = (key, length) => Array.from({ length }, (_, i) => Math.floor(rand(`${key}:${i}`) * 36).toString(36)).join('')

const round2 = value => Math.round(value * 100) / 100
const pct = (part, whole) => whole ? round2(part / whole * 100) : 0

// Splits an integer total by weights (largest remainder), dropping zero keys
// the way a SQL group-by would.
const split = (total, weights) => {
  const sum = weights.reduce((acc, [, w]) => acc + w, 0)
  if (!total || !sum) return {}
  const rows = weights.map(([key, w]) => {
    const raw = total * w / sum
    return { key, value: Math.floor(raw), rest: raw - Math.floor(raw) }
  })
  let missing = total - rows.reduce((acc, row) => acc + row.value, 0)
  ;[...rows].sort((a, b) => b.rest - a.rest).forEach(row => {
    if (missing > 0) { row.value += 1; missing -= 1 }
  })
  return Object.fromEntries(rows.filter(row => row.value > 0).map(row => [row.key, row.value]))
}

// --- Catalogue ---------------------------------------------------------------

const BOOKS = [
  // code, name, share of completions, share of onboarding choices
  ['loc_2015', 'LOC 2015', 221900, 0.575],
  ['loc_2019_en', 'BCP 2019', 86800, 0.152],
  ['loc_1662_en', 'BCP 1662', 43400, 0.071],
  ['loc_2027', 'LOC 2027', 38600, 0.094],
  ['bas_1985_en', 'BAS 1985', 24100, 0.041],
  ['loc_1979_es', 'LOC 1979 (es)', 15400, 0.067]
]
const BOOK_NAME = Object.fromEntries(BOOKS.map(([code, name]) => [code, name]))
const BOOK_COMPLETION_WEIGHTS = BOOKS.map(([code, , w]) => [code, w])
const BOOK_ONBOARDING_WEIGHTS = BOOKS.map(([code, , , w]) => [code, w])

// The usage mock's 30-day split (15 080 + 3 460 + 8 170 + 4 710 = 31 420).
const OFFICE_WEIGHTS = [['morning', 15080], ['midday', 3460], ['evening', 8170], ['compline', 4710]]
const JOURNAL_OFFICE_WEIGHTS = [['morning', 38], ['midday', 6], ['evening', 31], ['compline', 25]]
const SHARE_OFFICE_WEIGHTS = [['morning', 52], ['midday', 9], ['evening', 24], ['compline', 15]]
// Local hour of the person praying: Morning Prayer at 6–7h, Compline at 21–22h.
const HOUR_WEIGHTS = [0.6, 0.3, 0.2, 0.2, 0.6, 3.2, 9.8, 10.4, 6.1, 3.4, 2.2, 3.1, 5.6, 3.4, 1.6, 1.5, 1.8, 3.9, 7.6, 7.9, 6.4, 8.2, 6.9, 3.1]
  .map((w, hour) => [String(hour), w])

const BIBLES = [
  ['nvi', 'Nova Versão Internacional', 31], ['naa', 'Nova Almeida Atualizada', 18], ['ara', 'Almeida Revista e Atualizada', 14],
  ['esv', 'English Standard Version', 12], ['nvt', 'Nova Versão Transformadora', 6], ['kjv', 'King James Version', 5],
  ['bpt', 'Bíblia para Todos', 5], ['rvr1960', 'Reina-Valera 1960', 4]
]
const LANGUAGE_WEIGHTS = [['pt-BR', 64], ['en', 25], ['pt-PT', 6.5], ['es', 4.5]]
const MODE_WEIGHTS = [['basic', 61], ['simplified', 23], ['advanced', 16]]

// People in the rankings: first names and an initial, no emails.
const PEOPLE = [
  [1187, 'Ana Clara M.'], [342, 'Pe. Rodrigo A.'], [2741, 'Lúcia F.'], [96, 'Thomas W.'], [4410, 'Beatriz R.'],
  [618, 'Inês C.'], [3302, 'Mateus V.'], [1529, 'Irmã Teresa'], [5821, 'Samuel O.'], [2210, 'Helena D.'],
  [7034, 'Joaquim P.'], [880, 'Raquel N.'], [6120, 'Daniel H.'], [3998, 'Marta F.']
]

// --- History: one value per day from LAUNCH to TODAY ---------------------------

const N = diffDays(LAUNCH, TODAY) + 1
const T_IDX = N - 1 // today's index
const dateAt = i => addDays(LAUNCH, i)
const idxOf = date => diffDays(LAUNCH, date)
const TODAY_SHARE = 0.64 // at 15:10, Morning and Midday Prayer are done, the evening is not

const SEASONS = [
  // [start, end, factor]: Advent, Christmas, Lent, Holy Week, Brazilian summer holidays
  ['2024-12-01', '2024-12-23', 1.08], ['2024-12-24', '2024-12-26', 1.16], ['2025-01-02', '2025-01-31', 0.93],
  ['2025-03-05', '2025-04-12', 1.1], ['2025-04-13', '2025-04-20', 1.24], ['2025-11-30', '2025-12-23', 1.08],
  ['2025-12-24', '2025-12-26', 1.16], ['2026-01-02', '2026-01-31', 0.93], ['2026-02-18', '2026-03-28', 1.1],
  ['2026-03-29', '2026-04-05', 1.24]
]
const WEEKDAY_FACTOR = [1.14, 1.0, 1.0, 1.01, 0.99, 0.97, 0.95] // Sunday first

// How busy the app is on day i, before the weekday: slow growth, then the
// Ordo Web launch in October 2026 adds a step.
const level = i => {
  const date = dateAt(i)
  const t = i / (N - 1)
  let value = 0.16 + 0.84 * Math.pow(t, 1.7)
  const web = Math.min(1, Math.max(0, (i - idxOf('2026-10-12')) / 31))
  value *= 1 + 0.08 * web
  for (const [start, end, factor] of SEASONS) if (between(date, start, end)) value *= factor
  return value
}

const scaleTo = (values, total, fixIndex) => {
  const sum = values.reduce((a, b) => a + b, 0) || 1
  const out = values.map(v => Math.round(v / sum * total))
  out[fixIndex] += total - out.reduce((a, b) => a + b, 0)
  return out
}

const buildHistory = () => {
  const lv = Array.from({ length: N }, (_, i) => level(i))
  const nowLevel = lv[T_IDX - 1]
  const day = (i, name, amp) => WEEKDAY_FACTOR[weekday(dateAt(i))] * jitter(`${name}:${i}`, amp) * (i === T_IDX ? TODAY_SHARE : 1)
  const since = (i, date) => dateAt(i) >= date

  // At 15:10 most of today's people have already prayed Morning Prayer.
  const dau = lv.map((l, i) => Math.round(655 * l / nowLevel * day(i, 'dau', 0.05) * (i === T_IDX ? 0.72 / TODAY_SHARE : 1)))

  // Completions: about 1.6 offices per person per day, calibrated so the
  // default 30-day window adds up to the usage mock's 31 420.
  const rawCompletions = dau.map((d, i) => d * 1.61 * jitter(`comp:${i}`, 0.03))
  const window30 = rawCompletions.slice(T_IDX - 29)
  const factor = 31420 / window30.reduce((a, b) => a + b, 0)
  const completions = rawCompletions.map(v => Math.round(v * factor))
  completions[T_IDX - 1] += 31420 - completions.slice(T_IDX - 29).reduce((a, b) => a + b, 0)

  // Sign-ups add up to the 12 184 accounts of the overview.
  const newUsers = scaleTo(lv.map((l, i) => Math.pow(l, 0.8) * jitter(`new:${i}`, 0.35) * (weekday(dateAt(i)) === 1 ? 1.15 : 1) * (i === T_IDX ? 0.6 : 1)), 12184, Math.floor(N / 2))

  const journals = completions.map((c, i) => Math.round(c * 0.042 * jitter(`jour:${i}`, 0.2)))
  const shares = completions.map((c, i) => Math.round(c * 0.044 * jitter(`share:${i}`, 0.25)))
  const favorites = completions.map((c, i) => since(i, FAVORITES_LAUNCH) ? Math.round(c * 0.02 * jitter(`fav:${i}`, 0.3)) : 0)
  const prayerRequests = dau.map((d, i) => since(i, WEEKLY_LAUNCH) ? Math.round(d * 0.0068 * jitter(`req:${i}`, 0.5)) : 0)
  // Weekly prayers are generated in bulk on Sunday for the week starting Monday.
  const weeklyGenerated = dau.map((d, i) => {
    if (!since(i, WEEKLY_LAUNCH)) return 0
    const sunday = weekday(dateAt(i)) === 0
    return Math.round(d * (sunday ? 0.3 : 0.02) * jitter(`wk:${i}`, sunday ? 0.06 : 0.5))
  })
  const examsCompleted = dau.map((d, i) => since(i, EXAMS_LAUNCH) ? Math.round(d * 0.004 * (weekday(dateAt(i)) === 0 ? 2.2 : 1) * jitter(`exam:${i}`, 0.5)) : 0)
  const rosariesCreated = dau.map((d, i) => since(i, ROSARY_LAUNCH) ? Math.round(d * 0.0036 * jitter(`ros:${i}`, 0.6)) : 0)
  // The moderator rests on Sundays.
  const rosaryApproved = lv.map((_, i) => since(i, ROSARY_LAUNCH) && weekday(dateAt(i)) !== 0 && i < T_IDX ? Math.floor(rand(`appr:${i}`) * 2.9) : 0)
  const rosaryRejected = lv.map((_, i) => since(i, ROSARY_LAUNCH) && weekday(dateAt(i)) !== 0 && i < T_IDX && rand(`rej:${i}`) < 0.27 ? 1 : 0)
  const premiumStarts = dau.map((d, i) => Math.floor(d * 0.0016 * jitter(`pstart:${i}`, 0.9) + rand(`pstart2:${i}`)))
  const premiumRenewals = dau.map((d, i) => since(i, '2025-10-01') ? Math.floor(d * 0.0008 * jitter(`pren:${i}`, 0.9) + rand(`pren2:${i}`) * 0.9) : 0)
  const premiumExpired = dau.map((d, i) => since(i, '2025-10-01') ? Math.floor(d * 0.00045 * jitter(`pexp:${i}`, 0.9) + rand(`pexp2:${i}`) * 0.75) : 0)

  // Push: a streak reminder for whoever has not prayed yet, plus a few
  // announcements sent to every device.
  const reminders = dau.map((d, i) => Math.round(d * 1.3 * jitter(`rem:${i}`, 0.08)))
  const BROADCASTS = { '2025-04-20': ['announcement', 3420], '2025-12-24': ['announcement', 4310], '2026-04-05': ['announcement', 4980], '2026-08-20': ['new_feature', 5240], '2026-10-31': ['announcement', 5610], '2026-11-12': ['new_feature', 5830] }
  const announcements = lv.map((_, i) => BROADCASTS[dateAt(i)]?.[0] === 'announcement' ? BROADCASTS[dateAt(i)][1] : 0)
  const newFeature = lv.map((_, i) => BROADCASTS[dateAt(i)]?.[0] === 'new_feature' ? BROADCASTS[dateAt(i)][1] : 0)

  return { level: lv, nowLevel, dau, completions, newUsers, journals, shares, favorites, prayerRequests, weeklyGenerated, examsCompleted, rosariesCreated, rosaryApproved, rosaryRejected, premiumStarts, premiumRenewals, premiumExpired, reminders, announcements, newFeature }
}

// --- API keys and developers -------------------------------------------------

const WEEKDAY_PROFILES = {
  parish: [1.75, 0.85, 0.85, 0.9, 0.85, 0.9, 1.0], // a parish site, busiest on Sunday
  flat: [1, 1, 1, 1, 1, 1, 1], // a screen polling every five minutes
  office: [0.35, 1.2, 1.2, 1.2, 1.2, 1.15, 0.4], // a diocesan office, weekdays
  app: [1.1, 1.0, 0.98, 1.0, 0.97, 0.95, 0.93]
}

// Developer plans, as in config/plans.yml (multiplier of the 1 000/day limit).
const DEVELOPERS = [
  {
    id: 3, name: 'Rafael Monteiro', email: 'rafael.m@example.com', company_name: 'Comunidade Anglicana da Trindade',
    website: 'https://trindade.example.org', use_case_description: 'Mostrar as leituras e a coleta do dia no site da paróquia e na tela do salão.',
    approved: true, legacy_free: false, max_keys: 5, created_at: at('2025-07-10', '10:22:00'),
    plan: { code: 'diocese', status: 'active', interval: 'year', trial_ends_at: null, current_period_end: at('2027-07-17', '10:30:00'), cancel_at_period_end: false }
  },
  {
    id: 7, name: 'Helena Duarte', email: 'helena.d@example.com', company_name: 'Liturgia em Áudio',
    website: 'https://liturgia-em-audio.example.com', use_case_description: 'Bot do Telegram que envia o calendário e as leituras do dia para um grupo de oração.',
    approved: true, legacy_free: false, max_keys: 3, created_at: at('2026-11-21', '19:04:00'),
    plan: { code: 'parish', status: 'trialing', interval: 'month', trial_ends_at: at('2026-11-28', '19:05:00'), current_period_end: at('2026-11-28', '19:05:00'), cancel_at_period_end: false }
  },
  {
    id: 12, name: 'Samuel Okafor', email: 'samuel.o@example.com', company_name: 'Lectio Labs',
    website: 'https://lectio.example.com', use_case_description: 'App de leitura bíblica diária (iOS) que segue o lecionário anglicano.',
    approved: true, legacy_free: true, max_keys: 5, created_at: at('2025-06-02', '09:15:00'), plan: null
  },
  {
    id: 15, name: 'Marta Figueiredo', email: 'marta.f@example.com', company_name: 'Diocese Anglicana do Porto (exemplo)',
    website: 'https://diocese-porto.example.pt', use_case_description: 'Agenda diocesana com as celebrações do mês para as paróquias.',
    approved: true, legacy_free: false, max_keys: 10, created_at: at('2025-08-28', '06:40:00'),
    plan: { code: 'province', status: 'active', interval: 'year', trial_ends_at: null, current_period_end: at('2026-12-20', '06:45:00'), cancel_at_period_end: true }
  },
  {
    id: 21, name: 'Tiago Nascimento', email: 'tiago.n@example.com', company_name: null,
    website: null, use_case_description: 'Widget pessoal com a coleta do dia na tela inicial.',
    approved: true, legacy_free: false, max_keys: 3, created_at: at('2025-11-01', '22:10:00'),
    plan: { code: 'parish', status: 'canceled', interval: 'month', trial_ends_at: null, current_period_end: at('2026-10-09', '22:10:00'), cancel_at_period_end: false }
  },
  {
    id: 24, name: 'Ana Beatriz Coelho', email: 'anab.c@example.com', company_name: 'Projeto acadêmico (seminário)',
    website: null, use_case_description: 'Pesquisa sobre o uso dos lecionários nas igrejas lusófonas.',
    approved: false, legacy_free: false, max_keys: 3, created_at: at('2026-11-24', '14:32:00'), plan: null
  }
]

const KEYS = [
  // id, developer, name, active, billing, multiplier, created, last day used (null = today), expires, base/day, profile, zero-day chance, endpoint weights
  [31, 3, 'Site da paróquia', true, true, 5, '2025-07-14', null, null, 2300, 'parish', 0, [['calendar#today', 38], ['readings#show', 22], ['collects#show', 18], ['calendar#day', 12], ['celebrations#index', 10]]],
  [32, 3, 'Tela do salão paroquial', true, true, 5, '2026-02-02', null, null, 288, 'flat', 0, [['calendar#today', 100]]],
  [71, 7, 'Bot do Telegram', true, true, 1, '2026-11-21', null, null, 960, 'app', 0, [['calendar#today', 46], ['readings#show', 31], ['collects#show', 23]]],
  [121, 12, 'lectio-ios', true, true, 2, '2025-06-10', null, null, 1380, 'app', 0, [['days#show', 34], ['readings#show', 27], ['passages#show', 21], ['collects#show', 11], ['calendar#year_seasons', 4], ['liturgical_explanations#show', 3]]],
  [122, 12, 'lectio-staging', false, true, 2, '2025-06-10', '2026-09-18', null, 35, 'office', 0.45, [['days#show', 60], ['passages#show', 40]]],
  [123, 12, 'lectio-beta', false, true, 2, '2025-06-02', '2025-12-12', '2026-08-31', 260, 'app', 0.05, [['days#show', 55], ['readings#show', 45]]],
  [151, 15, 'Agenda diocesana', true, true, 10, '2026-01-12', null, null, 410, 'office', 0, [['calendar#month', 41], ['calendar#day', 27], ['celebrations#index', 20], ['calendar#year_key_dates', 12]]],
  [152, 15, 'Agenda diocesana 2025', true, true, 10, '2025-09-01', null, '2026-12-14', 60, 'office', 0.1, [['calendar#month', 70], ['calendar#year', 30]]],
  [211, 21, 'meu-widget', true, false, 1, '2025-11-03', '2026-10-09', null, 95, 'flat', 0.1, [['calendar#today', 80], ['collects#show', 20]]]
].map(([id, developer_id, name, active, billing_active, multiplier, created, lastDay, expires, base, profile, gaps, endpoints]) => ({
  id, developer_id, name, active, billing_active, multiplier, created, lastDay, expires, base, profile, gaps, endpoints,
  daily_limit: 1000 * multiplier,
  key_preview: `estevao_${hex(`key${id}`, 8)}…${hex(`key${id}end`, 4)}`
}))
// Today's count where it matters: the bot is close to its limit at 15:10.
const TODAY_OVERRIDES = { 71: 912, 32: 182 }

const buildKeyDaily = key => {
  const values = new Array(N).fill(0)
  const first = Math.max(0, idxOf(key.created))
  const last = key.lastDay ? idxOf(key.lastDay) : T_IDX
  for (let i = first; i <= last; i += 1) {
    if (key.gaps && rand(`gap${key.id}:${i}`) < key.gaps) continue
    const progress = last > first ? (i - first) / (last - first) : 1
    let value = key.base * (0.55 + 0.45 * progress) * WEEKDAY_PROFILES[key.profile][weekday(dateAt(i))] * jitter(`k${key.id}:${i}`, key.profile === 'flat' ? 0.02 : 0.12)
    if (i === T_IDX) value = TODAY_OVERRIDES[key.id] ?? value * 0.63
    values[i] = Math.min(key.daily_limit, Math.max(0, Math.round(value)))
  }
  return values
}

// --- The world a scenario reads ------------------------------------------------

const buildWorld = empty => {
  const history = buildHistory()
  if (empty) for (const name of Object.keys(history)) if (Array.isArray(history[name]) && name !== 'level') history[name] = history[name].map(() => 0)
  const keys = empty ? [] : KEYS.map(key => ({ ...key, daily: buildKeyDaily(key) }))
  const total = arr => arr.reduce((a, b) => a + b, 0)
  return {
    empty,
    h: history,
    keys,
    developers: empty ? [] : DEVELOPERS,
    c: {
      totalUsers: total(history.newUsers),
      premiumActive: empty ? 0 : 248,
      premiumExpired: empty ? 0 : 162,
      premiumExpiring30: empty ? 0 : 17,
      usersWithCompletions: empty ? 0 : 8412,
      totalCompletions: total(history.completions),
      totalJournals: total(history.journals),
      onboarded: empty ? 0 : 10236,
      fcm: empty ? {} : { android: 3420, ios: 2310, web: 140, unknown: 12 },
      streakAverages: empty ? [0, 0] : [2.41, 9.73],
      streakBuckets: empty ? [] : [[7, 1046], [30, 412], [100, 96], [365, 11]],
      totalLifeRules: empty ? 0 : 1840,
      privateAdoptions: empty ? 0 : 214,
      totalReentries: empty ? 0 : 14,
      usersNearRosaryLimit: empty ? 0 : 2
    }
  }
}

const WORLDS = { normal: buildWorld(false), vazio: buildWorld(true) }
const worldFor = scenario => scenario === 'vazio' ? WORLDS.vazio : WORLDS.normal

// --- Windows over the history --------------------------------------------------

const windowOf = (start, end) => {
  const s = Math.max(0, idxOf(start))
  const e = Math.min(T_IDX, idxOf(end))
  return { start, end, s, e, n: Math.max(0, e - s + 1), days: diffDays(start, end) + 1 }
}
const sum = (arr, w) => { let total = 0; for (let i = w.s; i <= w.e; i += 1) total += arr[i]; return total }
const mean = (arr, w) => w.n ? sum(arr, w) / w.n : 0
const sparse = (arr, w, key = 'count') => {
  const out = []
  for (let i = w.s; i <= w.e; i += 1) if (arr[i] > 0) out.push({ date: dateAt(i), [key]: arr[i] })
  return out
}
const sparseMap = (arr, w) => {
  const out = {}
  for (let i = w.s; i <= w.e; i += 1) if (arr[i] > 0) out[dateAt(i)] = arr[i]
  return out
}
const byWeek = (arr, w, shift = 0) => {
  const out = {}
  for (let i = w.s; i <= w.e; i += 1) {
    if (!arr[i]) continue
    const week = weekStart(addDays(dateAt(i), shift))
    out[week] = (out[week] || 0) + arr[i]
  }
  return out
}
// Distinct people over a window: a person who prays on many days counts once.
const distinct = (world, arr, w, cap = Infinity, exponent = 0.46) => w.n ? Math.min(cap, Math.round(mean(arr, w) * Math.pow(w.n, exponent))) : 0
// Up to a month, distinct people grow with the window; beyond that, the month
// that ends the window plus part of everyone who arrived before it.
const activeUsers = (world, w) => {
  if (w.n <= 30) return distinct(world, world.h.dau, w, world.c.usersWithCompletions)
  const lastMonth = { ...w, s: w.e - 29, n: 30 }
  const earlier = { ...w, e: w.e - 30, n: w.n - 30 }
  return Math.min(world.c.usersWithCompletions, distinct(world, world.h.dau, lastMonth) + Math.round(0.45 * sum(world.h.newUsers, earlier)))
}
// A small deterministic wobble per window, for rates that are not sums.
const wobble = (w, name, amplitude) => jitter(`${name}|${w.start}|${w.end}`, amplitude)
// How the app's size at the end of a window compares with today (≤ 1).
const sizeAt = (world, w) => w.n ? world.h.level[w.e] / world.h.nowLevel : 0

// --- Sections ----------------------------------------------------------------

const overview = world => {
  const { c } = world
  return {
    scope: 'lifetime',
    total_users: c.totalUsers,
    premium_users: c.premiumActive,
    free_users: c.totalUsers - c.premiumActive,
    premium_conversion_rate: pct(c.premiumActive, c.totalUsers),
    total_completions: c.totalCompletions,
    total_journals: c.totalJournals,
    users_with_completions: c.usersWithCompletions,
    avg_completions_per_user: c.usersWithCompletions ? round2(c.totalCompletions / c.usersWithCompletions) : 0,
    avg_completions_denominator: 'users_with_completions'
  }
}

const STREAKERS = [[1187, 412, 412], [342, 389, 61], [2741, 366, 366], [96, 301, 12], [4410, 288, 288], [618, 254, 140], [3302, 233, 3], [1529, 219, 219], [5821, 198, 47], [2210, 187, 187]]

const users = (world, w) => {
  const { c, h } = world
  const fcm = Object.values(c.fcm).reduce((a, b) => a + b, 0)
  return {
    scope: 'period',
    metric_scopes: {
      new_users_in_period: 'period', daily_new_users: 'period', active_users_in_period: 'period',
      active_fcm_tokens: 'lifetime', platform_breakdown: 'lifetime', top_streakers: 'lifetime',
      avg_current_streak: 'lifetime', avg_longest_streak: 'lifetime', current_streak_buckets: 'lifetime'
    },
    new_users_in_period: sum(h.newUsers, w),
    daily_new_users: sparseMap(h.newUsers, w),
    active_users_in_period: activeUsers(world, w),
    active_fcm_tokens: fcm,
    platform_breakdown: { ...c.fcm },
    top_streakers: world.empty ? [] : STREAKERS.map(([id, longest, current]) => ({ id, name: PEOPLE.find(p => p[0] === id)[1], longest_streak: longest, current_streak: current })),
    avg_current_streak: c.streakAverages[0],
    avg_longest_streak: c.streakAverages[1],
    current_streak_buckets: c.streakBuckets.map(([min_days, count]) => ({ min_days, users: count }))
  }
}

const engagement = (world, w) => {
  const end = w.end
  const endIdx = idxOf(end)
  const dau = endIdx >= 0 && endIdx <= T_IDX ? world.h.dau[endIdx] : 0
  const wau = activeUsers(world, windowOf(addDays(end, -6), end))
  const mau = activeUsers(world, windowOf(addDays(end, -29), end))
  // Dense from the first day there is history (a 1970 start would be 20 000 zeros).
  const trend = []
  const from = w.start < LAUNCH ? LAUNCH : w.start
  for (let date = from, guard = 0; date <= end && guard < 800; date = addDays(date, 1), guard += 1) {
    const i = idxOf(date)
    trend.push({ date, active_users: i >= 0 && i <= T_IDX ? world.h.dau[i] : 0 })
  }
  const core = Math.round(mau * 0.36)
  return {
    scope: 'period',
    metric_scopes: { dau: 'window', wau: 'window', mau: 'window', daily_active_trend: 'period', core_users: 'window' },
    dau,
    wau,
    mau,
    dau_wau_ratio: pct(dau, wau),
    wau_mau_ratio: pct(wau, mau),
    daily_active_trend: trend,
    core_users: { count: core, window_days: 28, min_active_days: 8, share_of_wau: pct(core, wau) }
  }
}

const COMPLETERS = [[1187, 3.9], [2741, 3.7], [342, 3.5], [1529, 3.45], [4410, 3.3], [96, 3.1], [618, 3.0], [7034, 2.9], [880, 2.85], [5821, 2.8]]

const completions = (world, w) => {
  const total = sum(world.h.completions, w)
  const attributed = Math.round(total * 0.989)
  const byBook = split(attributed, BOOK_COMPLETION_WEIGHTS)
  return {
    scope: 'period',
    total_in_period: total,
    by_office_type: split(total, OFFICE_WEIGHTS),
    by_hour: split(total, HOUR_WEIGHTS),
    top_completers: total ? COMPLETERS
      .map(([id, perDay]) => ({ id, name: PEOPLE.find(p => p[0] === id)[1], completions: Math.round(perDay * Math.min(w.n, 600) * jitter(`tc${id}|${w.start}`, 0.03)) }))
      .sort((a, b) => b.completions - a.completions || a.id - b.id) : [],
    daily_completions: sparse(world.h.completions, w),
    avg_duration_seconds: total ? round2(742.6 * wobble(w, 'duration', 0.04)) : 0,
    by_prayer_book: Object.entries(byBook).map(([code, count]) => ({ code, name: BOOK_NAME[code], completions: count })).sort((a, b) => b.completions - a.completions)
  }
}

const prayerBooks = world => {
  const { c } = world
  const onboarding = Object.entries(split(c.onboarded, BOOK_ONBOARDING_WEIGHTS)).map(([code, count]) => ({ code, name: BOOK_NAME[code], users: count })).sort((a, b) => b.users - a.users)
  const attributed = Math.round(c.totalCompletions * 0.988)
  const byCompletions = Object.entries(split(attributed, BOOK_COMPLETION_WEIGHTS)).map(([code, count]) => ({ code, name: BOOK_NAME[code], completions: count })).sort((a, b) => b.completions - a.completions)
  const bibles = split(c.onboarded, BIBLES.map(([code, , weight]) => [code, weight]))
  return {
    scope: 'lifetime',
    usage_by_prayer_book: onboarding,
    onboarding_choices_by_prayer_book: onboarding,
    completion_usage_by_prayer_book: byCompletions,
    most_used: onboarding[0] || null,
    most_used_by_completions: byCompletions[0] || null,
    bible_version_choices: BIBLES.filter(([code]) => bibles[code]).map(([code, name]) => ({ code, name, users: bibles[code] })),
    unattributed_completions: c.totalCompletions - attributed
  }
}

const WRITERS = [[2741, 0.92], [1529, 0.85], [880, 0.7], [618, 0.66], [3998, 0.6], [1187, 0.52], [6120, 0.45], [2210, 0.41], [342, 0.37], [4410, 0.33]]

const journals = (world, w) => {
  const total = sum(world.h.journals, w)
  const byType = split(total, [['daily_office', 84], ['life_rule', 16]])
  return {
    scope: 'period',
    total_in_period: total,
    by_entry_type: byType,
    by_office_type: split(byType.daily_office || 0, JOURNAL_OFFICE_WEIGHTS),
    top_writers: total ? WRITERS
      .map(([id, perDay]) => ({ id, name: PEOPLE.find(p => p[0] === id)[1], journals: Math.max(1, Math.round(perDay * Math.min(w.n, 600) * jitter(`tw${id}|${w.start}`, 0.05))) }))
      .sort((a, b) => b.journals - a.journals || a.id - b.id) : [],
    users_with_journals: distinct(world, world.h.journals, w, total, 0.55)
  }
}

const notifications = (world, w) => {
  const { h } = world
  const reminders = sum(h.reminders, w)
  const announcements = sum(h.announcements, w)
  const features = sum(h.newFeature, w)
  const total = reminders + announcements + features
  const failedTokens = Math.round(total * 0.016 * wobble(w, 'nfail', 0.15))
  const invalid = Math.round(total * 0.012 * wobble(w, 'ninv', 0.15))
  const sent = total - failedTokens - invalid
  const byPlatform = total ? {
    android: { sent: Math.round(sent * 0.58), failed: Math.round(failedTokens * 0.55), invalid: Math.round(invalid * 0.35) },
    ios: { sent: Math.round(sent * 0.39), failed: Math.round(failedTokens * 0.4), invalid: Math.round(invalid * 0.6) },
    web: { sent: sent - Math.round(sent * 0.58) - Math.round(sent * 0.39), failed: failedTokens - Math.round(failedTokens * 0.55) - Math.round(failedTokens * 0.4), invalid: invalid - Math.round(invalid * 0.35) - Math.round(invalid * 0.6) }
  } : {}
  // A notification "converts" when the same person prays within two hours.
  // The reminder improves slowly as the app learns when people pray.
  const conversion = (type, count, baseRate) => {
    if (!count) return null
    const rate = baseRate * (0.9 + 0.1 * sizeAt(world, w)) * wobble(w, `conv-${type}`, 0.04)
    const followed = Math.round(count * rate / 100)
    return { notification_type: type, sent: count, followed_by_prayer: followed, rate: pct(followed, count), window_minutes: 120 }
  }
  const conversions = [conversion('streak_reminder', reminders, 31.4), conversion('announcement', announcements, 6.2), conversion('new_feature', features, 4.8)].filter(Boolean)
  return {
    scope: 'period',
    metric_scopes: { failures_last_24_hours: 'window', conversion_by_type: 'period' },
    total_in_period: total,
    sent,
    failed: failedTokens + invalid,
    success_rate: pct(sent, total),
    by_type: Object.fromEntries([['streak_reminder', reminders], ['announcement', announcements], ['new_feature', features]].filter(([, v]) => v)),
    failures_last_24_hours: world.empty ? 0 : 14,
    delivery_status_counts: total ? { sent, failed: failedTokens, invalid } : {},
    delivery_status_by_platform: byPlatform,
    conversion_by_type: conversions,
    reminder_conversion: conversions.find(item => item.notification_type === 'streak_reminder') || null
  }
}

const lifeRulesSection = (world, w) => {
  const rules = lifeRuleFixtures(world)
  const pending = rules.filter(rule => !rule.approved)
  const approved = rules.filter(rule => rule.approved)
  const oldest = pending.reduce((min, rule) => !min || rule.created_at < min ? rule.created_at : min, null)
  const exams = sum(world.h.examsCompleted, w)
  return {
    scope: 'lifetime',
    metric_scopes: { rules: 'lifetime', adoptions: 'lifetime', exams: 'period' },
    total_rules: world.c.totalLifeRules,
    public_rules: rules.length,
    approved_rules: approved.length,
    pending_rules: pending.length,
    oldest_pending_at: oldest,
    oldest_pending_age_seconds: oldest ? Math.round((NOW_MS - Date.parse(oldest)) / 1000) : null,
    top_adopted: [...approved].sort((a, b) => b.adoption_count - a.adoption_count).slice(0, 10).map(rule => ({ id: rule.id, title: rule.title, adoptions: rule.adoption_count })),
    total_adoptions: rules.reduce((acc, rule) => acc + rule.adoption_count, 0) + world.c.privateAdoptions,
    exams: {
      scope: 'period',
      completed_in_period: exams,
      users_with_completed_exams: distinct(world, world.h.examsCompleted, w, exams, 0.62),
      average_score: exams ? round2(72.4 * wobble(w, 'score', 0.03)) : null,
      by_period: split(exams, [['weekly', 63], ['monthly', 24], ['seasonal', 9], ['custom', 4]]),
      by_band: split(exams, [['steady', 41], ['flourishing', 27], ['wavering', 24], ['arid', 8]])
    }
  }
}

const sharedOffices = (world, w) => {
  const total = sum(world.h.shares, w)
  return {
    scope: 'period',
    total_in_period: total,
    by_office_type: split(total, SHARE_OFFICE_WEIGHTS),
    by_prayer_book: split(total, BOOK_COMPLETION_WEIGHTS),
    daily_shares: sparse(world.h.shares, w),
    unique_users_sharing: distinct(world, world.h.shares, w, total, 0.62)
  }
}

const moderation = (world, w) => {
  const queue = rosaryFixtures(world)
  const pendingNow = queue.filter(item => item.share_status === 'pending_review')
  // A resubmission waits since it came back, not since it was first written.
  const oldest = pendingNow.map(item => item.last_moderation_reentry_at || item.created_at).sort()[0] || null
  const approved = sum(world.h.rosaryApproved, w)
  const rejected = sum(world.h.rosaryRejected, w)
  const perDay = []
  const from = w.start < ROSARY_LAUNCH ? ROSARY_LAUNCH : w.start
  if (!world.empty) {
    for (let date = from, guard = 0; date <= w.end && date <= TODAY && guard < 800; date = addDays(date, 1), guard += 1) {
      const i = idxOf(date)
      perDay.push({ date, approved: world.h.rosaryApproved[i], rejected: world.h.rosaryRejected[i] })
    }
  }
  // The pace is the last 14 closed days, whatever the period.
  const recent = windowOf(addDays(TODAY, -14), addDays(TODAY, -1))
  const pace = round2((sum(world.h.rosaryApproved, recent) + sum(world.h.rosaryRejected, recent)) / 14)
  const rules = lifeRuleFixtures(world).filter(rule => !rule.approved)
  const oldestRule = rules.reduce((min, rule) => !min || rule.created_at < min ? rule.created_at : min, null)
  const ageOf = value => value ? Math.round((NOW_MS - Date.parse(value)) / 1000) : null
  return {
    scope: 'period',
    metric_scopes: { pending_now: 'lifetime', reviews: 'period', reentries: 'period', approved_without_strapi: 'lifetime', average_reviews_per_day: 'window' },
    custom_rosaries: {
      pending_now: pendingNow.length,
      oldest_pending_at: oldest,
      oldest_pending_age_seconds: ageOf(oldest),
      approved_in_period: approved,
      rejected_in_period: rejected,
      approval_rate: pct(approved, approved + rejected),
      average_response_time_seconds: approved + rejected ? Math.round(207360 * wobble(w, 'response', 0.12) * 10) / 10 : 0,
      reentries_in_period: world.empty ? 0 : Math.min(world.c.totalReentries, Math.round(w.n / 24)),
      total_reentries: world.c.totalReentries,
      approved_without_strapi: queue.filter(item => item.share_status === 'approved' && !['published', 'unpublished'].includes(item.publication_status)).length,
      reviewed_per_day: perDay,
      average_reviews_per_day: pace,
      estimated_days_to_clear: pendingNow.length && pace ? Math.ceil(pendingNow.length / pace) : null
    },
    life_rules: {
      pending_now: rules.length,
      oldest_pending_at: oldestRule,
      oldest_pending_age_seconds: ageOf(oldestRule)
    }
  }
}

const health = world => {
  const expiring = world.keys.filter(key => key.expires && key.expires > TODAY && key.expires <= addDays(TODAY, 30))
  return {
    scope: 'period',
    metric_scopes: { notifications: 'period', audio_sessions: 'lifetime', api_keys: 'lifetime' },
    notifications: {
      failures_last_24_hours: world.empty ? 0 : 14,
      failed_by_type: world.empty ? {} : { streak_reminder: 12, new_feature: 2 }
    },
    audio_sessions: {
      failed: world.empty ? 0 : 3,
      running: world.empty ? 0 : 1,
      stale_running: world.empty ? 0 : 1,
      stale_running_sessions: world.empty ? [] : [{ id: 418, prayer_book_code: 'loc_1979_es', started_at: ago(0, 3, 12) }]
    },
    api_keys: {
      expiring_next_30_days: expiring.length,
      expiring_keys: expiring.map(key => ({ id: key.id, name: key.name, expires_at: at(key.expires, '00:00:00') }))
    }
  }
}

// Retention windows: who prayed exactly 1, 7 or 30 days after creating the
// account. `eligible` only counts days whose window has already closed.
const RETENTION_BASE = { d1: 0.345, d7: 0.21, d30: 0.124 }
const RETENTION_OFFSET = { d1: 1, d7: 7, d30: 30 }
const eligibleIn = (arr, from, to, offset) => {
  let total = 0
  for (let i = from; i <= to; i += 1) if (i + offset <= T_IDX - 1) total += arr[i]
  return total
}
const retentionWindow = (cohortUsers, eligible, rate) => {
  const retained = Math.round(eligible * rate)
  return { users: retained, rate: pct(retained, cohortUsers), eligible, eligible_rate: eligible ? pct(retained, eligible) : null }
}

const retention = (world, w) => {
  const { h } = world
  const cohorts = []
  if (w.n) {
    let i = w.s
    while (i <= w.e) {
      const week = weekStart(dateAt(i))
      let j = i
      while (j + 1 <= w.e && weekStart(dateAt(j + 1)) === week) j += 1
      let count = 0
      for (let k = i; k <= j; k += 1) count += h.newUsers[k]
      if (count) {
        const improving = 0.9 + 0.2 * (i / (N - 1))
        const row = { week_start: week, users: count }
        for (const name of ['d1', 'd7', 'd30']) {
          row[name] = retentionWindow(count, eligibleIn(h.newUsers, i, j, RETENTION_OFFSET[name]), RETENTION_BASE[name] * improving * jitter(`ret-${name}-${week}`, 0.12))
        }
        cohorts.push(row)
      }
      i = j + 1
    }
  }
  const totalUsers = sum(h.newUsers, w)
  const eligible = Object.fromEntries(['d1', 'd7', 'd30'].map(name => [name, w.n ? eligibleIn(h.newUsers, w.s, w.e, RETENTION_OFFSET[name]) : 0]))
  const segment = (fields, share, multiplier, id) => {
    const count = Math.round(totalUsers * share)
    const row = { ...fields, users: count }
    for (const name of ['d1', 'd7', 'd30']) {
      row[name] = retentionWindow(count, Math.round(eligible[name] * share), RETENTION_BASE[name] * multiplier * jitter(`seg-${id}-${name}`, 0.05))
    }
    return row
  }
  // 18% never finished onboarding: no book, no mode, and they rarely come back.
  const onboardedShare = 0.82
  const bookMultipliers = { loc_2015: 1.0, loc_2019_en: 1.08, loc_1662_en: 1.15, loc_2027: 1.12, bas_1985_en: 0.94, loc_1979_es: 0.82 }
  const bookWeight = BOOK_ONBOARDING_WEIGHTS.reduce((a, [, x]) => a + x, 0)
  const modeMultipliers = { basic: 1.08, advanced: 1.38, simplified: 0.98 }
  const modeWeight = MODE_WEIGHTS.reduce((a, [, x]) => a + x, 0)
  const neverOnboarded = id => segment(id === 'book' ? { prayer_book_code: null, prayer_book_name: 'Sem livro' } : { mode: null }, 1 - onboardedShare, 0.28, `none-${id}`)
  return {
    scope: 'period',
    cohorts,
    by_prayer_book: totalUsers ? [
      ...BOOK_ONBOARDING_WEIGHTS.map(([code, weight]) => segment({ prayer_book_code: code, prayer_book_name: BOOK_NAME[code] }, onboardedShare * weight / bookWeight, bookMultipliers[code], code)),
      neverOnboarded('book')
    ].sort((a, b) => b.users - a.users) : [],
    by_mode: totalUsers ? [
      ...MODE_WEIGHTS.map(([mode, weight]) => segment({ mode }, onboardedShare * weight / modeWeight, modeMultipliers[mode], mode)),
      neverOnboarded('mode')
    ].sort((a, b) => b.users - a.users) : []
  }
}

const onboarding = (world, w) => {
  const { h } = world
  const registered = sum(h.newUsers, w)
  const completed = Math.round(registered * 0.82)
  let first = 0
  let seven = 0
  for (let i = w.s; i <= w.e && w.n; i += 1) {
    const age = T_IDX - i
    first += h.newUsers[i] * (age === 0 ? 0.48 : 0.66)
    seven += h.newUsers[i] * 0.31 * Math.min(1, age / 21)
  }
  first = Math.round(first)
  seven = Math.round(seven)
  const rates = registered ? { registered: 100.0, onboarding_completed: pct(completed, registered), first_prayer: pct(first, registered), prayed_seven_times: pct(seven, registered) } : {}
  // Newer accounts reach the first office a little faster (the web edition).
  const median = Math.round(1260 * (1.12 - 0.12 * sizeAt(world, w)) * wobble(w, 'ttfp', 0.05))
  return {
    scope: 'period',
    funnel: { registered, onboarding_completed: completed, first_prayer: first, prayed_seven_times: seven, rates },
    choices: {
      modes: split(completed, MODE_WEIGHTS),
      prayer_books: split(completed, BOOK_ONBOARDING_WEIGHTS),
      bible_versions: split(completed, BIBLES.map(([code, , weight]) => [code, weight])),
      languages: split(completed, LANGUAGE_WEIGHTS)
    },
    time_to_first_prayer: {
      users_with_first_prayer: first,
      median_seconds: first ? median : null,
      p75_seconds: first ? Math.round(median * 7.6) : null,
      within_1_hour_rate: first ? round2(57.3 * wobble(w, 'w1h', 0.03)) : 0,
      within_1_day_rate: first ? round2(80.9 * wobble(w, 'w1d', 0.02)) : 0
    }
  }
}

const premium = (world, w) => {
  const { c, h } = world
  const renewals = sum(h.premiumRenewals, w)
  const expired = sum(h.premiumExpired, w)
  const active = activeUsers(world, w)
  // Subscribers pray more: most of them show up in any window of a few days.
  const among = Math.min(active, Math.round(c.premiumActive * sizeAt(world, w) * 0.93 * (1 - Math.exp(-w.n / 10)) * wobble(w, 'pact', 0.03)))
  const available = renewals + expired > 0
  return {
    scope: 'period',
    metric_scopes: {
      active_now: 'lifetime', new_in_period: 'period', expiring_next_30_days: 'lifetime', expired: 'lifetime', churn_rate: 'lifetime',
      renewals_in_period: 'period', expired_in_period: 'period', renewal_rate: 'period', active_users_in_period: 'period', premium_among_active: 'period'
    },
    active_now: c.premiumActive,
    new_in_period: sum(h.premiumStarts, w),
    expiring_next_30_days: c.premiumExpiring30,
    expired: c.premiumExpired,
    churn_rate: pct(c.premiumExpired, c.premiumActive + c.premiumExpired),
    renewals_in_period: renewals,
    expired_in_period: expired,
    renewal_rate: available ? pct(renewals, renewals + expired) : null,
    renewal_rate_available: available,
    renewal_rate_note: available ? null : 'Nenhuma renovação ou expiração registrada no período.',
    active_users_in_period: active,
    premium_among_active: among,
    premium_share_of_active: pct(among, active)
  }
}

// [country, explicit, inferred from a single-country timezone]
const COUNTRIES = [
  ['BR', 5410, 3190], ['PT', 612, 226], ['US', 402, 299], ['AO', 241, 81], ['MZ', 171, 43], ['GB', 121, 76], ['CA', 58, 38],
  ['MX', 61, 27], ['NG', 47, 14], ['AU', 29, 15], ['ZA', 26, 11], ['CV', 27, 4], ['AR', 21, 8], ['ES', 19, 8], ['IE', 15, 8],
  ['CL', 12, 6], ['CO', 14, 3], ['NZ', 8, 4], ['KE', 9, 2], ['FR', 7, 2], ['DE', 6, 2]
]

const geography = world => {
  const total = world.c.totalUsers
  const rows = world.empty ? [] : COUNTRIES.map(([code, explicit, inferred]) => ({ country_code: code, users: explicit + inferred, explicit_users: explicit, timezone_inferred_users: inferred }))
  const explicit = rows.reduce((a, row) => a + row.explicit_users, 0)
  const inferred = rows.reduce((a, row) => a + row.timezone_inferred_users, 0)
  const resolved = explicit + inferred
  const unresolved = total - resolved
  if (unresolved > 0) rows.push({ country_code: 'other', users: unresolved, explicit_users: 0, timezone_inferred_users: 0 })
  return {
    scope: 'lifetime',
    total_users: total,
    explicit_country_users: explicit,
    explicit_country_percentage: pct(explicit, total),
    country_coverage_percentage: pct(explicit, total),
    resolved_country_coverage_percentage: pct(resolved, total),
    default_timezone_users: world.empty ? 0 : 6950,
    derived_country_users: resolved,
    ambiguous_or_unknown_timezone_users: unresolved,
    by_country: Object.fromEntries(rows.map(row => [row.country_code, row.users])),
    by_language: world.empty ? {} : split(total, [['pt-BR', 7610], ['en', 3020], ['pt-PT', 860], ['es', 520], ['unknown', 174]]),
    country_breakdown: rows,
    coverage: {
      total_users: total,
      explicit_country_users: explicit,
      timezone_inferred_country_users: inferred,
      resolved_country_users: resolved,
      unresolved_country_users: unresolved,
      explicit_country_percentage: pct(explicit, total),
      resolved_country_percentage: pct(resolved, total)
    }
  }
}

const customRosaries = (world, w) => {
  const created = sum(world.h.rosariesCreated, w)
  const shared = Math.round(created * 0.19)
  // Recent shares are still waiting; older ones have been decided.
  const recentShare = Math.min(1, 14 / Math.max(w.n, 1))
  const statuses = split(shared, [['pending_review', 0.15 + 0.6 * recentShare], ['approved', 0.62 * (1 - recentShare) + 0.2], ['rejected', 0.2 * (1 - recentShare) + 0.05]])
  return {
    scope: 'period',
    metric_scopes: { users_near_limit: 'lifetime', near_limit_threshold: 'lifetime' },
    created_in_period: created,
    public_in_period: shared,
    by_share_status: created ? { private: created - shared, ...statuses } : {},
    by_locale: split(created, [['pt-BR', 71], ['en', 18], ['pt-PT', 7], ['es', 4]]),
    average_blocks: created ? round2(3.42 * wobble(w, 'blocks', 0.05)) : 0,
    average_expanded_steps: created ? round2(38.6 * wobble(w, 'steps', 0.06)) : 0,
    users_near_limit: world.c.usersNearRosaryLimit,
    near_limit_threshold: 80
  }
}

const weeklyPrayers = (world, w) => {
  const { h } = world
  const requests = sum(h.prayerRequests, w)
  const generated = sum(h.weeklyGenerated, w)
  const daily = sparse(h.weeklyGenerated, w)
  return {
    scope: 'period',
    prayer_requests_created: requests,
    prayer_request_users: distinct(world, h.prayerRequests, w, requests, 0.7),
    prayer_requests_by_week: byWeek(h.prayerRequests, w),
    weekly_prayers_generated: generated,
    weekly_prayer_users: Math.min(generated, Math.round(mean(h.weeklyGenerated, w) * 7 / 1.15)),
    generated_by_week: byWeek(h.weeklyGenerated, w),
    // Sunday's batch is for the week that starts the next day.
    generated_for_week: byWeek(h.weeklyGenerated, w, 1),
    generated_by_language: split(generated, LANGUAGE_WEIGHTS),
    generated_by_prayer_book: split(generated, BOOK_ONBOARDING_WEIGHTS),
    daily_generated: daily,
    perplexity_usage_proxy: generated
  }
}

const FAVORITE_POSTS = [
  'cristo-rei', 'todos-os-santos', 'santo-andre-apostolo', 'fieis-defuntos', 'santa-cecilia', 'clemente-de-roma', 'c-s-lewis',
  'margarida-da-escocia', 'isabel-da-hungria', 'hilda-de-whitby', 'hugo-de-lincoln', 'martinho-de-tours', 'willibrord',
  'carlos-simeon', 'leao-magno', 'gregorio-de-nissa', 'richard-hooker', 'lancelot-andrewes', 'francisco-de-assis', 'teresa-de-avila'
]

const favorites = (world, w) => {
  const created = sum(world.h.favorites, w)
  const kinds = split(created, [['commemoration', 64], ['season', 21], ['rosary', 15]])
  const posts = split(kinds.commemoration || 0, FAVORITE_POSTS.map((slug, i) => [slug, 1 / Math.pow(i + 1.6, 0.9)]))
  return {
    scope: 'period',
    created_in_period: created,
    users_with_favorites: distinct(world, world.h.favorites, w, created, 0.6),
    by_kind: kinds,
    top_posts: Object.entries(posts).map(([post_slug, count]) => ({ post_slug, favorites: count })).sort((a, b) => b.favorites - a.favorites).slice(0, 20)
  }
}

// --- API usage, from the per-key arrays ---------------------------------------

const keyRequests = (key, w) => w.n ? sum(key.daily, w) : 0
const mergeEndpoints = (list, w) => {
  const totals = {}
  const keyCounts = {}
  for (const key of list) {
    const requests = keyRequests(key, w)
    for (const [endpoint, count] of Object.entries(split(requests, key.endpoints))) {
      totals[endpoint] = (totals[endpoint] || 0) + count
      keyCounts[endpoint] = (keyCounts[endpoint] || 0) + 1
    }
  }
  return Object.entries(totals).map(([endpoint, requests]) => ({ endpoint, requests, keys: keyCounts[endpoint] })).sort((a, b) => b.requests - a.requests || a.endpoint.localeCompare(b.endpoint))
}
const lastUsedAt = key => {
  if (!key.daily.some(Boolean)) return null
  if (!key.lastDay) return ago(0, 0, 2 + (key.id % 9))
  return at(key.lastDay, `${String(8 + (key.id % 12)).padStart(2, '0')}:${String(key.id % 60).padStart(2, '0')}:00`)
}
const isExpired = key => Boolean(key.expires && key.expires < TODAY)

const api = (world, w) => {
  const daily = new Array(N).fill(0)
  for (const key of world.keys) for (let i = w.s; i <= w.e && w.n; i += 1) daily[i] += key.daily[i]
  const nearLimit = world.keys
    .filter(key => key.active && key.daily[T_IDX] >= Math.ceil(key.daily_limit * 0.8))
    .map(key => ({ id: key.id, name: key.name, requests_today: key.daily[T_IDX], daily_limit: key.daily_limit }))
  return {
    scope: 'period',
    metric_scopes: { keys: 'lifetime', near_daily_limit: 'today' },
    requests_in_period: sum(daily, w),
    requests_by_day: sparse(daily, w, 'requests'),
    top_endpoints: mergeEndpoints(world.keys, w).slice(0, 20).map(({ endpoint, requests }) => ({ endpoint, requests })),
    top_keys: world.keys
      .map(key => ({ id: key.id, name: key.name, requests: keyRequests(key, w), active: key.active }))
      .filter(key => key.requests > 0)
      .sort((a, b) => b.requests - a.requests || a.id - b.id)
      .slice(0, 20),
    keys: {
      active: world.keys.filter(key => key.active).length,
      inactive: world.keys.filter(key => !key.active).length,
      expired: world.keys.filter(isExpired).length
    },
    near_daily_limit: nearLimit
  }
}

const previousWindow = (start, end) => {
  if (start < '2000-01-01') return null
  const days = diffDays(start, end) + 1
  return windowOf(addDays(start, -days), addDays(start, -1))
}

const developerUsageRow = (world, developer, w) => {
  const keys = world.keys.filter(key => key.developer_id === developer.id)
  const previous = previousWindow(w.start, w.end)
  let activeDays = 0
  for (let i = w.s; i <= w.e && w.n; i += 1) if (keys.some(key => key.daily[i] > 0)) activeDays += 1
  const last = keys.map(lastUsedAt).filter(Boolean).sort().pop() || null
  return {
    id: developer.id,
    name: developer.name,
    company_name: developer.company_name,
    keys: keys.length,
    active_keys: keys.filter(key => key.active).length,
    requests_in_period: keys.reduce((a, key) => a + keyRequests(key, w), 0),
    previous_period_requests: previous ? keys.reduce((a, key) => a + keyRequests(key, previous), 0) : null,
    active_days_in_period: activeDays,
    last_used_at: last
  }
}

const developers = (world, w) => {
  const list = world.developers
  const withKeys = list.filter(dev => world.keys.some(key => key.developer_id === dev.id))
  return {
    scope: 'lifetime',
    metric_scopes: { usage_by_developer: 'period' },
    registered: list.length,
    approved: list.filter(dev => dev.approved).length,
    pending_approval: list.filter(dev => !dev.approved).length,
    with_api_keys: withKeys.length,
    api_keys: {
      total: world.keys.length,
      active: world.keys.filter(key => key.active).length,
      inactive: world.keys.filter(key => !key.active).length
    },
    keys_by_developer: list
      .map(dev => ({ id: dev.id, name: dev.name, keys: world.keys.filter(key => key.developer_id === dev.id).length }))
      .sort((a, b) => b.keys - a.keys || a.id - b.id)
      .slice(0, 20),
    usage_by_developer: {
      scope: 'period',
      developers: withKeys.map(dev => developerUsageRow(world, dev, w)).sort((a, b) => b.requests_in_period - a.requests_in_period || a.id - b.id)
    }
  }
}

const developerDetail = (world, id, w) => {
  const developer = world.developers.find(dev => String(dev.id) === String(id))
  if (!developer) return null
  const keys = world.keys.filter(key => key.developer_id === developer.id)
  const row = developerUsageRow(world, developer, w)
  const daily = new Array(N).fill(0)
  let nearDays = 0
  const weekdays = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  for (let i = w.s; i <= w.e && w.n; i += 1) {
    for (const key of keys) daily[i] += key.daily[i]
    if (keys.some(key => key.daily[i] >= Math.ceil(key.daily_limit * 0.8))) nearDays += 1
    weekdays[weekday(dateAt(i))] += daily[i]
  }
  let peak = null
  for (let i = w.s; i <= w.e && w.n; i += 1) if (daily[i] && (!peak || daily[i] > peak.requests)) peak = { date: dateAt(i), requests: daily[i] }
  const activeKeys = keys.filter(key => key.active)
  return {
    period: { start_date: w.start, end_date: w.end },
    developer: {
      id: developer.id,
      name: developer.name,
      email: developer.email,
      company_name: developer.company_name,
      website: developer.website,
      use_case_description: developer.use_case_description,
      approved: developer.approved,
      legacy_free: developer.legacy_free,
      max_keys: developer.max_keys,
      created_at: developer.created_at,
      plan: developer.plan
    },
    totals: {
      requests_in_period: row.requests_in_period,
      previous_period_requests: row.previous_period_requests,
      active_days_in_period: row.active_days_in_period,
      keys_used_in_period: keys.filter(key => keyRequests(key, w) > 0).length,
      lifetime_requests: keys.reduce((a, key) => a + key.daily.reduce((x, y) => x + y, 0), 0),
      last_used_at: row.last_used_at,
      peak_day: peak,
      daily_limit: activeKeys.length ? Math.max(...activeKeys.map(key => key.daily_limit)) : null,
      days_near_limit: nearDays
    },
    daily: sparseMap(daily, w),
    keys: keys.map(key => {
      let days = 0
      for (let i = w.s; i <= w.e && w.n; i += 1) if (key.daily[i]) days += 1
      return {
        id: key.id,
        name: key.name,
        key_preview: key.key_preview,
        active: key.active,
        billing_active: key.billing_active,
        expires_at: key.expires ? at(key.expires, '00:00:00') : null,
        created_at: at(key.created, '10:00:00'),
        last_used_at: lastUsedAt(key),
        lifetime_requests: key.daily.reduce((a, b) => a + b, 0),
        requests_in_period: keyRequests(key, w),
        active_days_in_period: days,
        rate_limit_multiplier: key.multiplier,
        daily_limit: key.daily_limit,
        daily: sparseMap(key.daily, w)
      }
    }),
    endpoints: mergeEndpoints(keys, w),
    weekdays: Object.fromEntries(Object.entries(weekdays).map(([day, value]) => [day, value]))
  }
}

const liturgicalToday = () => ({
  scope: 'today',
  date: TODAY,
  prayer_book_code: 'loc_2015',
  season: 'Tempo Comum',
  color_code: 'green',
  color_label: 'Verde',
  week: 34,
  proper: 29,
  cycle: 'A',
  season_ends_on: '2026-11-28',
  days_remaining_in_season: 2,
  celebration_name: null
})

// Not read from /dashboard by the portal (the Áudio tab has its own summary);
// answered so a request for every section does not fail.
const audioStub = () => ({ scope: 'lifetime' })

const SECTIONS = {
  overview, users, completions, prayer_books: prayerBooks, journals, audio: audioStub, notifications,
  life_rules: lifeRulesSection, shared_offices: sharedOffices, engagement, moderation, health, retention, onboarding,
  premium, geography, custom_rosaries: customRosaries, weekly_prayers: weeklyPrayers, favorites, api, developers,
  liturgical_today: liturgicalToday
}
const SECTION_NAMES = Object.keys(SECTIONS)

// --- Life rules (public ones only, as the admin queue shows them) --------------

const step = (id, order, title, description) => ({ id, order, title, description })
const LIFE_RULES = [
  // Approved: the seeded rules and two from the community.
  { id: 1, icon: '⛪', title: 'Regra de Vida Anglicana de São Bernardo', description: 'Doze compromissos de oração, jejum e estudo, na tradição de São Bernardo.', approved: true, adoption_count: 612, created: '2024-10-01', owner: [1, 'Sistema São Bernardo'],
    steps: [step(101, 1, 'Oração Diária', 'Orar as Orações da Manhã e da Noite em horário fixo, de segunda a sexta-feira.'), step(102, 2, 'Jejum nas Sextas-feiras', 'Jejuar até as 17h nas sextas-feiras do ano, exceto no Natal e na Páscoa.'), step(103, 3, 'Confissão Anual', 'Examinar a si mesmo e fazer confissão a um sacerdote ao menos uma vez por ano.')] },
  { id: 2, icon: '🕊️', title: 'Regra de Vida Anglicana Moldada pela Graça', description: 'Quatro movimentos: permanecer, receber, unir-se e pertencer a Cristo.', approved: true, adoption_count: 804, created: '2024-10-01', owner: [2, 'Sistema Graça'],
    steps: [step(201, 1, 'Permanecer em Cristo', 'Ao menos um Ofício Diário por dia e alguns minutos de silêncio.'), step(202, 2, 'Receber a vida de Cristo', 'Usar a coleta do domingo para guiar as orações da semana.'), step(203, 3, 'Unir-se à obra de Cristo', 'Servir à igreja sem esperar reconhecimento.'), step(204, 4, 'Pertencer ao corpo de Cristo', 'Ter amigos espirituais e alguém que ore por mim.')] },
  { id: 3, icon: '✝️', title: 'Regra de Vida do Tríplice Dever', description: 'Culto público, oração privada e serviço, como no Tríplice Dever anglicano.', approved: true, adoption_count: 455, created: '2024-10-01', owner: [3, 'Sistema Tríplice Dever'],
    steps: [step(301, 1, 'Culto Público', 'Participar da Eucaristia todos os domingos.'), step(302, 2, 'Oração Privada', 'Orações breves ao acordar e ao deitar.'), step(303, 3, 'Intercessão', 'Manter uma lista de pessoas para apresentar a Deus diariamente.')] },
  { id: 4, icon: '🍁', title: 'Regra de Vida da Comunhão de Oração Anglicana (Canadá)', description: 'Oração diária, Escrituras e Eucaristia, na forma da ACOP.', approved: true, adoption_count: 188, created: '2024-10-01', owner: [4, 'Sistema ACOP Canadá'],
    steps: [step(401, 1, 'Ofício Diário', 'Rezar o Ofício da Manhã ou da Tarde a cada dia.'), step(402, 2, 'Escrituras', 'Ler as leituras do lecionário.')] },
  { id: 5, icon: '🌿', title: 'Regra de Vida Simples', description: 'Para quem está começando: três passos pequenos e fiéis.', approved: true, adoption_count: 967, created: '2024-10-01', owner: [5, 'Sistema Simples'],
    steps: [step(501, 1, 'Uma oração por dia', 'Rezar ao menos um ofício por dia.'), step(502, 2, 'Domingo', 'Participar do culto dominical.'), step(503, 3, 'Gratidão', 'Agradecer antes das refeições.')] },
  { id: 6, icon: '🏰', title: 'Regra de Vida da Comunidade da Catedral de Gloucester', description: 'Oração, estudo e hospitalidade, na regra da comunidade da catedral.', approved: true, adoption_count: 143, created: '2024-10-01', owner: [6, 'Sistema Gloucester'],
    steps: [step(601, 1, 'Oração', 'Rezar o Ofício com a comunidade quando possível.'), step(602, 2, 'Hospitalidade', 'Acolher quem chega como ao próprio Cristo.')] },
  { id: 37, icon: '🌾', title: 'Pequena Regra da Gratidão', description: 'Um exame diário de gratidão ao fim do dia, com as Completas.', approved: true, adoption_count: 212, created: '2026-05-14', owner: [2741, 'Lúcia F.'],
    steps: [step(3701, 1, 'Completas', 'Rezar as Completas antes de dormir.'), step(3702, 2, 'Três graças', 'Anotar três motivos de gratidão do dia.')] },
  { id: 44, icon: '📖', title: 'Regra de São Bento para leigos', description: 'Ora et labora no ritmo de uma casa cheia: oração, trabalho e leitura.', approved: true, adoption_count: 97, created: '2026-08-02', owner: [618, 'Inês C.'],
    steps: [step(4401, 1, 'Ora', 'Manhã e Completas todos os dias.'), step(4402, 2, 'Labora', 'Oferecer o trabalho do dia a Deus.'), step(4403, 3, 'Lectio', 'Quinze minutos de leitura orante.')] },
  // Waiting for approval (the API lists them; it has no approve action yet).
  { id: 58, icon: '🏠', title: 'Regra do Lar Anglicano', description: 'Uma regra para rezar em família, com crianças pequenas.', approved: false, adoption_count: 3, created: ago(12, 4), owner: [4410, 'Beatriz R.'],
    steps: [step(5801, 1, 'Oração da Manhã em família', 'Versão breve do Ofício da Manhã à mesa do café.'), step(5802, 2, 'A coleta do domingo', 'Rezar a coleta da semana antes do jantar.'), step(5803, 3, 'Um salmo antes de dormir', 'Ler um salmo curto com as crianças.')] },
  { id: 61, icon: '🕯️', title: 'Jejum e Esmola no Advento', description: 'Preparar o Natal com jejum às sextas, esmola semanal e Completas.', approved: false, adoption_count: 1, created: ago(5, 2), owner: [880, 'Raquel N.'],
    steps: [step(6101, 1, 'Jejum às sextas', 'Jejum até o meio-dia nas sextas-feiras do Advento.'), step(6102, 2, 'Esmola', 'Separar uma quantia por semana para quem precisa.'), step(6103, 3, 'Completas', 'Rezar as Completas antes de dormir.')] },
  { id: 63, icon: '📚', title: 'Regra de vida para estudantes', description: 'Oração curta entre aulas e um dia de descanso por semana.', approved: false, adoption_count: 0, created: ago(3, 6), owner: [3302, 'Mateus V.'],
    steps: [step(6301, 1, 'Meio-dia', 'Rezar o Ofício do Meio-Dia entre as aulas.'), step(6302, 2, 'Sábado sem telas', 'Uma tarde por semana longe das telas.')] },
  { id: 64, icon: '⏰', title: 'Rule of Life for Shift Workers', description: 'Keeping the hours when the hours keep changing: one office per shift.', approved: false, adoption_count: 0, created: ago(0, 20), owner: [6120, 'Daniel H.'],
    steps: [step(6401, 1, 'One office per shift', 'Pray the office closest to the start of each shift.'), step(6402, 2, 'Compline after nights', 'Pray Compline before sleeping, whatever the hour.')] }
]

const lifeRuleFixtures = world => world.empty ? [] : LIFE_RULES.map(rule => {
  const created = rule.created.length === 10 ? at(rule.created, '09:00:00') : rule.created
  return {
    id: rule.id,
    icon: rule.icon,
    title: rule.title,
    description: rule.description,
    is_public: true,
    approved: rule.approved,
    adoption_count: rule.adoption_count,
    created_at: created,
    updated_at: created,
    pending_since: rule.approved ? null : created,
    owner: { id: rule.owner[0], name: rule.owner[1] },
    steps: rule.steps
  }
})

// --- Rosaries in moderation ----------------------------------------------------

const TEXT = {
  cruz: 'Em nome do Pai, e do Filho, e do Espírito Santo. Amém.',
  invitatorio: 'Ó Deus, vem em nosso auxílio. Senhor, apressa-te em socorrer-nos. Glória ao Pai, e ao Filho, e ao Espírito Santo; como era no princípio, agora e sempre, pelos séculos dos séculos. Amém.',
  paiNosso: 'Pai nosso, que estás nos céus, santificado seja o teu nome; venha o teu reino; seja feita a tua vontade, assim na terra como no céu. O pão nosso de cada dia nos dá hoje; perdoa-nos as nossas ofensas, assim como perdoamos a quem nos tem ofendido; e não nos deixes cair em tentação, mas livra-nos do mal. Pois teu é o reino, o poder e a glória, para sempre. Amém.',
  gloria: 'Glória ao Pai, e ao Filho, e ao Espírito Santo; como era no princípio, agora e sempre, pelos séculos dos séculos. Amém.',
  trisagio: 'Santo Deus, Santo Poderoso, Santo Imortal, tem piedade de nós.',
  jesus: 'Senhor Jesus Cristo, Filho de Deus, tem piedade de mim, pecador.',
  bendigamos: 'Bendigamos ao Senhor. Graças a Deus.',
  completas: 'Guarda-nos, Senhor, acordados, e protege-nos dormindo; para que, acordados, vigiemos com Cristo e, dormindo, descansemos em paz.'
}

// The Anglican rosary: cross, invitatory, four weeks of seven beads each
// introduced by a cruciform bead, and a dismissal.
const anglican = ({ cruciform, week, weekTitle = 'Conta de semana', cruciformTitle = 'Cruciforme', dismissal = TEXT.bendigamos, invitatory = TEXT.invitatorio, cross = TEXT.cruz, labels = {} }) => [
  { name: labels.opening || 'Abertura', repeat_count: 1, in_cycle: false, steps: [{ step_type: 'cross', title: labels.cross || 'Cruz', text: cross, repeat_count: 1 }, { step_type: 'invitatory', title: labels.invitatory || 'Invitatório', text: invitatory, repeat_count: 1 }] },
  { name: cruciformTitle, repeat_count: 1, in_cycle: true, steps: [{ step_type: 'cruciform', title: cruciformTitle, text: cruciform, repeat_count: 1 }] },
  { name: labels.week || 'Semana', repeat_count: 1, in_cycle: true, steps: [{ step_type: 'week', title: weekTitle, text: week, repeat_count: 7 }] },
  { name: labels.closing || 'Encerramento', repeat_count: 1, in_cycle: false, steps: [{ step_type: 'cruciform', title: labels.lordsPrayer || 'Pai Nosso', text: labels.lordsPrayerText || TEXT.paiNosso, repeat_count: 1 }, { step_type: 'dismissal', title: labels.dismissal || 'Despedida', text: dismissal, repeat_count: 1 }] }
]

const AUTHORS = {
  lucia: { id: 2741, name: 'Lúcia Ferraz', email: 'lucia.f@example.com', extra: [2, 0] }, // [earlier approved, earlier rejected] not in these fixtures
  gabriel: { id: 5108, name: 'Gabriel Antunes', email: 'gabriel.a@example.com', extra: [0, 0] },
  pedro: { id: 3377, name: 'Pedro Henrique Lima', email: 'pedroh.l@example.com', extra: [1, 0] },
  clara: { id: 1529, name: 'Clara Menezes', email: 'clara.m@example.com', extra: [3, 1] },
  mariana: { id: 4720, name: 'Mariana Couto', email: 'mariana.c@example.com', extra: [0, 0] },
  tomas: { id: 6633, name: 'Tomás Ribeiro', email: 'tomas.r@example.pt', extra: [0, 0] },
  daniel: { id: 6120, name: 'Daniel Hughes', email: 'daniel.h@example.co.uk', extra: [1, 0] },
  rosa: { id: 7302, name: 'Rosa Albuquerque', email: 'rosa.a@example.com', extra: [0, 0] },
  felipe: { id: 2209, name: 'Felipe Barros', email: 'felipe.b@example.com', extra: [0, 0] },
  joana: { id: 5550, name: 'Joana Prates', email: 'joana.p@example.com', extra: [0, 1] }
}

const CATEGORIES = [
  ['salmos', 'Salmos', 'Rosários feitos a partir de um salmo.', 'book'],
  ['santos', 'Santos', 'Em memória de santos e santas do calendário.', 'star'],
  ['noite', 'Noite', 'Para rezar ao fim do dia, perto das Completas.', 'moon'],
  ['manha', 'Manhã', 'Para começar o dia.', 'sun'],
  ['estacoes', 'Tempos litúrgicos', 'Advento, Natal, Quaresma, Páscoa e Pentecostes.', 'calendar'],
  ['cura', 'Cura', 'Pelos enfermos e por quem cuida deles.', 'heart'],
  ['paz', 'Paz', 'Pela paz no mundo e no coração.', 'dove'],
  ['criacao', 'Criação', 'Louvor a Deus pelas suas obras.', 'leaf'],
  ['tradicionais', 'Tradicionais', 'As formas clássicas do rosário anglicano.', 'cross'],
  ['intercessao', 'Intercessão', 'Para apresentar pessoas e pedidos a Deus.', 'hands']
].map(([slug, name, description, icon]) => ({ documentId: base36(`cat-${slug}`, 24), slug, name, description, icon }))
const categoryRef = slug => {
  const category = CATEGORIES.find(item => item.slug === slug)
  return { mode: 'existing', slug: category.slug, documentId: category.documentId }
}

const ROSARIES = [
  // In review (oldest first by creation)
  { id: 101, title: 'Salmo 23', description: 'O Senhor é o meu pastor: uma semana para cada parte do salmo.', locale: 'pt-BR', status: 'pending_review', author: 'lucia', created: ago(9, 5),
    blocks: anglican({ cruciform: TEXT.gloria, week: 'O Senhor é o meu pastor; nada me faltará.' }),
    similar: [{ title: 'Salmo 23 — O Bom Pastor', source: 'community', score: 0.81, id: 88, strapi_slug: 'salmo-23-o-bom-pastor' }] },
  { id: 102, title: 'Salmo 121', description: 'Para viagens e para quem está longe de casa.', locale: 'pt-BR', status: 'pending_review', author: 'lucia', created: ago(8, 22),
    blocks: anglican({ cruciform: TEXT.gloria, week: 'O meu socorro vem do Senhor, que fez o céu e a terra.' }), similar: [] },
  { id: 103, title: 'Salmo 91', description: 'Sob a proteção do Altíssimo.', locale: 'pt-BR', status: 'pending_review', author: 'lucia', created: ago(8, 21),
    blocks: anglican({ cruciform: TEXT.gloria, week: 'Aquele que habita no esconderijo do Altíssimo descansa à sombra do Onipotente.' }), similar: [] },
  { id: 104, title: 'Rosário da Paz', description: 'Pela paz no mundo, especialmente onde há guerra.', locale: 'pt-BR', status: 'pending_review', author: 'gabriel', created: ago(7, 3),
    blocks: anglican({ cruciform: 'A paz de Deus, que excede todo entendimento, guarde os nossos corações e as nossas mentes em Cristo Jesus.', week: 'Senhor, dá a paz em nossos dias.' }),
    similar: [{ title: 'Terço pela Paz', source: 'catalog', score: 0.78, id: null, strapi_slug: 'terco-pela-paz' }] },
  { id: 105, title: 'Oração de Jesus', description: 'A oração do coração, com o Triságio nas contas cruciformes.', locale: 'pt-BR', status: 'pending_review', author: 'pedro', created: ago(6, 1),
    blocks: anglican({ cruciform: TEXT.trisagio, week: TEXT.jesus }),
    similar: [{ title: 'Oração de Jesus para a noite', source: 'queue', score: 0.74, id: 106, strapi_slug: null }] },
  { id: 106, title: 'Oração de Jesus para a noite', description: 'Para antes de dormir, com a antífona das Completas.', locale: 'pt-BR', status: 'pending_review', author: 'clara', created: ago(5, 8),
    blocks: anglican({ cruciform: TEXT.completas, week: TEXT.jesus, dismissal: 'O Senhor todo-poderoso nos conceda uma noite tranquila e um fim perfeito. Amém.' }),
    similar: [{ title: 'Oração de Jesus', source: 'queue', score: 0.74, id: 105, strapi_slug: null }, { title: 'Rosário da Oração de Jesus', source: 'catalog', score: 0.69, id: null, strapi_slug: 'rosario-da-oracao-de-jesus' }] },
  { id: 107, title: 'Rosário do Advento', description: 'Quatro semanas, uma para cada domingo do Advento.', locale: 'pt-BR', status: 'pending_review', author: 'mariana', created: ago(24, 2), updated: ago(1, 19),
    reentry: { count: 1, at: ago(1, 19) }, note: 'As contas de semana estavam sem texto. Pode reenviar quando completar.',
    blocks: anglican({ cruciform: 'Preparai o caminho do Senhor; endireitai as suas veredas.', week: 'Vem, Senhor Jesus.' }), similar: [] },
  { id: 108, title: 'Rosário da Criação', description: 'O Benedicite em contas.', locale: 'pt-PT', status: 'pending_review', author: 'tomas', created: ago(2, 23),
    blocks: anglican({ cruciform: 'Ó Senhor, quão variadas são as tuas obras! Todas as fizeste com sabedoria.', week: 'Bendizei o Senhor, todas as obras do Senhor; louvai-o e exaltai-o para sempre.', dismissal: '' }), similar: [] },
  { id: 109, title: 'Rosary of the Holy Trinity', description: 'The Trisagion on the week beads, the Gloria on the cruciforms.', locale: 'en', status: 'pending_review', author: 'daniel', created: ago(2, 6),
    blocks: anglican({
      cruciform: 'Glory to the Father, and to the Son, and to the Holy Spirit: as it was in the beginning, is now, and will be for ever. Amen.',
      week: 'Holy God, Holy and Mighty, Holy Immortal One, have mercy upon us.',
      weekTitle: 'Week bead', cruciformTitle: 'Cruciform', cross: 'In the Name of the Father, and of the Son, and of the Holy Spirit. Amen.',
      invitatory: 'O God, make speed to save us. O Lord, make haste to help us.', dismissal: 'Let us bless the Lord. Thanks be to God.',
      labels: { opening: 'Opening', cross: 'Cross', invitatory: 'Invitatory', week: 'Week', closing: 'Closing', lordsPrayer: "Lord's Prayer", dismissal: 'Dismissal',
        lordsPrayerText: 'Our Father, who art in heaven, hallowed be thy Name, thy kingdom come, thy will be done, on earth as it is in heaven. Give us this day our daily bread. And forgive us our trespasses, as we forgive those who trespass against us. And lead us not into temptation, but deliver us from evil. For thine is the kingdom, and the power, and the glory, for ever and ever. Amen.' }
    }), similar: [] },
  { id: 110, title: 'Rosário de cura', description: 'Pelos enfermos da paróquia.', locale: 'pt-BR', status: 'pending_review', author: 'rosa', created: ago(1, 4),
    blocks: anglican({ cruciform: TEXT.paiNosso, week: 'Cura-me, Senhor, e serei curado; salva-me, e serei salvo.' }), similar: [] },
  { id: 111, title: 'Rosário de Santo Agostinho', description: 'Com a frase das Confissões.', locale: 'pt-BR', status: 'pending_review', author: 'felipe', created: ago(0, 3),
    blocks: anglican({ cruciform: TEXT.gloria, week: 'Tu nos fizeste para ti, Senhor, e inquieto está o nosso coração enquanto não repousa em ti.' }), similar: [] },
  // Approved
  { id: 88, title: 'Salmo 23 — O Bom Pastor', description: 'O salmo do pastor, uma semana por estrofe.', locale: 'pt-BR', status: 'approved', author: 'clara', created: ago(44, 2), reviewed: ago(40, 1),
    slug: 'salmo-23-o-bom-pastor', category: 'salmos', publication: 'published',
    blocks: anglican({ cruciform: TEXT.gloria, week: 'O Senhor é o meu pastor; nada me faltará.' }), similar: [] },
  { id: 90, title: 'Rosário da manhã', description: 'Para abrir os lábios ao começar o dia.', locale: 'pt-BR', status: 'approved', author: 'pedro', created: ago(25, 7), reviewed: ago(21, 4),
    slug: 'rosario-da-manha', category: 'manha', publication: 'published',
    blocks: anglican({ cruciform: 'Abre, Senhor, os meus lábios, e a minha boca anunciará o teu louvor.', week: 'Este é o dia que o Senhor fez; regozijemo-nos e alegremo-nos nele.' }), similar: [] },
  { id: 95, title: 'Rosário de Todos os Santos', description: 'Com todos os santos, em louvor.', locale: 'pt-BR', status: 'approved', author: 'clara', created: ago(29, 3), reviewed: ago(26, 2),
    slug: 'rosario-de-todos-os-santos', category: 'santos', publication: 'pending',
    blocks: anglican({ cruciform: TEXT.gloria, week: 'Com todos os santos te bendizemos, Senhor.' }), similar: [] },
  { id: 97, title: 'Completas em contas', description: 'A antífona das Completas nas contas de semana.', locale: 'pt-BR', status: 'approved', author: 'daniel', created: ago(9, 12), reviewed: ago(6, 5),
    slug: 'completas-em-contas', category: 'noite', publication: 'published',
    blocks: anglican({ cruciform: TEXT.trisagio, week: TEXT.completas }), similar: [] },
  // Rejected
  { id: 92, title: 'Terço pela paz no mundo', description: 'Pela paz.', locale: 'pt-BR', status: 'rejected', author: 'joana', created: ago(21, 6), reviewed: ago(18, 3),
    note: 'Mesma oração que “Terço pela Paz”, já publicada no catálogo.',
    blocks: anglican({ cruciform: TEXT.paiNosso, week: 'Senhor, dá a paz em nossos dias.' }), similar: [{ title: 'Terço pela Paz', source: 'catalog', score: 0.91, id: null, strapi_slug: 'terco-pela-paz' }] },
  { id: 93, title: 'teste', description: '', locale: 'pt-BR', status: 'rejected', author: 'gabriel', created: ago(33, 1), reviewed: ago(30, 2),
    note: 'Rascunho de teste, sem texto nas contas.',
    blocks: anglican({ cruciform: '', week: '' }), similar: [] },
  { id: 99, title: 'Oração pelos enfermos', description: 'Pelos doentes da família.', locale: 'pt-BR', status: 'rejected', author: 'rosa', created: ago(14, 9), reviewed: ago(11, 6),
    note: 'Algumas contas trazem nomes e dados de saúde de pessoas reais; reenvie sem as informações pessoais.',
    blocks: anglican({ cruciform: TEXT.paiNosso, week: 'Senhor, cura os teus servos que estão enfermos.' }), similar: [] }
]
// The resubmission was rejected once before it came back.
const REJECTED_BEFORE = { 107: 1 }

// Approve/reject decisions taken in the playground, by id.
const decisions = new Map()
export const reset = () => decisions.clear()

// Blocks marked in_cycle repeat together, interleaved, `cycle_repeat` times
// (as CustomRosaryPrayers::Expansion does).
const expand = (blocks, cycleRepeat) => {
  const beadsOf = block => {
    const beads = block.steps.flatMap(item => Array.from({ length: item.repeat_count }, () => item))
    return Array.from({ length: block.repeat_count }, () => beads).flat()
  }
  const sequence = []
  let index = 0
  while (index < blocks.length) {
    if (blocks[index].in_cycle) {
      let finish = index
      while (finish < blocks.length && blocks[finish].in_cycle) finish += 1
      for (let lap = 0; lap < cycleRepeat; lap += 1) blocks.slice(index, finish).forEach(block => sequence.push(...beadsOf(block)))
      index = finish
    } else {
      sequence.push(...beadsOf(blocks[index]))
      index += 1
    }
  }
  return sequence.slice(0, 500).map((item, i) => ({ position: i + 1, step_type: item.step_type, title: item.title, display_title: item.title, text: item.text }))
}

const rosaryFixtures = world => world.empty ? [] : ROSARIES.map(fixture => {
  const decision = decisions.get(fixture.id) || {}
  const cycleRepeat = 4
  const blocks = fixture.blocks.map((block, b) => ({
    id: fixture.id * 100 + b + 1,
    client_id: `blk-${hex(`${fixture.id}-${b}`, 8)}`,
    position: b + 1,
    name: block.name,
    repeat_count: block.repeat_count,
    in_cycle: block.in_cycle,
    steps: block.steps.map((item, s) => ({ id: fixture.id * 1000 + b * 10 + s + 1, client_id: `stp-${hex(`${fixture.id}-${b}-${s}`, 8)}`, position: s + 1, step_type: item.step_type, title: item.title, text: item.text, repeat_count: item.repeat_count }))
  }))
  const expanded = expand(fixture.blocks, cycleRepeat)
  const status = decision.share_status || fixture.status
  return {
    id: fixture.id,
    client_id: `local-${hex(`rosary-${fixture.id}`, 12)}`,
    title: fixture.title,
    description: fixture.description,
    locale: fixture.locale,
    cycle_repeat: cycleRepeat,
    is_public: true,
    share_status: status,
    created_at: fixture.created,
    updated_at: decision.updated_at || fixture.updated || fixture.reviewed || fixture.created,
    authorKey: fixture.author,
    moderation_note: 'moderation_note' in decision ? decision.moderation_note : fixture.note || null,
    strapi_slug: decision.strapi_slug || fixture.slug || null,
    category: decision.category || (fixture.category ? categoryRef(fixture.category) : null),
    reviewed_at: decision.reviewed_at || fixture.reviewed || null,
    publication_status: decision.publication_status || fixture.publication || null,
    documentId: decision.documentId || (fixture.publication === 'published' ? base36(`doc-${fixture.id}`, 24) : null),
    translation_status: (decision.publication_status || fixture.publication) === 'published' ? 'translated' : null,
    translations: (decision.publication_status || fixture.publication) === 'published'
      ? ['pt-BR', 'pt-PT', 'en', 'es'].map(locale => ({ locale, status: 'published' }))
      : [],
    moderation_reentry_count: fixture.reentry?.count || 0,
    last_moderation_reentry_at: fixture.reentry?.at || null,
    expanded_steps_count: expanded.length,
    blocks,
    expanded,
    similar_titles: fixture.similar
  }
})

// What the moderator sees about the author, across the whole history.
const authorOf = (key, all) => {
  const author = AUTHORS[key]
  const theirs = all.filter(item => item.authorKey === key)
  const approved = theirs.filter(item => item.share_status === 'approved').length + author.extra[0]
  const rejected = theirs.filter(item => item.share_status === 'rejected').length + author.extra[1] + theirs.reduce((a, item) => a + (REJECTED_BEFORE[item.id] || 0), 0)
  const pending = theirs.filter(item => item.share_status === 'pending_review').length
  return {
    id: author.id,
    name: author.name,
    email: author.email,
    submissions_count: theirs.length + author.extra[0] + author.extra[1],
    approved_count: approved,
    rejected_count: rejected,
    pending_count: pending
  }
}

const serializeRosary = (item, all, { detail = false } = {}) => {
  const { authorKey, expanded, ...rest } = item
  return { ...rest, author: authorOf(authorKey, all), ...(detail ? { expanded_steps: expanded } : {}) }
}

const normalizeText = value => String(value || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '')

const ROSARY_SORT = {
  created_at: item => item.created_at,
  updated_at: item => item.updated_at,
  title: item => normalizeText(item.title),
  author: item => normalizeText(AUTHORS[item.authorKey].name),
  locale: item => item.locale,
  status: item => item.share_status,
  publication_status: item => item.publication_status,
  cycle_repeat: item => item.cycle_repeat,
  is_public: item => item.is_public ? 1 : 0,
  strapi_slug: item => item.strapi_slug,
  reviewed_at: item => item.reviewed_at,
  reentries: item => item.moderation_reentry_count
}

const listRosaries = (world, params) => {
  const all = rosaryFixtures(world)
  const status = params.get('share_status') || params.get('status')
  const search = normalizeText(params.get('search')).trim()
  let items = all.filter(item => !status || item.share_status === status)
  if (search) items = items.filter(item => [item.title, item.description, AUTHORS[item.authorKey].name].some(text => normalizeText(text).includes(search)))
  const getter = ROSARY_SORT[params.get('sort')] || ROSARY_SORT.created_at
  const direction = (params.get('direction') || 'desc').toLowerCase() === 'asc' ? 1 : -1
  items = [...items].sort((a, b) => {
    const left = getter(a)
    const right = getter(b)
    if (left == null && right != null) return 1 // nulls last either way
    if (right == null && left != null) return -1
    if (left < right) return -direction
    if (left > right) return direction
    return (a.id - b.id) * direction
  })
  const limit = Math.min(Math.max(Number.parseInt(params.get('limit') || params.get('per_page') || '20', 10) || 20, 1), 100)
  const page = Number.parseInt(params.get('page') || '0', 10)
  const offset = Math.max(Number.parseInt(params.get('offset') || '', 10) || (page > 1 ? (page - 1) * limit : 0), 0)
  const slice = items.slice(offset, offset + limit)
  return {
    custom_rosary_prayers: slice.map(item => serializeRosary(item, all)),
    pagination: { total: items.length, limit, offset, count: slice.length, has_next: offset + slice.length < items.length }
  }
}

const decide = (world, id, action, body) => {
  const all = rosaryFixtures(world)
  const item = all.find(rosary => String(rosary.id) === String(id))
  if (!item) return notFound('Oração não encontrada')
  const now = new Date(NOW_MS).toISOString()
  if (action === 'approve') {
    const category = body?.category
    if (!category || !category.slug || (category.mode === 'new' && !category.name)) {
      return { status: 422, json: { error: 'category is required', errors: { category: ['is required'] } } }
    }
    const selection = category.mode === 'new'
      ? { mode: 'new', slug: category.slug, name: category.name, ...(category.description ? { description: category.description } : {}), ...(category.icon ? { icon: category.icon } : {}) }
      : { mode: 'existing', slug: category.slug, ...(category.documentId ? { documentId: category.documentId } : CATEGORIES.find(c => c.slug === category.slug) ? { documentId: CATEGORIES.find(c => c.slug === category.slug).documentId } : {}) }
    decisions.set(item.id, { share_status: 'approved', moderation_note: null, strapi_slug: String(body?.strapi_slug || item.strapi_slug || '').trim() || null, category: selection, reviewed_at: now, publication_status: 'pending', updated_at: now })
  } else {
    const reason = typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim() : null
    decisions.set(item.id, { share_status: 'rejected', moderation_note: reason, reviewed_at: now, updated_at: now, publication_status: item.publication_status === 'published' ? 'unpublishing' : item.publication_status })
  }
  const updated = rosaryFixtures(world)
  return ok({ custom_rosary_prayer: serializeRosary(updated.find(rosary => rosary.id === item.id), updated, { detail: true }) })
}

const listLifeRules = (world, params) => {
  const status = params.get('status') || 'all'
  if (!['pending', 'approved', 'all'].includes(status)) return { status: 400, json: { error: 'Invalid status. Use pending, approved, or all' } }
  const search = normalizeText(params.get('search')).trim()
  let rules = lifeRuleFixtures(world)
  if (status === 'pending') rules = rules.filter(rule => !rule.approved)
  if (status === 'approved') rules = rules.filter(rule => rule.approved)
  if (search) rules = rules.filter(rule => normalizeText(rule.title).includes(search))
  rules.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id)
  const limit = Math.min(Math.max(Number.parseInt(params.get('limit') || '20', 10) || 20, 1), 100)
  const offset = Math.max(Number.parseInt(params.get('offset') || '0', 10) || 0, 0)
  const slice = rules.slice(offset, offset + limit)
  return ok({ life_rules: slice, pagination: { total: rules.length, limit, offset, count: slice.length } })
}

// --- Router --------------------------------------------------------------------

const ok = json => ({ status: 200, json })
const notFound = (error = 'Não encontrado') => ({ status: 404, json: { error, code: 'NOT_FOUND' } })

// The period, validated the way the API does.
const readPeriod = params => {
  for (const name of ['start_date', 'end_date']) {
    const value = params.get(name)
    if (value && !isDate(value)) return { error: { status: 400, json: { error: `Invalid ${name}. Use ISO 8601 format (YYYY-MM-DD)`, code: 'INVALID_DATE', parameter: name } } }
  }
  const end = params.get('end_date') || TODAY
  const start = params.get('start_date') || addDays(end, -30)
  if (start > end) return { error: { status: 422, json: { error: 'start_date must be before end_date' } } }
  return { window: windowOf(start, end) }
}

const dashboard = (world, params) => {
  const { window, error } = readPeriod(params)
  if (error) return error
  const requested = (params.get('sections') || '').split(',').map(item => item.trim()).filter(Boolean)
  const invalid = requested.filter(name => !SECTIONS[name])
  if (invalid.length) return { status: 400, json: { error: 'Unknown dashboard sections', invalid_sections: invalid, available_sections: SECTION_NAMES } }
  const sections = requested.length ? [...new Set(requested)] : SECTION_NAMES
  const data = {}
  for (const name of sections) data[name] = SECTIONS[name](world, window)
  return ok({ period: { start_date: window.start, end_date: window.end }, sections, data })
}

export function handle ({ method = 'GET', pathname, query, body = null, scenario = 'normal' }) {
  const params = query instanceof URLSearchParams ? query : new URLSearchParams(query || '')
  const world = worldFor(scenario)
  const verb = String(method).toUpperCase()

  if (verb === 'GET' && pathname === '/api/v1/dashboard') return dashboard(world, params)

  const developer = pathname.match(/^\/api\/v1\/dashboard\/developers\/([^/]+)$/)
  if (verb === 'GET' && developer) {
    const { window, error } = readPeriod(params)
    if (error) return error
    const detail = developerDetail(world, decodeURIComponent(developer[1]), window)
    return detail ? ok(detail) : notFound('Desenvolvedor não encontrado')
  }

  if (verb === 'GET' && pathname === '/api/v1/admin/life_rules') return listLifeRules(world, params)
  if (verb === 'GET' && pathname === '/api/v1/admin/rosary_categories') return ok({ rosary_categories: world.empty ? [] : CATEGORIES })
  if (verb === 'GET' && pathname === '/api/v1/admin/custom_rosary_prayers') return ok(listRosaries(world, params))

  const rosary = pathname.match(/^\/api\/v1\/admin\/custom_rosary_prayers\/([^/]+)$/)
  if (verb === 'GET' && rosary) {
    const all = rosaryFixtures(world)
    const item = all.find(entry => String(entry.id) === decodeURIComponent(rosary[1]))
    return item ? ok({ custom_rosary_prayer: serializeRosary(item, all, { detail: true }) }) : notFound('Oração não encontrada')
  }
  const action = pathname.match(/^\/api\/v1\/admin\/custom_rosary_prayers\/([^/]+)\/(approve|reject)$/)
  if (verb === 'POST' && action) return decide(world, decodeURIComponent(action[1]), action[2], body)

  return null
}
