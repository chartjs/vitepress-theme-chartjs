## Why

The Chart.js documentation is moving from VuePress to VitePress (chartjs/Chart.js, change `migrate-docs-to-vitepress`, decision D3). Its live, editable chart samples need a VitePress chart editor shipped as the npm package `vitepress-theme-chartjs`. Chart.js piece P8 and every piece after it wait on the first release of this package. The editor already exists as a local Vue 3 port in chartjs-plugin-zoom's docs (pull request 972, commit 1a2812f). It cannot be reused as it is: it imports its consumer's own sample-imports module, imports CSS from JavaScript, and fails during server rendering when Vite leaves it external. This change extracts that editor into a package with the entry points and behaviour Chart.js has agreed to, and sets up the repository to test and release it.

## What Changes

- A markdown-it plugin turns every `chart-editor` fence into the editor component and passes the sample code through unchanged.
- An editor component and an installer:
  - the editor draws the chart in the page's own document, splits the code into tabs, re-evaluates edits after 500 ms, and shows errors, console output, action buttons and a source link;
  - the names samples can use come from an `imports` option, which is called once and only in the browser.
- Server rendering shows a placeholder. Importing either entry in Node touches no browser globals; all browser-only code loads lazily after mount.
- A stylesheet entry, separate from the JavaScript.
- The package is ESM, compiled, with type declarations. `chart.js`, `vue` and `vitepress` are peer dependencies.
- Tests:
  - unit tests in Node;
  - component tests in a real browser;
  - a server-rendering test of the built files;
  - a static check that the built files make no network request;
  - an example VitePress site built against the package as installed, in build and in dev.
- Continuous integration on pull requests and a pull-request title check.
- Releases as in chartjs-plugin-zoom: semantic-release started by hand, npm trusted publishing with provenance, and `0.0.0-development` in `package.json`. The first release, 0.1.0, is published by hand by a chartjs npm maintainer.

## Capabilities

### New Capabilities

- `markdown-fence`: which fences become editors, and that their code arrives unchanged.
- `sample-format`: how sample code runs, and what it exports.
- `chart-editor`: what a reader sees and can do with a live sample.
- `server-rendering`: behaviour when pages are rendered on the server and hydrated.
- `package-interface`: entry points, stylesheet, types, peers and sharing one Chart.js with the site.
- `package-release`: how a version reaches npm.

### Modified Capabilities

None.

## Impact

- New repository content in chartjs/vitepress-theme-chartjs: source, tests, example site, workflows, `CONTRIBUTING.md`, `MAINTAINING.md` and the README.
- A new npm package, `vitepress-theme-chartjs`, first published as 0.1.0.
- Chart.js P8 consumes `^0.1.0`. Besides the agreed contract, it must add the package to `optimizeDeps.exclude`, next to the date adapter.
- Repository settings and npm settings to be changed by maintainers (see design, D15 and D16).

