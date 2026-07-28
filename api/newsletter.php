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
$file = $dir . '/newsletter.json';

if (!is_dir($dir)) mkdir($dir, 0755, true);
if (!file_exists($file)) file_put_contents($file, '[]');

$payload = json_decode(file_get_contents('php://input'), true) ?: [];

$name  = trim(strip_tags((string) ($payload['name'] ?? '')));
$email = trim(strip_tags((string) ($payload['email'] ?? '')));
$name  = preg_replace('/\s+/', ' ', $name);
$name  = substr($name, 0, 120);
$email = strtolower($email);

if ($name === '' || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['error' => 'Valid name and email are required.']);
    exit;
}

$handle = fopen($file, 'c+');
if (!$handle) {
    http_response_code(500);
    echo json_encode(['error' => 'Storage not writable.']);
    exit;
}
flock($handle, LOCK_EX);
$contents = stream_get_contents($handle);
$entries = json_decode($contents ?: '[]', true);
if (!is_array($entries)) $entries = [];

foreach ($entries as $existing) {
    if (isset($existing['email']) && $existing['email'] === $email) {
        flock($handle, LOCK_UN);
        fclose($handle);
        echo json_encode(['ok' => true, 'message' => 'You are already subscribed.']);
        exit;
    }
}

// --- Server-side visitor context ---

$ip       = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ua       = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
$referer  = $_SERVER['HTTP_REFERER'] ?? 'direct';
$lang     = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? 'unknown';
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$fullUrl  = $protocol . '://' . ($_SERVER['HTTP_HOST'] ?? 'unknown') . ($_SERVER['REQUEST_URI'] ?? '/');
$timestamp = gmdate('Y-m-d H:i:s') . ' UTC';

// Geolocation from ip-api.com
$geo = ['status' => 'unavailable'];
$geoData = @file_get_contents("http://ip-api.com/json/{$ip}?fields=status,country,countryCode,regionName,city,lat,lon,timezone,isp,org,as,proxy,hosting");
if ($geoData) {
    $decoded = json_decode($geoData, true);
    if ($decoded && isset($decoded['status']) && $decoded['status'] === 'success') {
        $geo = $decoded;
    }
}

// --- Client-side device data (sent from frontend) ---
$clientScreen  = trim(strip_tags((string) ($payload['screen'] ?? '')));
$clientTz      = trim(strip_tags((string) ($payload['timezone'] ?? '')));
$clientLang    = trim(strip_tags((string) ($payload['lang'] ?? '')));
$clientPlatform = trim(strip_tags((string) ($payload['platform'] ?? '')));
$clientCookies  = trim(strip_tags((string) ($payload['cookies'] ?? '')));
$clientDnt      = trim(strip_tags((string) ($payload['dnt'] ?? '')));
$clientPage     = trim(strip_tags((string) ($payload['page'] ?? '')));
$clientViewport = trim(strip_tags((string) ($payload['viewport'] ?? '')));

$entry = [
    'name'      => $name,
    'email'     => $email,
    'signedAt'  => gmdate('c'),
    'ip'        => $ip,
    'geolocation' => [
        'country'     => $geo['country']     ?? 'N/A',
        'countryCode' => $geo['countryCode'] ?? 'N/A',
        'region'      => $geo['regionName']  ?? 'N/A',
        'city'        => $geo['city']        ?? 'N/A',
        'latitude'    => $geo['lat']         ?? 'N/A',
        'longitude'   => $geo['lon']         ?? 'N/A',
        'timezone'    => $geo['timezone']    ?? $clientTz ?: 'N/A',
        'isp'         => $geo['isp']         ?? 'N/A',
        'organization' => $geo['org']        ?? 'N/A',
        'as'          => $geo['as']          ?? 'N/A',
        'proxy'       => $geo['proxy']       ?? false,
        'hosting'     => $geo['hosting']     ?? false,
    ],
    'network' => [
        'isp'         => $geo['isp']    ?? 'N/A',
        'organization' => $geo['org']   ?? 'N/A',
        'as'          => $geo['as']     ?? 'N/A',
        'proxy'       => $geo['proxy']  ?? false,
        'hosting'     => $geo['hosting'] ?? false,
    ],
    'browser' => [
        'userAgent' => $ua,
        'language'  => $lang,
        'jsLang'    => $clientLang    ?: 'N/A',
        'platform'  => $clientPlatform ?: 'N/A',
        'screen'    => $clientScreen  ?: 'N/A',
        'viewport'  => $clientViewport ?: 'N/A',
        'cookies'   => $clientCookies ?: 'N/A',
        'doNotTrack' => $clientDnt    ?: 'N/A',
    ],
    'context' => [
        'landingPage' => $clientPage  ?: $fullUrl,
        'referrer'    => $referer,
        'sourceUrl'   => $fullUrl,
    ],
];

array_unshift($entries, $entry);
$entries = array_slice($entries, 0, 5000);

ftruncate($handle, 0);
rewind($handle);
fwrite($handle, json_encode($entries, JSON_PRETTY_PRINT));
fflush($handle);
flock($handle, LOCK_UN);
fclose($handle);

echo json_encode(['ok' => true, 'message' => 'Welcome to the ride. You are now subscribed.']);
