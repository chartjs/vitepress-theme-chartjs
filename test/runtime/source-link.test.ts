import { describe, expect, it } from 'vitest'
import { sourceLink } from '../../src/runtime/source-link.js'

const source = { repo: 'chartjs/Chart.js', branch: 'master', dir: 'docs' }

describe('sourceLink', () => {
  it("links to the page's source file in the repository", () => {
    expect(sourceLink(source, 'samples/bar/vertical.md')).toBe(
      'https://github.com/chartjs/Chart.js/blob/master/docs/samples/bar/vertical.md'
    )
  })

  it('skips an empty dir', () => {
    expect(sourceLink({ ...source, dir: '' }, 'index.md')).toBe(
      'https://github.com/chartjs/Chart.js/blob/master/index.md'
    )
  })

  it('skips empty segments around slashes in dir', () => {
    expect(sourceLink({ ...source, dir: '/site/docs/' }, 'index.md')).toBe(
      'https://github.com/chartjs/Chart.js/blob/master/site/docs/index.md'
    )
  })

  it('encodes each segment of the path, but not the branch', () => {
    expect(sourceLink({ ...source, branch: 'release/4.x', dir: 'my docs' }, 'a#b/c?d.md')).toBe(
      'https://github.com/chartjs/Chart.js/blob/release/4.x/my%20docs/a%23b/c%3Fd.md'
    )
  })

  it('returns undefined without source', () => {
    expect(sourceLink(undefined, 'index.md')).toBeUndefined()
  })

  it('returns undefined without repo or branch', () => {
    expect(sourceLink({ ...source, repo: '' }, 'index.md')).toBeUndefined()
    expect(sourceLink({ dir: 'docs', repo: 'chartjs/Chart.js' }, 'index.md')).toBeUndefined()
  })
})
