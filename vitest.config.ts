import { playwright } from '@vitest/browser-playwright'
import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'node',
            environment: 'node',
            include: ['test/**/*.test.ts'],
            // The example site needs the site installed; `pnpm test:site` runs it with vitest.site.config.ts.
            // The browser tests are the browser project's.
            exclude: ['test/site.test.ts', 'test/site/**', 'test/browser/**'],
          },
        },
        {
          // The components from the source, in real browsers, which need Playwright's browsers installed
          // (`pnpm exec playwright install chromium firefox`).
          extends: true,
          resolve: {
            // VitePress's `useData` needs a VitePress app around the component; tests mount without one.
            alias: { vitepress: fileURLToPath(new URL('test/browser/vitepress.ts', import.meta.url)) },
          },
          test: {
            name: 'browser',
            include: ['test/browser/**/*.test.ts'],
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: [{ browser: 'chromium' }, { browser: 'firefox' }],
            },
          },
        },
      ],
    },
  })
)
