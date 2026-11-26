import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLivePoller, POLL_FAST, POLL_MAX, POLL_SLOW, type PollMode } from './useAudioStore'

// A document whose visibility the test controls.
const fakeDocument = () => {
  const listeners = new Set<() => void>()
  return {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: (_: string, listener: () => void) => { listeners.add(listener) },
    removeEventListener: (_: string, listener: () => void) => { listeners.delete(listener) },
    setVisibility (value: DocumentVisibilityState) {
      this.visibilityState = value
      listeners.forEach(listener => listener())
    },
    get listeners () { return listeners.size }
  }
}

describe('createLivePoller', () => {
  let doc: ReturnType<typeof fakeDocument>
  let mode: PollMode
  let changed: boolean
  let read: ReturnType<typeof vi.fn<() => Promise<boolean>>>

  const start = () => {
    const poller = createLivePoller({ mode: () => mode, read, document: doc as unknown as Document })
    poller.update()
    return poller
  }

  beforeEach(() => {
    vi.useFakeTimers()
    doc = fakeDocument()
    mode = null
    changed = false
    read = vi.fn(async () => changed)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('makes no request at all while nothing is queued or running', async () => {
    const poller = start()
    await vi.advanceTimersByTimeAsync(60 * 60_000)
    expect(read).not.toHaveBeenCalled()
    expect(poller.delay).toBeNull()
  })

  it('reads every 4 s while something runs and doubles the wait while nothing changes, up to a minute', async () => {
    mode = 'fast'
    const poller = start()
    expect(poller.delay).toBe(POLL_FAST)
    await vi.advanceTimersByTimeAsync(POLL_FAST)
    expect(read).toHaveBeenCalledTimes(1)
    expect(poller.delay).toBe(8_000)
    await vi.advanceTimersByTimeAsync(8_000)
    expect(poller.delay).toBe(16_000)
    await vi.advanceTimersByTimeAsync(16_000 + 32_000)
    expect(read).toHaveBeenCalledTimes(4)
    expect(poller.delay).toBe(POLL_MAX)
    await vi.advanceTimersByTimeAsync(POLL_MAX)
    expect(poller.delay).toBe(POLL_MAX)
  })

  it('goes back to the shortest wait as soon as something changes', async () => {
    mode = 'fast'
    const poller = start()
    await vi.advanceTimersByTimeAsync(POLL_FAST + 8_000)
    expect(poller.delay).toBe(16_000)
    changed = true
    await vi.advanceTimersByTimeAsync(16_000)
    expect(poller.delay).toBe(POLL_FAST)
  })

  it('waits a minute between reads while runs only wait for the provider', async () => {
    mode = 'slow'
    const poller = start()
    await vi.advanceTimersByTimeAsync(POLL_SLOW - 1)
    expect(read).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(read).toHaveBeenCalledTimes(1)
    expect(poller.delay).toBe(POLL_MAX)
  })

  it('stops when the work ends', async () => {
    mode = 'fast'
    const poller = start()
    mode = null
    await vi.advanceTimersByTimeAsync(POLL_FAST)
    expect(read).toHaveBeenCalledTimes(1)
    expect(poller.delay).toBeNull()
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('pauses while the tab is hidden and reads at once when it is shown again', async () => {
    mode = 'fast'
    const poller = start()
    doc.setVisibility('hidden')
    expect(poller.delay).toBeNull()
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(read).not.toHaveBeenCalled()

    doc.setVisibility('visible')
    await vi.advanceTimersByTimeAsync(0)
    expect(read).toHaveBeenCalledTimes(1)
    expect(poller.delay).toBe(8_000)
  })

  it('does not read when shown again if nothing is running', async () => {
    start()
    doc.setVisibility('hidden')
    doc.setVisibility('visible')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(read).not.toHaveBeenCalled()
  })

  it('restarts from 4 s after an action and lets go of the page when stopped', async () => {
    mode = 'fast'
    const poller = start()
    await vi.advanceTimersByTimeAsync(POLL_FAST + 8_000)
    expect(poller.delay).toBe(16_000)
    poller.kick()
    expect(poller.delay).toBe(POLL_FAST)
    poller.stop()
    expect(doc.listeners).toBe(0)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(read).toHaveBeenCalledTimes(2)
  })
})
