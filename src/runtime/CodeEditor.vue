<script setup lang="ts">
import { useData } from 'vitepress'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { ChartjsThemeConfig } from '../types.js'
import { joinBlocks, parseBlocks, type Block, type ParsedBlocks, type Tab } from './blocks.js'
import CodeOutput from './CodeOutput.vue'
import CodeTextarea from './CodeTextarea.vue'
import { debounce } from './debounce.js'
import { sourceLink } from './source-link.js'
import ChartTooltip from './ChartTooltip.vue'

const props = withDefaults(
  defineProps<{
    /** The sample's code. A new value replaces the reader's edits. */
    value: string
    /** What the last evaluation, or Chart.js, threw; shown by the error indicator. */
    error?: Error
    /** The logged lines, newest first, for the Output tab. */
    messages?: string[]
    /** The sample's `output`: truthy adds the Output tab, and a string is its placeholder. */
    output?: boolean | string
  }>(),
  { error: undefined, messages: () => [], output: false }
)

const { page, theme } = useData<Partial<ChartjsThemeConfig>>()
// Without a `source` in the theme configuration, there is no link.
const source = computed(() => sourceLink(theme.value.source, page.value.filePath))

/** The edited code, all blocks joined, 500 ms after the reader's last keystroke. */
const emit = defineEmits<{ input: [code: string] }>()

// Reactive, so that an edit's `tab.code = …` redraws the highlighted layer. `blocks` holds the same objects unwrapped,
// the hidden code among them.
const tabs = ref<Tab[]>([])
let blocks: Block[] = []
// The index of the tab shown; the Output tab, when there is one, comes after the code's, at `tabs.length`.
const current = ref(0)
// An edit waits to be evaluated.
const busy = ref(false)

/**
 * The tabs of `code`. Code that does not parse is shown whole, in one tab, so that the reader can fix it; evaluating it
 * reports the syntax error. Edits are not parsed again, so that tab stays until the next `value`.
 */
function parse(code: string): ParsedBlocks {
  try {
    return parseBlocks(code)
  } catch {
    const tab: Tab = { code, name: 'JS', order: 0 }
    return { tabs: [tab], blocks: [tab] }
  }
}

const emitEdited = debounce(() => {
  busy.value = false
  emit('input', joinBlocks(blocks))
}, 500)

function onInput(tab: Tab, code: string) {
  tab.code = code
  busy.value = true
  emitEdited()
}

function cancel() {
  emitEdited.cancel()
  busy.value = false
}

watch(
  () => props.value,
  (code) => {
    cancel()
    const parsed = parse(code)
    blocks = parsed.blocks
    tabs.value = parsed.tabs
    // As in zoom, a sample that logs opens on its Output tab, where the interesting part is.
    current.value = props.output ? parsed.tabs.length : 0
  },
  { immediate: true }
)

// An edit that adds or removes the Output tab keeps the tabs, the reader's edits and the tab shown; only a shown Output
// tab that goes away gives way to the first one.
watch(
  () => !!props.output,
  (output) => {
    if (!output && current.value >= tabs.value.length) {
      current.value = 0
    }
  }
)

// Nothing runs after the page is left.
onBeforeUnmount(cancel)
</script>

<template>
  <div class="code-editor">
    <div class="code-editor-header">
      <div class="code-editor-tabs" role="tablist">
        <button
          v-for="(tab, index) in tabs"
          :key="index"
          :aria-selected="current === index"
          :class="{ active: current === index }"
          class="code-editor-tab"
          role="tab"
          type="button"
          @click="current = index"
        >
          {{ tab.name }}
        </button>
        <button
          v-if="output"
          :aria-selected="current === tabs.length"
          :class="{ active: current === tabs.length }"
          class="code-editor-tab"
          role="tab"
          type="button"
          @click="current = tabs.length"
        >
          Output
        </button>
      </div>

      <!-- The busy indicator while an edit waits, otherwise the error indicator, then the source link. -->
      <div class="code-editor-tools">
        <span v-if="busy" aria-label="Evaluating" class="code-editor-tool text-muted spin" role="status">
          <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
            <path
              d="M8 1.5 9.6 6l4.4-1.6L10.7 8l3.3 3.6L9.6 10 8 14.5 6.4 10 2 11.6 5.3 8 2 4.4 6.4 6Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <ChartTooltip v-else-if="error" class="code-editor-tool text-error" label="Error">
          <svg aria-hidden="true" height="18" viewBox="0 0 16 16" width="18">
            <path
              d="M8 1.6 15.4 14H.6Zm0 3.9a.8.8 0 0 0-.8.85l.25 3.4a.55.55 0 0 0 1.1 0l.25-3.4A.8.8 0 0 0 8 5.5Zm0 5.2a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Z"
              fill="currentColor"
            />
          </svg>
          <template #content>
            <pre>{{ String(error) }}</pre>
          </template>
        </ChartTooltip>
        <a
          v-if="source"
          :href="source"
          aria-label="View the source on GitHub"
          class="code-editor-tool"
          rel="noopener noreferrer"
          target="_blank"
          title="View the source on GitHub"
        >
          <svg aria-hidden="true" height="20" viewBox="0 0 16 16" width="20">
            <path
              d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.19c0 .21.15.46.55.38A8 8 0 0 0 8 0Z"
              fill="currentColor"
            />
          </svg>
        </a>
      </div>
    </div>

    <!-- `hidden`, not v-show: the inactive tabs stay hidden on a site that does not load the stylesheet. -->
    <div class="code-editor-views">
      <CodeTextarea
        v-for="(tab, index) in tabs"
        :key="index"
        :hidden="current !== index"
        :value="tab.code"
        @input="onInput(tab, $event)"
      />
      <CodeOutput v-if="output" :hidden="current !== tabs.length" :lines="messages" :placeholder="output" />
    </div>
  </div>
</template>

<style src="../styles/editor.css"></style>

<style scoped>
.code-editor {
  background-color: var(--chartjs-code-bg, #282c34);
  border-radius: var(--chartjs-radius, 6px);
  overflow: hidden;
}

@media (max-width: 419px) {
  .code-editor {
    border-radius: 0;
    margin: 0 -1.5rem;
  }
}

.code-editor-header {
  background: rgba(255, 255, 255, 0.02);
  padding: 0 16px;
  display: flex;
}

.code-editor-tabs {
  align-items: center;
  display: flex;
  flex: 1;
}

.code-editor-tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--chartjs-code-text, #e0e0e0);
  text-transform: capitalize;
  user-select: none;
  font-weight: bold;
  cursor: pointer;
  padding: 20px 4px 18px;
  margin: 0 8px;
}

.code-editor-tab:focus-visible {
  outline: 2px solid var(--chartjs-focus-ring, #61afef);
  outline-offset: -2px;
}

.code-editor-tab.active {
  border-bottom-color: var(--vp-c-brand-1, #3080d0);
}

.code-editor-tools {
  align-items: center;
  display: flex;
  padding: 16px 0;
}

.code-editor-tool {
  color: var(--chartjs-code-text, #e0e0e0);
  text-decoration: none !important;
  display: inline-flex;
  align-items: center;
  margin: 0 8px;
}

.spin {
  animation: code-editor-spin 2s linear infinite;
}

@keyframes code-editor-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spin {
    animation: none;
  }
}

.code-editor-views {
  height: 360px;
}
</style>
