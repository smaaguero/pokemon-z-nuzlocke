# Pokémon Z Nuzlocke Tracker & Battle Companion

A lightweight web app for running a **Pokémon Z** Nuzlocke: track each player's
party and graveyard, look up type matchups, and estimate damage — with optional
**server-stored tournaments** so a run is permanent and shared across devices.

Built with **Astro** (static output) + **React** islands + **Tailwind CSS v4**.
Deployed on **Netlify**; the one dynamic piece is a single serverless function
(`/api/tournaments`) backed by **Netlify Blobs**.

## Pages

| Route           | What it does |
| :-------------- | :----------- |
| `/`             | Overview — party (max 6), graveyard/memorial, encounter drawer, "mark as fallen", revive/undo, JSON export/import. Works on a **local run** (this device) or an open **tournament**. |
| `/tournaments`  | Create / open / rename / delete tournaments. Optional edit passphrase. |
| `/types`        | Gen 6+ type chart — defensive dual-type + offensive coverage. |
| `/calc`         | Damage calculator — SDD formula, Gen V+ modifier chain, min/max rolls, %HP, KO estimate. |
| `/rules`        | Nuzlocke rules and toggleable optional clauses (in Spanish). |

## Data & storage

- **Local run** — kept in the browser's `localStorage`. Zero setup, offline, per-device.
- **Tournament** — a named container of players + Pokémon stored server-side via
  `/api/tournaments` + Netlify Blobs. Autosaves (debounced) while you play,
  caches locally for offline, and reconciles on reload. Same run on every device.
- **JSON backup** — Export/Import a `nuzlocke_backup.json` at any time (works for
  both local runs and tournaments).

Set `NUZLOCKE_EDIT_PASSPHRASE` in the Netlify site's environment variables to
require a shared passphrase for creating/editing tournaments (viewing stays open).
Leave it unset and writes are open to anyone with the site URL.

## Commands

| Command             | Action |
| :------------------ | :----- |
| `npm install`       | Install dependencies |
| `npm run dev`       | Astro dev server at `localhost:4321` (UI only — tournaments backend runs in "local-only" fallback) |
| `npm run build`     | Build the static site to `./dist/` |
| `npm run preview`   | Preview the built site |
| `npm run check`     | `astro check` + `tsc --noEmit` |
| `npx netlify dev`   | After `npm run build`: serve `dist/` + the `/api` function + a local Blobs sandbox |

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** — GitHub + Netlify/Cloudflare Pages,
auto-deploy on push, the optional passphrase, and how participants share saves.
