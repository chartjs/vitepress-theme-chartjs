// The release workflow's guard: semantic-release takes the last release from the version tags (such as v0.1.0)
// reachable from the release branch, and with none it would release 1.0.0. The guard refuses to go on until a version
// tag is reachable from the ref it is given, whatever is checked out. Each test builds a repository of its own in a
// temporary folder and runs the script there.
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

function guard(...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { cwd: repo, env, encoding: 'utf8' })
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

  it('fails when the only version tag is on a side branch not merged into main', () => {
    git('switch', '--quiet', '--create', 'side')
    commit('feat: on the side')
    git('tag', 'v0.1.0')
    git('switch', '--quiet', 'main')
    commit('fix: on main')
    const result = guard('main')
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('MAINTAINING.md')
  })

  it('checks the ref it is given, not what is checked out: the tag is on HEAD, not on main', () => {
    git('switch', '--quiet', '--create', 'side')
    commit('feat: on the side')
    git('tag', 'v0.1.0')
    const result = guard('main')
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('MAINTAINING.md')
  })

  it('checks the ref it is given, not what is checked out: the tag is on main, not on the ref', () => {
    git('branch', 'side')
    git('switch', '--quiet', 'side')
    commit('feat: on the side')
    git('switch', '--quiet', 'main')
    commit('fix: on main')
    git('tag', 'v0.1.0')
    const result = guard('side')
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('MAINTAINING.md')
  })

  it('fails when the tags on main do not start with v', () => {
    git('tag', 'release-0.1.0')
    const result = guard('main')
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('MAINTAINING.md')
  })

  it('fails when the v tags on main are not versions', () => {
    git('tag', 'vnext')
    git('tag', 'v1-beta')
    git('tag', 'v0.1')
    const result = guard('main')
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('MAINTAINING.md')
  })

  it('fails with its usage when no ref is given', () => {
    git('tag', 'v0.1.0')
    const result = guard()
    expect(result.status).toBe(2)
    expect(result.stderr).toContain('Usage:')
  })
})
