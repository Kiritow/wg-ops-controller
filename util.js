class ServerError extends Error {
    constructor(message) {
        super(message)
        this.eType = 'ServerError'
    }
}

async function GetWireGuardConfigs(dao, nodeId) {
    const interfaces = await dao.getInterfaces(nodeId)

    const usedNames = new Set()
    const usedPorts = new Set()

    return await Promise.all(interfaces.map(async (info) => {
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
                name,
                config: interfacePart,
                report: {
                    id: info.f_id,
                }
            }
        }

        const usedPeerPubkey = new Set()

        const reportPeers = []
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

            const reportInfo = {
                id: peerInfo.f_id,
            }
            if (peerInfo.f_ping_ip) {
                reportInfo.ip = peerInfo.f_ping_ip
                reportInfo.interval = peerInfo.f_ping_interval || 60
            }

            reportPeers.push(reportInfo)

            return `[Peer]
PublicKey = ${peerInfo.f_wg_pubkey}
AllowedIPs = ${peerInfo.f_allowed_ips}
${endpointPart}`
        })

        return {
            name,
            config: `${interfacePart}\n${peerParts.join('\n')}`,
            report: {
                id: info.f_id,
                peers: reportPeers,
            }
        }
    }))
}

module.exports = {
    GetWireGuardConfigs
}
