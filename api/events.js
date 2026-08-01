import { getList, setList, KEYS } from '../lib/storage.js';
import { json, readBody, isAdmin, clean, getParam } from '../lib/http.js';
import { seedEvents } from '../lib/seed.js';

export default async function handler(req) {
  if (req.method === 'OPTIONS') return json({}, 204);

  const action = getParam(req, 'action') || 'list';

  if (action === 'list') {
    let events = await getList(KEYS.events);
    if (!events.length) {
      events = seedEvents;
      await setList(KEYS.events, events);
    }
    return json({ events });
  }

  if (!isAdmin(req)) {
    return json({ error: 'Admin access required.' }, 403);
  }

  const payload = await readBody(req);

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
      return json({ error: 'Title and date are required.' }, 422);
    }
    const events = await getList(KEYS.events);
    events.unshift(event);
    await setList(KEYS.events, events);
    return json({ event }, 201);
  }

  if (action === 'update' && req.method === 'POST') {
    const id = String(payload.id ?? '');
    if (!id) return json({ error: 'Event ID required.' }, 422);

    const events = await getList(KEYS.events);
    const idx = events.findIndex((e) => e.id === id);
    if (idx === -1) return json({ error: 'Event not found.' }, 404);

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
    return json({ event: events[idx] });
  }

  if (action === 'delete' && req.method === 'POST') {
    const id = String(payload.id ?? '');
    if (!id) return json({ error: 'Event ID required.' }, 422);

    const events = await getList(KEYS.events);
    const filtered = events.filter((e) => e.id !== id);
    if (filtered.length === events.length) {
      return json({ error: 'Event not found.' }, 404);
    }
    await setList(KEYS.events, filtered);
    return json({ ok: true });
  }

  return json({ error: 'Unsupported action.' }, 404);
}
