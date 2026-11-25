// The example site in test/site, built with VitePress from the package as installed: a copy in its node_modules, as a
// published package would be, so that VitePress's server build leaves it external. `pnpm test:site` builds the package,
// installs the site and runs this file.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

const root = new URL('../', import.meta.url)
const site = new URL('site/', import.meta.url)
const installed = new URL('node_modules/vitepress-theme-chartjs/', site)
const temp = new URL('.vitepress/.temp/', site)

/** The files under `dir`, as sorted paths relative to it. */
function files(dir: URL): string[] {
  const base = fileURLToPath(dir)
  return readdirSync(base, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(base, join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
    .sort()
}

beforeAll(() => {
  // VitePress deletes .vitepress/.temp, the server bundle, after a build unless DEBUG is set. DEBUG=1 enables no
  // debug namespace, so the build stays quiet.
  execFileSync(process.execPath, [fileURLToPath(new URL('node_modules/vitepress/bin/vitepress.js', site)), 'build'], {
    cwd: fileURLToPath(site),
    env: { ...process.env, DEBUG: '1' },
    stdio: 'pipe',
  })
}, 120_000)

describe('example site', () => {
  // The site's copy is hard links that `pnpm build` leaves behind when it replaces dist, until the next install.
  it('uses a copy of the package that matches dist', () => {
    const built = files(new URL('dist/', root))
    expect(files(new URL('dist/', installed))).toEqual(built)
    for (const name of built) {
      expect(readFileSync(new URL(`dist/${name}`, installed)), name).toEqual(
        readFileSync(new URL(`dist/${name}`, root))
      )
    }
  })

  it('leaves the package external in the server build', () => {
    const server = files(temp).filter((name) => name.endsWith('.js'))
    const importing = server.filter((name) =>
      /\bfrom\s*["']vitepress-theme-chartjs["']/.test(readFileSync(new URL(name, temp), 'utf8'))
    )
    expect(importing).not.toEqual([])
  })

  it('renders the placeholder into the page', () => {
    const html = readFileSync(new URL('.vitepress/dist/index.html', site), 'utf8')
    expect(html).toContain('class="chart-editor chart-editor-placeholder"')
  })
})
