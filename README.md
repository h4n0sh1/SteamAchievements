# Steam Achievements Tracker

A GitHub Pages project for tracking Steam achievements, with a focus on finding hidden achievements for any user and game. Uses a **Cloudflare Worker** backend to proxy Steam API calls — no API key needed from users.

![Steam Achievements Tracker](https://github.com/user-attachments/assets/11399af2-4d2b-48c1-9b5a-bc53bd36c4dd)

## Features

- 🎮 Fetch achievements for any Steam game
- 🔍 Identify hidden achievements you haven't unlocked yet
- 📊 View achievement statistics and completion rates
- 🎨 Steam-themed UI with authentic color palette
- 📱 Responsive design for mobile and desktop
- 🔒 Steam API key stays server-side (Cloudflare Worker) — users never see it

## How to Use

1. **Find Your Steam ID**
   - Your Steam ID is a 17-digit number (e.g., `76561198000000000`)
   - Find it at [steamid.io](https://steamid.io/) by entering your profile URL

2. **Get the Game App ID**
   - Find the game on Steam's website
   - The App ID is in the URL: `store.steampowered.com/app/730/` → App ID is `730`
   - Examples:
     - Counter-Strike: Global Offensive → `730`
     - Team Fortress 2 → `440`
     - Portal 2 → `620`

3. **Fetch Achievements**
   - Enter your Steam ID
   - Enter the game's App ID
   - Click "Fetch Achievements"

## Architecture

```
┌──────────────────┐       ┌────────────────────────┐       ┌──────────────┐
│  GitHub Pages    │──────▶│  Cloudflare Worker      │──────▶│  Steam API   │
│  (frontend)      │◀──────│  (proxy + API key)      │◀──────│              │
└──────────────────┘       └────────────────────────┘       └──────────────┘
```

The frontend never touches the Steam API key. The Cloudflare Worker:

- Stores the key as an encrypted secret
- Proxies requests and adds proper CORS headers
- Runs on the free tier (100 000 requests/day)

## Setup (Self-Hosting)

### 1. Deploy the Cloudflare Worker

```bash
cd worker
npm install
npx wrangler login          # authenticate with Cloudflare
npx wrangler secret put STEAM_API_KEY
# paste your Steam API key when prompted

npx wrangler deploy          # deploys to *.workers.dev
```

After deploying you'll get a URL like `https://steam-achievements-api.<you>.workers.dev`.

### 2. Configure the frontend

Open `script.js` and set `WORKER_URL` to your deployed worker URL:

```js
this.WORKER_URL = "https://steam-achievements-api.<you>.workers.dev";
```

### 3. (Optional) Update allowed origins

In `worker/wrangler.toml`, set `ALLOWED_ORIGINS` to your GitHub Pages domain:

```toml
ALLOWED_ORIGINS = "https://<you>.github.io"
```

### 4. Push to GitHub Pages

Commit and push. The site is served from the repo root via GitHub Pages.

## Privacy & Security

- The Steam API key is stored as a Cloudflare secret — never exposed to browsers
- No user data is stored server-side
- All requests flow through Cloudflare's edge network

## Development

### Local frontend

```bash
npx http-server -p 8080
# visit http://localhost:8080
```

### Local worker

```bash
cd worker
npm run dev          # starts wrangler dev on http://localhost:8787
```

Set `WORKER_URL` to `http://localhost:8787` in `script.js` during development.

### File Structure

```
├── index.html          # Main HTML structure
├── styles.css          # Steam-themed styling
├── script.js           # Frontend logic (calls worker)
├── _config.yml         # GitHub Pages config
├── README.md           # Documentation
└── worker/
    ├── wrangler.toml   # Cloudflare Worker config
    ├── package.json    # Worker dependencies
    └── src/
        └── index.js    # Worker code (Steam API proxy)
```

## Contributing

Feel free to contribute by:

- Improving the UI/UX
- Fixing bugs or adding features
- Improving documentation

## License

MIT License - Feel free to use and modify as needed.

## Credits

- Built with Steam's official Web API
- Proxied through Cloudflare Workers
- Inspired by Steam's UI design
