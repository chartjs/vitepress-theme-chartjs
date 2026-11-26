// The entry of the site's own Chart.js build, which test/site.test.ts bundles into vendor/chart.js before it builds
// the site, from the chart.js the site has installed. `chart.js` is aliased to that bundle, as Chart.js's docs alias it
// to their build. The marker lets a sample tell this copy from the installed one, which an unaliased import would get.
import { Chart } from 'chart.js'

Chart.siteBuild = true

export * from 'chart.js'
