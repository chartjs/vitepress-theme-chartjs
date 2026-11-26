// The built runtime chunk, for the tests that depend on how the bundle orders Prism's modules; `pnpm test` builds it
// first. A module is evaluated once per page, and each test file gets a page of its own, so each such test that needs a
// fresh load is a file of its own.
export async function loadRuntime(): Promise<typeof import('../../src/runtime/index.js')> {
  const runtime = new URL('../../dist/runtime.js', import.meta.url).href
  return import(/* @vite-ignore */ runtime).catch((error: unknown) => {
    throw new Error(`Could not load ${runtime}; run pnpm build first.`, { cause: error })
  })
}
