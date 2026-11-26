<script setup lang="ts">
import { Chart, type ChartConfiguration } from 'chart.js'
import { markRaw, onBeforeUnmount, shallowRef, watch } from 'vue'
import type { ChartAction } from '../types.js'
import { asError } from './as-error.js'
import ChartView from './ChartView.vue'
import CodeTextarea from './CodeTextarea.vue'
import { debounce } from './debounce.js'
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

/** Chart.js rejected the config; the chart keeps the previous one. */
function onChartError(e: Error) {
  error.value = e
}

// The code as the reader edits it. An edit is evaluated 500 ms after the last keystroke; a new `code` prop replaces the
// edits and is evaluated at once.
const text = shallowRef(props.code)
const runEdited = debounce(run, 500)

function onInput(value: string) {
  text.value = value
  runEdited(value)
}

watch(
  () => props.code,
  (code) => {
    runEdited.cancel()
    text.value = code
    run(code)
  },
  { immediate: true }
)

// Nothing runs after the page is left.
onBeforeUnmount(runEdited.cancel)

defineExpose({ config, actions, error, output, messages })
</script>

<template>
  <div class="chart-editor">
    <ChartView :config="config" @error="onChartError" />
    <CodeTextarea :value="text" @input="onInput" />
  </div>
</template>
