// spotifyClient.js — Spotify Web API Integration (PKCE OAuth Flow)
// Hinweis: Kein Secret erforderlich — PKCE ermöglicht sichere Auth ohne Backend.

import { spotifyClientId, spotifyRedirectUri } from '../config.js';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Session-Flag: Recommendations API nicht verfügbar (nach erstem 404)
let recommendationsUnavailable = true; // PERMANENT: API funktioniert nicht mit unserer Authentifizierung

// Fallback: Bekannte Spotify Genre-Seeds (Auszug aus der Doku)
const FALLBACK_GENRE_SEEDS = [
  'rock','pop','hip-hop','r-n-b','metal','metalcore','hard-rock','punk','indie','indie-pop','alternative',
  'edm','electronic','dance','house','techno','trance','dubstep','drum-and-bass','j-pop','k-pop',
  'latin','reggaeton','reggae','salsa','samba','country','jazz','blues','classical','singer-songwriter',
  'soul','funk','disco','ambient','anime','chill','sleep','study','work-out','summer','party','road-trip',
  'french','german','spanish','turkish','brazil','swedish','british','grunge','goth','emo','psych-rock',
  'hardcore','heavy-metal','new-release','movies','soundtracks'
];

// Redirect URI aus config.js (konfigurierbar über localStorage)
function getRedirectUri() {
  return spotifyRedirectUri;
}

// Debug: Zeige aktuelle URL beim Laden
console.log('🔍 Spotify Redirect URI:', getRedirectUri());
console.log('🌐 Aktuelle Browser URL:', window.location.href);
console.log('💡 Neue Spotify Policy: Nur http://127.0.0.1:PORT/ erlaubt (nicht localhost:PORT)');
console.log('');
const TOKEN_KEY = 'spotify_access_token';
const REFRESH_TOKEN_KEY = 'spotify_refresh_token';
const TOKEN_EXPIRY_KEY = 'spotify_token_expiry';
const CODE_VERIFIER_KEY = 'spotify_code_verifier';

// ========== PKCE Helpers ==========

/**
 * Generiert zufälligen Code Verifier (43-128 Zeichen)
 */
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Base64-URL-Encoding (ohne Padding)
 */
function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generiert Code Challenge aus Verifier (SHA-256)
 */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hash);
}

// ========== Token Management ==========

/**
 * Speichert Access Token + Refresh Token (localStorage, persistent)
 */
function storeAccessToken(token, expiresIn, refreshToken = null) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    const expiryTime = Date.now() + (expiresIn * 1000);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch (e) {
    console.warn('Konnte Token nicht speichern:', e);
  }
}

/**
 * Holt Access Token aus localStorage (mit Auto-Refresh wenn abgelaufen)
 */
export async function getAccessToken() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!token || !expiry) return null;
    
    // Prüfen ob abgelaufen (mit 5min Puffer)
    if (Date.now() >= (parseInt(expiry, 10) - 300000)) {
      console.log('🔄 Token abgelaufen, versuche Refresh...');
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        clearAccessToken();
        return null;
      }
      // Neues Token holen
      return localStorage.getItem(TOKEN_KEY);
    }
    return token;
  } catch (e) {
    return null;
  }
}

/**
 * Löscht gespeicherten Token
 */
function clearAccessToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch (e) {}
}

/**
 * Refresh Token Exchange
 * @returns {Promise<boolean>} - true wenn erfolgreich
 */
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    console.warn('⚠️ Kein Refresh Token vorhanden');
    return false;
  }

  try {
    const body = new URLSearchParams({
      client_id: spotifyClientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    const resp = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!resp.ok) {
      const errData = await resp.json();
      console.error('❌ Token Refresh fehlgeschlagen:', errData);
      return false;
    }

    const data = await resp.json();
    // Neuer Access Token (Refresh Token bleibt meist gleich)
    storeAccessToken(data.access_token, data.expires_in || 3600, data.refresh_token || refreshToken);
    console.log('✅ Token erfolgreich refreshed!');
    return true;
  } catch (e) {
    console.error('❌ Token Refresh Fehler:', e);
    return false;
  }
}

// ========== OAuth Flow ==========

/**
 * Validiert Spotify-Konfiguration (Client ID vorhanden, Token-Status)
 * @returns {Promise<{ok: boolean, message: string}>}
 */
export async function validateSpotifyConfig() {
  if (!spotifyClientId || spotifyClientId.trim() === '') {
    return { ok: false, message: 'Spotify Client ID fehlt' };
  }
  
  const token = await getAccessToken();
  if (!token) {
    return { ok: false, message: 'Nicht authentifiziert (OAuth erforderlich)' };
  }

  // Token vorhanden → Test-Request an /me endpoint
  try {
    const resp = await fetch(`${SPOTIFY_API_BASE}/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (resp.ok) {
      const user = await resp.json();
      window.dispatchEvent(new CustomEvent('spotify-auth-ok', { detail: { user: user.display_name || user.id } }));
      return { ok: true, message: `Spotify (${user.display_name || 'User'})` };
    } else if (resp.status === 401 || resp.status === 400) {
      console.warn('❌ Token ungültig (Status:', resp.status, ') - lösche und fordere Re-Login');
      clearAccessToken();
      window.dispatchEvent(new CustomEvent('spotify-auth-failed', { detail: { status: resp.status, message: 'Token ungültig' } }));
      return { ok: false, message: 'Token ungültig - bitte neu anmelden' };
    } else {
      window.dispatchEvent(new CustomEvent('spotify-auth-failed', { detail: { status: resp.status, message: resp.statusText } }));
      return { ok: false, message: `API-Fehler ${resp.status}` };
    }
  } catch (e) {
    console.warn('Spotify Validierung fehlgeschlagen:', e);
    return { ok: false, message: 'Netzwerkfehler' };
  }
}

/**
 * Startet OAuth PKCE-Flow (Redirect zu Spotify Auth)
 */
export async function startSpotifyAuthFlow() {
  if (!spotifyClientId || spotifyClientId.trim() === '') {
    alert('Spotify Client ID fehlt. Bitte in den Einstellungen konfigurieren.');
    return;
  }

  const redirectUri = getRedirectUri();
  
  // Detailliertes Logging für Debugging
  console.log('🔐 Starte Spotify OAuth Flow...');
  console.log('   Client ID:', spotifyClientId);
  console.log('   Redirect URI:', redirectUri);
  console.log('   Aktuelle URL:', window.location.href);
  
  // Warnung wenn Mismatch
  if (!window.location.href.startsWith(redirectUri.replace(/\/$/, ''))) {
    console.warn('⚠️ WARNUNG: Browser URL stimmt nicht mit Redirect URI überein!');
    console.warn('   Erwartet:', redirectUri);
    console.warn('   Aktuell:', window.location.href);
    const proceed = confirm(
      `⚠️ URL Mismatch!\n\n` +
      `App läuft auf: ${window.location.origin}/\n` +
      `Redirect URI: ${redirectUri}\n\n` +
      `Das könnte zu "INVALID_CLIENT" führen!\n\n` +
      `Trotzdem fortfahren?`
    );
    if (!proceed) return;
  }

  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  
  // Verifier speichern (wird nach Callback benötigt)
  try {
    sessionStorage.setItem(CODE_VERIFIER_KEY, verifier);
  } catch (e) {
    console.error('Konnte Code Verifier nicht speichern:', e);
    return;
  }

  // Auth-URL mit PKCE-Parametern
  const params = new URLSearchParams({
    client_id: spotifyClientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: 'user-read-private user-read-email streaming user-modify-playback-state user-read-playback-state', // Premium Playback
    show_dialog: 'false' // Bei wiederholtem Login nicht erneut fragen
  });

  const authUrl = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
  console.log('🚀 Redirect zu:', authUrl);
  console.log('📋 Kopiere diese URL und prüfe sie in Spotify Dashboard!');
  
  // 1 Sekunde warten damit Console-Logs sichtbar sind
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  window.location.href = authUrl;
}

/**
 * Behandelt OAuth-Callback (nach Redirect von Spotify)
 * Wird automatisch beim Laden aufgerufen wenn URL ?code= enthält
 */
export async function handleSpotifyCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');

  if (error) {
    console.error('Spotify OAuth Fehler:', error);
    window.dispatchEvent(new CustomEvent('spotify-auth-failed', { detail: { status: 0, message: `OAuth Fehler: ${error}` } }));
    // URL bereinigen
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  if (!code) return; // Kein Callback-Code vorhanden

  const verifier = sessionStorage.getItem(CODE_VERIFIER_KEY);
  if (!verifier) {
    console.error('Code Verifier fehlt (Session abgelaufen?)');
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  // Token-Exchange: Authorization Code → Access Token
  try {
    const body = new URLSearchParams({
      client_id: spotifyClientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: getRedirectUri(),
      code_verifier: verifier
    });

    const resp = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!resp.ok) {
      const errData = await resp.json();
      console.error('Token-Exchange fehlgeschlagen:', errData);
      window.dispatchEvent(new CustomEvent('spotify-auth-failed', { detail: { status: resp.status, message: errData.error_description || 'Token-Exchange Fehler' } }));
      return;
    }

    const data = await resp.json();
    storeAccessToken(data.access_token, data.expires_in || 3600, data.refresh_token);
    sessionStorage.removeItem(CODE_VERIFIER_KEY); // Verifier löschen

    // Success Event
    window.dispatchEvent(new CustomEvent('spotify-auth-ok', { detail: { message: 'Erfolgreich authentifiziert' } }));
    
    // URL bereinigen (ohne Reload)
    window.history.replaceState({}, document.title, window.location.pathname);

    // Spotify Player initialisieren (Web Playback SDK für Premium)
    // Import dynamisch, um Circular Dependency zu vermeiden
    import('./spotifyPlayer.js').then(module => {
      module.initSpotifyPlayer();
    });

    // Status-Update triggern
    validateSpotifyConfig();
  } catch (e) {
    console.error('Token-Exchange Fehler:', e);
    window.dispatchEvent(new CustomEvent('spotify-auth-failed', { detail: { status: 0, message: 'Netzwerkfehler' } }));
  } finally {
    // URL bereinigen falls noch nicht geschehen
    if (window.location.search.includes('code=')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
}

// ========== API Calls ==========

/**
 * Holt zufällige Tracks von Spotify Web API (Suche oder User-Library)
 * @param {number} limit - Anzahl der Tracks (max. 50)
 * @param {object} filters - { genre?, minYear?, maxYear? }
 * @returns {Promise<Array>} - Array von Spotify Track-Objekten
 */
export async function fetchRandomSpotifyTracks(limit = 50, filters = {}) {
  const token = await getAccessToken();
  if (!token) {
    console.warn('Kein Spotify Access Token vorhanden. OAuth erforderlich.');
    window.dispatchEvent(new CustomEvent('spotify-auth-failed', { detail: { status: 401, message: 'Nicht authentifiziert' } }));
    return [];
  }

  // ========== ARTIST FILTER (höchste Priorität) ==========
  // Wenn ein Artist-Filter angegeben ist, hole gezielt Top-Tracks der passenden Artists.
  if (filters.artist && typeof filters.artist === 'string' && filters.artist.trim()) {
    try {
      const rawTerms = filters.artist.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5); // Max 5 Suchbegriffe
      const foundArtistIds = new Set();
      const collectedArtists = [];
      for (const term of rawTerms) {
        const matches = await searchArtistsByKeyword(term, token, 10); // Suche Artists
        // Filtere nach Namenssubstring-Match (robust gegenüber Groß/Kleinschreibung)
        const termLower = term.toLowerCase();
        const matched = matches.filter(a => a?.name?.toLowerCase().includes(termLower)).slice(0, 3); // pro Begriff max 3
        matched.forEach(a => {
          if (!foundArtistIds.has(a.id)) {
            foundArtistIds.add(a.id);
            collectedArtists.push(a);
          }
        });
      }
      if (foundArtistIds.size) {
        // Optional: Genre einschränken, falls zusätzlich Genre-Filter gesetzt wurde
        let finalArtistIds = [...foundArtistIds];
        if (filters.genre && filters.genre.trim()) {
          const artistGenresMap = await fetchArtistGenres(finalArtistIds, token);
          const gFilter = filters.genre.trim().toLowerCase();
          finalArtistIds = finalArtistIds.filter(id => (artistGenresMap[id] || []).some(g => g.toLowerCase().includes(gFilter)));
        }
        if (finalArtistIds.length) {
          const topTracks = await fetchTopTracksForArtists(finalArtistIds, token, 'DE', 5); // etwas mehr pro Artist holen
          let tt = topTracks;
          // Jahrfilter anwenden falls vorhanden
          if (filters.minYear || filters.maxYear) {
            const minY = filters.minYear ? parseInt(filters.minYear, 10) : 1900;
            const maxY = filters.maxYear ? parseInt(filters.maxYear, 10) : new Date().getFullYear();
            tt = topTracks.filter(t => {
              const y = t.album?.release_date ? new Date(t.album.release_date).getFullYear() : null;
              return y && y >= minY && y <= maxY;
            });
          }
          if (tt.length) {
            console.log(`🎯 Artist-Filter aktiv ("${filters.artist}") – ${tt.length} Top-Tracks gefunden.`);
            return shuffleArray(tt).slice(0, Math.min(limit, tt.length)).map(normalizeSpotifyTrack).filter(Boolean);
          } else {
            console.warn(`⚠️ Artist-Filter ("${filters.artist}") ergab keine Tracks nach Jahr/Genre-Einschränkung.`);
          }
        } else {
          console.warn(`⚠️ Artist-Filter ("${filters.artist}") – keine Artists nach Genre-Einschränkung übrig.`);
        }
      } else {
        console.warn(`⚠️ Artist-Filter ("${filters.artist}") – keine passenden Artists gefunden.`);
      }
      // Wenn kein Treffer: weiter mit Genre-/Standard-Logik
    } catch (artistErr) {
      console.error('❌ Fehler beim Artist-Filter:', artistErr);
    }
  }

  // PRIORITÄT: Wenn Genre gesetzt ist, nutze Artist-Search mit Genre-Filter
  // (Recommendations API funktioniert nicht mit unserer Auth-Methode)
  if (filters.genre && filters.genre.trim()) {
    console.log('🎸 Genre-Filter aktiv:', filters.genre);
    // Künstler zum Genre suchen → Top-Tracks dieser Künstler
    const genreKey = (filters.genre || '').split(',')[0].trim();
    const artists = await searchArtistsByKeyword(genreKey, token, 20);
    const artistIds = artists.map(a => a.id);
    // Nur Artists mit passenden Genres
    const artistGenres = await fetchArtistGenres(artistIds, token);
    const matchingArtists = artists.filter(a => {
      const g = artistGenres[a.id] || [];
      return g.some(x => x.toLowerCase().includes(genreKey.toLowerCase()));
    }).slice(0, 10);
    if (matchingArtists.length) {
      // Hole etwas mehr Top-Tracks pro Artist um Jahr-Filter besser bedienen zu können
      const topTracks = await fetchTopTracksForArtists(matchingArtists.map(a => a.id), token, 'DE', 5);
      let tt = topTracks;
      if (filters.minYear || filters.maxYear) {
        const minY = filters.minYear ? parseInt(filters.minYear, 10) : 1900;
        const maxY = filters.maxYear ? parseInt(filters.maxYear, 10) : new Date().getFullYear();
        tt = topTracks.filter(t => {
          const y = t.album?.release_date ? new Date(t.album.release_date).getFullYear() : null;
          return y && y >= minY && y <= maxY;
        });
      }
      // Falls nach Jahr-Filter extrem wenige oder keine Tracks übrig bleiben, zusätzliche Fallback-Suche durchführen
      if (!tt.length || tt.length < Math.min(5, limit)) {
        try {
          const parts = [];
          if (filters.minYear && filters.maxYear) {
            parts.push(`year:${filters.minYear}-${filters.maxYear}`);
          } else if (filters.minYear) {
            parts.push(`year:${filters.minYear}-${new Date().getFullYear()}`);
          } else if (filters.maxYear) {
            parts.push(`year:1900-${filters.maxYear}`);
          }
          // Einfacher Buchstabe zur breiten Suche; Genre später client-side gefiltert
          const q = parts.length ? parts.join(' ') : 'a';
          const offset = Math.floor(Math.random() * 950);
          const searchParams = new URLSearchParams({
            q,
            type: 'track',
            limit: '50',
            offset: String(offset),
            market: 'DE'
          });
          const resp = await fetch(`${SPOTIFY_API_BASE}/search?${searchParams.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (resp.ok) {
            const data = await resp.json();
            let fallbackTracks = data.tracks?.items || [];
            // Genres nachladen für client-side Genre-Filter
            const fbArtistIds = [...new Set(fallbackTracks.flatMap(t => t.artists?.map(a => a.id) || []))];
            if (fbArtistIds.length) {
              await fetchArtistGenres(fbArtistIds.slice(0,50), token);
            }
            const cache = window.__musicapp_artistGenreCache || {};
            const targetGenre = genreKey.toLowerCase();
            fallbackTracks = fallbackTracks.filter(track => {
              const ids = track.artists?.map(a => a.id) || [];
              return ids.some(id => (cache[id]||[]).some(g => g.toLowerCase().includes(targetGenre)));
            });
            // Jahrfilter erneut anwenden
            if (filters.minYear || filters.maxYear) {
              const minY = filters.minYear ? parseInt(filters.minYear, 10) : 1900;
              const maxY = filters.maxYear ? parseInt(filters.maxYear, 10) : new Date().getFullYear();
              fallbackTracks = fallbackTracks.filter(t => {
                const y = t.album?.release_date ? new Date(t.album.release_date).getFullYear() : null;
                return y && y >= minY && y <= maxY;
              });
            }
            // Kombiniere ursprüngliche Top-Tracks mit Fallback-Ergebnissen (IDs deduplizieren)
            const combinedById = new Map();
            [...tt, ...fallbackTracks].forEach(tr => { if (tr?.id && !combinedById.has(tr.id)) combinedById.set(tr.id, tr); });
            tt = [...combinedById.values()];
            console.log(`🔄 Genre-Fallback aktiviert: ${fallbackTracks.length} zusätzliche Tracks, kombiniert: ${tt.length}`);
          } else {
            console.warn('⚠️ Fallback-Search für Genre fehlgeschlagen:', resp.status);
          }
        } catch (fbErr) {
          console.warn('⚠️ Fehler bei Genre-Fallback-Suche:', fbErr);
        }
      }
      if (tt.length) {
        console.log('🎧 Genre-gefilterte Artist Top-Tracks:', tt.length);
        return shuffleArray(tt).slice(0, Math.min(limit, tt.length)).map(normalizeSpotifyTrack).filter(Boolean);
      }
    }
    console.log('ℹ️ Keine Tracks mit Genre-Filter gefunden – fallback auf allgemeine Suche');
  }

  // Spotify Search Query bauen
  // Hinweis: Genre-Filter funktioniert in Search API nicht gut → nur client-side filtering
  // Jahr-Filter funktioniert: year:1995-1999
  const parts = [];
  
  // NICHT in Query: Genre (wird später client-side gefiltert)
  // Genre-Filter wird nach dem API-Call über Artist-Genres angewendet
  
  // Jahr-Filter (Spotify akzeptiert year:1995-1999 oder year:1995)
  if (filters.minYear && filters.maxYear) {
    parts.push(`year:${filters.minYear}-${filters.maxYear}`);
  } else if (filters.minYear) {
    parts.push(`year:${filters.minYear}-${new Date().getFullYear()}`);
  } else if (filters.maxYear) {
    parts.push(`year:1900-${filters.maxYear}`);
  }

  // Fallback: Suche nach häufigem Buchstaben statt "*" (bessere Preview-Rate)
  const query = parts.length > 0 ? parts.join(' ') : 'a';

  // Random offset für Variation (Spotify hat max 1000 results)
  const offset = Math.floor(Math.random() * 950);

  try {
    const params = new URLSearchParams({
      q: query,
      type: 'track',
      limit: Math.min(limit, 50).toString(),
      offset: offset.toString(),
      market: 'DE' // Optional: auf deutschen Markt beschränken
    });

    const resp = await fetch(`${SPOTIFY_API_BASE}/search?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!resp.ok) {
      if (resp.status === 401) {
        clearAccessToken();
        window.dispatchEvent(new CustomEvent('spotify-auth-failed', { detail: { status: 401, message: 'Token abgelaufen' } }));
      } else {
        console.error('Spotify API Fehler:', resp.status, resp.statusText);
        window.dispatchEvent(new CustomEvent('spotify-auth-failed', { detail: { status: resp.status, message: resp.statusText } }));
      }
      return [];
    }

    const data = await resp.json();
    let tracks = data.tracks?.items || [];
    
    console.log('🎵 Spotify API Response:', tracks.length, 'tracks');
    
    // Artist-Genres laden (für Metadaten-Anzeige und optionalen Filter)
    const artistIds = [...new Set(tracks.flatMap(t => t.artists?.map(a => a.id) || []))];
    if (artistIds.length > 0) {
      await fetchArtistGenres(artistIds.slice(0, 50), token);
    }
    
    // Genre-Filter: Spotify Search unterstützt genre: nicht gut → client-side filtern
    if (filters.genre && filters.genre.trim()) {
      const targetGenre = filters.genre.trim().toLowerCase();
      console.log('🎸 Genre-Filter aktiv:', targetGenre);
      
      const cache = window.__musicapp_artistGenreCache || {};
      
      // Tracks filtern die mindestens einen Artist mit passendem Genre haben
      tracks = tracks.filter(track => {
        const trackArtistIds = track.artists?.map(a => a.id) || [];
        return trackArtistIds.some(artistId => {
          const genres = cache[artistId] || [];
          return genres.some(g => g.toLowerCase().includes(targetGenre));
        });
      });
      
      console.log('🎵 Nach Genre-Filter:', tracks.length, 'tracks');
    }
    
    // Tracks normalisieren für einheitliches Format
    return tracks.map(normalizeSpotifyTrack).filter(t => t !== null);
  } catch (e) {
    console.error('Spotify API Request fehlgeschlagen:', e);
    return [];
  }
}

/**
 * Suche nach Artists per Stichwort (z.B. "rock")
 */
async function searchArtistsByKeyword(keyword, token, limit = 20) {
  if (!keyword) return [];
  try {
    const params = new URLSearchParams({ q: keyword, type: 'artist', limit: String(limit) });
    const resp = await fetch(`${SPOTIFY_API_BASE}/search?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.artists?.items || [];
  } catch {
    return [];
  }
}

/**
 * Holt Top-Tracks für mehrere Artists und flacht sie zu einer Trackliste ab
 */
async function fetchTopTracksForArtists(artistIds, token, market = 'DE', perArtist = 3) {
  try {
    const results = await Promise.all((artistIds || []).map(async (id) => {
      const resp = await fetch(`${SPOTIFY_API_BASE}/artists/${id}/top-tracks?market=${encodeURIComponent(market)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.tracks || []).slice(0, perArtist);
    }));
    return results.flat();
  } catch {
    return [];
  }
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Holt die Liste der verfügbaren Genre-Seeds für Recommendations und cached sie.
 */
async function fetchAvailableGenreSeeds(token) {
  if (!window.__musicapp_genreSeedsCache) {
    window.__musicapp_genreSeedsCache = { ts: 0, seeds: [] };
  }
  const cache = window.__musicapp_genreSeedsCache;
  const now = Date.now();
  if (cache.ts && (now - cache.ts) < 24 * 60 * 60 * 1000 && cache.seeds.length > 0) {
    return cache.seeds;
  }
  try {
    const resp = await fetch(`${SPOTIFY_API_BASE}/recommendations/available-genre-seeds`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) {
      console.warn('⚠️ Konnte Genre-Seeds nicht laden:', resp.status);
      // Fallback: statische Seeds verwenden und cachen, um weitere Fehlversuche zu vermeiden
      cache.seeds = FALLBACK_GENRE_SEEDS;
      cache.ts = now;
      return cache.seeds;
    }
    const data = await resp.json();
    cache.seeds = data.genres || [];
    cache.ts = now;
    return cache.seeds;
  } catch (e) {
    console.warn('⚠️ Fehler beim Laden der Genre-Seeds:', e);
    // Netzwerk-/CORS-Problem → ebenfalls Fallback nutzen und cachen
    cache.seeds = FALLBACK_GENRE_SEEDS;
    cache.ts = now;
    return cache.seeds;
  }
}

/**
 * Mappt Nutzereingabe auf gültige Genre-Seeds (einfaches Normalisieren + Fallback-Matching)
 */
async function mapGenreInputToSeeds(input, token) {
  const seeds = await fetchAvailableGenreSeeds(token);
  if (!input || seeds.length === 0) return [];

  const alias = {
    'hip hop': 'hip-hop',
    'hiphop': 'hip-hop',
    'r&b': 'r-n-b',
    'rnb': 'r-n-b',
    'electro': 'electronic',
    'electronic': 'electronic',
    'edm': 'edm',
    'dance': 'dance',
    'indie': 'indie',
    'alt': 'alternative',
    'alternativ': 'alternative',
    'metalcore': 'metalcore',
    'hard rock': 'hard-rock',
    'punk': 'punk',
    'k-pop': 'k-pop',
    'kpop': 'k-pop',
    'j-pop': 'j-pop',
    'jpop': 'j-pop'
  };

  const toks = input.split(',').map(s => s.trim()).filter(Boolean);
  const result = [];

  for (const t of toks) {
    const raw = t.toLowerCase();
    const aliased = alias[raw] || raw;
    const norm = aliased.replace(/\s+/g, '-');

    // exakte Übereinstimmung
    if (seeds.includes(norm)) {
      result.push(norm);
      continue;
    }
    // Teilstring-Übereinstimmung (z.B. 'rock' findet 'hard-rock', 'indie-rock')
    const contains = seeds.find(g => g.includes(norm));
    if (contains) {
      result.push(contains);
      continue;
    }
    // Beginn-Übereinstimmung als weiterer Fallback
    const starts = seeds.find(g => g.startsWith(norm));
    if (starts) {
      result.push(starts);
      continue;
    }
  }

  // Max 5 Seeds erlaubt
  return [...new Set(result)].slice(0, 5);
}

/**
 * Holt Track-Empfehlungen anhand Genre-Seeds
 */
async function fetchRecommendationsBySeeds(seeds, limit, token, market = 'DE') {
  if (!seeds || seeds.length === 0) return [];
  try {
    const params = new URLSearchParams({
      seed_genres: seeds.join(','),
      limit: String(limit || 50),
      market
    });
    const url = `${SPOTIFY_API_BASE}/recommendations?${params.toString()}`;
    console.log('🔍 Recommendations Request:', url);
    console.log('🔑 Token:', token ? `${token.slice(0,4)}...${token.slice(-4)}` : 'MISSING');
    const resp = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) {
      const body = await resp.text();
      console.warn('⚠️ Recommendations API Fehler:', resp.status, resp.statusText);
      console.warn('📄 Response Body:', body);
      // Bei 404: Flag setzen um weitere Versuche zu überspringen
      if (resp.status === 404) {
        recommendationsUnavailable = true;
        console.warn('🚫 Recommendations API nicht verfügbar (404) - nutze nur noch Artist-Search Fallback');
      }
      return [];
    }
    const data = await resp.json();
    return data.tracks || [];
  } catch (e) {
    console.warn('⚠️ Recommendations Request fehlgeschlagen:', e);
    return [];
  }
}

/**
 * Holt Genres für mehrere Artists (batched)
 * @param {string[]} artistIds - Array von Artist IDs
 * @param {string} token - Access Token
 * @returns {Promise<Object>} - { artistId: [genres] }
 */
async function fetchArtistGenres(artistIds, token) {
  if (!artistIds || artistIds.length === 0) return {};

  // Einfache In-Memory-Cache, um wiederholte Aufrufe zu vermeiden
  if (!window.__musicapp_artistGenreCache) {
    window.__musicapp_artistGenreCache = {};
  }
  const cache = window.__musicapp_artistGenreCache;

  // Nur Artists abrufen, die noch nicht im Cache sind
  const uniqueIds = [...new Set(artistIds)].filter(Boolean);
  const toFetch = uniqueIds.filter(id => !(id in cache));

  try {
    // In 50er-Chunks parallel abrufen
    const chunks = [];
    for (let i = 0; i < toFetch.length; i += 50) {
      chunks.push(toFetch.slice(i, i + 50));
    }

    if (chunks.length > 0) {
      const responses = await Promise.all(chunks.map(async (chunk) => {
        const ids = chunk.join(',');
        const resp = await fetch(`${SPOTIFY_API_BASE}/artists?ids=${ids}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) {
          console.warn('⚠️ Artist Genres API Fehler:', resp.status);
          return null;
        }
        return resp.json();
      }));

      // Antworten zusammenführen und in Cache speichern
      for (const data of responses) {
        if (!data) continue;
        (data.artists || []).forEach(artist => {
          if (artist && artist.id) {
            cache[artist.id] = artist.genres || [];
          }
        });
      }
    }

    // Ergebnis-Objekt aus Cache für alle angeforderten IDs zurückgeben
    const result = {};
    uniqueIds.forEach(id => {
      result[id] = cache[id] || [];
    });
    return result;
  } catch (e) {
    console.warn('⚠️ Fehler beim Abrufen der Artist-Genres:', e);
    return {};
  }
}

/**
 * Konvertiert Spotify Track-Objekt in einheitliches Format (compat mit Jellyfin)
 * @param {object} track - Spotify Track Object
 * @returns {object} - { Id, Name, Album, AlbumArtists: [{Name}], ProductionYear, PremiereDate?, Genres? }
 */
export function normalizeSpotifyTrack(track) {
  if (!track) return null;
  // Spotify Track-Format: { id, name, album: { name, release_date }, artists: [{name}], uri, ... }
  const releaseYear = track.album?.release_date ? new Date(track.album.release_date).getFullYear() : null;
  
  // Genre aus Artist-Cache holen (falls vorhanden)
  const artistGenres = [];
  if (track.artists && track.artists.length > 0) {
    const cache = window.__musicapp_artistGenreCache || {};
    track.artists.forEach(artist => {
      if (artist.id && cache[artist.id]) {
        artistGenres.push(...cache[artist.id]);
      }
    });
  }
  
  const normalized = {
    Id: track.id,
    Name: track.name,
    Album: track.album?.name || 'Unbekannt',
    AlbumArtists: (track.artists || []).map(a => ({ Name: a.name })),
    Artists: (track.artists || []).map(a => a.name), // Array von Namen für Fallback
    ProductionYear: releaseYear,
    PremiereDate: track.album?.release_date || null,
    // Genre aus gecachten Artist-Daten (eindeutige Werte)
    Genres: [...new Set(artistGenres)],
    // Zusätzlich: Preview URL für Abspielen (30s Vorschau, oft null)
    PreviewUrl: track.preview_url || null,
    ExternalUrl: track.external_urls?.spotify || null, // Link zu Spotify Web Player
    // NEU: Track URI für Web Playback SDK (Premium)
    SpotifyUri: track.uri || `spotify:track:${track.id}`, // z.B. "spotify:track:5R1o62..."
    // Cover-URL direkt aus Spotify Album-Daten (Fallback falls Last.fm fehlt)
    // Filtere Spotify-Platzhalter aus (ab.spotifycdn.com, mosaic.scdn.co = generische Covers)
    SpotifyCoverUrl: (() => {
      const img = track.album?.images?.[0]?.url;
      if (!img) return null;
      // Spotify Platzhalter erkennen und verwerfen
      if (img.includes('ab67616d00001e02') || img.includes('mosaic.scdn.co')) return null;
      return img;
    })()
  };
  console.log('📦 Normalized track:', normalized.Name, '| PreviewUrl:', normalized.PreviewUrl ? '✓' : '✗', '| URI:', normalized.SpotifyUri);
  return normalized;
}

// ========== Initialization ==========

/**
 * Initialisiert Spotify-Client (prüft URL auf Callback-Code + Auto-Refresh)
 * Wird einmal beim App-Start aufgerufen
 */
export async function initSpotifyClient() {
  // Prüfen ob URL OAuth-Callback enthält
  if (window.location.search.includes('code=')) {
    await handleSpotifyCallback();
    return;
  }
  
  // Beim normalen Start: Token validieren und refreshen falls nötig
  const token = await getAccessToken(); // getAccessToken macht bereits Auto-Refresh
  if (token) {
    console.log('✅ Token aus localStorage geladen');
    // Token mit API validieren
    const validation = await validateSpotifyConfig();
    if (!validation.ok) {
      console.warn('⚠️ Token ungültig -', validation.message);
      return; // User muss neu authentifizieren
    }
    console.log('✅ Token validiert - kein Re-Login nötig');
    // Spotify Player initialisieren falls noch nicht geschehen
    import('./spotifyPlayer.js').then(module => {
      if (!module.hasSpotifyPremium()) {
        module.initSpotifyPlayer();
      }
    }).catch(() => {}); // Ignoriere Fehler wenn Modul noch nicht geladen
  } else {
    console.log('ℹ️ Kein gültiges Token vorhanden - Login erforderlich');
  }
}
