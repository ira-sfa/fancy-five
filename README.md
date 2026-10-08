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
- One shared Daily Puzzle plus up to five optional, category-matched Bonus Puzzles
- Separate Daily Puzzle and Bonus Puzzle progress
- Unlinked `/admin/` demo analytics dashboard backed by anonymous browser-local events
- Fully client-side implementation
- No API dependencies

The displayed date, time, daily puzzle rollover, and countdown use the browser's local time zone. The page refreshes automatically when local midnight arrives so the next puzzle can load.

The Daily Puzzle is the primary mode. Its results alone count toward daily stats, streaks, and sharing. Once it is finished, up to five Bonus Puzzles from that day's category become available. Bonus puzzle progress and solved words are saved separately and do not affect Daily Puzzle stats.

## Demo Admin Dashboard

Open `/admin/` on a static host, or `admin/index.html` when browsing the project locally. The dashboard is intentionally not linked from the game and is a prototype, not a secure admin portal. Do not use it for access control or production reporting.

The game stores an anonymous random player ID and event history in the browser's local storage. Tracked events include first/return visits, daily and bonus puzzle starts and outcomes, and daily-results share clicks. Event details include local timestamp/date, puzzle category and mode, guess count, completion status, and solve duration when applicable. The demo does not collect names, contact details, IP addresses, or corporate information.

Since there is no backend, analytics only represents activity recorded by the current browser profile and is not combined across players' devices. To see data on the dashboard, play the game and open `/admin/` in the same browser and static-site origin. Direct `file://` behavior for local storage varies by browser; a static host or same-origin local web server is recommended for the demo.

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
│   ├── analytics.js
│   ├── app.js
│   ├── game.js
│   ├── main.js
│   └── storage.js
│
├── data/
│   ├── bonus-packs.js
│   ├── dictionary.js
│   └── puzzles.js
│
├── admin/
│   ├── dashboard.css
│   ├── dashboard.js
│   └── index.html
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
Browser UI behavior and Daily/Bonus gameplay flow. Daily statistics and shares remain separate from bonus play.

### src/storage.js
LocalStorage persistence for stats and streak tracking.

### src/analytics.js
Anonymous, browser-local demo event tracking for visits, puzzle play, outcomes, and sharing.

### data/puzzles.js
Daily puzzle definitions, category metadata, and food facts.

### data/bonus-packs.js
Category-keyed collections of optional bonus puzzles. Bonus entries carry stable IDs, difficulty, and facts, and can be extended with their own category or event/sponsor metadata. Packs can opt into mixed categories when future collections need them; today's packs stay matched to the Daily Puzzle's category.

### data/dictionary.js
Allowed word list used for validation.

### admin/
Unlinked static demo analytics dashboard. Reads the browser-local analytics event log and renders adoption, engagement, activity, category, trend, and Daily Puzzle leaderboard views.

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
2. data/bonus-packs.js
3. data/dictionary.js
4. src/game.js
5. src/storage.js
6. src/analytics.js
7. src/app.js

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
