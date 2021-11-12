const koa = require('koa')
const koaRouter = require('koa-router')
const koaBodyParser = require('koa-bodyparser')
const koaJson = require('koa-json')

const app = new koa()
app.use(koaBodyParser())
app.use(koaJson())

const router = new koaRouter()
app.use(router.routes()).use(router.allowedMethods())
app.listen(8080)
console.log('Server started.')
