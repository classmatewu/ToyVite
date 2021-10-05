const path = require('path')
const parser = require('@babel/parser')
const { default: traverse } = require('@babel/traverse')
const generator = require("@babel/generator");

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
      // console.log(test);
      // const esmPath = test.node?.source?.value // 可能是绝对路径，也可能是相对路径
      // test.node.source.value = `./${esmPath}`

      const esmPath = node?.source?.value // 可能是绝对路径，也可能是相对路径
      if (!isLegalEsmPath(esmPath)) {
        node.source.value = `/node_modules/${esmPath}`
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
 */
const parseVue = () => {

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