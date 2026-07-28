# Lost Limb Riders — Admin User Manual

Complete reference for managing the website, events, newsletter, visitors, and marketing data.

---

## Table of Contents

1. [Site Overview](#site-overview)
2. [Accessing Admin Areas](#accessing-admin-areas)
3. [Pages](#pages)
4. [Events Calendar](#events-calendar)
5. [Newsletter System](#newsletter-system)
6. [Visitor Tracking](#visitor-tracking)
7. [Admin Dashboard](#admin-dashboard)
8. [API Reference](#api-reference)
9. [Data Files](#data-files)
10. [Environment Variables](#environment-variables)
11. [Cron Jobs](#cron-jobs)
12. [Marketing Data Pipeline](#marketing-data-pipeline)
13. [Troubleshooting](#troubleshooting)

---

## Site Overview

Lost Limb Riders is a static HTML/CSS/JS website with PHP API endpoints. No build system, no framework, no package manager. Every page has inline CSS and vanilla JavaScript.

### Live Pages

| File | URL Path | Purpose |
|------|----------|---------|
| `index.html` | `/` | Homepage — hero, book section, newsletter signup, guestbook, contact |
| `events.html` | `/events.html` | Interactive calendar — month/week views, event CRUD, category filters |
| `media.html` | `/media.html` | Podcast player, YouTube vlogs, Coffee Talk episodes, subscribe links |
| `mission.html` | `/mission.html` | Mission statement, board, programs, donate |
| `admin.html` | `/admin.html` | Admin dashboard — stats, subscribers, visitors, newsletter compose |

### API Endpoints

| File | Purpose |
|------|---------|
| `api/events.php` | Calendar CRUD — list (public), add/update/delete (admin) |
| `api/newsletter.php` | Newsletter signup — stores subscriber + full geolocation + device fingerprint |
| `api/visit.php` | Visitor logging — IP, geolocation, browser, device on every page load |
| `api/admin.php` | Admin API — stats, subscriber list, visitor log, newsletter builder |
| `api/cron-newsletter.php` | Cron sender — builds and emails newsletter to all subscribers |
| `api/guestbook.php` | Guestbook — CRUD, download, clear (existing, unchanged) |

### Data Files

| File | Purpose |
|------|---------|
| `data/events.json` | Server-side event storage (JSON array) |
| `data/newsletter.json` | Subscriber profiles with full marketing data (JSON array, max 5000) |
| `data/visitors.log` | Raw visitor log entries (plain text, appended) |
| `data/guestbook.json` | Guestbook entries (JSON array, max 500) |
| `data/newsletter-template.html` | HTML email template with `{{DATE_RANGE}}`, `{{EVENTS_LIST}}`, `{{MESSAGE}}`, `{{NAME}}` placeholders |

### Static Assets

| File | Purpose |
|------|---------|
| `assets/logo.png` | Site logo (used in nav and favicon) |
| `assets/logo-nobg.png` | Logo variant without background |
| `assets/icaniwill.png` | Book cover image |
| `assets/I-Can-I-Will.png` | Alternate book cover |
| `assets/LLR COVER POSTER.png` | Cover poster (used as page hero background) |
| `assets/202607061311-i-can-i-will.zip` | Free digital book download (offered on newsletter signup) |

---

## Accessing Admin Areas

There are two admin areas with separate access methods. Both use the same `GUESTBOOK_ADMIN_KEY` environment variable.

### Admin Dashboard (`admin.html`)

1. Navigate to `admin.html`
2. Enter your admin key in the login overlay
3. The key is stored in `sessionStorage` as `llr-admin-key` — you stay logged in until the browser tab closes
4. The dashboard loads automatically after key verification

### Calendar Admin Mode (`events.html`)

1. Navigate to `events.html`
2. Press the **A** key on your keyboard (not in a text field)
3. If no key is saved, an overlay appears — enter your admin key
4. The key is stored in `sessionStorage` as `llr-admin-key`
5. Admin mode activates — you'll see:
   - "+" button to create events
   - Edit/Delete buttons on event details
   - Click any calendar date to create an event on that date
6. Press **A** again to toggle admin mode off
7. Press **Escape** to close any open modal or overlay

**Note:** The admin key is stored in the browser's `sessionStorage`. It persists across page reloads but clears when the browser tab closes. You'll need to re-enter it each session.

---

## Pages

### Homepage (`index.html`)

**Sections (top to bottom):**
1. **Hero** — Full-width header with logo and tagline
2. **Book** — "I Can. I Will." book promotion with cover image and call-to-action
3. **Newsletter** — Signup form (name + email) offering free book download
4. **Guestbook** — Public message board (localStorage-based, works without backend)
5. **Contact** — Phone number and call-to-action

**Newsletter Signup Flow:**
- User enters name and email
- Frontend sends: `{ name, email, screen, viewport, timezone, lang, platform, cookies, dnt, page }`
- Backend captures server-side: IP, full geolocation (country, region, city, lat/lon, ISP, org, AS, proxy/hosting flags), user agent, referer
- On success, user sees a download link for the free "I Can. I Will." book (ZIP file)
- Duplicate emails are silently rejected (returns "already subscribed")

**Visitor Tracking:**
- Fires on every page load via `DOMContentLoaded` event
- Sends device data to `api/visit.php`
- Backend resolves IP geolocation via ip-api.com
- Entry logged to `data/visitors.log`
- Completely silent — no browser permission prompts

### Events Calendar (`events.html`)

**Features:**
- **Month View** — Full calendar grid with event dots and category colors
- **Week View** — 7-day view with detailed event listings
- **Category Filters** — Toggle Ride, Fundraiser, Community, Meeting, Rally
- **Event Details** — Click any event to see full description, time, location
- **Upcoming List** — Sidebar showing next 10 events sorted by date
- **Admin Mode** — Hidden. Press A to toggle. Creates/edits/deletes events via API.

**Event Categories:**

| Category | Color | CSS Variable |
|----------|-------|--------------|
| Ride | Green | `--cat-ride: #22c55e` |
| Fundraiser | Amber | `--cat-fundraiser: #f59e0b` |
| Community | Blue | `--cat-community: #3b82f6` |
| Meeting | Purple | `--cat-meeting: #a855f7` |
| Rally | Red | `--cat-rally: #ef4444` |

**Admin Actions (requires key):**
- **Create Event** — Click "+" or click any calendar date
- **Edit Event** — Click event detail → "Edit Event" button
- **Delete Event** — Click event detail → "Delete Event" button → inline confirmation bar
- **Form Fields:** Title (required), Date (required), End Date (optional, for multi-day), Time, Category, Location, Description

### Media Page (`media.html`)

**Sections:**
1. **Podcast Player** — Audio player with play/pause, seek bar, volume, speed control, skip ±15s
2. **Vlogs** — YouTube video embeds in responsive grid
3. **Coffee Talk** — Episode cards with thumbnails, titles, descriptions, and play links
4. **Subscribe** — Platform cards (Spotify, YouTube, Apple Podcasts, RSS)

**Note:** Podcast and YouTube URLs are currently placeholder `#` links. Update them with real URLs when available.

### Mission Page (`mission.html`)

Static content page with:
- Mission statement and founder story
- Board of directors
- Programs (Ride Support, Veterans, Women Riders, Community, Medical Transport)
- Donate section

---

## Events Calendar

### Creating an Event

1. Go to `events.html`
2. Press **A** to enter admin mode (enter key if prompted)
3. Click the **"+"** button (top right of calendar) or click any date
4. Fill in the form:
   - **Title** — Required. Event name.
   - **Date** — Required. Start date.
   - **End Date** — Optional. For multi-day events.
   - **Time** — Optional. Format: HH:MM (24h).
   - **Category** — Ride, Fundraiser, Community, Meeting, or Rally.
   - **Location** — Optional. Place name or address.
   - **Description** — Optional. Up to 2000 characters.
5. Click **Create Event**

### Editing an Event

1. Click any event on the calendar or in the upcoming list
2. Click **Edit Event** in the detail modal
3. Modify fields and click **Update Event**

### Deleting an Event

1. Click any event
2. Click **Delete Event**
3. An inline confirmation bar appears: "Are you sure? This cannot be undone."
4. Click **Yes, Delete** to confirm or **Cancel** to abort

### Event Storage

Events are stored in `data/events.json` on the server. Each event has:

```json
{
  "id": "ev-1722070000-a1b2c3d4",
  "title": "Summer Ride",
  "date": "2026-08-15",
  "endDate": "",
  "time": "09:00",
  "category": "ride",
  "location": "Des Moines, IA",
  "description": "Annual summer ride...",
  "createdAt": "2026-07-27T12:00:00+00:00"
}
```

Events are fetched publicly by anyone visiting the page. Only admins can add, update, or delete.

---

## Newsletter System

### How It Works

1. **Signup** — User submits name + email on the homepage
2. **Data Capture** — Backend silently captures full marketing profile (see [Marketing Data Pipeline](#marketing-data-pipeline))
3. **Book Delivery** — User sees download link for free "I Can. I Will." book
4. **Newsletter Send** — Admin builds and sends biweekly newsletter via dashboard or cron

### Subscriber Data Structure

Each subscriber in `data/newsletter.json` contains:

```json
{
  "name": "John Rider",
  "email": "john@example.com",
  "signedAt": "2026-07-27T12:00:00+00:00",
  "ip": "192.168.1.1",
  "geolocation": {
    "country": "United States",
    "countryCode": "US",
    "region": "Iowa",
    "city": "Des Moines",
    "latitude": 41.5868,
    "longitude": -93.625,
    "timezone": "America/Chicago",
    "isp": "CenturyLink",
    "organization": "CenturyLink",
    "as": "AS22561",
    "proxy": false,
    "hosting": false
  },
  "network": {
    "isp": "CenturyLink",
    "organization": "CenturyLink",
    "as": "AS22561",
    "proxy": false,
    "hosting": false
  },
  "browser": {
    "userAgent": "Mozilla/5.0 ...",
    "language": "en-US",
    "jsLang": "en-US",
    "platform": "Win32",
    "screen": "1920x1080@24",
    "viewport": "1920x1080",
    "cookies": "enabled",
    "doNotTrack": ""
  },
  "context": {
    "landingPage": "https://lostlimbikers.com/",
    "referrer": "direct",
    "sourceUrl": "https://lostlimbikers.com/api/newsletter.php"
  }
}
```

### Composing a Newsletter

1. Go to `admin.html`
2. Log in with admin key
3. Click the **Send Newsletter** tab
4. Type a custom intro message (optional — default message is used if blank)
5. Click **Preview** to see the newsletter in an iframe
6. The newsletter auto-populates upcoming events from the calendar
7. Click **Send to All Subscribers** → inline confirmation → **Yes, Send**

**What the newsletter builder does:**
- Pulls next 8 upcoming events from `data/events.json`
- Fills `data/newsletter-template.html` with date range, events, custom message
- Returns HTML for preview
- The actual sending is done by `api/cron-newsletter.php` (cron job)

### Newsletter Template

Located at `data/newsletter-template.html`. Placeholders:

| Placeholder | Replaced With |
|-------------|---------------|
| `{{DATE_RANGE}}` | "Jul 27 – Aug 10, 2026" (current 2-week window) |
| `{{EVENTS_LIST}}` | HTML cards for each upcoming event with category colors |
| `{{MESSAGE}}` | Admin's custom intro message or default text |
| `{{NAME}}` | Subscriber's first name (personalized per recipient) |

**To edit the template:** Open `data/newsletter-template.html` in a text editor. It's standard HTML with inline styles (for email client compatibility).

---

## Visitor Tracking

### What Gets Captured

Every page load triggers a silent POST to `api/visit.php` with:

**Server-side (from IP):**
- IP address
- Country, region, city
- Latitude, longitude
- ISP, organization, AS number
- Proxy flag (true/false)
- Hosting flag (true/false)

**Client-side (from browser):**
- Screen resolution + color depth
- Viewport size
- Timezone
- Browser language
- Platform (Win32, MacIntel, etc.)
- Cookies enabled/disabled
- Do Not Track setting
- Full user agent string
- Landing page URL
- Referrer

### Log Format

Entries are appended to `data/visitors.log` as structured text blocks separated by `=` lines:

```
========================================================================
  VISITOR LOG ENTRY
  2026-07-27 12:00:00 UTC
========================================================================

  [NETWORK]
  IP Address:   192.168.1.1
  ISP:          CenturyLink
  Organization: CenturyLink
  AS:           AS22561
  Proxy:        No
  Hosting:      No

  [LOCATION]
  Country:      United States
  Region:       Iowa
  City:         Des Moines
  Latitude:     41.5868
  Longitude:    -93.625

  [BROWSER]
  User Agent:   Mozilla/5.0 ...
  Language:     en-US
  JS Lang:      en-US
  Platform:     Win32
  Screen:       1920x1080@24
  Cookies:      enabled
  Do Not Track:

  [REQUEST]
  Method:       POST
  URL:          https://lostlimbikers.com/api/visit.php
  Referrer:     direct
  Page:         https://lostlimbikers.com/
  Timezone:     America/Chicago
```

---

## Admin Dashboard

The admin dashboard at `admin.html` provides:

### Stats Overview (top cards)
- **Total Visits** — All-time visitor count from log
- **Today** — Visits today (UTC date)
- **Subscribers** — Total newsletter subscribers

### Charts
- **Top Countries** — Bar chart of visitor countries (top 10)
- **Browsers** — Bar chart of Chrome/Firefox/Safari/Edge/Other breakdown

### Tabs

**Subscribers Tab:**
- Full table of all subscribers
- Columns: Name, Email, Country, City, ISP, Platform, Screen, Proxy/Hosting badge, Subscribed date
- Proxy/hosting badges: red "Proxy", amber "Hosting", green "Clean"

**Visitor Log Tab:**
- Paginated table (25 per page)
- Columns: Timestamp, IP, Country, City, ISP, Page, User Agent
- Prev/Next pagination with page count

**Send Newsletter Tab:**
- Textarea for custom intro message
- **Preview** button — renders newsletter in iframe
- **Send to All Subscribers** button — builds HTML, shows instructions for cron sending
- Inline confirmation bar before send

---

## API Reference

### `api/events.php`

| Action | Method | Auth | Description |
|--------|--------|------|-------------|
| `list` | GET | No | Returns all events |
| `add` | POST | Yes | Creates new event |
| `update` | POST | Yes | Updates existing event by ID |
| `delete` | POST | Yes | Deletes event by ID |

**Auth:** Pass `?key=YOUR_ADMIN_KEY` as query parameter.

**Add/Update payload:**
```json
{
  "title": "Event Name",
  "date": "2026-08-15",
  "endDate": "",
  "time": "09:00",
  "category": "ride",
  "location": "Des Moines, IA",
  "description": "Event details..."
}
```

### `api/newsletter.php`

| Method | Auth | Description |
|--------|------|-------------|
| POST | No | Subscribe new user |

**Payload:**
```json
{
  "name": "John Rider",
  "email": "john@example.com",
  "screen": "1920x1080@24",
  "viewport": "1920x1080",
  "timezone": "America/Chicago",
  "lang": "en-US",
  "platform": "Win32",
  "cookies": "enabled",
  "dnt": "",
  "page": "https://lostlimbikers.com/"
}
```

**Response (success):**
```json
{ "ok": true, "message": "Welcome to the ride. You are now subscribed." }
```

**Response (duplicate):**
```json
{ "ok": true, "message": "You are already subscribed." }
```

### `api/visit.php`

| Method | Auth | Description |
|--------|------|-------------|
| POST | No | Log visitor data |

**Payload:** Same client-side fields as newsletter signup (screen, timezone, lang, platform, cookies, dnt, page).

### `api/admin.php`

| Action | Method | Auth | Description |
|--------|--------|------|-------------|
| `stats` | GET | Yes | Dashboard stats (visits, subscribers, countries, browsers) |
| `visitors` | GET | Yes | Paginated visitor log. Params: `page`, `limit` |
| `subscribers` | GET | Yes | Full subscriber list with profiles |
| `send-newsletter` | POST | Yes | Build newsletter HTML from template + events |

**Auth:** `?key=YOUR_ADMIN_KEY` query param or `X-Admin-Key` header.

### `api/cron-newsletter.php`

Run via CLI (not HTTP). Sends actual emails to all subscribers.

```bash
php api/cron-newsletter.php
```

**Env var:** `NEWSLETTER_MESSAGE` — optional custom intro message.

### `api/guestbook.php`

| Action | Method | Auth | Description |
|--------|--------|------|-------------|
| `list` | GET | No | Returns all guestbook entries |
| `add` | POST | No | Add new entry |
| `clear` | POST | Yes | Delete all entries |
| `download` | GET | Yes | Download entries as JSON file |

---

## Data Files

### `data/events.json`
- JSON array of event objects
- Pre-seeded with sample events
- Managed by `api/events.php`
- Publicly readable, admin-writable

### `data/newsletter.json`
- JSON array of subscriber profile objects
- Each entry contains: name, email, signedAt, ip, full geolocation, network, browser, context
- Managed by `api/newsletter.php` (write) and `api/admin.php` (read)
- Max 5000 entries (oldest trimmed automatically)
- **This is your marketing database**

### `data/visitors.log`
- Plain text, appended on each visit
- Managed by `api/visit.php` (write) and `api/admin.php` (read/parse)
- Grows indefinitely — consider periodic cleanup for very large sites
- Entries separated by 72 `=` characters

### `data/guestbook.json`
- JSON array of guestbook entries
- Managed by `api/guestbook.php`
- Max 500 entries

### `data/newsletter-template.html`
- HTML email template with inline styles
- Placeholders: `{{DATE_RANGE}}`, `{{EVENTS_LIST}}`, `{{MESSAGE}}`, `{{NAME}}`
- Edited directly in text editor
- `{{NAME}}` is replaced per-recipient during cron send

---

## Environment Variables

| Variable | Required | Used By | Purpose |
|----------|----------|---------|---------|
| `GUESTBOOK_ADMIN_KEY` | Yes | All admin APIs | Admin authentication key. Set this to a strong, random string. |

**Setting the variable:**

```bash
# In your shell profile or server config
export GUESTBOOK_ADMIN_KEY="your-secret-key-here"

# Or in .htaccess for Apache
SetEnv GUESTBOOK_ADMIN_KEY "your-secret-key-here"

# Or in PHP-FPM pool config
env[GUESTBOOK_ADMIN_KEY] = your-secret-key-here
```

**Optional:**

| Variable | Used By | Purpose |
|----------|---------|---------|
| `NEWSLETTER_MESSAGE` | `api/cron-newsletter.php` | Custom intro message for automated sends |

---

## Cron Jobs

### Automated Newsletter Sending

Set up a cron job to send the newsletter every 2 weeks:

```bash
# Edit crontab
crontab -e

# Add this line (every other Monday at 9 AM UTC):
0 9 1-7,15-21 * 1  php /path/to/api/cron-newsletter.php >> /path/to/data/cron-newsletter.log 2>&1
```

**Cron schedule breakdown:**
- `0` — minute 0
- `9` — 9 AM
- `1-7,15-21` — days 1-7 and 15-21 of each month (first and third weeks)
- `*` — every month
- `1` — Monday only

**With custom message:**
```bash
0 9 1-7,15-21 * 1  NEWSLETTER_MESSAGE="Big rides coming this month!" php /path/to/api/cron-newsletter.php >> /path/to/data/cron-newsletter.log 2>&1
```

**What cron-newsletter.php does:**
1. Loads all subscribers from `data/newsletter.json`
2. Loads upcoming events from `data/events.json`
3. Fills `data/newsletter-template.html`
4. Sends personalized email to each subscriber via PHP `mail()`
5. Logs sent/failed counts

**Email headers include:**
- From: `Lost Limb Riders <noreply@lostlimbikers.com>`
- Reply-To: `info@lostlimbikers.com`
- List-Unsubscribe header (CAN-SPAM compliant)

---

## Marketing Data Pipeline

### What You're Collecting

Every newsletter subscriber is profiled with:

1. **Identity** — Name, email, signup timestamp
2. **Location** — Country, region, city, lat/lon, timezone
3. **Network** — ISP, organization, AS number, proxy flag, hosting flag
4. **Device** — Platform, screen resolution, viewport, browser language, cookies, DNT
5. **Behavior** — Landing page, referrer, source URL

### How It's Captured

- **Server-side:** IP → ip-api.com geolocation (silent, no browser prompt)
- **Client-side:** Passive browser APIs (`navigator.language`, `screen.width`, `Intl.DateTimeFormat`, etc.)
- **Zero permission prompts** — No `navigator.geolocation`, no `confirm()`, no `alert()`, no browser dialogs

### Using the Data

**For sponsorship pitches:**
- Show subscriber count, geographic distribution, device breakdown
- Prove audience is real and engaged
- Demonstrate reach in target markets

**For targeted campaigns:**
- Segment by country/region for location-specific events
- Identify high-value ISP/organization segments
- Proxy/hosting flags help filter out bots

**For growth tracking:**
- Monitor signup rate over time
- Track which pages drive signups (via `context.landingPage`)
- Analyze referrer sources

### Data Retention

- `newsletter.json`: Max 5000 subscribers (oldest trimmed on new signup)
- `visitors.log`: Grows indefinitely (manual cleanup recommended periodically)
- `events.json`: No limit (admin manages manually)

---

## Troubleshooting

### "Admin access required" (403)

- Check that `GUESTBOOK_ADMIN_KEY` environment variable is set on the server
- Verify you're entering the correct key
- The key must match exactly (case-sensitive)

### Events not loading

- Check `data/events.json` exists and is valid JSON
- Verify `api/events.php` is accessible (try `?action=list` in browser)
- Check server error logs for PHP errors

### Newsletter not sending (cron)

- Verify PHP `mail()` function works on the server
- Check `data/cron-newsletter.log` for error output
- Ensure `data/newsletter-template.html` exists
- Test manually: `php api/cron-newsletter.php`

### Visitor log not updating

- Check `data/` directory is writable by the web server
- Verify `api/visit.php` is being called (check browser Network tab)
- Look for PHP errors in server logs

### Newsletter signup returns error

- **422 "Valid name and email are required"** — Check name isn't empty and email is valid format
- **500 "Storage not writable"** — `data/` directory permissions issue
- **Already subscribed** — Email already in the list (this is normal behavior)

### Calendar admin mode not activating

- Make sure you're not focused on an input/textarea when pressing A
- Close any open modals first
- Check that the admin key was accepted (toast notification should appear)

### CSS inconsistencies across pages

Each page has inline CSS with shared custom properties in `:root`. If you change a color variable on one page, update it on all pages:

```css
:root {
  --orange: #ff6a00;
  --orange-dark: #c94f00;
  --black: #050505;
  --charcoal: #101010;
  --card: #171717;
  --line: rgba(255,255,255,.14);
  --muted: #b7b7b7;
  --white: #ffffff;
}
```

These must match across `index.html`, `events.html`, `media.html`, `mission.html`, and `admin.html`.

---

## Quick Reference Card

| Task | How |
|------|-----|
| Add an event | events.html → Press A → Click "+" → Fill form → Create |
| Edit an event | events.html → Click event → Edit Event → Update |
| Delete an event | events.html → Click event → Delete Event → Yes, Delete |
| View subscriber profiles | admin.html → Subscribers tab |
| View visitor log | admin.html → Visitor Log tab |
| Preview newsletter | admin.html → Send Newsletter tab → Preview |
| Send newsletter (manual) | admin.html → Send Newsletter tab → Send → Run cron |
| Send newsletter (automated) | Cron runs `php api/cron-newsletter.php` every 2 weeks |
| Edit newsletter template | Edit `data/newsletter-template.html` directly |
| Add sample events | Edit `data/events.json` directly |
| Export subscriber data | Read `data/newsletter.json` |
| Export visitor data | Read `data/visitors.log` |
| Change admin key | Update `GUESTBOOK_ADMIN_KEY` env var, restart PHP |
| View raw stats | `api/admin.php?action=stats&key=YOUR_KEY` |
