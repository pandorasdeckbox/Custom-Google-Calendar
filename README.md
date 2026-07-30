# Custom Google Calendar

Branded Google Calendar embed for Pandora's Deck Box.

This project keeps Google Calendar as the source of truth, but replaces the stock iframe with a custom front end that you can embed on your site.

## What this app does

- Fetches upcoming events from the Google Calendar API on the server.
- Revalidates every 5 minutes so Railway can serve cached, fresh-enough event data.
- Normalizes Google events into game categories like Magic, Pokemon, Lorcana, and more.
- Exposes a styled embed page at `/embed`.
- Exposes a JSON feed at `/api/events` for debugging or future integrations.
- Falls back to sample events when credentials are missing so the UI can be built safely before production setup.

## Local development

1. Install dependencies:
# Custom Google Calendar

Branded Google Calendar embed for Pandora's Deck Box.

This project keeps Google Calendar as the source of truth, but replaces the stock iframe with a custom event board that can be embedded on your site.

## What the app does now

- Fetches event data from one or more public Google Calendars on the server.
- Revalidates every 5 minutes so Railway can serve cached event data without redeploys.
- Normalizes live Google events into store categories like Magic, Pokemon, Lorcana, Marvel, Riftbound, and more.
- Renders a month-level event grid tuned to the store's Thursday through Sunday event cadence.
- Renders a dedicated one-row weekly view for the upcoming Thursday through Sunday store window, including cross-month weeks.
- Supports month navigation with `?month=YYYY-MM` on both `/` and `/embed`.
- Supports week navigation with `?week=YYYY-MM-DD` on `/week` and `/week/image`.
- Exposes a JSON feed at `/api/events` for debugging or future integrations.
- Exposes a Discord-ready weekly image at `/week/image` and a webhook trigger at `/api/discord/weekly`.
- Falls back to sample events when credentials are missing.
- Returns HTTP `503` from `/api/events` when live Google credentials exist but the live fetch fails, so deployment health checks can catch real feed problems.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Copy the env template:

```bash
cp .env.example .env.local
```

3. Add at minimum:

```bash
GOOGLE_CALENDAR_API_KEY=your-public-calendar-api-key
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
CALENDAR_TIME_ZONE=America/New_York
```

4. Start the app:

```bash
npm run dev
```

Then open `http://localhost:3000` for the operator preview or `http://localhost:3000/embed` for the iframe target.

## Configuration

This build assumes public Google Calendars.

- Create or use a Google Cloud API key with Calendar API access.
- Make the calendar public in Google Calendar settings.
- Copy the calendar ID from Google Calendar "Integrate calendar" settings.

If you split your schedule across multiple Google calendars, use `GOOGLE_CALENDAR_SOURCES_JSON` instead of a single calendar ID.

Example:

```json
[
  {
    "id": "magic-events@group.calendar.google.com",
    "label": "Magic",
    "category": "magic"
  },
  {
    "id": "pokemon-events@group.calendar.google.com",
    "label": "Pokemon",
    "category": "pokemon"
  }
]
```

Other useful settings:

- `CALENDAR_TIME_ZONE`: forces the store display timezone used for day bucketing and time formatting.
- `CALENDAR_DISPLAY_DAYS`: comma-separated weekday list for the event grid. Default is `thu,fri,sat,sun`.
- `CALENDAR_LOOKAHEAD_DAYS`: how far ahead the live fetch should look. Default is `90`.
- `NEXT_PUBLIC_EMBED_TITLE`: header title shown above the event grid.
- `NEXT_PUBLIC_EMBED_SUBTITLE`: supporting copy shown below the month heading.
- `NEXT_PUBLIC_CALENDAR_URL`: outbound link target for the "Open Google Calendar" action.
- `DISCORD_WEEKLY_WEBHOOK_URL`: Discord webhook used by `/api/discord/weekly` to post the weekly image.
- `DISCORD_WEEKLY_POST_SECRET`: optional bearer or `x-calendar-post-secret` value required by the weekly Discord route.

## Routes

- `/`: operator preview page with live status cards and the full calendar preview.
- `/embed`: iframe-safe calendar surface for the main website.
- `/week`: single-row weekly preview tuned for the Thursday-through-Sunday store week.
- `/week/image`: PNG rendering of the weekly view for Discord uploads.
- `/api/events`: raw event feed with month and week query support.
- `/api/discord/weekly`: GET preview payload and POST trigger for weekly Discord uploads.

Examples:

- `/embed?month=2026-07`
- `/api/events?month=2026-07`
- `/week?week=2026-07-27`
- `/api/events?view=week&week=2026-07-27`

## Railway notes

- `railway.json` is included with a simple `npm run start` deploy target.
- Set the same environment variables in Railway.
- Use `/embed` as the route you iframe into the main website.
- Use `/api/events` as the health/data check route.
- Schedule a Monday POST to `/api/discord/weekly` once `DISCORD_WEEKLY_WEBHOOK_URL` is configured.
- If Google Calendar credentials are configured but the live fetch breaks, `/api/events` now returns `503` instead of quietly looking healthy.

## What is still worth improving

- Swap the current text monograms for final brand-approved icon artwork.
- Tune category keyword matching to your exact live naming conventions.
- If you want the pasted calendar look even closer, add bespoke per-game art treatments or source-specific icon assets.
