## Purpose

How a new version of the package reaches npm.

## ADDED Requirements

### Requirement: Releases are started by hand

Releasing SHALL happen only when a maintainer starts the release workflow on `main`. Merging SHALL release nothing.

#### Scenario: Merging a pull request
- **WHEN** a pull request is merged
- **THEN** no version is published

#### Scenario: Running the release workflow
- **WHEN** a maintainer runs the release workflow on `main` and the commits since the last release call for one
- **THEN** the build and all tests run, the tag `v{version}` is pushed, the version is published to npm with provenance through trusted publishing, and a GitHub release with generated notes and the package tarball is created

#### Scenario: Dry run
- **WHEN** a maintainer runs the workflow with dry run selected
- **THEN** it reports the version and notes it would release, and publishes nothing

#### Scenario: Failing tests
- **WHEN** a test fails during the release workflow
- **THEN** no tag is pushed and nothing is published

#### Scenario: A fork or another branch
- **WHEN** the workflow runs in a fork or on a branch other than `main`
- **THEN** it releases nothing

### Requirement: The version comes from pull request titles

The next version SHALL be derived from the Conventional Commits subjects of the squash commits since the last release tag, and pull request titles MUST be checked to be conventional.

#### Scenario: A fix
- **WHEN** the only releasing commit since `v0.1.0` is titled `fix: ...`
- **THEN** the release is 0.1.1

#### Scenario: A feature
- **WHEN** a commit since `v0.1.0` is titled `feat: ...`
- **THEN** the release is 0.2.0

#### Scenario: Nothing to release
- **WHEN** the commits since the last release are only `docs:`, `chore:`, `ci:`, `test:`, `refactor:`, `build:` or `style:`
- **THEN** the workflow releases nothing

#### Scenario: A non-conventional title
- **WHEN** a pull request's title is not a Conventional Commits subject
- **THEN** the pull request's title check fails

### Requirement: The first release is published by hand

The first version, 0.1.0, SHALL be published by hand by a chartjs npm maintainer, and SHALL be tagged `v0.1.0` on the commit it was built from. The release workflow MUST refuse to run while no release tag exists.

#### Scenario: Before the first release
- **WHEN** the release workflow is started and no `v*` tag exists
- **THEN** it fails before computing a version and publishes nothing

#### Scenario: The first automated release
- **WHEN** `v0.1.0` exists on `main` and the workflow runs after a `fix:` commit
- **THEN** it releases 0.1.1, not 1.0.0

