import { describe, expect, it } from 'vitest'
import { joinBlocks, parseBlocks } from '../../src/runtime/blocks.js'

// Compiles without running, as the evaluator will: what a rejoined sample must survive.
function compiles(code: string): boolean {
  new Function(code)
  return true
}

const sample = `const hidden = 1 // an ordinary comment
// <block:config:1>
const config = { type: 'bar' }
// </block:config>
// <block:setup:0>
const data = [1, 2, 3]
// </block:setup>
module.exports = { config }`

describe('parseBlocks', () => {
  it('makes a tab of each named block, ordered by its number', () => {
    const { tabs } = parseBlocks(sample)

    expect(tabs.map(({ name, code }) => [name, code])).toEqual([
      ['setup', 'const data = [1, 2, 3]'],
      ['config', "const config = { type: 'bar' }"],
    ])
  })

  it('keeps the source order of blocks with the same number, or none', () => {
    const { tabs } = parseBlocks('// <block:b>\nb()\n// </block:b>\n// <block:a>\na()\n// </block:a>')

    expect(tabs.map(({ name }) => name)).toEqual(['b', 'a'])
  })

  it('keeps the code outside named blocks for evaluation, in source order', () => {
    const { blocks, tabs } = parseBlocks(sample)

    expect(blocks.map(({ name, code }) => [name, code])).toEqual([
      [undefined, 'const hidden = 1 // an ordinary comment'],
      ['config', "const config = { type: 'bar' }"],
      ['setup', 'const data = [1, 2, 3]'],
      [undefined, 'module.exports = { config }'],
    ])
    for (const tab of tabs) {
      expect(blocks).toContain(tab)
    }
  })

  it('makes a single tab of a sample without markers, holding the whole code', () => {
    const code = '\nmodule.exports = { config: { type: "bar" } }\n'
    const { blocks, tabs } = parseBlocks(code)

    expect(tabs).toEqual([{ name: 'JS', code, order: 0 }])
    expect(blocks).toEqual(tabs)
    expect(blocks[0]).toBe(tabs[0])
    expect(joinBlocks(blocks)).toBe(code)
  })

  it('makes a single tab of an empty sample', () => {
    const { blocks, tabs } = parseBlocks('')

    expect(tabs).toEqual([{ name: 'JS', code: '', order: 0 }])
    expect(blocks[0]).toBe(tabs[0])
  })

  it('makes a single tab of the whole code, markers included, when every named block is empty', () => {
    const code = 'const a = 1\n// <block:setup:0>\n  \n// </block:setup>\nmodule.exports = {}'
    const { blocks, tabs } = parseBlocks(code)

    expect(tabs).toEqual([{ name: 'JS', code, order: 0 }])
    expect(joinBlocks(blocks)).toBe(code)
  })

  it('drops an empty named block beside non-empty ones', () => {
    const { tabs } = parseBlocks('// <block:empty:0>\n// </block:empty>\n// <block:full:1>\nfull()\n// </block:full>')

    expect(tabs.map(({ name }) => name)).toEqual(['full'])
  })

  it('ignores marker text inside a string or a template literal', () => {
    const { tabs } = parseBlocks(
      "const a = '// <block:fake:0>'\nconst b = `\n// <block:other:1>\n`\n// <block:real:2>\nreal()\n// </block:real>"
    )

    expect(tabs.map(({ name }) => name)).toEqual(['real'])
  })

  it('ignores a closing marker for another block', () => {
    const { tabs } = parseBlocks('// <block:setup:0>\nconst b = 1\n// </block:other>\nconst c = 2\n// </block:setup>')

    expect(tabs).toHaveLength(1)
    expect(tabs[0].code).toBe('const b = 1\n// </block:other>\nconst c = 2')
  })

  it('reads markers written as block comments', () => {
    const { tabs } = parseBlocks('/* <block:a:1> */ a(); /* </block:a> */ /* <block:b:0> */ b(); /* </block:b> */')

    expect(tabs.map(({ name, code }) => [name, code])).toEqual([
      ['b', 'b();'],
      ['a', 'a();'],
    ])
  })

  it('reads a block-comment marker whose text ends in a newline', () => {
    const { tabs } = parseBlocks('/* <block:a:0>\n*/\na()\n/* </block:a>\n*/')

    expect(tabs.map(({ name, code }) => [name, code])).toEqual([['a', 'a()']])
  })

  it('gives an unnumbered block the number 0', () => {
    const { tabs } = parseBlocks(
      '// <block:x:1>\nx()\n// </block:x>\n// <block:y>\ny()\n// </block:y>\n// <block:z:0>\nz()\n// </block:z>'
    )

    expect(tabs.map(({ name }) => name)).toEqual(['y', 'z', 'x'])
    expect(tabs[0].order).toBe(0)
  })

  it('reads a block name with a space', () => {
    const { tabs } = parseBlocks('// <block:my tab:0>\na()\n// </block:my tab>')

    expect(tabs.map(({ name, code }) => [name, code])).toEqual([['my tab', 'a()']])
  })

  it('accepts a return at the top level, since the sample runs as a function body', () => {
    expect(() => parseBlocks('if (!Chart) return\nmodule.exports = {}')).not.toThrow()
  })

  it('accepts the latest syntax', () => {
    expect(() => parseBlocks('const re = /[\\p{L}--\\p{N}]/v')).not.toThrow()
  })

  it("throws the parser's error on invalid code", () => {
    expect(() => parseBlocks('const = 1')).toThrow(SyntaxError)
  })
})

describe('joinBlocks', () => {
  it('rejoins the blocks with newlines into code that still parses', () => {
    const joined = joinBlocks(parseBlocks(sample).blocks)

    expect(joined).toBe(
      "const hidden = 1 // an ordinary comment\nconst config = { type: 'bar' }\nconst data = [1, 2, 3]\nmodule.exports = { config }"
    )
    expect(compiles(joined)).toBe(true)
  })

  it('puts an edit of a tab back at its position', () => {
    const { blocks, tabs } = parseBlocks(sample)
    tabs[0].code = 'const data = [4, 5]'
    tabs[1].code = "const config = { type: 'line' }"
    const joined = joinBlocks(blocks)

    expect(joined).toBe(
      "const hidden = 1 // an ordinary comment\nconst config = { type: 'line' }\nconst data = [4, 5]\nmodule.exports = { config }"
    )
    expect(() => parseBlocks(joined)).not.toThrow()
    expect(compiles(joined)).toBe(true)
  })

  it('puts an edit of the single tab back', () => {
    const { blocks, tabs } = parseBlocks('module.exports = { config: { type: "bar" } }')
    tabs[0].code = 'module.exports = { config: { type: "line" } }'

    expect(joinBlocks(blocks)).toBe('module.exports = { config: { type: "line" } }')
  })
})
