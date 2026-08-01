import { getList, setList, KEYS, LIMITS } from '../lib/storage.js';
import { sendJson, sendEmpty, sendDownload, readBody, isAdmin, clean, getParam } from '../lib/http.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return sendEmpty(res);

  const action = getParam(req, 'action') || 'list';

  if (action === 'list') {
    getList(KEYS.guestbook)
      .then((entries) => sendJson(res, { entries }))
      .catch(() => sendJson(res, { error: 'Storage error.' }, 500));
    return;
  }

  if (action === 'add' && req.method === 'POST') {
    readBody(req).then(async (payload) => {
      const entry = {
        name: clean(payload.name, 80),
        location: clean(payload.location, 120),
        message: clean(payload.message, 1200),
        savedAt: new Date().toISOString(),
      };
      if (!entry.name || !entry.message) {
        return sendJson(res, { error: 'Name and message are required.' }, 422);
      }
      const entries = await getList(KEYS.guestbook);
      entries.unshift(entry);
      const trimmed = entries.slice(0, LIMITS.guestbook);
      await setList(KEYS.guestbook, trimmed);
      return sendJson(res, { entry, entries: trimmed }, 201);
    }).catch(() => sendJson(res, { error: 'Storage error.' }, 500));
    return;
  }

  if (action === 'download') {
    if (!isAdmin(req)) return sendJson(res, { error: 'Admin access required.' }, 403);
    getList(KEYS.guestbook)
      .then((entries) => sendDownload(res, JSON.stringify(entries, null, 2), 'lost-limb-riders-guestbook.json'))
      .catch(() => sendJson(res, { error: 'Storage error.' }, 500));
    return;
  }

  if (action === 'clear' && req.method === 'POST') {
    if (!isAdmin(req)) return sendJson(res, { error: 'Admin access required.' }, 403);
    setList(KEYS.guestbook, [])
      .then(() => sendJson(res, { entries: [] }))
      .catch(() => sendJson(res, { error: 'Storage error.' }, 500));
    return;
  }

  sendJson(res, { error: 'Unsupported guest book action.' }, 404);
}
