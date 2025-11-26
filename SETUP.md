# HitIT Setup Guide

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd HitIT
```

### 2. Start a local dev server
```bash
# Option 1: Python (bind to 127.0.0.1)
python3 -m http.server 8080 --bind 127.0.0.1

# Option 2: Node.js (bind to 127.0.0.1)
npx http-server -p 8080 -a 127.0.0.1

# Option 3: Wrapper script
./start.sh
```

### 3. Open the app in your browser
Go to: `http://127.0.0.1:8080`

**Important (Spotify OAuth & Web Playback SDK):** For local use the app must run at `http://127.0.0.1:8080`. Some Spotify flows treat `localhost` and `127.0.0.1` differently. Set the redirect URI to exactly `http://127.0.0.1:8080` in the Spotify dashboard.

### 4. Configure Jellyfin connection

On first launch open the **hamburger menu** (☰) → **Settings**:

1. **Jellyfin Server URL:** `https://your-jellyfin-server`
2. **Library ID:** The ParentId of your music library
   - Find it in Jellyfin: Admin Dashboard → Libraries → [Your Library] → ID in the URL
3. **API Key:** Your personal Jellyfin API key
   - Create one under: User Settings → API Keys → "+" button

**Important:** These values are stored locally in the browser (`localStorage`) and not shared with third parties.

---

## 🔍 Find Jellyfin Library ID

### Method 1: Admin Dashboard
1. Open Jellyfin admin area
2. Dashboard → Libraries
3. Click the desired library
4. Copy the URL parameter `topParentId=...`

### Method 2: API call
```bash
curl "https://your-server/Items?api_key=YOUR_KEY" | jq '.Items[] | select(.Name=="Music") | .Id'
```

---

## 🎵 Spotify Integration

Spotify is integrated via the Web API and Web Playback SDK (previews). For the OAuth PKCE flow:

- Redirect URI in the Spotify dashboard: `http://127.0.0.1:8080`
- Local server must bind to `127.0.0.1` (see above)
- No client secret in the frontend; only Client ID is used
- Tokens are kept in `sessionStorage` and auto-invalidated

See details in `SPOTIFY_SETUP.md` and limitations in `SPOTIFY_LIMITATIONS.md`.

---

## 🔒 Security

### What’s secure now?
- ✅ No new secrets in source code
- ✅ Runtime configuration via localStorage (server URLs only, no keys)
- ✅ Password input for Jellyfin API key
- ✅ `.gitignore` prevents committing secrets by accident

### Best practices
- **Never** post API keys in GitHub issues/PRs
- Rotate keys regularly in Jellyfin admin panel
- For public deployments: use a server-side proxy (see `SECURITY.md`)

---

## 🛠️ Development

### Project structure
```
HitIT/
├── index.html           # Main page
├── app.js               # Legacy code & multiplayer
├── main.js              # Modular bootstrap
├── freestyler.css       # Styling
└── src/
   ├── config.js        # Runtime configuration (NO secrets!)
   ├── state/           # Game state
   ├── utils/           # Helper functions
   ├── services/        # API integration (Jellyfin)
   └── modes/           # Game modes (Choose, Guess, Multiplayer)
```

### Add new features
1. Extend the service layer (`src/services/`)
2. Create a mode module (`src/modes/newMode.js`)
3. Register event bindings in `main.js`
4. Add UI elements in `index.html`

### Code style
- ES modules (`import`/`export`)
- Central state management (`src/state/gameState.js`)
- Defensive programming (null checks)
- English UI strings preferred for public deployments

---

## 🧪 Testing (optional)

```bash
npm install --save-dev vitest
npm test
```

Unit tests for services:
- `src/services/songService.test.js`
- `src/services/jellyfinClient.test.js`

---

## 📦 Deployment

### Static hosting (Netlify/Vercel/GitHub Pages)
1. No build required (vanilla JS app)
2. Deploy all files as-is
3. Users configure their own Jellyfin credentials via settings UI
4. For Spotify: add the exact production domain as redirect URI (no wildcard) in the Spotify dashboard

### Server-side proxy (recommended for production)
See `SECURITY.md` → Option 3: Server-side proxy

---

## 🆘 Troubleshooting

### "No song found"
- Check library ID in settings
- Ensure the library contains audio files
- Verify API key validity

### Spotify: OAuth doesn’t work locally
- Ensure the server binds to `127.0.0.1`
- Open the app via `http://127.0.0.1:8080` (not `localhost`)
- Redirect URI in the Spotify dashboard must match exactly

### CORS errors
- Configure Jellyfin CORS headers:
   ```
   Dashboard → Networking → CORS:
   https://your-app-domain
   ```

### Module loading errors
- Browser must support ES modules (Chrome 61+, Firefox 60+)
- Dev server must be running (don’t open via `file://`)

---

## 📄 License

[Insert your license here]

## 🤝 Contributing

Pull requests welcome! Please:
- Don’t commit secrets
- Follow code style
- Add tests for new features

---

**Happy coding! 🎶**
