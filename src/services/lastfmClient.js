// lastfmClient.js — Last.fm Metadaten- und Cover-Abfrage
// Optional: API-Key in config.js oder Settings eintragen

import { lastfmApiKey } from '../config.js';

/**
 * Hole Last.fm Metadaten (Tags, Cover, Jahr) für einen Song
 * @param {string} artist - Name des Künstlers
 * @param {string} title - Songtitel
 * @returns {Promise<Object|null>} Metadaten-Objekt oder null bei Fehler
 */
export async function fetchLastfmMetadata(artist, title) {
  const apiKey = lastfmApiKey;
  if (!apiKey) {
    console.warn('⚠️ Last.fm API Key nicht konfiguriert');
    return null;
  }
  const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${apiKey}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&format=json`;
  console.log('🔍 Last.fm Request:', url.replace(apiKey, 'API_KEY_HIDDEN'));
  try {
    const res = await fetch(url);
      console.log('📡 Last.fm Response Status:', res.status);
    if (!res.ok) return null;
    const data = await res.json();
      console.log('📦 Last.fm Response Data:', data);
    if (!data.track) return null;
    // Tags
    const tags = (data.track.toptags?.tag || []).map(t => t.name);
    // Cover-Bilder (verschiedene Größen)
    let images = (data.track.album?.image || []).map(img => ({ size: img.size, url: img['#text'] })).filter(img => img.url);
    // Jahr (falls vorhanden)
    const year = data.track.wiki?.published?.slice(0,4) || null;
    let albumTitle = data.track.album?.title || null;
    let albumArtist = data.track.album?.artist || null;

    // Fallback 1: Wenn keine Bilder vorhanden, versuche Album-Info abzurufen
    if ((!images || images.length === 0) && albumTitle) {
      const albumArtistParam = encodeURIComponent(albumArtist || artist);
      const albumUrl = `https://ws.audioscrobbler.com/2.0/?method=album.getInfo&api_key=${apiKey}&artist=${albumArtistParam}&album=${encodeURIComponent(albumTitle)}&format=json`;
      console.log('🔍 Last.fm Album Request:', albumUrl.replace(apiKey, 'API_KEY_HIDDEN'));
      try {
        const aRes = await fetch(albumUrl);
        if (aRes.ok) {
          const aData = await aRes.json();
          const aImages = (aData.album?.image || []).map(img => ({ size: img.size, url: img['#text'] })).filter(img => img.url);
          if (aImages.length) {
            images = aImages;
          }
        }
      } catch {}
    }

    // Fallback 2: Track-Suche – finde Alternative mit Bildern und bevorzugt exaktem Artist
    if (!images || images.length === 0) {
      const searchUrl = `https://ws.audioscrobbler.com/2.0/?method=track.search&api_key=${apiKey}&track=${encodeURIComponent(title)}&format=json&limit=10`;
      console.log('🔍 Last.fm Search Request:', searchUrl.replace(apiKey, 'API_KEY_HIDDEN'));
      try {
        const sRes = await fetch(searchUrl);
        if (sRes.ok) {
          const sData = await sRes.json();
          const results = (sData.results?.trackmatches?.track || []).map(t => ({
            name: t.name,
            artist: t.artist,
            images: (t.image || []).map(img => ({ size: img.size, url: img['#text'] })).filter(img => img.url)
          }));
          // Normalisiere Artistnamen (entferne feat./featuring)
          const norm = (str) => (str || '').toLowerCase().replace(/\s*\(feat\.[^)]+\)\s*/gi, '').replace(/\s*feat\..*/i, '').replace(/\s*featuring\s+.*/i, '').trim();
          const targetArtist = norm(artist);
          // Bevorzuge exakte Artist-Übereinstimmung, sonst Teil-Übereinstimmung
          let candidate = results.find(r => norm(r.artist) === targetArtist && r.images.length);
          if (!candidate) candidate = results.find(r => norm(r.artist).includes(targetArtist) && r.images.length);
          if (!candidate) candidate = results.find(r => r.images.length);
          if (candidate) {
            images = candidate.images;
            albumTitle = albumTitle || candidate.name;
            albumArtist = albumArtist || candidate.artist;
          }
        }
      } catch {}
    }

    return {
      tags,
      images,
      year,
      album: albumTitle,
      albumArtist: albumArtist
    };
  } catch (e) {
    return null;
  }
}
