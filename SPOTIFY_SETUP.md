# Spotify Integration Setup

## Prerequisites

- **Spotify Premium account** (required for playback)
- Browser (Chrome, Firefox, Safari, Edge)

## 1. Create a Spotify Developer App

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click **Create app**
4. Fill out the form:
   - **App name**: `HitIT` (or any name)
   - **App description**: `HitIT test connector` (or any text)
   - **Website**: `http://127.0.0.1:8080/`
   - **Redirect URIs**: `http://127.0.0.1:8080/` ⚠️ **IMPORTANT: Include trailing slash**
   - **APIs used**: Web API ✅, Web Playback SDK ✅
5. Accept the Terms of Service
6. Click **Save**

## 2. Copy the Client ID

1. In the dashboard → open your new app
2. Under **Client ID** you’ll find a long string like:
   ```
   a9c8bc3c618f4779a85fef7bb26222b63
   ```
3. Copy this ID (button next to the ID)

## 3. Configure HitIT

### Start the server correctly

⚠️ **Important**: For this project, the local server must bind to `127.0.0.1` and the app must be opened at `http://127.0.0.1:8080/`. Some Spotify flows treat `localhost` and `127.0.0.1` differently.

**Stop the current server:**
```bash
# Find the process
ps aux | grep "python3 -m http.server"

# Stop it (replace PID with the actual process ID)
kill <PID>
```

**Restart the server bound to 127.0.0.1:**
```bash
cd /path/to/HitIT
python3 -m http.server 8080 --bind 127.0.0.1
```

Or with Node.js:
```bash
npx http-server -p 8080 -a 127.0.0.1
```

### Open the app and set up Spotify

1. Open in your browser: `http://127.0.0.1:8080/`
2. Click the **hamburger menu** (☰)
3. Click **Settings**
4. Under **Music source** choose **Spotify**
5. Paste your **Client ID** (copied in step 2)
6. Click **Save**
7. Click **Connect with Spotify**

### What happens next?

1. You’re redirected to Spotify
2. If not logged in → log in to your Spotify account
3. Spotify asks for consent → click **Agree**
4. Redirect back to `http://127.0.0.1:8080/?code=...`
5. The app exchanges the code for an access token automatically
6. Status shows: **Connected (Spotify user)** ✅

## 4. Test

- Choose a game mode (e.g., "Choose a Song")
- Click "Pick song"
- A Spotify track should load (30s preview if available)

## Troubleshooting

### ❌ "INVALID_CLIENT: Insecure redirect URI"

**Possible causes:**
- Server bound incorrectly or app opened at the wrong host
- Redirect URI in the Spotify dashboard doesn’t match exactly

**Fix:**
1. Bind server to `127.0.0.1`
2. Open the app at `http://127.0.0.1:8080/`
3. In the Spotify dashboard set redirect URI to exactly `http://127.0.0.1:8080/` (with trailing slash)

### ❌ "Token expired or invalid"

**Cause:** Access token expires after 1 hour

**Fix:** Click "Connect with Spotify" again (no re-login needed if still logged in)

### ❌ "No tracks found"

**Causes:**
- Filters too specific (genre/year)
- Spotify API returns no results for the combination

**Fix:** 
- Clear or loosen filters
- Try different genre names (e.g., lowercase "rock")

### ❌ Audio doesn't play

**Causes:**
- Spotify Premium account required for playback
- Web Playback SDK not initialized

**Fix:** 
- Ensure you have an active Spotify Premium subscription
- Reconnect with Spotify in Settings
- For full control, use Jellyfin instead

## Notes

- **No app download needed**: OAuth runs entirely in the browser
- **Session-based**: Token lives only for the browser session (connect again after closing the tab)
- **Extended Quota Mode**: Required by Spotify for public deployments with >25 users
- **Genres**: Spotify’s genre filtering is limited (mostly album/artist-level), expect fewer matches than Jellyfin

## Production deployment (later)

For a public server:

1. Register a domain (e.g., `hitit.example.com`)
2. Set up HTTPS (Let’s Encrypt)
3. In the Spotify dashboard:
   - Change redirect URI to: `https://hitit.example.com/`
   - Request Extended Quota Mode (for >25 users)
4. Update the client ID in the app

---

**If issues occur:** Check the browser console (F12) for detailed error messages.
