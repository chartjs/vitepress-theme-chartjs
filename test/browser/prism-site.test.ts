// A site's own `Prism` global survives the built runtime chunk, which keeps its own instance for the editor.
import { createApp, h } from 'vue'
import { expect, it } from 'vitest'
import { loadRuntime } from './load-runtime.js'

const scope = globalThis as { Prism?: unknown }

it("gives a site's own Prism back untouched, and still highlights the editor", async () => {
  const sitePrism = { custom: 1, languages: { x: 1 } }
  scope.Prism = sitePrism
  try {
    const { LiveEditor } = await loadRuntime()
    expect(scope.Prism).toBe(sitePrism)
    expect(sitePrism).toEqual({ custom: 1, languages: { x: 1 } })

    const root = document.createElement('div')
    document.body.append(root)
    const app = createApp({ render: () => h(LiveEditor, { code: 'const a = 1', imports: {} }) })
    app.mount(root)
    expect(root.querySelector('.token.keyword')?.textContent).toBe('const')
    app.unmount()
    root.remove()
  } finally {
    delete scope.Prism
  }
})
