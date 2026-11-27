# server-rendering Specification

## Purpose

How the package behaves when a VitePress site renders its pages on the server and hydrates them in the browser.

## Requirements

### Requirement: Importing in Node

Importing either JavaScript entry point in Node MUST NOT touch `window` or `document`.

#### Scenario: Import without browser globals
- **WHEN** both entry points are imported in Node, where any access to `window` or `document` throws
- **THEN** both imports succeed

### Requirement: Placeholder on the server

On the server the editor SHALL render a placeholder, and SHALL neither load the site's imports nor run sample code.

#### Scenario: Server-rendered page
- **WHEN** a page with a sample is rendered on the server
- **THEN** its HTML contains a placeholder with the class `chart-editor`, the site's imports were not loaded, and the sample's code did not run

#### Scenario: Page text without scripts
- **WHEN** a page with samples is fetched without running scripts
- **THEN** the page's own text and navigation are present

### Requirement: Hydration

A server-rendered page with samples SHALL hydrate without mismatch and then show the live editors.

#### Scenario: Opening a built page
- **WHEN** a reader opens a page of a built site
- **THEN** no hydration mismatch is reported and the samples become live charts

### Requirement: External in the server build

The site's server build SHALL work when Vite leaves the package external and Node loads it from `node_modules`.

#### Scenario: Building a site
- **WHEN** a VitePress site using the package is built, and the package is installed as published
- **THEN** the build succeeds and every page with samples is rendered
