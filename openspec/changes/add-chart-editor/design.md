## Context

Chart.js is moving its docs from VuePress 1 to VitePress (chartjs/Chart.js, `openspec/changes/migrate-docs-to-vitepress/`). Its decision D3 puts the live chart editor into a new shared package, `vitepress-theme-chartjs`. The `## Contracts` section of that design states what Chart.js needs, and `## Contracts` below repeats it. This repository, chartjs/vitepress-theme-chartjs, holds only a README and an MIT LICENSE. The npm name is free.

The reference implementation is chartjs-plugin-zoom's VitePress editor, under `docs/.vitepress/` at commit 1a2812f (zoom pull request 972). What it does, and where it departs from the contract, file by file:

- **Fence plugin** (`markdown/chart-editor.ts`)
  - It matches `/ chart-editor( |$)/` on the trimmed info string (:3, :24) and delegates every other fence to the previous rule (:18, :25).
  - It passes the code as `JSON.stringify(code)` in a single-quoted attribute, escaping only `'` (:28).
  - Vue's template compiler decodes entities in attribute values, so a sample containing `&amp;` or `&#39;` reaches the component altered.
- **Direct imports**
  - `ChartEditor.vue:2` and `ChartView.vue:2` import `chart.js`.
  - `ChartEditor.vue:7` imports the consumer's `./chart-imports`, which registers Chart.js components as a side effect (`chart-imports.ts:5-9`).
  - `CodeEditor.vue:2` imports acorn, `:4` imports `useData` from `vitepress`, and `CodeTextarea.vue:6` imports the full `prismjs` bundle.
  - All of these are static, so they load during server rendering.
- **`vitepress` in Node.** In plain Node, the `vitepress` package's "." export resolves to `dist/node/index.js`, which has no `useData`. VitePress's server build inlines only `vitepress` and `@docsearch/css` (`ssr.noExternal`). A package that ships compiled JavaScript is left external, so Node would load it and fail on `useData`.
- **Prism.**
  - The full bundle, in the browser, reads `document.currentScript` and `readyState` at import time.
  - Unless `Prism.manual` is set, it then runs `highlightAll()` on the next frame (prism.js:1173-1205). Its selector, `[class*="language-"] code`, matches VitePress's Shiki blocks.
  - It also carries the fileHighlight plugin, which sends an `XMLHttpRequest` for `pre[data-src]` (prism.js:1797, 1841).
  - Apart from Prism, the editor makes no network request and uses inline SVG icons.
- **Evaluation** (`ChartEditor.vue:24-71`): strict mode, `const` locals taken from a context object, `module.exports`, and `markRaw` on the config.
  - Actions are taken while still null (:60), not strictly on the first evaluation.
  - `output` is re-read on every evaluation (:58). Changing it re-parses the original code and drops the reader's edits (`CodeEditor.vue:160`).
  - Log lines accumulate across evaluations, capped at 50 (:37).
- **Chart lifecycle** (`ChartView.vue:18-40`): create, then replace `data` and `options` and `update()`, then destroy. Errors thrown by Chart.js there are not caught.
- **Source link** (`CodeEditor.vue:47-50`): built from `relativePath`, where VitePress's own edit link uses `filePath`. It throws when `source` is not set, and doubles the slash when `dir` is empty.
- **CSS**
  - The theme imports its CSS from JavaScript (`theme/index.ts:5-6`).
  - `editor.css` defines the global classes `.scrollable`, `.text-muted` and `.text-error`.
  - The editor relies on `--chartjs-code-bg`, `--chartjs-code-text`, `--chartjs-radius`, `--chartjs-danger` and `--chartjs-accent-*`. Only zoom's `palette.css` defines them; Chart.js's palette has none of them.
- **Error display:** errors appear only in a hover tooltip (`Tooltip.vue:33`).
- **Size:** `CodeEditor.vue` is 328 lines, `CodeTextarea.vue` 102 and `editor.css` 106.

The consumer, Chart.js on upstream/master:
- aliases `chart.js` to its `dist/chart.js` and `vue` to the docs package's Vue;
- lists `chart.js` under `peerDependencyRules.ignoreMissing`;
- uses pnpm 12.21.0 and Node 26;
- keeps its site palette in `docs/.vitepress/theme/styles/palette.css`.

Its P8 is checked on a bar sample, a time-scale sample, the HTML legend sample and the progress-bar sample, in build and in dev. Its P9 tabs hide panels with `display: none` or the `hidden` attribute.

## Goals / Non-Goals

**Goals**
- Deliver the contract exactly, with the agreed names, keeping zoom's editor shape so that its code moves with few changes.
- Work when Vite leaves the package external in the server build, and share one Chart.js with a site that aliases it.
- Prove both with an example site built from the package as installed, from the piece that first ships the component.
- Release as chartjs-plugin-zoom does; first version 0.1.0.

**Non-Goals**
- VitePress 2. The peer range is `^1.6.0`.
- Dark-mode styling of charts, and the Chart.js site palette.
- A tabs component. Chart.js P9 converts its tab pages with a tabs plugin; this package only has to draw correctly when revealed.
- CodeSandbox export, a docs site for this package, and prereleases or a `next` dist-tag.
- Migrating the other plugin repositories.

## Decisions

**D1. The repository is chartjs/vitepress-theme-chartjs and the npm package is the unscoped `vitepress-theme-chartjs`** (user decision). *Alternatives:* a scoped name; a folder in the Chart.js repository (no reuse by the plugins).

**D2. The contract's names and zoom's shape are kept, with these fixes:**
- `&` is escaped before `'` in the fence attribute.
- Errors from creating or updating the chart are caught and shown, and the previous chart stays:
  - An update also applies the config's `type`, which zoom's update path dropped, and leaves out zoom's `stop()`, which nothing observable needs. A missing `data` or `options` is filled in by Chart.js. `new Chart` gets a shallow copy of the config, so later updates, which set `type` and `data` on the config Chart.js holds, leave the config the first evaluation exported, which its actions hold, as it was. Before an update, the chart type and every dataset's `type` are looked up with `Chart.registry.getController`, which throws without side effects. An `update()` would destroy each dataset whose type changed before it finds out, so the chart kept would lose its hidden datasets and animate again from zero.
  - Anything else `update()` throws, such as an unknown scale type, puts the previous `type`, `data` and `options` back and updates again, so that the next resize does not throw the same error. If that update throws too, its error is the one shown, and nothing is retried.
  - A failed `new Chart` is destroyed, because Chart.js claims the canvas before it draws, and the next config could not be drawn otherwise.
  - An evaluation that exports no `config` leaves the chart as it is, without an error.
- Actions are read strictly on the first evaluation that succeeds.
- The Output tab is added or removed without re-parsing the code.
- Names in `imports` that are not identifiers are rejected with a message naming them.
- The error tooltip also opens on keyboard focus.
- The editor's global classes are scoped under `.chart-editor`.

Console lines keep accumulating across evaluations, last 50, as in zoom (D20). *Alternative:* port zoom's code unchanged, which ships the fence bug and the hidden Chart.js errors.

**D3. Everything browser-only loads lazily after mount.**
- The static import graph of the main entry, and of the chunks it imports statically, is exactly `{vue}`.
- The `ChartEditor` component renders a placeholder on the server and on the client's first render, so hydration matches.
- In `onMounted` it loads the runtime chunk and the site's imports together, then renders the live editor.
- The runtime chunk is the only module that imports `chart.js`, `useData` from `vitepress`, acorn and Prism, and it contains the editor components.
- The installer memoises `imports()`, so it runs once per app, in the browser. With no options, the scope is just `Chart` and `console`, and a sample draws only with what the site has registered on Chart.js (D21).
- A load that finishes after unmount is ignored.
- Effects:
  - Node never resolves `vitepress` (no `useData` there), `chart.js` (which, for Chart.js, would be a second, auto-installed copy), acorn or Prism.
  - In the client build, Vite bundles the chunk and applies the site's aliases.
- A test on `dist` asserts the import graph (D12).

*Alternatives:*
- Static imports, with a README asking consumers to add the package to `ssr.noExternal`. That breaks the contract's "works when Vite leaves the package external".
- Reading VitePress data through private app internals instead of `useData`. That is fragile.

**D4. The build is Vite 8 library mode with `@vitejs/plugin-vue`, and the types come from `vue-tsc`.**
- Vite builds two entries, `index` and `markdown`, as ES, and writes the runtime chunk under a stable name.
- `cssFileName: 'style'` extracts every SFC `<style>`, scoped ones included, into `dist/style.css`, with no CSS import left in the JavaScript.
- Externals: `vue`, `vitepress`, `chart.js`.
- `vue-tsc -p tsconfig.build.json --declaration --emitDeclarationOnly` writes the `.d.ts` files into `dist/`.
- The entries export no SFC. vue-tsc declares `X.vue` as `X.vue.d.ts` and keeps `from './X.vue'`, which NodeNext resolves only to `X.d.vue.ts`, so a public type would become `any` there. The shell is therefore `src/ChartEditor.ts` (`defineComponent` and `h()`), and only the runtime chunk, which no public type reaches, is made of SFCs.
- It uses the same SFC compiler as VitePress, and Vitest reuses the same config.
- If Rolldown's library CSS extraction or chunking misbehaves, the build pins Vite 7. The example site exists from P4b to catch this early.

*Alternatives:*
- unbuild/mkdist ships `.vue` files uncompiled, which fails when the package is external.
- tsdown (0.x) supports Vue through unplugin-vue, and extracting scoped CSS in a library build is less proven there.
- vite-plugin-dts wraps vue-tsc and adds a dependency for nothing.

**D5. The package is ESM only, with this exports map:**
- `.` → `dist/index.{js,d.ts}`
- `./markdown` → `dist/markdown.{js,d.ts}`
- `./style.css` → `dist/style.css`
- `./package.json`

Also `"type": "module"`, `"sideEffects": ["*.css"]` and `"files": ["dist"]`. `dist/markdown.js` has no imports at all. *Alternative:* a CommonJS build as well; VitePress loads its configuration as ESM, so it is not needed.

**D6. Dependencies.**
- Peers: `vitepress ^1.6.0`, `vue ^3.5.0`, `chart.js ^4.0.0`, none optional.
- No runtime dependencies: Prism (core plus the clike and javascript grammars) and acorn are bundled into the runtime chunk, with their MIT notices kept.
- A site that has to exclude the package from dependency pre-bundling (D18) then needs no `include` entries for nested CommonJS packages.

*Alternative:* list prismjs and acorn as dependencies. Consumers would then also need `optimizeDeps.include: ['vitepress-theme-chartjs > prismjs', 'vitepress-theme-chartjs > acorn']`.

**D7. Prism runs in manual mode, with only the JavaScript grammar.**
- `src/runtime/prism-flags.ts` sets `globalThis.Prism = { manual: true, disableWorkerMessageHandler: true }`.
- `src/runtime/prism.ts` imports it first and then Prism's core and grammars. Imports are hoisted and evaluated in order, so the flags must live in their own module and cannot be a statement above the imports.
- As a result, Prism never highlights the page's own code blocks, and fileHighlight's request path is not in the bundle.
- The test that the page's code blocks are untouched runs on the built chunk, because bundling decides the evaluation order.
- `package.json`'s `sideEffects` lists `./src/runtime/prism-flags.ts` beside `*.css`. Otherwise the package's own build treats the flags module, which exports nothing, as free of side effects and drops it, and Prism highlights the page's code blocks; the test above caught exactly that.
- The build keeps legal comments (`output.comments.legal`), since its minifier otherwise drops them, Prism's MIT notice among them (D6).

*Alternative:* the full bundle, as in zoom.

**D8. The fence plugin escapes `&` and then `'`** inside a single-quoted attribute holding the JSON string. Tests compile the result the way VitePress compiles a page. *Alternative:* base64 in the attribute, which needs decoding in the component and is unreadable in the HTML.

**D9. The package ships only editor styling.**
- Every `--chartjs-*` variable is used with a fallback (for example `var(--chartjs-code-bg, #282c34)`), so a site can override any of them and needs none.
- All selectors are scoped under `.chart-editor`, or by Vue's scoped styles.
- The site palette (brand, navigation, headings) stays in the consumer; Chart.js P8 lists its own `palette.css`.

*Alternative:* ship zoom's whole palette, which would put Chart.js's site styling into every consumer.

**D10. The source link uses `page.filePath`**, as VitePress's edit link does. Empty path segments are skipped, and the link is hidden when `source` is not set. *Alternative:* `relativePath`, which is wrong under rewrites.

**D11. The server placeholder** is `div.chart-editor.chart-editor-placeholder` with a fixed-height `div.chart-view` and `aria-busy="true"`. *Alternative:* render the code as a plain `<pre>`, readable without scripts.

**D12. Tests are layered by where they run.**

| Layer | Runs in | Covers |
|---|---|---|
| Unit | Node (Vitest) | Fence plugin, block parser, evaluator, debounce, source-link building, release-tag guard script. The fence tests run through VitePress's own `createMarkdownRenderer`, wrap the output in an SFC as VitePress does, compile it with `@vue/compiler-sfc` and render it with `vue/server-renderer`. |
| Built files | Node | Listed below. |
| Components | Vitest browser mode, `@vitest/browser-playwright`, Chromium and Firefox | Component tests use the source, with `vitepress` aliased to a `useData` stub. The Prism isolation test imports the built runtime chunk. |
| Example site | Node driving Playwright, Chromium | `test/site/`, its own pnpm workspace with its own lockfile, which installs this package as `file:../..`, so it sits in `node_modules` as published. pnpm 12 cannot inject the workspace root into a member ("Empty path after `file:` scheme"). |

The built-file tests check:
- both entries import with `window` and `document` as throwing getters, after `vue` has loaded (Vue's runtime-dom tests `typeof window` when it loads);
- server rendering of an app with the installer;
- the static import graph of `dist/index.js` and of the chunks it imports statically is exactly `{vue}`, and `chart.js`, `vitepress`, acorn and Prism appear only in the dynamically imported chunk. Rolldown can split shared code (such as the `_plugin-vue_export-helper.js` chunk an SFC in the main graph would need) into chunks that `index.js` imports statically, so the test follows static chunks rather than reading `index.js` alone, and the lazy chunk's file name is fixed with `chunkFileNames` (Rolldown otherwise adds a hash);
- every relative import in the declarations that the exports reach resolves under NodeNext;
- no CSS import in the JavaScript, and `markdown.js` imports nothing;
- no network API in `dist` outside license comments;
- `publint`;
- type fixtures that import every agreed name from its entry.

The example site grows in two steps:
- **From P4b**, it is built only, with one bar sample. The build runs with `DEBUG=1`, because VitePress deletes `.vitepress/.temp` after a build unless `DEBUG` is set. The test asserts that the server bundle imports `vitepress-theme-chartjs`, so the package really was external, and that the page has the placeholder.
- **From P9**, it is also previewed and run in the dev server with `optimizeDeps.exclude`. The test asserts, in both:
  - no hydration warning, and charts drawn;
  - `Chart === Utils.Chart`, with `chart.js` aliased as Chart.js does;
  - a time-scale sample, the HTML legend sample, and the progress-bar sample, whose markdown-written `<progress>` changes during the animation;
  - samples inside `display: none`, `hidden` and a closed `<details>` draw at size when revealed;
  - the source link's `href`, through the real `useData`;
  - an edit redraws;
  - every request stays on the site's origin.

*Alternative:* jsdom for components. It has no canvas layout and no ResizeObserver, so it would prove nothing about drawing.

**D13. Tooling.**
- pnpm 12.21.0 (`packageManager`) and Node 26 (`.node-version`), as in Chart.js.
- TypeScript `~6.0`, because typescript-eslint needs `<6.1`.
- ESLint 10 flat config with typescript-eslint and eslint-plugin-vue.
- Prettier with zoom's settings (single quotes, no semicolons, width 120), so the moved code reads the same.
- `package.json` stays `"private": true` until the release piece.
- `CONTRIBUTING.md` states the repository's rules:
  - the public names are a contract with Chart.js;
  - only the runtime chunk may import browser-only modules or touch browser globals;
  - no network requests;
  - Conventional Commits pull request titles.

*Alternative:* npm, as zoom uses. The consumer is pnpm.

**D14. CI is zoom's `ci.yml`, adapted.**
- It runs on pull requests and on pushes to `main`, on ubuntu-latest and windows-latest.
- Steps: pnpm install with the frozen lockfile, Playwright browsers, lint, typecheck, `test`, example-site tests, publint and actionlint.
  - `pnpm test` is self-contained: it builds, runs every Vitest project (unit, built-file and, from P5, browser tests), then `test:types`, the type fixtures under `bundler` and `nodenext` resolution. CI has no separate build step.
  - actionlint runs on Linux only, since its action downloads a Linux binary.
  - The Playwright step arrives with the browser test project in P5; before it, nothing installs Playwright.
- `permissions: contents: read`, with actions pinned by SHA as Chart.js does.
- Coveralls is left out (D20).
- Zoom's `pr-title.yml` runs from the first piece, so every squash title is conventional before the first automated release.
- Dependabot is set up as in zoom, with `chore(deps)` and `chore(deps-dev)` prefixes.

*Alternative:* ubuntu only, which is faster.

**D15. Releases work as on zoom's master** (user decision): semantic-release, started by hand. The setup is copied, adapted only to `main`, pnpm and Node 26.
- `release.yml`:
  - `workflow_dispatch` with a `dry-run` input;
  - `concurrency: release`;
  - runs only when `github.repository_owner == 'chartjs'` and the ref is `refs/heads/main`;
  - permissions `contents`, `issues` and `pull-requests: write`, plus `id-token: write`;
  - steps: checkout with full history and no persisted credentials, install, browsers, `test` (which builds) and `test:site`;
  - then `npm --version` (trusted publishing needs npm 11.5.1 or later; Node 26 ships it);
  - then `node scripts/require-release-tag.mjs origin/main` (D16);
  - then `pnpm exec semantic-release` with `GITHUB_TOKEN`;
  - no docs job.
- `.releaserc.json`: branch `main`; the commit analyser and the notes generator with the `conventionalcommits` preset; `@semantic-release/npm` with `tarballDir: "pack"`; `@semantic-release/github` with assets `pack/*.tgz`.
- `package.json`:
  - version `0.0.0-development`;
  - `prepack` builds;
  - devDependencies `semantic-release ^25.0.9` and `conventional-changelog-conventionalcommits ^9.3.1`, whose majors Dependabot leaves alone, as in zoom.
- `.gitignore` gains `/pack`.
- `MAINTAINING.md` describes the release, what decides the version, and what to do when a release fails halfway.

*Alternative:* release-drafter with publishing on a GitHub release, which zoom removed in its pull request 999.

**D16. The first release, 0.1.0, is published by hand by a chartjs npm maintainer** (user decisions: the hand publish, and the version 0.1.0). The release workflow takes over from the next release.
- With no tag, semantic-release's first run would release 1.0.0. It takes the last release from the `v*` tags reachable from the release branch. Checked against semantic-release 25: from a hand-pushed `v0.1.0`, a `fix:` gives 0.1.1, a `feat:` 0.2.0 and a `feat!:` 1.0.0.
- The hand release:
  1. The maintainer publishes 0.1.0 from a `main` commit that contains the release piece: set the version to 0.1.0 without committing it, run `pnpm install --frozen-lockfile`, `pnpm build` and `pnpm pack`, then `npm publish vitepress-theme-chartjs-0.1.0.tgz --access public`.
  2. A repository maintainer pushes the tag `v0.1.0` on exactly that commit and creates the GitHub release `v0.1.0` by hand.
  3. The npm maintainer adds a trusted publisher on npmjs.com (GitHub Actions; organisation `chartjs`; repository `vitepress-theme-chartjs`; workflow `release.yml`; no environment) and adds the chartjs npm organisation as owner.
- The guard `scripts/require-release-tag.mjs <ref>` exits non-zero unless `git tag --merged <ref> --list 'v*'` is non-empty. A stray tag that is not reachable from `main` therefore cannot unlock a 1.0.0.
- The guard is a script so that a unit test can run it against a temporary repository: no tag, a tag on `main`, and a tag only on a side branch. A semantic-release dry run in CI could not test it, because on a pull request branch semantic-release stops at "only publishes from main".
- The script is Node rather than shell so that it runs on the Windows CI runner too.
- 0.1.0 has no provenance; later versions do.

*Alternatives:*
- Let semantic-release publish the first version with an npm token. Nobody with access has chosen that, and it would be 1.0.0 unless forced.
- Publish a placeholder version first. It adds a version nobody wants.

**D17. Settings that only maintainers can change.**
- **GitHub:**
  - squash merging with the pull request title as the subject (today: "commit or pull request title"), with branches deleted on merge;
  - a ruleset on `main` that requires a pull request, the CI check and `PR title / lint` (today `main` is unprotected);
  - Actions allowed to write contents, issues and pull requests.
- **npm:** as in D16.

**D18. Dev pre-bundling with an aliased Chart.js.**
- Vite's dependency optimiser bundles whatever a pre-bundled package imports, aliased files included.
- A site that aliases `chart.js` to its own file must therefore list this package in `optimizeDeps.exclude`. Otherwise, in dev, the editor gets a second Chart.js with nothing registered on it.
- The README documents this, and the example site's dev-server test uses exactly that setting.
- **Chart.js P8 must add `vitepress-theme-chartjs` to `optimizeDeps.exclude`**, next to the date adapter it already excludes for the same reason.
- A site that resolves `chart.js` from `node_modules` needs nothing.

*Alternative:* inject `Chart` through the options, which the contract rules out (Chart.js D19).

**D19. What review changed.** An architecture and complexity review and a scope review led to these changes:

| Change | Why |
|---|---|
| The tag guard moved into `scripts/require-release-tag.mjs`, uses `--merged origin/main`, and is unit-tested; the CI dry-run step was dropped. | The dry run could not exercise an inline workflow guard, and a stray tag could have unlocked 1.0.0. |
| A `dist` test pins the server import graph to `{vue}`. | D3 rests on it. |
| The example site asserts the source link's `href` in build and dev. | Only the real VitePress exercises `useData`. |
| A build-only example site moved into P4, the first piece with the component. When P4 was later split, the site became P4b. | Rolldown library output and the external server build are the largest build risk. |
| The code-editor piece was split in two, and the pieces renumbered. | At about 550 lines it was over the limit. |
| The Prism flags got their own module, and their test runs on the built chunk. | Hoisted imports decide when the flags are set. |
| Scenarios pin the agreed names, the installer without options, the progress-bar sample, all three ways of hiding a panel, rejected import names, scoped CSS and console accumulation. | The scope review asked for these. |
| The config and dev-sharing requirements were restated as observable behaviour. | They were not observable as written. |
| The peer scenario says the package manager "warns". | The consumer ignores missing peers. |
| The example-site build runs with `DEBUG=1`. | VitePress deletes the server bundle otherwise. |

**D20. Answers to the open questions** (user decisions, after the design review):
- Prism and acorn are bundled into the runtime chunk; the package has no runtime dependencies (D6).
- The package carries only the editor's `--chartjs-*` variables with fallbacks; the site palette stays with the consumer (D9).
- The server placeholder is an empty reserved box (D11).
- CI runs zoom's matrix (ubuntu and windows; Chromium and Firefox for component tests) and a lowest-peers job that builds the example site against `vitepress@1.6.0`, `vue@3.5.0` and `chart.js@4.0.0` (P9).
- The README documents usage in full, written in P10.
- Release notes only, generated by semantic-release; no `CHANGELOG.md`.
- No coverage service.
- Console lines keep accumulating across evaluations, newest first, last 50 (D2).
- No license headers and no banner in `dist`; bundled MIT notices are kept.

**D21. The site registers Chart.js's components** (user decision, 2026-11-25). The runtime imports the tree-shakable `Chart` from `chart.js` and registers nothing on it. A sample draws only the controllers, elements, scales and plugins that the site has registered, usually in its `imports`, as zoom's `chart-imports.ts` does; without registration, a bar sample fails with `"bar" is not a registered controller.` The README says so (P10), and the browser tests register `registerables` themselves. *Alternative:* the runtime calls `Chart.register(...registerables)`, which removes tree-shaking for every site.

## Risks / Trade-offs

- **Delay before the chart.** The runtime chunk loads after mount, so charts appear a moment after the page. Chart.js is one module in the bundle, shared by the site's imports and the chunk.
- **A peer outside a caret range on 0.x.** Under semantic-release, a `feat:` after 0.1.0 releases 0.2.0, which `^0.1.0` excludes. Chart.js must widen its range to get new features; a `fix:` flows automatically.
- **0.1.0 has no provenance**, and it depends on the hand procedure. A tag on the wrong commit would make the next notes wrong. MAINTAINING.md says to tag the commit that was packed, and the guard refuses a tag off `main`.
- **Bundled Prism and acorn** take security fixes only through a release of this package. Dependabot bumps their devDependencies; such a pull request needs a `fix(deps):` title to release.
- **Vite 8 (Rolldown) library mode** is newer than Rollup's. The P4b example site and the P4a import-graph test catch a broken stylesheet or chunk, and D4 falls back to Vite 7.
- **Internal behaviour of VitePress.** The external-package check relies on VitePress 1's server build and on `DEBUG` keeping `.temp`. Moving to VitePress 2 needs its own change.
- **Firefox and Windows in CI** lengthen runs. Either can be dropped if it turns out flaky.
- **semantic-release comments** on every pull request a release includes. The first automated release after 0.1.0 includes only later pull requests.
- **Errors while drawing are not caught.** With animations on, Chart.js draws in `requestAnimationFrame`, so a throw from a sample's inline plugin while drawing escapes the editor. Only what `new Chart` and `update()` throw, which is Chart.js rejecting the configuration, is shown (D2).
- **Inline plugins are fixed at the first draw.** Chart.js takes `config.plugins` only when the chart is created, so an edit to them has no effect on the chart drawn, as in zoom.
- **Actions see the first evaluation's `config`.** Actions are read once (D2) and close over the `config` of that evaluation, while after an edit the chart holds the new `data`. P8's actions test must expect an action that changes `config.data` to change the first evaluation's objects, not what the chart shows after an edit.

## Pieces

Sizes are hand-written changed lines, counting moved code and tests; lockfiles are not counted.

| Piece | Builds | Files | Fails without it | Size | Waits on |
| --- | --- | --- | --- | --- | --- |
| P1 | Repository scaffold and CI: tooling, the public types, the main entry, the built-file test harness, the pull request title check | `package.json` (private, `0.0.0-development`, peers, exports `.`), `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.node-version`, `.editorconfig`, `.gitignore`, `.prettierrc`, `eslint.config.js`, `tsconfig.json`, `tsconfig.build.json`, `vite.config.ts`, `vitest.config.ts`, `src/index.ts`, `src/types.ts`, `test/dist.test.ts`, `test/types/*` (fixtures, `tsconfig.json`, `tsconfig.nodenext.json`), `.github/workflows/{ci,pr-title}.yml`, `.github/dependabot.yml`, `CONTRIBUTING.md`, `README.md` (status), `.prettierignore` | there is no CI; nothing checks that the main entry imports in Node without browser globals, that `ChartjsThemeConfig` resolves from the package root, or that `dist` has no network API | ~300 | nothing |
| P2 | The markdown plugin and its entry | `src/markdown.ts`, `vite.config.ts`, `package.json` (exports `./markdown`), `test/markdown.test.ts`, `test/dist.test.ts`, `test/types/*` | the verbatim test (`&amp;` is changed by zoom's escaping); the test that other fences render identically; `chartEditor` from `/markdown` resolves | ~190 | P1 |
| P3 | The evaluator, block parser, debounce and source-link builder, as pure TypeScript | `src/runtime/{evaluate,blocks,debounce,source-link}.ts`, `test/runtime/*.test.ts`, `package.json` (acorn devDependency) | their unit tests: strict mode, locals and which wins, rejected names (`my-lib`, `default`, `module`), console capture, exports, a throw propagating, block order, a marker in a string, an edited tab rejoined in place, 500 ms with the last arguments, an encoded source link | ~610 | P1; can run beside P2 |
| P4a | Editor shell, installer, server placeholder and lazy runtime with a chart created on mount | `src/{plugin.ts,ChartEditor.ts,index.ts}`, `src/runtime/{index.ts,LiveEditor.vue,ChartView.vue}`, `vite.config.ts` (`chunkFileNames`), `test/ssr.test.ts`, `test/shell.test.ts`, `test/dist.test.ts` (import graph, reachable declarations), `test/types/component.ts` | the server render shows a placeholder under the global name `ChartEditor` and calls no imports; the import graph of `dist/index.js` is `{vue}`; `ChartEditor` and `chartEditorPlugin` resolve from the root; after mount, a failed load shows its error and the imports are retried and then reused. `LiveEditor`'s evaluation state is built here (a throw keeps the chart instance and sets the error, actions come from the first evaluation that succeeds, log lines accumulate) and its browser tests come in P5 and P8 | ~450 (grew from ~380 with the failure state and its Node tests) | P2, P3 |
| P4b | A build-only example site that installs the package as published | `test/site/{package.json,pnpm-workspace.yaml,pnpm-lock.yaml,.vitepress/config.ts,.vitepress/theme/index.ts,index.md}`, `test/site.test.ts`, `vitest.config.ts` (`site` project), `package.json` (`test`, `test:site`), `.gitignore`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `CONTRIBUTING.md` | the example site builds with the package external, from a copy that matches `dist` | ~120 | P4a |
| P5 | Chart lifecycle in the browser: update, destroy, errors from Chart.js, revealed panels, imports once, no options | `src/runtime/{LiveEditor,ChartView}.vue`, `vitest.config.ts` (browser project, `vitepress` stub), `test/browser/chart.test.ts`, `.github/workflows/ci.yml` (Playwright browsers), `package.json` (`@vitest/browser-playwright`) | browser: the chart is created after mount and updated rather than recreated; unmount destroys it; `display: none`, `hidden` and closed `<details>` each draw at size when revealed; page elements are found; imports are loaded once; `app.use(chartEditorPlugin)` without options runs `Chart` and `console`, drawing with what the site registered; an unknown chart, dataset or scale type keeps the chart, its hidden datasets included, and shows the message; an edit that throws keeps the same chart instance and sets the error; no iframe or shadow root | ~540 (grew from ~270: about 370 are the browser tests, with a case for each config Chart.js rejects) | P4b |
| P6 | Code textarea with Prism highlighting, the Tab key and 500 ms re-evaluation of the whole code | `src/runtime/{CodeTextarea.vue,prism-flags.ts,prism.ts,prism-core.d.ts,LiveEditor.vue}`, the textarea and token styles, `package.json` (`prismjs` and `@types/prismjs` devDependencies, `sideEffects`), `vite.config.ts` (legal comments), `test/browser/textarea.test.ts`, `test/browser/prism-isolation.test.ts`, `test/browser/helpers.ts` (the fixtures moved from `chart.test.ts`) | an edit updates the chart after 500 ms and not before; a new `code` prop replaces pending edits; unmount drops a pending evaluation; Tab inserts spaces; markup in the code shows as text; the built chunk leaves a page `language-js` code block untouched one frame after load | ~500 (about 180 of them the fixtures moved to `helpers.ts`) | P5, P3 (debounce) |
| P7 | Tabs from blocks, the busy indicator, the editor chrome and the stylesheet entry | `src/runtime/{CodeEditor.vue,LiveEditor.vue}`, `src/styles/editor.css`, `package.json` (exports `./style.css`), `test/browser/editor.test.ts`, `test/dist.test.ts`, `test/types/*` | tabs in block order, with hidden code running; the busy indicator while typing; a page's `.text-muted`, `.scrollable` and `.text-error` unchanged by the stylesheet; `dist/style.css` exported, and no JavaScript references it | ~390 | P6, P3 (blocks) |
| P8 | Error display, output tab, action buttons, source link | `src/runtime/{Tooltip,CodeOutput,ChartActions}.vue`, `src/runtime/{CodeEditor,LiveEditor}.vue`, their styles, `test/browser/features.test.ts` | the error is kept and reachable by focus; output capped at 50, accumulating across edits (including lines a failed edit logged), with its placeholder, and edits survive an `output` change; actions are read once and stay unchanged after an edit that exports others; the link is built from the source path and hidden without `source` | ~370 | P7 |
| P9 | Example site widened to the consumer's checks, in build and dev | `test/site/**` (aliased `chart.js`, date adapter, `optimizeDeps.exclude`, `source`; pages for time scale, HTML legend, progress bar, hidden panels, verbatim characters), `test/site.test.ts`, `test/site/package.json` and `test/site/pnpm-lock.yaml` (the site's own dependencies) | nothing proves one Chart.js in build and dev, clean hydration, the progress bar and legend samples, revealed panels, the real source link, or no foreign requests | ~360 | P8 |
| P10 | Release as in zoom; the first-release procedure; README usage | `scripts/require-release-tag.mjs`, `test/release-tag.test.ts`, `.releaserc.json`, `.github/workflows/release.yml`, `.github/dependabot.yml`, `.gitignore`, `MAINTAINING.md`, `README.md`, `package.json` (drop `private`, `prepack`, semantic-release devDependencies, repository, homepage, keywords) | the guard test (no tag, a tag on `main`, a tag off `main`); without this piece there is no way to release, and a release attempted before the first tag would be 1.0.0 | ~320 | P9; then the D16 and D17 steps by maintainers |

**Order and parallel work.** P2 and P3 can be built at the same time; everything else is serial. P4 was cut in two when it reached about 500 lines: P4b follows P4a straight away, and P5 waits on P4b. `main` stays releasable throughout, because the package is `private` and no release path exists before P10. After P10 come the hand release of 0.1.0 (D16), and then Chart.js P8.

## Contracts

**Between pieces**
- **P1 to all:**
  - `pnpm build` writes `dist/`, and `pnpm test` builds before it runs Vitest and then `test:types`;
  - `test/dist.test.ts` runs on `dist`, and each entry added is appended to it;
  - `test/types/` imports every public name from its entry, and each piece adds the names it ships; relative imports in `src` carry `.js`, since the `nodenext` fixture needs it in the declarations;
  - Vitest has a `node` project; P5 adds a `browser` project;
  - the types live in `src/types.ts`: `ChartjsThemeConfig`, `ChartEditorOptions` and `ChartAction`.
- **P2 to P4:** `chartEditor(md)` emits `<ChartEditor :code='…' />`.
- **P3 to P4 and later:**
  - `evaluate(code, scope)` returns `{config, actions, output}` as the sample exported them, or throws; it keeps no state;
  - `scope` is `{Chart, imports, log(line)}`. The sample sees the imports, then `console` and `Chart`, as locals: the evaluator's own `Chart` and `console` win over imported names of the same name. `log` receives each `console.log` call, its arguments joined with spaces, as it happens, so the lines of a run that later throws have already been logged;
  - every imported name must be declarable as `const <name>` in strict mode, and `module` is the evaluator's own; any other name, such as `my-lib`, `default` or `eval`, throws an error saying `"<name>" is not usable as a name`;
  - `parseBlocks(code)` returns `{tabs, blocks}`: `blocks` in source order, hidden code included, and `tabs` the named blocks ordered by number, as the same objects as their entries in `blocks`. Empty blocks are dropped; with no non-empty named block there is one tab, `JS`, holding the whole code, markers included. It throws the parser's error on invalid code;
  - an edit is `tab.code = x` followed by `joinBlocks(blocks)`, which joins the blocks with `'\n'`; for a sample with one tab it gives back the code unchanged;
  - `debounce(fn, ms)` returns a function with `cancel()`, which calls `fn` `ms` after the last call with that call's arguments;
  - `sourceLink(source, filePath)` returns a string, or `undefined` when `source`, its `repo` or its `branch` is missing. Empty segments of `dir` and `filePath` are skipped, and each segment is encoded with `encodeURIComponent`; the branch is not.
- **P4a to P5 and later:**
  - the shell `src/ChartEditor.ts` is not an SFC, and the entries export none (D4);
  - when the runtime chunk or the site's imports fail to load, the shell renders `div.chart-editor.chart-editor-failed` with `role="alert"` and the message in `p.chart-editor-failure`, in place of the placeholder, for P7 and P8 to style; the installer forgets a rejected `imports()`, so the next editor to mount tries again;
  - `LiveEditor` takes `code` and the loaded `imports` (`{}` without an `imports` option), and holds the evaluation state:
    - an evaluation that throws keeps the previous `config`, and so the chart, and sets the error; a config Chart.js rejects keeps the previous chart instance, drawn as before, and sets the error (tested in 5.1);
    - the exposed `config` is the config of the last evaluation that succeeded, not necessarily what is drawn: after a config Chart.js rejected, it is the rejected one. What is drawn is `ChartView`'s `chart()`;
    - actions are read from the first evaluation that succeeds, and stay after an edit that exports different ones (tested in Node in P4a, in the browser in 5.1 and 8.1). Zoom read them while still unset, which a failing first evaluation would leave for the next one;
    - log lines accumulate across evaluations, including those a failed run logged before it threw, newest first, last 50 (tested in 5.1 and 8.1);
  - `ChartView` exposes `chart()`, and from P5 emits `error` with what Chart.js threw while creating or updating the chart;
  - the runtime chunk is the only module that imports `chart.js`, `vitepress`, acorn or Prism, and the import-graph test enforces it;
- **P4b to P5 and later:** `test/site` exists, builds with `DEBUG=1`, and `pnpm test:site` runs it.
- **P6 to P7:** `CodeTextarea` takes `value` and emits `input`, and `LiveEditor` re-evaluates through the P3 debounce, 500 ms after the last input. A new `code` prop cancels the pending evaluation, replaces the edited text and is evaluated at once; unmount cancels the pending evaluation. P7 moves the debounce into `CodeEditor`, around the tabs, and keeps these rules.
- **P7 to P8:**
  - `CodeEditor` takes `error`, `messages` and `output` props and has places for the error indicator and the source link;
  - styles go in SFC `<style>` blocks or in `src/styles/editor.css`, all scoped under `.chart-editor`, and all of them end up in `dist/style.css`.
- **P9 to P10:** `pnpm test` builds and covers the unit, built-file and browser tests and the type fixtures, and `pnpm test:site` the example site in build and dev. The release workflow runs both.

**What Chart.js gets** (from chartjs/Chart.js `migrate-docs-to-vitepress` design, Contracts; the names are agreed and must not change)
- **Entry points**, ESM and shipped compiled:
  - `vitepress-theme-chartjs/markdown`: `chartEditor(md)`;
  - `vitepress-theme-chartjs`: the `ChartEditor` component, `app.use(chartEditorPlugin, options)` registering it globally, and the type `ChartjsThemeConfig`;
  - `vitepress-theme-chartjs/style.css`, imported by the consumer; the JavaScript imports no CSS.
- **Options and theme configuration:**
  - `ChartEditorOptions { imports?: () => Promise<Record<string, unknown>> }`: called once, in the browser only, before the first sample runs;
  - `ChartjsThemeConfig extends DefaultTheme.Config { source: { repo: string; branch: string; dir: string } }`.
- **Chart.js:** `chart.js` is a peer that the package imports. Chart.js satisfies it with its alias to `dist/chart.js`.
- **Fences:** a fence is taken over when its trimmed info string matches `/ chart-editor( |$)/`, and its code arrives verbatim.
- **Sample format:**
  - the code runs in a strict-mode function with `Chart`, the imports, a captured `console.log` (last 50 lines) and `module.exports` as locals;
  - the editor reads `config` (not made reactive or frozen), `actions` (from the first evaluation that succeeds) and `output`.
- **Block markers:** they match `/^\s*<(\/?)block:([\w\s]+)(?::(\d+))?>\s*$/` and are found by a parser.
- **Editing:** 500 ms debounce; an error keeps the chart; create first, then `data` and `options` plus `update()`; destroy on leave.
- **Rendering:** in the page's document after mount, with the classes `chart-editor` and `chart-view`; a hidden sample draws correctly when shown.
- **No network requests.**
- **Server rendering:** neither entry touches `window` or `document` in Node; a placeholder on the server, no `imports` call, no evaluation.
- **Peers:** `vitepress ^1.6.0`, `vue ^3.5.0`, `chart.js ^4.0.0`. Chart.js depends on `^0.1.0`.
- **Addition for Chart.js P8:** add `vitepress-theme-chartjs` to `vite.optimizeDeps.exclude` (D18).

Consumer usage, as the README states it:

```ts
// .vitepress/config.ts
import { chartEditor } from 'vitepress-theme-chartjs/markdown'
export default defineConfigWithTheme<ChartjsThemeConfig>({
  markdown: { config: (md) => { chartEditor(md) } },
  vite: { optimizeDeps: { exclude: ['vitepress-theme-chartjs'] } }, // when chart.js is aliased
  themeConfig: { source: { repo: 'chartjs/Chart.js', branch: 'master', dir: 'docs' } },
})

// .vitepress/theme/index.ts
import { chartEditorPlugin } from 'vitepress-theme-chartjs'
import 'vitepress-theme-chartjs/style.css'
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(chartEditorPlugin, { imports: () => import('./chart-imports').then((m) => m.imports) })
  },
}
```

## Open Questions

None. The answers are recorded in D20.
