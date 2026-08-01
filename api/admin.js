import { getList, KEYS } from '../lib/storage.js';
import { json, readBody, isAdmin, getParam } from '../lib/http.js';
import { buildNewsletter, getUpcomingEvents } from '../lib/newsletter.js';

function getBrowserStats(visitors) {
  const stats = { Chrome: 0, Firefox: 0, Safari: 0, Edge: 0, Other: 0 };
  for (const v of visitors) {
    const ua = String(v.userAgent || '');
    if (ua.includes('Edg')) stats.Edge++;
    else if (ua.includes('Chrome')) stats.Chrome++;
    else if (ua.includes('Firefox')) stats.Firefox++;
    else if (ua.includes('Safari')) stats.Safari++;
    else stats.Other++;
  }
  return stats;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return json({}, 204);
  if (!isAdmin(req)) {
    return json({ error: 'Admin access required.' }, 403);
  }

  const action = getParam(req, 'action') || 'stats';

  if (action === 'stats') {
    const visitors = await getList(KEYS.visitors);
    const subscribers = await getList(KEYS.subscribers);

    const todayStr = new Date().toISOString().slice(0, 10);
    let today = 0;
    const countries = {};
    for (const v of visitors) {
      if ((v.timestamp || '').slice(0, 10) === todayStr) today++;
      const c = v.country;
      if (c && c !== 'N/A') countries[c] = (countries[c] || 0) + 1;
    }

    const topCountries = Object.entries(countries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((acc, [k, n]) => {
        acc[k] = n;
        return acc;
      }, {});

    return json({
      totalVisits: visitors.length,
      todayVisits: today,
      subscribers: subscribers.length,
      topCountries,
      browserStats: getBrowserStats(visitors),
    });
  }

  if (action === 'visitors') {
    const visitors = await getList(KEYS.visitors);
    const page = Math.max(1, parseInt(getParam(req, 'page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(getParam(req, 'limit') || '25', 10) || 25));
    const total = visitors.length;
    const pages = Math.ceil(total / limit);
    const slice = visitors.slice((page - 1) * limit, page * limit);
    return json({ visitors: slice, total, page, pages });
  }

  if (action === 'subscribers') {
    const subscribers = await getList(KEYS.subscribers);
    return json({ subscribers, total: subscribers.length });
  }

  if (action === 'send-newsletter' && req.method === 'POST') {
    const payload = await readBody(req);
    const events = await getList(KEYS.events);
    const upcoming = getUpcomingEvents(events);
    const { html, eventCount } = buildNewsletter(String(payload.message || '').trim(), upcoming);
    return json({ html, eventCount });
  }

  return json({ error: 'Unsupported action.' }, 404);
}
