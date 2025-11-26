# Jellyfin Integration Setup

HitIT uses your Jellyfin media server as a primary source for full-length local audio playback. This guide covers obtaining an API key, discovering your library ID, configuring CORS (if needed), and best practices.

## 1. Prerequisites

- Running Jellyfin instance (HTTPS recommended for remote access)
- User account with permission to read the target music library

## 2. Create a Jellyfin API Key

1. Log into the Jellyfin web dashboard.
2. Navigate: Dashboard → API Keys.
3. Click **+ New API Key**.
4. Provide a short description (e.g., "HitIT local client").
5. Copy the generated key (keep it secret; treat it like a password if server is publicly reachable).

Store the key ONLY in the app’s Settings UI. Do not commit the key to source control.

## 3. Find Your Library (Parent) ID

Option A: From the UI
1. Open the music library in Jellyfin.
2. In the browser’s address bar or Network tab look for a query parameter like `?ParentId=abcdef1234567890`.
3. Copy the value after `ParentId=` — this is the library ID.

Option B: Via API
Use the `/Items` endpoint and filter for your library name.
```bash
curl "https://your-jellyfin.example/Items?api_key=YOUR_KEY" | jq '.Items[] | select(.Name=="Music") | .Id'
```
Replace `Music` with your library’s display name.

## 4. Configure HitIT

1. Start the local dev server (bind to 127.0.0.1):
```bash
./start.sh
```
2. Open `http://127.0.0.1:8080/` in your browser.
3. Open the hamburger menu (☰) → **Settings**.
4. Set:
   - **Music Source**: `Jellyfin`
   - **Server URL**: `https://your-jellyfin.example` (must include protocol)
   - **Library ID**: (value from above)
   - **API Key**: (value from above)
5. Save → Status indicator should turn green.

## 5. CORS Configuration (If Needed)

If your browser console shows CORS errors when fetching Items or audio streams:
1. In Jellyfin dashboard: **Networking** → **Published Server URL** and **CORS**.
2. Add your app origin (e.g., `http://127.0.0.1:8080` or production domain) to allowed CORS origins.
3. Restart Jellyfin if required.

## 6. Audio Streaming Notes

- Direct stream URLs are constructed from Jellyfin’s `/Items/<id>/Download` endpoints.
- Transcoding is not requested by default; ensure your files are in a natively playable format (e.g., MP3, Opus, FLAC depending on browser support).
- For large libraries, the app fetches randomized subsets (`SortBy=Random&Limit=50`) and applies filtering client-side.

## 7. Security Best Practices

| Practice | Reason |
|----------|--------|
| Avoid embedding the API key in code | Prevent accidental leaks in VCS or sharing |
| Rotate keys periodically | Limit exposure if key was copied/logged |
| Use HTTPS for remote servers | Protect key and audio streams in transit |
| Restrict API key scope (if Jellyfin adds scoping) | Principle of least privilege |

## 8. Troubleshooting

| Symptom | Possible Cause | Solution |
|---------|----------------|----------|
| "No songs found" | Wrong library ID / empty library | Verify ID, ensure audio files exist |
| 401 Unauthorized | Invalid or expired API key | Regenerate key in dashboard |
| CORS errors | Origin not whitelisted | Add origin in Networking → CORS |
| Slow random fetches | Large library, network latency | Consider server-side caching or pagination strategy |
| Audio won’t play | Unsupported codec | Convert file to common codec (MP3 / AAC / Opus) |

## 9. Extending

To add more server-side logic (e.g., pre-filtered playlists / caching), implement a lightweight proxy that:
- Accepts filter params from the client
- Calls Jellyfin with the stored key server-side
- Returns sanitized JSON (hides key)

See `SECURITY.md` for proxy patterns.

---
**Next:** Configure in settings and start playing songs. Verify the status indicator is green and audio streams correctly.
