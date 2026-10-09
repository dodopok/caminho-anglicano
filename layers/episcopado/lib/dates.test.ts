import { describe, expect, it } from 'vitest'
import { compareDates, definitelyBefore, isValidDate, rangeOf, yearOf } from './dates'

describe('datas parciais', () => {
  it('aceita os formatos suportados', () => {
    for (const d of ['2019-03-16', '2019-03', '2019', 'c.1890', '1890/1895']) {
      expect(isValidDate(d), d).toBe(true)
    }
  })

  it('rejeita datas impossíveis ou fora do formato', () => {
    for (const d of ['2019-13', '2019-02-30', '19', '16/03/2019', 'c.1890-01']) {
      expect(isValidDate(d), d).toBe(false)
    }
  })

  it('converte datas parciais em intervalos', () => {
    expect(rangeOf('2019')).toEqual({ min: '2019-01-01', max: '2019-12-31', approximate: false })
    expect(rangeOf('2019-02')).toMatchObject({ min: '2019-02-01', max: '2019-02-29' })
    expect(rangeOf('c.1890')).toMatchObject({ min: '1885-01-01', max: '1895-12-31', approximate: true })
    expect(rangeOf('1890/1895')).toMatchObject({ min: '1890-01-01', max: '1895-12-31' })
  })

  it('só afirma ordem quando ela é certa apesar da imprecisão', () => {
    expect(definitelyBefore('2018', '2019-01-01')).toBe(true)
    expect(definitelyBefore('2019', '2019-06-01')).toBe(false)
    expect(definitelyBefore('2019-06-01', '2019')).toBe(false)
    expect(definitelyBefore('c.1890', '1893')).toBe(false)
  })

  it('calcula o ano médio', () => {
    expect(yearOf('2019-03-16')).toBe(2019)
    expect(yearOf('1890/1894')).toBe(1892)
  })

  it('ordena datas exatas, parciais, circa e intervalos antes dos registros sem data', () => {
    const dates = [null, '1900', 'c.1890', '1889', '1895/1898', '1890-03-16', '1890-03', undefined]
    expect(dates.sort(compareDates)).toEqual(['1889', 'c.1890', '1890-03', '1890-03-16', '1895/1898', '1900', null, undefined])
    expect(compareDates('c.1890', '1890/1895')).toBe(0)
    expect(compareDates(null, '9999-12-31')).toBeGreaterThan(0)
  })
})
