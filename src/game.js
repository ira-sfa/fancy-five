(function () {
  const api = window.FancyFiveGame || {};

  api.getTodayKey = function getTodayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  api.selectPuzzle = function selectPuzzle(puzzles, today = api.getTodayKey()) {
    if (!puzzles || puzzles.length === 0) {
      return null;
    }

    return (
      puzzles.find((entry) => entry.date === today) ||
      puzzles.filter((entry) => entry.date <= today).slice(-1)[0] ||
      puzzles[0]
    );
  };

  api.scoreGuess = function scoreGuess(guess, answer) {
    const result = ['ff-absent', 'ff-absent', 'ff-absent', 'ff-absent', 'ff-absent'];
    const counts = {};

    for (let i = 0; i < 5; i += 1) {
      if (guess[i] === answer[i]) {
        result[i] = 'ff-correct';
      } else {
        const letter = answer[i];
        counts[letter] = (counts[letter] || 0) + 1;
      }
    }

    for (let i = 0; i < 5; i += 1) {
      if (result[i] === 'ff-correct') {
        continue;
      }

      const letter = guess[i];
      if ((counts[letter] || 0) > 0) {
        result[i] = 'ff-present';
        counts[letter] -= 1;
      }
    }

    return result;
  };

  api.evaluateGuess = function evaluateGuess(guess, answer, dictionary) {
    if (guess.length !== 5) {
      return { valid: false, reason: 'Please enter exactly five letters.' };
    }

    const normalized = guess.toUpperCase();
    if (normalized !== answer && !dictionary.has(normalized)) {
      return { valid: false, reason: 'Not a recognized English word. Try again.' };
    }

    return { valid: true, normalized };
  };

  api.shareText = function shareText(guesses, scoreBoard) {
    const grid = guesses
      .map((guess) => scoreBoard(guess)
        .map((state) => {
          if (state === 'ff-correct') return '🟩';
          if (state === 'ff-present') return '🟨';
          return '⬜';
        })
        .join(''))
      .join('\n');

    return `Winter FancyFaire* Fancy Five ${guesses.length}/6\n\n${grid}\n\nWhere Firsts Are Found`;
  };

  window.FancyFiveGame = api;
})();
