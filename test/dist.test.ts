// Checks on the built package in dist/, as a site would load it. `pnpm test` builds it first.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = new URL('../', import.meta.url)
const dist = new URL('dist/', root)

// Every JavaScript entry a site imports. Each piece that adds an entry appends it here.
const entries = ['index.js']

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

  // A fresh Node process, so that nothing Vitest has loaded can stand in for the globals.
  it.each(entries)('%s imports in Node without touching browser globals', (entry) => {
    const script = `
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

  it('imports no CSS from JavaScript', () => {
    for (const name of distFiles('.js')) {
      expect(read(name), name).not.toMatch(/["'`][^"'`\n]*\.css(?:\?[^"'`\n]*)?["'`]/)
    }
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
  // cannot notice a missing one; this test does.
  it('names the declarations of every JavaScript export', () => {
    const { exports } = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
    for (const [path, target] of Object.entries<string | Record<string, string>>(exports)) {
      if (typeof target === 'string') continue
      expect(target.types, path).toBe(target.default.replace(/\.js$/, '.d.ts'))
      expect(existsSync(new URL(target.types, root)), target.types).toBe(true)
    }
  })

  // NodeNext resolution needs the extension, and an unresolved import in a .d.ts turns its names into `any` without
  // an error (consumers use skipLibCheck), so the type fixtures only notice it for names they use. `./X.js` resolves
  // to `X.d.ts`. An SFC's `./X.vue` resolves only to `X.d.vue.ts`, not to the `X.vue.d.ts` that vue-tsc writes.
  it('declares relative imports in a form NodeNext resolves', () => {
    const specifier = /(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.\.?\/[^"']*)["']/g
    for (const name of distFiles('.d.ts')) {
      for (const [, path] of read(name).matchAll(specifier)) {
        const target = new URL(path, new URL(name, dist))
        const resolved = path.endsWith('.js')
          ? new URL(target.href.replace(/\.js$/, '.d.ts'))
          : new URL(target.href.replace(/\.vue$/, '.d.vue.ts'))
        expect(path.endsWith('.js') || path.endsWith('.vue'), `${name}: '${path}' has no .js or .vue extension`).toBe(
          true
        )
        expect(existsSync(resolved), `${name}: '${path}' needs ${fileURLToPath(resolved)}`).toBe(true)
      }
    }
  })
})
