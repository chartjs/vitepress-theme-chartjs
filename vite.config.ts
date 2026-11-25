import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Library build: ES only, the peers left external, and every SFC style extracted into dist/style.css,
// so that the JavaScript imports no CSS. The type declarations come from vue-tsc (tsconfig.build.json).
export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: { index: 'src/index.ts' },
      formats: ['es'],
      cssFileName: 'style',
    },
    rolldownOptions: {
      external: ['vue', 'vitepress', 'chart.js'],
    },
  },
})
