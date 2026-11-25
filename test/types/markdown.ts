// Type fixture for the markdown entry, resolved through the package's exports to dist/markdown.d.ts.
import { chartEditor } from 'vitepress-theme-chartjs/markdown'
import type { MarkdownRenderer } from 'vitepress'

export function config(md: MarkdownRenderer): void {
  const result: void = chartEditor(md)
  return result
}

// @ts-expect-error the plugin takes VitePress's markdown-it instance
chartEditor({})
