// Type fixture for the package root, resolved through the package's exports to dist/*.d.ts.
// Each piece that ships a public name from the root adds it here.
import type { ChartAction, ChartEditorOptions, ChartjsThemeConfig } from 'vitepress-theme-chartjs'

export const themeConfig: ChartjsThemeConfig = {
  nav: [{ text: 'Samples', link: '/samples/' }],
  source: { repo: 'chartjs/Chart.js', branch: 'master', dir: 'docs' },
}

// @ts-expect-error source is required
export const withoutSource: ChartjsThemeConfig = { nav: [] }

// @ts-expect-error source needs repo, branch and dir
export const partialSource: ChartjsThemeConfig = { source: { repo: 'chartjs/Chart.js' } }

export const options: ChartEditorOptions = { imports: () => Promise.resolve({ Utils: {} }) }

export const noOptions: ChartEditorOptions = {}

// @ts-expect-error imports returns a promise
export const syncImports: ChartEditorOptions = { imports: () => ({ Utils: {} }) }

export const action: ChartAction = {
  name: 'Randomize',
  handler(chart) {
    chart.update()
  },
}

// @ts-expect-error an action has a name
export const unnamed: ChartAction = { handler() {} }
