// Type fixture for the package root, resolved through the package's exports to dist/*.d.ts.
// Each piece that ships a public name from the root adds it here.
import type { ChartAction, ChartEditorOptions, ChartjsThemeConfig } from 'vitepress-theme-chartjs'

export const themeConfig: ChartjsThemeConfig = {
  nav: [{ text: 'Samples', link: '/samples/' }],
  source: { repo: 'chartjs/Chart.js', branch: 'master', dir: 'docs' },
}

// skipLibCheck (VitePress's own declarations do not check) also hides an unresolved import in our .d.ts, which
// would turn its type into any. This and the check in the action fail unless DefaultTheme.Config and Chart are real.
// @ts-expect-error nav is DefaultTheme.Config's
export const wrongNav: ChartjsThemeConfig = { nav: 1, source: { repo: 'chartjs/Chart.js', branch: 'master', dir: '' } }

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
    // @ts-expect-error the handler gets a Chart
    chart.noSuchMethod()
  },
}

// @ts-expect-error an action has a name
export const unnamed: ChartAction = { handler() {} }
