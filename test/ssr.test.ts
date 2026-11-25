// Server rendering of an app with the installer, on the built package, as a VitePress server build loads it when it
// leaves the package external. `pnpm test` builds it first.
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

// The types come from the sources, the code from dist.
const { chartEditorPlugin } = (await import(
  new URL('../dist/index.js', import.meta.url).href
)) as typeof import('../src/index.js')

declare global {
  var ran: boolean | undefined
}

afterEach(() => {
  delete globalThis.ran
})

describe('server rendering', () => {
  it('renders a placeholder for the global ChartEditor, without loading the imports or running the code', async () => {
    const imports = vi.fn(() => Promise.resolve({}))
    // Not imported: the page uses the name the installer registers, as the fence plugin's output does.
    const app = createSSRApp({ template: `<ChartEditor code="globalThis.ran = true" />` })
    app.use(chartEditorPlugin, { imports })
    app.config.warnHandler = (message) => {
      throw new Error(message)
    }

    const html = await renderToString(app)

    expect(html).toContain('class="chart-editor chart-editor-placeholder"')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('class="chart-view"')
    expect(imports).not.toHaveBeenCalled()
    expect(globalThis.ran).toBeUndefined()
  })

  it('renders the placeholder when the installer gets no options', async () => {
    const app = createSSRApp({ template: `<ChartEditor code="globalThis.ran = true" />` })
    app.use(chartEditorPlugin)

    expect(await renderToString(app)).toContain('class="chart-editor chart-editor-placeholder"')
    expect(globalThis.ran).toBeUndefined()
  })
})
