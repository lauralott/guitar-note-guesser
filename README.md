# Guitar Note Guesser

Guitar Note Guesser is a small browser game for practicing note recognition on a full 24-fret guitar neck.

## Files

- `index.html` loads the app
- `styles.css` contains the responsive UI styling
- `script.js` contains the fretboard logic and game state

## Run it

The app is now fully static.

1. Open `index.html` directly in your browser, or
2. Serve the folder with any simple local server if you prefer

Example with Python:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Features

- Vertical 6-string fretboard
- Frets 0 through 24
- Standard tuning note calculation: E, A, D, G, B, E
- Random highlighted target note
- 12 note-name answer buttons
- Correct and incorrect counters
- Streak and best streak tracking
- Toggleable debug info
- Toggleable note labels
- Natural-notes-only practice mode
- String filtering
