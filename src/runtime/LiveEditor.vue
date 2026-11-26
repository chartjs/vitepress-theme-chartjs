<script setup lang="ts">
import { Chart, type ChartConfiguration } from 'chart.js'
import { markRaw, shallowRef, useTemplateRef, watch } from 'vue'
import type { ChartAction } from '../types.js'
import { asError } from './as-error.js'
import ChartActions from './ChartActions.vue'
import ChartView from './ChartView.vue'
import CodeEditor from './CodeEditor.vue'
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
    // Not reactive and not frozen: Chart.js takes over the config's `data` and `options` and mutates them.
    config.value = result.config && markRaw(result.config)
  } catch (e) {
    error.value = asError(e)
  }
}

// Named apart from the ref, as in ChartView.vue: Vue before 3.5.19 warns otherwise.
const viewRef = useTemplateRef<InstanceType<typeof ChartView>>('view')

/** Runs an action with the chart; before there is one, such as for a sample that exports no config, it does nothing. */
function onAction(action: ChartAction) {
  const chart = viewRef.value?.chart()
  if (chart) action.handler(chart)
}

/** Chart.js rejected the config; the chart keeps the previous one. */
function onChartError(e: Error) {
  error.value = e
}

// A new `code` prop is evaluated at once. CodeEditor replaces the reader's edits with it, drops a pending one, and emits
// an edit 500 ms after the last keystroke.
watch(() => props.code, run, { immediate: true })

defineExpose({ config, actions, error, output, messages })
</script>

<template>
  <div class="chart-editor">
    <ChartView ref="view" :config="config" @error="onChartError" />
    <!-- Only with actions: an empty row would push the code down. -->
    <ChartActions v-if="actions?.length" :actions="actions" @action="onAction" />
    <CodeEditor :error="error" :messages="messages" :output="output" :value="code" @input="run" />
  </div>
</template>
