import { useState, useEffect, useCallback } from 'react'
import { Play, Pause, RotateCcw, SkipForward, ChevronDown, Zap } from 'lucide-react'
import { getTimeLeft, formatTime, getDurationForMode } from '../../utils/storage.js'

const MODES = {
  idle:       { label: 'Ready',       color: '#7d8590', bg: 'rgba(125,133,144,0.1)' },
  focus:      { label: 'Focus Time',  color: '#f85149', bg: 'rgba(248,81,73,0.12)'  },
  shortBreak: { label: 'Short Break', color: '#3fb950', bg: 'rgba(63,185,80,0.12)'  },
  longBreak:  { label: 'Long Break',  color: '#58a6ff', bg: 'rgba(88,166,255,0.12)' },
}

export default function Timer() {
  const [timerState, setTimerState]   = useState(null)
  const [timeLeft, setTimeLeft]       = useState(25 * 60)
  const [tasks, setTasks]             = useState([])
  const [activeTaskId, setActiveTaskId] = useState(null)
  const [settings, setSettings]       = useState(null)
  const [showPicker, setShowPicker]   = useState(false)

  // Load from storage
  useEffect(() => {
    chrome.storage.local.get(['timerState', 'tasks', 'activeTaskId', 'settings'], (r) => {
      if (r.timerState)  setTimerState(r.timerState)
      if (r.tasks)       setTasks(r.tasks)
      if (r.settings)    setSettings(r.settings)
      setActiveTaskId(r.activeTaskId ?? null)
    })
    const listener = (changes) => {
      if (changes.timerState)  setTimerState(changes.timerState.newValue)
      if (changes.tasks)       setTasks(changes.tasks.newValue || [])
      if (changes.settings)    setSettings(changes.settings.newValue)
      if (changes.activeTaskId !== undefined) setActiveTaskId(changes.activeTaskId.newValue)
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  // Update display every 500ms
  useEffect(() => {
    const iv = setInterval(() => {
      if (timerState) setTimeLeft(getTimeLeft(timerState))
    }, 500)
    return () => clearInterval(iv)
  }, [timerState])

  // Keyboard shortcuts: Space = play/pause, R = reset, S = skip
  const send = useCallback((type) => chrome.runtime.sendMessage({ type }), [])
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (e.code === 'Space') { e.preventDefault(); send(isRunning ? 'PAUSE_TIMER' : 'START_TIMER') }
      if (e.code === 'KeyR')  send('RESET_TIMER')
      if (e.code === 'KeyS')  send('SKIP_TIMER')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [send, timerState])

  const mode      = timerState?.mode || 'idle'
  const isRunning = timerState?.isRunning || false
  const session   = timerState?.session || 1
  const modeInfo  = MODES[mode] || MODES.idle
  const sessionsBeforeLong = settings?.sessionsBeforeLong || 4
  const totalSeconds = getDurationForMode(mode === 'idle' ? 'focus' : mode, settings)
  const progress = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 100

  // SVG ring
  const R = 88
  const C = 2 * Math.PI * R
  const dash = (progress / 100) * C

  const activeTask   = tasks.find((t) => t.id === activeTaskId)
  const pendingTasks = tasks.filter((t) => !t.completed)

  const selectTask = (id) => {
    chrome.storage.local.set({ activeTaskId: id })
    setActiveTaskId(id)
    setShowPicker(false)
  }

  return (
    <div style={{ padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', borderRadius: 10, padding: 3, width: '100%' }}>
        {['focus', 'shortBreak', 'longBreak'].map((m) => (
          <div
            key={m}
            style={{
              flex: 1, textAlign: 'center', padding: '5px 4px',
              borderRadius: 8, fontSize: 11, fontWeight: 500,
              cursor: 'default',
              background: mode === m ? modeInfo.bg : 'transparent',
              color: mode === m ? modeInfo.color : 'var(--muted)',
              transition: 'all 0.2s',
            }}
          >
            {m === 'focus' ? '🍅 Focus' : m === 'shortBreak' ? '☕ Short' : '🌿 Long'}
          </div>
        ))}
      </div>

      {/* Circle timer */}
      <div style={{ position: 'relative', width: 210, height: 210 }}>
        <svg width="210" height="210" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
          <circle cx="105" cy="105" r={R} fill="none" stroke="var(--surface)" strokeWidth="12" />
          <circle
            cx="105" cy="105" r={R} fill="none"
            stroke={modeInfo.color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${dash} ${C}`}
            style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.3s' }}
          />
        </svg>
        {/* Glow when running */}
        {isRunning && (
          <div style={{
            position: 'absolute', inset: 20, borderRadius: '50%',
            boxShadow: `0 0 30px ${modeInfo.color}40`,
            pointerEvents: 'none',
          }} />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 42, fontWeight: 700, letterSpacing: -2, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
            {formatTime(timeLeft)}
          </span>
          <span style={{ fontSize: 11, color: modeInfo.color, fontWeight: 500, marginTop: 2 }}>
            {modeInfo.label}
          </span>
          {isRunning && (
            <span style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>
              Space to pause
            </span>
          )}
        </div>
      </div>

      {/* Session dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {Array.from({ length: sessionsBeforeLong }).map((_, i) => (
          <div key={i} style={{
            width: i === session - 1 && mode === 'focus' ? 20 : 8,
            height: 8,
            borderRadius: 4,
            background: i < session - 1 ? 'var(--accent)' : i === session - 1 && mode === 'focus' ? 'var(--accent)' : 'var(--border)',
            transition: 'all 0.3s',
          }} />
        ))}
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>
          {session}/{sessionsBeforeLong}
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost" style={{ padding: '8px 10px', borderRadius: 10 }} onClick={() => send('RESET_TIMER')} title="Reset (R)">
          <RotateCcw size={16} />
        </button>

        <button
          onClick={() => send(isRunning ? 'PAUSE_TIMER' : 'START_TIMER')}
          title="Play/Pause (Space)"
          style={{
            width: 60, height: 60, borderRadius: '50%', border: 'none',
            background: modeInfo.color, color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isRunning ? `0 0 20px ${modeInfo.color}60` : 'none',
            transform: isRunning ? 'scale(1.05)' : 'scale(1)',
            transition: 'all 0.2s',
          }}
        >
          {isRunning ? <Pause size={24} fill="#fff" /> : <Play size={24} fill="#fff" />}
        </button>

        <button className="btn btn-ghost" style={{ padding: '8px 10px', borderRadius: 10 }} onClick={() => send('SKIP_TIMER')} title="Skip (S)">
          <SkipForward size={16} />
        </button>
      </div>

      {/* Auto-start indicator */}
      {(settings?.autoStartBreaks || settings?.autoStartFocus) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
          <Zap size={11} color="var(--yellow)" />
          Auto-start {settings.autoStartBreaks && settings.autoStartFocus ? 'on' : settings.autoStartBreaks ? 'breaks' : 'focus'} enabled
        </div>
      )}

      {/* Task selector */}
      <div style={{ width: '100%', position: 'relative' }}>
        <button
          onClick={() => setShowPicker(!showPicker)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 12px', borderRadius: 10, border: `1px solid ${showPicker ? 'var(--accent)' : 'var(--border)'}`,
            background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', transition: 'border-color 0.15s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 13 }}>🎯</span>
            <span style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: activeTask ? 'var(--text)' : 'var(--muted)' }}>
              {activeTask ? activeTask.title : 'Select a task...'}
            </span>
          </div>
          <ChevronDown size={14} color="var(--muted)" style={{ flexShrink: 0, transform: showPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        {showPicker && (
          <div className="animate-slide-up" style={{
            position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 10,
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
            boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
          }}>
            <button
              onClick={() => selectTask(null)}
              style={{ width: '100%', textAlign: 'left', padding: '9px 12px', fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              — No task —
            </button>
            {pendingTasks.length === 0 && (
              <p style={{ padding: '8px 12px', fontSize: 11, color: 'var(--muted)' }}>No tasks yet. Add some in Tasks tab.</p>
            )}
            {pendingTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTask(t.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '9px 12px',
                  fontSize: 12, color: t.id === activeTaskId ? 'var(--accent)' : 'var(--text)',
                  background: t.id === activeTaskId ? 'rgba(248,81,73,0.08)' : 'none',
                  border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, marginLeft: 8 }}>
                  {t.pomodorosCompleted}/{t.pomodorosTarget} 🍅
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active task progress bar */}
      {activeTask && (
        <div className="card" style={{ width: '100%', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {activeTask.title}
            </span>
            <span style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0, marginLeft: 8 }}>
              {activeTask.pomodorosCompleted}/{activeTask.pomodorosTarget} 🍅
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{
              width: `${Math.min(100, (activeTask.pomodorosCompleted / activeTask.pomodorosTarget) * 100)}%`,
              background: activeTask.pomodorosCompleted >= activeTask.pomodorosTarget ? 'var(--green)' : 'var(--accent)',
            }} />
          </div>
        </div>
      )}
    </div>
  )
}
