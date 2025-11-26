/**
 * Template for new language translations
 * 
 * Instructions:
 * 1. Copy this file to src/i18n/locales/[language-code].js
 * 2. Replace all English text with your translations
 * 3. Keep the structure and keys unchanged
 * 4. Test with: import yourLang from './locales/[language-code].js'
 */

export default {
  // Page title
  title: 'Random Jellyfin Song',
  
  // Start screen
  start: {
    welcome: 'Welcome to HitIT',
    selectMode: 'Choose a game mode to begin.',
    singleplayer: 'Singleplayer',
    multiplayer: 'Multiplayer',
    startChoose: 'Random Playback',
    startGuess: 'Guess-the-Year',
    startMultiplayer: 'Start Timeline',
    chooseModeDesc: 'Select a random song by genre/time period.',
    guessModeDesc: 'Guess the release year, you have limited lives.',
    multiplayerDesc: 'Each player receives a starting card. Then a song is played, and the active player must decide whether it was released before or after their card. With each card, time periods are created that must be correctly placed. The first to fill their deck wins.'
  },
  
  // Multiplayer setup panel
  mpSetup: {
    title: 'Multiplayer Setup',
    playerCount: 'Number of players',
    targetDeckSize: 'Target deck size',
    genre: 'Genre (optional)',
    genrePlaceholder: 'e.g., Rock',
    minYear: 'Min year',
    maxYear: 'Max year',
    minYearPlaceholder: '1900',
    maxYearPlaceholder: 'today',
    startGame: 'Start game',
    cancel: 'Cancel'
  },
  
  // Guess-the-Year setup panel
  guessSetup: {
    title: 'Guess-the-Year Setup',
    timerEnabled: 'Enable timer',
    timerDuration: 'Timer duration (seconds)',
    lives: 'Lives',
    genre: 'Genre (optional)',
    genrePlaceholder: 'e.g., Rock',
    minYear: 'Min year',
    maxYear: 'Max year',
    minYearPlaceholder: '1900',
    maxYearPlaceholder: 'today',
    startGame: 'Start game',
    cancel: 'Cancel'
  },
  
  // Menu
  menu: {
    randomPlayback: 'Random Playback',
    guessTheYear: 'Guess-the-Year',
    multiplayer: 'Multiplayer',
    resetRound: 'Reset Round',
    resetSeason: 'Reset Season',
    settings: 'Settings'
  },
  
  // Settings
  settings: {
    title: 'Settings',
    musicSource: 'Music source',
    jellyfinServer: 'Jellyfin Server URL',
    libraryId: 'Library ID (ParentId)',
    apiKey: 'API Key',
    spotifyClientId: 'Spotify Client ID (public)',
    redirectUri: 'Redirect URI',
    spotifyNote: 'Note: OAuth via PKCE flow. Do not store secrets here. Redirect URI must be registered in Spotify App Settings.',
    connectSpotify: 'Connect with Spotify',
    connectionStatus: 'Status',
    statusNotConnected: 'Not connected',
    statusConnected: 'Connected',
    dataNote: 'Data is stored locally. Spotify support (Beta) enabled.',
    lastfmApiKey: 'Last.fm API Key (optional)',
    lastfmNote: 'Optional: For metadata, covers, and lyrics.',
    lastfmCreate: 'Create API key here',
    lastfmNoLogin: 'No login required.',
    language: 'Language',
    save: 'Save',
    cancel: 'Cancel'
  },
  
  // Choose mode
  choose: {
    title: '🎶 Random Playback',
    filterToggle: 'Show/Hide Filters',
    genre: 'Genre',
    genrePlaceholder: 'e.g., Game',
    minYear: 'Min year',
    minYearPlaceholder: '1996',
    maxYear: 'Max year',
    maxYearPlaceholder: '1999',
    artist: 'Artist',
    artistPlaceholder: 'e.g., Depeche Mode',
    selectSong: 'Play song',
    songsPlayed: 'Songs played'
  },
  
  // Guess mode
  guess: {
    title: '🧠 Guess-the-Year',
    points: 'Points',
    lives: 'Lives',
    time: 'Time',
    guessYear: 'Guess the year',
    yearPlaceholder: 'e.g., 1998',
    submit: 'Check answer',
    next: 'Next',
    stopGame: 'End game',
    songsPlayed: 'Songs played'
  },
  
  // Multiplayer
  multiplayer: {
    activePlayer: 'Active player',
    deck: 'Deck',
    drawnCard: 'Drawn card',
    noCards: '(no cards)',
    noCard: '(no card)',
    leaderboard: 'Leaderboard',
    clear: 'Clear',
    empty: '(empty)'
  },
  
  // Common UI elements
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    close: 'Close',
    show: 'Show',
    hide: 'Hide',
    title: 'Title',
    artist: 'Artist',
    album: 'Album',
    year: 'Year',
    genre: 'Genre',
    tags: 'Tags',
    lyrics: 'Lyrics',
    stream: 'Stream',
    pause: 'Pause',
    play: 'Play',
    playerColor: 'Player color',
    loadingPlayback: 'Loading playback...',
    spotifyPremium: 'Spotify Premium',
    unknown: 'Unknown',
    hidden: 'hidden'
  },
  
  // Messages
  messages: {
    noSongFound: 'No suitable song found. Try adjusting filters.',
    confirmResetRound: 'Reset round? This will clear all songs played this round.',
    confirmResetSeason: 'Reset season? This will clear all songs played this season.',
    roundReset: 'Round has been reset.',
    seasonReset: 'Season has been reset.',
    settingsSaved: 'Settings saved!',
    settingsCancelled: 'Settings cancelled.',
    gameOver: 'Game over!',
    finalScore: 'Final score',
    correctAnswer: 'Correct! ✓',
    wrongAnswer: 'Wrong. The correct year was',
    yearDiff: 'You were off by',
    years: 'years',
    year: 'year',
    connectToMusicSource: 'Please connect to a music source in Settings first.',
    playerWins: 'Player {name} wins with a deck of {size} cards!',
    deckSize: 'Deck size',
    invalidYear: 'Please enter a valid year.',
    loadingTrack: 'Loading track...',
    noTracksFound: 'No tracks found with these filters.',
    spotifyPremiumRequired: 'Spotify Premium required for deck playback',
    spotifyError: 'Spotify error: {error}',
    noSpotifyUri: 'No Spotify URI available',
    playbackError: 'Playback error: {error}',
    noCardFound: 'No card found.',
    correctPlacement: '{name} — correct! Deck size: {current}/{target}',
    playerWon: '{name} has won! (Deck size {size}/{target})',
    wrongPlacement: '{name} — wrong. Card discarded.',
    gameStarted: 'Game started — good luck!',
    gameStopped: 'Game stopped.',
    gameOverScore: 'Game over — Total score: {score}',
    newRoundStarted: 'New round started — choose a song!',
    newRoundStartedGuess: 'New round started!',
    enterYear: 'Please enter a year.',
    noYearAvailable: 'No year available. Exact result unknown.',
    correctYearPoints: 'Correct year: {year}. You get {points} points.',
    timeUp: 'Time up!',
    playerLabel: 'Player {number}',
    score: 'Score',
    lives: 'Lives',
    upToYearIncl: 'up to {year} (incl.)',
    upToToday: 'up to today',
    fromYearToToday: '{year} to today',
    load: 'Load',
    delete: 'Delete',
    save: 'Save',
    newRosterName: 'New Roster Name',
    rosterLoaded: 'Roster loaded',
    rosterDeleted: 'Roster deleted',
    rosterSaved: 'Roster saved',
    nameMissing: 'Name missing',
    noRosters: '(none)',
    deckSizeLabel: 'Deck size',
    noPreviewAvailable: 'No preview available (Premium required)',
    spotifyPlayerError: 'Spotify Player Error',
    noAudioAvailable: 'No audio available',
    roundReset: 'Round reset',
    seasonReset: 'Season reset',
    spotifyConfigured: 'Spotify configured',
    spotifyIncomplete: 'Spotify incomplete',
    confirmNewRound: 'Reset round?\n\nThis will reset all songs in this round (the "Songs played" counter will be reset to 0). Songs already marked in the season will be preserved. This action cannot be undone.\n\nDo you want to continue?',
    confirmNewSeason: 'Start new season and delete all session data?\n\nThis will remove all songs saved in this season so far and reset both the round and season counters (saved session data in this browser will be deleted). This action cannot be undone.\n\nDo you want to continue?',
    timer: 'Time',
    timerDisabled: 'Timer: disabled',
    scoreLabel: 'SCORE',
    livesLabel: 'LIVES',
    timeLabel: 'TIME'
  }
};
