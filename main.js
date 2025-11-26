// main.js: Modularer Bootstrap. Greift vorerst auf Legacy globals aus app.js zu.
// Schrittweise werden Funktionen aus app.js hier durch Imports ersetzt.

import { loadSettings } from './src/config.js';
import { state } from './src/state/gameState.js';
import { getCurrentLanguage, setLanguage, getAvailableLanguages } from './src/i18n/i18n.js';
// Modul-Imports für neue Spielmodi
import { getRandomSong as chooseGetRandomSong } from './src/modes/chooseMode.js';
import { startGame, submitGuess, nextQuestion, stopGame } from './src/modes/guessGame.js';
import { startMultiplayerGame, stopMultiplayerGame } from './src/modes/multiplayerController.js';

loadSettings();

function bindEvents() {
  // Language Switcher
  const languageSelect = document.getElementById('settingLanguage');
  if (languageSelect) {
    // Set current language
    languageSelect.value = getCurrentLanguage();
    
    languageSelect.addEventListener('change', (e) => {
      setLanguage(e.target.value);
    });
  }

  // Choose Mode
  const selectSongBtn = document.getElementById('selectSongBtn');
  if (selectSongBtn) selectSongBtn.addEventListener('click', chooseGetRandomSong);
  const startChooseBtn = document.getElementById('startChooseBtn');
  if (startChooseBtn) startChooseBtn.addEventListener('click', () => {
    // Nur UI zeigen, kein Auto-Play
    if (typeof showChooseSongUI === 'function') showChooseSongUI();
  });
  const modeChooseSongBtn = document.getElementById('modeChooseSongBtn');
  if (modeChooseSongBtn) {
    modeChooseSongBtn.addEventListener('click', () => {
      // Nur UI zeigen, kein Auto-Play
      if (typeof showChooseSongUI === 'function') showChooseSongUI();
    });
  }

  // Guess Mode
  const startGuessBtn = document.getElementById('startGuessBtn');
  const guessStartPanel = document.getElementById('guessStartPanel');
  const guessPanelStartBtn = document.getElementById('guessPanelStartBtn');
  const guessPanelCancelBtn = document.getElementById('guessPanelCancelBtn');
  const guessPanelTimerEnabled = document.getElementById('guessPanelTimerEnabled');
  const guessPanelTimerDuration = document.getElementById('guessPanelTimerDuration');
  
  if (startGuessBtn && guessStartPanel) {
    startGuessBtn.addEventListener('click', () => {
      guessStartPanel.classList.remove('hidden');
    });
  }
  
  if (guessPanelStartBtn && guessStartPanel) {
    guessPanelStartBtn.addEventListener('click', () => {
      guessStartPanel.classList.add('hidden');
      startGame();
    });
  }
  
  if (guessPanelCancelBtn && guessStartPanel) {
    guessPanelCancelBtn.addEventListener('click', () => {
      guessStartPanel.classList.add('hidden');
    });
  }
  
  if (guessPanelTimerEnabled && guessPanelTimerDuration) {
    guessPanelTimerEnabled.addEventListener('change', () => {
      guessPanelTimerDuration.disabled = !guessPanelTimerEnabled.checked;
    });
  }
  
  const submitGuessBtn = document.getElementById('submitGuessBtn');
  if (submitGuessBtn) submitGuessBtn.addEventListener('click', submitGuess);
  const nextQuestionBtn = document.getElementById('nextQuestionBtn');
  if (nextQuestionBtn) nextQuestionBtn.addEventListener('click', nextQuestion);
  const stopGameBtn = document.getElementById('stopGameBtn');
  if (stopGameBtn) stopGameBtn.addEventListener('click', stopGame);
  const modeGuessBtn = document.getElementById('modeGuessBtn');
  if (modeGuessBtn && guessStartPanel) {
    modeGuessBtn.addEventListener('click', () => {
      guessStartPanel.classList.remove('hidden');
    });
  }

  // Multiplayer Mode
  const startMultiplayerPrimaryBtn = document.getElementById('startMultiplayerPrimaryBtn');
  if (startMultiplayerPrimaryBtn) startMultiplayerPrimaryBtn.addEventListener('click', startMultiplayerGame);
  const modeMultiplayerBtn = document.getElementById('modeMultiplayerBtn');
  if (modeMultiplayerBtn) modeMultiplayerBtn.addEventListener('click', startMultiplayerGame);
  // (Stop-Button könnte später ergänzt werden)
}

document.addEventListener('DOMContentLoaded', bindEvents);

// Roadmap Kommentare:
// 1. chooseMode.js: Extraktion von getRandomSong + updateCounter.
// 2. guessGame.js: Timer, Scoring, presentQuestionForSong, startGame, nextQuestion.
// 3. multiplayerController.js: Komplettes Multiplayer Handling.
// 4. Danach: Entfernen globaler Proxy-Properties und direkte Nutzung von state.
