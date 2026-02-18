# Steam Achievements Tracker

If you've ever tried to 100% a Steam game, you know the pain: hidden achievements with no description, no hint, nothing — just a locked icon and a question mark. You're left tabbing between the game, the Steam overlay, and random wikis trying to figure out what you're missing.

This tool exists because that workflow is annoying. Search for a game, see every achievement at a glance — including full descriptions for hidden ones — and know exactly what's left to do. No setup, no API keys to manage, just type and go.

**[Try it live →](https://h4n0sh1.github.io/SteamAchievements/)**

## Features

- **User search** — find your Steam profile by name; Steam ID fills automatically
- **Game search** — type a game name and pick from autocomplete results
- **Hidden achievement descriptions** — reveals descriptions for hidden achievements that Steam normally hides, pulled from community data
- **Full achievement list** — every achievement in one view: locked, unlocked, and hidden
- **Completion dashboard** — total, unlocked, regular remaining, hidden remaining, and completion percentage
- **Toggle view** — switch between all achievements and incomplete only
- **Zero config for users** — no API key needed, everything runs through a serverless proxy
- **Responsive** — works on desktop and mobile

## How to Use

1. **Search for your Steam profile** by name, or paste your 17-digit Steam ID directly
2. **Search for a game** by name or enter the App ID
3. Click **Fetch Achievements**

That's it.

## Self-Hosting

Want to run your own instance? See the [setup guide](docs/SETUP.md).

## Architecture

For technical details on how the proxy, APIs, and frontend fit together, see the [architecture docs](docs/ARCHITECTURE.md).

## License

MIT
