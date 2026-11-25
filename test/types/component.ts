// Type fixture for the component and the installer, resolved through the package's exports to dist/*.d.ts.
import { ChartEditor, chartEditorPlugin } from 'vitepress-theme-chartjs'
import { createApp, h } from 'vue'

const app = createApp({})

app.use(chartEditorPlugin, { imports: () => Promise.resolve({ Utils: {} }) })
app.use(chartEditorPlugin, {})
app.use(chartEditorPlugin)

// @ts-expect-error imports returns a promise
app.use(chartEditorPlugin, { imports: () => ({ Utils: {} }) })

// @ts-expect-error no such option
app.use(chartEditorPlugin, { import: () => Promise.resolve({}) })

export const editor = h(ChartEditor, { code: 'module.exports = {}' })

// @ts-expect-error code is a string
export const wrongCode = h(ChartEditor, { code: 1 })
