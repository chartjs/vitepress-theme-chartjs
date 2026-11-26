// Checks on the built package in dist/, as a site would load it. `pnpm test` builds it first.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = new URL('../', import.meta.url)
const dist = new URL('dist/', root)

// Every JavaScript entry a site imports. Each piece that adds an entry appends it here.
const entries = ['index.js', 'markdown.js']

// What a browser has and Node does not; reading any of them while importing an entry throws.
const browserGlobals = ['window', 'document', 'self', 'location', 'localStorage']

function distFiles(extension: string): string[] {
  return readdirSync(fileURLToPath(dist), { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith(extension))
    .map((name) => name.replaceAll('\\', '/'))
}

function read(name: string): string {
  return readFileSync(new URL(name, dist), 'utf8')
}

// Bundled third-party code keeps its license notice in a /*! ... */ comment, or one that says @license or @preserve.
function withoutLicenseComments(source: string): string {
  return source.replace(/\/\*(?:!|\*?[^*]*?@(?:license|preserve))[\s\S]*?\*\//g, '')
}

const networkPatterns = [
  /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\b/,
  /@import/i,
  // url(https://…), url("//…"), any case
  /url\(\s*["']?(?:https?:)?\/\//i,
  // import('https://…'), import '//…', from "https://…"
  /\b(?:import|from)\s*\(?\s*["'`](?:https?:)?\/\//i,
]

describe('dist', () => {
  it('has the entries', () => {
    expect(distFiles('.js')).toEqual(expect.arrayContaining(entries))
  })

  // A fresh Node process, so that nothing Vitest has loaded can stand in for the globals. The peers load first, as a
  // server build would already have loaded them: Vue's runtime-dom feature-tests `typeof window` when it loads, and
  // the getters are there to catch this package's code, not Vue's.
  it.each(entries)('%s imports in Node without touching browser globals', (entry) => {
    const script = `
      await import('vue')
      for (const name of ${JSON.stringify(browserGlobals)}) {
        Object.defineProperty(globalThis, name, {
          configurable: true,
          get() { throw new Error(name + ' was accessed') },
        })
      }
      await import(${JSON.stringify(new URL(entry, dist).href)})
    `
    expect(() =>
      execFileSync(process.execPath, ['--input-type=module', '--eval', script], { stdio: 'pipe' })
    ).not.toThrow()
  })

  // A site's configuration loads this entry in Node, before Vite and without Vue.
  it('markdown.js imports nothing and exports chartEditor', async () => {
    expect(read('markdown.js')).not.toMatch(/\bimport\s*[\s{*"'`(]|\bexport\s*[^;]*\bfrom\b/)
    const markdown = await import(new URL('markdown.js', dist).href)
    expect(Object.keys(markdown)).toEqual(['chartEditor'])
    expect(markdown.chartEditor).toBeTypeOf('function')
  })

  it('imports no CSS from JavaScript', () => {
    for (const name of distFiles('.js')) {
      expect(read(name), name).not.toMatch(/["'`][^"'`\n]*\.css(?:\?[^"'`\n]*)?["'`]/)
    }
  })

  // A site imports the stylesheet itself, as vitepress-theme-chartjs/style.css; nothing loads it for the site.
  it('exports style.css, and no JavaScript refers to it', () => {
    const { exports } = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
    expect(exports['./style.css']).toEqual({ types: './dist/style.d.ts', default: './dist/style.css' })
    expect(existsSync(new URL('style.css', dist))).toBe(true)
    // Its declaration comes from src/style.ts, which nothing builds as JavaScript.
    expect(existsSync(new URL('style.js', dist))).toBe(false)
    for (const name of distFiles('.js')) {
      expect(read(name), name).not.toMatch(/style\.css/)
    }
  })

  // A site may set any of the variables, and needs none of them.
  it('gives every --chartjs-* variable a fallback', () => {
    const css = read('style.css')
    expect(css).toMatch(/var\(\s*--chartjs-/)
    expect(css).not.toMatch(/var\(\s*--chartjs-[\w-]+\s*\)/)
  })

  // Bundled code keeps its license notice (D6); the minifier drops it unless told to keep legal comments.
  it("keeps Prism's license notice in the runtime chunk", () => {
    expect(read('runtime.js')).toMatch(/Prism: Lightweight, robust, elegant syntax highlighting\s*\*\s*\* @license MIT/)
  })

  it('has no network API outside license comments', () => {
    const files = [...distFiles('.js'), ...distFiles('.css')]
    expect(files.length).toBeGreaterThan(0)
    for (const name of files) {
      const source = withoutLicenseComments(read(name))
      for (const pattern of networkPatterns) {
        expect(source, name).not.toMatch(pattern)
      }
    }
  })

  // Without a `types` condition TypeScript falls back to the .d.ts beside the JavaScript, so the type fixtures
  // cannot notice a missing one; this test does. The stylesheet's declaration, style.d.ts, lets TypeScript 6 resolve its
  // side-effect import.
  it('names the declarations of every export but package.json', () => {
    const { exports } = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
    for (const [path, target] of Object.entries<string | Record<string, string>>(exports)) {
      if (typeof target === 'string') continue
      expect(target.types, path).toBe(target.default.replace(/\.(?:js|css)$/, '.d.ts'))
      expect(existsSync(new URL(target.types, root)), target.types).toBe(true)
    }
  })

  // NodeNext resolution needs the extension, and an unresolved import in a .d.ts turns its names into `any` without
  // an error (consumers use skipLibCheck), so the type fixtures only notice it for names they use. `./X.js` resolves
  // to `X.d.ts`. An SFC's `./X.vue` resolves only to `X.d.vue.ts`, not to the `X.vue.d.ts` that vue-tsc writes, which
  // is why the entries export no SFC. The walk starts at the declarations the exports name and follows what they
  // import: the runtime's declarations (`./LiveEditor.vue` among them) are emitted too, but no public type reaches them.
  it('declares relative imports in a form NodeNext resolves', () => {
    const { exports } = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
    const specifier = /(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.\.?\/[^"']*)["']/g
    const pending = Object.values<string | Record<string, string>>(exports)
      .filter((target) => typeof target !== 'string')
      .map((target) => new URL(target.types, root))
    const seen = new Set<string>()
    for (let file = pending.pop(); file; file = pending.pop()) {
      if (seen.has(file.href)) continue
      seen.add(file.href)
      const name = file.href.slice(dist.href.length)
      for (const [, path] of readFileSync(file, 'utf8').matchAll(specifier)) {
        const target = new URL(path, file)
        const resolved = path.endsWith('.js')
          ? new URL(target.href.replace(/\.js$/, '.d.ts'))
          : new URL(target.href.replace(/\.vue$/, '.d.vue.ts'))
        expect(path.endsWith('.js') || path.endsWith('.vue'), `${name}: '${path}' has no .js or .vue extension`).toBe(
          true
        )
        expect(existsSync(resolved), `${name}: '${path}' needs ${fileURLToPath(resolved)}`).toBe(true)
        pending.push(resolved)
      }
    }
    expect([...seen].length).toBeGreaterThan(1)
  })

  // The static import graph of the main entry is what a server build loads. Rolldown may split shared code (such as
  // Vue's SFC export helper) into chunks that index.js imports statically, so the walk follows them.
  it('index.js and its static imports import only vue', () => {
    const staticImport = /\b(?:import|export)\s*(?:[\w$*{}\s,]+\s*from\s*)?["']([^"']+)["']/g
    const bare = new Set<string>()
    const pending = ['index.js']
    const seen = new Set<string>()
    for (let name = pending.pop(); name; name = pending.pop()) {
      if (seen.has(name)) continue
      seen.add(name)
      for (const [, path] of read(name).matchAll(staticImport)) {
        if (path.startsWith('.')) pending.push(new URL(path, new URL(name, dist)).href.slice(dist.href.length))
        else bare.add(path)
      }
    }
    expect([...bare]).toEqual(['vue'])
    expect([...seen]).not.toContain('runtime.js')
  })

  it('loads the runtime chunk lazily, and only it imports chart.js, vitepress, acorn or Prism', () => {
    expect(read('index.js')).toMatch(/\bimport\(\s*["']\.\/runtime\.js["']\s*\)/)
    expect(read('runtime.js')).toMatch(/\bfrom\s*["']chart\.js["']/)
    const browserOnly = /["'](?:chart\.js|vitepress)["']|\bacorn\b|\bPrism\b/
    for (const name of distFiles('.js').filter((name) => name !== 'runtime.js')) {
      expect(read(name), name).not.toMatch(browserOnly)
    }
  })
})
