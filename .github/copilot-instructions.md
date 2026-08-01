# Copilot Instructions for Lost Limb Riders Website

## Overview

This is a static site for a nonprofit motorcycle community with no build system, package manager, or framework. It consists of vanilla HTML/CSS/JS frontend and PHP backend APIs serving JSON data. No deployment or CI configuration in the repo.

## Architecture

### Frontend Pages
- **index.html** — Landing page: hero, book offering, newsletter signup, guestbook form, contact
- **events.html** — Interactive calendar with month/week views, CRUD operations, category filters
- **media.html** — Podcast player, YouTube videos, Coffee Talk episodes with subscription links
- **mission.html** — Mission statement, board info, program descriptions, donation button
- **admin.html** — Admin dashboard: statistics, subscriber profiles, visitor logs, newsletter builder

### Backend API Endpoints (PHP)
All APIs use JSON request/response. Admin operations require `GUESTBOOK_ADMIN_KEY` environment variable, passed via query param: `?key=<value>`

- **api/events.php** — Event CRUD: GET returns public events (JSON array), POST/PUT/DELETE require admin key
- **api/newsletter.php** — Newsletter signup: captures name, email, device fingerprint, geolocation from ip-api.com
- **api/visit.php** — Passive visitor tracking: called on every page load to log IP, geolocation, browser, device, timezone
- **api/admin.php** — Admin API: statistics (total visitors/subscribers), paginated subscriber profiles, paginated visitor logs, newsletter HTML builder
- **api/cron-newsletter.php** — Cron sender: builds HTML from template, sends via PHP mail() to all subscribers
- **api/guestbook.php** — Guestbook CRUD: POST/PUT/DELETE require admin key

### Data Files
Located in `/data/`, all managed with PHP `flock()` file locking (writers truncate and rewrite):

- **events.json** — Event objects (array): `{ id, title, date, endDate, category, description }`
- **newsletter.json** — Subscriber profiles (array, max 5000): full profile including IP, geolocation, browser, device, screen resolution, timezone, proxy flags
- **visitors.log** — Raw visitor entries (plain text, appended): one JSON-encoded entry per line
- **guestbook.json** — Guestbook entries (array, max 500)
- **newsletter-template.html** — Email template with placeholders: `{{DATE_RANGE}}`, `{{EVENTS_LIST}}`, `{{MESSAGE}}`, `{{NAME}}`

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
- Environment variable `GUESTBOOK_ADMIN_KEY` is the source of truth (set on the server).
- Frontend stores the admin key in `sessionStorage` with key `'llr-admin-key'` for the duration of the session.
- All admin API calls include the key: `?key=<value>` in query string.
- Use `hash_equals()` for timing-safe comparison in PHP (already done in events.php).

### Hidden Admin Mode (Calendar)
- **events.html** implements a hidden admin mode triggered by pressing **A** (uppercase, captured on `keydown`).
- Toggling admin mode shows/hides form for creating and editing events.
- Prompt for admin key on first toggle, persist to `sessionStorage`.
- The calendar has month and week views; ensure both respect admin mode.

### File Locking Pattern (PHP)
All writes to data files follow this pattern to prevent corruption:

```php
$handle = fopen('path/to/file', 'c+');
flock($handle, LOCK_EX);      // Acquire exclusive lock
ftruncate($handle, 0);         // Clear entire file
rewind($handle);               // Reset to start
fwrite($handle, $data);        // Write new data
fflush($handle);               // Flush to disk
flock($handle, LOCK_UN);       // Release lock
fclose($handle);               // Close file
```

**Do not use `file_put_contents()` for updates** — only for initial file creation. Always use the pattern above for modifications.

### Data Collection (Newsletter & Visit APIs)
- Silently collects visitor data via **ip-api.com** without browser permission prompts.
- Captures: IP address, geolocation (country, region, city), browser, device type, screen resolution, timezone, and proxy/hosting detection flags.
- No explicit consent mechanisms in the code — feature operates passively.

### JSON Data Validation
- Validate and sanitize input (e.g., `trim()`, `filter_var()` for email, `htmlspecialchars()` for display text).
- Always return errors as JSON: `{ "error": "description", "status": 400 }`.
- Return success responses with appropriate HTTP status (201 for create, 200 for read/update, 204 for delete).

## Local Development Setup

### Installation

To work on this project locally, you need **PHP 7.2+** with the `curl` and `json` extensions.

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y php php-cli php-curl
```

**macOS (Homebrew):**
```bash
brew install php
```

**Windows:**
Download from [php.net](https://www.php.net/downloads) or use [Chocolatey](https://chocolatey.org/packages/php)

Verify installation:
```bash
php --version
php -m | grep -E "curl|json"
```

No other dependencies needed — no npm, no composer, no build step.

### Running Locally

1. Start the PHP dev server in the project root:
   ```bash
   php -S localhost:8000
   ```
   
2. Open `http://localhost:8000/index.html` in your browser

3. The admin dashboard is at `http://localhost:8000/admin.html` (requires admin key via sessionStorage)

## No Build System, Tests, or Linting

This project has:
- ❌ No package managers (npm, composer)
- ❌ No build step or bundler
- ❌ No automated tests
- ❌ No linters or formatters
- ❌ No CI/CD
- ❌ No deployment scripts

Changes are validated by manual testing in a PHP-capable web server environment.

## Environment Variables

Set these on the hosting server (not in code):

- **GUESTBOOK_ADMIN_KEY** — Secret key for admin API operations. Use a strong random string (e.g., `openssl rand -base64 32`).

## Deployment Notes

- Hosted on a PHP-capable web server (exact host/method not documented in repo).
- Likely manual deployment or FTP — check with project owner for details.
- Ensure server supports PHP 7.2+, has `fopen()` and `flock()` support, and allows `file_put_contents()`.
- Configure `GUESTBOOK_ADMIN_KEY` environment variable on the server.
- Set permissions on `/data/` directory to allow PHP to read/write files (typically `755` for directory, `644` for files).

## Common Tasks

### Adding a New Page
1. Create `newpage.html` with inline `<style>` block.
2. Copy the CSS custom properties from `:root` from any existing page.
3. Add navigation link in existing pages' headers.
4. Maintain consistent header/footer structure across all pages.

### Updating the Newsletter Template
1. Edit `data/newsletter-template.html`.
2. Keep placeholders: `{{DATE_RANGE}}`, `{{EVENTS_LIST}}`, `{{MESSAGE}}`, `{{NAME}}`.
3. Template is used by `api/cron-newsletter.php` — test the cron script locally before deploying.

### Adding/Updating Admin Features
1. Add form UI in the relevant HTML page (e.g., event form in events.html).
2. Create or update corresponding API endpoint in `api/*.php`.
3. Require admin key validation with `require_admin($_GET['key'] ?? '')`.
4. Use the file locking pattern for any data mutations.
5. Toggle visibility of admin UI using `sessionStorage` for the admin key.

### Debugging File Locks
If `data/*.json` files become corrupted or locked:
1. Check file permissions: `ls -la data/`.
2. Look for unclosed file handles from hung PHP processes.
3. Restore from backup or manually repair by running the corresponding API endpoint to rewrite the file.
4. Verify `flock()` and `fclose()` are always called (even on error paths).

## Security Considerations

### Admin Key Management
- **Never** commit the actual admin key to the repository.
- Store only in environment variable `GUESTBOOK_ADMIN_KEY` on the server.
- Use timing-safe comparison: `hash_equals($adminKey, $_GET['key'] ?? '')` when validating.
- Rotate the key periodically; update all clients accordingly.
- Generate with: `openssl rand -base64 32`

### API Security
- Admin APIs only accept GET with query `?key=<value>` — no authentication headers or POST body keys.
- POST/PUT/DELETE operations for data (events, guestbook, newsletter) **always** require admin key.
- **GET** (read-only public data) never requires authentication.
- Validate and sanitize all input: `trim()`, `filter_var($email, FILTER_VALIDATE_EMAIL)`, `htmlspecialchars()` for display.
- Always return JSON errors with appropriate HTTP status codes (400, 403, 422, 500).

### Data Privacy
- Newsletter signup silently collects full visitor profiles (IP, geolocation, device, browser).
- **No explicit user consent is gathered** — feature operates passively.
- Subscriber data in `data/newsletter.json` is sensitive (full marketing profile) — restrict server access.
- Visitor logs in `data/visitors.log` are append-only raw entries — retention policy not defined in code.

## API Response Patterns

All endpoints use consistent JSON response format:

**Success (read):**
```json
{ "events": [...] }
```

**Success (create):**
```json
{ "id": "ev-123", "title": "Event Name", ... }
```

**Error:**
```json
{ "error": "Admin access required.", "status": 403 }
```

**HTTP Status Codes:**
- `200` — Successful GET or update
- `201` — Successful create
- `204` — Successful delete (often no body)
- `400` — Bad request (validation error)
- `403` — Forbidden (missing/invalid admin key)
- `422` — Unprocessable entity (missing required fields)
- `500` — Server error (file I/O, mail failure, external API failure)

## Performance & Limits

- **events.json** — No strict size limit; performance degrades beyond ~1,000 events
- **newsletter.json** — Max 5,000 subscribers (self-enforced in code)
- **guestbook.json** — Max 500 entries (self-enforced in code)
- **visitors.log** — Append-only, grows indefinitely; consider archival/rotation for long-running deployments
- **IP geolocation via ip-api.com** — Free tier rate-limited to ~45 req/min; production should upgrade or cache

## Testing Checklist

When deploying changes:

1. **Admin authentication** — Verify admin key prompt appears on calendar, events form is hidden without key
2. **Event CRUD** — Add, edit, delete event with admin key; verify public sees only published events
3. **Newsletter signup** — Submit form, verify name+email captured in `data/newsletter.json`
4. **Visitor logging** — Load any page, check `data/visitors.log` for new entry
5. **Newsletter template** — Edit template, verify placeholders render correctly in preview
6. **File permissions** — Ensure `data/` directory and files are readable/writable by PHP process
7. **Geolocation** — Verify ip-api.com returns data (may fail on localhost without real IP)

## Troubleshooting

**"Admin access required" even with correct key:**
- Check `GUESTBOOK_ADMIN_KEY` env var is set on server (not in code).
- Verify key matches exactly (no extra spaces, encoding issues).
- Clear browser `sessionStorage` and re-enter key: `sessionStorage.removeItem('llr-admin-key')`

**Events not persisting:**
- Verify `data/events.json` exists and is readable: `ls -la data/events.json`
- Check directory permissions: `chmod 755 data && chmod 644 data/*.json`
- Look for PHP errors in web server logs (usually `/var/log/apache2/error.log` or `/var/log/nginx/error.log`)

**Newsletter signup failing:**
- Verify ip-api.com is reachable (may fail behind proxy/firewall)
- Check `curl` extension is installed: `php -m | grep curl`
- Review `data/newsletter.json` size (max 5,000 subscribers)

**Cron newsletter not sending:**
- Verify PHP can execute (not in web-only mode)
- Check PHP `mail()` is configured on server (requires postfix/sendmail)
- Test with: `php api/cron-newsletter.php` from command line
- Review crontab entry (should run as web user, e.g., `www-data`)
