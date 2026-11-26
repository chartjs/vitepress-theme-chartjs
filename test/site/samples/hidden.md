# Hidden panels

Each sample starts hidden, as in a tab that is not shown: by `display: none`, by the `hidden` attribute, and inside a
closed `<details>`.

<div id="panel-style" style="display: none">

```js chart-editor
const config = {
  type: 'bar',
  data: { labels: ['a', 'b'], datasets: [{ label: 'Style', data: [1, 2] }] },
}

module.exports = { config }
```

</div>

<div id="panel-hidden" hidden>

```js chart-editor
const config = {
  type: 'bar',
  data: { labels: ['a', 'b'], datasets: [{ label: 'Attribute', data: [2, 1] }] },
}

module.exports = { config }
```

</div>

<details id="panel-details">
<summary>More</summary>

```js chart-editor
const config = {
  type: 'bar',
  data: { labels: ['a', 'b'], datasets: [{ label: 'Details', data: [3, 1] }] },
}

module.exports = { config }
```

</details>
