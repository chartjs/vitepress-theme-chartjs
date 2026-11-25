import type { Chart } from 'chart.js'
import type { DefaultTheme } from 'vitepress'

/** Options for `app.use(chartEditorPlugin, options)`. */
export interface ChartEditorOptions {
  /**
   * Loads the names that samples see as locals, beside `Chart`. Called once, in the browser only, before the first
   * sample runs.
   */
  imports?: () => Promise<Record<string, unknown>>
}

/** VitePress's default theme configuration, plus where the pages' sources live for the editor's source link. */
export interface ChartjsThemeConfig extends DefaultTheme.Config {
  source: {
    /** The GitHub repository, as `owner/name`. */
    repo: string
    branch: string
    /** The folder of the VitePress site inside the repository; empty for its root. */
    dir: string
  }
}

/** A button under a sample's chart, from the `actions` a sample exports. */
export interface ChartAction {
  name: string
  handler: (chart: Chart) => void
}
