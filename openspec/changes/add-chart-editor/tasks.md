## 1. P1: Repository scaffold and CI

- [x] 1.1 Write `test/dist.test.ts`, run in Node on `dist`:
  - import `dist/index.js` with `window`, `document`, `self`, `location` and `localStorage` defined as throwing getters;
  - assert no `.css` specifier in `dist/*.js`, with or without a query such as `?inline`;
  - assert no `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `importScripts`, `@import`, `url(` with an `http(s):` or `//` address in any case, or `import`/`from` of such an address, outside license comments;
  - assert that every JavaScript export has a `types` condition naming an existing `.d.ts`.

  Write `test/types/root.ts`, importing the types `ChartjsThemeConfig`, `ChartEditorOptions` and `ChartAction` from `vitepress-theme-chartjs`, checked with `bundler` resolution (`test/types/tsconfig.json`) and `nodenext` resolution (`tsconfig.nodenext.json`). Both fail: there is no package yet.
- [x] 1.2 Add `package.json`:
  - name `vitepress-theme-chartjs`, `"private": true`, version `0.0.0-development`, `"type": "module"`, license MIT;
  - `packageManager: pnpm@12.21.0`;
  - peers `vitepress ^1.6.0`, `vue ^3.5.0`, `chart.js ^4.0.0`;
  - exports `.` and `./package.json`; `files: ["dist"]`; `sideEffects: ["*.css"]`;
  - scripts `build`, `lint`, `typecheck`, `test` (`pnpm build && vitest run && pnpm test:types`, so it works on a fresh clone) and `test:types` (both fixture configs; it reads `dist/*.d.ts` through the package's exports, so it needs a build);
  - devDependencies: vite, @vitejs/plugin-vue, vitest, vue-tsc, typescript ~6.0, eslint, typescript-eslint, eslint-plugin-vue, prettier, publint, and vitepress, vue and chart.js at current versions.
- [x] 1.3 Add `pnpm-workspace.yaml`, `.node-version` (26), `.editorconfig`, `.gitignore` (`dist`, `node_modules`, `.vitepress/cache`, `.vitepress/dist`, `.vitepress/.temp`), `.prettierrc` (zoom's settings) and `eslint.config.js`.
- [x] 1.4 Add `tsconfig.json` and `tsconfig.build.json` (declarations only, into `dist`). Add `vite.config.ts`: library mode, ES, entry `index`, externals `vue`, `vitepress`, `chart.js`, `cssFileName: 'style'`. Add `vitest.config.ts` with a `node` project.
- [x] 1.5 Add `src/types.ts` (`ChartjsThemeConfig`, `ChartEditorOptions`, `ChartAction`, as in the contract) and `src/index.ts` re-exporting them. Run `pnpm test`; the built-file tests and the type fixtures pass.
- [x] 1.6 Add `.github/workflows/ci.yml`:
  - triggers: pull requests and pushes to `main`, on ubuntu and windows;
  - setup: pnpm, Node 26 with cache, frozen install; no Playwright step, since nothing installs Playwright before the browser project (5.1 adds the step);
  - steps, in this order: lint, typecheck, `test` (which builds and runs the type fixtures), publint, actionlint;
  - actionlint on Linux only, since its action downloads a Linux binary;
  - `contents: read`, with actions pinned by SHA.

  Add zoom's `.github/workflows/pr-title.yml` and `.github/dependabot.yml` (npm and github-actions weekly, `chore` prefix with scope).
- [x] 1.7 Add `CONTRIBUTING.md`:
  - setup (Node 26, pnpm) and scripts;
  - the public names are a contract with Chart.js;
  - only the runtime chunk may import browser-only modules or touch browser globals;
  - no network requests;
  - Conventional Commits pull request titles, with squash merge.

  Extend the README's description with the project's status.

## 2. P2: Markdown plugin

- [x] 2.1 Write `test/markdown.test.ts`:
  - render with VitePress's `createMarkdownRenderer` plus the plugin. It keeps one instance per process, so call `disposeMdItInstance()` before each renderer, or a render without the plugin reuses the instance that has it;
  - wrap the HTML in a page SFC as VitePress does, compile it with `@vue/compiler-sfc`, and render it with `vue/server-renderer` around a stub `ChartEditor` that records its `code` prop. A client-mode compile is enough: the server build's compiler-ssr uses the same compiler-core parser, which decodes the entities;
  - assert equality with the fence content for backticks, `${}`, `'` and `"`, `{{ }}`, `</script>`, `\`, `&amp;`, `&#39;`, U+2028 and emoji;
  - assert that `js`, bare `chart-editor` and `js chart-editors` fences render byte for byte as without the plugin.

  Add `test/types/markdown.ts`, importing `chartEditor` from `vitepress-theme-chartjs/markdown`. Both fail.
- [x] 2.2 Write `src/markdown.ts`: keep the previous fence rule; match `/ chart-editor( |$)/` on the trimmed info string; emit `<ChartEditor :code='…' />` with the JSON string, escaping `&` and then `'`. Import types only.
- [x] 2.3 Add the `markdown` entry to `vite.config.ts` and `./markdown` to `exports`. Extend `test/dist.test.ts`: `dist/markdown.js` has no import statements, loads with throwing browser globals, and exports `chartEditor`.

## 3. P3: Evaluator, block parser, debounce and source link

- [x] 3.1 Write `test/runtime/evaluate.test.ts`, with a stub `Chart`:
  - an undeclared assignment throws;
  - imports are visible as locals, and a sample may shadow them;
  - the evaluator's own `Chart` and `console` win over imported names of the same name, so an import named `console` does not stop `log` capturing;
  - a provided name that is not an identifier, such as `my-lib`, or that strict mode cannot declare, such as `default`, `let`, `arguments` or `eval`, or `module`, is rejected with an error naming it;
  - `console.log` lines are captured and joined;
  - `module.exports` `config`, `actions` and `output` are returned, and the config is the same object;
  - a throw propagates.

  It fails: there is no evaluator.
- [x] 3.2 Write:
  - `test/runtime/blocks.test.ts`: tabs ordered by number, an unnumbered block counting as 0; a block name with a space; a block-comment marker whose text ends in a newline; a single tab without markers; one tab with the whole code when every named block is empty; hidden code kept for evaluation; a marker in a string or template ignored; a mismatched close ignored; tabs are the same objects as their entries in `blocks`; an edited tab rejoined by `joinBlocks` lands at its position and the code still parses, also for the single tab;
  - `test/runtime/debounce.test.ts`, with fake timers: the call comes 500 ms after the last one, with its arguments, and `cancel()` stops it;
  - `test/runtime/source-link.test.ts`: uses the file path, skips an empty `dir`, encodes the path's segments but not the branch, returns `undefined` without `source`, `repo` or `branch`.
- [x] 3.3 Implement `src/runtime/evaluate.ts`, `blocks.ts` (acorn, latest `ecmaVersion`, `allowReturnOutsideFunction: true` because a sample runs as a function body where `return` is allowed, `onComment`, `joinBlocks`), `debounce.ts` and `source-link.ts`, keeping zoom's logic. Add acorn as a devDependency, since it is bundled.

## 4a. P4a: Editor shell, installer and lazy runtime

- [x] 4.1 Write `test/ssr.test.ts` (Node, on `dist`):
  - `createSSRApp` with `chartEditorPlugin` and a spy `imports`;
  - a template using the global `<ChartEditor code="globalThis.ran = true" />`, not imported;
  - assert: the HTML has `class="chart-editor chart-editor-placeholder"`, `aria-busy="true"` and `class="chart-view"`, the spy was not called, `globalThis.ran` is unset; the same without options.

  It fails.
- [x] 4.2 Extend `test/dist.test.ts` with the import-graph test:
  - parse the static `import` statements of `dist/index.js` and, recursively, of every chunk it imports statically. Rolldown can split shared code (such as `_plugin-vue_export-helper.js`) into chunks that `index.js` imports statically, so `index.js` alone is not the graph;
  - assert that the set of bare specifiers is exactly `{vue}`;
  - assert that `index.js` loads `./runtime.js` with `import()`, and that it is the only file importing `chart.js` or `vitepress`, and the only one containing acorn and Prism.

  Load `vue` before the throwing getters in the browser-globals import test: Vue's runtime-dom tests `typeof window` when it loads. Walk the NodeNext declaration test from the declarations the exports name: the runtime's `*.vue.d.ts` are emitted too, but no public type reaches them.

  Add `test/types/component.ts`, importing `ChartEditor` and `chartEditorPlugin` from `vitepress-theme-chartjs`, calling `app.use(chartEditorPlugin, { imports })`, and rejecting a wrong option and a wrong `code`.
- [x] 4.4 Write `src/plugin.ts`: `chartEditorPlugin.install(app, options = {})` registers `ChartEditor` globally and provides a memoised `loadImports()`, which resolves `{}` when there is no `imports` and forgets a rejection, so the next editor to mount tries again.
- [x] 4.5 Write `src/ChartEditor.ts`, the shell, with `defineComponent` and `h()` rather than as an SFC (D4: an exported SFC's declaration does not resolve under NodeNext): render the placeholder until mounted, then `Promise.all([import('./runtime/index.js'), loadImports()])`; ignore a load that finishes after unmount; when either load fails, render `div.chart-editor.chart-editor-failed[role=alert]` with the message in place of the placeholder. `test/shell.test.ts` mounts the built shell in Node on Vue's `createRenderer` with an in-memory tree, and checks the failure and the retry. Export the shell and the installer from `src/index.ts`. Fix the lazy chunk's file name with `chunkFileNames: '[name].js'` in `vite.config.ts`, so tests and the site can find it. The placeholder has no height of its own until P7's stylesheet gives `.chart-editor-placeholder .chart-view` one.
- [x] 4.6 Write `src/runtime/index.ts`, `LiveEditor.vue` (zoom's `ChartEditor.vue` evaluation with the scope from the loaded imports, actions read on the first evaluation that succeeds, which `test/shell.test.ts` checks) and `ChartView.vue` (zoom's create-on-mount and destroy). Run all tests.

## 4b. P4b: A build-only example site

- [x] 4.3 Write `test/site.test.ts` (build only, with its own Vitest config, `vitest.site.config.ts`, so that a bare `vitest` and `pnpm test` leave it out and work without the site installed):
  - run `vitepress build test/site` with `DEBUG=1`, so that `.vitepress/.temp` is kept;
  - assert that every file in the installed `test/site/node_modules/vitepress-theme-chartjs/dist/` has the same bytes as the root's `dist/`, so a run against a stale copy fails;
  - assert that `.vitepress/.temp/app.js`, or a server chunk, imports `vitepress-theme-chartjs`;
  - assert that the built `index.html` contains the placeholder.

  Add `test/site/` as its own pnpm workspace, since pnpm 12 cannot inject the workspace root into a member ("Empty path after `file:` scheme"):
  - `package.json` with `vitepress-theme-chartjs: file:../..`, the site's own `vue`, `vitepress` and `chart.js`, and `packageManager: pnpm@12.21.0`;
  - `pnpm-workspace.yaml` (`allowBuilds: esbuild`) and its own `pnpm-lock.yaml`;
  - `.vitepress/config.ts` with `chartEditor`;
  - `.vitepress/theme/index.ts` with `chartEditorPlugin` and the default theme (a bare `import 'vitepress-theme-chartjs'` would be dropped, since `sideEffects` marks the JavaScript as free of them);
  - `index.md` with one bar sample.

  `pnpm build` replaces `dist`, and the site's copy is hard links to the old files, so `test:site` is `pnpm build && pnpm test:site:install && vitest run --config vitest.site.config.ts`, where `test:site:install` is `pnpm --dir test/site install --frozen-lockfile` with the hint on failure. Any change to the root's `peerDependencies` or dependency ranges makes that frozen install fail with `local dependency … is outdated`; `test:site` then prints "run `pnpm --dir test/site install` and commit the site lockfile", and CONTRIBUTING.md says so. Make `.gitignore`'s `.vitepress/…` lines match at any depth. Add `test:site` to `ci.yml`, and a Dependabot entry for `/test/site`. `tsconfig.json` names the site's `.vitepress` files (wildcards skip dot folders) and maps `vitepress-theme-chartjs` to `src` and `vitepress` to the root's copy with `paths`, so `pnpm typecheck` checks them before any build or site install, with no file from `test/site/node_modules`.

## 5. P5: Chart lifecycle in the browser

- [ ] 5.1 Add a `browser` project to `vitest.config.ts`: `@vitest/browser-playwright`, Chromium and Firefox, with `vitepress` aliased to a `useData` stub. Exclude `test/browser/**` from the `node` project, whose `test/**/*.test.ts` glob would otherwise pick the browser tests up too. A bare `vitest` then also needs Playwright's browsers installed; say so in CONTRIBUTING, or give the browser tests their own config as P4b did for the site. Write `test/browser/chart.test.ts`:
  - the chart is created after mount from `module.exports.config`, and `chart.data` is the exported `config.data`;
  - a second evaluation updates the same instance with the new data and options;
  - unmount destroys it (`Chart.getChart(canvas)` is undefined);
  - editors inside an element with `display: none`, with the `hidden` attribute, and inside a closed `<details>` each draw at their container's size once revealed;
  - a sample finds an element written beside it;
  - two editors call `imports` once;
  - `app.use(chartEditorPlugin)` with no options runs a sample using `Chart` and `console`;
  - an unknown chart type in a later evaluation keeps the previous chart and exposes the message;
  - a later evaluation that throws keeps the same chart instance (`Chart.getChart(canvas)` unchanged) and sets the error;
  - a rejected `imports` shows its message in the shell's `div.chart-editor.chart-editor-failed[role=alert]` in place of the placeholder, in the page (P4a tests this in Node, on an in-memory renderer);
  - no iframe and no shadow root.

  These must also fail on the changes that P4a's Node tests cannot see, since nothing there draws a chart:
  - `LiveEditor`'s catch clearing `config`;
  - actions read again on later evaluations;
  - the messages out of order (newest first) or past the cap of 50;
  - `destroy()` removed from `ChartView`;
  - `new Chart` never called;
  - the `{}` fallbacks (`inject`'s default and the installer's without `imports`) removed.

  P4a's `test/shell.test.ts` already covers the memo (`??=` turned into `=`), a rejection that is not an `Error`, and a load that settles after unmount rendering and reporting nothing.

  It fails where P4a does not yet behave this way.

  Add the Playwright step to `ci.yml`, after the install: `pnpm exec playwright install --with-deps chromium firefox`.
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
- [ ] 7.3 Port `editor.css` into `src/styles/editor.css`: scope every rule under `.chart-editor`, and give every `--chartjs-*` variable a fallback. Add `./style.css` to `exports`. Give the server placeholder's `.chart-editor-placeholder .chart-view` its fixed height here (D11); until this piece it has none.

## 8. P8: Errors, output, actions and source link

- [ ] 8.1 Write `test/browser/features.test.ts`:
  - a failing edit keeps the chart, and the indicator's message is visible on hover and on keyboard focus, then clears after a good edit;
  - output: the last 50 lines newest first, lines accumulating across edits, including the lines an edit logged before it threw, the string placeholder, no tab without `output`, and changing `output` keeps the reader's edits;
  - actions: buttons in order, the handler receives the chart, buttons unchanged after an edit that exports different actions, and buttons from the first successful edit when the first run throws;
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

  Add the site's dependencies (the date adapter) to `test/site/package.json` and its own `pnpm-lock.yaml`, not to the root.
- [ ] 9.3 Add the lowest-peers CI job (D20): build the example site against `vitepress@1.6.0`, `vue@3.5.0` and `chart.js@4.0.0`. The site's lockfile pins its current versions, so the job installs the site unfrozen or with `pnpm.overrides` for those three, rather than with `--frozen-lockfile`.

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
  - `test` (which builds) and `test:site`, then `npm --version`;
  - then `node scripts/require-release-tag.mjs origin/main`;
  - then `pnpm exec semantic-release` (with `--dry-run` when selected);
  - no docs job.
- [ ] 10.5 Update `package.json`: remove `private`; add `prepack: pnpm run build`, `semantic-release ^25.0.9`, `conventional-changelog-conventionalcommits ^9.3.1`, `repository`, `homepage` and `keywords`. Add `/pack` to `.gitignore`. Add zoom's Dependabot ignore block to the npm entry of `.github/dependabot.yml`, for the semver-major updates of those two packages, with its comment; P1 leaves it out because the packages are not there yet.
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
