# AGENTS.md

## Project overview

Static site for Lost Limb Riders (nonprofit motorcycle community). No build system, no package manager, no framework — just vanilla HTML/CSS/JS and PHP APIs.

## Structure

### Pages
- `index.html` — homepage (hero, book, newsletter signup with free book download, guestbook, contact)
- `events.html` — interactive calendar (month/week views, CRUD, category filters, hidden admin mode via A keypress)
- `media.html` — podcast player, YouTube vlogs, Coffee Talk episodes, subscribe links
- `mission.html` — mission statement, board, programs, donate
- `admin.html` — admin dashboard (stats, subscriber profiles, visitor log, newsletter compose/preview)

### API Endpoints
- `api/events.php` — calendar CRUD: list (public), add/update/delete (admin key auth)
- `api/newsletter.php` — newsletter signup: captures name, email, full geolocation (ip-api.com), device fingerprint
- `api/visit.php` — visitor logging: IP, geolocation, browser, device on every page load
- `api/admin.php` — admin API: stats, subscriber list, visitor log (paginated), newsletter HTML builder
- `api/cron-newsletter.php` — cron sender: builds and emails newsletter to all subscribers via PHP mail()
- `api/guestbook.php` — guestbook CRUD, download, clear (admin key auth)

### Data Files
- `data/events.json` — server-side event storage (JSON array)
- `data/newsletter.json` — subscriber profiles with full marketing data (max 5000)
- `data/visitors.log` — raw visitor log entries (plain text, appended)
- `data/guestbook.json` — guestbook entries (JSON array, max 500)
- `data/newsletter-template.html` — HTML email template with placeholders: `{{DATE_RANGE}}`, `{{EVENTS_LIST}}`, `{{MESSAGE}}`, `{{NAME}}`

### Assets
- `assets/logo.png` — site logo and favicon
- `assets/icaniwill.png` — book cover
- `assets/202607061311-i-can-i-will.zip` — free digital book download (offered on newsletter signup)

## Key details

- CSS is inline in each HTML file (no shared stylesheet).
- All pages share the same CSS custom properties (`--orange`, `--black`, etc.) — keep them consistent across all pages.
- Admin auth uses `GUESTBOOK_ADMIN_KEY` env var. Key stored in `sessionStorage` as `llr-admin-key`.
- Calendar admin mode: press **A** on keyboard to toggle (hidden from public).
- Newsletter signup silently captures full visitor profile: IP, geolocation (ip-api.com), browser, device, screen, timezone, proxy/hosting flags. Zero browser permission prompts.
- All file writes use `flock` file locking; writes are truncated and rewritten.
- No tests, no lint, no build step, no CI.
- `README.md` is the GitHub profile README (boilerplate, not project docs).

## Deployment

Hosted on a PHP-capable web server. No deployment config in repo — likely manual or FTP.
