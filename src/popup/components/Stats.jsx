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

function calcWeekData(dailyData) {
  const today = new Date()
  const daysSinceMonday = (today.getDay() + 6) % 7  // Mon=0 … Sun=6

  const makeKey = (d) => d.toISOString().split('T')[0]

  const thisWeekDays = Array.from({ length: daysSinceMonday + 1 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - daysSinceMonday + i)
    return makeKey(d)
  })

  const lastWeekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - daysSinceMonday - 7 + i)
    return makeKey(d)
  })

  const sum = (days) => days.reduce((acc, date) => {
    const d = dailyData[date] || {}
    return {
      pomodoros:    acc.pomodoros    + (d.pomodoros    || 0),
      focusMinutes: acc.focusMinutes + (d.focusMinutes || 0),
      distractions: acc.distractions + (d.distractions || 0),
    }
  }, { pomodoros: 0, focusMinutes: 0, distractions: 0 })

  const tw = sum(thisWeekDays)
  const lw = sum(lastWeekDays)
  return {
    thisWeek: { ...tw, avg: tw.pomodoros / thisWeekDays.length },
    lastWeek: { ...lw, avg: lw.pomodoros / 7 },
  }
}

function WeekComparison({ dailyData }) {
  const { thisWeek, lastWeek } = calcWeekData(dailyData)

  const metrics = [
    { label: 'Pomodoros',    tw: thisWeek.pomodoros,                   lw: lastWeek.pomodoros,                   fmt: (v) => Math.round(v),    higherBetter: true  },
    { label: 'Focus Hrs',    tw: thisWeek.focusMinutes / 60,           lw: lastWeek.focusMinutes / 60,           fmt: (v) => v.toFixed(1),     higherBetter: true  },
    { label: 'Distractions', tw: thisWeek.distractions,                lw: lastWeek.distractions,                fmt: (v) => Math.round(v),    higherBetter: false },
    { label: 'Daily Avg',    tw: thisWeek.avg,                         lw: lastWeek.avg,                         fmt: (v) => v.toFixed(1),     higherBetter: true  },
  ]

  return (
    <div className="card">
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontWeight: 500 }}>📊 This Week vs Last Week</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {metrics.map(({ label, tw, lw, fmt, higherBetter }) => {
          const diff = tw - lw
          const pct  = lw === 0 ? (tw > 0 ? 100 : 0) : Math.round((diff / lw) * 100)
          const better = higherBetter ? diff > 0 : diff < 0
          const worse  = higherBetter ? diff < 0 : diff > 0
          const color  = better ? 'var(--green)' : worse ? 'var(--accent)' : 'var(--muted)'
          const arrow  = better ? '↑' : worse ? '↓' : '→'
          const pctStr = diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${pct}%`

          return (
            <div key={label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 5 }}>{label}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{fmt(tw)}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>vs {fmt(lw)} last wk</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color, lineHeight: 1 }}>{arrow}</div>
                  <div style={{ fontSize: 10, color, fontWeight: 600, marginTop: 3 }}>{pctStr}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function exportCSV(stats, settings) {
  const s        = stats || {}
  const daily    = s.dailyData || {}
  const days     = getLast28Days()
  const score    = calcScore(s, settings)
  const hours    = ((s.totalFocusMinutes || 0) / 60).toFixed(1)

  const rows = []
  rows.push(['FocusGuard Stats Export', new Date().toLocaleDateString()])
  rows.push([])
  rows.push(['SUMMARY'])
  rows.push(['Total Pomodoros', 'Total Hours', 'Current Streak', 'Best Streak', 'Focus Score', 'Distractions'])
  rows.push([
    s.totalPomodoros    || 0,
    hours,
    s.currentStreak     || 0,
    s.longestStreak     || 0,
    score,
    s.distractions      || 0,
  ])
  rows.push([])
  rows.push(['DAILY DATA (Last 28 Days)'])
  rows.push(['Date', 'Pomodoros', 'Focus Minutes', 'Distractions'])
  days.forEach((date) => {
    const d = daily[date] || {}
    rows.push([date, d.pomodoros || 0, d.focusMinutes || 0, d.distractions || 0])
  })

  const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'focusguard-stats.csv'; a.click()
  URL.revokeObjectURL(url)
}

function exportPDF(stats, settings) {
  const s     = stats || {}
  const daily = s.dailyData || {}
  const days  = getLast28Days()
  const score = calcScore(s, settings)
  const hours = ((s.totalFocusMinutes || 0) / 60).toFixed(1)
  const date  = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const grade = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D'
  const scoreColor = score >= 70 ? '#3fb950' : score >= 40 ? '#d29922' : '#f85149'

  const summaryCards = [
    { label: 'Total Pomodoros',  value: s.totalPomodoros || 0,          icon: '🍅' },
    { label: 'Focus Hours',      value: hours,                           icon: '⏱️' },
    { label: 'Current Streak',   value: `${s.currentStreak || 0} days`, icon: '🔥' },
    { label: 'Best Streak',      value: `${s.longestStreak || 0} days`, icon: '🏆' },
    { label: 'Focus Score',      value: `${score} (${grade})`,          icon: '⭐' },
    { label: 'Distractions',     value: s.distractions || 0,            icon: '❌' },
  ]

  const tableRows = days.map((date) => {
    const d = daily[date] || {}
    return `<tr>
      <td>${date}</td>
      <td>${d.pomodoros || 0}</td>
      <td>${d.focusMinutes || 0}</td>
      <td>${d.distractions || 0}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>FocusGuard Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; padding: 40px; background: #fff; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #f85149; padding-bottom: 16px; margin-bottom: 28px; }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-icon { font-size: 28px; }
    .logo-text { font-size: 22px; font-weight: 700; color: #f85149; }
    .report-date { font-size: 13px; color: #666; }
    .section-title { font-size: 14px; font-weight: 600; color: #444; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 32px; }
    .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 12px; text-align: center; }
    .card-icon { font-size: 20px; margin-bottom: 6px; }
    .card-value { font-size: 20px; font-weight: 700; color: #f85149; margin-bottom: 4px; }
    .card-label { font-size: 11px; color: #888; }
    .score-card .card-value { color: ${scoreColor}; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #f85149; color: #fff; }
    th { padding: 8px 12px; text-align: left; font-weight: 600; }
    td { padding: 7px 12px; border-bottom: 1px solid #f0f0f0; }
    tr:nth-child(even) td { background: #fafafa; }
    .footer { margin-top: 28px; text-align: center; font-size: 11px; color: #aaa; }
    @media print { body { padding: 20px; } }
  </style>
  </head><body>
  <div class="header">
    <div class="logo"><span class="logo-icon">🛡️</span><span class="logo-text">FocusGuard</span></div>
    <span class="report-date">Report generated: ${date}</span>
  </div>
  <div class="section-title">Summary</div>
  <div class="cards">
    ${summaryCards.map((c, i) => `
    <div class="card ${i === 4 ? 'score-card' : ''}">
      <div class="card-icon">${c.icon}</div>
      <div class="card-value">${c.value}</div>
      <div class="card-label">${c.label}</div>
    </div>`).join('')}
  </div>
  <div class="section-title">Daily Activity — Last 28 Days</div>
  <table>
    <thead><tr><th>Date</th><th>Pomodoros</th><th>Focus Minutes</th><th>Distractions</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">Generated by FocusGuard · focusguard-report.pdf</div>
  <script>window.onload = () => { window.print(); }<\/script>
  </body></html>`

  const win = window.open('', '_blank', 'width=800,height=600')
  win.document.write(html)
  win.document.close()
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

      {/* This week vs last week */}
      <WeekComparison dailyData={dailyData} />

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

      {/* Export buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => exportCSV(stats, settings)}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
        >
          ⬇ Export CSV
        </button>
        <button
          onClick={() => exportPDF(stats, settings)}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', opacity: 1, transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          ⬇ Export PDF
        </button>
      </div>
    </div>
  )
}
