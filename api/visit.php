<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST required.']);
    exit;
}

$dir  = __DIR__ . '/../data';
$file = $dir . '/visitors.log';

if (!is_dir($dir)) mkdir($dir, 0755, true);

$ip       = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ua       = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
$referer  = $_SERVER['HTTP_REFERER'] ?? 'direct';
$lang     = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? 'unknown';
$method   = $_SERVER['REQUEST_METHOD'];
$uri      = $_SERVER['REQUEST_URI'] ?? '/';
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$fullUrl  = $protocol . '://' . ($_SERVER['HTTP_HOST'] ?? 'unknown') . $uri;
$timestamp = gmdate('Y-m-d H:i:s') . ' UTC';

$screen  = isset($_POST['screen']) ? $_POST['screen'] : 'unknown';
$tz      = isset($_POST['timezone']) ? $_POST['timezone'] : 'unknown';
$langJS  = isset($_POST['lang']) ? $_POST['lang'] : 'unknown';
$platform = isset($_POST['platform']) ? $_POST['platform'] : 'unknown';
$cookies = isset($_POST['cookies']) ? $_POST['cookies'] : 'unknown';
$doNotTrack = isset($_POST['dnt']) ? $_POST['dnt'] : 'unknown';
$referrerPage = isset($_POST['page']) ? $_POST['page'] : 'unknown';

$geo = ['status' => 'unavailable'];
$geoData = @file_get_contents("http://ip-api.com/json/{$ip}?fields=status,country,regionName,city,lat,lon,isp,org,as,proxy,hosting");
if ($geoData) {
    $decoded = json_decode($geoData, true);
    if ($decoded && isset($decoded['status']) && $decoded['status'] === 'success') {
        $geo = $decoded;
    }
}

$separator = str_repeat('=', 72) . "\n";
$entry  = $separator;
$entry .= "  VISITOR LOG ENTRY\n";
$entry .= "  {$timestamp}\n";
$entry .= $separator;
$entry .= "\n";
$entry .= "  [NETWORK]\n";
$entry .= "  IP Address:   {$ip}\n";
$entry .= "  ISP:          " . ($geo['isp'] ?? 'N/A') . "\n";
$entry .= "  Organization: " . ($geo['org'] ?? 'N/A') . "\n";
$entry .= "  AS:           " . ($geo['as'] ?? 'N/A') . "\n";
$entry .= "  Proxy:        " . (($geo['proxy'] ?? false) ? 'Yes' : 'No') . "\n";
$entry .= "  Hosting:      " . (($geo['hosting'] ?? false) ? 'Yes' : 'No') . "\n";
$entry .= "\n";
$entry .= "  [LOCATION]\n";
$entry .= "  Country:      " . ($geo['country'] ?? 'N/A') . "\n";
$entry .= "  Region:       " . ($geo['regionName'] ?? 'N/A') . "\n";
$entry .= "  City:         " . ($geo['city'] ?? 'N/A') . "\n";
$entry .= "  Latitude:     " . ($geo['lat'] ?? 'N/A') . "\n";
$entry .= "  Longitude:    " . ($geo['lon'] ?? 'N/A') . "\n";
$entry .= "\n";
$entry .= "  [BROWSER]\n";
$entry .= "  User Agent:   {$ua}\n";
$entry .= "  Language:     {$lang}\n";
$entry .= "  JS Lang:      {$langJS}\n";
$entry .= "  Platform:     {$platform}\n";
$entry .= "  Screen:       {$screen}\n";
$entry .= "  Cookies:      {$cookies}\n";
$entry .= "  Do Not Track: {$doNotTrack}\n";
$entry .= "\n";
$entry .= "  [REQUEST]\n";
$entry .= "  Method:       {$method}\n";
$entry .= "  URL:          {$fullUrl}\n";
$entry .= "  Referrer:     {$referer}\n";
$entry .= "  Page:         {$referrerPage}\n";
$entry .= "  Timezone:     {$tz}\n";
$entry .= "\n";

file_put_contents($file, $entry, FILE_APPEND | LOCK_EX);

echo json_encode(['ok' => true]);
