(function () {
  const api = window.FancyFiveStorage || {};

  api.loadStore = function loadStore(storageKey, fallback) {
    const defaults = {
      days: {},
      stats: {
        played: 0,
        wins: 0,
        currentStreak: 0,
        maxStreak: 0,
        lastWinDate: null,
      },
    };

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return {
          days: fallback.days || defaults.days,
          stats: Object.assign({}, defaults.stats, fallback.stats || {}),
        };
      }

      const parsed = JSON.parse(raw);
      return {
        days: parsed.days || {},
        stats: Object.assign({}, defaults.stats, parsed.stats || {}),
      };
    } catch (error) {
      return {
        days: fallback.days || defaults.days,
        stats: Object.assign({}, defaults.stats, fallback.stats || {}),
      };
    }
  };

  api.saveStore = function saveStore(storageKey, store) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(store));
    } catch (error) {
      // Ignore storage quota or browser privacy issues.
    }
  };

  api.dayDiff = function dayDiff(a, b) {
    if (!a || !b) {
      return null;
    }

    const start = new Date(a + 'T12:00:00');
    const end = new Date(b + 'T12:00:00');
    return Math.round((end - start) / 86400000);
  };

  window.FancyFiveStorage = api;
})();
