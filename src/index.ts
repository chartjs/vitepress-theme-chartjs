// Relative imports carry `.js`: the emitted declarations keep the specifier, and Node16/NodeNext resolution needs it.
// This entry imports only `vue` and exports no SFC; everything browser-only is in the lazily loaded runtime chunk.
export { default as ChartEditor } from './ChartEditor.js'
export { chartEditorPlugin } from './plugin.js'
export type { ChartAction, ChartEditorOptions, ChartjsThemeConfig } from './types.js'
