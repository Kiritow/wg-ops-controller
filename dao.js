const { BaseDaoClass } = require('./base-dao')

class DaoClass extends BaseDaoClass {
    async getNodeByName(name) {
        const result = await this.query('select * from t_node where f_name=?', [name])
        if (result.length < 1) {
            return null
        }
        return result[0]
    }

    async getNodeById(nodeId) {
        const result = await this.query('select * from t_node where f_id=?', [nodeId])
        if (result.length < 1) {
            return null
        }
        return result[0]
    }

    async getInterfacesFromNode(nodeId) {
        const result = await this.query('select * from t_interface where f_node_id=? and f_status=1 order by f_id', [nodeId])
        if (result.length < 1) {
            return null
        }
        return result
    }

    async getPeersFromInterface(interfaceId) {
        const result = await this.query(`
        select A.*, B.f_wg_pubkey, B.f_port as f_peer_port, B.f_node_id as f_peer_node
        from t_connection A
            inner join t_interface B on A.f_end_id=B.f_id
        where A.f_status=1 and B.f_status=1 and A.f_start_id=?
        `, [interfaceId])
        if (result.length < 1) {
            return null
        }
        return result
    }

    async getEndpointsFromNode(nodeId) {
        const result = await this.query(`
        select A.*
        from t_endpoint A
            inner join t_node B on A.f_node_id=B.f_id
        where A.f_status=1 and B.f_status=1 and A.f_node_id=?
        `, [nodeId])
        if (result.length < 1) {
            return null
        }
        return result
    }

    async getEndpointFromId(endpointId) {
        const result = await this.query(`
        select A.*, B.f_ip as f_node_ip
        from t_endpoint A
            inner join t_node B on A.f_node_id=B.f_id
        where A.f_status=1 and B.f_status=1 and A.f_id=?
        `, [endpointId])
        if (result.length < 1) {
            return null
        }
        return result[0]
    }

    async setInterfaceKey(nodeId, interfaceId, key) {
        const result = await this.query('update t_interface set f_wg_pubkey=? where f_id=? and f_node_id=?', [key, interfaceId, nodeId])
        return (result.affectedRows > 0)
    }

    async reportNodeStatus(nodeId, status) {
        await this.query('update t_node set f_report_status=?, f_report_time=now() where f_id=?', [status, nodeId])
    }

    async reportInterfaceStatus(nodeId, interfaceId, status) {
        const result = await this.query('update t_interface set f_report_status=?, f_report_time=now() where f_id=? and f_node_id=?', [status, interfaceId, nodeId])
        return (result.affectedRows > 0)
    }

    async reportLinkStatus(nodeId, linkId, status, pingUs) {
        const result = await this.query('update t_connection A inner join t_interface B on A.f_start_id=B.f_id set A.f_report_status=?, A.f_report_ping=?, A.f_report_time=now() where A.f_id=? and B.f_node_id=?', [status, pingUs, linkId, nodeId])
        return (result.affectedRows > 0)
    }
}

module.exports = DaoClass
