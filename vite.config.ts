import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'

// The runtime chunk's modules that are imported only for their side effects. package.json's `sideEffects`, which tells
// consumers that only the CSS has any, also applies to this build and would let it drop them. Rolldown's
// `treeshake.moduleSideEffects` does not override that field for the package's own files; a transform hook's result
// does.
const sideEffectModules = /[\\/]src[\\/]runtime[\\/]prism-(?:flags|restore)\.ts$/

const keepSideEffects: Plugin = {
  name: 'keep-side-effects',
  transform(code, id) {
    return sideEffectModules.test(id) ? { code, moduleSideEffects: true } : undefined
  },
}

// Library build: ES only, the peers left external, and every SFC style extracted into dist/style.css,
// so that the JavaScript imports no CSS. The type declarations come from vue-tsc (tsconfig.build.json).
export default defineConfig({
  plugins: [vue(), keepSideEffects],
  build: {
    lib: {
      entry: { index: 'src/index.ts', markdown: 'src/markdown.ts' },
      formats: ['es'],
      cssFileName: 'style',
    },
    rolldownOptions: {
      external: ['vue', 'vitepress', 'chart.js'],
      // Stable names: the lazily loaded runtime chunk is dist/runtime.js, not runtime-<hash>.js.
      // The minifier drops comments, the bundled code's license notices among them, unless told to keep those (D6).
      output: { chunkFileNames: '[name].js', comments: { legal: true } },
    },
  },
})
