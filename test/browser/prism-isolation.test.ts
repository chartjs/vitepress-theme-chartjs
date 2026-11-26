// The built runtime chunk loads Prism in manual mode, so the page's own highlighted code blocks stay as the site
// rendered them. It runs on dist/ because the bundle decides the order in which the flags and Prism are evaluated;
// `pnpm test` builds first.
import { expect, it } from 'vitest'

it("leaves the page's code blocks as they were, one frame after the runtime chunk loads", async () => {
  const block = document.createElement('div')
  block.className = 'language-js'
  block.innerHTML = '<pre><code><span class="x">a</span></code></pre>'
  document.body.append(block)
  const before = block.innerHTML

  const runtime = new URL('../../dist/runtime.js', import.meta.url).href
  await import(/* @vite-ignore */ runtime).catch((error: unknown) => {
    throw new Error(`Could not load ${runtime}; run pnpm build first.`, { cause: error })
  })
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))

  expect(block.innerHTML).toBe(before)
})
