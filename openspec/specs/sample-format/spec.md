# sample-format Specification

## Purpose

How the code of a live sample is run, which names it can use, and what it exports to the editor.

## Requirements

### Requirement: Sample environment

Sample code SHALL run as the body of a strict-mode function in which these are available without being imported:
- `Chart`;
- every name provided by the site's imports;
- a `console`;
- `module`, with an empty `exports`.

#### Scenario: Using Chart and the site's names
- **WHEN** a sample uses `Chart` and a name the site provides, such as `Utils`
- **THEN** it runs without importing either

#### Scenario: Strict mode
- **WHEN** a sample assigns to a variable it never declared
- **THEN** the editor shows an error

#### Scenario: Shadowing a provided name
- **WHEN** a sample declares its own variable with the same name as a provided one
- **THEN** the sample runs and uses its own variable

#### Scenario: A provided name that is not an identifier
- **WHEN** the site's imports provide a name that is not a JavaScript identifier, such as `my-lib`
- **THEN** each editor shows an error naming it instead of running the sample

### Requirement: Chart configuration

The editor SHALL draw the chart from the object the sample exports as `config`. That same object SHALL be the configuration Chart.js receives. On later evaluations the edited `data` and `options` SHALL be applied to the existing chart.

#### Scenario: The exported object is the chart's
- **WHEN** a sample keeps a reference to the object it exported as `config`, and an action changes `config.data.datasets[0].data` through that reference and calls `chart.update()`
- **THEN** the chart shows the changed values

#### Scenario: An edit changes data and options
- **WHEN** the reader edits the sample's data values and an option such as the title text
- **THEN** the same chart animates to the new values and shows the new title, without being recreated

### Requirement: Actions

The editor SHALL show one button per action that a sample exports as `actions` (`{name, handler}`). It SHALL read the actions only from the first evaluation that succeeds.

#### Scenario: Pressing an action
- **WHEN** a sample exports two actions and the reader presses the second button
- **THEN** that action's handler runs with the chart

#### Scenario: Editing the actions
- **WHEN** the reader edits the code so that it exports different actions
- **THEN** the buttons stay as they were after the first evaluation that succeeded

#### Scenario: A first run that throws
- **WHEN** the sample throws on its first run, and the reader then edits it so that it runs and exports actions
- **THEN** the editor shows those actions' buttons, and they stay after later edits

### Requirement: Console output

When a sample exports a truthy `output`, the editor SHALL show an Output tab with the last 50 lines the sample logged, newest first. Lines SHALL accumulate across evaluations. When `output` is a string and nothing has been logged, the editor SHALL show that string as a placeholder.

#### Scenario: Logging
- **WHEN** a sample exports `output: true` and logs 60 lines
- **THEN** the Output tab shows the last 50 lines, newest first

#### Scenario: Lines across edits
- **WHEN** a sample logs 30 lines on load and 30 more after an edit
- **THEN** the Output tab shows the last 50 of all 60 lines, newest first

#### Scenario: Placeholder
- **WHEN** a sample exports `output: 'Click a bar'` and has logged nothing
- **THEN** the Output tab shows `Click a bar`

#### Scenario: No output declared
- **WHEN** a sample does not export `output`
- **THEN** there is no Output tab

### Requirement: Code blocks

Comments whose text matches `^\s*<(\/?)block:([\w\s]+)(?::(\d+))?>\s*$` SHALL mark named blocks.
- Each named block SHALL become an editor tab, ordered by its number.
- With no named block there SHALL be a single tab.
- Code outside named blocks SHALL be hidden but SHALL still run.

#### Scenario: Named blocks
- **WHEN** a sample has blocks `config:1` and `setup:0`
- **THEN** the editor shows a `setup` tab, then a `config` tab

#### Scenario: No markers
- **WHEN** a sample has no block markers
- **THEN** the editor shows one tab with the whole code

#### Scenario: Hidden code
- **WHEN** a sample has code outside its named blocks
- **THEN** that code is not shown and still runs on every evaluation

#### Scenario: A marker inside a string
- **WHEN** marker text appears inside a string or template literal
- **THEN** it does not create a tab

#### Scenario: A closing marker for another block
- **WHEN** a closing marker names a block other than the open one
- **THEN** it is ignored
