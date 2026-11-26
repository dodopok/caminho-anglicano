import { describe, expect, it } from 'vitest'
import {
  activeNumbers,
  appSendsEvents,
  audienceSplit,
  beforeFirstRollup,
  buildMoves,
  closingDays,
  comparedWindow,
  compactNumber,
  contentTitle,
  groupContent,
  dateInWindow,
  dayStates,
  featureEvents,
  funnelView,
  humanizeSlug,
  seriesTitle,
  movingAverage,
  periodPhrase,
  rankFeatures,
  shareText,
  spikeInside,
  summarySentence,
  telemetryGaps,
  usageLiveText,
  usageWindow,
  versionGroups
} from './usage'
import type { UsageActivePoint, UsageTopFeature, UsageTopResponse } from '../types/usage'

const NOW = new Date('2026-11-26T15:00:00')
const point = (date: string, dau: number, extra: Partial<UsageActivePoint> = {}): UsageActivePoint => ({
  date, dau, wau: dau * 3, mau: dau * 6, by_client: {}, app_and_web: { dau: 0, wau: 0, mau: 0 }, ...extra
})
const feature = (name: string, count: number, errors = 0, userDays = Math.round(count / 3)): UsageTopFeature => ({ feature: name, count, errors, user_days: userDays })

describe('the window the Uso tab reads', () => {
  it('reads a preset that ends today as the same number of days ending yesterday', () => {
    expect(usageWindow({ preset: '30d', start: '2026-10-28', end: '2026-11-26' }, NOW))
      .toEqual({ start_date: '2026-10-27', end_date: '2026-11-25', clamped: false, shifted: true })
  })

  it('keeps a custom range in the past and only cuts the open days of one that reaches today', () => {
    expect(usageWindow({ preset: 'custom', start: '2026-09-01', end: '2026-09-30' }, NOW).end_date).toBe('2026-09-30')
    expect(usageWindow({ preset: 'custom', start: '2026-11-01', end: '2026-11-26' }, NOW))
      .toMatchObject({ start_date: '2026-11-01', end_date: '2026-11-25', shifted: true })
  })

  it('cuts "desde sempre" to 366 days and compares with nothing', () => {
    const period = { preset: 'all' as const, start: '1970-01-01', end: '2026-11-26' }
    const window = usageWindow(period, NOW)
    expect(window).toMatchObject({ start_date: '2025-11-25', end_date: '2026-11-25', clamped: true })
    expect(comparedWindow(period, window)).toBeNull()
  })

  it('compares with the window of the same length just before', () => {
    expect(comparedWindow({ preset: '7d', start: '', end: '' }, { start_date: '2026-11-19', end_date: '2026-11-25' }))
      .toEqual({ start_date: '2026-11-12', end_date: '2026-11-18' })
  })

  it('names the period in words', () => {
    expect(periodPhrase({ preset: '30d', start: '', end: '' }, { start_date: '2026-10-27', end_date: '2026-11-25' })).toBe('nos últimos 30 dias')
    expect(periodPhrase({ preset: 'custom', start: '', end: '' }, { start_date: '2026-10-03', end_date: '2026-11-09' })).toBe('de 3 out. a 9 nov.')
  })
})

describe('honest partial data', () => {
  const dates = ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23']

  it('marks the days before the telemetry existed, from the status or from an empty previous window', () => {
    expect(telemetryGaps(dates, [0, 0, 5, 6], { startedOn: '2026-11-22T18:12:00-03:00', previousHasData: true })).toEqual([true, true, false, false])
    expect(telemetryGaps(dates, [0, 0, 5, 6], { previousHasData: false })).toEqual([true, true, false, false])
    // With data before, a zero is a real zero.
    expect(telemetryGaps(dates, [0, 0, 5, 6], { previousHasData: true })).toEqual([false, false, false, false])
  })

  it('shades the two days the nightly rollup may still rewrite, never today', () => {
    expect(closingDays(['2026-11-23', '2026-11-24', '2026-11-25'], NOW)).toBe(2)
    expect(closingDays(['2026-10-01', '2026-10-02'], NOW)).toBe(0)
  })

  it('takes the gaps and the closing days from the status when it has them', () => {
    const states = dayStates({ days: [{ date: '2026-11-20', state: 'no_data' }, { date: '2026-11-21', state: 'closed' }, { date: '2026-11-22', state: 'closing' }, { date: '2026-11-23', state: 'closing' }] })
    expect(telemetryGaps(dates, [0, 4, 5, 6], { previousHasData: true, states })).toEqual([true, false, false, false])
    expect(closingDays(dates, NOW, states)).toBe(2)
  })

  it('reads the app as sending its own events only once its client row has any', () => {
    expect(appSendsEvents({ sources: [{ source: 'client', client: 'app', today: 0, first_day: null }] })).toBe(false)
    expect(appSendsEvents({ sources: [{ source: 'client', client: 'app', today: 12, first_day: null }] })).toBe(true)
    expect(appSendsEvents(null)).toBe(false)
  })

  it('averages people only over the days that have data', () => {
    const series = [point('2026-11-22', 0), point('2026-11-23', 100), point('2026-11-24', 120), point('2026-11-25', 0)]
    const numbers = activeNumbers(series, { start_date: '2026-11-22', end_date: '2026-11-25' }, [true, false, false, false])
    expect(numbers.perDay).toBe(110)
    expect(numbers.people).toBe(360)
    expect(numbers.peopleWindow).toBe('semana')
  })

  it('knows the first rollup has not run, from the status or from empty reports', () => {
    const empty = { period: { start_date: '', end_date: '' }, features: [], events: [], counters: [] }
    expect(beforeFirstRollup({ rollup: { last_closed_day: null } }, null, null)).toBe(true)
    expect(beforeFirstRollup({ rollup: { last_closed_day: '2026-11-25' } }, { period: empty.period, series: [] }, empty)).toBe(false)
    expect(beforeFirstRollup(null, { period: empty.period, series: [point('2026-11-25', 0)] }, empty)).toBe(true)
    expect(beforeFirstRollup(null, null, null)).toBe(false)
  })


  it('says until when the numbers go', () => {
    const window = { start_date: '2026-10-27', end_date: '2026-11-25' }
    expect(usageLiveText({ rollup: { last_closed_day: '2026-11-25', rolled_at: '2026-11-26T00:30:00' } }, window, NOW)).toBe('Dados até ontem, 25 nov. · fechados às 00:30')
    expect(usageLiveText(null, window, NOW)).toBe('Dados até ontem, 25 nov. · fecham às 00:30')
    // A rollup that has not closed yesterday yet: the numbers stop a day earlier.
    expect(usageLiveText({ rollup: { last_closed_day: '2026-11-24' } }, window, NOW)).toBe('Dados até 24 nov. · fecham às 00:30')
    expect(usageLiveText({ rollup: { next_run_at: '2026-11-27T00:30:00' } }, window, NOW, true)).toBe('Primeiro resumo: 27 nov., 00:30')
  })
})

describe('what changed', () => {
  const now = [feature('office', 1100, 1), feature('rosary', 300), feature('calendar', 180), feature('pdf', 150, 6), feature('journal', 20)]
  const before = [feature('office', 1000, 1), feature('rosary', 200), feature('calendar', 240), feature('pdf', 150, 0), feature('journal', 5)]

  it('picks the biggest rises, the biggest fall and an error jump, ignoring tiny features', () => {
    const moves = buildMoves(now, before)
    expect(moves.map(move => `${move.kind}:${move.feature}`)).toEqual(['up:rosary', 'up:office', 'down:calendar', 'errors:pdf'])
    expect(moves[0].title).toBe('Rosário +50%.')
    expect(moves[2].title).toBe('Calendário −25%.')
    expect(moves[3].title).toBe('Erros em PDF: 4%')
  })

  it('tells the period in one sentence, with the right article', () => {
    const sentence = summarySentence({
      people: 4812, peoplePrevious: 4415, offices: 31420, officesPrevious: 28306, perDay: 1046,
      phrase: 'nos últimos 30 dias', previousLabel: '30 dias anteriores',
      moves: [{ feature: 'rosary', kind: 'up', value: 18, title: '', detail: '' }, { feature: 'audio', kind: 'up', value: 12, title: '', detail: '' }, { feature: 'calendar', kind: 'down', value: -8, title: '', detail: '' }]
    })
    expect(sentence.title).toBe('4.812 pessoas usaram o Ordo e rezaram 31.420 ofícios nos últimos 30 dias.')
    expect(sentence.parts.map(part => part.text).join('')).toBe('São 11% mais ofícios que nos 30 dias anteriores, com 9% mais pessoas. O que mais cresceu foi o Rosário (+18%) e a Narração (+12%); o Calendário caiu 8%. Em média, 1.046 pessoas abrem o Ordo por dia.')
  })

  it('says less when there is nothing to compare', () => {
    const sentence = summarySentence({ people: 10, offices: null, perDay: null, phrase: 'nos últimos 7 dias', previousLabel: '', moves: [] })
    expect(sentence.title).toBe('10 pessoas usaram o Ordo nos últimos 7 dias.')
    expect(sentence.parts).toEqual([])
  })

  it('ranks features by times or by people-days, with the bar against the first', () => {
    const rows = rankFeatures(now, before)
    expect(rows[0]).toMatchObject({ feature: 'office', bar: 100, previous: 1000, icon: 'book' })
    expect(rows.find(row => row.feature === 'pdf')?.errorRate).toBe(4)
    const byPeople = rankFeatures([feature('office', 900, 0, 10), feature('journal', 10, 0, 50)], null, 'pessoas')
    expect(byPeople[0].feature).toBe('journal')
    expect(byPeople[0].previous).toBeNull()
  })

  it('compares with nothing when the previous window has no data at all', () => {
    const rows = rankFeatures(now, [feature('office', 0, 0, 0)])
    expect(rows.every(row => row.previous === null)).toBe(true)
  })

  it('smooths a trend with a trailing 7-day average', () => {
    expect(movingAverage([7, 0, 0, 0, 0, 0, 0, 7])).toEqual([7, 3.5, 7 / 3, 1.75, 1.4, 7 / 6, 1, 1])
  })
})

describe('público', () => {
  it('splits people into app only, web only and both', () => {
    const latest = point('2026-11-25', 0, { by_client: { app: { dau: 1, wau: 2, mau: 3322 }, web: { dau: 1, wau: 2, mau: 1832 } }, app_and_web: { dau: 0, wau: 0, mau: 342 } })
    expect(audienceSplit(latest, 'mes')).toEqual({ app: 3322, web: 1832, both: 342, appOnly: 2980, webOnly: 1490, people: 4812 })
    expect(audienceSplit(null, 'mes')).toBeNull()
  })

  it('writes counts and shares compactly', () => {
    expect(compactNumber(196_400)).toBe('196 mil')
    expect(compactNumber(1200)).toBe('1,2 mil')
    expect(compactNumber(870)).toBe('870')
    expect(shareText(4, 1000)).toBe('<1%')
    expect(shareText(410, 1000)).toBe('41%')
    expect(shareText(1, 0)).toBe('—')
  })

  it('keeps the three newest app versions and folds the rest', () => {
    const view = versionGroups([{ value: '1.43.1', count: 6 }, { value: '1.45.0', count: 72 }, { value: '1.44.2', count: 18 }, { value: '1.40.0', count: 3 }, { value: '1.9.0', count: 1 }, { value: null, count: 9 }])
    expect(view.rows.map(row => `${row.label}:${row.value}`)).toEqual(['1.45.0:72', '1.44.2:18', '1.43.1:6', 'mais antigas:4'])
    expect(view.people).toBe(false)
    expect(versionGroups([{ value: '1.45.0', count: 10, user_days: 4 }]).rows[0].value).toBe(4)
  })
})

describe('funnels in words', () => {
  it('tells a per-person funnel as "N de cada 10" and where people stop', () => {
    const view = funnelView({ key: 'office', per_user: true, steps: [{ event: 'office_opened', count: 9800, user_days: 6100 }, { event: 'office_completed', count: 31420, user_days: 24100 }], started: 6100, converted: 4330, rate: 0.71 })
    expect(view.say.map(part => part.text).join('')).toBe('Em 7 de cada 10 dias em que alguém abre um ofício, ele termina marcado como rezado.')
    expect(view.steps.map(step => step.value)).toEqual([6100, 4330])
    expect(view.steps[1].badge).toBe('71%')
    expect(view.drop?.text).toBe('29% fecharam sem marcar')
  })

  it('switches to "de cada 100" for a rare path', () => {
    const view = funnelView({ key: 'paywall', per_user: true, steps: [{ event: 'paywall_viewed', count: 1, user_days: 1870 }, { event: 'purchase_finished', count: 1, user_days: 64 }], started: 1870, converted: 64, rate: 64 / 1870 })
    expect(view.say[1].text).toBe('3 de cada 100')
    expect(view.drop?.text).toBe('96,6% saíram sem comprar')
  })

  it('tells sharing by sends and opens per send', () => {
    const view = funnelView({ key: 'share', per_user: false, steps: [{ event: 'share_sheet_opened', count: 2410, user_days: 1 }, { event: 'share_performed', count: 1380, user_days: 1 }, { event: 'share_link_opened', count: 3920, user_days: 1 }] })
    expect(view.say.map(part => part.text).join('')).toBe('De cada 10 vezes que alguém abre o compartilhamento, 6 terminam em envio. Cada envio é aberto, em média, 2,8 vezes por outra pessoa.')
    expect(view.steps[2].badge).toBe('× 2,8 por envio')
    expect(view.drop?.text).toBe('43% desistiram antes de enviar')
  })

  it('uses the steps each person reached in order and says where most are lost', () => {
    const view = funnelView({ key: 'first_access', per_user: true, steps: [{ event: 'onboarding_started', count: 410, user_days: 380, reached: 380 }, { event: 'onboarding_completed', count: 300, user_days: 290, reached: 285 }, { event: 'office_completed', count: 31420, user_days: 24100, reached: 120 }], started: 380, converted: 120, rate: 0.3158 })
    expect(view.title).toBe('Primeiro acesso')
    expect(view.steps.map(step => step.value)).toEqual([380, 285, 120])
    expect(view.drop).toEqual({ afterStep: 1, text: '58% terminaram sem rezar no mesmo dia' })
  })

  it('does not invent a rate when nobody started', () => {
    const view = funnelView({ key: 'office', per_user: true, steps: [{ event: 'office_opened', count: 0, user_days: 0 }, { event: 'office_completed', count: 0, user_days: 0 }], started: 0, converted: 0, rate: null })
    expect(view.say[0].text).toBe('Ninguém começou este caminho no período.')
    expect(view.drop).toBeNull()
  })
})

describe('content and events', () => {
  it('reads a slug as a name until the API brings the title', () => {
    expect(humanizeSlug('santo-andre-apostolo')).toBe('Santo Andre Apostolo')
    expect(humanizeSlug('todos-os-santos')).toBe('Todos os Santos')
    expect(contentTitle({ content_slug: 'todos-os-santos', title: 'Todos os Santos' })).toBe('Todos os Santos')
  })

  it('shows the API\'s title when it sends one and the slug read as words when it is null', () => {
    expect(contentTitle({ content_slug: 'santo-andre-apostolo', title: 'Santo André, Apóstolo' })).toBe('Santo André, Apóstolo')
    expect(contentTitle({ content_slug: 'santo-andre-apostolo', title: null })).toBe('Santo Andre Apostolo')
    expect(contentTitle({ content_slug: 'santo-andre-apostolo', title: '  ' })).toBe('Santo Andre Apostolo')
    expect(contentTitle({ content_slug: 'santo-andre-apostolo' })).toBe('Santo Andre Apostolo')
    // Two events of the same slug: the line keeps the title one of them has.
    const groups = groupContent([
      { content_kind: 'saint', content_slug: 'santo-andre-apostolo', event: 'post_opened', count: 3, user_days: 2, title: null },
      { content_kind: 'saint', content_slug: 'santo-andre-apostolo', event: 'post_shared', count: 1, user_days: 1, title: 'Santo André, Apóstolo' }
    ])
    expect(groups.saints).toHaveLength(1)
    expect(groups.saints[0]).toMatchObject({ count: 4, title: 'Santo André, Apóstolo' })
  })

  it('reads the title of the `content?slug=` answer, or of its rows', () => {
    expect(seriesTitle({ title: 'Todos os Santos', rows: [] })).toBe('Todos os Santos')
    expect(seriesTitle({ title: null, rows: [{ content_kind: 'saint', content_slug: 'todos-os-santos', event: 'post_opened', count: 1, user_days: 1, title: 'Todos os Santos' }] })).toBe('Todos os Santos')
    expect(seriesTitle({ title: null })).toBeNull()
    expect(seriesTitle(null)).toBeNull()
  })

  it('reads a feast inside the window from a spike in its opens, not from a climb at the end', () => {
    expect(spikeInside([1, 1, 1, 2, 40, 90, 30, 4, 2, 1, 1, 1, 1, 1])).toBe(true)
    expect(spikeInside([1, 1, 1, 1, 1, 2, 3, 6, 10, 20, 40, 60, 80, 100])).toBe(false)
    expect(spikeInside([10, 11, 9, 12, 10, 11, 10, 9])).toBe(false)
    expect(spikeInside(null)).toBe(false)
  })

  it('knows when a feast day falls inside the window', () => {
    const window = { start_date: '2026-10-27', end_date: '2026-11-25' }
    expect(dateInWindow('11-01', window)).toBe(true)
    expect(dateInWindow('2026-11-30', window)).toBe(false)
    expect(dateInWindow(null, window)).toBe(false)
  })

  it('takes a feature\'s events from the API when it filters them, from the portal\'s list otherwise', () => {
    const response: UsageTopResponse = {
      period: { start_date: '', end_date: '' },
      features: [],
      events: [{ event: 'office_opened', source: 'client', count: 1, user_days: 1 }, { event: 'share_performed', source: 'client', count: 1, user_days: 1 }],
      counters: []
    }
    expect(featureEvents(response, 'office')).toEqual({ events: [response.events[0]], filtered: false })
    expect(featureEvents({ ...response, filter: { feature: 'office' } }, 'office').filtered).toBe(true)
    // Events that carry their feature are grouped by it, no list needed.
    const tagged = { ...response, events: [{ ...response.events[0], feature: 'office' }, { ...response.events[1], feature: 'share' }] }
    expect(featureEvents(tagged, 'share')).toEqual({ events: [tagged.events[1]], filtered: true })
  })
})
