<script setup lang="ts">
import { useId } from 'vue'

/** `label` names the trigger, a button that the keyboard reaches; the default slot is its icon. */
defineProps<{ label: string }>()

// Unique within the app, so that two tooltips on a page each describe their own trigger.
const id = useId()
</script>

<template>
  <div class="chart-tooltip">
    <button :aria-describedby="id" :aria-label="label" class="chart-tooltip-trigger" type="button">
      <slot />
    </button>
    <div :id="id" class="chart-tooltip-content scrollable" role="tooltip">
      <slot name="content" />
    </div>
  </div>
</template>

<style scoped>
.chart-tooltip {
  position: relative;
  display: inline-flex;
}

.chart-tooltip-trigger {
  background: none;
  border: none;
  color: inherit;
  cursor: help;
  display: inline-flex;
  font: inherit;
  padding: 0;
}

.chart-tooltip-trigger:focus-visible {
  outline: 2px solid var(--chartjs-focus-ring, #61afef);
  outline-offset: 2px;
}

.chart-tooltip-content {
  background: #eee;
  color: #444;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.15);
  border-radius: var(--chartjs-radius, 6px);
  display: none;
  font-size: 0.8rem;
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 256px;
  max-width: 512px;
  max-height: 256px;
  overflow: auto;
  z-index: 999;
}

/* Open on hover, and on keyboard focus, which zoom's tooltip lacked. */
.chart-tooltip:hover .chart-tooltip-content,
.chart-tooltip:focus-within .chart-tooltip-content {
  display: block;
}

.chart-tooltip-content :deep(pre) {
  background: none;
  margin: 0;
  overflow: visible;
  padding: 8px 16px;
  white-space: pre-wrap;
}
</style>
