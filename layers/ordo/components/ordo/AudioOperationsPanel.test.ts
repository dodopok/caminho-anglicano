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
  fetchAudioCatalogTranslations: vi.fn(),
  purgeAudioWorkerQueue: vi.fn(),
  reindexAudioCatalog: vi.fn(),
  fetchAudioPrayerBooks: vi.fn(),
  acknowledgeAudioFailures: vi.fn()
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
    window.localStorage.clear()
    api.fetchAudioSummary.mockResolvedValue(summary)
    api.fetchAudioOperations.mockResolvedValue({ operations: [] })
    api.fetchAudioClips.mockResolvedValue({ clips: [], pagination: { total: 0, limit: 20, offset: 0, count: 0 } })
    api.fetchAudioPrayerBooks.mockResolvedValue({
      data: [{ id: '1', code: 'loc_2019', name: 'LOC 2019', available_offices: ['morning'], is_recommended: true }]
    })
    api.enqueueAudioCatalog.mockResolvedValue({ operation })
    api.fetchAudioCatalogTranslations.mockResolvedValue({
      prayer_book_code: 'loc_2019',
      translations: [
        { code: 'nvt', name: 'NVT', full_name: 'Nova Versão Transformadora', language: 'pt-BR', is_recommended: true, kind: 'bible' },
        { code: 'nvi', name: 'NVI', full_name: 'Nova Versão Internacional', language: 'pt-BR', is_recommended: true, kind: 'bible' },
        { code: 'ieab_2015', name: 'IEAB_2015', full_name: 'Saltério ieab_2015', language: 'pt-BR', is_recommended: false, kind: 'psalter' }
      ]
    })
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

  it('narrates the window in the Bible chosen for the readings', async () => {
    const wrapper = await mountPanel()
    await openSection(wrapper, 'Gerar')

    const bibleSelect = wrapper.findAll('select').find(select => select.findAll('option').some(option => option.text() === 'Padrão do livro'))
    expect(bibleSelect?.findAll('option').map(option => option.text())).toEqual([
      'Padrão do livro', 'NVT · Nova Versão Transformadora', 'NVI · Nova Versão Internacional'
    ])

    await bibleSelect?.setValue('nvt')
    await wrapper.findAll('button').find(button => button.text() === 'Estimar')?.trigger('click')
    await flushPromises()

    expect(api.estimateAudioGeneration).toHaveBeenLastCalledWith(
      expect.objectContaining({ prayer_book_code: 'loc_2019', preferences: { bible_version: 'nvt' } })
    )
  })

  it('keeps the book default when no Bible is chosen for the window', async () => {
    const wrapper = await mountPanel()
    await openSection(wrapper, 'Gerar')

    await wrapper.findAll('button').find(button => button.text() === 'Estimar')?.trigger('click')
    await flushPromises()

    expect(api.estimateAudioGeneration).toHaveBeenLastCalledWith(expect.objectContaining({ preferences: {} }))
  })

  const catalogButton = (wrapper: Awaited<ReturnType<typeof mountPanel>>, label: string) =>
    wrapper.findAll('button').find(button => button.text().includes(label))

  const checkCorpus = async (wrapper: Awaited<ReturnType<typeof mountPanel>>, label: string) => {
    await wrapper.findAll('.corpus-picker__card').find(item => item.text().includes(label))?.trigger('click')
    await flushPromises()
  }

  it('loads the corpora of the selected book and offers each one', async () => {
    const wrapper = await mountPanel()
    await openSection(wrapper, 'Gerar')

    expect(api.fetchAudioCatalogTranslations).toHaveBeenCalledWith('loc_2019')
    const cards = wrapper.findAll('.corpus-picker__card').map(card => card.text())
    expect(cards.find(text => text.includes('NVT'))).toContain('Nova Versão Transformadora')
    // A psalter named after its code is spelled out, not repeated as a badge.
    expect(cards.find(text => text.includes('IEAB 2015'))).not.toContain('ieab_2015 ')
    expect(wrapper.find('.corpus-picker').text()).toContain('Saltérios')
    expect(cards.some(text => text.includes('Só os textos do livro'))).toBe(true)
  })

  it('never enqueues the catalogue before the corpora are chosen', async () => {
    const wrapper = await mountPanel()
    await openSection(wrapper, 'Gerar')

    expect(catalogButton(wrapper, 'Gerar catálogo')?.attributes('disabled')).toBeDefined()
    expect(catalogButton(wrapper, 'Simular catálogo')?.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Escolha ao menos uma Bíblia')

    await catalogButton(wrapper, 'Gerar catálogo')?.trigger('click')
    await flushPromises()

    expect(api.enqueueAudioCatalog).not.toHaveBeenCalled()
  })

  it('enqueues the fixed catalogue with only the selected Bibles', async () => {
    const wrapper = await mountPanel()
    await openSection(wrapper, 'Gerar')
    await checkCorpus(wrapper, 'NVT')

    expect(catalogButton(wrapper, 'Gerar catálogo')?.attributes('disabled')).toBeUndefined()

    await catalogButton(wrapper, 'Gerar catálogo')?.trigger('click')
    await flushPromises()

    expect(api.enqueueAudioCatalog).toHaveBeenCalledWith({ prayer_book_code: 'loc_2019', dry_run: false, translations: ['nvt'] })
    expect(wrapper.text()).toContain('Catálogo fixo')
  })

  it('narrates only texts and collects when asked for no Bible', async () => {
    const wrapper = await mountPanel()
    await openSection(wrapper, 'Gerar')
    await checkCorpus(wrapper, 'NVT')
    await checkCorpus(wrapper, 'Só os textos do livro')

    await catalogButton(wrapper, 'Simular catálogo')?.trigger('click')
    await flushPromises()

    expect(api.enqueueAudioCatalog).toHaveBeenCalledWith({ prayer_book_code: 'loc_2019', dry_run: true, translations: [] })
  })

  it('shows which corpora a catalogue run asked for', async () => {
    api.fetchAudioOperations.mockResolvedValue({
      operations: [{ ...operation, status: 'completed', parameters: { prayer_book_code: 'loc_2019', translations: ['nvt'], generate: true } }]
    })
    const wrapper = await mountPanel()

    expect(wrapper.text()).toContain('Corpora: NVT')
  })

  it('does not call a whole Bible two thirds done because the small sources finished', async () => {
    api.fetchAudioOperations.mockResolvedValue({
      operations: [{ ...operation, status: 'running', total_items: 3, processed_items: 2, progress_percentage: 66.67, skipped_clips: 281, result: {} }]
    })
    const wrapper = await mountPanel()
    const card = wrapper.find('.audio-ops__operation')

    expect(card.text()).toContain('fonte 3 de 3')
    expect(card.text()).not.toContain('66')
    expect(card.find('.audio-ops__progress').exists()).toBe(false)
    expect(card.text()).toContain('281 já existiam')
    // The final report waits for the end of the run.
    expect(card.text()).not.toContain('Catálogo gerado')
  })

  it('follows a catalogue run line by line when the API reports it', async () => {
    api.fetchAudioOperations.mockResolvedValue({
      operations: [{
        ...operation,
        status: 'running',
        total_items: 31_402,
        processed_items: 12_700,
        progress_percentage: 40.44,
        generated_clips: 52,
        generated_characters: 6_240,
        skipped_clips: 281,
        result: {},
        progress: { source: 'scripture:nvt', source_kind: 'bible', source_code: 'nvt', source_index: 3, sources_total: 3, source_processed: 12_400, source_total: 31_102 }
      }]
    })
    const wrapper = await mountPanel()
    const card = wrapper.find('.audio-ops__operation')

    expect(card.find('.audio-ops__operation-stage').text()).toBe('Etapa 3 de 3 · Bíblia NVT · 12.400 de 31.102 linhas')
    expect(card.text()).toContain('40,4%')
    expect(card.text()).toContain('52 clips novos')
    expect(card.text()).toContain('6.240 caracteres narrados')
    expect(card.find('.audio-ops__progress').exists()).toBe(true)
  })

  it('shows the report once a catalogue run is over', async () => {
    api.fetchAudioOperations.mockResolvedValue({
      operations: [{ ...operation, status: 'completed', result: { clips: 31_383, generated: 31_102, missing_characters: 0, sources: ['liturgical_texts', 'collects', 'scripture:nvt'], generate: true } }]
    })
    const wrapper = await mountPanel()

    expect(wrapper.find('.audio-ops__operation-report').text()).toContain('31.383 clips resolvidos · 31.102 gerados')
  })

  it('shows a run waiting for the voice provider as a retry, not as a failure', async () => {
    const nextAttempt = new Date(Date.now() + 12 * 60_000).toISOString()
    api.fetchAudioOperations.mockResolvedValue({
      operations: [{ ...operation, status: 'queued', next_attempt_at: nextAttempt, error_message: 'Fish Audio fora do ar (503); nova tentativa às 18:40 (tentativa 2 de 4)' }]
    })
    const wrapper = await mountPanel()
    const card = wrapper.find('.audio-ops__operation')

    expect(card.find('.audio-ops__badge').text()).toBe('Nova tentativa')
    expect(card.find('.audio-ops__operation-retry').text()).toContain('nova tentativa às 18:40')
    expect(card.find('.audio-ops__operation-retry').text()).toMatch(/em 1[12] min/)
    expect(card.find('.audio-ops__operation-error').exists()).toBe(false)
    expect(wrapper.find('.audio-ops__attention').text()).toContain('1 geração espera o provedor de voz voltar')
  })

  it('shows the state of each worker job instead of a flat list', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.text()).toContain('travada · 2')
    expect(wrapper.text()).toContain('em execução · 1')
  })

  it('clears the jobs nothing will ever run', async () => {
    const wrapper = await mountPanel()

    const purge = wrapper.findAll('button').find(button => button.text().includes('Apagar 2 travadas'))
    await purge?.trigger('click')
    await flushPromises()

    expect(api.purgeAudioWorkerQueue).toHaveBeenCalledWith('dead')
    expect(wrapper.text()).toContain('2 tarefas removidas')
  })

  it('surfaces the metrics the operator asked for', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.text()).toContain('Tentativas para ouvir')
    expect(wrapper.text()).toContain('Tarefas travadas')
    expect(wrapper.text()).toContain('Novos em 7 dias')
    expect(wrapper.text()).toContain('loc_2019')
  })

  it('opens on the overview with only what asks for a decision on top', async () => {
    const wrapper = await mountPanel()

    const attention = wrapper.find('.audio-ops__attention').text()
    expect(attention).toContain('2 tentativas aguardam revisão')
    expect(attention).toContain('2 tarefas travadas na fila de processamento')
    expect(attention).toContain('1 operação falhou nas últimas 24 horas')
    expect(wrapper.text()).not.toContain('Enfileirar geração')
    expect(wrapper.find('.audio-ops__clips').exists()).toBe(false)
  })

  it('does not assemble four weeks of offices until asked', async () => {
    api.estimateAudioGeneration.mockResolvedValue({ estimate: { ready_clips: 90, missing_clips: 10, missing_characters: 1200, estimated_cost: null } })
    const wrapper = await mountPanel()

    expect(api.estimateAudioGeneration).not.toHaveBeenCalled()

    await wrapper.findAll('button').find(button => button.text().includes('Calcular agora'))?.trigger('click')
    await flushPromises()

    expect(api.estimateAudioGeneration).toHaveBeenCalledWith(expect.objectContaining({ prayer_book_code: 'loc_2019', days: 28 }))
    expect(wrapper.text()).toContain('90%')
    expect(wrapper.text()).toContain('Recalcular')
  })

  it('lists the failures and clears the warning once seen', async () => {
    api.fetchAudioSummary.mockResolvedValue({
      ...summary,
      operations: {
        ...summary.operations,
        failed_last_24_hours: 1,
        recent_failures: [{ id: 9, kind: 'generate_catalog', prayer_book_code: 'loc_2019', error_message: 'SolidQueue::Processes::ProcessPrunedError', completed_at: '2026-11-24T16:34:43Z' }]
      }
    })
    api.acknowledgeAudioFailures.mockResolvedValue({ acknowledged: 1 })
    const wrapper = await mountPanel()

    expect(wrapper.find('.audio-ops__failures').text()).toContain('Catálogo fixo')
    expect(wrapper.find('.audio-ops__failures').text()).toContain('ProcessPrunedError')

    await wrapper.findAll('button').find(button => button.text() === 'Limpar aviso')?.trigger('click')
    await flushPromises()

    expect(api.acknowledgeAudioFailures).toHaveBeenCalled()
    expect(wrapper.find('.audio-ops__attention').text()).not.toContain('falhou')
    expect(wrapper.find('.audio-ops__failures').exists()).toBe(false)
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
    expect(details.find('summary').text()).toBe('Ver 3 tarefas')
    expect(details.attributes('open')).toBeUndefined()
  })

  it('follows the operation it just enqueued from the section that asked for it', async () => {
    const wrapper = await mountPanel()
    await openSection(wrapper, 'Gerar')
    await checkCorpus(wrapper, 'NVT')

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
