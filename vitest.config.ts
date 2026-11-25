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
            exclude: ['test/site.test.ts', 'test/site/**'],
          },
        },
        {
          // The example site, run by `pnpm test:site` after the package is built and installed into it.
          extends: true,
          test: {
            name: 'site',
            environment: 'node',
            include: ['test/site.test.ts'],
          },
        },
      ],
    },
  })
)
