## Purpose

What a site gets from the package: entry points, the installer, the stylesheet, types, peers and sharing one Chart.js with the site.

## ADDED Requirements

### Requirement: Entry points

The package SHALL provide, as compiled ESM with type declarations:
- a main entry with the editor component, an installer and the theme configuration type;
- a markdown entry with the fence plugin;
- a stylesheet entry.

The JavaScript entries MUST NOT import CSS.

#### Scenario: Installing in a theme
- **WHEN** a site's theme installs the package's installer on its app with an `imports` option
- **THEN** every page can use the editor component, which the fence plugin emits

#### Scenario: Styling
- **WHEN** the site imports the stylesheet entry
- **THEN** the editor is styled

#### Scenario: Without the stylesheet
- **WHEN** the site does not import the stylesheet entry
- **THEN** no editor CSS is loaded, and the editor still works

### Requirement: Types

The package SHALL ship type declarations for the installer options and for a theme configuration that extends VitePress's default theme configuration with `source: {repo, branch, dir}`.

#### Scenario: Type-checking a site
- **WHEN** a site's TypeScript configuration uses the theme configuration type and passes options to the installer
- **THEN** it type-checks, and a wrong option type is reported

### Requirement: Peers

The package SHALL declare `vitepress ^1.6.0`, `vue ^3.5.0` and `chart.js ^4.0.0` as peer dependencies, and SHALL use the site's copies of them.

#### Scenario: Installing outside the ranges
- **WHEN** a site installs the package alongside a peer outside these ranges
- **THEN** the package manager reports the unmet peer

### Requirement: One Chart.js

The editor SHALL use the same Chart.js module as the site's own code, including when the site resolves `chart.js` to a file of its own, in build and in dev with the setting the README documents.

#### Scenario: A site that aliases Chart.js
- **WHEN** a site aliases `chart.js` to its own build and its imports register a date adapter
- **THEN** a sample's `Chart` is the site's Chart.js, and a time-scale sample renders, in the built site and in the dev server

