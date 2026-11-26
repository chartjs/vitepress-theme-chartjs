// The site's imports, as Chart.js's docs have them: the site registers what its samples draw with, and the samples see
// `Utils`. `chart.js` is the site's own (the alias in config.ts), so `Utils.Chart` is the Chart.js the site set up.
import { Chart, registerables } from 'chart.js'
import './adapter.js'

Chart.register(...registerables)

// For test/site.test.ts: each render writes what the test checks onto the sample's editor. A chart drawn by another
// Chart.js than this one has not got the plugin, and reports nothing.
Chart.register({
  id: 'site-report',
  afterRender(chart) {
    const editor = chart.canvas.closest<HTMLElement>('.chart-editor')
    if (!editor) return
    editor.dataset.renders = String(Number(editor.dataset.renders ?? 0) + 1)
    editor.dataset.chartId = String(chart.id)
    editor.dataset.width = String(chart.width)
    editor.dataset.scaleX = chart.scales.x?.type ?? ''
    editor.dataset.values = JSON.stringify(chart.data.datasets[0]?.data ?? [])
  },
})

export const Utils = { Chart }
