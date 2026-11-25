<script setup lang="ts">
import { Chart, type ChartConfiguration } from 'chart.js'
import { markRaw, shallowRef, watch } from 'vue'
import type { ChartAction } from '../types.js'
import ChartView from './ChartView.vue'
import { evaluate } from './evaluate.js'

const props = defineProps<{
  code: string
  /** The site's imports, already loaded; `{}` without an `imports` option. */
  imports: Record<string, unknown>
}>()

// The config of the last evaluation that succeeded. It is not necessarily what is drawn: when Chart.js rejects it, the
// chart keeps the previous one and `error` says why.
const config = shallowRef<ChartConfiguration>()
const actions = shallowRef<ChartAction[]>()
const error = shallowRef<Error>()
const output = shallowRef<boolean | string>(false)
// Newest first, the last 50, across evaluations.
const messages = shallowRef<string[]>([])
// Actions come from the first evaluation that succeeds, and stay after later edits.
let actionsRead = false

function log(line: string) {
  messages.value = [line, ...messages.value].slice(0, 50)
}

/** Runs the code. A throw keeps the previous config, and so the chart, and sets the error. */
function run(code: string) {
  try {
    const result = evaluate(code, { Chart, imports: props.imports, log })
    error.value = undefined
    output.value = result.output ?? false
    if (!actionsRead) {
      actions.value = result.actions
      actionsRead = true
    }
    // Not reactive and not frozen: Chart.js takes over the object and mutates it.
    config.value = result.config && markRaw(result.config)
  } catch (e) {
    error.value = e instanceof Error ? e : new Error(String(e))
  }
}

/** Chart.js rejected the config; the chart keeps the previous one. */
function onChartError(e: Error) {
  error.value = e
}

watch(() => props.code, run, { immediate: true })

defineExpose({ config, actions, error, output, messages })
</script>

<template>
  <div class="chart-editor">
    <ChartView :config="config" @error="onChartError" />
    <pre class="chart-editor-code"><code>{{ code }}</code></pre>
  </div>
</template>
