// The markdown entry. A site's configuration loads it in Node, so it imports types only and nothing at run time.
import type { MarkdownRenderer } from 'vitepress'

const CHART_EDITOR = / chart-editor( |$)/

/**
 * Renders fences whose info string contains ` chart-editor` (such as ```js chart-editor) as `<ChartEditor>`, the
 * component that `chartEditorPlugin` registers. Every other fence goes to the fence rule the site already has.
 *
 * The code goes into a single-quoted attribute as a JSON string literal. JSON.stringify escapes backslashes, double
 * quotes and line breaks. Vue's template compiler decodes HTML entities in directive expressions, so `&` is escaped
 * before `'`: otherwise code that contains `&amp;` or `&#39;` would reach the component decoded.
 */
export function chartEditor(md: MarkdownRenderer): void {
  const fence = md.renderer.rules.fence!

  md.renderer.rules.fence = (...args) => {
    const [tokens, idx] = args
    const token = tokens[idx]

    if (!CHART_EDITOR.test(token.info.trim())) {
      return fence(...args)
    }

    const code = JSON.stringify(token.content).replace(/&/g, '&amp;').replace(/'/g, '&#39;')
    return `<ChartEditor :code='${code}' />`
  }
}
