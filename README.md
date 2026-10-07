# Fancy Five

A food-themed daily word game created for the Specialty Food Association.

Fancy Five is inspired by Wordle and designed to provide Winter FancyFaire and Summer Fancy Food Show attendees with a fun, casual engagement experience that can be embedded within an event app using a webview or iframe.

---

## Current Features

- Daily five-letter food-themed word puzzle
- Six guess attempts
- Category-based clues
- Green / Yellow / Gray scoring
- Duplicate letter handling
- Local game statistics and streak tracking
- Shareable results
- Device-local date and time with a countdown to the next daily puzzle
- Fully client-side implementation
- No API dependencies

The displayed date, time, daily puzzle rollover, and countdown use the browser's local time zone. The page refreshes automatically when local midnight arrives so the next puzzle can load.

---

## Project Structure

```text
fancyfive/
│
├── index.html
├── README.md
│
├── css/
│   └── fancy-five.css
│
├── src/
│   ├── app.js
│   ├── game.js
│   ├── main.js
│   └── storage.js
│
├── data/
│   ├── dictionary.js
│   └── puzzles.js
│
├── js/
│   └── fancy-five.js
│
└── assets/
    ├── reti-the-yeti.jpg
    └── reti-the-yeti.png
```

---

## File Overview

### index.html
Application entry point. Kept compatible with direct local-file loading by using classic script tags instead of ES modules.

### css/fancy-five.css
Game styling and responsive layout, including the hero treatment and mascot placement.

### src/game.js
Core game logic including:
- Puzzle selection
- Guess validation
- Scoring
- Share text generation

### src/app.js
Browser UI behavior and daily gameplay flow.

### src/storage.js
LocalStorage persistence for stats and streak tracking.

### data/puzzles.js
Daily puzzle definitions and food facts.

### data/dictionary.js
Allowed word list used for validation.

---

## Dictionary Validation

The game validates guesses using a local dictionary.

- Recognized words are accepted
- Nonsense words are rejected
- The day's answer is always accepted
- No external API is required

This allows the game to function entirely offline and provides fast response times.

---

## Load Order

The following files must load in this order:

1. data/puzzles.js
2. data/dictionary.js
3. src/game.js
4. src/storage.js
5. src/app.js

This keeps the app working when opened directly from a local file while still maintaining a clearer separation of responsibilities.

---

## Future Ideas

- Sponsor of the Day
- Daily prizes
- Event-themed puzzles
- Leaderboards
- Ask Sofie hints
- Winter / Summer branding themes
- Analytics reporting
- Badge and gamification integration
- QR code sharing

---

## Deployment

Designed to be hosted as a static website and embedded within:

- Swapcard WebView
- Mobile event applications
- GitHub Pages
- Azure Static Web Apps
- DigitalOcean App Platform

---

## Version

Current Version: v1.2
