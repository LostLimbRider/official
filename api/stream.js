import { getList, setList, KEYS } from '../lib/storage.js';
import { sendJson, sendEmpty, readBody, isAdmin, clean, getParam } from '../lib/http.js';
import { seedStream } from '../lib/seed.js';

const FIELDS = [
  ['platform', 20],
  ['streamId', 200],
  ['title', 200],
  ['description', 2000],
  ['status', 20],
];

function normalizeStream(s) {
  if (!s) return { ...seedStream };
  if (s.featured !== undefined) delete s.featured;
  return s;
}

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return sendEmpty(res);

  const action = getParam(req, 'action') || 'get';

  if (action === 'get') {
    getList(KEYS.stream)
      .then(async (arr) => {
        let stream;
        if (!arr.length) {
          stream = { ...seedStream };
          await setList(KEYS.stream, [stream]);
        } else {
          stream = normalizeStream(arr[0]);
        }
        sendJson(res, { stream });
      })
      .catch(() => sendJson(res, { error: 'Storage error.' }, 500));
    return;
  }

  if (!isAdmin(req)) {
    return sendJson(res, { error: 'Admin access required.' }, 403);
  }

  readBody(req).then(async (payload) => {
    if (action === 'update' && req.method === 'POST') {
      const arr = await getList(KEYS.stream);
      const stream = arr.length ? { ...arr[0] } : { ...seedStream };

      for (const [field, limit] of FIELDS) {
        if (payload[field] !== undefined) {
          stream[field] = clean(payload[field], limit);
        }
      }
      if (payload.viewerCount !== undefined) stream.viewerCount = parseInt(payload.viewerCount, 10) || 0;
      if (stream.platform && !['youtube', 'twitch'].includes(stream.platform)) {
        return sendJson(res, { error: 'Platform must be youtube or twitch.' }, 422);
      }
      stream.updatedAt = new Date().toISOString();
      await setList(KEYS.stream, [stream]);
      return sendJson(res, { stream });
    }

    if (action === 'add-schedule' && req.method === 'POST') {
      const arr = await getList(KEYS.stream);
      const stream = arr.length ? { ...arr[0] } : { ...seedStream };
      if (!stream.schedule) stream.schedule = [];

      const item = {
        id: 'ls-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        title: clean(payload.title, 200),
        day: clean(payload.day, 30),
        time: clean(payload.time, 10),
        date: clean(payload.date || '', 10),
        recurring: payload.recurring !== 'false',
        description: clean(payload.description, 2000),
      };
      if (!item.title) {
        return sendJson(res, { error: 'Title is required.' }, 422);
      }
      stream.schedule.unshift(item);
      stream.updatedAt = new Date().toISOString();
      await setList(KEYS.stream, [stream]);
      return sendJson(res, { stream });
    }

    if (action === 'delete-schedule' && req.method === 'POST') {
      const id = String(payload.id ?? '');
      if (!id) return sendJson(res, { error: 'Schedule ID required.' }, 422);

      const arr = await getList(KEYS.stream);
      const stream = arr.length ? { ...arr[0] } : { ...seedStream };
      if (stream.schedule) {
        stream.schedule = stream.schedule.filter((s) => s.id !== id);
      }
      stream.updatedAt = new Date().toISOString();
      await setList(KEYS.stream, [stream]);
      return sendJson(res, { stream });
    }

    sendJson(res, { error: 'Unsupported action.' }, 404);
  }).catch(() => sendJson(res, { error: 'Storage error.' }, 500));
}
