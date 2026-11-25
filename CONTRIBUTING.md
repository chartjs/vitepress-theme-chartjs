# Contributing

## Setup

You need Node 26 (see `.node-version`) and pnpm, in the version that `packageManager` in `package.json` names.

```sh
pnpm install
pnpm test
```

| Script            | What it does                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`      | Builds `dist/` with Vite's library mode and writes the type declarations with `vue-tsc`.                                                                                  |
| `pnpm lint`       | ESLint, then Prettier's check.                                                                                                                                            |
| `pnpm typecheck`  | Type-checks the sources, tests and configuration.                                                                                                                         |
| `pnpm test`       | Builds, runs every Vitest test (including `test/dist.test.ts` on `dist/`), then `test:types`.                                                                             |
| `pnpm test:types` | Type-checks the fixtures in `test/types/` with `bundler` and `nodenext` resolution. They import the package by name, so they check `dist/*.d.ts`: run `pnpm build` first. |

While working on one test, `pnpm exec vitest run test/dist.test.ts` runs it alone, on the `dist/` you last built.

CI runs `lint`, `typecheck`, `test` and `publint` on Ubuntu and Windows, and `actionlint` on Ubuntu.

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
- **The JavaScript imports no CSS.** Styles end up in `dist/style.css`, which the site imports itself.

## Pull requests

Pull requests are merged by squash, and the squash commit takes the pull request title. The title must therefore be a
[Conventional Commits](https://www.conventionalcommits.org/) subject, such as `fix: keep the chart when an edit fails`;
the `PR title` check enforces it. The type decides the next release: `fix:` releases a patch, `feat:` a minor version,
and `!` after the type a major one; `chore:`, `docs:`, `test:` and `ci:` release nothing.
