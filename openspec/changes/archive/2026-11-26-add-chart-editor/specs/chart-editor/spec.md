## Purpose

What a reader sees and can do with a live chart sample on a documentation page.

## ADDED Requirements

### Requirement: Drawing in the page

Once the page is mounted, the editor SHALL draw the chart above the code editor, in the page's own document, with no iframe or shadow root. The editor's root element SHALL carry the class `chart-editor`, and the chart's container the class `chart-view`.

#### Scenario: Opening a page with a sample
- **WHEN** a reader opens a page with a sample
- **THEN** a chart is drawn above an editor showing the sample's code

#### Scenario: Elements written in the page
- **WHEN** a sample looks up an element that the page's markdown defines, such as a legend container
- **THEN** it finds that element

#### Scenario: A progress bar written in the page
- **WHEN** a sample updates a `<progress>` element written in the page's markdown from its animation callbacks
- **THEN** the element's value changes while the chart animates

#### Scenario: Styling hooks
- **WHEN** a site styles `.chart-editor` or `.chart-view`
- **THEN** the style applies to the editor and to the chart container

### Requirement: Editing

The editor SHALL re-evaluate the sample 500 ms after the reader's last keystroke. The first successful evaluation SHALL create the chart. Later ones SHALL replace its data and options and update the same chart.

#### Scenario: Stopping typing
- **WHEN** the reader changes the code and stops typing for 500 ms
- **THEN** the chart is updated from the edited code, without being recreated

#### Scenario: Typing continuously
- **WHEN** the reader keeps typing with less than 500 ms between keystrokes
- **THEN** nothing is evaluated and a busy indicator is shown

#### Scenario: The Tab key
- **WHEN** the reader presses Tab in the code
- **THEN** two spaces are inserted and focus stays in the editor

#### Scenario: Highlighting
- **WHEN** the editor is shown on a page that also has ordinary highlighted code blocks
- **THEN** the sample's code is highlighted, and the page's other code blocks are left as the site rendered them

### Requirement: Errors

When evaluation throws, or Chart.js rejects the configuration, the editor MUST keep the previous chart. It MUST show the error message in a way that both pointer and keyboard users can reach.

#### Scenario: A failing edit
- **WHEN** the edited code throws
- **THEN** the last good chart stays, and an error indicator is shown whose message can be read by hovering it or by focusing it

#### Scenario: An invalid configuration
- **WHEN** the edited code exports a configuration that Chart.js rejects, such as an unknown chart type
- **THEN** the last good chart stays and the message is shown

#### Scenario: Recovering
- **WHEN** a later edit evaluates successfully
- **THEN** the error indicator disappears

### Requirement: Hidden at first

A chart whose editor is hidden when the page loads SHALL draw at full size when it is shown.

#### Scenario: Hidden by style
- **WHEN** a sample sits inside an element with `display: none` that is later shown
- **THEN** the chart is drawn at the size of its container

#### Scenario: Hidden by attribute
- **WHEN** a sample sits inside an element with the `hidden` attribute that is later removed
- **THEN** the chart is drawn at the size of its container

#### Scenario: Inside a closed details element
- **WHEN** a sample sits inside a closed `<details>` that the reader opens
- **THEN** the chart is drawn at the size of its container

### Requirement: Leaving the page

The editor SHALL destroy its chart and cancel pending evaluations when its page is left.

#### Scenario: Navigating away
- **WHEN** the reader navigates to another page
- **THEN** the sample's chart is destroyed and no evaluation runs afterwards

### Requirement: Site imports loaded once

The site's imports SHALL be loaded once per site visit, in the browser, before the first sample runs.

#### Scenario: Several samples
- **WHEN** a reader opens a page with three samples and then moves to another page with samples
- **THEN** the site's imports were loaded once

#### Scenario: Imports that fail
- **WHEN** loading the site's imports fails
- **THEN** each editor shows the error instead of a chart

### Requirement: Source link

When the site configures a source repository, each editor SHALL link to `https://github.com/{repo}/blob/{branch}/{dir}/{source path of the page}`, opening in a new tab. Otherwise it SHALL show no link.

#### Scenario: Following the link
- **WHEN** the site configures repo `chartjs/Chart.js`, branch `master` and dir `docs`, and the reader uses the link on `samples/bar/vertical.md`
- **THEN** `https://github.com/chartjs/Chart.js/blob/master/docs/samples/bar/vertical.md` opens in a new tab

#### Scenario: No directory
- **WHEN** the configured dir is empty
- **THEN** the link has no empty path segment

#### Scenario: Not configured
- **WHEN** the site configures no source
- **THEN** the editor shows no source link and still works

### Requirement: Styles stay inside the editor

The editor's styles MUST NOT restyle elements of the page outside the editor.

#### Scenario: A page that uses common class names
- **WHEN** a page outside any editor has elements with the classes `text-muted`, `scrollable` or `text-error`, and the package's stylesheet is loaded
- **THEN** those elements look the same as without the stylesheet

### Requirement: No network requests

The package MUST NOT make network requests. It fetches no fonts, icons, scripts or data from anywhere.

#### Scenario: Using samples
- **WHEN** a reader loads pages with samples, edits code and presses actions
- **THEN** no request made by the package leaves the site's origin, and the package itself fetches nothing

