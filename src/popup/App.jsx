import { useState, useEffect, useRef } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { Cloud, CloudOff, Loader, Sun, Moon } from 'lucide-react'
import Nav from './components/Nav.jsx'
import Timer from './components/Timer.jsx'
import Tasks from './components/Tasks.jsx'
import Stats from './components/Stats.jsx'
import Settings from './components/Settings.jsx'
import AuthModal from './components/AuthModal.jsx'
import { todayKey } from '../utils/storage.js'
import { auth } from '../utils/firebase.js'
import { pushToCloud, pullFromCloud, mergeOnLogin } from '../utils/sync.js'

const SYNC_KEYS = new Set(['stats', 'tasks', 'settings'])
const SYNC_DEBOUNCE_MS = 2000

export default function App() {
  const [tab,           setTab]           = useState('timer')
  const [dailyProgress, setDailyProgress] = useState({ done: 0, goal: 8 })
  const [user,          setUser]          = useState(undefined)  // undefined = loading
  const [syncStatus,    setSyncStatus]    = useState('idle')     // idle | syncing | synced | error
  const [showAuth,      setShowAuth]      = useState(false)
  const [theme,         setTheme]         = useState('dark')
  const syncTimer = useRef(null)

  // ── Theme ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    chrome.storage.local.get(['theme'], (r) => {
      const saved = r.theme || 'dark'
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    })
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    chrome.storage.local.set({ theme: next })
  }

  // ── Auth state ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser ?? null)
      if (firebaseUser) {
        setSyncStatus('syncing')
        // Pull cloud immediately so UI reflects latest data right away,
        // then do full bidirectional merge + push.
        await pullFromCloud()
        const result = await mergeOnLogin()
        setSyncStatus(result === 'error' ? 'error' : 'synced')
        setTimeout(() => setSyncStatus('idle'), 3000)
      } else {
        setSyncStatus('idle')
      }
    })
  }, [])

  // ── Auto-sync on storage changes ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    const listener = (changes) => {
      const relevant = Object.keys(changes).some((k) => SYNC_KEYS.has(k))
      if (!relevant) return
      clearTimeout(syncTimer.current)
      setSyncStatus('syncing')
      syncTimer.current = setTimeout(async () => {
        try {
          await new Promise((res) => {
            chrome.storage.local.get(['stats', 'tasks', 'settings'], async (data) => {
              await pushToCloud(data)
              res()
            })
          })
          setSyncStatus('synced')
          setTimeout(() => setSyncStatus('idle'), 2500)
        } catch {
          setSyncStatus('error')
        }
      }, SYNC_DEBOUNCE_MS)
    }

    chrome.storage.onChanged.addListener(listener)
    return () => {
      chrome.storage.onChanged.removeListener(listener)
      clearTimeout(syncTimer.current)
    }
  }, [user])

  // ── Daily progress ───────────────────────────────────────────────────────────
  useEffect(() => {
    const load = () => {
      chrome.storage.local.get(['stats', 'settings'], (r) => {
        const today = r.stats?.dailyData?.[todayKey()]
        setDailyProgress({ done: today?.pomodoros || 0, goal: r.settings?.dailyGoal || 8 })
      })
    }
    load()
    chrome.storage.onChanged.addListener(load)
    return () => chrome.storage.onChanged.removeListener(load)
  }, [])

  const pct = Math.min(100, (dailyProgress.done / dailyProgress.goal) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 560, width: 400, position: 'relative', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '12px 16px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🛡️</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.3px' }}>FocusGuard</span>
          </div>

          {/* Right: sync + theme + progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Sync indicator */}
            <SyncIndicator
              user={user}
              syncStatus={syncStatus}
              onLoginClick={() => setShowAuth(true)}
            />

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                padding: 4, borderRadius: 6, border: 'none', background: 'none',
                color: 'var(--muted2)', cursor: 'pointer', display: 'flex',
                alignItems: 'center', transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted2)' }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Daily progress */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>
                Today: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{dailyProgress.done}</span>
                <span style={{ color: 'var(--muted)' }}>/{dailyProgress.goal} 🍅</span>
              </div>
              <div style={{ width: 100, height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%', borderRadius: 4, transition: 'width 0.4s',
                  background: pct >= 100 ? 'var(--green)' : 'var(--accent)',
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'timer'    && <Timer />}
        {tab === 'tasks'    && <Tasks />}
        {tab === 'stats'    && <Stats />}
        {tab === 'settings' && <Settings user={user} onLoginClick={() => setShowAuth(true)} />}
      </div>

      <Nav activeTab={tab} onTabChange={setTab} />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}

function SyncIndicator({ user, syncStatus, onLoginClick }) {
  const iconStyle = { cursor: 'pointer', padding: 4, borderRadius: 6, transition: 'background 0.15s' }

  if (user === undefined) {
    // Auth still loading
    return <div style={{ width: 24 }} />
  }

  if (!user) {
    return (
      <button
        title="Sign in to sync across browsers"
        onClick={onLoginClick}
        style={{ ...iconStyle, background: 'none', border: 'none', color: 'var(--muted2)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <CloudOff size={15} />
      </button>
    )
  }

  const iconColor =
    syncStatus === 'syncing' ? 'var(--blue)'  :
    syncStatus === 'synced'  ? 'var(--green)' :
    syncStatus === 'error'   ? 'var(--accent)':
    'var(--muted)'

  const title =
    syncStatus === 'syncing' ? 'Syncing…'       :
    syncStatus === 'synced'  ? 'Synced ✓'       :
    syncStatus === 'error'   ? 'Sync error'     :
    `Synced — ${user.displayName || user.email}`

  return (
    <div title={title} style={{ color: iconColor, display: 'flex', alignItems: 'center' }}>
      {syncStatus === 'syncing'
        ? <Loader size={15} style={{ animation: 'spin-slow 1s linear infinite' }} />
        : <Cloud size={15} />
      }
    </div>
  )
}
