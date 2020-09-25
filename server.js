const Koa = require('koa')
const Router = require('koa-router')
const fs = require('fs')
const path = require('path')
const compilerSfc = require('@vue/compiler-sfc')
const compilerDom = require('@vue/compiler-dom')

const app = new Koa()
const router = new Router()

// 返回index.html
router.get('/', async (ctx, next) => {
	let content = fs.readFileSync('./index.html', 'utf-8')
	// Uncaught ReferenceError: process is not defined at shared:387
	content = content.replace(
		'<script',
		`
	    <script>
	      // 注入一个socket客户端
	      // 后端的文件变了，通知前端去更新
	      window.process = {
	        env: {NODE_ENV:'dev'}
				}
				window.__MODE__ = 'development'
				window.__DEFINES__ = {"__VUE_OPTIONS_API__":true,"__VUE_PROD_DEVTOOLS__":false}
				window.__PORT__ = 4000
	    </script>
	    <script

	  `
	)
	ctx.type = 'text/html'
	ctx.body = content
})

// index.html中，会通过ES Module引入main.js（<script type="module" src="/src/main.js"></script>）
// ESM会发起http请求，去获取需要引入的模块
router.get(/\.js$/, async (ctx, next) => {
	const {
		request: { url },
	} = ctx
	let content = fs.readFileSync(path.resolve(__dirname, url.slice(1)), 'utf-8')
	ctx.type = 'application/javascript'
	ctx.body = rewriteImport(content)
})

// /@modules的请求，会去node_modules里面查找模块
router.get(/^\/@modules/, async (ctx, next) => {
	const {
		request: { url },
	} = ctx
	// 模块：xxx/toy-vite/node_modules/vue
	const modulePath = path.resolve(__dirname, 'node_modules', url.replace('/@modules/', ''))
	// 模块文件位置，package文件中的module字段：dist/vue.runtime.esm-bundler.js
	const module = require(`${modulePath}/package.json`).module
	const moduleFilePath = path.resolve(modulePath, module)
	console.log('最终位置：', moduleFilePath)
	const content = fs.readFileSync(moduleFilePath, 'utf-8')
	ctx.type = 'application/javascript'
	ctx.body = rewriteImport(content)
})

// 单文件组件解析，处理：import xx from 'xx.vue'
router.get(/\.vue$/, async (ctx, next) => {
	const {
		request: { url, query },
	} = ctx
	const vueFilePath = path.resolve(__dirname, url.split('?')[0].slice(1))
	// 使用官方库@vue/compiler-sfc解析
	const { descriptor } = compilerSfc.parse(fs.readFileSync(vueFilePath, 'utf-8'))
	console.log('content：', descriptor.script.content)
	if (!query.type) {
		// 处理js内容
		ctx.type = 'application/javascript'
		ctx.body = `
${rewriteImport(descriptor.script.content.replace('export default ', 'const __script = '))}
import {render as __render} from "${url}?type=template"
__script.render = __render
export default __script
		`
	} else if (query.type === 'template') {
		// 解析template，生成render函数
		const template = descriptor.template
		const render = compilerDom.compile(template.content, { mode: 'module' }).code
		ctx.type = 'application/javascript'

		ctx.body = rewriteImport(render)
	}
})

// 处理css请求
router.get(/css$/, async (ctx, next) => {
	const {
		request: { url },
	} = ctx
	const p = path.resolve(__dirname, url.slice(1))
	const file = fs.readFileSync(p, 'utf-8')
	const content = `
			import {updateStyle} from '/vite/client'
      const css = "${file.replace(/\n/g, '')}"
      const link = document.createElement('style')
      link.setAttribute('type', 'text/css')
      document.head.appendChild(link)
      link.innerHTML = css
      export default css
    `
	ctx.type = 'application/javascript'
	ctx.body = content
})

// 处理热更新client
router.get('/vite/client', async (ctx, next) => {
	const {
		request: { url },
	} = ctx
	const modulePath = path.resolve(__dirname, 'node_modules/vite/dist/client/client.js')
	console.log('modulePath：', modulePath)
	let content = fs.readFileSync(modulePath, 'utf-8')
	ctx.type = 'application/javascript'
	ctx.body = rewriteImport(content)
})

// Uncaught TypeError: Failed to resolve module specifier "vue".
// Relative references must start with either "/", "./", or "../".
// 将 from 'vue' 转成 from '/@modules/vue'
function rewriteImport(content) {
	return content.replace(/ from ['|"]([^'"]+)['|"]/g, function (s0, s1) {
		if (s1[0] !== '.' && s1[1] !== '/') {
			return ` from '/@modules/${s1}'`
		} else {
			return s0
		}
	})
}

app.use(router.routes())

app.listen(3999, () => {
	console.log('toy-vite server listen at 3999')
})
