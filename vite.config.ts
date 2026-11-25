import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Library build: ES only, the peers left external, and every SFC style extracted into dist/style.css,
// so that the JavaScript imports no CSS. The type declarations come from vue-tsc (tsconfig.build.json).
export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: { index: 'src/index.ts', markdown: 'src/markdown.ts' },
      formats: ['es'],
      cssFileName: 'style',
    },
    rolldownOptions: {
      external: ['vue', 'vitepress', 'chart.js'],
      // Stable names: the lazily loaded runtime chunk is dist/runtime.js, not runtime-<hash>.js.
      output: { chunkFileNames: '[name].js' },
    },
  },
})
