# AGENTS.md

## Project overview

Static site for Lost Limb Riders (nonprofit motorcycle community). No build system, no package manager, no framework — just vanilla HTML/CSS/JS and one PHP API.

## Structure

- `index.html` — homepage
- `mission.html` — mission proposal page
- `events.html` — interactive event calendar page (month/week views, CRUD, category filters)
- `media.html` — podcast, vlog, and Coffee Talk page (audio player, YouTube embeds, episode listings)
- `api/guestbook.php` — guestbook API (PHP, file-based JSON storage in `data/guestbook.json`)
- `data/guestbook.json` — guestbook entries (JSON array, max 500)
- `assets/` — images, logo, zip downloads

## Key details

- CSS is inline in each HTML file (no shared stylesheet).
- All pages share the same CSS custom properties (`--orange`, `--black`, etc.) — keep them consistent.
- Guestbook API uses `GUESTBOOK_ADMIN_KEY` env var for admin actions (download, clear).
- Guestbook entries are stored with `flock` file locking; writes are truncated and rewritten.
- No tests, no lint, no build step, no CI.
- `README.md` is the GitHub profile README (boilerplate, not project docs).

## Deployment

Hosted on a PHP-capable web server. No deployment config in repo — likely manual or FTP.
