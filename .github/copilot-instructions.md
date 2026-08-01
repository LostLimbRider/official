# Copilot Instructions for Lost Limb Riders Website

## Overview

This is a static site for a nonprofit motorcycle community with no build system, package manager, or framework. It consists of vanilla HTML/CSS/JS frontend and **Vercel serverless functions (Node.js)** serving JSON APIs. Deployed on **Vercel**, with data stored in **Vercel KV (Redis)**. No CI/CD configuration in the repo.

> Migration note: the site was previously PHP-backed (`api/*.php` + flat files in `data/`). It has been rewritten to Node.js serverless functions + Vercel KV. The PHP version survives in git history but is not used. **Do not add `.php` files or read/write `data/` at runtime.**

## Architecture

### Frontend Pages
- **index.html** — Landing page: hero, book offering, newsletter signup, guestbook form, contact
- **events.html** — Interactive calendar with month/week views, CRUD operations, category filters
- **media.html** — Podcast player, YouTube videos, Coffee Talk episodes with subscription links
- **mission.html** — Mission statement, board info, program descriptions, donation button
- **admin.html** — Admin dashboard: statistics, subscriber profiles, visitor logs, newsletter builder

### Backend API Endpoints (Vercel Functions)
All functions live in `api/*.js` and are served extensionless. All use JSON request/response. Admin operations require `GUESTBOOK_ADMIN_KEY` environment variable, passed via query param `?key=<value>` (or `X-Admin-Key` header).

- **`/api/events`** — Event CRUD: `action=list` (public) returns events; `action=add|update|delete` (POST, admin only)
- **`/api/newsletter`** — Newsletter signup (POST): name, email, device fingerprint, geolocation from ip-api.com
- **`/api/visit`** — Passive visitor tracking (POST): IP, geolocation, browser, device, timezone
- **`/api/admin`** — Admin API: `action=stats|visitors|subscribers|send-newsletter` (admin only)
- **`/api/guestbook`** — Guestbook CRUD: `action=list` (public), `action=add` (public POST), `action=download|clear` (admin)
- **`/api/cron-newsletter`** — Vercel Cron sender: builds HTML and sends via Resend API to all subscribers

### Shared Library
- **`lib/http.js`** — JSON responses, admin key check (`crypto.timingSafeEqual`), input cleaning, client IP extraction
- **`lib/storage.js`** — Vercel KV access (`@vercel/kv`), key names, list caps
- **`lib/geo.js`** — ip-api.com geolocation lookup (HTTP, free tier)
- **`lib/newsletter.js`** — newsletter HTML builder (template + events), upcoming-events helper
- **`lib/seed.js`** — seed events + email template (embedded, source of truth)

### Storage (Vercel KV)
All data is JSON stored under `llr:*` keys. Use `lib/storage.js` helpers (`getList`, `setList`) — never call `kv` directly from endpoints.

- **`llr:events`** — Event objects `{ id, title, date, endDate, category, description, ... }`
- **`llr:subscribers`** — Subscriber profiles (max 5000): full profile including IP, geolocation, browser, device, screen, timezone, proxy flags
- **`llr:visitors`** — Visitor entries (max 5000, structured objects)
- **`llr:guestbook`** — Guestbook entries (max 500)
- **`llr:last-newsletter-sent`** — ISO date string; cron skips if sent within the last 13 days

## Key Conventions

### CSS and Styling
- All CSS is **inlined within each HTML file** — no shared stylesheet.
- All pages share consistent custom property definitions at `:root`:
  - `--orange: #ff6a00`, `--orange-dark: #c94f00` — primary brand colors
  - `--black: #050505`, `--charcoal: #101010`, `--card: #171717` — backgrounds
  - `--white: #ffffff`, `--muted: #b7b7b7` — text colors
  - `--line: rgba(255,255,255,.14)` — border/divider color
  - `--shadow: 0 24px 70px rgba(0,0,0,.45)` — box shadow

  **Keep these consistent across all files.** If adding new colors or tokens, define them in `:root` and document them here.

### Admin Authentication
- Environment variable `GUESTBOOK_ADMIN_KEY` is the source of truth (set on Vercel).
- Frontend stores the admin key in `sessionStorage` with key `'llr-admin-key'` for the duration of the session.
- All admin API calls include the key: `?key=<value>` in query string (or `X-Admin-Key` header).
- Use timing-safe comparison via `lib/http.js` → `timingSafeStrEqual` / `isAdmin(req)`.

### Hidden Admin Mode (Calendar)
- **events.html** implements a hidden admin mode triggered by pressing **A** (uppercase, captured on `keydown`).
- Toggling admin mode shows/hides form for creating and editing events.
- Prompt for admin key on first toggle, persist to `sessionStorage`.
- The calendar has month and week views; ensure both respect admin mode.

### Data Collection (Newsletter & Visit APIs)
- Silently collects visitor data via **ip-api.com** without browser permission prompts.
- Captures: IP address, geolocation (country, region, city), browser, device type, screen resolution, timezone, and proxy/hosting detection flags.
- No explicit consent mechanisms in the code — feature operates passively.

### JSON Data Validation
- Validate and sanitize input with `clean()` from `lib/http.js` (strips tags, collapses whitespace, truncates).
- Always return errors as JSON: `{ "error": "description" }` with a proper status code.
- Return success responses with appropriate HTTP status (201 for create, 200 for read/update, 204 for delete).

## Local Development Setup

### Prerequisites
- Node.js 18+ (functions use global `fetch`).
- Vercel CLI: `npm i -g vercel`.

### Running Locally
```bash
npm install
vercel link        # attach KV store (auto-creates KV_* env vars)
vercel dev         # serves static files + functions at http://localhost:3000
```
Open `http://localhost:3000/index.html`. The admin dashboard is at `http://localhost:3000/admin.html` (requires admin key).

## No Build System, Tests, or Linting

This project has:
- ❌ No bundler or build step
- ❌ No automated tests
- ❌ No linters or formatters
- ❌ No CI/CD

Changes are validated by manual testing in `vercel dev`.

## Environment Variables (Vercel Dashboard)

- **GUESTBOOK_ADMIN_KEY** — Secret key for admin API operations. Generate: `openssl rand -base64 32`
- **CRON_SECRET** — Secret sent by Vercel Cron as `Authorization: Bearer`; the cron endpoint refuses requests without it. Generate: `openssl rand -base64 32`
- **RESEND_API_KEY** — Resend API key (email sending, free tier 100 emails/day)
- **RESEND_FROM** — Sender address, e.g. `Lost Limb Riders <noreply@yourdomain>`
- **NEWSLETTER_MESSAGE** — Optional default intro message for the cron newsletter

## Deployment Notes

1. `npm install`
2. `vercel link` (attach a KV store — auto-creates `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`)
3. Set the env vars above in the Vercel dashboard (Project → Settings → Environment Variables)
4. `vercel --prod`

The cron is configured in `vercel.json` (weekly, Mondays 09:00 UTC). The function itself gates sends to every two weeks via `llr:last-newsletter-sent`.

**Vercel plan notes:**
- Cron Jobs are supported on the Hobby (free) plan with daily/weekly/monthly granularity.
- KV on the Hobby plan has request limits — keep lists capped (already enforced in `lib/storage.js`).

## Common Tasks

### Adding a New Page
1. Create `newpage.html` with inline `<style>` block.
2. Copy the CSS custom properties from `:root` from any existing page.
3. Add navigation link in existing pages' headers.
4. Maintain consistent header/footer structure across all pages.

### Updating the Newsletter Template or Seed Events
1. Edit `lib/seed.js` (`newsletterTemplate` or `seedEvents`).
2. Keep placeholders: `{{DATE_RANGE}}`, `{{EVENTS_LIST}}`, `{{MESSAGE}}`, `{{NAME}}`.
3. Redeploy with `vercel --prod`.

### Adding/Updating Admin Features
1. Add form UI in the relevant HTML page (e.g., event form in events.html).
2. Create or update corresponding API endpoint in `api/*.js`.
3. Require admin key validation with `isAdmin(req)` from `lib/http.js`.
4. Use `lib/storage.js` helpers for any data mutations (KV, not files).
5. Toggle visibility of admin UI using `sessionStorage` for the admin key.

### Debugging KV Issues
If `llr:*` keys look wrong:
1. Check the KV store in the Vercel dashboard (Storage → KV → Browse).
2. Verify env vars `KV_REST_API_URL` / `KV_REST_API_TOKEN` are present.
3. Re-seed events by deleting `llr:events` — the list handler re-seeds from `lib/seed.js` when empty.
4. Check function logs in the Vercel dashboard (Deployments → Runtime Logs).

## Security Considerations

### Admin Key Management
- **Never** commit the actual admin key to the repository.
- Store only in environment variable `GUESTBOOK_ADMIN_KEY` on Vercel.
- Use timing-safe comparison (`lib/http.js` → `timingSafeStrEqual`).
- Rotate the key periodically; update all clients accordingly.
- Generate with: `openssl rand -base64 32`

### API Security
- Admin APIs validate `?key=<value>` or the `X-Admin-Key` header.
- Public read endpoints (`action=list`) never require authentication.
- Guestbook `add` and newsletter `signup` are intentionally public.
- **The cron endpoint requires `CRON_SECRET`** (Vercel sends it as `Authorization: Bearer <CRON_SECRET>`); never call it without it.
- Validate and sanitize all input via `clean()` / email regex in `lib/http.js`.
- Always return JSON errors with appropriate HTTP status codes (400, 403, 422, 500).

### Data Privacy
- Newsletter signup silently collects full visitor profiles (IP, geolocation, device, browser).
- **No explicit user consent is gathered** — feature operates passively.
- Subscriber data in `llr:subscribers` is sensitive (full marketing profile) — restrict access.
- Visitor entries in `llr:visitors` are capped at 5000 (oldest dropped).

## API Response Patterns

All endpoints use consistent JSON response format:

**Success (read):**
```json
{ "events": [...] }
```

**Success (create):**
```json
{ "event": { "id": "ev-...", "title": "Event Name", ... } }
```

**Error:**
```json
{ "error": "Admin access required." }
```

**HTTP Status Codes:**
- `200` — Successful GET or update
- `201` — Successful create
- `204` — Successful delete (often no body)
- `400` — Bad request (validation error)
- `403` — Forbidden (missing/invalid admin key)
- `422` — Unprocessable entity (missing required fields)
- `500` — Server error (KV failure, mail failure, external API failure)

## Performance & Limits

- **events** — No strict size limit; performance degrades beyond ~1,000 events
- **subscribers** — Max 5,000 (self-enforced in `lib/storage.js`)
- **guestbook** — Max 500 entries (self-enforced)
- **visitors** — Max 5,000 entries (self-enforced; old entries dropped)
- **IP geolocation via ip-api.com** — Free tier rate-limited (~45 req/min); consider caching for high traffic
- **Resend** — Free tier 100 emails/day; cron caps sends at 100 per run

## Testing Checklist

When deploying changes:

1. **Admin authentication** — Verify admin key prompt appears on calendar, events form is hidden without key
2. **Event CRUD** — Add, edit, delete event with admin key; verify public sees only published events
3. **Newsletter signup** — Submit form, verify name+email captured in KV (`llr:subscribers`)
4. **Visitor logging** — Load any page, check `llr:visitors` for a new entry
5. **Newsletter template** — Edit `lib/seed.js`, verify placeholders render correctly in preview
6. **Guestbook** — Submit an entry; verify it persists after page reload (server-side, not localStorage)
7. **Geolocation** — Verify ip-api.com returns data (may fail on localhost without a real IP)

## Troubleshooting

**"Admin access required" even with correct key:**
- Check `GUESTBOOK_ADMIN_KEY` env var is set on Vercel (not in code).
- Verify key matches exactly (no extra spaces, encoding issues).
- Clear browser `sessionStorage` and re-enter key: `sessionStorage.removeItem('llr-admin-key')`

**Events not showing:**
- Check the KV store in the dashboard; `llr:events` re-seeds from `lib/seed.js` when empty.
- Verify `KV_REST_API_URL` / `KV_REST_API_TOKEN` env vars exist.
- Look at Runtime Logs in the Vercel dashboard for function errors.

**Newsletter signup failing:**
- Verify ip-api.com is reachable (may fail behind proxy/firewall).
- Check `llr:subscribers` size (max 5,000).
- Confirm a valid email format passes validation.

**Cron newsletter not sending:**
- Confirm `CRON_SECRET` env var is set; Vercel sends it as `Authorization: Bearer`.
- Confirm `RESEND_API_KEY` and `RESEND_FROM` are set.
- Verify a cron is visible in Vercel dashboard (Deployments → Cron Jobs).
- The cron gates itself: it won't send again within 13 days of `llr:last-newsletter-sent`.
