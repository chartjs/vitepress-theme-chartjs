// The declaration of `vitepress-theme-chartjs/style.css`, which vue-tsc writes as dist/style.d.ts and the export's
// `types` condition names. TypeScript 6 checks side-effect imports, and without it a site's
// `import 'vitepress-theme-chartjs/style.css'` fails unless the site declares every `*.css` module. Nothing builds it as
// JavaScript.
export {}
