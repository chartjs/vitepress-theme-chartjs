import type { Chart } from 'chart.js'
import { describe, expect, it, vi } from 'vitest'
import { evaluate, type EvaluateScope } from '../../src/runtime/evaluate.js'

// The evaluator only passes Chart through as a local, so a stand-in class is enough.
class StubChart {}

function scope(overrides: Partial<EvaluateScope> = {}): EvaluateScope {
  return {
    Chart: StubChart as unknown as typeof Chart,
    imports: {},
    log: () => {},
    ...overrides,
  }
}

describe('evaluate', () => {
  it('runs the sample in strict mode, so an undeclared assignment throws', () => {
    expect(() => evaluate('undeclared = 1', scope())).toThrow(ReferenceError)
  })

  it('gives the sample Chart and the imports as locals', () => {
    const Utils = { numbers: () => [1, 2, 3] }
    const { config } = evaluate(
      'module.exports = { config: { type: "bar", data: { labels: Utils.numbers() }, chart: Chart } }',
      scope({ imports: { Utils } })
    )

    expect(config).toEqual({ type: 'bar', data: { labels: [1, 2, 3] }, chart: StubChart })
  })

  it('lets the sample declare its own variable with the name of a provided one', () => {
    const { config } = evaluate(
      'const Utils = "own"; const Chart = "mine"; module.exports = { config: { type: Utils, chart: Chart } }',
      scope({ imports: { Utils: 'provided' } })
    )

    expect(config).toEqual({ type: 'own', chart: 'mine' })
  })

  it.each(['my-lib', 'class', '1st', ''])('rejects the provided name %j, which is not an identifier', (name) => {
    expect(() => evaluate('module.exports = {}', scope({ imports: { ok: 1, [name]: 2 } }))).toThrow(`"${name}"`)
  })

  it('captures console.log lines, joining the arguments with spaces', () => {
    const log = vi.fn()
    evaluate('console.log("a", 1, true); console.log("b")', scope({ log }))

    expect(log.mock.calls).toEqual([['a 1 true'], ['b']])
  })

  it('leaves the other console methods in place', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      evaluate('console.warn("careful")', scope())
      expect(warn).toHaveBeenCalledWith('careful')
    } finally {
      warn.mockRestore()
    }
  })

  it('returns the exported config, actions and output, with the config the same object the sample holds', () => {
    const result = evaluate(
      `const config = { type: 'line' }
      module.exports = {
        config,
        actions: [{ name: 'Same', handler: () => config }],
        output: 'Click a point',
      }`,
      scope()
    )

    expect(result.config).toEqual({ type: 'line' })
    expect(result.actions).toHaveLength(1)
    expect(result.actions?.[0].name).toBe('Same')
    expect(result.actions?.[0].handler(new StubChart() as unknown as Chart)).toBe(result.config)
    expect(result.output).toBe('Click a point')
  })

  it('returns nothing for a sample that exports nothing', () => {
    expect(evaluate('', scope())).toEqual({ config: undefined, actions: undefined, output: undefined })
  })

  it('lets an error thrown by the sample propagate', () => {
    expect(() => evaluate('throw new TypeError("boom")', scope())).toThrow(new TypeError('boom'))
  })

  it('lets a syntax error propagate', () => {
    expect(() => evaluate('const = 1', scope())).toThrow(SyntaxError)
  })
})
