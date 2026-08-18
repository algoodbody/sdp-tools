Author: Rob Hopkins
Owner: Rob Hopkins
NOTE: Please contact Rob Hopkins for any significant edits, changes or questions.

---

# SDP Tools

A local web app for managing ManageEngine ServiceDesk Plus (Cloud) requests: search/filter/sort a live requests grid, filter by technician, choose visible columns, and close tickets individually or in bulk.

**Stack:** Node.js / Express / TypeScript (backend, proxies the SDP Cloud REST API v3) + React / TypeScript / Tailwind CSS (frontend) + pm2 (process hosting).

## Features

- **Requests grid** — sortable, filterable, searchable, Excel-style table (TanStack Table) with a **column chooser** to show/hide columns.
- **Filter by technician** — searchable technician dropdown; pick one to see just their tickets. Also filter by status.
- Click a **Request ID** to open the ticket directly in ServiceDesk Plus.
- **Close a ticket** — per-row "Close" button opens a modal to capture resolution, category, sub-category, item, and closure code.
- **Bulk actions** — select multiple rows (e.g. all tickets for a technician) and bulk-close them with the same details applied to every ticket.
- **Settings** tab to configure the ServiceDesk Plus Cloud OAuth connection, with a one-click **Connect** button that runs the OAuth authorization flow and captures the refresh token automatically (no manual token generation/pasting required), plus a "Test connection" button.
- **Logs** tab to view recent server activity/errors (auto-refreshing).
- Ships with **demo/mock data** out of the box so the UI is usable before you configure a real connection.

## Project layout

```
server/   Express + TypeScript API, proxies ServiceDesk Plus Cloud API v3, serves the built client
client/   React + TypeScript + Tailwind frontend (Vite)
ecosystem.config.js   pm2 process definition
```

## Setup

```bash
npm install
```

### Connecting to ServiceDesk Plus Cloud

1. In the app's **Settings** tab, pick your data center and enter your portal name — the tab shows the exact **redirect URI** to use (`http://<host>:<port>/api/settings/oauth/callback`).
2. Create a **Server-based Application** OAuth client at `https://api-console.zoho.<dc>` (e.g. `zoho.eu`, `zoho.com`, `zoho.in`) for your data center, and add that redirect URI to its authorized redirect URIs. (Requesting scope `SDPOnDemand.requests.ALL,SDPOnDemand.technicians.READ` — add more scopes if you extend the app.)
3. Enter the Client ID and Client secret in Settings and click **Save details**.
4. Click **Connect to ServiceDesk Plus…** — you'll be sent to Zoho's consent screen, and on approval the app captures and stores a refresh token automatically. No manual token generation or pasting required.
5. Click **Test connection** to confirm.

If you already have a refresh token from a Self Client OAuth app (or prefer not to use the interactive flow), the "Advanced" section in Settings lets you paste one in directly instead of using Connect.

Until configured, the app serves demo data so you can try out the UI.

## Development

Runs the API on `:4000` and the Vite dev server (with API proxy) on `:5173`.

```bash
npm run dev:server   # terminal 1
npm run dev:client   # terminal 2
```

## Production build & pm2 hosting

```bash
npm run build          # builds client, then server (server serves the built client)
pm2 start ecosystem.config.js
```

Or in one step:

```bash
npm run pm2:start
```

Other pm2 helpers: `npm run pm2:restart`, `npm run pm2:stop`, `npm run pm2:logs`.

By default the app listens on port `4000` (override with `PORT` in `ecosystem.config.js` or the environment).

### Windows deployment

On a Windows host, `deploy.ps1` wraps the pull/install/build/pm2 steps above into one command:

```powershell
.\deploy.ps1
```

It pulls the latest changes for the current branch, runs `npm install` and `npm run build`, then starts (or restarts, if already running) the app under pm2 via `ecosystem.config.js`, saving the pm2 process list with `npx pm2 save`.

`pm2 startup` only supports Unix-style init systems (systemd, upstart, launchd, etc.) and does nothing useful on Windows, so it won't bring the app back after a reboot there. To auto-start on Windows, instead register a Task Scheduler task (or use a service wrapper like [pm2-installer](https://github.com/jessety/pm2-installer) or [NSSM](https://nssm.cc/)) that runs on logon/boot and executes `npx pm2 resurrect` from the repo root — that restores whatever was running when you last ran `pm2 save`.

Useful flags:

- `-Branch <name>` — check out and pull a specific branch first.
- `-SkipPull` — deploy whatever is already on disk, no `git pull`.
- `-SkipInstall` — skip `npm install` and reuse `node_modules`.
- `-Port <n>` — port to deploy on (defaults to `4000`).
- `-OpenBrowser` — open the app in your default browser once it's confirmed healthy.

On success the script prints the app's URL on its own line so terminals that auto-linkify plain URLs (Windows Terminal, VS Code's integrated terminal, etc.) make it clickable; use `-OpenBrowser` if you'd rather it opened for you automatically. If `npm install` fails with `npm error Exit handler never called!`, that's a known npm client bug ([npm/cli#4028](https://github.com/npm/cli/issues/4028)) unrelated to this project — the script retries automatically up to three times, cleaning the npm cache after the first failure and doing a clean `node_modules` reinstall after the second. If it still fails after all three attempts, something outside npm's control is most likely interfering (commonly antivirus/EDR scanning or locking files under the npm cache or repo folder) — try excluding both from real-time scanning, or update npm (`npm install -g npm@latest`).

## Notes

- Settings (including credentials) are stored locally in `server/data/settings.json`, which is git-ignored. The client/secret and refresh token are never sent back to the browser once saved.
- Logs are written to `server/logs/app.log` (rotated) and surfaced in the Logs tab.
- Category/sub-category/item on the close-ticket form are free-text fields — adjust `server/src/services/sdpClient.ts` if your SDP instance requires IDs from specific cascading pick-lists instead of names.
