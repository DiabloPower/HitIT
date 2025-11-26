/**
 * Deutsche Übersetzungen für HitIT
 */

export default {
  // Seitentitel
  title: 'Zufälliger Jellyfin Song',
  
  // Startbildschirm
  start: {
    welcome: 'Willkommen bei HitIT',
    selectMode: 'Wähle einen Spielmodus, um zu beginnen.',
    singleplayer: 'Singleplayer',
    multiplayer: 'Multiplayer',
    startChoose: 'Zufallswiedergabe',
    startGuess: 'Guess-the-Year',
    startMultiplayer: 'Timeline starten',
    chooseModeDesc: 'Zufälliges Lied nach Genre/Zeitraum auswählen.',
    guessModeDesc: 'Errate das Erscheinungsjahr, du hast begrenzte Leben.',
    multiplayerDesc: 'Jeder Spieler erhält eine Startkarte. Danach wird ein Lied abgespielt, und der aktive Spieler muss entscheiden, ob es vor oder nach seiner Karte erschienen ist. Mit jeder Karte entstehen Zeiträume, die korrekt eingeordnet werden müssen. Wer zuerst sein Deck voll hat, gewinnt.'
  },
  
  // Multiplayer-Setup-Panel
  mpSetup: {
    title: 'Multiplayer Setup',
    playerCount: 'Spieleranzahl',
    targetDeckSize: 'Ziel-Deckgröße',
    genre: 'Genre (optional)',
    genrePlaceholder: 'z.B. Rock',
    minYear: 'Min Jahr',
    maxYear: 'Max Jahr',
    minYearPlaceholder: '1900',
    maxYearPlaceholder: 'heute',
    startGame: 'Spiel starten',
    cancel: 'Abbrechen'
  },
  
  // Guess-the-Year-Setup-Panel
  guessSetup: {
    title: 'Guess-the-Year Setup',
    timerEnabled: 'Timer aktivieren',
    timerDuration: 'Timer-Dauer (Sekunden)',
    lives: 'Leben',
    genre: 'Genre (optional)',
    genrePlaceholder: 'z.B. Rock',
    minYear: 'Min Jahr',
    maxYear: 'Max Jahr',
    minYearPlaceholder: '1900',
    maxYearPlaceholder: 'heute',
    startGame: 'Spiel starten',
    cancel: 'Abbrechen'
  },
  
  // Menü
  menu: {
    randomPlayback: 'Zufallswiedergabe',
    guessTheYear: 'Guess-the-Year',
    multiplayer: 'Multiplayer',
    resetRound: 'Reset Round',
    resetSeason: 'Reset Season',
    settings: 'Settings'
  },
  
  // Einstellungen
  settings: {
    title: 'Einstellungen',
    musicSource: 'Musikquelle',
    jellyfinServer: 'Jellyfin Server URL',
    libraryId: 'Library ID (ParentId)',
    apiKey: 'API Key',
    spotifyClientId: 'Spotify Client ID (öffentlich)',
    redirectUri: 'Redirect URI',
    spotifyNote: 'Hinweis: OAuth erfolgt per PKCE Flow. Keine Secrets hier speichern. Redirect URI muss in Spotify App Settings registriert sein.',
    connectSpotify: 'Mit Spotify verbinden',
    connectionStatus: 'Status',
    statusNotConnected: 'Nicht verbunden',
    statusConnected: 'Verbunden',
    dataNote: 'Daten werden lokal gespeichert. Spotify-Unterstützung (Beta) aktiviert.',
    lastfmApiKey: 'Last.fm API Key (optional)',
    lastfmNote: 'Optional: Für Metadaten, Cover und Songtexte.',
    lastfmCreate: 'API Key hier erstellen',
    lastfmNoLogin: 'Kein Login nötig.',
    language: 'Sprache',
    save: 'Speichern',
    cancel: 'Abbrechen'
  },
  
  // Choose-Modus
  choose: {
    title: '🎶 Zufallswiedergabe',
    filterToggle: 'Filter anzeigen/verstecken',
    genre: 'Genre',
    genrePlaceholder: 'z.B. Game',
    minYear: 'Min. Jahr',
    minYearPlaceholder: '1996',
    maxYear: 'Max. Jahr',
    maxYearPlaceholder: '1999',
    artist: 'Artist',
    artistPlaceholder: 'z.B. Depeche Mode',
    selectSong: 'Song abspielen',
    songsPlayed: 'Songs gespielt'
  },
  
  // Guess-Modus
  guess: {
    title: '🧠 Guess-the-Year',
    points: 'Punkte',
    lives: 'Leben',
    time: 'Zeit',
    guessYear: 'Jahreszahl raten',
    yearPlaceholder: 'z.B. 1998',
    submit: 'Antwort prüfen',
    next: 'Nächstes',
    stopGame: 'Spiel beenden',
    songsPlayed: 'Songs gespielt'
  },
  
  // Multiplayer
  multiplayer: {
    activePlayer: 'Aktiver Spieler',
    deck: 'Deck',
    drawnCard: 'Gezogene Karte',
    noCards: '(keine Karten)',
    noCard: '(keine Karte)',
    leaderboard: 'Leaderboard',
    clear: 'Clear',
    empty: '(leer)'
  },
  
  // Allgemeine UI-Elemente
  common: {
    loading: 'Laden...',
    error: 'Fehler',
    success: 'Erfolg',
    confirm: 'Bestätigen',
    yes: 'Ja',
    no: 'Nein',
    ok: 'OK',
    close: 'Schließen',
    show: 'Anzeigen',
    hide: 'Verstecken',
    title: 'Titel',
    artist: 'Artist',
    album: 'Album',
    year: 'Jahr',
    genre: 'Genre',
    tags: 'Tags',
    lyrics: 'Songtext',
    stream: 'Stream',
    pause: 'Pause',
    play: 'Play',
    playerColor: 'Spielerfarbe',
    loadingPlayback: 'Lädt Playback...',
    spotifyPremium: 'Spotify Premium',
    unknown: 'Unbekannt',
    hidden: 'versteckt'
  },
  
  // Nachrichten
  messages: {
    noSongFound: 'Kein passender Song gefunden. Versuche Filter anzupassen.',
    confirmResetRound: 'Runde zurücksetzen? Alle gespielten Songs dieser Runde werden gelöscht.',
    confirmResetSeason: 'Saison zurücksetzen? Alle gespielten Songs dieser Saison werden gelöscht.',
    roundReset: 'Runde wurde zurückgesetzt.',
    seasonReset: 'Saison wurde zurückgesetzt.',
    settingsSaved: 'Einstellungen gespeichert!',
    settingsCancelled: 'Einstellungen abgebrochen.',
    gameOver: 'Spiel vorbei!',
    finalScore: 'Endpunktzahl',
    correctAnswer: 'Richtig! ✓',
    wrongAnswer: 'Falsch. Das korrekte Jahr war',
    yearDiff: 'Du lagst um',
    years: 'Jahre',
    year: 'Jahr',
    connectToMusicSource: 'Bitte zuerst in den Einstellungen eine Musikquelle verbinden.',
    playerWins: 'Spieler {name} gewinnt mit einem Deck von {size} Karten!',
    deckSize: 'Deckgröße',
    invalidYear: 'Bitte eine gültige Jahreszahl eingeben.',
    loadingTrack: 'Lade Track...',
    noTracksFound: 'Keine Tracks mit diesen Filtern gefunden.',
    spotifyPremiumRequired: 'Spotify Premium benötigt für Deck-Playback',
    spotifyError: 'Spotify Fehler: {error}',
    noSpotifyUri: 'Kein Spotify URI verfügbar',
    playbackError: 'Fehler beim Abspielen: {error}',
    noCardFound: 'Keine Karte gefunden.',
    correctPlacement: '{name} — richtig! Deckgröße: {current}/{target}',
    playerWon: '{name} hat gewonnen! (Deckgröße {size}/{target})',
    wrongPlacement: '{name} — falsch. Karte wird abgelegt.',
    gameStarted: 'Spiel gestartet — viel Erfolg!',
    gameStopped: 'Spiel beendet.',
    gameOverScore: 'Spiel vorbei — Gesamtpunkte: {score}',
    newRoundStarted: 'Neue Runde gestartet – wähle einen Song!',
    newRoundStartedGuess: 'Neue Runde gestartet!',
    enterYear: 'Bitte eine Jahreszahl eingeben.',
    noYearAvailable: 'Kein Jahr verfügbar. Genaues Ergebnis unbekannt.',
    correctYearPoints: 'Richtiges Jahr: {year}. Du erhältst {points} Punkte.',
    timeUp: 'Zeit abgelaufen!',
    playerLabel: 'Spieler {number}',
    score: 'Punkte',
    lives: 'Leben',
    upToYearIncl: 'bis {year} (inkl.)',
    upToToday: 'bis heute',
    fromYearToToday: '{year} bis heute',
    load: 'Laden',
    delete: 'Löschen',
    save: 'Speichern',
    newRosterName: 'Neuer Roster Name',
    rosterLoaded: 'Roster geladen',
    rosterDeleted: 'Roster gelöscht',
    rosterSaved: 'Roster gespeichert',
    nameMissing: 'Name fehlt',
    noRosters: '(keine)',
    deckSizeLabel: 'Deckgröße',
    noPreviewAvailable: 'Kein Preview verfügbar (Premium erforderlich)',
    spotifyPlayerError: 'Spotify Player Fehler',
    noAudioAvailable: 'Kein Audio verfügbar',
    roundReset: 'Runde zurückgesetzt',
    seasonReset: 'Season zurückgesetzt',
    spotifyConfigured: 'Spotify konfiguriert',
    spotifyIncomplete: 'Spotify unvollständig',
    confirmNewRound: 'Runde zurücksetzen?\n\nDadurch werden alle Songs dieser aktuellen Runde zurückgesetzt (der "Songs gespielt"-Zähler wird auf 0 gesetzt). Bereits in der Season markierte Songs bleiben erhalten. Dieser Vorgang kann nicht rückgängig gemacht werden.\n\nMöchtest du fortfahren?',
    confirmNewSeason: 'Neue Season starten und alle Session-Daten löschen?\n\nDies entfernt alle bisher in dieser Season gespeicherten Songs und setzt sowohl den Runden- als auch den Season-Zähler zurück (gespeicherte Session-Daten in diesem Browser werden gelöscht). Dieser Vorgang kann nicht rückgängig gemacht werden.\n\nMöchtest du fortfahren?',
    timer: 'Zeit',
    timerDisabled: 'Timer: deaktiviert',
    scoreLabel: 'PUNKTE',
    livesLabel: 'LEBEN',
    timeLabel: 'ZEIT',
    spotifyTokenExpired: '🔒 Spotify Token abgelaufen! Bitte in Settings neu verbinden.',
    spotifyConnectionError: '⚠️ Spotify Fehler: {message}'
  }
};
