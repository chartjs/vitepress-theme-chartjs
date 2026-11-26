// The built runtime chunk loads Prism in manual mode and gives the `Prism` global back, so the page's own highlighted
// code blocks, and a Prism of the site's own, stay as they were. It runs on dist/ because the bundle decides the order
// in which the flags, Prism and the restore are evaluated; `pnpm test` builds first.
import { createApp, h } from 'vue'
import { expect, it } from 'vitest'

const scope = globalThis as { Prism?: unknown }

/** A fresh copy of the built chunk: each query string is a module of its own, evaluated again. */
async function loadRuntime(copy: string): Promise<typeof import('../../src/runtime/index.js')> {
  const runtime = new URL(`../../dist/runtime.js?${copy}`, import.meta.url).href
  return import(/* @vite-ignore */ runtime).catch((error: unknown) => {
    throw new Error(`Could not load ${runtime}; run pnpm build first.`, { cause: error })
  })
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

it("leaves the page's code blocks as they were, one frame after the runtime chunk loads", async () => {
  const block = document.createElement('div')
  block.className = 'language-js'
  block.innerHTML = '<pre><code><span class="x">a</span></code></pre>'
  document.body.append(block)
  const before = block.innerHTML

  expect('Prism' in scope).toBe(false)
  await loadRuntime('blocks')
  await nextFrame()
  await nextFrame()

  expect(block.innerHTML).toBe(before)
  // Prism was on the global only while it loaded.
  expect('Prism' in scope).toBe(false)
})

it("gives a site's own Prism back untouched, and still highlights the editor", async () => {
  const sitePrism = { custom: 1, languages: { x: 1 } }
  scope.Prism = sitePrism
  try {
    const { LiveEditor } = await loadRuntime('site-prism')
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
