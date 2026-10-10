# THE QURAN — Premium Quran Reader

## Run locally
1. Extract the project folder.
2. Open the folder in VS Code.
3. Start a local static server (recommended):
   - VS Code: install/use Live Server, then right-click `index.html` → Open with Live Server.
   - Or Python: `python -m http.server 5500` in the project directory, then visit http://localhost:5500
4. Keep an internet connection available. Quran text, translations, and audio load from AlQuran Cloud API.

## Features
- Responsive emerald-and-gold Islamic-inspired UI
- Surah search and all 114 Surahs (loaded from API)
- Arabic Quran text with Urdu and English translation options
- Verse audio playback with selectable reciters
- Local bookmarks (saved in browser localStorage)
- Arabic font size controls
- Light/dark theme
- Copy verse, keyboard `/` to focus Surah search, mobile navigation

## Notes
- This is a frontend-only project; no backend is required.
- External Quran API availability and browser audio/clipboard permissions depend on your connection and browser.
- Translation editions used: `ur.jalandhry` and `en.sahih`. Please verify preferred translation editions before public release.

## Full-Surah audio update
- Use the new **Play full Surah** control above the verses to play every Ayah sequentially.
- Pause/resume from the same control.
- Previous/Next Ayah buttons let you navigate the playback queue.
- The queue uses the selected reciter and the API's per-Ayah audio files.
\n\nAudio behavior: the reader uses one fixed reciter (Mishary Rashid Alafasy). Individual Ayah play controls and the multi-reciter selector are removed. Use the single “Play Full Surah” button to play every Ayah sequentially; it automatically advances until the Surah ends.\n