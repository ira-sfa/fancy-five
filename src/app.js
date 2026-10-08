(function () {
  const FancyGame = window.FancyFiveGame;
  const FancyStorage = window.FancyFiveStorage;
  const FancyAnalytics = window.FancyFiveAnalytics;
  const STORAGE_KEY = 'wffFancyFiveLaunchV1';
  const BONUS_LIMIT = 5;
  const dictionary = window.FANCY_FIVE_DICTIONARY || new Set();
  const puzzles = window.FANCY_FIVE_PUZZLES || [];
  const bonusPacks = window.FANCY_FIVE_BONUS_PACKS || {};
  const today = FancyGame.getTodayKey(new Date());
  const dailyPuzzle = FancyGame.selectPuzzle(puzzles, today);
  const $ = (id) => document.getElementById(id);

  if (!dailyPuzzle) {
    const message = $('ff-message');
    if (message) {
      message.textContent = 'No puzzle is scheduled.';
    }
    return;
  }

  const store = FancyStorage.loadStore(STORAGE_KEY, {
    days: {},
    stats: { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, lastWinDate: null },
  });
  const savedDay = store.days[today] || {};
  const legacyDaily = Array.isArray(savedDay.guesses) ? savedDay : {};
  const savedDaily = savedDay.daily || legacyDaily;
  const todayState = {
    daily: {
      guesses: Array.isArray(savedDaily.guesses) ? savedDaily.guesses.slice(0, 6) : [],
      completed: Boolean(savedDaily.completed),
      won: Boolean(savedDaily.won),
      startedAt: typeof savedDaily.startedAt === 'string' ? savedDaily.startedAt : null,
    },
    bonus: {
      plays: savedDay.bonus && Array.isArray(savedDay.bonus.plays)
        ? savedDay.bonus.plays.filter((play) => play && typeof play === 'object').slice(0, BONUS_LIMIT).map((play) => ({
          puzzleId: play.puzzleId,
          guesses: Array.isArray(play.guesses) ? play.guesses.slice(0, 6) : [],
          completed: Boolean(play.completed),
          won: Boolean(play.won),
          startedAt: typeof play.startedAt === 'string' ? play.startedAt : null,
        }))
        : [],
    },
  };

  let mode = 'daily';
  let activePuzzle = dailyPuzzle;
  let answer = dailyPuzzle.word.toUpperCase();
  let guesses = todayState.daily.guesses.slice();
  let finished = todayState.daily.completed;
  let resultWin = todayState.daily.won;
  let bonusIndex = -1;

  function bonusPuzzleList() {
    const pack = dailyPuzzle.bonusPackId && bonusPacks[dailyPuzzle.bonusPackId];
    if (!pack || !Array.isArray(pack.puzzles)) {
      return [];
    }

    const seen = new Set([dailyPuzzle.word.toUpperCase()]);
    return pack.puzzles.filter((bonusPuzzle) => {
      if (!bonusPuzzle || typeof bonusPuzzle.word !== 'string') {
        return false;
      }
      const word = bonusPuzzle.word.toUpperCase();
      const category = bonusPuzzle.category || pack.category;
      if (
        !/^[A-Z]{5}$/.test(word) ||
        seen.has(word) ||
        (!pack.allowMixedCategories && category !== dailyPuzzle.category)
      ) {
        return false;
      }
      seen.add(word);
      return true;
    }).slice(0, BONUS_LIMIT);
  }

  const bonuses = bonusPuzzleList();

  function saveToday() {
    store.days[today] = todayState;
    FancyStorage.saveStore(STORAGE_KEY, store);
  }

  function completedBonusCount() {
    return todayState.bonus.plays.filter((play) => play.completed).length;
  }

  function solvedBonusCount() {
    return todayState.bonus.plays.filter((play) => play.completed && play.won).length;
  }

  function activeBonusPlay() {
    return todayState.bonus.plays[bonusIndex];
  }

  function trackPuzzleStart(puzzleMode, puzzle, bonusNumber = null) {
    if (!FancyAnalytics) return;
    FancyAnalytics.track(puzzleMode === 'daily' ? 'daily_puzzle_started' : 'bonus_puzzle_started', {
      category: puzzle.category || dailyPuzzle.category,
      completionStatus: 'in_progress',
      puzzleMode,
      puzzleDate: today,
      puzzleId: puzzleMode === 'daily' ? dailyPuzzle.date : puzzle.id,
      bonusNumber,
    });
  }

  function trackPuzzleCompletion(puzzleMode, puzzle, win, attempt, bonusNumber = null) {
    if (!FancyAnalytics) return;
    const startedAt = attempt.startedAt ? new Date(attempt.startedAt).getTime() : Date.now();
    const eventType = puzzleMode === 'daily'
      ? (win ? 'daily_puzzle_solved' : 'daily_puzzle_failed')
      : (win ? 'bonus_puzzle_solved' : 'bonus_puzzle_failed');
    FancyAnalytics.track(eventType, {
      category: puzzle.category || dailyPuzzle.category,
      guessCount: attempt.guesses.length,
      completionStatus: win ? 'solved' : 'failed',
      puzzleMode,
      puzzleDate: today,
      puzzleId: puzzleMode === 'daily' ? dailyPuzzle.date : puzzle.id,
      bonusNumber,
      timeToSolveMs: Math.max(0, Date.now() - startedAt),
    });
  }

  function currentScores() {
    return guesses.map((guess) => FancyGame.scoreGuess(guess, answer));
  }

  function renderBoard() {
    const board = $('ff-board');
    if (!board) return;
    board.innerHTML = '';
    board.setAttribute('aria-label', mode === 'daily' ? "Today's Fancy Five game board" : `Bonus Puzzle ${bonusIndex + 1} game board`);

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

    if (mode === 'daily') {
      if (win) {
        headline.textContent = `🎉 You solved today's Fancy Five in ${guessCount} guess${guessCount === 1 ? '' : 'es'}!`;
        context.textContent = `${getPerformanceLabel(guessCount)} result! Most players solve this puzzle in 2–4 guesses.`;
      } else {
        headline.textContent = `Thanks for giving today's Fancy Five a try!`;
        context.textContent = `You used ${guessCount} guesses. Today's word was ${answer}.`;
      }
      return;
    }

    if (win) {
      headline.textContent = `🎉 Bonus Puzzle ${bonusIndex + 1} solved in ${guessCount} guess${guessCount === 1 ? '' : 'es'}!`;
      context.textContent = `${getPerformanceLabel(guessCount)} result! Bonus play doesn't affect your Daily Puzzle stats.`;
    } else {
      headline.textContent = `Bonus Puzzle ${bonusIndex + 1} complete—thanks for playing!`;
      context.textContent = `Today's bonus word was ${answer}. Daily Puzzle stats are unchanged.`;
    }
  }

  function renderResult(win) {
    $('ff-kicker').textContent = mode === 'daily' ? 'Daily results' : `Bonus Puzzle ${bonusIndex + 1} of ${BONUS_LIMIT}`;
    $('ff-result-title').textContent = mode === 'daily'
      ? (win ? 'Daily Puzzle complete!' : 'Daily Puzzle complete')
      : `Bonus Puzzle ${bonusIndex + 1} ${win ? 'solved!' : 'complete'}`;
    $('ff-answer').textContent = `${mode === 'daily' ? "TODAY'S WORD" : 'BONUS WORD'}: ${answer}`;
    renderSolveSummary(win);
    $('ff-fact').textContent = activePuzzle.fact || '';
    $('ff-stats').hidden = mode !== 'daily';
    $('ff-share').hidden = false;
    $('ff-result').hidden = false;
  }

  function dailyMessage() {
    if (todayState.daily.won) {
      return `✅ Daily Puzzle Complete! You solved today's Fancy Five in ${todayState.daily.guesses.length} guess${todayState.daily.guesses.length === 1 ? '' : 'es'}. Thanks for playing!`;
    }
    return `Daily Puzzle complete. Today's word was ${dailyPuzzle.word.toUpperCase()}. Want another challenge?`;
  }

  function renderTodaysResults() {
    const dailyComplete = todayState.daily.completed;
    const completed = completedBonusCount();
    const solved = solvedBonusCount();
    const dailySolved = todayState.daily.won;
    const dailyGuessCount = todayState.daily.guesses.length;

    $('ff-daily-progress').hidden = !dailyComplete;
    $('ff-todays-results').hidden = !dailyComplete;
    if (!dailyComplete) {
      return;
    }

    $('ff-daily-progress-status').textContent = dailySolved ? 'Daily Puzzle Complete ✓' : 'Daily Puzzle Finished';
    $('ff-bonus-progress-label').textContent = `Bonus Progress: ${completed}/${BONUS_LIMIT}`;
    $('ff-daily-result').textContent = dailySolved
      ? `✅ Solved in ${dailyGuessCount} guess${dailyGuessCount === 1 ? '' : 'es'}`
      : `Not solved — answer: ${dailyPuzzle.word.toUpperCase()}`;
    $('ff-bonus-result').textContent = `${completed} of ${BONUS_LIMIT} (${solved} solved)`;
    $('ff-words-result').textContent = String((dailySolved ? 1 : 0) + solved);

    const nextIncomplete = todayState.bonus.plays.findIndex((play) => !play.completed);
    const nextBonusIndex = nextIncomplete >= 0 ? nextIncomplete : completed;
    const bonusAction = $('ff-bonus-action');
    const returnButton = $('ff-return-daily');
    const prompt = $('ff-bonus-prompt');
    returnButton.hidden = mode !== 'bonus';

    if (mode === 'daily') {
      prompt.hidden = false;
      prompt.textContent = bonuses.length === 0
        ? 'Bonus puzzles are not available for this category yet.'
        : nextBonusIndex >= BONUS_LIMIT
          ? 'You completed all five Bonus Puzzles today.'
          : 'Want another challenge?';
      bonusAction.hidden = false;
      bonusAction.disabled = nextBonusIndex >= BONUS_LIMIT || bonuses.length === 0;
      bonusAction.textContent = nextBonusIndex < BONUS_LIMIT
        ? (nextIncomplete >= 0 ? `Resume Bonus Puzzle ${nextBonusIndex + 1} of ${BONUS_LIMIT}` : `Play Bonus Puzzle ${nextBonusIndex + 1} of ${BONUS_LIMIT}`)
        : 'You played all 5 bonus puzzles today';
      if (bonuses.length === 0) {
        bonusAction.textContent = 'Bonus puzzles coming soon';
      }
      return;
    }

    prompt.hidden = true;
    const mayAdvance = finished && nextBonusIndex < BONUS_LIMIT && bonuses.length > 0;
    bonusAction.hidden = !mayAdvance;
    bonusAction.disabled = false;
    if (mayAdvance) {
      bonusAction.textContent = `Play Bonus Puzzle ${nextBonusIndex + 1} of ${BONUS_LIMIT}`;
    } else if (completed >= BONUS_LIMIT) {
      bonusAction.hidden = false;
      bonusAction.disabled = true;
      bonusAction.textContent = 'You played all 5 bonus puzzles today';
    }
  }

  function renderMode() {
    $('ff-mode-label').textContent = mode === 'daily'
      ? "Today's Fancy Five"
      : `Bonus Puzzle ${bonusIndex + 1} of ${BONUS_LIMIT}`;
    $('ff-category').textContent = activePuzzle.category || dailyPuzzle.category;
    $('ff-guess').value = '';
    $('ff-guess').disabled = finished;
    $('ff-enter').disabled = finished;
    $('ff-message').textContent = '';
    renderBoard();
    renderKeyboard();

    if (finished) {
      renderResult(resultWin);
      $('ff-message').textContent = mode === 'daily'
        ? dailyMessage()
        : `Bonus Puzzle ${bonusIndex + 1} complete. ${resultWin ? 'Nice solve!' : `The word was ${answer}.`}`;
    } else {
      $('ff-result').hidden = true;
    }

    renderStats();
    renderTodaysResults();
  }

  function appendAnalytics(event) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(event);
    } catch (error) {
      // analytics is optional
    }
  }

  function completeGame(win) {
    finished = true;
    resultWin = win;

    if (mode === 'daily') {
      if (!todayState.daily.completed) {
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
      todayState.daily = {
        ...todayState.daily,
        guesses: guesses.slice(),
        completed: true,
        won: win,
      };
      trackPuzzleCompletion('daily', dailyPuzzle, win, todayState.daily);
      appendAnalytics({ event: 'fancy_five_complete', puzzle_date: today, won: win, guesses: guesses.length });
    } else {
      const play = activeBonusPlay();
      play.guesses = guesses.slice();
      play.completed = true;
      play.won = win;
      trackPuzzleCompletion('bonus', activePuzzle, win, play, bonusIndex + 1);
      appendAnalytics({ event: 'fancy_five_bonus_complete', puzzle_date: today, bonus_number: bonusIndex + 1, won: win, guesses: guesses.length });
    }

    saveToday();
    renderStats();
    $('ff-message').textContent = mode === 'daily'
      ? dailyMessage()
      : `Bonus Puzzle ${bonusIndex + 1} complete. ${win ? 'Nice solve!' : `The word was ${answer}.`}`;
    renderResult(win);
    renderTodaysResults();
  }

  function submitGuess() {
    if (finished) {
      return;
    }

    const input = $('ff-guess');
    const rawValue = input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
    if (rawValue.length !== 5) {
      $('ff-message').textContent = 'Please enter exactly five letters.';
      return;
    }

    const validation = FancyGame.evaluateGuess(rawValue, answer, dictionary);
    if (!validation.valid) {
      $('ff-message').textContent = validation.reason;
      return;
    }

    guesses.push(validation.normalized);
    input.value = '';
    renderBoard();
    renderKeyboard();

    appendAnalytics({
      event: mode === 'daily' ? 'fancy_five_guess' : 'fancy_five_bonus_guess',
      puzzle_date: today,
      guess_number: guesses.length,
      bonus_number: mode === 'bonus' ? bonusIndex + 1 : undefined,
    });

    if (mode === 'daily') {
      todayState.daily = {
        ...todayState.daily,
        guesses: guesses.slice(),
        completed: false,
        won: false,
      };
    } else {
      activeBonusPlay().guesses = guesses.slice();
    }
    saveToday();

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

  function buildSharePost() {
    const dailyGuesses = todayState.daily.guesses;
    const grid = dailyGuesses
      .map((guess) => FancyGame.scoreGuess(guess, dailyPuzzle.word.toUpperCase())
        .map((state) => {
          if (state === 'ff-correct') return '🟩';
          if (state === 'ff-present') return '🟨';
          return '⬜';
        })
        .join(''))
      .join('\n');
    const guessText = `${dailyGuesses.length} guess${dailyGuesses.length === 1 ? '' : 'es'}`;
    const result = todayState.daily.won
      ? `I solved today's Fancy Five in ${guessText}!`
      : `I played today's Fancy Five in ${guessText}, but didn't solve it.`;
    let gameUrl = '';
    if (/^https?:$/.test(window.location.protocol)) {
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      gameUrl = url.href;
    }
    return {
      text: `❄️ ${result}\n\n${grid}\n\n${gameUrl ? `Play today's puzzle: ${gameUrl}\n` : ''}Winter FancyFaire* · Where Firsts Are Found\n#FancyFive #WinterFancyFaire`,
      gameUrl,
    };
  }

  async function copySharePost() {
    const text = $('ff-share-text').value;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      console.error('Fancy Five could not copy the prepared share post using the Clipboard API.', error);
    }

    const field = $('ff-share-text');
    field.focus();
    field.select();
    try {
      if (document.execCommand('copy')) {
        return true;
      }
    } catch (error) {
      console.error('Fancy Five could not copy the prepared share post.', error);
    }
    field.setSelectionRange(0, field.value.length);
    $('ff-share-status').textContent = 'Copy was blocked. The post is selected above—copy it manually, then paste it into your social post.';
    return false;
  }

  function shareResults() {
    if (FancyAnalytics) {
      FancyAnalytics.track('share_results_clicked', {
        category: dailyPuzzle.category,
        guessCount: todayState.daily.guesses.length,
        completionStatus: todayState.daily.won ? 'solved' : 'failed',
        puzzleMode: 'daily',
        puzzleDate: today,
        puzzleId: dailyPuzzle.date,
      });
    }
    const post = buildSharePost();
    $('ff-share-text').value = post.text;
    $('ff-share-status').textContent = post.gameUrl
      ? ''
      : 'This local copy has no public game link. Publish the game to include a shareable link.';
    $('ff-share-native').hidden = typeof navigator.share !== 'function';
    $('ff-share-modal').hidden = false;
    $('ff-share-facebook').focus();
    appendAnalytics({ event: 'fancy_five_share', puzzle_date: today, won: todayState.daily.won });
  }

  async function shareToPlatform(platform) {
    const { gameUrl } = buildSharePost();
    const destinations = {
      facebook: gameUrl
        ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(gameUrl)}&quote=${encodeURIComponent($('ff-share-text').value)}`
        : null,
      instagram: 'https://www.instagram.com/',
      linkedin: gameUrl
        ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(gameUrl)}`
        : null,
    };
    const destination = destinations[platform];

    if (platform !== 'instagram' && !destination) {
      $('ff-share-status').textContent = 'A public game link is needed for this social share. You can still copy the prepared post above.';
      return;
    }

    if (destination) {
      window.open(destination, '_blank', 'noopener,noreferrer');
    }
    const copied = await copySharePost();
    if (copied) {
      $('ff-share-status').textContent = platform === 'instagram'
        ? 'Caption copied. Instagram is open—start a post and paste your caption.'
        : `Prepared post copied. ${platform === 'facebook' ? 'Facebook' : 'LinkedIn'} is open—paste it into your post.`;
    }
  }

  async function shareWithDevice() {
    if (typeof navigator.share !== 'function') {
      $('ff-share-status').textContent = 'Device sharing is not available in this browser. Choose a social network or copy the post.';
      return;
    }
    const { text, gameUrl } = buildSharePost();
    try {
      await navigator.share({
        title: 'Fancy Five Daily Results',
        text,
        ...(gameUrl ? { url: gameUrl } : {}),
      });
      $('ff-share-status').textContent = 'Your device share sheet was opened.';
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Fancy Five could not open the device share sheet.', error);
        $('ff-share-status').textContent = 'Device sharing failed. Choose a social network or copy the post instead.';
      }
    }
  }

  function startBonusPuzzle() {
    if (!todayState.daily.completed || bonuses.length === 0) {
      return;
    }

    const activeIndex = todayState.bonus.plays.findIndex((play) => !play.completed);
    bonusIndex = activeIndex >= 0 ? activeIndex : completedBonusCount();
    if (bonusIndex >= BONUS_LIMIT || bonusIndex >= bonuses.length) {
      return;
    }

    if (!todayState.bonus.plays[bonusIndex]) {
      todayState.bonus.plays[bonusIndex] = {
        puzzleId: bonuses[bonusIndex].id,
        guesses: [],
        completed: false,
        won: false,
        startedAt: new Date().toISOString(),
      };
      trackPuzzleStart('bonus', bonuses[bonusIndex], bonusIndex + 1);
    }

    mode = 'bonus';
    activePuzzle = {
      ...bonuses[bonusIndex],
      category: bonuses[bonusIndex].category || dailyPuzzle.category,
    };
    answer = activePuzzle.word.toUpperCase();
    guesses = todayState.bonus.plays[bonusIndex].guesses.slice();
    finished = todayState.bonus.plays[bonusIndex].completed;
    resultWin = todayState.bonus.plays[bonusIndex].won;
    saveToday();
    renderMode();
    if (!finished) {
      $('ff-guess').focus();
    }
  }

  function returnToDaily() {
    mode = 'daily';
    bonusIndex = -1;
    activePuzzle = dailyPuzzle;
    answer = dailyPuzzle.word.toUpperCase();
    guesses = todayState.daily.guesses.slice();
    finished = todayState.daily.completed;
    resultWin = todayState.daily.won;
    renderMode();
  }

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
  $('ff-share-facebook').onclick = () => shareToPlatform('facebook');
  $('ff-share-instagram').onclick = () => shareToPlatform('instagram');
  $('ff-share-linkedin').onclick = () => shareToPlatform('linkedin');
  $('ff-share-native').onclick = shareWithDevice;
  $('ff-share-copy').onclick = async () => {
    if (await copySharePost()) {
      $('ff-share-status').textContent = 'Prepared post copied. Paste it into your social post.';
    }
  };
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
  $('ff-bonus-action').onclick = startBonusPuzzle;
  $('ff-return-daily').onclick = returnToDaily;

  const modal = $('ff-modal');
  $('ff-help').onclick = () => {
    modal.hidden = false;
    $('ff-close').focus();
  };
  $('ff-close').onclick = () => {
    modal.hidden = true;
    $('ff-help').focus();
  };
  const shareModal = $('ff-share-modal');
  $('ff-share-close').onclick = () => {
    shareModal.hidden = true;
    $('ff-share').focus();
  };
  modal.onclick = (event) => {
    if (event.target === modal) {
      modal.hidden = true;
    }
  };
  shareModal.onclick = (event) => {
    if (event.target === shareModal) {
      shareModal.hidden = true;
      $('ff-share').focus();
    }
  };
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!shareModal.hidden) {
        shareModal.hidden = true;
        $('ff-share').focus();
      } else {
        modal.hidden = true;
      }
    }
  });

  if (!todayState.daily.completed && !todayState.daily.startedAt) {
    todayState.daily.startedAt = new Date().toISOString();
    if (todayState.daily.guesses.length === 0) {
      trackPuzzleStart('daily', dailyPuzzle);
    }
    saveToday();
  }

  renderLocalClock();
  renderMode();

  if (!todayState.daily.guesses.length) {
    appendAnalytics({ event: 'fancy_five_start', puzzle_date: today });
  }

  if (!finished) {
    $('ff-guess').focus();
  }
})();
