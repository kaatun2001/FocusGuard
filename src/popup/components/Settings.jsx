import { useState, useEffect, useCallback, memo } from 'react'
import { Plus, X, Trash2, LogIn, LogOut, RefreshCw, Loader } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../../utils/firebase.js'
import { pushToCloud, syncSet } from '../../utils/sync.js'
import { DEFAULT_SETTINGS } from '../../utils/storage.js'

export default function Settings({ user, onLoginClick }) {
  const [settings,   setSettings]   = useState(DEFAULT_SETTINGS)
  const [toast,      setToast]      = useState('')
  const [syncingNow, setSyncingNow] = useState(false)
  const [timerState, setTimerState] = useState(null)

  const focusLocked  = !!(timerState?.isRunning && timerState?.mode === 'focus')
  const strictLocked = !!(focusLocked && settings.strictMode)

  useEffect(() => {
    chrome.storage.local.get(['settings', 'timerState'], (r) => {
      if (r.settings) setSettings({ ...DEFAULT_SETTINGS, ...r.settings })
      if (r.timerState) setTimerState(r.timerState)
    })
    const listener = (c) => {
      if (c.settings)    setSettings({ ...DEFAULT_SETTINGS, ...c.settings.newValue })
      if (c.timerState)  setTimerState(c.timerState.newValue)
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const save = (patch) => {
    const updated = { ...settings, ...patch }
    syncSet({ settings: updated })
    setSettings(updated)
    showToast('Saved ✓')
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 1800)
  }

  // useCallback keeps the reference stable across Settings re-renders so the
  // memoised AddSiteInput child never unmounts/remounts and the input keeps focus.
  const addSite = useCallback((raw) => {
    const site = raw.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
    if (!site) return false
    // Read fresh blocked list from storage to avoid stale closure
    chrome.storage.local.get(['settings'], (r) => {
      const current = r.settings || DEFAULT_SETTINGS
      if (current.blockedSites.includes(site)) return
      const updated = { ...current, blockedSites: [...current.blockedSites, site] }
      syncSet({ settings: updated })
    })
    return true  // signal to child to clear input
  }, [])

  const removeSite = (site) => save({ blockedSites: settings.blockedSites.filter((s) => s !== site) })

  const resetStats = () => {
    if (!confirm('Reset all statistics? This cannot be undone.')) return
    chrome.storage.local.set({
      stats: { totalPomodoros: 0, totalFocusMinutes: 0, currentStreak: 0, longestStreak: 0, lastActiveDate: null, distractions: 0, dailyData: {} }
    })
    showToast('Stats reset ✓')
  }

  const handleSyncNow = async () => {
    if (!user) return
    setSyncingNow(true)
    try {
      await new Promise((res) => {
        chrome.storage.local.get(['stats', 'tasks', 'settings'], async (data) => {
          await pushToCloud(data)
          res()
        })
      })
      showToast('Synced ✓')
    } catch {
      showToast('Sync failed ✗')
    } finally {
      setSyncingNow(false)
    }
  }

  const handleSignOut = async () => {
    await signOut(auth)
    showToast('Signed out')
  }

  const Section = ({ icon, title, children }) => (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
        <span>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{title}</span>
      </div>
      {children}
    </div>
  )

  const Row = ({ label, sublabel, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text)' }}>{label}</div>
        {sublabel && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{sublabel}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )

  const NumberInput = ({ value, onChange, min = 1, max = 120 }) => {
    const [local, setLocal] = useState(value)
    // Sync if the stored value changes externally (e.g. cloud sync)
    useEffect(() => { setLocal(value) }, [value])
    const commit = (raw) => {
      const clamped = Math.max(min, Math.min(max, Number(raw) || min))
      setLocal(clamped)
      onChange(clamped)
    }
    return (
      <input
        type="number" min={min} max={max} value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && commit(e.target.value)}
        className="input"
        style={{ width: 54, textAlign: 'center', padding: '5px 6px' }}
      />
    )
  }

  return (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Account & Sync */}
      <Section icon="☁️" title="Account & Sync">
        {user ? (
          <>
            {/* User info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {user.photoURL
                ? <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)' }} />
                : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                    {(user.displayName || user.email || '?')[0].toUpperCase()}
                  </div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                {user.displayName && <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.displayName}</div>}
                <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={handleSyncNow}
                disabled={syncingNow}
                className="btn btn-ghost"
                style={{ flex: 1, fontSize: 12, padding: '7px', opacity: syncingNow ? 0.6 : 1 }}
              >
                {syncingNow
                  ? <><Loader size={12} style={{ animation: 'spin-slow 1s linear infinite' }} /> Syncing…</>
                  : <><RefreshCw size={12} /> Sync Now</>
                }
              </button>
              <button
                onClick={handleSignOut}
                className="btn btn-ghost"
                style={{ flex: 1, fontSize: 12, padding: '7px', color: 'var(--muted)' }}
              >
                <LogOut size={12} /> Sign Out
              </button>
            </div>

            <p style={{ fontSize: 11, color: 'var(--muted2)', margin: 0, lineHeight: 1.5 }}>
              Your data syncs automatically across browsers whenever something changes.
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
              Sign in to sync your stats, tasks, and settings across all your browsers. Your local data is kept even without an account.
            </p>
            <button
              onClick={onLoginClick}
              className="btn btn-primary"
              style={{ width: '100%', fontSize: 13, padding: '10px' }}
            >
              <LogIn size={14} /> Sign In / Create Account
            </button>
          </>
        )}
      </Section>

      {/* Timer */}
      <Section icon="⏱️" title="Timer">
        <Row label="Focus duration" sublabel="minutes per session">
          <NumberInput value={settings.focusDuration} onChange={(v) => save({ focusDuration: v })} min={1} max={60} />
        </Row>
        <Row label="Short break" sublabel="minutes">
          <NumberInput value={settings.shortBreak} onChange={(v) => save({ shortBreak: v })} min={1} max={30} />
        </Row>
        <Row label="Long break" sublabel="minutes">
          <NumberInput value={settings.longBreak} onChange={(v) => save({ longBreak: v })} min={1} max={60} />
        </Row>
        <Row label="Sessions before long break">
          <NumberInput value={settings.sessionsBeforeLong} onChange={(v) => save({ sessionsBeforeLong: v })} min={1} max={10} />
        </Row>
      </Section>

      {/* Automation */}
      <Section icon="⚡" title="Automation">
        <Row label="Auto-start breaks" sublabel="Begin break immediately after focus">
          <button className={`toggle ${settings.autoStartBreaks ? 'active' : ''}`} onClick={() => save({ autoStartBreaks: !settings.autoStartBreaks })} />
        </Row>
        <Row label="Auto-start focus" sublabel="Begin focus after a break ends">
          <button className={`toggle ${settings.autoStartFocus ? 'active' : ''}`} onClick={() => save({ autoStartFocus: !settings.autoStartFocus })} />
        </Row>
        <Row label="Daily goal" sublabel="Pomodoros per day target">
          <NumberInput value={settings.dailyGoal} onChange={(v) => save({ dailyGoal: v })} min={1} max={50} />
        </Row>
        <div>
          <Row label="🔒 Strict Mode" sublabel="Lock timer during focus — no pausing or resetting">
            <button
              className={`toggle ${settings.strictMode ? 'active' : ''}`}
              onClick={() => !strictLocked && save({ strictMode: !settings.strictMode })}
              style={{ opacity: strictLocked ? 0.5 : 1, cursor: strictLocked ? 'not-allowed' : 'pointer' }}
            />
          </Row>
          {strictLocked && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
              🔒 Cannot disable during focus session
            </div>
          )}
        </div>
      </Section>

      {/* Sound & Notifications */}
      <Section icon="🔔" title="Alerts">
        <Row label="Sound alerts" sublabel="Chime when session ends">
          <button className={`toggle ${settings.soundEnabled ? 'active' : ''}`} onClick={() => save({ soundEnabled: !settings.soundEnabled })} />
        </Row>
        {settings.soundEnabled && (
          <Row label="Volume">
            <input
              type="range" min={0} max={1} step={0.05}
              value={settings.soundVolume}
              onChange={(e) => save({ soundVolume: Number(e.target.value) })}
              style={{ width: 90, accentColor: 'var(--accent)' }}
            />
          </Row>
        )}
        <Row label="Notifications" sublabel="Browser popups on completion">
          <button className={`toggle ${settings.notificationsEnabled ? 'active' : ''}`} onClick={() => save({ notificationsEnabled: !settings.notificationsEnabled })} />
        </Row>
      </Section>

      {/* Website blocking */}
      <Section icon="🚫" title="Website Blocking">
        <AddSiteInput onAdd={addSite} disabled={focusLocked} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 130, overflowY: 'auto' }}>
          {settings.blockedSites.map((site) => (
            <div key={site} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg)', borderRadius: 7, padding: '6px 10px',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text)' }}>🚫 {site}</span>
              {!focusLocked && (
                <button onClick={() => removeSite(site)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2 }}>
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        {focusLocked && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            🔒 Cannot edit blocked sites during focus session
          </div>
        )}
      </Section>

      {/* Danger zone */}
      <div className="card" style={{ borderColor: 'rgba(248,81,73,0.3)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>⚠️ Danger Zone</div>
        <button
          onClick={resetStats}
          className="btn btn-ghost"
          style={{ borderColor: 'var(--accent)', color: 'var(--accent)', fontSize: 12, width: '100%' }}
        >
          <Trash2 size={13} /> Reset All Statistics
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '7px 16px', fontSize: 12, color: 'var(--green)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ── Isolated input component ───────────────────────────────────────────────────
// Wrapped in memo so it NEVER re-renders when Settings re-renders due to
// chrome.storage.onChanged. The input keeps focus while the user types.
const AddSiteInput = memo(function AddSiteInput({ onAdd, disabled }) {
  const [value, setValue] = useState('')

  const submit = () => {
    if (disabled) return
    const added = onAdd(value)
    if (added !== false) setValue('')
  }

  return (
    <div style={{ display: 'flex', gap: 6, opacity: disabled ? 0.5 : 1 }}>
      <input
        className="input"
        type="text"
        value={value}
        onChange={(e) => !disabled && setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. twitter.com"
        disabled={disabled}
        style={{ flex: 1, padding: '6px 10px', fontSize: 12, cursor: disabled ? 'not-allowed' : 'text' }}
      />
      <button
        className="btn btn-primary"
        style={{ padding: '6px 10px', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
        onClick={submit}
        disabled={disabled}
      >
        <Plus size={14} />
      </button>
    </div>
  )
})
