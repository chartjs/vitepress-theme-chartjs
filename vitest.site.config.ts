import { defineConfig } from 'vitest/config'

// The example site, run only by `pnpm test:site`, after the package is built and installed into test/site. It is not
// a project of vitest.config.ts, so a bare `vitest` or an editor integration does not try to build an uninstalled site.
export default defineConfig({
  test: {
    name: 'site',
    environment: 'node',
    include: ['test/site.test.ts'],
    // Each test drives pages of a running site in Chromium; a dev server compiles a page on its first request.
    testTimeout: 60_000,
  },
})
