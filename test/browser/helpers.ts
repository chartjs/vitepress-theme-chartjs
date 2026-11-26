// What the component tests share: page fixtures, mounting with Vue's warnings and errors collected, and samples.
import { Chart, registerables, type ChartConfiguration } from 'chart.js'
import { createApp, h, nextTick, ref, type App, type Component } from 'vue'
import { afterEach, expect, vi } from 'vitest'
import { ChartEditor, chartEditorPlugin } from '../../src/index.js'
import { LiveEditor } from '../../src/runtime/index.js'
import type { ChartAction, ChartEditorOptions } from '../../src/types.js'

export interface Exposed {
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
export function fixture(html = ''): HTMLElement {
  const element = document.createElement('div')
  element.innerHTML = html
  document.body.append(element)
  cleanups.push(() => element.remove())
  return element
}

/** Mounts an app into `target`, with Vue's warnings and errors collected; it is unmounted after the test. */
export function mount(target: Element, component: Component, setup?: (app: App) => void) {
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
export function mountShell(target: Element, codes: string[], options?: ChartEditorOptions | false) {
  return mount(target, { render: () => codes.map((code) => h(ChartEditor, { code })) }, (app) => {
    if (options !== false) app.use(chartEditorPlugin, options)
  })
}

/** Mounts the live editor alone, with `code` as a ref that tests change, and its exposed state. */
export function mountLive(target: Element, initial: string, imports: Record<string, unknown> = {}) {
  const code = ref(initial)
  const editor = ref<Exposed>()
  const mounted = mount(target, { render: () => h(LiveEditor, { ref: editor, code: code.value, imports }) })
  return { ...mounted, code, editor: () => editor.value! }
}

/** The chart drawn on the canvas inside `root`, once there is one. */
export async function chartIn(root: Element): Promise<Chart> {
  return vi.waitFor(() => {
    const canvas = root.querySelector('canvas')
    const chart = canvas && Chart.getChart(canvas)
    if (!chart) throw new Error('no chart yet')
    return chart
  })
}

/** The id of the chart on `canvas`: a recreated chart has another. A failing assertion prints it, not the chart. */
export function chartId(canvas: HTMLCanvasElement): string | undefined {
  return Chart.getChart(canvas)?.id
}

/** The editor's tabs, found by their roles as assistive technology finds them. */
export function tabsIn(root: Element): HTMLButtonElement[] {
  return [...root.querySelectorAll<HTMLButtonElement>('[role="tablist"] [role="tab"]')]
}

/** The colour of each tab's underline: the shown one has it, the others are transparent. */
export function underlines(root: Element): string[] {
  return tabsIn(root).map((tab) => getComputedStyle(tab).borderBottomColor)
}

/** The underline of the shown tab, in the fallback colour, and of the others. */
export const underlined = 'rgb(48, 128, 208)'
export const plain = 'rgba(0, 0, 0, 0)'

/** The one textarea shown. */
export function shownTextarea(root: Element): HTMLTextAreaElement {
  const shown = [...root.querySelectorAll('textarea')].filter((textarea) => textarea.checkVisibility())
  expect(shown).toHaveLength(1)
  return shown[0]
}

/** Types `value` as the reader would, in one input event. */
export function type(textarea: HTMLTextAreaElement, value: string) {
  textarea.value = value
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Lets `ms` pass on the faked timers, then lets Vue render what they changed. */
export async function wait(ms: number) {
  vi.advanceTimersByTime(ms)
  await nextTick()
}

/** A bar sample, without animation. */
export function bar(data: number[], title = 'Votes') {
  return `
    const config = {
      type: 'bar',
      data: { labels: ['Red', 'Blue', 'Yellow'], datasets: [{ label: 'Votes', data: ${JSON.stringify(data)} }] },
      options: { animation: false, plugins: { title: { display: true, text: ${JSON.stringify(title)} } } },
    }
    module.exports = { config }
  `
}
