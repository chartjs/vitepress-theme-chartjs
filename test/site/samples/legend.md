# HTML legend

The legend is drawn into a container that the page writes, as Chart.js's HTML legend sample does.

<div id="legend-container"></div>

```js chart-editor
// <block:plugin:1>
const htmlLegend = {
  id: 'htmlLegend',
  afterUpdate(chart) {
    const container = document.getElementById('legend-container')
    const list = document.createElement('ul')
    for (const item of chart.options.plugins.legend.labels.generateLabels(chart)) {
      const entry = document.createElement('li')
      entry.textContent = item.text
      list.append(entry)
    }
    container.replaceChildren(list)
  },
}
// </block:plugin>

// <block:config:0>
const config = {
  type: 'pie',
  data: {
    labels: ['Red', 'Blue', 'Yellow'],
    datasets: [{ data: [12, 19, 3] }],
  },
  options: {
    plugins: { legend: { display: false } },
  },
  plugins: [htmlLegend],
}
// </block:config>

module.exports = { config }
```
