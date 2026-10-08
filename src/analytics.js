(function () {
  const PROFILE_KEY = 'fancyFiveDemoAnalyticsProfileV1';
  const EVENTS_KEY = 'fancyFiveDemoAnalyticsEventsV1';
  const SESSION_KEY = 'fancyFiveDemoAnalyticsSessionV1';
  const MAX_EVENTS = 10000;

  function localDayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function makeId(prefix) {
    const bytes = new Uint8Array(8);
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }
    return `${prefix}-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }

  function readJson(key, fallback) {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw);
  }

  let profile;
  let sessionId;
  let storageError = null;

  try {
    const now = new Date();
    profile = readJson(PROFILE_KEY, null);
    const firstVisit = !profile;
    if (!profile || typeof profile.playerId !== 'string') {
      profile = {
        playerId: makeId('P'),
        firstVisitAt: now.toISOString(),
        visits: 0,
      };
    }

    sessionId = window.sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = makeId('S');
      window.sessionStorage.setItem(SESSION_KEY, sessionId);
    }

    profile.visits = (Number(profile.visits) || 0) + 1;
    profile.lastVisitAt = now.toISOString();
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    window.FancyFiveAnalytics = {
      track,
      getData,
      getStatus,
      localDayKey,
    };

    track(firstVisit ? 'first_visit' : 'return_visit', {
      completionStatus: 'not_applicable',
      puzzleMode: 'site',
    });
  } catch (error) {
    storageError = error;
    console.error('Fancy Five demo analytics could not initialize local storage.', error);
    window.FancyFiveAnalytics = {
      track() {
        return false;
      },
      getData() {
        return { profile: null, events: [] };
      },
      getStatus() {
        return { available: false, message: 'Local analytics could not initialize in this browser.' };
      },
      localDayKey,
    };
  }

  function track(eventType, details = {}) {
    if (!profile || storageError) {
      return false;
    }

    try {
      const events = readJson(EVENTS_KEY, []);
      if (!Array.isArray(events)) {
        throw new Error('The stored analytics event log is not an array.');
      }

      const event = {
        eventId: makeId('E'),
        eventType,
        playerId: profile.playerId,
        sessionId,
        timestamp: new Date().toISOString(),
        localDate: localDayKey(),
        category: typeof details.category === 'string' ? details.category : null,
        guessCount: Number.isFinite(details.guessCount) ? details.guessCount : null,
        completionStatus: typeof details.completionStatus === 'string' ? details.completionStatus : null,
        puzzleMode: typeof details.puzzleMode === 'string' ? details.puzzleMode : null,
        puzzleDate: typeof details.puzzleDate === 'string' ? details.puzzleDate : null,
        puzzleId: typeof details.puzzleId === 'string' ? details.puzzleId : null,
        bonusNumber: Number.isFinite(details.bonusNumber) ? details.bonusNumber : null,
        timeToSolveMs: Number.isFinite(details.timeToSolveMs) ? details.timeToSolveMs : null,
      };
      events.push(event);
      window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
      return true;
    } catch (error) {
      storageError = error;
      console.error('Fancy Five demo analytics event could not be saved.', error);
      return false;
    }
  }

  function getData() {
    if (storageError) {
      return { profile: null, events: [] };
    }
    try {
      const events = readJson(EVENTS_KEY, []);
      if (!Array.isArray(events)) {
        throw new Error('The stored analytics event log is not an array.');
      }
      return { profile, events };
    } catch (error) {
      storageError = error;
      console.error('Fancy Five demo analytics data could not be read.', error);
      return { profile: null, events: [] };
    }
  }

  function getStatus() {
    if (storageError) {
      return { available: false, message: 'Local analytics could not be read or saved in this browser.' };
    }
    try {
      window.localStorage.getItem(PROFILE_KEY);
      return { available: true, message: '' };
    } catch (error) {
      storageError = error;
      console.error('Fancy Five demo analytics storage is unavailable.', error);
      return { available: false, message: 'Local analytics storage is unavailable in this browser.' };
    }
  }
})();
