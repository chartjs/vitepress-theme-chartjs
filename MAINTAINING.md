# Maintaining

## Releases

Releases are made by [semantic-release](https://semantic-release.gitbook.io/) from the commits on `main`. There is no
version to bump and no release to draft: `package.json` carries the placeholder `0.0.0-development`, and the version is
derived from the commit history when publishing.

### Making a release

Run the `Release` workflow on `main`: Actions → Release → Run workflow, or

```sh
gh workflow run release.yml --ref main
```

Tick `dry-run` (`-f dry-run=true`) to only see the version and the release notes it would produce. Nothing is released
by merging.

### What decides the version

Pull requests are squash merged, and the squash commit takes the pull request title as its subject. That subject decides
what the next release is. It has to follow [Conventional Commits](https://www.conventionalcommits.org/), which the
`PR title` check enforces:

| Title                                                                               | Release |
| ----------------------------------------------------------------------------------- | ------- |
| `fix: ...`, `perf: ...`                                                             | patch   |
| `feat: ...`                                                                         | minor   |
| any type with `!` (`feat!: ...`), or a `BREAKING CHANGE:` footer in the commit body | major   |
| `docs:`, `chore:`, `ci:`, `test:`, `refactor:`, `build:`, `style:`                  | none    |

Use a releasing type only when the published package changes. The scope does not matter. While the version is 0.x, a
breaking change still releases 1.0.0, so mark one only when that is meant.

Only `main` releases, always to the `latest` npm tag. Prereleases and the `next` tag are not set up.

Dependabot titles its pull requests `chore(deps): ...` or `chore(deps-dev): ...`, which do not call for a release. If a
bump changes what is published (a bundled dev dependency such as Prism or acorn, or a peer range), edit the title to
`fix(deps): ...` before merging. Dependabot leaves the major versions of `semantic-release` and
`conventional-changelog-conventionalcommits` alone: they have to be updated together, by hand.

Text in the commit body ends up in the release notes: a bare `#123` there is listed as an issue the release closes. Use a
URL to refer to an issue the commit does not close.

### What a release does

The `Release` workflow:

1. runs the build and every test: `pnpm test` and `pnpm test:site`;
1. checks that a version tag, `v<major>.<minor>.<patch>` such as `v0.1.0`, is reachable from `main`
   (`scripts/require-release-tag.mjs`), and stops if not: without one, semantic-release would release 1.0.0 (see
   [The first release](#the-first-release)). Tags such as `vnext` or `v1-beta` do not count;
1. when the commits since the last tag call for a release, pushes the `v{version}` tag;
1. publishes the package to [npm](https://www.npmjs.com/package/vitepress-theme-chartjs) with provenance, through npm
   trusted publishing (OIDC): there is no npm token to maintain;
1. creates the GitHub release with generated notes and the package tarball;
1. comments on the pull requests and issues the release includes.

There is no changelog file; the release notes are the changelog.

### Setup the release depends on

- **GitHub:**
  - squash merging only, with the pull request title as the commit subject, and branches deleted on merge;
  - a ruleset on `main` that requires a pull request, the `CI` checks and `PR title / lint`;
  - Actions allowed to write contents, issues and pull requests.
- **npm:** the package `vitepress-theme-chartjs` has a trusted publisher: GitHub Actions, organisation `chartjs`,
  repository `vitepress-theme-chartjs`, workflow `release.yml`, no environment. The chartjs npm organisation owns it.

### When a release fails halfway

semantic-release pushes the tag first, then publishes to npm, then creates the GitHub release. What to do depends on how
far it got:

- **npm does not have the version** (`npm view vitepress-theme-chartjs versions`): delete the remote tag and start the
  `Release` workflow again. Without the tag semantic-release computes the same version again. Start a new run rather
  than re-running the failed one, which would use the commit it ran on even if `main` has moved. A run with the tag in
  place does nothing, because the commits count as released.
- **npm has the version but the GitHub release is missing**: do not delete the tag, since publishing the same version
  again fails. Create the GitHub release for the tag by hand, with the tarball from `npm pack vitepress-theme-chartjs@<version>`.

### The first release

The first version, 0.1.0, is published by hand by a chartjs npm maintainer. semantic-release takes the last release from
the version tags (`v<major>.<minor>.<patch>`) reachable from `main`, and with none its first run would release 1.0.0; the workflow refuses to run until
the tag is there. From `v0.1.0`, a `fix:` releases 0.1.1, a `feat:` 0.2.0 and a `feat!:` 1.0.0.

1. On a `main` commit that contains the release workflow, set the version without committing it, then build, pack and
   publish:

   ```sh
   git switch --detach <commit>
   npm version 0.1.0 --no-git-tag-version
   pnpm install --frozen-lockfile
   pnpm build
   pnpm pack
   npm publish vitepress-theme-chartjs-0.1.0.tgz --access public
   git restore package.json
   ```

1. Push the tag `v0.1.0` on exactly that commit, and create the GitHub release `v0.1.0` by hand, attaching the tarball:

   ```sh
   git tag v0.1.0 <commit>
   git push origin v0.1.0
   gh release create v0.1.0 vitepress-theme-chartjs-0.1.0.tgz --verify-tag --title v0.1.0 --notes "First release."
   ```

1. On npmjs.com, add the trusted publisher (GitHub Actions; organisation `chartjs`; repository
   `vitepress-theme-chartjs`; workflow `release.yml`; no environment), and add the chartjs npm organisation as owner.
1. From then on, run the `Release` workflow, which continues from `v0.1.0`. A first dry run should report no release, or
   0.1.x, and never 1.0.0.

0.1.0 has no provenance, since it was not published from the workflow; later versions do.
