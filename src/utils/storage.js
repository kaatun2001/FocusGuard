export const DEFAULT_SETTINGS = {
  focusDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  sessionsBeforeLong: 4,
  blockedSites: [
    'youtube.com', 'instagram.com', 'facebook.com',
    'twitter.com', 'x.com', 'tiktok.com',
    'reddit.com', 'netflix.com', 'twitch.tv',
  ],
  blockingEnabled: true,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  soundVolume: 0.7,
  dailyGoal: 8,
  notificationsEnabled: true,
  strictMode: false,
}

export const DEFAULT_TIMER = {
  mode: 'idle',         // idle | focus | shortBreak | longBreak
  isRunning: false,
  startTime: null,      // Date.now() when started/resumed
  timeLeft: 25 * 60,   // seconds left (snapshot when paused)
  session: 1,           // 1–4
}

export const DEFAULT_STATS = {
  totalPomodoros: 0,
  totalFocusMinutes: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  distractions: 0,
  dailyData: {},        // { 'YYYY-MM-DD': { pomodoros, focusMinutes, distractions } }
}

// ── Time helpers ───────────────────────────────────────────────────────────────

export function getTimeLeft(timerState) {
  if (!timerState) return DEFAULT_SETTINGS.focusDuration * 60
  if (!timerState.isRunning || !timerState.startTime) return timerState.timeLeft
  const elapsed = Math.floor((Date.now() - timerState.startTime) / 1000)
  return Math.max(0, timerState.timeLeft - elapsed)
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function todayKey() {
  return new Date().toISOString().split('T')[0]
}

export function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

export function getLast28Days() {
  return Array.from({ length: 28 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (27 - i))
    return d.toISOString().split('T')[0]
  })
}

export function getDayLabel(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
}

// ── Chrome storage helpers ─────────────────────────────────────────────────────

export const storageGet = (keys) =>
  new Promise((res) => chrome.storage.local.get(keys, res))

export const storageSet = (data) =>
  new Promise((res) => chrome.storage.local.set(data, res))

// ── Mode helpers ───────────────────────────────────────────────────────────────

export function getDurationForMode(mode, settings) {
  const s = settings || DEFAULT_SETTINGS
  if (mode === 'shortBreak') return s.shortBreak * 60
  if (mode === 'longBreak') return s.longBreak * 60
  return s.focusDuration * 60
}

export function getNextMode(currentMode, session, settings) {
  const s = settings || DEFAULT_SETTINGS
  if (currentMode === 'focus') {
    if (session >= s.sessionsBeforeLong) return { mode: 'longBreak', session: 1 }
    return { mode: 'shortBreak', session: session + 1 }
  }
  return { mode: 'focus', session }
}
