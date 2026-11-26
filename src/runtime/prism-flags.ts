// Read by Prism's core when it loads, so it has to run before, in a module of its own (imports are evaluated in order,
// before any statement of the importing module). Manual mode keeps Prism off the page's own code blocks, and the
// worker message handler is not needed.
;(globalThis as { Prism?: unknown }).Prism = { manual: true, disableWorkerMessageHandler: true }
