## 1. P1: Repository scaffold and CI

- [ ] 1.1 Write `test/dist.test.ts`, run in Node on `dist`:
  - import `dist/index.js` with `window` and `document` defined as throwing getters;
  - assert no `.css` import in `dist/*.js`;
  - assert no `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `importScripts`, `@import` or `url(http` outside license comments.

  Write `test/types/root.ts`, importing the type `ChartjsThemeConfig` (and `ChartEditorOptions`) from `vitepress-theme-chartjs`. Both fail: there is no package yet.
- [ ] 1.2 Add `package.json`:
  - name `vitepress-theme-chartjs`, `"private": true`, version `0.0.0-development`, `"type": "module"`, license MIT;
  - `packageManager: pnpm@12.21.0`;
  - peers `vitepress ^1.6.0`, `vue ^3.5.0`, `chart.js ^4.0.0`;
  - exports `.` and `./package.json`; `files: ["dist"]`; `sideEffects: ["*.css"]`;
  - scripts `build`, `lint`, `typecheck`, `test`, `test:dist`;
  - devDependencies: vite, @vitejs/plugin-vue, vitest, vue-tsc, typescript ~6.0, eslint, typescript-eslint, eslint-plugin-vue, prettier, publint, and vitepress, vue and chart.js at current versions.
- [ ] 1.3 Add `pnpm-workspace.yaml`, `.node-version` (26), `.editorconfig`, `.gitignore` (`dist`, `node_modules`, `.vitepress/cache`, `.vitepress/dist`, `.vitepress/.temp`), `.prettierrc` (zoom's settings) and `eslint.config.js`.
- [ ] 1.4 Add `tsconfig.json` and `tsconfig.build.json` (declarations only, into `dist`). Add `vite.config.ts`: library mode, ES, entry `index`, externals `vue`, `vitepress`, `chart.js`, `cssFileName: 'style'`. Add `vitest.config.ts` with a `node` project.
- [ ] 1.5 Add `src/types.ts` (`ChartjsThemeConfig`, `ChartEditorOptions`, `ChartAction`, as in the contract) and `src/index.ts` re-exporting them. Run `pnpm build && pnpm test:dist` and the type fixture; they pass.
- [ ] 1.6 Add `.github/workflows/ci.yml`:
  - triggers: pull requests and pushes to `main`, on ubuntu and windows;
  - setup: pnpm, Node 26 with cache, frozen install, Playwright browsers;
  - steps: lint, typecheck, build, test, `test:dist`, type fixtures, publint, actionlint;
  - `contents: read`, with actions pinned by SHA.

  Add zoom's `.github/workflows/pr-title.yml` and `.github/dependabot.yml` (npm and github-actions weekly, `chore` prefix with scope).
- [ ] 1.7 Add `CONTRIBUTING.md`:
  - setup (Node 26, pnpm) and scripts;
  - the public names are a contract with Chart.js;
  - only the runtime chunk may import browser-only modules or touch browser globals;
  - no network requests;
  - Conventional Commits pull request titles, with squash merge.

  Extend the README's description with the project's status.

## 2. P2: Markdown plugin

- [ ] 2.1 Write `test/markdown.test.ts`:
  - render with VitePress's `createMarkdownRenderer` plus the plugin;
  - wrap the HTML in a page SFC as VitePress does, compile it with `@vue/compiler-sfc`, and render it with `vue/server-renderer` around a stub `ChartEditor` that prints its `code` prop as JSON;
  - assert equality with the fence content for backticks, `${}`, `'` and `"`, `{{ }}`, `</script>`, `\`, `&amp;`, `&#39;`, U+2028 and emoji;
  - assert that `js`, bare `chart-editor` and `js chart-editors` fences render byte for byte as without the plugin.

  Add `test/types/markdown.ts`, importing `chartEditor` from `vitepress-theme-chartjs/markdown`. Both fail.
- [ ] 2.2 Write `src/markdown.ts`: keep the previous fence rule; match `/ chart-editor( |$)/` on the trimmed info string; emit `<ChartEditor :code='…' />` with the JSON string, escaping `&` and then `'`. Import types only.
- [ ] 2.3 Add the `markdown` entry to `vite.config.ts` and `./markdown` to `exports`. Extend `test/dist.test.ts`: `dist/markdown.js` has no import statements, loads with throwing browser globals, and exports `chartEditor`.

## 3. P3: Evaluator, block parser, debounce and source link

- [ ] 3.1 Write `test/runtime/evaluate.test.ts`, with a stub `Chart`:
  - an undeclared assignment throws;
  - imports are visible as locals, and a sample may shadow them;
  - a provided name that is not an identifier, such as `my-lib`, is rejected with an error naming it;
  - `console.log` lines are captured and joined;
  - `module.exports` `config`, `actions` and `output` are returned, and the config is the same object;
  - a throw propagates.

  It fails: there is no evaluator.
- [ ] 3.2 Write:
  - `test/runtime/blocks.test.ts`: tabs ordered by number; a single tab without markers; hidden code kept for evaluation; a marker in a string or template ignored; a mismatched close ignored; the rejoined code still parses;
  - `test/runtime/debounce.test.ts`, with fake timers: the call comes 500 ms after the last one, and `cancel()` stops it;
  - `test/runtime/source-link.test.ts`: uses the file path, skips an empty `dir`, returns `undefined` without `source`.
- [ ] 3.3 Implement `src/runtime/evaluate.ts`, `blocks.ts` (acorn, latest `ecmaVersion`, `onComment`), `debounce.ts` and `source-link.ts`, keeping zoom's logic. Add acorn as a devDependency, since it is bundled.

## 4. P4: Editor shell, installer, lazy runtime and a build-only example site

- [ ] 4.1 Write `test/ssr.test.ts` (Node, on `dist`):
  - `createSSRApp` with `chartEditorPlugin` and a spy `imports`;
  - a template using the global `<ChartEditor code="globalThis.ran = true" />`, not imported;
  - assert: the HTML has `class="chart-editor chart-editor-placeholder"`, the spy was not called, `globalThis.ran` is unset.

  It fails.
- [ ] 4.2 Extend `test/dist.test.ts` with the import-graph test:
  - parse the static `import` statements of `dist/index.js` and, recursively, of every chunk it imports statically;
  - assert that the set of bare specifiers is exactly `{vue}`;
  - assert that the dynamically imported chunk is the only file importing `chart.js` or `vitepress`, and the only one containing acorn and Prism.

  Add `test/types/component.ts`, importing `ChartEditor` and `chartEditorPlugin` from `vitepress-theme-chartjs` and calling `app.use(chartEditorPlugin, { imports })`.
- [ ] 4.3 Write `test/site.test.ts` (build only):
  - run `vitepress build test/site` with `DEBUG=1`, so that `.vitepress/.temp` is kept;
  - assert that `.vitepress/.temp/app.js`, or a server chunk, imports `vitepress-theme-chartjs`;
  - assert that the built `index.html` contains the placeholder.

  Add `test/site/`:
  - `package.json` with `vitepress-theme-chartjs: workspace:*` and `dependenciesMeta.injected: true`;
  - `.vitepress/config.ts` with `chartEditor`;
  - `.vitepress/theme/index.ts` with `chartEditorPlugin` and the default theme;
  - `index.md` with one bar sample.

  Add it to `pnpm-workspace.yaml`, with injected dependencies synced after build. Add `test:site` to `package.json` and to `ci.yml`.
- [ ] 4.4 Write `src/plugin.ts`: `chartEditorPlugin.install(app, options = {})` registers `ChartEditor` globally and provides a memoised `loadImports()`, which resolves `{}` when there is no `imports`.
- [ ] 4.5 Write `src/ChartEditor.vue`, the shell: render the placeholder until mounted, then `Promise.all([import('./runtime'), loadImports()])`; ignore a load that finishes after unmount. Export the shell and the installer from `src/index.ts`.
- [ ] 4.6 Write `src/runtime/index.ts`, `LiveEditor.vue` (zoom's `ChartEditor.vue` evaluation with the scope from the loaded imports, actions read on the first evaluation only) and `ChartView.vue` (zoom's create-on-mount and destroy). Run all tests.

## 5. P5: Chart lifecycle in the browser

- [ ] 5.1 Add a `browser` project to `vitest.config.ts`: `@vitest/browser-playwright`, Chromium and Firefox, with `vitepress` aliased to a `useData` stub. Write `test/browser/chart.test.ts`:
  - the chart is created after mount from `module.exports.config`, and `chart.data` is the exported `config.data`;
  - a second evaluation updates the same instance with the new data and options;
  - unmount destroys it (`Chart.getChart(canvas)` is undefined);
  - editors inside an element with `display: none`, with the `hidden` attribute, and inside a closed `<details>` each draw at their container's size once revealed;
  - a sample finds an element written beside it;
  - two editors call `imports` once;
  - `app.use(chartEditorPlugin)` with no options runs a sample using `Chart` and `console`;
  - an unknown chart type in a later evaluation keeps the previous chart and exposes the message;
  - a rejected `imports` exposes its error;
  - no iframe and no shadow root.

  It fails where P4 does not yet behave this way.
- [ ] 5.2 Extend `ChartView.vue` with zoom's update path, and catch errors from `new Chart` and `update()`, emitting them. Make `LiveEditor.vue` keep the previous config on error and expose the error state.

## 6. P6: Code textarea, highlighting and re-evaluation

- [ ] 6.1 Write `test/browser/textarea.test.ts`:
  - typing does not evaluate before 500 ms and updates the same chart after 500 ms;
  - Tab inserts two spaces and focus stays.

  Write `test/browser/prism-isolation.test.ts`, which imports the built runtime chunk from `dist` into a page that has `<div class="language-js"><pre><code><span class="x">a</span></code></pre></div>`, and asserts the markup is unchanged one animation frame later. Both fail.
- [ ] 6.2 Write `src/runtime/prism-flags.ts`, which sets `globalThis.Prism = { manual: true, disableWorkerMessageHandler: true }`. Write `src/runtime/prism.ts`, which imports `./prism-flags` first and then Prism's core, clike and javascript grammars.
- [ ] 6.3 Port `CodeTextarea.vue` (zoom's, using `prism.ts`) with its styles and the token colours. Wire one textarea holding the whole code into `LiveEditor.vue`, re-evaluating through the P3 debounce.

## 7. P7: Tabs, busy indicator and stylesheet entry

- [ ] 7.1 Write `test/browser/editor.test.ts`:
  - tabs appear in block order, and hidden code runs;
  - the busy indicator shows while typing and disappears after evaluation;
  - with `dist/style.css` loaded, page elements outside the editor with `.text-muted`, `.scrollable` and `.text-error` have the same computed style as without it.

  Extend `test/dist.test.ts`: `./style.css` is exported, the file exists, and no JavaScript file references it. Add `test/types/style.ts`, importing `vitepress-theme-chartjs/style.css`. These fail.
- [ ] 7.2 Port `CodeEditor.vue`: tabs from the P3 block parser, the busy indicator, and the debounce moved here from `LiveEditor.vue`. Leave out the error indicator and the source link, which come in P8.
- [ ] 7.3 Port `editor.css` into `src/styles/editor.css`: scope every rule under `.chart-editor`, and give every `--chartjs-*` variable a fallback. Add `./style.css` to `exports`.

## 8. P8: Errors, output, actions and source link

- [ ] 8.1 Write `test/browser/features.test.ts`:
  - a failing edit keeps the chart, and the indicator's message is visible on hover and on keyboard focus, then clears after a good edit;
  - output: the last 50 lines newest first, lines accumulating across edits, the string placeholder, no tab without `output`, and changing `output` keeps the reader's edits;
  - actions: buttons in order, the handler receives the chart, buttons unchanged after an edit;
  - the source link comes from the stubbed `source` and `filePath`, opens in a new tab, and is absent without `source`.

  It fails.
- [ ] 8.2 Port `Tooltip.vue` (focusable, opening on `:focus-within`), `CodeOutput.vue` and `ChartActions.vue`, with their styles.
- [ ] 8.3 Add the error indicator and the source link (through `useData` and the P3 `sourceLink`) to `CodeEditor.vue`. Make adding or removing the Output tab not re-parse the code.

## 9. P9: Example site widened to the consumer's checks

- [ ] 9.1 Extend `test/site.test.ts`. After the build, preview the site and drive Playwright (Chromium) over every page; then repeat on `vitepress dev`. Assert:
  - no hydration warning, and a canvas drawn per sample;
  - `Chart === Utils.Chart`;
  - the time-scale sample renders;
  - the HTML legend sample fills its markdown-written container;
  - the progress-bar sample's markdown-written `<progress>` takes at least two values during the animation;
  - samples in `display: none`, `hidden` and a closed `<details>` draw at size once revealed;
  - the source link's `href` is `https://github.com/{repo}/blob/{branch}/{dir}/{page}.md`;
  - an edit redraws;
  - every request is on the site's origin.

  It fails.
- [ ] 9.2 Extend `test/site/`:
  - `.vitepress/config.ts`: a `chart.js` alias to a local module re-exporting Chart.js, `optimizeDeps.exclude: ['vitepress-theme-chartjs']`, and `themeConfig.source`;
  - the theme: `imports` loading `{Utils}` (with `Utils.Chart`) and registering a date adapter, plus the stylesheet;
  - pages: time scale, HTML legend, progress bar, hidden panels (`display: none`, `hidden`, `<details>`) and verbatim characters.

  Add the site's devDependencies (the date adapter).
- [ ] 9.3 Add the lowest-peers CI job (D20): build the example site against `vitepress@1.6.0`, `vue@3.5.0` and `chart.js@4.0.0`.

## 10. P10: Release, first-release procedure and README

- [ ] 10.1 Write `test/release-tag.test.ts` (Node). Create a temporary git repository with a `main` branch and run `node scripts/require-release-tag.mjs main`. Assert that it:
  - fails with no tag;
  - passes with `v0.1.0` on a `main` commit;
  - fails when the only `v*` tag is on a side-branch commit not merged into `main`.

  It fails: there is no script.
- [ ] 10.2 Write `scripts/require-release-tag.mjs <ref>`: it exits 1, with a message pointing to MAINTAINING.md, when `git tag --merged <ref> --list 'v*'` is empty.
- [ ] 10.3 Add `.releaserc.json`, copied from zoom: branch `main`, the `conventionalcommits` preset for the analyser and the notes, `@semantic-release/npm` with `tarballDir: "pack"`, `@semantic-release/github` with assets `pack/*.tgz`.
- [ ] 10.4 Add `.github/workflows/release.yml`, copied from zoom's `release` job:
  - `workflow_dispatch` with `dry-run`, `concurrency: release`;
  - runs only for `chartjs` on `refs/heads/main`;
  - `contents`, `issues` and `pull-requests: write`, `id-token: write`;
  - pnpm and Node 26;
  - build, `test` and `test:site`, then `npm --version`;
  - then `node scripts/require-release-tag.mjs origin/main`;
  - then `pnpm exec semantic-release` (with `--dry-run` when selected);
  - no docs job.
- [ ] 10.5 Update `package.json`: remove `private`; add `prepack: pnpm run build`, `semantic-release ^25.0.9`, `conventional-changelog-conventionalcommits ^9.3.1`, `repository`, `homepage` and `keywords`. Add `/pack` to `.gitignore`. Add zoom's Dependabot ignore rules for the majors of those two packages.
- [ ] 10.6 Write `MAINTAINING.md`, adapted from zoom:
  - making a release;
  - what decides the version (`fix:` patch, `feat:` minor, `!` major);
  - what a release does;
  - the setup it depends on (squash title, ruleset, trusted publisher);
  - when a release fails halfway;
  - the first release, done by hand by a chartjs npm maintainer:
    1. on a `main` commit containing this piece, set the version to 0.1.0 without committing, run `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm pack`, then `npm publish vitepress-theme-chartjs-0.1.0.tgz --access public`;
    2. push the tag `v0.1.0` on that same commit and create the GitHub release `v0.1.0`;
    3. on npmjs.com, add the trusted publisher (GitHub Actions, `chartjs`, `vitepress-theme-chartjs`, `release.yml`, no environment) and the chartjs organisation as owner;
    4. from then on, run the `Release` workflow, which continues from `v0.1.0`.
- [ ] 10.7 Write the README usage section: install, configuration, theme, stylesheet, sample format, block markers, and the `optimizeDeps.exclude` note for sites that alias `chart.js`. Use the configuration P9 proved.
- [ ] 10.8 After merge, maintainers:
  - change the repository settings in design D17;
  - carry out the first-release steps above;
  - run the workflow with dry run to confirm it reports no release, or 0.1.x, and not 1.0.0;
  - tell Chart.js that `^0.1.0` is available and that P8 must add the package to `optimizeDeps.exclude`.
