# HitIT — Security & Configuration Guide

## ⚠️ API Key Security

### Current Status
The project now uses **runtime configuration** via the Settings UI. No API keys, tokens, or secrets are hardcoded in `src/config.js` or committed to version control. Users provide their own Jellyfin API key, Spotify Client ID, and optional Last.fm API key through the browser UI, stored locally in `localStorage`.

### Why Runtime Configuration?
- Prevents accidental credential leaks in version control
- Each user manages their own keys independently
- Keys can be rotated without code changes
- Suitable for static hosting (Netlify, GitHub Pages, etc.)

### Recommended Approaches for Production

While the current runtime approach works well for personal/educational use, consider these options for public or shared deployments:

#### Option 1: Server-Side Proxy (Most Secure)
Implement a backend proxy that:
- Accepts client requests at `/api/jellyfin/*`, `/api/spotify/*`
- Adds API keys server-side from environment variables
- Returns sanitized responses
- Keys never leave the server

**Example (Node.js/Express):**
```javascript
app.get('/api/jellyfin/items', async (req, res) => {
  const url = `${JELLYFIN_URL}/Items?ParentId=${LIBRARY_ID}&api_key=${API_KEY}`;
  const data = await fetch(url).then(r => r.json());
  res.json(data);
});
```

#### Option 2: Per-User Authentication
If building a multi-user service:
- Store each user's Jellyfin/Spotify credentials server-side (encrypted)
- Issue session tokens after login
- Backend proxies requests using the authenticated user's keys

#### Option 3: Keep Runtime Config (Current)
For static deployments where each user hosts their own instance:
- Continue using Settings UI and `localStorage`
- Document key rotation procedures
- Warn users about public computer usage (clear browser data after use)

## Browser Storage

The app uses browser storage as follows:

### localStorage (Persistent)
- `server` — Jellyfin server URL
- `libraryId` — Jellyfin library parent ID
- `apiKey` — Jellyfin API key (stored as entered by user)
- `spotifyClientId` — Spotify public client ID
- `spotifyRedirectUri` — Spotify redirect URI (usually auto-detected)
- `lastfmApiKey` — Last.fm API key (optional)
- `musicSource` — Selected source (`jellyfin` or `spotify`)
- `hitit_leaderboard_v1` — Game leaderboard data
- `hitit_mp_roster_v1` — Multiplayer player names

### sessionStorage (Clears on Tab Close)
- `spotify_access_token` — OAuth access token (expires in 1 hour)
- `spotify_token_expiry` — Token expiration timestamp

**Security Notes:**
- `localStorage` is accessible to any script on the same origin; treat it as semi-public
- For Jellyfin API keys: users should rotate keys if using on shared/public computers
- Spotify tokens auto-expire and use PKCE (no client secret)
- Last.fm API keys are read-only public keys (low-risk if leaked)

## Development Workflow

### Start Local Dev Server
**Important:** Bind to `127.0.0.1` for Spotify OAuth compatibility.

```bash
# Recommended: Use the wrapper script
./start.sh

# Or manually with Python
python3 -m http.server 8080 --bind 127.0.0.1

# Or with Node.js
npx http-server -p 8080 -a 127.0.0.1
```

Open `http://127.0.0.1:8080/` in your browser (not `localhost`).

### CORS Considerations
When making requests to a remote Jellyfin server, CORS errors may occur. Solutions:
- Configure Jellyfin CORS headers to allow your app origin
- Use a local development proxy (see server-side proxy pattern)
- Test with a local Jellyfin instance during development

### Spotify OAuth Local Setup
- Redirect URI in Spotify dashboard must be exactly `http://127.0.0.1:8080/`
- Server must bind to `127.0.0.1` (not `0.0.0.0` or `localhost`)
- See `SPOTIFY_SETUP.md` for detailed instructions

## API Key Best Practices

### Jellyfin API Keys
- **Rotate regularly** (every 3–6 months or after suspected exposure)
- **Use separate keys** for dev/staging/production if running multiple instances
- **Limit permissions** if Jellyfin adds role-based API key scoping
- **Never commit** keys to repositories or share in plain text (issues, chat, etc.)

### Spotify Client IDs
- Public client IDs are not secrets, but keep redirect URIs exact
- For production, request Extended Quota Mode from Spotify (>25 users)
- Do NOT use client secrets in frontend code (use PKCE flow)

### Last.fm API Keys
- Read-only public keys; low risk if exposed
- Still avoid committing to VCS for hygiene
- Rate limits apply; consider caching metadata server-side for heavy usage

## Deployment Checklist

### Static Hosting (Netlify, Vercel, GitHub Pages)
- [ ] No secrets in source code (verified)
- [ ] Users configure their own keys via Settings UI
- [ ] `.gitignore` includes any local config files
- [ ] HTTPS enabled (required for production Spotify OAuth)
- [ ] Spotify redirect URI updated to production domain
- [ ] CORS configured on Jellyfin server for app domain

### Server-Side Proxy Deployment
- [ ] API keys stored in environment variables (not code)
- [ ] Backend validates/sanitizes all client requests
- [ ] Rate limiting implemented to prevent abuse
- [ ] HTTPS enforced
- [ ] Security headers set (CSP, HSTS, etc.)
- [ ] Logging/monitoring for suspicious activity

## Additional Resources
- [Jellyfin API Documentation](https://jellyfin.org/docs/)
- [Spotify Authorization Guide](https://developer.spotify.com/documentation/general/guides/authorization/)
- [Last.fm API Documentation](https://www.last.fm/api)
- [OWASP Frontend Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)

---
**For questions about secure configuration, open an issue or consult the setup guides: `JELLYFIN_SETUP.md`, `SPOTIFY_SETUP.md`, `LASTFM_SETUP.md`.**
