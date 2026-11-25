import { defineConfig } from 'vitepress'
import { chartEditor } from 'vitepress-theme-chartjs/markdown'

export default defineConfig({
  title: 'Example site',
  markdown: {
    config: (md) => {
      chartEditor(md)
    },
  },
})
