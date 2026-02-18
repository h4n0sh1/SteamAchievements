# Steam Achievements Tracker

A GitHub Pages project for tracking Steam achievements, with a focus on finding hidden achievements for any user and game.

![Steam Achievements Tracker](https://github.com/user-attachments/assets/11399af2-4d2b-48c1-9b5a-bc53bd36c4dd)

## Features

- 🎮 Fetch achievements for any Steam game
- 🔍 Identify hidden achievements you haven't unlocked yet
- 📊 View achievement statistics and completion rates
- 🎨 Steam-themed UI with authentic color palette
- 🔄 Multiple trophy list sources (Steam API, Steam Hunters, AStats)
- 📱 Responsive design for mobile and desktop

## How to Use

1. **Get Your Steam API Key**
   - Visit [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
   - Generate your free API key
   - Note: Keep your API key private

2. **Find Your Steam ID**
   - Your Steam ID is a 17-digit number (e.g., `76561198000000000`)
   - Find it at [steamid.io](https://steamid.io/) by entering your profile URL
   - Or use your profile URL directly: `https://steamcommunity.com/id/username`

3. **Get the Game App ID**
   - Find the game on Steam's website
   - The App ID is in the URL: `store.steampowered.com/app/730/` → App ID is `730`
   - Examples:
     - Counter-Strike: Global Offensive → `730`
     - Team Fortress 2 → `440`
     - Portal 2 → `620`

4. **Fetch Achievements**
   - Enter your Steam API key
   - Enter your Steam ID
   - Enter the game's App ID
   - Choose your trophy list source
   - Click "Fetch Achievements"

## Trophy List Sources

- **Steam API Only**: Uses only Steam's official API (recommended)
- **Steam Hunters**: Integration pending - will scrape data from Steam Hunters
- **AStats**: Integration pending - will use AStats API

## Privacy & Security

- Your API key is used client-side only and never stored
- All data is fetched directly from Steam's API
- No server-side processing or data collection

## Development

This is a static HTML/CSS/JavaScript project designed for GitHub Pages.

### Local Testing

```bash
# Start a local server
python3 -m http.server 8080

# Or use Node.js
npx http-server -p 8080

# Visit http://localhost:8080
```

### File Structure

```
├── index.html      # Main HTML structure
├── styles.css      # Steam-themed styling
├── script.js       # Achievement fetching logic
└── README.md       # Documentation
```

## CORS Note

Due to CORS restrictions, some API calls may fail when running locally. The page works best when:
- Hosted on GitHub Pages
- Using a browser extension to bypass CORS (for development only)
- Using the Steam API with proper CORS headers

## Contributing

Feel free to contribute by:
- Adding support for more trophy list sources
- Improving the UI/UX
- Fixing bugs or adding features
- Improving documentation

## License

MIT License - Feel free to use and modify as needed.

## Credits

- Built with Steam's official Web API
- Inspired by Steam's UI design
- Trophy data from Steam, Steam Hunters, and AStats
