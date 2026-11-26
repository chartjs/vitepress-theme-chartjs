# Bar chart

A sample, as the Chart.js docs write one.

```js chart-editor
const config = {
  type: 'bar',
  data: {
    labels: ['Red', 'Blue', 'Yellow'],
    datasets: [{ label: 'Votes', data: [12, 19, 3] }],
  },
}

module.exports = { config }
```

The site's Chart.js and the one the samples get are the same: <span id="same-chart"></span>

```js chart-editor
document.getElementById('same-chart').textContent = String(Chart === Utils.Chart)

const config = {
  type: 'line',
  data: {
    labels: ['a', 'b', 'c'],
    datasets: [{ label: 'Line', data: [1, 3, 2] }],
  },
}

module.exports = { config }
```
