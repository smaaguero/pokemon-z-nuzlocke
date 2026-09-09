# Deployment

This is a **static** site (Astro `output: 'static'`). The production build is a
plain `dist/` folder of HTML/CSS/JS — no server, no database, no environment
variables. Any static host works; the free tiers of **Netlify** and
**Cloudflare Pages** are both a good fit and give automatic deploys on every
`git push`.

All app state (teams, graveyard, rule clauses) lives in the visitor's browser
`localStorage`. Participants sync between devices with the **Export / Import
Save** buttons, not a shared backend.

---

## 1. Build locally (dry run)

```bash
npm install
npm run build      # outputs dist/
npm run preview    # serves dist/ at http://localhost:4321 to verify
```

`npm run build` must finish with exit code 0 and no warnings. `npm run check`
(`astro check` + `tsc --noEmit`) type-checks the project.

Requires **Node 22.12+** (pinned in `.nvmrc` and `netlify.toml`).

---

## 2. Push the repository to GitHub

From the project root:

```bash
git init
git add .
git commit -m "Initial commit: Pokémon Z Nuzlocke tracker"
git branch -M main

# Create an empty repo on github.com first (no README/licence), then:
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

`dist/` and `node_modules/` are already in `.gitignore` — don't commit them.

---

## 3a. Deploy on Netlify

1. Sign in at <https://app.netlify.com> with GitHub.
2. **Add new site → Import an existing project → GitHub**, then pick the repo.
3. Netlify reads [`netlify.toml`](./netlify.toml), so the fields are pre-filled:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** `22` (via `NODE_VERSION`)
4. Click **Deploy**. First build takes ~1 minute.
5. Every push to `main` now redeploys automatically. Pull requests get their own
   preview URL.
6. (Optional) **Site configuration → Change site name** to get a tidy
   `https://<name>.netlify.app`, or add a custom domain under **Domain
   management**.

## 3b. Deploy on Cloudflare Pages

1. Sign in at <https://dash.cloudflare.com> → **Workers & Pages → Create →
   Pages → Connect to Git**.
2. Authorise GitHub and select the repo.
3. Build settings:
   | Setting | Value |
   | --- | --- |
   | Framework preset | `Astro` (or *None*) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Environment variable | `NODE_VERSION` = `22` |
4. **Save and Deploy.** Subsequent pushes to `main` redeploy automatically;
   other branches get preview deployments.
5. The site is live at `https://<project>.pages.dev`. Add a custom domain under
   the project's **Custom domains** tab if you want one.

> Use **one** of the two providers. Both configs can coexist in the repo
> harmlessly — Cloudflare Pages ignores `netlify.toml` and vice versa.

---

## 4. Using the live site (for participants)

1. Open the public URL (the `*.netlify.app` / `*.pages.dev` link, or the custom
   domain) in any modern browser — desktop or mobile. Nothing to install.
2. Track your run on **Overview**: register encounters, mark Pokémon as fallen,
   check the graveyard. Everything saves to that browser automatically.
3. The battle tools (**Type Chart**, **Damage Calculator**) and **Reglas**
   work offline once the page has loaded.

### Sharing / moving your save

Because each browser keeps its own data, use the JSON file to move or share a
run:

- **Export:** Overview → **Export Save** → downloads `nuzlocke_backup.json`.
- **Import:** on the other device/browser, Overview → **Import Save** → pick the
  file → confirm. It validates the file against the save schema and replaces the
  local teams and graveyard, showing a confirmation toast.
- Send the `.json` file to another participant (chat, email, shared drive) and
  they import it the same way to see your exact team and graveyard state.

Keep a fresh export as a backup before importing — importing overwrites whatever
is currently in that browser.
