(function () {
  const PROFILE_KEY = 'fancyFiveDemoAnalyticsProfileV1';
  const EVENTS_KEY = 'fancyFiveDemoAnalyticsEventsV1';
  const $ = (id) => document.getElementById(id);
  const START_EVENTS = new Set(['daily_puzzle_started', 'bonus_puzzle_started']);
  const SOLVED_EVENTS = new Set(['daily_puzzle_solved', 'bonus_puzzle_solved']);
  const FAILED_EVENTS = new Set(['daily_puzzle_failed', 'bonus_puzzle_failed']);
  const VISIT_EVENTS = new Set(['first_visit', 'return_visit']);

  function localDayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function readData() {
    try {
      const rawEvents = localStorage.getItem(EVENTS_KEY);
      const rawProfile = localStorage.getItem(PROFILE_KEY);
      const events = rawEvents ? JSON.parse(rawEvents) : [];
      const profile = rawProfile ? JSON.parse(rawProfile) : null;
      if (!Array.isArray(events)) {
        throw new Error('The saved analytics event log is not a list.');
      }
      return { events, profile, error: null };
    } catch (error) {
      console.error('Fancy Five demo dashboard could not read local analytics.', error);
      return { events: [], profile: null, error: 'Analytics data could not be read from this browser.' };
    }
  }

  function eventDate(event) {
    if (typeof event.localDate === 'string') {
      return event.localDate;
    }
    const timestamp = Date.parse(event.timestamp);
    return Number.isFinite(timestamp) ? localDayKey(new Date(timestamp)) : null;
  }

  function filterEvents(events, range, now = new Date()) {
    if (range === 'all') {
      return events;
    }
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    cutoff.setDate(cutoff.getDate() - Number(range) + 1);
    const minimumDay = localDayKey(cutoff);
    return events.filter((event) => {
      const day = eventDate(event);
      return day && day >= minimumDay && day <= localDayKey(now);
    });
  }

  function setMetric(id, value) {
    $(id).textContent = String(value);
  }

  function average(values) {
    const numericValues = values.filter((value) => Number.isFinite(value) && value >= 0);
    return numericValues.length
      ? numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
      : null;
  }

  function formatDuration(milliseconds) {
    if (!Number.isFinite(milliseconds)) {
      return '—';
    }
    const seconds = Math.round(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  function countUniquePlayers(events) {
    return new Set(events.map((event) => event.playerId).filter(Boolean)).size;
  }

  function setEmptyChart(id, message = 'No chart data for this period.') {
    const chart = $(id);
    chart.replaceChildren();
    const empty = document.createElement('p');
    empty.className = 'admin-chart-empty';
    empty.textContent = message;
    chart.appendChild(empty);
  }

  function renderBars(id, points, formatter = (value) => String(value)) {
    const chart = $(id);
    chart.replaceChildren();
    if (!points.length || !points.some((point) => Number.isFinite(point.value) && point.value > 0)) {
      setEmptyChart(id);
      return;
    }

    const maxValue = Math.max(...points.map((point) => point.value || 0), 1);
    points.forEach((point) => {
      const group = document.createElement('div');
      group.className = 'admin-bar-group';
      group.title = `${point.label}: ${formatter(point.value)}`;
      group.setAttribute('aria-label', group.title);

      const value = document.createElement('span');
      value.className = 'admin-bar-value';
      value.textContent = formatter(point.value);

      const bar = document.createElement('div');
      bar.className = 'admin-bar';
      bar.style.height = `${Math.max(2, Math.round((point.value / maxValue) * 100))}%`;

      const label = document.createElement('span');
      label.className = 'admin-bar-label';
      label.textContent = point.label;

      group.append(value, bar, label);
      chart.appendChild(group);
    });
  }

  function renderCategoryRows(id, entries, formatValue) {
    const container = $(id);
    container.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'admin-muted';
      empty.textContent = 'Not enough completed puzzle data yet.';
      container.appendChild(empty);
      return;
    }

    entries.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'admin-category-row';
      const name = document.createElement('span');
      name.className = 'admin-category-name';
      name.textContent = entry.category;
      const value = document.createElement('span');
      value.className = 'admin-category-value';
      value.textContent = formatValue(entry);
      row.append(name, value);
      container.appendChild(row);
    });
  }

  function getDailyLeaderboard(events) {
    const byPlayer = new Map();
    events.filter((event) => event.eventType === 'daily_puzzle_solved').forEach((event) => {
      if (!event.playerId || !event.localDate) return;
      if (!byPlayer.has(event.playerId)) {
        byPlayer.set(event.playerId, new Set());
      }
      byPlayer.get(event.playerId).add(event.localDate);
    });

    const today = localDayKey();
    return Array.from(byPlayer, ([playerId, daySet]) => {
      const days = Array.from(daySet).sort();
      const latest = days[days.length - 1];
      let currentStreak = 0;
      const daysSinceLatest = latest ? FancyFiveStorageDayDiff(latest, today) : Infinity;
      if (daysSinceLatest >= 0 && daysSinceLatest <= 1) {
        currentStreak = 1;
        for (let index = days.length - 1; index > 0; index -= 1) {
          if (FancyFiveStorageDayDiff(days[index - 1], days[index]) !== 1) break;
          currentStreak += 1;
        }
      }
      let longestStreak = 0;
      let streak = 0;
      days.forEach((day, index) => {
        streak = index > 0 && FancyFiveStorageDayDiff(days[index - 1], day) === 1 ? streak + 1 : 1;
        longestStreak = Math.max(longestStreak, streak);
      });
      return { playerId, solves: days.length, currentStreak, longestStreak };
    }).sort((a, b) => b.solves - a.solves || b.longestStreak - a.longestStreak || a.playerId.localeCompare(b.playerId)).slice(0, 10);
  }

  function FancyFiveStorageDayDiff(a, b) {
    const start = new Date(`${a}T12:00:00`);
    const end = new Date(`${b}T12:00:00`);
    return Math.round((end.getTime() - start.getTime()) / 86400000);
  }

  function renderLeaderboard(events) {
    const table = $('admin-leaderboard');
    table.replaceChildren();
    const leaderboard = getDailyLeaderboard(events);
    if (!leaderboard.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.className = 'admin-table-empty';
      cell.textContent = 'No Daily Puzzle solves recorded yet.';
      row.appendChild(cell);
      table.appendChild(row);
      return;
    }

    leaderboard.forEach((player, index) => {
      const row = document.createElement('tr');
      const values = [
        String(index + 1),
        `Player ${player.playerId.slice(-6).toUpperCase()}`,
        String(player.solves),
        String(player.currentStreak),
        String(player.longestStreak),
      ];
      values.forEach((text) => {
        const cell = document.createElement('td');
        cell.textContent = text;
        row.appendChild(cell);
      });
      table.appendChild(row);
    });
  }

  function renderCategoryInsights(events) {
    const startedByCategory = new Map();
    const resolvedByCategory = new Map();
    events.filter((event) => START_EVENTS.has(event.eventType)).forEach((event) => {
      if (!event.category) return;
      startedByCategory.set(event.category, (startedByCategory.get(event.category) || 0) + 1);
    });
    events.filter((event) => SOLVED_EVENTS.has(event.eventType) || FAILED_EVENTS.has(event.eventType)).forEach((event) => {
      if (!event.category) return;
      if (!resolvedByCategory.has(event.category)) {
        resolvedByCategory.set(event.category, { played: 0, solved: 0, guesses: [] });
      }
      const summary = resolvedByCategory.get(event.category);
      summary.played += 1;
      if (SOLVED_EVENTS.has(event.eventType)) summary.solved += 1;
      if (Number.isFinite(event.guessCount)) summary.guesses.push(event.guessCount);
    });

    const popular = Array.from(startedByCategory, ([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))
      .slice(0, 6);
    renderCategoryRows('admin-popular-categories', popular, (entry) => `${entry.count} plays`);

    const performances = Array.from(resolvedByCategory, ([category, summary]) => ({
      category,
      rate: summary.played ? summary.solved / summary.played : 0,
      played: summary.played,
      averageGuesses: average(summary.guesses),
    }));
    const eligible = performances.filter((entry) => entry.played > 0);
    const easiest = [...eligible].sort((a, b) => b.rate - a.rate || a.averageGuesses - b.averageGuesses).slice(0, 3);
    const hardest = [...eligible].sort((a, b) => a.rate - b.rate || b.averageGuesses - a.averageGuesses).slice(0, 3);
    renderCategoryRows('admin-easiest', easiest, (entry) => `${Math.round(entry.rate * 100)}% solved`);
    renderCategoryRows('admin-hardest', hardest, (entry) => `${Math.round(entry.rate * 100)}% solved`);

    const attempts = eligible
      .filter((entry) => Number.isFinite(entry.averageGuesses))
      .sort((a, b) => a.category.localeCompare(b.category));
    renderCategoryRows('admin-category-attempts', attempts, (entry) => `${entry.averageGuesses.toFixed(1)} guesses`);
    renderBars('chart-categories', popular.map((entry) => ({ label: entry.category, value: entry.count })));
  }

  function renderCharts(events, range) {
    const now = new Date();
    const pointCount = range === '7' ? 7 : range === '30' ? 30 : 14;
    const dayPoints = [];
    for (let offset = pointCount - 1; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
      const day = localDayKey(date);
      const label = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
      const onDay = events.filter((event) => eventDate(event) === day);
      const starts = onDay.filter((event) => START_EVENTS.has(event.eventType)).length;
      const solved = onDay.filter((event) => SOLVED_EVENTS.has(event.eventType)).length;
      const resolved = onDay.filter((event) => SOLVED_EVENTS.has(event.eventType) || FAILED_EVENTS.has(event.eventType)).length;
      const bonus = onDay.filter((event) => event.eventType === 'bonus_puzzle_started').length;
      dayPoints.push({
        label,
        starts,
        solved,
        rate: starts ? Math.round((solved / starts) * 100) : 0,
        bonus,
        resolved,
      });
    }

    renderBars('chart-played', dayPoints.map((point) => ({ label: point.label, value: point.starts })));
    renderBars('chart-solved', dayPoints.map((point) => ({ label: point.label, value: point.solved })));
    renderBars('chart-rate', dayPoints.map((point) => ({ label: point.label, value: point.rate })), (value) => `${value}%`);
    renderBars('chart-bonus', dayPoints.map((point) => ({ label: point.label, value: point.bonus })));
  }

  function render() {
    const data = readData();
    const range = $('admin-range').value;
    const now = new Date();
    const allEvents = data.events;
    const events = filterEvents(allEvents, range, now);
    const visits = events.filter((event) => VISIT_EVENTS.has(event.eventType));
    const starts = events.filter((event) => START_EVENTS.has(event.eventType));
    const solved = events.filter((event) => SOLVED_EVENTS.has(event.eventType));
    const guessesAverage = average(solved.map((event) => event.guessCount));
    const timeAverage = average(solved.map((event) => event.timeToSolveMs));
    const playersToday = countUniquePlayers(filterEvents(allEvents, '1', now));
    const playersSevenDays = countUniquePlayers(filterEvents(allEvents, '7', now));
    const playersThirtyDays = countUniquePlayers(filterEvents(allEvents, '30', now));
    const totalSolved = solved.length;
    const totalStarted = starts.length;
    const rate = totalStarted ? Math.round((totalSolved / totalStarted) * 100) : 0;
    const lastEvent = allEvents.length ? allEvents[allEvents.length - 1] : null;
    const lastEventTime = lastEvent && Date.parse(lastEvent.timestamp);

    $('admin-storage-warning').hidden = !data.error;
    $('admin-storage-warning').textContent = data.error || '';
    $('admin-empty').hidden = Boolean(data.error) || allEvents.length > 0;
    $('admin-updated').textContent = data.error
      ? 'Dashboard could not load local demo analytics.'
      : `${allEvents.length} anonymous events stored in this browser${Number.isFinite(lastEventTime) ? ` · Latest event ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(lastEventTime)}` : ''}`;

    setMetric('metric-players', countUniquePlayers(visits));
    setMetric('metric-new', countUniquePlayers(visits.filter((event) => event.eventType === 'first_visit')));
    setMetric('metric-returning', countUniquePlayers(visits.filter((event) => event.eventType === 'return_visit')));
    setMetric('metric-visits', visits.length);
    setMetric('metric-played', totalStarted);
    setMetric('metric-solved', totalSolved);
    setMetric('metric-rate', `${rate}%`);
    setMetric('metric-guesses', guessesAverage === null ? '—' : guessesAverage.toFixed(1));
    setMetric('metric-time', formatDuration(timeAverage));
    setMetric('metric-bonus', events.filter((event) => event.eventType === 'bonus_puzzle_started').length);
    setMetric('metric-shares', events.filter((event) => event.eventType === 'share_results_clicked').length);
    setMetric('metric-active-today', playersToday);
    setMetric('metric-active-7', playersSevenDays);
    setMetric('metric-active-30', playersThirtyDays);

    renderCategoryInsights(events);
    renderCharts(events, range);
    renderLeaderboard(allEvents);
  }

  $('admin-range').addEventListener('change', render);
  render();
})();
