import { describe, expect, it, vi } from 'vitest'
import { createPortalQuery, useQueryParam } from './usePortalQuery'

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe('usePortalQuery', () => {
  it('sends several changes in one tick as a single navigation', async () => {
    const write = vi.fn()
    const query = createPortalQuery({ read: () => ({ aba: 'operacao' }), write })

    query.set({ vista: 'regras' })
    query.set({ busca: 'jejum', pagina: 2 })
    await flush()

    expect(write).toHaveBeenCalledTimes(1)
    expect(write).toHaveBeenCalledWith({ aba: 'operacao', vista: 'regras', busca: 'jejum', pagina: '2' }, false)
  })

  it('removes a key set to null or empty, and adds history only when asked', async () => {
    const write = vi.fn()
    const query = createPortalQuery({ read: () => ({ aba: 'operacao', vista: 'regras', busca: 'x' }), write })

    query.set({ vista: null, busca: '' }, { push: true })
    await flush()

    expect(write).toHaveBeenCalledWith({ aba: 'operacao' }, true)
  })

  it('does not navigate when nothing changed', async () => {
    const write = vi.fn()
    const query = createPortalQuery({ read: () => ({ aba: 'audio' }), write })

    query.set({ aba: 'audio', secao: null })
    await flush()

    expect(write).not.toHaveBeenCalled()
  })

  it('adopts back/forward navigation but not an older URL while its own change is on the way', async () => {
    let resolve: () => void = () => {}
    const route = { query: { aba: 'pessoas' } as Record<string, string> }
    const query = createPortalQuery({
      read: () => route.query,
      write: (next) => new Promise<void>(done => { resolve = () => { route.query = next; done() } })
    })

    query.set({ aba: 'pratica' })
    await flush()
    query.sync({ aba: 'pessoas' })
    expect(query.get('aba')).toBe('pratica')

    resolve()
    await flush()
    query.sync({ aba: 'negocio' })
    expect(query.get('aba')).toBe('negocio')
  })

  it('reads a key as a value with a fallback that never reaches the URL', async () => {
    const write = vi.fn()
    const query = createPortalQuery({ read: () => ({ secao: 'inexistente' }), write })
    const section = useQueryParam('secao', 'visao-geral', ['visao-geral', 'gerar', 'clips'] as const, { query })

    expect(section.value).toBe('visao-geral')
    section.value = 'clips'
    await flush()
    expect(write).toHaveBeenLastCalledWith({ secao: 'clips' }, false)

    section.value = 'visao-geral'
    await flush()
    expect(write).toHaveBeenLastCalledWith({}, false)
  })
})
