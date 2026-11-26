import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { chartEditorPlugin } from 'vitepress-theme-chartjs'
import 'vitepress-theme-chartjs/style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(chartEditorPlugin, { imports: () => import('../chart-imports') })
  },
} satisfies Theme
