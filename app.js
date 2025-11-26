// Modul-Import der Konfiguration (ersetzt bisherige lokale Konstanten)
// DEPRECATION NOTICE: Legacy Choose & Guess Funktionen (getRandomSong, getRandomSongForGame,
// presentQuestionForSong, startTimer/clearTimer/onTimeUp, updateScoreboard, applyScoring,
// submitGuess, nextQuestion, startGame, stopGame, endGame) werden schrittweise entfernt.
// Aktive Implementierungen liegen jetzt in src/modes/chooseMode.js und src/modes/guessGame.js.
// Multiplayer Legacy bleibt vorerst bestehen bis neue Timeline-Logik portiert ist.
import { DEFAULT_SERVER, DEFAULT_LIBRARY_ID, apiKey, server, libraryId, loadSettings, setServer, setLibraryId, setApiKey, musicSource, setMusicSource, spotifyClientId, setSpotifyClientId, spotifyRedirectUri, setSpotifyRedirectUri } from './src/config.js';
import { state, resetRound, resetSeason, markSongUsed } from './src/state/gameState.js';
import { tryPlayAudio } from './src/utils/audio.js';
import { fetchRandomItems, validateJellyfinConfig } from './src/services/jellyfinClient.js';
import { validateSpotifyConfig, startSpotifyAuthFlow, fetchRandomSpotifyTracks, initSpotifyClient } from './src/services/spotifyClient.js';
import { songYear, filterSongs, pickRandomSong, enrichSongWithLastfm } from './src/services/songService.js';
import { t } from './src/i18n/i18n.js';

// Einstellungen laden (ausgelagert in config.js)
loadSettings();

// Spotify Client initialisieren (prüft auf OAuth Callback)
initSpotifyClient();

// Proxy-Properties: existierender Code kann weiter über die alten Namen zugreifen,
// Änderungen laufen zentral in "state" zusammen. Schrittweise Ablösung folgt.
const proxyMappings = [
  'playedSongs','sessionSongs','roundCounter','gameActive','currentSong','playerScore','lives',
  'timerDuration','timerRemaining','timerInterval','multiplayerActive','mpPlayers','mpCurrentPlayerIndex',
  'mpTargetStreak','mpDiscardPile','userInteracted'
];
proxyMappings.forEach(key => {
  if (!(key in window)) {
    Object.defineProperty(window, key, {
      get: () => state[key],
      set: (val) => { state[key] = val; },
      configurable: true
    });
  }
});
// DEFAULT_LIVES bleibt Konstante aus state (state.DEFAULT_LIVES)
const DEFAULT_LIVES = state.DEFAULT_LIVES;

// Leaderboard key
const LB_KEY = 'hitit_leaderboard_v1';

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LB_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Fehler beim Laden des Leaderboards:', e);
    return [];
  }
}

function saveLeaderboard(entries) {
  try {
    localStorage.setItem(LB_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn('Fehler beim Speichern des Leaderboards:', e);
  }
}

function addLeaderboardEntry(name, deckSize) {
  const entries = loadLeaderboard();
  // Attempt to capture player color from current mpPlayers
  let color = null;
  try {
    const match = (typeof mpPlayers !== 'undefined' && Array.isArray(mpPlayers)) ? mpPlayers.find(p => p.name === name) : null;
    if (match && match.color) color = match.color;
  } catch {}
  entries.unshift({ name, deckSize, color, date: new Date().toISOString() });
  // keep last 20
  saveLeaderboard(entries.slice(0, 20));
  renderLeaderboard();
}

function clearLeaderboard() {
  try { localStorage.removeItem(LB_KEY); } catch (e) {}
  renderLeaderboard();
}

function renderLeaderboard() {
  const listEl = document.getElementById('mpLeaderboardList');
  const entries = loadLeaderboard();
  if (!listEl) return;
  if (!entries || entries.length === 0) { listEl.textContent = t('multiplayer.empty'); return; }
  listEl.innerHTML = entries.map((e, idx) => {
    const hex = e.color || defaultPlayerColors()[idx % defaultPlayerColors().length];
    const pattern = patternForIndex(idx);
    const contrast = contrastColor(hex);
    return `<div style="padding:6px;border-bottom:1px solid #111;display:flex;align-items:center;gap:6px;">
      <span class="player-dot ${pattern}" style="--dot-color:${hex}"></span>
      <strong style="color:${contrast}">${e.name}</strong> — ${t('messages.deckSizeLabel')}: ${e.deckSize} <span style="color:#888">(${new Date(e.date).toLocaleString()})</span>
    </div>`;
  }).join('');
}

// songYear jetzt aus songService importiert

// Fetch a random song that has a usable year and is not already used
async function getRandomSongWithYear() {
  // Multiplayer pre-start panel may provide its own filters. Prefer those
  // when present; otherwise fall back to the global filters. For multiplayer
  // use sensible defaults (1900..current year) when not explicitly provided.
  const mpGenreEl = document.getElementById('mpPanelGenre');
  const mpMinEl = document.getElementById('mpPanelMinYear');
  const mpMaxEl = document.getElementById('mpPanelMaxYear');

  const globalGenreEl = document.getElementById('genre');
  const globalMinEl = document.getElementById('minYear');
  const globalMaxEl = document.getElementById('maxYear');

  const genreFilter = (mpGenreEl ? mpGenreEl.value : (globalGenreEl ? globalGenreEl.value : '')).trim().toLowerCase();
  let minYear = mpMinEl && mpMinEl.value ? parseInt(mpMinEl.value, 10) : (globalMinEl && globalMinEl.value ? parseInt(globalMinEl.value, 10) : null);
  let maxYear = mpMaxEl && mpMaxEl.value ? parseInt(mpMaxEl.value, 10) : (globalMaxEl && globalMaxEl.value ? parseInt(globalMaxEl.value, 10) : null);
  const nowYear = new Date().getFullYear();
  if (minYear === null || isNaN(minYear)) minYear = 1900;
  if (maxYear === null || isNaN(maxYear)) maxYear = nowYear;

  let attempts = 0;
  let song = null;

  while (!song && attempts < 30) {
    try {
      // Branching: Spotify oder Jellyfin
      const items = musicSource === 'spotify'
        ? await fetchRandomSpotifyTracks(50, { genre: genreFilter, minYear, maxYear })
        : await fetchRandomItems(50);
      const filtered = filterSongs(items, { genreFilter, minYear, maxYear, requireYear: true }, playedSongs, sessionSongs);
      if (filtered.length > 0) song = pickRandomSong(filtered);
    } catch (e) {
      console.warn('Fehler beim Laden der Songs:', e);
    }
    attempts++;
  }

  if (!song) return null;
  // mark as used
  markSongUsed(song.Id);
  updateCounter();
  // Enrich with Last.fm metadata (especially for Spotify tracks that lack album/genre/cover)
  if (musicSource === 'spotify') {
    song = await enrichSongWithLastfm(song);
  }
  return song;
}

// Multiplayer: start game, deal initial cards, and begin with player 0
async function startMultiplayer() {
  // Try to read player count and target from either the in-UI inputs or the pre-start panel
  const countEl = document.getElementById('mpPlayerCount') || document.getElementById('mpPanelPlayerCount');
  const targetEl = document.getElementById('mpTargetStreak') || document.getElementById('mpPanelTargetSize');
  const count = Math.max(2, Math.min(6, parseInt(countEl?.value, 10) || mpPlayers.length || 2));
  const target = Math.max(1, parseInt(targetEl?.value, 10) || mpTargetStreak || 10);
  mpTargetStreak = target;

  // reset shared state via gameState module to preserve proxying
  multiplayerActive = true;
  mpDiscardPile = [];
  resetRound(); // resets playedSongs, sessionSongs, roundCounter properly
  state.multiplayerActive = true;

  document.getElementById('multiplayerArea').classList.remove('hidden');

  // If mpPlayers were already initialized by the pre-start panel, keep their names and count.
  // Otherwise, create default players here.
  if (!mpPlayers || mpPlayers.length === 0) {
    mpPlayers = [];
    for (let i = 0; i < count; i++) {
      mpPlayers.push({ id: i, name: `Spieler ${i+1}`, deck: [] });
    }
  } else {
    // Ensure mpPlayers length matches desired count (trim or add defaults)
    if (mpPlayers.length > count) {
      mpPlayers = mpPlayers.slice(0, count);
    } else if (mpPlayers.length < count) {
      const start = mpPlayers.length;
      for (let i = start; i < count; i++) mpPlayers.push({ id: i, name: `Spieler ${i+1}`, deck: [] });
    }
    // reset decks for a fresh game
    mpPlayers.forEach(p => { p.deck = []; delete p._drawn; });
  }

  // deal one starting card each
  for (let i = 0; i < mpPlayers.length; i++) {
    const card = await getRandomSongWithYear();
    if (card) mpPlayers[i].deck.push(card);
  }

  mpCurrentPlayerIndex = 0;
  renderMpPlayerPanel();
  // start first turn
  await mpStartTurn();
  // ensure arrows visibility updated after panels render
  try { updateMpArrowVisibility(); } catch (e) { /* ignore */ }
}

function renderMpPlayerPanel() {
  const player = mpPlayers[mpCurrentPlayerIndex];
  // Top panel shows active player prominently
  const topName = document.getElementById('mpTopName');
  const topSub = document.getElementById('mpTopSub');
  if (topName) topName.textContent = player.name || `${t('multiplayer.activePlayer')} ${player.id+1}`;
  if (topSub) topSub.textContent = t('multiplayer.activePlayer');
  // Apply subtle color highlight for active player
  applyActivePlayerColor(player);
  // animate top panel on player change
  const topPanel = document.getElementById('mpTopPanel');
  if (topPanel) {
    // restart animation
    topPanel.classList.remove('player-animate');
    // trigger reflow to restart the animation
    void topPanel.offsetWidth;
    topPanel.classList.add('player-animate');
    // ensure class removed after animation to allow retrigger
    setTimeout(() => { try { topPanel.classList.remove('player-animate'); } catch (e) {} }, 700);
  }

  const deckList = document.getElementById('mpDeckList');
  if (!player.deck || player.deck.length === 0) {
    deckList.innerHTML = t('multiplayer.noCards');
  } else {
    // show deck sorted by year ascending
    const sorted = [...player.deck].sort((a,b) => (songYear(a) - songYear(b)));
    player.deck = sorted; // keep sorted
    deckList.innerHTML = sorted.map((s, idx) => {
      const hex = player.color || defaultPlayerColors()[player.id % defaultPlayerColors().length];
      const pattern = patternForIndex(player.id);
      const contrast = contrastColor(hex);
      // Cover-Quelle bestimmen: Last.fm Priorität, dann Spotify, dann Jellyfin Primary Image
      let coverUrl = '';
      if (s.lastfmData?.images?.[0]?.url) {
        coverUrl = s.lastfmData.images[0].url;
      } else if (s.SpotifyCoverUrl) {
        coverUrl = s.SpotifyCoverUrl;
      } else {
        coverUrl = `${server}/Items/${s.Id}/Images/Primary?api_key=${apiKey}`;
      }
      const artist = s.AlbumArtists?.[0]?.Name || s.Artists?.[0] || 'Unbekannt';
      const album = s.Album || s.AlbumName || 'Unbekannt';
      const genres = (s.Genres && s.Genres.length) ? s.Genres.join(', ') : '—';
      const yearVal = songYear(s) || '–';
        return `<div class="mp-deck-item" data-id="${s.Id}" data-song-index="${idx}" style="--bg-url:url('${coverUrl}')">
          <div class="mp-badge year"><span class="player-dot ${pattern}" style="--dot-color:${hex}"></span><span>${yearVal}</span></div>
          <div class="mp-badge index">#${idx+1}</div>
          <button class="mp-play-btn" data-song-index="${idx}" aria-label="Play/Stop">▶</button>
          <div class="basic"><span class="mp-track-title">${s.Name}</span></div>
          <div class="details">
            <div><strong>${t('common.title')}:</strong> ${s.Name}</div>
            <div><strong>${t('common.artist')}:</strong> ${artist}</div>
            <div><strong>${t('common.album')}:</strong> ${album}</div>
            <div><strong>${t('common.genre')}:</strong> ${genres}</div>
            <div><strong>${t('common.year')}:</strong> ${yearVal}</div>
            <div><strong>Position:</strong> ${idx+1} / ${sorted.length}</div>
          </div>
        </div>`;
    }).join('');
    
    // Klick-Handling für Expand/Collapse
    deckList.querySelectorAll('.mp-deck-item').forEach(el => {
      el.addEventListener('click', (e) => {
        // Ignore clicks on play button
        if (e.target.closest('.mp-play-btn')) return;
        el.classList.toggle('expanded');
      });
    });
    
    // Play-Button Handling
    setupMpPlayButtons(player);
  }

  // Update deck size in deck header
  const deckSizeEl = document.getElementById('mpDeckSize');
  if (deckSizeEl) {
    const size = (player.deck || []).length;
    const hex = player.color || defaultPlayerColors()[player.id % defaultPlayerColors().length];
    const pattern = patternForIndex(player.id);
    // Immer weiß anzeigen für bessere Lesbarkeit unabhängig vom Spieler-Farbkontrast
    deckSizeEl.innerHTML = `<span class="player-dot ${pattern}" style="--dot-color:${hex}"></span><span class="mp-deck-size-val" style="color:#fff">${size}</span>`;
  }
  // update layout in case header size changed or content affects sizing
  try { if (window.updateLayoutHeights) window.updateLayoutHeights(); } catch (e) {}
}

// Global audio element for deck playback
let mpDeckAudio = null;
let mpCurrentPlayingBtn = null;
let mpDeckSpotifyPlayer = null; // Separate Spotify instance for deck playback
let mpMainGameTrackUri = null; // Speichert den Hauptspiel-Track für Rückkehr
let mpMainGamePosition = 0; // Speichert Position des Hauptspiel-Tracks
let mpDeckActive = false; // Flag: Deck-Playback aktiv
let mpMainProgressInterval = null; // Progress-Interval für Hauptspiel-Button
let mpDeckProgressInterval = null; // Interval für Progress-Bar Update in Kachel
let mpMainGamePaused = false; // Pause-Status des Hauptspiels
let mpDeckTrackUri = null; // Aktuell spielender Deck-Track URI

// Setup play buttons for multiplayer deck cards
function setupMpPlayButtons(player) {
  const btns = document.querySelectorAll('#mpDeckList .mp-play-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const songIndex = parseInt(btn.dataset.songIndex, 10);
      const song = player.deck[songIndex];
      if (!song) return;
      
      const isPlaying = btn.classList.contains('playing');
      
      if (isPlaying) {
        // Stop current playback
        await stopMpDeckPlayback();
      } else {
        // Stop any other playing button first
        await stopMpDeckPlayback();
        
        // Start playback for this song
        await playMpDeckSong(song, btn);
      }
    });
  });
}

async function playMpDeckSong(song, btn) {
  console.log('🎵 playMpDeckSong called:', { songName: song.Name, musicSource, hasPreview: !!song.PreviewUrl, hasUri: !!song.SpotifyUri, songId: song.Id });
  
  try {
    if (musicSource === 'spotify') {
      // Spotify handling - nutze SDK für volle Tracks
      if (song.SpotifyUri) {
        try {
          const playerModule = await import('./src/services/spotifyPlayer.js');
          if (playerModule.hasSpotifyPremium()) {
            console.log('🎵 Using Spotify SDK for deck playback');
            
            // Speichere aktuellen Hauptspiel-Track falls vorhanden
            const currentState = await playerModule.getCurrentState();
            if (currentState && currentState.track_window?.current_track) {
              const currentTrack = currentState.track_window.current_track;
              mpMainGameTrackUri = currentTrack.uri;
              mpMainGamePosition = currentState.position;
              mpMainGamePaused = currentState.paused; // Pause-Status speichern
              console.log('💾 Hauptspiel-Track gespeichert:', mpMainGameTrackUri, 'Position:', mpMainGamePosition, 'Paused:', mpMainGamePaused);
            }
            
            // Deck wird aktiv: Hauptspiel-Button optisch und funktional deaktivieren
            mpDeckActive = true;
            mpDeckTrackUri = song.SpotifyUri; // Speichere Deck-Track URI
            const mainBtn = document.getElementById('mpSpPlayBtn');
            if (mainBtn) {
              // Stoppe evtl. laufendes Progress-Tracking des Hauptspiel-Buttons
              if (mpMainProgressInterval) { try { clearInterval(mpMainProgressInterval); } catch {}
                mpMainProgressInterval = null; }
              mainBtn.classList.add('disabled');
              mainBtn.setAttribute('disabled', 'disabled');
              mainBtn.style.background = '';
              mainBtn.textContent = mpMainGamePaused ? 'Play' : 'Pause'; // Zeige gespeicherten Status
              mainBtn.title = 'Deck-Wiedergabe aktiv';
            }

            // Wechsle zu Deck-Song
            await playerModule.playTrack(song.SpotifyUri);
            btn.textContent = '⏸';
            btn.classList.add('playing');
            mpCurrentPlayingBtn = btn;
            
            // Starte Progress-Bar für diesen Button
            startDeckProgressTracking(btn, playerModule);
            
            console.log('✅ Spotify SDK playback started');
            return;
          } else {
            console.warn('⚠️ Kein Spotify Premium - Deck-Playback nicht verfügbar');
            alert('Spotify Premium benötigt für Deck-Playback');
            return;
          }
        } catch (e) {
          console.error('❌ Spotify SDK playback failed:', e);
          alert(`Spotify Fehler: ${e.message}`);
          return;
        }
      } else {
        console.warn('⚠️ Kein Spotify URI für Song:', song.Name);
        alert('Kein Spotify URI verfügbar');
        return;
      }
    } else {
      // Jellyfin handling
      console.log('🎵 Using Jellyfin Download URL');
      const audioSrc = `${server}/Items/${song.Id}/Download?api_key=${apiKey}`;
      if (!mpDeckAudio) {
        mpDeckAudio = new Audio();
        mpDeckAudio.addEventListener('ended', () => {
          if (mpCurrentPlayingBtn) {
            mpCurrentPlayingBtn.textContent = '▶';
            mpCurrentPlayingBtn.classList.remove('playing');
            mpCurrentPlayingBtn = null;
          }
        });
      }
      mpDeckAudio.src = audioSrc;
      console.log('🎵 Audio src set, attempting play...');
      mpDeckActive = true;
      await mpDeckAudio.play();
      btn.textContent = '⏸';
      btn.classList.add('playing');
      mpCurrentPlayingBtn = btn;
      console.log('✅ Jellyfin playback started');
    }
  } catch (err) {
    console.error('❌ Fehler beim Abspielen:', err);
    alert(`Fehler beim Abspielen: ${err.message}`);
  }
}

async function stopMpDeckPlayback() {
  // Stoppe Progress-Interval
  if (mpDeckProgressInterval) {
    try { clearInterval(mpDeckProgressInterval); } catch {}
    mpDeckProgressInterval = null;
  }
  
  if (mpCurrentPlayingBtn) {
    mpCurrentPlayingBtn.textContent = '▶';
    mpCurrentPlayingBtn.classList.remove('playing');
    // Entferne Progress-Styling
    mpCurrentPlayingBtn.style.background = '';
    mpCurrentPlayingBtn = null;
  }
  
  if (mpDeckAudio) {
    try { mpDeckAudio.pause(); } catch {}
    mpDeckAudio.currentTime = 0;
  }
  
  // Bei Spotify: Kehre zum Hauptspiel-Track zurück falls vorhanden
  if (musicSource === 'spotify' && mpMainGameTrackUri) {
    try {
      console.log('🔙 Kehre zu Hauptspiel-Track zurück:', mpMainGameTrackUri, 'Paused:', mpMainGamePaused);
      const playerModule = await import('./src/services/spotifyPlayer.js');
      if (playerModule.hasSpotifyPremium()) {
        await playerModule.playTrack(mpMainGameTrackUri);
        // Versuche zur gespeicherten Position zu springen
        if (mpMainGamePosition > 0) {
          // Kurz warten bis Track geladen ist
          setTimeout(async () => {
            try {
              const token = await (await import('./src/services/spotifyClient.js')).getAccessToken();
              const deviceId = playerModule.getDeviceId();
              await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${mpMainGamePosition}&device_id=${deviceId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              console.log('✅ Position wiederhergestellt:', mpMainGamePosition);
              
              // Wenn vorher pausiert war, pausiere wieder
              if (mpMainGamePaused) {
                await playerModule.pausePlayback();
                console.log('⏸ Pause-Status wiederhergestellt');
              }
              
              // Button-Status NACH Pause-Wiederherstellung aktualisieren
              const mainBtn = document.getElementById('mpSpPlayBtn');
              if (mainBtn) {
                mainBtn.textContent = mpMainGamePaused ? 'Play' : 'Pause';
                // Progress-Tracking nur reaktivieren wenn nicht pausiert
                if (!mpMainGamePaused) {
                  try { mpMainProgressInterval = playerModule.startProgressTracking('mpSpPlayBtn'); } catch {}
                }
              }
            } catch (e) {
              console.warn('⚠️ Position konnte nicht wiederhergestellt werden:', e);
            }
          }, 500);
        } else if (mpMainGamePaused) {
          // Sofort pausieren wenn keine Position zu setzen ist
          setTimeout(async () => {
            try {
              await playerModule.pausePlayback();
              console.log('⏸ Pause-Status wiederhergestellt');
              
              // Button-Status NACH Pause aktualisieren
              const mainBtn = document.getElementById('mpSpPlayBtn');
              if (mainBtn) {
                mainBtn.textContent = 'Play';
              }
            } catch (e) {
              console.warn('⚠️ Pause konnte nicht wiederhergestellt werden:', e);
            }
          }, 500);
        } else {
          // Kein Pause, keine Position - direkt Progress-Tracking starten
          setTimeout(() => {
            const mainBtn = document.getElementById('mpSpPlayBtn');
            if (mainBtn) {
              mainBtn.textContent = 'Pause';
              try { mpMainProgressInterval = playerModule.startProgressTracking('mpSpPlayBtn'); } catch {}
            }
          }, 500);
        }
        // Hauptspiel-Button wieder aktivieren (Status wird asynchron gesetzt)
        const mainBtn = document.getElementById('mpSpPlayBtn');
        if (mainBtn) {
          mainBtn.classList.remove('disabled');
          mainBtn.removeAttribute('disabled');
          mainBtn.title = '';
        }
      }
    } catch (e) {
      console.warn('⚠️ Rückkehr zum Hauptspiel-Track fehlgeschlagen:', e);
    }
  }
  
  // Deck ist nicht mehr aktiv
  mpDeckActive = false;
  mpDeckTrackUri = null;
  mpMainGameTrackUri = null;
  mpMainGamePosition = 0;
  mpMainGamePaused = false;
}

// Progress-Tracking für Deck-Kachel-Button
function startDeckProgressTracking(btn, playerModule) {
  // Stoppe vorheriges Interval falls vorhanden
  if (mpDeckProgressInterval) {
    clearInterval(mpDeckProgressInterval);
  }
  
  mpDeckProgressInterval = setInterval(async () => {
    try {
      const state = await playerModule.getCurrentState();
      if (!state || !btn) {
        clearInterval(mpDeckProgressInterval);
        mpDeckProgressInterval = null;
        return;
      }
      
      // NUR Progress aktualisieren wenn der aktuelle Track der Deck-Track ist
      const currentTrack = state.track_window?.current_track;
      if (!currentTrack || currentTrack.uri !== mpDeckTrackUri) {
        // Nicht der Deck-Track - ignoriere
        return;
      }
      
      const progress = (state.position / state.duration) * 100;
      // Progress-Bar im Button: Von links nach rechts füllend in Spotify-Grün
      btn.style.background = `linear-gradient(90deg, rgba(30,215,96,0.85) 0%, rgba(30,215,96,0.85) ${progress}%, rgba(0,0,0,0.75) ${progress}%, rgba(0,0,0,0.75) 100%)`;
      
      // Bei Track-Ende automatisch stoppen
      if (state.position >= state.duration - 500) {
        await stopMpDeckPlayback();
      }
    } catch (err) {
      console.warn('⚠️ Deck Progress tracking update failed:', err);
    }
  }, 250); // Update alle 250ms für flüssige Animation
}

function applyActivePlayerColor(player) {
  const topName = document.getElementById('mpTopName');
  const topPanel = document.getElementById('mpTopPanel');
  if (!topName) return;
  const hex = player?.color || '#4dabf7';
  const { r, g, b } = hexToRgb(hex);
  const bg = `rgba(${r}, ${g}, ${b}, 0.22)`;
  const border = `rgba(${r}, ${g}, ${b}, 0.55)`;
  const glow = `rgba(${r}, ${g}, ${b}, 0.28)`;
  topName.classList.add('mp-name-pill');
  topName.style.setProperty('--mp-name-bg', bg);
  topName.style.setProperty('--mp-name-border', border);
  topName.style.setProperty('--mp-name-glow', glow);
  if (topPanel) {
    topPanel.classList.add('turn-active');
    topPanel.style.setProperty('--mp-turn-color', hex);
  }
}

function hexToRgb(hex) {
  let h = (hex || '').toString().replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function contrastColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  // relative luminance
  const sr = r/255; const sg = g/255; const sb = b/255;
  const lum = 0.2126*sr + 0.7152*sg + 0.0722*sb;
  return lum > 0.55 ? '#111' : '#f5f5f5';
}

function patternForIndex(i) {
  const patterns = ['pattern-stripes','pattern-dots','pattern-cross'];
  return patterns[i % patterns.length];
}

async function mpStartTurn() {
  if (!multiplayerActive) return;
  const player = mpPlayers[mpCurrentPlayerIndex];
  // draw card for this player
  const card = await getRandomSongWithYear();
  if (!card) {
    document.getElementById('mpDrawnCard').textContent = t('messages.noCardFound');
    return;
  }
  // Audio-Handling:
  // 1) Jellyfin → Direkt Download-URL
  // 2) Spotify mit PreviewUrl → <audio>
  // 3) Spotify ohne Preview aber Premium → Web Playback SDK (voller Track) + eigene Steuerung
  // 4) Spotify ohne Preview und kein Premium → Hinweis statt Player
  let audioMarkup = '';
  if (musicSource === 'spotify') {
    if (card.PreviewUrl) {
      audioMarkup = `<audio id="mpAudio" controls src="${card.PreviewUrl}"></audio>`;
    } else if (card.SpotifyUri) {
      try {
        const spMod = await import('./src/services/spotifyPlayer.js');
        if (spMod.hasSpotifyPremium()) {
          // Versuche sofortige Wiedergabe; UI mit Play/Pause Fallback
          spMod.playTrack(card.SpotifyUri);
          audioMarkup = `<div id="mpSpotifyPremium" style="display:flex;gap:8px;align-items:center;">
            <span style="color:#1DB954">Spotify Premium</span>
            <button id="mpSpPlayBtn">Pause</button>
          </div>`;
        } else {
          audioMarkup = `<em>${t('messages.noPreviewAvailable')}</em>`;
        }
      } catch (e) {
        audioMarkup = `<em>${t('messages.spotifyPlayerError')}</em>`;
      }
    } else {
      audioMarkup = `<em>${t('messages.noAudioAvailable')}</em>`;
    }
  } else {
    audioMarkup = `<audio id="mpAudio" controls src="${server}/Items/${card.Id}/Download?api_key=${apiKey}"></audio>`;
  }

  // show drawn card (metadata + audio). Titel/Artist/Album zunächst verborgen.
  document.getElementById('mpDrawnCard').innerHTML = `
    <div><span class="label">${t('common.title')}:</span> <span id="mpDrawnTitle" class="hidden">${card.Name}</span> <button id="mpRevealTitle">${t('common.show')}</button></div>
    <div><span class="label">${t('common.artist')}:</span> <span id="mpDrawnArtist" class="hidden">${card.AlbumArtists?.[0]?.Name || "?"}</span> <button id="mpRevealArtist">${t('common.show')}</button></div>
    <div><span class="label">${t('common.album')}:</span> <span id="mpDrawnAlbum" class="hidden">${card.Album || t('common.unknown')}</span> <button id="mpRevealAlbum">${t('common.show')}</button></div>
    <div><span class="label">${t('common.year')}:</span> <span id="mpDrawnYear">(${t('common.hidden')})</span></div>
    <div style="margin-top:6px;display:flex;gap:8px;align-items:center;">${audioMarkup}</div>
  `;

  // reveal handlers
  const rt = document.getElementById('mpRevealTitle'); if (rt) rt.addEventListener('click', () => { document.getElementById('mpDrawnTitle').classList.remove('hidden'); rt.style.display='none'; });
  const ra = document.getElementById('mpRevealArtist'); if (ra) ra.addEventListener('click', () => { document.getElementById('mpDrawnArtist').classList.remove('hidden'); ra.style.display='none'; });
  const rb = document.getElementById('mpRevealAlbum'); if (rb) rb.addEventListener('click', () => { document.getElementById('mpDrawnAlbum').classList.remove('hidden'); rb.style.display='none'; });
  // attempt autoplay for <audio>
  const mpAudio = document.getElementById('mpAudio');
  if (mpAudio && userInteracted) tryPlayAudio(mpAudio);
  if (mpAudio) mpAudio.addEventListener('play', () => { userInteracted = true; });

  // Premium Spotify Play/Pause Button
  const spPlayBtn = document.getElementById('mpSpPlayBtn');
  if (spPlayBtn) {
    try {
      const spMod = await import('./src/services/spotifyPlayer.js');
      // WICHTIG: Stoppe vorheriges Progress-Tracking bevor neues gestartet wird
      if (mpMainProgressInterval) {
        try { clearInterval(mpMainProgressInterval); } catch {}
        mpMainProgressInterval = null;
      }
      // Starte Fortschrittsanzeige nur, wenn Deck nicht aktiv ist
      if (!mpDeckActive) { try { mpMainProgressInterval = spMod.startProgressTracking('mpSpPlayBtn'); } catch {} }
      
      // Event-Listener nur einmal hinzufügen (prüfe ob bereits vorhanden)
      if (!spPlayBtn.dataset.listenerAttached) {
        spPlayBtn.addEventListener('click', async () => {
          // Ignoriere Klicks, wenn Deck-Playback aktiv ist
          if (mpDeckActive) { return; }
          
          // Pause-Status aus aktuellem Player-State auslesen
          const currentState = await spMod.getCurrentState();
          const isPaused = currentState?.paused ?? true;
          
          if (!isPaused) { 
            await spMod.pausePlayback(); 
            spPlayBtn.textContent = 'Play';
            if (mpMainProgressInterval) { try { clearInterval(mpMainProgressInterval); } catch {} mpMainProgressInterval = null; }
          }
          else { 
            await spMod.resumePlayback(); 
            spPlayBtn.textContent = 'Pause';
            try { mpMainProgressInterval = spMod.startProgressTracking('mpSpPlayBtn'); } catch {}
          }
        });
        spPlayBtn.dataset.listenerAttached = 'true';
      }
    } catch {}
  }

  // store the drawn card temporarily on player object
  player._drawn = card;

  // render interval buttons for insertion
  renderMpIntervals(player, card);
}

function renderMpIntervals(player, card) {
  const intervalsEl = document.getElementById('mpIntervals');
  intervalsEl.innerHTML = '';
  const deck = player.deck || [];
  // If deck empty, provide only older/newer
  // build options: older than all (index 0), between each pair (index 1..n-1), newer than all (index n)
  const options = [];
  // older than all
  options.push({ idx: 0, label: deck.length ? t('messages.upToYearIncl', { year: songYear(deck[0]) }) : t('messages.upToToday') });
  for (let i = 0; i < deck.length - 1; i++) {
    const a = songYear(deck[i]);
    const b = songYear(deck[i+1]);
    options.push({ idx: i+1, label: `${a} – ${b}` });
  }
  // between last and newer
  if (deck.length > 0) options.push({ idx: deck.length, label: t('messages.fromYearToToday', { year: songYear(deck[deck.length-1]) }) });

  // create buttons
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt.label;
    btn.dataset.idx = opt.idx;
    btn.style.marginRight = '6px';
    btn.addEventListener('click', () => mpHandleIntervalSelection(player, opt.idx));
    intervalsEl.appendChild(btn);
  });
}

function mpHandleIntervalSelection(player, chosenIndex) {
  const card = player._drawn;
  if (!card) return;
  const year = songYear(card);
  const deck = player.deck || [];
  // determine correct index
  let correctIndex = 0;
  while (correctIndex < deck.length && songYear(deck[correctIndex]) < year) correctIndex++;
  const status = document.getElementById('mpTopSub');

  const correct = (correctIndex === chosenIndex);
  // reveal year now
  const yearEl = document.getElementById('mpDrawnYear');
  if (yearEl) yearEl.textContent = year || `(${t('common.unknown')})`;

  const drawnEl = document.getElementById('mpDrawnCard');
  if (correct) {
    // insert into deck at correctIndex
    deck.splice(correctIndex, 0, card);
    status.textContent = t('messages.correctPlacement', { name: player.name, current: deck.length, target: mpTargetStreak });
    // visual feedback (green)
    if (drawnEl) {
      drawnEl.style.transition = 'background-color 0.15s ease';
      drawnEl.style.backgroundColor = '#113311';
      setTimeout(() => { if (drawnEl) drawnEl.style.backgroundColor = ''; }, 800);
    }
    // check win by deck size
    if (deck.length >= mpTargetStreak) {
      status.textContent = t('messages.playerWon', { name: player.name, size: deck.length, target: mpTargetStreak });
      multiplayerActive = false;
      // hide intervals
      const intervals = document.getElementById('mpIntervals'); if (intervals) intervals.innerHTML = '';
      // reveal full decks
      renderMpPlayerPanel();
      // save leaderboard
      addLeaderboardEntry(player.name, deck.length);
      renderLeaderboard();
      return;
    }
  } else {
    // incorrect: discard the card
    mpDiscardPile.push(card);
    status.textContent = t('messages.wrongPlacement', { name: player.name });
    // visual feedback (red)
    if (drawnEl) {
      drawnEl.style.transition = 'background-color 0.15s ease';
      drawnEl.style.backgroundColor = '#331111';
      setTimeout(() => { if (drawnEl) drawnEl.style.backgroundColor = ''; }, 800);
    }
  }

  // clear drawn card
  delete player._drawn;
  // update deck display
  renderMpPlayerPanel();

  // move to next player after short delay
  setTimeout(async () => {
    // Stoppe Deck-Playback falls aktiv, bevor zum nächsten Spieler gewechselt wird
    if (mpDeckActive) {
      await stopMpDeckPlayback();
    }
    
    mpCurrentPlayerIndex = (mpCurrentPlayerIndex + 1) % mpPlayers.length;
    renderMpPlayerPanel();
    if (multiplayerActive) mpStartTurn();
  }, 900);
}

// Zufälligen Song holen
async function getRandomSong() {
  const genreFilter = document.getElementById("genre").value.trim().toLowerCase();
  const minYear = parseInt(document.getElementById("minYear").value) || null;
  const maxYear = parseInt(document.getElementById("maxYear").value) || null;

  let attempts = 0;
  let song = null;

  while (!song && attempts < 20) {
    // Branching: Spotify oder Jellyfin
    const items = musicSource === 'spotify'
      ? await fetchRandomSpotifyTracks(50, { genre: genreFilter, minYear, maxYear })
      : await fetchRandomItems(50);
    const filtered = filterSongs(items, { genreFilter, minYear, maxYear, requireYear: false }, playedSongs, sessionSongs);
    if (filtered.length > 0) song = pickRandomSong(filtered);
    attempts++;
  }

  if (!song) {
    document.getElementById("choosesong").textContent = t('messages.noSongFound');
    return;
  }

  // Song in Runde + Season eintragen
  markSongUsed(song.Id);

  const genresDisplay = song.Genres && song.Genres.length > 0 ? song.Genres.join(", ") : "Unbekannt";
  const displayYear = song.ProductionYear || 
    (song.PremiereDate ? new Date(song.PremiereDate).getFullYear() : "Unbekannt");

  // Audio-Stream: Spotify nutzt PreviewUrl (30s), Jellyfin Download-URL
  const audioSrc = musicSource === 'spotify' && song.PreviewUrl
    ? song.PreviewUrl
    : `${server}/Items/${song.Id}/Download?api_key=${apiKey}`;

  document.getElementById("choosesong").innerHTML = `
    <div><span class="label">Titel:</span> ${song.Name}</div>
    <div><span class="label">Artist:</span> ${song.AlbumArtists?.[0]?.Name || "?"}</div>
    <div><span class="label">Album:</span> ${song.Album || "Unbekannt"}</div>
    <div><span class="label">Jahr:</span> ${displayYear}</div>
    <div><span class="label">Genre:</span> ${genresDisplay}</div>
    <div><span class="label">Stream:</span>
      <audio id="player" controls autoplay src="${audioSrc}"></audio>
    </div>
  `;

  updateCounter();
  
  // Filterbereich nach Auswahl ausblenden
  document.getElementById("filters").classList.add("hidden");
}

// Fetch a random song for the Guess-the-Year game (shows metadata but hides the year)
async function getRandomSongForGame() {
  const genreFilter = document.getElementById("genre").value.trim().toLowerCase();
  const minYear = parseInt(document.getElementById("minYear").value) || null;
  const maxYear = parseInt(document.getElementById("maxYear").value) || null;

  let attempts = 0;
  let song = null;

  while (!song && attempts < 20) {
    // Branching: Spotify oder Jellyfin
    const items = musicSource === 'spotify'
      ? await fetchRandomSpotifyTracks(50, { genre: genreFilter, minYear, maxYear })
      : await fetchRandomItems(50);
    const filtered = filterSongs(items, { genreFilter, minYear, maxYear, requireYear: false }, playedSongs, sessionSongs);
    if (filtered.length > 0) song = pickRandomSong(filtered);
    attempts++;
  }

  if (!song) {
    document.getElementById("guesssong").textContent = t('messages.noSongFound');
    return null;
  }

  // Mark song as used for this round/season
  markSongUsed(song.Id);
  updateCounter();

  currentSong = song;
  presentQuestionForSong(song);
  return song;
}

function presentQuestionForSong(song) {
  const genresDisplay = song.Genres && song.Genres.length > 0 ? song.Genres.join(", ") : "Unbekannt";
  const displayYear = song.ProductionYear || (song.PremiereDate ? new Date(song.PremiereDate).getFullYear() : null);
  
  // Audio-Stream: Spotify nutzt PreviewUrl (30s), Jellyfin Download-URL
  const audioSrc = musicSource === 'spotify' && song.PreviewUrl
    ? song.PreviewUrl
    : `${server}/Items/${song.Id}/Download?api_key=${apiKey}`;
  
  // Render metadata but hide album/artist/title by default; year is hidden for guessing
  document.getElementById("guesssong").innerHTML = `
    <div><span class="label">${t('common.title')}:</span> <span id="songTitle" class="hidden">${song.Name}</span> <button id="revealTitleBtn">${t('common.show')}</button></div>
    <div><span class="label">${t('common.artist')}:</span> <span id="songArtist" class="hidden">${song.AlbumArtists?.[0]?.Name || "?"}</span> <button id="revealArtistBtn">${t('common.show')}</button></div>
    <div><span class="label">${t('common.album')}:</span> <span id="songAlbum" class="hidden">${song.Album || t('common.unknown')}</span> <button id="revealAlbumBtn">${t('common.show')}</button></div>
    <div><span class="label">${t('common.year')}:</span> <em>${t('common.hidden')}</em></div>
    <div><span class="label">${t('common.genre')}:</span> ${genresDisplay}</div>
    <div><span class="label">${t('common.stream')}:</span>
      <audio id="player" controls src="${audioSrc}"></audio>
    </div>
  `;

  // reveal handlers for metadata
  const revealTitleBtn = document.getElementById('revealTitleBtn');
  if (revealTitleBtn) revealTitleBtn.addEventListener('click', () => {
    const el = document.getElementById('songTitle'); el.classList.remove('hidden'); revealTitleBtn.style.display = 'none';
  });
  const revealArtistBtn = document.getElementById('revealArtistBtn');
  if (revealArtistBtn) revealArtistBtn.addEventListener('click', () => {
    const el = document.getElementById('songArtist'); el.classList.remove('hidden'); revealArtistBtn.style.display = 'none';
  });
  const revealAlbumBtn = document.getElementById('revealAlbumBtn');
  if (revealAlbumBtn) revealAlbumBtn.addEventListener('click', () => {
    const el = document.getElementById('songAlbum'); el.classList.remove('hidden'); revealAlbumBtn.style.display = 'none';
  });

  const playerEl = document.getElementById('player');
  if (playerEl && userInteracted) tryPlayAudio(playerEl);
  if (playerEl) playerEl.addEventListener('play', () => { userInteracted = true; });

  // Show game controls
  document.getElementById('gameControls').classList.remove('hidden');
  document.getElementById('submitGuessBtn').classList.remove('hidden');
  document.getElementById('nextQuestionBtn').classList.add('hidden');
  document.getElementById('feedback').textContent = '';

  // Start timer
  startTimer();
  updateScoreboard();
}

function startTimer() {
  clearTimer();
  timerRemaining = timerDuration;
  document.getElementById('timerDisplay').textContent = `Zeit: ${timerRemaining}s`;
  timerInterval = setInterval(() => {
    timerRemaining--;
    document.getElementById('timerDisplay').textContent = `Zeit: ${timerRemaining}s`;
    if (timerRemaining <= 0) {
      clearTimer();
      onTimeUp();
    }
  }, 1000);
}

function clearTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function onTimeUp() {
  document.getElementById('feedback').textContent = t('messages.timeUp');
  // treat as incorrect
  applyScoring(null);
}

function updateScoreboard() {
  document.getElementById('scoreDisplay').textContent = `${t('messages.score')}: ${playerScore}`;
  document.getElementById('livesDisplay').textContent = `${t('messages.lives')}: ${lives}`;
}

function applyScoring(guessYear) {
  clearTimer();
  const feedbackEl = document.getElementById('feedback');
  const actualYear = currentSong?.ProductionYear || (currentSong?.PremiereDate ? new Date(currentSong.PremiereDate).getFullYear() : null);
  if (!actualYear) {
    feedbackEl.textContent = t('messages.noYearAvailable');
    document.getElementById('submitGuessBtn').classList.add('hidden');
    document.getElementById('nextQuestionBtn').classList.remove('hidden');
    return;
  }

  let points = 0;
  if (typeof guessYear === 'number') {
    const diff = Math.abs(actualYear - guessYear);
    if (diff === 0) points = 5;
    else if (diff <= 1) points = 3;
    else if (diff <= 2) points = 2;
    else points = 0;
  } else {
    points = 0; // timed out or no numeric guess
  }

  playerScore += points;

  if (points === 0) {
    lives -= 1;
  }

  feedbackEl.textContent = t('messages.correctYearPoints', { year: actualYear, points });
  document.getElementById('submitGuessBtn').classList.add('hidden');
  document.getElementById('nextQuestionBtn').classList.remove('hidden');
  updateScoreboard();

  // If lives depleted, end game
  if (lives <= 0) {
    endGame();
  }
}

function submitGuess() {
  const input = document.getElementById('guessYearInput').value.trim();
  const guess = parseInt(input, 10);
  if (!input || isNaN(guess)) {
    document.getElementById('feedback').textContent = t('messages.enterYear');
    return;
  }
  applyScoring(guess);
}

function nextQuestion() {
  document.getElementById('guessYearInput').value = '';
  document.getElementById('feedback').textContent = '';
  document.getElementById('submitGuessBtn').classList.remove('hidden');
  document.getElementById('nextQuestionBtn').classList.add('hidden');
  if (gameActive) {
    getRandomSongForGame();
  }
}

function startGame() {
  gameActive = true;
  playerScore = 0;
  lives = DEFAULT_LIVES;
  resetRound();
  document.getElementById('guesssong').textContent = t('messages.gameStarted');
  updateScoreboard();
  getRandomSongForGame();
}

function stopGame() {
  gameActive = false;
  clearTimer();
  document.getElementById('gameControls').classList.add('hidden');
  document.getElementById('feedback').textContent = '';
  document.getElementById('guesssong').textContent = t('messages.gameStopped');
}

function endGame() {
  gameActive = false;
  clearTimer();
  document.getElementById('feedback').textContent = t('messages.gameOverScore', { score: playerScore });
  document.getElementById('gameControls').classList.add('hidden');
}

// Hamburger Menü
function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.classList.toggle("open");
}

// Neues Spiel (nur Runde)
function confirmNewGame() {
  const msg = t('messages.confirmNewRound');
  if (confirm(msg)) {
    newGame();
    toggleMenu();
    showToast(t('messages.roundReset'));
  }
}

function newGame() {
  resetRound();
  document.getElementById("choosesong").textContent = t('messages.newRoundStarted');
  document.getElementById("guesssong").textContent = t('messages.newRoundStartedGuess');
  updateCounter();
}

// Neue Season (alles zurücksetzen)
function confirmNewSeason() {
  const msg = t('messages.confirmNewSeason');
  if (confirm(msg)) {
    newSeason();
    toggleMenu();
    showToast(t('messages.seasonReset'));
  }
}

function newSeason() {
  resetSeason();
  newGame();
}

// Counter aktualisieren
function updateCounter() {
  const chooseCounter = document.getElementById("choosecounter");
  const guessCounter = document.getElementById("guesscounter");
  if (chooseCounter) chooseCounter.textContent = `Songs gespielt: ${roundCounter}`;
  if (guessCounter) guessCounter.textContent = `Songs gespielt: ${roundCounter}`;
}

// Filterbereich ein-/ausblenden
function toggleFilters() {
  const filters = document.getElementById("filters");
  filters.classList.toggle("hidden");
}

// Settings UI handlers
function showSettings() {
  const settings = document.getElementById('settings');
  const serverInput = document.getElementById('settingServer');
  const libInput = document.getElementById('settingLibraryId');
  const apiKeyInput = document.getElementById('settingApiKey');
  const msSelect = document.getElementById('settingMusicSource');
  const scidInput = document.getElementById('settingSpotifyClientId');
  const sruInput = document.getElementById('settingSpotifyRedirect');
  if (serverInput) serverInput.value = server || '';
  if (libInput) libInput.value = libraryId || '';
  if (apiKeyInput) apiKeyInput.value = apiKey || '';
  if (msSelect) msSelect.value = musicSource || 'jellyfin';
  if (scidInput) scidInput.value = spotifyClientId || '';
  if (sruInput) sruInput.value = spotifyRedirectUri || '';
  const lastfmInput = document.getElementById('settingLastfmApiKey');
  if (lastfmInput) {
    // Robust: nutze globalen Wert, falls vorhanden; sonst localStorage
    const lf = (typeof lastfmApiKey !== 'undefined' && lastfmApiKey) 
      ? lastfmApiKey 
      : (localStorage.getItem('lastfmApiKey') || '');
    lastfmInput.value = lf;
  }
  // Gruppen toggeln
  const jellyGroup = document.getElementById('jellyfinSettingsGroup');
  const spotGroup = document.getElementById('spotifySettingsGroup');
  if (musicSource === 'spotify') {
    jellyGroup?.classList.add('hidden');
    spotGroup?.classList.remove('hidden');
  } else {
    jellyGroup?.classList.remove('hidden');
    spotGroup?.classList.add('hidden');
  }
  const menu = document.getElementById('menu');
  if (!settings) return;
  if (settings.classList.contains('hidden')) {
    if (menu && !menu.classList.contains('open')) menu.classList.add('open');
    settings.classList.remove('hidden');
  } else {
    settings.classList.add('hidden');
    if (menu && menu.classList.contains('open')) menu.classList.remove('open');
  }
}

function hideSettings() {
  const settings = document.getElementById('settings');
  settings.classList.add('hidden');
}

function saveSettings() {
    const lastfmInput = document.getElementById('settingLastfmApiKey');
    const lastfmVal = lastfmInput ? lastfmInput.value.trim() : '';
  const msSelect = document.getElementById('settingMusicSource');
  const scidInput = document.getElementById('settingSpotifyClientId');
  const sruInput = document.getElementById('settingSpotifyRedirect');
  const serverInputVal = document.getElementById('settingServer').value.trim();
  const libInputVal = document.getElementById('settingLibraryId').value.trim();
  const apiKeyInputVal = document.getElementById('settingApiKey').value.trim();
  const musicSourceVal = msSelect ? msSelect.value : 'jellyfin';
  const scidVal = scidInput ? scidInput.value.trim() : '';
  const sruVal = sruInput ? sruInput.value.trim() : '';
  try {
        // Last.fm API Key speichern
        if (lastfmInput) {
          localStorage.setItem('lastfmApiKey', lastfmVal);
          if (typeof setLastfmApiKey === 'function') setLastfmApiKey(lastfmVal);
        }
    // Musikquelle speichern
    localStorage.setItem('musicSource', musicSourceVal);
    setMusicSource(musicSourceVal);

    if (musicSourceVal === 'spotify') {
      // Jellyfin Felder ggf. entfernen (optional, belassen falls User zurückwechselt)
      if (scidVal) {
        localStorage.setItem('spotifyClientId', scidVal);
        setSpotifyClientId(scidVal);
      } else {
        localStorage.removeItem('spotifyClientId');
        setSpotifyClientId('');
      }
      if (sruVal) {
        localStorage.setItem('spotifyRedirectUri', sruVal);
        setSpotifyRedirectUri(sruVal);
      } else {
        localStorage.removeItem('spotifyRedirectUri');
        setSpotifyRedirectUri('');
      }
      // Placeholder Status (Validierung folgt später via spotifyClient)
      updateConnectionStatus(!!scidVal, scidVal ? t('messages.spotifyConfigured') : t('messages.spotifyIncomplete'));
      showToast('Einstellungen gespeichert');
    } else {
      // Jellyfin Einstellungen
      if (serverInputVal) {
        localStorage.setItem('server', serverInputVal);
        setServer(serverInputVal);
      } else {
        localStorage.removeItem('server');
        setServer(DEFAULT_SERVER);
      }
      if (libInputVal) {
        localStorage.setItem('libraryId', libInputVal);
        setLibraryId(libInputVal);
      } else {
        localStorage.removeItem('libraryId');
        setLibraryId(DEFAULT_LIBRARY_ID);
      }
      if (apiKeyInputVal) {
        localStorage.setItem('apiKey', apiKeyInputVal);
        setApiKey(apiKeyInputVal);
      } else {
        localStorage.removeItem('apiKey');
        setApiKey('');
      }
      // Verbindung testen nur bei Jellyfin
      validateJellyfinConfig().then(r => {
        updateConnectionStatus(r.ok, r.message);
        showToast(r.ok ? 'Einstellungen gespeichert' : 'Fehlerhafte Verbindung');
      });
    }
  } catch (e) {
    console.warn('Konnte Einstellungen nicht in localStorage speichern:', e);
    showToast('Fehler beim Speichern');
  }
  hideSettings();
}

// Wire up DOM event listeners (replace inline onclick handlers)
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const newGameBtn = document.getElementById('newGameBtn');
  const newSeasonBtn = document.getElementById('newSeasonBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const filterToggleBtn = document.getElementById('filterToggleBtn');
  const selectSongBtn = document.getElementById('selectSongBtn');
  const startGameBtn = document.getElementById('startGameBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
  const submitGuessBtn = document.getElementById('submitGuessBtn');
  const nextQuestionBtn = document.getElementById('nextQuestionBtn');
  const stopGameBtn = document.getElementById('stopGameBtn');
  const startMultiplayerBtn = document.getElementById('startMultiplayerBtn');
  const musicSourceSelect = document.getElementById('settingMusicSource');
  const spotifyAuthBtn = document.getElementById('spotifyAuthBtn');

  if (spotifyAuthBtn) {
    spotifyAuthBtn.addEventListener('click', () => {
      startSpotifyAuthFlow();
    });
  }

  if (musicSourceSelect) {
    musicSourceSelect.addEventListener('change', () => {
      const jellyGroup = document.getElementById('jellyfinSettingsGroup');
      const spotGroup = document.getElementById('spotifySettingsGroup');
      setMusicSource(musicSourceSelect.value);
      if (musicSourceSelect.value === 'spotify') {
        jellyGroup?.classList.add('hidden');
        spotGroup?.classList.remove('hidden');
      } else {
        jellyGroup?.classList.remove('hidden');
        spotGroup?.classList.add('hidden');
      }
    });
  }

  if (hamburger) hamburger.addEventListener('click', toggleMenu);
  // Close menu when user clicks outside it (helpful on mobile)
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('menu');
    const hamburgerEl = document.getElementById('hamburger');
    if (!menu || !menu.classList.contains('open')) return;
    const target = e.target;
    if (hamburgerEl && (hamburgerEl === target || hamburgerEl.contains(target))) return;
    if (menu.contains(target)) return;
    closeMenu();
  });
  if (newGameBtn) newGameBtn.addEventListener('click', confirmNewGame);
  if (newSeasonBtn) newSeasonBtn.addEventListener('click', confirmNewSeason);
  if (settingsBtn) settingsBtn.addEventListener('click', showSettings);
  if (filterToggleBtn) filterToggleBtn.addEventListener('click', toggleFilters);
  if (startMultiplayerBtn) startMultiplayerBtn.addEventListener('click', startMultiplayer);
  // Start screen buttons
  const startChooseBtn = document.getElementById('startChooseBtn');
  const startGuessBtn = document.getElementById('startGuessBtn');
  const startMultiplayerPrimaryBtn = document.getElementById('startMultiplayerPrimaryBtn');
  if (startChooseBtn) startChooseBtn.addEventListener('click', showChooseSongUI);
  if (startGuessBtn) startGuessBtn.addEventListener('click', showGuessUI);
  if (startMultiplayerPrimaryBtn) startMultiplayerPrimaryBtn.addEventListener('click', showMpStartPanel);
  // Menu mode quick-links (mirror start screen)
  const modeChooseSongBtn = document.getElementById('modeChooseSongBtn');
  const modeGuessBtn = document.getElementById('modeGuessBtn');
  const modeMultiplayerBtn = document.getElementById('modeMultiplayerBtn');
  if (modeChooseSongBtn) modeChooseSongBtn.addEventListener('click', showChooseSongUI);
  if (modeGuessBtn) modeGuessBtn.addEventListener('click', showGuessUI);
  if (modeMultiplayerBtn) modeMultiplayerBtn.addEventListener('click', showMpStartPanel);
  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);
  if (cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', hideSettings);
  const clearLbBtn = document.getElementById('clearLeaderboardBtn');
  if (clearLbBtn) clearLbBtn.addEventListener('click', clearLeaderboard);
  // Menu reset buttons (IDs in `index.html`)
  const resetRoundBtn = document.getElementById('resetRoundBtn');
  const resetSeasonBtn = document.getElementById('resetSeasonBtn');
  if (resetRoundBtn) resetRoundBtn.addEventListener('click', confirmNewGame);
  if (resetSeasonBtn) resetSeasonBtn.addEventListener('click', confirmNewSeason);
  // render initial leaderboard
  renderLeaderboard();
  // global user interaction marker for autoplay allowance
  document.addEventListener('click', () => { userInteracted = true; }, { once: true });
  // layout: measure header and set CSS variables so mpSwipe can size precisely
  function updateLayoutHeights() {
    const top = document.getElementById('mpTopPanel');
    const root = document.documentElement;
    if (!top || !root) return;
    const rect = top.getBoundingClientRect();
    const h = Math.ceil(rect.height);
    // set CSS variables used by CSS to size the swipe area
    // measure body paddings so we can compute exact remaining height
    const bodyStyle = window.getComputedStyle(document.body);
    const padTop = parseFloat(bodyStyle.paddingTop) || 0;
    const padBottom = parseFloat(bodyStyle.paddingBottom) || 0;
    // use visualViewport when available (handles mobile address bar properly)
    const viewportHeight = (window.visualViewport && window.visualViewport.height) ? window.visualViewport.height : window.innerHeight;
    // available viewport height for swipe area
    const avail = Math.max(0, viewportHeight - h - padTop - padBottom - 8);
    root.style.setProperty('--mp-header-height', `${h}px`);
    root.style.setProperty('--mp-header-offset', `${h + padTop}px`);
    root.style.setProperty('--mp-swipe-height', `${Math.ceil(avail)}px`);
  }
  updateLayoutHeights();
  window.addEventListener('resize', updateLayoutHeights);
  window.addEventListener('orientationchange', updateLayoutHeights);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', updateLayoutHeights);
  // expose for other code paths (call when showing multiplayer to ensure correct sizing)
  window.updateLayoutHeights = updateLayoutHeights;
});

// panel navigation buttons
document.addEventListener('DOMContentLoaded', () => {
  const prev = document.getElementById('mpPrevBtn');
  const next = document.getElementById('mpNextBtn');
  if (prev) prev.addEventListener('click', () => { mpNavigate(-1); });
  if (next) next.addEventListener('click', () => { mpNavigate(1); });
  // wheel => horizontal scroll inside mpSwipe
  const swipe = document.getElementById('mpSwipe');
  if (swipe) {
    swipe.addEventListener('wheel', (e) => {
      // Only hijack vertical wheel to scroll horizontally when the swipe area actually overflows
      const isMostlyVertical = Math.abs(e.deltaY) > Math.abs(e.deltaX);
      const hasHorizontalOverflow = swipe.scrollWidth > (swipe.clientWidth + 1);
      if (isMostlyVertical && hasHorizontalOverflow) {
        swipe.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });
    // update arrows initially and on interactions
    updateMpArrowVisibility();
    // hide/show arrows on scroll/resize
    swipe.addEventListener('scroll', updateMpArrowVisibility);
    window.addEventListener('resize', updateMpArrowVisibility);
  }
});

function mpNavigate(direction) {
  const swipe = document.getElementById('mpSwipe');
  if (!swipe) return;
  const panels = Array.from(swipe.querySelectorAll('.mpPanel'));
  if (!panels.length) return;
  // find currently centered panel by measuring distance to center
  const center = swipe.scrollLeft + (swipe.clientWidth / 2);
  let bestIdx = 0; let bestDist = Infinity;
  panels.forEach((p, i) => {
    const rect = p.getBoundingClientRect();
    const swipeRect = swipe.getBoundingClientRect();
    const pCenter = (rect.left - swipeRect.left) + rect.width/2 + swipe.scrollLeft;
    const dist = Math.abs(pCenter - center);
    if (dist < bestDist) { bestDist = dist; bestIdx = i; }
  });
  let nextIdx = bestIdx + direction;
  if (nextIdx < 0) nextIdx = 0;
  if (nextIdx >= panels.length) nextIdx = panels.length - 1;
  mpShowPanel(nextIdx);
}

// Show/hide prev/next arrow buttons depending on whether the swipe area overflows
function updateMpArrowVisibility() {
  const swipe = document.getElementById('mpSwipe');
  const prev = document.getElementById('mpPrevBtn');
  const next = document.getElementById('mpNextBtn');
  if (!swipe) {
    if (prev) prev.style.display = '';
    if (next) next.style.display = '';
    return;
  }
  const overflow = swipe.scrollWidth > (swipe.clientWidth + 1);
  if (prev) prev.style.display = overflow ? '' : 'none';
  if (next) next.style.display = overflow ? '' : 'none';
}

// Multiplayer pre-start panel functions
function renderMpPanelNames() {
  const container = document.getElementById('mpPanelNames');
  if (!container) return;
  const countEl = document.getElementById('mpPanelPlayerCount');
  // load stored roster if available
  const stored = loadMpRoster() || [];
  let count = Math.max(2, Math.min(6, parseInt(countEl?.value, 10) || 2));
  if (stored.length > 0) {
    // prefer stored roster length when present
    count = Math.max(2, Math.min(6, stored.length));
    if (countEl) countEl.value = count;
  }
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const row = document.createElement('div');
    row.style.display = 'flex'; row.style.gap = '8px'; row.style.alignItems = 'center';
    const label = document.createElement('label');
    label.textContent = t('messages.playerLabel', { number: i+1 }); label.style.color = '#ccc'; label.style.minWidth = '90px';
    const input = document.createElement('input');
    input.type = 'text'; input.placeholder = t('messages.playerLabel', { number: i+1 }); input.value = t('messages.playerLabel', { number: i+1 });
    if (stored[i]) input.value = (typeof stored[i] === 'string') ? stored[i] : (stored[i].name || t('messages.playerLabel', { number: i+1 }));
    input.style.flex = '1'; input.style.padding = '6px'; input.style.background = '#1e1e1e'; input.style.color = '#eee';
    input.style.border = '1px solid #333'; input.style.borderRadius = '6px';
    // Color picker for player
    const color = document.createElement('input');
    color.type = 'color';
    const palette = defaultPlayerColors();
    color.value = (stored[i] && typeof stored[i] !== 'string' && stored[i].color) ? stored[i].color : palette[i % palette.length];
    color.title = t('common.playerColor');
    color.style.width = '44px';
    color.style.height = '34px';
    color.style.border = '1px solid #333';
    color.style.borderRadius = '6px';
    color.style.background = '#1e1e1e';
    row.appendChild(label); row.appendChild(input); row.appendChild(color);
    container.appendChild(row);
  }
}

// persist/load multiplayer roster
function loadMpRoster() {
  try {
    const raw = localStorage.getItem('hitit_mp_roster_v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const palette = defaultPlayerColors();
    return parsed.map((item, idx) => {
      if (typeof item === 'string') return { name: item, color: palette[idx % palette.length] };
      return { name: item.name || t('messages.playerLabel', { number: idx+1 }), color: item.color || palette[idx % palette.length] };
    });
  } catch (e) {
    return null;
  }
}

function saveMpRoster(players) {
  try {
    localStorage.setItem('hitit_mp_roster_v1', JSON.stringify(players));
  } catch (e) {
    // ignore
  }
}

function defaultPlayerColors() {
  return ['#ff6b6b','#4dabf7','#51cf66','#ffd43b','#b197fc','#20c997'];
}

// --- Multiple Roster Persistence (named sets of players) ---
function loadAllRosters() {
  try {
    const raw = localStorage.getItem('hitit_mp_rosters_v1');
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return (obj && typeof obj === 'object') ? obj : {};
  } catch { return {}; }
}
function saveAllRosters(map) {
  try { localStorage.setItem('hitit_mp_rosters_v1', JSON.stringify(map)); } catch {}
}
function renderRosterSelect() {
  const sel = document.getElementById('mpRosterSelect');
  if (!sel) return;
  const all = loadAllRosters();
  const names = Object.keys(all).sort();
  sel.innerHTML = names.length ? names.map(n => `<option value="${n}">${n}</option>`).join('') : `<option value="">${t('messages.noRosters')}</option>`;
}
function wireRosterManager() {
  const loadBtn = document.getElementById('mpRosterLoadBtn');
  const delBtn = document.getElementById('mpRosterDeleteBtn');
  const saveBtn = document.getElementById('mpRosterSaveBtn');
  const nameInput = document.getElementById('mpRosterName');
  const sel = document.getElementById('mpRosterSelect');
  if (loadBtn && sel) loadBtn.onclick = () => {
    const chosen = sel.value.trim(); if (!chosen) return;
    const all = loadAllRosters(); const data = all[chosen]; if (!data) return;
    mpPlayers = data.map((p, idx) => ({ id: idx, name: p.name, color: p.color, deck: [] }));
    mpCurrentPlayerIndex = 0; renderMpPanelNames(); showToast(t('messages.rosterLoaded'));
  };
  if (delBtn && sel) delBtn.onclick = () => {
    const chosen = sel.value.trim(); if (!chosen) return;
    const all = loadAllRosters(); delete all[chosen]; saveAllRosters(all); renderRosterSelect(); showToast(t('messages.rosterDeleted'));
  };
  if (saveBtn && nameInput) saveBtn.onclick = () => {
    const name = nameInput.value.trim(); if (!name) { showToast(t('messages.nameMissing')); return; }
    const rows = Array.from(document.querySelectorAll('#mpPanelNames > div'));
    const roster = rows.map((row, idx) => {
      const inputs = Array.from(row.querySelectorAll('input'));
      const nameInputEl = inputs.find(i => i.type === 'text');
      const colorInputEl = inputs.find(i => i.type === 'color');
      const pname = (nameInputEl?.value || '').trim() || `Spieler ${idx+1}`;
      const color = colorInputEl?.value || defaultPlayerColors()[idx % defaultPlayerColors().length];
      return { name: pname, color };
    });
    const all = loadAllRosters(); all[name] = roster; saveAllRosters(all); renderRosterSelect(); showToast(t('messages.rosterSaved'));
  };
}

function showMpStartPanel() {
  // ensure hamburger menu is closed immediately when opening multiplayer pre-start
  closeMenu();
  // hide other main UI and show the panel
  hideAllMain();
  document.getElementById('startScreen')?.classList.add('hidden');
  const panel = document.getElementById('mpStartPanel');
  if (!panel) return;
  panel.classList.remove('hidden');
  // render name inputs
  renderMpPanelNames();
  // wire controls (once per panel show, avoid duplicate listeners)
  const countEl = document.getElementById('mpPanelPlayerCount');
  if (countEl && !countEl.dataset.listenerAttached) {
    countEl.addEventListener('input', renderMpPanelNames);
    countEl.addEventListener('change', renderMpPanelNames);
    countEl.dataset.listenerAttached = 'true';
  }
  const startBtn = document.getElementById('mpPanelStartBtn');
  if (startBtn && !startBtn.dataset.listenerAttached) {
    startBtn.onclick = () => {
    const rows = Array.from(document.querySelectorAll('#mpPanelNames > div'));
    const players = rows.map((row, idx) => {
      const inputs = Array.from(row.querySelectorAll('input'));
      const nameInput = inputs.find(i => i.type === 'text');
      const colorInput = inputs.find(i => i.type === 'color');
      const name = (nameInput?.value || '').trim() || `Spieler ${idx+1}`;
      const palette = defaultPlayerColors();
      const color = colorInput?.value || palette[idx % palette.length];
      return { name, color };
    });
    // init players with color
    mpPlayers = players.map((p, idx) => ({ id: idx, name: p.name, color: p.color, deck: [] }));
    mpCurrentPlayerIndex = 0;
    // set target deck size from input
    const tEl = document.getElementById('mpPanelTargetSize');
    const ts = parseInt(tEl?.value, 10);
    if (!isNaN(ts) && ts > 0) mpTargetStreak = ts;
    // persist roster with colors
    saveMpRoster(players);
    // hide panel and start multiplayer UI
    panel.classList.add('hidden');
    showMultiplayerUI();
    showToast('Multiplayer gestartet');
    startMultiplayer();
  };
    startBtn.dataset.listenerAttached = 'true';
  }
  const cancelBtn = document.getElementById('mpPanelCancelBtn');
  if (cancelBtn && !cancelBtn.dataset.listenerAttached) {
    cancelBtn.onclick = () => { panel.classList.add('hidden'); showStartScreen(); };
    cancelBtn.dataset.listenerAttached = 'true';
  }

  // Inject roster manager (only once)
  const existingRosterUi = document.getElementById('mpRosterManager');
  if (!existingRosterUi) {
    const rosterWrap = document.createElement('div');
    rosterWrap.id = 'mpRosterManager';
    rosterWrap.style.marginTop = '1.2em';
    rosterWrap.style.paddingTop = '1.2em';
    rosterWrap.style.borderTop = '1px solid #333';
    rosterWrap.innerHTML = `
      <h4 style=\"margin:0 0 0.6em;color:#eee;font-weight:600;\">Rosters</h4>
      <div style=\"display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px;\">
        <select id=\"mpRosterSelect\" style=\"flex:1;min-width:180px;background:#1e1e1e;color:#eee;border:1px solid #333;padding:6px;border-radius:6px;\"></select>
        <button id=\"mpRosterLoadBtn\" style=\"flex:0 0 auto;\">${t('messages.load')}</button>
        <button id=\"mpRosterDeleteBtn\" style=\"flex:0 0 auto;background:#402020;border-color:#552020;\">${t('messages.delete')}</button>
      </div>
      <div style=\"display:flex;flex-wrap:wrap;gap:8px;align-items:center;\">
        <input id=\"mpRosterName\" type=\"text\" placeholder=\"${t('messages.newRosterName')}\" style=\"flex:1;min-width:160px;background:#1e1e1e;color:#eee;border:1px solid #333;padding:6px;border-radius:6px;\" />
        <button id=\"mpRosterSaveBtn\" style=\"flex:0 0 auto;\">${t('messages.save')}</button>
      </div>`;
    panel.appendChild(rosterWrap);
    renderRosterSelect();
    wireRosterManager();
  }
}

function hideMpStartPanel() {
  const panel = document.getElementById('mpStartPanel'); if (panel) panel.classList.add('hidden');
}

// UI show/hide helpers for start flow
function hideAllMain() {
  document.getElementById('chooseArea')?.classList.add('hidden');
  document.getElementById('gameArea')?.classList.add('hidden');
  document.getElementById('multiplayerArea')?.classList.add('hidden');
  document.getElementById('mpLeaderboard')?.classList.add('hidden');
}

function showStartScreen() {
  hideAllMain();
  document.getElementById('startScreen')?.classList.remove('hidden');
  try { document.body.style.overflow = ''; } catch (e) {}
}

function showChooseSongUI() {
  // close menu if open
  closeMenu();
  document.getElementById('startScreen')?.classList.add('hidden');
  hideAllMain();
  document.getElementById('chooseArea')?.classList.remove('hidden');
  document.getElementById('choosecounter')?.classList.remove('hidden');
  // choosesong bleibt initial versteckt - wird erst bei Song-Auswahl sichtbar
  try { document.body.style.overflow = ''; } catch (e) {}
}

function showGuessUI() {
  // close menu if open
  closeMenu();
  document.getElementById('startScreen')?.classList.add('hidden');
  hideAllMain();
  document.getElementById('gameArea')?.classList.remove('hidden');
  document.getElementById('guesscounter')?.classList.remove('hidden');
  document.getElementById('guesssong')?.classList.remove('hidden');
  document.getElementById('gameControls')?.classList.remove('hidden');
  try { document.body.style.overflow = ''; } catch (e) {}
}

function showMultiplayerUI() {
  // close menu if open
  closeMenu();
  document.getElementById('startScreen')?.classList.add('hidden');
  hideAllMain();
  document.getElementById('multiplayerArea')?.classList.remove('hidden');
  // ensure swipe container panels exist and show the leaderboard panel content
  document.getElementById('mpLeaderboardPanel')?.classList.remove('hidden');
  // default to the Drawn Card panel for focus
  mpShowPanel(1);
  // ensure layout variables are updated now that multiplayer area is visible
  try { if (window.updateLayoutHeights) window.updateLayoutHeights(); } catch (e) {}
  // prevent the page itself from scrolling while in multiplayer — let the swipe area scroll internally
  try { document.body.style.overflow = 'hidden'; } catch (e) {}
}

// Scroll to one of the swipe panels: 0=Deck,1=Drawn,2=Leaderboard
function mpShowPanel(idx) {
  const swipe = document.getElementById('mpSwipe');
  if (!swipe) return;
  const panels = Array.from(swipe.querySelectorAll('.mpPanel'));
  if (!panels[idx]) return;
  panels[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

// Close hamburger menu helper
function closeMenu() {
  const menu = document.getElementById('menu');
  if (menu && menu.classList.contains('open')) menu.classList.remove('open');
}

// Small transient toast / notification
function showToast(message, duration = 1500) {
  const t = document.createElement('div');
  t.textContent = message;
  t.style.position = 'fixed';
  t.style.left = '50%';
  t.style.transform = 'translateX(-50%)';
  t.style.bottom = '28px';
  t.style.background = 'rgba(0,0,0,0.85)';
  t.style.color = '#fff';
  t.style.padding = '10px 14px';
  t.style.borderRadius = '8px';
  t.style.boxShadow = '0 6px 18px rgba(0,0,0,0.6)';
  t.style.zIndex = 9999;
  document.body.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity 220ms'; t.style.opacity = '0'; }, duration - 220);
  setTimeout(() => { try { t.remove(); } catch (e) {} }, duration + 80);
}

// Initialize start screen visibility
showStartScreen();

// Verbindung Status Helfer
function updateConnectionStatus(ok, msg) {
  const el = document.getElementById('connectionStatusValue');
  if (!el) return;
  el.textContent = ok ? `Verbunden (${msg})` : `Fehler: ${msg}`;
  el.style.color = ok ? '#4caf50' : '#e57373';
}

// Events von jellyfinClient und spotifyClient anhören
window.addEventListener('jellyfin-auth-failed', (e) => {
  if (musicSource === 'jellyfin') updateConnectionStatus(false, `HTTP ${e.detail.status}`);
});
window.addEventListener('jellyfin-auth-ok', (e) => {
  if (musicSource === 'jellyfin') updateConnectionStatus(true, `Jellyfin ${e.detail.version || ''}`);
});
window.addEventListener('spotify-auth-failed', (e) => {
  if (musicSource === 'spotify') updateConnectionStatus(false, e.detail.message || 'Auth fehlgeschlagen');
});
window.addEventListener('spotify-auth-ok', (e) => {
  if (musicSource === 'spotify') updateConnectionStatus(true, e.detail.user ? `Spotify (${e.detail.user})` : 'Spotify verbunden');
});

// Beim Laden einmal versuchen, bestehende Konfiguration zu validieren
if (musicSource === 'spotify') {
  validateSpotifyConfig().then(r => {
    updateConnectionStatus(r.ok, r.message);
  });
} else {
  validateJellyfinConfig().then(r => {
    updateConnectionStatus(r.ok, r.message);
  });
}

