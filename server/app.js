const Koa = require('koa')
const static = require('koa-static')
const path = require('path')
const router = require('./router')
const app = new Koa()

/**
 * 对于浏览器支持的路径方文件类型，直接返回（错误不能直接返回，里面的路径需要进行一下改造）
 */
// const staticPath = path.resolve(__dirname, '../src')
// app.use(static(staticPath))

// app.use((ctx) => {
//   console.log('小吴同学', ctx);
//   ctx.body = 'Hello ToyVite!!'
// })
app.use(router)

/**
 * 1. js文件：转换裸模块的import路径，再返回
 * 2. vue文件：解析成html、js、css文件，再返回
 * 3. html等文件：直接静态返回
 */


app.listen('3333', () => {
  console.log('ToyVite is start!');
})