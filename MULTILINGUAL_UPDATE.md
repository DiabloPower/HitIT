# HitIT - Mehrsprachigkeits-Update 🌍

## Was wurde implementiert?

Das gesamte Projekt ist jetzt vollständig mehrsprachig mit einem einfach erweiterbaren i18n-System!

### ✅ Implementierte Funktionen

1. **Core i18n System** (`src/i18n/i18n.js`)
   - Automatische Spracherkennung (Browser-Standard)
   - LocalStorage für Präferenzen
   - String-Interpolation für dynamische Werte
   - Event-System für Sprachwechsel
   - Globale `t()` Funktion für einfache Übersetzungen

2. **Zwei komplette Sprachpakete**
   - 🇬🇧 **Englisch** (Standard)
   - 🇩🇪 **Deutsch** (vollständig übersetzt)

3. **Internationalisierte Bereiche**
   - ✅ Start-Screen mit allen Modi-Beschreibungen
   - ✅ Multiplayer-Setup Panel
   - ✅ Guess-the-Year Setup Panel
   - ✅ Hamburger-Menü Navigation
   - ✅ Settings-Panel (inkl. neue Sprachauswahl!)
   - ✅ Zufallswiedergabe (Choose Mode)
   - ✅ Guess-the-Year Spielbereich
   - ✅ Multiplayer Timeline
   - ✅ Alle Buttons, Labels, Placeholders
   - ✅ Fehlermeldungen und Bestätigungen
   - ✅ Dynamische Inhalte (JavaScript)

4. **Developer-friendly**
   - Klare Ordnerstruktur
   - Dot-notation für Keys (`menu.settings`)
   - Automatische Warnung bei fehlenden Übersetzungen
   - Hot-swap fähig (keine Seiten-Reload nötig)

## Wie benutzt man es?

### Als Benutzer

1. Öffne die App
2. Klicke auf das Hamburger-Menü (☰)
3. Klicke auf "Settings"
4. Wähle deine Sprache aus dem **Language**-Dropdown
5. Fertig! Die gesamte UI wechselt sofort

Die Spracheinstellung wird im Browser gespeichert.

### Als Entwickler - Neue Sprache hinzufügen

**Beispiel: Französisch hinzufügen**

#### 1. Locale-Datei erstellen

```bash
# Kopiere eine existierende Sprache als Basis
cp src/i18n/locales/en.js src/i18n/locales/fr.js
```

Dann übersetze alle Strings:

```javascript
// src/i18n/locales/fr.js
export default {
  title: 'Chanson aléatoire de Jellyfin',
  start: {
    welcome: 'Bienvenue chez HitIT',
    selectMode: 'Choisissez un mode de jeu pour commencer.',
    // ... etc
  },
  // ... alle anderen Bereiche
};
```

#### 2. In index.html registrieren

```html
<script type="module">
  import { initI18n } from './src/i18n/i18n.js';
  import en from './src/i18n/locales/en.js';
  import de from './src/i18n/locales/de.js';
  import fr from './src/i18n/locales/fr.js'; // NEU
  
  initI18n({ en, de, fr }); // NEU
</script>
```

#### 3. Dropdown-Option hinzufügen

```html
<select id="settingLanguage">
  <option value="en">English</option>
  <option value="de">Deutsch</option>
  <option value="fr">Français</option> <!-- NEU -->
</select>
```

Fertig! 🎉

## Technische Details

### Dateistruktur

```
src/
  i18n/
    i18n.js              # Core Engine
    locales/
      en.js              # English
      de.js              # Deutsch
      [your-lang].js     # Weitere Sprachen
```

### Verwendung in Code

**HTML:**
```html
<!-- Text übersetzen -->
<h2 data-i18n="start.welcome">Welcome to HitIT</h2>

<!-- Attribute übersetzen -->
<input data-i18n-attr="placeholder" placeholder="e.g., Rock">
```

**JavaScript:**
```javascript
import { t } from './src/i18n/i18n.js';

// Einfach
alert(t('messages.error'));

// Mit Variablen
const msg = t('messages.playerWins', { name: 'Alice', size: 10 });
// → "Player Alice wins with a deck of 10 cards!"
```

### Key-Struktur

Alle Übersetzungsschlüssel folgen diesem Schema:

```
title              - Seiten-Titel
start.*            - Start-Bildschirm
menu.*             - Menü-Einträge
settings.*         - Einstellungen
choose.*           - Zufallswiedergabe
guess.*            - Guess-the-Year
multiplayer.*      - Multiplayer-Modus
common.*           - Gemeinsame UI (OK, Cancel, etc.)
messages.*         - Nachrichten & Benachrichtigungen
```

## Vorteile des Systems

✅ **Einfach erweiterbar**: Neue Sprache = eine Datei kopieren & übersetzen  
✅ **Kein Build-Prozess**: Direkt im Browser, kein Webpack/Vite nötig  
✅ **Wartbar**: Alle Texte zentral, nicht im Code verstreut  
✅ **Performant**: Übersetzungen werden einmal geladen, keine API-Calls  
✅ **Type-safe ready**: Dot-notation Keys sind IDE-freundlich  
✅ **Fallback**: Englisch wird angezeigt, wenn Key fehlt (+ Console-Warnung)

## Nächste Schritte (optional)

Mögliche Erweiterungen:
- 🇫🇷 Französisch
- 🇪🇸 Spanisch
- 🇮🇹 Italienisch
- 🇳🇱 Niederländisch
- 🇵🇹 Portugiesisch
- Datum/Zeit-Formatierung pro Sprache
- Zahlen-Formatierung (Dezimaltrennzeichen)
- Pluralisierungs-Regeln

## Migration der bestehenden Strings

Alle deutschen Hardcoded-Strings wurden ersetzt durch:
- HTML: `data-i18n` Attribute
- JS: `t()` Funktionsaufrufe

Der bestehende Code funktioniert weiterhin, zeigt aber jetzt die gewählte Sprache!

## Testing

1. Server starten: `python3 -m http.server 8000`
2. Browser öffnen: `http://localhost:8000`
3. Settings öffnen, Sprache wechseln
4. Durch alle Modi navigieren und UI prüfen

## Probleme?

Falls eine Übersetzung fehlt:
- Browser-Konsole zeigt: `Translation missing: de.some.key`
- Key wird als Fallback angezeigt
- Fehlenden Key zu allen Locale-Dateien hinzufügen

## Credits

Entwickelt mit ❤️ für HitIT  
System ist MIT-kompatibel und frei erweiterbar!

---

**Happy translating! 🎉**
