import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { chartEditorPlugin } from 'vitepress-theme-chartjs'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(chartEditorPlugin)
  },
} satisfies Theme
