# Self-Hosting Setup

Run your own instance of Steam Achievements Tracker.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A [Steam Web API key](https://steamcommunity.com/dev/apikey)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier is fine)

## 1. Deploy the Cloudflare Worker

```bash
cd worker
npm install
npx wrangler login          # authenticates with your Cloudflare account
npx wrangler secret put STEAM_API_KEY   # paste your Steam API key when prompted
npx wrangler deploy
```

You'll get a URL like `https://steam-achievements-api.<you>.workers.dev`.

## 2. Point the frontend to your Worker

In `script.js`, update the Worker URL:

```js
this.WORKER_URL = "https://steam-achievements-api.<you>.workers.dev";
```

## 3. Set allowed origins

In `worker/wrangler.toml`, set your GitHub Pages domain:

```toml
[vars]
ALLOWED_ORIGINS = "https://<you>.github.io"
```

For multiple origins, separate them with commas:

```toml
ALLOWED_ORIGINS = "https://<you>.github.io,http://localhost:8080"
```

Then redeploy: `npx wrangler deploy`

## 4. Deploy the frontend

Push to GitHub and enable GitHub Pages (Settings → Pages → Deploy from `main` branch, root folder).

Your site will be live at `https://<you>.github.io/SteamAchievements/`.

## Local development

Run the frontend and worker side by side:

```bash
# Terminal 1: Frontend
npx http-server -p 8080

# Terminal 2: Worker
cd worker
npm run dev   # starts on http://localhost:8787
```

Set `WORKER_URL` to `http://localhost:8787` in `script.js` during development.

## Environment variables

| Variable | Type | Description |
|---|---|---|
| `STEAM_API_KEY` | Secret | Your Steam Web API key |
| `ALLOWED_ORIGINS` | Var | Comma-separated list of allowed CORS origins |
