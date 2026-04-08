import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, Edit2, X } from 'lucide-react'
import { auth } from '../../utils/firebase.js'
import { pushToCloud } from '../../utils/sync.js'

const CATEGORY = {
  work:     { label: 'Work',     icon: '💼', color: '#58a6ff' },
  study:    { label: 'Study',    icon: '📚', color: '#a371f7' },
  personal: { label: 'Personal', icon: '🏃', color: '#3fb950' },
  creative: { label: 'Creative', icon: '🎨', color: '#f0883e' },
  other:    { label: 'Other',    icon: '🔧', color: '#7d8590' },
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export default function Tasks() {
  const [tasks,        setTasks]        = useState([])
  const [activeTaskId, setActiveTaskId] = useState(null)
  const [title,        setTitle]        = useState('')
  const [target,       setTarget]       = useState(4)
  const [category,     setCategory]     = useState('work')
  const [editId,       setEditId]       = useState(null)
  const [editTitle,    setEditTitle]    = useState('')
  const [showDone,     setShowDone]     = useState(false)

  useEffect(() => {
    chrome.storage.local.get(['tasks', 'activeTaskId'], (r) => {
      if (r.tasks) setTasks(r.tasks)
      setActiveTaskId(r.activeTaskId ?? null)
    })
    const listener = (c) => {
      if (c.tasks)       setTasks(c.tasks.newValue || [])
      if (c.activeTaskId !== undefined) setActiveTaskId(c.activeTaskId.newValue)
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const persist = (updated, newActiveId) => {
    const upd = { tasks: updated }
    if (newActiveId !== undefined) upd.activeTaskId = newActiveId
    chrome.storage.local.set(upd)
    setTasks(updated)
    if (newActiveId !== undefined) setActiveTaskId(newActiveId)
    if (auth.currentUser) {
      chrome.storage.local.get(['stats', 'settings'], (data) => {
        pushToCloud({ ...data, tasks: updated }).catch(console.error)
      })
    }
  }

  const addTask = () => {
    if (!title.trim()) return
    const task = {
      id: genId(), title: title.trim(),
      pomodorosTarget: target, pomodorosCompleted: 0,
      completed: false, category, createdAt: Date.now(),
    }
    persist([...tasks, task])
    setTitle('')
    setTarget(4)
    setCategory('work')
  }

  const deleteTask = (id) => persist(tasks.filter((t) => t.id !== id), activeTaskId === id ? null : undefined)
  const toggleDone = (id) => persist(tasks.map((t) => t.id === id ? { ...t, completed: !t.completed } : t))
  const saveEdit   = (id) => {
    if (!editTitle.trim()) return
    persist(tasks.map((t) => t.id === id ? { ...t, title: editTitle.trim() } : t))
    setEditId(null)
  }
  const selectTask = (id) => {
    const next = activeTaskId === id ? null : id
    chrome.storage.local.set({ activeTaskId: next })
    setActiveTaskId(next)
  }

  const pending = tasks.filter((t) => !t.completed)
  const done    = tasks.filter((t) => t.completed)

  return (
    <div style={{ padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Add task form */}
      <div className="card" style={{ gap: 10, display: 'flex', flexDirection: 'column' }}>
        <input
          className="input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="What are you working on?"
        />
        {/* Category picker */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {Object.entries(CATEGORY).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setCategory(k)}
              style={{
                padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                border: `1px solid ${category === k ? v.color : 'var(--border)'}`,
                background: category === k ? `${v.color}20` : 'transparent',
                color: category === k ? v.color : 'var(--muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <span>{v.icon}</span>{v.label}
            </button>
          ))}
        </div>
        {/* Target + Add */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>🍅</span>
            <input
              type="number" min={1} max={20} value={target}
              onChange={(e) => setTarget(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              className="input"
              style={{ width: 54, textAlign: 'center', padding: '5px 6px' }}
            />
          </div>
          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12, marginLeft: 'auto' }} onClick={addTask}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Task list */}
      {pending.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
          🎯 No tasks yet. Add one above!
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {pending.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isActive={activeTaskId === task.id}
            isEditing={editId === task.id}
            editTitle={editTitle}
            onSelect={() => selectTask(task.id)}
            onDelete={() => deleteTask(task.id)}
            onToggle={() => toggleDone(task.id)}
            onEditStart={() => { setEditId(task.id); setEditTitle(task.title) }}
            onEditChange={setEditTitle}
            onEditSave={() => saveEdit(task.id)}
            onEditCancel={() => setEditId(null)}
            category={CATEGORY[task.category]}
          />
        ))}
      </div>

      {/* Completed section */}
      {done.length > 0 && (
        <div>
          <button
            onClick={() => setShowDone(!showDone)}
            style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ fontSize: 10 }}>{showDone ? '▼' : '▶'}</span>
            Completed ({done.length})
          </button>
          {showDone && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {done.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={() => toggleDone(task.id)} onDelete={() => deleteTask(task.id)}
                  isActive={false} isEditing={false} onSelect={() => {}} onEditStart={() => {}} onEditChange={() => {}} onEditSave={() => {}} onEditCancel={() => {}}
                  category={CATEGORY[task.category]} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, isActive, isEditing, editTitle, onSelect, onDelete, onToggle, onEditStart, onEditChange, onEditSave, onEditCancel, category }) {
  const cat = category || CATEGORY.other

  return (
    <div
      onClick={task.completed ? undefined : onSelect}
      style={{
        background: 'var(--surface)', border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 10, padding: '10px 12px', cursor: task.completed ? 'default' : 'pointer',
        opacity: task.completed ? 0.65 : 1, transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          style={{
            width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${task.completed ? 'var(--green)' : 'var(--border)'}`,
            background: task.completed ? 'var(--green)' : 'transparent', flexShrink: 0, marginTop: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          {task.completed && <Check size={11} color="#000" />}
        </button>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <input
              autoFocus className="input" value={editTitle}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onEditSave(); if (e.key === 'Escape') onEditCancel() }}
              onClick={(e) => e.stopPropagation()}
              style={{ padding: '3px 8px', fontSize: 12, marginBottom: 4 }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text)', textDecoration: task.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {task.title}
              </span>
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 20, flexShrink: 0,
                background: `${cat.color}20`, color: cat.color, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <span>{cat.icon}</span>{cat.label}
              </span>
            </div>
          )}

          {/* Pomodoro dots */}
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {Array.from({ length: Math.min(task.pomodorosTarget, 12) }).map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i < task.pomodorosCompleted ? 'var(--accent)' : 'var(--border)',
                transition: 'background 0.2s',
              }} />
            ))}
            {task.pomodorosTarget > 12 && (
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>+{task.pomodorosTarget - 12}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          {isEditing ? (
            <>
              <ActionBtn onClick={onEditSave}   icon={<Check size={13} />} color="var(--green)" />
              <ActionBtn onClick={onEditCancel} icon={<X     size={13} />} color="var(--muted)" />
            </>
          ) : (
            <>
              {!task.completed && <ActionBtn onClick={onEditStart} icon={<Edit2  size={13} />} />}
              <ActionBtn onClick={onDelete} icon={<Trash2 size={13} />} hoverColor="var(--accent)" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ onClick, icon, color, hoverColor }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: 5, borderRadius: 6, border: 'none', background: hov ? 'var(--surface2)' : 'transparent',
        color: hov && hoverColor ? hoverColor : color || 'var(--muted)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {icon}
    </button>
  )
}
