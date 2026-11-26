# Verbatim characters

The code arrives in the editor as written, with characters that HTML, Vue templates and attributes treat specially.

```js chart-editor
const label = `A & B's "<chart>" {{ title }} </textarea> ${'`'}`

const config = {
  type: 'bar',
  data: { labels: [label, '&amp;', "it's"], datasets: [{ label: '<b>&lt;</b>', data: [1, 2, 3] }] },
}

module.exports = { config }
```
