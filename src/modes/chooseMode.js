// chooseMode.js – Choose Song Modul
import { fetchRandomMusic } from '../services/musicService.js';
import { filterSongs, pickRandomSong, enrichSongWithLastfm } from '../services/songService.js';
import { markSongUsed, state } from '../state/gameState.js';
import { server, apiKey, musicSource } from '../config.js';
import { t } from '../i18n/i18n.js';

// Helper: Update counter display
function updateCounter() {
  const chooseCounter = document.getElementById('choosecounter');
  const guessCounter = document.getElementById('guesscounter');
  if (chooseCounter) chooseCounter.innerHTML = `${t('choose.songsPlayed')}: ${state.roundCounter}`;
  if (guessCounter) guessCounter.innerHTML = `${t('guess.songsPlayed')}: ${state.roundCounter}`;
}

export async function getRandomSong() {
  const genreFilter = document.getElementById('genre')?.value.trim().toLowerCase() || '';
  const artistFilterRaw = document.getElementById('artistFilter')?.value.trim() || '';
  const artistFilter = artistFilterRaw.toLowerCase();
  const minYear = parseInt(document.getElementById('minYear')?.value) || null;
  const maxYear = parseInt(document.getElementById('maxYear')?.value) || null;
  let attempts = 0; let song = null;
  while (!song && attempts < 30) {
    const items = await fetchRandomMusic(50, { genre: genreFilter, minYear, maxYear, artist: artistFilter });
    const filtered = filterSongs(items, { genreFilter, minYear, maxYear, requireYear: false }, state.playedSongs, state.sessionSongs);
    // Artist-Filter für Jellyfin (Spotify bereits serverseitig gefiltert)
    let finalList = filtered;
    if (artistFilter && musicSource !== 'spotify') {
      finalList = filtered.filter(s => {
        const a = (s.AlbumArtists?.[0]?.Name || s.Artists?.[0] || '').toLowerCase();
        return a.includes(artistFilter);
      });
    }
    if (finalList.length) song = pickRandomSong(finalList);
    attempts++;
  }
  const container = document.getElementById('choosesong');
  if (!song) { if (container) { container.classList.remove('hidden'); container.textContent=t('messages.noSongFound'); } return; }
  markSongUsed(song.Id);
  
  // Filter einklappen
  const filtersEl = document.getElementById('filters');
  if (filtersEl && !filtersEl.classList.contains('hidden')) {
    filtersEl.classList.add('hidden');
  }
  
  const year = song.ProductionYear || (song.PremiereDate ? new Date(song.PremiereDate).getFullYear() : t('common.unknown'));
  // Last.fm-Metadaten asynchron nachladen (füllt ggf. Genres via Tags)
  const enriched = await enrichSongWithLastfm(song);
  const lastfmData = enriched.lastfmData;
  const displayGenres = (enriched.Genres && enriched.Genres.length)
    ? enriched.Genres.join(', ')
    : (lastfmData?.tags?.length ? lastfmData.tags.slice(0,5).join(', ') : t('common.unknown'));
  let coverHtml = '';
  // Cover-Priorität: Last.fm → Spotify → Jellyfin
  let coverUrl = null;
  if (lastfmData?.images?.length) {
    const pickCover = (imgs) => {
      const prefOrder = ['mega','extralarge','large'];
      for (const size of prefOrder) {
        const hit = imgs.find(i => i.size === size && i.url);
        if (hit) return hit.url;
      }
      return imgs.find(i => i.url)?.url || null;
    };
    coverUrl = pickCover(lastfmData.images);
  } else if (enriched.SpotifyCoverUrl) {
    coverUrl = enriched.SpotifyCoverUrl;
  } else if (musicSource !== 'spotify') {
    coverUrl = `${server}/Items/${enriched.Id}/Images/Primary?api_key=${apiKey}`;
  }
  if (coverUrl) coverHtml = `<img src="${coverUrl}" alt="Cover" class="lastfm-cover">`;
  let tagsHtml = '';
  if (lastfmData?.tags?.length) tagsHtml = `<div><span class="label">${t('common.tags')} (Last.fm):</span> ${lastfmData.tags.join(', ')}</div>`;
  let lyricsHtml = '';
  if (lastfmData?.lyrics) lyricsHtml = `<details><summary>${t('common.lyrics')} (Last.fm)</summary><pre class="lastfm-lyrics">${lastfmData.lyrics}</pre></details>`;
  if (container) {
    container.classList.remove('hidden');
    container.innerHTML = `
      ${coverHtml}
      <div><span class="label">${t('common.title')}:</span> ${song.Name}</div>
      <div><span class="label">${t('common.artist')}:</span> ${song.AlbumArtists?.[0]?.Name || song.Artists?.[0] || '?'}</div>
      <div><span class="label">${t('common.album')}:</span> ${song.Album || t('common.unknown')}</div>
      <div><span class="label">${t('common.year')}:</span> ${year}</div>
      <div><span class="label">${t('common.genre')}:</span> ${displayGenres}</div>
      ${tagsHtml}
      ${lyricsHtml}
      <div id="rndAudioContainer">${t('common.loadingPlayback')}</div>`;
  }
  if (musicSource === 'spotify') {
    try {
      const playerModule = await import('../services/spotifyPlayer.js');
      const hasPremium = playerModule.hasSpotifyPremium();
      
      if (hasPremium && song.SpotifyUri) {
        console.log('🎵 Choose Mode: Starting Premium playback');
        try {
          await playerModule.playTrack(song.SpotifyUri);
          document.getElementById('rndAudioContainer').innerHTML = `<div class="premium-badge" id="rndPremiumBadge">
            <span class="premium-indicator">${t('common.spotifyPremium')}</span>
            <button id="rndPauseBtn" class="premium-toggle">${t('common.pause')}</button>
          </div>`;
          const pauseBtn = document.getElementById('rndPauseBtn');
          let progressInterval = null;
          
          // Track-Ende-Listener via natives Spotify Event
          const trackEndHandler = () => {
            console.log('🔔 spotify-track-ended Event empfangen!');
            if (window.__chooseModeLoading) {
              console.log('⏸️ Bereits am Laden, überspringe...');
              return;
            }
            window.__chooseModeLoading = true;
            console.log('🎵 Track zu Ende (Spotify Event) - lade nächsten Song...');
            if (progressInterval) clearInterval(progressInterval);
            window.removeEventListener('spotify-track-ended', trackEndHandler);
            getRandomSong().finally(() => { window.__chooseModeLoading = false; });
          };
          console.log('👂 Registriere spotify-track-ended Event Listener');
          window.addEventListener('spotify-track-ended', trackEndHandler);
          
          try {
            // Progress tracking NUR für UI (Progress Bar)
            progressInterval = playerModule.startProgressTracking('rndPauseBtn');
          } catch (progressErr) {
            console.warn('⚠️ Progress tracking failed:', progressErr);
          }
          if (pauseBtn) {
            let paused=false;
            pauseBtn.addEventListener('click', async () => {
              if (!paused) { 
                await playerModule.pausePlayback(); 
                pauseBtn.textContent='Play'; 
                paused=true;
                if (progressInterval) clearInterval(progressInterval);
              }
              else { 
                await playerModule.resumePlayback(); 
                pauseBtn.textContent='Pause'; 
                paused=false;
                try {
                  progressInterval = playerModule.startProgressTracking('rndPauseBtn');
                } catch (progressErr) {
                  console.warn('⚠️ Progress tracking restart failed:', progressErr);
                }
              }
            });
          }
        } catch (playErr) {
          console.error('❌ Spotify playback failed:', playErr);
          if (song.PreviewUrl) {
            document.getElementById('rndAudioContainer').innerHTML = `<audio id="rndAudio" controls src="${song.PreviewUrl}"></audio>`;
          } else {
            document.getElementById('rndAudioContainer').innerHTML = `<em style="color:orange">Keine Preview verfügbar</em>`;
          }
        }
      } else if (song.PreviewUrl) {
        console.log('🎵 Choose Mode: Using preview (no premium or no URI)');
        document.getElementById('rndAudioContainer').innerHTML = `<audio id="rndAudio" controls src="${song.PreviewUrl}"></audio>`;
      } else {
        document.getElementById('rndAudioContainer').innerHTML = `<em style="color:orange">Keine Preview (Premium erforderlich)</em>`;
      }
    } catch (e) {
      console.error('❌ Spotify module import failed:', e);
      document.getElementById('rndAudioContainer').innerHTML = `<em style="color:orange">Spotify nicht verfügbar</em>`;
    }
  } else {
    document.getElementById('rndAudioContainer').innerHTML = `<audio id="rndAudio" controls autoplay src="${server}/Items/${song.Id}/Download?api_key=${apiKey}"></audio>`;
  }
  // Auto-Next auch für Preview oder Jellyfin Audio
  const previewEl = document.getElementById('rndAudio');
  if (previewEl) {
    previewEl.addEventListener('ended', () => {
      if (window.__chooseModeLoading) return;
      window.__chooseModeLoading = true;
      console.log('🔁 Audio fertig (Preview/Jellyfin) - lade nächsten Song...');
      getRandomSong().finally(() => { window.__chooseModeLoading = false; });
    });
  }
  updateCounter();
}