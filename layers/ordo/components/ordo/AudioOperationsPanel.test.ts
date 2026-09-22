import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AudioOperationsPanel from './AudioOperationsPanel.vue'

const summary = {
  total_clips: 120,
  total_characters: 4_800,
  total_duration_seconds: 900,
  current_clips: 100,
  stale_clips: 15,
  legacy_clips: 5,
  silence_clips: 3,
  pending_candidates: 2,
  recent: { window_days: 7, clips: 12, characters: 600, duration_seconds: 90 },
  by_prayer_book: [{ prayer_book_code: 'loc_2019', clips: 80, sources: 4 }],
  operations: { by_status: { completed: 3 }, by_kind: {}, failed_last_24_hours: 1, last_completed_at: null },
  active_operations: 0,
  profiles: [],
  worker_queue: {
    total: 3,
    by_state: { running: 1, orphaned: 2 },
    purgeable: 2,
    jobs: [
      { id: 1, active_job_id: 'a', class_name: 'PrewarmOfficeAudioJob', queue_name: 'maintenance', state: 'running', claimed: true, purgeable: false },
      { id: 2, active_job_id: 'b', class_name: 'GenerateBookAudioJob', queue_name: 'maintenance', state: 'orphaned', claimed: false, purgeable: true },
      { id: 3, active_job_id: 'c', class_name: 'GenerateBookAudioJob', queue_name: 'maintenance', state: 'orphaned', claimed: false, purgeable: true }
    ]
  }
}

const operation = { id: 7, kind: 'generate_catalog', status: 'queued', prayer_book_code: 'loc_2019' }

const api = {
  fetchAudioSummary: vi.fn(),
  fetchAudioClips: vi.fn(),
  fetchAudioClipUrl: vi.fn(),
  fetchAudioOperations: vi.fn(),
  fetchAudioOperation: vi.fn(),
  estimateAudioGeneration: vi.fn(),
  enqueueAudioGeneration: vi.fn(),
  regenerateAudioClip: vi.fn(),
  acceptAudioClipCandidate: vi.fn(),
  rejectAudioClipCandidate: vi.fn(),
  previewAudioCleanup: vi.fn(),
  enqueueAudioCleanup: vi.fn(),
  enqueueAudioCatalog: vi.fn(),
  purgeAudioWorkerQueue: vi.fn(),
  reindexAudioCatalog: vi.fn(),
  fetchAudioPrayerBooks: vi.fn()
}

vi.mock('../../composables/useOrdoApi', () => ({ useOrdoApi: () => api }))

const clip = {
  id: 11,
  text: 'Pai nosso, que estás nos céus',
  kind: 'prayer',
  line_type: 'congregation',
  provider: 'openai',
  voice: 'sage',
  language: 'pt-BR',
  duration: 4,
  character_count: 30,
  profile_status: 'stale',
  configuration_fingerprint: 'abcdef1234567890',
  audio_url: 'https://storage.example/clip.mp3',
  usages: [
    { prayer_book_code: 'loc_2019', source_name: 'lords_prayer' },
    { prayer_book_code: 'loc_2019', source_name: 'morning' },
    { prayer_book_code: 'loc_2015', source_name: 'evening' }
  ],
  candidates: [
    { id: 90, status: 'pending', duration: 5, audio_url: 'https://storage.example/candidate.mp3' },
    { id: 89, status: 'rejected', duration: 5 }
  ]
}

const mountPanel = async () => {
  const wrapper = mount(AudioOperationsPanel)
  await flushPromises()
  return wrapper
}

const openSection = async (wrapper: Awaited<ReturnType<typeof mountPanel>>, label: string) => {
  await wrapper.findAll('[role="tab"]').find(tab => tab.text().startsWith(label))?.trigger('click')
  await flushPromises()
}

describe('AudioOperationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.fetchAudioSummary.mockResolvedValue(summary)
    api.fetchAudioOperations.mockResolvedValue({ operations: [] })
    api.fetchAudioClips.mockResolvedValue({ clips: [], pagination: { total: 0, limit: 20, offset: 0, count: 0 } })
    api.fetchAudioPrayerBooks.mockResolvedValue({
      data: [{ id: '1', code: 'loc_2019', name: 'LOC 2019', available_offices: ['morning'], is_recommended: true }]
    })
    api.enqueueAudioCatalog.mockResolvedValue({ operation })
    api.estimateAudioGeneration.mockResolvedValue({ estimate: { ready_clips: 3, missing_clips: 1 } })
    api.purgeAudioWorkerQueue.mockResolvedValue({ scope: 'dead', purged_jobs: 2, cancelled_operations: 1 })
    window.confirm = vi.fn(() => true)
  })

  it('no longer asks for a character ceiling before estimating', async () => {
    const wrapper = await mountPanel()
    await openSection(wrapper, 'Gerar')

    expect(wrapper.text()).not.toContain('Limite opcional de caracteres')

    await wrapper.findAll('button').find(button => button.text() === 'Estimar')?.trigger('click')
    await flushPromises()

    expect(api.estimateAudioGeneration).toHaveBeenCalledWith(
      expect.not.objectContaining({ character_budget: expect.anything() })
    )
  })

  it('enqueues the fixed catalogue of the selected book', async () => {
    const wrapper = await mountPanel()
    await openSection(wrapper, 'Gerar')

    await wrapper.findAll('button').find(button => button.text().includes('Gerar catálogo'))?.trigger('click')
    await flushPromises()

    expect(api.enqueueAudioCatalog).toHaveBeenCalledWith({ prayer_book_code: 'loc_2019', dry_run: false })
    expect(wrapper.text()).toContain('Catálogo fixo')
  })

  it('simulates the catalogue without buying anything', async () => {
    const wrapper = await mountPanel()
    await openSection(wrapper, 'Gerar')

    await wrapper.findAll('button').find(button => button.text() === 'Simular catálogo')?.trigger('click')
    await flushPromises()

    expect(api.enqueueAudioCatalog).toHaveBeenCalledWith({ prayer_book_code: 'loc_2019', dry_run: true })
  })

  it('shows the state of each worker job instead of a flat list', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.text()).toContain('morto · 2')
    expect(wrapper.text()).toContain('em execução · 1')
  })

  it('clears the jobs nothing will ever run', async () => {
    const wrapper = await mountPanel()

    const purge = wrapper.findAll('button').find(button => button.text().includes('Apagar 2 mortos'))
    await purge?.trigger('click')
    await flushPromises()

    expect(api.purgeAudioWorkerQueue).toHaveBeenCalledWith('dead')
    expect(wrapper.text()).toContain('2 jobs removidos')
  })

  it('surfaces the metrics the operator asked for', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.text()).toContain('Tentativas a revisar')
    expect(wrapper.text()).toContain('Jobs mortos')
    expect(wrapper.text()).toContain('Novos em 7 dias')
    expect(wrapper.text()).toContain('loc_2019')
  })

  it('opens on the overview with only what asks for a decision on top', async () => {
    const wrapper = await mountPanel()

    const attention = wrapper.find('.audio-ops__attention').text()
    expect(attention).toContain('2 tentativas aguardam revisão')
    expect(attention).toContain('2 jobs mortos na fila do worker')
    expect(attention).toContain('1 operação falhou nas últimas 24 horas')
    expect(wrapper.text()).not.toContain('Enfileirar geração')
    expect(wrapper.find('.audio-ops__clips').exists()).toBe(false)
  })

  it('says so when nothing needs attention', async () => {
    api.fetchAudioSummary.mockResolvedValue({
      ...summary,
      pending_candidates: 0,
      operations: { ...summary.operations, failed_last_24_hours: 0 },
      worker_queue: { total: 0, by_state: {}, purgeable: 0, jobs: [] }
    })
    const wrapper = await mountPanel()

    expect(wrapper.find('.audio-ops__attention').text()).toContain('Nada pede atenção')
  })

  it('keeps the worker job list folded behind its state counts', async () => {
    const wrapper = await mountPanel()

    const details = wrapper.find('.audio-ops__queue-details')
    expect(details.find('summary').text()).toBe('Ver 3 jobs')
    expect(details.attributes('open')).toBeUndefined()
  })

  it('follows the operation it just enqueued from the section that asked for it', async () => {
    const wrapper = await mountPanel()
    await openSection(wrapper, 'Gerar')

    await wrapper.findAll('button').find(button => button.text().includes('Gerar catálogo'))?.trigger('click')
    await flushPromises()

    const tracked = wrapper.find('.audio-ops__tracked')
    expect(tracked.text()).toContain('Catálogo fixo')
    expect(tracked.text()).toContain('Na fila')

    await tracked.findAll('button').find(button => button.text().includes('Ver operações'))?.trigger('click')
    await flushPromises()

    expect(wrapper.find('.audio-ops__tracked').exists()).toBe(false)
    expect(wrapper.find('.audio-ops__operations').text()).toContain('Catálogo fixo')
  })

  it('shows each clip as a compact row and folds its details', async () => {
    api.fetchAudioClips.mockResolvedValue({ clips: [clip], pagination: { total: 1, limit: 20, offset: 0, count: 1 } })
    const wrapper = await mountPanel()
    await openSection(wrapper, 'Clips')

    const row = wrapper.find('.audio-ops__clip')
    expect(row.text()).toContain('Pai nosso')
    expect(row.text()).toContain('1 tentativa a revisar')
    expect(row.text()).toContain('loc_2019 / lords_prayer · loc_2019 / morning · +1 uso')
    // The pending attempt is a decision, so it stays visible with the row folded.
    expect(row.find('.audio-ops__candidates').text()).toContain('aprovar')
    expect(row.find('textarea').exists()).toBe(false)
    expect(row.text()).not.toContain('Tentativas anteriores')

    await row.find('.audio-ops__toggle').trigger('click')

    expect(row.find('textarea').exists()).toBe(true)
    expect(row.text()).toContain('abcdef123456')
    expect(row.text()).toContain('Tentativas anteriores')
    expect(row.find('.audio-ops__toggle').attributes('aria-expanded')).toBe('true')
  })

  it('applies a clip filter as soon as it changes', async () => {
    const wrapper = await mountPanel()
    await openSection(wrapper, 'Clips')
    api.fetchAudioClips.mockClear()

    const select = wrapper.findAll('select').find(element => element.find('option[value="stale"]').exists())
    await select?.setValue('stale')
    await flushPromises()

    expect(api.fetchAudioClips).toHaveBeenCalledWith(expect.objectContaining({ profile_status: 'stale', offset: 0 }))
  })

  it('counts the attempts waiting for review on the clips section', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.findAll('[role="tab"]').find(tab => tab.text().startsWith('Clips'))?.text()).toBe('Clips2')
  })
})
