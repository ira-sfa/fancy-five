# Fancy Five v1.2

## Dictionary validation added

This version restores dictionary validation, but uses a much broader local five-letter English word list instead of the tiny demo whitelist.

- Recognized five-letter English words are accepted.
- Random five-letter nonsense is rejected.
- The day's puzzle answer is always accepted.
- Green/yellow/gray scoring and duplicate-letter handling are unchanged.
- No API call is required, so gameplay remains fast and works without a third-party service.

`dictionary.js` currently contains 1,514 five-letter entries and is deliberately separated from the game logic so your web team can expand or replace it easily.

## Important language note

There is no universally agreed list of "all real English words." Dictionaries differ on archaic words, proper nouns, slang, technical terms, inflections, regional words, and loanwords. For a public production game, SFA should decide how broad the accepted vocabulary should be.

For the strongest production implementation, I recommend replacing/expanding `dictionary.js` with an appropriately licensed comprehensive English word dataset reviewed for your use case. The game logic is already set up for that swap.

## Files

- `index.html`
- `fancy-five.css`
- `fancy-five.js`
- `puzzles.js`
- `dictionary.js`

Load order is important:

1. `puzzles.js`
2. `dictionary.js`
3. `fancy-five.js`

## Updating the dictionary

Each accepted word is stored uppercase in the JavaScript Set. Your developer can add specialty-food terminology that may not appear in a general English dictionary.

Example:

    window.FANCY_FIVE_DICTIONARY = new Set([
      "APPLE",
      "CACAO",
      "MOCHI"
    ]);

## Scoring

The scoring uses two passes:
1. exact-position matches are marked green;
2. remaining occurrences are counted and only legitimate misplaced matches are marked yellow.

This prevents duplicate letters from receiving extra yellow tiles when the answer contains fewer instances of that letter.
