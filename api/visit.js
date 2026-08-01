import { getList, setList, KEYS, LIMITS } from '../lib/storage.js';
import { json, readBody, clean, getClientIp } from '../lib/http.js';
import { geolocateIp } from '../lib/geo.js';

export default async function handler(req) {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (req.method !== 'POST') {
    return json({ error: 'POST required.' }, 405);
  }

  const payload = await readBody(req);
  const ip = getClientIp(req);
  const geo = await geolocateIp(ip);

  const entry = {
    timestamp: new Date().toISOString(),
    ip,
    country: geo.country ?? 'N/A',
    region: geo.regionName ?? 'N/A',
    city: geo.city ?? 'N/A',
    isp: geo.isp ?? 'N/A',
    organization: geo.org ?? 'N/A',
    as: geo.as ?? 'N/A',
    proxy: geo.proxy ?? false,
    hosting: geo.hosting ?? false,
    userAgent: req.headers.get('user-agent') || 'unknown',
    language: req.headers.get('accept-language') || 'unknown',
    referrer: req.headers.get('referer') || 'direct',
    page: clean(payload.page, 300) || 'N/A',
    timezone: clean(payload.timezone, 80) || 'unknown',
    platform: clean(payload.platform, 120) || 'unknown',
    screen: clean(payload.screen, 80) || 'unknown',
    lang: clean(payload.lang, 80) || 'unknown',
    cookies: clean(payload.cookies, 20) || 'unknown',
    dnt: clean(payload.dnt, 20) || 'unknown',
  };

  const visitors = await getList(KEYS.visitors);
  visitors.unshift(entry);
  const trimmed = visitors.slice(0, LIMITS.visitors);
  await setList(KEYS.visitors, trimmed);

  return json({ ok: true }, 201);
}
