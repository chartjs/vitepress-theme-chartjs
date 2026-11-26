// Evaluated after Prism's core and grammars, which need the `Prism` global only while they load: puts back the page's
// own `Prism`, or removes the global when the page had none. The editor keeps the instance it imported.
import { pagePrism } from './prism-flags.js'

const scope = globalThis as { Prism?: unknown }

if (pagePrism.had) scope.Prism = pagePrism.value
else delete scope.Prism
