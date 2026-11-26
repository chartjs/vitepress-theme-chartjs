// Editing in the code textarea, on the source: re-evaluation 500 ms after the last keystroke, the Tab key and
// highlighting.
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { bar, chartId, chartIn, fixture, mountLive } from './helpers.js'

afterEach(() => {
  vi.useRealTimers()
})

function textareaIn(root: Element): HTMLTextAreaElement {
  const textarea = root.querySelector('textarea')
  expect(textarea).not.toBeNull()
  return textarea!
}

/** Types `value` as the reader would, in one input event. */
function type(textarea: HTMLTextAreaElement, value: string) {
  textarea.value = value
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Lets `ms` pass on the faked timers, then lets Vue render what they changed. */
async function wait(ms: number) {
  vi.advanceTimersByTime(ms)
  await nextTick()
}

describe('the code textarea', () => {
  it('holds the code and highlights it', async () => {
    const root = fixture()
    mountLive(root, bar([1, 2, 3]))
    await chartIn(root)
    expect(textareaIn(root).value).toBe(bar([1, 2, 3]))
    expect(root.querySelector('.token.keyword')?.textContent).toBe('const')
  })

  it('evaluates an edit 500 ms after the last keystroke, on the same chart', async () => {
    const root = fixture()
    const { editor } = mountLive(root, bar([1, 2, 3]))
    const chart = await chartIn(root)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const textarea = textareaIn(root)

    type(textarea, bar([4, 5, 6]))
    await wait(400)
    type(textarea, bar([7, 8, 9]))
    await wait(499)
    expect(chart.data.datasets[0].data).toEqual([1, 2, 3])

    await wait(1)
    expect(editor().error).toBeUndefined()
    expect(chartId(chart.canvas)).toBe(chart.id)
    expect(chart.data.datasets[0].data).toEqual([7, 8, 9])
  })

  it('drops the pending evaluation when the editor is unmounted', async () => {
    const ran = vi.fn()
    const root = fixture()
    const { unmount, errors } = mountLive(root, `ran(); ${bar([1, 2, 3])}`, { ran })
    await chartIn(root)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    type(textareaIn(root), `ran(); ${bar([4, 5, 6])}`)
    unmount()
    await wait(500)
    expect(ran).toHaveBeenCalledTimes(1)
    expect(errors).toEqual([])
  })

  it('inserts two spaces on Tab and keeps the focus', async () => {
    const root = fixture()
    mountLive(root, 'a\nb')
    const textarea = textareaIn(root)
    textarea.focus()
    textarea.setSelectionRange(2, 2)

    await userEvent.keyboard('{Tab}')
    expect(textarea.value).toBe('a\n  b')
    expect(textarea.selectionStart).toBe(4)
    expect(document.activeElement).toBe(textarea)
  })
})
