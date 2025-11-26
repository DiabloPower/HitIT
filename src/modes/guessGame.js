// guessGame.js – Guess-the-Year Modul
import { fetchRandomMusic } from '../services/musicService.js';
import { filterSongs, pickRandomSong, enrichSongWithLastfm } from '../services/songService.js';
import { markSongUsed, state, resetRound } from '../state/gameState.js';
import { server, apiKey, musicSource } from '../config.js';
import { tryPlayAudio } from '../utils/audio.js';
import { t } from '../i18n/i18n.js';

// Lokaler Spielzustand (nicht mehr via Proxy)
let currentSong = null;
let timerInterval = null;

// Helper: Update counter display
function updateCounter() {
  const chooseCounter = document.getElementById('choosecounter');
  const guessCounter = document.getElementById('guesscounter');
  if (chooseCounter) chooseCounter.innerHTML = `${t('choose.songsPlayed')}: ${state.roundCounter}`;
  if (guessCounter) guessCounter.innerHTML = `${t('guess.songsPlayed')}: ${state.roundCounter}`;
}

export async function getRandomSongForGame() {
  // Prefer guess panel filters if present, otherwise fallback to global filters
  const gPanelGenre = document.getElementById('guessPanelGenre');
  const gPanelMin = document.getElementById('guessPanelMinYear');
  const gPanelMax = document.getElementById('guessPanelMaxYear');
  const genreFilter = (gPanelGenre ? gPanelGenre.value : document.getElementById('genre')?.value || '').trim().toLowerCase();
  const minYear = parseInt((gPanelMin ? gPanelMin.value : document.getElementById('minYear')?.value) || '') || null;
  const maxYear = parseInt((gPanelMax ? gPanelMax.value : document.getElementById('maxYear')?.value) || '') || null;
  let attempts = 0; let song = null;
  while (!song && attempts < 30) {
    const items = await fetchRandomMusic(50, { genre: genreFilter, minYear, maxYear });
    const filtered = filterSongs(items, { genreFilter, minYear, maxYear, requireYear: false }, state.playedSongs, state.sessionSongs);
    if (filtered.length) song = pickRandomSong(filtered);
    attempts++;
  }
  if (!song) { const el = document.getElementById('guesssong'); if (el) el.textContent = t('messages.noSongFound'); return null; }
  markSongUsed(song.Id);
  updateCounter();
  currentSong = song;
  presentQuestionForSong(song);
  return song;
}

export async function presentQuestionForSong(song) {
  const genresDisplay = song.Genres?.length ? song.Genres.join(', ') : t('common.unknown');
  const container = document.getElementById('guesssong');
  if (!container) return;
  // Sicherstellen, dass Container sichtbar ist
  container.classList.remove('hidden');
  
  // Last.fm-Metadaten asynchron nachladen (Cover wird versteckt bis nach Guess)
  const enriched = await enrichSongWithLastfm(song);
  const lastfmData = enriched.lastfmData;
  let coverHtml = '';
  // Cover-Priorität: Last.fm → Spotify → Jellyfin
  let coverUrl = null;
  if (lastfmData?.images?.length) {
    coverUrl = lastfmData.images.find(i => i.size === 'extralarge')?.url || lastfmData.images[0].url;
  } else if (enriched.SpotifyCoverUrl) {
    coverUrl = enriched.SpotifyCoverUrl;
  } else if (musicSource !== 'spotify') {
    coverUrl = `${server}/Items/${enriched.Id}/Images/Primary?api_key=${apiKey}`;
  }
  if (coverUrl) coverHtml = `<img id="guessCover" src="${coverUrl}" alt="Cover" class="lastfm-cover hidden">`;
  let tagsHtml = '';
  if (lastfmData?.tags?.length) tagsHtml = `<div><span class=label>${t('common.tags')} (Last.fm):</span> ${lastfmData.tags.join(', ')}</div>`;
  let lyricsHtml = '';
  if (lastfmData?.lyrics) lyricsHtml = `<details><summary>${t('common.lyrics')} (Last.fm)</summary><pre class="lastfm-lyrics">${lastfmData.lyrics}</pre></details>`;
  // Setup base UI (ohne Audio zunächst)
  container.innerHTML = `
    ${coverHtml}
    <div><span class=label>${t('common.title')}:</span> <span id=songTitle class=hidden>${song.Name}</span> <button id=revealTitleBtn>${t('common.show')}</button></div>
    <div><span class=label>${t('common.artist')}:</span> <span id=songArtist class=hidden>${song.AlbumArtists?.[0]?.Name || song.Artists?.[0] || '?'}</span> <button id=revealArtistBtn>${t('common.show')}</button></div>
    <div><span class=label>${t('common.album')}:</span> <span id=songAlbum class=hidden>${song.Album || t('common.unknown')}</span> <button id=revealAlbumBtn>${t('common.show')}</button></div>
    <div><span class=label>${t('common.year')}:</span> <em>${t('common.hidden')}</em></div>
    <div><span class=label>${t('common.genre')}:</span> ${genresDisplay}</div>
    ${tagsHtml}
    ${lyricsHtml}
    <div id="audioContainer"><span class=label>${t('common.stream')}:</span> <span id="audioPlaceholder">${t('common.loading')}</span></div>`;
  
  wireRevealButtons();
  
  // Audio Setup: Spotify Premium > Jellyfin/Preview
  if (musicSource === 'spotify' && song.SpotifyUri) {
    try {
      const playerModule = await import('../services/spotifyPlayer.js');
      const hasPremium = playerModule.hasSpotifyPremium();
      
      if (hasPremium) {
        // Premium: Volle Wiedergabe
        console.log('🎵 Guess-Mode Premium: Vollständiger Track');
        try {
          await playerModule.playTrack(song.SpotifyUri);
          const audioContainer = document.getElementById('audioContainer');
          if (audioContainer) {
            audioContainer.innerHTML = `<div class="premium-badge" id="gpPremiumBadge">
              <span class="premium-indicator">${t('common.spotifyPremium')}</span>
              <button id="gpPauseBtn" class="premium-toggle wide">${t('common.pause')}</button>
            </div>`;
            const pauseBtn = document.getElementById('gpPauseBtn');
            let progressInterval = null;
            try {
              progressInterval = playerModule.startProgressTracking('gpPauseBtn');
            } catch (progressErr) {
              console.warn('⚠️ Progress tracking failed:', progressErr);
            }
            if (pauseBtn) {
              let paused = false;
              pauseBtn.addEventListener('click', async () => {
                if (!paused) { 
                  await playerModule.pausePlayback(); 
                  pauseBtn.textContent=t('common.play'); 
                  paused=true;
                  if (progressInterval) clearInterval(progressInterval);
                }
                else { 
                  await playerModule.resumePlayback(); 
                  pauseBtn.textContent=t('common.pause'); 
                  paused=false;
                  try {
                    progressInterval = playerModule.startProgressTracking('gpPauseBtn');
                  } catch (progressErr) {
                    console.warn('⚠️ Progress tracking restart failed:', progressErr);
                  }
                }
              });
            }
          }
        } catch (playErr) {
          console.error('❌ Spotify playback failed:', playErr);
          insertAudioElement(song.PreviewUrl || '');
        }
      } else {
        // Fallback: Preview (30s)
        console.log('🎵 Guess-Mode: Using preview (no premium)');
        insertAudioElement(song.PreviewUrl || '');
      }
    } catch (e) {
      console.error('❌ Spotify module import failed:', e);
      insertAudioElement(song.PreviewUrl || '');
    }
  } else {
    // Jellyfin
    const audioSrc = `${server}/Items/${song.Id}/Download?api_key=${apiKey}`;
    insertAudioElement(audioSrc);
  }
  
  document.getElementById('gameControls')?.classList.remove('hidden');
  document.getElementById('submitGuessBtn')?.classList.remove('hidden');
  document.getElementById('nextQuestionBtn')?.classList.add('hidden');
  document.getElementById('feedback').textContent = '';
  if (state.timerEnabled !== false) startTimer(); // only if enabled (default true)
  updateScoreboard();
}

function insertAudioElement(src) {
  const audioContainer = document.getElementById('audioContainer');
  if (!audioContainer) return;
  if (!src) {
    audioContainer.innerHTML = `<span class=label>${t('common.stream')}:</span> <em>${t('messages.noAudioAvailable')}</em>`;
    return;
  }
  audioContainer.innerHTML = `<span class=label>Stream:</span> <audio id=player controls src="${src}"></audio>`;
  const playerEl = document.getElementById('player');
  if (playerEl && state.userInteracted) tryPlayAudio(playerEl);
  if (playerEl) playerEl.addEventListener('play', () => { state.userInteracted = true; });
}

function wireRevealButtons() {
  const map = [ ['revealTitleBtn','songTitle'], ['revealArtistBtn','songArtist'], ['revealAlbumBtn','songAlbum'] ];
  map.forEach(([btnId, spanId]) => {
    const btn = document.getElementById(btnId);
    if (btn) btn.addEventListener('click', () => { const span = document.getElementById(spanId); span?.classList.remove('hidden'); btn.style.display='none'; });
  });
}

function startTimer() {
  clearTimer();
  if (state.timerEnabled === false) {
    document.getElementById('timerDisplay').textContent = t('messages.timerDisabled');
    return;
  }
  state.timerRemaining = state.timerDuration;
  document.getElementById('timerDisplay').textContent = `${t('messages.timer')}: ${state.timerRemaining}s`;
  timerInterval = setInterval(() => {
    state.timerRemaining--;
    document.getElementById('timerDisplay').textContent = `${t('messages.timer')}: ${state.timerRemaining}s`;
    if (state.timerRemaining <= 0) { clearTimer(); onTimeUp(); }
  }, 1000);
}
function clearTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval=null; } }
function onTimeUp() { const fb = document.getElementById('feedback'); if (fb) fb.textContent='Zeit abgelaufen!'; applyScoring(null); }
function updateScoreboard() { document.getElementById('scoreDisplay').textContent = `${t('messages.scoreLabel')}: ${state.playerScore}`; document.getElementById('livesDisplay').textContent = `${t('messages.livesLabel')}: ${state.lives}`; }

function applyScoring(guessYear) {
  clearTimer();
  // Cover nach Guess anzeigen
  const coverEl = document.getElementById('guessCover');
  if (coverEl) coverEl.classList.remove('hidden');
  
  // Alle versteckten Felder automatisch anzeigen
  const hiddenFields = ['songTitle', 'songArtist', 'songAlbum'];
  hiddenFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  });
  // Buttons ausblenden
  ['revealTitleBtn', 'revealArtistBtn', 'revealAlbumBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.style.display = 'none';
  });
  
  const feedbackEl = document.getElementById('feedback');
  // Try multiple sources for year: ProductionYear, PremiereDate, or Album property
  let actualYear = currentSong?.ProductionYear;
  if (!actualYear && currentSong?.PremiereDate) {
    actualYear = new Date(currentSong.PremiereDate).getFullYear();
  }
  if (!actualYear && currentSong?.Album) {
    // Try to extract year from Album string (e.g., "Album Name (2020)")
    const match = currentSong.Album.match(/\((\d{4})\)/);
    if (match) actualYear = parseInt(match[1], 10);
  }
  if (!actualYear) { 
    console.warn('No year found for song:', currentSong?.Name, currentSong);
    feedbackEl.textContent = t('messages.noYearAvailable'); 
    document.getElementById('submitGuessBtn').classList.add('hidden'); 
    document.getElementById('nextQuestionBtn').classList.remove('hidden'); 
    return; 
  }
  
  // Jahr anzeigen (wichtig: das war der Bug!)
  const yearContainer = document.querySelector('#guesssong > div:nth-of-type(4)');
  if (yearContainer) {
    yearContainer.innerHTML = `<span class=label>${t('common.year')}:</span> <strong>${actualYear}</strong>`;
  }
  let points = 0;
  if (typeof guessYear === 'number') {
    const diff = Math.abs(actualYear - guessYear);
    points = diff===0?5: diff<=1?3: diff<=2?2: 0;
  }
  state.playerScore += points;
  if (points === 0) state.lives -= 1;
  feedbackEl.textContent = t('messages.correctYearPoints', { year: actualYear, points });
  document.getElementById('submitGuessBtn')?.classList.add('hidden');
  document.getElementById('nextQuestionBtn')?.classList.remove('hidden');
  updateScoreboard();
  if (state.lives <= 0) endGame();
}

export function submitGuess() {
  const val = document.getElementById('guessYearInput')?.value.trim();
  const guess = parseInt(val, 10);
  if (!val || isNaN(guess)) { const fb = document.getElementById('feedback'); if (fb) fb.textContent='Bitte eine Jahreszahl eingeben.'; return; }
  clearTimer(); // Timer sofort stoppen bei Submit
  applyScoring(guess);
}
export function nextQuestion() {
  clearTimer(); // Explizit Timer clearen vor neuer Frage
  const inp = document.getElementById('guessYearInput'); if (inp) inp.value='';
  const fb = document.getElementById('feedback'); if (fb) fb.textContent='';
  document.getElementById('submitGuessBtn')?.classList.remove('hidden');
  document.getElementById('nextQuestionBtn')?.classList.add('hidden');
  if (state.gameActive) getRandomSongForGame();
}
export function startGame() {
  // Read settings from setup panel if available
  clearTimer(); // Explizit Timer clearen vor Spielstart
  const timerEnabledEl = document.getElementById('guessPanelTimerEnabled');
  const timerDurationEl = document.getElementById('guessPanelTimerDuration');
  const livesEl = document.getElementById('guessPanelLives');
  if (timerEnabledEl) state.timerEnabled = timerEnabledEl.checked;
  if (timerDurationEl && state.timerEnabled !== false) state.timerDuration = parseInt(timerDurationEl.value) || 30;
  if (livesEl) state.lives = parseInt(livesEl.value) || state.DEFAULT_LIVES;
  else state.lives = state.DEFAULT_LIVES;
  state.gameActive = true; state.playerScore = 0; resetRound();
  const gs = document.getElementById('guesssong'); if (gs) gs.textContent = t('messages.gameStarted');
  updateScoreboard();
  getRandomSongForGame();
}
export function stopGame() {
  state.gameActive = false; clearTimer();
  document.getElementById('gameControls')?.classList.add('hidden');
  const fb = document.getElementById('feedback'); if (fb) fb.textContent='';
  const gs = document.getElementById('guesssong'); if (gs) gs.textContent = t('messages.gameStopped');
}
function endGame() {
  state.gameActive = false; clearTimer();
  const fb = document.getElementById('feedback'); if (fb) fb.textContent = t('messages.gameOverScore', { score: state.playerScore });
  // Controls sichtbar lassen, aber Buttons ausblenden
  document.getElementById('submitGuessBtn')?.classList.add('hidden');
  document.getElementById('nextQuestionBtn')?.classList.add('hidden');
  document.getElementById('guessYearInput')?.setAttribute('disabled', 'true');
}
