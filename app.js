const koa = require('koa')
const koaRouter = require('koa-router')
const koaBodyParser = require('koa-bodyparser')
const koaJson = require('koa-json')
const moment = require('moment')
const crypto = require('crypto')
const DaoClass = require('./dao')

const app = new koa()
app.use(koaBodyParser())
app.use(koaJson())

const router = new koaRouter()
let dao = new DaoClass({
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

class ServerError extends Error {
    constructor(message) {
        super(message)
        this.eType = 'ServerError'
    }
}

async function GetWireGuardConfigs(nodeId) {
    const interfaces = await dao.getInterfaces(nodeId)

    const usedNames = new Set()
    const usedPorts = new Set()

    const results =  await Promise.all(interfaces.map(async (info) => {
        let name = info.f_name
        if (!name) {
            throw new ServerError(`interface ${info.f_id} has not configured name`)
        }
        if (usedNames.has(name)) {
            throw new ServerError(`duplicate interface name ${name} (on interface ${info.f_id}) for node ${nodeId}`)
        }
        usedNames.add(name)

        let port = info.f_port
        if (!port) {
            throw new ServerError(`interface ${info.f_id} has not configured port`)
        }
        if (usedPorts.has(port)) {
            throw new ServerError(`duplicate port ${port} (on interface ${info.f_id}) for node ${nodeId}`)
        }
        usedPorts.add(port)

        let ip = info.f_lan_ip
        let mtuPart = `MTU = ${info.f_mtu}\n`
        if (!info.f_mtu) {
            mtuPart = ''
        }

        const interfacePart = `[Interface]
PrivateKey = __PRIVATE_KEY__
ListenPort = ${port}
Address = ${ip}
${mtuPart}PostUp=sysctl net.core.default_qdisc=fq
PostUp=sysctl net.ipv4.tcp_congestion_control=bbr
PostUp=sysctl net.ipv4.ip_forward=1
PostUp=iptables -A FORWARD -i ${name} -j ACCEPT
PostUp=iptables -t nat -A POSTROUTING -o ${name} -j MASQUERADE
PostUp=iptables -t nat -A POSTROUTING -o __ETH_NAME__ -j MASQUERADE
PostDown=iptables -D FORWARD -i ${name} -j ACCEPT
PostDown=iptables -t nat -D POSTROUTING -o ${name} -j MASQUERADE
PostDown=iptables -t nat -D POSTROUTING -o __ETH_NAME__ -j MASQUERADE
`
        const connections = await dao.getWGConnections(info.f_id)
        if (!connections) {
            return {
                key: name,
                value: interfacePart,
            }
        }

        const usedPeerPubkey = new Set()

        const peerParts = connections.map((peerInfo) => {
            let endpointPart = ''
            if (peerInfo.f_endpoint_id) {
                const endpointIp = peerInfo.f_endpoint_ip || peerInfo.f_endpoint_node_ip
                const endpointPort = peerInfo.f_endpoint_port || peerInfo.f_interface_port
                if (!endpointIp || !endpointPort) {
                    throw new ServerError(`unable to gather endpoint info for connection ${peerInfo.f_id}`)
                }
                endpointPart = `Endpoint = ${endpointIp}:${endpointPort}\n`
                if (peerInfo.f_keepalive) {
                    endpointPart = `${endpointPart}PersistentKeepalive = ${peerInfo.f_keepalive}\n`
                }
            }

            if (!peerInfo.f_wg_pubkey) {
                throw new ServerError(`peer node ${peerInfo.f_endpoint_node_name} interface ${peerInfo.f_end_id} has not configured public key`)
            }

            if (usedPeerPubkey.has(peerInfo.f_wg_pubkey)) {
                throw new ServerError(`duplicate peer public key ${peerInfo.f_wg_pubkey} (on interface ${info.f_id}) for node ${nodeId}`)
            }
            usedPeerPubkey.add(peerInfo.f_wg_pubkey)

            return `[Peer]
PublicKey = ${peerInfo.f_wg_pubkey}
AllowedIPs = ${peerInfo.f_allowed_ips}
${endpointPart}`
        })

        return {
            key: name,
            value: `${interfacePart}\n${peerParts.join('\n')}`,
        }
    }))

    const obj = {}
    results.forEach((pack) => {
        obj[pack.key] = pack.value
    })
    return obj
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

router.get('/config', async (ctx) => {
    const info = await EnsureSignature(ctx)
    if (!info) return

    try {
        const wgConfigList = await GetWireGuardConfigs(info.f_id)
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

router.post('/reportNode', async (ctx) => {
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

router.post('/reportInterface', async (ctx) => {
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

router.post('/reportLink', async (ctx) => {
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
app.listen(8081)
console.log('Server started.')
