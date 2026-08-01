import { getList, getDate, setDate, KEYS } from '../lib/storage.js';
import { json } from '../lib/http.js';
import { buildNewsletter, getUpcomingEvents } from '../lib/newsletter.js';

const SEND_INTERVAL_MS = 13 * 86400000;
const MAX_SENDS_PER_RUN = 100;

function verifyCronSecret(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}

async function sendEmail(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return { ok: false, reason: 'missing_resend_config' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, reason: 'network_error' };
  }
}

export default async function handler(req) {
  if (!verifyCronSecret(req)) {
    return json({ error: 'Unauthorized.' }, 401);
  }

  const subscribers = await getList(KEYS.subscribers);
  if (!subscribers.length) {
    return json({ ok: true, sent: 0, failed: 0, skipped: 'no_subscribers' });
  }

  const lastSent = await getDate(KEYS.lastNewsletterSent);
  if (lastSent && Date.now() - new Date(lastSent).getTime() < SEND_INTERVAL_MS) {
    return json({ ok: true, sent: 0, failed: 0, skipped: 'too_soon' });
  }

  const events = await getList(KEYS.events);
  const upcoming = getUpcomingEvents(events);
  const { html, dateRange } = buildNewsletter(process.env.NEWSLETTER_MESSAGE || '', upcoming);
  const subject = `Lost Limb Riders — Events ${dateRange}`;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let sent = 0;
  let failed = 0;
  const failures = [];

  for (const sub of subscribers) {
    if (sent + failed >= MAX_SENDS_PER_RUN) break;
    const to = String(sub.email || '').trim().toLowerCase();
    if (!emailRegex.test(to)) {
      failed++;
      failures.push({ email: to, reason: 'invalid_email' });
      continue;
    }
    const name = String(sub.name || 'Rider').replace(/[<>]/g, '').trim() || 'Rider';
    const personalized = html.replaceAll('{{NAME}}', name);
    const result = await sendEmail(to, subject, personalized);
    if (result.ok) {
      sent++;
    } else {
      failed++;
      failures.push({ email: to, reason: result.reason || `status_${result.status}` });
    }
  }

  if (sent > 0) {
    await setDate(KEYS.lastNewsletterSent, new Date().toISOString());
  }

  return json({ ok: true, sent, failed, failures: failures.slice(0, 5) });
}
