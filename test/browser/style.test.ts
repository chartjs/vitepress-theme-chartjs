// The built stylesheet, dist/style.css, as a site imports it; `pnpm test` builds it first. This file imports nothing
// from the source, whose styles Vite would add to the page, so the page here has no editor CSS until a test adds it.
import { afterEach, describe, expect, it } from 'vitest'

async function loadStyle(): Promise<string> {
  const url = new URL('../../dist/style.css?raw', import.meta.url).href
  const module = await import(/* @vite-ignore */ url).catch((error: unknown) => {
    throw new Error(`Could not load ${url}; run pnpm build first.`, { cause: error })
  })
  return module.default
}

const css = await loadStyle()
const added: Element[] = []

afterEach(() => {
  for (const element of added.splice(0)) element.remove()
})

function addToPage<T extends Element>(element: T): T {
  document.body.append(element)
  added.push(element)
  return element
}

function addStyle(): CSSStyleSheet {
  const style = document.createElement('style')
  style.textContent = css
  return addToPage(style).sheet!
}

function fixture(html: string): HTMLElement {
  const element = document.createElement('div')
  element.innerHTML = html
  return addToPage(element)
}

/** Every computed property of `element`, as a plain object that `toEqual` can compare. */
function computed(element: Element): Record<string, string> {
  const style = getComputedStyle(element)
  return Object.fromEntries([...style].map((name) => [name, style.getPropertyValue(name)]))
}

/** The selectors of every style rule in `rules`, inside media and other grouping rules too, keyframes left out. */
function selectors(rules: CSSRuleList): string[] {
  return [...rules].flatMap((rule) => {
    if (rule instanceof CSSStyleRule) return rule.selectorText.split(',').map((part) => part.trim())
    if (rule instanceof CSSKeyframesRule) return []
    if (rule instanceof CSSGroupingRule) return selectors(rule.cssRules)
    throw new Error(`unexpected rule: ${rule.cssText}`)
  })
}

const classes = ['text-muted', 'scrollable', 'text-error']

describe('dist/style.css', () => {
  it.each(classes)('leaves page elements with the class %s as they were', (name) => {
    const page = fixture(
      `<p class="${name}">Text</p><div class="chart-editor"><span class="${name}">Editor</span></div>`
    )
    const outside = page.querySelector('p')!
    const inside = page.querySelector('span')!
    const before = { outside: computed(outside), inside: computed(inside) }

    addStyle()
    expect(computed(outside)).toEqual(before.outside)
    // The stylesheet is loaded and does style the class inside an editor.
    expect(computed(inside)).not.toEqual(before.inside)
  })

  it('scopes every rule under .chart-editor, or to a component', () => {
    const found = selectors(addStyle().cssRules)
    expect(found.length).toBeGreaterThan(0)
    for (const selector of found) {
      // The class itself, not one that only starts with it, such as .chart-editor-placeholder.
      expect(selector).toMatch(/\.chart-editor(?![\w-])|\[data-v-[\w-]+\]/)
    }
  })

  // At Chart.js's default aspect ratio for bar and line charts.
  it('reserves the height of the chart in the server placeholder', () => {
    const page = fixture(
      '<div style="width: 480px"><div class="chart-editor chart-editor-placeholder" aria-busy="true"><div class="chart-view"></div></div></div>'
    )
    const view = page.querySelector<HTMLElement>('.chart-view')!
    expect(view.clientHeight).toBe(0)
    addStyle()
    expect(view.clientHeight).toBe(240)
  })
})
