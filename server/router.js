const fs = require('fs')
const path = require('path')
const utils = require('./utils')
const config = require('./config')

// 获取入口文件的绝对地址、以及所在文件夹的绝对地址
const entryAbsPath = path.resolve(__dirname, config.entry)
const entryDirname = path.dirname(entryAbsPath)

/**
 * @description 路由逻辑中间件
 */
const router = (ctx) => {
  const { url = '' } = ctx

  if (url === '/') {
    handleRootRouter(ctx)
  } else if (utils.getFileExtname(url) === '.js') {
    handleJsRouter(ctx)
  } else if (url.startsWith('/node_modules')) {
    handleLibRouter(ctx)
  }
}

/**
 * @description 匹配根路径，返回入口文件，没错，vite的入口文件不是js，而是一个html文件。在html中利用srcipt type='module'开启浏览器的esm模块加载方式
 */
const handleRootRouter = (ctx) => {
  const entryCodeStr = fs.readFileSync(entryAbsPath, 'utf-8')
  ctx.type = 'text/html; charset=utf-8'
  utils.setStrongCache(ctx) // TODO 入口文件设置为强缓存合适么？
  ctx.body = entryCodeStr
}

/**
 * @description 匹配.js路径文件，并做两件事情：
 *  - 1. 将js中的esm裸模块加载方式替换为`/`、`./`、`../`
 *  - 2. 将cjs模块加载方式替换为esm方式
 */
const handleJsRouter = ctx => {
  const fileAbsPath = path.resolve(entryDirname, `.${ctx.url}`)
  console.log(entryDirname, fileAbsPath);
  const jsCodeStr = fs.readFileSync(fileAbsPath, 'utf-8')
  const transformCodeStr = utils.transformPath(jsCodeStr)
  ctx.type = 'application/javascript'
  ctx.body = transformCodeStr
}

/**
 * @description 加载node_modules里的库文件
 * 这里初版没有用vite的esbuild预编译方法，而是利用库文件的package.json的modul字段，来找到库打包输出的bundle文件
 */
const handleLibRouter = (ctx) => {
  // const libName = ctx.url.split('/').pop()
  const libAbsPath = path.resolve(entryDirname, `../${ctx.url}`)
  const { module: libBundlePath } = require(`${libAbsPath}/package.json`)
  console.log(123, libBundlePath);
  const libBundleAbsPath = `${libAbsPath}/${libBundlePath}`
  const libBundleStr = fs.readFileSync(libBundleAbsPath, 'utf-8')
  ctx.type = 'application/javascript'
  ctx.body = libBundleStr
}

module.exports = router