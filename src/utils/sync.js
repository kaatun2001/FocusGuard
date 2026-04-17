import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase.js'

const dataDoc = (uid) => doc(db, 'users', uid, 'data', 'main')
const SYNC_KEYS = ['stats', 'tasks', 'settings']

// ── Write to local storage AND push to Firestore if signed in ─────────────────
export async function syncSet(data) {
  console.log('syncSet called', Object.keys(data))
  await new Promise((res) => chrome.storage.local.set(data, res))
  const user = auth.currentUser
  if (!user) return
  if (!Object.keys(data).some((k) => SYNC_KEYS.includes(k))) return
  chrome.storage.local.get(SYNC_KEYS, async (all) => {
    try {
      await pushToCloud(all)
    } catch (e) {
      console.error('[FocusGuard] syncSet push failed', e)
    }
  })
}

// ── Push local data up to Firestore ───────────────────────────────────────────
export async function pushToCloud(data) {
  const user = auth.currentUser
  if (!user) return
  const { stats, tasks, settings } = data
  await setDoc(dataDoc(user.uid), {
    stats:    stats    ?? null,
    tasks:    tasks    ?? [],
    settings: settings ?? null,
    syncedAt: serverTimestamp(),
  })
}

// ── Pull cloud data ────────────────────────────────────────────────────────────
export async function pullFromCloud() {
  const user = auth.currentUser
  if (!user) return null
  const snap = await getDoc(dataDoc(user.uid))
  return snap.exists() ? snap.data() : null
}

// ── Push pending background writes, then pull cloud into local ────────────────
// Called every time the popup opens. Handles two cases:
//   1. Background service worker set cloudSyncPending=true after completing a
//      pomodoro while the popup was closed → push local up first so cloud has
//      the latest data before we pull.
//   2. Another browser pushed newer data → pull it down into local storage.
export function syncOnOpen() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['stats', 'tasks', 'settings', 'cloudSyncPending'], async (local) => {
      try {
        if (local.cloudSyncPending) {
          // Background wrote new stats while popup was closed — push first
          await pushToCloud({ stats: local.stats, tasks: local.tasks, settings: local.settings })
          chrome.storage.local.remove('cloudSyncPending')
        }
        // Now pull cloud and merge so this browser gets any updates from others
        const cloud = await pullFromCloud()
        if (!cloud) { resolve('ok'); return }

        const merged = _merge(local, cloud)
        chrome.storage.local.set({ stats: merged.stats, tasks: merged.tasks, settings: merged.settings })
        // Only push back if something actually changed
        if (_changed(local, merged)) await pushToCloud(merged)
        resolve('ok')
      } catch (err) {
        console.error('[FocusGuard sync] syncOnOpen error:', err)
        resolve('error')
      }
    })
  })
}

// ── Called every time the popup opens with a logged-in user ───────────────────
// Combines mergeOnLogin + syncOnOpen into one pass:
//   1. If background set cloudSyncPending, local has data cloud hasn't seen yet
//   2. Pull cloud, merge both directions, push result back
export function mergeOnLogin() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['stats', 'tasks', 'settings', 'cloudSyncPending'], async (local) => {
      try {
        const cloud = await pullFromCloud()

        if (!cloud) {
          // Brand-new account — push local data up and done
          await pushToCloud({ stats: local.stats, tasks: local.tasks, settings: local.settings })
          chrome.storage.local.remove('cloudSyncPending')
          resolve('local')
          return
        }

        // Merge local (which may include fresh background writes) with cloud
        const merged = _merge(local, cloud)
        chrome.storage.local.set({ stats: merged.stats, tasks: merged.tasks, settings: merged.settings })
        chrome.storage.local.remove('cloudSyncPending')
        await pushToCloud(merged)
        resolve('merged')
      } catch (err) {
        console.error('[FocusGuard sync] merge error:', err)
        resolve('error')
      }
    })
  })
}

// ── Shared merge logic ────────────────────────────────────────────────────────
function _merge(local, cloud) {
  const lStats = local.stats || {}
  const cStats = cloud.stats || {}

  const mergedDaily = { ...(lStats.dailyData || {}), ...(cStats.dailyData || {}) }
  for (const key of Object.keys(mergedDaily)) {
    const l = lStats.dailyData?.[key]
    const c = cStats.dailyData?.[key]
    if (l && c) {
      mergedDaily[key] = {
        pomodoros:    Math.max(l.pomodoros    || 0, c.pomodoros    || 0),
        focusMinutes: Math.max(l.focusMinutes || 0, c.focusMinutes || 0),
        distractions: Math.max(l.distractions || 0, c.distractions || 0),
      }
    }
  }

  const stats = {
    totalPomodoros:    Math.max(lStats.totalPomodoros    || 0, cStats.totalPomodoros    || 0),
    totalFocusMinutes: Math.max(lStats.totalFocusMinutes || 0, cStats.totalFocusMinutes || 0),
    currentStreak:     Math.max(lStats.currentStreak     || 0, cStats.currentStreak     || 0),
    longestStreak:     Math.max(lStats.longestStreak     || 0, cStats.longestStreak     || 0),
    lastActiveDate:    cStats.lastActiveDate || lStats.lastActiveDate || null,
    distractions:      Math.max(lStats.distractions      || 0, cStats.distractions      || 0),
    dailyData: mergedDaily,
  }

  const lTasks = local.tasks || []
  const cTasks = cloud.tasks || []
  const taskMap = new Map()
  lTasks.forEach((t) => taskMap.set(t.id, t))
  cTasks.forEach((t) => {
    const existing = taskMap.get(t.id)
    if (!existing || t.pomodorosCompleted > existing.pomodorosCompleted) taskMap.set(t.id, t)
  })

  return {
    stats,
    tasks:    Array.from(taskMap.values()),
    settings: { ...(local.settings || {}), ...(cloud.settings || {}) },
  }
}

function _changed(local, merged) {
  return (
    (local.stats?.totalPomodoros || 0)    !== merged.stats.totalPomodoros ||
    (local.stats?.totalFocusMinutes || 0) !== merged.stats.totalFocusMinutes ||
    (local.tasks?.length || 0)            !== merged.tasks.length
  )
}
