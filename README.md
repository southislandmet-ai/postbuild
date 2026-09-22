# South Island Met — Smart Post Generator

A private, single-page web app that pulls **live forecast data** from your
Firebase Realtime Database (SnowCast, StormCast, Regional Weather Notice,
Significant Weather Outlook) and uses **Claude** to draft a ready-to-publish
Facebook post in your South Island Met voice.

## Running it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
```

Since this is for personal use, the simplest way to use it day-to-day is
`npm run dev` (or `npm run preview` after a build) and open it in your
browser whenever you need to write a post.

## First-time setup

1. Open the app and click **Settings**.
2. Paste your Claude API key. It's stored only in this browser's
   `localStorage` — it is never committed to the repo and never sent
   anywhere except directly to Anthropic when you click Generate.
3. Check the **Firebase data mapping** section. Each console (SnowCast,
   StormCast, Regional Weather Notice, Significant Weather Outlook) has a
   default Realtime Database path guess (`snowcast`, `stormcast`,
   `regionalWeatherNotice`, `significantWeatherOutlook`). If your actual
   data lives at a different path, update it here — the app connects live
   and will show a "Live" badge once it finds data.
4. If a forecast's regions or days aren't showing up automatically, the app
   tries a range of common field names (`regions`, `regionalBreakdown`,
   `areas`, `area`/`region`/`name`, `timeframe`/`time`, `analysis`/`details`,
   etc). If your schema uses something unusual, set the exact field name in
   the **Regions array field** / **Days array field** override boxes.

## Using it

1. **Choose what to include** — tick the checkbox for each forecast type you
   want in the post (SnowCast, StormCast, Regional Weather Notice,
   Significant Weather Outlook — any combination). For each one enabled,
   pick which active forecast (if more than one is live), then tick the
   specific regions (or outlook days) you want included. Every ticked
   region/day always brings its area, timeframe and analysis through.
2. **Choose the style** — Quick summary / Standard / Detailed / Custom, plus
   a free-text box for any extra direction ("lead with the storm warning",
   "keep it under 80 words", "this is the final update", etc).
3. **Generate** — Claude writes the post in NZ English, in a South Island
   Met Facebook voice, blending everything you selected into one coherent
   post. Copy it to your clipboard and paste into Facebook.

## Notes on data access

Firebase reads use the public client SDK config, governed entirely by your
Realtime Database security rules (read is enabled, as you described). No
Firebase Admin credentials or write access are used anywhere in this app.

## Architecture

- `src/lib/firebase.js` — Firebase app + Realtime Database live subscriptions.
- `src/lib/normalize.js` — turns whatever shape your data is in (array,
  object-of-push-ids, or a single object) into a consistent structure, and
  filters to active forecasts.
- `src/lib/buildPrompt.js` — turns your selections + style choices into the
  system/user prompt sent to Claude.
- `src/lib/claude.js` — calls the Claude Messages API directly from the
  browser (personal-use only; see security note below).
- `src/lib/settings.js` — persists your API key, model choice and Firebase
  path/field overrides to `localStorage`.
- `src/components/` — the UI: forecast panels, style controls, settings
  modal, output panel.

## Security note

This app calls the Anthropic API directly from the browser, which requires
sending your API key from client-side JavaScript. That's fine for a private
tool only you run locally, but do not deploy this build to a public URL
without adding a small server-side proxy to keep the key off the client.
