import { Timer, CheckSquare, BarChart2, Settings } from 'lucide-react'

const tabs = [
  { id: 'timer', icon: Timer, label: 'Timer' },
  { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
  { id: 'stats', icon: BarChart2, label: 'Stats' },
  { id: 'settings', icon: Settings, label: 'Settings' },
]

export default function Nav({ activeTab, onTabChange }) {
  return (
    <div style={{ display: 'flex', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
      {tabs.map(({ id, icon: Icon, label }) => {
        const active = activeTab === id
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '10px 0 8px', gap: 3, border: 'none', background: 'transparent',
              color: active ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer',
              transition: 'color 0.15s',
              position: 'relative',
            }}
          >
            {active && (
              <div style={{
                position: 'absolute', top: 0, left: '20%', right: '20%', height: 2,
                background: 'var(--accent)', borderRadius: '0 0 2px 2px',
              }} />
            )}
            <Icon size={17} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
