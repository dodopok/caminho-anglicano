import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createPortalHead, providePortalHead, type PortalHeadStore } from '../../composables/usePortalHead'
import { createPortalQuery, providePortalQuery } from '../../composables/usePortalQuery'
import { OrdoApiError } from '../../types/dashboard'
import type { FeatureFlag, FlagChange, FlagDetail, FlagsListResponse } from '../../types/flags'

// Every call goes through `request`; the router below answers by method and
// path, and a test overrides one route to make it fail, go missing (404),
// or hang (to try a second click while the first is on its way).
type Handler = (url: URL, body: unknown) => unknown
const routes = new Map<string, Handler>()
const request = vi.fn(async (path: string, options: { method?: string; body?: unknown } = {}) => {
  const url = new URL(path, 'https://api.test')
  const handler = routes.get(`${options.method || 'GET'} ${url.pathname}`)
  if (!handler) throw new OrdoApiError('Not found', 404, { code: 'NOT_FOUND' })
  const answer = await handler(url, options.body)
  if (answer instanceof Error) throw answer
  return answer
})
vi.mock('../../composables/useOrdoApi', () => ({ useOrdoApi: () => ({ request }) }))

const { default: FlagsPanel } = await import('./FlagsPanel.vue')

const NOW = new Date('2026-11-26T18:10:00Z') // 15:10 in Brasília
const BASE = '/api/v1/admin/feature_flags'

const flag = (overrides: Partial<FeatureFlag>): FeatureFlag => ({
  key: 'x',
  name: 'X',
  description: null,
  kind: 'feature',
  prayer_book_code: null,
  prayer_book_name: null,
  prayer_book_release_gated: null,
  requires_premium: false,
  targeted: true,
  rule: 'off',
  percentage: null,
  state: 'off',
  users_count: 0,
  users_off_count: 0,
  reach_estimate: 0,
  enable_at: null,
  disable_at: null,
  schedule_overdue: false,
  created_at: '2026-06-01T10:00:00.000-03:00',
  updated_at: '2026-11-20T10:00:00.000-03:00',
  ...overrides
})

const NARRATION = flag({ key: 'daily_office_audio', name: 'Narração do ofício', requires_premium: true, rule: 'on', state: 'on', reach_estimate: 1910 })
const GROUPS = flag({ key: 'prayer_groups', name: 'Grupos de oração', description: 'Criar e rezar em grupo.', requires_premium: true, rule: 'percentage', percentage: 10, state: 'partial', users_count: 14, reach_estimate: 200, enable_at: '2026-12-07T12:00:00Z' })
// Ordo+ like the narration, which is on for everyone: its reach counts the base (1.910).
const CALENDAR = flag({ key: 'new_calendar', name: 'Calendário novo', requires_premium: true, rule: 'off', state: 'partial', users_count: 3, reach_estimate: 3 })
const BOOK = flag({ key: 'prayer_book_loc_2027', name: 'REB - 2027', kind: 'prayer_book', prayer_book_code: 'loc_2027', prayer_book_name: 'REB - 2027', prayer_book_release_gated: true, targeted: false, rule: 'off', state: 'partial', users_count: 6, reach_estimate: 6 })

const change = (overrides: Partial<FlagChange>): FlagChange => ({
  id: 41,
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

const listOf = (flags: FeatureFlag[], changes: FlagChange[] = [change({})]): FlagsListResponse => ({
  flags,
  summary: {
    counts: { total: flags.length, on: flags.filter(f => f.state === 'on').length, partial: flags.filter(f => f.state === 'partial').length, off: flags.filter(f => f.state === 'off').length, scheduled: flags.filter(f => f.enable_at || f.disable_at).length, overdue: 0, feature: 3, prayer_book: 1, user_rules: 23 },
    next_scheduled: [{ key: 'prayer_groups', name: 'Grupos de oração', description: 'Criar e rezar em grupo.', kind: 'feature', action: 'enable', scheduled_at: '2026-12-07T12:00:00Z', overdue: false }],
    prerelease_books: [{ key: BOOK.key, prayer_book_code: 'loc_2027', name: 'REB - 2027', state: 'partial', users_count: 6, reach_estimate: 6 }]
  },
  recent_changes: changes
})

const detailOf = (item: FeatureFlag, changes: FlagChange[] = []): FlagDetail => ({
  ...item,
  users: [
    { id: 1000, name: 'Ana Exemplo', email: 'ana@exemplo.org', premium_active: true, enabled: true, visible: true, since: '2026-11-23T14:12:09.000-03:00' },
    { id: 1002, name: 'Clara Modelo', email: 'clara@exemplo.org', premium_active: false, enabled: true, visible: false, since: '2026-11-17T10:00:00.000-03:00' }
  ],
  users_meta: { page: 1, per_page: 50, total: 2 },
  changes
})

const install = () => {
  routes.clear()
  const all = [NARRATION, GROUPS, CALENDAR, BOOK]
  routes.set(`GET ${BASE}`, () => listOf(all))
  for (const item of all) {
    routes.set(`GET ${BASE}/${item.key}`, () => detailOf(item, item.key === 'prayer_groups' ? [change({})] : []))
    routes.set(`PATCH ${BASE}/${item.key}`, (_url, body) => detailOf({ ...item, ...(body as object) }, [change({ id: 90, flag_key: item.key, flag_name: item.name, before: { rule: item.rule, percentage: item.percentage }, after: body as never, created_at: '2026-11-26T15:10:20.000-03:00' }), change({})]))
    routes.set(`DELETE ${BASE}/${item.key}`, () => ({ change: change({ id: 91, flag_key: item.key, action: 'delete', after: null, created_at: '2026-11-26T15:10:20.000-03:00' }) }))
  }
  routes.set('POST /api/v1/admin/feature_flag_changes/41/undo', () => ({ change: change({ undone_at: '2026-11-26T15:11:00.000-03:00', undoable: false, undo_blocked_reason: 'undone' }), flag: GROUPS }))
  routes.set('POST /api/v1/admin/feature_flag_changes/90/undo', () => ({ change: change({ id: 90, undone_at: '2026-11-26T15:11:00.000-03:00', undoable: false }), flag: GROUPS }))
}

const calls = (method: string, pathname: string) => request.mock.calls.filter(([path, options]) => (options?.method || 'GET') === method && new URL(path, 'https://api.test').pathname === pathname)

let head: PortalHeadStore
const mountPanel = async (url: Record<string, string> = { aba: 'flags' }) => {
  let current = { ...url }
  head = createPortalHead()
  const query = createPortalQuery({ read: () => current, write: (next) => { current = next } })
  const Page = defineComponent({
    setup () {
      providePortalQuery(query)
      providePortalHead(head)
      return () => h(FlagsPanel, { reloadKey: 0, now: NOW })
    }
  })
  const wrapper = mount(Page, { attachTo: document.body })
  await settle()
  return { wrapper, query }
}

const settle = async () => {
  for (let i = 0; i < 4; i++) await flushPromises()
}

const dialog = (wrapper: VueWrapper) => wrapper.find('[role="dialog"]')
const button = (wrapper: VueWrapper, label: string | RegExp) => {
  const found = wrapper.findAll('button').filter(item => typeof label === 'string' ? item.text().trim() === label : label.test(item.text()))
  if (!found.length) throw new Error(`Sem botão "${label}"`)
  return found[0]
}
const switchOf = (wrapper: VueWrapper, name: string) => wrapper.find(`tr[data-flag="${name}"] [role="switch"]`)

beforeEach(() => {
  vi.clearAllMocks()
  install()
  document.body.innerHTML = ''
})

describe('FlagsPanel · API ainda sem flags', () => {
  it.each([404, 405, 501])('says "em breve" (never an error) when the list answers %i', async (status) => {
    routes.set(`GET ${BASE}`, () => new OrdoApiError('Not found', status))
    const { wrapper } = await mountPanel()

    expect(wrapper.find('[data-flags-soon]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Feature flags em breve')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('table').exists()).toBe(false)
    // No "Nova flag" while there is nothing to create it in.
    expect(head.head.value.actions || []).toEqual([])
  })

  it('stays "em breve" on a flag or the creation page too', async () => {
    routes.set(`GET ${BASE}`, () => new OrdoApiError('Not found', 404))
    const { wrapper } = await mountPanel({ aba: 'flags', flag: 'prayer_groups' })
    expect(wrapper.text()).toContain('Feature flags em breve')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('shows a real failure as an error with "Tentar de novo"', async () => {
    routes.set(`GET ${BASE}`, () => new OrdoApiError('Erro interno', 500))
    const { wrapper } = await mountPanel()
    expect(wrapper.find('[data-flags-soon]').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').text()).toContain('Erro interno')

    install()
    await button(wrapper, 'Tentar de novo').trigger('click')
    await settle()
    expect(wrapper.find('tr[data-flag="prayer_groups"]').exists()).toBe(true)
  })
})

describe('FlagsPanel · lista', () => {
  it('builds the summary from the data alone, in Brasília time', async () => {
    const { wrapper } = await mountPanel()
    const summary = wrapper.find('.op-summary').text()
    expect(summary).toContain('4 flags · 3 parciais · 1 com agendamento')
    expect(summary).toContain('Próxima: Grupos de oração liga para todos em 7 dez., 09:00')
    expect(summary).toContain('"Criar e rezar em grupo."')
    expect(summary).toContain('1 livro em pré-lançamento: REB - 2027, para 6 pessoas')
    expect(wrapper.find('tr[data-flag="prayer_groups"]').text()).toContain('liga em 7 dez., 09:00')
  })

  it('tags each flag with Recurso or Livro, in text', async () => {
    const { wrapper } = await mountPanel()
    expect(wrapper.find('tr[data-flag="prayer_groups"]').text()).toContain('Recurso')
    expect(wrapper.find('tr[data-flag="prayer_book_loc_2027"]').text()).toContain('Livro')
  })

  it('filters by the URL and says when a search finds nothing', async () => {
    const { wrapper } = await mountPanel({ aba: 'flags', tipo: 'livros' })
    expect(wrapper.findAll('tbody tr').map(row => row.attributes('data-flag'))).toEqual(['prayer_book_loc_2027'])

    const search = await mountPanel({ aba: 'flags', busca: 'xyz' })
    expect(search.wrapper.text()).toContain('Nenhuma flag com "xyz".')
  })
})

describe('FlagsPanel · confirmação digitada', () => {
  it('asks for the key before turning off a flag that reaches more than 100 people', async () => {
    const { wrapper } = await mountPanel()
    await switchOf(wrapper, 'daily_office_audio').trigger('click')

    const sheet = dialog(wrapper)
    expect(sheet.attributes('data-confirm')).toBe('rule-off')
    expect(sheet.text()).toContain('Desligar Narração do ofício para todos?')
    expect(sheet.text()).toContain('≈ 1.910 pessoas deixam de ver Narração do ofício em até 1 minuto.')
    expect(sheet.text()).toContain('Para confirmar, digite daily_office_audio')
    expect(sheet.find('svg[aria-hidden] path[d^="M12 4 2.8"]').exists()).toBe(false) // no alert icon

    const confirm = button(wrapper, 'Desligar para todos')
    expect(confirm.attributes('disabled')).toBeDefined()
    await sheet.find('input').setValue('daily_off')
    expect(button(wrapper, 'Desligar para todos').attributes('disabled')).toBeDefined()
    await sheet.find('input').setValue('daily_office_audio')
    expect(button(wrapper, 'Desligar para todos').attributes('disabled')).toBeUndefined()

    await button(wrapper, 'Desligar para todos').trigger('click')
    await settle()
    expect(calls('PATCH', `${BASE}/daily_office_audio`)).toHaveLength(1)
    expect(calls('PATCH', `${BASE}/daily_office_audio`)[0][1]?.body).toEqual({ rule: 'off' })
    expect(dialog(wrapper).exists()).toBe(false)
  })

  it('asks only a plain confirmation when few people are touched', async () => {
    const { wrapper } = await mountPanel()
    await switchOf(wrapper, 'new_calendar').trigger('click')
    // Partial: the switch never flips on its own; it offers a choice.
    expect(dialog(wrapper).attributes('data-confirm')).toBe('partial')
    await button(wrapper, 'Desligar…').trigger('click')

    expect(dialog(wrapper).attributes('data-confirm')).toBe('rule-off')
    expect(dialog(wrapper).find('input').exists()).toBe(false)
    expect(button(wrapper, 'Desligar para todos').attributes('disabled')).toBeUndefined()
  })

  it('asks for the book code to launch a pre-release book', async () => {
    const { wrapper } = await mountPanel()
    await switchOf(wrapper, 'prayer_book_loc_2027').trigger('click')
    await button(wrapper, 'Lançar…').trigger('click')

    const sheet = dialog(wrapper)
    expect(sheet.attributes('data-confirm')).toBe('launch')
    expect(sheet.text()).toContain('Lançar o REB - 2027 para todos?')
    expect(sheet.text()).toContain('até 1 hora')
    expect(sheet.text()).toContain('Para confirmar, digite loc_2027')
    expect(button(wrapper, 'Lançar agora').attributes('disabled')).toBeDefined()
    await sheet.find('input').setValue('loc_2027')
    await button(wrapper, 'Lançar agora').trigger('click')
    await settle()
    expect(calls('PATCH', `${BASE}/prayer_book_loc_2027`)[0][1]?.body).toEqual({ rule: 'on' })
  })

  it('asks for the key to delete, says what goes and returns to the list', async () => {
    const { wrapper, query } = await mountPanel({ aba: 'flags', flag: 'prayer_groups' })
    head.head.value.actions!.find(action => action.key === 'delete')!.onClick()
    await settle()

    const sheet = dialog(wrapper)
    expect(sheet.attributes('data-confirm')).toBe('delete')
    expect(sheet.text()).toContain('Apagar a flag prayer_groups?')
    expect(sheet.text()).toContain('a regra geral (10%), as 14 regras por pessoa e o agendamento de 7 dez., 09:00')
    expect(sheet.text()).toContain('passa a contar como desligada')
    expect(sheet.text()).toContain('≈ 200 pessoas deixam de ver Grupos de oração')
    expect(button(wrapper, 'Apagar a flag').attributes('disabled')).toBeDefined()

    await sheet.find('input').setValue('prayer_groups')
    await button(wrapper, 'Apagar a flag').trigger('click')
    await settle()
    expect(calls('DELETE', `${BASE}/prayer_groups`)).toHaveLength(1)
    expect(query.values.value.flag).toBeUndefined()
    expect(wrapper.find('[data-flags-notice]').text()).toContain('Flag Grupos de oração apagada.')
    expect(wrapper.find('[data-flags-notice]').text()).toContain('Desfazer')
  })
})

describe('FlagsPanel · regra geral e porcentagem', () => {
  it('shows the percentage, its reach and the plain explanation', async () => {
    const { wrapper } = await mountPanel({ aba: 'flags', flag: 'prayer_groups' })
    expect(wrapper.find('[role="radio"][aria-checked="true"]').text()).toBe('Porcentagem')
    expect((wrapper.find('input[aria-label="Porcentagem"]').element as HTMLInputElement).value).toBe('10')

    await button(wrapper, '25%').trigger('click')
    expect(wrapper.text()).toContain('Ligada para 25% das pessoas: ≈ 488 das 1.910 com Ordo+, contando as 14 escolhidas.')
    const explain = wrapper.find('[data-explain="percentage"]').text()
    expect(explain).toContain('número fixo de 0 a 99')
    expect(explain).toContain('Vê quem tem número menor que 25.')
    expect(explain).toContain('mantém quem já via')
    expect(button(wrapper, 'Aplicar 25%').attributes('disabled')).toBeUndefined()
  })

  it('refuses a percentage outside 1–99', async () => {
    const { wrapper } = await mountPanel({ aba: 'flags', flag: 'prayer_groups' })
    await wrapper.find('input[aria-label="Porcentagem"]').setValue('150')
    expect(wrapper.text()).toContain('Use um número inteiro de 1 a 99.')
    expect(button(wrapper, /^Aplicar/).attributes('disabled')).toBeDefined()
  })

  it('confirms with the key a percentage on a flag that reaches more than 100 people', async () => {
    const { wrapper } = await mountPanel({ aba: 'flags', flag: 'prayer_groups' })
    await button(wrapper, '25%').trigger('click')
    await button(wrapper, 'Aplicar 25%').trigger('click')
    expect(dialog(wrapper).attributes('data-confirm')).toBe('rule-percentage')
    expect(dialog(wrapper).text()).toContain('Para confirmar, digite prayer_groups')
    expect(calls('PATCH', `${BASE}/prayer_groups`)).toHaveLength(0)
  })

  it('applies at once a percentage that touches few people, with Desfazer', async () => {
    const { wrapper } = await mountPanel({ aba: 'flags', flag: 'new_calendar' })
    await button(wrapper, 'Porcentagem').trigger('click')
    await button(wrapper, '1%').trigger('click')
    await button(wrapper, 'Aplicar 1%').trigger('click')
    await settle()

    expect(dialog(wrapper).exists()).toBe(false)
    expect(calls('PATCH', `${BASE}/new_calendar`)[0][1]?.body).toEqual({ rule: 'percentage', percentage: 1 })
    expect(wrapper.find('[data-flags-notice]').text()).toContain('Calendário novo: regra geral 1%.')
  })
})

describe('FlagsPanel · agendamento em Brasília', () => {
  it('shows and edits the schedule in Brasília time and sends it with the offset', async () => {
    const { wrapper } = await mountPanel({ aba: 'flags', flag: 'prayer_groups' })
    // 12:00 UTC is 09:00 in Brasília.
    expect(wrapper.find('[data-schedule]').text()).toContain('liga para todos em segunda-feira, 7 dez., 09:00 (horário de Brasília)')
    const [enable] = wrapper.findAll('input[type="datetime-local"]')
    expect((enable.element as HTMLInputElement).value).toBe('2026-12-07T09:00')

    await enable.setValue('2026-12-08T07:30')
    await button(wrapper, 'Salvar agendamento').trigger('click')
    await settle()
    expect(calls('PATCH', `${BASE}/prayer_groups`)[0][1]?.body).toEqual({ enable_at: '2026-12-08T07:30:00-03:00', disable_at: null })
  })

  it('refuses a time already past', async () => {
    const { wrapper } = await mountPanel({ aba: 'flags', flag: 'prayer_groups' })
    const [, disable] = wrapper.findAll('input[type="datetime-local"]')
    await disable.setValue('2026-11-26T15:00')
    expect(wrapper.text()).toContain('Desligar: o horário tem que ser no futuro.')
    expect(button(wrapper, 'Salvar agendamento').attributes('disabled')).toBeDefined()
  })
})

// Undoing people added is not a change of the general rule: no key to type.
const PEOPLE_ADDED = change({ action: 'users_add', before: { rules: [] }, after: { user_ids: [1000, 1001], enabled: true } })

describe('FlagsPanel · desfazer', () => {
  it('undoes a change from Últimas mudanças', async () => {
    routes.set(`GET ${BASE}`, () => listOf([GROUPS], [PEOPLE_ADDED]))
    const { wrapper } = await mountPanel()
    await wrapper.find('[data-change="41"] button').trigger('click')
    await settle()
    expect(calls('POST', '/api/v1/admin/feature_flag_changes/41/undo')).toHaveLength(1)
    expect(wrapper.find('[data-flags-notice]').text()).toContain('Desfeito: Grupos de oração, mais 2 pessoas.')
  })

  it('offers Desfazer right after a write, for the change it recorded', async () => {
    const { wrapper } = await mountPanel({ aba: 'flags', flag: 'new_calendar' })
    await button(wrapper, 'Porcentagem').trigger('click')
    await button(wrapper, '5%').trigger('click')
    await button(wrapper, 'Aplicar 5%').trigger('click')
    await settle()
    await wrapper.find('[data-flags-notice] button').trigger('click')
    await settle()
    expect(calls('POST', '/api/v1/admin/feature_flag_changes/90/undo')).toHaveLength(1)
  })

  it('says why a change can no longer be undone', async () => {
    routes.set(`GET ${BASE}`, () => listOf([GROUPS], [
      change({ id: 50, undoable: false, undo_blocked_reason: 'superseded' }),
      change({ id: 51, created_at: '2026-10-20T10:00:00.000-03:00' })
    ]))
    const { wrapper } = await mountPanel()
    expect(wrapper.find('[data-change="50"]').text()).toContain('desfaça a mais nova antes')
    expect(wrapper.find('[data-change="51"]').text()).toContain('mais de 30 dias')
    expect(wrapper.find('[data-change="51"] button').exists()).toBe(false)
  })

  it('asks for the key to undo a rule change that touches more than 100 people', async () => {
    const { wrapper: groups } = await mountPanel()
    // Back to "desligada" takes Grupos de oração from ≈ 200 people to its 14.
    await groups.find('[data-change="41"] button').trigger('click')
    expect(dialog(groups).attributes('data-confirm')).toBe('undo-rule')
    groups.unmount()

    routes.set(`GET ${BASE}`, () => listOf([NARRATION], [change({ id: 60, flag_key: 'daily_office_audio', flag_name: 'Narração do ofício', before: { rule: 'off', percentage: null }, after: { rule: 'on', percentage: null } })]))
    const { wrapper } = await mountPanel()
    await wrapper.find('[data-change="60"] button').trigger('click')
    expect(dialog(wrapper).attributes('data-confirm')).toBe('undo-rule')
    expect(dialog(wrapper).text()).toContain('Para confirmar, digite daily_office_audio')
  })

  it('shows the API reason when undo is refused', async () => {
    routes.set('POST /api/v1/admin/feature_flag_changes/41/undo', () => new OrdoApiError('conflict', 409, { code: 'UNDO_CONFLICT' }))
    routes.set(`GET ${BASE}`, () => listOf([GROUPS], [PEOPLE_ADDED]))
    const { wrapper } = await mountPanel()
    await wrapper.find('[data-change="41"] button').trigger('click')
    await settle()
    expect(wrapper.find('[role="alert"]').text()).toContain('Uma mudança mais nova na mesma parte da flag ainda vale.')
  })
})

describe('FlagsPanel · sem envio duplo', () => {
  it('sends a confirmed change once, however many times it is clicked', async () => {
    let release!: () => void
    routes.set(`PATCH ${BASE}/daily_office_audio`, () => new Promise((resolve) => { release = () => resolve(detailOf(NARRATION)) }))
    const { wrapper } = await mountPanel()
    await switchOf(wrapper, 'daily_office_audio').trigger('click')
    await dialog(wrapper).find('input').setValue('daily_office_audio')

    const confirm = button(wrapper, 'Desligar para todos')
    await confirm.trigger('click')
    await confirm.trigger('click')
    await dialog(wrapper).find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(calls('PATCH', `${BASE}/daily_office_audio`)).toHaveLength(1)
    expect(button(wrapper, 'Salvando…').attributes('disabled')).toBeDefined()
    expect(switchOf(wrapper, 'prayer_groups').attributes('disabled')).toBeDefined()

    release()
    await settle()
    expect(calls('PATCH', `${BASE}/daily_office_audio`)).toHaveLength(1)
  })

  it('applies a percentage once on a double click', async () => {
    let release!: () => void
    routes.set(`PATCH ${BASE}/new_calendar`, () => new Promise((resolve) => { release = () => resolve(detailOf(CALENDAR)) }))
    const { wrapper } = await mountPanel({ aba: 'flags', flag: 'new_calendar' })
    await button(wrapper, 'Porcentagem').trigger('click')
    await button(wrapper, '5%').trigger('click')
    const apply = button(wrapper, 'Aplicar 5%')
    await apply.trigger('click')
    await apply.trigger('click')
    await flushPromises()
    expect(calls('PATCH', `${BASE}/new_calendar`)).toHaveLength(1)
    release()
    await settle()
  })

  it('creates a flag once on a double submit', async () => {
    let release!: () => void
    routes.set(`POST ${BASE}`, () => new Promise((resolve) => { release = () => resolve(detailOf(flag({ key: 'calendario_novo', name: 'Calendário novo' }), [change({ id: 95, action: 'create', flag_key: 'calendario_novo' })])) }))
    const { wrapper, query } = await mountPanel({ aba: 'flags', vista: 'nova' })
    await wrapper.find('input[maxlength="120"]').setValue('Calendário novo')
    expect((wrapper.find('input.op-field--mono').element as HTMLInputElement).value).toBe('calendario_novo')

    await wrapper.find('form').trigger('submit')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(calls('POST', BASE)).toHaveLength(1)
    expect(calls('POST', BASE)[0][1]?.body).toMatchObject({ key: 'calendario_novo', name: 'Calendário novo', kind: 'feature', targeted: true, requires_premium: false, rule: 'off', enable_at: null })

    release()
    await settle()
    expect(query.values.value.flag).toBe('calendario_novo')
    expect(calls('POST', BASE)).toHaveLength(1)
  })
})
