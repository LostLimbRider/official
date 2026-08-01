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
