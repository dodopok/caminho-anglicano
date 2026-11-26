import { describe, expect, it } from 'vitest'
import { OrdoApiError } from '../types/dashboard'
import {
  alreadyRunning,
  buildAudioSummary,
  calendarBucket,
  calendarColumns,
  calendarFromRows,
  classifyFailure,
  coverageBucket,
  coverageRows,
  coverageText,
  dayLabel,
  estimateFinish,
  failureCopy,
  firstGap,
  groupRunsByDay,
  hiddenBibleCount,
  retrySchedule,
  runningNowCount,
  runningNowText,
  runCost,
  runStatus,
  runTimeline,
  runTitle,
  spanLabel,
  usd,
  visibleBibles,
  weeklyCost,
  worstFirst
} from './audio'
import type { AudioReadinessBible, AudioReadinessResponse, AudioRun } from '../types/audio'

process.env.TZ = 'America/Sao_Paulo'

const count = (ready: number, missing: number) => ({ ready_clips: ready, missing_clips: missing, missing_characters: missing * 100, percentage: ready + missing ? Math.round(ready / (ready + missing) * 1000) / 10 : null })
const bible = (version: string, overrides: Partial<AudioReadinessBible> = {}): AudioReadinessBible => ({
  bible_version: version,
  name: version.toUpperCase(),
  default: false,
  featured: false,
  computed: true,
  share: 0,
  totals: count(100, 0),
  by_office: { morning: count(50, 0), evening: count(50, 0) },
  ...overrides
})

const readiness: AudioReadinessResponse = {
  days: 28,
  start_date: '2026-11-26',
  end_date: '2026-12-23',
  computed_at: '2026-11-26T00:52:10.000-03:00',
  featured_share: 0.05,
  summary: { ...count(940, 60), books: 3 },
  books: [
    { prayer_book_code: 'loc_2015', name: 'LOC 2015', offices: ['morning', 'evening'], bibles: [bible('nvi', { default: true, featured: true, share: 0.6 }), bible('nvt', { featured: true, share: 0.18, totals: count(97, 3) }), bible('ara', { share: 0.001, computed: false, totals: null, by_office: null })] },
    { prayer_book_code: 'bas_1985_en', name: 'BAS 1985', offices: ['morning', 'evening'], bibles: [bible('nrsvue', { default: true, featured: true, totals: count(64, 36) })] },
    { prayer_book_code: 'loc_1979_es', name: 'LOC 1979 (es)', offices: ['morning'], bibles: [bible('rvr', { default: true, featured: true, totals: count(0, 50) })] }
  ]
}

const run = (overrides: Partial<AudioRun> = {}): AudioRun => ({
  id: 1,
  kind: 'generate_office',
  status: 'completed',
  prayer_book_code: 'loc_2015',
  parameters: { start_date: '2026-11-26', days: 28, offices: ['morning', 'midday', 'evening', 'compline'], preferences: { bible_version: 'nvt' } },
  created_at: '2026-11-26T09:14:00-03:00',
  started_at: '2026-11-26T09:14:00-03:00',
  completed_at: '2026-11-26T09:52:00-03:00',
  generated_clips: 412,
  generated_characters: 61230,
  ...overrides
})

describe('coverage', () => {
  it('buckets percentages like the matrix legend and never rounds a gap up to 100%', () => {
    expect([100, 96, 84, 41, 0, null].map(coverageBucket)).toEqual(['100', '90', '70', '40', '0', 'na'])
    expect(coverageText(99.6)).toBe('99%')
    expect(coverageText(0.4)).toBe('<1%')
    expect(coverageText(null)).toBe('—')
  })

  it('shows the default Bible and the ones at least 5% of readers chose, the rest behind "mostrar todas"', () => {
    const bibles = readiness.books[0].bibles
    expect(visibleBibles(bibles).map(item => item.bible_version)).toEqual(['nvi', 'nvt'])
    expect(visibleBibles(bibles, true)).toHaveLength(3)
    expect(hiddenBibleCount(readiness)).toBe(1)
  })

  it('builds the matrix rows with the readers note and the running generation', () => {
    const rows = coverageRows(readiness, { runningFor: code => code === 'bas_1985_en' ? 62 : null })
    expect(rows.map(row => row.key)).toEqual(['loc_2015:nvi', 'loc_2015:nvt', 'bas_1985_en:nrsvue', 'loc_1979_es:rvr'])
    expect(rows[0]).toMatchObject({ first: true, note: 'padrão do livro' })
    expect(rows[1]).toMatchObject({ first: false, note: 'escolhida por 18% dos leitores' })
    expect(rows[2]).toMatchObject({ running: 62, note: 'padrão · gerando agora' })
    expect(rows[3].note).toBe('padrão · nunca gerado')
  })

  it('lists the books worst first for the phone', () => {
    expect(worstFirst(readiness).map(item => [item.code, item.percentage, item.note])).toEqual([
      ['loc_1979_es', 0, 'nunca gerado'],
      ['bas_1985_en', 64, ''],
      ['loc_2015', 100, '']
    ])
  })

  it('sums the estimate rows into calendar squares and opens the nearest gap first', () => {
    const cells = calendarFromRows([
      { date: '2026-11-26', office_type: 'morning', ready_clips: 20, missing_clips: 0, missing_characters: 0 },
      { date: '2026-11-27', office_type: 'morning', ready_clips: 10, missing_clips: 2, missing_characters: 300, variant: 'a' },
      { date: '2026-11-27', office_type: 'morning', ready_clips: 8, missing_clips: 0, missing_characters: 0, variant: 'b' }
    ])
    expect(cells['2026-11-27'].morning).toMatchObject({ ready_clips: 18, missing_clips: 2, missing_characters: 300, percentage: 90 })
    expect(calendarBucket(cells['2026-11-26'].morning)).toBe('op-c4')
    expect(calendarBucket(cells['2026-11-27'].morning)).toBe('op-c3')
    expect(calendarBucket(undefined)).toBe('op-cna')
    const columns = calendarColumns('2026-11-26', 7, '2026-11-26')
    expect(columns[0]).toMatchObject({ initial: 'Q', day: 26, today: true, sunday: false })
    expect(columns[3]).toMatchObject({ day: 29, sunday: true })
    expect(firstGap(cells, columns, ['morning'])).toEqual({ date: '2026-11-27', office: 'morning' })
  })
})

describe('runs', () => {
  const now = new Date('2026-11-26T15:00:00-03:00')

  it('names runs and labels their status', () => {
    expect(runTitle(run())).toBe('Ofícios de 26 nov. a 23 dez.')
    expect(runTitle(run({ kind: 'generate_catalog', parameters: { generate: false } }))).toBe('Simulação do livro inteiro')
    expect(runStatus(run({ status: 'running' })).label).toBe('Rodando')
    expect(runStatus(run({ status: 'queued', next_attempt_at: '2026-11-26T14:20:00-03:00' })).label).toBe('Nova tentativa às 14:20')
    expect(runStatus(run({ kind: 'regenerate_clip' }), { pendingCandidates: 3 }).label).toBe('Espera você ouvir')
    expect(runStatus(run({ status: 'failed' })).tone).toBe('danger')
  })

  it('estimates when a running generation ends from its pace so far', () => {
    const finish = estimateFinish(run({ status: 'running', started_at: '2026-11-26T14:00:00-03:00', processed_items: 60, total_items: 120 }), now)
    expect(finish?.toISOString()).toBe(new Date('2026-11-26T16:00:00-03:00').toISOString())
    expect(estimateFinish(run({ status: 'running', processed_items: 0, total_items: 120 }), now)).toBeNull()
  })

  it('groups runs by the day they were asked for', () => {
    const groups = groupRunsByDay([
      run({ id: 3 }),
      run({ id: 2, created_at: '2026-11-25T21:40:00-03:00' }),
      run({ id: 1, created_at: '2026-11-23T16:20:00-03:00' })
    ], now)
    expect(groups.map(group => [group.label, group.runs.length])).toEqual([['Hoje', 1], ['Ontem', 1], ['Segunda, 23 de novembro', 1]])
    expect(dayLabel('2026-11-23T10:00:00-03:00', now)).toBe('Segunda, 23 de novembro')
  })

  it('costs a run by the characters it narrated, or what a dry run would cost', () => {
    expect(runCost(run(), 0.015)?.usd).toBeCloseTo(0.918)
    expect(runCost(run({ cost: { usd: 0.3, usd_per_1k_characters: 0.015, characters: 19800 } }), null)).toEqual({ usd: 0.3, estimated: false })
    expect(runCost(run({ kind: 'generate_catalog', parameters: { generate: false }, result: { missing_characters: 3_610_000 }, generated_characters: 0 }), 0.015)).toEqual({ usd: 54.15, estimated: true })
    expect(runCost(run(), null)).toBeNull()
    expect(usd(3.7245)).toBe('US$ 3,72')
  })

  it('tells a credit refusal from an outage, a key, a timeout and the spending limit', () => {
    expect(classifyFailure('ExternalServiceRejected: 402 insufficient balance')).toBe('credit')
    expect(classifyFailure('401 Unauthorized')).toBe('key')
    expect(classifyFailure('Fish Audio fora do ar (503)')).toBe('outage')
    expect(classifyFailure('Net::ReadTimeout')).toBe('timeout')
    expect(classifyFailure('Audio::BudgetExceeded')).toBe('budget')
    expect(classifyFailure('boom', [{ event: 'failed', at: '', reason: 'provider_rejected', http_status: '402' }])).toBe('credit')
    const copy = failureCopy(run({ status: 'failed', error_message: '402', processed_items: 42, total_items: 112, generated_clips: 140, generated_characters: 19800 }), 'Fish Audio', 0.015)
    expect(copy.happened).toContain('crédito insuficiente')
    expect(copy.todo).toContain('Os 140 clips salvos são reaproveitados; só os 70 ofícios restantes')
  })

  it('says when a waiting run tries again and when it gives up', () => {
    const waiting = run({
      status: 'queued',
      next_attempt_at: '2026-11-26T14:20:00-03:00',
      attempts: [{ event: 'waiting', at: '2026-11-26T14:05:00-03:00', attempt: 2, next_attempt_at: '2026-11-26T14:20:00-03:00' }]
    })
    const schedule = retrySchedule(waiting)
    expect(schedule?.attempt).toBe(3)
    expect(schedule?.last?.toISOString()).toBe(new Date('2026-11-26T14:50:00-03:00').toISOString())
  })

  it('tells the run history in words, or falls back to its timestamps', () => {
    const items = runTimeline(run({
      status: 'failed',
      provider: 'fish',
      attempts: [
        { event: 'requested', at: '2026-11-25T21:40:00-03:00', by: '42' },
        { event: 'waiting', at: '2026-11-25T21:58:00-03:00', attempt: 1, http_status: '503', provider: 'fish', next_attempt_at: '2026-11-25T22:03:00-03:00' },
        { event: 'failed', at: '2026-11-25T22:52:00-03:00', reason: 'provider_rejected', http_status: '402', processed_items: 42 }
      ]
    }), now)
    expect(items.map(item => item.text)).toEqual(['Pedida pelo portal', 'Fish Audio fora do ar (503) · esperou 5 min', 'Recusado: crédito insuficiente (402)'])
    expect(items[1].detail).toBe('21:58 · tentativa 2 de 4')
    expect(runTimeline(run({ attempts: undefined }), now).map(item => item.text)).toEqual(['Pedida pelo portal', 'Começou', 'Concluída'])
  })

  it('adds the estimate up week by week', () => {
    const weeks = weeklyCost([
      { date: '2026-11-26', office_type: 'morning', missing_clips: 10, missing_characters: 1000 },
      { date: '2026-12-02', office_type: 'morning', missing_clips: 5, missing_characters: 1000 },
      { date: '2026-12-03', office_type: 'morning', missing_clips: 4, missing_characters: 2000 }
    ], '2026-11-26', 14, 0.015)
    expect(weeks.map(week => [week.label, week.missing, week.usd])).toEqual([['26 nov. – 2 dez.', 15, 0.03], ['3 – 9 dez.', 4, 0.03]])
    expect(spanLabel('2026-11-26', 28)).toBe('26 nov. a 23 dez.')
  })
})

describe('buildAudioSummary', () => {
  const base = {
    readiness,
    bookName: (code: string) => readiness.books.find(book => book.prayer_book_code === code)?.name || code,
    provider: null,
    providerLabel: 'Fish Audio',
    runs: [] as AudioRun[],
    pendingCandidates: 3,
    failures: 0,
    deadJobs: 0,
    now: new Date('2026-11-26T15:00:00-03:00')
  }
  const text = (parts: Array<{ text: string }>) => parts.map(part => part.text).join('')

  it('says how much has voice, where it is missing and how many things ask for someone', () => {
    const summary = buildAudioSummary(base)
    expect(summary.tone).toBe('warn')
    expect(summary.title).toBe('Quase tudo pronto. Duas coisas pedem você.')
    expect(text(summary.parts)).toBe('Nas próximas 4 semanas, 94% dos trechos que os ofícios vão pedir já têm narração na Bíblia padrão de cada livro. Falta mais em BAS 1985 (64%) e o LOC 1979 (es) ainda não tem voz.')
  })

  it('is calm when nothing asks for anyone', () => {
    const calm = { ...readiness, summary: { ...count(100, 0) }, books: [readiness.books[0]] }
    const summary = buildAudioSummary({ ...base, readiness: calm, pendingCandidates: 0 })
    expect(summary).toMatchObject({ tone: 'ok', title: 'Tudo pronto. Nada pede você.' })
  })

  it('turns into the incident when the provider is down and runs wait for it', () => {
    const summary = buildAudioSummary({
      ...base,
      provider: { provider: 'fish', provider_name: 'Fish Audio', status: 'down', down_since: '2026-11-26T13:58:00-03:00', next_attempt_at: '2026-11-26T14:20:00-03:00' },
      runs: [run({ id: 9, status: 'queued', waiting_for_provider: true, next_attempt_at: '2026-11-26T14:20:00-03:00', attempts: [{ event: 'waiting', at: '2026-11-26T14:05:00-03:00', attempt: 2 }] }), run({ id: 8, status: 'queued', next_attempt_at: '2026-11-26T14:20:00-03:00' })]
    })
    expect(summary).toMatchObject({ tone: 'danger', incident: true, title: 'A Fish Audio não responde desde 13:58.' })
    expect(text(summary.parts)).toContain('2 gerações estão esperando e tentam de novo sozinhas às 14:20 (tentativa 3 de 4)')
    expect(text(summary.parts)).toContain('Se às 14:50 ainda falhar')
  })

  it('speaks of the queue without the stored coverage', () => {
    const summary = buildAudioSummary({ ...base, readiness: null, failures: 1 })
    expect(summary.title).toBe('Duas coisas pedem você.')
    expect(text(summary.parts)).toContain('3 tentativas esperam você ouvir.')
  })
})

describe('ordering a generation', () => {
  it('reads the running twin from a 409, with the operation or only its id', () => {
    const operation = { id: 1851, kind: 'generate_office', status: 'running' }
    expect(alreadyRunning(new OrdoApiError('x', 409, { code: 'AUDIO_GENERATION_ALREADY_RUNNING', operation } as never))).toEqual({ id: 1851, operation })
    expect(alreadyRunning(new OrdoApiError('x', 409, { code: 'AUDIO_GENERATION_ALREADY_RUNNING', operation_id: 7 } as never))).toEqual({ id: 7, operation: null })
    expect(alreadyRunning(new OrdoApiError('x', 409, { code: 'AUDIO_OPERATION_NOT_RETRYABLE' }))).toBeNull()
    expect(alreadyRunning(new OrdoApiError('x', 422, { code: 'AUDIO_GENERATION_ALREADY_RUNNING' }))).toBeNull()
    expect(alreadyRunning(new Error('x'))).toBeNull()
  })

  it('counts the generations sharing the worker and says so', () => {
    expect(runningNowCount({ running_generations: { count: 1 }, running_operations: 3 }, 2, [])).toBe(1)
    expect(runningNowCount({ running_operations: 3 }, 1, [])).toBe(3)
    expect(runningNowCount({}, 2, [])).toBe(2)
    expect(runningNowCount(null, undefined, [run({ status: 'running' }), run({ status: 'queued' }), run()])).toBe(2)
    expect(runningNowText(1)).toBe('1 geração rodando agora — esta vai dividir o worker e pode demorar mais')
    expect(runningNowText(2)).toBe('2 gerações rodando agora — esta vai dividir o worker e pode demorar mais')
    expect(runningNowText(0)).toBeNull()
  })
})
