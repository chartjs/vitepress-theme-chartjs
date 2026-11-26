// The site's own Chart.js, which `chart.js` is aliased to, as Chart.js's docs alias it to their build. It is a .js
// module, outside what `pnpm typecheck` checks, since the installed file it names is not there before the site's install.
export * from '../node_modules/chart.js/dist/chart.js'
