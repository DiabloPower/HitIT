<!-- Copilot / AI agent instructions for HitIT -->
# HitIT — AI coding agent instructions

This file gives focused, actionable guidance for an AI coding agent editing or extending this small frontend project.

**Big Picture**
- **What it is:** A tiny static frontend (HTML/CSS/JS) that queries a Jellyfin media server to select and stream random audio items. Key files: `index.html`, `app.js`, `freestyler.css`.
- **Data flow:** `index.html` UI → `app.js` makes GET requests to the Jellyfin REST API (see `server`, `apiKey`, `libraryId` in `app.js`) → response `data.Items` is filtered client-side → selected song rendered and streamed via a `/Download` URL.

**Key integration points**
- `app.js` contains three sensitive, discoverable constants: `server`, `apiKey`, `libraryId`. Agents should NOT add new secrets into source control and should avoid printing the full `apiKey` in logs or examples. If a change requires configuration, prefer adding a README note and prompt the user to provide a secure mechanism (env file, build-time injection, or server-side proxy).
- Network call example (from `app.js`):
  - URL pattern: `${server}/Items?ParentId=${libraryId}&IncludeItemTypes=Audio&Recursive=true&SortBy=Random&Limit=50&Fields=Genres,ProductionYear,PremiereDate&api_key=${apiKey}`
  - The code requests batches (`Limit=50`) and performs client-side filtering (genre/year) and deduplication using `playedSongs`/`sessionSongs` Sets.

**Project-specific patterns & conventions**
- UI uses inline `onclick` attributes in `index.html` (e.g., `onclick="getRandomSong()"`) rather than `addEventListener`; follow existing pattern for small changes unless refactoring across files.
- State tracking: `playedSongs` tracks the current round, `sessionSongs` tracks the season. These are JS `Set` objects manipulated directly in `app.js` (e.g., `playedSongs.add(song.Id)`). If adding persistence, keep the same semantic separation (round vs season).
- Language: Visible UI strings and confirmations are in German — keep translations consistent when editing text content.
- Layout: the hamburger menu toggles an `.open` class on `#menu`; show/hide filters by toggling `.hidden` on `#filters`. Use these classes when adding UI behavior.

**Behavior to preserve**
- Avoid changing the random-selection strategy without good reason: the current logic fetches a randomized page and then applies client-side filters and de-duplication with a 20-attempt loop. If you change this, verify the UX (e.g., that duplicates across rounds/seasons remain excluded).

**Developer workflows (how to run/debug locally)**
- It's a static site — to allow `fetch` requests from a browser, serve via a local HTTP server rather than opening `index.html` from `file://`.
  - Example commands to run locally:
    - Python 3: ``python3 -m http.server 8000`` then open `http://localhost:8000/`.
    - Node (serve): ``npx serve .``
- Use browser DevTools Network tab to inspect the Jellyfin requests and the JSON returned. Check `data.Items` structure (fields: `Id`, `Name`, `Genres`, `ProductionYear`, `PremiereDate`, `AlbumArtists`).

**Safety & secrets**
- `app.js` currently contains a committed `apiKey` — treat this as sensitive. Do not hardcode additional keys. When proposing fixes that require keys, either:
  - ask the repo owner to rotate/remove the key, or
  - add a `.env.example` and documentation instructing where to place real secrets (do not commit actual secrets).

**When refactoring**
- Small changes: keep logic in `app.js` and preserve the plain-HTML approach (no frameworks introduced). Replace inline handlers only if you update both `index.html` and `app.js` consistently.
- Larger refactors: explicitly call out compatibility changes (e.g., moving to event listeners, modularizing JS) and run manual smoke checks: open the page, click `Song auswählen`, verify audio plays and `Songs gespielt` increments.

**Examples of useful, safe edits**
- Add an unobtrusive settings panel that reads `server`, `libraryId` from `localStorage` (do not store `apiKey` there). Show placeholders and a clear warning about not storing sensitive keys in client-side storage.
- Improve UX by replacing inline `onclick` with delegated listeners — update both `index.html` and `app.js` and test the main flows.

**Files to inspect for context**
- `index.html` — structure, inline handlers, German UI strings.
- `app.js` — core logic, the Jellyfin REST call, Sets for round/season, max-attempt loop.
- `freestyler.css` — layout conventions, `.hidden` and `.open` class usage, responsive breakpoints.

If anything in this guidance is unclear or you want the agent to follow stricter rules (e.g., automatically remove committed secrets), tell me which policy you prefer and I'll update the file.
