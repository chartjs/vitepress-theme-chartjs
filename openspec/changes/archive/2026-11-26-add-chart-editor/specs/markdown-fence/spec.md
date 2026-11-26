## Purpose

Which fenced code blocks in a VitePress page become live chart editors, and how their code reaches the editor.

## ADDED Requirements

### Requirement: Taking over chart-editor fences

The markdown plugin SHALL render a fence as a live chart editor when its trimmed info string contains ` chart-editor` followed by a space or the end of the string. It SHALL render every other fence exactly as the site would without the plugin.

#### Scenario: A sample fence
- **WHEN** a page contains a fence whose info string is `js chart-editor`
- **THEN** the page shows a live chart editor in its place instead of a highlighted code block

#### Scenario: Further words after the marker
- **WHEN** the info string is `js chart-editor extra`
- **THEN** the fence is rendered as a live chart editor

#### Scenario: Other fences
- **WHEN** the info string is `js`, a bare `chart-editor`, or `js chart-editors`
- **THEN** the fence is rendered byte for byte as it is without the plugin

### Requirement: Verbatim code

The code of a taken-over fence MUST reach the editor unchanged.

#### Scenario: Characters that templates or HTML treat specially
- **WHEN** the fence's code contains backticks, `${}`, single and double quotes, `{{ }}`, `</script>`, backslashes, text that looks like an HTML entity such as `&amp;` or `&#39;`, or non-ASCII characters
- **THEN** the editor shows and runs exactly the characters written in the fence

### Requirement: Usable in a site configuration

The markdown entry point SHALL load in Node without a browser and without Vue.

#### Scenario: Loading the site configuration
- **WHEN** a VitePress configuration imports the markdown entry point and installs the plugin
- **THEN** the configuration loads and the site builds

