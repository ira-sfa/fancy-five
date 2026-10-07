(() => {
  "use strict";
  const root = document.getElementById("fancy-five-app");
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = "true";

  const puzzles = Array.isArray(window.FANCY_FIVE_PUZZLES) ? window.FANCY_FIVE_PUZZLES : [];
  const dictionary = window.FANCY_FIVE_DICTIONARY instanceof Set ? window.FANCY_FIVE_DICTIONARY : new Set();
  const STORAGE_KEY = "fancyFiveV11";
  const $ = s => root.querySelector(s);
  const board = $("#ff-board"), input = $("#ff-input"), form = $("#ff-form");
  const message = $("#ff-message"), result = $("#ff-result");
  let guesses = [], finished = false;

  function localDateKey() {
    const d = new Date();
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }

  function selectPuzzle() {
    if (!puzzles.length) throw new Error("No Fancy Five puzzles configured.");
    const today = localDateKey();
    return puzzles.find(p => p.date === today) ||
      puzzles.filter(p => p.date <= today).slice(-1)[0] ||
      puzzles[0];
  }

  const puzzle = selectPuzzle();
  const answer = String(puzzle.word || "").toUpperCase();

  function safeLoad() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (_) { return {}; }
  }
  function safeSave(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
  }
  let store = safeLoad();
  store.stats ||= {played:0,wins:0,streak:0,lastWinDate:null};
  store.days ||= {};
  const today = localDateKey();

  function score(guess) {
    const a = answer.split(""), g = guess.split("");
    const out = Array(5).fill("absent"), counts = {};

    // First pass: exact matches turn green.
    a.forEach((c,i) => {
      if (g[i] === c) out[i] = "correct";
      else counts[c] = (counts[c] || 0) + 1;
    });

    // Second pass: remaining matching letters turn yellow, respecting duplicates.
    g.forEach((c,i) => {
      if (out[i] === "correct") return;
      if ((counts[c] || 0) > 0) {
        out[i] = "present";
        counts[c]--;
      }
    });
    return out;
  }

  function drawBoard() {
    board.innerHTML = "";
    for (let r=0;r<6;r++) {
      for (let c=0;c<5;c++) {
        const tile = document.createElement("div");
        tile.className = "ff-tile";
        if (guesses[r]) {
          tile.textContent = guesses[r][c];
          tile.classList.add(score(guesses[r])[c]);
        }
        board.appendChild(tile);
      }
    }
  }

  function keyboardState() {
    const priority = {absent:1,present:2,correct:3}, state = {};
    guesses.forEach(g => score(g).forEach((s,i) => {
      const ch = g[i];
      if (!state[ch] || priority[s] > priority[state[ch]]) state[ch] = s;
    }));
    return state;
  }

  function drawKeyboard() {
    const el = $("#ff-keyboard"), state = keyboardState();
    el.innerHTML = "";
    ["QWERTYUIOP","ASDFGHJKL","ZXCVBNM"].forEach(row => {
      const wrap = document.createElement("div");
      wrap.className = "ff-key-row";
      [...row].forEach(ch => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ff-key";
        b.textContent = ch;
        if (state[ch]) b.classList.add(state[ch]);
        b.addEventListener("click", () => {
          if (!finished && input.value.length < 5) {
            input.value += ch;
            input.focus();
          }
        });
        wrap.appendChild(b);
      });
      el.appendChild(wrap);
    });
  }

  function complete(win) {
    finished = true;
    input.disabled = true;
    const stats = store.stats;

    if (!store.days[today]?.completed) {
      stats.played++;
      if (win) {
        stats.wins++;
        stats.streak++;
      } else {
        stats.streak = 0;
      }
    }

    store.days[today] = {guesses:[...guesses], completed:true, win};
    safeSave(store);

    message.textContent = win ? `Delicious — solved in ${guesses.length}!` : `Today's answer was ${answer}.`;
    $("#ff-result-icon").textContent = win ? "🎉" : "🍽️";
    $("#ff-result-title").textContent = win ? "You got it!" : "Good taste. Tough word.";
    $("#ff-answer").textContent = `Today's word: ${answer}`;
    $("#ff-fact").textContent = puzzle.fact || "";
    $("#ff-played").textContent = stats.played;
    $("#ff-win").textContent = stats.played ? `${Math.round(stats.wins/stats.played*100)}%` : "0%";
    $("#ff-streak").textContent = stats.streak;

    const cta = $("#ff-cta");
    cta.textContent = puzzle.ctaLabel || "Explore Specialty Food";
    cta.href = puzzle.ctaUrl || "https://www.specialtyfood.com/";
    result.hidden = false;
  }

  function submitGuess() {
    if (finished) return;

    const guess = input.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,5);

    if (guess.length !== 5) {
      message.textContent = "Please enter exactly five letters.";
      return;
    }

    // v1.2: reject nonsense while accepting words in the comprehensive local dictionary.
    // The day's answer is always accepted even if an editor adds a new culinary term
    // before updating dictionary.js.
    if (guess !== answer && !dictionary.has(guess)) {
      message.textContent = "Not a recognized English word. Try another five-letter word.";
      return;
    }

    guesses.push(guess);
    input.value = "";
    drawBoard();
    drawKeyboard();

    if (guess === answer) complete(true);
    else if (guesses.length >= 6) complete(false);
    else message.textContent = `${6-guesses.length} ${6-guesses.length===1?"try":"tries"} remaining.`;
  }

  form.addEventListener("submit", e => {
    e.preventDefault();
    submitGuess();
  });

  input.addEventListener("input", () => {
    input.value = input.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,5);
  });

  $("#ff-help").addEventListener("click", () => $("#ff-dialog").showModal());
  $("#ff-close").addEventListener("click", () => $("#ff-dialog").close());

  $("#ff-share").addEventListener("click", async () => {
    const grid = guesses.map(g => score(g).map(v => v==="correct"?"🟩":v==="present"?"🟨":"⬜").join("")).join("\n");
    const outcome = store.days[today]?.win ? guesses.length : "X";
    const text = `Fancy Five ${today} ${outcome}/6\n\n${grid}\n\nSpecialty Food Association`;

    if (navigator.share) {
      try { await navigator.share({title:"Fancy Five",text}); return; } catch (_) {}
    }

    const out = $("#ff-share-output");
    out.value = text;
    out.hidden = false;
    $("#ff-share-status").textContent = "Copy the results below to share.";
  });

  $("#ff-category").textContent = puzzle.category || "Specialty Food";

  const saved = store.days[today];
  if (saved?.guesses) guesses = saved.guesses.slice(0,6);

  drawBoard();
  drawKeyboard();

  if (saved?.completed) complete(Boolean(saved.win));
  else input.focus();
})();
