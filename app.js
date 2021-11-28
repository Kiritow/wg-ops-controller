const koa = require('koa')
const koaRouter = require('koa-router')
const koaBodyParser = require('koa-bodyparser')
const koaJson = require('koa-json')
const moment = require('moment')
const crypto = require('crypto')
const DaoClass = require('./dao')
const { GetWireGuardConfigs } = require('./util')

const app = new koa()
app.use(koaBodyParser())
app.use(koaJson())

const router = new koaRouter()

console.log('Checking env...')
const mustEnv = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD']
const mustEnvMissing = mustEnv.map(k => process.env[k]).indexOf(undefined)
if (mustEnvMissing != -1) {
    console.log(`[FATAL] process.env.${mustEnv[mustEnvMissing]} not found!`)
    process.exit(0)
}

const dao = new DaoClass({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'db_controller'
})

function CheckSignature(key, messageBuffer, signatureBuffer) {
    return crypto.verify("sha256", messageBuffer, {
        key: key,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN,
    }, signatureBuffer)
}

async function EnsureSignature(ctx) {
    // GET
    let { node, sign } = ctx.query
    if (!node || !sign ) {
        // POST
        ({ node, sign } = ctx.request.body)
        if (!node || !sign ) {
            ctx.body = {
                code: -1,
                message: "missing parameters",
            }
            return null
        }
    }

    const info = await dao.getNodeByName(node)
    if (!info) {
        ctx.body = {
            code: -1,
            message: 'node not found, please register first',
        }
        return null
    }

    const isVerified = CheckSignature(info.f_pubkey, Buffer.from(node), Buffer.from(sign, 'base64'))
    console.log(`${moment().format('YYYY-MM-DD hh:mm:ss')} ${node} (${isVerified ? "verified" : "unverified"}) ${ctx.request.method} ${ctx.request.url.split('?')[0]}`)

    if (!isVerified) {
        ctx.body = {
            code: -1,
            message: 'signature verify failed',
        }
        return null
    }

    return info
}

router.get('/wgconfig', async (ctx) => {
    const info = await EnsureSignature(ctx)
    if (!info) return

    try {
        const wgConfigList = await GetWireGuardConfigs(dao, info.f_id)
        ctx.body = {
            code: 0,
            message: 'success',
            data: wgConfigList,
        }
    } catch (e) {
        if (e.eType) {
            ctx.body = {
                code: -1,
                message: e.message,
            }
            return
        }
        console.log(e)
        ctx.body = {
            code: -1,
            message: 'Internal Server Error',
        }
    }
})

router.get('/config', async (ctx) => {
    const info = await EnsureSignature(ctx)
    if (!info) return

    const interfaces = (await dao.getInterfaces(info.f_id)).map((row) => ({
        id: row.f_id,
        name: row.f_name,
        key: row.f_wg_pubkey,
        lan: row.f_lan_ip,
        mtu: row.f_mtu,
        port: row.f_port,
    }))

    const settings = await Promise.all(interfaces.map(async (data) => {
        const result = await dao.getWGConnections(data.id)
        if (!result) {
            return data
        }

        data.peers = result.map((row) => {
            const ret = {
                id: row.f_id,
                endip: row.f_endpoint_ip || row.f_endpoint_node_ip,
                endport: row.f_endpoint_port || row.f_interface_port,
                key: row.f_wg_pubkey,
                allow: row.f_allowed_ips,
            }
    
            if (row.f_keepalive) {
                ret.keepalive = row.f_keepalive
            }
    
            if (row.f_ping_ip) {
                ret.ping = row.f_ping_ip
                ret.pingInterval = row.f_ping_interval
            }
    
            return ret
        })
        
        return data
    }))

    ctx.body = {
        code: 0,
        message: 'success',
        data: settings,
    }
})

router.get('/keys', async (ctx) => {
    const info = await EnsureSignature(ctx)
    if (!info) return

    const interfaces = (await dao.getInterfaces(info.f_id)) || []
    const results = interfaces.map((row) => ({
        id: row.f_id,
        name: row.f_name,
        key: row.f_wg_pubkey,
    }))

    ctx.body = {
        code: 0,
        message: 'success',
        data: results,
    }
})

router.post('/key', async (ctx) => {
    const info = await EnsureSignature(ctx)
    if (!info) return

    const { id, key } = ctx.request.body
    if (!id || !key) {
        ctx.body = {
            code: -1,
            message: 'missing parameters',
        }
        return
    }

    try {
        const ret = await dao.setInterfaceKey(info.f_id, id, key)
        if (!ret) {
            ctx.body = {
                code: -1,
                message: 'failed to set key',
            }
            return
        }
        ctx.body = {
            code: 0,
            message: 'success',
        }
    } catch (e) {
        console.log(e)
        ctx.body = {
            code: -1,
            message: 'Internal Server Error',
        }
    }
})

const reportRouter = new koaRouter({
    prefix: '/report'
})

reportRouter.post('/node', async (ctx) => {
    const info = await EnsureSignature(ctx)
    if (!info) return

    const { status } = ctx.request.body
    if (status != null) {
        await dao.reportNodeStatus(info.f_id, status)
    }
    ctx.body = {
        code: 0,
        message: 'success',
    }
})

reportRouter.post('/interface', async (ctx) => {
    const info = await EnsureSignature(ctx)
    if (!info) return

    const { id, status } = ctx.request.body
    if (status != null && id != null) {
        if(!await dao.reportInterfaceStatus(info.f_id, id, status)) {
            console.log(`node ${info.f_id} report not related interface ${id} status ${status}`)
        }
    }
    ctx.body = {
        code: 0,
        message: 'success',
    }
})

reportRouter.post('/link', async (ctx) => {
    const info = await EnsureSignature(ctx)
    if (!info) return

    let { id, ping, status } = ctx.request.body
    if (ping == null || isNaN(parseInt(ping, 10))) {
        ping = 0
    }
    if (status != null && id != null) {
        if(!await dao.reportLinkStatus(info.f_id, id, ping, status, ping)) {
            console.log(`node ${info.f_id} report not related connection ${id} status ${status}`)
        }
    }
    ctx.body = {
        code: 0,
        message: 'success',
    }
})

app.use(router.routes()).use(router.allowedMethods())
app.use(reportRouter.routes()).use(reportRouter.allowedMethods())
app.listen(8081)
console.log('Server started.')
