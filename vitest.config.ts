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
            exclude: ['test/site.test.ts', 'test/site/**'],
          },
        },
      ],
    },
  })
)
