import { describe, expect, it } from 'vitest'
import { createReport } from './useReport'

describe('createReport', () => {
  it('keeps the previous error on screen while a reread is in flight', async () => {
    let fail = true
    let release: () => void = () => {}
    const report = createReport(() => fail
      ? Promise.reject(new Error('API fora'))
      : new Promise<string>(resolve => { release = () => resolve('ok') }))

    await report.load()
    expect(report.state.error).toBeTruthy()

    fail = false
    const pending = report.load()
    expect(report.state.loading).toBe(true)
    expect(report.state.error).toBeTruthy()

    release()
    await pending
    expect(report.state.error).toBeNull()
    expect(report.state.data).toBe('ok')
  })

  it('keeps the previous data while a reread is in flight', async () => {
    let n = 0
    let release: (value: number) => void = () => {}
    const report = createReport(() => (++n === 1 ? Promise.resolve(1) : new Promise<number>(resolve => { release = resolve })))

    await report.load()
    const pending = report.load()
    expect(report.state.data).toBe(1)
    release(2)
    await pending
    expect(report.state.data).toBe(2)
  })
})
