import { fileURLToPath } from 'node:url'
import { defineConfigWithTheme } from 'vitepress'
import type { ChartjsThemeConfig } from 'vitepress-theme-chartjs'
import { chartEditor } from 'vitepress-theme-chartjs/markdown'

// Set up as Chart.js's docs are: `chart.js` aliased to a file of the site's own, and, so that the dev server does not
// bundle a second copy of that file into the packages that import it, the package and the date adapter excluded from
// dependency pre-bundling.
export default defineConfigWithTheme<ChartjsThemeConfig>({
  title: 'Example site',
  markdown: {
    config: (md) => {
      chartEditor(md)
    },
  },
  themeConfig: {
    source: { repo: 'chartjs/Chart.js', branch: 'master', dir: 'docs' },
  },
  vite: {
    resolve: {
      alias: [{ find: /^chart\.js$/, replacement: fileURLToPath(new URL('./chart.js', import.meta.url)) }],
    },
    optimizeDeps: {
      exclude: ['vitepress-theme-chartjs', 'chartjs-adapter-luxon'],
    },
  },
})
