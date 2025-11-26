// Audio-Helferfunktionen
export function tryPlayAudio(element) {
  if (!element) return;
  const p = element.play();
  if (p && typeof p.then === 'function') {
    p.catch(() => {
      // Autoplay blockiert – Nutzer kann manuell abspielen
    });
  }
}
