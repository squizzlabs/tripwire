-- tripwire.sql
-- Updated for MySQL 8.4.4 LTS
-- Using newer utf8mb4_0900_ai_ci collation, optimized indexes, and proper foreign key constraints

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_history_login`
--

DROP TABLE IF EXISTS `_history_login`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_history_login` (
  `ip` varchar(42) NOT NULL,
  `username` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `method` enum('user','api','cookie','sso') NOT NULL,
  `result` enum('success','fail') NOT NULL,
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ip`,`time`),
  KEY `username` (`username`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_history_signatures`
--

DROP TABLE IF EXISTS `_history_signatures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_history_signatures` (
  `historyID` int NOT NULL AUTO_INCREMENT,
  `id` int NOT NULL,
  `signatureID` char(6) DEFAULT NULL,
  `systemID` int DEFAULT NULL,
  `type` enum('unknown','combat','data','relic','ore','gas','wormhole','other') NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `bookmark` varchar(100) DEFAULT NULL,
  `lifeTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lifeLeft` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lifeLength` int NOT NULL,
  `createdByID` int NOT NULL,
  `createdByName` varchar(100) NOT NULL,
  `modifiedByID` int NOT NULL,
  `modifiedByName` varchar(100) NOT NULL,
  `modifiedTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `maskID` decimal(12,1) NOT NULL,
  `status` enum('add','update','delete','undo:add','undo:update','undo:delete') NOT NULL,
  PRIMARY KEY (`historyID`),
  KEY `systemID` (`systemID`) USING BTREE,
  KEY `id` (`id`) USING BTREE,
  KEY `maskID` (`maskID`) USING BTREE,
  KEY `status` (`status`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_history_wormholes`
--

DROP TABLE IF EXISTS `_history_wormholes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `_history_wormholes` (
  `historyID` int NOT NULL AUTO_INCREMENT,
  `id` int NOT NULL,
  `initialID` int NOT NULL,
  `secondaryID` int NOT NULL,
  `type` char(4) DEFAULT NULL,
  `parent` char(9) DEFAULT NULL,
  `life` enum('stable','critical') NOT NULL,
  `mass` enum('stable','destab','critical') NOT NULL,
  `maskID` decimal(12,1) NOT NULL,
  `status` enum('add','update','delete','undo:add','undo:update','undo:delete') NOT NULL,
  PRIMARY KEY (`historyID`),
  KEY `id_index` (`id`) USING BTREE,
  KEY `mask_index` (`maskID`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `accounts`
--

DROP TABLE IF EXISTS `accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `password` char(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `ban` tinyint NOT NULL DEFAULT '0',
  `super` tinyint NOT NULL DEFAULT '0',
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `logins` int NOT NULL DEFAULT '0',
  `lastLogin` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`) USING BTREE,
  KEY `ban` (`ban`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `active`
--

DROP TABLE IF EXISTS `active`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `active` (
  `ip` char(42) NOT NULL,
  `instance` decimal(13,3) NOT NULL DEFAULT '0.000',
  `session` char(50) NOT NULL,
  `userID` mediumint NOT NULL,
  `maskID` decimal(12,1) NOT NULL,
  `systemID` int DEFAULT NULL,
  `systemName` char(50) DEFAULT NULL,
  `activity` char(25) DEFAULT NULL,
  `notify` char(150) DEFAULT NULL,
  `version` varchar(100) DEFAULT NULL,
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ip`,`instance`,`session`,`userID`),
  KEY `notify` (`notify`) USING BTREE,
  KEY `activity` (`activity`) USING BTREE,
  KEY `instance` (`instance`) USING BTREE,
  KEY `maskID` (`maskID`) USING BTREE,
  KEY `time` (`time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `characters`
--

DROP TABLE IF EXISTS `characters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `characters` (
  `userID` int NOT NULL,
  `characterID` int NOT NULL,
  `characterName` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `corporationID` int NOT NULL,
  `corporationName` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `admin` tinyint NOT NULL DEFAULT '0',
  `ban` tinyint NOT NULL DEFAULT '0',
  `added` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userID`),
  UNIQUE KEY `characterID` (`characterID`) USING BTREE,
  KEY `ban` (`ban`) USING BTREE,
  KEY `admin` (`admin`) USING BTREE,
  KEY `corporationID` (`corporationID`) USING BTREE,
  CONSTRAINT `characters_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `comments`
--

DROP TABLE IF EXISTS `comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `systemID` int NOT NULL,
  `comment` text NOT NULL,
  `created` datetime NOT NULL,
  `createdByID` int NOT NULL,
  `createdByName` varchar(100) NOT NULL,
  `modified` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modifiedByID` int NOT NULL,
  `modifiedByName` varchar(100) NOT NULL,
  `maskID` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `maskID` (`maskID`) USING BTREE,
  KEY `system_mask_idx` (`maskID`,`systemID`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `esi`
--

DROP TABLE IF EXISTS `esi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `esi` (
  `userID` int NOT NULL,
  `characterID` int NOT NULL,
  `characterName` varchar(100) NOT NULL,
  `accessToken` varchar(3000) NOT NULL,
  `refreshToken` varchar(1000) NOT NULL,
  `tokenExpire` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `lastActive` timestamp NULL DEFAULT NULL,
  `online` tinyint(1) DEFAULT NULL,
  `onlineCheckedAt` datetime(3) DEFAULT NULL,
  `locationCheckedAt` datetime(3) DEFAULT NULL,
  `locationObservedAt` datetime(3) DEFAULT NULL,
  `lastLocationSystemID` int DEFAULT NULL,
  PRIMARY KEY (`userID`,`characterID`),
  KEY `characterID` (`characterID`) USING BTREE,
  KEY `userID` (`userID`) USING BTREE,
  KEY `lastActive` (`lastActive`) USING BTREE,
  CONSTRAINT `esi_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Trigger: trackingRemove (Remove DEFINER, use plain CREATE TRIGGER)
--

DELIMITER ;;
CREATE TRIGGER `trackingRemove`
AFTER DELETE ON `esi`
FOR EACH ROW
BEGIN
    DELETE FROM tracking WHERE characterID = OLD.characterID;
END;;
DELIMITER ;

--
-- Table structure for table `flares`
--

DROP TABLE IF EXISTS `flares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `flares` (
  `maskID` decimal(12,1) NOT NULL,
  `systemID` int NOT NULL,
  `flare` varchar(32) NOT NULL,
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`maskID`,`systemID`),
  KEY `time` (`time`) USING BTREE,
  KEY `maskID` (`maskID`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `groups`
--

DROP TABLE IF EXISTS `groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `groups` (
  `maskID` decimal(12,1) NOT NULL,
  `joined` tinyint NOT NULL DEFAULT '0',
  `eveID` int NOT NULL,
  `eveType` smallint NOT NULL,
  PRIMARY KEY (`maskID`,`eveType`,`eveID`),
  KEY `joined` (`joined`) USING BTREE,
  KEY `eveType` (`eveType`) USING BTREE,
  KEY `eveID` (`eveID`) USING BTREE,
  KEY `maskID` (`maskID`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `jumps`
--

DROP TABLE IF EXISTS `jumps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `jumps` (
  `wormholeID` int NOT NULL,
  `characterID` int NOT NULL,
  `characterName` varchar(50) NOT NULL,
  `fromID` int NOT NULL,
  `fromName` varchar(20) DEFAULT NULL,
  `toID` int NOT NULL,
  `toName` varchar(20) DEFAULT NULL,
  `shipTypeID` int DEFAULT NULL,
  `shipType` varchar(50) DEFAULT NULL,
  `maskID` decimal(12,1) NOT NULL DEFAULT '0.0',
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `shipTypeID` (`shipTypeID`) USING BTREE,
  KEY `maskID` (`maskID`) USING BTREE,
  KEY `wormholeID` (`wormholeID`) USING BTREE,
  KEY `time` (`time`) USING BTREE,
  KEY `massSearch` (`maskID`,`wormholeID`,`time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `masks`
--

DROP TABLE IF EXISTS `masks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `masks` (
  `maskID` decimal(12,1) NOT NULL,
  `name` varchar(100) NOT NULL,
  `ownerID` int NOT NULL,
  `ownerType` smallint NOT NULL,
  PRIMARY KEY (`maskID`),
  UNIQUE KEY `name` (`name`,`ownerID`,`ownerType`) USING BTREE,
  KEY `ownerID` (`ownerID`) USING BTREE,
  KEY `ownerType` (`ownerType`) USING BTREE,
  KEY `maskSearch` (`maskID`,`ownerType`,`ownerID`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `preferences`
--

DROP TABLE IF EXISTS `preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `preferences` (
  `userID` int NOT NULL,
  `options` json DEFAULT NULL,
  PRIMARY KEY (`userID`),
  CONSTRAINT `preferences_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `signatures`
--

DROP TABLE IF EXISTS `signatures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `signatures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `signatureID` char(6) DEFAULT NULL,
  `systemID` int DEFAULT NULL,
  `type` enum('unknown','combat','data','relic','ore','gas','wormhole','other') NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `bookmark` varchar(100) DEFAULT NULL,
  `lifeTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lifeLeft` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lifeLength` int NOT NULL,
  `createdByID` int NOT NULL,
  `createdByName` varchar(100) NOT NULL,
  `modifiedByID` int NOT NULL,
  `modifiedByName` varchar(100) NOT NULL,
  `modifiedTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `maskID` decimal(12,1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `system_mask_idx` (`systemID`,`maskID`) USING BTREE,
  KEY `modifiedTime` (`modifiedTime`) USING BTREE,
  KEY `maskID` (`maskID`) USING BTREE,
  KEY `life_idx` (`lifeLeft`,`lifeLength`) USING BTREE,
  KEY `type` (`type`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `statistics`
--

DROP TABLE IF EXISTS `statistics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `statistics` (
  `userID` int NOT NULL,
  `characterID` int NOT NULL,
  `maskID` decimal(12,1) NOT NULL,
  `signatures_added` int NOT NULL DEFAULT '0',
  `signatures_updated` int NOT NULL DEFAULT '0',
  `signatures_deleted` int NOT NULL DEFAULT '0',
  `wormholes_added` int NOT NULL DEFAULT '0',
  `wormholes_updated` int NOT NULL DEFAULT '0',
  `wormholes_deleted` int NOT NULL DEFAULT '0',
  `comments_added` int NOT NULL DEFAULT '0',
  `comments_updated` int NOT NULL DEFAULT '0',
  `comments_deleted` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`userID`,`characterID`,`maskID`),
  CONSTRAINT `statistics_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `system_activity`
--

DROP TABLE IF EXISTS `system_activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_activity` (
  `systemID` int NOT NULL,
  `time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `shipJumps` mediumint NOT NULL DEFAULT '0',
  `shipKills` mediumint NOT NULL DEFAULT '0',
  `podKills` mediumint NOT NULL DEFAULT '0',
  `npcKills` mediumint NOT NULL DEFAULT '0',
  PRIMARY KEY (`systemID`,`time`),
  KEY `time_idx` (`time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `system_visits`
--

DROP TABLE IF EXISTS `system_visits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_visits` (
  `userID` int NOT NULL,
  `characterID` int NOT NULL,
  `systemID` int NOT NULL,
  `date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userID`,`characterID`,`systemID`,`date`),
  CONSTRAINT `system_visits_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=COMPACT;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tokens`
--

DROP TABLE IF EXISTS `tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tokens` (
  `userID` int NOT NULL,
  `token` varchar(400) NOT NULL,
  PRIMARY KEY (`userID`),
  CONSTRAINT `tokens_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tracking`
--

DROP TABLE IF EXISTS `tracking`;
/*!40101 SET @saved_cs_client      = @@character_set_client */;
/*!40101 SET character_set_client  = utf8mb4 */;
CREATE TABLE `tracking` (
  `userID` int NOT NULL,
  `characterID` int NOT NULL,
  `characterName` varchar(100) NOT NULL,
  `systemID` int NOT NULL,
  `systemName` varchar(100) NOT NULL,
  `stationID` int DEFAULT NULL,
  `stationName` varchar(100) DEFAULT NULL,
  `shipID` bigint DEFAULT NULL,
  `shipName` varchar(100) DEFAULT NULL,
  `shipTypeID` int DEFAULT NULL,
  `shipTypeName` varchar(100) DEFAULT NULL,
  `maskID` decimal(12,1) NOT NULL,
  PRIMARY KEY (`maskID`,`characterID`),
  KEY `systemID` (`systemID`) USING HASH,
  KEY `occupantSearch` (`maskID`,`systemID`) USING HASH,
  KEY `characterID` (`characterID`) USING HASH,
  KEY `maskID` (`maskID`) USING HASH,
  KEY `userID` (`userID`) USING HASH,
  KEY `system_mask_idx` (`maskID`,`systemID`) USING HASH,
  CONSTRAINT `tracking_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=MEMORY DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `automap_pending`
--

DROP TABLE IF EXISTS `automap_pending`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `automap_pending` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userID` int NOT NULL,
  `characterID` int NOT NULL,
  `characterName` varchar(100) NOT NULL,
  `maskID` decimal(12,1) NOT NULL,
  `fromSystemID` int NOT NULL,
  `toSystemID` int NOT NULL,
  `observedAt` datetime(3) NOT NULL,
  `createdWormholeID` int NOT NULL,
  `candidates` json NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_mask_created` (`userID`,`maskID`,`createdAt`),
  CONSTRAINT `automap_pending_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Trigger: systemVisits (Remove DEFINER, plain CREATE TRIGGER)
--

DELIMITER ;;
CREATE TRIGGER `systemVisits`
AFTER UPDATE ON `tracking`
FOR EACH ROW
BEGIN
    IF NEW.systemID <> OLD.systemID THEN
        INSERT INTO system_visits (userID, characterID, systemID, date)
        VALUES (NEW.userID, NEW.characterID, NEW.systemID, NOW());
    END IF;
END;;
DELIMITER ;

--
-- Trigger: jumpHistory (Remove DEFINER, plain CREATE TRIGGER)
--

DELIMITER ;;
CREATE TRIGGER `jumpHistory`
AFTER UPDATE ON `tracking`
FOR EACH ROW
BEGIN
    IF NEW.systemID <> OLD.systemID THEN
        SET @wormholeID = (
          SELECT w.id
          FROM wormholes w
          INNER JOIN signatures a ON initialID = a.id
          INNER JOIN signatures b ON secondaryID = b.id
          WHERE (a.systemID = NEW.systemID OR b.systemID = NEW.systemID)
            AND (a.systemID = OLD.systemID OR b.systemID = OLD.systemID)
          LIMIT 1
        );
        IF @wormholeID IS NOT NULL THEN
            INSERT INTO jumps (
              wormholeID, characterID, characterName,
              toID, toName, fromID, fromName,
              shipTypeID, shipType, maskID
            ) VALUES (
              @wormholeID, NEW.characterID, NEW.characterName,
              NEW.systemID, NEW.systemName,
              OLD.systemID, OLD.systemName,
              NEW.shipTypeID, NEW.shipTypeName, NEW.maskID
            );
        END IF;
    END IF;
END;;
DELIMITER ;

--
-- Table structure for table `wormholes`
--

DROP TABLE IF EXISTS `wormholes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `wormholes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `initialID` int NOT NULL,
  `secondaryID` int NOT NULL,
  `type` char(4) DEFAULT NULL,
  `parent` char(9) DEFAULT NULL,
  `life` enum('stable','critical') NOT NULL,
  `mass` enum('stable','destab','critical') NOT NULL,
  `maskID` decimal(12,1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `maskID` (`maskID`) USING BTREE,
  KEY `initialID` (`initialID`) USING BTREE,
  KEY `secondaryID` (`secondaryID`) USING BTREE,
  CONSTRAINT `wormholes_initialID_fk` FOREIGN KEY (`initialID`) REFERENCES `signatures` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `wormholes_secondaryID_fk` FOREIGN KEY (`secondaryID`) REFERENCES `signatures` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Event: activeClean, flaresClean, etc. (Remove DEFINER, use CREATE EVENT)
-- If needed, rename or keep them as is if MySQL 5.7+ allows them to run.

DROP EVENT IF EXISTS `activeClean`;
DELIMITER ;;
CREATE EVENT `activeClean`
ON SCHEDULE EVERY 15 SECOND
STARTS CURRENT_TIMESTAMP
ON COMPLETION NOT PRESERVE
ENABLE
DO
  DELETE FROM active WHERE time < NOW() - INTERVAL 15 SECOND;
;;
DELIMITER ;

DROP EVENT IF EXISTS `flaresClean`;
DELIMITER ;;
CREATE EVENT `flaresClean`
ON SCHEDULE EVERY 1 HOUR
STARTS CURRENT_TIMESTAMP
ON COMPLETION NOT PRESERVE
ENABLE
DO
  DELETE FROM flares WHERE time < NOW() - INTERVAL 24 HOUR;
;;
DELIMITER ;

DROP EVENT IF EXISTS `jumpsClean`;
DELIMITER ;;
CREATE EVENT `jumpsClean`
ON SCHEDULE EVERY 1 HOUR
STARTS CURRENT_TIMESTAMP
ON COMPLETION NOT PRESERVE
ENABLE
DO
  DELETE FROM `jumps`
   WHERE wormholeID NOT IN (
     SELECT id FROM wormholes WHERE type <> 'GATE'
   );
;;
DELIMITER ;

-- BEGIN GENERATED SIGNATURE EXPIRY POLICY
-- Generated by tools/build-signature-expiry.py; edit the JSON, not these values.
CREATE TABLE IF NOT EXISTS signature_lifetime_limits (
    type VARCHAR(4) NOT NULL PRIMARY KEY,
    seconds INT NOT NULL
);
INSERT INTO signature_lifetime_limits (type, seconds) VALUES
    ('A009', 16200),
    ('A239', 86400),
    ('A641', 57600),
    ('A982', 86400),
    ('B041', 172800),
    ('B274', 86400),
    ('B449', 57600),
    ('B520', 86400),
    ('B735', 57600),
    ('C008', 16200),
    ('C125', 57600),
    ('C140', 86400),
    ('C247', 57600),
    ('C248', 86400),
    ('C391', 86400),
    ('C414', 57600),
    ('C729', 43200),
    ('D364', 57600),
    ('D382', 57600),
    ('D792', 86400),
    ('D845', 86400),
    ('E004', 16200),
    ('E175', 57600),
    ('E545', 86400),
    ('E587', 57600),
    ('F135', 57600),
    ('F216', 43200),
    ('F353', 57600),
    ('G008', 16200),
    ('G024', 57600),
    ('H121', 57600),
    ('H296', 86400),
    ('H900', 86400),
    ('I078', 43200),
    ('I182', 57600),
    ('J244', 86400),
    ('J377', 86400),
    ('J492', 86400),
    ('K329', 86400),
    ('K346', 86400),
    ('L005', 16200),
    ('L031', 57600),
    ('L477', 57600),
    ('L614', 86400),
    ('L687', 43200),
    ('M001', 16200),
    ('M164', 57600),
    ('M267', 57600),
    ('M555', 86400),
    ('M609', 57600),
    ('N062', 86400),
    ('N110', 86400),
    ('N290', 86400),
    ('N432', 86400),
    ('N766', 57600),
    ('N770', 86400),
    ('N944', 86400),
    ('N968', 57600),
    ('O128', 86400),
    ('O477', 57600),
    ('O546', 43200),
    ('O883', 57600),
    ('P060', 57600),
    ('Q003', 16200),
    ('Q063', 57600),
    ('Q317', 57600),
    ('R051', 57600),
    ('R081', 43200),
    ('R259', 57600),
    ('R474', 86400),
    ('R943', 57600),
    ('S047', 86400),
    ('S199', 86400),
    ('S804', 86400),
    ('S877', 57600),
    ('T405', 57600),
    ('T458', 57600),
    ('U210', 84600),
    ('U319', 172800),
    ('U372', 43200),
    ('U574', 86400),
    ('V283', 86400),
    ('V301', 57600),
    ('V753', 86400),
    ('V898', 57600),
    ('V911', 86400),
    ('V928', 57600),
    ('W237', 86400),
    ('X450', 43200),
    ('X702', 86400),
    ('X877', 57600),
    ('Y683', 57600),
    ('Y790', 57600),
    ('Z006', 16200),
    ('Z060', 86400),
    ('Z142', 86400),
    ('Z457', 57600),
    ('Z647', 57600),
    ('Z971', 57600)
ON DUPLICATE KEY UPDATE seconds = VALUES(seconds);

-- These categories encode the same endpoint eligibility used by the browser.
CREATE TABLE IF NOT EXISTS signature_system_categories (
    systemID INT NOT NULL PRIMARY KEY,
    category SMALLINT NOT NULL
);
INSERT INTO signature_system_categories (systemID, category) VALUES
    (30000001, 1), (30000002, 1), (30000003, 1), (30000004, 1), (30000005, 1), (30000006, 1), (30000007, 1), (30000008, 1), (30000009, 1), (30000010, 1), (30000011, 1), (30000012, 2),
    (30000013, 2), (30000014, 2), (30000015, 2), (30000016, 2), (30000017, 2), (30000018, 2), (30000019, 2), (30000020, 2), (30000021, 3), (30000022, 2), (30000023, 1), (30000024, 1),
    (30000025, 1), (30000026, 1), (30000027, 1), (30000028, 1), (30000029, 1), (30000030, 1), (30000031, 1), (30000032, 1), (30000033, 1), (30000034, 1), (30000035, 1), (30000036, 2),
    (30000037, 2), (30000038, 2), (30000039, 2), (30000040, 2), (30000041, 2), (30000042, 1), (30000043, 2), (30000044, 2), (30000045, 2), (30000046, 2), (30000047, 2), (30000048, 1),
    (30000049, 2), (30000050, 1), (30000051, 1), (30000052, 1), (30000053, 1), (30000054, 1), (30000055, 1), (30000056, 1), (30000057, 1), (30000058, 1), (30000059, 1), (30000060, 1),
    (30000061, 1), (30000062, 1), (30000063, 1), (30000064, 1), (30000065, 2), (30000066, 1), (30000067, 2), (30000068, 1), (30000069, 1), (30000070, 2), (30000071, 1), (30000072, 2),
    (30000073, 2), (30000074, 2), (30000075, 2), (30000076, 1), (30000077, 1), (30000078, 1), (30000079, 1), (30000080, 1), (30000081, 1), (30000082, 1), (30000083, 1), (30000084, 1),
    (30000085, 1), (30000086, 1), (30000087, 1), (30000088, 1), (30000089, 2), (30000090, 2), (30000091, 2), (30000092, 2), (30000093, 2), (30000094, 2), (30000095, 2), (30000096, 2),
    (30000097, 2), (30000098, 2), (30000099, 2), (30000100, 2), (30000101, 1), (30000102, 2), (30000103, 1), (30000104, 2), (30000105, 2), (30000106, 1), (30000107, 1), (30000108, 2),
    (30000109, 1), (30000110, 2), (30000111, 2), (30000112, 1), (30000113, 2), (30000114, 2), (30000115, 2), (30000116, 2), (30000117, 2), (30000118, 2), (30000119, 1), (30000120, 1),
    (30000121, 1), (30000122, 1), (30000123, 1), (30000124, 1), (30000125, 1), (30000126, 1), (30000127, 1), (30000128, 1), (30000129, 1), (30000130, 1), (30000131, 1), (30000132, 1),
    (30000133, 1), (30000134, 1), (30000135, 1), (30000136, 1), (30000137, 1), (30000138, 1), (30000139, 1), (30000140, 1), (30000141, 1), (30000142, 1), (30000143, 1), (30000144, 1),
    (30000145, 1), (30000146, 1), (30000147, 1), (30000148, 1), (30000149, 1), (30000150, 1), (30000151, 1), (30000152, 1), (30000153, 1), (30000154, 1), (30000155, 1), (30000156, 1),
    (30000157, 3), (30000158, 1), (30000159, 1), (30000160, 1), (30000161, 1), (30000162, 2), (30000163, 2), (30000164, 2), (30000165, 1), (30000166, 1), (30000167, 1), (30000168, 1),
    (30000169, 2), (30000170, 1), (30000171, 1), (30000172, 1), (30000173, 1), (30000174, 1), (30000175, 1), (30000176, 1), (30000177, 1), (30000178, 1), (30000179, 1), (30000180, 1),
    (30000181, 1), (30000182, 1), (30000183, 1), (30000184, 1), (30000185, 1), (30000186, 2), (30000187, 1), (30000188, 1), (30000189, 1), (30000190, 1), (30000191, 2), (30000192, 3),
    (30000193, 1), (30000194, 2), (30000195, 2), (30000196, 2), (30000197, 2), (30000198, 2), (30000199, 2), (30000200, 2), (30000201, 1), (30000202, 1), (30000203, 2), (30000204, 2),
    (30000205, 2), (30000206, 3), (30000207, 2), (30000208, 4), (30000209, 4), (30000210, 4), (30000211, 4), (30000212, 4), (30000213, 4), (30000214, 4), (30000215, 4), (30000216, 4),
    (30000217, 4), (30000218, 4), (30000219, 4), (30000220, 4), (30000221, 4), (30000222, 4), (30000223, 4), (30000224, 4), (30000225, 4), (30000226, 4), (30000227, 4), (30000228, 4),
    (30000229, 4), (30000230, 4), (30000231, 4), (30000232, 4), (30000233, 4), (30000234, 4), (30000235, 4), (30000236, 4), (30000237, 4), (30000238, 4), (30000239, 4), (30000240, 4),
    (30000241, 4), (30000242, 4), (30000243, 4), (30000244, 4), (30000245, 4), (30000246, 4), (30000247, 4), (30000248, 4), (30000249, 4), (30000250, 4), (30000251, 4), (30000252, 4),
    (30000253, 4), (30000254, 4), (30000255, 4), (30000256, 4), (30000257, 4), (30000258, 4), (30000259, 4), (30000260, 4), (30000261, 4), (30000262, 4), (30000263, 4), (30000264, 4),
    (30000265, 4), (30000266, 4), (30000267, 4), (30000268, 4), (30000269, 4), (30000270, 4), (30000271, 4), (30000272, 4), (30000273, 4), (30000274, 4), (30000275, 4), (30000276, 4),
    (30000277, 4), (30000278, 4), (30000279, 4), (30000280, 4), (30000281, 4), (30000282, 4), (30000283, 4), (30000284, 4), (30000285, 4), (30000286, 4), (30000287, 4), (30000288, 4),
    (30000289, 4), (30000290, 4), (30000291, 4), (30000292, 4), (30000293, 4), (30000294, 4), (30000295, 4), (30000296, 4), (30000297, 4), (30000298, 4), (30000299, 4), (30000300, 4),
    (30000301, 4), (30000302, 4), (30000303, 4), (30000304, 4), (30000305, 4), (30000306, 4), (30000307, 4), (30000308, 4), (30000309, 4), (30000310, 4), (30000311, 4), (30000312, 4),
    (30000313, 4), (30000314, 4), (30000315, 4), (30000316, 4), (30000317, 4), (30000318, 4), (30000319, 4), (30000320, 4), (30000321, 4), (30000322, 4), (30000323, 4), (30000324, 4),
    (30000325, 4), (30000326, 4), (30000327, 4), (30000328, 4), (30000329, 4), (30000330, 4), (30000331, 4), (30000332, 4), (30000333, 4), (30000334, 4), (30000335, 4), (30000336, 4),
    (30000337, 4), (30000338, 4), (30000339, 4), (30000340, 4), (30000341, 4), (30000342, 4), (30000343, 4), (30000344, 4), (30000345, 4), (30000346, 4), (30000347, 4), (30000348, 4),
    (30000349, 4), (30000350, 4), (30000351, 4), (30000352, 4), (30000353, 4), (30000354, 4), (30000355, 4), (30000356, 4), (30000357, 4), (30000358, 4), (30000359, 4), (30000360, 4),
    (30000361, 4), (30000362, 4), (30000363, 4), (30000364, 4), (30000365, 4), (30000366, 4), (30000367, 4), (30000368, 4), (30000369, 4), (30000370, 4), (30000371, 4), (30000372, 4),
    (30000373, 4), (30000374, 4), (30000375, 4), (30000376, 4), (30000377, 4), (30000378, 4), (30000379, 4), (30000380, 4), (30000381, 4), (30000382, 4), (30000383, 4), (30000384, 4),
    (30000385, 4), (30000386, 4), (30000387, 4), (30000388, 4), (30000389, 4), (30000390, 4), (30000391, 4), (30000392, 4), (30000393, 4), (30000394, 4), (30000395, 4), (30000396, 4),
    (30000397, 4), (30000398, 4), (30000399, 4), (30000400, 4), (30000401, 4), (30000402, 4), (30000403, 4), (30000404, 4), (30000405, 4), (30000406, 4), (30000407, 4), (30000408, 4),
    (30000409, 4), (30000410, 4), (30000411, 4), (30000412, 4), (30000413, 4), (30000414, 4), (30000415, 4), (30000416, 4), (30000417, 4), (30000418, 4), (30000419, 4), (30000420, 4),
    (30000421, 4), (30000422, 4), (30000423, 4), (30000424, 4), (30000425, 4), (30000426, 4), (30000427, 4), (30000428, 4), (30000429, 4), (30000430, 4), (30000431, 4), (30000432, 4),
    (30000433, 4), (30000434, 4), (30000435, 4), (30000436, 4), (30000437, 4), (30000438, 4), (30000439, 4), (30000440, 4), (30000441, 4), (30000442, 4), (30000443, 4), (30000444, 4),
    (30000445, 4), (30000446, 4), (30000447, 4), (30000448, 4), (30000449, 4), (30000450, 4), (30000451, 4), (30000452, 4), (30000453, 4), (30000454, 4), (30000455, 4), (30000456, 4),
    (30000457, 4), (30000458, 4), (30000459, 4), (30000460, 4), (30000461, 4), (30000462, 4), (30000463, 4), (30000464, 4), (30000465, 4), (30000466, 4), (30000467, 4), (30000468, 4),
    (30000469, 4), (30000470, 4), (30000471, 4), (30000472, 4), (30000473, 4), (30000474, 4), (30000475, 4), (30000476, 4), (30000477, 4), (30000478, 4), (30000479, 4), (30000480, 4),
    (30000481, 4), (30000482, 4), (30000483, 4), (30000484, 4), (30000485, 4), (30000486, 4), (30000487, 4), (30000488, 4), (30000489, 4), (30000490, 4), (30000491, 4), (30000492, 4),
    (30000493, 4), (30000494, 4), (30000495, 4), (30000496, 4), (30000497, 4), (30000498, 4), (30000499, 4), (30000500, 4), (30000501, 4), (30000502, 4), (30000503, 4), (30000504, 4),
    (30000505, 4), (30000506, 4), (30000507, 4), (30000508, 4), (30000509, 4), (30000510, 4), (30000511, 4), (30000512, 4), (30000513, 4), (30000514, 4), (30000515, 4), (30000516, 4),
    (30000517, 4), (30000518, 4), (30000519, 4), (30000520, 4), (30000521, 4), (30000522, 4), (30000523, 4), (30000524, 4), (30000525, 4), (30000526, 4), (30000527, 4), (30000528, 4),
    (30000529, 4), (30000530, 4), (30000531, 4), (30000532, 4), (30000533, 4), (30000534, 4), (30000535, 4), (30000536, 4), (30000537, 4), (30000538, 4), (30000539, 4), (30000540, 4),
    (30000541, 4), (30000542, 4), (30000543, 4), (30000544, 4), (30000545, 4), (30000546, 4), (30000547, 4), (30000548, 4), (30000549, 4), (30000550, 4), (30000551, 4), (30000552, 4),
    (30000553, 4), (30000554, 4), (30000555, 4), (30000556, 4), (30000557, 4), (30000558, 4), (30000559, 4), (30000560, 4), (30000561, 4), (30000562, 4), (30000563, 4), (30000564, 4),
    (30000565, 4), (30000566, 4), (30000567, 4), (30000568, 4), (30000569, 4), (30000570, 4), (30000571, 4), (30000572, 4), (30000573, 4), (30000574, 4), (30000575, 4), (30000576, 4),
    (30000577, 4), (30000578, 4), (30000579, 4), (30000580, 4), (30000581, 4), (30000582, 4), (30000583, 4), (30000584, 4), (30000585, 4), (30000586, 4), (30000587, 4), (30000588, 4),
    (30000589, 4), (30000590, 4), (30000591, 4), (30000592, 4), (30000593, 4), (30000594, 4), (30000595, 4), (30000596, 4), (30000597, 4), (30000598, 4), (30000599, 4), (30000600, 4),
    (30000601, 4), (30000602, 4), (30000603, 4), (30000604, 4), (30000605, 4), (30000606, 4), (30000607, 4), (30000608, 4), (30000609, 4), (30000610, 4), (30000611, 4), (30000612, 4),
    (30000613, 4), (30000614, 4), (30000615, 4), (30000616, 4), (30000617, 4), (30000618, 4), (30000619, 4), (30000620, 4), (30000621, 4), (30000622, 4), (30000623, 4), (30000624, 4),
    (30000625, 4), (30000626, 4), (30000627, 4), (30000628, 4), (30000629, 4), (30000630, 4), (30000631, 4), (30000632, 4), (30000633, 4), (30000634, 4), (30000635, 4), (30000636, 4),
    (30000637, 4), (30000638, 4), (30000639, 4), (30000640, 4), (30000641, 4), (30000642, 4), (30000643, 4), (30000644, 4), (30000645, 4), (30000646, 4), (30000647, 4), (30000648, 4),
    (30000649, 4), (30000650, 4), (30000651, 4), (30000652, 4), (30000653, 4), (30000654, 4), (30000655, 4), (30000656, 4), (30000657, 4), (30000658, 4), (30000659, 4), (30000660, 4),
    (30000661, 4), (30000662, 4), (30000663, 4), (30000664, 4), (30000665, 4), (30000666, 4), (30000667, 4), (30000668, 4), (30000669, 4), (30000670, 4), (30000671, 4), (30000672, 4),
    (30000673, 4), (30000674, 4), (30000675, 4), (30000676, 4), (30000677, 4), (30000678, 4), (30000679, 4), (30000680, 4), (30000681, 4), (30000682, 4), (30000683, 4), (30000684, 4),
    (30000685, 4), (30000686, 4), (30000687, 4), (30000688, 4), (30000689, 4), (30000690, 4), (30000691, 4), (30000692, 4), (30000693, 4), (30000694, 4), (30000695, 4), (30000696, 4),
    (30000697, 4), (30000698, 4), (30000699, 4), (30000700, 4), (30000701, 4), (30000702, 4), (30000703, 4), (30000704, 4), (30000705, 4), (30000706, 4), (30000707, 4), (30000708, 4),
    (30000709, 4), (30000710, 4), (30000711, 4), (30000712, 4), (30000713, 4), (30000714, 4), (30000715, 4), (30000716, 4), (30000717, 4), (30000718, 4), (30000719, 4), (30000720, 4),
    (30000721, 4), (30000722, 4), (30000723, 4), (30000724, 4), (30000725, 4), (30000726, 4), (30000727, 4), (30000728, 4), (30000729, 4), (30000730, 4), (30000731, 4), (30000732, 4),
    (30000733, 4), (30000734, 4), (30000735, 4), (30000736, 4), (30000737, 4), (30000738, 4), (30000739, 4), (30000740, 4), (30000741, 4), (30000742, 4), (30000743, 4), (30000744, 4),
    (30000745, 4), (30000746, 4), (30000747, 4), (30000748, 4), (30000749, 4), (30000750, 4), (30000751, 4), (30000752, 4), (30000753, 4), (30000754, 4), (30000755, 4), (30000756, 4),
    (30000757, 4), (30000758, 4), (30000759, 4), (30000760, 4), (30000761, 4), (30000762, 4), (30000763, 4), (30000764, 4), (30000765, 4), (30000766, 4), (30000767, 4), (30000768, 4),
    (30000769, 4), (30000770, 4), (30000771, 4), (30000772, 4), (30000773, 4), (30000774, 4), (30000775, 4), (30000776, 4), (30000777, 4), (30000778, 4), (30000779, 4), (30000780, 4),
    (30000781, 4), (30000782, 4), (30000783, 4), (30000784, 4), (30000785, 4), (30000786, 4), (30000787, 4), (30000788, 4), (30000789, 4), (30000790, 4), (30000791, 4), (30000792, 4),
    (30000793, 4), (30000794, 4), (30000795, 4), (30000796, 4), (30000797, 4), (30000798, 4), (30000799, 4), (30000800, 4), (30000801, 4), (30000802, 4), (30000803, 4), (30000804, 4),
    (30000805, 4), (30000806, 4), (30000807, 4), (30000808, 4), (30000809, 4), (30000810, 4), (30000811, 4), (30000812, 4), (30000813, 4), (30000814, 4), (30000815, 4), (30000816, 4),
    (30000817, 4), (30000818, 4), (30000819, 4), (30000820, 4), (30000821, 4), (30000822, 4), (30000823, 4), (30000824, 4), (30000825, 4), (30000826, 4), (30000827, 4), (30000828, 4),
    (30000829, 4), (30000830, 4), (30000831, 4), (30000832, 4), (30000833, 4), (30000834, 4), (30000835, 4), (30000836, 4), (30000837, 4), (30000838, 4), (30000839, 4), (30000840, 4),
    (30000841, 4), (30000842, 4), (30000843, 4), (30000844, 4), (30000845, 4), (30000846, 4), (30000847, 4), (30000848, 4), (30000849, 4), (30000850, 4), (30000851, 4), (30000852, 4),
    (30000853, 4), (30000854, 4), (30000855, 4), (30000856, 4), (30000857, 4), (30000858, 4), (30000859, 4), (30000860, 4), (30000861, 4), (30000862, 4), (30000863, 4), (30000864, 4),
    (30000865, 4), (30000866, 4), (30000867, 4), (30000868, 4), (30000869, 4), (30000870, 4), (30000871, 4), (30000872, 4), (30000873, 4), (30000874, 4), (30000875, 4), (30000876, 4),
    (30000877, 4), (30000878, 4), (30000879, 4), (30000880, 4), (30000881, 4), (30000882, 4), (30000883, 4), (30000884, 4), (30000885, 4), (30000886, 4), (30000887, 4), (30000888, 4),
    (30000889, 4), (30000890, 4), (30000891, 4), (30000892, 4), (30000893, 4), (30000894, 4), (30000895, 4), (30000896, 4), (30000897, 4), (30000898, 4), (30000899, 4), (30000900, 4),
    (30000901, 4), (30000902, 4), (30000903, 4), (30000904, 4), (30000905, 4), (30000906, 4), (30000907, 4), (30000908, 4), (30000909, 4), (30000910, 4), (30000911, 4), (30000912, 4),
    (30000913, 4), (30000914, 4), (30000915, 4), (30000916, 4), (30000917, 4), (30000918, 4), (30000919, 4), (30000920, 4), (30000921, 4), (30000922, 4), (30000923, 4), (30000924, 4),
    (30000925, 4), (30000926, 4), (30000927, 4), (30000928, 4), (30000929, 4), (30000930, 4), (30000931, 4), (30000932, 4), (30000933, 4), (30000934, 4), (30000935, 4), (30000936, 4),
    (30000937, 4), (30000938, 4), (30000939, 4), (30000940, 4), (30000941, 4), (30000942, 4), (30000943, 4), (30000944, 4), (30000945, 4), (30000946, 4), (30000947, 4), (30000948, 4),
    (30000949, 4), (30000950, 4), (30000951, 4), (30000952, 4), (30000953, 4), (30000954, 4), (30000955, 4), (30000956, 4), (30000957, 4), (30000958, 4), (30000959, 4), (30000960, 4),
    (30000961, 4), (30000962, 4), (30000963, 4), (30000964, 4), (30000965, 4), (30000966, 4), (30000967, 4), (30000968, 4), (30000969, 4), (30000970, 4), (30000971, 4), (30000972, 4),
    (30000973, 4), (30000974, 4), (30000975, 4), (30000976, 4), (30000977, 4), (30000978, 4), (30000979, 4), (30000980, 4), (30000981, 4), (30000982, 4), (30000983, 4), (30000984, 4),
    (30000985, 4), (30000986, 4), (30000987, 4), (30000988, 4), (30000989, 4), (30000990, 4), (30000991, 4), (30000992, 4), (30000993, 4), (30000994, 4), (30000995, 4), (30000996, 4),
    (30000997, 4), (30000998, 4), (30000999, 4), (30001000, 4), (30001001, 4), (30001002, 4), (30001003, 4), (30001004, 4), (30001005, 4), (30001006, 4), (30001007, 4), (30001008, 4),
    (30001009, 4), (30001010, 4), (30001011, 4), (30001012, 4), (30001013, 4), (30001014, 4), (30001015, 4), (30001016, 4), (30001017, 4), (30001018, 4), (30001019, 4), (30001020, 4),
    (30001021, 4), (30001022, 4), (30001023, 4), (30001024, 4), (30001025, 4), (30001026, 4), (30001027, 4), (30001028, 4), (30001029, 4), (30001030, 4), (30001031, 4), (30001032, 4),
    (30001033, 4), (30001034, 4), (30001035, 4), (30001036, 4), (30001037, 4), (30001038, 4), (30001039, 4), (30001040, 4), (30001041, 4), (30001042, 4), (30001043, 4), (30001044, 4),
    (30001045, 4), (30001046, 4), (30001047, 4), (30001048, 4), (30001049, 4), (30001050, 4), (30001051, 4), (30001052, 4), (30001053, 4), (30001054, 4), (30001055, 4), (30001056, 4),
    (30001057, 4), (30001058, 4), (30001059, 4), (30001060, 4), (30001061, 4), (30001062, 4), (30001063, 4), (30001064, 4), (30001065, 4), (30001066, 4), (30001067, 4), (30001068, 4),
    (30001069, 4), (30001070, 4), (30001071, 4), (30001072, 4), (30001073, 4), (30001074, 4), (30001075, 4), (30001076, 4), (30001077, 4), (30001078, 4), (30001079, 4), (30001080, 4),
    (30001081, 4), (30001082, 4), (30001083, 4), (30001084, 4), (30001085, 4), (30001086, 4), (30001087, 4), (30001088, 4), (30001089, 4), (30001090, 4), (30001091, 4), (30001092, 4),
    (30001093, 4), (30001094, 4), (30001095, 4), (30001096, 4), (30001097, 4), (30001098, 4), (30001099, 4), (30001100, 4), (30001101, 4), (30001102, 4), (30001103, 4), (30001104, 4),
    (30001105, 4), (30001106, 4), (30001107, 4), (30001108, 4), (30001109, 4), (30001110, 4), (30001111, 4), (30001112, 4), (30001113, 4), (30001114, 4), (30001115, 4), (30001116, 4),
    (30001117, 4), (30001118, 4), (30001119, 4), (30001120, 4), (30001121, 4), (30001122, 4), (30001123, 4), (30001124, 4), (30001125, 4), (30001126, 4), (30001127, 4), (30001128, 4),
    (30001129, 4), (30001130, 4), (30001131, 4), (30001132, 4), (30001133, 4), (30001134, 4), (30001135, 4), (30001136, 4), (30001137, 4), (30001138, 4), (30001139, 4), (30001140, 4),
    (30001141, 4), (30001142, 4), (30001143, 4), (30001144, 4), (30001145, 4), (30001146, 4), (30001147, 4), (30001148, 4), (30001149, 4), (30001150, 4), (30001151, 4), (30001152, 4),
    (30001153, 4), (30001154, 4), (30001155, 4), (30001156, 4), (30001157, 4), (30001158, 4), (30001159, 4), (30001160, 4), (30001161, 4), (30001162, 4), (30001163, 4), (30001164, 4),
    (30001165, 4), (30001166, 4), (30001167, 4), (30001168, 4), (30001169, 4), (30001170, 4), (30001171, 4), (30001172, 4), (30001173, 4), (30001174, 4), (30001175, 4), (30001176, 4),
    (30001177, 4), (30001178, 4), (30001179, 4), (30001180, 4), (30001181, 4), (30001182, 4), (30001183, 4), (30001184, 4), (30001185, 4), (30001186, 4), (30001187, 4), (30001188, 4),
    (30001189, 4), (30001190, 4), (30001191, 4), (30001192, 4), (30001193, 4), (30001194, 4), (30001195, 4), (30001196, 4), (30001197, 4), (30001198, 4), (30001199, 4), (30001200, 4),
    (30001201, 4), (30001202, 4), (30001203, 4), (30001204, 4), (30001205, 4), (30001206, 4), (30001207, 4), (30001208, 4), (30001209, 4), (30001210, 4), (30001211, 4), (30001212, 4),
    (30001213, 4), (30001214, 4), (30001215, 4), (30001216, 4), (30001217, 4), (30001218, 4), (30001219, 4), (30001220, 4), (30001221, 4), (30001222, 4), (30001223, 4), (30001224, 4),
    (30001225, 4), (30001226, 4), (30001227, 4), (30001228, 4), (30001229, 4), (30001230, 4), (30001231, 4), (30001232, 4), (30001233, 4), (30001234, 4), (30001235, 4), (30001236, 4),
    (30001237, 4), (30001238, 4), (30001239, 4), (30001240, 4), (30001241, 4), (30001242, 4), (30001243, 4), (30001244, 4), (30001245, 4), (30001246, 4), (30001247, 4), (30001248, 4),
    (30001249, 4), (30001250, 4), (30001251, 4), (30001252, 4), (30001253, 4), (30001254, 4), (30001255, 4), (30001256, 4), (30001257, 4), (30001258, 4), (30001259, 4), (30001260, 4),
    (30001261, 4), (30001262, 4), (30001263, 4), (30001264, 4), (30001265, 4), (30001266, 4), (30001267, 4), (30001268, 4), (30001269, 4), (30001270, 4), (30001271, 4), (30001272, 4),
    (30001273, 4), (30001274, 4), (30001275, 4), (30001276, 4), (30001277, 4), (30001278, 4), (30001279, 4), (30001280, 4), (30001281, 4), (30001282, 4), (30001283, 4), (30001284, 4),
    (30001285, 4), (30001286, 4), (30001287, 4), (30001288, 4), (30001289, 4), (30001290, 4), (30001291, 4), (30001292, 4), (30001293, 4), (30001294, 4), (30001295, 4), (30001296, 4),
    (30001297, 4), (30001298, 4), (30001299, 4), (30001300, 4), (30001301, 4), (30001302, 4), (30001303, 4), (30001304, 4), (30001305, 4), (30001306, 4), (30001307, 4), (30001308, 4),
    (30001309, 4), (30001310, 4), (30001311, 4), (30001312, 4), (30001313, 4), (30001314, 4), (30001315, 4), (30001316, 4), (30001317, 4), (30001318, 4), (30001319, 4), (30001320, 4),
    (30001321, 4), (30001322, 4), (30001323, 4), (30001324, 4), (30001325, 4), (30001326, 4), (30001327, 4), (30001328, 4), (30001329, 4), (30001330, 4), (30001331, 4), (30001332, 4),
    (30001333, 4), (30001334, 4), (30001335, 4), (30001336, 4), (30001337, 4), (30001338, 4), (30001339, 4), (30001340, 4), (30001341, 4), (30001342, 4), (30001343, 4), (30001344, 4),
    (30001345, 4), (30001346, 4), (30001347, 4), (30001348, 4), (30001349, 4), (30001350, 4), (30001351, 4), (30001352, 4), (30001353, 4), (30001354, 4), (30001355, 4), (30001356, 2),
    (30001357, 1), (30001358, 1), (30001359, 1), (30001360, 1), (30001361, 2), (30001362, 1), (30001363, 1), (30001364, 1), (30001365, 1), (30001366, 1), (30001367, 1), (30001368, 1),
    (30001369, 1), (30001370, 1), (30001371, 1), (30001372, 3), (30001373, 1), (30001374, 1), (30001375, 1), (30001376, 1), (30001377, 1), (30001378, 1), (30001379, 1), (30001380, 1),
    (30001381, 3), (30001382, 1), (30001383, 1), (30001384, 1), (30001385, 2), (30001386, 1), (30001387, 1), (30001388, 2), (30001389, 1), (30001390, 2), (30001391, 1), (30001392, 1),
    (30001393, 1), (30001394, 1), (30001395, 1), (30001396, 1), (30001397, 1), (30001398, 2), (30001399, 1), (30001400, 1), (30001401, 1), (30001402, 2), (30001403, 1), (30001404, 1),
    (30001405, 1), (30001406, 1), (30001407, 1), (30001408, 1), (30001409, 1), (30001410, 1), (30001411, 1), (30001412, 1), (30001413, 3), (30001414, 1), (30001415, 1), (30001416, 1),
    (30001417, 1), (30001418, 1), (30001419, 1), (30001420, 2), (30001421, 1), (30001422, 2), (30001423, 1), (30001424, 1), (30001425, 1), (30001426, 1), (30001427, 1), (30001428, 1),
    (30001429, 1), (30001430, 1), (30001431, 1), (30001432, 1), (30001433, 1), (30001434, 1), (30001435, 2), (30001436, 2), (30001437, 2), (30001438, 2), (30001439, 2), (30001440, 2),
    (30001441, 2), (30001442, 2), (30001443, 1), (30001444, 1), (30001445, 3), (30001446, 2), (30001447, 2), (30001448, 2), (30001449, 4), (30001450, 4), (30001451, 4), (30001452, 4),
    (30001453, 4), (30001454, 4), (30001455, 4), (30001456, 4), (30001457, 4), (30001458, 4), (30001459, 4), (30001460, 4), (30001461, 4), (30001462, 4), (30001463, 4), (30001464, 4),
    (30001465, 4), (30001466, 4), (30001467, 4), (30001468, 4), (30001469, 4), (30001470, 4), (30001471, 4), (30001472, 4), (30001473, 4), (30001474, 4), (30001475, 4), (30001476, 4),
    (30001477, 4), (30001478, 4), (30001479, 4), (30001480, 4), (30001481, 4), (30001482, 4), (30001483, 4), (30001484, 4), (30001485, 4), (30001486, 4), (30001487, 4), (30001488, 4),
    (30001489, 4), (30001490, 4), (30001491, 4), (30001492, 4), (30001493, 4), (30001494, 4), (30001495, 4), (30001496, 4), (30001497, 4), (30001498, 4), (30001499, 4), (30001500, 4),
    (30001501, 4), (30001502, 4), (30001503, 4), (30001504, 4), (30001505, 4), (30001506, 4), (30001507, 4), (30001508, 4), (30001509, 4), (30001510, 4), (30001511, 4), (30001512, 4),
    (30001513, 4), (30001514, 4), (30001515, 4), (30001516, 4), (30001517, 4), (30001518, 4), (30001519, 4), (30001520, 4), (30001521, 4), (30001522, 4), (30001523, 4), (30001524, 4),
    (30001525, 4), (30001526, 4), (30001527, 4), (30001528, 4), (30001529, 4), (30001530, 4), (30001531, 4), (30001532, 4), (30001533, 4), (30001534, 4), (30001535, 4), (30001536, 4),
    (30001537, 4), (30001538, 4), (30001539, 4), (30001540, 4), (30001541, 4), (30001542, 4), (30001543, 4), (30001544, 4), (30001545, 4), (30001546, 4), (30001547, 4), (30001548, 4),
    (30001549, 4), (30001550, 4), (30001551, 4), (30001552, 4), (30001553, 4), (30001554, 4), (30001555, 4), (30001556, 4), (30001557, 4), (30001558, 4), (30001559, 4), (30001560, 4),
    (30001561, 4), (30001562, 4), (30001563, 4), (30001564, 4), (30001565, 4), (30001566, 4), (30001567, 4), (30001568, 4), (30001569, 4), (30001570, 4), (30001571, 4), (30001572, 4),
    (30001573, 4), (30001574, 4), (30001575, 4), (30001576, 4), (30001577, 4), (30001578, 4), (30001579, 4), (30001580, 4), (30001581, 4), (30001582, 4), (30001583, 4), (30001584, 4),
    (30001585, 4), (30001586, 4), (30001587, 4), (30001588, 4), (30001589, 4), (30001590, 4), (30001591, 4), (30001592, 4), (30001593, 4), (30001594, 4), (30001595, 4), (30001596, 4),
    (30001597, 4), (30001598, 4), (30001599, 4), (30001600, 4), (30001601, 4), (30001602, 4), (30001603, 4), (30001604, 4), (30001605, 4), (30001606, 4), (30001607, 4), (30001608, 4),
    (30001609, 4), (30001610, 4), (30001611, 4), (30001612, 4), (30001613, 4), (30001614, 4), (30001615, 4), (30001616, 4), (30001617, 4), (30001618, 4), (30001619, 4), (30001620, 4),
    (30001621, 4), (30001622, 4), (30001623, 4), (30001624, 4), (30001625, 4), (30001626, 4), (30001627, 4), (30001628, 4), (30001629, 4), (30001630, 4), (30001631, 4), (30001632, 4),
    (30001633, 4), (30001634, 4), (30001635, 4), (30001636, 4), (30001637, 4), (30001638, 4), (30001639, 4), (30001640, 4), (30001641, 4), (30001642, 4), (30001643, 4), (30001644, 1),
    (30001645, 1), (30001646, 1), (30001647, 1), (30001648, 1), (30001649, 1), (30001650, 1), (30001651, 1), (30001652, 1), (30001653, 1), (30001654, 1), (30001655, 1), (30001656, 1),
    (30001657, 1), (30001658, 1), (30001659, 1), (30001660, 1), (30001661, 2), (30001662, 1), (30001663, 2), (30001664, 2), (30001665, 1), (30001666, 1), (30001667, 1), (30001668, 2),
    (30001669, 1), (30001670, 1), (30001671, 1), (30001672, 1), (30001673, 1), (30001674, 1), (30001675, 1), (30001676, 1), (30001677, 1), (30001678, 1), (30001679, 1), (30001680, 1),
    (30001681, 2), (30001682, 2), (30001683, 2), (30001684, 2), (30001685, 2), (30001686, 2), (30001687, 1), (30001688, 1), (30001689, 1), (30001690, 1), (30001691, 1), (30001692, 1),
    (30001693, 1), (30001694, 1), (30001695, 1), (30001696, 1), (30001697, 1), (30001698, 1), (30001699, 1), (30001700, 1), (30001701, 1), (30001702, 1), (30001703, 1), (30001704, 1),
    (30001705, 1), (30001706, 1), (30001707, 1), (30001708, 1), (30001709, 1), (30001710, 1), (30001711, 1), (30001712, 1), (30001713, 1), (30001714, 1), (30001715, 1), (30001716, 1),
    (30001717, 1), (30001718, 1), (30001719, 2), (30001720, 2), (30001721, 2), (30001722, 1), (30001723, 1), (30001724, 1), (30001725, 1), (30001726, 1), (30001727, 1), (30001728, 1),
    (30001729, 1), (30001730, 1), (30001731, 1), (30001732, 1), (30001733, 1), (30001734, 1), (30001735, 1), (30001736, 1), (30001737, 1), (30001738, 1), (30001739, 1), (30001740, 1),
    (30001741, 1), (30001742, 1), (30001743, 4), (30001744, 4), (30001745, 4), (30001746, 4), (30001747, 4), (30001748, 4), (30001749, 4), (30001750, 4), (30001751, 4), (30001752, 4),
    (30001753, 4), (30001754, 4), (30001755, 4), (30001756, 4), (30001757, 4), (30001758, 4), (30001759, 4), (30001760, 4), (30001761, 4), (30001762, 4), (30001763, 4), (30001764, 4),
    (30001765, 4), (30001766, 4), (30001767, 4), (30001768, 4), (30001769, 4), (30001770, 4), (30001771, 4), (30001772, 4), (30001773, 4), (30001774, 4), (30001775, 4), (30001776, 4),
    (30001777, 4), (30001778, 4), (30001779, 4), (30001780, 4), (30001781, 4), (30001782, 4), (30001783, 4), (30001784, 4), (30001785, 4), (30001786, 4), (30001787, 4), (30001788, 4),
    (30001789, 4), (30001790, 4), (30001791, 4), (30001792, 4), (30001793, 4), (30001794, 4), (30001795, 4), (30001796, 4), (30001797, 4), (30001798, 4), (30001799, 4), (30001800, 4),
    (30001801, 4), (30001802, 4), (30001803, 4), (30001804, 4), (30001805, 4), (30001806, 4), (30001807, 4), (30001808, 4), (30001809, 4), (30001810, 4), (30001811, 4), (30001812, 4),
    (30001813, 4), (30001814, 4), (30001815, 4), (30001816, 4), (30001817, 4), (30001818, 4), (30001819, 4), (30001820, 4), (30001821, 4), (30001822, 4), (30001823, 4), (30001824, 4),
    (30001825, 4), (30001826, 4), (30001827, 4), (30001828, 4), (30001829, 4), (30001830, 4), (30001831, 4), (30001832, 4), (30001833, 4), (30001834, 4), (30001835, 4), (30001836, 4),
    (30001837, 4), (30001838, 4), (30001839, 4), (30001840, 4), (30001841, 4), (30001842, 4), (30001843, 4), (30001844, 4), (30001845, 4), (30001846, 4), (30001847, 4), (30001848, 4),
    (30001849, 4), (30001850, 4), (30001851, 4), (30001852, 4), (30001853, 4), (30001854, 4), (30001855, 4), (30001856, 4), (30001857, 4), (30001858, 4), (30001859, 4), (30001860, 4),
    (30001861, 4), (30001862, 4), (30001863, 4), (30001864, 4), (30001865, 4), (30001866, 4), (30001867, 4), (30001868, 4), (30001869, 4), (30001870, 4), (30001871, 4), (30001872, 4),
    (30001873, 4), (30001874, 4), (30001875, 4), (30001876, 4), (30001877, 4), (30001878, 4), (30001879, 4), (30001880, 4), (30001881, 4), (30001882, 4), (30001883, 4), (30001884, 4),
    (30001885, 4), (30001886, 4), (30001887, 4), (30001888, 4), (30001889, 4), (30001890, 4), (30001891, 4), (30001892, 4), (30001893, 4), (30001894, 4), (30001895, 4), (30001896, 4),
    (30001897, 4), (30001898, 4), (30001899, 4), (30001900, 4), (30001901, 4), (30001902, 4), (30001903, 4), (30001904, 4), (30001905, 4), (30001906, 4), (30001907, 4), (30001908, 4),
    (30001909, 4), (30001910, 4), (30001911, 4), (30001912, 4), (30001913, 4), (30001914, 4), (30001915, 4), (30001916, 4), (30001917, 4), (30001918, 4), (30001919, 4), (30001920, 4),
    (30001921, 4), (30001922, 4), (30001923, 4), (30001924, 4), (30001925, 4), (30001926, 4), (30001927, 4), (30001928, 4), (30001929, 4), (30001930, 4), (30001931, 4), (30001932, 4),
    (30001933, 4), (30001934, 4), (30001935, 4), (30001936, 4), (30001937, 4), (30001938, 4), (30001939, 4), (30001940, 4), (30001941, 4), (30001942, 4), (30001943, 4), (30001944, 4),
    (30001945, 4), (30001946, 4), (30001947, 4), (30001948, 4), (30001949, 4), (30001950, 4), (30001951, 4), (30001952, 4), (30001953, 4), (30001954, 4), (30001955, 4), (30001956, 4),
    (30001957, 4), (30001958, 4), (30001959, 4), (30001960, 4), (30001961, 4), (30001962, 4), (30001963, 4), (30001964, 4), (30001965, 4), (30001966, 4), (30001967, 4), (30001968, 4),
    (30001969, 4), (30001970, 4), (30001971, 4), (30001972, 4), (30001973, 4), (30001974, 4), (30001975, 4), (30001976, 4), (30001977, 4), (30001978, 4), (30001979, 4), (30001980, 4),
    (30001981, 4), (30001982, 4), (30001983, 4), (30001984, 4), (30001985, 4), (30001986, 4), (30001987, 4), (30001988, 4), (30001989, 4), (30001990, 4), (30001991, 4), (30001992, 4),
    (30001993, 4), (30001994, 4), (30001995, 4), (30001996, 4), (30001997, 4), (30001998, 4), (30001999, 4), (30002000, 4), (30002001, 4), (30002002, 4), (30002003, 4), (30002004, 4),
    (30002005, 4), (30002006, 4), (30002007, 4), (30002008, 4), (30002009, 4), (30002010, 4), (30002011, 4), (30002012, 4), (30002013, 4), (30002014, 4), (30002015, 4), (30002016, 4),
    (30002017, 4), (30002018, 4), (30002019, 4), (30002020, 4), (30002021, 4), (30002022, 4), (30002023, 4), (30002024, 4), (30002025, 4), (30002026, 4), (30002027, 4), (30002028, 4),
    (30002029, 4), (30002030, 4), (30002031, 4), (30002032, 4), (30002033, 4), (30002034, 4), (30002035, 4), (30002036, 4), (30002037, 4), (30002038, 4), (30002039, 4), (30002040, 4),
    (30002041, 4), (30002042, 4), (30002043, 4), (30002044, 4), (30002045, 4), (30002046, 4), (30002047, 4), (30002048, 1), (30002049, 1), (30002050, 2), (30002051, 1), (30002052, 2),
    (30002053, 1), (30002054, 1), (30002055, 1), (30002056, 2), (30002057, 2), (30002058, 2), (30002059, 2), (30002060, 2), (30002061, 2), (30002062, 2), (30002063, 2), (30002064, 2),
    (30002065, 2), (30002066, 2), (30002067, 2), (30002068, 1), (30002069, 1), (30002070, 1), (30002071, 1), (30002072, 1), (30002073, 1), (30002074, 1), (30002075, 1), (30002076, 2),
    (30002077, 2), (30002078, 2), (30002079, 3), (30002080, 2), (30002081, 2), (30002082, 2), (30002083, 2), (30002084, 2), (30002085, 2), (30002086, 5), (30002087, 2), (30002088, 2),
    (30002089, 2), (30002090, 2), (30002091, 2), (30002092, 2), (30002093, 2), (30002094, 2), (30002095, 2), (30002096, 2), (30002097, 2), (30002098, 2), (30002099, 2), (30002100, 2),
    (30002101, 2), (30002102, 2), (30002103, 4), (30002104, 4), (30002105, 4), (30002106, 4), (30002107, 4), (30002108, 4), (30002109, 4), (30002110, 4), (30002111, 4), (30002112, 4),
    (30002113, 4), (30002114, 4), (30002115, 4), (30002116, 4), (30002117, 4), (30002118, 4), (30002119, 4), (30002120, 4), (30002121, 4), (30002122, 4), (30002123, 4), (30002124, 4),
    (30002125, 4), (30002126, 4), (30002127, 4), (30002128, 4), (30002129, 4), (30002130, 4), (30002131, 4), (30002132, 4), (30002133, 4), (30002134, 4), (30002135, 4), (30002136, 4),
    (30002137, 4), (30002138, 4), (30002139, 4), (30002140, 4), (30002141, 4), (30002142, 4), (30002143, 4), (30002144, 4), (30002145, 4), (30002146, 4), (30002147, 4), (30002148, 4),
    (30002149, 4), (30002150, 4), (30002151, 4), (30002152, 4), (30002153, 4), (30002154, 4), (30002155, 4), (30002156, 4), (30002157, 4), (30002158, 4), (30002159, 4), (30002160, 4),
    (30002161, 4), (30002162, 4), (30002163, 4), (30002164, 4), (30002165, 4), (30002166, 4), (30002167, 4), (30002168, 4), (30002169, 4), (30002170, 4), (30002171, 4), (30002172, 4),
    (30002173, 4), (30002174, 4), (30002175, 4), (30002176, 4), (30002177, 4), (30002178, 4), (30002179, 4), (30002180, 4), (30002181, 4), (30002182, 4), (30002183, 4), (30002184, 4),
    (30002185, 4), (30002186, 4), (30002187, 1), (30002188, 1), (30002189, 1), (30002190, 1), (30002191, 1), (30002192, 1), (30002193, 1), (30002194, 1), (30002195, 1), (30002196, 1),
    (30002197, 1), (30002198, 1), (30002199, 1), (30002200, 1), (30002201, 1), (30002202, 1), (30002203, 1), (30002204, 1), (30002205, 1), (30002206, 1), (30002207, 1), (30002208, 1),
    (30002209, 1), (30002210, 1), (30002211, 1), (30002212, 1), (30002213, 1), (30002214, 1), (30002215, 1), (30002216, 2), (30002217, 1), (30002218, 1), (30002219, 2), (30002220, 1),
    (30002221, 1), (30002222, 1), (30002223, 1), (30002224, 1), (30002225, 3), (30002226, 1), (30002227, 1), (30002228, 1), (30002229, 1), (30002230, 1), (30002231, 1), (30002232, 1),
    (30002233, 1), (30002234, 1), (30002235, 1), (30002236, 2), (30002237, 2), (30002238, 2), (30002239, 2), (30002240, 2), (30002241, 2), (30002242, 1), (30002243, 1), (30002244, 1),
    (30002245, 1), (30002246, 2), (30002247, 1), (30002248, 1), (30002249, 2), (30002250, 1), (30002251, 1), (30002252, 1), (30002253, 1), (30002254, 1), (30002255, 2), (30002256, 2),
    (30002257, 1), (30002258, 1), (30002259, 1), (30002260, 1), (30002261, 1), (30002262, 1), (30002263, 1), (30002264, 1), (30002265, 1), (30002266, 1), (30002267, 1), (30002268, 1),
    (30002269, 1), (30002270, 2), (30002271, 1), (30002272, 2), (30002273, 2), (30002274, 2), (30002275, 1), (30002276, 1), (30002277, 1), (30002278, 1), (30002279, 1), (30002280, 1),
    (30002281, 1), (30002282, 1), (30002283, 4), (30002284, 4), (30002285, 4), (30002286, 4), (30002287, 4), (30002288, 4), (30002289, 4), (30002290, 4), (30002291, 4), (30002292, 4),
    (30002293, 4), (30002294, 4), (30002295, 4), (30002296, 4), (30002297, 4), (30002298, 4), (30002299, 4), (30002300, 4), (30002301, 4), (30002302, 4), (30002303, 4), (30002304, 4),
    (30002305, 4), (30002306, 4), (30002307, 4), (30002308, 4), (30002309, 4), (30002310, 4), (30002311, 4), (30002312, 4), (30002313, 4), (30002314, 4), (30002315, 4), (30002316, 4),
    (30002317, 4), (30002318, 4), (30002319, 4), (30002320, 4), (30002321, 4), (30002322, 4), (30002323, 4), (30002324, 4), (30002325, 4), (30002326, 4), (30002327, 4), (30002328, 4),
    (30002329, 4), (30002330, 4), (30002331, 4), (30002332, 4), (30002333, 4), (30002334, 4), (30002335, 4), (30002336, 4), (30002337, 4), (30002338, 4), (30002339, 4), (30002340, 4),
    (30002341, 4), (30002342, 4), (30002343, 4), (30002344, 4), (30002345, 4), (30002346, 4), (30002347, 4), (30002348, 4), (30002349, 4), (30002350, 4), (30002351, 4), (30002352, 4),
    (30002353, 4), (30002354, 4), (30002355, 4), (30002356, 4), (30002357, 4), (30002358, 4), (30002359, 4), (30002360, 4), (30002361, 4), (30002362, 4), (30002363, 4), (30002364, 4),
    (30002365, 4), (30002366, 4), (30002367, 4), (30002368, 4), (30002369, 4), (30002370, 4), (30002371, 4), (30002372, 4), (30002373, 4), (30002374, 4), (30002375, 4), (30002376, 4),
    (30002377, 4), (30002378, 4), (30002379, 4), (30002380, 4), (30002381, 4), (30002382, 4), (30002383, 1), (30002384, 1), (30002385, 1), (30002386, 1), (30002387, 2), (30002388, 2),
    (30002389, 2), (30002390, 2), (30002391, 2), (30002392, 2), (30002393, 2), (30002394, 2), (30002395, 2), (30002396, 2), (30002397, 1), (30002398, 1), (30002399, 1), (30002400, 1),
    (30002401, 2), (30002402, 2), (30002403, 2), (30002404, 2), (30002405, 2), (30002406, 2), (30002407, 2), (30002408, 1), (30002409, 2), (30002410, 2), (30002411, 3), (30002412, 2),
    (30002413, 2), (30002414, 2), (30002415, 2), (30002416, 1), (30002417, 2), (30002418, 2), (30002419, 2), (30002420, 2), (30002421, 4), (30002422, 4), (30002423, 4), (30002424, 4),
    (30002425, 4), (30002426, 4), (30002427, 4), (30002428, 4), (30002429, 4), (30002430, 4), (30002431, 4), (30002432, 4), (30002433, 4), (30002434, 4), (30002435, 4), (30002436, 4),
    (30002437, 4), (30002438, 4), (30002439, 4), (30002440, 4), (30002441, 4), (30002442, 4), (30002443, 4), (30002444, 4), (30002445, 4), (30002446, 4), (30002447, 4), (30002448, 4),
    (30002449, 4), (30002450, 4), (30002451, 4), (30002452, 4), (30002453, 4), (30002454, 4), (30002455, 4), (30002456, 4), (30002457, 4), (30002458, 4), (30002459, 4), (30002460, 4),
    (30002461, 4), (30002462, 4), (30002463, 4), (30002464, 4), (30002465, 4), (30002466, 4), (30002467, 4), (30002468, 4), (30002469, 4), (30002470, 4), (30002471, 4), (30002472, 4),
    (30002473, 4), (30002474, 4), (30002475, 4), (30002476, 4), (30002477, 4), (30002478, 4), (30002479, 4), (30002480, 4), (30002481, 4), (30002482, 4), (30002483, 4), (30002484, 4),
    (30002485, 4), (30002486, 4), (30002487, 4), (30002488, 4), (30002489, 4), (30002490, 4), (30002491, 4), (30002492, 4), (30002493, 4), (30002494, 4), (30002495, 4), (30002496, 4),
    (30002497, 4), (30002498, 4), (30002499, 4), (30002500, 4), (30002501, 4), (30002502, 4), (30002503, 4), (30002504, 4), (30002505, 1), (30002506, 1), (30002507, 1), (30002508, 1),
    (30002509, 1), (30002510, 1), (30002511, 1), (30002512, 1), (30002513, 1), (30002514, 2), (30002515, 2), (30002516, 2), (30002517, 2), (30002518, 1), (30002519, 1), (30002520, 1),
    (30002521, 1), (30002522, 1), (30002523, 1), (30002524, 1), (30002525, 1), (30002526, 1), (30002527, 1), (30002528, 1), (30002529, 1), (30002530, 1), (30002531, 1), (30002532, 1),
    (30002533, 1), (30002534, 1), (30002535, 1), (30002536, 2), (30002537, 2), (30002538, 2), (30002539, 2), (30002540, 2), (30002541, 2), (30002542, 2), (30002543, 1), (30002544, 1),
    (30002545, 1), (30002546, 1), (30002547, 1), (30002548, 1), (30002549, 1), (30002550, 1), (30002551, 2), (30002552, 1), (30002553, 2), (30002554, 2), (30002555, 2), (30002556, 2),
    (30002557, 1), (30002558, 1), (30002559, 2), (30002560, 2), (30002561, 2), (30002562, 1), (30002563, 1), (30002564, 1), (30002565, 1), (30002566, 1), (30002567, 1), (30002568, 1),
    (30002569, 1), (30002570, 1), (30002571, 1), (30002572, 1), (30002573, 1), (30002574, 2), (30002575, 2), (30002576, 2), (30002577, 2), (30002578, 1), (30002579, 2), (30002580, 2),
    (30002581, 4), (30002582, 4), (30002583, 4), (30002584, 4), (30002585, 4), (30002586, 4), (30002587, 4), (30002588, 4), (30002589, 4), (30002590, 4), (30002591, 4), (30002592, 4),
    (30002593, 4), (30002594, 4), (30002595, 4), (30002596, 4), (30002597, 4), (30002598, 4), (30002599, 4), (30002600, 4), (30002601, 4), (30002602, 4), (30002603, 4), (30002604, 4),
    (30002605, 4), (30002606, 4), (30002607, 4), (30002608, 4), (30002609, 4), (30002610, 4), (30002611, 4), (30002612, 4), (30002613, 4), (30002614, 4), (30002615, 4), (30002616, 4),
    (30002617, 4), (30002618, 4), (30002619, 4), (30002620, 4), (30002621, 4), (30002622, 4), (30002623, 4), (30002624, 4), (30002625, 4), (30002626, 4), (30002627, 4), (30002628, 4),
    (30002629, 4), (30002630, 4), (30002631, 4), (30002632, 1), (30002633, 1), (30002634, 1), (30002635, 2), (30002636, 1), (30002637, 1), (30002638, 2), (30002639, 1), (30002640, 1),
    (30002641, 1), (30002642, 1), (30002643, 1), (30002644, 1), (30002645, 2), (30002646, 1), (30002647, 2), (30002648, 1), (30002649, 1), (30002650, 1), (30002651, 2), (30002652, 3),
    (30002653, 2), (30002654, 2), (30002655, 1), (30002656, 1), (30002657, 1), (30002658, 1), (30002659, 1), (30002660, 1), (30002661, 1), (30002662, 1), (30002663, 1), (30002664, 1),
    (30002665, 1), (30002666, 2), (30002667, 1), (30002668, 1), (30002669, 1), (30002670, 1), (30002671, 1), (30002672, 1), (30002673, 1), (30002674, 1), (30002675, 1), (30002676, 1),
    (30002677, 1), (30002678, 1), (30002679, 1), (30002680, 1), (30002681, 1), (30002682, 1), (30002683, 1), (30002684, 1), (30002685, 1), (30002686, 2), (30002687, 1), (30002688, 1),
    (30002689, 1), (30002690, 1), (30002691, 2), (30002692, 1), (30002693, 2), (30002694, 1), (30002695, 1), (30002696, 1), (30002697, 2), (30002698, 2), (30002699, 1), (30002700, 1),
    (30002701, 1), (30002702, 3), (30002703, 1), (30002704, 1), (30002705, 1), (30002706, 1), (30002707, 1), (30002708, 1), (30002709, 1), (30002710, 1), (30002711, 1), (30002712, 1),
    (30002713, 1), (30002714, 1), (30002715, 1), (30002716, 1), (30002717, 1), (30002718, 2), (30002719, 2), (30002720, 2), (30002721, 2), (30002722, 2), (30002723, 2), (30002724, 1),
    (30002725, 2), (30002726, 2), (30002727, 2), (30002728, 2), (30002729, 2), (30002730, 2), (30002731, 1), (30002732, 1), (30002733, 1), (30002734, 1), (30002735, 1), (30002736, 1),
    (30002737, 3), (30002738, 1), (30002739, 1), (30002740, 1), (30002741, 2), (30002742, 2), (30002743, 1), (30002744, 1), (30002745, 1), (30002746, 1), (30002747, 1), (30002748, 1),
    (30002749, 1), (30002750, 1), (30002751, 1), (30002752, 1), (30002753, 1), (30002754, 1), (30002755, 1), (30002756, 2), (30002757, 2), (30002758, 2), (30002759, 2), (30002760, 2),
    (30002761, 1), (30002762, 1), (30002763, 1), (30002764, 1), (30002765, 1), (30002766, 1), (30002767, 2), (30002768, 1), (30002769, 2), (30002770, 3), (30002771, 1), (30002772, 1),
    (30002773, 1), (30002774, 1), (30002775, 1), (30002776, 1), (30002777, 1), (30002778, 1), (30002779, 1), (30002780, 1), (30002781, 1), (30002782, 1), (30002783, 1), (30002784, 1),
    (30002785, 1), (30002786, 1), (30002787, 1), (30002788, 1), (30002789, 1), (30002790, 1), (30002791, 1), (30002792, 1), (30002793, 1), (30002794, 1), (30002795, 1), (30002796, 2),
    (30002797, 3), (30002798, 1), (30002799, 1), (30002800, 1), (30002801, 1), (30002802, 1), (30002803, 1), (30002804, 1), (30002805, 1), (30002806, 2), (30002807, 2), (30002808, 2),
    (30002809, 2), (30002810, 2), (30002811, 2), (30002812, 2), (30002813, 2), (30002814, 1), (30002815, 1), (30002816, 1), (30002817, 1), (30002818, 1), (30002819, 1), (30002820, 4),
    (30002821, 4), (30002822, 4), (30002823, 4), (30002824, 4), (30002825, 4), (30002826, 4), (30002827, 4), (30002828, 4), (30002829, 4), (30002830, 4), (30002831, 4), (30002832, 4),
    (30002833, 4), (30002834, 4), (30002835, 4), (30002836, 4), (30002837, 4), (30002838, 4), (30002839, 4), (30002840, 4), (30002841, 4), (30002842, 4), (30002843, 4), (30002844, 4),
    (30002845, 4), (30002846, 4), (30002847, 4), (30002848, 4), (30002849, 4), (30002850, 4), (30002851, 4), (30002852, 4), (30002853, 4), (30002854, 4), (30002855, 4), (30002856, 4),
    (30002857, 4), (30002858, 4), (30002859, 4), (30002860, 4), (30002861, 4), (30002862, 4), (30002863, 4), (30002864, 4), (30002865, 4), (30002866, 4), (30002867, 4), (30002868, 4),
    (30002869, 4), (30002870, 4), (30002871, 4), (30002872, 4), (30002873, 4), (30002874, 4), (30002875, 4), (30002876, 4), (30002877, 4), (30002878, 4), (30002879, 4), (30002880, 4),
    (30002881, 4), (30002882, 4), (30002883, 4), (30002884, 4), (30002885, 4), (30002886, 4), (30002887, 4), (30002888, 4), (30002889, 4), (30002890, 4), (30002891, 4), (30002892, 4),
    (30002893, 4), (30002894, 4), (30002895, 4), (30002896, 4), (30002897, 4), (30002898, 4), (30002899, 4), (30002900, 4), (30002901, 4), (30002902, 4), (30002903, 4), (30002904, 4),
    (30002905, 4), (30002906, 4), (30002907, 4), (30002908, 4), (30002909, 4), (30002910, 4), (30002911, 4), (30002912, 4), (30002913, 4), (30002914, 4), (30002915, 4), (30002916, 4),
    (30002917, 4), (30002918, 4), (30002919, 4), (30002920, 4), (30002921, 4), (30002922, 4), (30002923, 4), (30002924, 4), (30002925, 4), (30002926, 4), (30002927, 4), (30002928, 4),
    (30002929, 4), (30002930, 4), (30002931, 4), (30002932, 4), (30002933, 4), (30002934, 4), (30002935, 4), (30002936, 4), (30002937, 4), (30002938, 4), (30002939, 4), (30002940, 4),
    (30002941, 4), (30002942, 4), (30002943, 4), (30002944, 4), (30002945, 4), (30002946, 4), (30002947, 4), (30002948, 4), (30002949, 4), (30002950, 4), (30002951, 4), (30002952, 4),
    (30002953, 4), (30002954, 4), (30002955, 4), (30002956, 4), (30002957, 2), (30002958, 2), (30002959, 2), (30002960, 2), (30002961, 2), (30002962, 2), (30002963, 1), (30002964, 1),
    (30002965, 1), (30002966, 1), (30002967, 1), (30002968, 1), (30002969, 1), (30002970, 1), (30002971, 1), (30002972, 1), (30002973, 1), (30002974, 1), (30002975, 2), (30002976, 2),
    (30002977, 2), (30002978, 2), (30002979, 2), (30002980, 2), (30002981, 2), (30002982, 2), (30002983, 2), (30002984, 2), (30002985, 2), (30002986, 1), (30002987, 2), (30002988, 1),
    (30002989, 1), (30002990, 1), (30002991, 1), (30002992, 1), (30002993, 1), (30002994, 1), (30002995, 1), (30002996, 1), (30002997, 1), (30002998, 1), (30002999, 1), (30003000, 2),
    (30003001, 1), (30003002, 1), (30003003, 1), (30003004, 1), (30003005, 1), (30003006, 1), (30003007, 1), (30003008, 1), (30003009, 1), (30003010, 1), (30003011, 1), (30003012, 1),
    (30003013, 1), (30003014, 1), (30003015, 1), (30003016, 1), (30003017, 1), (30003018, 1), (30003019, 1), (30003020, 1), (30003021, 1), (30003022, 2), (30003023, 2), (30003024, 1),
    (30003025, 1), (30003026, 1), (30003027, 1), (30003028, 1), (30003029, 1), (30003030, 1), (30003031, 1), (30003032, 1), (30003033, 1), (30003034, 1), (30003035, 1), (30003036, 1),
    (30003037, 1), (30003038, 1), (30003039, 1), (30003040, 1), (30003041, 1), (30003042, 2), (30003043, 1), (30003044, 2), (30003045, 1), (30003046, 3), (30003047, 1), (30003048, 1),
    (30003049, 1), (30003050, 1), (30003051, 1), (30003052, 1), (30003053, 1), (30003054, 1), (30003055, 1), (30003056, 1), (30003057, 2), (30003058, 1), (30003059, 2), (30003060, 2),
    (30003061, 2), (30003062, 2), (30003063, 2), (30003064, 1), (30003065, 1), (30003066, 1), (30003067, 2), (30003068, 2), (30003069, 2), (30003070, 2), (30003071, 2), (30003072, 2),
    (30003073, 1), (30003074, 1), (30003075, 1), (30003076, 1), (30003077, 2), (30003078, 1), (30003079, 2), (30003080, 1), (30003081, 1), (30003082, 1), (30003083, 1), (30003084, 1),
    (30003085, 1), (30003086, 2), (30003087, 2), (30003088, 2), (30003089, 2), (30003090, 2), (30003091, 2), (30003092, 1), (30003093, 2), (30003094, 1), (30003095, 1), (30003096, 1),
    (30003097, 1), (30003098, 4), (30003099, 4), (30003100, 4), (30003101, 4), (30003102, 4), (30003103, 4), (30003104, 4), (30003105, 4), (30003106, 4), (30003107, 4), (30003108, 4),
    (30003109, 4), (30003110, 4), (30003111, 4), (30003112, 4), (30003113, 4), (30003114, 4), (30003115, 4), (30003116, 4), (30003117, 4), (30003118, 4), (30003119, 4), (30003120, 4),
    (30003121, 4), (30003122, 4), (30003123, 4), (30003124, 4), (30003125, 4), (30003126, 4), (30003127, 4), (30003128, 4), (30003129, 4), (30003130, 4), (30003131, 4), (30003132, 4),
    (30003133, 4), (30003134, 4), (30003135, 4), (30003136, 4), (30003137, 4), (30003138, 4), (30003139, 4), (30003140, 4), (30003141, 4), (30003142, 4), (30003143, 4), (30003144, 4),
    (30003145, 4), (30003146, 4), (30003147, 4), (30003148, 4), (30003149, 4), (30003150, 4), (30003151, 4), (30003152, 4), (30003153, 4), (30003154, 4), (30003155, 4), (30003156, 4),
    (30003157, 4), (30003158, 4), (30003159, 4), (30003160, 4), (30003161, 4), (30003162, 4), (30003163, 4), (30003164, 4), (30003165, 4), (30003166, 4), (30003167, 4), (30003168, 4),
    (30003169, 4), (30003170, 4), (30003171, 4), (30003172, 4), (30003173, 4), (30003174, 4), (30003175, 4), (30003176, 4), (30003177, 4), (30003178, 4), (30003179, 4), (30003180, 4),
    (30003181, 4), (30003182, 4), (30003183, 4), (30003184, 4), (30003185, 4), (30003186, 4), (30003187, 4), (30003188, 4), (30003189, 4), (30003190, 4), (30003191, 4), (30003192, 4),
    (30003193, 4), (30003194, 4), (30003195, 4), (30003196, 4), (30003197, 4), (30003198, 4), (30003199, 4), (30003200, 4), (30003201, 4), (30003202, 4), (30003203, 4), (30003204, 4),
    (30003205, 4), (30003206, 4), (30003207, 4), (30003208, 4), (30003209, 4), (30003210, 4), (30003211, 4), (30003212, 4), (30003213, 4), (30003214, 4), (30003215, 4), (30003216, 4),
    (30003217, 4), (30003218, 4), (30003219, 4), (30003220, 4), (30003221, 4), (30003222, 4), (30003223, 4), (30003224, 4), (30003225, 4), (30003226, 4), (30003227, 4), (30003228, 4),
    (30003229, 4), (30003230, 4), (30003231, 4), (30003232, 4), (30003233, 4), (30003234, 4), (30003235, 4), (30003236, 4), (30003237, 4), (30003238, 4), (30003239, 4), (30003240, 4),
    (30003241, 4), (30003242, 4), (30003243, 4), (30003244, 4), (30003245, 4), (30003246, 4), (30003247, 4), (30003248, 4), (30003249, 4), (30003250, 4), (30003251, 4), (30003252, 4),
    (30003253, 4), (30003254, 4), (30003255, 4), (30003256, 4), (30003257, 4), (30003258, 4), (30003259, 4), (30003260, 4), (30003261, 4), (30003262, 4), (30003263, 4), (30003264, 4),
    (30003265, 4), (30003266, 4), (30003267, 4), (30003268, 4), (30003269, 4), (30003270, 4), (30003271, 4), (30003272, 4), (30003273, 4), (30003274, 4), (30003275, 4), (30003276, 4),
    (30003277, 4), (30003278, 4), (30003279, 4), (30003280, 4), (30003281, 4), (30003282, 4), (30003283, 4), (30003284, 4), (30003285, 4), (30003286, 4), (30003287, 4), (30003288, 4),
    (30003289, 4), (30003290, 4), (30003291, 4), (30003292, 4), (30003293, 4), (30003294, 4), (30003295, 4), (30003296, 4), (30003297, 4), (30003298, 4), (30003299, 4), (30003300, 4),
    (30003301, 4), (30003302, 4), (30003303, 4), (30003304, 4), (30003305, 4), (30003306, 4), (30003307, 4), (30003308, 4), (30003309, 4), (30003310, 4), (30003311, 4), (30003312, 4),
    (30003313, 4), (30003314, 4), (30003315, 4), (30003316, 4), (30003317, 4), (30003318, 4), (30003319, 4), (30003320, 4), (30003321, 4), (30003322, 4), (30003323, 4), (30003324, 4),
    (30003325, 4), (30003326, 4), (30003327, 4), (30003328, 4), (30003329, 4), (30003330, 4), (30003331, 4), (30003332, 4), (30003333, 4), (30003334, 4), (30003335, 4), (30003336, 4),
    (30003337, 4), (30003338, 4), (30003339, 4), (30003340, 4), (30003341, 4), (30003342, 4), (30003343, 4), (30003344, 4), (30003345, 4), (30003346, 4), (30003347, 4), (30003348, 4),
    (30003349, 4), (30003350, 4), (30003351, 4), (30003352, 4), (30003353, 4), (30003354, 4), (30003355, 4), (30003356, 4), (30003357, 4), (30003358, 4), (30003359, 4), (30003360, 4),
    (30003361, 4), (30003362, 4), (30003363, 4), (30003364, 4), (30003365, 4), (30003366, 4), (30003367, 4), (30003368, 4), (30003369, 4), (30003370, 4), (30003371, 4), (30003372, 4),
    (30003373, 4), (30003374, 1), (30003375, 1), (30003376, 1), (30003377, 1), (30003378, 1), (30003379, 1), (30003380, 1), (30003381, 1), (30003382, 1), (30003383, 1), (30003384, 1),
    (30003385, 1), (30003386, 1), (30003387, 1), (30003388, 1), (30003389, 1), (30003390, 1), (30003391, 1), (30003392, 1), (30003393, 1), (30003394, 1), (30003395, 1), (30003396, 1),
    (30003397, 1), (30003398, 1), (30003399, 1), (30003400, 1), (30003401, 1), (30003402, 1), (30003403, 1), (30003404, 1), (30003405, 1), (30003406, 1), (30003407, 1), (30003408, 1),
    (30003409, 1), (30003410, 1), (30003411, 1), (30003412, 1), (30003413, 1), (30003414, 1), (30003415, 1), (30003416, 1), (30003417, 1), (30003418, 1), (30003419, 1), (30003420, 1),
    (30003421, 1), (30003422, 1), (30003423, 1), (30003424, 2), (30003425, 2), (30003426, 1), (30003427, 1), (30003428, 1), (30003429, 1), (30003430, 1), (30003431, 1), (30003432, 1),
    (30003433, 1), (30003434, 1), (30003435, 1), (30003436, 1), (30003437, 1), (30003438, 1), (30003439, 1), (30003440, 1), (30003441, 1), (30003442, 1), (30003443, 1), (30003444, 2),
    (30003445, 1), (30003446, 2), (30003447, 1), (30003448, 1), (30003449, 1), (30003450, 1), (30003451, 1), (30003452, 1), (30003453, 1), (30003454, 1), (30003455, 1), (30003456, 1),
    (30003457, 1), (30003458, 1), (30003459, 1), (30003460, 2), (30003461, 1), (30003462, 1), (30003463, 1), (30003464, 1), (30003465, 2), (30003466, 2), (30003467, 2), (30003468, 1),
    (30003469, 1), (30003470, 2), (30003471, 2), (30003472, 1), (30003473, 1), (30003474, 2), (30003475, 2), (30003476, 1), (30003477, 2), (30003478, 2), (30003479, 2), (30003480, 2),
    (30003481, 2), (30003482, 1), (30003483, 2), (30003484, 2), (30003485, 1), (30003486, 2), (30003487, 1), (30003488, 1), (30003489, 1), (30003490, 1), (30003491, 1), (30003492, 1),
    (30003493, 1), (30003494, 1), (30003495, 3), (30003496, 1), (30003497, 1), (30003498, 1), (30003499, 2), (30003500, 1), (30003501, 1), (30003502, 1), (30003503, 1), (30003504, 3),
    (30003505, 1), (30003506, 1), (30003507, 1), (30003508, 1), (30003509, 1), (30003510, 1), (30003511, 1), (30003512, 1), (30003513, 1), (30003514, 1), (30003515, 1), (30003516, 1),
    (30003517, 1), (30003518, 1), (30003519, 1), (30003520, 1), (30003521, 1), (30003522, 1), (30003523, 1), (30003524, 1), (30003525, 1), (30003526, 1), (30003527, 1), (30003528, 1),
    (30003529, 1), (30003530, 2), (30003531, 1), (30003532, 1), (30003533, 1), (30003534, 2), (30003535, 1), (30003536, 1), (30003537, 1), (30003538, 1), (30003539, 1), (30003540, 1),
    (30003541, 2), (30003542, 1), (30003543, 2), (30003544, 2), (30003545, 1), (30003546, 1), (30003547, 1), (30003548, 1), (30003549, 1), (30003550, 1), (30003551, 1), (30003552, 1),
    (30003553, 1), (30003554, 1), (30003555, 1), (30003556, 2), (30003557, 2), (30003558, 1), (30003559, 2), (30003560, 2), (30003561, 2), (30003562, 2), (30003563, 2), (30003564, 2),
    (30003565, 2), (30003566, 2), (30003567, 2), (30003568, 2), (30003569, 2), (30003570, 2), (30003571, 2), (30003572, 2), (30003573, 2), (30003574, 1), (30003575, 1), (30003576, 1),
    (30003577, 1), (30003578, 1), (30003579, 1), (30003580, 1), (30003581, 1), (30003582, 1), (30003583, 1), (30003584, 2), (30003585, 2), (30003586, 1), (30003587, 2), (30003588, 1),
    (30003589, 1), (30003590, 1), (30003591, 1), (30003592, 1), (30003593, 1), (30003594, 2), (30003595, 2), (30003596, 2), (30003597, 2), (30003598, 2), (30003599, 2), (30003600, 2),
    (30003601, 2), (30003602, 2), (30003603, 1), (30003604, 1), (30003605, 1), (30003606, 2), (30003607, 2), (30003608, 4), (30003609, 4), (30003610, 4), (30003611, 4), (30003612, 4),
    (30003613, 4), (30003614, 4), (30003615, 4), (30003616, 4), (30003617, 4), (30003618, 4), (30003619, 4), (30003620, 4), (30003621, 4), (30003622, 4), (30003623, 4), (30003624, 4),
    (30003625, 4), (30003626, 4), (30003627, 4), (30003628, 4), (30003629, 4), (30003630, 4), (30003631, 4), (30003632, 4), (30003633, 4), (30003634, 4), (30003635, 4), (30003636, 4),
    (30003637, 4), (30003638, 4), (30003639, 4), (30003640, 4), (30003641, 4), (30003642, 4), (30003643, 4), (30003644, 4), (30003645, 4), (30003646, 4), (30003647, 4), (30003648, 4),
    (30003649, 4), (30003650, 4), (30003651, 4), (30003652, 4), (30003653, 4), (30003654, 4), (30003655, 4), (30003656, 4), (30003657, 4), (30003658, 4), (30003659, 4), (30003660, 4),
    (30003661, 4), (30003662, 4), (30003663, 4), (30003664, 4), (30003665, 4), (30003666, 4), (30003667, 4), (30003668, 4), (30003669, 4), (30003670, 4), (30003671, 4), (30003672, 4),
    (30003673, 4), (30003674, 4), (30003675, 4), (30003676, 4), (30003677, 4), (30003678, 4), (30003679, 4), (30003680, 4), (30003681, 4), (30003682, 4), (30003683, 4), (30003684, 4),
    (30003685, 4), (30003686, 4), (30003687, 4), (30003688, 4), (30003689, 4), (30003690, 4), (30003691, 4), (30003692, 4), (30003693, 4), (30003694, 4), (30003695, 4), (30003696, 4),
    (30003697, 4), (30003698, 4), (30003699, 4), (30003700, 4), (30003701, 4), (30003702, 4), (30003703, 4), (30003704, 4), (30003705, 4), (30003706, 4), (30003707, 4), (30003708, 4),
    (30003709, 4), (30003710, 4), (30003711, 4), (30003712, 4), (30003713, 4), (30003714, 4), (30003715, 4), (30003716, 4), (30003717, 4), (30003718, 4), (30003719, 4), (30003720, 4),
    (30003721, 4), (30003722, 4), (30003723, 4), (30003724, 4), (30003725, 4), (30003726, 4), (30003727, 4), (30003728, 4), (30003729, 4), (30003730, 4), (30003731, 4), (30003732, 4),
    (30003733, 4), (30003734, 4), (30003735, 4), (30003736, 4), (30003737, 4), (30003738, 4), (30003739, 4), (30003740, 4), (30003741, 4), (30003742, 4), (30003743, 4), (30003744, 4),
    (30003745, 4), (30003746, 4), (30003747, 4), (30003748, 4), (30003749, 4), (30003750, 4), (30003751, 4), (30003752, 4), (30003753, 4), (30003754, 4), (30003755, 4), (30003756, 4),
    (30003757, 4), (30003758, 4), (30003759, 4), (30003760, 4), (30003761, 4), (30003762, 4), (30003763, 4), (30003764, 4), (30003765, 4), (30003766, 4), (30003767, 4), (30003768, 4),
    (30003769, 4), (30003770, 4), (30003771, 4), (30003772, 4), (30003773, 4), (30003774, 4), (30003775, 4), (30003776, 4), (30003777, 4), (30003778, 4), (30003779, 4), (30003780, 4),
    (30003781, 4), (30003782, 4), (30003783, 4), (30003784, 4), (30003785, 4), (30003786, 4), (30003787, 2), (30003788, 1), (30003789, 2), (30003790, 2), (30003791, 2), (30003792, 2),
    (30003793, 2), (30003794, 1), (30003795, 2), (30003796, 2), (30003797, 2), (30003798, 1), (30003799, 2), (30003800, 2), (30003801, 2), (30003802, 2), (30003803, 2), (30003804, 2),
    (30003805, 2), (30003806, 2), (30003807, 2), (30003808, 2), (30003809, 1), (30003810, 1), (30003811, 1), (30003812, 1), (30003813, 1), (30003814, 1), (30003815, 1), (30003816, 1),
    (30003817, 1), (30003818, 2), (30003819, 2), (30003820, 2), (30003821, 2), (30003822, 2), (30003823, 2), (30003824, 1), (30003825, 2), (30003826, 2), (30003827, 2), (30003828, 2),
    (30003829, 2), (30003830, 1), (30003831, 1), (30003832, 1), (30003833, 2), (30003834, 2), (30003835, 2), (30003836, 2), (30003837, 2), (30003838, 2), (30003839, 2), (30003840, 2),
    (30003841, 2), (30003842, 2), (30003843, 2), (30003844, 2), (30003845, 2), (30003846, 2), (30003847, 2), (30003848, 2), (30003849, 2), (30003850, 2), (30003851, 2), (30003852, 2),
    (30003853, 2), (30003854, 2), (30003855, 2), (30003856, 2), (30003857, 2), (30003858, 1), (30003859, 1), (30003860, 1), (30003861, 1), (30003862, 1), (30003863, 1), (30003864, 1),
    (30003865, 1), (30003866, 1), (30003867, 1), (30003868, 1), (30003869, 1), (30003870, 1), (30003871, 1), (30003872, 1), (30003873, 1), (30003874, 1), (30003875, 1), (30003876, 1),
    (30003877, 1), (30003878, 1), (30003879, 1), (30003880, 1), (30003881, 1), (30003882, 1), (30003883, 1), (30003884, 2), (30003885, 1), (30003886, 2), (30003887, 2), (30003888, 1),
    (30003889, 1), (30003890, 1), (30003891, 1), (30003892, 2), (30003893, 1), (30003894, 1), (30003895, 1), (30003896, 2), (30003897, 2), (30003898, 2), (30003899, 2), (30003900, 2),
    (30003901, 2), (30003902, 2), (30003903, 1), (30003904, 1), (30003905, 2), (30003906, 1), (30003907, 2), (30003908, 1), (30003909, 1), (30003910, 1), (30003911, 1), (30003912, 1),
    (30003913, 1), (30003914, 1), (30003915, 1), (30003916, 2), (30003917, 2), (30003918, 2), (30003919, 2), (30003920, 2), (30003921, 2), (30003922, 2), (30003923, 2), (30003924, 2),
    (30003925, 2), (30003926, 2), (30003927, 2), (30003928, 2), (30003929, 2), (30003930, 2), (30003931, 2), (30003932, 2), (30003933, 2), (30003934, 2), (30003935, 2), (30003936, 2),
    (30003937, 2), (30003938, 2), (30003939, 2), (30003940, 2), (30003941, 2), (30003942, 4), (30003943, 4), (30003944, 4), (30003945, 4), (30003946, 4), (30003947, 4), (30003948, 4),
    (30003949, 4), (30003950, 4), (30003951, 4), (30003952, 4), (30003953, 4), (30003954, 4), (30003955, 4), (30003956, 4), (30003957, 4), (30003958, 4), (30003959, 4), (30003960, 4),
    (30003961, 4), (30003962, 4), (30003963, 4), (30003964, 4), (30003965, 4), (30003966, 4), (30003967, 4), (30003968, 4), (30003969, 4), (30003970, 4), (30003971, 4), (30003972, 4),
    (30003973, 4), (30003974, 4), (30003975, 4), (30003976, 4), (30003977, 4), (30003978, 4), (30003979, 4), (30003980, 4), (30003981, 4), (30003982, 4), (30003983, 4), (30003984, 4),
    (30003985, 4), (30003986, 4), (30003987, 4), (30003988, 4), (30003989, 4), (30003990, 4), (30003991, 4), (30003992, 4), (30003993, 4), (30003994, 4), (30003995, 4), (30003996, 4),
    (30003997, 4), (30003998, 4), (30003999, 4), (30004000, 4), (30004001, 4), (30004002, 4), (30004003, 4), (30004004, 4), (30004005, 4), (30004006, 4), (30004007, 4), (30004008, 4),
    (30004009, 4), (30004010, 4), (30004011, 4), (30004012, 4), (30004013, 4), (30004014, 4), (30004015, 4), (30004016, 4), (30004017, 4), (30004018, 4), (30004019, 4), (30004020, 4),
    (30004021, 4), (30004022, 4), (30004023, 4), (30004024, 4), (30004025, 4), (30004026, 4), (30004027, 4), (30004028, 4), (30004029, 4), (30004030, 4), (30004031, 4), (30004032, 4),
    (30004033, 4), (30004034, 4), (30004035, 4), (30004036, 4), (30004037, 4), (30004038, 4), (30004039, 4), (30004040, 4), (30004041, 4), (30004042, 4), (30004043, 4), (30004044, 4),
    (30004045, 4), (30004046, 4), (30004047, 4), (30004048, 4), (30004049, 4), (30004050, 4), (30004051, 4), (30004052, 4), (30004053, 4), (30004054, 4), (30004055, 4), (30004056, 4),
    (30004057, 4), (30004058, 4), (30004059, 4), (30004060, 4), (30004061, 4), (30004062, 4), (30004063, 4), (30004064, 4), (30004065, 4), (30004066, 4), (30004067, 4), (30004068, 4),
    (30004069, 4), (30004070, 4), (30004071, 4), (30004072, 4), (30004073, 4), (30004074, 4), (30004075, 4), (30004076, 4), (30004077, 1), (30004078, 1), (30004079, 1), (30004080, 1),
    (30004081, 1), (30004082, 1), (30004083, 1), (30004084, 1), (30004085, 1), (30004086, 1), (30004087, 1), (30004088, 1), (30004089, 1), (30004090, 1), (30004091, 1), (30004092, 1),
    (30004093, 1), (30004094, 1), (30004095, 1), (30004096, 1), (30004097, 1), (30004098, 1), (30004099, 1), (30004100, 1), (30004101, 1), (30004102, 1), (30004103, 1), (30004104, 2),
    (30004105, 2), (30004106, 2), (30004107, 1), (30004108, 2), (30004109, 2), (30004110, 1), (30004111, 1), (30004112, 1), (30004113, 1), (30004114, 1), (30004115, 1), (30004116, 1),
    (30004117, 2), (30004118, 2), (30004119, 2), (30004120, 2), (30004121, 2), (30004122, 1), (30004123, 1), (30004124, 1), (30004125, 1), (30004126, 1), (30004127, 1), (30004128, 1),
    (30004129, 1), (30004130, 1), (30004131, 1), (30004132, 1), (30004133, 1), (30004134, 1), (30004135, 1), (30004136, 2), (30004137, 2), (30004138, 2), (30004139, 2), (30004140, 2),
    (30004141, 2), (30004142, 1), (30004143, 1), (30004144, 1), (30004145, 1), (30004146, 1), (30004147, 1), (30004148, 1), (30004149, 1), (30004150, 1), (30004151, 1), (30004152, 1),
    (30004153, 1), (30004154, 1), (30004155, 1), (30004156, 1), (30004157, 1), (30004158, 1), (30004159, 1), (30004160, 1), (30004161, 4), (30004162, 4), (30004163, 4), (30004164, 4),
    (30004165, 4), (30004166, 4), (30004167, 4), (30004168, 4), (30004169, 4), (30004170, 4), (30004171, 4), (30004172, 4), (30004173, 4), (30004174, 4), (30004175, 4), (30004176, 4),
    (30004177, 4), (30004178, 4), (30004179, 4), (30004180, 4), (30004181, 4), (30004182, 4), (30004183, 4), (30004184, 4), (30004185, 4), (30004186, 4), (30004187, 4), (30004188, 4),
    (30004189, 4), (30004190, 4), (30004191, 4), (30004192, 4), (30004193, 4), (30004194, 4), (30004195, 4), (30004196, 4), (30004197, 4), (30004198, 4), (30004199, 4), (30004200, 4),
    (30004201, 4), (30004202, 4), (30004203, 4), (30004204, 4), (30004205, 4), (30004206, 4), (30004207, 4), (30004208, 4), (30004209, 4), (30004210, 4), (30004211, 4), (30004212, 4),
    (30004213, 4), (30004214, 4), (30004215, 4), (30004216, 4), (30004217, 4), (30004218, 4), (30004219, 4), (30004220, 4), (30004221, 4), (30004222, 4), (30004223, 4), (30004224, 4),
    (30004225, 4), (30004226, 4), (30004227, 4), (30004228, 4), (30004229, 4), (30004230, 2), (30004231, 2), (30004232, 2), (30004233, 2), (30004234, 2), (30004235, 2), (30004236, 2),
    (30004237, 2), (30004238, 2), (30004239, 2), (30004240, 2), (30004241, 2), (30004242, 2), (30004243, 2), (30004244, 2), (30004245, 2), (30004246, 2), (30004247, 2), (30004248, 1),
    (30004249, 1), (30004250, 1), (30004251, 1), (30004252, 1), (30004253, 1), (30004254, 2), (30004255, 2), (30004256, 2), (30004257, 2), (30004258, 2), (30004259, 2), (30004260, 2),
    (30004261, 2), (30004262, 2), (30004263, 2), (30004264, 2), (30004265, 2), (30004266, 2), (30004267, 2), (30004268, 1), (30004269, 2), (30004270, 1), (30004271, 2), (30004272, 2),
    (30004273, 2), (30004274, 2), (30004275, 2), (30004276, 2), (30004277, 2), (30004278, 2), (30004279, 2), (30004280, 2), (30004281, 2), (30004282, 2), (30004283, 2), (30004284, 2),
    (30004285, 2), (30004286, 2), (30004287, 2), (30004288, 2), (30004289, 2), (30004290, 1), (30004291, 2), (30004292, 2), (30004293, 2), (30004294, 2), (30004295, 1), (30004296, 2),
    (30004297, 2), (30004298, 2), (30004299, 2), (30004300, 2), (30004301, 2), (30004302, 2), (30004303, 2), (30004304, 2), (30004305, 2), (30004306, 2), (30004307, 2), (30004308, 2),
    (30004309, 2), (30004310, 4), (30004311, 4), (30004312, 4), (30004313, 4), (30004314, 4), (30004315, 4), (30004316, 4), (30004317, 4), (30004318, 4), (30004319, 4), (30004320, 4),
    (30004321, 4), (30004322, 4), (30004323, 4), (30004324, 4), (30004325, 4), (30004326, 4), (30004327, 4), (30004328, 4), (30004329, 4), (30004330, 4), (30004331, 4), (30004332, 4),
    (30004333, 4), (30004334, 4), (30004335, 4), (30004336, 4), (30004337, 4), (30004338, 4), (30004339, 4), (30004340, 4), (30004341, 4), (30004342, 4), (30004343, 4), (30004344, 4),
    (30004345, 4), (30004346, 4), (30004347, 4), (30004348, 4), (30004349, 4), (30004350, 4), (30004351, 4), (30004352, 4), (30004353, 4), (30004354, 4), (30004355, 4), (30004356, 4),
    (30004357, 4), (30004358, 4), (30004359, 4), (30004360, 4), (30004361, 4), (30004362, 4), (30004363, 4), (30004364, 4), (30004365, 4), (30004366, 4), (30004367, 4), (30004368, 4),
    (30004369, 4), (30004370, 4), (30004371, 4), (30004372, 4), (30004373, 4), (30004374, 4), (30004375, 4), (30004376, 4), (30004377, 4), (30004378, 4), (30004379, 4), (30004380, 4),
    (30004381, 4), (30004382, 4), (30004383, 4), (30004384, 4), (30004385, 4), (30004386, 4), (30004387, 4), (30004388, 4), (30004389, 4), (30004390, 4), (30004391, 4), (30004392, 4),
    (30004393, 4), (30004394, 4), (30004395, 4), (30004396, 4), (30004397, 4), (30004398, 4), (30004399, 4), (30004400, 4), (30004401, 4), (30004402, 4), (30004403, 4), (30004404, 4),
    (30004405, 4), (30004406, 4), (30004407, 4), (30004408, 4), (30004409, 4), (30004410, 4), (30004411, 4), (30004412, 4), (30004413, 4), (30004414, 4), (30004415, 4), (30004416, 4),
    (30004417, 4), (30004418, 4), (30004419, 4), (30004420, 4), (30004421, 4), (30004422, 4), (30004423, 4), (30004424, 4), (30004425, 4), (30004426, 4), (30004427, 4), (30004428, 4),
    (30004429, 4), (30004430, 4), (30004431, 4), (30004432, 4), (30004433, 4), (30004434, 4), (30004435, 4), (30004436, 4), (30004437, 4), (30004438, 4), (30004439, 4), (30004440, 4),
    (30004441, 4), (30004442, 4), (30004443, 4), (30004444, 4), (30004445, 4), (30004446, 4), (30004447, 4), (30004448, 4), (30004449, 4), (30004450, 4), (30004451, 4), (30004452, 4),
    (30004453, 4), (30004454, 4), (30004455, 4), (30004456, 4), (30004457, 4), (30004458, 4), (30004459, 4), (30004460, 4), (30004461, 4), (30004462, 4), (30004463, 4), (30004464, 4),
    (30004465, 4), (30004466, 4), (30004467, 4), (30004468, 4), (30004469, 4), (30004470, 4), (30004471, 4), (30004472, 4), (30004473, 4), (30004474, 4), (30004475, 4), (30004476, 4),
    (30004477, 4), (30004478, 4), (30004479, 4), (30004480, 4), (30004481, 4), (30004482, 4), (30004483, 4), (30004484, 4), (30004485, 4), (30004486, 4), (30004487, 4), (30004488, 4),
    (30004489, 4), (30004490, 4), (30004491, 4), (30004492, 4), (30004493, 4), (30004494, 4), (30004495, 4), (30004496, 4), (30004497, 4), (30004498, 4), (30004499, 4), (30004500, 4),
    (30004501, 4), (30004502, 4), (30004503, 4), (30004504, 4), (30004505, 4), (30004506, 4), (30004507, 4), (30004508, 4), (30004509, 4), (30004510, 4), (30004511, 4), (30004512, 4),
    (30004513, 4), (30004514, 4), (30004515, 4), (30004516, 4), (30004517, 4), (30004518, 4), (30004519, 4), (30004520, 4), (30004521, 4), (30004522, 4), (30004523, 4), (30004524, 4),
    (30004525, 4), (30004526, 4), (30004527, 4), (30004528, 4), (30004529, 4), (30004530, 4), (30004531, 4), (30004532, 4), (30004533, 4), (30004534, 4), (30004535, 4), (30004536, 4),
    (30004537, 4), (30004538, 4), (30004539, 4), (30004540, 4), (30004541, 4), (30004542, 4), (30004543, 4), (30004544, 4), (30004545, 4), (30004546, 4), (30004547, 4), (30004548, 4),
    (30004549, 4), (30004550, 4), (30004551, 4), (30004552, 4), (30004553, 4), (30004554, 4), (30004555, 4), (30004556, 4), (30004557, 4), (30004558, 4), (30004559, 4), (30004560, 4),
    (30004561, 4), (30004562, 4), (30004563, 4), (30004564, 4), (30004565, 4), (30004566, 4), (30004567, 4), (30004568, 4), (30004569, 4), (30004570, 4), (30004571, 4), (30004572, 4),
    (30004573, 4), (30004574, 4), (30004575, 4), (30004576, 4), (30004577, 4), (30004578, 4), (30004579, 4), (30004580, 4), (30004581, 4), (30004582, 4), (30004583, 4), (30004584, 4),
    (30004585, 4), (30004586, 4), (30004587, 4), (30004588, 4), (30004589, 4), (30004590, 4), (30004591, 4), (30004592, 4), (30004593, 4), (30004594, 4), (30004595, 4), (30004596, 4),
    (30004597, 4), (30004598, 4), (30004599, 4), (30004600, 4), (30004601, 4), (30004602, 4), (30004603, 4), (30004604, 4), (30004605, 4), (30004606, 4), (30004607, 4), (30004608, 4),
    (30004609, 4), (30004610, 4), (30004611, 4), (30004612, 4), (30004613, 4), (30004614, 4), (30004615, 4), (30004616, 4), (30004617, 4), (30004618, 4), (30004619, 4), (30004620, 4),
    (30004621, 4), (30004622, 4), (30004623, 4), (30004624, 4), (30004625, 4), (30004626, 4), (30004627, 4), (30004628, 4), (30004629, 4), (30004630, 4), (30004631, 4), (30004632, 4),
    (30004633, 4), (30004634, 4), (30004635, 4), (30004636, 4), (30004637, 4), (30004638, 4), (30004639, 4), (30004640, 4), (30004641, 4), (30004642, 4), (30004643, 4), (30004644, 4),
    (30004645, 4), (30004646, 4), (30004647, 4), (30004648, 4), (30004649, 4), (30004650, 4), (30004651, 4), (30004652, 4), (30004653, 4), (30004654, 4), (30004655, 4), (30004656, 4),
    (30004657, 4), (30004658, 4), (30004659, 4), (30004660, 4), (30004661, 4), (30004662, 4), (30004663, 4), (30004664, 4), (30004665, 4), (30004666, 4), (30004667, 4), (30004668, 4),
    (30004669, 4), (30004670, 4), (30004671, 4), (30004672, 4), (30004673, 4), (30004674, 4), (30004675, 4), (30004676, 4), (30004677, 4), (30004678, 4), (30004679, 4), (30004680, 4),
    (30004681, 4), (30004682, 4), (30004683, 4), (30004684, 4), (30004685, 4), (30004686, 4), (30004687, 4), (30004688, 4), (30004689, 4), (30004690, 4), (30004691, 4), (30004692, 4),
    (30004693, 4), (30004694, 4), (30004695, 4), (30004696, 4), (30004697, 4), (30004698, 4), (30004699, 4), (30004700, 4), (30004701, 4), (30004702, 4), (30004703, 4), (30004704, 4),
    (30004705, 4), (30004706, 4), (30004707, 4), (30004708, 4), (30004709, 4), (30004710, 4), (30004711, 4), (30004712, 4), (30004713, 4), (30004714, 4), (30004715, 4), (30004716, 4),
    (30004717, 4), (30004718, 4), (30004719, 4), (30004720, 4), (30004721, 4), (30004722, 4), (30004723, 4), (30004724, 4), (30004725, 4), (30004726, 4), (30004727, 4), (30004728, 4),
    (30004729, 4), (30004730, 4), (30004731, 4), (30004732, 4), (30004733, 4), (30004734, 4), (30004735, 4), (30004736, 4), (30004737, 4), (30004738, 4), (30004739, 4), (30004740, 4),
    (30004741, 4), (30004742, 4), (30004743, 4), (30004744, 4), (30004745, 4), (30004746, 4), (30004747, 4), (30004748, 4), (30004749, 4), (30004750, 4), (30004751, 4), (30004752, 4),
    (30004753, 4), (30004754, 4), (30004755, 4), (30004756, 4), (30004757, 4), (30004758, 4), (30004759, 4), (30004760, 4), (30004761, 4), (30004762, 4), (30004763, 4), (30004764, 4),
    (30004765, 4), (30004766, 4), (30004767, 4), (30004768, 4), (30004769, 4), (30004770, 4), (30004771, 4), (30004772, 4), (30004773, 4), (30004774, 4), (30004775, 4), (30004776, 4),
    (30004777, 4), (30004778, 4), (30004779, 4), (30004780, 4), (30004781, 4), (30004782, 4), (30004783, 4), (30004784, 4), (30004785, 4), (30004786, 4), (30004787, 4), (30004788, 4),
    (30004789, 4), (30004790, 4), (30004791, 4), (30004792, 4), (30004793, 4), (30004794, 4), (30004795, 4), (30004796, 4), (30004797, 4), (30004798, 4), (30004799, 4), (30004800, 4),
    (30004801, 4), (30004802, 4), (30004803, 4), (30004804, 4), (30004805, 4), (30004806, 4), (30004807, 4), (30004808, 4), (30004809, 4), (30004810, 4), (30004811, 4), (30004812, 4),
    (30004813, 4), (30004814, 4), (30004815, 4), (30004816, 4), (30004817, 4), (30004818, 4), (30004819, 4), (30004820, 4), (30004821, 4), (30004822, 4), (30004823, 4), (30004824, 4),
    (30004825, 4), (30004826, 4), (30004827, 4), (30004828, 4), (30004829, 4), (30004830, 4), (30004831, 4), (30004832, 4), (30004833, 4), (30004834, 4), (30004835, 4), (30004836, 4),
    (30004837, 4), (30004838, 4), (30004839, 4), (30004840, 4), (30004841, 4), (30004842, 4), (30004843, 4), (30004844, 4), (30004845, 4), (30004846, 4), (30004847, 4), (30004848, 4),
    (30004849, 4), (30004850, 4), (30004851, 4), (30004852, 4), (30004853, 4), (30004854, 4), (30004855, 4), (30004856, 4), (30004857, 4), (30004858, 4), (30004859, 4), (30004860, 4),
    (30004861, 4), (30004862, 4), (30004863, 4), (30004864, 4), (30004865, 4), (30004866, 4), (30004867, 4), (30004868, 4), (30004869, 4), (30004870, 4), (30004871, 4), (30004872, 4),
    (30004873, 4), (30004874, 4), (30004875, 4), (30004876, 4), (30004877, 4), (30004878, 4), (30004879, 4), (30004880, 4), (30004881, 4), (30004882, 4), (30004883, 4), (30004884, 4),
    (30004885, 4), (30004886, 4), (30004887, 4), (30004888, 4), (30004889, 4), (30004890, 4), (30004891, 4), (30004892, 4), (30004893, 4), (30004894, 4), (30004895, 4), (30004896, 4),
    (30004897, 4), (30004898, 4), (30004899, 4), (30004900, 4), (30004901, 4), (30004902, 4), (30004903, 4), (30004904, 4), (30004905, 4), (30004906, 4), (30004907, 4), (30004908, 4),
    (30004909, 4), (30004910, 4), (30004911, 4), (30004912, 4), (30004913, 4), (30004914, 4), (30004915, 4), (30004916, 4), (30004917, 4), (30004918, 4), (30004919, 4), (30004920, 4),
    (30004921, 4), (30004922, 4), (30004923, 4), (30004924, 4), (30004925, 4), (30004926, 4), (30004927, 4), (30004928, 4), (30004929, 4), (30004930, 4), (30004931, 4), (30004932, 4),
    (30004933, 4), (30004934, 4), (30004935, 4), (30004936, 4), (30004937, 4), (30004938, 4), (30004939, 4), (30004940, 4), (30004941, 4), (30004942, 4), (30004943, 4), (30004944, 4),
    (30004945, 4), (30004946, 4), (30004947, 4), (30004948, 4), (30004949, 4), (30004950, 4), (30004951, 4), (30004952, 4), (30004953, 4), (30004954, 4), (30004955, 4), (30004956, 4),
    (30004957, 4), (30004958, 4), (30004959, 4), (30004960, 4), (30004961, 4), (30004962, 4), (30004963, 4), (30004964, 4), (30004965, 4), (30004966, 4), (30004967, 1), (30004968, 1),
    (30004969, 1), (30004970, 1), (30004971, 1), (30004972, 1), (30004973, 1), (30004974, 1), (30004975, 1), (30004976, 1), (30004977, 2), (30004978, 1), (30004979, 2), (30004980, 2),
    (30004981, 1), (30004982, 2), (30004983, 1), (30004984, 2), (30004985, 2), (30004986, 2), (30004987, 1), (30004988, 2), (30004989, 1), (30004990, 2), (30004991, 2), (30004992, 2),
    (30004993, 1), (30004994, 1), (30004995, 1), (30004996, 2), (30004997, 2), (30004998, 2), (30004999, 2), (30005000, 2), (30005001, 1), (30005002, 1), (30005003, 2), (30005004, 1),
    (30005005, 3), (30005006, 1), (30005007, 2), (30005008, 2), (30005009, 1), (30005010, 2), (30005011, 1), (30005012, 2), (30005013, 1), (30005014, 2), (30005015, 1), (30005016, 1),
    (30005017, 1), (30005018, 1), (30005019, 1), (30005020, 2), (30005021, 1), (30005022, 2), (30005023, 1), (30005024, 1), (30005025, 1), (30005026, 1), (30005027, 1), (30005028, 1),
    (30005029, 3), (30005030, 2), (30005031, 2), (30005032, 2), (30005033, 2), (30005034, 2), (30005035, 2), (30005036, 1), (30005037, 1), (30005038, 1), (30005039, 1), (30005040, 1),
    (30005041, 1), (30005042, 1), (30005043, 1), (30005044, 1), (30005045, 1), (30005046, 1), (30005047, 1), (30005048, 1), (30005049, 1), (30005050, 1), (30005051, 1), (30005052, 1),
    (30005053, 1), (30005054, 1), (30005055, 1), (30005056, 1), (30005057, 1), (30005058, 1), (30005059, 1), (30005060, 1), (30005061, 2), (30005062, 2), (30005063, 2), (30005064, 2),
    (30005065, 2), (30005066, 2), (30005067, 2), (30005068, 2), (30005069, 1), (30005070, 1), (30005071, 1), (30005072, 2), (30005073, 2), (30005074, 2), (30005075, 1), (30005076, 1),
    (30005077, 2), (30005078, 1), (30005079, 2), (30005080, 2), (30005081, 1), (30005082, 2), (30005083, 2), (30005084, 2), (30005085, 2), (30005086, 2), (30005087, 2), (30005088, 4),
    (30005089, 4), (30005090, 4), (30005091, 4), (30005092, 4), (30005093, 4), (30005094, 4), (30005095, 4), (30005096, 4), (30005097, 4), (30005098, 4), (30005099, 4), (30005100, 4),
    (30005101, 4), (30005102, 4), (30005103, 4), (30005104, 4), (30005105, 4), (30005106, 4), (30005107, 4), (30005108, 4), (30005109, 4), (30005110, 4), (30005111, 4), (30005112, 4),
    (30005113, 4), (30005114, 4), (30005115, 4), (30005116, 4), (30005117, 4), (30005118, 4), (30005119, 4), (30005120, 4), (30005121, 4), (30005122, 4), (30005123, 4), (30005124, 4),
    (30005125, 4), (30005126, 4), (30005127, 4), (30005128, 4), (30005129, 4), (30005130, 4), (30005131, 4), (30005132, 4), (30005133, 4), (30005134, 4), (30005135, 4), (30005136, 4),
    (30005137, 4), (30005138, 4), (30005139, 4), (30005140, 4), (30005141, 4), (30005142, 4), (30005143, 4), (30005144, 4), (30005145, 4), (30005146, 4), (30005147, 4), (30005148, 4),
    (30005149, 4), (30005150, 4), (30005151, 4), (30005152, 4), (30005153, 4), (30005154, 4), (30005155, 4), (30005156, 4), (30005157, 4), (30005158, 4), (30005159, 4), (30005160, 4),
    (30005161, 4), (30005162, 4), (30005163, 4), (30005164, 4), (30005165, 4), (30005166, 4), (30005167, 4), (30005168, 4), (30005169, 4), (30005170, 4), (30005171, 4), (30005172, 4),
    (30005173, 4), (30005174, 4), (30005175, 4), (30005176, 4), (30005177, 4), (30005178, 4), (30005179, 4), (30005180, 4), (30005181, 4), (30005182, 4), (30005183, 4), (30005184, 4),
    (30005185, 4), (30005186, 4), (30005187, 4), (30005188, 4), (30005189, 4), (30005190, 4), (30005191, 4), (30005192, 1), (30005193, 1), (30005194, 1), (30005195, 2), (30005196, 2),
    (30005197, 1), (30005198, 1), (30005199, 1), (30005200, 1), (30005201, 1), (30005202, 1), (30005203, 1), (30005204, 1), (30005205, 1), (30005206, 1), (30005207, 2), (30005208, 2),
    (30005209, 1), (30005210, 2), (30005211, 2), (30005212, 2), (30005213, 2), (30005214, 1), (30005215, 1), (30005216, 1), (30005217, 1), (30005218, 1), (30005219, 1), (30005220, 1),
    (30005221, 1), (30005222, 1), (30005223, 1), (30005224, 2), (30005225, 2), (30005226, 2), (30005227, 1), (30005228, 2), (30005229, 1), (30005230, 1), (30005231, 1), (30005232, 1),
    (30005233, 2), (30005234, 2), (30005235, 1), (30005236, 2), (30005237, 2), (30005238, 2), (30005239, 2), (30005240, 2), (30005241, 2), (30005242, 2), (30005243, 1), (30005244, 1),
    (30005245, 1), (30005246, 1), (30005247, 1), (30005248, 1), (30005249, 1), (30005250, 1), (30005251, 1), (30005252, 1), (30005253, 1), (30005254, 1), (30005255, 2), (30005256, 2),
    (30005257, 2), (30005258, 2), (30005259, 2), (30005260, 2), (30005261, 2), (30005262, 2), (30005263, 2), (30005264, 2), (30005265, 2), (30005266, 2), (30005267, 1), (30005268, 2),
    (30005269, 1), (30005270, 2), (30005271, 2), (30005272, 2), (30005273, 2), (30005274, 2), (30005275, 2), (30005276, 2), (30005277, 2), (30005278, 2), (30005279, 2), (30005280, 2),
    (30005281, 2), (30005282, 2), (30005283, 2), (30005284, 2), (30005285, 2), (30005286, 2), (30005287, 2), (30005288, 1), (30005289, 1), (30005290, 1), (30005291, 1), (30005292, 1),
    (30005293, 1), (30005294, 1), (30005295, 2), (30005296, 2), (30005297, 2), (30005298, 2), (30005299, 2), (30005300, 2), (30005301, 1), (30005302, 1), (30005303, 1), (30005304, 1),
    (30005305, 1), (30005306, 1), (30005307, 1), (30005308, 1), (30005309, 1), (30005310, 1), (30005311, 1), (30005312, 1), (30005313, 1), (30005314, 1), (30005315, 1), (30005316, 1),
    (30005317, 1), (30005318, 1), (30005319, 1), (30005320, 2), (30005321, 2), (30005322, 1), (30005323, 1), (30005324, 1), (30005325, 1), (30005326, 1), (30005327, 1), (30005328, 2),
    (30005329, 2), (30005330, 1), (30005331, 1), (30005332, 1), (30005333, 1), (30005334, 1), (30010141, 3), (30011392, 1), (30011407, 1), (30011672, 1), (30012505, 1), (30012547, 1),
    (30012715, 1), (30013410, 1), (30013489, 1), (30014971, 1), (30015042, 1), (30015305, 1), (30020141, 3), (30021392, 1), (30021407, 1), (30021672, 1), (30022505, 1), (30022547, 1),
    (30022715, 1), (30023410, 1), (30023489, 1), (30024971, 1), (30025042, 1), (30025305, 1), (30030141, 1), (30031392, 3), (30031407, 1), (30031672, 1), (30032505, 1), (30032547, 1),
    (30032715, 1), (30033410, 1), (30033489, 1), (30034971, 1), (30035042, 1), (30035305, 1), (30040141, 3), (30041392, 1), (30041407, 1), (30041672, 1), (30042505, 1), (30042547, 1),
    (30042715, 1), (30043410, 1), (30043489, 1), (30044971, 1), (30045042, 1), (30045305, 1), (30045306, 2), (30045307, 2), (30045308, 2), (30045309, 2), (30045310, 2), (30045311, 2),
    (30045312, 2), (30045313, 2), (30045314, 2), (30045315, 2), (30045316, 2), (30045317, 2), (30045318, 2), (30045319, 2), (30045320, 2), (30045321, 1), (30045322, 1), (30045323, 1),
    (30045324, 1), (30045325, 1), (30045326, 1), (30045327, 1), (30045328, 3), (30045329, 3), (30045330, 2), (30045331, 2), (30045332, 2), (30045333, 2), (30045334, 2), (30045335, 2),
    (30045336, 2), (30045337, 2), (30045338, 2), (30045339, 2), (30045340, 2), (30045341, 2), (30045342, 2), (30045343, 2), (30045344, 2), (30045345, 2), (30045346, 2), (30045347, 2),
    (30045348, 2), (30045349, 2), (30045350, 2), (30045351, 2), (30045352, 2), (30045353, 2), (30045354, 2), (30100000, 4), (30100032, 1), (30100033, 1), (30100034, 1), (30100035, 1),
    (30100036, 1), (30100037, 1), (30100038, 1), (30100039, 1), (30100040, 1), (30100041, 1), (30100042, 1), (30100043, 1), (30100044, 1), (30100045, 1), (30100046, 1), (30100047, 1),
    (30100048, 1), (30100049, 1), (30100050, 1), (30100051, 1), (30100052, 1), (30100053, 1), (30100054, 1), (30100055, 1), (30100056, 1), (30100057, 1), (30100058, 1), (30100059, 1),
    (30100060, 1), (30100061, 1), (30100062, 1), (30100063, 1), (30100064, 1), (30100065, 1), (30100066, 1), (30100067, 1), (30100068, 1), (30100069, 1), (30100070, 1), (30100071, 1),
    (30100072, 1), (30100073, 1), (30100074, 1), (30100075, 1), (30100076, 1), (30100077, 1), (30100078, 1), (30100079, 1), (30100080, 1), (30100081, 1), (30100082, 1), (30100083, 1),
    (30100084, 1), (31000001, 6), (31000002, 7), (31000003, 8), (31000004, 9), (31000005, 10), (31000006, 11), (31000007, 12), (31000008, 12), (31000009, 12), (31000010, 12), (31000011, 12),
    (31000012, 12), (31000013, 12), (31000014, 12), (31000015, 12), (31000016, 12), (31000017, 12), (31000018, 12), (31000019, 12), (31000020, 12), (31000021, 12), (31000022, 12), (31000023, 12),
    (31000024, 12), (31000025, 12), (31000026, 12), (31000027, 12), (31000028, 12), (31000029, 12), (31000030, 12), (31000031, 12), (31000032, 12), (31000033, 12), (31000034, 12), (31000035, 12),
    (31000036, 12), (31000037, 12), (31000038, 12), (31000039, 12), (31000040, 12), (31000041, 12), (31000042, 12), (31000043, 12), (31000044, 12), (31000045, 12), (31000046, 12), (31000047, 12),
    (31000048, 12), (31000049, 12), (31000050, 12), (31000051, 12), (31000052, 12), (31000053, 12), (31000054, 12), (31000055, 12), (31000056, 12), (31000057, 12), (31000058, 12), (31000059, 12),
    (31000060, 12), (31000061, 12), (31000062, 12), (31000063, 12), (31000064, 12), (31000065, 12), (31000066, 12), (31000067, 12), (31000068, 12), (31000069, 12), (31000070, 12), (31000071, 12),
    (31000072, 12), (31000073, 12), (31000074, 12), (31000075, 12), (31000076, 12), (31000077, 12), (31000078, 12), (31000079, 12), (31000080, 12), (31000081, 12), (31000082, 12), (31000083, 12),
    (31000084, 12), (31000085, 12), (31000086, 12), (31000087, 12), (31000088, 12), (31000089, 12), (31000090, 12), (31000091, 12), (31000092, 12), (31000093, 12), (31000094, 12), (31000095, 12),
    (31000096, 12), (31000097, 12), (31000098, 12), (31000099, 12), (31000100, 12), (31000101, 12), (31000102, 12), (31000103, 12), (31000104, 12), (31000105, 12), (31000106, 12), (31000107, 12),
    (31000108, 12), (31000109, 12), (31000110, 12), (31000111, 12), (31000112, 12), (31000113, 12), (31000114, 12), (31000115, 12), (31000116, 12), (31000117, 12), (31000118, 12), (31000119, 12),
    (31000120, 12), (31000121, 12), (31000122, 12), (31000123, 12), (31000124, 12), (31000125, 12), (31000126, 12), (31000127, 12), (31000128, 12), (31000129, 12), (31000130, 12), (31000131, 12),
    (31000132, 12), (31000133, 12), (31000134, 12), (31000135, 12), (31000136, 12), (31000137, 12), (31000138, 12), (31000139, 12), (31000140, 12), (31000141, 12), (31000142, 12), (31000143, 12),
    (31000144, 12), (31000145, 12), (31000146, 12), (31000147, 12), (31000148, 12), (31000149, 12), (31000150, 12), (31000151, 12), (31000152, 12), (31000153, 12), (31000154, 12), (31000155, 12),
    (31000156, 12), (31000157, 12), (31000158, 12), (31000159, 12), (31000160, 12), (31000161, 12), (31000162, 12), (31000163, 12), (31000164, 12), (31000165, 12), (31000166, 12), (31000167, 12),
    (31000168, 12), (31000169, 12), (31000170, 12), (31000171, 12), (31000172, 12), (31000173, 12), (31000174, 12), (31000175, 12), (31000176, 12), (31000177, 12), (31000178, 12), (31000179, 12),
    (31000180, 12), (31000181, 12), (31000182, 12), (31000183, 12), (31000184, 12), (31000185, 12), (31000186, 12), (31000187, 12), (31000188, 12), (31000189, 12), (31000190, 12), (31000191, 12),
    (31000192, 12), (31000193, 12), (31000194, 12), (31000195, 12), (31000196, 12), (31000197, 12), (31000198, 12), (31000199, 12), (31000200, 12), (31000201, 12), (31000202, 12), (31000203, 12),
    (31000204, 12), (31000205, 12), (31000206, 12), (31000207, 12), (31000208, 12), (31000209, 12), (31000210, 12), (31000211, 12), (31000212, 12), (31000213, 12), (31000214, 12), (31000215, 12),
    (31000216, 12), (31000217, 12), (31000218, 12), (31000219, 12), (31000220, 12), (31000221, 12), (31000222, 12), (31000223, 12), (31000224, 12), (31000225, 12), (31000226, 12), (31000227, 12),
    (31000228, 12), (31000229, 12), (31000230, 12), (31000231, 12), (31000232, 12), (31000233, 12), (31000234, 12), (31000235, 12), (31000236, 12), (31000237, 12), (31000238, 12), (31000239, 12),
    (31000240, 12), (31000241, 12), (31000242, 12), (31000243, 12), (31000244, 12), (31000245, 12), (31000246, 12), (31000247, 12), (31000248, 12), (31000249, 12), (31000250, 12), (31000251, 12),
    (31000252, 12), (31000253, 12), (31000254, 12), (31000255, 12), (31000256, 12), (31000257, 12), (31000258, 12), (31000259, 12), (31000260, 12), (31000261, 12), (31000262, 12), (31000263, 12),
    (31000264, 12), (31000265, 12), (31000266, 12), (31000267, 12), (31000268, 12), (31000269, 12), (31000270, 12), (31000271, 12), (31000272, 12), (31000273, 12), (31000274, 12), (31000275, 12),
    (31000276, 12), (31000277, 12), (31000278, 12), (31000279, 12), (31000280, 12), (31000281, 12), (31000282, 12), (31000283, 12), (31000284, 12), (31000285, 12), (31000286, 12), (31000287, 12),
    (31000288, 12), (31000289, 12), (31000290, 12), (31000291, 12), (31000292, 12), (31000293, 12), (31000294, 12), (31000295, 12), (31000296, 12), (31000297, 12), (31000298, 12), (31000299, 12),
    (31000300, 12), (31000301, 12), (31000302, 12), (31000303, 12), (31000304, 12), (31000305, 12), (31000306, 12), (31000307, 12), (31000308, 12), (31000309, 12), (31000310, 12), (31000311, 12),
    (31000312, 12), (31000313, 12), (31000314, 12), (31000315, 12), (31000316, 12), (31000317, 12), (31000318, 12), (31000319, 12), (31000320, 12), (31000321, 12), (31000322, 12), (31000323, 12),
    (31000324, 12), (31000325, 12), (31000326, 12), (31000327, 12), (31000328, 12), (31000329, 12), (31000330, 12), (31000331, 12), (31000332, 12), (31000333, 12), (31000334, 12), (31000335, 12),
    (31000336, 12), (31000337, 12), (31000338, 12), (31000339, 12), (31000340, 12), (31000341, 12), (31000342, 12), (31000343, 12), (31000344, 12), (31000345, 12), (31000346, 12), (31000347, 12),
    (31000348, 12), (31000349, 12), (31000350, 12), (31000351, 12), (31000352, 12), (31000353, 12), (31000354, 12), (31000355, 13), (31000356, 13), (31000357, 13), (31000358, 13), (31000359, 13),
    (31000360, 13), (31000361, 13), (31000362, 13), (31000363, 13), (31000364, 13), (31000365, 13), (31000366, 13), (31000367, 13), (31000368, 13), (31000369, 13), (31000370, 13), (31000371, 13),
    (31000372, 13), (31000373, 13), (31000374, 13), (31000375, 13), (31000376, 13), (31000377, 13), (31000378, 13), (31000379, 13), (31000380, 13), (31000381, 13), (31000382, 13), (31000383, 13),
    (31000384, 13), (31000385, 13), (31000386, 13), (31000387, 13), (31000388, 13), (31000389, 13), (31000390, 13), (31000391, 13), (31000392, 13), (31000393, 13), (31000394, 13), (31000395, 13),
    (31000396, 13), (31000397, 13), (31000398, 13), (31000399, 13), (31000400, 13), (31000401, 13), (31000402, 13), (31000403, 13), (31000404, 13), (31000405, 13), (31000406, 13), (31000407, 13),
    (31000408, 13), (31000409, 13), (31000410, 13), (31000411, 13), (31000412, 13), (31000413, 13), (31000414, 13), (31000415, 13), (31000416, 13), (31000417, 13), (31000418, 13), (31000419, 13),
    (31000420, 13), (31000421, 13), (31000422, 13), (31000423, 13), (31000424, 13), (31000425, 13), (31000426, 13), (31000427, 13), (31000428, 13), (31000429, 13), (31000430, 13), (31000431, 13),
    (31000432, 13), (31000433, 13), (31000434, 13), (31000435, 13), (31000436, 13), (31000437, 13), (31000438, 13), (31000439, 13), (31000440, 13), (31000441, 13), (31000442, 13), (31000443, 13),
    (31000444, 13), (31000445, 13), (31000446, 13), (31000447, 13), (31000448, 13), (31000449, 13), (31000450, 13), (31000451, 13), (31000452, 13), (31000453, 13), (31000454, 13), (31000455, 13),
    (31000456, 13), (31000457, 13), (31000458, 13), (31000459, 13), (31000460, 13), (31000461, 13), (31000462, 13), (31000463, 13), (31000464, 13), (31000465, 13), (31000466, 13), (31000467, 13),
    (31000468, 13), (31000469, 13), (31000470, 13), (31000471, 13), (31000472, 13), (31000473, 13), (31000474, 13), (31000475, 13), (31000476, 13), (31000477, 13), (31000478, 13), (31000479, 13),
    (31000480, 13), (31000481, 13), (31000482, 13), (31000483, 13), (31000484, 13), (31000485, 13), (31000486, 13), (31000487, 13), (31000488, 13), (31000489, 13), (31000490, 13), (31000491, 13),
    (31000492, 13), (31000493, 13), (31000494, 13), (31000495, 13), (31000496, 13), (31000497, 13), (31000498, 13), (31000499, 13), (31000500, 13), (31000501, 13), (31000502, 13), (31000503, 13),
    (31000504, 13), (31000505, 13), (31000506, 13), (31000507, 13), (31000508, 13), (31000509, 13), (31000510, 13), (31000511, 13), (31000512, 13), (31000513, 13), (31000514, 13), (31000515, 13),
    (31000516, 13), (31000517, 13), (31000518, 13), (31000519, 13), (31000520, 13), (31000521, 13), (31000522, 13), (31000523, 13), (31000524, 13), (31000525, 13), (31000526, 13), (31000527, 13),
    (31000528, 13), (31000529, 13), (31000530, 13), (31000531, 13), (31000532, 13), (31000533, 13), (31000534, 13), (31000535, 13), (31000536, 13), (31000537, 13), (31000538, 13), (31000539, 13),
    (31000540, 13), (31000541, 13), (31000542, 13), (31000543, 13), (31000544, 13), (31000545, 13), (31000546, 13), (31000547, 13), (31000548, 13), (31000549, 13), (31000550, 13), (31000551, 13),
    (31000552, 13), (31000553, 13), (31000554, 13), (31000555, 13), (31000556, 13), (31000557, 13), (31000558, 13), (31000559, 13), (31000560, 13), (31000561, 13), (31000562, 13), (31000563, 13),
    (31000564, 13), (31000565, 13), (31000566, 13), (31000567, 13), (31000568, 13), (31000569, 13), (31000570, 13), (31000571, 13), (31000572, 13), (31000573, 13), (31000574, 13), (31000575, 13),
    (31000576, 13), (31000577, 13), (31000578, 13), (31000579, 13), (31000580, 13), (31000581, 13), (31000582, 13), (31000583, 13), (31000584, 13), (31000585, 13), (31000586, 13), (31000587, 13),
    (31000588, 13), (31000589, 13), (31000590, 13), (31000591, 13), (31000592, 13), (31000593, 13), (31000594, 13), (31000595, 13), (31000596, 13), (31000597, 13), (31000598, 13), (31000599, 13),
    (31000600, 13), (31000601, 13), (31000602, 13), (31000603, 13), (31000604, 13), (31000605, 13), (31000606, 13), (31000607, 13), (31000608, 13), (31000609, 13), (31000610, 13), (31000611, 13),
    (31000612, 13), (31000613, 13), (31000614, 13), (31000615, 13), (31000616, 13), (31000617, 13), (31000618, 13), (31000619, 13), (31000620, 13), (31000621, 13), (31000622, 13), (31000623, 13),
    (31000624, 13), (31000625, 13), (31000626, 13), (31000627, 13), (31000628, 13), (31000629, 13), (31000630, 13), (31000631, 13), (31000632, 13), (31000633, 13), (31000634, 13), (31000635, 13),
    (31000636, 13), (31000637, 13), (31000638, 13), (31000639, 13), (31000640, 13), (31000641, 13), (31000642, 13), (31000643, 13), (31000644, 13), (31000645, 13), (31000646, 13), (31000647, 13),
    (31000648, 13), (31000649, 13), (31000650, 13), (31000651, 13), (31000652, 13), (31000653, 13), (31000654, 13), (31000655, 13), (31000656, 13), (31000657, 13), (31000658, 13), (31000659, 13),
    (31000660, 13), (31000661, 13), (31000662, 13), (31000663, 13), (31000664, 13), (31000665, 13), (31000666, 13), (31000667, 13), (31000668, 13), (31000669, 13), (31000670, 13), (31000671, 13),
    (31000672, 13), (31000673, 13), (31000674, 13), (31000675, 13), (31000676, 13), (31000677, 13), (31000678, 13), (31000679, 13), (31000680, 13), (31000681, 13), (31000682, 13), (31000683, 13),
    (31000684, 13), (31000685, 13), (31000686, 13), (31000687, 13), (31000688, 13), (31000689, 13), (31000690, 13), (31000691, 13), (31000692, 13), (31000693, 13), (31000694, 13), (31000695, 13),
    (31000696, 13), (31000697, 13), (31000698, 13), (31000699, 13), (31000700, 13), (31000701, 13), (31000702, 13), (31000703, 13), (31000704, 13), (31000705, 13), (31000706, 13), (31000707, 13),
    (31000708, 13), (31000709, 13), (31000710, 13), (31000711, 13), (31000712, 13), (31000713, 13), (31000714, 13), (31000715, 13), (31000716, 13), (31000717, 13), (31000718, 13), (31000719, 13),
    (31000720, 13), (31000721, 13), (31000722, 13), (31000723, 13), (31000724, 13), (31000725, 13), (31000726, 13), (31000727, 13), (31000728, 13), (31000729, 13), (31000730, 13), (31000731, 13),
    (31000732, 13), (31000733, 13), (31000734, 13), (31000735, 13), (31000736, 13), (31000737, 13), (31000738, 13), (31000739, 13), (31000740, 13), (31000741, 13), (31000742, 13), (31000743, 13),
    (31000744, 13), (31000745, 13), (31000746, 13), (31000747, 13), (31000748, 13), (31000749, 13), (31000750, 13), (31000751, 13), (31000752, 13), (31000753, 13), (31000754, 13), (31000755, 13),
    (31000756, 13), (31000757, 13), (31000758, 13), (31000759, 13), (31000760, 13), (31000761, 13), (31000762, 13), (31000763, 13), (31000764, 13), (31000765, 13), (31000766, 13), (31000767, 13),
    (31000768, 13), (31000769, 13), (31000770, 13), (31000771, 13), (31000772, 13), (31000773, 13), (31000774, 13), (31000775, 13), (31000776, 13), (31000777, 13), (31000778, 13), (31000779, 13),
    (31000780, 13), (31000781, 13), (31000782, 13), (31000783, 13), (31000784, 13), (31000785, 13), (31000786, 13), (31000787, 13), (31000788, 13), (31000789, 13), (31000790, 13), (31000791, 13),
    (31000792, 13), (31000793, 13), (31000794, 13), (31000795, 13), (31000796, 13), (31000797, 13), (31000798, 13), (31000799, 13), (31000800, 13), (31000801, 13), (31000802, 13), (31000803, 13),
    (31000804, 13), (31000805, 13), (31000806, 13), (31000807, 13), (31000808, 13), (31000809, 13), (31000810, 13), (31000811, 13), (31000812, 13), (31000813, 13), (31000814, 13), (31000815, 13),
    (31000816, 13), (31000817, 13), (31000818, 13), (31000819, 13), (31000820, 13), (31000821, 13), (31000822, 13), (31000823, 13), (31000824, 13), (31000825, 13), (31000826, 13), (31000827, 13),
    (31000828, 13), (31000829, 13), (31000830, 13), (31000831, 13), (31000832, 13), (31000833, 13), (31000834, 13), (31000835, 13), (31000836, 13), (31000837, 13), (31000838, 13), (31000839, 13),
    (31000840, 13), (31000841, 13), (31000842, 13), (31000843, 13), (31000844, 13), (31000845, 13), (31000846, 13), (31000847, 13), (31000848, 13), (31000849, 13), (31000850, 13), (31000851, 13),
    (31000852, 13), (31000853, 13), (31000854, 13), (31000855, 13), (31000856, 13), (31000857, 13), (31000858, 13), (31000859, 13), (31000860, 13), (31000861, 13), (31000862, 13), (31000863, 13),
    (31000864, 13), (31000865, 13), (31000866, 13), (31000867, 13), (31000868, 13), (31000869, 13), (31000870, 13), (31000871, 13), (31000872, 13), (31000873, 13), (31000874, 13), (31000875, 13),
    (31000876, 13), (31000877, 13), (31000878, 13), (31000879, 13), (31000880, 14), (31000881, 14), (31000882, 14), (31000883, 14), (31000884, 14), (31000885, 14), (31000886, 14), (31000887, 14),
    (31000888, 14), (31000889, 14), (31000890, 14), (31000891, 14), (31000892, 14), (31000893, 14), (31000894, 14), (31000895, 14), (31000896, 14), (31000897, 14), (31000898, 14), (31000899, 14),
    (31000900, 14), (31000901, 14), (31000902, 14), (31000903, 14), (31000904, 14), (31000905, 14), (31000906, 14), (31000907, 14), (31000908, 14), (31000909, 14), (31000910, 14), (31000911, 14),
    (31000912, 14), (31000913, 14), (31000914, 14), (31000915, 14), (31000916, 14), (31000917, 14), (31000918, 14), (31000919, 14), (31000920, 14), (31000921, 14), (31000922, 14), (31000923, 14),
    (31000924, 14), (31000925, 14), (31000926, 14), (31000927, 14), (31000928, 14), (31000929, 14), (31000930, 14), (31000931, 14), (31000932, 14), (31000933, 14), (31000934, 14), (31000935, 14),
    (31000936, 14), (31000937, 14), (31000938, 14), (31000939, 14), (31000940, 14), (31000941, 14), (31000942, 14), (31000943, 14), (31000944, 14), (31000945, 14), (31000946, 14), (31000947, 14),
    (31000948, 14), (31000949, 14), (31000950, 14), (31000951, 14), (31000952, 14), (31000953, 14), (31000954, 14), (31000955, 14), (31000956, 14), (31000957, 14), (31000958, 14), (31000959, 14),
    (31000960, 14), (31000961, 14), (31000962, 14), (31000963, 14), (31000964, 14), (31000965, 14), (31000966, 14), (31000967, 14), (31000968, 14), (31000969, 14), (31000970, 14), (31000971, 14),
    (31000972, 14), (31000973, 14), (31000974, 14), (31000975, 14), (31000976, 14), (31000977, 14), (31000978, 14), (31000979, 14), (31000980, 14), (31000981, 14), (31000982, 14), (31000983, 14),
    (31000984, 14), (31000985, 14), (31000986, 14), (31000987, 14), (31000988, 14), (31000989, 14), (31000990, 14), (31000991, 14), (31000992, 14), (31000993, 14), (31000994, 14), (31000995, 14),
    (31000996, 14), (31000997, 14), (31000998, 14), (31000999, 14), (31001000, 14), (31001001, 14), (31001002, 14), (31001003, 14), (31001004, 14), (31001005, 14), (31001006, 14), (31001007, 14),
    (31001008, 14), (31001009, 14), (31001010, 14), (31001011, 14), (31001012, 14), (31001013, 14), (31001014, 14), (31001015, 14), (31001016, 14), (31001017, 14), (31001018, 14), (31001019, 14),
    (31001020, 14), (31001021, 14), (31001022, 14), (31001023, 14), (31001024, 14), (31001025, 14), (31001026, 14), (31001027, 14), (31001028, 14), (31001029, 14), (31001030, 14), (31001031, 14),
    (31001032, 14), (31001033, 14), (31001034, 14), (31001035, 14), (31001036, 14), (31001037, 14), (31001038, 14), (31001039, 14), (31001040, 14), (31001041, 14), (31001042, 14), (31001043, 14),
    (31001044, 14), (31001045, 14), (31001046, 14), (31001047, 14), (31001048, 14), (31001049, 14), (31001050, 14), (31001051, 14), (31001052, 14), (31001053, 14), (31001054, 14), (31001055, 14),
    (31001056, 14), (31001057, 14), (31001058, 14), (31001059, 14), (31001060, 14), (31001061, 14), (31001062, 14), (31001063, 14), (31001064, 14), (31001065, 14), (31001066, 14), (31001067, 14),
    (31001068, 14), (31001069, 14), (31001070, 14), (31001071, 14), (31001072, 14), (31001073, 14), (31001074, 14), (31001075, 14), (31001076, 14), (31001077, 14), (31001078, 14), (31001079, 14),
    (31001080, 14), (31001081, 14), (31001082, 14), (31001083, 14), (31001084, 14), (31001085, 14), (31001086, 14), (31001087, 14), (31001088, 14), (31001089, 14), (31001090, 14), (31001091, 14),
    (31001092, 14), (31001093, 14), (31001094, 14), (31001095, 14), (31001096, 14), (31001097, 14), (31001098, 14), (31001099, 14), (31001100, 14), (31001101, 14), (31001102, 14), (31001103, 14),
    (31001104, 14), (31001105, 14), (31001106, 14), (31001107, 14), (31001108, 14), (31001109, 14), (31001110, 14), (31001111, 14), (31001112, 14), (31001113, 14), (31001114, 14), (31001115, 14),
    (31001116, 14), (31001117, 14), (31001118, 14), (31001119, 14), (31001120, 14), (31001121, 14), (31001122, 14), (31001123, 14), (31001124, 14), (31001125, 14), (31001126, 14), (31001127, 14),
    (31001128, 14), (31001129, 14), (31001130, 14), (31001131, 14), (31001132, 14), (31001133, 14), (31001134, 14), (31001135, 14), (31001136, 14), (31001137, 14), (31001138, 14), (31001139, 14),
    (31001140, 14), (31001141, 14), (31001142, 14), (31001143, 14), (31001144, 14), (31001145, 14), (31001146, 14), (31001147, 14), (31001148, 14), (31001149, 14), (31001150, 14), (31001151, 14),
    (31001152, 14), (31001153, 14), (31001154, 14), (31001155, 14), (31001156, 14), (31001157, 14), (31001158, 14), (31001159, 14), (31001160, 14), (31001161, 14), (31001162, 14), (31001163, 14),
    (31001164, 14), (31001165, 14), (31001166, 14), (31001167, 14), (31001168, 14), (31001169, 14), (31001170, 14), (31001171, 14), (31001172, 14), (31001173, 14), (31001174, 14), (31001175, 14),
    (31001176, 14), (31001177, 14), (31001178, 14), (31001179, 14), (31001180, 14), (31001181, 14), (31001182, 14), (31001183, 14), (31001184, 14), (31001185, 14), (31001186, 14), (31001187, 14),
    (31001188, 14), (31001189, 14), (31001190, 14), (31001191, 14), (31001192, 14), (31001193, 14), (31001194, 14), (31001195, 14), (31001196, 14), (31001197, 14), (31001198, 14), (31001199, 14),
    (31001200, 14), (31001201, 14), (31001202, 14), (31001203, 14), (31001204, 14), (31001205, 14), (31001206, 14), (31001207, 14), (31001208, 14), (31001209, 14), (31001210, 14), (31001211, 14),
    (31001212, 14), (31001213, 14), (31001214, 14), (31001215, 14), (31001216, 14), (31001217, 14), (31001218, 14), (31001219, 14), (31001220, 14), (31001221, 14), (31001222, 14), (31001223, 14),
    (31001224, 14), (31001225, 14), (31001226, 14), (31001227, 14), (31001228, 14), (31001229, 14), (31001230, 14), (31001231, 14), (31001232, 14), (31001233, 14), (31001234, 14), (31001235, 14),
    (31001236, 14), (31001237, 14), (31001238, 14), (31001239, 14), (31001240, 14), (31001241, 14), (31001242, 14), (31001243, 14), (31001244, 14), (31001245, 14), (31001246, 14), (31001247, 14),
    (31001248, 14), (31001249, 14), (31001250, 14), (31001251, 14), (31001252, 14), (31001253, 14), (31001254, 14), (31001255, 14), (31001256, 14), (31001257, 14), (31001258, 14), (31001259, 14),
    (31001260, 14), (31001261, 14), (31001262, 14), (31001263, 14), (31001264, 14), (31001265, 14), (31001266, 14), (31001267, 14), (31001268, 14), (31001269, 14), (31001270, 14), (31001271, 14),
    (31001272, 14), (31001273, 14), (31001274, 14), (31001275, 14), (31001276, 14), (31001277, 14), (31001278, 14), (31001279, 14), (31001280, 14), (31001281, 14), (31001282, 14), (31001283, 14),
    (31001284, 14), (31001285, 14), (31001286, 14), (31001287, 14), (31001288, 14), (31001289, 14), (31001290, 14), (31001291, 14), (31001292, 14), (31001293, 14), (31001294, 14), (31001295, 14),
    (31001296, 14), (31001297, 14), (31001298, 14), (31001299, 14), (31001300, 14), (31001301, 14), (31001302, 14), (31001303, 14), (31001304, 14), (31001305, 14), (31001306, 14), (31001307, 14),
    (31001308, 14), (31001309, 14), (31001310, 14), (31001311, 14), (31001312, 14), (31001313, 14), (31001314, 14), (31001315, 14), (31001316, 14), (31001317, 14), (31001318, 14), (31001319, 14),
    (31001320, 14), (31001321, 14), (31001322, 14), (31001323, 14), (31001324, 14), (31001325, 14), (31001326, 14), (31001327, 14), (31001328, 14), (31001329, 14), (31001330, 14), (31001331, 14),
    (31001332, 14), (31001333, 14), (31001334, 14), (31001335, 14), (31001336, 14), (31001337, 14), (31001338, 14), (31001339, 14), (31001340, 14), (31001341, 14), (31001342, 14), (31001343, 14),
    (31001344, 14), (31001345, 14), (31001346, 14), (31001347, 14), (31001348, 14), (31001349, 14), (31001350, 14), (31001351, 14), (31001352, 14), (31001353, 14), (31001354, 14), (31001355, 14),
    (31001356, 14), (31001357, 14), (31001358, 14), (31001359, 14), (31001360, 14), (31001361, 14), (31001362, 14), (31001363, 14), (31001364, 14), (31001365, 14), (31001366, 14), (31001367, 14),
    (31001368, 14), (31001369, 14), (31001370, 14), (31001371, 14), (31001372, 14), (31001373, 14), (31001374, 14), (31001375, 15), (31001376, 15), (31001377, 15), (31001378, 15), (31001379, 15),
    (31001380, 15), (31001381, 15), (31001382, 15), (31001383, 15), (31001384, 15), (31001385, 15), (31001386, 15), (31001387, 15), (31001388, 15), (31001389, 15), (31001390, 15), (31001391, 15),
    (31001392, 15), (31001393, 15), (31001394, 15), (31001395, 15), (31001396, 15), (31001397, 15), (31001398, 15), (31001399, 15), (31001400, 15), (31001401, 15), (31001402, 15), (31001403, 15),
    (31001404, 15), (31001405, 15), (31001406, 15), (31001407, 15), (31001408, 15), (31001409, 15), (31001410, 15), (31001411, 15), (31001412, 15), (31001413, 15), (31001414, 15), (31001415, 15),
    (31001416, 15), (31001417, 15), (31001418, 15), (31001419, 15), (31001420, 15), (31001421, 15), (31001422, 15), (31001423, 15), (31001424, 15), (31001425, 15), (31001426, 15), (31001427, 15),
    (31001428, 15), (31001429, 15), (31001430, 15), (31001431, 15), (31001432, 15), (31001433, 15), (31001434, 15), (31001435, 15), (31001436, 15), (31001437, 15), (31001438, 15), (31001439, 15),
    (31001440, 15), (31001441, 15), (31001442, 15), (31001443, 15), (31001444, 15), (31001445, 15), (31001446, 15), (31001447, 15), (31001448, 15), (31001449, 15), (31001450, 15), (31001451, 15),
    (31001452, 15), (31001453, 15), (31001454, 15), (31001455, 15), (31001456, 15), (31001457, 15), (31001458, 15), (31001459, 15), (31001460, 15), (31001461, 15), (31001462, 15), (31001463, 15),
    (31001464, 15), (31001465, 15), (31001466, 15), (31001467, 15), (31001468, 15), (31001469, 15), (31001470, 15), (31001471, 15), (31001472, 15), (31001473, 15), (31001474, 15), (31001475, 15),
    (31001476, 15), (31001477, 15), (31001478, 15), (31001479, 15), (31001480, 15), (31001481, 15), (31001482, 15), (31001483, 15), (31001484, 15), (31001485, 15), (31001486, 15), (31001487, 15),
    (31001488, 15), (31001489, 15), (31001490, 15), (31001491, 15), (31001492, 15), (31001493, 15), (31001494, 15), (31001495, 15), (31001496, 15), (31001497, 15), (31001498, 15), (31001499, 15),
    (31001500, 15), (31001501, 15), (31001502, 15), (31001503, 15), (31001504, 15), (31001505, 15), (31001506, 15), (31001507, 15), (31001508, 15), (31001509, 15), (31001510, 15), (31001511, 15),
    (31001512, 15), (31001513, 15), (31001514, 15), (31001515, 15), (31001516, 15), (31001517, 15), (31001518, 15), (31001519, 15), (31001520, 15), (31001521, 15), (31001522, 15), (31001523, 15),
    (31001524, 15), (31001525, 15), (31001526, 15), (31001527, 15), (31001528, 15), (31001529, 15), (31001530, 15), (31001531, 15), (31001532, 15), (31001533, 15), (31001534, 15), (31001535, 15),
    (31001536, 15), (31001537, 15), (31001538, 15), (31001539, 15), (31001540, 15), (31001541, 15), (31001542, 15), (31001543, 15), (31001544, 15), (31001545, 15), (31001546, 15), (31001547, 15),
    (31001548, 15), (31001549, 15), (31001550, 15), (31001551, 15), (31001552, 15), (31001553, 15), (31001554, 15), (31001555, 15), (31001556, 15), (31001557, 15), (31001558, 15), (31001559, 15),
    (31001560, 15), (31001561, 15), (31001562, 15), (31001563, 15), (31001564, 15), (31001565, 15), (31001566, 15), (31001567, 15), (31001568, 15), (31001569, 15), (31001570, 15), (31001571, 15),
    (31001572, 15), (31001573, 15), (31001574, 15), (31001575, 15), (31001576, 15), (31001577, 15), (31001578, 15), (31001579, 15), (31001580, 15), (31001581, 15), (31001582, 15), (31001583, 15),
    (31001584, 15), (31001585, 15), (31001586, 15), (31001587, 15), (31001588, 15), (31001589, 15), (31001590, 15), (31001591, 15), (31001592, 15), (31001593, 15), (31001594, 15), (31001595, 15),
    (31001596, 15), (31001597, 15), (31001598, 15), (31001599, 15), (31001600, 15), (31001601, 15), (31001602, 15), (31001603, 15), (31001604, 15), (31001605, 15), (31001606, 15), (31001607, 15),
    (31001608, 15), (31001609, 15), (31001610, 15), (31001611, 15), (31001612, 15), (31001613, 15), (31001614, 15), (31001615, 15), (31001616, 15), (31001617, 15), (31001618, 15), (31001619, 15),
    (31001620, 15), (31001621, 15), (31001622, 15), (31001623, 15), (31001624, 15), (31001625, 15), (31001626, 15), (31001627, 15), (31001628, 15), (31001629, 15), (31001630, 15), (31001631, 15),
    (31001632, 15), (31001633, 15), (31001634, 15), (31001635, 15), (31001636, 15), (31001637, 15), (31001638, 15), (31001639, 15), (31001640, 15), (31001641, 15), (31001642, 15), (31001643, 15),
    (31001644, 15), (31001645, 15), (31001646, 15), (31001647, 15), (31001648, 15), (31001649, 15), (31001650, 15), (31001651, 15), (31001652, 15), (31001653, 15), (31001654, 15), (31001655, 15),
    (31001656, 15), (31001657, 15), (31001658, 15), (31001659, 15), (31001660, 15), (31001661, 15), (31001662, 15), (31001663, 15), (31001664, 15), (31001665, 15), (31001666, 15), (31001667, 15),
    (31001668, 15), (31001669, 15), (31001670, 15), (31001671, 15), (31001672, 15), (31001673, 15), (31001674, 15), (31001675, 15), (31001676, 15), (31001677, 15), (31001678, 15), (31001679, 15),
    (31001680, 15), (31001681, 15), (31001682, 15), (31001683, 15), (31001684, 15), (31001685, 15), (31001686, 15), (31001687, 15), (31001688, 15), (31001689, 15), (31001690, 15), (31001691, 15),
    (31001692, 15), (31001693, 15), (31001694, 15), (31001695, 15), (31001696, 15), (31001697, 15), (31001698, 15), (31001699, 15), (31001700, 15), (31001701, 15), (31001702, 15), (31001703, 15),
    (31001704, 15), (31001705, 15), (31001706, 15), (31001707, 15), (31001708, 15), (31001709, 15), (31001710, 15), (31001711, 15), (31001712, 15), (31001713, 15), (31001714, 15), (31001715, 15),
    (31001716, 15), (31001717, 15), (31001718, 15), (31001719, 15), (31001720, 15), (31001721, 15), (31001722, 15), (31001723, 15), (31001724, 15), (31001725, 15), (31001726, 15), (31001727, 15),
    (31001728, 15), (31001729, 15), (31001730, 15), (31001731, 15), (31001732, 15), (31001733, 15), (31001734, 15), (31001735, 15), (31001736, 15), (31001737, 15), (31001738, 15), (31001739, 15),
    (31001740, 15), (31001741, 15), (31001742, 15), (31001743, 15), (31001744, 15), (31001745, 15), (31001746, 15), (31001747, 15), (31001748, 15), (31001749, 15), (31001750, 15), (31001751, 15),
    (31001752, 15), (31001753, 15), (31001754, 15), (31001755, 15), (31001756, 15), (31001757, 15), (31001758, 15), (31001759, 15), (31001760, 15), (31001761, 15), (31001762, 15), (31001763, 15),
    (31001764, 15), (31001765, 15), (31001766, 15), (31001767, 15), (31001768, 15), (31001769, 15), (31001770, 15), (31001771, 15), (31001772, 15), (31001773, 15), (31001774, 15), (31001775, 15),
    (31001776, 15), (31001777, 15), (31001778, 15), (31001779, 15), (31001780, 15), (31001781, 15), (31001782, 15), (31001783, 15), (31001784, 15), (31001785, 15), (31001786, 15), (31001787, 15),
    (31001788, 15), (31001789, 15), (31001790, 15), (31001791, 15), (31001792, 15), (31001793, 15), (31001794, 15), (31001795, 15), (31001796, 15), (31001797, 15), (31001798, 15), (31001799, 15),
    (31001800, 15), (31001801, 15), (31001802, 15), (31001803, 15), (31001804, 15), (31001805, 15), (31001806, 15), (31001807, 15), (31001808, 15), (31001809, 15), (31001810, 15), (31001811, 15),
    (31001812, 15), (31001813, 15), (31001814, 15), (31001815, 15), (31001816, 15), (31001817, 15), (31001818, 15), (31001819, 15), (31001820, 15), (31001821, 15), (31001822, 15), (31001823, 15),
    (31001824, 15), (31001825, 15), (31001826, 15), (31001827, 15), (31001828, 15), (31001829, 15), (31001830, 15), (31001831, 15), (31001832, 15), (31001833, 15), (31001834, 15), (31001835, 15),
    (31001836, 15), (31001837, 15), (31001838, 15), (31001839, 15), (31001840, 15), (31001841, 15), (31001842, 15), (31001843, 15), (31001844, 15), (31001845, 15), (31001846, 15), (31001847, 15),
    (31001848, 15), (31001849, 15), (31001850, 15), (31001851, 15), (31001852, 15), (31001853, 15), (31001854, 15), (31001855, 15), (31001856, 15), (31001857, 15), (31001858, 15), (31001859, 15),
    (31001860, 15), (31001861, 15), (31001862, 15), (31001863, 15), (31001864, 15), (31001865, 15), (31001866, 15), (31001867, 15), (31001868, 15), (31001869, 15), (31001870, 15), (31001871, 15),
    (31001872, 15), (31001873, 15), (31001874, 15), (31001875, 15), (31001876, 15), (31001877, 15), (31001878, 15), (31001879, 15), (31001880, 16), (31001881, 16), (31001882, 16), (31001883, 16),
    (31001884, 16), (31001885, 16), (31001886, 16), (31001887, 16), (31001888, 16), (31001889, 16), (31001890, 16), (31001891, 16), (31001892, 16), (31001893, 16), (31001894, 16), (31001895, 16),
    (31001896, 16), (31001897, 16), (31001898, 16), (31001899, 16), (31001900, 16), (31001901, 16), (31001902, 16), (31001903, 16), (31001904, 16), (31001905, 16), (31001906, 16), (31001907, 16),
    (31001908, 16), (31001909, 16), (31001910, 16), (31001911, 16), (31001912, 16), (31001913, 16), (31001914, 16), (31001915, 16), (31001916, 16), (31001917, 16), (31001918, 16), (31001919, 16),
    (31001920, 16), (31001921, 16), (31001922, 16), (31001923, 16), (31001924, 16), (31001925, 16), (31001926, 16), (31001927, 16), (31001928, 16), (31001929, 16), (31001930, 16), (31001931, 16),
    (31001932, 16), (31001933, 16), (31001934, 16), (31001935, 16), (31001936, 16), (31001937, 16), (31001938, 16), (31001939, 16), (31001940, 16), (31001941, 16), (31001942, 16), (31001943, 16),
    (31001944, 16), (31001945, 16), (31001946, 16), (31001947, 16), (31001948, 16), (31001949, 16), (31001950, 16), (31001951, 16), (31001952, 16), (31001953, 16), (31001954, 16), (31001955, 16),
    (31001956, 16), (31001957, 16), (31001958, 16), (31001959, 16), (31001960, 16), (31001961, 16), (31001962, 16), (31001963, 16), (31001964, 16), (31001965, 16), (31001966, 16), (31001967, 16),
    (31001968, 16), (31001969, 16), (31001970, 16), (31001971, 16), (31001972, 16), (31001973, 16), (31001974, 16), (31001975, 16), (31001976, 16), (31001977, 16), (31001978, 16), (31001979, 16),
    (31001980, 16), (31001981, 16), (31001982, 16), (31001983, 16), (31001984, 16), (31001985, 16), (31001986, 16), (31001987, 16), (31001988, 16), (31001989, 16), (31001990, 16), (31001991, 16),
    (31001992, 16), (31001993, 16), (31001994, 16), (31001995, 16), (31001996, 16), (31001997, 16), (31001998, 16), (31001999, 16), (31002000, 16), (31002001, 16), (31002002, 16), (31002003, 16),
    (31002004, 16), (31002005, 16), (31002006, 16), (31002007, 16), (31002008, 16), (31002009, 16), (31002010, 16), (31002011, 16), (31002012, 16), (31002013, 16), (31002014, 16), (31002015, 16),
    (31002016, 16), (31002017, 16), (31002018, 16), (31002019, 16), (31002020, 16), (31002021, 16), (31002022, 16), (31002023, 16), (31002024, 16), (31002025, 16), (31002026, 16), (31002027, 16),
    (31002028, 16), (31002029, 16), (31002030, 16), (31002031, 16), (31002032, 16), (31002033, 16), (31002034, 16), (31002035, 16), (31002036, 16), (31002037, 16), (31002038, 16), (31002039, 16),
    (31002040, 16), (31002041, 16), (31002042, 16), (31002043, 16), (31002044, 16), (31002045, 16), (31002046, 16), (31002047, 16), (31002048, 16), (31002049, 16), (31002050, 16), (31002051, 16),
    (31002052, 16), (31002053, 16), (31002054, 16), (31002055, 16), (31002056, 16), (31002057, 16), (31002058, 16), (31002059, 16), (31002060, 16), (31002061, 16), (31002062, 16), (31002063, 16),
    (31002064, 16), (31002065, 16), (31002066, 16), (31002067, 16), (31002068, 16), (31002069, 16), (31002070, 16), (31002071, 16), (31002072, 16), (31002073, 16), (31002074, 16), (31002075, 16),
    (31002076, 16), (31002077, 16), (31002078, 16), (31002079, 16), (31002080, 16), (31002081, 16), (31002082, 16), (31002083, 16), (31002084, 16), (31002085, 16), (31002086, 16), (31002087, 16),
    (31002088, 16), (31002089, 16), (31002090, 16), (31002091, 16), (31002092, 16), (31002093, 16), (31002094, 16), (31002095, 16), (31002096, 16), (31002097, 16), (31002098, 16), (31002099, 16),
    (31002100, 16), (31002101, 16), (31002102, 16), (31002103, 16), (31002104, 16), (31002105, 16), (31002106, 16), (31002107, 16), (31002108, 16), (31002109, 16), (31002110, 16), (31002111, 16),
    (31002112, 16), (31002113, 16), (31002114, 16), (31002115, 16), (31002116, 16), (31002117, 16), (31002118, 16), (31002119, 16), (31002120, 16), (31002121, 16), (31002122, 16), (31002123, 16),
    (31002124, 16), (31002125, 16), (31002126, 16), (31002127, 16), (31002128, 16), (31002129, 16), (31002130, 16), (31002131, 16), (31002132, 16), (31002133, 16), (31002134, 16), (31002135, 16),
    (31002136, 16), (31002137, 16), (31002138, 16), (31002139, 16), (31002140, 16), (31002141, 16), (31002142, 16), (31002143, 16), (31002144, 16), (31002145, 16), (31002146, 16), (31002147, 16),
    (31002148, 16), (31002149, 16), (31002150, 16), (31002151, 16), (31002152, 16), (31002153, 16), (31002154, 16), (31002155, 16), (31002156, 16), (31002157, 16), (31002158, 16), (31002159, 16),
    (31002160, 16), (31002161, 16), (31002162, 16), (31002163, 16), (31002164, 16), (31002165, 16), (31002166, 16), (31002167, 16), (31002168, 16), (31002169, 16), (31002170, 16), (31002171, 16),
    (31002172, 16), (31002173, 16), (31002174, 16), (31002175, 16), (31002176, 16), (31002177, 16), (31002178, 16), (31002179, 16), (31002180, 16), (31002181, 16), (31002182, 16), (31002183, 16),
    (31002184, 16), (31002185, 16), (31002186, 16), (31002187, 16), (31002188, 16), (31002189, 16), (31002190, 16), (31002191, 16), (31002192, 16), (31002193, 16), (31002194, 16), (31002195, 16),
    (31002196, 16), (31002197, 16), (31002198, 16), (31002199, 16), (31002200, 16), (31002201, 16), (31002202, 16), (31002203, 16), (31002204, 16), (31002205, 16), (31002206, 16), (31002207, 16),
    (31002208, 16), (31002209, 16), (31002210, 16), (31002211, 16), (31002212, 16), (31002213, 16), (31002214, 16), (31002215, 16), (31002216, 16), (31002217, 16), (31002218, 16), (31002219, 16),
    (31002220, 16), (31002221, 16), (31002222, 16), (31002223, 16), (31002224, 16), (31002225, 16), (31002226, 16), (31002227, 16), (31002228, 16), (31002229, 16), (31002230, 16), (31002231, 16),
    (31002232, 16), (31002233, 16), (31002234, 16), (31002235, 16), (31002236, 16), (31002237, 16), (31002238, 16), (31002239, 16), (31002240, 16), (31002241, 16), (31002242, 16), (31002243, 16),
    (31002244, 16), (31002245, 16), (31002246, 16), (31002247, 16), (31002248, 16), (31002249, 16), (31002250, 16), (31002251, 16), (31002252, 16), (31002253, 16), (31002254, 16), (31002255, 16),
    (31002256, 16), (31002257, 16), (31002258, 16), (31002259, 16), (31002260, 16), (31002261, 16), (31002262, 16), (31002263, 16), (31002264, 16), (31002265, 16), (31002266, 16), (31002267, 16),
    (31002268, 16), (31002269, 16), (31002270, 16), (31002271, 16), (31002272, 16), (31002273, 16), (31002274, 16), (31002275, 16), (31002276, 16), (31002277, 16), (31002278, 16), (31002279, 16),
    (31002280, 16), (31002281, 16), (31002282, 16), (31002283, 16), (31002284, 16), (31002285, 16), (31002286, 16), (31002287, 16), (31002288, 16), (31002289, 16), (31002290, 16), (31002291, 16),
    (31002292, 16), (31002293, 16), (31002294, 16), (31002295, 16), (31002296, 16), (31002297, 16), (31002298, 16), (31002299, 16), (31002300, 16), (31002301, 16), (31002302, 16), (31002303, 16),
    (31002304, 16), (31002305, 16), (31002306, 16), (31002307, 16), (31002308, 16), (31002309, 16), (31002310, 16), (31002311, 16), (31002312, 16), (31002313, 16), (31002314, 16), (31002315, 16),
    (31002316, 16), (31002317, 16), (31002318, 16), (31002319, 16), (31002320, 16), (31002321, 16), (31002322, 16), (31002323, 16), (31002324, 16), (31002325, 16), (31002326, 16), (31002327, 16),
    (31002328, 16), (31002329, 16), (31002330, 16), (31002331, 16), (31002332, 16), (31002333, 16), (31002334, 16), (31002335, 16), (31002336, 16), (31002337, 16), (31002338, 16), (31002339, 16),
    (31002340, 16), (31002341, 16), (31002342, 16), (31002343, 16), (31002344, 16), (31002345, 16), (31002346, 16), (31002347, 16), (31002348, 16), (31002349, 16), (31002350, 16), (31002351, 16),
    (31002352, 16), (31002353, 16), (31002354, 16), (31002355, 16), (31002356, 16), (31002357, 16), (31002358, 16), (31002359, 16), (31002360, 16), (31002361, 16), (31002362, 16), (31002363, 16),
    (31002364, 16), (31002365, 16), (31002366, 16), (31002367, 17), (31002368, 17), (31002369, 17), (31002370, 17), (31002371, 17), (31002372, 17), (31002373, 17), (31002374, 17), (31002375, 17),
    (31002376, 17), (31002377, 17), (31002378, 17), (31002379, 17), (31002380, 17), (31002381, 17), (31002382, 17), (31002383, 17), (31002384, 17), (31002385, 17), (31002386, 17), (31002387, 17),
    (31002388, 17), (31002389, 17), (31002390, 17), (31002391, 17), (31002392, 17), (31002393, 17), (31002394, 17), (31002395, 17), (31002396, 17), (31002397, 17), (31002398, 17), (31002399, 17),
    (31002400, 17), (31002401, 17), (31002402, 17), (31002403, 17), (31002404, 17), (31002405, 17), (31002406, 17), (31002407, 17), (31002408, 17), (31002409, 17), (31002410, 17), (31002411, 17),
    (31002412, 17), (31002413, 17), (31002414, 17), (31002415, 17), (31002416, 17), (31002417, 17), (31002418, 17), (31002419, 17), (31002420, 17), (31002421, 17), (31002422, 17), (31002423, 17),
    (31002424, 17), (31002425, 17), (31002426, 17), (31002427, 17), (31002428, 17), (31002429, 17), (31002430, 17), (31002431, 17), (31002432, 17), (31002433, 17), (31002434, 17), (31002435, 17),
    (31002436, 17), (31002437, 17), (31002438, 17), (31002439, 17), (31002440, 17), (31002441, 17), (31002442, 17), (31002443, 17), (31002444, 17), (31002445, 17), (31002446, 17), (31002447, 17),
    (31002448, 17), (31002449, 17), (31002450, 17), (31002451, 17), (31002452, 17), (31002453, 17), (31002454, 17), (31002455, 17), (31002456, 17), (31002457, 17), (31002458, 17), (31002459, 17),
    (31002460, 17), (31002461, 17), (31002462, 17), (31002463, 17), (31002464, 17), (31002465, 17), (31002466, 17), (31002467, 17), (31002468, 17), (31002469, 17), (31002470, 17), (31002471, 16),
    (31002472, 16), (31002473, 16), (31002474, 17), (31002475, 16), (31002476, 16), (31002477, 16), (31002478, 17), (31002479, 16), (31002480, 16), (31002481, 16), (31002482, 16), (31002483, 16),
    (31002484, 17), (31002485, 16), (31002486, 16), (31002487, 17), (31002488, 16), (31002489, 17), (31002490, 16), (31002491, 16), (31002492, 17), (31002493, 16), (31002494, 16), (31002495, 17),
    (31002496, 16), (31002497, 16), (31002498, 17), (31002499, 16), (31002500, 16), (31002501, 16), (31002502, 17), (31002503, 16), (31002504, 16), (31002505, 12), (31002506, 12), (31002507, 12),
    (31002508, 12), (31002509, 12), (31002510, 12), (31002511, 12), (31002512, 12), (31002513, 12), (31002514, 12), (31002515, 13), (31002516, 13), (31002517, 13), (31002518, 13), (31002519, 13),
    (31002520, 13), (31002521, 13), (31002522, 13), (31002523, 13), (31002524, 13), (31002525, 13), (31002526, 13), (31002527, 14), (31002528, 14), (31002529, 14), (31002530, 14), (31002531, 14),
    (31002532, 14), (31002533, 14), (31002534, 14), (31002535, 14), (31002536, 14), (31002537, 14), (31002538, 15), (31002539, 15), (31002540, 15), (31002541, 15), (31002542, 15), (31002543, 15),
    (31002544, 15), (31002545, 15), (31002546, 15), (31002547, 15), (31002548, 15), (31002549, 15), (31002550, 15), (31002551, 15), (31002552, 15), (31002553, 15), (31002554, 15), (31002555, 15),
    (31002556, 16), (31002557, 16), (31002558, 16), (31002559, 16), (31002560, 16), (31002561, 16), (31002562, 16), (31002563, 16), (31002564, 16), (31002565, 16), (31002566, 16), (31002567, 16),
    (31002568, 16), (31002569, 16), (31002570, 16), (31002571, 16), (31002572, 16), (31002573, 16), (31002574, 16), (31002575, 17), (31002576, 17), (31002577, 17), (31002578, 17), (31002579, 17),
    (31002580, 18), (31002581, 18), (31002582, 18), (31002583, 18), (31002584, 18), (31002585, 18), (31002586, 18), (31002587, 18), (31002588, 18), (31002589, 18), (31002590, 18), (31002591, 18),
    (31002592, 18), (31002593, 18), (31002594, 18), (31002595, 18), (31002596, 18), (31002597, 18), (31002598, 18), (31002599, 18), (31002600, 18), (31002601, 18), (31002602, 18), (31002603, 18),
    (31002604, 18), (32000001, 19), (32000002, 19), (32000003, 19), (32000004, 19), (32000005, 19), (32000006, 19), (32000007, 19), (32000008, 19), (32000009, 19), (32000010, 19), (32000011, 19),
    (32000012, 19), (32000013, 19), (32000014, 19), (32000015, 19), (32000016, 19), (32000017, 19), (32000018, 19), (32000019, 19), (32000020, 19), (32000021, 19), (32000022, 19), (32000023, 19),
    (32000024, 19), (32000025, 19), (32000026, 19), (32000027, 19), (32000028, 19), (32000029, 19), (32000030, 19), (32000031, 19), (32000032, 19), (32000033, 19), (32000034, 19), (32000035, 19),
    (32000036, 19), (32000037, 19), (32000038, 19), (32000039, 19), (32000040, 19), (32000041, 20), (32000042, 20), (32000043, 20), (32000044, 20), (32000045, 20), (32000046, 20), (32000047, 20),
    (32000048, 20), (32000049, 20), (32000050, 20), (32000051, 20), (32000052, 20), (32000053, 20), (32000054, 20), (32000055, 20), (32000056, 20), (32000057, 20), (32000058, 20), (32000059, 20),
    (32000060, 20), (32000061, 20), (32000062, 20), (32000063, 20), (32000064, 20), (32000065, 20), (32000066, 20), (32000067, 20), (32000068, 20), (32000069, 20), (32000070, 20), (32000071, 20),
    (32000072, 20), (32000073, 20), (32000074, 20), (32000075, 20), (32000076, 20), (32000077, 20), (32000078, 20), (32000079, 20), (32000080, 20), (32000081, 21), (32000082, 21), (32000083, 21),
    (32000084, 21), (32000085, 21), (32000086, 21), (32000087, 21), (32000088, 21), (32000089, 21), (32000090, 21), (32000091, 21), (32000092, 21), (32000093, 21), (32000094, 21), (32000095, 21),
    (32000096, 21), (32000097, 21), (32000098, 21), (32000099, 21), (32000100, 21), (32000101, 21), (32000102, 21), (32000103, 21), (32000104, 21), (32000105, 21), (32000106, 21), (32000107, 21),
    (32000108, 21), (32000109, 21), (32000110, 21), (32000111, 21), (32000112, 21), (32000113, 21), (32000114, 21), (32000115, 21), (32000116, 21), (32000117, 21), (32000118, 21), (32000119, 21),
    (32000120, 21), (32000121, 22), (32000122, 22), (32000123, 22), (32000124, 22), (32000125, 22), (32000126, 22), (32000127, 22), (32000128, 22), (32000129, 22), (32000130, 22), (32000131, 22),
    (32000132, 22), (32000133, 22), (32000134, 22), (32000135, 22), (32000136, 22), (32000137, 22), (32000138, 22), (32000139, 22), (32000140, 22), (32000141, 22), (32000142, 22), (32000143, 22),
    (32000144, 22), (32000145, 22), (32000146, 22), (32000147, 22), (32000148, 22), (32000149, 22), (32000150, 22), (32000151, 22), (32000152, 22), (32000153, 22), (32000154, 22), (32000155, 22),
    (32000156, 22), (32000157, 22), (32000158, 22), (32000159, 22), (32000160, 22), (32000161, 23), (32000162, 23), (32000163, 23), (32000164, 23), (32000165, 23), (32000166, 23), (32000167, 23),
    (32000168, 23), (32000169, 23), (32000170, 23), (32000171, 23), (32000172, 23), (32000173, 23), (32000174, 23), (32000175, 23), (32000176, 23), (32000177, 23), (32000178, 23), (32000179, 23),
    (32000180, 23), (32000181, 23), (32000182, 23), (32000183, 23), (32000184, 23), (32000185, 23), (32000186, 23), (32000187, 23), (32000188, 23), (32000189, 23), (32000190, 23), (32000191, 23),
    (32000192, 23), (32000193, 23), (32000194, 23), (32000195, 23), (32000196, 23), (32000197, 23), (32000198, 23), (32000199, 23), (32000200, 23), (34000001, 19), (34000002, 19), (34000003, 19),
    (34000004, 19), (34000005, 19), (34000006, 19), (34000007, 19), (34000008, 19), (34000009, 19), (34000010, 19), (34000011, 19), (34000012, 19), (34000013, 19), (34000014, 19), (34000015, 19),
    (34000016, 19), (34000017, 19), (34000018, 19), (34000019, 19), (34000020, 19), (34000021, 19), (34000022, 19), (34000023, 19), (34000024, 19), (34000025, 19), (34000026, 19), (34000027, 19),
    (34000028, 19), (34000029, 19), (34000030, 19), (34000031, 19), (34000032, 19), (34000033, 19), (34000034, 19), (34000035, 19), (34000036, 19), (34000037, 19), (34000038, 19), (34000039, 19),
    (34000040, 19), (34000041, 19), (34000042, 19), (34000043, 19), (34000044, 19), (34000045, 19), (34000046, 19), (34000047, 19), (34000048, 19), (34000049, 19), (34000050, 19), (34000051, 19),
    (34000052, 19), (34000053, 19), (34000054, 19), (34000055, 19), (34000056, 19), (34000057, 19), (34000058, 19), (34000059, 19), (34000060, 19), (34000061, 19), (34000062, 19), (34000063, 19),
    (34000064, 19), (34000065, 19), (34000066, 19), (34000067, 19), (34000068, 19), (34000069, 19), (34000070, 19), (34000071, 19), (34000072, 19), (34000073, 19), (34000074, 19), (34000075, 19),
    (34000076, 19), (34000077, 19), (34000078, 19), (34000079, 19), (34000080, 19), (34000081, 19), (34000082, 19), (34000083, 19), (34000084, 19), (34000085, 19), (34000086, 19), (34000087, 19),
    (34000088, 19), (34000089, 19), (34000090, 19), (34000091, 19), (34000092, 19), (34000093, 19), (34000094, 19), (34000095, 19), (34000096, 19), (34000097, 19), (34000098, 19), (34000099, 19),
    (34000100, 19), (34000101, 19), (34000102, 19), (34000103, 19), (34000104, 19), (34000105, 19), (34000106, 19), (34000107, 19), (34000108, 19), (34000109, 19), (34000110, 19), (34000111, 19),
    (34000112, 19), (34000113, 19), (34000114, 19), (34000115, 19), (34000116, 19), (34000117, 19), (34000118, 19), (34000119, 19), (34000120, 19), (34000121, 19), (34000122, 19), (34000123, 19),
    (34000124, 19), (34000125, 19), (34000126, 19), (34000127, 19), (34000128, 19), (34000129, 19), (34000130, 19), (34000131, 19), (34000132, 19), (34000133, 19), (34000134, 19), (34000135, 19),
    (34000136, 19), (34000137, 19), (34000138, 19), (34000139, 19), (34000140, 19), (34000141, 19), (34000142, 19), (34000143, 19), (34000144, 19), (34000145, 19), (34000146, 19), (34000147, 19),
    (34000148, 19), (34000149, 19), (34000150, 19), (34000151, 19), (34000152, 19), (34000153, 19), (34000154, 19), (34000155, 19), (34000156, 19), (34000157, 19), (34000158, 19), (34000159, 19),
    (34000160, 19), (34000161, 19), (34000162, 19), (34000163, 19), (34000164, 19), (34000165, 19), (34000166, 19), (34000167, 19), (34000168, 19), (34000169, 19), (34000170, 19), (34000171, 19),
    (34000172, 19), (34000173, 19), (34000174, 19), (34000175, 19), (34000176, 19), (34000177, 19), (34000178, 19), (34000179, 19), (34000180, 19), (34000181, 19), (34000182, 19), (34000183, 19),
    (34000184, 19), (34000185, 19), (34000186, 19), (34000187, 19), (34000188, 19), (34000189, 19), (34000190, 19), (34000191, 19), (34000192, 19), (34000193, 19), (34000194, 19), (34000195, 19),
    (34000196, 19), (34000197, 19), (34000198, 19), (34000199, 19), (34000200, 19), (36000001, 24), (0, 4), (1, 2), (2, 1), (3, 12), (4, 13), (5, 14),
    (6, 15), (7, 16), (8, 17), (9, 18), (10, 3), (11, 25), (12, 26), (13, 27), (14, 6), (15, 7), (16, 8), (17, 9),
    (18, 11), (19, 28)
ON DUPLICATE KEY UPDATE category = VALUES(category);
CREATE TABLE IF NOT EXISTS signature_connection_limits (
    source SMALLINT NOT NULL,
    target SMALLINT NOT NULL,
    seconds INT NOT NULL,
    PRIMARY KEY (source, target)
);
INSERT INTO signature_connection_limits (source, target, seconds) VALUES
    (0, 0, 172800), (0, 1, 172800), (0, 2, 172800), (0, 3, 43200), (0, 4, 172800), (0, 5, 172800), (0, 6, 86400), (0, 7, 86400), (0, 8, 86400), (0, 9, 86400), (0, 10, 86400), (0, 11, 86400),
    (0, 12, 86400), (0, 13, 86400), (0, 14, 86400), (0, 15, 86400), (0, 16, 86400), (0, 17, 172800), (0, 18, 16200), (0, 19, 172800), (0, 20, 172800), (0, 21, 172800), (0, 22, 172800), (0, 23, 172800),
    (0, 24, 172800), (0, 25, 86400), (0, 26, 86400), (0, 27, 86400), (0, 28, 86400), (1, 0, 172800), (1, 1, 57600), (1, 2, 57600), (1, 3, 43200), (1, 4, 86400), (1, 5, 57600), (1, 6, 172800),
    (1, 7, 172800), (1, 8, 172800), (1, 9, 172800), (1, 10, 57600), (1, 11, 172800), (1, 12, 86400), (1, 13, 86400), (1, 14, 86400), (1, 15, 86400), (1, 16, 86400), (1, 17, 172800), (1, 18, 172800),
    (1, 19, 172800), (1, 20, 172800), (1, 21, 172800), (1, 22, 172800), (1, 23, 172800), (1, 24, 172800), (1, 25, 86400), (1, 26, 86400), (1, 27, 86400), (1, 28, 172800), (2, 0, 172800), (2, 1, 57600),
    (2, 2, 86400), (2, 3, 43200), (2, 4, 86400), (2, 5, 86400), (2, 6, 172800), (2, 7, 172800), (2, 8, 172800), (2, 9, 172800), (2, 10, 57600), (2, 11, 172800), (2, 12, 86400), (2, 13, 86400),
    (2, 14, 86400), (2, 15, 86400), (2, 16, 86400), (2, 17, 172800), (2, 18, 172800), (2, 19, 172800), (2, 20, 172800), (2, 21, 172800), (2, 22, 172800), (2, 23, 172800), (2, 24, 172800), (2, 25, 86400),
    (2, 26, 86400), (2, 27, 86400), (2, 28, 172800), (3, 0, 43200), (3, 1, 43200), (3, 2, 43200), (3, 3, 43200), (3, 4, 43200), (3, 5, 43200), (3, 6, 172800), (3, 7, 172800), (3, 8, 172800),
    (3, 9, 172800), (3, 10, 172800), (3, 11, 172800), (3, 12, 172800), (3, 13, 43200), (3, 14, 43200), (3, 15, 43200), (3, 16, 43200), (3, 17, 43200), (3, 18, 172800), (3, 19, 172800), (3, 20, 172800),
    (3, 21, 172800), (3, 22, 172800), (3, 23, 172800), (3, 24, 172800), (3, 25, 43200), (3, 26, 43200), (3, 27, 43200), (3, 28, 172800), (4, 0, 172800), (4, 1, 86400), (4, 2, 86400), (4, 3, 43200),
    (4, 4, 86400), (4, 5, 86400), (4, 6, 172800), (4, 7, 172800), (4, 8, 172800), (4, 9, 172800), (4, 10, 57600), (4, 11, 172800), (4, 12, 86400), (4, 13, 86400), (4, 14, 86400), (4, 15, 86400),
    (4, 16, 86400), (4, 17, 172800), (4, 18, 16200), (4, 19, 172800), (4, 20, 172800), (4, 21, 172800), (4, 22, 172800), (4, 23, 172800), (4, 24, 172800), (4, 25, 86400), (4, 26, 86400), (4, 27, 86400),
    (4, 28, 172800), (5, 0, 172800), (5, 1, 57600), (5, 2, 86400), (5, 3, 43200), (5, 4, 86400), (5, 5, 86400), (5, 6, 172800), (5, 7, 172800), (5, 8, 172800), (5, 9, 172800), (5, 10, 57600),
    (5, 11, 172800), (5, 12, 86400), (5, 13, 86400), (5, 14, 86400), (5, 15, 86400), (5, 16, 86400), (5, 17, 172800), (5, 18, 172800), (5, 19, 172800), (5, 20, 172800), (5, 21, 172800), (5, 22, 172800),
    (5, 23, 172800), (5, 24, 172800), (5, 25, 86400), (5, 26, 86400), (5, 27, 86400), (5, 28, 172800), (6, 0, 86400), (6, 1, 172800), (6, 2, 172800), (6, 3, 172800), (6, 4, 172800), (6, 5, 172800),
    (6, 6, 172800), (6, 7, 172800), (6, 8, 172800), (6, 9, 172800), (6, 10, 172800), (6, 11, 172800), (6, 12, 57600), (6, 13, 57600), (6, 14, 57600), (6, 15, 57600), (6, 16, 86400), (6, 17, 86400),
    (6, 18, 172800), (6, 19, 172800), (6, 20, 172800), (6, 21, 172800), (6, 22, 172800), (6, 23, 172800), (6, 24, 172800), (6, 25, 57600), (6, 26, 57600), (6, 27, 86400), (6, 28, 172800), (7, 0, 86400),
    (7, 1, 172800), (7, 2, 172800), (7, 3, 172800), (7, 4, 172800), (7, 5, 172800), (7, 6, 172800), (7, 7, 172800), (7, 8, 172800), (7, 9, 172800), (7, 10, 172800), (7, 11, 172800), (7, 12, 57600),
    (7, 13, 57600), (7, 14, 57600), (7, 15, 57600), (7, 16, 86400), (7, 17, 86400), (7, 18, 172800), (7, 19, 172800), (7, 20, 172800), (7, 21, 172800), (7, 22, 172800), (7, 23, 172800), (7, 24, 172800),
    (7, 25, 57600), (7, 26, 57600), (7, 27, 86400), (7, 28, 172800), (8, 0, 86400), (8, 1, 172800), (8, 2, 172800), (8, 3, 172800), (8, 4, 172800), (8, 5, 172800), (8, 6, 172800), (8, 7, 172800),
    (8, 8, 172800), (8, 9, 172800), (8, 10, 172800), (8, 11, 172800), (8, 12, 57600), (8, 13, 57600), (8, 14, 57600), (8, 15, 57600), (8, 16, 86400), (8, 17, 86400), (8, 18, 172800), (8, 19, 172800),
    (8, 20, 172800), (8, 21, 172800), (8, 22, 172800), (8, 23, 172800), (8, 24, 172800), (8, 25, 57600), (8, 26, 57600), (8, 27, 86400), (8, 28, 172800), (9, 0, 86400), (9, 1, 172800), (9, 2, 172800),
    (9, 3, 172800), (9, 4, 172800), (9, 5, 172800), (9, 6, 172800), (9, 7, 172800), (9, 8, 172800), (9, 9, 172800), (9, 10, 172800), (9, 11, 172800), (9, 12, 57600), (9, 13, 57600), (9, 14, 57600),
    (9, 15, 57600), (9, 16, 86400), (9, 17, 86400), (9, 18, 172800), (9, 19, 172800), (9, 20, 172800), (9, 21, 172800), (9, 22, 172800), (9, 23, 172800), (9, 24, 172800), (9, 25, 57600), (9, 26, 57600),
    (9, 27, 86400), (9, 28, 172800), (10, 0, 86400), (10, 1, 57600), (10, 2, 57600), (10, 3, 172800), (10, 4, 57600), (10, 5, 57600), (10, 6, 172800), (10, 7, 172800), (10, 8, 172800), (10, 9, 172800),
    (10, 10, 172800), (10, 11, 172800), (10, 12, 57600), (10, 13, 57600), (10, 14, 57600), (10, 15, 57600), (10, 16, 86400), (10, 17, 86400), (10, 18, 16200), (10, 19, 172800), (10, 20, 172800), (10, 21, 172800),
    (10, 22, 172800), (10, 23, 172800), (10, 24, 172800), (10, 25, 57600), (10, 26, 57600), (10, 27, 86400), (10, 28, 172800), (11, 0, 86400), (11, 1, 172800), (11, 2, 172800), (11, 3, 172800), (11, 4, 172800),
    (11, 5, 172800), (11, 6, 172800), (11, 7, 172800), (11, 8, 172800), (11, 9, 172800), (11, 10, 172800), (11, 11, 172800), (11, 12, 57600), (11, 13, 57600), (11, 14, 57600), (11, 15, 57600), (11, 16, 86400),
    (11, 17, 86400), (11, 18, 172800), (11, 19, 172800), (11, 20, 172800), (11, 21, 172800), (11, 22, 172800), (11, 23, 172800), (11, 24, 172800), (11, 25, 57600), (11, 26, 57600), (11, 27, 86400), (11, 28, 172800),
    (12, 0, 86400), (12, 1, 86400), (12, 2, 86400), (12, 3, 172800), (12, 4, 86400), (12, 5, 86400), (12, 6, 57600), (12, 7, 57600), (12, 8, 57600), (12, 9, 57600), (12, 10, 57600), (12, 11, 57600),
    (12, 12, 57600), (12, 13, 57600), (12, 14, 57600), (12, 15, 57600), (12, 16, 86400), (12, 17, 86400), (12, 18, 16200), (12, 19, 172800), (12, 20, 172800), (12, 21, 172800), (12, 22, 172800), (12, 23, 172800),
    (12, 24, 172800), (12, 25, 57600), (12, 26, 57600), (12, 27, 86400), (12, 28, 57600), (13, 0, 86400), (13, 1, 86400), (13, 2, 86400), (13, 3, 43200), (13, 4, 86400), (13, 5, 86400), (13, 6, 57600),
    (13, 7, 57600), (13, 8, 57600), (13, 9, 57600), (13, 10, 57600), (13, 11, 57600), (13, 12, 57600), (13, 13, 57600), (13, 14, 57600), (13, 15, 57600), (13, 16, 86400), (13, 17, 86400), (13, 18, 16200),
    (13, 19, 172800), (13, 20, 172800), (13, 21, 172800), (13, 22, 172800), (13, 23, 172800), (13, 24, 172800), (13, 25, 57600), (13, 26, 57600), (13, 27, 86400), (13, 28, 57600), (14, 0, 86400), (14, 1, 86400),
    (14, 2, 86400), (14, 3, 43200), (14, 4, 86400), (14, 5, 86400), (14, 6, 57600), (14, 7, 57600), (14, 8, 57600), (14, 9, 57600), (14, 10, 57600), (14, 11, 57600), (14, 12, 57600), (14, 13, 57600),
    (14, 14, 57600), (14, 15, 57600), (14, 16, 86400), (14, 17, 86400), (14, 18, 16200), (14, 19, 172800), (14, 20, 172800), (14, 21, 172800), (14, 22, 172800), (14, 23, 172800), (14, 24, 172800), (14, 25, 57600),
    (14, 26, 57600), (14, 27, 86400), (14, 28, 57600), (15, 0, 86400), (15, 1, 86400), (15, 2, 86400), (15, 3, 43200), (15, 4, 86400), (15, 5, 86400), (15, 6, 57600), (15, 7, 57600), (15, 8, 57600),
    (15, 9, 57600), (15, 10, 57600), (15, 11, 57600), (15, 12, 57600), (15, 13, 57600), (15, 14, 57600), (15, 15, 57600), (15, 16, 86400), (15, 17, 86400), (15, 18, 16200), (15, 19, 172800), (15, 20, 172800),
    (15, 21, 172800), (15, 22, 172800), (15, 23, 172800), (15, 24, 172800), (15, 25, 57600), (15, 26, 57600), (15, 27, 86400), (15, 28, 57600), (16, 0, 86400), (16, 1, 86400), (16, 2, 86400), (16, 3, 43200),
    (16, 4, 86400), (16, 5, 86400), (16, 6, 86400), (16, 7, 86400), (16, 8, 86400), (16, 9, 86400), (16, 10, 86400), (16, 11, 86400), (16, 12, 86400), (16, 13, 86400), (16, 14, 86400), (16, 15, 86400),
    (16, 16, 86400), (16, 17, 86400), (16, 18, 16200), (16, 19, 172800), (16, 20, 172800), (16, 21, 172800), (16, 22, 172800), (16, 23, 172800), (16, 24, 172800), (16, 25, 86400), (16, 26, 86400), (16, 27, 86400),
    (16, 28, 86400), (17, 0, 172800), (17, 1, 172800), (17, 2, 172800), (17, 3, 43200), (17, 4, 172800), (17, 5, 172800), (17, 6, 86400), (17, 7, 86400), (17, 8, 86400), (17, 9, 86400), (17, 10, 86400),
    (17, 11, 86400), (17, 12, 86400), (17, 13, 86400), (17, 14, 86400), (17, 15, 86400), (17, 16, 86400), (17, 17, 86400), (17, 18, 16200), (17, 19, 172800), (17, 20, 172800), (17, 21, 172800), (17, 22, 172800),
    (17, 23, 172800), (17, 24, 172800), (17, 25, 86400), (17, 26, 86400), (17, 27, 86400), (17, 28, 86400), (18, 0, 16200), (18, 1, 172800), (18, 2, 172800), (18, 3, 172800), (18, 4, 16200), (18, 5, 172800),
    (18, 6, 172800), (18, 7, 172800), (18, 8, 172800), (18, 9, 172800), (18, 10, 16200), (18, 11, 172800), (18, 12, 16200), (18, 13, 16200), (18, 14, 16200), (18, 15, 16200), (18, 16, 16200), (18, 17, 16200),
    (18, 18, 172800), (18, 19, 172800), (18, 20, 172800), (18, 21, 172800), (18, 22, 172800), (18, 23, 172800), (18, 24, 172800), (18, 25, 16200), (18, 26, 16200), (18, 27, 16200), (18, 28, 172800), (19, 0, 172800),
    (19, 1, 172800), (19, 2, 172800), (19, 3, 172800), (19, 4, 172800), (19, 5, 172800), (19, 6, 172800), (19, 7, 172800), (19, 8, 172800), (19, 9, 172800), (19, 10, 172800), (19, 11, 172800), (19, 12, 172800),
    (19, 13, 172800), (19, 14, 172800), (19, 15, 172800), (19, 16, 172800), (19, 17, 172800), (19, 18, 172800), (19, 19, 172800), (19, 20, 172800), (19, 21, 172800), (19, 22, 172800), (19, 23, 172800), (19, 24, 172800),
    (19, 25, 172800), (19, 26, 172800), (19, 27, 172800), (19, 28, 172800), (20, 0, 172800), (20, 1, 172800), (20, 2, 172800), (20, 3, 172800), (20, 4, 172800), (20, 5, 172800), (20, 6, 172800), (20, 7, 172800),
    (20, 8, 172800), (20, 9, 172800), (20, 10, 172800), (20, 11, 172800), (20, 12, 172800), (20, 13, 172800), (20, 14, 172800), (20, 15, 172800), (20, 16, 172800), (20, 17, 172800), (20, 18, 172800), (20, 19, 172800),
    (20, 20, 172800), (20, 21, 172800), (20, 22, 172800), (20, 23, 172800), (20, 24, 172800), (20, 25, 172800), (20, 26, 172800), (20, 27, 172800), (20, 28, 172800), (21, 0, 172800), (21, 1, 172800), (21, 2, 172800),
    (21, 3, 172800), (21, 4, 172800), (21, 5, 172800), (21, 6, 172800), (21, 7, 172800), (21, 8, 172800), (21, 9, 172800), (21, 10, 172800), (21, 11, 172800), (21, 12, 172800), (21, 13, 172800), (21, 14, 172800),
    (21, 15, 172800), (21, 16, 172800), (21, 17, 172800), (21, 18, 172800), (21, 19, 172800), (21, 20, 172800), (21, 21, 172800), (21, 22, 172800), (21, 23, 172800), (21, 24, 172800), (21, 25, 172800), (21, 26, 172800),
    (21, 27, 172800), (21, 28, 172800), (22, 0, 172800), (22, 1, 172800), (22, 2, 172800), (22, 3, 172800), (22, 4, 172800), (22, 5, 172800), (22, 6, 172800), (22, 7, 172800), (22, 8, 172800), (22, 9, 172800),
    (22, 10, 172800), (22, 11, 172800), (22, 12, 172800), (22, 13, 172800), (22, 14, 172800), (22, 15, 172800), (22, 16, 172800), (22, 17, 172800), (22, 18, 172800), (22, 19, 172800), (22, 20, 172800), (22, 21, 172800),
    (22, 22, 172800), (22, 23, 172800), (22, 24, 172800), (22, 25, 172800), (22, 26, 172800), (22, 27, 172800), (22, 28, 172800), (23, 0, 172800), (23, 1, 172800), (23, 2, 172800), (23, 3, 172800), (23, 4, 172800),
    (23, 5, 172800), (23, 6, 172800), (23, 7, 172800), (23, 8, 172800), (23, 9, 172800), (23, 10, 172800), (23, 11, 172800), (23, 12, 172800), (23, 13, 172800), (23, 14, 172800), (23, 15, 172800), (23, 16, 172800),
    (23, 17, 172800), (23, 18, 172800), (23, 19, 172800), (23, 20, 172800), (23, 21, 172800), (23, 22, 172800), (23, 23, 172800), (23, 24, 172800), (23, 25, 172800), (23, 26, 172800), (23, 27, 172800), (23, 28, 172800),
    (24, 0, 172800), (24, 1, 172800), (24, 2, 172800), (24, 3, 172800), (24, 4, 172800), (24, 5, 172800), (24, 6, 172800), (24, 7, 172800), (24, 8, 172800), (24, 9, 172800), (24, 10, 172800), (24, 11, 172800),
    (24, 12, 172800), (24, 13, 172800), (24, 14, 172800), (24, 15, 172800), (24, 16, 172800), (24, 17, 172800), (24, 18, 172800), (24, 19, 172800), (24, 20, 172800), (24, 21, 172800), (24, 22, 172800), (24, 23, 172800),
    (24, 24, 172800), (24, 25, 172800), (24, 26, 172800), (24, 27, 172800), (24, 28, 172800), (25, 0, 86400), (25, 1, 86400), (25, 2, 86400), (25, 3, 43200), (25, 4, 86400), (25, 5, 86400), (25, 6, 57600),
    (25, 7, 57600), (25, 8, 57600), (25, 9, 57600), (25, 10, 57600), (25, 11, 57600), (25, 12, 57600), (25, 13, 57600), (25, 14, 57600), (25, 15, 57600), (25, 16, 86400), (25, 17, 86400), (25, 18, 16200),
    (25, 19, 172800), (25, 20, 172800), (25, 21, 172800), (25, 22, 172800), (25, 23, 172800), (25, 24, 172800), (25, 25, 57600), (25, 26, 57600), (25, 27, 86400), (25, 28, 57600), (26, 0, 86400), (26, 1, 86400),
    (26, 2, 86400), (26, 3, 43200), (26, 4, 86400), (26, 5, 86400), (26, 6, 57600), (26, 7, 57600), (26, 8, 57600), (26, 9, 57600), (26, 10, 57600), (26, 11, 57600), (26, 12, 57600), (26, 13, 57600),
    (26, 14, 57600), (26, 15, 57600), (26, 16, 86400), (26, 17, 86400), (26, 18, 16200), (26, 19, 172800), (26, 20, 172800), (26, 21, 172800), (26, 22, 172800), (26, 23, 172800), (26, 24, 172800), (26, 25, 57600),
    (26, 26, 57600), (26, 27, 86400), (26, 28, 57600), (27, 0, 86400), (27, 1, 86400), (27, 2, 86400), (27, 3, 43200), (27, 4, 86400), (27, 5, 86400), (27, 6, 86400), (27, 7, 86400), (27, 8, 86400),
    (27, 9, 86400), (27, 10, 86400), (27, 11, 86400), (27, 12, 86400), (27, 13, 86400), (27, 14, 86400), (27, 15, 86400), (27, 16, 86400), (27, 17, 86400), (27, 18, 16200), (27, 19, 172800), (27, 20, 172800),
    (27, 21, 172800), (27, 22, 172800), (27, 23, 172800), (27, 24, 172800), (27, 25, 86400), (27, 26, 86400), (27, 27, 86400), (27, 28, 86400), (28, 0, 86400), (28, 1, 172800), (28, 2, 172800), (28, 3, 172800),
    (28, 4, 172800), (28, 5, 172800), (28, 6, 172800), (28, 7, 172800), (28, 8, 172800), (28, 9, 172800), (28, 10, 172800), (28, 11, 172800), (28, 12, 57600), (28, 13, 57600), (28, 14, 57600), (28, 15, 57600),
    (28, 16, 86400), (28, 17, 86400), (28, 18, 172800), (28, 19, 172800), (28, 20, 172800), (28, 21, 172800), (28, 22, 172800), (28, 23, 172800), (28, 24, 172800), (28, 25, 57600), (28, 26, 57600), (28, 27, 86400),
    (28, 28, 172800)
ON DUPLICATE KEY UPDATE seconds = VALUES(seconds);

DROP PROCEDURE IF EXISTS enforceSignatureLifetimes;
DELIMITER ;;
CREATE PROCEDURE enforceSignatureLifetimes()
BEGIN
    DROP TEMPORARY TABLE IF EXISTS signature_expiry_corrections;
    CREATE TEMPORARY TABLE signature_expiry_corrections AS
    SELECT s.id,
           IF(s.lifeLength <= 0 AND COALESCE(w.life, 'stable') <> 'critical',
              TIMESTAMPADD(SECOND, IF(s.lifeLength <= 0, CASE s.type WHEN 'unknown' THEN 86400 WHEN 'wormhole' THEN COALESCE(l.seconds, inferred.seconds, 172800) ELSE 259200 END, LEAST(s.lifeLength, CASE s.type WHEN 'unknown' THEN 86400 WHEN 'wormhole' THEN COALESCE(l.seconds, inferred.seconds, 172800) ELSE 259200 END)), LEAST(s.lifeTime, COALESCE(peer.lifeTime, s.lifeTime), NOW())), LEAST(s.lifeLeft, TIMESTAMPADD(SECOND, IF(s.lifeLength <= 0, CASE s.type WHEN 'unknown' THEN 86400 WHEN 'wormhole' THEN COALESCE(l.seconds, inferred.seconds, 172800) ELSE 259200 END, LEAST(s.lifeLength, CASE s.type WHEN 'unknown' THEN 86400 WHEN 'wormhole' THEN COALESCE(l.seconds, inferred.seconds, 172800) ELSE 259200 END)), LEAST(s.lifeTime, COALESCE(peer.lifeTime, s.lifeTime), NOW())))) AS deadline,
           IF(s.lifeLength <= 0, CASE s.type WHEN 'unknown' THEN 86400 WHEN 'wormhole' THEN COALESCE(l.seconds, inferred.seconds, 172800) ELSE 259200 END, LEAST(s.lifeLength, CASE s.type WHEN 'unknown' THEN 86400 WHEN 'wormhole' THEN COALESCE(l.seconds, inferred.seconds, 172800) ELSE 259200 END)) AS duration,
           LEAST(s.lifeTime, COALESCE(peer.lifeTime, s.lifeTime), NOW()) AS origin
    FROM signatures s
    LEFT JOIN wormholes w ON (w.initialID = s.id OR w.secondaryID = s.id) AND w.maskID = s.maskID
    LEFT JOIN signature_lifetime_limits l ON l.type = w.type
    LEFT JOIN signatures peer ON peer.id = IF(w.initialID = s.id, w.secondaryID, w.initialID) AND peer.maskID = s.maskID
    LEFT JOIN signature_system_categories sc ON sc.systemID = s.systemID
    LEFT JOIN signature_system_categories tc ON tc.systemID = peer.systemID
    LEFT JOIN signature_connection_limits inferred
      ON inferred.source = COALESCE(sc.category, 0) AND inferred.target = COALESCE(tc.category, 0)
    WHERE s.lifeLength <= 0 OR s.lifeLength > (CASE s.type WHEN 'unknown' THEN 86400 WHEN 'wormhole' THEN COALESCE(l.seconds, inferred.seconds, 172800) ELSE 259200 END)
       OR s.lifeTime > LEAST(s.lifeTime, COALESCE(peer.lifeTime, s.lifeTime), NOW())
       OR s.lifeLeft > TIMESTAMPADD(SECOND, IF(s.lifeLength <= 0, CASE s.type WHEN 'unknown' THEN 86400 WHEN 'wormhole' THEN COALESCE(l.seconds, inferred.seconds, 172800) ELSE 259200 END, LEAST(s.lifeLength, CASE s.type WHEN 'unknown' THEN 86400 WHEN 'wormhole' THEN COALESCE(l.seconds, inferred.seconds, 172800) ELSE 259200 END)), LEAST(s.lifeTime, COALESCE(peer.lifeTime, s.lifeTime), NOW()));
    UPDATE signatures s
    JOIN signature_expiry_corrections c ON c.id = s.id
    SET s.lifeLeft = IF(s.lifeLength <= 0, c.deadline, LEAST(s.lifeLeft, c.deadline)),
        s.lifeLength = IF(s.lifeLength <= 0, c.duration, LEAST(s.lifeLength, c.duration)),
        s.lifeTime = LEAST(s.lifeTime, c.origin), s.modifiedTime = NOW();
    DROP TEMPORARY TABLE signature_expiry_corrections;
END;;
DELIMITER ;
-- Cap legacy rows without resetting their age or extending an existing deadline.
CALL enforceSignatureLifetimes();
-- END GENERATED SIGNATURE EXPIRY POLICY

DROP EVENT IF EXISTS `signatureClean`;
DELIMITER ;;
CREATE EVENT `signatureClean`
ON SCHEDULE EVERY 1 MINUTE
STARTS CURRENT_TIMESTAMP
ON COMPLETION NOT PRESERVE
ENABLE
DO
BEGIN
    CALL enforceSignatureLifetimes();
    UPDATE signatures
      SET modifiedByID = 0, modifiedByName = "Tripwire"
      WHERE lifeLeft < NOW()
        AND lifeLength <> '0'
        AND type <> 'wormhole';

    DELETE FROM signatures
      WHERE lifeLeft < NOW()
        AND lifeLength <> '0'
        AND type <> 'wormhole';
END;;
DELIMITER ;

DROP EVENT IF EXISTS `trackingClean`;
DELIMITER ;;
CREATE EVENT `trackingClean`
ON SCHEDULE EVERY 15 SECOND
STARTS CURRENT_TIMESTAMP
ON COMPLETION NOT PRESERVE
ENABLE
DO
  DELETE FROM tracking WHERE userID NOT IN (SELECT userID FROM active);
;;
DELIMITER ;

DROP EVENT IF EXISTS `wormholeClean`;
DELIMITER ;;
CREATE EVENT `wormholeClean`
ON SCHEDULE EVERY 1 MINUTE
STARTS CURRENT_TIMESTAMP
ON COMPLETION NOT PRESERVE
ENABLE
DO
BEGIN
    CALL enforceSignatureLifetimes();
    UPDATE signatures s
    INNER JOIN wormholes w ON (s.id = initialID OR s.id = secondaryID)
      AND life = 'stable'
      SET modifiedByID = 0,
          modifiedByName = "Tripwire",
          modifiedTime = NOW()
      WHERE s.type = 'wormhole'
        AND lifeLength <> '0'
        AND lifeLeft < NOW() + INTERVAL 4 HOUR;

    UPDATE wormholes w
    INNER JOIN signatures s ON (s.id = initialID OR s.id = secondaryID)
      AND (s.type = 'wormhole'
           AND life = 'stable'
           AND lifeLength <> '0'
           AND lifeLeft < NOW() + INTERVAL 4 HOUR)
      SET life = 'critical';

    DELETE FROM signatures
      WHERE lifeLeft <= NOW()
        AND lifeLength <> 0
        AND type = 'wormhole';

    DELETE FROM wormholes
      WHERE  NOT EXISTS (
               SELECT 1
               FROM signatures s
               WHERE s.id = wormholes.secondaryID
             )
         OR NOT EXISTS (
               SELECT 1
               FROM signatures s
               WHERE s.id = wormholes.initialID
             );
END;;
DELIMITER ;

DROP EVENT IF EXISTS `wormholeCritical`;
DELIMITER ;;
CREATE EVENT `wormholeCritical`
ON SCHEDULE EVERY 1 MINUTE
STARTS CURRENT_TIMESTAMP
ON COMPLETION NOT PRESERVE
ENABLE
DO
BEGIN
    UPDATE signatures s
    INNER JOIN wormholes w
       ON (s.id = initialID OR s.id = secondaryID)
       AND life = 'stable'
      SET modifiedByID = 0,
          modifiedByName = 'Tripwire',
          modifiedTime = NOW()
      WHERE s.type = 'wormhole'
        AND lifeLength <> '0'
        AND lifeLeft < NOW() + INTERVAL 4 HOUR;

    UPDATE wormholes w
    INNER JOIN signatures s
       ON (s.id = initialID OR s.id = secondaryID)
       AND s.type = 'wormhole'
       AND life = 'stable'
       AND lifeLength <> '0'
       AND lifeLeft < NOW() + INTERVAL 4 HOUR
      SET life = 'critical';
END;;
DELIMITER ;

--
-- Cleanup
--

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-05-12 12:00:00
