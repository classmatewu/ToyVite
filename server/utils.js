/**
 * @description 转换浏览器不认识的路径为认识路径（）
 */
const transformPath = () => {

}

/**
 * @description 解析vue文件的单文件组件，变vue为html、js、css
 */
const parseVue = () => {

}

/**
 * @description 获取请求文件后缀
 * @param {string}  文件路径，注意如果路径是url的话，可能带有?参数
 * @return {string} 文件后缀，eg: .js、.vue、.module.css
 */
const getFileExtname(path = '') {
  const filePath = path.split('?')[0]
  // const extname = filePath.split('.').pop()
  const extname = filePath.match(/\.\S*$/g)
  return extname
}

module.exports = {
  transformPath,
  parseVue,
}