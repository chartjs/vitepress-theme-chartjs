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

The samples get the site's own build of Chart.js: <span id="site-chart"></span>, the same one as the site's imports:
<span id="same-chart"></span>

```js chart-editor
document.getElementById('site-chart').textContent = String(Chart.siteBuild === true)
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
