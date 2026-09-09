# Deployment

The site is a **static** Astro build (`output: 'static'`) plus **one serverless
function** — `netlify/functions/tournaments.mts` — that stores tournaments in
**Netlify Blobs**. Everything else (local runs, battle tools, rules) is pure
client-side and needs no server.

- `dist/` — static HTML/CSS/JS, servable anywhere.
- `/api/tournaments` — the function. Auto-deployed by Netlify from
  `netlify/functions/`. Netlify Blobs is **auto-provisioned on deploy** — nothing
  to configure, no database, no keys.

> **Netlify is the recommended host** because the tournaments feature uses
> Netlify Blobs. On a host without that function the app still runs fully — it
> just falls back to **local runs only** (per-device `localStorage` + JSON
> export/import).

---

## 1. Build locally (dry run)

```bash
npm install
npm run build      # -> dist/  (exit 0, no warnings)
npm run check      # astro check + tsc --noEmit
npm run preview    # serve the static build

# Optional: exercise the /api function + a local Blobs sandbox
npm run build && npx netlify dev
```

Requires **Node 22.12+** (pinned in `.nvmrc` and `netlify.toml`).

---

## 2. Push to GitHub

```bash
git add .
git commit -m "…"
git push               # first time: git push -u origin main
```

`dist/`, `node_modules/`, and `.netlify/` are in `.gitignore`.

---

## 3. Deploy on Netlify (auto-deploy on push)

1. <https://app.netlify.com> → sign in with GitHub.
2. **Add new site → Import an existing project → GitHub** → pick the repo.
3. [`netlify.toml`](./netlify.toml) pre-fills everything:
   - Build command `npm run build`, publish dir `dist`, functions dir
     `netlify/functions`, Node `22`.
4. **Deploy.** Every push to `main` redeploys; PRs get preview URLs.
5. (Optional) **Site configuration → Change site name** for a tidy
   `https://<name>.netlify.app`, or add a custom domain.

### Optional: lock down editing with a passphrase

By default **anyone with the site URL can create and edit tournaments**. To
require a shared passphrase for writes (viewing stays open):

1. Netlify → **Site configuration → Environment variables → Add a variable**.
2. Key `NUZLOCKE_EDIT_PASSPHRASE`, value = your chosen passphrase.
3. **Trigger a redeploy** (env changes need a new build).
4. Share the passphrase with participants. In the app: **Tournaments →
   Edit passphrase → Save** (stored only in their browser). A stuck save shows
   *"Passphrase required"* until it's set.

To change or remove it, edit/delete the variable and redeploy.

### Cloudflare Pages

Cloudflare Pages can host the **static app** (Build command `npm run build`,
output `dist`, env `NODE_VERSION=22`), but **not** the tournaments function —
Netlify Blobs is Netlify-only. There it runs in local-run-only mode. Porting the
function to a Cloudflare Pages Function + KV/D1 would be needed for tournaments.

---

## 4. For participants

Open the public URL in any browser — nothing to install.

**Local run** (default): tracked in that browser only. Good for a quick solo game
or offline. Move it between devices with **Overview → Export Save /
Import Save** (`nuzlocke_backup.json`).

**Tournaments** (shared, permanent):

1. **Tournaments** in the nav → **New tournament** → name it → *Create & open*.
   Tick *"Start from my current local run"* to carry over what you already have.
2. Play on **Overview** as usual. Changes autosave to the server (the *Saved* /
   *Saving…* pill on the run bar shows status); they're also cached locally, so
   an offline patch syncs when you reconnect (*Retry* on the pill).
3. On another device, open the same site → **Tournaments** → **Open** the same
   tournament. Same players, same graveyard.
4. Switch between the local run and any tournament from the **Run** dropdown at
   the top of Overview.

Editing the same tournament from two devices at once = last save wins, so
coordinate, or give each player their own player-card within one tournament.
