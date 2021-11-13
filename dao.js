const { BaseDaoClass } = require('./base-dao')

class DaoClass extends BaseDaoClass {
    async getNodeByName(name) {
        const result = await this.query('select * from t_node where f_name=?', [name])
        if (result.length < 1) {
            return null
        }
        return result[0]
    }

    async getInterfaces(nodeId) {
        const result = await this.query('select * from t_interface where f_node_id=? and f_status=1 order by f_id', [nodeId])
        if (result.length < 1) {
            return null
        }
        return result
    }

    async getWGConnections(interfaceId) {
        const result = await this.query(`
        select A.*, B.f_wg_pubkey, B.f_port as f_interface_port,
            C.f_ip as f_endpoint_ip, C.f_port as f_endpoint_port,
            C.f_type as f_endpoint_type, C.f_config as f_endpoint_config,
            C.f_node_ip as f_endpoint_node_ip, C.f_node_name as f_endpoint_node_name
        from t_connection A
            inner join t_interface B on A.f_end_id=B.f_id and B.f_status=1
            left join (
                select X.*, Y.f_ip as f_node_ip, Y.f_name as f_node_name
                from t_endpoint X
                    inner join t_node Y on X.f_node_id=Y.f_id
            ) C on A.f_endpoint_id=C.f_id and C.f_status=1
        where A.f_start_id=? and A.f_status=1 order by A.f_id`, [interfaceId])
        if (result.length < 1) {
            return null
        }
        return result
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
