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

const config = shallowRef<ChartConfiguration>()
const actions = shallowRef<ChartAction[]>()
const error = shallowRef<Error>()
const output = shallowRef<boolean | string>(false)
// Newest first, the last 50, across evaluations.
const messages = shallowRef<string[]>([])
let evaluated = false

function log(line: string) {
  messages.value = [line, ...messages.value].slice(0, 50)
}

/** Runs the code. A throw keeps the previous config, and so the chart, and sets the error. */
function run(code: string) {
  const first = !evaluated
  evaluated = true
  try {
    const result = evaluate(code, { Chart, imports: props.imports, log })
    error.value = undefined
    output.value = result.output ?? false
    if (first) {
      actions.value = result.actions
    }
    // Not reactive and not frozen: Chart.js takes over the object and mutates it.
    config.value = result.config && markRaw(result.config)
  } catch (e) {
    error.value = e instanceof Error ? e : new Error(String(e))
  }
}

watch(() => props.code, run, { immediate: true })

defineExpose({ config, actions, error, output, messages })
</script>

<template>
  <div class="chart-editor">
    <ChartView :config="config" />
    <pre class="chart-editor-code"><code>{{ code }}</code></pre>
  </div>
</template>
