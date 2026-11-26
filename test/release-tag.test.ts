// The release workflow's guard: semantic-release takes the last release from the `v*` tags reachable from the release
// branch, and with none it would release 1.0.0. The guard refuses to go on until a `v*` tag is reachable from the ref it
// is given. Each test builds a repository of its own in a temporary folder and runs the script there.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const script = fileURLToPath(new URL('../scripts/require-release-tag.mjs', import.meta.url))

let repo: string
let env: NodeJS.ProcessEnv

function git(...args: string[]): string {
  const result = spawnSync('git', args, { cwd: repo, env, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`)
  return result.stdout
}

function commit(message: string): void {
  git('commit', '--allow-empty', '--quiet', '-m', message)
}

function guard(ref: string) {
  return spawnSync(process.execPath, [script, ref], { cwd: repo, env, encoding: 'utf8' })
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'release-tag-'))
  // The developer's own git configuration (signing, hooks, the default branch) stays out of it.
  const config = join(repo, '.gitconfig-test')
  writeFileSync(config, '')
  env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: config,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Test',
    GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: 'Test',
    GIT_COMMITTER_EMAIL: 'test@example.com',
  }
  git('init', '--quiet', '--initial-branch=main')
  commit('chore: first')
})

afterEach(() => {
  rmSync(repo, { recursive: true, force: true })
})

describe('require-release-tag', () => {
  it('fails when there is no tag, and points to MAINTAINING.md', () => {
    const result = guard('main')
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('MAINTAINING.md')
  })

  it('passes with v0.1.0 on a main commit', () => {
    git('tag', 'v0.1.0')
    commit('fix: after the first release')
    const result = guard('main')
    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)
  })

  it('fails when the only v* tag is on a side branch not merged into main', () => {
    git('switch', '--quiet', '--create', 'side')
    commit('feat: on the side')
    git('tag', 'v0.1.0')
    git('switch', '--quiet', 'main')
    commit('fix: on main')
    const result = guard('main')
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('MAINTAINING.md')
  })

  it('fails when the tags on main are not v* tags', () => {
    git('tag', 'release-0.1.0')
    const result = guard('main')
    expect(result.status).toBe(1)
  })
})
