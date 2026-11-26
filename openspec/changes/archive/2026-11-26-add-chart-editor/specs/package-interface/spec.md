## Purpose

What a site gets from the package: the entry points and their names, the installer, the stylesheet, the types, the peers, and sharing one Chart.js with the site.

## ADDED Requirements

### Requirement: Entry points and names

The package SHALL provide these, as compiled ESM with type declarations:
- `vitepress-theme-chartjs/markdown`, exporting the fence plugin `chartEditor`;
- `vitepress-theme-chartjs`, exporting the component `ChartEditor`, the installer `chartEditorPlugin` and the type `ChartjsThemeConfig`;
- the stylesheet `vitepress-theme-chartjs/style.css`.

The installer SHALL register the component globally under the name `ChartEditor`. The JavaScript entries MUST NOT import CSS.

#### Scenario: The markdown entry
- **WHEN** a site configuration imports `chartEditor` from `vitepress-theme-chartjs/markdown` and calls it with its markdown-it instance
- **THEN** chart-editor fences become editors

#### Scenario: The main entry
- **WHEN** a theme imports `ChartEditor`, `chartEditorPlugin` and the type `ChartjsThemeConfig` from `vitepress-theme-chartjs`
- **THEN** all three resolve, at run time and in type-checking

#### Scenario: Global registration
- **WHEN** a theme calls `app.use(chartEditorPlugin, options)`
- **THEN** any page can use `<ChartEditor>`, which the fence plugin emits, without importing it

#### Scenario: Installing without options
- **WHEN** a theme calls `app.use(chartEditorPlugin)` with no options
- **THEN** samples that use only `Chart` and `console` run, and draw their charts with what the site has registered on Chart.js

#### Scenario: Styling
- **WHEN** the site imports `vitepress-theme-chartjs/style.css`
- **THEN** the editor is styled

#### Scenario: Without the stylesheet
- **WHEN** the site does not import the stylesheet
- **THEN** no editor CSS is loaded, and the editor still works

### Requirement: Types

The package SHALL ship type declarations for the installer options, and for a theme configuration that extends VitePress's default theme configuration with `source: {repo, branch, dir}`.

#### Scenario: Type-checking a site
- **WHEN** a site's TypeScript code uses `ChartjsThemeConfig` and passes options to `chartEditorPlugin`
- **THEN** it type-checks, and a wrong option type is reported

### Requirement: Peers

The package SHALL declare `vitepress ^1.6.0`, `vue ^3.5.13` and `chart.js ^4.0.0` as peer dependencies, and SHALL use the site's copies of them.

#### Scenario: Installing outside the ranges
- **WHEN** a site installs the package alongside a peer outside these ranges
- **THEN** the package manager warns about the unmet peer

### Requirement: One Chart.js

The editor SHALL use the same Chart.js module as the site's own code, including when the site resolves `chart.js` to a file of its own.

#### Scenario: A built site that aliases Chart.js
- **WHEN** a site aliases `chart.js` to its own build and its imports register a date adapter
- **THEN** in the built site a sample's `Chart` is the site's Chart.js, and a time-scale sample renders

#### Scenario: The dev server of a site that aliases Chart.js
- **WHEN** such a site lists `vitepress-theme-chartjs` in `optimizeDeps.exclude` and runs the dev server
- **THEN** a sample's `Chart` is the site's Chart.js, and a time-scale sample renders

