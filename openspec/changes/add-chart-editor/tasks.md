## 1. P1: Repository scaffold and CI

- [ ] 1.1 Write `test/dist.test.ts`, run in Node on `dist`:
  - import `dist/index.js` with `window` and `document` defined as throwing getters;
  - assert no `.css` import in `dist/*.js`;
  - assert no `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `importScripts`, `@import` or `url(http` outside license comments.

  Write `test/types/` as a fixture that imports `ChartjsThemeConfig` and `ChartEditorOptions` by package name. Both fail: there is no package yet.
- [ ] 1.2 Add `package.json`:
  - name `vitepress-theme-chartjs`, `"private": true`, version `0.0.0-development`, `"type": "module"`, license MIT;
  - `packageManager: pnpm@12.21.0`;
  - peers `vitepress ^1.6.0`, `vue ^3.5.0`, `chart.js ^4.0.0`;
  - exports `.` and `./package.json`; `files: ["dist"]`; `sideEffects: ["*.css"]`;
  - scripts `build`, `lint`, `typecheck`, `test`, `test:dist`;
  - devDependencies: vite, @vitejs/plugin-vue, vitest, vue-tsc, typescript ~6.0, eslint, typescript-eslint, eslint-plugin-vue, prettier, publint, and vitepress, vue and chart.js at current versions.
- [ ] 1.3 Add `pnpm-workspace.yaml`, `.node-version` (26), `.editorconfig`, `.gitignore` (`dist`, `node_modules`, `.vitepress/cache`, `.vitepress/dist`), `.prettierrc` (zoom's settings) and `eslint.config.js`.
- [ ] 1.4 Add `tsconfig.json` and `tsconfig.build.json` (declarations only, into `dist`). Add `vite.config.ts`: library mode, ES, entry `index`, externals `vue`, `vitepress`, `chart.js`, `cssFileName: 'style'`. Add `vitest.config.ts` with a `node` project.
- [ ] 1.5 Add `src/types.ts` (`ChartjsThemeConfig`, `ChartEditorOptions`, `ChartAction`, as in the contract) and `src/index.ts` re-exporting them. Run `pnpm build && pnpm test:dist` and the type fixture; they pass.
- [ ] 1.6 Add `.github/workflows/ci.yml`:
  - triggers: pull requests and pushes to `main`, on ubuntu and windows;
  - setup: pnpm, Node 26 with cache, frozen install, Playwright browsers;
  - steps: lint, typecheck, build, test, `test:dist`, publint, actionlint;
  - `contents: read`, with actions pinned by SHA.

  Add zoom's `.github/workflows/pr-title.yml` and `.github/dependabot.yml` (npm and github-actions weekly, `chore` prefix with scope).
- [ ] 1.7 Add `CONTRIBUTING.md`:
  - setup (Node 26, pnpm) and scripts;
  - the public names are a contract with Chart.js;
  - only the runtime chunk may touch browser globals;
  - no network requests;
  - Conventional Commits pull request titles, with squash merge.

  Extend the README's description with the project's status.

## 2. P2: Markdown plugin

- [ ] 2.1 Write `test/markdown.test.ts`:
  - render with VitePress's `createMarkdownRenderer` plus the plugin;
  - wrap the HTML in a page SFC as VitePress does, compile it with `@vue/compiler-sfc`, and render it with `vue/server-renderer` around a stub `ChartEditor` that prints its `code` prop as JSON;
  - assert equality with the fence content for backticks, `${}`, `'` and `"`, `{{ }}`, `</script>`, `\`, `&amp;`, `&#39;`, U+2028 and emoji;
  - assert that `js`, bare `chart-editor` and `js chart-editors` fences render byte for byte as without the plugin.

  It fails: there is no plugin.
- [ ] 2.2 Write `src/markdown.ts`: keep the previous fence rule; match `/ chart-editor( |$)/` on the trimmed info string; emit `<ChartEditor :code='…' />` with the JSON string, escaping `&` and then `'`. Import types only.
- [ ] 2.3 Add the `markdown` entry to `vite.config.ts` and `./markdown` to `exports`. Extend `test/dist.test.ts`: `dist/markdown.js` has no import statements and loads with throwing browser globals.

## 3. P3: Evaluator, block parser, debounce and source link

- [ ] 3.1 Write `test/runtime/evaluate.test.ts`, with a stub `Chart`:
  - an undeclared assignment throws;
  - imports are visible as locals and a sample may shadow them;
  - a name that is not an identifier is rejected;
  - `console.log` lines are captured and joined;
  - `module.exports` `config`, `actions` and `output` are returned, and the config is the same object;
  - a throw propagates.

  It fails: there is no evaluator.
- [ ] 3.2 Write `test/runtime/blocks.test.ts` (tabs ordered by number, a single tab without markers, hidden code kept for evaluation, a marker in a string or template ignored, a mismatched close ignored, the rejoined code still parses), `test/runtime/debounce.test.ts` (fake timers: 500 ms after the last call, `cancel()`), and `test/runtime/source-link.test.ts` (uses the file path, skips an empty `dir`, `undefined` without `source`).
- [ ] 3.3 Implement `src/runtime/evaluate.ts`, `blocks.ts` (acorn, `ecmaVersion` latest, `onComment`), `debounce.ts` and `source-link.ts`, keeping zoom's logic. Add acorn as a devDependency, since it is bundled.

## 4. P4: Editor shell, installer, lazy runtime and chart view

- [ ] 4.1 Write `test/ssr.test.ts` (Node, on `dist`): `createSSRApp` with `chartEditorPlugin` and a spy `imports`, rendering `<ChartEditor code="globalThis.ran = true">`. Assert:
  - the HTML has `class="chart-editor chart-editor-placeholder"`;
  - the spy was not called;
  - `globalThis.ran` is unset.

  It fails.
- [ ] 4.2 Add a `browser` project to `vitest.config.ts` (`@vitest/browser-playwright`, Chromium and Firefox, `vitepress` aliased to a `useData` stub). Write `test/browser/chart.test.ts`:
  - the chart is created after mount from `module.exports.config`;
  - a second evaluation updates the same instance;
  - unmount destroys it (`Chart.getChart(canvas)` is undefined);
  - an editor inside a hidden element draws at its container's size once shown;
  - a sample finds an element written beside it;
  - two editors call `imports` once;
  - an unknown chart type shows the message and keeps the previous chart;
  - a rejected `imports` shows its error;
  - no iframe and no shadow root.
- [ ] 4.3 Write `src/plugin.ts`: `chartEditorPlugin.install(app, options)` registers `ChartEditor` globally and provides a memoised `loadImports()`.
- [ ] 4.4 Write `src/ChartEditor.vue`, the shell: placeholder until mounted, then `Promise.all([import('./runtime'), loadImports()])`; ignore a load that finishes after unmount. Export it and the installer from `src/index.ts`.
- [ ] 4.5 Write `src/runtime/index.ts`, `LiveEditor.vue` (zoom's `ChartEditor.vue` with the scope taken from the loaded imports, actions read on the first evaluation only) and `ChartView.vue` (zoom's, with create and update errors emitted). Run all tests.

## 5. P5: Code editor, tabs and stylesheet

- [ ] 5.1 Write `test/browser/editor.test.ts`:
  - tabs appear in block order;
  - hidden code runs;
  - typing triggers no evaluation before 500 ms, shows the busy indicator, and updates the same chart after 500 ms;
  - Tab inserts two spaces;
  - a page code block `<div class="language-js"><pre><code>` is left untouched one frame after the editor loads.

  Extend `test/dist.test.ts`: `dist/style.css` exists and no JavaScript file references it. Both fail.
- [ ] 5.2 Write `src/runtime/prism.ts`: set `Prism.manual` and `disableWorkerMessageHandler` before importing Prism core, clike and javascript.
- [ ] 5.3 Port `CodeEditor.vue` (tabs, busy indicator, debounce from P3, blocks from P3) and `CodeTextarea.vue` (zoom's, using `prism.ts`). Wire them into `LiveEditor.vue`.
- [ ] 5.4 Port `editor.css` into `src/styles/editor.css`: prefix `.scrollable`, `.text-muted` and `.text-error` under `.chart-editor`, and give every `--chartjs-*` variable a fallback. Add `./style.css` to `exports`.

## 6. P6: Errors, output, actions and source link

- [ ] 6.1 Write `test/browser/features.test.ts`:
  - a failing edit keeps the chart, and the indicator's message is visible on hover and on keyboard focus, then clears after a good edit;
  - output: the last 50 lines newest first, the string placeholder, no tab without `output`, and changing `output` keeps the reader's edits;
  - actions: buttons in order, the handler receives the chart, buttons unchanged after an edit;
  - the source link comes from the stubbed `source` and `filePath`, opens in a new tab, and is absent without `source`.

  It fails.
- [ ] 6.2 Port `Tooltip.vue` (focusable, opening on `:focus-within`), `CodeOutput.vue` and `ChartActions.vue`, with their styles.
- [ ] 6.3 Add the error indicator and the source link (through `useData` and the P3 `sourceLink`) to `CodeEditor.vue`. Make adding or removing the Output tab not re-parse the code.

## 7. P7: Example site and consumer smoke test

- [ ] 7.1 Write `test/site.test.ts` (Node with Playwright, Chromium):
  - build `test/site` and assert that `.vitepress/.temp/app.js` imports `vitepress-theme-chartjs`;
  - preview it, open each page and assert: no hydration warning, a canvas drawn per sample, `Chart === Utils.Chart`, a time-scale sample rendered, the legend sample finds its element, an edit redraws, every request on the preview origin;
  - repeat on `vitepress dev`.

  It fails: there is no site.
- [ ] 7.2 Add `test/site/`:
  - `package.json` depending on `vitepress-theme-chartjs: workspace:*` with `dependenciesMeta.injected: true`;
  - `.vitepress/config.ts` with `chartEditor`, a `chart.js` alias to a local module, `optimizeDeps.exclude: ['vitepress-theme-chartjs']` and `source`;
  - `theme/index.ts` with `chartEditorPlugin`, `imports` and the CSS;
  - pages: a bar sample, a time-scale sample with a date adapter, an HTML legend sample, a sample hidden in `<details>`, a verbatim-characters sample.

  Add it to `pnpm-workspace.yaml`, with injected dependencies synced after build.
- [ ] 7.3 Add `test:site` to `package.json` and to `ci.yml`. Add the lowest-peers job if open question 9 is accepted.
- [ ] 7.4 Write the README usage section: install, configuration, theme, stylesheet, sample format, block markers, and the `optimizeDeps.exclude` note for sites that alias `chart.js`.

## 8. P8: Release and first-release procedure

- [ ] 8.1 Add a step to `ci.yml` that runs `semantic-release --dry-run --no-ci` against a clone with no `v*` tag, and asserts that the release workflow's tag guard fails. It fails: there is no release configuration.
- [ ] 8.2 Add `.releaserc.json`, copied from zoom: branch `main`, the `conventionalcommits` preset for the analyser and the notes, `@semantic-release/npm` with `tarballDir: "pack"`, `@semantic-release/github` with assets `pack/*.tgz`.
- [ ] 8.3 Add `.github/workflows/release.yml`, copied from zoom's `release` job:
  - `workflow_dispatch` with `dry-run`, `concurrency: release`;
  - runs only for `chartjs` on `refs/heads/main`;
  - `contents`, `issues` and `pull-requests: write`, `id-token: write`;
  - pnpm and Node 26;
  - build, test and `test:site`, then `npm --version`;
  - then a step that fails when `git tag --list 'v*'` is empty, pointing to MAINTAINING.md;
  - then `pnpm exec semantic-release`;
  - no docs job.
- [ ] 8.4 Update `package.json`: remove `private`, add `prepack: pnpm run build`, `semantic-release ^25.0.9`, `conventional-changelog-conventionalcommits ^9.3.1`, `repository`, `homepage` and `keywords`. Add `/pack` to `.gitignore`. Add zoom's Dependabot ignore rules for the majors of those two packages.
- [ ] 8.5 Write `MAINTAINING.md`, adapted from zoom:
  - making a release;
  - what decides the version;
  - what a release does;
  - the setup it depends on (squash title, ruleset, trusted publisher);
  - when a release fails halfway;
  - the first release, done by hand by a chartjs npm maintainer:
    1. on a `main` commit containing this piece, set the version to 0.1.0 without committing, run `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm pack`, then `npm publish vitepress-theme-chartjs-0.1.0.tgz --access public`;
    2. push the tag `v0.1.0` on that same commit and create the GitHub release `v0.1.0`;
    3. on npmjs.com, add the trusted publisher (GitHub Actions, `chartjs`, `vitepress-theme-chartjs`, `release.yml`, no environment) and the chartjs organisation as owner;
    4. from then on, run the `Release` workflow, which continues from `v0.1.0`.
- [ ] 8.6 After merge, maintainers:
  - change the repository settings in design D17;
  - carry out the first-release steps above;
  - run the workflow with dry run to confirm it reports no release, or 0.1.x, and not 1.0.0;
  - tell Chart.js that `^0.1.0` is available and that P8 must add the package to `optimizeDeps.exclude`.
