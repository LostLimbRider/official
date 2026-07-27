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

$entry = [
    'name'    => $name,
    'email'   => $email,
    'signedAt' => gmdate('c'),
    'ip'      => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
];

array_unshift($entries, $entry);
$entries = array_slice($entries, 0, 2000);

ftruncate($handle, 0);
rewind($handle);
fwrite($handle, json_encode($entries, JSON_PRETTY_PRINT));
fflush($handle);
flock($handle, LOCK_UN);
fclose($handle);

echo json_encode(['ok' => true, 'message' => 'Welcome to the ride. You are now subscribed.']);
