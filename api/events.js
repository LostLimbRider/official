import { getList, setList, KEYS } from '../lib/storage.js';
import { sendJson, sendEmpty, readBody, isAdmin, clean, getParam } from '../lib/http.js';
import { seedEvents } from '../lib/seed.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return sendEmpty(res);

  const action = getParam(req, 'action') || 'list';

  if (action === 'list') {
    getList(KEYS.events)
      .then(async (events) => {
        if (!events.length) {
          events = seedEvents;
          await setList(KEYS.events, events);
        }
        sendJson(res, { events });
      })
      .catch(() => sendJson(res, { error: 'Storage error.' }, 500));
    return;
  }

  if (!isAdmin(req)) {
    return sendJson(res, { error: 'Admin access required.' }, 403);
  }

  readBody(req).then(async (payload) => {
    if (action === 'add' && req.method === 'POST') {
      const event = {
        id: 'ev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10),
        title: clean(payload.title, 200),
        date: clean(payload.date, 10),
        endDate: clean(payload.endDate, 10),
        time: clean(payload.time, 5),
        category: clean(payload.category || 'community', 30),
        location: clean(payload.location, 200),
        description: clean(payload.description, 2000),
        createdAt: new Date().toISOString(),
      };
      if (!event.title || !event.date) {
        return sendJson(res, { error: 'Title and date are required.' }, 422);
      }
      const events = await getList(KEYS.events);
      events.unshift(event);
      await setList(KEYS.events, events);
      return sendJson(res, { event }, 201);
    }

    if (action === 'update' && req.method === 'POST') {
      const id = String(payload.id ?? '');
      if (!id) return sendJson(res, { error: 'Event ID required.' }, 422);

      const events = await getList(KEYS.events);
      const idx = events.findIndex((e) => e.id === id);
      if (idx === -1) return sendJson(res, { error: 'Event not found.' }, 404);

      const fields = [
        ['title', 200],
        ['date', 10],
        ['endDate', 10],
        ['time', 5],
        ['category', 30],
        ['location', 200],
        ['description', 2000],
      ];
      for (const [field, limit] of fields) {
        if (payload[field] !== undefined) {
          events[idx][field] = clean(payload[field], limit);
        }
      }
      events[idx].updatedAt = new Date().toISOString();
      await setList(KEYS.events, events);
      return sendJson(res, { event: events[idx] });
    }

    if (action === 'delete' && req.method === 'POST') {
      const id = String(payload.id ?? '');
      if (!id) return sendJson(res, { error: 'Event ID required.' }, 422);

      const events = await getList(KEYS.events);
      const filtered = events.filter((e) => e.id !== id);
      if (filtered.length === events.length) {
        return sendJson(res, { error: 'Event not found.' }, 404);
      }
      await setList(KEYS.events, filtered);
      return sendJson(res, { ok: true });
    }

    sendJson(res, { error: 'Unsupported action.' }, 404);
  }).catch(() => sendJson(res, { error: 'Storage error.' }, 500));
}
