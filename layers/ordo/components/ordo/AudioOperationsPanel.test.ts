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

const mountPanel = async () => {
  const wrapper = mount(AudioOperationsPanel)
  await flushPromises()
  return wrapper
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

    expect(wrapper.text()).not.toContain('Limite opcional de caracteres')

    await wrapper.findAll('button').find(button => button.text() === 'Estimar')?.trigger('click')
    await flushPromises()

    expect(api.estimateAudioGeneration).toHaveBeenCalledWith(
      expect.not.objectContaining({ character_budget: expect.anything() })
    )
  })

  it('enqueues the fixed catalogue of the selected book', async () => {
    const wrapper = await mountPanel()

    await wrapper.findAll('button').find(button => button.text().includes('Gerar catálogo'))?.trigger('click')
    await flushPromises()

    expect(api.enqueueAudioCatalog).toHaveBeenCalledWith({ prayer_book_code: 'loc_2019', dry_run: false })
    expect(wrapper.text()).toContain('Catálogo fixo')
  })

  it('simulates the catalogue without buying anything', async () => {
    const wrapper = await mountPanel()

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
})
