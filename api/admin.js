import { getList, KEYS } from '../lib/storage.js';
import { sendJson, sendEmpty, readBody, isAdmin, getParam } from '../lib/http.js';
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

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return sendEmpty(res);
  if (!isAdmin(req)) {
    return sendJson(res, { error: 'Admin access required.' }, 403);
  }

  const action = getParam(req, 'action') || 'stats';
  const fail = () => sendJson(res, { error: 'Storage error.' }, 500);

  if (action === 'stats') {
    Promise.all([getList(KEYS.visitors), getList(KEYS.subscribers)]).then(async ([visitors, subscribers]) => {
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

      sendJson(res, {
        totalVisits: visitors.length,
        todayVisits: today,
        subscribers: subscribers.length,
        topCountries,
        browserStats: getBrowserStats(visitors),
      });
    }).catch(fail);
    return;
  }

  if (action === 'visitors') {
    getList(KEYS.visitors).then((visitors) => {
      const page = Math.max(1, parseInt(getParam(req, 'page') || '1', 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(getParam(req, 'limit') || '25', 10) || 25));
      const total = visitors.length;
      const pages = Math.ceil(total / limit);
      const slice = visitors.slice((page - 1) * limit, page * limit);
      sendJson(res, { visitors: slice, total, page, pages });
    }).catch(fail);
    return;
  }

  if (action === 'subscribers') {
    getList(KEYS.subscribers).then((subscribers) => {
      sendJson(res, { subscribers, total: subscribers.length });
    }).catch(fail);
    return;
  }

  if (action === 'send-newsletter' && req.method === 'POST') {
    Promise.all([readBody(req), getList(KEYS.events)]).then(async ([payload, events]) => {
      const upcoming = getUpcomingEvents(events);
      const { html, eventCount } = buildNewsletter(String(payload.message || '').trim(), upcoming);
      sendJson(res, { html, eventCount });
    }).catch(fail);
    return;
  }

  sendJson(res, { error: 'Unsupported action.' }, 404);
}
