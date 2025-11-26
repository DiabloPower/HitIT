# HitIT - Multilingual Update 🌍

## What Was Implemented?

The entire project is now fully multilingual with an easily extensible i18n system!

### ✅ Features Implemented

1. **Core i18n System** (`src/i18n/i18n.js`)
   - Automatic language detection (browser default)
   - LocalStorage for preferences
   - String interpolation for dynamic values
   - Event system for language changes
   - Global `t()` function for easy translations

2. **Two Complete Language Packs**
   - 🇬🇧 **English** (default)
   - 🇩🇪 **German** (fully translated)

3. **Internationalized Areas**
   - ✅ Start screen with all mode descriptions
   - ✅ Multiplayer setup panel
   - ✅ Guess-the-Year setup panel
   - ✅ Hamburger menu navigation
   - ✅ Settings panel (including new language selector!)
   - ✅ Random playback (Choose mode)
   - ✅ Guess-the-Year game area
   - ✅ Multiplayer timeline
   - ✅ All buttons, labels, placeholders
   - ✅ Error messages and confirmations
   - ✅ Dynamic content (JavaScript)

4. **Developer-Friendly**
   - Clear folder structure
   - Dot-notation for keys (`menu.settings`)
   - Automatic warning for missing translations
   - Hot-swap capable (no page reload needed)

## How to Use It?

### As a User

1. Open the app
2. Click the hamburger menu (☰)
3. Click "Settings"
4. Select your language from the **Language** dropdown
5. Done! The entire UI switches instantly

Your language preference is saved in the browser.

### As a Developer - Adding a New Language

**Example: Adding French**

#### 1. Create Locale File

```bash
# Copy an existing language as a base
cp src/i18n/locales/en.js src/i18n/locales/fr.js
```

Then translate all strings:

```javascript
// src/i18n/locales/fr.js
export default {
  title: 'Chanson aléatoire de Jellyfin',
  start: {
    welcome: 'Bienvenue chez HitIT',
    selectMode: 'Choisissez un mode de jeu pour commencer.',
    // ... etc
  },
  // ... all other sections
};
```

#### 2. Register in index.html

```html
<script type="module">
  import { initI18n } from './src/i18n/i18n.js';
  import en from './src/i18n/locales/en.js';
  import de from './src/i18n/locales/de.js';
  import fr from './src/i18n/locales/fr.js'; // NEW
  
  initI18n({ en, de, fr }); // NEW
</script>
```

#### 3. Add Dropdown Option

```html
<select id="settingLanguage">
  <option value="en">English</option>
  <option value="de">Deutsch</option>
  <option value="fr">Français</option> <!-- NEW -->
</select>
```

Done! 🎉

## Technical Details

### File Structure

```
src/
  i18n/
    i18n.js              # Core Engine
    locales/
      en.js              # English
      de.js              # Deutsch
      [your-lang].js     # Additional languages
```

### Usage in Code

**HTML:**
```html
<!-- Translate text -->
<h2 data-i18n="start.welcome">Welcome to HitIT</h2>

<!-- Translate attributes -->
<input data-i18n-attr="placeholder" placeholder="e.g., Rock">
```

**JavaScript:**
```javascript
import { t } from './src/i18n/i18n.js';

// Simple
alert(t('messages.error'));

// With variables
const msg = t('messages.playerWins', { name: 'Alice', size: 10 });
// → "Player Alice wins with a deck of 10 cards!"
```

### Key Structure

All translation keys follow this schema:

```
title              - Page title
start.*            - Start screen
menu.*             - Menu entries
settings.*         - Settings
choose.*           - Random playback
guess.*            - Guess-the-Year
multiplayer.*      - Multiplayer mode
common.*           - Common UI (OK, Cancel, etc.)
messages.*         - Messages & notifications
```

## System Benefits

✅ **Easily extensible**: New language = copy one file & translate  
✅ **No build process**: Works directly in browser, no Webpack/Vite needed  
✅ **Maintainable**: All text centralized, not scattered in code  
✅ **Performant**: Translations loaded once, no API calls  
✅ **Type-safe ready**: Dot-notation keys are IDE-friendly  
✅ **Fallback**: English shown if key missing (+ console warning)

## Next Steps (Optional)

Possible extensions:
- 🇫🇷 French
- 🇪🇸 Spanish
- 🇮🇹 Italian
- 🇳🇱 Dutch
- 🇵🇹 Portuguese
- Date/time formatting per language
- Number formatting (decimal separators)
- Pluralization rules

## Migration of Existing Strings

All hardcoded German strings were replaced with:
- HTML: `data-i18n` attributes
- JS: `t()` function calls

The existing code still works but now shows the selected language!

## Testing

1. Start server: `python3 -m http.server 8000`
2. Open browser: `http://localhost:8000`
3. Open Settings, switch language
4. Navigate through all modes and check UI

## Problems?

If a translation is missing:
- Browser console shows: `Translation missing: de.some.key`
- Key is displayed as fallback
- Add missing key to all locale files

## Credits

Built with ❤️ for HitIT  
System is MIT-compatible and freely extensible!

---

**Happy translating! 🎉**
