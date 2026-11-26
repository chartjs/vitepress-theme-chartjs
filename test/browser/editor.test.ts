// The code editor around the textareas, on the source: one tab per named block, hidden code that still runs, and the
// busy indicator while an edit waits to be evaluated.
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bar, chartIn, fixture, mountLive } from './helpers.js'

afterEach(() => {
  vi.useRealTimers()
})

// Blocks out of order, and code outside them that the config block uses.
const blocks = (data: number[], title = 'Votes') => `
const values = ${JSON.stringify(data)}
// <block:config:1>
const config = {
  type: 'bar',
  data: { labels: ['Red', 'Blue', 'Yellow'], datasets: [{ label: 'Votes', data: values }] },
  options: { animation: false, plugins: { title: { display: true, text: ${JSON.stringify(title)} } } },
}
// </block:config>
// <block:setup:0>
const hidden = 'setup'
// </block:setup>
module.exports = { config }
`

function tabsIn(root: Element): HTMLButtonElement[] {
  return [...root.querySelectorAll<HTMLButtonElement>('.code-editor-tab')]
}

function textareasIn(root: Element): HTMLTextAreaElement[] {
  return [...root.querySelectorAll('textarea')]
}

/** The one textarea shown. */
function shownTextarea(root: Element): HTMLTextAreaElement {
  const shown = textareasIn(root).filter((textarea) => textarea.checkVisibility())
  expect(shown).toHaveLength(1)
  return shown[0]
}

function busyIn(root: Element): Element | null {
  return root.querySelector('[role="status"][aria-label="Evaluating"]')
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

describe('the code editor', () => {
  it('shows one tab per named block, ordered by number, and runs the hidden code', async () => {
    const root = fixture()
    mountLive(root, blocks([1, 2, 3]))
    const chart = await chartIn(root)

    expect(tabsIn(root).map((tab) => tab.textContent?.trim())).toEqual(['setup', 'config'])
    expect(chart.data.datasets[0].data).toEqual([1, 2, 3])
    // The first tab is shown; no textarea holds the code outside the blocks.
    expect(shownTextarea(root).value).toBe(`const hidden = 'setup'`)
    for (const textarea of textareasIn(root)) {
      expect(textarea.value).not.toContain('const values')
      expect(textarea.value).not.toContain('module.exports')
    }
  })

  it('shows the block of the tab the reader picks', async () => {
    const root = fixture()
    mountLive(root, blocks([1, 2, 3]))
    await chartIn(root)

    tabsIn(root)[1].click()
    await nextTick()
    expect(shownTextarea(root).value).toMatch(/^const config = \{/)
    expect(tabsIn(root).map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'true'])
  })

  it('shows one tab with the whole code when there are no blocks', async () => {
    const root = fixture()
    mountLive(root, bar([1, 2, 3]))
    await chartIn(root)
    expect(tabsIn(root).map((tab) => tab.textContent?.trim())).toEqual(['JS'])
    expect(shownTextarea(root).value).toBe(bar([1, 2, 3]))
  })

  it('shows code that does not parse in one tab, so the reader can fix it', async () => {
    const broken = `// <block:config:0>\nconst config = {\n// </block:config>`
    const root = fixture()
    const { editor } = mountLive(root, broken)
    await nextTick()
    expect(editor().error?.name).toBe('SyntaxError')
    expect(tabsIn(root).map((tab) => tab.textContent?.trim())).toEqual(['JS'])
    expect(shownTextarea(root).value).toBe(broken)
  })

  it('evaluates an edited block with the hidden code, 500 ms after the last keystroke', async () => {
    const root = fixture()
    const { editor } = mountLive(root, blocks([1, 2, 3]))
    const chart = await chartIn(root)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    tabsIn(root)[1].click()
    await nextTick()

    const textarea = shownTextarea(root)
    type(textarea, textarea.value.replace('data: values', 'data: values.map((v) => v * 10)'))
    await wait(499)
    expect(chart.data.datasets[0].data).toEqual([1, 2, 3])

    await wait(1)
    expect(editor().error).toBeUndefined()
    expect(chart.data.datasets[0].data).toEqual([10, 20, 30])
  })

  it('shows the busy indicator while typing, and hides it once the edit is evaluated', async () => {
    const root = fixture()
    mountLive(root, bar([1, 2, 3]))
    const chart = await chartIn(root)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    expect(busyIn(root)).toBeNull()

    const textarea = shownTextarea(root)
    type(textarea, bar([4, 5, 6]))
    await nextTick()
    expect(busyIn(root)).not.toBeNull()
    await wait(400)
    type(textarea, bar([7, 8, 9]))
    await wait(499)
    expect(busyIn(root)).not.toBeNull()
    expect(chart.data.datasets[0].data).toEqual([1, 2, 3])

    await wait(1)
    expect(busyIn(root)).toBeNull()
    expect(chart.data.datasets[0].data).toEqual([7, 8, 9])
  })

  it('replaces the tabs and the pending edit with a new code prop', async () => {
    const root = fixture()
    const { code } = mountLive(root, bar([1, 2, 3]))
    const chart = await chartIn(root)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    type(shownTextarea(root), bar([4, 5, 6]))
    await nextTick()
    code.value = blocks([7, 8, 9])
    await nextTick()
    expect(tabsIn(root).map((tab) => tab.textContent?.trim())).toEqual(['setup', 'config'])
    expect(busyIn(root)).toBeNull()
    expect(chart.data.datasets[0].data).toEqual([7, 8, 9])

    await wait(500)
    expect(chart.data.datasets[0].data).toEqual([7, 8, 9])
  })
})
