# Steam Achievements Tracker

Track and discover hidden Steam achievements for any game. Search games by name, enter your Steam ID, and instantly see what you're missing.

## Features

- **Game search** — type a game name and pick from results; App ID fills automatically
- **Hidden achievement reveal** — see descriptions for hidden/secret achievements
- **Completion stats** — total, unlocked, hidden counts and completion percentage
- **No API key required** — everything is handled server-side via Cloudflare Workers
- **Responsive** — works on desktop and mobile

## How to Use

1. Enter your **Steam ID** (17-digit number — find yours at [steamid.io](https://steamid.io/))
2. **Search for a game** by name or type the App ID directly
3. Click **Fetch Achievements**

## Architecture

```
GitHub Pages  ──▶  Cloudflare Worker  ──▶  Steam API
 (frontend)        (proxy + secret key)
```

- The Steam API key lives as a Cloudflare secret — never exposed to the browser
- The Worker handles CORS so the frontend can call it from any origin
- Free tier: 100k requests/day

## Self-Hosting

### 1. Deploy the Worker

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put STEAM_API_KEY   # paste your key when prompted
npx wrangler deploy
```

You'll get a URL like `https://steam-achievements-api.<you>.workers.dev`.

### 2. Point the frontend to your Worker

In `script.js`, set:

```js
this.WORKER_URL = "https://steam-achievements-api.<you>.workers.dev";
```

### 3. Set allowed origins (optional)

In `worker/wrangler.toml`:

```toml
ALLOWED_ORIGINS = "https://<you>.github.io"
```

### 4. Push & deploy

Commit and push — GitHub Pages serves the site from the repo root.

## Local Development

```bash
# Frontend
npx http-server -p 8080

# Worker (in another terminal)
cd worker
npm run dev   # runs on http://localhost:8787
```

Set `WORKER_URL` to `http://localhost:8787` during development.

## Project Structure

```
├── index.html              # Page markup
├── styles.css              # Styling
├── script.js               # Frontend logic
├── _config.yml             # GitHub Pages config
└── worker/
    ├── wrangler.toml       # Cloudflare Worker config
    ├── package.json
    └── src/index.js        # Worker (Steam API proxy + game search)
```

## License

MIT
