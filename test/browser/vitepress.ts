// Stands in for `vitepress` in the browser tests (see vitest.config.ts): the components get a page and a theme
// configuration that tests can set, instead of the data of a VitePress app.
import { ref } from 'vue'
import type { ChartjsThemeConfig } from '../../src/types.js'

export const page = ref({ filePath: '' })
export const theme = ref<Partial<ChartjsThemeConfig>>({})

export function useData() {
  return { page, theme }
}
