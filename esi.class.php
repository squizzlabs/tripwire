<?php

require __DIR__ . '/vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\JWK;

class esi {
	// https://sisilogin.testeveonline.com
	private static $loginUrl = 'https://login.eveonline.com/v2/oauth';
	private static $jwksUrl = 'https://login.eveonline.com/oauth/jwks';
	private static $esiUrl = 'https://esi.evetech.net';
	private static $responseCache = array();
	public $lastError = null;
	public $httpCode = null;
	public $characterID = null;
	public $characterName = null;
	public $accessToken = null;
	public $refreshToken = null;
	public $tokenExpire = null;

	private function getAPI($url, $headers = array(), $params = false, $method = null) {
		$cacheKey = (!$params && $method !== 'POST' && strpos($url, self::$esiUrl.'/') === 0)
			? hash('sha256', $url."\n".implode("\n", $headers)) : null;
		$cache =& self::$responseCache;
		if ($cacheKey !== null && session_status() === PHP_SESSION_ACTIVE) {
			if (!isset($_SESSION['esiResponseCache'])) $_SESSION['esiResponseCache'] = array();
			$cache =& $_SESSION['esiResponseCache'];
		}
		$cached = $cacheKey !== null && isset($cache[$cacheKey]) ? $cache[$cacheKey] : null;
		if ($cached && isset($cached['etag'])) $headers[] = 'If-None-Match: '.$cached['etag'];
		$etag = null;
		$curl = curl_init();
		curl_setopt($curl, CURLOPT_URL, $url);
		curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);
		curl_setopt($curl, CURLOPT_HEADERFUNCTION, function($curl, $header) use (&$etag) {
			if (stripos($header, 'ETag:') === 0) $etag = trim(substr($header, 5));
			return strlen($header);
		});
		if ($method === 'POST') {
			curl_setopt($curl, CURLOPT_POST, true);
		}

		if ($params) {
			curl_setopt($curl, CURLOPT_POST, true);
			if(is_array($params)){
				curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($params));
			}else{
				curl_setopt($curl, CURLOPT_POSTFIELDS, $params);
			}
			
		}

		curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
		// curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
		curl_setopt($curl, CURLOPT_USERAGENT, USER_AGENT);

		$result = curl_exec($curl);
		$this->httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);

		if ($result === false) {
			$this->lastError = curl_error($curl);
		}
		curl_close($curl);

		if ($this->httpCode === 304) {
			if ($cached) {
				$this->httpCode = 200;
				return $cached['body'];
			}
			$this->lastError = 'ESI returned 304 without a cached response';
			return false;
		}
		if ($cacheKey !== null && $this->httpCode >= 200 && $this->httpCode < 300) {
			if ($etag && $result !== false && strlen($result) <= 262144) {
				unset($cache[$cacheKey]);
				$cache[$cacheKey] = array('etag' => $etag, 'body' => $result);
				if (count($cache) > 50) array_shift($cache);
			} else {
				unset($cache[$cacheKey]);
			}
		}

		return $result;
	}

	public function getJWKS() {
		$result = $this->getAPI(self::$jwksUrl);

		if ($result === false) {
			return false;
		}

		$response = json_decode($result);

		if (!empty($response)) {
			foreach ($response->keys as $key) {
				$jwks['keys'][] = (array) $key;
			}
		} else {
			$this->lastError = 'Could not load JWK data';
			return false;
		}

		return $jwks;
	}

	public function validateJWT($token) {
		if ( $jwks = $this->getJWKS() ) {
			JWT::$leeway = 60;
			$jwt = JWT::decode($token, JWK::parseKeySet($jwks));
			$url = parse_url(self::$loginUrl);
			$issuer = array(
				$url['host'],
				$url['scheme']."://".$url['host']
			);
			if (!in_array($jwt->iss,$issuer)) {
				$this->lastError = 'Could not validate the authenticity of the access token';
				return false;
			}
			return $jwt;
		} else {
			return false;
		}
	}

	public function login($scope = NULL, $state = 'evessologin') {
		$params = array(
			'response_type' => 'code',
			'redirect_uri' => EVE_SSO_REDIRECT,
			'client_id' => EVE_SSO_CLIENT,
			'scope' => $scope,
			'state' => $state
		);

		header('Location: '. self::$loginUrl . '/authorize?' . http_build_query($params), true, 302);
	}

	public function authenticate($code) {
		$headers = array('Authorization: Basic '.base64_encode(EVE_SSO_CLIENT.':'.EVE_SSO_SECRET));
		$params = array(
			'grant_type' => 'authorization_code',
			'code' => $code
		);

		$result = $this->getAPI(self::$loginUrl.'/token', $headers, $params);

		if ($result === false) {
			return false;
		}

		$response = json_decode($result);

		if (!isset($response->access_token)) {
			$this->lastError = 'Invalid reponse from ESI during token authentication. ' . $result;
			return false;
		}

		if ( $jwt = $this->validateJWT( $response->access_token ) ) {
			$this->accessToken = $response->access_token;
			$this->tokenExpire = date('Y-m-d H:i:s', time() + $response->expires_in);
			$this->refreshToken = $response->refresh_token;
			$this->characterID = (int) explode(':', $jwt->sub)[2];
			$this->characterName = $jwt->name;
		} else {
			return false;
		}

		return true;
	}

	public function refresh($refreshToken) {
		$headers = array('Authorization: Basic '.base64_encode(EVE_SSO_CLIENT.':'.EVE_SSO_SECRET));
		$params = array(
			'grant_type' => 'refresh_token',
			'refresh_token' => $refreshToken
		);

		$result = $this->getAPI(self::$loginUrl.'/token', $headers, $params);

		if ($result === false) {
			return false;
		}

		$response = json_decode($result);
		if (!isset($response->access_token)) {
			$this->lastError = 'Invalid reponse from ESI during token refresh. ' . $result;
			return false;
		}

		$this->accessToken = $response->access_token;
		$this->tokenExpire = date('Y-m-d H:i:sP', time() + $response->expires_in);
		$this->refreshToken = isset($response->refresh_token)
			? $response->refresh_token
			: $refreshToken;

		return true;
	}

	public function search($accessToken, $characterID, $search, $categories, $strict) {
		$query = http_build_query(array(
			'search' => $search,
			'categories' => $categories,
			'strict' => $strict ? 'true' : 'false'
		));
		return $this->getAPI(
			self::$esiUrl.'/characters/'.intval($characterID).'/search/?'.$query,
			$this->authenticatedHeaders($accessToken)
		);
	}

	public function setDestination($accessToken, $destinationID, $clear, $beginning) {
		$query = http_build_query(array(
			'destination_id' => intval($destinationID),
			'clear_other_waypoints' => $clear ? 'true' : 'false',
			'add_to_beginning' => $beginning ? 'true' : 'false'
		));
		return $this->getAPI(
			self::$esiUrl.'/ui/autopilot/waypoint/?'.$query,
			$this->authenticatedHeaders($accessToken),
			false,
			'POST'
		);
	}

	public function showInfo($accessToken, $targetID) {
		$query = http_build_query(array('target_id' => intval($targetID)));
		return $this->getAPI(
			self::$esiUrl.'/ui/openwindow/information/?'.$query,
			$this->authenticatedHeaders($accessToken),
			false,
			'POST'
		);
	}

	private function authenticatedHeaders($accessToken) {
		return array(
			'Accept: application/json',
			'Authorization: Bearer '.$accessToken,
			'X-Compatibility-Date: 2026-09-15'
		);
	}

	public function getCharacter($characterID) {
		$result = $this->getAPI(self::$esiUrl.'/characters/'.$characterID.'/');

		if ($result === false || !json_decode($result) || !isset(json_decode($result)->name)) {
			return false;
		}

		return json_decode($result);
	}

	public function getCorporation($corporationID) {
		$result = $this->getAPI(self::$esiUrl.'/v4/corporations/'.$corporationID.'/');

		if ($result === false || !json_decode($result) || !isset(json_decode($result)->name)) {
			return false;
		}

		return json_decode($result);
	}

	public function getAlliance($allianceID) {
		$result = $this->getAPI(self::$esiUrl.'/v4/alliances/'.$allianceID.'/');

		if ($result === false || !json_decode($result) || !isset(json_decode($result)->name)) {
			return false;
		}

		return json_decode($result);
	}
	
	public function getAffilitation($characterIDs){
		if(!is_array($characterIDs))
		{
			$characterIDs = array($characterIDs);
		}

		$result = $this->getAPI(self::$esiUrl . "/v2/characters/affiliation/", array(), json_encode($characterIDs));

		$data = json_decode($result);

		$parsed = array();
		foreach($data as $affil){
			$parsed[$affil->character_id] = $affil;
		}
		return $parsed;
	}

	public function getNames($ids){
		if(!is_array($ids))
		{
			$ids = array($ids);
		}
		$result = $this->getAPI(self::$esiUrl.'/v3/universe/names', array(), json_encode($ids));
		$data = json_decode($result);
		$parsed = array();
		foreach($data as $name)
		{
			$parsed[$name->id] = $name;
		}
		return $parsed;
	}

	public function getCharacterRoles($characterID) {
		$headers = array('Authorization: Bearer '. $this->accessToken);
		$result = $this->getAPI(self::$esiUrl.'/v2/characters/'.$characterID.'/roles/', $headers);

		if ($result === false) {
			return false;
		}

		return json_decode($result);
	}

	public function getCharacterTitles($characterID) {
		$headers = array('Authorization: Bearer '. $this->accessToken);
		$result = $this->getAPI(self::$esiUrl.'/v1/characters/'.$characterID.'/titles/', $headers);

		if ($result === false) {
			return false;
		}

		// convert array of objects into just an array of titles
		$titles = [];
		foreach (json_decode($result) AS $title) {
			$titles[] = $title->name;
		}

		return $titles;
	}

	public function getJumps() {
		$result = $this->getAPI(self::$esiUrl.'/v1/universe/system_jumps/');

		if ($result === false) {
			return false;
		}

		return json_decode($result);
	}

	public function getKills() {
		$result = $this->getAPI(self::$esiUrl.'/v2/universe/system_kills/');

		if ($result === false) {
			return false;
		}

		return json_decode($result);
	}
}

?>
