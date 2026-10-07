(function () {
  const FancyGame = window.FancyFiveGame;
  const FancyStorage = window.FancyFiveStorage;
  const STORAGE_KEY = 'wffFancyFiveLaunchV1';
  const dictionary = window.FANCY_FIVE_DICTIONARY || new Set();
  const puzzles = window.FANCY_FIVE_PUZZLES || [];
  const today = FancyGame.getTodayKey(new Date());
  const puzzle = FancyGame.selectPuzzle(puzzles, today);
  const $ = (id) => document.getElementById(id);

  if (!puzzle) {
    const msg = $('ff-message');
    if (msg) {
      msg.textContent = 'No puzzle is scheduled.';
    }
    return;
  }

  const answer = puzzle.word.toUpperCase();
  const store = FancyStorage.loadStore(STORAGE_KEY, {
    days: {},
    stats: { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, lastWinDate: null },
  });

  let guesses = [];
  let finished = false;
  let resultWin = false;

  function currentScores() {
    return guesses.map((guess) => FancyGame.scoreGuess(guess, answer));
  }

  function renderBoard() {
    const board = $('ff-board');
    if (!board) return;
    board.innerHTML = '';

    for (let row = 0; row < 6; row += 1) {
      const rowScores = guesses[row] ? FancyGame.scoreGuess(guesses[row], answer) : null;

      for (let col = 0; col < 5; col += 1) {
        const tile = document.createElement('div');
        tile.className = 'ff-tile';
        tile.setAttribute('aria-label', `row ${row + 1} column ${col + 1}`);

        if (guesses[row]) {
          tile.textContent = guesses[row][col];
          tile.classList.add(rowScores[col]);
        }

        board.appendChild(tile);
      }
    }
  }

  function renderKeyboard() {
    const priority = { 'ff-absent': 1, 'ff-present': 2, 'ff-correct': 3 };
    const keyState = {};

    guesses.forEach((guess) => {
      const states = FancyGame.scoreGuess(guess, answer);
      states.forEach((state, index) => {
        const letter = guess[index];
        if (!keyState[letter] || priority[state] > priority[keyState[letter]]) {
          keyState[letter] = state;
        }
      });
    });

    const keyboard = $('ff-keyboard');
    if (!keyboard) return;
    keyboard.innerHTML = '';

    ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].forEach((chars) => {
      const row = document.createElement('div');
      row.className = 'ff-keyrow';

      chars.split('').forEach((letter) => {
        const key = document.createElement('button');
        key.type = 'button';
        key.className = 'ff-button ff-key';
        key.textContent = letter;
        key.setAttribute('aria-label', `Letter ${letter}`);

        if (keyState[letter]) {
          key.classList.add(keyState[letter]);
        }

        key.onclick = () => {
          const input = $('ff-guess');
          if (!finished && input.value.length < 5) {
            input.value = `${input.value}${letter}`.toUpperCase();
            input.focus();
          }
        };

        row.appendChild(key);
      });

      keyboard.appendChild(row);
    });
  }

  function renderStats() {
    const stats = store.stats;
    $('ff-played').textContent = stats.played;
    $('ff-winrate').textContent = `${stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}%`;
    $('ff-streak').textContent = stats.currentStreak;
    $('ff-maxstreak').textContent = stats.maxStreak;
  }

  function renderLocalClock() {
    const dateElement = $('ff-local-date');
    const timeElement = $('ff-local-time');
    const countdownElement = $('ff-countdown');
    if (!dateElement || !timeElement || !countdownElement) {
      return;
    }

    const dateFormatter = new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const timeFormatter = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
    let refreshedForNewDay = false;

    function update() {
      const now = new Date();
      dateElement.textContent = dateFormatter.format(now);
      dateElement.dateTime = now.toISOString();
      timeElement.textContent = timeFormatter.format(now);
      timeElement.dateTime = now.toISOString();

      if (FancyGame.getTodayKey(now) !== today) {
        countdownElement.textContent = 'A new puzzle is ready!';
        if (!refreshedForNewDay) {
          refreshedForNewDay = true;
          window.location.reload();
        }
        return;
      }

      const nextPuzzle = new Date(now);
      nextPuzzle.setHours(24, 0, 0, 0);
      const secondsRemaining = Math.max(0, Math.ceil((nextPuzzle.getTime() - now.getTime()) / 1000));
      const hours = String(Math.floor(secondsRemaining / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((secondsRemaining % 3600) / 60)).padStart(2, '0');
      const seconds = String(secondsRemaining % 60).padStart(2, '0');
      countdownElement.textContent = `${hours}:${minutes}:${seconds}`;
      countdownElement.dateTime = `PT${hours}H${minutes}M${seconds}S`;
    }

    update();
    window.setInterval(update, 1000);
  }

  function getPerformanceLabel(guessCount) {
    if (guessCount === 1) return 'Outstanding';
    if (guessCount === 2) return 'Excellent';
    if (guessCount === 3) return 'Great';
    if (guessCount === 4) return 'Good';
    return 'Challenging';
  }

  function renderSolveSummary(win) {
    const headline = $('ff-solve-headline');
    const context = $('ff-solve-context');
    const guessCount = guesses.length;

    if (win) {
      headline.textContent = `🎉 You solved today's Fancy Five in ${guessCount} guess${guessCount === 1 ? '' : 'es'}!`;
      context.textContent = `${getPerformanceLabel(guessCount)} result! Most players solve this puzzle in 2–4 guesses.`;
      return;
    }

    headline.textContent = `You used all ${guessCount} guesses—thanks for playing!`;
    context.textContent = `Today's word was ${answer}. Most players solve this puzzle in 2–4 guesses.`;
  }

  function appendResult(win, fromLoad = false) {
    finished = true;
    resultWin = win;
    $('ff-guess').disabled = true;
    $('ff-enter').disabled = true;
    $('ff-result-title').textContent = win ? 'Puzzle solved!' : "Come back for tomorrow's puzzle.";
    $('ff-answer').textContent = `TODAY'S WORD: ${answer}`;
    renderSolveSummary(win);
    $('ff-fact').textContent = puzzle.fact;
    $('ff-result').hidden = false;
    renderStats();

    if (!fromLoad) {
      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'fancy_five_complete', puzzle_date: today, won: win, guesses: guesses.length });
      } catch (error) {
        // analytics is optional
      }
    }
  }

  function completeGame(win) {
    if (!store.days[today] || !store.days[today].completed) {
      store.stats.played += 1;

      if (win) {
        store.stats.wins += 1;
        const gap = FancyStorage.dayDiff(store.stats.lastWinDate, today);
        store.stats.currentStreak = gap === 1 ? store.stats.currentStreak + 1 : 1;
        store.stats.lastWinDate = today;
        store.stats.maxStreak = Math.max(store.stats.maxStreak, store.stats.currentStreak);
      } else {
        store.stats.currentStreak = 0;
      }
    }

    store.days[today] = { guesses: guesses.slice(), completed: true, won: win };
    FancyStorage.saveStore(STORAGE_KEY, store);
    $('ff-message').textContent = win
      ? `Solved in ${guesses.length} guess${guesses.length === 1 ? '' : 'es'}—thanks for playing!`
      : `Today's word was ${answer}. You had ${guesses.length} guess${guesses.length === 1 ? '' : 'es'}.`;
    appendResult(win, false);
  }

  function submitGuess() {
    if (finished) {
      return;
    }

    const input = $('ff-guess');
    const rawValue = input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
    const validation = FancyGame.evaluateGuess(rawValue, answer, dictionary);

    if (rawValue.length !== 5) {
      $('ff-message').textContent = 'Please enter exactly five letters.';
      return;
    }

    if (!validation.valid) {
      $('ff-message').textContent = validation.reason;
      return;
    }

    guesses.push(validation.normalized);
    input.value = '';
    renderBoard();
    renderKeyboard();

    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'fancy_five_guess', puzzle_date: today, guess_number: guesses.length });
    } catch (error) {
      // analytics is optional
    }

    store.days[today] = { guesses: guesses.slice(), completed: false, won: false };
    FancyStorage.saveStore(STORAGE_KEY, store);

    if (validation.normalized === answer) {
      completeGame(true);
      return;
    }

    if (guesses.length >= 6) {
      completeGame(false);
      return;
    }

    const remaining = 6 - guesses.length;
    $('ff-message').textContent = `${remaining} ${remaining === 1 ? 'try' : 'tries'} remaining.`;
  }

  function shareResults() {
    const grid = currentScores()
      .map((score) => score.map((state) => {
        if (state === 'ff-correct') return '🟩';
        if (state === 'ff-present') return '🟨';
        return '⬜';
      }).join(''))
      .join('\n');

    const text = `Winter FancyFaire* Fancy Five ${guesses.length}/6\n\n${grid}\n\nWhere Firsts Are Found`;

    if (navigator.share) {
      navigator.share({ title: 'Winter FancyFaire* Fancy Five', text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          $('ff-message').textContent = 'Results copied!';
        })
        .catch(() => {
          $('ff-message').textContent = 'Copy your results from the share panel.';
        });
    }

    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'fancy_five_share', puzzle_date: today, won: resultWin });
    } catch (error) {
      // analytics is optional
    }
  }

  $('ff-category').textContent = puzzle.category;
  renderLocalClock();
  $('ff-form').onsubmit = (event) => {
    event.preventDefault();
    submitGuess();
  };
  $('ff-enter').onclick = submitGuess;
  $('ff-guess').oninput = function () {
    this.value = this.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
  };
  $('ff-guess').onkeydown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitGuess();
    }
  };
  $('ff-share').onclick = shareResults;
  $('ff-backspace').onclick = () => {
    const input = $('ff-guess');
    input.value = input.value.slice(0, -1);
    input.focus();
  };
  $('ff-clear').onclick = () => {
    const input = $('ff-guess');
    input.value = '';
    input.focus();
  };

  const modal = $('ff-modal');
  $('ff-help').onclick = () => {
    modal.hidden = false;
    $('ff-close').focus();
  };
  $('ff-close').onclick = () => {
    modal.hidden = true;
    $('ff-help').focus();
  };
  modal.onclick = (event) => {
    if (event.target === modal) {
      modal.hidden = true;
    }
  };
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      modal.hidden = true;
    }
  });

  const existing = store.days[today];
  if (existing) {
    guesses = (existing.guesses || []).slice(0, 6);
    renderBoard();
    renderKeyboard();

    if (existing.completed) {
      $('ff-message').textContent = existing.won
        ? "You've already solved today's puzzle. Thanks for playing!"
        : `Today's word was ${answer}.`;
      appendResult(Boolean(existing.won), true);
    }
  }

  renderBoard();
  renderKeyboard();
  renderStats();

  if (!existing) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'fancy_five_start', puzzle_date: today });
    } catch (error) {
      // analytics is optional
    }
  }

  if (!finished) {
    $('ff-guess').focus();
  }
})();
