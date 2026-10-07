import { describe, expect, it } from 'vitest'
import type { Base, TOrdination, TPerson } from './schemas'
import { normalizeName, validateBase } from './validate'

const refs = [{ source: 's', quote: 'citação' }]

function consecration(date: string | null, consecrator: string | null, extra: Partial<TOrdination> = {}): TOrdination {
  return { order: 'episcopate', date, jurisdiction: 'j', principal_consecrator: consecrator, status: 'confirmed', sources: refs, ...extra }
}

function person(id: string, extra: Partial<TPerson> = {}): TPerson {
  return { id, name: id, ...extra }
}

function base(people: TPerson[]): Base {
  return {
    people,
    jurisdictions: [{ id: 'j', name: 'J', type: 'national_church', founded: { date: '1900', sources: refs } }],
    sources: [{ id: 's', type: 'news', title: 'S', url: 'https://exemplo.org', archive_url: 'https://web.archive.org/x', level: 'secondary' }]
  }
}

const messages = (findings: { message: string }[]) => findings.map((f) => f.message).join('\n')

describe('validateBase', () => {
  it('aceita uma base coerente', () => {
    const r = validateBase(base([
      person('a', { ordinations: [consecration('1990', null)] }),
      person('b', { ordinations: [consecration('2000', 'a')] })
    ]))
    expect(r.errors).toEqual([])
  })

  it('acusa referências quebradas', () => {
    const r = validateBase(base([
      person('a', { ordinations: [consecration('2000', 'fantasma', { jurisdiction: 'nenhuma', sources: [{ source: 'sumiu' }] })] })
    ]))
    const text = messages(r.errors)
    expect(text).toContain('pessoa inexistente: "fantasma"')
    expect(text).toContain('jurisdição inexistente: "nenhuma"')
    expect(text).toContain('fonte inexistente: "sumiu"')
  })

  it('acusa sagrante sagrado depois da sagração que fez', () => {
    const r = validateBase(base([
      person('a', { ordinations: [consecration('2010', null)] }),
      person('b', { ordinations: [consecration('2000', 'a')] })
    ]))
    expect(messages(r.errors)).toContain('a só foi sagrado bispo em 2010')
  })

  it('acusa ordens fora de sequência e ordenação após a morte', () => {
    const r = validateBase(base([
      person('a', {
        death: { date: '2005', sources: refs },
        ordinations: [
          { order: 'presbyterate', date: '1990', jurisdiction: 'j', ordained_by: null, status: 'confirmed', sources: refs },
          consecration('1985', null),
          { order: 'diaconate', date: '2006', jurisdiction: 'j', ordained_by: null, status: 'confirmed', sources: refs }
        ]
      })
    ]))
    const text = messages(r.errors)
    expect(text).toContain('episcopado (1985) antes de presbiterato (1990)')
    expect(text).toContain('posterior ao falecimento')
  })

  it('acusa ciclos de sagração', () => {
    const r = validateBase(base([
      person('a', { ordinations: [consecration(null, 'b')] }),
      person('b', { ordinations: [consecration(null, 'a')] })
    ]))
    expect(messages(r.errors)).toContain('ciclo de sagração')
  })

  it('registra lacunas em vez de erros quando falta informação', () => {
    const r = validateBase(base([person('a', { ordinations: [consecration(null, null)] })]))
    expect(r.errors).toEqual([])
    const text = messages(r.gaps)
    expect(text).toContain('episcopado sem data')
    expect(text).toContain('sagração sem sagrante principal')
    expect(text).toContain('falta registrar o diaconato')
    expect(text).toContain('falta registrar o presbiterato')
  })

  it('avisa sobre possíveis duplicatas', () => {
    const r = validateBase(base([
      person('miguel-uchoa', { name: 'Dom Miguel Uchôa' }),
      person('miguel-uchoa-cavalcanti', { name: 'Miguel Uchoa' })
    ]))
    expect(messages(r.warnings)).toContain('possível duplicata')
  })
})

describe('normalizeName', () => {
  it('ignora acentos, títulos e pontuação', () => {
    expect(normalizeName('Dom Miguel Uchôa')).toBe('miguel uchoa')
    expect(normalizeName('The Rt. Rev. Lucien Lee Kinsolving')).toBe('lucien lee kinsolving')
  })
})
