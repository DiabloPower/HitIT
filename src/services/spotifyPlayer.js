// spotifyPlayer.js – Spotify Web Playback SDK Integration (Premium only)
import { getAccessToken } from './spotifyClient.js';

let player = null;
let deviceId = null;
let isPremium = false;

/**
 * Initialisiert Spotify Web Playback SDK
 * Wird aufgerufen nachdem User authentifiziert ist
 */
export function initSpotifyPlayer() {
  // SDK wird asynchron geladen via <script> in index.html
  // Das SDK ruft window.onSpotifyWebPlaybackSDKReady auf
  
  const setupPlayer = async () => {
    const token = await getAccessToken();
    if (!token) {
      console.warn('⚠️ Kein Spotify Token – Player kann nicht initialisiert werden');
      return;
    }

    if (typeof Spotify === 'undefined') {
      console.warn('⚠️ Spotify SDK noch nicht geladen, warte...');
      setTimeout(setupPlayer, 500);
      return;
    }

    // Keine Konsolen-Filterung; Warnung stammt aus Browser/EME und ist harmlos

    player = new Spotify.Player({
      name: 'HitIT Web Player',
      getOAuthToken: cb => { cb(token); },
      volume: 0.8
    });

    // Fehlerbehandlung
    player.addListener('initialization_error', ({ message }) => {
      console.error('❌ Player Initialization Error:', message);
    });
    
    player.addListener('authentication_error', ({ message }) => {
      console.error('❌ Player Authentication Error:', message);
      isPremium = false;
    });
    
    player.addListener('account_error', ({ message }) => {
      console.error('❌ Account Error (kein Premium?):', message);
      isPremium = false;
      alert('Spotify Premium benötigt für vollständige Wiedergabe!');
    });
    
    player.addListener('playback_error', ({ message }) => {
      console.error('❌ Playback Error:', message);
    });

    // Player bereit
    player.addListener('ready', ({ device_id }) => {
      console.log('✅ Spotify Player bereit! Device ID:', device_id);
      deviceId = device_id;
      isPremium = true;
      
      // Event für UI-Update
      window.dispatchEvent(new CustomEvent('spotify-player-ready', { 
        detail: { deviceId: device_id } 
      }));
    });

    player.addListener('not_ready', ({ device_id }) => {
      console.warn('⚠️ Device ID offline:', device_id);
    });

    // Player-Status Updates
    player.addListener('player_state_changed', (state) => {
      if (!state) {
        console.log('🟡 player_state_changed: state is NULL');
        return;
      }
      const currentTrack = state.track_window?.current_track;
      const position = state.position;
      const duration = state.duration;
      const paused = state.paused;
      
      console.log(`🟢 player_state_changed: pos=${position}ms, dur=${duration}ms, paused=${paused}, track=${currentTrack?.name}`);
      
      // Track-Ende Detection: 
      // 1. SDK gibt position=0 wenn Track zu Ende
      // 2. previous_tracks[0] existiert (bedeutet wir haben gerade einen Track beendet)
      // 3. paused kann true ODER false sein (Spotify pausiert oft automatisch am Ende)
      const prevTrack = state.track_window?.previous_tracks?.[0];
      
      // Zusätzliche Bedingung: Nahe am Ende (letzte 2 Sekunden) ODER position=0 mit previous track
      const nearEnd = duration > 0 && (duration - position) <= 2000;
      const trackJustEnded = position === 0 && prevTrack;
      
      if ((nearEnd || trackJustEnded) && prevTrack) {
        console.log('🎵 Track-Ende erkannt via player_state_changed');
        console.log('   🔹 Previous Track:', prevTrack.name);
        console.log('   🔹 Current Track:', currentTrack?.name);
        console.log('   🔹 Reason:', trackJustEnded ? 'position=0 + previous track' : `near end (${duration - position}ms remaining)`);
        
        // Nur einmal feuern mit Debounce
        if (!window.__spotifyTrackEndFired) {
          window.__spotifyTrackEndFired = true;
          window.dispatchEvent(new CustomEvent('spotify-track-ended'));
          // Reset nach 2 Sekunden
          setTimeout(() => { window.__spotifyTrackEndFired = false; }, 2000);
        }
      }
      
      // Dispatch generic state event
      window.dispatchEvent(new CustomEvent('spotify-player-state', {
        detail: { track: currentTrack, position, duration, paused }
      }));
    });

    // Player verbinden
    player.connect().then(success => {
      if (success) {
        console.log('✅ Player erfolgreich verbunden');
      }
    });
  };
  
  // SDK bereits geladen? Sofort starten : auf Callback warten
  if (typeof Spotify !== 'undefined') {
    console.log('✅ Spotify SDK bereits geladen');
    setupPlayer();
  } else {
    console.log('⏳ Warte auf Spotify SDK...');
    window.onSpotifyWebPlaybackSDKReady = setupPlayer;
  }
}

/**
 * Spielt einen Track ab (Premium only)
 * @param {string} trackUri - Spotify Track URI (z.B. "spotify:track:5R1o62...")
 */
export async function playTrack(trackUri) {
  if (!deviceId || !isPremium) {
    console.warn('⚠️ Player nicht bereit oder kein Premium');
    return false;
  }

  const token = await getAccessToken();
  if (!token) {
    console.error('❌ Kein Access Token');
    return false;
  }

  try {
    const resp = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: [trackUri]
      })
    });

    if (!resp.ok) {
      console.error('❌ Play-Request fehlgeschlagen:', resp.status, resp.statusText);
      return false;
    }

    console.log('▶️ Spiele Track:', trackUri);
    return true;
  } catch (e) {
    console.error('❌ playTrack Fehler:', e);
    return false;
  }
}

/**
 * Pausiert die Wiedergabe
 */
export async function pausePlayback() {
  if (!player) return;
  await player.pause();
}

/**
 * Fortsetzt die Wiedergabe
 */
export async function resumePlayback() {
  if (!player) return;
  await player.resume();
}

/**
 * Stoppt die Wiedergabe
 */
export async function stopPlayback() {
  if (!player) return;
  await player.pause();
}

/**
 * Gibt Device ID zurück (wird für API-Calls benötigt)
 */
export function getDeviceId() {
  return deviceId;
}

/**
 * Gibt aktuellen Player-State zurück
 */
export async function getCurrentState() {
  if (!player) return null;
  return await player.getCurrentState();
}

/**
 * Prüft ob User Premium hat
 */
export function hasSpotifyPremium() {
  return isPremium;
}

/**
 * Hilfsfunktion: Startet Progress-Bar Update für einen Button
 * @param {string} buttonId - ID des Play/Pause Buttons
 * @returns {number} - Interval ID zum Stoppen
 */
export function startProgressTracking(buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) {
    console.warn(`⚠️ startProgressTracking: Button #${buttonId} nicht gefunden`);
    return null;
  }
  
  const intervalId = setInterval(async () => {
    try {
      const state = await getCurrentState();
      if (!state) return;
      
      const progress = (state.position / state.duration) * 100;
      const btnEl = document.getElementById(buttonId); // Re-query in case DOM changed
      if (btnEl) {
        btnEl.style.background = `linear-gradient(90deg, #1DB954 0%, #1DB954 ${progress}%, #2c2c2c ${progress}%, #161616 100%)`;
      }
    } catch (err) {
      console.warn('⚠️ Progress tracking update failed:', err);
    }
  }, 500); // Update alle 500ms
  
  return intervalId;
}

/**
 * Cleanup beim Beenden
 */
export function disconnectPlayer() {
  if (player) {
    player.disconnect();
    player = null;
    deviceId = null;
    isPremium = false;
  }
}


