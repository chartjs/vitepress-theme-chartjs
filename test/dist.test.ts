// Checks on the built package in dist/, as a site would load it. Run `pnpm build` first.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))

// Every JavaScript entry a site imports. Each piece that adds an entry appends it here.
const entries = ['index.js']

function distFiles(extension: string): string[] {
  return readdirSync(dist, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith(extension))
    .map((name) => name.replaceAll('\\', '/'))
}

function read(name: string): string {
  return readFileSync(new URL(name, pathToFileURL(dist)), 'utf8')
}

// Bundled third-party code keeps its license notice in a /*! ... */ comment, or one that says @license or @preserve.
function withoutLicenseComments(source: string): string {
  return source.replace(/\/\*(?:!|\*?[^*]*?@(?:license|preserve))[\s\S]*?\*\//g, '')
}

describe('dist', () => {
  it('has the entries', () => {
    expect(distFiles('.js')).toEqual(expect.arrayContaining(entries))
  })

  // A fresh Node process, so that nothing Vitest has loaded can stand in for the globals.
  it.each(entries)('%s imports in Node without touching window or document', (entry) => {
    const script = `
      for (const name of ['window', 'document']) {
        Object.defineProperty(globalThis, name, {
          configurable: true,
          get() { throw new Error(name + ' was accessed') },
        })
      }
      await import(${JSON.stringify(new URL(entry, pathToFileURL(dist)).href)})
    `
    expect(() =>
      execFileSync(process.execPath, ['--input-type=module', '--eval', script], { stdio: 'pipe' })
    ).not.toThrow()
  })

  it('imports no CSS from JavaScript', () => {
    for (const name of distFiles('.js')) {
      expect(read(name), name).not.toMatch(/["'`][^"'`\n]*\.css["'`]/)
    }
  })

  it('has no network API outside license comments', () => {
    const files = [...distFiles('.js'), ...distFiles('.css')]
    expect(files.length).toBeGreaterThan(0)
    const network = /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\b|@import|url\(\s*["']?https?:/
    for (const name of files) {
      expect(withoutLicenseComments(read(name)), name).not.toMatch(network)
    }
  })
})
