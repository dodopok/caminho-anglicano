import { describe, expect, it } from 'vitest'
import { createLimitesMemoria } from './limites'

describe('limites em memória (sem Supabase)', () => {
  const inicio = Date.UTC(2026, 9, 28, 10)

  it('limita por IP na última hora, com janela deslizante', () => {
    let t = inicio
    const l = createLimitesMemoria({ porIpHora: 3, porDia: 100 }, () => t)
    expect([l.reservar('a'), l.reservar('a'), l.reservar('a')].every((r) => r.ok)).toBe(true)
    expect(l.reservar('a')).toEqual({ ok: false, motivo: 'ip' })
    expect(l.reservar('b').ok).toBe(true)
    t += 59 * 60_000
    expect(l.reservar('a').ok).toBe(false)
    t += 61_000
    expect(l.reservar('a').ok).toBe(true)
  })

  it('perguntas sem IP contam juntas', () => {
    const l = createLimitesMemoria({ porIpHora: 1, porDia: 100 }, () => inicio)
    expect(l.reservar(null).ok).toBe(true)
    expect(l.reservar(null)).toEqual({ ok: false, motivo: 'ip' })
  })

  it('teto do dia vale para todos e zera no dia seguinte (UTC)', () => {
    let t = inicio
    const l = createLimitesMemoria({ porIpHora: 10, porDia: 2 }, () => t)
    expect(l.reservar('a').ok).toBe(true)
    expect(l.reservar('b').ok).toBe(true)
    expect(l.reservar('c')).toEqual({ ok: false, motivo: 'dia' })
    t = Date.UTC(2026, 9, 29, 0, 1)
    expect(l.reservar('c').ok).toBe(true)
  })

  it('recusa não consome cota', () => {
    const l = createLimitesMemoria({ porIpHora: 1, porDia: 2 }, () => inicio)
    expect(l.reservar('a').ok).toBe(true)
    expect(l.reservar('a').ok).toBe(false)
    expect(l.reservar('a').ok).toBe(false)
    expect(l.reservar('b').ok).toBe(true)
  })

  it('a virada do dia não zera a janela de quem perguntou há pouco', () => {
    let t = Date.UTC(2026, 9, 28, 23, 50)
    const l = createLimitesMemoria({ porIpHora: 1, porDia: 100 }, () => t)
    expect(l.reservar('a').ok).toBe(true)
    t = Date.UTC(2026, 9, 29, 0, 5)
    expect(l.reservar('a')).toEqual({ ok: false, motivo: 'ip' })
  })
})
