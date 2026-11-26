<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { joinBlocks, parseBlocks, type Block, type ParsedBlocks, type Tab } from './blocks.js'
import CodeTextarea from './CodeTextarea.vue'
import { debounce } from './debounce.js'

const props = withDefaults(
  defineProps<{
    /** The sample's code. A new value replaces the reader's edits. */
    value: string
    // For the error indicator and the Output tab.
    error?: Error
    messages?: string[]
    output?: boolean | string
  }>(),
  { error: undefined, messages: () => [], output: false }
)

/** The edited code, all blocks joined, 500 ms after the reader's last keystroke. */
const emit = defineEmits<{ input: [code: string] }>()

// Reactive, so that an edit's `tab.code = …` redraws the highlighted layer. `blocks` holds the same objects unwrapped,
// the hidden code among them.
const tabs = ref<Tab[]>([])
let blocks: Block[] = []
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
    current.value = 0
  },
  { immediate: true }
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
      </div>

      <!-- The tools: the busy indicator, then the error indicator and the source link. -->
      <div class="code-editor-tools">
        <span v-if="busy" aria-label="Evaluating" class="code-editor-tool text-muted spin" role="status">
          <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
            <path
              d="M8 1.5 9.6 6l4.4-1.6L10.7 8l3.3 3.6L9.6 10 8 14.5 6.4 10 2 11.6 5.3 8 2 4.4 6.4 6Z"
              fill="currentColor"
            />
          </svg>
        </span>
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
