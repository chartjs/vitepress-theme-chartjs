import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { debounce } from '../../src/runtime/debounce.js'

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls 500 ms after the last call, with its arguments', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 500)

    debounced('a')
    vi.advanceTimersByTime(499)
    debounced('b')
    vi.advanceTimersByTime(499)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('b')
  })

  it('calls again for calls after the last one ran', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 500)

    debounced(1)
    vi.advanceTimersByTime(500)
    debounced(2)
    vi.advanceTimersByTime(500)

    expect(fn.mock.calls).toEqual([[1], [2]])
  })

  it('stops a pending call on cancel()', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 500)

    debounced()
    debounced.cancel()
    vi.advanceTimersByTime(1000)

    expect(fn).not.toHaveBeenCalled()
  })

  it('calls at once with no delay', () => {
    const fn = vi.fn()
    debounce(fn, 0)('now')

    expect(fn).toHaveBeenCalledWith('now')
  })
})
