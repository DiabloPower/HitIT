// config.js — Zentrale Konfiguration (Runtime, keine Secrets im Code)
// Hinweis: Spotify OAuth Tokens NIEMALS dauerhaft in localStorage speichern.

// Standardwerte (leer = muss über Settings UI konfiguriert werden)
export const DEFAULT_SERVER = "";
export const DEFAULT_LIBRARY_ID = "";
export const DEFAULT_MUSIC_SOURCE = 'jellyfin'; // 'jellyfin' | 'spotify'
// Auto-detect: Production oder Development
function detectDefaultRedirect() {
  const host = window.location.hostname;
  if (host === 'hitit.plll6.de' || host.endsWith('.plll6.de')) return 'https://hitit.plll6.de/';
  return 'http://127.0.0.1:8888/';
}
export const DEFAULT_SPOTIFY_REDIRECT = detectDefaultRedirect();

// Runtime-Konfiguration (wird aus localStorage geladen)
export let server = DEFAULT_SERVER;
export let libraryId = DEFAULT_LIBRARY_ID;
export let apiKey = ''; // Jellyfin API Key (Runtime)
export let musicSource = DEFAULT_MUSIC_SOURCE;
export let spotifyClientId = ''; // Nur die öffentliche Client ID, kein Secret
export let spotifyRedirectUri = DEFAULT_SPOTIFY_REDIRECT; // Konfigurierbarer Redirect
export let lastfmApiKey = ''; // Live-binding Variable (ESM Exports sind reaktiv)
export function setLastfmApiKey(value) { lastfmApiKey = value || ''; }

export function setServer(value) { server = value || DEFAULT_SERVER; }
export function setLibraryId(value) { libraryId = value || DEFAULT_LIBRARY_ID; }
export function setApiKey(value) { apiKey = value || ''; }
export function setMusicSource(value) { musicSource = (value === 'spotify' ? 'spotify' : 'jellyfin'); }
export function setSpotifyClientId(value) { spotifyClientId = value || ''; }
export function setSpotifyRedirectUri(value) { spotifyRedirectUri = value || DEFAULT_SPOTIFY_REDIRECT; }

// Laden aus localStorage
export function loadSettings() {
  try {
    const s = localStorage.getItem('server');
    const l = localStorage.getItem('libraryId');
    const k = localStorage.getItem('apiKey');
    const ms = localStorage.getItem('musicSource');
    const scid = localStorage.getItem('spotifyClientId');
    const sru = localStorage.getItem('spotifyRedirectUri');
    if (s) server = s;
    if (l) libraryId = l;
    if (k) apiKey = k;
    if (ms) musicSource = (ms === 'spotify' ? 'spotify' : 'jellyfin');
    if (scid) spotifyClientId = scid;
    if (sru) spotifyRedirectUri = sru;
    const lf = localStorage.getItem('lastfmApiKey');
    if (lf) lastfmApiKey = lf;

    // Warnung wenn Jellyfin aktiv aber unvollständig
    if (musicSource === 'jellyfin' && (!server || !libraryId || !apiKey)) {
      console.warn('⚠️ Jellyfin-Konfiguration unvollständig. Bitte in Settings konfigurieren.');
    }
    // Hinweis wenn Spotify aktiv aber Client ID fehlt
    if (musicSource === 'spotify' && !spotifyClientId) {
      console.warn('⚠️ Spotify Client ID fehlt. Bitte in Settings konfigurieren.');
    }
    // Hinweis wenn Last.fm API Key fehlt
    if (!lastfmApiKey) {
      console.info('ℹ️ Optional: Last.fm API Key für Metadaten/Lyrics kann in Settings eingetragen werden.');
    }
  } catch (e) {
    console.warn('Konnte Einstellungen nicht laden:', e);
  }
}

export function saveLastfmApiKey(value) {
  try {
    localStorage.setItem('lastfmApiKey', value || '');
    lastfmApiKey = value || '';
  } catch (e) {
    console.warn('Konnte Last.fm API Key nicht speichern:', e);
  }
}
