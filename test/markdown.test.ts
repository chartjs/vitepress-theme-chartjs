// The fence plugin, run the way a VitePress site runs it: VitePress's own markdown renderer, the page wrapped into an
// SFC template as VitePress does, compiled with Vue's SFC compiler and rendered with Vue's server renderer.
import { fileURLToPath } from 'node:url'
import { createMarkdownRenderer, disposeMdItInstance, type MarkdownRenderer } from 'vitepress'
import * as Vue from 'vue'
import { compileTemplate, parse } from 'vue/compiler-sfc'
import { renderToString } from 'vue/server-renderer'
import { afterAll, describe, expect, it } from 'vitest'
import { chartEditor } from '../src/markdown.js'

const srcDir = fileURLToPath(new URL('.', import.meta.url))

// createMarkdownRenderer keeps one instance per process, so each renderer is made after disposing the previous one.
async function renderer(withPlugin: boolean): Promise<MarkdownRenderer> {
  disposeMdItInstance()
  return createMarkdownRenderer(srcDir, withPlugin ? { config: (md) => chartEditor(md) } : {})
}

afterAll(() => disposeMdItInstance())

function renderMarkdown(md: MarkdownRenderer, src: string): string {
  const env = { path: `${srcDir}page.md`, relativePath: 'page.md', cleanUrls: false, includes: [], localeIndex: 'root' }
  return md.render(src, env)
}

// What VitePress's markdownToVue does with the page's HTML, then what @vitejs/plugin-vue does with the SFC.
async function renderPage(html: string): Promise<string[]> {
  const { descriptor, errors } = parse(`<template><div>${html}</div></template>`, { filename: 'page.md' })
  expect(errors).toEqual([])
  const compiled = compileTemplate({
    source: descriptor.template!.content,
    filename: 'page.md',
    id: 'page',
    compilerOptions: { mode: 'function' },
  })
  expect(compiled.errors).toEqual([])

  const received: string[] = []
  const ChartEditor = Vue.defineComponent({
    props: { code: { type: String, required: true } },
    setup(props) {
      received.push(props.code)
      return () => Vue.h('pre', JSON.stringify(props.code))
    },
  })
  const render = new Function('Vue', compiled.code)(Vue)
  await renderToString(Vue.createSSRApp({ components: { ChartEditor }, render }))
  return received
}

function fence(info: string, code: string): string {
  return `\`\`\`${info}\n${code}\`\`\`\n`
}

describe('chartEditor', () => {
  const samples: Record<string, string> = {
    backticks: 'const s = `a ${1 + 1} b`\n',
    'single and double quotes': `const a = 'it\\'s'\nconst b = "say \\"hi\\""\n`,
    mustaches: "const t = '{{ config }}'\n",
    'a closing script tag': "const s = '</script><script>alert(1)</script>'\n",
    backslashes: "const re = /\\d+\\.\\d*/\nconst p = 'C:\\\\path\\\\to'\n",
    'an &amp; entity': "const s = 'a &amp; b'\n",
    'an &#39; entity': "const s = 'it&#39;s'\n",
    'a named entity without a semicolon': "const s = '&copy &lt'\n",
    'U+2028 and U+2029': "const s = 'a\u2028b\u2029c'\n",
    emoji: "const s = '📊 chart ✓'\n",
  }

  it.each(Object.entries(samples))('passes code with %s verbatim', async (_, code) => {
    const md = await renderer(true)
    expect(await renderPage(renderMarkdown(md, fence('js chart-editor', code)))).toEqual([code])
  })

  it('takes over a fence with further words after the marker', async () => {
    const md = await renderer(true)
    expect(await renderPage(renderMarkdown(md, fence('js chart-editor extra', 'const a = 1\n')))).toEqual([
      'const a = 1\n',
    ])
  })

  it.each(['js', 'chart-editor', 'js chart-editors', 'ts {1}'])(
    'renders a %s fence as without the plugin',
    async (info) => {
      const page = `# Title\n\n${fence(info, "const a = '&amp;' // `x`\n")}`
      const without = renderMarkdown(await renderer(false), page)
      const withPlugin = renderMarkdown(await renderer(true), page)
      expect(withPlugin).toBe(without)
      expect(withPlugin).not.toContain('ChartEditor')
    }
  )
})
