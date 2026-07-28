<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$dir       = __DIR__ . '/../data';
$file      = $dir . '/events.json';
$adminKey  = getenv('GUESTBOOK_ADMIN_KEY') ?: '';

if (!is_dir($dir)) mkdir($dir, 0755, true);
if (!file_exists($file)) file_put_contents($file, '[]');

function send_json($payload, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($payload, JSON_PRETTY_PRINT);
    exit;
}

function read_events($file) {
    $raw = file_get_contents($file);
    $events = json_decode($raw ?: '[]', true);
    return is_array($events) ? $events : [];
}

function write_events($file, $events) {
    $handle = fopen($file, 'c+');
    if (!$handle) send_json(['error' => 'Storage not writable.'], 500);
    flock($handle, LOCK_EX);
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($events, JSON_PRETTY_PRINT));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
}

function require_admin($adminKey) {
    if (!$adminKey || !hash_equals($adminKey, $_GET['key'] ?? '')) {
        send_json(['error' => 'Admin access required.'], 403);
    }
}

function clean($value, $limit) {
    $value = trim(strip_tags((string) $value));
    $value = preg_replace('/\s+/', ' ', $value);
    return substr($value, 0, $limit);
}

$action = $_GET['action'] ?? 'list';

// LIST — public, no auth needed
if ($action === 'list') {
    send_json(['events' => read_events($file)]);
}

// ADD — admin only
if ($action === 'add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin($adminKey);
    $payload = json_decode(file_get_contents('php://input'), true) ?: [];
    $event = [
        'id'          => 'ev-' . time() . '-' . bin2hex(random_bytes(4)),
        'title'       => clean($payload['title'] ?? '', 200),
        'date'        => clean($payload['date'] ?? '', 10),
        'endDate'     => clean($payload['endDate'] ?? '', 10),
        'time'        => clean($payload['time'] ?? '', 5),
        'category'    => clean($payload['category'] ?? 'community', 30),
        'location'    => clean($payload['location'] ?? '', 200),
        'description' => clean($payload['description'] ?? '', 2000),
        'createdAt'   => gmdate('c'),
    ];
    if ($event['title'] === '' || $event['date'] === '') {
        send_json(['error' => 'Title and date are required.'], 422);
    }
    $events = read_events($file);
    array_unshift($events, $event);
    write_events($file, $events);
    send_json(['event' => $event], 201);
}

// UPDATE — admin only
if ($action === 'update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin($adminKey);
    $payload = json_decode(file_get_contents('php://input'), true) ?: [];
    $id = $payload['id'] ?? '';
    if (!$id) send_json(['error' => 'Event ID required.'], 422);

    $events = read_events($file);
    $idx = null;
    foreach ($events as $i => $e) {
        if ($e['id'] === $id) { $idx = $i; break; }
    }
    if ($idx === null) send_json(['error' => 'Event not found.'], 404);

    $fields = ['title', 'date', 'endDate', 'time', 'category', 'location', 'description'];
    $limits = [200, 10, 10, 5, 30, 200, 2000];
    foreach ($fields as $i => $f) {
        if (isset($payload[$f])) {
            $events[$idx][$f] = clean($payload[$f], $limits[$i]);
        }
    }
    $events[$idx]['updatedAt'] = gmdate('c');
    write_events($file, $events);
    send_json(['event' => $events[$idx]]);
}

// DELETE — admin only
if ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    require_admin($adminKey);
    $payload = json_decode(file_get_contents('php://input'), true) ?: [];
    $id = $payload['id'] ?? '';
    if (!$id) send_json(['error' => 'Event ID required.'], 422);

    $events = read_events($file);
    $filtered = array_values(array_filter($events, fn($e) => $e['id'] !== $id));
    if (count($filtered) === count($events)) send_json(['error' => 'Event not found.'], 404);
    write_events($file, $filtered);
    send_json(['ok' => true]);
}

send_json(['error' => 'Unsupported action.'], 404);
