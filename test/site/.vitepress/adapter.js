// The date adapter, which registers itself on the site's Chart.js. A .js module, so that `pnpm typecheck`, which runs
// before the site is installed, does not need the adapter's declarations.
import 'chartjs-adapter-luxon'
