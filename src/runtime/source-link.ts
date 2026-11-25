import type { ChartjsThemeConfig } from '../types.js'

/**
 * The GitHub address of a page's source file, from the theme's `source` and VitePress's `page.filePath` (the path of
 * the source, as VitePress's own edit link uses, so it stays right under rewrites). Empty path segments are skipped,
 * so an empty `dir` adds none, and each segment of the path is encoded; the branch is kept as it is, since it may
 * contain slashes. Without a repository or a branch there is no link.
 */
export function sourceLink(
  source: Partial<ChartjsThemeConfig['source']> | undefined,
  filePath: string
): string | undefined {
  if (!source?.repo || !source.branch) {
    return undefined
  }

  const path = [source.dir ?? '', filePath]
    .flatMap((part) => part.split('/'))
    .filter(Boolean)
    .map(encodeURIComponent)
  return `https://github.com/${source.repo}/blob/${source.branch}/${path.join('/')}`
}
