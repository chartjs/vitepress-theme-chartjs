import { Parser } from 'acorn'

const BLOCK_MARKER = /^\s*<(\/?)block:([\w\s]+)(?::(\d+))?>\s*$/

/** A stretch of a sample between block markers, trimmed and without the markers. */
export interface Block {
  code: string
  /** Unset for code outside named blocks, which is hidden but still runs. */
  name?: string
  order: number
}

/** A named block, shown as an editor tab. */
export interface Tab extends Block {
  name: string
}

export interface ParsedBlocks {
  /** The named blocks, ordered by their number; blocks with the same number keep their source order. */
  tabs: Tab[]
  /** Every block in source order, the tabs among them as the same objects. */
  blocks: Block[]
}

/**
 * Splits a sample into the blocks marked up as `// <block:name:order>` … `// </block:name>` comments. Acorn finds the
 * comments, so that marker text inside a string or template literal is not taken for one. A closing marker for a block
 * other than the open one is ignored, and empty blocks are dropped. Without a non-empty named block, the whole code,
 * markers included, is a single tab named `JS`. Throws the parser's error on invalid code.
 *
 * An edit sets `code` on a tab, and `joinBlocks(blocks)` gives the code to evaluate.
 */
export function parseBlocks(code: string): ParsedBlocks {
  const blocks: Block[] = []
  let current: { name?: string; order: number; start: number } = { order: 0, start: 0 }

  function end(at: number) {
    const text = code.slice(current.start, at).trim()
    if (text) {
      blocks.push({ code: text, name: current.name, order: current.order })
    }
  }

  Parser.parse(code, {
    ecmaVersion: 'latest',
    // The sample runs as a function body, where `return` is allowed.
    allowReturnOutsideFunction: true,
    onComment(_isBlock, text, start, endOfComment) {
      const match = text.match(BLOCK_MARKER)
      if (!match) {
        return
      }

      const open = !match[1]
      const name = match[2]
      if (!open && current.name !== name) {
        return
      }

      end(start)
      current = { name: open ? name : undefined, order: Number(match[3]) || 0, start: endOfComment }
    },
  })
  end(code.length)

  const tabs = blocks.filter((block): block is Tab => block.name !== undefined).sort((a, b) => a.order - b.order)
  if (!tabs.length) {
    const tab: Tab = { code, name: 'JS', order: 0 }
    return { tabs: [tab], blocks: [tab] }
  }

  return { tabs, blocks }
}

/**
 * Reassembles a sample from its blocks. They were trimmed when parsed, so they are rejoined with a newline: joining
 * them with nothing would glue a `}` to the next `const`.
 */
export function joinBlocks(blocks: Block[]): string {
  return blocks.map((block) => block.code).join('\n')
}
