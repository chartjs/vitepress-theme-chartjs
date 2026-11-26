# Contributing

## Setup

You need Node 26 (see `.node-version`) and pnpm, in the version that `packageManager` in `package.json` names.

```sh
pnpm install
pnpm exec playwright install chromium firefox
pnpm test
```

The second line downloads the browsers that the component tests run in; it is needed once per Playwright version. On
Linux, add `--with-deps` to it, as CI does, to also install the system libraries the browsers need.

| Script            | What it does                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`      | Builds `dist/` with Vite's library mode and writes the type declarations with `vue-tsc`.                                                                                  |
| `pnpm lint`       | ESLint, then Prettier's check.                                                                                                                                            |
| `pnpm typecheck`  | Type-checks the sources, tests and configuration, the example site's included.                                                                                            |
| `pnpm test`       | Builds, runs Vitest's `node` project (including `test/dist.test.ts` on `dist/`) and its `browser` project, then `test:types`.                                             |
| `pnpm test:types` | Type-checks the fixtures in `test/types/` with `bundler` and `nodenext` resolution. They import the package by name, so they check `dist/*.d.ts`: run `pnpm build` first. |
| `pnpm test:site`  | Builds, installs the package into the example site in `test/site/`, and runs `test/site.test.ts`, which builds the site and drives it in Chromium in preview and in dev.  |

While working on one test, `pnpm exec vitest run test/dist.test.ts` runs it alone, on the `dist/` you last built.

CI installs Playwright's Chromium and Firefox, then runs `lint`, `typecheck`, `test`, `test:site` and `publint` on Ubuntu
and Windows, and `actionlint` on Ubuntu. Its `lowest-peers` job, on Ubuntu, runs the example site's test on the lowest
peers: `chart.js@4.0.1` (no 4.0.0 was published), `vitepress@1.6.0` and `vue@3.5.13`, the Vue that VitePress 1.6.0
depends on. It adds them to the site with `pnpm --dir test/site add`, which rewrites the site's `package.json` and
lockfile in the checkout, checks that they are what got installed, and runs `test:site`, whose frozen install then
installs them. The Vue warning that Vue before 3.5.19 gives for a template ref bound under its own name shows only
there.

### The browser tests

`test/browser/` holds the component tests. They run on the sources, not on `dist/`, in Chromium and Firefox through
Vitest's browser mode (the `browser` project in `vitest.config.ts`), so a bare `vitest` needs Playwright's browsers
installed. `vitepress` is aliased there to `test/browser/vitepress.ts`, a `useData` stub, since the components are
mounted without a VitePress app. `pnpm exec vitest run --project browser` runs them alone; a failing test leaves a
screenshot under `.vitest/`. Two of them, `prism-isolation.test.ts` and `prism-site.test.ts`, load the built
`dist/runtime.js` instead, since the bundle decides the order in which Prism, its flags and the restore load: they need
`pnpm build` first, and check the `dist/` you last built.

`test/shell.test.ts` mounts the built `dist/runtime.js` in Node, where `vitepress` is VitePress's Node API and has no
`useData`; it mocks `vitepress` with the same stub (`vi.mock`), as any Node test that mounts the editor must.

### The example site

`test/site/` is a VitePress site that uses the package as a site would. It is a pnpm workspace of its own, with its own
`package.json` and `pnpm-lock.yaml`, and depends on the package as `file:../..`, so the package sits in its
`node_modules` as a copy, as it would when installed from npm. (pnpm cannot inject the root of a workspace into one of
its members.) The root's `pnpm install` does not install it; `pnpm test:site` does, and then runs `test/site.test.ts`
with its own Vitest config, `vitest.site.config.ts`. A bare `vitest` uses `vitest.config.ts`, which leaves the site
out, so it works without the site installed.

The site is set up as Chart.js's docs are: `chart.js` is aliased to `vendor/chart.js`, the site's own build of it,
which `test/site.test.ts` bundles with Vite from `.vitepress/chart-build.js` and the chart.js the site installed, before
it builds the site (`vendor` is ignored by git; to run `vitepress dev` there by hand, run the site test once first).
That build sets `Chart.siteBuild`, which the installed chart.js lacks, so a sample can tell that it got the site's copy.
`themeConfig.source` gives the source links; the theme imports the stylesheet; and `optimizeDeps.exclude` lists the
package and the date adapter, without which the dev server would bundle another Chart.js into them. Its imports,
`.vitepress/chart-imports.ts`, register Chart.js's components, the date adapter and a plugin that writes, on each
render, what `test/site.test.ts` checks (`data-renders`, `data-chart-id`, `data-width`, `data-scale-x`, `data-values`)
onto the sample's `.chart-editor`. The pages cover a bar sample and a line sample that checks `Chart.siteBuild` and
`Chart === Utils.Chart` (`index.md`), and `samples/` a time scale, an HTML legend, a progress bar, samples in hidden
panels and code with characters that HTML and Vue treat specially. The test runs every page on `vitepress preview` and
on `vitepress dev`, and fails on any Vue warning or console error; a sample that cannot draw fails with what the page
showed and logged.

`pnpm typecheck` checks the site's `.vitepress` files against the package's sources (through `paths` in
`tsconfig.json`) and the root's VitePress, so it needs neither a build nor the site's install. `chart-build.js` and
`adapter.js` are `.js`, so that it does not need the site's own packages either.

When you change the root's `peerDependencies` or other dependency ranges, the site's frozen install fails with
`local dependency "vitepress-theme-chartjs" at "../.." is outdated`, and `test:site` says what to do: run
`pnpm --dir test/site install` and commit `test/site/pnpm-lock.yaml`.

## Rules

- **The public names are a contract with Chart.js.** The entry points, the exported names, and the types
  `ChartjsThemeConfig`, `ChartEditorOptions` and `ChartAction` are agreed with the Chart.js docs (see the design's Contracts). Don't rename or remove them, and
  add each new public name to the fixtures in `test/types/`.
- **Only the runtime chunk may import browser-only modules or touch browser globals.** Sites render their pages in Node,
  where the package is loaded from `node_modules`. Both entries, `vitepress-theme-chartjs` and
  `vitepress-theme-chartjs/markdown`, and everything they import statically must load there without `window`,
  `document`, `self`, `location` or `localStorage`; `chart.js`, `vitepress`, and anything that reads the DOM are loaded
  lazily, after mount. The markdown entry runs in the site's configuration, so it imports nothing at all, types aside.
  `test/dist.test.ts` checks this.
- **No network requests.** The package must not fetch anything, from JavaScript or CSS. `test/dist.test.ts` checks the
  built files for network APIs.
- **The JavaScript imports no CSS.** Styles end up in `dist/style.css`, which the site imports itself as
  `vitepress-theme-chartjs/style.css`. They go in an SFC's `<style>` block or in `src/styles/editor.css`, which
  `CodeEditor.vue` loads with `<style src>`; a CSS import in TypeScript fails the type check (TS2882). Every selector is
  scoped under `.chart-editor` or by Vue's scoped styles, and every `--chartjs-*` variable has a fallback;
  `test/browser/style.test.ts` and `test/dist.test.ts` check both.
- **A module of the runtime chunk imported only for its side effects is named in `vite.config.ts`.** Add a new one to
  the `sideEffectModules` pattern there, which today matches `prism-flags.ts` and `prism-restore.ts`; otherwise the
  build drops it, since `package.json` says only the CSS has side effects.

## Pull requests

Pull requests are merged by squash, and the squash commit takes the pull request title. The title must therefore be a
[Conventional Commits](https://www.conventionalcommits.org/) subject, such as `fix: keep the chart when an edit fails`;
the `PR title` check enforces it. The type decides the next release: `fix:` releases a patch, `feat:` a minor version,
and `!` after the type a major one; `chore:`, `docs:`, `test:` and `ci:` release nothing. Use a releasing type only when
the published package changes. [MAINTAINING.md](MAINTAINING.md) describes how a release is made.
