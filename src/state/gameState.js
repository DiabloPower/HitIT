// Globale Spiel- und Sitzungszustände gekapselt.
// Bietet zentrale Reset-Operationen für Runde und Season.

export const state = {
  playedSongs: new Set(),      // Songs dieser Runde
  sessionSongs: new Set(),     // Songs gesamte Season
  roundCounter: 0,
  gameActive: false,
  currentSong: null,
  playerScore: 0,
  lives: 3,
  DEFAULT_LIVES: 3,
  timerDuration: 30,
  timerRemaining: 0,
  timerEnabled: false,          // Timer ein/aus (standardmäßig deaktiviert)
  timerInterval: null,
  multiplayerActive: false,
  mpPlayers: [],
  mpCurrentPlayerIndex: 0,
  mpTargetStreak: 10,
  mpDiscardPile: [],
  userInteracted: false,
};

export function resetRound() {
  state.playedSongs = new Set();
  state.roundCounter = 0;
}

export function resetSeason() {
  state.sessionSongs = new Set();
  resetRound();
}

export function markSongUsed(songId) {
  state.playedSongs.add(songId);
  state.sessionSongs.add(songId);
  state.roundCounter++;
}
