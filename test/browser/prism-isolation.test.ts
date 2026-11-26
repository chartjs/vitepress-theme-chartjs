// The built runtime chunk loads Prism in manual mode and takes its `Prism` global back, so the page's own highlighted
// code blocks stay as the site rendered them. It runs on dist/ because the bundle decides the order in which the flags,
// Prism and the restore are evaluated.
import { expect, it } from 'vitest'
import { loadRuntime } from './load-runtime.js'

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

it("leaves the page's code blocks as they were, one frame after the runtime chunk loads", async () => {
  const block = document.createElement('div')
  block.className = 'language-js'
  block.innerHTML = '<pre><code><span class="x">a</span></code></pre>'
  document.body.append(block)
  const before = block.innerHTML

  expect('Prism' in globalThis).toBe(false)
  await loadRuntime()
  await nextFrame()
  await nextFrame()

  expect(block.innerHTML).toBe(before)
  // Prism was on the global only while it loaded.
  expect('Prism' in globalThis).toBe(false)
})
