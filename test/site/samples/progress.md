# Progress bar

The chart moves a progress bar that the page writes, from its animation callbacks, as Chart.js's progress-bar sample
does.

<progress id="animation-progress" max="1" value="0"></progress>

```js chart-editor
const progress = document.getElementById('animation-progress')

const config = {
  type: 'line',
  data: {
    labels: ['a', 'b', 'c', 'd'],
    datasets: [{ label: 'Progress', data: [1, 4, 2, 5] }],
  },
  options: {
    animation: {
      duration: 2000,
      onProgress(context) {
        progress.value = context.currentStep / context.numSteps
      },
      onComplete() {
        progress.value = 1
      },
    },
  },
}

module.exports = { config }
```
