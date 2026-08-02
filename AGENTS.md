# AGENTS.md

## Project overview

Static site for Lost Limb Riders (nonprofit motorcycle community). No build system, no package manager, no framework — vanilla HTML/CSS/JS frontend with **Vercel serverless functions** (Node.js) replacing the original PHP backend. Deployed on Vercel; data lives in **Vercel KV (Redis)**.

## Structure

### Pages
- `index.html` — homepage (hero, book, newsletter signup with free book download, guestbook, contact)
- `events.html` — interactive calendar (month/week views, CRUD, category filters, hidden admin mode via A keypress)
- `media.html` — podcast player, YouTube vlogs, Coffee Talk episodes, subscribe links
- `mission.html` — mission statement, board, programs, donate
- `admin.html` — admin dashboard (stats, subscriber profiles, visitor log, newsletter compose/preview)

### API Endpoints (Vercel Functions)
- `api/events.js` — calendar CRUD: list (public), add/update/delete (admin key auth)
- `api/newsletter.js` — newsletter signup: name, email, full geolocation (ip-api.com), device fingerprint
- `api/visit.js` — visitor logging: IP, geolocation, browser, device on every page load
- `api/admin.js` — admin API: stats, subscriber list, visitor log (paginated), newsletter HTML builder
- `api/guestbook.js` — guestbook CRUD, download, clear (admin key auth)
- `api/cron-newsletter.js` — Vercel Cron sender: builds and emails newsletter to all subscribers via Resend

### Shared Library
- `lib/http.js` — JSON responses, admin key check (timing-safe), input cleaning, IP extraction
- `lib/storage.js` — Vercel KV access + key names + list caps
- `lib/geo.js` — ip-api.com geolocation lookup
- `lib/newsletter.js` — newsletter HTML builder (template + events)
- `lib/seed.js` — seed events + the email template (embedded, source of truth)

### Storage (Vercel KV)
Keys stored as JSON arrays under `llr:*`:
- `llr:events` — event objects `{ id, title, date, endDate, category, description, ... }`
- `llr:subscribers` — subscriber profiles (max 5000)
- `llr:visitors` — visitor entries (max 5000, structured objects)
- `llr:guestbook` — guestbook entries (max 500)
- `llr:last-newsletter-sent` — ISO date used by cron to send biweekly

## Key details

- CSS is inline in each HTML file (no shared stylesheet).
- All pages share the same CSS custom properties (`--orange`, `--black`, etc.) — keep them consistent across all pages.
- Frontend calls extensionless paths: `/api/events`, `/api/guestbook`, `/api/newsletter`, `/api/visit`, `/api/admin`.
- Admin auth uses `GUESTBOOK_ADMIN_KEY` env var (on Vercel). Key stored in `sessionStorage` as `llr-admin-key`. Passed via `?key=` query param.
- Calendar admin mode: press **A** on keyboard to toggle (hidden from public).
- Newsletter signup silently captures full visitor profile: IP, geolocation (ip-api.com), browser, device, screen, timezone, proxy/hosting flags. Zero browser permission prompts.
- Guestbook persists server-side via `api/guestbook.js` (was localStorage-only before the serverless migration — do not revert).
- No tests, no lint, no build step, no CI.
- `README.md` is the GitHub profile README (boilerplate, not project docs).

## Environment Variables (Vercel)

- `GUESTBOOK_ADMIN_KEY` — secret key for admin API operations (`openssl rand -base64 32`).
- `CRON_SECRET` — secret sent by Vercel Cron as `Authorization: Bearer`; the cron endpoint refuses requests without it.
- `RESEND_API_KEY` — Resend API key (email sending, free tier 100/day).
- `RESEND_FROM` — sender address, e.g. `Lost Limb Riders <john.thompson@lostlimbriders.org>`.
- `NEWSLETTER_MESSAGE` — optional default intro message for the cron newsletter.

## Deployment

1. `npm install`
2. `vercel link` (attach KV store — auto-creates `KV_*` env vars)
3. Set the env vars above in Vercel dashboard
4. `vercel --prod`
5. Cron is configured in `vercel.json` (weekly; the function gates itself to send every two weeks)

## Editing the newsletter template / seed events

They live in `lib/seed.js` (embedded). Edit there, then redeploy. Do not rely on `data/` — it is no longer read at runtime.
