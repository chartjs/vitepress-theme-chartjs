// Usage: node scripts/require-release-tag.mjs <ref>
//
// semantic-release takes the last release from the version tags (`v<major>.<minor>.<patch>`, such as v0.1.0) reachable
// from the release branch. With none, its first run would release 1.0.0, so the release workflow runs this first: it
// fails unless a version tag is reachable from <ref>. A tag on a commit that <ref> does not contain does not count, and
// neither does a tag such as `vnext` or `v1-beta`, which semantic-release would not read as a version.
// Node rather than shell, so that it also runs on Windows.
import { execFileSync } from 'node:child_process'

const VERSION_TAG = /^v\d+\.\d+\.\d+$/

const ref = process.argv[2]
if (!ref) {
  console.error('Usage: node scripts/require-release-tag.mjs <ref>')
  process.exit(2)
}

const tags = execFileSync('git', ['tag', '--merged', ref, '--list', 'v*'], { encoding: 'utf8' })
  .split('\n')
  .map((tag) => tag.trim())
  .filter((tag) => VERSION_TAG.test(tag))

if (!tags.length) {
  console.error(
    `No version tag (such as v0.1.0) is reachable from ${ref}, so semantic-release would release 1.0.0.\n` +
      'The first release, 0.1.0, is published by hand and tagged v0.1.0: see "The first release" in MAINTAINING.md.'
  )
  process.exit(1)
}
