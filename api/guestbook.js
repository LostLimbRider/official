import { getList, setList, KEYS, LIMITS } from '../lib/storage.js';
import { json, sendDownload, readBody, isAdmin, clean, getParam } from '../lib/http.js';

export default async function handler(req) {
  if (req.method === 'OPTIONS') return json({}, 204);

  const action = getParam(req, 'action') || 'list';

  if (action === 'list') {
    const entries = await getList(KEYS.guestbook);
    return json({ entries });
  }

  if (action === 'add' && req.method === 'POST') {
    const payload = await readBody(req);
    const entry = {
      name: clean(payload.name, 80),
      location: clean(payload.location, 120),
      message: clean(payload.message, 1200),
      savedAt: new Date().toISOString(),
    };
    if (!entry.name || !entry.message) {
      return json({ error: 'Name and message are required.' }, 422);
    }
    const entries = await getList(KEYS.guestbook);
    entries.unshift(entry);
    const trimmed = entries.slice(0, LIMITS.guestbook);
    await setList(KEYS.guestbook, trimmed);
    return json({ entry, entries: trimmed }, 201);
  }

  if (action === 'download') {
    if (!isAdmin(req)) return json({ error: 'Admin access required.' }, 403);
    const entries = await getList(KEYS.guestbook);
    return sendDownload(JSON.stringify(entries, null, 2), 'lost-limb-riders-guestbook.json');
  }

  if (action === 'clear' && req.method === 'POST') {
    if (!isAdmin(req)) return json({ error: 'Admin access required.' }, 403);
    await setList(KEYS.guestbook, []);
    return json({ entries: [] });
  }

  return json({ error: 'Unsupported guest book action.' }, 404);
}
