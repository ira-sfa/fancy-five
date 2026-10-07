# \# Fancy Five

# 

# A food-themed daily word game created for the Specialty Food Association.

# 

# Fancy Five is inspired by Wordle and designed to provide Winter FancyFaire and Summer Fancy Food Show attendees with a fun, casual engagement experience that can be embedded within the event app using a webview or iframe.

# 

# \---

# 

# \## Current Features

# 

# \- Daily five-letter food-themed word puzzle

# \- Six guess attempts

# \- Category-based clues

# \- Green / Yellow / Gray scoring

# \- Duplicate letter handling

# \- Local game statistics and streak tracking

# \- Shareable results

# \- Fully client-side implementation

# \- No API dependencies

# 

# \---

# 

# \## Project Structure

# 

# ```text

# fancyfive/

# │

# ├── index.html

# ├── README.md

# │

# ├── css/

# │   └── fancy-five.css

# │

# ├── js/

# │   └── fancy-five.js

# │

# ├── data/

# │   ├── dictionary.js

# │   └── puzzles.js

# │

# └── assets/

# &#x20;   ├── images/

# &#x20;   ├── logos/

# &#x20;   └── sponsors/

# ```

# 

# \---

# 

# \## File Overview

# 

# \### index.html

# 

# Application entry point.

# 

# \### css/fancy-five.css

# 

# Game styling and responsive layout.

# 

# \### js/fancy-five.js

# 

# Core game logic including:

# 

# \- puzzle selection

# \- guess validation

# \- scoring

# \- local statistics

# \- sharing functionality

# 

# \### data/puzzles.js

# 

# Daily puzzle definitions and food facts.

# 

# \### data/dictionary.js

# 

# Allowed word list used for validation.

# 

# \---

# 

# \## Dictionary Validation

# 

# The game validates guesses using a local dictionary.

# 

# \- Recognized words are accepted.

# \- Nonsense words are rejected.

# \- The day's answer is always accepted.

# \- No external API is required.

# 

# This allows the game to function entirely offline and provides fast response times.

# 

# \---

# 

# \## Load

