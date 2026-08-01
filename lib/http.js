import { timingSafeEqual } from 'crypto';

const enc = new TextEncoder();

export function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export function sendDownload(body, filename) {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function readBody(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export function getParam(req, name) {
  return new URL(req.url, 'http://localhost').searchParams.get(name);
}

export function getClientIp(req) {
  const fwd = req.headers.get('x-forwarded-for') || '';
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export function timingSafeStrEqual(a, b) {
  const ba = enc.encode(String(a));
  const bb = enc.encode(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function isAdmin(req) {
  const key = getParam(req, 'key') || req.headers.get('x-admin-key') || '';
  const adminKey = process.env.GUESTBOOK_ADMIN_KEY || '';
  return adminKey !== '' && timingSafeStrEqual(adminKey, key);
}

export function clean(value, limit) {
  let out = String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  if (out.length > limit) out = out.slice(0, limit);
  return out;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}
