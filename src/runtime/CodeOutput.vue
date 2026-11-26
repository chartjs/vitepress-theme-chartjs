<script setup lang="ts">
/**
 * The Output tab: the lines the sample logged, newest first, as the editor keeps them. Without any, a string
 * `placeholder` is shown, or `...` for `true`.
 */
defineProps<{ lines: string[]; placeholder: boolean | string }>()
</script>

<template>
  <div class="code-output scrollable">
    <div class="code-output-content">
      <span v-for="(line, index) in lines" :key="index" class="code-output-line">{{ line }}</span>
      <span v-if="!lines.length && placeholder" class="code-output-placeholder text-muted">
        {{ placeholder === true ? '...' : placeholder }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.code-output {
  color: var(--chartjs-code-text, #e0e0e0);
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 0.85em;
  line-height: 1.5;
  height: inherit;
  overflow: auto;
}

.code-output-content {
  padding: 16px 24px;
}

.code-output-line {
  white-space: pre-wrap;
  position: relative;
  display: block;
  margin-left: 5px;
  opacity: 0.25;
}

.code-output-line:first-child::before {
  content: '>';
  font-weight: bold;
  position: absolute;
  opacity: 0.5;
  left: -15px;
}

/* Older lines fade out towards the bottom of the list. */
.code-output-line:nth-child(1) {
  opacity: 1;
}
.code-output-line:nth-child(2) {
  opacity: 0.95;
}
.code-output-line:nth-child(3) {
  opacity: 0.9;
}
.code-output-line:nth-child(4) {
  opacity: 0.85;
}
.code-output-line:nth-child(5) {
  opacity: 0.8;
}
.code-output-line:nth-child(6) {
  opacity: 0.75;
}
.code-output-line:nth-child(7) {
  opacity: 0.7;
}
.code-output-line:nth-child(8) {
  opacity: 0.65;
}
.code-output-line:nth-child(9) {
  opacity: 0.6;
}
.code-output-line:nth-child(10) {
  opacity: 0.55;
}
.code-output-line:nth-child(11) {
  opacity: 0.5;
}
.code-output-line:nth-child(12) {
  opacity: 0.45;
}
.code-output-line:nth-child(13) {
  opacity: 0.4;
}
.code-output-line:nth-child(14) {
  opacity: 0.35;
}
.code-output-line:nth-child(15) {
  opacity: 0.3;
}
</style>
