// Mock answers for the Feature flags tab, shaped like the contract in
// notes/painel-flags-livros/API-flags.md (types/flags.ts). Example data only:
// names, e-mails and numbers are made up; the flag keys and the book are the
// real ones. Today is 2026-11-26, 15:10 in Brasília. Served only by
// layers/ordo/.playground; the site never imports it.
//
//   handle({ method, pathname, query, body, scenario }) → { status, json } | null
//
// The mock keeps state: create, change, delete and undo work until the
// scenario changes (switching scenario starts over from its fixtures).
//
// Scenarios:
//   normal       the approved mockups: 5 flags, 2 on, 2 partial, 1 off, 2 schedules
//   agendadas    several schedules, one of them 40 min late ("não aplicado")
//   porcentagem  flags at 1%, 25% and 50%, with and without people chosen
//   sem-api      the API without feature flags: every route answers 404 ("em breve")

const NOW = Date.parse('2026-11-26T15:10:00-03:00')
const MIN = 60_000
const DAY = 86_400_000

/** An instant in Brasília, as the API writes it: 2026-12-07T09:00:00.000-03:00 */
const br = (ms) => {
  const shifted = new Date(ms - 3 * 3_600_000)
  return `${shifted.toISOString().slice(0, 19)}.000-03:00`
}
const ago = (minutes) => br(NOW - minutes * MIN)
const daysAgo = (days, hour = 14) => br(NOW - days * DAY + (hour - 15) * 3_600_000)

// Accounts the reach counts (the API counts accounts, not anonymous people).
const ACCOUNTS = 12_480
const PREMIUM = 1_910

const FIRST = ['Ana', 'Bruno', 'Clara', 'Davi', 'Elisa', 'Felipe', 'Gabriela', 'Heitor', 'Isabel', 'João', 'Laura', 'Mateus', 'Nina', 'Otávio', 'Paula', 'Rafael', 'Sofia', 'Tiago', 'Vera', 'Lucas']
const LAST = ['Exemplo', 'Teste', 'Modelo', 'Amostra', 'Fictícia', 'Demo']
const PEOPLE = FIRST.map((first, index) => {
  const last = LAST[index % LAST.length]
  return {
    id: 1000 + index,
    name: `${first} ${last}`,
    email: `${first.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}@exemplo.org`,
    premium_active: index % 3 !== 2
  }
})
const person = id => PEOPLE.find(item => item.id === id)

// ---------- Fixtures per scenario ----------

const base = (flag) => ({
  description: null,
  kind: 'feature',
  prayer_book_code: null,
  prayer_book_name: null,
  prayer_book_release_gated: null,
  requires_premium: false,
  targeted: true,
  rule: null,
  percentage: null,
  enable_at: null,
  disable_at: null,
  created_at: daysAgo(200),
  deleted_at: null,
  ...flag
})

const rules = (ids, sinceDays) => ids.map((id, index) => ({ user_id: id, enabled: true, since: daysAgo(sinceDays[index % sinceDays.length]) }))

const fixtures = (scenario) => {
  const flags = [
    base({ key: 'daily_office_audio', name: 'Narração do ofício', description: 'Áudio narrado nos ofícios do dia.', requires_premium: true, rule: 'on', updated: daysAgo(75) }),
    base({ key: 'background_music', name: 'Música de fundo', description: 'Trilha instrumental por baixo da narração.', requires_premium: true, rule: 'on', updated: daysAgo(54) }),
    base({ key: 'prayer_groups', name: 'Grupos de oração', description: 'Criar e rezar em grupo, com convite por link.', requires_premium: true, rule: 'percentage', percentage: 10, enable_at: br(Date.parse('2026-12-07T09:00:00-03:00')), updated: daysAgo(3) }),
    base({ key: 'yearly_wrapped', name: 'Retrospectiva do ano', description: 'O ano litúrgico de cada pessoa, de Advento a Advento.', rule: 'off', enable_at: br(Date.parse('2026-11-29T00:00:00-03:00')), updated: daysAgo(5) }),
    base({ key: 'prayer_book_loc_2027', name: 'REB - 2027', description: 'Livro em pré-lançamento.', kind: 'prayer_book', prayer_book_code: 'loc_2027', prayer_book_name: 'REB - 2027', prayer_book_release_gated: true, targeted: false, rule: 'off', updated: daysAgo(8) })
  ]
  const users = {
    prayer_groups: rules(PEOPLE.slice(0, 14).map(item => item.id), [3, 3, 9, 9, 21, 21]),
    prayer_book_loc_2027: rules(PEOPLE.slice(14, 20).map(item => item.id), [8, 8, 8, 8, 30, 30])
  }
  const changes = [
    { id: 41, flag_key: 'prayer_groups', action: 'rule', before: { rule: 'off', percentage: null }, after: { rule: 'percentage', percentage: 10 }, created_at: daysAgo(3, 14) },
    { id: 40, flag_key: 'prayer_groups', action: 'schedule', before: { enable_at: null, disable_at: null }, after: { enable_at: br(Date.parse('2026-12-07T09:00:00-03:00')), disable_at: null }, created_at: daysAgo(3, 13) },
    { id: 39, flag_key: 'prayer_groups', action: 'users_add', before: { rules: [] }, after: { user_ids: [1000, 1001], enabled: true }, created_at: daysAgo(3, 12) },
    { id: 38, flag_key: 'yearly_wrapped', action: 'schedule', before: { enable_at: null, disable_at: null }, after: { enable_at: br(Date.parse('2026-11-29T00:00:00-03:00')), disable_at: null }, created_at: daysAgo(5) },
    { id: 37, flag_key: 'prayer_groups', action: 'users_add', before: { rules: [] }, after: { user_ids: [1002, 1003, 1004, 1005], enabled: true }, created_at: daysAgo(9) },
    { id: 36, flag_key: 'prayer_book_loc_2027', action: 'users_add', before: { rules: [] }, after: { user_ids: [1014, 1015, 1016, 1017], enabled: true }, created_at: daysAgo(8) },
    { id: 30, flag_key: 'background_music', action: 'rule', before: { rule: 'percentage', percentage: 50 }, after: { rule: 'on', percentage: null }, created_at: daysAgo(54) }
  ]

  if (scenario === 'agendadas') {
    const wrapped = flags.find(flag => flag.key === 'yearly_wrapped')
    // The job should have turned it on at 14:30 and did not: 40 minutes late.
    wrapped.enable_at = ago(40)
    wrapped.disable_at = br(Date.parse('2027-01-06T00:00:00-03:00'))
    const music = flags.find(flag => flag.key === 'background_music')
    music.disable_at = br(Date.parse('2026-12-24T18:00:00-03:00'))
    const book = flags.find(flag => flag.key === 'prayer_book_loc_2027')
    book.enable_at = br(Date.parse('2027-01-01T00:00:00-03:00'))
    changes.unshift(
      { id: 44, flag_key: 'prayer_book_loc_2027', action: 'schedule', before: { enable_at: null, disable_at: null }, after: { enable_at: book.enable_at, disable_at: null }, created_at: ago(90) },
      { id: 43, flag_key: 'background_music', action: 'schedule', before: { enable_at: null, disable_at: null }, after: { enable_at: null, disable_at: music.disable_at }, created_at: daysAgo(1) },
      { id: 42, flag_key: 'yearly_wrapped', action: 'schedule', before: { enable_at: br(Date.parse('2026-11-29T00:00:00-03:00')), disable_at: null }, after: { enable_at: wrapped.enable_at, disable_at: wrapped.disable_at }, created_at: daysAgo(2) }
    )
  }

  if (scenario === 'porcentagem') {
    const groups = flags.find(flag => flag.key === 'prayer_groups')
    groups.percentage = 25
    groups.enable_at = null
    users.prayer_groups = users.prayer_groups.slice(0, 3)
    const wrapped = flags.find(flag => flag.key === 'yearly_wrapped')
    wrapped.rule = 'percentage'
    wrapped.percentage = 1
    wrapped.enable_at = null
    const music = flags.find(flag => flag.key === 'background_music')
    music.rule = 'percentage'
    music.percentage = 50
    flags.push(base({ key: 'new_calendar', name: 'Calendário novo', description: 'A tela de calendário redesenhada, com o dia litúrgico no topo.', rule: 'percentage', percentage: 5, created_at: daysAgo(2), updated: ago(25) }))
    users.new_calendar = rules([1003, 1006], [1])
    users.new_calendar.push({ user_id: 1009, enabled: false, since: daysAgo(1) })
    changes.unshift(
      { id: 47, flag_key: 'new_calendar', action: 'rule', before: { rule: 'percentage', percentage: 1 }, after: { rule: 'percentage', percentage: 5 }, created_at: ago(25) },
      { id: 46, flag_key: 'background_music', action: 'rule', before: { rule: 'on', percentage: null }, after: { rule: 'percentage', percentage: 50 }, created_at: ago(70) },
      { id: 45, flag_key: 'new_calendar', action: 'create', before: null, after: { key: 'new_calendar', name: 'Calendário novo', rule: 'percentage', percentage: 1 }, created_at: daysAgo(2) }
    )
  }

  for (const change of changes) change.undone_at = null
  return { flags, users, changes, nextId: 100, clock: 0 }
}

// ---------- State ----------

let current = null
let currentScenario = null
const store = (scenario) => {
  if (!current || currentScenario !== scenario) {
    current = fixtures(scenario)
    currentScenario = scenario
  }
  return current
}
const stamp = (db) => br(NOW + (++db.clock) * 20_000)

// ---------- Derived fields (as the contract defines them) ----------

const userRules = (db, key) => db.users[key] || []
const inBase = (flag, rule) => !flag.requires_premium || person(rule.user_id)?.premium_active

const derived = (db, flag) => {
  const all = userRules(db, flag.key)
  const on = all.filter(rule => rule.enabled)
  const off = all.filter(rule => !rule.enabled)
  const baseCount = flag.requires_premium ? PREMIUM : ACCOUNTS
  const onInBase = on.filter(rule => inBase(flag, rule)).length
  const offInBase = off.filter(rule => inBase(flag, rule)).length
  let reach
  if (flag.rule === 'on') reach = baseCount - offInBase
  else if (flag.rule === 'percentage') reach = Math.round((baseCount - onInBase - offInBase) * flag.percentage / 100) + onInBase
  else reach = onInBase
  const pct = flag.percentage ?? 0
  const state = flag.rule === 'on' || (flag.rule === 'percentage' && pct >= 100)
    ? 'on'
    : (flag.rule === 'percentage' && pct > 0) || on.length ? 'partial' : 'off'
  const late = at => at && Date.parse(at) < NOW + db.clock * 20_000 - 10 * MIN
  const ownChanges = db.changes.filter(change => change.flag_key === flag.key).map(change => change.created_at)
  return {
    key: flag.key,
    name: flag.name,
    description: flag.description,
    kind: flag.kind,
    prayer_book_code: flag.prayer_book_code,
    prayer_book_name: flag.prayer_book_name,
    prayer_book_release_gated: flag.prayer_book_release_gated,
    requires_premium: flag.requires_premium,
    targeted: flag.targeted,
    rule: flag.rule,
    percentage: flag.rule === 'percentage' ? flag.percentage : null,
    state,
    users_count: on.length,
    users_off_count: off.length,
    reach_estimate: reach,
    enable_at: flag.enable_at,
    disable_at: flag.disable_at,
    schedule_overdue: Boolean(late(flag.enable_at) || late(flag.disable_at)),
    created_at: flag.created_at,
    updated_at: [flag.updated || flag.created_at, ...ownChanges].sort().at(-1)
  }
}

const live = db => db.flags.filter(flag => !flag.deleted_at)
const ORDER = { feature: 0, prayer_book: 1 }
const sorted = list => [...list].sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || a.name.localeCompare(b.name, 'pt-BR'))

// Which part of a flag a change touches, for "superseded".
const PARTS = {
  create: ['details', 'rule', 'schedule', 'users'],
  delete: ['details', 'rule', 'schedule', 'users'],
  details: ['details'],
  rule: ['rule'],
  schedule: ['schedule'],
  scheduled_enable: ['rule', 'schedule'],
  scheduled_disable: ['rule', 'schedule'],
  users_add: ['users'],
  users_remove: ['users']
}

const presentChange = (db, change) => {
  const flag = db.flags.find(item => item.key === change.flag_key)
  const expired = NOW + db.clock * 20_000 - Date.parse(change.created_at) > 30 * DAY
  // People are one part per person: a newer change only blocks when it touches the same ids.
  const ids = item => item.action === 'users_add' ? item.after?.user_ids || [] : item.action === 'users_remove' ? (item.before?.rules || []).map(rule => rule.user_id) : null
  const overlaps = (other) => {
    const mine = ids(change)
    const theirs = ids(other)
    return !mine || !theirs || mine.some(id => theirs.includes(id))
  }
  const newer = db.changes.find(other => other.id > change.id && other.flag_key === change.flag_key && !other.undone_at
    && PARTS[other.action].some(part => PARTS[change.action].includes(part)) && overlaps(other))
  let reason = null
  if (change.undone_at) reason = 'undone'
  else if (expired) reason = 'expired'
  else if (flag?.deleted_at && change.action !== 'delete') reason = 'flag_deleted'
  else if (newer) reason = 'superseded'
  return {
    id: change.id,
    flag_key: change.flag_key,
    flag_name: flag?.name ?? null,
    action: change.action,
    before: change.before,
    after: change.after,
    created_at: change.created_at,
    undone_at: change.undone_at,
    undoable: !reason,
    undo_blocked_reason: reason
  }
}

const recent = db => [...db.changes]
  .filter(change => NOW + db.clock * 20_000 - Date.parse(change.created_at) <= 30 * DAY)
  .sort((a, b) => b.id - a.id)

const detail = (db, flag, query) => {
  const page = Math.max(1, Number(query.get('page') || 1))
  const perPage = Math.min(100, Math.max(1, Number(query.get('per_page') || 50)))
  const all = [...userRules(db, flag.key)].sort((a, b) => b.since.localeCompare(a.since))
  const users = all.slice((page - 1) * perPage, page * perPage).map(rule => userRule(flag, rule))
  return {
    ...derived(db, flag),
    users,
    users_meta: { page, per_page: perPage, total: all.length },
    changes: recent(db).filter(change => change.flag_key === flag.key).slice(0, 50).map(change => presentChange(db, change))
  }
}

const userRule = (flag, rule) => {
  const who = person(rule.user_id)
  return {
    id: rule.user_id,
    name: who?.name ?? null,
    email: who?.email ?? null,
    premium_active: Boolean(who?.premium_active),
    enabled: rule.enabled,
    visible: rule.enabled && (!flag.requires_premium || Boolean(who?.premium_active)),
    since: rule.since
  }
}

const list = (db) => {
  const flags = sorted(live(db)).map(flag => derived(db, flag))
  const scheduled = flags.flatMap(flag => [
    flag.enable_at ? { flag, action: 'enable', at: flag.enable_at } : null,
    flag.disable_at ? { flag, action: 'disable', at: flag.disable_at } : null
  ].filter(Boolean)).map(({ flag, action, at }) => ({
    key: flag.key,
    name: flag.name,
    description: flag.description,
    kind: flag.kind,
    action,
    scheduled_at: at,
    overdue: Date.parse(at) < NOW + db.clock * 20_000 - 10 * MIN
  })).sort((a, b) => Number(b.overdue) - Number(a.overdue) || Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at))
  return {
    flags,
    summary: {
      counts: {
        total: flags.length,
        on: flags.filter(flag => flag.state === 'on').length,
        partial: flags.filter(flag => flag.state === 'partial').length,
        off: flags.filter(flag => flag.state === 'off').length,
        scheduled: flags.filter(flag => flag.enable_at || flag.disable_at).length,
        overdue: flags.filter(flag => flag.schedule_overdue).length,
        feature: flags.filter(flag => flag.kind === 'feature').length,
        prayer_book: flags.filter(flag => flag.kind === 'prayer_book').length,
        user_rules: flags.reduce((sum, flag) => sum + flag.users_count, 0)
      },
      next_scheduled: scheduled.slice(0, 5),
      prerelease_books: flags
        .filter(flag => flag.kind === 'prayer_book' && flag.prayer_book_release_gated && flag.state !== 'on')
        .map(flag => ({ key: flag.key, prayer_book_code: flag.prayer_book_code, name: flag.name, state: flag.state, users_count: flag.users_count, reach_estimate: flag.reach_estimate }))
    },
    recent_changes: recent(db).slice(0, 10).map(change => presentChange(db, change))
  }
}

// ---------- Writes ----------

const error = (status, code, message, extra = {}) => ({ status, json: { error: message, code, ...extra } })
const ok = (json, status = 200) => ({ status, json })
const record = (db, flag, action, before, after) => {
  const change = { id: ++db.nextId, flag_key: flag.key, action, before, after, created_at: stamp(db), undone_at: null }
  db.changes.push(change)
  flag.updated = change.created_at
  return change
}
// Without an offset, a time is read as Brasília.
const readTime = value => value == null || value === '' ? null : br(Date.parse(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value.length === 16 ? `${value}:00` : value}-03:00`))
const snapshot = flag => ({
  key: flag.key, name: flag.name, description: flag.description, kind: flag.kind, prayer_book_code: flag.prayer_book_code,
  requires_premium: flag.requires_premium, targeted: flag.targeted, rule: flag.rule, percentage: flag.percentage,
  enable_at: flag.enable_at, disable_at: flag.disable_at
})
const pick = (source, keys) => Object.fromEntries(keys.filter(key => key in source).map(key => [key, source[key]]))

const invalid = (field, message) => error(422, 'INVALID_FEATURE_FLAG', `${field} ${message}`, { details: { [field]: [message] } })

const validRule = (body) => {
  if (body.rule !== undefined && !['on', 'off', 'percentage'].includes(body.rule)) return invalid('rule', 'is not included in the list')
  if (body.rule === 'percentage' && !(Number.isInteger(body.percentage) && body.percentage >= 0 && body.percentage <= 100)) return invalid('percentage', 'must be between 0 and 100')
  for (const field of ['enable_at', 'disable_at']) {
    if (body[field] && Date.parse(readTime(body[field])) <= NOW + 0) return invalid(field, 'must be in the future')
  }
  return null
}

const create = (db, body) => {
  const kind = body.kind || 'feature'
  const key = kind === 'prayer_book' ? `prayer_book_${body.prayer_book_code || ''}` : body.key
  if (kind === 'feature' && !/^[a-z][a-z0-9_]{1,62}$/.test(key || '')) return invalid('key', 'is invalid')
  if (kind === 'feature' && key.startsWith('prayer_book_')) return invalid('key', 'cannot start with prayer_book_')
  if (kind === 'prayer_book' && !/^[a-z][a-z0-9_]{1,50}$/.test(body.prayer_book_code || '')) return invalid('prayer_book_code', 'must be a pre-release book')
  if (!body.name?.trim()) return invalid('name', "can't be blank")
  const problem = validRule(body)
  if (problem) return problem
  const existing = db.flags.find(flag => flag.key === key)
  if (existing && !existing.deleted_at) return error(409, 'FEATURE_FLAG_KEY_TAKEN', 'key has already been taken')
  if (existing) {
    const removal = [...db.changes].reverse().find(change => change.flag_key === key && change.action === 'delete' && !change.undone_at)
    return error(409, 'FEATURE_FLAG_KEY_TAKEN', 'key was deleted less than 30 days ago', { deleted_change_id: removal?.id ?? null })
  }
  const flag = base({
    key,
    name: body.name.trim(),
    description: body.description || null,
    kind,
    prayer_book_code: kind === 'prayer_book' ? body.prayer_book_code : null,
    prayer_book_name: kind === 'prayer_book' ? body.name.trim() : null,
    prayer_book_release_gated: kind === 'prayer_book' ? true : null,
    requires_premium: Boolean(body.requires_premium),
    targeted: body.targeted ?? true,
    rule: body.rule || 'off',
    percentage: body.rule === 'percentage' ? body.percentage : null,
    enable_at: readTime(body.enable_at),
    disable_at: readTime(body.disable_at),
    created_at: stamp(db)
  })
  db.flags.push(flag)
  record(db, flag, 'create', null, snapshot(flag))
  return ok(detail(db, flag, new URLSearchParams()), 201)
}

const update = (db, flag, body) => {
  const problem = validRule(body)
  if (problem) return problem
  if (body.percentage !== undefined && body.rule === undefined && flag.rule !== 'percentage') return invalid('percentage', 'only applies to the percentage rule')
  const details = ['name', 'description', 'requires_premium', 'targeted'].filter(field => field in body && body[field] !== flag[field])
  if (details.length) {
    const before = pick(flag, details)
    details.forEach(field => { flag[field] = body[field] })
    record(db, flag, 'details', before, pick(flag, details))
  }
  if (body.rule !== undefined) {
    const next = { rule: body.rule, percentage: body.rule === 'percentage' ? body.percentage : null }
    if (next.rule !== flag.rule || next.percentage !== flag.percentage) {
      const before = { rule: flag.rule, percentage: flag.percentage }
      Object.assign(flag, next)
      record(db, flag, 'rule', before, next)
    }
  } else if (body.percentage !== undefined && body.percentage !== flag.percentage) {
    const before = { rule: flag.rule, percentage: flag.percentage }
    flag.percentage = body.percentage
    record(db, flag, 'rule', before, { rule: flag.rule, percentage: flag.percentage })
  }
  if ('enable_at' in body || 'disable_at' in body) {
    const next = {
      enable_at: 'enable_at' in body ? readTime(body.enable_at) : flag.enable_at,
      disable_at: 'disable_at' in body ? readTime(body.disable_at) : flag.disable_at
    }
    if (next.enable_at !== flag.enable_at || next.disable_at !== flag.disable_at) {
      const before = { enable_at: flag.enable_at, disable_at: flag.disable_at }
      Object.assign(flag, next)
      record(db, flag, 'schedule', before, next)
    }
  }
  return ok(detail(db, flag, new URLSearchParams()))
}

const remove = (db, flag) => {
  const before = { ...snapshot(flag), users: userRules(db, flag.key).map(rule => ({ user_id: rule.user_id, enabled: rule.enabled })) }
  const change = record(db, flag, 'delete', before, null)
  change.saved_rules = userRules(db, flag.key)
  flag.deleted_at = change.created_at
  db.users[flag.key] = []
  return ok({ change: presentChange(db, change) })
}

const addUsers = (db, flag, body) => {
  const ids = Array.isArray(body?.user_ids) ? body.user_ids : []
  if (!ids.length || ids.length > 100) return invalid('user_ids', 'must have 1 to 100 ids')
  const unknown = ids.filter(id => !person(id))
  if (unknown.length) return error(422, 'INVALID_FEATURE_FLAG', 'unknown users', { details: { user_ids: ['contain unknown ids'] }, unknown_user_ids: unknown })
  const enabled = body.enabled ?? true
  const list = db.users[flag.key] = userRules(db, flag.key)
  const changed = ids.filter(id => list.find(rule => rule.user_id === id)?.enabled !== enabled)
  if (!changed.length) return ok({ change: null, users: ids.map(id => userRule(flag, list.find(rule => rule.user_id === id))) })
  const before = { rules: list.filter(rule => changed.includes(rule.user_id)).map(rule => ({ user_id: rule.user_id, enabled: rule.enabled })) }
  const since = stamp(db)
  changed.forEach((id) => {
    const existing = list.find(rule => rule.user_id === id)
    if (existing) Object.assign(existing, { enabled, since })
    else list.push({ user_id: id, enabled, since })
  })
  const change = record(db, flag, 'users_add', before, { user_ids: changed, enabled })
  return ok({ change: presentChange(db, change), users: ids.map(id => userRule(flag, list.find(rule => rule.user_id === id))) })
}

const removeUser = (db, flag, userId) => {
  const list = userRules(db, flag.key)
  const rule = list.find(item => item.user_id === userId)
  if (!rule) return error(404, 'USER_RULE_NOT_FOUND', 'user has no rule for this flag')
  db.users[flag.key] = list.filter(item => item !== rule)
  const change = record(db, flag, 'users_remove', { rules: [{ user_id: rule.user_id, enabled: rule.enabled }] }, null)
  change.saved_rules = [rule]
  return ok({ change: presentChange(db, change) })
}

const undo = (db, id) => {
  const change = db.changes.find(item => item.id === id)
  if (!change) return error(404, 'FEATURE_FLAG_CHANGE_NOT_FOUND', 'change not found')
  const shown = presentChange(db, change)
  const codes = { undone: 'ALREADY_UNDONE', expired: 'UNDO_EXPIRED', superseded: 'UNDO_CONFLICT', flag_deleted: 'FEATURE_FLAG_DELETED' }
  if (!shown.undoable) {
    const blocking = db.changes.find(other => other.id > change.id && other.flag_key === change.flag_key && !other.undone_at)
    return error(409, codes[shown.undo_blocked_reason], `cannot undo: ${shown.undo_blocked_reason}`, shown.undo_blocked_reason === 'superseded' ? { blocking_change_id: blocking?.id } : {})
  }
  const flag = db.flags.find(item => item.key === change.flag_key)
  const before = change.before || {}
  switch (change.action) {
    case 'create': flag.deleted_at = stamp(db); break
    case 'delete': {
      Object.assign(flag, pick(before, ['name', 'description', 'requires_premium', 'targeted', 'rule', 'percentage']))
      flag.enable_at = before.enable_at && Date.parse(before.enable_at) > NOW ? before.enable_at : null
      flag.disable_at = before.disable_at && Date.parse(before.disable_at) > NOW ? before.disable_at : null
      db.users[flag.key] = change.saved_rules || []
      flag.deleted_at = null
      break
    }
    case 'details': Object.assign(flag, before); break
    case 'rule':
    case 'scheduled_enable':
    case 'scheduled_disable':
      flag.rule = before.rule ?? null
      flag.percentage = before.percentage ?? null
      break
    case 'schedule':
      flag.enable_at = before.enable_at ?? null
      flag.disable_at = before.disable_at ?? null
      break
    case 'users_add': {
      const list = userRules(db, flag.key)
      const restore = before.rules || []
      db.users[flag.key] = list.flatMap((rule) => {
        if (!change.after.user_ids.includes(rule.user_id)) return [rule]
        const old = restore.find(item => item.user_id === rule.user_id)
        return old ? [{ ...rule, enabled: old.enabled }] : []
      })
      break
    }
    case 'users_remove':
      db.users[flag.key] = [...userRules(db, flag.key), ...(change.saved_rules || [])]
      break
  }
  change.undone_at = stamp(db)
  return ok({ change: presentChange(db, change), flag: flag.deleted_at ? null : derived(db, flag) })
}

// crc32("<key>:<id>") mod 100, as the API buckets people.
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (text) => {
  let crc = 0xFFFFFFFF
  for (const byte of new TextEncoder().encode(text)) crc = CRC[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

const check = (db, flag, query) => {
  const id = Number(query.get('user_id'))
  const who = person(id)
  if (!who) return error(404, 'USER_NOT_FOUND', 'user not found')
  const bucket = crc32(`${flag.key}:${id}`) % 100
  const own = userRules(db, flag.key).find(rule => rule.user_id === id)
  const steps = [{ step: 'premium', required: flag.requires_premium, passed: !flag.requires_premium || who.premium_active }]
  const answer = (visible, stoppedAt) => ok({
    key: flag.key,
    user: who,
    install_id: null,
    visible,
    stopped_at: stoppedAt,
    bucket,
    rule: flag.rule,
    percentage: flag.rule === 'percentage' ? flag.percentage : null,
    user_rule: own ? own.enabled : null,
    steps
  })
  if (flag.kind === 'prayer_book' && flag.prayer_book_release_gated === false) {
    steps.length = 0
    return answer(true, 'released')
  }
  if (!steps[0].passed) return answer(false, 'premium')
  steps.push({ step: 'login', required: flag.targeted, passed: true })
  steps.push({ step: 'user_rule', value: own ? own.enabled : null })
  if (own) return answer(own.enabled, 'user_rule')
  const visible = flag.rule === 'on' || (flag.rule === 'percentage' && bucket < flag.percentage)
  steps.push({ step: 'general_rule', rule: flag.rule, percentage: flag.percentage, bucket, passed: visible })
  if (!flag.rule) {
    steps.push({ step: 'no_rule', passed: false })
    return answer(false, 'no_rule')
  }
  return answer(visible, 'general_rule')
}

const searchUsers = (query) => {
  const term = (query.get('q') || '').trim().toLowerCase()
  if (term.length < 3) return error(422, 'QUERY_TOO_SHORT', 'q must have at least 3 characters')
  const hits = PEOPLE.filter(item => item.name.toLowerCase().includes(term) || item.email.includes(term))
    .sort((a, b) => Number(b.name.toLowerCase().startsWith(term)) - Number(a.name.toLowerCase().startsWith(term)) || a.name.localeCompare(b.name, 'pt-BR'))
  return ok({ users: hits.slice(0, 20) })
}

// ---------- Routes ----------

export function handle ({ method = 'GET', pathname, query, body, scenario = 'normal' }) {
  const admin = '/api/v1/admin'
  const isFlags = pathname === `${admin}/feature_flags` || pathname.startsWith(`${admin}/feature_flags/`) || pathname.startsWith(`${admin}/feature_flag_changes`)
  const isUsers = pathname === `${admin}/users`
  if (!isFlags && !isUsers) return null
  if (scenario === 'sem-api') return error(404, 'NOT_FOUND', `Sem ${pathname} nesta API (cenário sem-api)`)

  const db = store(scenario)
  if (isUsers) return method === 'GET' ? searchUsers(query) : null

  if (pathname === `${admin}/feature_flags`) {
    if (method === 'GET') return ok(list(db))
    if (method === 'POST') return create(db, body || {})
    return null
  }
  if (pathname === `${admin}/feature_flag_changes` && method === 'GET') {
    const page = Math.max(1, Number(query.get('page') || 1))
    const perPage = Math.min(100, Math.max(1, Number(query.get('per_page') || 50)))
    const key = query.get('flag_key')
    const all = recent(db).filter(change => !key || change.flag_key === key)
    return ok({ changes: all.slice((page - 1) * perPage, page * perPage).map(change => presentChange(db, change)), meta: { page, per_page: perPage, total: all.length } })
  }
  const undoMatch = pathname.match(/^\/api\/v1\/admin\/feature_flag_changes\/(\d+)\/undo$/)
  if (undoMatch && method === 'POST') return undo(db, Number(undoMatch[1]))

  const match = pathname.match(/^\/api\/v1\/admin\/feature_flags\/([^/]+)(?:\/(users|check)(?:\/(\d+))?)?$/)
  if (!match) return null
  const flag = live(db).find(item => item.key === decodeURIComponent(match[1]))
  if (!flag) return error(404, 'FEATURE_FLAG_NOT_FOUND', 'feature flag not found')
  const [, , sub, userId] = match
  if (!sub) {
    if (method === 'GET') return ok(detail(db, flag, query))
    if (method === 'PATCH') return update(db, flag, body || {})
    if (method === 'DELETE') return remove(db, flag)
  }
  if (sub === 'users' && !userId && method === 'POST') return addUsers(db, flag, body)
  if (sub === 'users' && userId && method === 'DELETE') return removeUser(db, flag, Number(userId))
  if (sub === 'check' && method === 'GET') return check(db, flag, query)
  return null
}
