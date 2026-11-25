<script setup lang="ts">
import { Chart, type ChartConfiguration } from 'chart.js'
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

// The config arrives markRaw()'d: Chart.js keeps references to its data and options, and must not get a proxy.
const props = defineProps<{ config: ChartConfiguration | undefined }>()

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
let instance: Chart | undefined

onMounted(() => {
  if (canvas.value && props.config) {
    instance = new Chart(canvas.value, { ...props.config })
  }
})

onBeforeUnmount(() => {
  instance?.destroy()
  instance = undefined
})

defineExpose({ chart: () => instance })
</script>

<template>
  <div class="chart-view">
    <canvas ref="canvas" />
  </div>
</template>
