import { describe, expect, it } from 'vitest'
import { periodFromQuery, periodToQuery, portalReturnPath, queryForLocation, tabFromSlug } from './portalRoute'

const today = new Date('2026-11-24T12:00:00')

describe('portal route', () => {
  it('reads the tab from its Portuguese slug and falls back to the overview', () => {
    expect(tabFromSlug('operacao')).toBe('operations')
    expect(tabFromSlug('negocio')).toBe('platform')
    expect(tabFromSlug('nada-disso')).toBe('overview')
    expect(tabFromSlug(undefined)).toBe('overview')
  })

  it('keeps the default period out of the URL and writes the others', () => {
    expect(periodToQuery({ preset: '30d', start: '2026-10-26', end: '2026-11-24' })).toEqual({ periodo: null, de: null, ate: null })
    expect(periodToQuery({ preset: 'all', start: '1970-01-01', end: '2026-11-24' })).toEqual({ periodo: 'tudo', de: null, ate: null })
    expect(periodToQuery({ preset: 'custom', start: '2026-01-01', end: '2026-03-31' })).toEqual({ periodo: null, de: '2026-01-01', ate: '2026-03-31' })
  })

  it('reopens the same period after a reload', () => {
    expect(periodFromQuery({}, today)).toMatchObject({ preset: '30d', end: '2026-11-24' })
    expect(periodFromQuery({ periodo: '7d' }, today)).toMatchObject({ preset: '7d', start: '2026-11-18' })
    expect(periodFromQuery({ de: '2026-01-01', ate: '2026-03-31' }, today)).toEqual({ preset: 'custom', start: '2026-01-01', end: '2026-03-31' })
    // An inverted or malformed range is ignored rather than sent to the API.
    expect(periodFromQuery({ de: '2026-03-31', ate: '2026-01-01' }, today).preset).toBe('30d')
    expect(periodFromQuery({ de: 'ontem', ate: '2026-01-01' }, today).preset).toBe('30d')
  })

  it('drops the old tab\'s keys but keeps the period when a link opens another place', () => {
    const current = { aba: 'operacao', vista: 'regras', busca: 'jejum', periodo: '7d' }
    expect(queryForLocation(current, { tab: 'audio', params: { secao: 'clips' } })).toEqual({ aba: 'audio', vista: null, busca: null, secao: 'clips' })
    expect(queryForLocation(current, { tab: 'overview' })).toEqual({ aba: null, vista: null, busca: null })
  })

  it('only returns into the portal after login', () => {
    expect(portalReturnPath('/portal-do-ordo?aba=operacao&rosario=42')).toBe('/portal-do-ordo?aba=operacao&rosario=42')
    expect(portalReturnPath('https://example.com/portal-do-ordo')).toBe('/portal-do-ordo')
    expect(portalReturnPath('//example.com')).toBe('/portal-do-ordo')
    expect(portalReturnPath('/portal-do-ordo-falso')).toBe('/portal-do-ordo')
    expect(portalReturnPath('/portal-do-ordo/login?voltar=x')).toBe('/portal-do-ordo')
    expect(portalReturnPath(undefined)).toBe('/portal-do-ordo')
  })
})
