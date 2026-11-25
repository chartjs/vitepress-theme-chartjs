import { defineComponent, h, inject, markRaw, onBeforeUnmount, onMounted, shallowRef, type Component } from 'vue'

/** Loads the site's imports; the installer provides it, memoised. */
export const loadImportsKey = Symbol('vitepress-theme-chartjs: loadImports')

type LoadImports = () => Promise<Record<string, unknown>>

const noImports: LoadImports = () => Promise.resolve({})

/**
 * The shell that pages use as `<ChartEditor code="…">`. It is a plain component, not an SFC, and imports only `vue`:
 * on the server and on the client's first render it draws a placeholder, so hydration matches. Once mounted, it loads
 * the runtime chunk (Chart.js, the editor) and the site's imports together, then renders the live editor in its place.
 */
export default defineComponent({
  name: 'ChartEditor',
  props: {
    code: { type: String, required: true },
  },
  setup(props) {
    const loadImports = inject<LoadImports>(loadImportsKey, noImports)
    const live = shallowRef<{ LiveEditor: Component; imports: Record<string, unknown> } | null>(null)
    let unmounted = false

    onMounted(async () => {
      const [runtime, imports] = await Promise.all([import('./runtime/index.js'), loadImports()])
      // A page left before the load finished keeps nothing of it.
      if (!unmounted) {
        live.value = { LiveEditor: markRaw(runtime.LiveEditor), imports }
      }
    })

    onBeforeUnmount(() => {
      unmounted = true
    })

    return () =>
      live.value
        ? h(live.value.LiveEditor, { code: props.code, imports: live.value.imports })
        : h('div', { class: 'chart-editor chart-editor-placeholder', 'aria-busy': 'true' }, [
            h('div', { class: 'chart-view' }),
          ])
  },
})
