// The example site in test/site, built with VitePress from the package as installed: a copy in its node_modules, as a
// published package would be, so that VitePress's server build leaves it external. `pnpm test:site` builds the package,
// installs the site and runs this file. After the build, Playwright's Chromium drives every page of the site, first on
// `vitepress preview` of the build, then on `vitepress dev`.
//
// The site's imports register a plugin on its Chart.js that writes, on each render, what a test needs onto the sample's
// `.chart-editor`: `data-renders` (a count), `data-chart-id`, `data-width`, `data-scale-x` and `data-values` (the first
// dataset's data). A sample whose chart is not the site's Chart.js gets none of them.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { createServer, type AddressInfo } from 'node:net'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const root = new URL('../', import.meta.url)
const site = new URL('site/', import.meta.url)
const installed = new URL('node_modules/vitepress-theme-chartjs/', site)
const temp = new URL('.vitepress/.temp/', site)
const vitepress = fileURLToPath(new URL('node_modules/vitepress/bin/vitepress.js', site))

// What themeConfig.source in test/site/.vitepress/config.ts says.
const source = 'https://github.com/chartjs/Chart.js/blob/master/docs'

/** The files under `dir`, as sorted paths relative to it. */
function files(dir: URL): string[] {
  const base = fileURLToPath(dir)
  return readdirSync(base, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(base, join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
    .sort()
}

/** The site's pages, as paths of their markdown files without `.md`. */
function pages(): string[] {
  return files(site)
    .filter((name) => name.endsWith('.md') && !name.startsWith('node_modules/') && !name.startsWith('.vitepress/'))
    .map((name) => name.slice(0, -'.md'.length))
}

/** The code of each `chart-editor` fence of a page, as written. */
function samples(name: string): string[] {
  const markdown = readFileSync(new URL(`${name}.md`, site), 'utf8').replaceAll('\r\n', '\n')
  return [...markdown.matchAll(/^```js chart-editor\n([\s\S]*?)^```$/gm)].map((match) => match[1])
}

beforeAll(() => {
  // VitePress deletes .vitepress/.temp, the server bundle, after a build unless DEBUG is set. DEBUG=1 enables no
  // debug namespace, so the build stays quiet.
  execFileSync(process.execPath, [vitepress, 'build'], {
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

  it('renders the placeholder into every page with samples', () => {
    for (const name of pages()) {
      const html = readFileSync(new URL(`.vitepress/dist/${name}.html`, site), 'utf8')
      const placeholders = html.match(/class="chart-editor chart-editor-placeholder"/g) ?? []
      expect(placeholders.length, name).toBe(samples(name).length)
    }
  })
})

// The servers are probed, started and reached on this host, so that `localhost` resolving to ::1 on one side and to
// 127.0.0.1 on the other cannot get in the way.
const host = '127.0.0.1'

/** A port nothing listens on now, so that the preview and the dev server, and parallel runs, do not collide. */
async function freePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, host, resolve))
  const { port } = server.address() as AddressInfo
  await new Promise((resolve) => server.close(resolve))
  return port
}

/** Starts `vitepress <command>` on a free port, and resolves once the site answers there. */
async function serve(command: 'preview' | 'dev'): Promise<{ origin: string; server: ChildProcess; output: string[] }> {
  const port = await freePort()
  // The preview listens on every address; the dev server is told which.
  const args =
    command === 'dev'
      ? ['dev', '--host', host, '--port', String(port), '--strictPort']
      : ['preview', '--port', String(port)]
  const server = spawn(process.execPath, [vitepress, ...args], { cwd: fileURLToPath(site), stdio: 'pipe' })
  const output: string[] = []
  server.stdout!.on('data', (chunk) => output.push(String(chunk)))
  server.stderr!.on('data', (chunk) => output.push(String(chunk)))
  const origin = `http://${host}:${port}`
  const deadline = Date.now() + 60_000
  for (;;) {
    if (server.exitCode !== null) throw new Error(`vitepress ${command} exited:\n${output.join('')}`)
    try {
      if ((await fetch(`${origin}/`)).ok) return { origin, server, output }
    } catch {
      // Not listening yet.
    }
    if (Date.now() > deadline) throw new Error(`vitepress ${command} did not answer:\n${output.join('')}`)
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

async function stop(server: ChildProcess | undefined) {
  if (!server || server.exitCode !== null) return
  const exited = new Promise((resolve) => server.once('exit', resolve))
  server.kill()
  await exited
}

let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

describe.each(['preview', 'dev'] as const)('the site on vitepress %s', (command) => {
  let origin: string
  let server: ChildProcess | undefined
  let context: BrowserContext
  // Requests to anywhere but the site, which are aborted; console errors and warnings; uncaught errors.
  const foreign: string[] = []
  const messages: string[] = []
  const errors: string[] = []

  beforeAll(async () => {
    ;({ origin, server } = await serve(command))
    context = await browser.newContext()
    await context.route(
      (url) => url.origin !== origin && url.protocol.startsWith('http'),
      (route) => {
        foreign.push(route.request().url())
        return route.abort()
      }
    )
  }, 90_000)

  afterAll(async () => {
    await context?.close()
    await stop(server)
  })

  async function open(name: string): Promise<Page> {
    const page = await context.newPage()
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') messages.push(`${name}: ${message.text()}`)
    })
    page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`))
    await page.goto(`${origin}/${name === 'index' ? '' : `${name}.html`}`)
    return page
  }

  /** Waits until every sample on the page has drawn, and returns their `data-*` reports. */
  async function drawn(page: Page, count: number): Promise<Record<string, string | undefined>[]> {
    await page.waitForFunction(
      (count) => {
        const editors = [...document.querySelectorAll<HTMLElement>('.chart-editor')]
        return editors.length === count && editors.every((editor) => editor.dataset.renders)
      },
      count,
      { timeout: 30_000 }
    )
    return page.$$eval('.chart-editor', (editors) => editors.map((editor) => ({ ...(editor as HTMLElement).dataset })))
  }

  it('draws every sample of every page, and links each to the page source', async () => {
    const names = pages()
    expect(names).toEqual(expect.arrayContaining(['index', 'samples/time', 'samples/legend', 'samples/progress']))
    for (const name of names.filter((name) => name !== 'samples/hidden')) {
      const page = await open(name)
      const count = samples(name).length
      expect(count, name).toBeGreaterThan(0)
      await drawn(page, count)
      expect(await page.locator('.chart-editor-failed, button[aria-label="Error"]').count(), name).toBe(0)
      const links = await page.$$eval('a[aria-label="View the source on GitHub"]', (links) =>
        links.map((link) => link.getAttribute('href'))
      )
      expect(links, name).toEqual(Array(count).fill(`${source}/${name}.md`))
      await page.close()
    }
  })

  it("gives samples the site's own Chart.js", async () => {
    const page = await open('index')
    await drawn(page, samples('index').length)
    expect(await page.textContent('#same-chart')).toBe('true')
    await page.close()
  })

  it('styles the editor with the stylesheet the theme imports', async () => {
    const page = await open('index')
    await drawn(page, samples('index').length)
    // The textarea is transparent over the highlighted layer, which shows the code.
    expect(await page.$eval('.chart-editor textarea', (textarea) => getComputedStyle(textarea).color)).toBe(
      'rgba(0, 0, 0, 0)'
    )
    expect(await page.$eval('.chart-editor .code-editor-views', (views) => getComputedStyle(views).height)).toBe(
      '360px'
    )
    await page.close()
  })

  it('draws a time-scale sample with the date adapter the site registers', async () => {
    const page = await open('samples/time')
    const [report] = await drawn(page, samples('samples/time').length)
    expect(report.scaleX).toBe('time')
    await page.close()
  })

  it('fills the legend container written in the page', async () => {
    const page = await open('samples/legend')
    await drawn(page, samples('samples/legend').length)
    await page.waitForFunction(() => document.querySelectorAll('#legend-container li').length === 3)
    await page.close()
  })

  it('moves the progress bar written in the page while the chart animates', async () => {
    const page = await open('samples/progress')
    // The dev server renders the page in the browser, after the load event.
    await page.waitForSelector('#animation-progress', { state: 'attached' })
    // Every value the bar takes, frame by frame, until the animation completes and sets it to 1.
    const values = await page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const progress = document.querySelector<HTMLProgressElement>('#animation-progress')!
          const seen = new Set<number>()
          const start = performance.now()
          const sample = () => {
            seen.add(progress.value)
            if (progress.value === 1 || performance.now() - start > 20_000) resolve([...seen])
            else requestAnimationFrame(sample)
          }
          sample()
        })
    )
    expect(values).toContain(1)
    expect(values.filter((value) => value > 0 && value < 1).length).toBeGreaterThanOrEqual(2)
    await page.close()
  })

  it('draws samples in hidden panels at size once they are shown', async () => {
    const page = await open('samples/hidden')
    // Each panel holds one sample: `display: none`, the `hidden` attribute, a closed details element.
    await page.waitForFunction(() => document.querySelectorAll('.chart-editor canvas').length === 3)
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('#panel-style')!.style.display = ''
      document.querySelector<HTMLElement>('#panel-hidden')!.hidden = false
      document.querySelector<HTMLDetailsElement>('#panel-details')!.open = true
    })
    const reports = await drawn(page, 3)
    const widths = await page.$$eval('.chart-editor .chart-view', (views) => views.map((view) => view.clientWidth))
    expect(widths.every((width) => width > 0)).toBe(true)
    expect(reports.map((report) => Number(report.width))).toEqual(widths)
    await page.close()
  })

  it('shows the code of a sample with special characters as written, and runs it', async () => {
    const page = await open('samples/verbatim')
    await drawn(page, samples('samples/verbatim').length)
    const shown = await page.$$eval('.chart-editor textarea', (textareas) =>
      textareas.map((textarea) => (textarea as HTMLTextAreaElement).value)
    )
    expect(shown).toEqual(samples('samples/verbatim'))
    await page.close()
  })

  it('redraws the same chart after an edit', async () => {
    const page = await open('index')
    const [before] = await drawn(page, samples('index').length)
    const textarea = page.locator('.chart-editor').first().locator('textarea').first()
    const code = await textarea.inputValue()
    expect(code).toContain('[12, 19, 3]')
    await textarea.fill(code.replace('[12, 19, 3]', '[4, 5, 6]'))
    await page.waitForFunction(
      () => document.querySelector<HTMLElement>('.chart-editor')!.dataset.values === '[4,5,6]',
      undefined,
      { timeout: 10_000 }
    )
    const after = await page.$eval('.chart-editor', (editor) => ({ ...(editor as HTMLElement).dataset }))
    expect(after.chartId).toBe(before.chartId)
    expect(Number(after.renders)).toBeGreaterThan(Number(before.renders))
    await page.close()
  })

  // After every page has been opened and used. A hydration mismatch, which only a server-rendered page can have (the
  // preview; `vitepress dev` renders in the browser alone), is a console error too.
  it('logs no Vue warning, console error or warning, and no uncaught error, on any page', () => {
    expect(messages).toEqual([])
    expect(errors).toEqual([])
  })

  // Last: the control's aborted request logs a console error of its own.
  it('makes no request outside the site, which a request to elsewhere would show', async () => {
    expect(foreign).toEqual([])
    const page = await open('index')
    await page.evaluate(() => fetch('https://example.com/probe').catch(() => undefined))
    expect(foreign).toEqual(['https://example.com/probe'])
    await page.close()
  })

  if (command === 'preview') {
    // The control of the console check above for hydration: a page whose served HTML differs from what the client
    // renders reports it.
    it('reports a hydration mismatch as a console error', async () => {
      const page = await browser.newPage()
      const logged: string[] = []
      page.on('console', (message) => void (message.type() === 'error' && logged.push(message.text())))
      await page.route(`${origin}/`, async (route) => {
        const response = await route.fetch()
        await route.fulfill({ response, body: (await response.text()).replace('<h1', '<h2').replace('</h1>', '</h2>') })
      })
      await page.goto(`${origin}/`)
      await expect.poll(() => logged).toContain('Hydration completed but contains mismatches.')
      await page.close()
    })

    it('reserves the chart space and shows the text of a page without scripts', async () => {
      const page = await browser.newPage({ javaScriptEnabled: false })
      await page.goto(`${origin}/`)
      expect(await page.textContent('h1')).toContain('Bar chart')
      const box = await page.locator('.chart-editor-placeholder .chart-view').first().boundingBox()
      expect(box!.width).toBeGreaterThan(0)
      expect(box!.height).toBeCloseTo(box!.width / 2, 0)
      await page.close()
    })
  }
})
