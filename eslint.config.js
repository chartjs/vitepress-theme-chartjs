import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      '**/.vitepress/cache',
      '**/.vitepress/dist',
      '**/.vitepress/.temp',
      // The example site's Chart.js build, which test/site.test.ts writes.
      'test/site/vendor',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
    // Prettier lays out the templates, and keeps attributes that fit on one line together.
    rules: { 'vue/max-attributes-per-line': 'off' },
  },
  {
    files: ['src/**'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['test/**', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    // Tests define the apps and stub components they mount, several to a file.
    files: ['test/**'],
    rules: { 'vue/one-component-per-file': 'off' },
  }
)
