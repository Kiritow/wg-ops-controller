-- MySQL dump 10.13  Distrib 8.0.27, for Linux (x86_64)
--
-- Host: 127.0.0.1    Database: db_controller
-- ------------------------------------------------------
-- Server version	5.5.5-10.5.10-MariaDB-1:10.5.10+maria~focal

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `t_connection`
--

DROP TABLE IF EXISTS `t_connection`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_connection` (
  `f_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '链接ID',
  `f_start_id` int(11) NOT NULL COMMENT '发起接口ID',
  `f_end_id` int(11) NOT NULL COMMENT '终点接口ID',
  `f_endpoint_id` int(11) NOT NULL DEFAULT 0 COMMENT '终点终端ID',
  `f_allowed_ips` varchar(128) NOT NULL DEFAULT '' COMMENT '许可路由',
  `f_keepalive` int(11) NOT NULL DEFAULT 0 COMMENT '保持时间',
  `f_ping_ip` varchar(128) NOT NULL DEFAULT '' COMMENT '延迟测试IP',
  `f_ping_interval` int(11) NOT NULL DEFAULT 0 COMMENT '延迟测试时间',
  `f_status` int(11) NOT NULL DEFAULT 1 COMMENT '状态',
  `f_report_status` int(11) NOT NULL DEFAULT 0 COMMENT '报告状态',
  `f_report_ping` int(11) NOT NULL DEFAULT 0 COMMENT '报告延迟us',
  `f_report_time` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' COMMENT '报告时间',
  `f_create_time` timestamp NOT NULL DEFAULT current_timestamp() COMMENT '创建时间',
  `f_update_time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT '更新时间',
  PRIMARY KEY (`f_id`),
  UNIQUE KEY `k_uni_key` (`f_start_id`,`f_end_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='链接配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `t_connection_view`
--

DROP TABLE IF EXISTS `t_connection_view`;
/*!50001 DROP VIEW IF EXISTS `t_connection_view`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `t_connection_view` AS SELECT 
 1 AS `f_id`,
 1 AS `f_start_node`,
 1 AS `f_end_node`,
 1 AS `f_start_key`,
 1 AS `f_end_key`,
 1 AS `f_endpoint_id`,
 1 AS `f_allowed_ips`,
 1 AS `f_keepalive`,
 1 AS `f_ping_ip`,
 1 AS `f_ping_interval`,
 1 AS `f_status`,
 1 AS `f_report_status`,
 1 AS `f_report_ping`,
 1 AS `f_report_time`,
 1 AS `f_create_time`,
 1 AS `f_update_time`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `t_endpoint`
--

DROP TABLE IF EXISTS `t_endpoint`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_endpoint` (
  `f_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '终端ID',
  `f_node_id` int(11) NOT NULL COMMENT '节点ID',
  `f_ip` varchar(32) NOT NULL DEFAULT '' COMMENT 'IP地址',
  `f_port` int(11) NOT NULL DEFAULT 0 COMMENT '端口',
  `f_type` int(11) NOT NULL DEFAULT 1 COMMENT '类型',
  `f_config` varchar(4096) NOT NULL COMMENT '配置信息',
  `f_status` int(11) NOT NULL DEFAULT 1 COMMENT '状态',
  `f_report_status` int(11) NOT NULL DEFAULT 0 COMMENT '报告状态',
  `f_report_time` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' COMMENT '报告时间',
  `f_create_time` timestamp NOT NULL DEFAULT current_timestamp() COMMENT '创建时间',
  `f_update_time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT '更新时间',
  PRIMARY KEY (`f_id`),
  UNIQUE KEY `k_uni_key` (`f_node_id`,`f_ip`,`f_port`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='终端表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `t_interface`
--

DROP TABLE IF EXISTS `t_interface`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_interface` (
  `f_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '接口ID',
  `f_node_id` int(11) NOT NULL COMMENT '节点ID',
  `f_name` varchar(32) NOT NULL COMMENT '网卡名称',
  `f_wg_pubkey` varchar(128) NOT NULL DEFAULT '' COMMENT 'WireGuard公钥',
  `f_lan_ip` varchar(64) NOT NULL DEFAULT '' COMMENT '内网IP',
  `f_mtu` int(11) NOT NULL DEFAULT 0 COMMENT 'MTU设置',
  `f_port` int(11) NOT NULL COMMENT '监听端口',
  `f_status` int(11) NOT NULL DEFAULT 0 COMMENT '状态',
  `f_report_status` int(11) NOT NULL DEFAULT 0 COMMENT '报告状态',
  `f_report_time` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' COMMENT '报告时间',
  `f_create_time` timestamp NOT NULL DEFAULT current_timestamp() COMMENT '创建时间',
  `f_update_time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT '更新时间',
  PRIMARY KEY (`f_id`),
  UNIQUE KEY `k_uni_key` (`f_node_id`,`f_wg_pubkey`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='接口表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `t_interface_view`
--

DROP TABLE IF EXISTS `t_interface_view`;
/*!50001 DROP VIEW IF EXISTS `t_interface_view`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `t_interface_view` AS SELECT 
 1 AS `f_id`,
 1 AS `f_node_name`,
 1 AS `f_name`,
 1 AS `f_lan_ip`,
 1 AS `f_wg_pubkey`,
 1 AS `f_mtu`,
 1 AS `f_port`,
 1 AS `f_status`,
 1 AS `f_report_status`,
 1 AS `f_report_time`,
 1 AS `f_create_time`,
 1 AS `f_update_time`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `t_node`
--

DROP TABLE IF EXISTS `t_node`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_node` (
  `f_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '节点ID',
  `f_name` varchar(64) NOT NULL COMMENT '节点名称',
  `f_ip` varchar(64) NOT NULL DEFAULT '' COMMENT '公网IP',
  `f_pubkey` varchar(4096) NOT NULL COMMENT '节点RSA公钥PEM',
  `f_status` int(11) NOT NULL DEFAULT 1 COMMENT '状态',
  `f_report_status` int(11) NOT NULL DEFAULT 0 COMMENT '报告状态',
  `f_report_time` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' COMMENT '报告时间',
  `f_create_time` timestamp NOT NULL DEFAULT current_timestamp() COMMENT '创建时间',
  `f_update_time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT '更新时间',
  PRIMARY KEY (`f_id`),
  UNIQUE KEY `k_uni_key` (`f_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='节点表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `t_report`
--

DROP TABLE IF EXISTS `t_report`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_report` (
  `f_id` int(11) NOT NULL AUTO_INCREMENT COMMENT '报告ID',
  `f_node` int(11) NOT NULL COMMENT '报告节点',
  `f_type` int(11) NOT NULL COMMENT '报告类型',
  `f_report_id` int(11) NOT NULL COMMENT '报告目标ID',
  `f_status` int(11) NOT NULL COMMENT '报告状态',
  `f_ping` int(11) NOT NULL DEFAULT 0 COMMENT '报告延迟',
  `f_create_time` timestamp NOT NULL DEFAULT current_timestamp() COMMENT '创建时间',
  PRIMARY KEY (`f_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='报告记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Final view structure for view `t_connection_view`
--

/*!50001 DROP VIEW IF EXISTS `t_connection_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `t_connection_view` AS select `C`.`f_id` AS `f_id`,`A`.`f_node_name` AS `f_start_node`,`B`.`f_node_name` AS `f_end_node`,`A`.`f_wg_pubkey` AS `f_start_key`,`B`.`f_wg_pubkey` AS `f_end_key`,`C`.`f_endpoint_id` AS `f_endpoint_id`,`C`.`f_allowed_ips` AS `f_allowed_ips`,`C`.`f_keepalive` AS `f_keepalive`,`C`.`f_ping_ip` AS `f_ping_ip`,`C`.`f_ping_interval` AS `f_ping_interval`,`C`.`f_status` AS `f_status`,`C`.`f_report_status` AS `f_report_status`,`C`.`f_report_ping` AS `f_report_ping`,`C`.`f_report_time` AS `f_report_time`,`C`.`f_create_time` AS `f_create_time`,`C`.`f_update_time` AS `f_update_time` from ((`t_connection` `C` join `t_interface_view` `A` on(`C`.`f_start_id` = `A`.`f_id`)) join `t_interface_view` `B` on(`C`.`f_end_id` = `B`.`f_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `t_interface_view`
--

/*!50001 DROP VIEW IF EXISTS `t_interface_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `t_interface_view` AS select `B`.`f_id` AS `f_id`,`A`.`f_name` AS `f_node_name`,`B`.`f_name` AS `f_name`,`B`.`f_lan_ip` AS `f_lan_ip`,`B`.`f_wg_pubkey` AS `f_wg_pubkey`,`B`.`f_mtu` AS `f_mtu`,`B`.`f_port` AS `f_port`,`B`.`f_status` AS `f_status`,`B`.`f_report_status` AS `f_report_status`,`B`.`f_report_time` AS `f_report_time`,`B`.`f_create_time` AS `f_create_time`,`B`.`f_update_time` AS `f_update_time` from (`t_interface` `B` left join `t_node` `A` on(`B`.`f_node_id` = `A`.`f_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2021-11-29  4:54:47
