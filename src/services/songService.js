// Song-bezogene Logik: Jahrermittlung, Filtern, Zufallsauswahl
import { } from '../state/gameState.js';

export function songYear(song) {
  return song?.ProductionYear || (song?.PremiereDate ? new Date(song.PremiereDate).getFullYear() : null);
}

// Filtert Items nach Genre/Jahr und schließt bereits gespielte aus.
// excludeRound / excludeSession: Sets mit IDs
// options: { genreFilter, minYear, maxYear, requireYear }
export function filterSongs(items, options, excludeRound, excludeSession) {
  const { genreFilter = '', minYear = null, maxYear = null, requireYear = false } = options || {};
  const gf = (genreFilter || '').trim().toLowerCase();
  const filtered = (items || []).filter(s => {
    if (excludeRound?.has(s.Id) || excludeSession?.has(s.Id)) {
      console.log(`⏭️ Skipping duplicate: ${s.Name} (${s.Id})`);
      return false;
    }
    const year = songYear(s);
    const genres = (s.Genres || []).map(g => g.toLowerCase());
    if (requireYear && !year) return false;
    if (minYear && (!year || year < minYear)) return false;
    if (maxYear && (!year || year > maxYear)) return false;
    // Genre-Filter: Substring-Match für bessere Flexibilität ("rock" findet "hard rock", "alternative rock")
    // Wenn Track Genre-Daten hat, prüfe ob Genre-Filter in einem der Genres enthalten ist
    if (gf && genres.length > 0) {
      const matchesGenre = genres.some(g => g.includes(gf));
      if (!matchesGenre) return false;
    }
    return true;
  });
  console.log(`🎵 filterSongs: ${items?.length || 0} input → ${filtered.length} after filter (genre: "${gf}", year: ${minYear}-${maxYear})`);
  return filtered;
}

export function pickRandomSong(list) {
  if (!list || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

// Asynchrone Last.fm-Metadaten-Anreicherung (inkl. Lyrics)
import { fetchLastfmMetadata } from './lastfmClient.js';

/**
 * Ergänzt einen Song asynchron mit Last.fm-Metadaten (Tags, Cover, Lyrics)
 * @param {Object} song - Song-Objekt mit Name/Artist
 * @returns {Promise<Object>} Song-Objekt mit lastfmData-Feld
 */
/**
 * Bereinigt Song-Titel für Last.fm-Abfrage (entfernt Live-Suffixe, Remaster-Infos etc.)
 */
function cleanTitleForLastfm(title) {
  if (!title) return title;
  // Entferne alles nach " - " (Live-Infos, Remaster, etc.)
  let cleaned = title.split(' - ')[0].trim();
  // Entferne Klammer-Zusätze wie (Live), (Remastered), etc.
  cleaned = cleaned.replace(/\s*\([^)]*(?:live|remaster|remix|version|edit|mix|from|at|feat|ft\.)[^)]*\)/gi, '').trim();
  return cleaned;
}

export async function enrichSongWithLastfm(song) {
  if (!song || !song.Name || !(song.AlbumArtists?.[0]?.Name || song.Artists?.[0])) return song;
  const artist = song.AlbumArtists?.[0]?.Name || song.Artists?.[0];
  const originalTitle = song.Name;
  const cleanedTitle = cleanTitleForLastfm(originalTitle);
  
  console.log(`🎨 Last.fm: Lade Metadaten für "${cleanedTitle}" von "${artist}"...`);
  if (cleanedTitle !== originalTitle) {
    console.log(`   📝 Original-Titel: "${originalTitle}"`);
  }
  
  const meta = await fetchLastfmMetadata(artist, cleanedTitle);
  if (meta) {
    console.log(`✅ Last.fm: Metadaten gefunden - ${meta.images?.length || 0} Bilder, ${meta.tags?.length || 0} Tags`);
    if (meta.images?.length) {
      console.log(`🖼️ Cover-URL:`, meta.images[0].url);
    } else {
      console.warn(`⚠️ Last.fm: Kein Cover-Art für "${cleanedTitle}" von "${artist}" gefunden`);
    }
    song.lastfmData = {
      tags: meta.tags,
      images: meta.images,
      year: meta.year,
      album: meta.album,
      albumArtist: meta.albumArtist,
      lyrics: meta.lyrics || meta.wiki || null // Lyrics falls vorhanden
    };
    // Fallback: Wenn keine Genres vorhanden, nutze einige Last.fm Tags als Genre-Anzeige
    if ((!song.Genres || song.Genres.length === 0) && meta.tags?.length) {
      // Nimm die ersten relevanten Tags (filtere triviale wie 'seen live')
      const filteredTags = meta.tags.filter(t => !/seen live|favourite|favorites?/i.test(t));
      song.Genres = (filteredTags.length ? filteredTags : meta.tags).slice(0,5);
    }
  } else {
    console.warn(`❌ Last.fm: Keine Metadaten für "${cleanedTitle}" von "${artist}" gefunden`);
  }
  return song;
}
