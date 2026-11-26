<script setup lang="ts">
import type { ChartAction } from '../types.js'

/** One button per action, in order. The editor renders this only when there are actions. */
defineProps<{ actions: ChartAction[] }>()

const emit = defineEmits<{ action: [action: ChartAction] }>()
</script>

<template>
  <div aria-label="Actions" class="chart-actions" role="group">
    <button
      v-for="(action, index) in actions"
      :key="index"
      class="chart-action"
      type="button"
      @click="emit('action', action)"
    >
      {{ action.name }}
    </button>
  </div>
</template>

<style scoped>
.chart-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  margin: 16px 0;
}

.chart-action {
  transition:
    background 0.25s,
    border-color 0.25s;
  background: var(--vp-c-default-soft, rgba(142, 150, 170, 0.14));
  border: 1px solid transparent;
  border-radius: var(--chartjs-radius, 6px);
  color: var(--vp-c-brand-1, #3080d0);
  display: inline-block;
  font-size: 0.8rem;
  padding: 8px 16px;
  margin: 0 8px 8px 0;
  cursor: pointer;
  user-select: none;
}

.chart-action:hover {
  background: var(--chartjs-accent-soft, rgba(48, 128, 208, 0.15));
  border-color: var(--chartjs-accent-border, rgba(48, 128, 208, 0.2));
}

.chart-action:active {
  background: var(--chartjs-accent-strong, rgba(48, 128, 208, 0.3));
  border-color: var(--chartjs-accent-border-strong, rgba(48, 128, 208, 0.4));
}

.chart-action:focus-visible {
  outline: 2px solid var(--chartjs-focus-ring, #61afef);
  outline-offset: 2px;
}
</style>
