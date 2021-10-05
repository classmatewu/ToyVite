const path = require('path')
const parser = require('@babel/parser')
const { default: traverse } = require('@babel/traverse')
const generator = require("@babel/generator");
const compilerSFC = require('@vue/compiler-sfc')
const compilerDOM = require('@vue/compiler-dom')

/**
 * @description 转换浏览器不认识的路径为认识路径，eg：import vue from 'vue' -> import vue from '/node_modules/vue/。。。'
 * @思路
 *  - 1. 将source转换为ast
 *  - 2. 遍历ast，找到ImportDeclaration，进行改路径改造
 *       - 路径改造的这一步，vite用的是esbuild先预编译打包在.vite文件夹下，我这里初期就先不这么做，而是直接从node-module里面取库文件
 *  - 3. 将改造后的ast转换为源码，return出去
 */
const transformPath = (source = '') => {
  const ast = parser.parse(source, {
    sourceType: "module",
  })
  traverse(ast, {
    ImportDeclaration({node}) {
      const esmPath = node?.source?.value // 可能是绝对路径，也可能是相对路径
      if (!isLegalEsmPath(esmPath)) {
        node.source.value = `/node_modules/${esmPath}` // TODO 这里稍稍有点小疑问，我这里的node参数不是利用对象解构拿到的么，解构不是深拷贝么，为什么在这里重新赋值，也能得到改造效果，什么原理？？
      }
    },
  })
  const transformSource = generator.default(ast, {}, source).code
  return transformSource
}

/**
 * @description 判断是否是合法的esm路径：`/`、`./`、`../`
 * @param {string} esmPath esm路径
 * @returns {boolean} isLegalEsmPath 是否是合法的esm路径
 */
const isLegalEsmPath = esmPath => {
  const legalEsmPath = ['/', './', '../']
  let isLegalEsmPath = false
  legalEsmPath.some(path => {
    if (esmPath.startsWith(path)) {
      isLegalEsmPath = true
      return true
    }
  })
  return isLegalEsmPath
}

/**
 * @description 解析vue文件的单文件组件，变vue为html、js、css
 * @思路
 *  1. 解析vue sfc成ast，分别取出里面的template, script, style
 *  2. 将script.content取出来，这是sfc的script代码部分，然后进行一下改造，因为我们不仅还要往里放render，然后再导出
 *  3. 将template转换为render渲染函数，然后放进script中
 *  4. 处理css文件，
 */
const parseVue = (source) => {
  const ast = compilerSFC.parse(source)
  const {template, script, styles} = ast.descriptor
  console.log('---ast---', template, script, styles);
  // 改匿名导出为申明，后面插入render函数后再导出
  const scriptCode = script.content.replace(/export default/, 'const script =')
  const transformScriptCode = transformPath(scriptCode) // 只要是js，就需要转换裸模块的引用方式
  // 将template转换为render渲染函数
  const { code: render } = compilerDOM.compile(template.content, {mode: 'module'}) // 不以module方式的话，拿到的code包含with()写法，在严格模式下不通过，浏览器报错`Uncaught SyntaxError: Strict mode code may not include a with statement`
  const transformRenderStr = transformPath(render) // 打印render看了下，这种mode方式下，返回的代码里有import vue，所以也需要转换下裸模块路径
  console.log('---render---', render);
  // 由于拿到的render是一段js代码字符串同时又return了一个render函数，类似这样：`console.log(100);return 200`
  // 所以我们需要这样：eval('(() => {console.log(100);return 200})()')，有点绕，复制到控制台看下、改改，就明白了
  const jsCodeStr = `
    ${transformScriptCode}
    script.render = eval((() => {${transformRenderStr}})())
    export default script
  `
  return jsCodeStr
}

/**
 * @description 获取请求文件后缀
 * @param {string}  文件路径，注意如果路径是url的话，可能带有?参数
 * @return {string} 文件后缀，eg: .js、.vue、.css
 */
const getFileExtname = (urlPath = '') => {
  const filePath = urlPath.split('?')[0] // 去掉参数
  // const extname = filePath.split('.').pop()
  // const extname = filePath.match(/\.\S*$/g)
  const extname = path.extname(filePath)
  return extname
}

/**
 * @description 设置强缓存
 */
const setStrongCache = (ctx) => {
  ctx.set('Cache-Control', 'max-age=31536000,immutable'); // 设置强缓存时间
}

/**
 * @description 设置协商缓存
 */
const setConsultCache = () => {
  ctx['no-cache'] = true // 不走强缓存
  // 需要设置ETag hash值，且需要对比If-None-Match的hash值
}

module.exports = {
  transformPath,
  parseVue,
  getFileExtname,
  setStrongCache,
  setConsultCache,
}