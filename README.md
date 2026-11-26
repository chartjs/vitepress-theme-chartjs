# vitepress-theme-chartjs

VitePress theme pieces for Chart.js docs: the live chart editor for samples.

A fenced code block marked `chart-editor` becomes an editor: the reader sees the chart, the sample's code in tabs, the
lines it logs and its action buttons, and every edit redraws the chart half a second after typing stops. It is used by
the Chart.js documentation and its plugins' sites.

## Install

```sh
pnpm add -D vitepress-theme-chartjs
```

The site provides the peers: `vitepress ^1.6.0`, `vue ^3.5.13` and `chart.js ^4.0.0`. The package has no dependencies
of its own and uses the site's copies of these three. It is ESM only.

## Set up

The site configuration turns the fences into editors, and gives the repository the source links point to:

```ts
// .vitepress/config.ts
import { defineConfigWithTheme } from 'vitepress'
import type { ChartjsThemeConfig } from 'vitepress-theme-chartjs'
import { chartEditor } from 'vitepress-theme-chartjs/markdown'

export default defineConfigWithTheme<ChartjsThemeConfig>({
  markdown: {
    config: (md) => {
      chartEditor(md)
    },
  },
  themeConfig: {
    // Each editor links to its page's source: https://github.com/<repo>/blob/<branch>/<dir>/<page>.md
    source: { repo: 'chartjs/Chart.js', branch: 'master', dir: 'docs' },
  },
})
```

The theme registers the component and loads the stylesheet:

```ts
// .vitepress/theme/index.ts
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { chartEditorPlugin } from 'vitepress-theme-chartjs'
import 'vitepress-theme-chartjs/style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(chartEditorPlugin, { imports: () => import('./chart-imports') })
  },
} satisfies Theme
```

`app.use(chartEditorPlugin, options)` registers `<ChartEditor>` globally, which is what the fences render to. The
`imports` option is optional: it loads the names the samples see beside `Chart`, and is called once, in the browser
only, before the first sample runs. Each name must be usable as a `const` in strict-mode code.

Without the stylesheet the editor still works, unstyled. The styles are scoped under `.chart-editor`, and its colours
are `--chartjs-*` custom properties with fallbacks, which a site can set.

### Register what the samples draw

The package imports `Chart` from the site's `chart.js` and registers nothing on it, so that the site keeps its
tree-shaking. The site registers the controllers, elements, scales and plugins its samples use, usually in the module
its `imports` load. Without that, a bar sample fails with `"bar" is not a registered controller.`

```ts
// .vitepress/theme/chart-imports.ts
import { Chart, registerables } from 'chart.js'
import 'chartjs-adapter-luxon' // for time scales

Chart.register(...registerables)

// What the samples see as locals, beside Chart.
export const Utils = {
  numbers: (count: number) => Array.from({ length: count }, () => Math.round(Math.random() * 100)),
}
```

### A site that aliases `chart.js`

A site that resolves `chart.js` to a build of its own, as Chart.js's docs do with an alias, also excludes the package,
and any other package that imports `chart.js`, from dependency pre-bundling. Otherwise the dev server bundles another
copy of Chart.js into them, and the samples get a `Chart` on which the site registered nothing:

```ts
// .vitepress/config.ts
export default defineConfigWithTheme<ChartjsThemeConfig>({
  vite: {
    resolve: { alias: [{ find: /^chart\.js$/, replacement: '/path/to/chart.js' }] },
    optimizeDeps: { exclude: ['vitepress-theme-chartjs', 'chartjs-adapter-luxon'] },
  },
})
```

## Samples

A sample is a fence whose info string has ` chart-editor` after the language. Its code arrives as written:

````md
```js chart-editor
const config = {
  type: 'bar',
  data: {
    labels: ['Red', 'Blue', 'Yellow'],
    datasets: [{ label: 'Votes', data: [12, 19, 3] }],
  },
}

const actions = [
  {
    name: 'Randomize',
    handler(chart) {
      chart.data.datasets[0].data = chart.data.datasets[0].data.map(() => Math.round(Math.random() * 20))
      chart.update()
    },
  },
]

module.exports = { config, actions }
```
````

The code runs as the body of a strict-mode function, in the page, with these locals: `Chart`, the names from `imports`,
a `console` whose `log` goes to the editor, and `module`. It exports, on `module.exports`:

- `config`: the chart's configuration, passed to Chart.js as it is;
- `actions`: optional, buttons under the chart, each `{ name, handler(chart) }`. They are read from the first run that
  succeeds;
- `output`: optional. With it the editor opens on an Output tab, which shows the lines the sample logs, newest first,
  the last 50; a string is shown while there are none, and `true` shows `...`.

An edit that throws, or a configuration that Chart.js rejects, shows the error and keeps the chart drawn as it was. The
chart is created once, then updated in place on each edit, and destroyed when the page is left. On the server each
editor renders an empty placeholder; nothing is evaluated there.

### Tabs

Comments mark the parts of a sample that get a tab of their own:

```js
// <block:setup:1>
const data = { labels: ['a', 'b', 'c'], datasets: [{ data: [1, 3, 2] }] }
// </block:setup>

// <block:config:0>
const config = { type: 'line', data }
// </block:config>

module.exports = { config }
```

`<block:name:order>` opens a block and `</block:name>` closes it; the tabs are ordered by the number, so this sample
shows `config`, then `setup`. Code outside the blocks, here the `module.exports` line, is hidden from the reader but
runs. A sample with no blocks has a single `JS` tab with the whole code.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) to work on the package, and [MAINTAINING.md](MAINTAINING.md) for releases.

## License

[MIT](LICENSE)
