import { describe, expect, it } from 'vitest'
import { ephemerides, monthDay, windowDays } from './ephemerides'
import type { Base } from './schemas'
import { indexBase } from './views'

const src = [{ source: 's', quote: 'trecho' }]
const base: Base = {
  people: [
    { id: 'a', name: 'Ana', ordinations: [{ order: 'episcopate', date: '2012-12-08', jurisdiction: 'x', principal_consecrator: null, status: 'confirmed', sources: src }] },
    { id: 'b', name: 'Bento', ordinations: [{ order: 'diaconate', date: '1993-12-10', jurisdiction: 'x', ordained_by: null, status: 'probable', sources: src }] },
    { id: 'c', name: 'Caio', ordinations: [{ order: 'presbyterate', date: '2001-12-08', jurisdiction: null, ordained_by: null, status: 'confirmed', sources: src }] },
    // Data incompleta e reordenação ficam de fora.
    { id: 'd', name: 'Dora', ordinations: [{ order: 'episcopate', date: '2012-12', jurisdiction: 'x', principal_consecrator: null, status: 'confirmed', sources: src }, { order: 'episcopate', date: '2013-12-09', jurisdiction: 'x', principal_consecrator: null, mode: 'conditional', status: 'confirmed', sources: src }] }
  ],
  jurisdictions: [{ id: 'x', name: 'Igreja X', acronym: 'IX', type: 'province' }],
  sources: [{ id: 's', type: 'news', title: 'Notícia', url: 'https://exemplo.org', level: 'secondary' }]
}
const index = indexBase(base)

describe('ephemerides', () => {
  it('monta a janela de dias e o dia/mês de uma data', () => {
    expect(monthDay(new Date(Date.UTC(2026, 9, 8)))).toBe('10-08')
    expect(windowDays(new Date(Date.UTC(2026, 11, 30)), 3)).toEqual(['12-30', '12-31', '01-01'])
  })

  it('lista as ordenações da semana em ordem do calendário e do ano', () => {
    const list = ephemerides(index, new Date(Date.UTC(2026, 11, 7)), 7)
    expect(list.map((e) => `${e.monthDay} ${e.person.id}`)).toEqual(['12-08 c', '12-08 a', '12-10 b'])
    expect(list[1]).toMatchObject({ label: 'sagração episcopal', year: 2012, jurisdiction: { id: 'x', acronym: 'IX' }, status: 'confirmed' })
    expect(list[0].jurisdiction).toBeNull()
  })

  it('ignora datas incompletas e ordenações condicionais', () => {
    expect(ephemerides(index, new Date(Date.UTC(2026, 11, 9)), 1)).toEqual([])
  })
})
