// The runtime chunk, loaded by the shell after mount. It is the only module that imports chart.js and Prism (and, from
// later pieces, vitepress and acorn).
export { default as LiveEditor } from './LiveEditor.vue'
