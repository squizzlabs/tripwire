<?php

if (!session_id()) session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['userID'])) {
	http_response_code(403);
	echo json_encode(array('error' => 'Authentication required'));
	exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
	http_response_code(405);
	header('Allow: POST');
	echo json_encode(array('error' => 'POST required'));
	exit();
}

if (empty($_SESSION['csrfToken']) || empty($_POST['_csrf'])
	|| !hash_equals($_SESSION['csrfToken'], $_POST['_csrf'])) {
	http_response_code(403);
	echo json_encode(array('error' => 'Invalid request token'));
	exit();
}

require_once('../config.php');
require_once('../database.inc.php');
require_once('../esi.class.php');

function failEsiRequest($status, $message) {
	http_response_code($status);
	echo json_encode(array('error' => $message));
	exit();
}

function requestInteger($name) {
	$value = filter_input(INPUT_POST, $name, FILTER_VALIDATE_INT);
	if ($value === false || $value === null || $value <= 0) {
		failEsiRequest(400, 'Invalid '.$name);
	}
	return $value;
}

function requestBoolean($name) {
	return filter_input(INPUT_POST, $name, FILTER_VALIDATE_BOOLEAN);
}

function refreshSessionToken($esi) {
	if (!isset($_SESSION['oauth']['refreshToken'])) {
		failEsiRequest(403, 'Account ESI authorization is unavailable');
	}
	if (!$esi->refresh($_SESSION['oauth']['refreshToken'])) {
		failEsiRequest(502, 'Unable to refresh account ESI authorization');
	}
	$_SESSION['oauth']['accessToken'] = $esi->accessToken;
	$_SESSION['oauth']['refreshToken'] = $esi->refreshToken;
	$_SESSION['oauth']['tokenExpire'] = $esi->tokenExpire;
	return $esi->accessToken;
}

function accountAccessToken($esi) {
	if (empty($_SESSION['oauth']['subject'])) {
		failEsiRequest(403, 'Account ESI authorization is unavailable');
	}
	if (!isset($_SESSION['oauth']['accessToken'], $_SESSION['oauth']['tokenExpire'])) {
		return refreshSessionToken($esi);
	}
	if (strtotime($_SESSION['oauth']['tokenExpire']) < strtotime('+5 minutes')) {
		return refreshSessionToken($esi);
	}
	return $_SESSION['oauth']['accessToken'];
}

function linkedCharacterAccessToken($mysql, $esi, $userID, $characterID) {
	$stmt = $mysql->prepare(
		'SELECT accessToken, refreshToken, tokenExpire FROM esi '
		. 'WHERE userID = :userID AND characterID = :characterID'
	);
	$stmt->bindValue(':userID', $userID, PDO::PARAM_INT);
	$stmt->bindValue(':characterID', $characterID, PDO::PARAM_INT);
	$stmt->execute();
	$token = $stmt->fetchObject();
	if (!$token) failEsiRequest(404, 'Linked character not found');

	if (strtotime($token->tokenExpire) >= strtotime('+5 minutes')) {
		return $token->accessToken;
	}
	if (!$esi->refresh($token->refreshToken)) {
		failEsiRequest(502, 'Unable to refresh linked-character ESI authorization');
	}

	$stmt = $mysql->prepare(
		'UPDATE esi SET accessToken = :accessToken, refreshToken = :refreshToken, '
		. 'tokenExpire = :tokenExpire WHERE userID = :userID AND characterID = :characterID'
	);
	$stmt->bindValue(':accessToken', $esi->accessToken);
	$stmt->bindValue(':refreshToken', $esi->refreshToken);
	$stmt->bindValue(':tokenExpire', date('Y-m-d H:i:s', strtotime($esi->tokenExpire)));
	$stmt->bindValue(':userID', $userID, PDO::PARAM_INT);
	$stmt->bindValue(':characterID', $characterID, PDO::PARAM_INT);
	$stmt->execute();
	return $esi->accessToken;
}

$mode = isset($_POST['mode']) ? $_POST['mode'] : '';
$esi = new esi();
$result = false;

if ($mode === 'search') {
	$search = isset($_POST['search']) ? trim($_POST['search']) : '';
	$categories = isset($_POST['categories']) ? $_POST['categories'] : '';
	$allowedCategories = array('agent', 'alliance', 'character', 'constellation', 'corporation', 'faction', 'inventory_type', 'region', 'solar_system', 'station', 'structure');
	$requestedCategories = array_filter(explode(',', $categories));
	if ($search === '' || strlen($search) > 100 || !$requestedCategories
		|| array_diff($requestedCategories, $allowedCategories)) {
		failEsiRequest(400, 'Invalid search request');
	}
	$token = accountAccessToken($esi);
	$result = $esi->search(
		$token,
		$_SESSION['oauth']['subject'],
		$search,
		implode(',', $requestedCategories),
		requestBoolean('strict')
	);
} else if ($mode === 'waypoint' || $mode === 'showInfo') {
	$characterID = requestInteger('characterID');
	$targetID = requestInteger('targetID');
	$token = linkedCharacterAccessToken($mysql, $esi, $_SESSION['userID'], $characterID);
	if ($mode === 'waypoint') {
		$result = $esi->setDestination(
			$token,
			$targetID,
			requestBoolean('clear'),
			requestBoolean('beginning')
		);
	} else {
		$result = $esi->showInfo($token, $targetID);
	}
} else {
	failEsiRequest(400, 'Unknown ESI operation');
}

if ($result === false || $esi->httpCode < 200 || $esi->httpCode >= 300) {
	$status = $esi->httpCode >= 400 && $esi->httpCode < 600 ? $esi->httpCode : 502;
	failEsiRequest($status, 'ESI request failed');
}

if ($result === '' || $esi->httpCode === 204) {
	echo json_encode(array('result' => true));
} else {
	echo $result;
}
