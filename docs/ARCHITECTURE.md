# Architecture

## Overview

```
Browser (GitHub Pages)  ──▶  Cloudflare Worker  ──▶  Steam API
                                    │
                                    └──▶  SteamHunters API
                                    └──▶  Steam Community (search)
```

The frontend is a static site hosted on GitHub Pages. It never touches the Steam API directly — all requests go through a Cloudflare Worker that acts as a proxy.

## Why a proxy?

1. **API key security** — The Steam Web API key is stored as a Cloudflare secret, never shipped to the browser
2. **CORS** — Steam's API doesn't set CORS headers, so browsers block direct calls from a web page
3. **Data enrichment** — The Worker merges data from multiple sources (Steam API, SteamHunters, Steam Community) before returning it

## Worker endpoints

| Endpoint                            | Source                                           | Purpose                                                  |
| ----------------------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| `/api/schema?appid=`                | Steam `GetSchemaForGame/v2`                      | Game achievement definitions (names, icons, hidden flag) |
| `/api/achievements?appid=&steamid=` | Steam `GetPlayerAchievements/v1`                 | Player unlock status and timestamps                      |
| `/api/global?appid=`                | Steam `GetGlobalAchievementPercentagesForApp/v2` | Global unlock percentages                                |
| `/api/search?term=`                 | Steam Store suggestions                          | Game name autocomplete                                   |
| `/api/hidden-descriptions?appid=`   | SteamHunters API                                 | Descriptions for hidden achievements                     |
| `/api/search-users?term=`           | Steam Community AJAX                             | User profile search by name                              |
| `/api/resolve-vanity?vanityurl=`    | Steam `ResolveVanityURL/v1`                      | Convert vanity URL to Steam64 ID                         |

## Data flow: fetching achievements

1. Frontend calls `/api/schema`, `/api/achievements`, and `/api/hidden-descriptions` in parallel
2. Schema provides achievement names, icons, descriptions, and hidden flags
3. Player data provides unlock status and timestamps
4. Hidden descriptions (from SteamHunters) fill in descriptions that Steam's API returns as empty for hidden achievements
5. Frontend merges all three and renders the list

## Data flow: user search

1. User types a name → frontend calls `/api/search-users?term=...`
2. Worker fetches a session ID from Steam Community, then calls the AJAX search endpoint
3. Results include display name, avatar, Steam64 ID (or vanity URL)
4. If the user selects a profile with a vanity URL, the frontend calls `/api/resolve-vanity` to get the numeric Steam64 ID

## Project structure

```
├── index.html              # Page markup
├── styles.css              # Steam-themed styling
├── script.js               # Frontend logic (SteamAchievementsTracker class)
├── _config.yml             # GitHub Pages config
├── docs/
│   ├── ARCHITECTURE.md     # This file
│   └── SETUP.md            # Self-hosting guide
└── worker/
    ├── wrangler.toml       # Cloudflare Worker config (name, env vars)
    ├── package.json        # Worker dependencies
    └── src/index.js        # Worker source (routing, proxy, scraping)
```

## Tech stack

- **Frontend:** Vanilla HTML/CSS/JS — no framework, no build step
- **Backend:** Cloudflare Workers (serverless, free tier: 100k requests/day)
- **Hosting:** GitHub Pages
- **APIs:** Steam Web API, Steam Store, Steam Community, SteamHunters
