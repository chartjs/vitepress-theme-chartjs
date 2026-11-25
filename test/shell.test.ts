// The shell after mount, on the built package, in Node: Vue's createRenderer with a minimal in-memory tree stands in
// for the DOM, so onMounted runs and the shell's failure branch renders. Drawing a chart needs a browser (P5).
import { createRenderer, h, nextTick, ref, type RendererOptions } from 'vue'
import { describe, expect, it, vi } from 'vitest'

const { ChartEditor, chartEditorPlugin } = (await import(
  new URL('../dist/index.js', import.meta.url).href
)) as typeof import('../src/index.js')

interface Node {
  tag: string
  props: Record<string, unknown>
  children: Node[]
  text: string
  parent: Node | null
}

function node(tag: string, text = ''): Node {
  return { tag, props: {}, children: [], text, parent: null }
}

const nodeOps: RendererOptions<Node, Node> = {
  createElement: (tag) => node(tag),
  createText: (text) => node('#text', text),
  createComment: (text) => node('#comment', text),
  setText: (n, text) => void (n.text = text),
  setElementText: (n, text) => void (n.children = [node('#text', text)]),
  insert(child, parent, anchor) {
    child.parent?.children.splice(child.parent.children.indexOf(child), 1)
    const index = anchor ? parent.children.indexOf(anchor) : -1
    parent.children.splice(index < 0 ? parent.children.length : index, 0, child)
    child.parent = parent
  },
  remove(child) {
    child.parent?.children.splice(child.parent.children.indexOf(child), 1)
    child.parent = null
  },
  parentNode: (n) => n.parent,
  nextSibling: (n) => (n.parent ? (n.parent.children[n.parent.children.indexOf(n) + 1] ?? null) : null),
  patchProp(n, key, _, value) {
    if (value === null || value === undefined) delete n.props[key]
    else n.props[key] = value
  },
}

const { createApp } = createRenderer(nodeOps)

function textOf(n: Node): string {
  return n.tag === '#text' ? n.text : n.children.map(textOf).join('')
}

describe('the shell after mount', () => {
  it('shows the error in place of the placeholder when the imports fail', async () => {
    const root = node('root')
    const errors: unknown[] = []
    const app = createApp({ render: () => h(ChartEditor, { code: '' }) })
    app.config.errorHandler = (error) => void errors.push(error)
    app.use(chartEditorPlugin, { imports: () => Promise.reject(new Error('no adapter')) })
    app.mount(root)

    expect(root.children[0].props.class).toBe('chart-editor chart-editor-placeholder')
    await vi.waitFor(() => expect(root.children[0].props.class).toBe('chart-editor chart-editor-failed'))

    const failed = root.children[0]
    expect(failed.props.role).toBe('alert')
    expect(failed.props['aria-busy']).toBeUndefined()
    expect(textOf(failed)).toBe('no adapter')
    expect(errors).toEqual([])
  })

  it('tries the imports again for the next editor after a failure', async () => {
    const imports = vi
      .fn<() => Promise<Record<string, unknown>>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({})

    // One app, so one installer and one memo; the second editor mounts after the first has failed.
    const editors = ref(1)
    const root = node('root')
    const app = createApp({ render: () => Array.from({ length: editors.value }, () => h(ChartEditor, { code: '' })) })
    app.use(chartEditorPlugin, { imports })
    app.mount(root)
    // The array renders as a fragment, whose anchors are text nodes.
    const classes = () => root.children.filter((n) => !n.tag.startsWith('#')).map((n) => n.props.class)
    await vi.waitFor(() => expect(classes()).toEqual(['chart-editor chart-editor-failed']))

    editors.value = 2
    await vi.waitFor(() => expect(classes()).toEqual(['chart-editor chart-editor-failed', 'chart-editor']))
    expect(imports).toHaveBeenCalledTimes(2)
    app.unmount()
  })
})

describe('LiveEditor', () => {
  it('reads the actions from the first evaluation that succeeds', async () => {
    const { LiveEditor } = (await import(
      new URL('../dist/runtime.js', import.meta.url).href
    )) as typeof import('../src/runtime/index.js')
    type Exposed = { actions: { name: string }[] | undefined; error: Error | undefined; messages: string[] }
    const actionsOf = (names: string[]) =>
      `module.exports = { actions: ${JSON.stringify(names.map((name) => ({ name, handler() {} })))} }`

    const code = ref('throw new Error("first")')
    const editor = ref<Exposed>()
    const app = createApp({ render: () => h(LiveEditor, { ref: editor, code: code.value, imports: {} }) })
    app.mount(node('root'))
    expect(editor.value?.error?.message).toBe('first')
    expect(editor.value?.actions).toBeUndefined()

    code.value = actionsOf(['Randomize'])
    await nextTick()
    expect(editor.value?.error).toBeUndefined()
    expect(editor.value?.actions?.map((a) => a.name)).toEqual(['Randomize'])

    code.value = `${actionsOf(['Other'])}; console.log('ran')`
    await nextTick()
    expect(editor.value?.messages).toEqual(['ran'])
    expect(editor.value?.actions?.map((a) => a.name)).toEqual(['Randomize'])
    app.unmount()
  })
})
