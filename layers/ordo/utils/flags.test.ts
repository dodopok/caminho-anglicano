import { describe, expect, it } from 'vitest'
import type { FeatureFlag, FlagChange } from '../types/flags'
import {
  audienceBase,
  audienceLabel,
  canUndo,
  confirmationMatches,
  describeChange,
  flagState,
  formatBrasilia,
  fromBrasiliaInput,
  isFutureBrasilia,
  matchesFilters,
  percentageExplanation,
  projectedReach,
  relativeTime,
  ruleChangeImpact,
  suggestKey,
  toBrasiliaInput,
  undoBlockedLabel,
  validKey,
  validPercentage
} from './flags'

const NOW = new Date('2026-11-26T18:10:00Z') // 15:10 in Brasília

const flag = (overrides: Partial<FeatureFlag> = {}): FeatureFlag => ({
  key: 'prayer_groups',
  name: 'Grupos de oração',
  description: null,
  kind: 'feature',
  prayer_book_code: null,
  prayer_book_name: null,
  prayer_book_release_gated: null,
  requires_premium: true,
  targeted: true,
  rule: 'percentage',
  percentage: 10,
  state: 'partial',
  users_count: 14,
  users_off_count: 0,
  reach_estimate: 200,
  enable_at: null,
  disable_at: null,
  schedule_overdue: false,
  created_at: null,
  updated_at: null,
  ...overrides
})

const change = (overrides: Partial<FlagChange> = {}): FlagChange => ({
  id: 1,
  flag_key: 'prayer_groups',
  flag_name: 'Grupos de oração',
  action: 'rule',
  before: { rule: 'off', percentage: null },
  after: { rule: 'percentage', percentage: 10 },
  created_at: '2026-11-23T14:12:09.000-03:00',
  undone_at: null,
  undoable: true,
  undo_blocked_reason: null,
  ...overrides
})

describe('flags · horário de Brasília', () => {
  it('shows any instant in Brasília, whatever offset it came with', () => {
    expect(formatBrasilia('2026-12-07T09:00:00.000-03:00', { now: NOW })).toBe('7 dez., 09:00')
    expect(formatBrasilia('2026-12-07T12:00:00Z', { now: NOW })).toBe('7 dez., 09:00')
    expect(formatBrasilia('2026-11-29T03:00:00Z', { now: NOW })).toBe('29 nov., 00:00')
    // Midnight UTC is still the day before in Brasília.
    expect(formatBrasilia('2026-12-01T00:30:00Z', { now: NOW })).toBe('30 nov., 21:30')
  })

  it('names the weekday on request and the year only when it is not this one', () => {
    expect(formatBrasilia('2026-12-07T09:00:00-03:00', { now: NOW, weekday: true })).toBe('segunda-feira, 7 dez., 09:00')
    expect(formatBrasilia('2027-01-06T00:00:00-03:00', { now: NOW })).toBe('6 jan. 2027, 00:00')
    expect(formatBrasilia('2026-11-18T14:10:00-03:00', { now: NOW, time: false })).toBe('18 nov.')
  })

  it('reads a datetime-local field as Brasília and sends it with the offset', () => {
    expect(fromBrasiliaInput('2026-12-07T09:00')).toBe('2026-12-07T09:00:00-03:00')
    expect(new Date(fromBrasiliaInput('2026-12-07T09:00')!).toISOString()).toBe('2026-12-07T12:00:00.000Z')
    expect(fromBrasiliaInput('')).toBeNull()
    expect(fromBrasiliaInput('07/12/2026 09:00')).toBeNull()
    expect(toBrasiliaInput('2026-12-07T12:00:00Z')).toBe('2026-12-07T09:00')
    expect(toBrasiliaInput(null)).toBe('')
  })

  it('tells a time in the future from one already past, in Brasília', () => {
    expect(isFutureBrasilia('2026-11-26T15:30', NOW)).toBe(true)
    expect(isFutureBrasilia('2026-11-26T15:00', NOW)).toBe(false)
  })

  it('says how long ago, counting days in Brasília', () => {
    expect(relativeTime('2026-11-26T15:05:00-03:00', NOW)).toBe('há 5 min')
    expect(relativeTime('2026-11-26T09:00:00-03:00', NOW)).toBe('há 6 h')
    expect(relativeTime('2026-11-25T23:00:00-03:00', NOW)).toBe('ontem')
    expect(relativeTime('2026-11-23T14:12:09.000-03:00', NOW)).toBe('há 3 dias')
    expect(relativeTime('2026-11-02T10:00:00-03:00', NOW)).toBe('2 nov.')
  })
})

describe('flags · regra e porcentagem', () => {
  it('reads the state the API sends, and works it out when it is missing', () => {
    expect(flagState(flag())).toBe('partial')
    expect(flagState({ ...flag(), state: undefined as never, rule: 'percentage', percentage: 100 })).toBe('on')
    expect(flagState({ ...flag(), state: undefined as never, rule: null, percentage: null, users_count: 0 })).toBe('off')
    expect(flagState({ ...flag(), state: undefined as never, rule: 'off', percentage: null, users_count: 2 })).toBe('partial')
  })

  it('says who sees it in a few words', () => {
    expect(audienceLabel(flag())).toBe('10% + 14 pessoas')
    expect(audienceLabel(flag({ rule: 'on', percentage: null, state: 'on' }))).toBe('Todos com Ordo+')
    expect(audienceLabel(flag({ rule: 'off', percentage: null, state: 'partial', users_count: 6, requires_premium: false }))).toBe('6 pessoas')
    expect(audienceLabel(flag({ rule: 'off', percentage: null, state: 'off', users_count: 0 }))).toBe('Ninguém')
  })

  it('counts the base from a flag on for everyone with the same requirement', () => {
    const narration = flag({ key: 'daily_office_audio', rule: 'on', percentage: null, state: 'on', users_count: 0, reach_estimate: 1910 })
    expect(audienceBase(flag(), [narration])).toBe(1910)
    // Without one, it is worked back from the percentage.
    expect(audienceBase(flag(), [])).toBe(Math.round((200 - 14) * 10) + 14)
    expect(audienceBase(flag({ rule: 'off', percentage: null, reach_estimate: 0 }), [])).toBeNull()
  })

  it('projects the reach of another rule, keeping the people chosen', () => {
    const groups = flag()
    expect(projectedReach(groups, 'percentage', 25, 1910)).toBe(Math.round((1910 - 14) * 0.25) + 14)
    expect(projectedReach(groups, 'on', null, 1910)).toBe(1910)
    expect(projectedReach(groups, 'off', null, 1910)).toBe(14)
    expect(projectedReach(groups, 'on', null, null)).toBeNull()
  })

  it('asks for the key typed when the change touches more than 100 people', () => {
    expect(ruleChangeImpact(flag(), 'off', null, 1910).typed).toBe(true)
    expect(ruleChangeImpact(flag({ reach_estimate: 40, users_count: 2 }), 'percentage', 5, 400).typed).toBe(false)
    expect(ruleChangeImpact(flag({ reach_estimate: 40, users_count: 2 }), 'percentage', 50, 400).typed).toBe(true)
    // 100 exactly is not more than 100.
    expect(ruleChangeImpact(flag({ reach_estimate: 100 }), 'percentage', 1, 100).typed).toBe(false)
    // Turning on with no way to count the people: the key is asked for.
    expect(ruleChangeImpact(flag({ rule: 'off', percentage: null, reach_estimate: 0, users_count: 0 }), 'on', null, null).typed).toBe(true)
    // Turning off a flag nobody sees is not risky.
    expect(ruleChangeImpact(flag({ reach_estimate: 3, users_count: 3 }), 'off', null, null).typed).toBe(false)
  })

  it('explains the percentage in plain words, with the number chosen', () => {
    const lines = percentageExplanation(25)
    expect(lines).toContain('Vê quem tem número menor que 25.')
    expect(lines.join(' ')).toContain('Subir a porcentagem mantém quem já via')
    expect(lines.join(' ')).toContain('regra própria de uma pessoa sempre vence')
  })

  it('takes whole percentages from 1 to 99', () => {
    expect([1, 10, 99].every(validPercentage)).toBe(true)
    expect([0, 100, 10.5, Number.NaN, null].some(validPercentage)).toBe(false)
  })
})

describe('flags · chave e confirmação', () => {
  it('suggests a key from the name', () => {
    expect(suggestKey('Calendário novo')).toBe('calendario_novo')
    expect(suggestKey('  2º Ofício: Família!  ')).toBe('oficio_familia')
  })

  it('takes the API key rule and keeps book keys to the Livro type', () => {
    expect(validKey('new_calendar')).toBe(true)
    expect(validKey('New')).toBe(false)
    expect(validKey('1abc')).toBe(false)
    expect(validKey('prayer_book_loc_2028')).toBe(false)
  })

  it('accepts only the exact key, spaces around it aside', () => {
    expect(confirmationMatches(' prayer_groups ', 'prayer_groups')).toBe(true)
    expect(confirmationMatches('prayer_group', 'prayer_groups')).toBe(false)
    expect(confirmationMatches('PRAYER_GROUPS', 'prayer_groups')).toBe(false)
  })
})

describe('flags · histórico e desfazer', () => {
  it('describes each change without the flag name', () => {
    expect(describeChange(change(), NOW)).toBe('regra geral de desligada para 10%')
    expect(describeChange(change({ action: 'schedule', before: { enable_at: null, disable_at: null }, after: { enable_at: '2026-12-07T09:00:00.000-03:00', disable_at: null } }), NOW)).toBe('agendada para ligar em 7 dez., 09:00')
    expect(describeChange(change({ action: 'schedule', before: { enable_at: '2026-12-07T09:00:00.000-03:00' }, after: { enable_at: null, disable_at: null } }), NOW)).toBe('agendamento cancelado')
    expect(describeChange(change({ action: 'users_add', before: { rules: [] }, after: { user_ids: [1, 2], enabled: true } }), NOW)).toBe('mais 2 pessoas')
    expect(describeChange(change({ action: 'users_remove', before: { rules: [{ user_id: 1, enabled: true }] }, after: null }), NOW)).toBe('menos 1 pessoa')
    expect(describeChange(change({ action: 'scheduled_enable' }), NOW)).toBe('o agendamento ligou para todos')
    expect(describeChange(change({ action: 'details', before: { requires_premium: false }, after: { requires_premium: true } }), NOW)).toBe('passa a exigir Ordo+')
  })

  it('offers Desfazer for 30 days, and says why not after', () => {
    expect(canUndo(change(), NOW)).toBe(true)
    const old = change({ created_at: '2026-10-26T15:00:00-03:00' })
    expect(canUndo(old, NOW)).toBe(false)
    expect(undoBlockedLabel(old, NOW)).toBe('mais de 30 dias')
    expect(undoBlockedLabel(change({ undoable: false, undo_blocked_reason: 'superseded' }), NOW)).toBe('desfaça a mais nova antes')
    expect(undoBlockedLabel(change({ undone_at: '2026-11-24T10:00:00-03:00', undoable: false, undo_blocked_reason: 'undone' }), NOW)).toBe('desfeita')
  })
})

describe('flags · filtros', () => {
  it('filters by state, scheduled, type and search', () => {
    const groups = flag({ enable_at: '2026-12-07T09:00:00-03:00' })
    const book = flag({ key: 'prayer_book_loc_2027', name: 'REB - 2027', kind: 'prayer_book', prayer_book_code: 'loc_2027' })
    expect(matchesFilters(groups, { state: 'scheduled', kind: 'all', search: '' })).toBe(true)
    expect(matchesFilters(book, { state: 'scheduled', kind: 'all', search: '' })).toBe(false)
    expect(matchesFilters(book, { state: 'all', kind: 'prayer_book', search: 'loc_2027' })).toBe(true)
    expect(matchesFilters(groups, { state: 'on', kind: 'all', search: '' })).toBe(false)
    expect(matchesFilters(groups, { state: 'all', kind: 'all', search: 'GRUPOS' })).toBe(true)
  })
})
