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
- **Settings** tab to configure the ServiceDesk Plus Cloud OAuth connection (data center, portal name, client ID/secret, refresh token), with a "Test connection" button.
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

1. Create a **Self Client** OAuth app at `https://api-console.zoho.<dc>` (e.g. `zoho.eu`, `zoho.com`, `zoho.in`) for your data center.
2. Generate a refresh token with scope `SDPOnDemand.requests.ALL,SDPOnDemand.technicians.READ` (add more scopes if you extend the app).
3. In the app's **Settings** tab, enter your data center, portal name, client ID, client secret, and refresh token, then **Save** and **Test connection**.

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

## Notes

- Settings (including credentials) are stored locally in `server/data/settings.json`, which is git-ignored. The client/secret and refresh token are never sent back to the browser once saved.
- Logs are written to `server/logs/app.log` (rotated) and surfaced in the Logs tab.
- Category/sub-category/item on the close-ticket form are free-text fields — adjust `server/src/services/sdpClient.ts` if your SDP instance requires IDs from specific cascading pick-lists instead of names.
