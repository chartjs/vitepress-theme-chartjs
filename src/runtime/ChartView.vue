<script setup lang="ts">
import { Chart, type ChartConfiguration } from 'chart.js'
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { asError } from './as-error.js'

// The config arrives markRaw()'d: Chart.js keeps references to its data and options, and must not get a proxy.
const props = defineProps<{ config: ChartConfiguration | undefined }>()

// What Chart.js threw while creating or updating the chart. The previous chart stays.
const emit = defineEmits<{ error: [error: Error] }>()

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
let instance: Chart | undefined

/**
 * Throws, before the chart is changed, when the config names a chart type that is not registered. It keeps the
 * datasets' state: an update would destroy every dataset whose type changed before finding out, so the chart kept
 * would lose its hidden datasets and animate again from zero.
 */
function checkTypes(config: ChartConfiguration) {
  const types = [config.type, ...(config.data?.datasets ?? []).map((dataset) => dataset.type)]
  for (const type of new Set(types)) {
    if (type) Chart.registry.getController(type)
  }
}

function create(target: HTMLCanvasElement, config: ChartConfiguration) {
  try {
    // A copy: Chart.js keeps the object it gets and later updates set their type and data on it, while the sample and
    // its actions keep the one they exported. `data` and `options` are still the exported ones.
    instance = new Chart(target, { ...config })
  } catch (error) {
    // Chart.js claims the canvas before it draws, so a failed chart has to be destroyed for the next one.
    Chart.getChart(target)?.destroy()
    throw error
  }
}

/** Zoom's update path, with the type: the same instance animates to the new data and options. */
function update(chart: Chart, config: ChartConfiguration) {
  checkTypes(config)
  // The chart was created from a ChartConfiguration, so its config has a type.
  const current = chart.config as ChartConfiguration
  const previous = { type: current.type, data: current.data, options: current.options }
  try {
    current.type = config.type
    // A config without data or options is fine: Chart.js fills them in, as it does for `new Chart`.
    chart.data = config.data
    chart.options = config.options!
    chart.update()
  } catch (error) {
    // Put back what drew last, so that the next resize does not throw the same error again. Should that update throw
    // too, its error is the one reported, and nothing is tried again.
    current.type = previous.type
    chart.data = previous.data
    chart.options = previous.options!
    chart.update()
    throw error
  }
}

function apply() {
  const config = props.config
  // An evaluation that exports no config leaves the chart as it is.
  if (!canvas.value || !config) return
  try {
    if (instance) update(instance, config)
    else create(canvas.value, config)
  } catch (error) {
    emit('error', asError(error))
  }
}

onMounted(apply)
watch(() => props.config, apply)

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
