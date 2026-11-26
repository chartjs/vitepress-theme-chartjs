// What the editor shows beside the code, on the source: the error indicator, the Output tab, the action buttons and
// the source link.
import { Chart } from 'chart.js'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { bar, chartId, chartIn, fixture, mountLive } from './helpers.js'
import { page, theme } from './vitepress.js'

afterEach(() => {
  vi.useRealTimers()
  page.value = { filePath: '' }
  theme.value = {}
})

function tabsIn(root: Element): HTMLButtonElement[] {
  return [...root.querySelectorAll<HTMLButtonElement>('[role="tablist"] [role="tab"]')]
}

function tabNames(root: Element): string[] {
  return tabsIn(root).map((tab) => tab.textContent!.trim())
}

/** The one textarea shown. */
function shownTextarea(root: Element): HTMLTextAreaElement {
  const shown = [...root.querySelectorAll('textarea')].filter((textarea) => textarea.checkVisibility())
  expect(shown).toHaveLength(1)
  return shown[0]
}

/** Types `value` as the reader would, in one input event. */
function type(textarea: HTMLTextAreaElement, value: string) {
  textarea.value = value
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Types `value` into the first tab, shown or not, and lets the 500 ms pass, so that the edit is evaluated. */
async function edit(root: Element, value: string) {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  type(root.querySelector('textarea')!, value)
  vi.advanceTimersByTime(500)
  vi.useRealTimers()
  await nextTick()
}

function errorButton(root: Element): HTMLButtonElement | null {
  return root.querySelector<HTMLButtonElement>('button[aria-label="Error"]')
}

function tooltipOf(button: HTMLButtonElement): HTMLElement {
  const id = button.getAttribute('aria-describedby')
  expect(id).toBeTruthy()
  const tooltip = document.getElementById(id!)
  expect(tooltip?.getAttribute('role')).toBe('tooltip')
  return tooltip!
}

describe('the error indicator', () => {
  it('keeps the chart after a failing edit, and shows the message on hover and on focus', async () => {
    const root = fixture()
    mountLive(root, bar([1, 2, 3]))
    const chart = await chartIn(root)
    expect(errorButton(root)).toBeNull()

    await edit(root, `${bar([4, 5, 6])}; throw new Error('broken edit')`)
    expect(chartId(chart.canvas)).toBe(chart.id)
    expect(chart.data.datasets[0].data).toEqual([1, 2, 3])
    const button = errorButton(root)!
    expect(button).not.toBeNull()
    expect(button.type).toBe('button')
    const tooltip = tooltipOf(button)
    expect(tooltip.textContent).toContain('broken edit')
    expect(tooltip.checkVisibility()).toBe(false)

    await userEvent.hover(button)
    await vi.waitFor(() => expect(tooltip.checkVisibility()).toBe(true))
    await userEvent.unhover(button)
    await vi.waitFor(() => expect(tooltip.checkVisibility()).toBe(false))

    button.focus()
    expect(document.activeElement).toBe(button)
    await vi.waitFor(() => expect(tooltip.checkVisibility()).toBe(true))
  })

  it('shows the message of a config Chart.js rejects', async () => {
    const root = fixture()
    mountLive(root, bar([1, 2, 3]))
    const chart = await chartIn(root)

    await edit(root, bar([4, 5, 6]).replace("type: 'bar'", "type: 'nope'"))
    expect(chartId(chart.canvas)).toBe(chart.id)
    expect(tooltipOf(errorButton(root)!).textContent).toMatch(/"nope" is not a registered controller/)
  })

  it('disappears after an edit that succeeds', async () => {
    const root = fixture()
    mountLive(root, bar([1, 2, 3]))
    const chart = await chartIn(root)

    await edit(root, 'throw new Error("broken edit")')
    expect(errorButton(root)).not.toBeNull()
    await edit(root, bar([7, 8, 9]))
    expect(errorButton(root)).toBeNull()
    expect(chart.data.datasets[0].data).toEqual([7, 8, 9])
  })
})

describe('the Output tab', () => {
  const logging = (prefix: string, count: number, output = 'true') =>
    `for (let i = 0; i < ${count}; i++) console.log('${prefix}' + i)\n${bar([1])}\nmodule.exports.output = ${output}`

  function outputLines(root: Element): string[] {
    const panel = root.querySelector('.code-output')!
    expect(panel).not.toBeNull()
    return [...panel.querySelectorAll('.code-output-line')].map((line) => line.textContent!)
  }

  it('is not there when the sample exports no output', async () => {
    const root = fixture()
    mountLive(root, `console.log('a'); ${bar([1])}`)
    await chartIn(root)
    expect(tabNames(root)).toEqual(['JS'])
    expect(root.querySelector('.code-output')).toBeNull()
  })

  it('shows the last 50 lines, newest first', async () => {
    const root = fixture()
    mountLive(root, logging('a', 60))
    await chartIn(root)
    expect(tabNames(root)).toEqual(['JS', 'Output'])
    expect(outputLines(root)).toEqual(Array.from({ length: 50 }, (_, i) => `a${59 - i}`))
  })

  it('keeps the lines across edits, including those of an edit that threw', async () => {
    const root = fixture()
    mountLive(root, logging('a', 30))
    await chartIn(root)

    await edit(root, `console.log('failed'); throw new Error('x')`)
    await edit(root, logging('b', 30))
    expect(outputLines(root)).toEqual([
      ...Array.from({ length: 30 }, (_, i) => `b${29 - i}`),
      'failed',
      ...Array.from({ length: 19 }, (_, i) => `a${29 - i}`),
    ])
  })

  it('shows a string output as the placeholder while nothing is logged', async () => {
    const root = fixture()
    mountLive(root, `${bar([1])}\nmodule.exports.output = 'Click a bar'`)
    await chartIn(root)
    expect(root.querySelector('.code-output')?.textContent?.trim()).toBe('Click a bar')
    expect(outputLines(root)).toEqual([])
  })

  it('comes and goes with an edit, keeping the edited code', async () => {
    const root = fixture()
    mountLive(root, logging('a', 1, 'false'))
    await chartIn(root)
    expect(tabNames(root)).toEqual(['JS'])

    // Parsing the code again would give back the sample as it was loaded, without the edit.
    const withOutput = logging('a', 1, 'true')
    await edit(root, withOutput)
    expect(tabNames(root)).toEqual(['JS', 'Output'])
    expect(shownTextarea(root).value).toBe(withOutput)

    // Removed while it is the tab shown: the code tab is shown again, with the edit.
    tabsIn(root)[1].click()
    await nextTick()
    expect(root.querySelector('.code-output')?.checkVisibility()).toBe(true)
    const without = logging('b', 1, 'false')
    await edit(root, without)
    expect(tabNames(root)).toEqual(['JS'])
    expect(tabsIn(root)[0].getAttribute('aria-selected')).toBe('true')
    expect(shownTextarea(root).value).toBe(without)
  })
})

describe('the action buttons', () => {
  // Each action logs its name and the chart it got; the second also changes the data of the config it closes over.
  const withActions = (data: number[], names: string[]) => `${bar(data)}
    module.exports.actions = ${JSON.stringify(names)}.map((name, i) => ({
      name,
      handler(chart) {
        pressed(name, chart)
        if (i === 1) { config.data.datasets[0].data = [9, 9, 9]; chart.update() }
      },
    }))`

  function buttonsIn(root: Element): HTMLButtonElement[] {
    return [...root.querySelectorAll<HTMLButtonElement>('.chart-actions button')]
  }

  it('shows one button per action, in order, and runs the handler with the chart', async () => {
    const pressed = vi.fn()
    const root = fixture()
    mountLive(root, withActions([1, 2, 3], ['Randomize', 'Nines']), { pressed })
    const chart = await chartIn(root)

    const buttons = buttonsIn(root)
    expect(buttons.map((button) => button.textContent!.trim())).toEqual(['Randomize', 'Nines'])
    expect(buttons.map((button) => button.type)).toEqual(['button', 'button'])
    buttons[1].click()
    expect(pressed).toHaveBeenCalledExactlyOnceWith('Nines', chart)
    expect(chart).toBe(Chart.getChart(root.querySelector('canvas')!))
    // The exported config is the chart's: the change shows.
    expect(chart.data.datasets[0].data).toEqual([9, 9, 9])
  })

  it('keeps the buttons of the first evaluation after an edit that exports others', async () => {
    const pressed = vi.fn()
    const root = fixture()
    mountLive(root, withActions([1, 2, 3], ['Randomize', 'Nines']), { pressed })
    const chart = await chartIn(root)

    await edit(root, withActions([4, 5, 6], ['Other']))
    expect(chart.data.datasets[0].data).toEqual([4, 5, 6])
    const buttons = buttonsIn(root)
    expect(buttons.map((button) => button.textContent!.trim())).toEqual(['Randomize', 'Nines'])

    // The actions close over the first evaluation's config, whose data the chart no longer holds.
    buttons[1].click()
    expect(pressed).toHaveBeenCalledExactlyOnceWith('Nines', chart)
    expect(chart.data.datasets[0].data).toEqual([4, 5, 6])
  })

  it('takes the buttons from the first edit that succeeds when the first run throws', async () => {
    const root = fixture()
    mountLive(root, 'throw new Error("first")', { pressed: () => {} })
    await nextTick()
    expect(buttonsIn(root)).toEqual([])

    await edit(root, withActions([1, 2, 3], ['Randomize']))
    await chartIn(root)
    expect(buttonsIn(root).map((button) => button.textContent!.trim())).toEqual(['Randomize'])

    await edit(root, withActions([1, 2, 3], ['Other']))
    expect(buttonsIn(root).map((button) => button.textContent!.trim())).toEqual(['Randomize'])
  })
})

describe('the source link', () => {
  function linkIn(root: Element): HTMLAnchorElement | null {
    return root.querySelector<HTMLAnchorElement>('a[aria-label="View the source on GitHub"]')
  }

  it('links to the page source on GitHub, in a new tab', async () => {
    theme.value = { source: { repo: 'chartjs/Chart.js', branch: 'master', dir: 'docs' } }
    page.value = { filePath: 'samples/bar/vertical.md' }
    const root = fixture()
    mountLive(root, bar([1]))
    await chartIn(root)

    const link = linkIn(root)!
    expect(link).not.toBeNull()
    expect(link.href).toBe('https://github.com/chartjs/Chart.js/blob/master/docs/samples/bar/vertical.md')
    expect(link.target).toBe('_blank')
    expect(link.rel.split(' ').sort()).toEqual(['noopener', 'noreferrer'])
  })

  it('is absent without a source, and the editor still works', async () => {
    page.value = { filePath: 'samples/bar/vertical.md' }
    const root = fixture()
    mountLive(root, bar([1, 2, 3]))
    const chart = await chartIn(root)
    expect(linkIn(root)).toBeNull()
    expect(root.querySelector('a')).toBeNull()
    expect(chart.data.datasets[0].data).toEqual([1, 2, 3])
  })
})
