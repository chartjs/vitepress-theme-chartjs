// Usage: node scripts/require-release-tag.mjs <ref>
//
// semantic-release takes the last release from the `v*` tags reachable from the release branch. With none, its first
// run would release 1.0.0, so the release workflow runs this first: it fails unless a `v*` tag is reachable from <ref>.
// A tag on a commit that <ref> does not contain does not count. Node rather than shell, so that it also runs on Windows.
import { execFileSync } from 'node:child_process'

const ref = process.argv[2]
if (!ref) {
  console.error('Usage: node scripts/require-release-tag.mjs <ref>')
  process.exit(2)
}

const tags = execFileSync('git', ['tag', '--merged', ref, '--list', 'v*'], { encoding: 'utf8' }).trim()

if (!tags) {
  console.error(
    `No v* tag is reachable from ${ref}, so semantic-release would release 1.0.0.\n` +
      'The first release, 0.1.0, is published by hand and tagged v0.1.0: see "The first release" in MAINTAINING.md.'
  )
  process.exit(1)
}
