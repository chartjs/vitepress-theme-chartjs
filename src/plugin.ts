import type { Plugin } from 'vue'
import ChartEditor, { loadImportsKey } from './ChartEditor.js'
import type { ChartEditorOptions } from './types.js'

/**
 * `app.use(chartEditorPlugin, options)` registers `<ChartEditor>` globally, the name the markdown plugin emits. The
 * site's `imports()` runs once per app, when the first editor mounts; without it, samples see only `Chart` and
 * `console`.
 */
export const chartEditorPlugin: Plugin<[options?: ChartEditorOptions]> = {
  install(app, options = {}) {
    let loaded: Promise<Record<string, unknown>> | undefined
    const loadImports = () => (loaded ??= options.imports ? options.imports() : Promise.resolve({}))

    app.provide(loadImportsKey, loadImports)
    app.component('ChartEditor', ChartEditor)
  },
}
