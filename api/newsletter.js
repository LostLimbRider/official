import { getList, setList, KEYS, LIMITS } from '../lib/storage.js';
import { json, readBody, clean, getClientIp } from '../lib/http.js';
import { geolocateIp } from '../lib/geo.js';

export default async function handler(req) {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') {
    return json({ error: 'POST required.' }, 405);
  }

  const payload = await readBody(req);

  const name = clean(payload.name, 120);
  const email = String(payload.email ?? '').trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || !email || !emailRegex.test(email)) {
    return json({ error: 'Valid name and email are required.' }, 422);
  }

  const ip = getClientIp(req);
  const geo = await geolocateIp(ip);

  const entries = await getList(KEYS.subscribers);
  if (entries.some((e) => e.email === email)) {
    return json({ ok: true, message: 'You are already subscribed.' });
  }

  const ua = req.headers.get('user-agent') || 'unknown';
  const referer = req.headers.get('referer') || 'direct';
  const lang = req.headers.get('accept-language') || 'unknown';

  const entry = {
    name,
    email,
    signedAt: new Date().toISOString(),
    ip,
    geolocation: {
      country: geo.country ?? 'N/A',
      countryCode: geo.countryCode ?? 'N/A',
      region: geo.regionName ?? 'N/A',
      city: geo.city ?? 'N/A',
      latitude: geo.lat ?? 'N/A',
      longitude: geo.lon ?? 'N/A',
      timezone: geo.timezone ?? (clean(payload.timezone, 80) || 'N/A'),
      isp: geo.isp ?? 'N/A',
      organization: geo.org ?? 'N/A',
      as: geo.as ?? 'N/A',
      proxy: geo.proxy ?? false,
      hosting: geo.hosting ?? false,
    },
    network: {
      isp: geo.isp ?? 'N/A',
      organization: geo.org ?? 'N/A',
      as: geo.as ?? 'N/A',
      proxy: geo.proxy ?? false,
      hosting: geo.hosting ?? false,
    },
    browser: {
      userAgent: ua,
      language: lang,
      jsLang: clean(payload.lang, 80) || 'N/A',
      platform: clean(payload.platform, 120) || 'N/A',
      screen: clean(payload.screen, 80) || 'N/A',
      viewport: clean(payload.viewport, 80) || 'N/A',
      cookies: clean(payload.cookies, 20) || 'N/A',
      doNotTrack: clean(payload.dnt, 20) || 'N/A',
    },
    context: {
      landingPage: clean(payload.page, 300) || 'N/A',
      referrer: referer,
      sourceUrl: 'N/A',
    },
  };

  entries.unshift(entry);
  const trimmed = entries.slice(0, LIMITS.subscribers);
  await setList(KEYS.subscribers, trimmed);

  return json({ ok: true, message: 'Welcome to the ride. You are now subscribed.' }, 201);
}
