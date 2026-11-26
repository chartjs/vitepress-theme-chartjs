// Prism's core with only the JavaScript grammar, in manual mode. The flags load first; the grammars then extend the
// `Prism` global that the core sets, and the restore puts the page's own `Prism` back. Imports are evaluated in order.
import './prism-flags.js'
import Prism from 'prismjs/components/prism-core'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import './prism-restore.js'

export default Prism
