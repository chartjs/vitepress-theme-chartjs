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
 * Keeps Tab inside the editor instead of moving focus out of it. setRangeText is used rather than rewriting the whole
 * value so the browser's own undo stack stays intact.
 */
function onTab(event: KeyboardEvent) {
  const textarea = event.target as HTMLTextAreaElement
  event.preventDefault()
  textarea.setRangeText('  ', textarea.selectionStart, textarea.selectionEnd, 'end')
  emit('input', textarea.value)
}
</script>

<template>
  <div class="code-textarea">
    <div class="code-textarea-content">
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
        @keydown.tab="onTab"
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
