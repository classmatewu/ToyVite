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
  const rewritePath = (node) => {
    console.log('---1---', node?.source?.value);
    const esmPath = node?.source?.value // 可能是绝对路径，也可能是相对路径
    if (!isLegalEsmPath(esmPath) && esmPath) {
      node.source.value = `/node_modules/${esmPath}` // TODO 这里稍稍有点小疑问，我这里的node参数不是利用对象解构拿到的么，解构不是深拷贝么，为什么在这里重新赋值，也能得到改造效果，什么原理？？
    }
  }
  traverse(ast, {
    // esm模块加载有两种方式，一种是import xxx from yyy，另一种是export xxx from yyy，之前漏了第二种，现在补上
    // import Vue from 'vue'
    ImportDeclaration({node}) {
      rewritePath(node)
    },
    // export * from '@vue/runtime-dom';
    ExportAllDeclaration({node}) {
      rewritePath(node)
    },
    // export {camelize, capitalize, normalizeClass, normalizeProps, normalizeStyle, toDisplayString, toHandlerKey} from '@vue/shared';
    ExportNamedDeclaration({node}) {
      rewritePath(node)
    }
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
    if (esmPath?.startsWith(path)) {
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
const parseVue = (url, source) => {
  const ast = compilerSFC.parse(source)
  const {template, script, styles} = ast.descriptor

  // 改匿名导出为申明，后面插入render函数后再导出
  const scriptCode = script.content.replace(/export default/, 'const script =')
  const transformScriptCode = transformPath(scriptCode) // 只要是js，就需要转换裸模块的引用方式

  // 将template转换为render渲染函数
  const { code: renderModule } = compilerDOM.compile(template.content, {mode: 'module'}) // 不以module方式的话（vite也是module方式单独引），拿到的code包含with()写法，在严格模式下不通过，浏览器报错`Uncaught SyntaxError: Strict mode code may not include a with statement`
  const transformRenderModuleStr = transformPath(renderModule) // 打印render看了下，这种mode方式下，返回的代码里有import vue，所以也需要转换下裸模块路径
  
  const jsCodeStr = `
    ${transformScriptCode}
    // render module需要发起一次请求来获取，所以vue请求需要分两种情况来判断返回什么文件，type==='tempalte'，返回render module，否则返回主逻辑script
    import { render } from '${url}?type=template'
    script.render = render
    export default script
  `

  // 这里
  return {
    transformRenderModuleStr,
    jsCodeStr
  }
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