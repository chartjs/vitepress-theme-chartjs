// Editing in the code textarea, on the source: re-evaluation 500 ms after the last keystroke, the Tab key and
// highlighting.
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { server, userEvent } from 'vitest/browser'
import { bar, chartId, chartIn, fixture, mountLive } from './helpers.js'

afterEach(() => {
  vi.useRealTimers()
})

function textareaIn(root: Element): HTMLTextAreaElement {
  const textarea = root.querySelector('textarea')
  expect(textarea).not.toBeNull()
  return textarea!
}

/** The highlighted layer under the textarea. */
function layerIn(root: Element): HTMLElement {
  return root.querySelector<HTMLElement>('pre.code-layer')!
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

  it('shows markup in the code as text', async () => {
    const code = `const a = '<img src=x onerror="window.injected = true">'\nconst b = '</code></pre><script>window.injected = true</script>'`
    const root = fixture()
    mountLive(root, code)
    const layer = root.querySelector('pre')!
    expect(layer.textContent).toBe(`${code}\n`)
    expect(layer.querySelectorAll(':not(span)')).toHaveLength(1)
    expect(layer.querySelector('img, script')).toBeNull()
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

  it('replaces pending edits with a new code prop, evaluated at once', async () => {
    const root = fixture()
    const { code } = mountLive(root, bar([1, 2, 3]))
    const chart = await chartIn(root)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const textarea = textareaIn(root)

    type(textarea, bar([4, 5, 6]))
    code.value = bar([7, 8, 9])
    await nextTick()
    expect(chart.data.datasets[0].data).toEqual([7, 8, 9])
    expect(textarea.value).toBe(bar([7, 8, 9]))

    await wait(500)
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

  it('highlights what is typed, before it is evaluated', async () => {
    const root = fixture()
    mountLive(root, 'a')
    type(textareaIn(root), 'let b')
    await nextTick()
    expect(layerIn(root).textContent).toBe('let b\n')
  })

  it.each([
    ['at the caret', 'a\nb', 2, 2, 'a\n  b'],
    ['over a selection', 'abcd', 1, 3, 'a  d'],
  ])('inserts two spaces on Tab %s and keeps the focus', async (_, code, start, end, expected) => {
    const root = fixture()
    mountLive(root, code)
    const textarea = textareaIn(root)
    textarea.focus()
    textarea.setSelectionRange(start, end)

    await userEvent.keyboard('{Tab}')
    expect(textarea.value).toBe(expected)
    expect(textarea.selectionStart).toBe(start + 2)
    expect(textarea.selectionEnd).toBe(start + 2)
    expect(document.activeElement).toBe(textarea)
    await nextTick()
    expect(layerIn(root).textContent).toBe(`${expected}\n`)
  })

  it('lets undo take back the spaces Tab inserted, and the typing before', async () => {
    const root = fixture()
    mountLive(root, '')
    const textarea = textareaIn(root)
    textarea.focus()
    const undo = server.platform === 'darwin' ? '{Meta>}z{/Meta}' : '{Control>}z{/Control}'

    await userEvent.keyboard('ab')
    await userEvent.keyboard('{Tab}')
    expect(textarea.value).toBe('ab  ')
    await userEvent.keyboard(undo)
    expect(textarea.value).toBe('ab')
    await userEvent.keyboard(undo)
    expect(textarea.value).not.toBe('ab')
  })

  it('lets Shift+Tab move the focus out, inserting nothing', async () => {
    const page = fixture('<button>Before</button><div class="mount"></div>')
    mountLive(page.querySelector('.mount')!, 'a')
    const textarea = textareaIn(page)
    textarea.focus()

    await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
    expect(textarea.value).toBe('a')
    // Backwards out of the textarea: to the button, or in Firefox first to the scrolling editor, which it makes focusable.
    expect(document.activeElement).not.toBe(textarea)
    expect(textarea.compareDocumentPosition(document.activeElement!) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
  })

  it('shows where the keyboard focus is', async () => {
    const root = fixture()
    mountLive(root, 'a')
    const editor = root.querySelector<HTMLElement>('.code-textarea')!
    const outline = () => getComputedStyle(editor).outlineStyle

    expect(outline()).toBe('none')
    textareaIn(root).focus()
    expect(outline()).toBe('solid')
  })

  it('lines the textarea up with the highlighted layer, and scrolls to a long line', async () => {
    const code = [`const long = '${'x'.repeat(400)}'`, ...Array.from({ length: 40 }, (_, i) => `const n${i} = ${i}`)]
    const root = fixture()
    mountLive(root, code.join('\n'))
    const textarea = textareaIn(root)
    const layer = layerIn(root)
    const editor = root.querySelector<HTMLElement>('.code-textarea')!

    // Code is shown as written, pasted tabs at two columns, and the reader cannot resize the textarea out of step.
    expect(getComputedStyle(layer).whiteSpace).toBe('pre')
    expect(getComputedStyle(layer).tabSize).toBe('2')
    expect(getComputedStyle(textarea).resize).toBe('none')

    const box = (element: Element) => element.getBoundingClientRect()
    expect(box(textarea).left).toBe(box(layer).left)
    expect(box(textarea).top).toBe(box(layer).top)
    for (const name of [
      'font',
      'letter-spacing',
      'line-height',
      'white-space',
      'tab-size',
      'padding',
      'border-width',
    ]) {
      expect(getComputedStyle(textarea).getPropertyValue(name), name).toBe(
        getComputedStyle(layer).getPropertyValue(name)
      )
    }
    // The textarea is at least as large as the text, so it never scrolls on its own, out of step with the layer.
    expect(textarea.clientWidth).toBeGreaterThanOrEqual(layer.scrollWidth)
    expect(textarea.clientHeight).toBeGreaterThanOrEqual(layer.scrollHeight)
    // The editor scrolls both together, to the end of the long line.
    expect(editor.scrollWidth).toBeGreaterThan(editor.clientWidth)
    expect(editor.scrollWidth).toBeGreaterThanOrEqual(layer.scrollWidth)
  })
})
