import { getList, setList, KEYS } from '../lib/storage.js';
import { sendJson, sendEmpty, readBody, isAdmin, clean, getParam } from '../lib/http.js';
import { seedMedia } from '../lib/seed.js';

const TYPES = ['podcast', 'vlog', 'coffeetalk'];

const FIELDS = [
  ['type', 20],
  ['num', 10],
  ['season', 10],
  ['title', 300],
  ['date', 30],
  ['duration', 12],
  ['durationSec', 12],
  ['desc', 4000],
  ['audioUrl', 1000],
  ['videoId', 200],
  ['featured', 10],
];

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return sendEmpty(res);

  const action = getParam(req, 'action') || 'list';

  if (action === 'list') {
    getList(KEYS.media)
      .then(async (media) => {
        if (!media.length) {
          media = seedMedia;
          await setList(KEYS.media, media);
        }
        sendJson(res, { media });
      })
      .catch(() => sendJson(res, { error: 'Storage error.' }, 500));
    return;
  }

  if (!isAdmin(req)) {
    return sendJson(res, { error: 'Admin access required.' }, 403);
  }

  readBody(req).then(async (payload) => {
    if (action === 'add' && req.method === 'POST') {
      const type = clean(payload.type, 20);
      if (!TYPES.includes(type)) {
        return sendJson(res, { error: 'Type must be podcast, vlog, or coffeetalk.' }, 422);
      }
      const item = { id: 'md-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10) };
      for (const [field, limit] of FIELDS) {
        if (payload[field] !== undefined) {
          item[field] = clean(payload[field], limit);
        }
      }
      if (item.featured !== 'false' && item.featured !== '0') {
        item.featured = true;
      } else {
        item.featured = false;
      }
      if (!item.title) {
        return sendJson(res, { error: 'Title is required.' }, 422);
      }
      item.hasVideo = Boolean(item.videoId);
      item.createdAt = new Date().toISOString();
      const media = await getList(KEYS.media);
      media.unshift(item);
      await setList(KEYS.media, media);
      return sendJson(res, { item }, 201);
    }

    if (action === 'update' && req.method === 'POST') {
      const id = String(payload.id ?? '');
      if (!id) return sendJson(res, { error: 'Item ID required.' }, 422);

      const media = await getList(KEYS.media);
      const idx = media.findIndex((m) => m.id === id);
      if (idx === -1) return sendJson(res, { error: 'Item not found.' }, 404);

      for (const [field, limit] of FIELDS) {
        if (payload[field] !== undefined) {
          media[idx][field] = clean(payload[field], limit);
        }
      }
      if (payload.type !== undefined && !TYPES.includes(media[idx].type)) {
        return sendJson(res, { error: 'Type must be podcast, vlog, or coffeetalk.' }, 422);
      }
      media[idx].featured = !(media[idx].featured === 'false' || media[idx].featured === '0' || media[idx].featured === false);
      media[idx].hasVideo = Boolean(media[idx].videoId);
      media[idx].updatedAt = new Date().toISOString();
      await setList(KEYS.media, media);
      return sendJson(res, { item: media[idx] });
    }

    if (action === 'delete' && req.method === 'POST') {
      const id = String(payload.id ?? '');
      if (!id) return sendJson(res, { error: 'Item ID required.' }, 422);

      const media = await getList(KEYS.media);
      const filtered = media.filter((m) => m.id !== id);
      if (filtered.length === media.length) {
        return sendJson(res, { error: 'Item not found.' }, 404);
      }
      await setList(KEYS.media, filtered);
      return sendJson(res, { ok: true });
    }

    sendJson(res, { error: 'Unsupported action.' }, 404);
  }).catch(() => sendJson(res, { error: 'Storage error.' }, 500));
}
