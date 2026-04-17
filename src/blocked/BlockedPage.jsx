import { useState, useEffect } from 'react'
import { getTimeLeft, formatTime } from '../utils/storage.js'

const QUOTES = [
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "Concentrate all your thoughts upon the work at hand.", author: "Alexander Graham Bell" },
  { text: "You can do anything, but not everything.", author: "David Allen" },
  { text: "Focus is a matter of deciding what things you're not going to do.", author: "John Carmack" },
  { text: "Where focus goes, energy flows.", author: "Tony Robbins" },
  { text: "The key is not to prioritize what's on your schedule, but to schedule your priorities.", author: "Stephen Covey" },
  { text: "Deep work is the ability to focus without distraction on a cognitively demanding task.", author: "Cal Newport" },
]


const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${5 + (i * 5.5) % 90}%`,
  bottom: `${(i * 7) % 40}%`,
  size: 3 + (i % 4),
  delay: `${(i * 0.7) % 6}s`,
  duration: `${5 + (i % 5)}s`,
  color: i % 3 === 0 ? '#f85149' : i % 3 === 1 ? '#58a6ff' : '#a371f7',
}))

function Particles() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="blocked-particle"
          style={{
            position: 'absolute',
            left: p.left,
            bottom: p.bottom,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            opacity: 0.6,
            animationDelay: p.delay,
            animationDuration: p.duration,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
        />
      ))}
    </div>
  )
}


export default function BlockedPage() {
  const [timerState, setTimerState] = useState(null)
  const [timeLeft,   setTimeLeft]   = useState(0)
  const [site,       setSite]       = useState('')
  const [activeTask, setActiveTask] = useState(null)

  const quote = QUOTES[Math.floor(Date.now() / 120000) % QUOTES.length]

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('site') || ''
    try { setSite(new URL(raw).hostname.replace(/^www\./, '')) } catch { setSite(raw) }

    chrome.storage.local.get(['timerState', 'tasks', 'activeTaskId'], (r) => {
      if (r.timerState) setTimerState(r.timerState)
      if (r.tasks && r.activeTaskId) {
        setActiveTask(r.tasks.find((t) => t.id === r.activeTaskId) || null)
      }
    })
    const listener = (c) => {
      if (c.timerState) setTimerState(c.timerState.newValue)
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  useEffect(() => {
    const iv = setInterval(() => {
      if (timerState) setTimeLeft(getTimeLeft(timerState))
    }, 500)
    return () => clearInterval(iv)
  }, [timerState])

  const pct = (() => {
    if (!timerState) return 0
    const total = (timerState.mode === 'focus' ? 25 : timerState.mode === 'shortBreak' ? 5 : 15) * 60
    return Math.min(100, (timeLeft / total) * 100)
  })()

  const R = 54
  const C = 2 * Math.PI * R
  const dash = (pct / 100) * C

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #080b10 0%, #120508 35%, #08091a 65%, #0d0510 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: '#e6edf3',
    }}>

      {/* ── Background orbs ── */}
      <div className="blocked-orb-1" style={{
        position: 'absolute', top: '-10%', left: '-5%',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(248,81,73,0.07) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div className="blocked-orb-2" style={{
        position: 'absolute', bottom: '-15%', right: '-8%',
        width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(88,166,255,0.05) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div className="blocked-orb-3" style={{
        position: 'absolute', top: '40%', left: '60%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(163,113,247,0.05) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <Particles />

      {/* ── Content ── */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 32,
        padding: '48px 24px',
        width: '100%',
        maxWidth: 640,
      }}>

        {/* Logo */}
        <div className="blocked-fade-up-1" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 20px',
          borderRadius: 50,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(10px)',
        }}>
          <img src="/icons/icon48.png" alt="FocusGuard" style={{ width: 24, height: 24, borderRadius: 6 }} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.5px', color: '#e6edf3' }}>FocusGuard</span>
        </div>

        {/* Shield + Badge */}
        <div className="blocked-fade-up-2" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {/* Big shield */}
          <div className="blocked-shield-glow" style={{ lineHeight: 1, userSelect: 'none' }}>
            <img src="/icons/icon128.png" alt="FocusGuard" style={{ width: 64, height: 64, borderRadius: 16 }} />
          </div>

          {/* BLOCKED badge */}
          <div className="blocked-badge-pulse" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(248,81,73,0.12)',
            border: '1px solid rgba(248,81,73,0.35)',
            borderRadius: 50,
            padding: '6px 18px',
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#f85149',
              display: 'inline-block',
              boxShadow: '0 0 8px #f85149',
            }} />
            <span style={{ fontSize: 11, color: '#f85149', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
              Access Blocked
            </span>
          </div>

          {/* Heading */}
          <div>
            <h1 style={{
              fontSize: 'clamp(36px, 6vw, 56px)',
              fontWeight: 800,
              color: '#ffffff',
              margin: 0,
              letterSpacing: '-1.5px',
              lineHeight: 1.1,
              textShadow: '0 0 60px rgba(248,81,73,0.2)',
            }}>
              Stay in the zone.
            </h1>
            <p style={{
              fontSize: 16,
              color: 'rgba(230,237,243,0.5)',
              marginTop: 12,
              lineHeight: 1.6,
              fontWeight: 400,
            }}>
              <span style={{
                color: '#e6edf3',
                fontWeight: 600,
                background: 'rgba(248,81,73,0.12)',
                border: '1px solid rgba(248,81,73,0.25)',
                borderRadius: 6,
                padding: '2px 10px',
              }}>
                {site || 'This site'}
              </span>
              {' '}is blocked during your focus session.
            </p>
          </div>
        </div>

        {/* Timer + Task row */}
        {(timerState?.isRunning || activeTask) && (
          <div className="blocked-fade-up-3" style={{
            display: 'flex',
            gap: 16,
            width: '100%',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>

            {/* Timer ring card */}
            {timerState?.isRunning && (
              <div style={{
                flex: '0 0 auto',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 24,
                padding: '24px 32px',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                minWidth: 180,
              }}>
                <div style={{ fontSize: 11, color: '#7d8590', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Session Ends In
                </div>
                <div style={{ position: 'relative', width: 130, height: 130 }}>
                  <svg width="130" height="130" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                    <circle cx="65" cy="65" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                    <circle cx="65" cy="65" r={R} fill="none"
                      stroke="url(#timerGrad)" strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${dash} ${C}`}
                      style={{ transition: 'stroke-dasharray 0.6s ease', filter: 'drop-shadow(0 0 6px rgba(248,81,73,0.6))' }}
                    />
                    <defs>
                      <linearGradient id="timerGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#f85149" />
                        <stop offset="100%" stopColor="#ff9d97" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{
                      fontSize: 28, fontWeight: 800, color: '#fff',
                      fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px',
                    }}>
                      {formatTime(timeLeft)}
                    </span>
                    <span style={{ fontSize: 10, color: '#7d8590', marginTop: 2, letterSpacing: '0.5px' }}>remaining</span>
                  </div>
                </div>
                <div style={{
                  fontSize: 11, color: 'rgba(248,81,73,0.7)', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '1.5px',
                }}>
                  {timerState.mode === 'focus' ? '🎯 Focus Mode' : timerState.mode === 'shortBreak' ? '☕ Short Break' : '🌿 Long Break'}
                </div>
              </div>
            )}

            {/* Active task card */}
            {activeTask && (
              <div style={{
                flex: '1 1 auto',
                minWidth: 200,
                maxWidth: 320,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 24,
                padding: '24px',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 12,
              }}>
                <div style={{ fontSize: 11, color: '#7d8590', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Working On
                </div>
                <div style={{ fontSize: 17, color: '#fff', fontWeight: 600, lineHeight: 1.4 }}>
                  🎯 {activeTask.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${(activeTask.pomodorosCompleted / activeTask.pomodorosTarget) * 100}%`,
                      background: 'linear-gradient(90deg, #f85149, #ff9d97)',
                      borderRadius: 4,
                      transition: 'width 0.4s ease',
                      boxShadow: '0 0 8px rgba(248,81,73,0.5)',
                    }} />
                  </div>
                  <span style={{ fontSize: 12, color: '#f85149', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {activeTask.pomodorosCompleted}/{activeTask.pomodorosTarget} 🍅
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="blocked-fade-up-4" style={{
          width: '100%', maxWidth: 400,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
        }} />

        {/* Quote */}
        <div className="blocked-fade-up-4" style={{
          maxWidth: 480,
          textAlign: 'center',
          padding: '0 16px',
        }}>
          <p style={{
            fontSize: 15,
            color: 'rgba(230,237,243,0.6)',
            fontStyle: 'italic',
            lineHeight: 1.7,
            margin: 0,
            fontWeight: 400,
          }}>
            "{quote.text}"
          </p>
          <p style={{ fontSize: 12, color: '#484f58', marginTop: 8, fontWeight: 500 }}>
            — {quote.author}
          </p>
        </div>

        {/* Action buttons */}
        <div className="blocked-fade-up-6" style={{
          display: 'flex',
          gap: 12,
          width: '100%',
          maxWidth: 420,
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => window.history.back()}
            style={{
              flex: '1 1 auto',
              padding: '15px 24px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #f85149, #d93025)',
              color: '#fff',
              border: 'none',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(248,81,73,0.35), 0 0 0 1px rgba(248,81,73,0.2)',
              transition: 'all 0.2s',
              letterSpacing: '0.2px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(248,81,73,0.5), 0 0 0 1px rgba(248,81,73,0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(248,81,73,0.35), 0 0 0 1px rgba(248,81,73,0.2)'
            }}
          >
            ← Go Back & Stay Focused
          </button>
          <button
            onClick={() => window.close()}
            style={{
              flex: '0 0 auto',
              padding: '15px 20px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.04)',
              color: '#7d8590',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              backdropFilter: 'blur(10px)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.color = '#e6edf3'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.color = '#7d8590'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
            }}
          >
            Close Tab
          </button>
        </div>

        {/* Footer */}
        <p style={{ fontSize: 11, color: '#2d3139', margin: 0, letterSpacing: '0.3px' }}>
          Blocking is active during focus sessions only · FocusGuard v2
        </p>

      </div>
    </div>
  )
}
