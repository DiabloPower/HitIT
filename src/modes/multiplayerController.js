// multiplayerController.js – Modularisierung (noch nicht aktiv eingebunden)
import { fetchRandomMusic } from '../services/musicService.js';
import { filterSongs, pickRandomSong, songYear } from '../services/songService.js';
import { markSongUsed, resetRound, resetSeason, state } from '../state/gameState.js';
import { server, apiKey, musicSource } from '../config.js';
import { tryPlayAudio } from '../utils/audio.js';

// --- Lokaler Multiplayer Zustände ---
let mpPlayers = []; // {name, score}
let mpCurrentIndex = 0;
let mpRound = 1;
let mpMaxRounds = 0;
let mpActive = false;
let mpCurrentSong = null;
let mpInsertMode = false; // steuert Jahr-Einfügephase

export function startMultiplayerGame() {
  const namesRaw = document.getElementById('mpPlayerNames')?.value || '';
  const roundsRaw = document.getElementById('mpRounds')?.value || '10';
  const names = namesRaw.split(',').map(n => n.trim()).filter(n => n);
  if (names.length < 2) { showMpFeedback('Mindestens zwei Spielernamen angeben.'); return; }
  mpPlayers = names.map(n => ({ name: n, score: 0, songs: [] }));
  mpMaxRounds = parseInt(roundsRaw, 10) || 10;
  mpRound = 1; mpCurrentIndex = 0; mpActive = true; mpInsertMode = false; resetRound();
  renderMpPlayerPanel();
  showMpFeedback(`Multiplayer gestartet: ${mpPlayers.length} Spieler, ${mpMaxRounds} Runden.`);
  nextTurn();
}

function renderMpPlayerPanel() {
  const panel = document.getElementById('mpPanel');
  if (!panel) return;
  panel.innerHTML = mpPlayers.map((p,i) => `<div class="mpPlayer${i===mpCurrentIndex?' active':''}"><strong>${p.name}</strong> — Punkte: ${p.score}</div>`).join('');
}

function showMpFeedback(msg) { const box = document.getElementById('mpFeedback'); if (box) box.textContent = msg; }

function nextTurn() {
  if (!mpActive) return;
  if (mpRound > mpMaxRounds) { endMultiplayer(); return; }
  const player = mpPlayers[mpCurrentIndex];
  showMpFeedback(`Runde ${mpRound} — ${player.name} ist am Zug.`);
  loadRandomSongForMultiplayer();
}

async function loadRandomSongForMultiplayer() {
  const genreFilter = document.getElementById('genre')?.value.trim().toLowerCase() || '';
  const minYear = parseInt(document.getElementById('minYear')?.value) || null;
  const maxYear = parseInt(document.getElementById('maxYear')?.value) || null;
  let attempts = 0; let song = null;
  while (!song && attempts < 20) {
    const items = await fetchRandomMusic(50, { genre: genreFilter, minYear, maxYear });
    const filtered = filterSongs(items, { genreFilter, minYear, maxYear, requireYear: true }, state.playedSongs, state.sessionSongs);
    if (filtered.length) song = pickRandomSong(filtered);
    attempts++;
  }
  if (!song) { showMpFeedback('Kein Song gefunden. Erneuter Versuch...'); return; }
  markSongUsed(song.Id);
  mpCurrentSong = song;
  renderMpSongCard(song);
}

async function renderMpSongCard(song) {
  const area = document.getElementById('mpSongArea');
  if (!area) return;
  
  // Base UI
  area.innerHTML = `<div class=mpSongCard>
    <div class=mpTitle>${song.Name}</div>
    <div class=mpArtist>${song.AlbumArtists?.[0]?.Name || song.Artists?.[0] || 'Unbekannt'}</div>
    <div class=mpYear hidden>${songYear(song) || '?'}</div>
    <div id="mpAudioContainer" class=mpAudio><span>Lädt...</span></div>
    <button id=mpRevealYearBtn>Jahr anzeigen</button>
    <button id=mpInsertSongBtn disabled>Song einsortieren</button>
  </div>`;
  
  // Audio Setup: Spotify Premium > Jellyfin/Preview
  if (musicSource === 'spotify' && song.SpotifyUri) {
    try {
      const playerModule = await import('../services/spotifyPlayer.js');
      if (playerModule.hasSpotifyPremium()) {
        console.log('🎵 Multiplayer Premium: Vollständiger Track');
        await playerModule.playTrack(song.SpotifyUri);
        const mpAudioContainer = document.getElementById('mpAudioContainer');
        if (mpAudioContainer) {
          mpAudioContainer.innerHTML = `<span style="color:#1DB954">🎵 Spotify Premium Playback</span>`;
        }
      } else {
        insertMpAudio(song.PreviewUrl || '');
      }
    } catch (e) {
      console.warn('⚠️ Spotify Player failed, using preview:', e);
      insertMpAudio(song.PreviewUrl || '');
    }
  } else {
    const audioSrc = `${server}/Items/${song.Id}/Download?api_key=${apiKey}`;
    insertMpAudio(audioSrc);
  }
  
  const revealBtn = document.getElementById('mpRevealYearBtn');
  const insertBtn = document.getElementById('mpInsertSongBtn');
  revealBtn?.addEventListener('click', () => {
    area.querySelector('.mpYear')?.removeAttribute('hidden');
    mpInsertMode = true; insertBtn.disabled = false; revealBtn.disabled = true;
    showMpFeedback('Wähle die korrekte Position in der Zeitleiste.');
  });
  insertBtn?.addEventListener('click', () => beginYearInsertion());
}

function insertMpAudio(src) {
  const mpAudioContainer = document.getElementById('mpAudioContainer');
  if (!mpAudioContainer) return;
  if (!src) {
    mpAudioContainer.innerHTML = `<em>Kein Audio verfügbar</em>`;
    return;
  }
  mpAudioContainer.innerHTML = `<audio id=mpPlayer controls src="${src}"></audio>`;
  const playerEl = document.getElementById('mpPlayer');
  if (playerEl && state.userInteracted) tryPlayAudio(playerEl);
  if (playerEl) playerEl.addEventListener('play', () => { state.userInteracted = true; });
}

function beginYearInsertion() {
  // Platzhalter: Hier würde die Logik stehen das Lied in eine Chronologie einzufügen
  const year = songYear(mpCurrentSong);
  const correct = true; // TODO: berechne ob Einfügeposition korrekt
  applyMpScoring(correct, year);
}

function applyMpScoring(correct, year) {
  const player = mpPlayers[mpCurrentIndex];
  if (!player) return;
  if (correct) { player.score += 3; showMpFeedback(`Richtig! +3 Punkte (${year})`); }
  else { player.score += 0; showMpFeedback(`Falsch! Jahr war ${year}`); }
  player.songs.push({ id: mpCurrentSong.Id, year });
  advanceTurn();
}

function advanceTurn() {
  mpCurrentIndex++;
  if (mpCurrentIndex >= mpPlayers.length) { mpCurrentIndex = 0; mpRound++; }
  renderMpPlayerPanel();
  nextTurn();
}

function endMultiplayer() {
  mpActive = false;
  const winner = mpPlayers.slice().sort((a,b)=>b.score-a.score)[0];
  showMpFeedback(`Spiel Ende! Gewinner: ${winner.name} mit ${winner.score} Punkten.`);
  const area = document.getElementById('mpSongArea'); if (area) area.innerHTML='';
}

export function stopMultiplayerGame() { mpActive=false; showMpFeedback('Multiplayer gestoppt.'); }
export function isMultiplayerActive() { return mpActive; }
