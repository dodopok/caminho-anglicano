import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { createPortalHead, providePortalHead, type PortalHeadStore } from '../../composables/usePortalHead'
import { createPortalQuery, providePortalQuery, type PortalQuery } from '../../composables/usePortalQuery'
import { OrdoApiError } from '../../types/dashboard'
import type { AudioReadinessResponse, AudioRun } from '../../types/audio'

process.env.TZ = 'America/Sao_Paulo'

const ordo = {
  fetchAudioSummary: vi.fn(),
  fetchAudioClips: vi.fn(),
  fetchAudioClipUrl: vi.fn(),
  fetchAudioOperation: vi.fn(),
  regenerateAudioClip: vi.fn(),
  acceptAudioClipCandidate: vi.fn(),
  rejectAudioClipCandidate: vi.fn(),
  previewAudioCleanup: vi.fn(),
  enqueueAudioCleanup: vi.fn(),
  fetchAudioCatalogTranslations: vi.fn(),
  purgeAudioWorkerQueue: vi.fn(),
  reindexAudioCatalog: vi.fn(),
  fetchAudioPrayerBooks: vi.fn(),
  acknowledgeAudioFailures: vi.fn(),
  fetchUsageSeries: vi.fn(),
  request: vi.fn()
}
const audio = {
  fetchReadiness: vi.fn(),
  fetchReadinessBook: vi.fn(),
  fetchProvider: vi.fn(),
  fetchRuns: vi.fn(),
  fetchRun: vi.fn(),
  retryRun: vi.fn(),
  cancelRun: vi.fn(),
  tryRunNow: vi.fn(),
  estimate: vi.fn(),
  enqueueGeneration: vi.fn(),
  enqueueCatalog: vi.fn()
}
vi.mock('../../composables/useOrdoApi', () => ({ useOrdoApi: () => ordo }))
vi.mock('../../composables/useAudioApi', () => ({ useAudioApi: () => audio }))

const { default: AudioPanel } = await import('./AudioPanel.vue')

const missing = () => new OrdoApiError('Not found', 404)
const coverage = (ready: number, missingClips: number) => ({ ready_clips: ready, missing_clips: missingClips, missing_characters: missingClips * 120, percentage: Math.round(ready / (ready + missingClips) * 1000) / 10 })

const summary = {
  total_clips: 48_212,
  total_characters: 7_900_000,
  total_duration_seconds: 763_200,
  current_clips: 46_300,
  stale_clips: 1200,
  legacy_clips: 650,
  pending_candidates: 3,
  operations: { failed_last_24_hours: 0, recent_failures: [] },
  profiles: [{ provider: 'fish', voice: 'Ricardo', language: 'pt-BR', model: 's1', profile_status: 'current', clips: 46_300 }],
  user_usage: { unique_users: 1284, total_accesses: 29_870, by_type: { audio_clip: 18_420, background_track: 9310, liturgical_text: 2140 } },
  worker_queue: { total: 0, purgeable: 0, jobs: [] }
}

const readiness: AudioReadinessResponse = {
  days: 28,
  start_date: '2026-11-26',
  end_date: '2026-12-23',
  computed_at: '2026-11-26T00:52:00-03:00',
  featured_share: 0.05,
  summary: { ...coverage(940, 60) },
  books: [
    {
      prayer_book_code: 'loc_2015',
      name: 'Livro de Oração Comum 2015 (IEAB)',
      offices: ['morning', 'evening'],
      default_bible_version: 'nvi',
      bibles: [
        { bible_version: 'nvi', name: 'NVI', default: true, featured: true, computed: true, share: 0.6, totals: coverage(100, 0), by_office: { morning: coverage(50, 0), evening: coverage(50, 0) } },
        { bible_version: 'naa', name: 'NAA', default: false, featured: true, computed: true, share: 0.06, totals: coverage(52, 48), by_office: { morning: coverage(20, 30), evening: coverage(32, 18) } }
      ]
    },
    {
      prayer_book_code: 'bas_1985_en',
      name: 'Book of Alternative Services',
      offices: ['morning'],
      bibles: [{ bible_version: 'nrsvue', name: 'NRSVUE', default: true, featured: true, computed: true, totals: coverage(64, 36), by_office: { morning: coverage(64, 36) } }]
    }
  ]
}

const failedRun: AudioRun = {
  id: 1842,
  kind: 'generate_office',
  status: 'failed',
  prayer_book_code: 'bas_1985_en',
  parameters: { start_date: '2026-11-25', days: 28, offices: ['morning'], preferences: { bible_version: 'nrsvue' } },
  processed_items: 42,
  total_items: 112,
  generated_clips: 140,
  generated_characters: 19_800,
  error_message: 'Fish Audio recusou o pedido: crédito insuficiente (402).',
  created_at: '2026-11-25T21:40:00-03:00',
  started_at: '2026-11-25T21:41:00-03:00',
  completed_at: '2026-11-25T22:52:00-03:00'
}

const books = [
  { id: '1', code: 'loc_2015', name: 'LOC 2015', full_name: 'Livro de Oração Comum 2015', available_offices: ['morning', 'evening'], is_recommended: true, language: 'pt-BR' },
  { id: '2', code: 'bas_1985_en', name: 'BAS 1985', available_offices: ['morning'] }
]

let query: PortalQuery
let head: PortalHeadStore

const mountPanel = async (url: Record<string, string> = { aba: 'audio' }) => {
  query = createPortalQuery()
  query.set(url)
  head = createPortalHead()
  const Page = defineComponent({
    setup () {
      providePortalQuery(query)
      providePortalHead(head)
      return () => h('main', [h(AudioPanel, { reloadKey: 0 })])
    }
  })
  const wrapper = mount(Page, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return wrapper
}

const button = (wrapper: Awaited<ReturnType<typeof mountPanel>>, label: string) =>
  wrapper.findAll('button').find(item => item.text().trim().startsWith(label))

beforeEach(() => {
  vi.clearAllMocks()
  window.confirm = vi.fn(() => true)
  ordo.fetchAudioSummary.mockResolvedValue(summary)
  ordo.fetchAudioPrayerBooks.mockResolvedValue({ data: books })
  ordo.fetchAudioClips.mockResolvedValue({ clips: [], pagination: { total: 0, limit: 20, offset: 0, count: 0 } })
  ordo.fetchAudioCatalogTranslations.mockResolvedValue({
    prayer_book_code: 'loc_2015',
    translations: [
      { code: 'nvt', name: 'NVT', full_name: 'Nova Versão Transformadora', kind: 'bible', is_recommended: true },
      { code: 'naa', name: 'NAA', full_name: 'Nova Almeida Atualizada', kind: 'bible' },
      { code: 'ieab_2015', name: 'IEAB_2015', full_name: 'Saltério', kind: 'psalter' }
    ]
  })
  ordo.fetchUsageSeries.mockResolvedValue({ period: { start_date: '', end_date: '' }, filter: {}, series: [{ date: '2026-11-20', count: 100, users: 40 }] })
  ordo.purgeAudioWorkerQueue.mockResolvedValue({ purged_jobs: 3, cancelled_operations: 1 })
  ordo.acknowledgeAudioFailures.mockResolvedValue({ acknowledged: 1 })
  audio.fetchReadiness.mockResolvedValue(readiness)
  audio.fetchProvider.mockResolvedValue({ provider: 'fish', provider_name: 'Fish Audio', status: 'up', usd_per_1k_characters: 0.015, profiles: [{ provider: 'fish', voice: 'Ricardo', language: 'pt-BR', model: 's1' }] })
  audio.fetchRuns.mockResolvedValue({ operations: [failedRun], pagination: { limit: 20, count: 1, has_more: false, next_before: null }, counts: { all: 1, failed: 1, running: 0, waiting: 0 } })
  audio.fetchRun.mockResolvedValue({ operation: failedRun })
  audio.fetchReadinessBook.mockRejectedValue(missing())
  audio.estimate.mockResolvedValue({
    estimate: {
      ready_clips: 1904,
      missing_clips: 1756,
      missing_characters: 248_300,
      estimated_cost: 3.72,
      cost: { usd: 3.7245, usd_per_1k_characters: 0.015, characters: 248_300, provider: 'fish', provider_name: 'Fish Audio' },
      offices: ['morning', 'evening'],
      rows: [
        { date: '2026-11-26', office_type: 'morning', ready_clips: 20, missing_clips: 0, missing_characters: 0 },
        { date: '2026-11-29', office_type: 'morning', ready_clips: 15, missing_clips: 7, missing_characters: 1840 }
      ]
    }
  })
  audio.enqueueGeneration.mockResolvedValue({ operation: { id: 1900, kind: 'generate_office', status: 'queued', prayer_book_code: 'loc_2015' } })
  audio.enqueueCatalog.mockResolvedValue({ operation: { id: 1901, kind: 'generate_catalog', status: 'queued', prayer_book_code: 'loc_2015' } })
})

describe('AudioPanel · Visão geral', () => {
  it('opens with the sentence, the tiles, the coverage matrix and who listens', async () => {
    const wrapper = await mountPanel()
    const text = wrapper.text()
    expect(text).toContain('Quase tudo pronto. Duas coisas pedem você.')
    expect(text).toContain('Falta mais em BAS 1985 (64%)')
    expect(text).toContain('Cobertura por livro e Bíblia')
    expect(text).toContain('escolhida por 6% dos leitores')
    expect(text).toContain('Fish Audio')
    expect(text).toContain('Narração em uso')
    expect(text).toContain('só web')
    expect(text).toContain('48.212')
    expect(head.head.value).toMatchObject({ title: 'Narração do ofício', live: { text: 'Nenhuma geração rodando' } })
    expect(head.head.value.actions?.[0]).toMatchObject({ label: 'Nova geração', disabled: false })
    expect(wrapper.findComponent(AudioPanel).emitted('summary')?.at(-1)?.[0]).toMatchObject({ pending_candidates: 3 })
  })

  it('shows "em breve" instead of an error where the API does not have the endpoint yet', async () => {
    audio.fetchReadiness.mockRejectedValue(missing())
    audio.fetchProvider.mockRejectedValue(missing())
    ordo.fetchUsageSeries.mockRejectedValue(missing())
    const wrapper = await mountPanel()
    const text = wrapper.text()
    expect(text).toContain('Em breve: a cobertura de todos os livros numa tabela')
    expect(text).toContain('Em breve')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    // The provider tile falls back to the current voice of the catalogue.
    expect(text).toContain('Fish Audio')
  })

  it('switches to the incident when the provider is down and runs wait for it', async () => {
    const waiting: AudioRun = { ...failedRun, id: 1850, status: 'queued', waiting_for_provider: true, next_attempt_at: '2026-11-26T14:20:00-03:00', processed_items: 58, total_items: 120, error_message: 'Fish Audio fora do ar (503)', actions: { try_now: true, cancel: true } }
    audio.fetchProvider.mockResolvedValue({ provider: 'fish', provider_name: 'Fish Audio', status: 'down', down_since: '2026-11-26T13:58:00-03:00', next_attempt_at: '2026-11-26T14:20:00-03:00' })
    audio.fetchRuns.mockResolvedValue({ operations: [waiting], pagination: null, counts: null })
    audio.tryRunNow.mockResolvedValue({ operation: { ...waiting, next_attempt_at: null } })
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('A Fish Audio não responde desde 13:58.')
    expect(wrapper.text()).toContain('Tentam de novo sozinhas')
    expect(head.head.value.actions?.[0]).toMatchObject({ label: 'Nova geração', disabled: true })
    expect(head.head.value.live?.text).toContain('Conferindo a cada minuto')

    await button(wrapper, 'Tentar agora')?.trigger('click')
    await flushPromises()
    expect(audio.tryRunNow).toHaveBeenCalledWith(1850)
  })

  it('clears the stuck jobs and the failure warning', async () => {
    ordo.fetchAudioSummary.mockResolvedValue({
      ...summary,
      operations: { failed_last_24_hours: 1, recent_failures: [{ id: 77, kind: 'regenerate_clip', error_message: 'Timeout', completed_at: '2026-11-26T13:59:00-03:00' }] },
      worker_queue: { total: 3, purgeable: 3, jobs: [{ id: 1, class_name: 'PrewarmOfficeAudioJob', state: 'orphaned', purgeable: true }] }
    })
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('3 tarefas travadas')
    await button(wrapper, 'Apagar 3')?.trigger('click')
    await flushPromises()
    expect(ordo.purgeAudioWorkerQueue).toHaveBeenCalledWith('dead')
    expect(wrapper.text()).toContain('3 tarefas removidas')
  })
})

describe('AudioPanel · URL', () => {
  it('writes the section and drops the book when changing section', async () => {
    const wrapper = await mountPanel({ aba: 'audio', secao: 'cobertura', livro: 'loc_2015' })
    await wrapper.findAll('[role="tab"]').find(tab => tab.text().startsWith('Execuções'))?.trigger('click')
    expect(query.values.value).toEqual({ aba: 'audio', secao: 'execucoes' })
    await wrapper.findAll('[role="tab"]').find(tab => tab.text().startsWith('Visão geral'))?.trigger('click')
    expect(query.values.value).toEqual({ aba: 'audio' })
  })

  it('opens a book row of the matrix in Cobertura with its Bible', async () => {
    const wrapper = await mountPanel({ aba: 'audio', secao: 'cobertura' })
    const row = wrapper.findAll('tbody tr').find(item => item.text().includes('NAA'))
    await row?.trigger('click')
    expect(query.values.value).toMatchObject({ secao: 'cobertura', livro: 'loc_2015', biblia: 'naa' })
  })

  it('opens the old "gerar" address on the new wizard', async () => {
    const wrapper = await mountPanel({ aba: 'audio', secao: 'gerar' })
    expect(wrapper.text()).toContain('O que narrar')
    expect(head.head.value).toMatchObject({ title: 'Nova geração', crumb: 'Nova geração' })
  })
})

describe('AudioPanel · Cobertura de um livro', () => {
  it('reads the stored detail and, without that endpoint, computes the book with the estimate', async () => {
    const wrapper = await mountPanel({ aba: 'audio', secao: 'cobertura', livro: 'loc_2015', biblia: 'naa' })
    expect(audio.fetchReadinessBook).toHaveBeenCalledWith('loc_2015', { bibleVersion: 'naa', days: 28 })
    expect(audio.estimate).toHaveBeenCalledWith(expect.objectContaining({ prayer_book_code: 'loc_2015', days: 28, preferences: { bible_version: 'naa' } }))
    const text = wrapper.text()
    expect(text).toContain('1.904')
    expect(text).toContain('US$ 3,72')
    expect(text).toContain('Calculado agora pela estimativa')
    expect(text).toContain('NAA · 52%')
    expect(head.head.value).toMatchObject({ title: 'Livro de Oração Comum 2015 (IEAB)', crumb: 'Cobertura · loc_2015' })
    // The estimate without items: the day's list says it is on its way.
    expect(text).toContain('Em breve: os trechos de cada ofício')
  })

  const storedDetail = (named: boolean) => ({
    prayer_book_code: 'loc_2015',
    name: 'Livro de Oração Comum 2015 (IEAB)',
    bible_version: 'naa',
    bible_name: 'NAA',
    days: 28,
    start_date: '2026-11-26',
    end_date: '2026-12-23',
    computed: true,
    computed_at: '2026-11-26T00:47:40-03:00',
    offices: ['morning', 'evening'],
    totals: coverage(1904, 1756),
    cost: { usd: 3.7245, usd_per_1k_characters: 0.015, characters: 248_300, provider: 'fish', provider_name: 'Fish Audio' },
    by_source: [],
    calendar: [
      { date: '2026-11-26', offices: { morning: coverage(20, 0), evening: coverage(18, 0) }, ...(named ? { liturgical_day: { name: 'Quinta-feira da 34ª semana', color: 'green', rank: 'feria' } } : {}) },
      { date: '2026-11-29', offices: { morning: coverage(15, 7), evening: coverage(18, 0) }, ...(named ? { liturgical_day: { name: '1º Domingo do Advento', color: 'purple', rank: 'sunday' } } : {}) }
    ],
    bibles: [{ bible_version: 'nvi', name: 'NVI', default: true, featured: true, computed: true, percentage: 100 }, { bible_version: 'naa', name: 'NAA', default: false, featured: true, computed: true, percentage: 52 }]
  })

  it('names the day of the book\'s calendar in the day\'s header and on the calendar', async () => {
    audio.fetchReadinessBook.mockResolvedValue(storedDetail(true))
    const wrapper = await mountPanel({ aba: 'audio', secao: 'cobertura', livro: 'loc_2015', biblia: 'naa' })

    // The first gap is Sunday's morning: its header carries the name and the colour.
    const name = wrapper.find('.op-litday')
    expect(name.exists()).toBe(true)
    expect(name.text()).toContain('1º Domingo do Advento')
    expect(name.text()).toContain('cor litúrgica roxo')
    expect(name.find('.op-litday__dot').attributes('style')).toContain('background')
    const cell = wrapper.find('.op-cal button[aria-label^="Domingo, 29 de novembro"]')
    expect(cell.attributes('title')).toBe('Domingo, 29 de novembro · 1º Domingo do Advento, Manhã: 68% com voz, 7 trechos faltando')
    expect(cell.attributes('aria-label')).toBe(cell.attributes('title'))
    const sunday = wrapper.findAll('.op-cal thead th').find(th => th.attributes('title')?.startsWith('Domingo, 29'))
    expect(sunday?.attributes('title')).toBe('Domingo, 29 de novembro · 1º Domingo do Advento (roxo)')
    expect(sunday?.find('.op-cal__lit').exists()).toBe(true)
    // On a phone the calendar scrolls in its card with a width per day.
    expect(wrapper.find('.op-cal').attributes('style')).toContain('--op-cal-cols: 28')
    // A day the API does not name shows by its date.
    const monday = wrapper.findAll('.op-cal thead th').find(th => th.attributes('title')?.startsWith('Segunda, 30'))
    expect(monday?.attributes('title')).toBe('Segunda, 30 de novembro')
    expect(monday?.find('.op-cal__lit').exists()).toBe(false)
  })

  it('shows the date only when the API does not send the liturgical day', async () => {
    audio.fetchReadinessBook.mockResolvedValue(storedDetail(false))
    const wrapper = await mountPanel({ aba: 'audio', secao: 'cobertura', livro: 'loc_2015', biblia: 'naa' })

    expect(wrapper.find('.op-litday').exists()).toBe(false)
    expect(wrapper.find('.op-cal__lit').exists()).toBe(false)
    expect(wrapper.text()).toContain('Domingo, 29 de novembro')
    expect(wrapper.find('.op-cal button[aria-label^="Domingo, 29 de novembro"]').attributes('title')).toBe('Domingo, 29 de novembro, Manhã: 68% com voz, 7 trechos faltando')
  })

  it('keeps the day\'s trechos table inside the card on a phone', async () => {
    audio.fetchReadinessBook.mockResolvedValue(storedDetail(true))
    audio.estimate.mockImplementation(async (body: { include_items?: boolean }) => body.include_items
      ? { estimate: { ready_clips: 1, missing_clips: 1, rows: [{ date: '2026-11-29', office_type: 'morning', ready_clips: 1, missing_clips: 1, items: [
          { section: 'venite', label: 'Venite', source: 'office_texts', status: 'ready', ready_clips: 1, missing_clips: 0, missing_characters: 0 },
          { section: 'reading_1', label: 'Isaías 2.1-5', source: 'scripture', status: 'missing', ready_clips: 0, missing_clips: 1, missing_characters: 400 }
        ] }] } }
      : { estimate: {} })
    const wrapper = await mountPanel({ aba: 'audio', secao: 'cobertura', livro: 'loc_2015', biblia: 'naa' })

    const table = wrapper.find('.op-table-wrap > table.op-table')
    expect(table.exists()).toBe(true)
    expect(table.text()).toContain('Isaías 2.1-5')
  })

  it('switches the Bible through the URL and keeps the default out of it', async () => {
    const wrapper = await mountPanel({ aba: 'audio', secao: 'cobertura', livro: 'loc_2015', biblia: 'naa' })
    await wrapper.findAll('.op-chip').find(chip => chip.text().startsWith('NVI'))?.trigger('click')
    expect(query.values.value.biblia).toBeUndefined()
  })
})

describe('AudioPanel · Execuções', () => {
  it('opens the run in the URL with what happened and what to do', async () => {
    const wrapper = await mountPanel({ aba: 'audio', secao: 'execucoes', execucao: '1842' })
    const text = wrapper.text()
    expect(text).toContain('bas_1985_en parou no meio')
    expect(text).toContain('crédito insuficiente')
    expect(text).toContain('Os 140 clips salvos são reaproveitados')
    expect(text).toContain('Com erro · 1')
    expect(audio.fetchRun).toHaveBeenCalledWith('1842')
  })

  it('says "em breve" when the retry endpoint is not deployed', async () => {
    audio.retryRun.mockRejectedValue(missing())
    const wrapper = await mountPanel({ aba: 'audio', secao: 'execucoes', execucao: '1842' })
    await button(wrapper, 'Tentar de novo')?.trigger('click')
    await flushPromises()
    expect(audio.retryRun).toHaveBeenCalledWith(1842)
    expect(wrapper.text()).toContain('Em breve: esta ação chega com a próxima versão da API.')
  })

  it('filters on this side when the API does not page yet', async () => {
    audio.fetchRuns.mockResolvedValue({ operations: [failedRun, { ...failedRun, id: 1, status: 'completed', error_message: null }], pagination: null, counts: null })
    const wrapper = await mountPanel({ aba: 'audio', secao: 'execucoes' })
    expect(wrapper.text()).toContain('páginas em breve')
    await button(wrapper, 'Com erro')?.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.op-run')).toHaveLength(1)
  })
})

describe('AudioPanel · Nova geração', () => {
  it('narrates the period in the chosen Bible and sends the spending limit only when filled', async () => {
    const wrapper = await mountPanel({ aba: 'audio', secao: 'nova-geracao', livro: 'loc_2015' })
    const select = wrapper.findAll('select').find(item => item.findAll('option').some(option => option.text() === 'Padrão do livro'))
    expect(select?.findAll('option').map(option => option.text())).toEqual(['Padrão do livro', 'NVT · Nova Versão Transformadora', 'NAA · Nova Almeida Atualizada'])
    await select?.setValue('naa')
    expect(query.values.value.biblia).toBe('naa')
    await button(wrapper, 'Conferir custo')?.trigger('click')
    await flushPromises()
    expect(audio.estimate).toHaveBeenCalledWith(expect.objectContaining({ prayer_book_code: 'loc_2015', preferences: { bible_version: 'naa' }, offices: ['morning', 'evening'] }))
    expect(wrapper.text()).toContain('Gerar por US$ 3,72')
    expect(wrapper.text()).toContain('cerca de 1 h 11 min')

    await button(wrapper, 'Gerar por')?.trigger('click')
    await flushPromises()
    expect(audio.enqueueGeneration).toHaveBeenCalledWith(expect.not.objectContaining({ character_budget: expect.anything() }))
    expect(query.values.value).toMatchObject({ secao: 'execucoes', execucao: '1900' })
  })

  it('sends the limit typed in the receipt', async () => {
    const wrapper = await mountPanel({ aba: 'audio', secao: 'nova-geracao', livro: 'loc_2015' })
    await button(wrapper, 'Conferir custo')?.trigger('click')
    await flushPromises()
    await wrapper.find('#audio-budget').setValue('300.000')
    expect(wrapper.text()).toContain('≈ US$ 4,50')
    await button(wrapper, 'Gerar por')?.trigger('click')
    await flushPromises()
    expect(audio.enqueueGeneration).toHaveBeenCalledWith(expect.objectContaining({ character_budget: 300000 }))
  })

  it('never enqueues the whole book before the corpora are chosen, then sends only those', async () => {
    const wrapper = await mountPanel({ aba: 'audio', secao: 'nova-geracao' })
    await wrapper.findAll('button').find(item => item.text().includes('Tudo o que o livro pode ler'))?.trigger('click')
    await flushPromises()
    expect(button(wrapper, 'Simular catálogo')?.attributes('disabled')).toBeDefined()
    await wrapper.findAll('[role="checkbox"]').find(item => item.text().includes('NVT'))?.trigger('click')
    await button(wrapper, 'Simular catálogo')?.trigger('click')
    await flushPromises()
    expect(audio.enqueueCatalog).toHaveBeenCalledWith({ prayer_book_code: 'loc_2015', dry_run: true, translations: ['nvt'] })
  })
})

describe('AudioPanel · Clips', () => {
  it('applies a clip filter as soon as it changes', async () => {
    const wrapper = await mountPanel({ aba: 'audio', secao: 'clips' })
    expect(ordo.fetchAudioClips).toHaveBeenCalledTimes(1)
    const select = wrapper.findAll('select').find(item => item.findAll('option').some(option => option.text() === 'Instruções antigas'))
    await select?.setValue('stale')
    await flushPromises()
    expect(ordo.fetchAudioClips).toHaveBeenLastCalledWith(expect.objectContaining({ profile_status: 'stale', offset: 0 }))
  })
})

describe('AudioPanel · Pedidos repetidos e trabalho dividido', () => {
  const openReceipt = async () => {
    const wrapper = await mountPanel({ aba: 'audio', secao: 'nova-geracao', livro: 'loc_2015' })
    await button(wrapper, 'Conferir custo')?.trigger('click')
    await flushPromises()
    return wrapper
  }

  it('opens the run that is already going instead of failing when the API answers 409', async () => {
    const running = { id: 1851, kind: 'generate_office', status: 'running', prayer_book_code: 'loc_2015' }
    audio.enqueueGeneration.mockRejectedValue(new OrdoApiError('Já existe', 409, { code: 'AUDIO_GENERATION_ALREADY_RUNNING', operation: running } as never))
    const wrapper = await openReceipt()
    await button(wrapper, 'Gerar por')?.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Já tem uma geração igual rodando')
    expect(wrapper.find('.op-inline-error').exists()).toBe(false)
    await button(wrapper, 'Ver a execução')?.trigger('click')
    expect(query.values.value).toMatchObject({ secao: 'execucoes', execucao: '1851' })
  })

  it('falls back to operation_id for the whole book too', async () => {
    audio.enqueueCatalog.mockRejectedValue(new OrdoApiError('Já existe', 409, { code: 'AUDIO_GENERATION_ALREADY_RUNNING', operation_id: 1777 } as never))
    const wrapper = await mountPanel({ aba: 'audio', secao: 'nova-geracao' })
    await wrapper.findAll('button').find(item => item.text().includes('Tudo o que o livro pode ler'))?.trigger('click')
    await flushPromises()
    await wrapper.findAll('[role="checkbox"]').find(item => item.text().includes('NVT'))?.trigger('click')
    await button(wrapper, 'Gerar catálogo')?.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Já tem uma geração igual rodando')
    await button(wrapper, 'Ver a execução')?.trigger('click')
    expect(query.values.value).toMatchObject({ secao: 'execucoes', execucao: '1777' })
  })

  it('warns that the new generation shares the worker with the ones running now', async () => {
    ordo.fetchAudioSummary.mockResolvedValue({ ...summary, active_operations: 2 })
    const wrapper = await openReceipt()
    expect(wrapper.text()).toContain('2 gerações rodando agora — esta vai dividir o worker e pode demorar mais')
  })

  it('counts the runs on screen when neither the estimate nor the summary says', async () => {
    audio.fetchRuns.mockResolvedValue({ operations: [{ ...failedRun, id: 5, status: 'running' }], pagination: null, counts: null })
    const wrapper = await openReceipt()
    expect(wrapper.text()).toContain('1 geração rodando agora — esta vai dividir o worker e pode demorar mais')
  })

  it('sends one order however many times the button is clicked', async () => {
    let finish: (value: unknown) => void = () => {}
    audio.enqueueGeneration.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const wrapper = await openReceipt()
    const submit = button(wrapper, 'Gerar por')
    await submit?.trigger('click')
    await submit?.trigger('click')
    expect(audio.enqueueGeneration).toHaveBeenCalledTimes(1)
    expect(button(wrapper, 'Enviando')?.attributes('disabled')).toBeDefined()
    finish({ operation: { id: 1900, kind: 'generate_office', status: 'queued' } })
    await flushPromises()
  })

  it('sends one retry however many times it is clicked', async () => {
    let finish: (value: unknown) => void = () => {}
    audio.retryRun.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const wrapper = await mountPanel({ aba: 'audio', secao: 'execucoes', execucao: '1842' })
    const retry = button(wrapper, 'Tentar de novo')
    await retry?.trigger('click')
    await retry?.trigger('click')
    expect(audio.retryRun).toHaveBeenCalledTimes(1)
    finish({ operation: { ...failedRun, status: 'queued' } })
    await flushPromises()
  })
})

describe('AudioPanel · Leituras ao vivo', () => {
  afterEach(() => { vi.useRealTimers() })

  it('reads nothing on its own while nothing is queued or running', async () => {
    await mountPanel()
    const reads = audio.fetchRuns.mock.calls.length
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(audio.fetchRuns.mock.calls.length).toBe(reads)
    expect(ordo.fetchAudioSummary).toHaveBeenCalledTimes(1)
  })

  it('follows a running generation, and only the runs and the summary', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    audio.fetchRuns.mockResolvedValue({ operations: [{ ...failedRun, id: 5, status: 'running', processed_items: 10, total_items: 100 }], pagination: null, counts: null })
    await mountPanel()
    const runs = audio.fetchRuns.mock.calls.length
    const readiness = audio.fetchReadiness.mock.calls.length
    await vi.advanceTimersByTimeAsync(4_000)
    expect(audio.fetchRuns.mock.calls.length).toBe(runs + 1)
    expect(audio.fetchReadiness.mock.calls.length).toBe(readiness)
    // Nothing moved: the next read waits 8 s, not 4.
    await vi.advanceTimersByTimeAsync(4_000)
    expect(audio.fetchRuns.mock.calls.length).toBe(runs + 1)
    await vi.advanceTimersByTimeAsync(4_000)
    expect(audio.fetchRuns.mock.calls.length).toBe(runs + 2)
  })
})

describe('AudioPanel · Atualização ao vivo', () => {
  it('rereads the runs in place, without dimming the list or flashing the error', async () => {
    const reloadKey = ref(0)
    query = createPortalQuery()
    query.set({ aba: 'audio', secao: 'execucoes' })
    head = createPortalHead()
    const Page = defineComponent({
      setup () {
        providePortalQuery(query)
        providePortalHead(head)
        return () => h('main', [h(AudioPanel, { reloadKey: reloadKey.value })])
      }
    })
    const wrapper = mount(Page, { attachTo: document.body })
    await flushPromises()
    await flushPromises()

    const list = () => wrapper.find('.op-runs')
    expect(list().exists()).toBe(true)
    const calls = audio.fetchRuns.mock.calls.length

    // The store's own reread answers; the list's reread (the next call) hangs,
    // as a poll does while the API answers.
    const page = { operations: [failedRun], pagination: { limit: 20, count: 1, has_more: false, next_before: null }, counts: { all: 1, failed: 1, running: 0, waiting: 0 } }
    let answer: (value: unknown) => void = () => {}
    audio.fetchRuns
      .mockImplementationOnce(() => Promise.resolve(page))
      .mockImplementationOnce(() => new Promise(resolve => { answer = resolve }))
    reloadKey.value += 1
    await flushPromises()

    expect(audio.fetchRuns.mock.calls.length).toBeGreaterThanOrEqual(calls + 2)
    expect((list().element as HTMLElement).style.opacity).not.toBe('0.6')
    expect(wrapper.text()).toContain('bas_1985_en')

    answer(page)
    await flushPromises()
    expect((list().element as HTMLElement).style.opacity).not.toBe('0.6')
    wrapper.unmount()
  })
})
