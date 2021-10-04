const Koa = require('koa')
const static = require('koa-static')
const path = require('path')
const app = new Koa()

const staticPath = path.resolve(__dirname, '../src')
app.use(static(staticPath))

// app.use((ctx) => {
//   console.log('小吴同学');
//   ctx.body = 'Hello ToyVite!!'
// })


app.listen('3033', () => {
  console.log('ToyVite is start!');
})