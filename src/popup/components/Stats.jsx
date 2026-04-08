import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getLast7Days, getLast28Days, getDayLabel, todayKey } from '../../utils/storage.js'

function calcScore(stats, settings) {
  if (!stats || !stats.totalPomodoros) return 0
  const goal  = settings?.dailyGoal || 8
  const today = stats.dailyData?.[todayKey()]
  const todayPom = today?.pomodoros || 0
  const streakBonus  = Math.min(30, (stats.currentStreak || 0) * 4)
  const goalBonus    = Math.min(30, (todayPom / goal) * 30)
  const totalBonus   = Math.min(25, Math.log10(Math.max(1, stats.totalPomodoros)) * 10)
  const distrPenalty = Math.min(15, ((stats.distractions || 0) / Math.max(1, stats.totalPomodoros)) * 15)
  return Math.max(0, Math.min(100, Math.round(streakBonus + goalBonus + totalBonus - distrPenalty)))
}

function ScoreArc({ score }) {
  const R  = 52, C = Math.PI * R  // half circle
  const dash = (score / 100) * C
  const color = score >= 70 ? '#3fb950' : score >= 40 ? '#d29922' : '#f85149'
  const grade = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="120" height="68" viewBox="0 0 120 68">
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="var(--border)" strokeWidth="10" strokeLinecap="round" />
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.3s' }}
        />
      </svg>
      <div style={{ marginTop: -10, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Focus Score · Grade <b style={{ color }}>{grade}</b></div>
      </div>
    </div>
  )
}

function Heatmap({ dailyData }) {
  const days   = getLast28Days()
  const max    = Math.max(1, ...days.map((d) => dailyData[d]?.pomodoros || 0))
  const weeks  = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>📅 Last 28 days</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {week.map((date) => {
              const pom = dailyData[date]?.pomodoros || 0
              const intensity = pom === 0 ? 0 : Math.max(0.15, pom / max)
              const isToday = date === todayKey()
              return (
                <div key={date} title={`${date}: ${pom} 🍅`} style={{
                  width: 14, height: 14, borderRadius: 3,
                  background: pom === 0 ? 'var(--border)' : `rgba(248,81,73,${intensity})`,
                  border: isToday ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                  cursor: 'default',
                }} />
              )
            })}
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 3 }}>
          {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((d, i) => (
            <span key={i} style={{ fontSize: 9, color: 'var(--muted)', lineHeight: '14px' }}>{d}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
        <span style={{ fontSize: 9, color: 'var(--muted)' }}>Less</span>
        {[0, 0.2, 0.5, 0.8, 1].map((v, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: v === 0 ? 'var(--border)' : `rgba(248,81,73,${v})` }} />
        ))}
        <span style={{ fontSize: 9, color: 'var(--muted)' }}>More</span>
      </div>
    </div>
  )
}

export default function Stats() {
  const [stats,    setStats]    = useState(null)
  const [tasks,    setTasks]    = useState([])
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    chrome.storage.local.get(['stats', 'tasks', 'settings'], (r) => {
      if (r.stats)    setStats(r.stats)
      if (r.tasks)    setTasks(r.tasks)
      if (r.settings) setSettings(r.settings)
    })
    const listener = (c) => {
      if (c.stats)    setStats(c.stats.newValue)
      if (c.tasks)    setTasks(c.tasks.newValue || [])
      if (c.settings) setSettings(c.settings.newValue)
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const s   = stats || {}
  const score = calcScore(s, settings)
  const hours = ((s.totalFocusMinutes || 0) / 60).toFixed(1)
  const dailyData = s.dailyData || {}

  const last7 = getLast7Days()
  const chartData = last7.map((date) => ({
    day: getDayLabel(date),
    pom: dailyData[date]?.pomodoros || 0,
    isToday: date === todayKey(),
  }))

  // Best day
  const bestDay = Object.entries(dailyData).sort((a, b) => (b[1].pomodoros || 0) - (a[1].pomodoros || 0))[0]

  const doneTasks  = tasks.filter((t) => t.completed)
  const totalTasks = tasks.length
  const rate       = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0

  const todayStats = dailyData[todayKey()] || { pomodoros: 0, focusMinutes: 0 }
  const dailyGoal  = settings?.dailyGoal || 8

  const cards = [
    { label: 'Pomodoros',    value: s.totalPomodoros || 0, icon: '🍅', color: 'var(--accent)' },
    { label: 'Focus Hours',  value: hours,                  icon: '⏱️', color: 'var(--blue)'   },
    { label: 'Best Streak',  value: `${s.longestStreak || 0}d`, icon: '🏆', color: 'var(--yellow)' },
    { label: 'Distractions', value: s.distractions || 0,   icon: '❌', color: 'var(--muted)'  },
  ]

  return (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Score + today */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ScoreArc score={score} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          {/* Today */}
          <div className="card" style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Today</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{todayStats.pomodoros}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>/{dailyGoal} goal</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{
                width: `${Math.min(100, (todayStats.pomodoros / dailyGoal) * 100)}%`,
                background: todayStats.pomodoros >= dailyGoal ? 'var(--green)' : 'var(--accent)',
              }} />
            </div>
          </div>
          {/* Streak */}
          <div className="card" style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Current Streak</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--yellow)', marginTop: 2 }}>
              🔥 {s.currentStreak || 0} days
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cards.map(({ label, value, icon, color }) => (
          <div key={label} className="card" style={{ padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 18 }}>{icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Weekly bar chart */}
      <div className="card">
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontWeight: 500 }}>📈 Weekly Activity</div>
        <ResponsiveContainer width="100%" height={90}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -24 }}>
            <XAxis dataKey="day" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: 'var(--text)' }}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              formatter={(v) => [`${v} 🍅`, 'Pomodoros']}
            />
            <Bar dataKey="pom" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.isToday ? '#f85149' : entry.pom > 0 ? '#f8514980' : 'var(--border)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap */}
      <div className="card">
        <Heatmap dailyData={dailyData} />
      </div>

      {/* Task overview */}
      <div className="card">
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>📋 Task Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center', marginBottom: 10 }}>
          {[
            { label: 'Total',     value: totalTasks,       color: 'var(--text)'   },
            { label: 'Done',      value: doneTasks.length, color: 'var(--green)'  },
            { label: 'Rate',      value: `${rate}%`,       color: 'var(--yellow)' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{label}</div>
            </div>
          ))}
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${rate}%`, background: `linear-gradient(90deg, var(--accent), var(--green))` }} />
        </div>
        {bestDay && (
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
            🏅 Best day: <span style={{ color: 'var(--text)' }}>{bestDay[0]}</span> — {bestDay[1].pomodoros} 🍅
          </div>
        )}
      </div>
    </div>
  )
}
