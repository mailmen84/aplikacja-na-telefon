# Homelab Wiki

A personal, offline-first **PWA** (installable web app) that works as a mobile wiki for
Linux, Windows, PowerShell, Windows Server, networking/CCNA, homelab and security
troubleshooting. Full-text search, categories, copy-to-clipboard command cards, and a
couple of built-in calculators.

Open it on a phone's browser → menu → **Add to Home screen / Install app**. After that it
launches like a native app and works with no internet.

## What's inside

- **Articles** — long-form notes in `content/<category>/*.md` (Markdown with frontmatter).
- **Command cards** — short "command → what it does" entries in `commands/*.yaml`, with
  platform, category, tags, and `admin` / `danger` flags.
- **Categories** — defined in `content/categories.yaml` (order = home-screen order).
- **Tools** — an IPv4 subnet calculator and a chmod calculator (`src/app.js`).

Everything is compiled by `scripts/build.mjs` into a single static `dist/` folder:
one `data.json` (all content + a search index is built in the browser with MiniSearch),
the app shell, and a service worker for offline use.

## Develop

```bash
npm install
npm run build      # compile content -> dist/
npm run serve      # serve dist/ at http://localhost:4173
# or both at once:
npm run dev
```

The build **fails on bad content**: unknown category, missing title, broken internal link,
or an unknown command platform/category. That keeps the data honest.

### Add content

- **A command card:** edit or add a file under `commands/`. Copy an existing group as a
  template. `category` must be an id from `categories.yaml`; `platform` is one of
  `linux, cmd, powershell, cisco, windows, proxmox, docker, git, shell`.
  Mark dangerous commands with `danger: "why"` and privileged ones with `admin: true`.
- **An article:** add `content/<category>/<slug>.md` with frontmatter:

  ```markdown
  ---
  title: My page
  summary: One line shown under the title and in lists
  tags: [thing, other]
  order: 5
  ---

  ## A section
  Body text, `code`, tables, and ```fenced``` code blocks (which get copy buttons).
  ```

  Link between articles with `[text](../category/slug.md)` or `[text](slug.md#heading)`.

## Hosting

The app is pure static files, so it can go anywhere. The included GitHub Actions workflow
(`.github/workflows/deploy.yml`) deploys to **Cloudflare Pages** — free and works from a
**private** repo.

One-time setup:

1. Create a Cloudflare account → **Workers & Pages** → create a Pages project named
   `homelab-wiki` (direct-upload type; no need to connect the repo).
2. Create an API token (**My Profile → API Tokens →** template *"Edit Cloudflare Workers"*,
   or a custom token with the *Pages → Edit* permission). Note your **Account ID**.
3. In the GitHub repo → **Settings → Secrets and variables → Actions**, add:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. Push to `main`. The workflow builds and deploys; your app is at
   `https://homelab-wiki.pages.dev` (you can add a custom domain later).

Until the secrets exist, the workflow still builds (so it catches content errors) and just
skips the deploy step. You can also deploy manually with
`npx wrangler pages deploy dist --project-name=homelab-wiki`.

## Content sources

Seeded from the author's own notes repos (`poradnik-komend`, `linux-notes`, `pentest-`),
translated to English, verified and expanded. Security material is for authorized,
own-homelab use only — see the Security category's overview page.
