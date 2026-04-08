import {
  DEFAULT_SETTINGS, DEFAULT_TIMER, DEFAULT_STATS,
  storageGet, storageSet, todayKey,
  getDurationForMode, getNextMode, formatTime,
} from '../utils/storage.js'

// ── Install ────────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
  const data = await storageGet(['settings', 'timerState', 'stats', 'tasks', 'activeTaskId'])
  const updates = {}
  if (!data.settings) updates.settings = { ...DEFAULT_SETTINGS }
  if (!data.timerState) updates.timerState = { ...DEFAULT_TIMER }
  if (!data.stats) updates.stats = { ...DEFAULT_STATS }
  if (!data.tasks) updates.tasks = []
  if (data.activeTaskId === undefined) updates.activeTaskId = null
  if (Object.keys(updates).length) await storageSet(updates)
  updateBadge('idle', false, 0)
})

// ── Alarms ─────────────────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'timerComplete') await handleComplete()
  if (alarm.name === 'badgeUpdate') await updateBadgeFromStorage()
})

// ── Messages ───────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handleMessage(msg).then(sendResponse)
  return true
})

async function handleMessage(msg) {
  const { timerState, settings } = await storageGet(['timerState', 'settings'])
  const cfg = settings || DEFAULT_SETTINGS
  const state = timerState || { ...DEFAULT_TIMER }

  switch (msg.type) {
    case 'START_TIMER': {
      if (state.isRunning) return { ok: false }
      const mode = state.mode === 'idle' ? 'focus' : state.mode
      const timeLeft = state.mode === 'idle' ? cfg.focusDuration * 60 : state.timeLeft
      const now = Date.now()
      const newState = { ...state, mode, isRunning: true, startTime: now, timeLeft }
      await storageSet({ timerState: newState })
      chrome.alarms.create('timerComplete', { delayInMinutes: timeLeft / 60 })
      chrome.alarms.create('badgeUpdate', { periodInMinutes: 1 })
      updateBadge(mode, true, timeLeft)
      return { ok: true }
    }

    case 'PAUSE_TIMER': {
      if (!state.isRunning) return { ok: false }
      const elapsed = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0
      const remaining = Math.max(0, state.timeLeft - elapsed)
      const newState = { ...state, isRunning: false, startTime: null, timeLeft: remaining }
      await storageSet({ timerState: newState })
      chrome.alarms.clear('timerComplete')
      chrome.alarms.clear('badgeUpdate')
      updateBadge(state.mode, false, remaining)
      return { ok: true }
    }

    case 'RESET_TIMER': {
      chrome.alarms.clear('timerComplete')
      chrome.alarms.clear('badgeUpdate')
      const newState = { ...DEFAULT_TIMER, timeLeft: cfg.focusDuration * 60 }
      await storageSet({ timerState: newState })
      updateBadge('idle', false, 0)
      return { ok: true }
    }

    case 'SKIP_TIMER': {
      chrome.alarms.clear('timerComplete')
      chrome.alarms.clear('badgeUpdate')
      const { mode: nextMode, session: nextSession } = getNextMode(state.mode, state.session, cfg)
      const nextTimeLeft = getDurationForMode(nextMode, cfg)
      const newState = { mode: nextMode, isRunning: false, startTime: null, timeLeft: nextTimeLeft, session: nextSession }
      await storageSet({ timerState: newState })
      updateBadge(nextMode, false, nextTimeLeft)
      return { ok: true }
    }

    default:
      return { ok: false }
  }
}

// ── Timer complete handler ─────────────────────────────────────────────────────
async function handleComplete() {
  const { timerState, settings, stats, tasks, activeTaskId } = await storageGet([
    'timerState', 'settings', 'stats', 'tasks', 'activeTaskId',
  ])
  if (!timerState?.isRunning) return

  const cfg = settings || DEFAULT_SETTINGS
  const currentMode = timerState.mode
  let newStats = { ...(stats || DEFAULT_STATS) }
  let newTasks = [...(tasks || [])]

  // ── Update stats for completed focus session
  if (currentMode === 'focus') {
    const focusMinutes = cfg.focusDuration
    newStats.totalPomodoros += 1
    newStats.totalFocusMinutes += focusMinutes

    const key = todayKey()
    const day = newStats.dailyData[key] || { pomodoros: 0, focusMinutes: 0, distractions: 0 }
    newStats.dailyData[key] = { ...day, pomodoros: day.pomodoros + 1, focusMinutes: day.focusMinutes + focusMinutes }

    // Streak
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yKey = yesterday.toISOString().split('T')[0]
    if (newStats.lastActiveDate === yKey) {
      newStats.currentStreak += 1
    } else if (newStats.lastActiveDate !== key) {
      newStats.currentStreak = 1
    }
    newStats.longestStreak = Math.max(newStats.longestStreak || 0, newStats.currentStreak)
    newStats.lastActiveDate = key

    // Increment active task pomodoros
    if (activeTaskId) {
      newTasks = newTasks.map((t) =>
        t.id === activeTaskId ? { ...t, pomodorosCompleted: t.pomodorosCompleted + 1 } : t
      )
    }
  }

  // ── Determine next mode
  const { mode: nextMode, session: nextSession } = getNextMode(currentMode, timerState.session, cfg)
  const nextTimeLeft = getDurationForMode(nextMode, cfg)

  // ── Auto-start logic
  const shouldAutoStart =
    (nextMode !== 'focus' && cfg.autoStartBreaks) ||
    (nextMode === 'focus' && cfg.autoStartFocus)

  const newTimerState = {
    mode: nextMode,
    isRunning: shouldAutoStart,
    startTime: shouldAutoStart ? Date.now() : null,
    timeLeft: nextTimeLeft,
    session: nextSession,
  }

  await storageSet({ timerState: newTimerState, stats: newStats, tasks: newTasks, cloudSyncPending: true })

  if (shouldAutoStart) {
    chrome.alarms.create('timerComplete', { delayInMinutes: nextTimeLeft / 60 })
    chrome.alarms.create('badgeUpdate', { periodInMinutes: 1 })
  } else {
    chrome.alarms.clear('badgeUpdate')
  }

  updateBadge(nextMode, shouldAutoStart, nextTimeLeft)

  // ── Sound
  if (cfg.soundEnabled) {
    await playSound(currentMode === 'focus' ? 'focus_complete' : 'break_complete', cfg.soundVolume)
  }

  // ── Notification
  if (cfg.notificationsEnabled) {
    const activeTask = newTasks.find((t) => t.id === activeTaskId)
    const messages = {
      focus: `🍅 Focus session complete!${activeTask ? ` "${activeTask.title}"` : ''} Time for a break.`,
      shortBreak: '☕ Break over! Ready to focus?',
      longBreak: '🌿 Long break over! Let\'s go again.',
    }
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'FocusGuard',
      message: messages[currentMode] || 'Session complete!',
      silent: cfg.soundEnabled, // suppress system sound if we play our own
    })
  }
}

// ── Website blocking ───────────────────────────────────────────────────────────
chrome.webNavigation.onBeforeNavigate.addListener(
  async (details) => {
    if (details.frameId !== 0) return
    const { timerState, settings } = await storageGet(['timerState', 'settings'])
    if (!timerState?.isRunning || timerState.mode !== 'focus') return
    if (!settings?.blockingEnabled) return

    try {
      const url = new URL(details.url)
      const hostname = url.hostname.replace(/^www\./, '')
      const isBlocked = settings.blockedSites.some(
        (s) => hostname === s || hostname.endsWith('.' + s)
      )
      if (!isBlocked) return

      // Log distraction
      const { stats } = await storageGet(['stats'])
      const s = stats || DEFAULT_STATS
      const key = todayKey()
      const day = s.dailyData[key] || { pomodoros: 0, focusMinutes: 0, distractions: 0 }
      await storageSet({
        cloudSyncPending: true,
        stats: {
          ...s,
          distractions: s.distractions + 1,
          dailyData: { ...s.dailyData, [key]: { ...day, distractions: (day.distractions || 0) + 1 } },
        }
      })

      const blockedUrl = `${chrome.runtime.getURL('blocked.html')}?site=${encodeURIComponent(details.url)}`
      chrome.tabs.update(details.tabId, { url: blockedUrl })
    } catch (_) {}
  },
  { url: [{ schemes: ['http', 'https'] }] }
)

// ── Badge helpers ──────────────────────────────────────────────────────────────
function updateBadge(mode, running, timeLeftSeconds) {
  const colors = { focus: '#f85149', shortBreak: '#3fb950', longBreak: '#58a6ff', idle: '#6e7681' }
  chrome.action.setBadgeBackgroundColor({ color: colors[mode] || '#6e7681' })

  if (!running || timeLeftSeconds <= 0) {
    const labels = { focus: '⏸', shortBreak: 'B', longBreak: 'LB', idle: '' }
    chrome.action.setBadgeText({ text: labels[mode] ?? '' })
  } else {
    const mins = Math.ceil(timeLeftSeconds / 60)
    chrome.action.setBadgeText({ text: `${mins}m` })
  }
}

async function updateBadgeFromStorage() {
  const { timerState } = await storageGet(['timerState'])
  if (!timerState) return
  const { getTimeLeft } = await import('../utils/storage.js')
  const tl = getTimeLeft(timerState)
  updateBadge(timerState.mode, timerState.isRunning, tl)
}

// ── Audio via offscreen document ───────────────────────────────────────────────
async function playSound(type, volume = 0.7) {
  try {
    const existing = await chrome.offscreen.hasDocument?.()
    if (!existing) {
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('offscreen.html'),
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Play timer completion chime',
      })
    }
    await chrome.runtime.sendMessage({ target: 'offscreen', type: 'PLAY_SOUND', sound: type, volume })
    // Close after audio finishes
    setTimeout(() => chrome.offscreen.closeDocument?.().catch(() => {}), 3000)
  } catch (e) {
    console.warn('Sound error:', e)
  }
}
