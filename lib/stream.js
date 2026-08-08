import { getList, setList, KEYS, LIMITS } from './storage.js';

export const STREAM_KEEP_DEFAULT = 20;

export function normalizeKeep(value) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return STREAM_KEEP_DEFAULT;
  return Math.min(500, Math.floor(n));
}

async function getStream() {
  const arr = await getList(KEYS.stream);
  return arr.length ? arr[0] : null;
}

export async function getArchiveKeep() {
  const stream = await getStream();
  return stream && stream.archiveKeep ? normalizeKeep(stream.archiveKeep) : STREAM_KEEP_DEFAULT;
}

export function makeArchiveEntry(stream) {
  return {
    id: 'arc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
    title: String(stream.title || 'Lost Limb Riders Live'),
    date: stream.liveStartedAt || new Date().toISOString(),
    platform: stream.platform || 'facebook',
    url: String(stream.streamId || ''),
    description: String(stream.description || ''),
  };
}

export async function autoArchive(oldStream, newStream) {
  const wasLive = oldStream && oldStream.status === 'live';
  const isOffline = newStream.status === 'offline';
  if (!wasLive || !isOffline) return null;

  const url = String(newStream.streamId || '').trim();
  if (!url) return null;

  const entries = await getList(KEYS.streamArchive);
  if (entries.some((e) => e.url === url)) return null;

  const entry = makeArchiveEntry({
    ...newStream,
    liveStartedAt: newStream.liveStartedAt || (oldStream ? oldStream.liveStartedAt : ''),
  });
  entries.unshift(entry);
  await setList(KEYS.streamArchive, entries.slice(0, LIMITS.streamArchive));
  return entry;
}

export async function publicArchive() {
  const [entries, keep] = await Promise.all([getList(KEYS.streamArchive), getArchiveKeep()]);
  return entries.slice(0, keep);
}

export async function adminArchive() {
  const [entries, keep] = await Promise.all([getList(KEYS.streamArchive), getArchiveKeep()]);
  const archive = entries.map((e, i) => ({ ...e, expired: i >= keep }));
  return {
    archive,
    keep,
    pendingPurge: archive.filter((e) => e.expired).length,
  };
}

export async function purgeExpired() {
  const [entries, keep] = await Promise.all([getList(KEYS.streamArchive), getArchiveKeep()]);
  const kept = entries.filter((_, i) => i < keep);
  await setList(KEYS.streamArchive, kept);
  return { kept, purged: entries.length - kept.length };
}
