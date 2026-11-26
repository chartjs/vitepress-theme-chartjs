<script setup lang="ts">
import { computed } from 'vue'
import Prism from './prism.js'

const props = defineProps<{ value: string }>()
const emit = defineEmits<{ input: [value: string] }>()

// Prism escapes the text it highlights, so the markup holds nothing but its own token spans. A trailing newline leaves
// no line box of its own in the highlighted layer, so the two layers would drift apart by one line while typing at the
// end.
const highlighted = computed(() => Prism.highlight(props.value, Prism.languages.javascript, 'javascript') + '\n')

function onInput(event: Event) {
  emit('input', (event.target as HTMLTextAreaElement).value)
}

/**
 * Keeps Tab inside the editor instead of moving focus out of it, and inserts two spaces over the selection. The
 * deprecated `insertText` command is the one way to edit a textarea that the browser's undo takes back: after
 * `setRangeText` or a new `value`, Ctrl+Z does nothing at all in Chromium and Firefox. It fires `input` itself.
 */
function onTab(event: KeyboardEvent) {
  event.preventDefault()
  document.execCommand('insertText', false, '  ')
}
</script>

<template>
  <div class="code-textarea">
    <div class="code-textarea-content">
      <!-- eslint-disable-next-line vue/no-v-html -- Prism escapes the code; textarea.test.ts checks markup shows as text -->
      <pre aria-hidden="true" class="code-layer"><code v-html="highlighted" /></pre>
      <textarea
        :value="value"
        autocapitalize="off"
        autocomplete="off"
        autocorrect="off"
        class="code-layer code-input"
        data-gramm="false"
        spellcheck="false"
        @input="onInput"
        @keydown.tab.exact="onTab"
      />
    </div>
  </div>
</template>

<style scoped>
.code-textarea {
  background-color: var(--chartjs-code-bg, #282c34);
  color: var(--chartjs-code-text, #e0e0e0);
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.85em;
  line-height: 1.5;
  height: inherit;
  overflow: auto;
}

/* The textarea draws no outline of its own, so the editor shows where the keyboard focus is. */
.code-textarea:focus-within {
  outline: 2px solid var(--chartjs-focus-ring, #61afef);
  outline-offset: -2px;
}

.code-textarea-content {
  padding: 16px 24px;
  position: relative;
  min-height: 100%;
  min-width: max-content;
}

.code-layer {
  font: inherit;
  letter-spacing: inherit;
  line-height: inherit;
  tab-size: 2;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  white-space: pre;
  overflow: visible;
  overflow-wrap: normal;
  word-break: normal;
}

.code-input {
  position: absolute;
  inset: 16px 24px;
  width: 100%;
  height: 100%;
  resize: none;
  color: transparent;
  caret-color: var(--chartjs-code-text, #e0e0e0);
  outline: none !important;
}

.code-input::selection {
  background: rgba(128, 160, 224, 0.35);
}

/* Prism's one-dark tokens. Scoped to this component, so they cannot reach the page's own code blocks. */
.code-layer :deep(.token.comment),
.code-layer :deep(.token.prolog),
.code-layer :deep(.token.doctype),
.code-layer :deep(.token.cdata) {
  color: #5c6370;
  font-style: italic;
}

.code-layer :deep(.token.punctuation) {
  color: #abb2bf;
}

.code-layer :deep(.token.property),
.code-layer :deep(.token.constant),
.code-layer :deep(.token.symbol),
.code-layer :deep(.token.deleted) {
  color: #e06c75;
}

.code-layer :deep(.token.boolean),
.code-layer :deep(.token.number) {
  color: #d19a66;
}

.code-layer :deep(.token.selector),
.code-layer :deep(.token.string),
.code-layer :deep(.token.char),
.code-layer :deep(.token.builtin),
.code-layer :deep(.token.inserted) {
  color: #98c379;
}

.code-layer :deep(.token.operator),
.code-layer :deep(.token.entity),
.code-layer :deep(.token.url) {
  color: #56b6c2;
}

.code-layer :deep(.token.keyword) {
  color: #c678dd;
}

.code-layer :deep(.token.function),
.code-layer :deep(.token.class-name) {
  color: #61afef;
}

.code-layer :deep(.token.regex),
.code-layer :deep(.token.important),
.code-layer :deep(.token.variable) {
  color: #e6c07b;
}

.code-layer :deep(.token.important),
.code-layer :deep(.token.bold) {
  font-weight: bold;
}

.code-layer :deep(.token.italic) {
  font-style: italic;
}
</style>
