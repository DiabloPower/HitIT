# Last.fm Metadata Integration

HitIT can optionally enrich Jellyfin or Spotify tracks with Last.fm metadata (tags, cover images, album/year) using the public Last.fm REST API.

## 1. Obtain a Last.fm API Key

1. Go to: https://www.last.fm/api/account/create
2. Log in (or create) your Last.fm account.
3. Create an API application (name/description arbitrary).
4. Copy the generated API key (a short alphanumeric string). No secret is required for read-only methods.

## 2. Add the API Key in HitIT

Open the app and:

1. Click the hamburger menu (☰) → Settings.
2. Locate the Last.fm section ("Last.fm API Key").
3. Paste the API key and save.
4. Reload or select a song; metadata fetch attempts now include Last.fm.

Internally the key is stored in `localStorage` under `lastfmApiKey` and exposed at runtime via `config.js` (`lastfmApiKey`). It is NOT committed to source control.

## 3. What Data Is Fetched

The client will:

- Call `track.getInfo` for (artist,title) to obtain:
  - Top tags (genres/moods)
  - Album/title/artist
  - Wiki published date (used for year if present)
  - Image array (various sizes)
- Fallback to `album.getInfo` if no images in the track response.
- Fallback to `track.search` to locate an alternative with cover art, preferring exact artist matches (normalizing away `feat.` variants).

Returned structure (simplified):
```json
{
  "tags": ["rock", "classic rock"],
  "images": [{"size": "large", "url": "https://..."}],
  "year": "1971",
  "album": "Album Title",
  "albumArtist": "Artist Name"
}
```

## 4. Limitations

- Some tracks lack album info or wiki data → `year` may be null.
- Tags are community-driven; quality varies.
- Rate limits apply (avoid excessive parallel requests).
- Cover images can be missing or low resolution for obscure songs.

## 5. Security & Privacy

- The Last.fm API key is public-use; leaking it has low impact (still rotate if abused).
- Do NOT add the key to the repository; keep using the runtime settings approach.
- For production, consider caching metadata server-side to reduce client latency and rate-limit exposure.

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| No tags/images | Track not found or missing metadata | Try a better-cased artist/title; ensure artist normalization (without feat.) |
| Year missing | Wiki data absent | Accept null; fallback to Jellyfin/Spotify year display |
| Many 429 errors | Rate limit exceeded | Throttle requests (e.g., one Last.fm call per displayed track) |
| Images low quality | Only small sizes returned | Prefer largest available; consider local caching of higher-res alternatives |

## 7. Extending

To add lyric or additional metadata providers, create a new service in `src/services/` similar to `lastfmClient.js` and aggregate results in `musicService.js`.

---
**Next:** Integrate the optional key and test by selecting a few songs in different modes.
