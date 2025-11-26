// Abstraktion für Jellyfin API Requests
import { server, libraryId, apiKey } from '../config.js';

// Hilfsfunktion: UI Event dispatch
function dispatchAuthEvent(type, detail) {
  try { window.dispatchEvent(new CustomEvent(type, { detail })); } catch (_) {}
}

export async function validateJellyfinConfig() {
  if (!server || !apiKey) {
    return { ok: false, status: 0, message: 'Server oder API Key fehlt' };
  }
  const url = `${server}/System/Info?api_key=${apiKey}`;
  try {
    const resp = await fetch(url, { method: 'GET' });
    if (resp.status === 401 || resp.status === 403) {
      dispatchAuthEvent('jellyfin-auth-failed', { status: resp.status });
      return { ok: false, status: resp.status, message: 'Ungültiger API Key oder keine Berechtigung' };
    }
    if (!resp.ok) {
      return { ok: false, status: resp.status, message: `Fehler: HTTP ${resp.status}` };
    }
    const data = await resp.json();
    dispatchAuthEvent('jellyfin-auth-ok', { server, version: data?.Version });
    return { ok: true, status: resp.status, message: 'OK' };
  } catch (e) {
    return { ok: false, status: -1, message: 'Netzwerkfehler' };
  }
}

export async function fetchRandomItems(limit = 50) {
  const url = `${server}/Items?ParentId=${libraryId}&IncludeItemTypes=Audio&Recursive=true&SortBy=Random&Limit=${limit}&Fields=Genres,ProductionYear,PremiereDate&api_key=${apiKey}`;
  try {
    const resp = await fetch(url);
    if (resp.status === 401 || resp.status === 403) {
      dispatchAuthEvent('jellyfin-auth-failed', { status: resp.status });
      return [];
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return data.Items || [];
  } catch (e) {
    console.warn('Fehler beim Laden von Items:', e);
    return [];
  }
}
