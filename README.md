# 🎵 HitIT — Music Game

A music guessing game with **Jellyfin** and **Spotify** integration. Guess the year, pick songs by genre/decade, or play in multiplayer mode!

🌍 **Now fully multilingual!** Available in English and German, with easy support for adding more languages. [Learn more →](I18N.md)

🎮 **[Play Online →](https://diablopower.github.io/HitIT/)** *(Requires your own API keys - stored locally in browser only, never on server)* | 💬 **[Discussions](https://github.com/DiabloPower/HitIT/discussions)** | 📝 **[License](LICENSE)**

## 📋 Requirements

### Hard Dependencies (Required)
- **Web Server** — to serve static files (CORS support needed)
  - Python 3.6+ built-in server (recommended)
  - OR Node.js http-server
  - OR any other static file server
- **Modern Browser** — with ES modules support (Chrome, Firefox, Safari, Edge)

### Soft Dependencies (Optional)
- **Music Source** — at least one of:
  - Jellyfin server with API access
  - Spotify Premium account
- **Last.fm API key** — for enhanced metadata (covers, lyrics, tags)

## 🚀 Quick Start

### 1. Start the server

```bash
./start.sh
```

Or start manually:
```bash
python3 start_server.py
```

### 2. Open in your browser

**⚠️ IMPORTANT**: For local use with the Spotify API, the app must run at `http://127.0.0.1:8080/`. Add exactly this URL as a redirect URI in the Spotify dashboard. Some Spotify flows differentiate between `localhost` and `127.0.0.1`.

```
http://127.0.0.1:8080/
```

### 3. Configure music source

Open the **hamburger menu** (☰) → **Settings**

#### Option A: Jellyfin (recommended for local music)

1. Music source: **Jellyfin**
2. Configure server URL, Library ID, and API Key
3. **Save** → status should turn green ✅

**Detailed guide:** [JELLYFIN_SETUP.md](JELLYFIN_SETUP.md)

#### Option B: Spotify (for streaming)

1. Music source: **Spotify**
2. Configure Client ID
3. **Save**
4. Click **"Connect with Spotify"**
5. Authorize in browser → redirect back
6. Status should turn green ✅

**Detailed guide:** [SPOTIFY_SETUP.md](SPOTIFY_SETUP.md)

#### Optional: Last.fm (enhanced metadata)

- Add Last.fm API key in Settings
- Enriches songs with cover art, lyrics, and tags
- No account login required, just API key

**Detailed guide:** [LASTFM_SETUP.md](LASTFM_SETUP.md)

## 🎮 Game Modes

### 🎶 Choose a Song
Pick a random song by genre and time period. Perfect for discovering music or party playlists!

**Filters:**
- Genre (e.g. "Rock", "Pop", "Game")
- Min/Max year (e.g. 1990–1999)
- Artist (e.g. Soundgarden)

### 🧠 Guess the Year
Guess a song’s release year! You have 3 lives and a running timer.

**Scoring:**
- ±0 years = 5 points
- ±1 year = 3 points
- ±2 years = 2 points
- ±3+ years = 0 points (life -1)

**Hints available:**
- Title, artist, album (reveal buttons)

### 🏆 Multiplayer Timeline
Place cards chronologically, similar to popular music timeline games!

**Flow:**
1. Each player starts with 1 card
2. Draw a new card and play the song
3. Decide the song’s time placement
4. Correct → card is placed in the deck
5. Wrong → card is discarded
6. First to 10 cards (configurable) wins 🎉

**Setup:**
- Player count (2–6)
- Target deck size
- Genre/year filters (optional)

## 📁 Project Structure

```
HitIT/
├── index.html                  # Main UI
├── app.js                      # Legacy helpers & multiplayer glue
├── main.js                     # Bootstrap / entry wiring modules
├── freestyler.css              # Global styles
├── start_server.py             # Local dev server (127.0.0.1 binding)
├── start.sh                    # Convenience launcher
├── README.md                   # Project overview
├── SETUP.md                    # Detailed environment setup
├── SECURITY.md                 # Security & deployment guide
├── JELLYFIN_SETUP.md           # Jellyfin configuration guide
├── SPOTIFY_SETUP.md            # Spotify OAuth setup (PKCE)
├── LASTFM_SETUP.md             # Last.fm metadata integration
├── I18N.md                     # Internationalization guide
└── src/
   ├── config.js               # Runtime config (selected source, server URLs)
   ├── i18n/                   # Internationalization system
   │   ├── i18n.js             # Core translation engine
   │   └── locales/            # Language files (en.js, de.js, template.js)
   ├── state/
   │   └── gameState.js        # Central game state (scores, lives, active song)
   ├── services/               # External + domain services
   │   ├── jellyfinClient.js   # Jellyfin REST client
   │   ├── lastfmClient.js     # Last.fm metadata enrichment
   │   ├── musicService.js     # High-level abstraction over sources
   │   ├── songService.js      # Filtering & year extraction logic
   │   ├── spotifyClient.js    # Spotify OAuth + Web API calls
   │   └── spotifyPlayer.js    # Spotify playback integration
   ├── modes/                  # Game mode controllers
   │   ├── chooseMode.js       # "Choose a Song" mode logic
   │   ├── guessGame.js        # "Guess the Year" mode logic
   │   └── multiplayerController.js  # Timeline/multiplayer logic
   ├── ui/                     # UI-specific helpers/components
   └── utils/
       └── audio.js            # Audio autoplay utility
```

## 🔧 Features

✅ **Multi-source support**
   - Jellyfin (local music, full-length)
   - Spotify (streaming, 30s previews)

✅ **Multilingual interface** 🌍
   - English and German fully supported
   - Easy to add new languages
   - Language switcher in Settings
   - [Learn more →](I18N.md)

✅ **OAuth 2.0 PKCE**
   - Secure login without client secret
   - Session-based (no persistent storage)

✅ **Modular architecture**
   - ES modules
   - Service layer (Jellyfin/Spotify)
   - Mode controller (Choose/Guess/Multiplayer)

✅ **Mobile responsive**
   - Swipe navigation in multiplayer
   - Hamburger menu
   - Adaptive layouts

✅ **Privacy-first**
   - No credentials in source code
   - localStorage only for config (server URLs)
   - sessionStorage for tokens (auto-expire)

## ⚠️ Spotify Limitations

**Spotify Premium required!** Spotify's Web API rarely provides usable 30s `preview_url` values; most tracks return `null`. Reliable full-length playback requires the Web Playback SDK and a **Spotify Premium account** (scopes: `streaming`, `user-modify-playback-state`). For a consistent experience:
- Prefer Jellyfin for full-length local playback
- Use Spotify only with Premium subscription
- Without Premium, most tracks will have no audio

The app uses the Web Playback SDK for Premium accounts.

## 🛠️ Development

### Requirements

- Python 3.6+ (for dev server)
- Modern browser with ES module support

### Local server

```bash
# With the built-in script (recommended)
./start.sh

# Or manually with Python
python3 start_server.py

# Or with Node.js
npx http-server -p 8080 -a 127.0.0.1
```

### Debugging

- Browser DevTools (F12)
- Network Tab für API-Requests
- Console für Logs & Fehler

**Important for Spotify OAuth:**
- URL must be `http://127.0.0.1:8080/`
- Server must bind to `127.0.0.1`
- Add the redirect URI exactly like this in the Spotify dashboard

## 📝 Advanced Configuration

For detailed configuration of each service, see the dedicated setup guides:

- **[JELLYFIN_SETUP.md](JELLYFIN_SETUP.md)** — Server URL, Library ID, API key creation, CORS setup
- **[SPOTIFY_SETUP.md](SPOTIFY_SETUP.md)** — Client ID, OAuth flow, redirect URI configuration
- **[LASTFM_SETUP.md](LASTFM_SETUP.md)** — API key creation, metadata enrichment
- **[I18N.md](I18N.md)** — Adding new languages, translation system
- **[SETUP.md](SETUP.md)** — Detailed environment setup
- **[SECURITY.md](SECURITY.md)** — Security best practices, deployment guidelines

## 🎨 Customization

### Themes / CSS

Edit `freestyler.css`:
- CSS variables for colors
- Media queries for responsiveness
- Animations & transitions

### Game rules

- `src/state/gameState.js` → DEFAULT_LIVES, timer duration
- `src/modes/guessGame.js` → scoring logic (applyScoring)
- `app.js` → multiplayer target deck size (mpTargetStreak)

### New modes

1. Create `src/modes/newMode.js`
2. Export functions
3. Import in `main.js` or `app.js`
4. Add buttons in `index.html`

## 🐛 Troubleshooting

### Spotify: "INVALID_CLIENT"

**Problem:** Server runs at the wrong address

**Solution:**
```bash
# Stop server
pkill -f start_server.py || true

# Restart (binds to 127.0.0.1)
./start.sh

# Open in browser
xdg-open http://127.0.0.1:8080/ || echo "Open in your browser: http://127.0.0.1:8080/"
```
Ensure the Spotify dashboard redirect URI is exactly `http://127.0.0.1:8080/`.

### Jellyfin: "No songs found"

**Common issues:**
- Server URL incorrect (must start with `https://`)
- Wrong library ID
- Invalid API key

**Solution:** Open settings → check status (should be green)

### Audio doesn’t play

**Spotify:** 
- Only 30s previews available
- Some tracks have no preview → no audio

**Jellyfin:**
- CORS errors? → configure Jellyfin CORS headers
- API key expired? → generate a new key

### Mobile: layout broken

**Solution:**
- Hard reload: Ctrl+Shift+R (desktop) / clear cache (mobile)
- Reset browser zoom (100%)

## 📜 License

Project for private/educational use. Jellyfin & Spotify trademarks belong to their respective owners.

## 🙏 Credits

- Inspired by music timeline guessing games
- **Jellyfin** for local media server integration
- **Spotify Web API** for streaming support

---

**Enjoy guessing music!** 🎉🎶
