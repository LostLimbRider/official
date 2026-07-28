<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$dir      = __DIR__ . '/../data';
$adminKey = getenv('GUESTBOOK_ADMIN_KEY') ?: '';

function send_json($payload, $status = 200) {
    http_response_code($status);
    echo json_encode($payload, JSON_PRETTY_PRINT);
    exit;
}

function require_admin($adminKey) {
    $key = $_GET['key'] ?? $_SERVER['HTTP_X_ADMIN_KEY'] ?? '';
    if (!$adminKey || !hash_equals($adminKey, $key)) {
        send_json(['error' => 'Admin access required.'], 403);
    }
}

require_admin($adminKey);

$action = $_GET['action'] ?? 'stats';

// STATS — summary numbers
if ($action === 'stats') {
    $visitors = 0;
    $countries = [];
    $today = 0;
    $todayStr = gmdate('Y-m-d');
    $browserStats = ['Chrome' => 0, 'Firefox' => 0, 'Safari' => 0, 'Edge' => 0, 'Other' => 0];

    $logFile = $dir . '/visitors.log';
    if (file_exists($logFile)) {
        $content = file_get_contents($logFile);
        $entries = explode(str_repeat('=', 72), $content);
        foreach ($entries as $entry) {
            $entry = trim($entry);
            if (!$entry) continue;
            $visitors++;

            preg_match('/^\s*(\d{4}-\d{2}-\d{2})\s/', $entry, $dateMatch);
            if (isset($dateMatch[1]) && $dateMatch[1] === $todayStr) {
                $today++;
            }

            preg_match('/Country:\s*(.+)/', $entry, $countryMatch);
            if (isset($countryMatch[1])) {
                $c = trim($countryMatch[1]);
                if ($c !== 'N/A') {
                    $countries[$c] = ($countries[$c] ?? 0) + 1;
                }
            }

            preg_match('/User Agent:\s*(.+)/', $entry, $uaMatch);
            if (isset($uaMatch[1])) {
                $ua = $uaMatch[1];
                if (stripos($ua, 'Edg') !== false) $browserStats['Edge']++;
                elseif (stripos($ua, 'Chrome') !== false) $browserStats['Chrome']++;
                elseif (stripos($ua, 'Firefox') !== false) $browserStats['Firefox']++;
                elseif (stripos($ua, 'Safari') !== false) $browserStats['Safari']++;
                else $browserStats['Other']++;
            }
        }
    }

    arsort($countries);
    $topCountries = array_slice($countries, 0, 10, true);

    $subsFile = $dir . '/newsletter.json';
    $subscribers = 0;
    if (file_exists($subsFile)) {
        $subs = json_decode(file_get_contents($subsFile) ?: '[]', true);
        $subscribers = is_array($subs) ? count($subs) : 0;
    }

    send_json([
        'totalVisits'   => $visitors,
        'todayVisits'   => $today,
        'subscribers'   => $subscribers,
        'topCountries'  => $topCountries,
        'browserStats'  => $browserStats,
    ]);
}

// VISITORS — full log (paginated)
if ($action === 'visitors') {
    $page  = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 25)));
    $logFile = $dir . '/visitors.log';

    if (!file_exists($logFile)) {
        send_json(['visitors' => [], 'total' => 0, 'page' => $page, 'pages' => 0]);
    }

    $content = file_get_contents($logFile);
    $rawEntries = explode(str_repeat('=', 72), $content);
    $entries = [];
    foreach ($rawEntries as $raw) {
        $raw = trim($raw);
        if (!$raw) continue;

        $entry = [];
        preg_match('/^\s*(\d{4}-\d{2}-\d{2}\s+[\d:]+)\s+UTC/', $raw, $m);
        $entry['timestamp'] = isset($m[1]) ? trim($m[1]) . ' UTC' : 'unknown';

        preg_match('/IP Address:\s*(.+)/', $raw, $m);
        $entry['ip'] = isset($m[1]) ? trim($m[1]) : 'unknown';

        preg_match('/Country:\s*(.+)/', $raw, $m);
        $entry['country'] = isset($m[1]) ? trim($m[1]) : 'N/A';

        preg_match('/Region:\s*(.+)/', $raw, $m);
        $entry['region'] = isset($m[1]) ? trim($m[1]) : 'N/A';

        preg_match('/City:\s*(.+)/', $raw, $m);
        $entry['city'] = isset($m[1]) ? trim($m[1]) : 'N/A';

        preg_match('/User Agent:\s*(.+)/', $raw, $m);
        $entry['userAgent'] = isset($m[1]) ? trim($m[1]) : 'unknown';

        preg_match('/Page:\s*(.+)/', $raw, $m);
        $entry['page'] = isset($m[1]) ? trim($m[1]) : 'unknown';

        preg_match('/ISP:\s*(.+)/', $raw, $m);
        $entry['isp'] = isset($m[1]) ? trim($m[1]) : 'N/A';

        $entries[] = $entry;
    }

    $entries = array_reverse($entries);
    $total = count($entries);
    $pages = (int)ceil($total / $limit);
    $slice = array_slice($entries, ($page - 1) * $limit, $limit);

    send_json([
        'visitors' => $slice,
        'total'    => $total,
        'page'     => $page,
        'pages'    => $pages,
    ]);
}

// SUBSCRIBERS — list all
if ($action === 'subscribers') {
    $subsFile = $dir . '/newsletter.json';
    if (!file_exists($subsFile)) {
        send_json(['subscribers' => [], 'total' => 0]);
    }
    $subs = json_decode(file_get_contents($subsFile) ?: '[]', true);
    $subs = is_array($subs) ? $subs : [];
    send_json(['subscribers' => $subs, 'total' => count($subs)]);
}

// SEND NEWSLETTER — build from template + events, return HTML body
if ($action === 'send-newsletter' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = json_decode(file_get_contents('php://input'), true) ?: [];
    $userMessage = trim($payload['message'] ?? '');

    $templateFile = $dir . '/newsletter-template.html';
    if (!file_exists($templateFile)) {
        send_json(['error' => 'Newsletter template not found.'], 404);
    }
    $template = file_get_contents($templateFile);

    $eventsFile = $dir . '/events.json';
    $events = [];
    if (file_exists($eventsFile)) {
        $allEvents = json_decode(file_get_contents($eventsFile) ?: '[]', true);
        $now = gmdate('Y-m-d');
        $future = array_filter($allEvents, fn($e) => ($e['date'] ?? '') >= $now);
        $future = array_values($future);
        usort($future, fn($a, $b) => strcmp($a['date'] ?? '', $b['date'] ?? ''));
        $events = array_slice($future, 0, 8);
    }

    $eventsHtml = '';
    if (empty($events)) {
        $eventsHtml = '<p style="color:#b7b7b7;font-style:italic;">No upcoming events right now. Stay tuned — something is always around the corner.</p>';
    } else {
        $catColors = [
            'ride'       => '#22c55e',
            'fundraiser' => '#f59e0b',
            'community'  => '#3b82f6',
            'meeting'    => '#a855f7',
            'rally'      => '#ef4444',
        ];
        $eventsHtml = '<div style="margin:20px 0;">';
        foreach ($events as $ev) {
            $cat = $ev['category'] ?? 'community';
            $color = $catColors[$cat] ?? '#3b82f6';
            $dateStr = $ev['date'] ?? '';
            if (!empty($ev['endDate']) && $ev['endDate'] !== $ev['date']) {
                $dateStr .= ' — ' . $ev['endDate'];
            }
            $eventsHtml .= '<div style="background:#171717;border-left:4px solid ' . $color . ';padding:14px 18px;margin-bottom:12px;border-radius:6px;">';
            $eventsHtml .= '<div style="font-weight:700;color:#fff;font-size:16px;">' . htmlspecialchars($ev['title'] ?? 'Untitled') . '</div>';
            $eventsHtml .= '<div style="color:#b7b7b7;font-size:13px;margin-top:4px;">' . htmlspecialchars($dateStr);
            if (!empty($ev['time'])) $eventsHtml .= ' · ' . htmlspecialchars($ev['time']);
            if (!empty($ev['location'])) $eventsHtml .= ' · ' . htmlspecialchars($ev['location']);
            $eventsHtml .= '</div>';
            if (!empty($ev['description'])) {
                $desc = htmlspecialchars(substr($ev['description'], 0, 150));
                $eventsHtml .= '<div style="color:#999;font-size:13px;margin-top:6px;">' . $desc . (strlen($ev['description']) > 150 ? '…' : '') . '</div>';
            }
            $eventsHtml .= '</div>';
        }
        $eventsHtml .= '</div>';
    }

    $dateRange = gmdate('M j') . ' – ' . gmdate('M j, Y', strtotime('+2 weeks'));
    if ($userMessage === '') {
        $userMessage = '<p>Here is your biweekly roundup from Lost Limb Riders. Grab your helmets and check out what is coming up.</p>';
    } else {
        $userMessage = '<p>' . htmlspecialchars($userMessage) . '</p>';
    }

    $body = str_replace('{{DATE_RANGE}}', $dateRange, $template);
    $body = str_replace('{{EVENTS_LIST}}', $eventsHtml, $body);
    $body = str_replace('{{MESSAGE}}', $userMessage, $body);

    send_json(['html' => $body, 'eventCount' => count($events)]);
}

send_json(['error' => 'Unsupported action.'], 404);
