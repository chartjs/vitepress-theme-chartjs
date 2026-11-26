# Time scale

A time scale draws only with a date adapter, which the site's imports register.

```js chart-editor
const config = {
  type: 'line',
  data: {
    datasets: [
      {
        label: 'Visits',
        data: [
          { x: '2024-01-01', y: 1 },
          { x: '2024-02-01', y: 3 },
          { x: '2024-03-01', y: 2 },
        ],
      },
    ],
  },
  options: {
    scales: {
      x: { type: 'time', time: { unit: 'month' } },
    },
  },
}

module.exports = { config }
```
