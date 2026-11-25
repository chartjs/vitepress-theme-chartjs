// The chart's lifecycle in a real browser, on the source: the shell as a site installs it, and the live editor alone
// where a test needs its exposed state.
import { Chart, registerables, type ChartConfiguration } from 'chart.js'
import { createApp, h, nextTick, ref, type App, type Component } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChartEditor, chartEditorPlugin } from '../../src/index.js'
import { LiveEditor } from '../../src/runtime/index.js'
import type { ChartAction, ChartEditorOptions } from '../../src/types.js'

interface Exposed {
  config: ChartConfiguration | undefined
  actions: ChartAction[] | undefined
  error: Error | undefined
  messages: string[]
}

// The package registers nothing on Chart.js; a site does, as Chart.js's docs do in their imports.
Chart.register(...registerables)

const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
})

/** A fresh element in the page, `html` inside it, removed after the test. */
function fixture(html = ''): HTMLElement {
  const element = document.createElement('div')
  element.innerHTML = html
  document.body.append(element)
  cleanups.push(() => element.remove())
  return element
}

/** Mounts an app into `target`, with Vue's warnings and errors collected; it is unmounted after the test. */
function mount(target: Element, component: Component, setup?: (app: App) => void) {
  const warnings: string[] = []
  const errors: unknown[] = []
  const app = createApp(component)
  app.config.warnHandler = (message) => void warnings.push(message)
  app.config.errorHandler = (error) => void errors.push(error)
  setup?.(app)
  app.mount(target)
  let mounted = true
  const unmount = () => {
    if (mounted) app.unmount()
    mounted = false
  }
  cleanups.push(unmount)
  return { app, warnings, errors, unmount }
}

/** Mounts one `<ChartEditor>` per code, as a site does: the installer with `options`, if given. */
function mountShell(target: Element, codes: string[], options?: ChartEditorOptions | false) {
  return mount(target, { render: () => codes.map((code) => h(ChartEditor, { code })) }, (app) => {
    if (options !== false) app.use(chartEditorPlugin, options)
  })
}

/** Mounts the live editor alone, with `code` as a ref that tests change, and its exposed state. */
function mountLive(target: Element, initial: string, imports: Record<string, unknown> = {}) {
  const code = ref(initial)
  const editor = ref<Exposed>()
  const mounted = mount(target, { render: () => h(LiveEditor, { ref: editor, code: code.value, imports }) })
  return { ...mounted, code, editor: () => editor.value! }
}

/** The chart drawn on the canvas inside `root`, once there is one. */
async function chartIn(root: Element): Promise<Chart> {
  return vi.waitFor(() => {
    const canvas = root.querySelector('canvas')
    const chart = canvas && Chart.getChart(canvas)
    if (!chart) throw new Error('no chart yet')
    return chart
  })
}

/** The id of the chart on `canvas`: a recreated chart has another. A failing assertion prints it, not the chart. */
function chartId(canvas: HTMLCanvasElement): string | undefined {
  return Chart.getChart(canvas)?.id
}

function bar(data: number[], title = 'Votes') {
  return `
    const config = {
      type: 'bar',
      data: { labels: ['Red', 'Blue', 'Yellow'], datasets: [{ label: 'Votes', data: ${JSON.stringify(data)} }] },
      options: { animation: false, plugins: { title: { display: true, text: ${JSON.stringify(title)} } } },
    }
    module.exports = { config }
  `
}

describe('the chart', () => {
  it('is created after mount, in the page, from the exported config', async () => {
    let exported: ChartConfiguration | undefined
    const root = fixture()
    const { warnings, errors } = mountShell(root, [`${bar([1, 2, 3])}; keep(config)`], {
      imports: async () => ({ keep: (config: ChartConfiguration) => (exported = config) }),
    })
    expect(root.querySelector('.chart-editor-placeholder')).not.toBeNull()

    const chart = await chartIn(root)
    expect(chart.canvas.ownerDocument).toBe(document)
    expect(chart.canvas.parentElement?.matches('.chart-editor > .chart-view')).toBe(true)
    expect(exported).toBeDefined()
    expect(chart.data).toBe(exported!.data)
    expect(root.querySelector('.chart-editor-placeholder')).toBeNull()
    expect(warnings).toEqual([])
    expect(errors).toEqual([])
  })

  it('is updated, not recreated, by a later evaluation', async () => {
    const root = fixture()
    const { code } = mountLive(root, bar([1, 2, 3], 'First'))
    const chart = await chartIn(root)

    code.value = bar([4, 5, 6], 'Second')
    await nextTick()
    expect(chartId(chart.canvas)).toBe(chart.id)
    expect(chart.data.datasets[0].data).toEqual([4, 5, 6])
    expect(chart.options.plugins?.title?.text).toBe('Second')
  })

  it('is destroyed on unmount', async () => {
    const root = fixture()
    const { unmount } = mountShell(root, [bar([1, 2, 3])])
    const chart = await chartIn(root)

    unmount()
    expect(chartId(chart.canvas)).toBeUndefined()
  })

  const panels: [string, string, (panel: HTMLElement) => void][] = [
    ['display: none', '<div class="panel" style="display: none">', (panel) => void (panel.style.display = '')],
    ['the hidden attribute', '<div class="panel" hidden>', (panel) => panel.removeAttribute('hidden')],
    [
      'a closed details element',
      '<details class="panel"><summary>Open</summary>',
      (panel) => void ((panel as HTMLDetailsElement).open = true),
    ],
  ]

  it.each(panels)('inside %s draws at its container size once revealed', async (_, open, reveal) => {
    const close = open.startsWith('<details') ? '</details>' : '</div>'
    const page = fixture(`<div style="width: 480px">${open}<div class="mount"></div>${close}</div>`)
    const panel = page.querySelector<HTMLElement>('.panel')!
    mountShell(page.querySelector('.mount')!, [bar([1, 2, 3])])
    const chart = await chartIn(page)
    const view = page.querySelector<HTMLElement>('.chart-view')!
    // Created while hidden: a closed <details> lays its content out at size but does not paint it.
    expect(view.checkVisibility()).toBe(false)

    reveal(panel)
    await vi.waitFor(() => {
      expect(view.clientWidth).toBe(480)
      expect(chart.width).toBe(480)
      // A bar chart keeps its aspect ratio of 2.
      expect(chart.height).toBe(240)
    })
  })

  it('lets a sample find an element written beside it', async () => {
    let found: unknown
    const page = fixture('<div id="beside-legend"></div><div class="mount"></div>')
    mountShell(page.querySelector('.mount')!, [`found(document.getElementById('beside-legend')); ${bar([1])}`], {
      imports: async () => ({ found: (element: unknown) => (found = element) }),
    })
    await chartIn(page)
    expect(found).toBe(page.querySelector('#beside-legend'))
  })

  it('is drawn in the page itself, with no iframe or shadow root', async () => {
    const root = fixture()
    mountShell(root, [bar([1, 2, 3])])
    await chartIn(root)
    expect(document.querySelector('iframe')).toBeNull()
    expect([root, ...root.querySelectorAll('*')].filter((element) => element.shadowRoot)).toEqual([])
  })
})

describe('the installer', () => {
  it('loads the imports once for two editors', async () => {
    const imports = vi.fn(async () => ({ values: [1, 2, 3] }))
    const root = fixture()
    const sample = bar([]).replace('[]', 'values')
    mountShell(root, [sample, sample], { imports })
    const charts = await vi.waitFor(() => {
      const drawn = [...root.querySelectorAll('canvas')].map((canvas) => Chart.getChart(canvas))
      expect(drawn).toHaveLength(2)
      expect(drawn.every(Boolean)).toBe(true)
      return drawn as Chart[]
    })
    expect(charts.map((chart) => chart.data.datasets[0].data)).toEqual([
      [1, 2, 3],
      [1, 2, 3],
    ])
    expect(imports).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['the installer without options', undefined],
    ['the shell without the installer', false],
  ] as const)('runs a sample that uses Chart and console with %s', async (_, options) => {
    const sample = `console.log('Chart', Chart.version); ${bar([1, 2, 3])}`
    const root = fixture()
    const { warnings, errors } = mountShell(root, [sample], options)
    const chart = await chartIn(root)
    expect(chart).toBeInstanceOf(Chart)
    expect(warnings).toEqual([])
    expect(errors).toEqual([])
  })

  it('shows a rejected import in the page, in place of the placeholder', async () => {
    const root = fixture()
    mountShell(root, [bar([1])], { imports: () => Promise.reject(new Error('no adapter')) })
    const failed = await vi.waitFor(() => {
      const element = root.querySelector('div.chart-editor.chart-editor-failed[role=alert]')
      expect(element).not.toBeNull()
      return element!
    })
    expect(failed.querySelector('p.chart-editor-failure')?.textContent).toBe('no adapter')
    expect(root.querySelector('.chart-editor-placeholder')).toBeNull()
    expect(root.querySelector('canvas')).toBeNull()
  })
})

describe('the evaluation state', () => {
  it('keeps the chart and the config when a later evaluation throws', async () => {
    const root = fixture()
    const { code, editor } = mountLive(root, bar([1, 2, 3]))
    const chart = await chartIn(root)
    const config = editor().config

    code.value = 'throw new Error("broken edit")'
    await nextTick()
    expect(editor().error?.message).toBe('broken edit')
    expect(editor().config).toBe(config)
    expect(chartId(chart.canvas)).toBe(chart.id)
    expect(chart.data.datasets[0].data).toEqual([1, 2, 3])
  })

  it('keeps the chart and shows the message when a later config has an unknown chart type', async () => {
    const root = fixture()
    const { code, editor } = mountLive(root, bar([1, 2, 3]))
    const chart = await chartIn(root)

    code.value = bar([4, 5, 6]).replace("type: 'bar'", "type: 'nope'")
    await nextTick()
    expect(editor().error?.message).toMatch(/"nope" is not a registered controller/)
    expect(chartId(chart.canvas)).toBe(chart.id)
    // The previous chart still draws, so a resize does not throw the same error again.
    expect(chart.data.datasets[0].data).toEqual([1, 2, 3])
    expect(() => chart.update()).not.toThrow()

    code.value = bar([7, 8, 9])
    await nextTick()
    expect(editor().error).toBeUndefined()
    expect(chartId(chart.canvas)).toBe(chart.id)
    expect(chart.data.datasets[0].data).toEqual([7, 8, 9])
  })

  it('shows the message when the first config has an unknown chart type, and draws the next one', async () => {
    const root = fixture()
    const { code, editor } = mountLive(root, bar([1, 2, 3]).replace("type: 'bar'", "type: 'nope'"))
    await nextTick()
    expect(editor().error?.message).toMatch(/"nope" is not a registered controller/)
    expect(chartId(root.querySelector('canvas')!)).toBeUndefined()

    code.value = bar([4, 5, 6])
    const chart = await chartIn(root)
    expect(editor().error).toBeUndefined()
    expect(chart.data.datasets[0].data).toEqual([4, 5, 6])
  })

  it('reads the actions from the first evaluation that succeeds only', async () => {
    const actions = (name: string) => `${bar([1])}; module.exports.actions = [{ name: '${name}', handler() {} }]`
    const root = fixture()
    const { code, editor } = mountLive(root, actions('Randomize'))
    await chartIn(root)

    code.value = actions('Other')
    await nextTick()
    expect(editor().actions?.map((action) => action.name)).toEqual(['Randomize'])
  })

  it('keeps the last 50 log lines across evaluations, newest first', async () => {
    const logs = (prefix: string) => `for (let i = 0; i < 30; i++) console.log('${prefix}' + i); ${bar([1])}`
    const root = fixture()
    const { code, editor } = mountLive(root, logs('a'))
    await chartIn(root)

    code.value = logs('b')
    await nextTick()
    const expected = [
      ...Array.from({ length: 30 }, (_, i) => `b${29 - i}`),
      ...Array.from({ length: 20 }, (_, i) => `a${29 - i}`),
    ]
    expect(editor().messages).toEqual(expected)
  })
})
