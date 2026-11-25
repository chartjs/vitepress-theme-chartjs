import type { Chart, ChartConfiguration } from 'chart.js'
import type { ChartAction } from '../types.js'

/** What a sample sees beside its own code. */
export interface EvaluateScope {
  Chart: typeof Chart
  /** The names the site's `imports()` provided. */
  imports: Record<string, unknown>
  /** Receives each `console.log` call of the sample, its arguments joined with spaces. */
  log: (line: string) => void
}

/** What a sample assigned to `module.exports`, as it was assigned. */
export interface Evaluation {
  config: ChartConfiguration | undefined
  actions: ChartAction[] | undefined
  output: boolean | string | undefined
}

const IDENTIFIER = /^[\p{ID_Start}$_][\p{ID_Continue}$‌‍]*$/u

/**
 * Each provided name is declared as `const <name>` in strict-mode code, so it has to be an identifier that strict mode
 * lets code declare: that rules out reserved words such as `default` or `let`, and `arguments` and `eval`. `module` is
 * declared by the evaluator itself. Compiling the declaration settles it without a list of reserved words.
 */
function assertDeclarable(name: string) {
  if (name !== 'module' && IDENTIFIER.test(name)) {
    try {
      new Function(`'use strict'; const ${name} = 0`)
      return
    } catch {
      // Not declarable: reported below.
    }
  }
  throw new Error(`"${name}" is not usable as a name in samples. Rename it in the site's imports.`)
}

/**
 * Runs a sample and returns what it assigned to `module.exports`. The code runs as the body of a strict-mode function
 * that sees the site's imports, then `console` and `Chart`, as locals; the evaluator's own `console` and `Chart` win
 * over provided names of the same name, and the sample may shadow any of them. `console.log` goes to `scope.log`, and
 * the other console methods are the real ones. Whatever the sample throws, the evaluator throws.
 */
export function evaluate(code: string, scope: EvaluateScope): Evaluation {
  const context: Record<string, unknown> = {
    ...scope.imports,
    console: {
      ...console,
      log(...args: unknown[]) {
        scope.log(args.join(' '))
      },
    },
    Chart: scope.Chart,
  }

  const names = Object.keys(context)
  names.forEach(assertDeclarable)

  const script = `
    'use strict';
    const module = { exports: {} };
    ${names.map((name) => `const ${name} = arguments[0].${name};`).join('\n')}
    (function () { ${code}
    })();
    return module.exports;
  `

  const exported = new Function(script)(context) ?? {}
  return { config: exported.config, actions: exported.actions, output: exported.output }
}
