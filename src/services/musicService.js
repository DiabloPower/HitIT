// musicService.js – Abstraction layer for music sources
import { musicSource } from '../config.js';
import { fetchRandomItems } from './jellyfinClient.js';
import { fetchRandomSpotifyTracks } from './spotifyClient.js';

/**
 * Fetch random items from the active music source
 * @param {number} limit - Number of items to fetch
 * @param {Object} filters - Optional filters (genre, minYear, maxYear, artist)
 *   - genre: string (substring match, handled partly client-side)
 *   - minYear/maxYear: number boundaries
 *   - artist: string (one or comma-separated list of artist search terms)
 * @returns {Promise<Array>} Array of song objects
 */
export async function fetchRandomMusic(limit = 50, filters = {}) {
  if (musicSource === 'spotify') {
    // Premium: Einfach einen Batch holen (kein Preview-Filter mehr nötig)
    return await fetchRandomSpotifyTracks(limit, filters);
  } else {
    return await fetchRandomItems(limit);
  }
}
