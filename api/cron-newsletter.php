<?php
/**
 * Cron Newsletter Sender
 *
 * Called by a cron job (e.g. every 2 weeks via crontab or a scheduler).
 * Builds the newsletter from template + events, sends to all subscribers.
 *
 * Usage: php api/cron-newsletter.php
 *   Optionally set: NEWSLETTER_MESSAGE env var for a custom intro message.
 *
 * Requires: GUESTBOOK_ADMIN_KEY env var (for admin.php endpoint internally).
 *
 * Crontab example (every other Monday at 9 AM UTC):
 *   0 9 1-7,15-21 * 1  php /path/to/api/cron-newsletter.php >> /path/to/data/cron-newsletter.log 2>&1
 */

$dir = __DIR__ . '/../data';

$adminKey = getenv('GUESTBOOK_ADMIN_KEY') ?: '';
$host     = $_SERVER['HTTP_HOST'] ?? 'localhost';
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$baseUrl  = $protocol . '://' . $host;

function log_msg($msg) {
    echo '[' . gmdate('Y-m-d H:i:s') . ' UTC] ' . $msg . "\n";
}

// Load subscribers
$subsFile = $dir . '/newsletter.json';
if (!file_exists($subsFile)) {
    log_msg('No newsletter.json found. Nothing to send.');
    exit;
}
$subs = json_decode(file_get_contents($subsFile) ?: '[]', true);
if (!is_array($subs) || empty($subs)) {
    log_msg('No subscribers. Nothing to send.');
    exit;
}

log_msg('Starting newsletter send to ' . count($subs) . ' subscribers.');

// Load events
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
log_msg('Found ' . count($events) . ' upcoming events.');

// Load template
$templateFile = $dir . '/newsletter-template.html';
if (!file_exists($templateFile)) {
    log_msg('ERROR: newsletter-template.html not found. Aborting.');
    exit;
}
$template = file_get_contents($templateFile);

// Build events HTML
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
$userMessage = getenv('NEWSLETTER_MESSAGE') ?: '';
if ($userMessage !== '') {
    $userMessage = '<p>' . htmlspecialchars($userMessage) . '</p>';
} else {
    $userMessage = '<p>Here is your biweekly roundup from Lost Limb Riders. Grab your helmets and check out what is coming up.</p>';
}

$body = str_replace('{{DATE_RANGE}}', $dateRange, $template);
$body = str_replace('{{EVENTS_LIST}}', $eventsHtml, $body);
$body = str_replace('{{MESSAGE}}', $userMessage, $body);

$subject = 'Lost Limb Riders — Events ' . $dateRange;
$from    = 'Lost Limb Riders <noreply@lostlimbikers.com>';

$sent  = 0;
$failed = 0;

foreach ($subs as $sub) {
    $to      = $sub['email'] ?? '';
    $subName = $sub['name'] ?? 'Rider';
    $name    = trim(strip_tags($subName));

    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        log_msg("Skipping invalid email: {$to}");
        $failed++;
        continue;
    }

    $personalized = str_replace('{{NAME}}', htmlspecialchars($name), $body);

    $headers  = "From: {$from}\r\n";
    $headers .= "Reply-To: info@lostlimbikers.com\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "List-Unsubscribe: <mailto:unsubscribe@lostlimbikers.com?subject=unsubscribe>\r\n";

    $result = @mail($to, $subject, $personalized, $headers);
    if ($result) {
        $sent++;
    } else {
        log_msg("Failed to send to: {$to}");
        $failed++;
    }
}

log_msg("Newsletter send complete. Sent: {$sent}, Failed: {$failed}");
