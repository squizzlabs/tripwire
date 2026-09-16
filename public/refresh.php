<?php
//	======================================================
//	File:		refresh.php
//	Author:		Josh Glassmaker (Daimian Mercer)
//
//	======================================================

$startTime = microtime(true);
// Verify access via Tripwire signon
if (!session_id()) session_start();

if(!isset($_SESSION['userID'])) {
	http_response_code(403);
	exit();
}

require_once('../config.php');
require_once('../settings.php');
require_once('../database.inc.php');
require_once('../note-html.inc.php');

header('Content-Type: application/json');
/**
// *********************
// Check and update session
// *********************
*/
$query = 'SELECT characterID, characterName, corporationID, corporationName, admin FROM characters WHERE userID = :userID';
$stmt = $mysql->prepare($query);
$stmt->bindValue(':userID', $_SESSION['userID']);
$stmt->execute();
if ($row = $stmt->fetchObject()) {
	$_SESSION['characterID'] = $row->characterID;
	$_SESSION['characterName'] = $row->characterName;
	$_SESSION['corporationID'] = $row->corporationID;
	$_SESSION['corporationName'] = $row->corporationName;
	$_SESSION['admin'] = $row->admin;
}

/**
// *********************
// Mask Check
// *********************
**/
require_once('../lib.inc.php');
$_SESSION['mask'] = verifyMask($_SESSION['mask']);

/**
// *********************
// Core variables
// *********************
*/
$ip				= isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : die();
$instance		= isset($_REQUEST['instance']) ? $_REQUEST['instance'] : 0;
$version		= isset($_SERVER['SERVER_NAME'])? explode('.', $_SERVER['SERVER_NAME'])[0] . (isset($_REQUEST['version']) ? ' ' . $_REQUEST['version'] : '') : die();
$userID			= isset($_SESSION['userID']) ? $_SESSION['userID'] : die();
$maskID			= isset($_SESSION['mask']) ? $_SESSION['mask'] : die();
$systemID 		= isset($_REQUEST['systemID']) && !empty($_REQUEST['systemID']) ? $_REQUEST['systemID'] : die();
$systemName 	= isset($_REQUEST['systemName']) && !empty($_REQUEST['systemName']) ? $_REQUEST['systemName'] : null;
$activity 		= isset($_REQUEST['activity']) ? json_encode($_REQUEST['activity']) : null;
$refresh 		= array('sigUpdate' => false, 'chainUpdate' => false);

// Backend character tracking remains active for four hours after the user's
// most recent authenticated Tripwire request. This persistent lease is not
// tied to the short-lived `active` rows, which intentionally expire quickly.
$stmt = $mysql->prepare('UPDATE esi SET lastActive = UTC_TIMESTAMP() WHERE userID = :userID');
$stmt->bindValue(':userID', $userID);
$stmt->execute();

/**
// *********************
// Server notifications & user activity
// *********************
*/
$query = 'SELECT notify FROM active WHERE instance = :instance AND notify IS NOT NULL';
$stmt = $mysql->prepare($query);
$stmt->bindValue(':instance', $instance);
$stmt->execute();
$stmt->rowCount() ? $output['notify'] = $stmt->fetchColumn() : null;

if (!isset($output['notify']) && isset($_REQUEST['version']) && $_REQUEST['version'] != VERSION) {
	$updateVersion = htmlspecialchars(VERSION, ENT_QUOTES, 'UTF-8');
	$output['notify'] = '<div class="update-notice" role="status" aria-live="polite" aria-atomic="true">'
		. '<strong>Tripwire update available (' . $updateVersion . ')</strong>'
		. '<a class="update-notice-action" href="">Reload to update</a>'
		. '</div>';
}

$query = 'SELECT characters.characterName, activity FROM active INNER JOIN characters ON active.userID = characters.userID WHERE maskID = :maskID AND instance <> :instance AND activity IS NOT NULL AND activity <> ""';
$stmt = $mysql->prepare($query);
$stmt->bindValue(':maskID', $maskID);
$stmt->bindValue(':instance', $instance);
$stmt->execute();
$stmt->rowCount() ? $output['activity'] = $stmt->fetchAll(PDO::FETCH_OBJ) : null;

/**
// *********************
// Account OAuth
// *********************
*/
if (isset($_SESSION['oauth']) && isset($_SESSION['oauth']['tokenExpire'])) {
	if (strtotime($_SESSION['oauth']['tokenExpire']) < strtotime('+5 minutes')) {
		require_once("../esi.class.php");
		$esi = new esi();
		if ($esi->refresh($_SESSION['oauth']['refreshToken'])) {
			$_SESSION['oauth']['accessToken'] = $esi->accessToken;
			$_SESSION['oauth']['refreshToken'] = $esi->refreshToken;
			$_SESSION['oauth']['tokenExpire'] = $esi->tokenExpire;
		} else if ($esi->httpCode >= 400 && $esi->httpCode < 500) {
			error_log("unable to refresh account oauth token");
		}
	}
}

/**
// *********************
// ESI
// *********************
*/
// Linked-character state is now produced by the background npm scheduler and
// returned on every refresh. Browsers render this state; they no longer poll
// ESI themselves.
$output['esi'] = array();

if (isset($_REQUEST['esiDelete'])) {
	foreach ($_REQUEST['esiDelete'] as $characterID) {
		$query = 'DELETE FROM esi WHERE userID = :userID AND characterID = :characterID';
		$stmt = $mysql->prepare($query);
		$stmt->bindValue(':userID', $userID);
		$stmt->bindValue(':characterID', $characterID);
		$stmt->execute();
	}
}

$query = 'SELECT e.characterID, e.characterName,
		e.online, t.systemID, t.systemName, t.stationID,
		t.stationName, t.shipID, t.shipName, t.shipTypeID, t.shipTypeName
		FROM esi e
		LEFT JOIN tracking t ON t.userID = e.userID
			AND t.characterID = e.characterID AND t.maskID = :maskID
		WHERE e.userID = :userID';
$stmt = $mysql->prepare($query);
$stmt->bindValue(':userID', $userID);
$stmt->bindValue(':maskID', $maskID);
$stmt->execute();
$characters = $stmt->fetchAll(PDO::FETCH_OBJ);
foreach ($characters as $character) {
	$output['esi'][$character->characterID] = $character;
}

/**
// *********************
// Signatures
// *********************
*/
if (isset($_POST['signatures']) || isset($_POST['wormholes'])) {
	require('../signatures.php');
}

/**
// *********************
// Active Users
// *********************
*/
$query = 'INSERT INTO active (ip, instance, session, userID, maskID, systemID, systemName, activity, version)
			VALUES (:ip, :instance, :session, :userID, :maskID, :systemID, :systemName, :activity, :version)
			ON DUPLICATE KEY UPDATE
			maskID = :maskID, systemID = :systemID, systemName = :systemName, activity = :activity, version = :version, time = NOW(), notify = NULL';
$stmt = $mysql->prepare($query);
$stmt->bindValue(':ip', $ip);
$stmt->bindValue(':instance', $instance);
$stmt->bindValue(':session', session_id());
$stmt->bindValue(':userID', $userID);
$stmt->bindValue(':maskID', $maskID);
$stmt->bindValue(':systemID', $systemID);
$stmt->bindValue(':systemName', $systemName);
$stmt->bindValue(':activity', $activity);
$stmt->bindValue(':version', $version);
$stmt->execute();

/**
// *********************
// Gathering data to output
// *********************
*/
if (isset($_REQUEST['mode']) && $_REQUEST['mode'] == 'init') {
	// Send server time for time sync
	$now = new DateTime();
	$now->add(new DateInterval('PT1S')); // Set clock 1 second ahead, jquery countdown plugin sync needs time to be slightly different that countdown time
	$output['sync'] = $now->format("M j, Y H:i:s O");

	// Signatures data
	// $debugStart = microtime(true);
	$output['signatures'] = array();
	$query = 'SELECT * FROM signatures WHERE (systemID = :systemID OR type = "wormhole") AND maskID = :maskID';
	$stmt = $mysql->prepare($query);
	$stmt->bindValue(':systemID', $systemID);
	$stmt->bindValue(':maskID', $maskID);
	$stmt->execute();
	$rows = $stmt->fetchAll(PDO::FETCH_CLASS);
	foreach ($rows AS $row) {
		$output['signatures'][$row->id] = $row;
	}
	// $output['debugTime'] = sprintf('%.4f', microtime(true) - $debugStart);

	// Chain map data
	$output['wormholes'] = array();
	$query = "SELECT * FROM wormholes WHERE maskID = :maskID";
	$stmt = $mysql->prepare($query);
	$stmt->bindValue(':maskID', $maskID);
	$stmt->execute();
	$rows = $stmt->fetchAll(PDO::FETCH_CLASS);
	foreach ($rows AS $row) {
		$output['wormholes'][$row->id] = $row;
	}

	// Get Comments
	$query = 'SELECT id, comment, created AS createdDate, createdByName, modified AS modifiedDate, modifiedByName, systemID FROM comments WHERE (systemID = :systemID OR systemID = 0) AND maskID = :maskID ORDER BY systemID ASC, modified ASC';
	$stmt = $mysql->prepare($query);
	$stmt->bindValue(':systemID', $systemID);
	$stmt->bindValue(':maskID', $maskID);
	$stmt->execute();
	while ($row = $stmt->fetchObject()) {
		$output['comments'][] = array('id' => $row->id, 'comment' => sanitizeNoteHtml($row->comment), 'created' => $row->createdDate, 'createdByName' => $row->createdByName, 'modified' => $row->modifiedDate, 'modifiedByName' => $row->modifiedByName, 'sticky' => $row->systemID == 0 ? true : false);
	}
} else if ((isset($_REQUEST['mode']) && ($_REQUEST['mode'] == 'refresh')) || $refresh['sigUpdate'] == true || $refresh['chainUpdate'] == true) {
	$signatureCount 	= isset($_REQUEST['signatureCount']) ? $_REQUEST['signatureCount'] : null;
	$signatureTime 		= isset($_REQUEST['signatureTime']) ? $_REQUEST['signatureTime'] : null;
	$chainCount				= isset($_REQUEST['chainCount'])?$_REQUEST['chainCount']:null;
	$chainTime 				= isset($_REQUEST['chainTime'])?$_REQUEST['chainTime']:null;
	$flareCount 			= isset($_REQUEST['flareCount'])?$_REQUEST['flareCount']:null;
	$flareTime 				= isset($_REQUEST['flareTime'])?$_REQUEST['flareTime']:null;
	$commentCount 		= isset($_REQUEST['commentCount'])?$_REQUEST['commentCount']:null;
	$commentTime 			= isset($_REQUEST['commentTime'])?$_REQUEST['commentTime']:null;

	// Send server time for time sync
	$now = new DateTime();
	$now->add(new DateInterval('PT1S')); // Set clock 1 second ahead, jquery countdown plugin sync needs time to be slightly different that countdown time
	$output['sync'] = $now->format("M j, Y H:i:s O");

	// Check if signatures changed....
	if ($refresh['sigUpdate'] == false) {
		$query = 'SELECT COUNT(*) as total, MAX(modifiedTime) as time FROM signatures WHERE (systemID = :systemID OR type = "wormhole") AND maskID = :maskID';
		$stmt = $mysql->prepare($query);
		$stmt->bindValue(':systemID', $systemID);
		$stmt->bindValue(':maskID', $maskID);
		$stmt->execute();
		$results = $stmt->fetchObject();

		if ($signatureCount != $results->total || strtotime($signatureTime) < strtotime($results->time)) {
			$refresh['sigUpdate'] = true;
		}
	}

	if ($refresh['sigUpdate'] == true) {
		$output['signatures'] = array();
		$query = 'SELECT * FROM signatures WHERE (systemID = :systemID OR type = "wormhole") AND maskID = :maskID';
		$stmt = $mysql->prepare($query);
		$stmt->bindValue(':systemID', $systemID);
		$stmt->bindValue(':maskID', $maskID);
		$stmt->execute();
		$rows = $stmt->fetchAll(PDO::FETCH_CLASS);
		foreach ($rows AS $row) {
			$output['signatures'][$row->id] = $row;
		}

		$output['wormholes'] = array();
		$query = 'SELECT * FROM wormholes WHERE maskID = :maskID';
		$stmt = $mysql->prepare($query);
		$stmt->bindValue(':maskID', $maskID);
		$stmt->execute();
		$rows = $stmt->fetchAll(PDO::FETCH_CLASS);
		foreach ($rows AS $row) {
			$output['wormholes'][$row->id] = $row;
		}
	}

	// Check Comments
	$query = 'SELECT COUNT(id) AS count, MAX(modified) AS modified FROM comments WHERE (systemID = :systemID OR systemID = 0) AND maskID = :maskID';
	$stmt = $mysql->prepare($query);
	$stmt->bindValue(':systemID', $systemID);
	$stmt->bindValue(':maskID', $maskID);
	$stmt->execute();
	$row = $stmt->fetch(PDO::FETCH_OBJ);
	if ((int)$commentCount != (int)$row->count || strtotime($commentTime) < strtotime($row->modified)) {
		$output['comments'] = array();
		// Get Comments
		$query = 'SELECT id, comment, created AS createdDate, createdByName, modified AS modifiedDate, modifiedByName, systemID FROM comments WHERE (systemID = :systemID OR systemID = 0) AND maskID = :maskID ORDER BY systemID ASC, modified ASC';
		$stmt = $mysql->prepare($query);
		$stmt->bindValue(':systemID', $systemID);
		$stmt->bindValue(':maskID', $maskID);
		$stmt->execute();
		while ($row = $stmt->fetchObject()) {
			$output['comments'][] = array('id' => $row->id, 'comment' => sanitizeNoteHtml($row->comment), 'created' => $row->createdDate, 'createdByName' => $row->createdByName, 'modified' => $row->modifiedDate, 'modifiedByName' => $row->modifiedByName, 'sticky' => $row->systemID == 0 ? true : false);
		}
	}
}

// Values that we always want to return

// Get occupied systems
$query = 'SELECT systemID, COUNT(characterID) AS count FROM tracking WHERE maskID = :maskID AND characterName NOT LIKE \'%|x%\' GROUP BY systemID';
$stmt = $mysql->prepare($query);
$stmt->bindValue(':maskID', $maskID);
$stmt->execute();
if ($result = $stmt->fetchAll(PDO::FETCH_CLASS)) {
	$output['occupied'] = $result;
}

// Get flares
$query = 'SELECT systemID, flare, time FROM flares WHERE maskID = :maskID';
$stmt = $mysql->prepare($query);
$stmt->bindValue(':maskID', $maskID);
$stmt->execute();
$result = $stmt->fetchAll(PDO::FETCH_CLASS);
$output['flares']['flares'] = $result;
$output['flares']['last_modified'] = date('m/d/Y H:i:s e', $result ? strtotime($result[0]->time) : time());

$output['proccessTime'] = sprintf('%.4f', microtime(true) - $startTime);

require_once('../ping.inc.php');
$hook = discord_webhook_for_current_mask();
$output['discord_integration'] = !!$hook;

echo json_encode($output);
