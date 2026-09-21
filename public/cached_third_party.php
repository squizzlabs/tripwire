<?php

// Verify access via Tripwire signon
if (!session_id()) session_start();

if(!isset($_SESSION['userID'])) {
	http_response_code(403);
	exit();
}

$fetch_data = array(
	'invasions' => array('url' => 'https://kybernaut.space/invasions.json', 'cache_file' => 'invasions.json', 'cache_for' => 3600),
// old thera	'thera' => array('url' => 'https://www.eve-scout.com/api/wormholes', 'cache_file' => 'thera.json', 'cache_for' => 60),
	'eve-scout-signatures' => array('url' => 'https://api.eve-scout.com/v2/public/signatures', 'cache_file' => 'thera.json', 'cache_for' => 300),
	'fw' => array('url' => 'https://esi.evetech.net/fw/systems/?datasource=tranquility', 'cache_file' => 'fw.json', 'cache_for' => 3600),
)[$_REQUEST['key']];

if(!isset($fetch_data)) { 
	http_response_code(400);
	die(json_encode(array(reason => 'Unknown cache key')));
}

// Fetch into cache if not set
$cache_file = dirname(dirname(__FILE__)) . '/cache/' . $fetch_data['cache_file'];
if (!file_exists($cache_file) || (time() - filemtime($cache_file) >= $fetch_data['cache_for'])){
	if ($_REQUEST['key'] === 'fw') {
		$etag_file = $cache_file . '.etag';
		$headers = array();
		if (file_exists($cache_file) && file_exists($etag_file)) {
			$headers[] = 'If-None-Match: '.file_get_contents($etag_file);
		}
		$etag = null;
		$curl = curl_init($fetch_data['url']);
		curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);
		curl_setopt($curl, CURLOPT_HEADERFUNCTION, function($curl, $header) use (&$etag) {
			if (stripos($header, 'ETag:') === 0) $etag = trim(substr($header, 5));
			return strlen($header);
		});
		$body = curl_exec($curl);
		$status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
		curl_close($curl);
		if ($status === 304 && file_exists($cache_file)) {
			touch($cache_file);
		} else if ($status >= 200 && $status < 300 && $body !== false) {
			file_put_contents($cache_file, $body);
			if ($etag) file_put_contents($etag_file, $etag);
			else if (file_exists($etag_file)) unlink($etag_file);
		} else {
			http_response_code(502);
			die('Unable to fetch ESI data');
		}
	} else {
		$in_resource = fopen( $fetch_data['url'], 'r');
		if($in_resource) file_put_contents($cache_file, $in_resource);
		else {
			http_response_code(500);
			die(print_r(error_get_last(), true));
		}
	}
}

header('Content-Type: application/json');
readfile($cache_file);
