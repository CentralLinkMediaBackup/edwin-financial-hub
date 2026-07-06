import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, Plus, X, Save, Flame, BarChart2, ChevronDown, ChevronUp } from 'lucide-react'
import { format, addDays, parseISO, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const LS_HABITS = 'eb-habits-v1'
const LS_HLOGS  = 'eb-habit-logs-v1'
const lsGet = key => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : [] } catch { return [] } }
const lsSet = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)) } catch {} }

const DEFAULT_HABITS = [
  { name: 'Morning Gym',   category: 'Fitness',  color: '#16a34a' },
  { name: 'Read 20 mins',  category: 'Personal', color: '#7c3aed' },
  { name: 'Review Goals',  category: 'Business', color: '#2563eb' },
  { name: 'No-Spend Day',  category: 'Finance',  color: '#d97706' },
]

const CAT_COLORS = {
  Fitness:  '#16a34a',
  Personal: '#7c3aed',
  Business: '#2563eb',
  Finance:  '#d97706',
  Health:   '#0284c7',
  Other:    '#64748b',
}

const inputStyle = {
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  padding: '8px 12px',
  fontSize: '13px',
  color: '#0f172a',
  backgroundColor: '#fafafa',
  outline: 'none',
  width: '100%',
}

function HabitRow({ habit, logs14, today, onToggle, expanded, onExpand }) {
  const todayStr = format(today, 'yyyy-MM-dd')

  const cells = Array.from({ length: 14 }, (_, i) => {
    const d = format(addDays(today, -13 + i), 'yyyy-MM-dd')
    const log = logs14.find(l => l.habit_id === habit.id && l.date === d)
    return { date: d, done: log?.completed || false, isToday: d === todayStr }
  })

  const completedCount = cells.filter(c => c.done).length

  // Calculate streak
  let streak = 0
  for (let i = cells.length - 1; i >= 0; i--) {
    if (cells[i].done) streak++
    else break
  }

  const catColor = CAT_COLORS[habit.category] || '#64748b'

  return (
    <div>
      <div
        className="flex items-center gap-4 py-3 px-1 border-b cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
        style={{ borderColor: '#f1f5f9' }}
        onClick={onExpand}
      >
        {/* Habit info */}
        <div className="flex items-center gap-2 w-36 flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
          <span className="text-sm font-medium truncate" style={{ color: '#374151' }}>{habit.name}</span>
        </div>

        {/* 14-day grid */}
        <div className="flex gap-1 flex-1">
          {cells.map(({ date, done, isToday }) => (
            <button
              key={date}
              onClick={e => { e.stopPropagation(); onToggle(habit.id, date, done) }}
              className="flex-1 rounded transition-all hover:opacity-80"
              style={{
                height: '24px',
                backgroundColor: done ? catColor : '#f1f5f9',
                border: isToday ? `1.5px solid ${catColor}` : '1.5px solid transparent',
                opacity: done ? 1 : 0.7,
              }}
              title={date}
            />
          ))}
        </div>

        {/* Streak */}
        <div className="flex items-center gap-1 w-14 flex-shrink-0 justify-end">
          <Flame size={12} style={{ color: streak > 0 ? '#d97706' : '#cbd5e1' }} />
          <span className="text-sm font-bold" style={{ color: streak > 0 ? '#d97706' : '#94a3b8' }}>{streak}</span>
        </div>

        {/* Expand */}
        <div style={{ color: '#cbd5e1' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 rounded-lg mb-1" style={{ backgroundColor: '#fafafa', margin: '2px 0 4px 0' }}>
              <div className="flex items-center gap-4 text-xs mb-2" style={{ color: '#64748b' }}>
                <span>Category: <strong style={{ color: catColor }}>{habit.category}</strong></span>
                <span>Completed: <strong>{completedCount}/14 days</strong></span>
                <span>Streak: <strong>{streak} days</strong></span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map(({ date, done, isToday }) => (
                  <div key={date} className="text-center">
                    <div
                      className="w-6 h-6 rounded-full mx-auto flex items-center justify-center mb-0.5"
                      style={{
                        backgroundColor: done ? catColor : '#f1f5f9',
                        border: isToday ? `1.5px solid ${catColor}` : 'none',
                      }}
                    >
                      {done && <span style={{ color: '#fff', fontSize: '9px' }}>✓</span>}
                    </div>
                    <span style={{ fontSize: '8px', color: '#94a3b8' }}>{format(parseISO(date), 'd')}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Habits() {
  const addToast = useStore(s => s.addToast)
  const [habits,   setHabits]   = useState([])
  const [logs,     setLogs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [form, setForm] = useState({ name: '', category: 'Fitness', color: '#16a34a' })

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const load = async () => {
    const cutoff = format(addDays(today, -14), 'yyyy-MM-dd')
    const [h, l] = await Promise.all([
      supabase.from('habits').select('*').order('created_at'),
      supabase.from('habit_logs').select('*').gte('date', cutoff),
    ])
    if (!h.error && h.data) {
      let habitData = h.data
      if (habitData.length === 0) {
        const seeds = DEFAULT_HABITS.map((d, i) => ({ ...d, id: `h-seed-${i}`, created_at: new Date().toISOString() }))
        const { data: seeded } = await supabase.from('habits').insert(DEFAULT_HABITS).select()
        habitData = seeded || seeds
      }
      setHabits(habitData); lsSet(LS_HABITS, habitData)
    } else {
      let stored = lsGet(LS_HABITS)
      if (!stored.length) {
        stored = DEFAULT_HABITS.map((d, i) => ({ ...d, id: `h-seed-${i}`, created_at: new Date().toISOString() }))
        lsSet(LS_HABITS, stored)
      }
      setHabits(stored)
    }
    if (!l.error && l.data) {
      setLogs(l.data); lsSet(LS_HLOGS, l.data)
    } else {
      setLogs(lsGet(LS_HLOGS))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleToggle = async (habitId, date, currentlyDone) => {
    const existingLog = logs.find(l => l.habit_id === habitId && l.date === date)
    let updatedLogs
    if (existingLog) {
      const newCompleted = !currentlyDone
      await supabase.from('habit_logs').update({ completed: newCompleted }).eq('id', existingLog.id)
      updatedLogs = logs.map(l => l.id === existingLog.id ? { ...l, completed: newCompleted } : l)
    } else {
      const newLog = { id: `log-${Date.now()}`, habit_id: habitId, date, completed: true }
      const { data } = await supabase.from('habit_logs').insert([{ habit_id: habitId, date, completed: true }]).select()
      updatedLogs = [...logs, data?.[0] || newLog]
    }
    setLogs(updatedLogs); lsSet(LS_HLOGS, updatedLogs)
  }

  const handleAddHabit = async () => {
    if (!form.name.trim()) return addToast('Habit name required', 'error')
    const newHabit = { id: `h-${Date.now()}`, created_at: new Date().toISOString(), name: form.name.trim(), category: form.category, color: form.color }
    const { data, error } = await supabase.from('habits').insert([{ name: form.name.trim(), category: form.category, color: form.color }]).select()
    const added = (!error && data) ? data[0] : newHabit
    setHabits(h => { const u = [...h, added]; lsSet(LS_HABITS, u); return u })
    setForm({ name: '', category: 'Fitness', color: '#16a34a' })
    setShowAdd(false); addToast('Habit added')
  }

  // Consistency stats for this month
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(today)
    const monthEnd   = today
    const monthDays  = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const monthLogs  = logs.filter(l => l.date >= format(monthStart, 'yyyy-MM-dd') && l.date <= todayStr)
    const possible   = habits.length * monthDays.length
    const completed  = monthLogs.filter(l => l.completed).length
    const missed     = possible - completed
    return { completed, missed, possible }
  }, [habits, logs, today, todayStr])

  const catOptions = Object.keys(CAT_COLORS)

  return (
    <div className="p-5 md:p-7 max-w-[1100px] mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
              <CheckSquare size={20} style={{ color: '#16a34a' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>Your Habits</h1>
              <p className="text-sm" style={{ color: '#64748b' }}>{habits.length} habit{habits.length !== 1 ? 's' : ''} tracked</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#16a34a' }}
          >
            <Plus size={15} /> Add Habit
          </button>
        </div>
      </motion.div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="rounded-xl border p-5 bg-white" style={{ borderColor: '#e2e8f0' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: '#374151' }}>New Habit</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Habit Name *</label>
                  <input style={inputStyle} placeholder="e.g. Morning Gym" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAddHabit()} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Category</label>
                  <select style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value, color: CAT_COLORS[e.target.value] || '#64748b' }))}>
                    {catOptions.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <label className="text-xs font-medium" style={{ color: '#64748b' }}>Color:</label>
                <div className="flex gap-2">
                  {Object.entries(CAT_COLORS).map(([, color]) => (
                    <button
                      key={color}
                      onClick={() => setForm(f => ({ ...f, color }))}
                      className="w-6 h-6 rounded-full border-2 transition-all"
                      style={{ backgroundColor: color, borderColor: form.color === color ? '#0f172a' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddHabit} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#16a34a' }}>
                  <Save size={14} /> Save
                </button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-12 gap-5">

        {/* Main habit tracker */}
        <div className="col-span-12 lg:col-span-8">
          <div className="rounded-xl border bg-white p-5" style={{ borderColor: '#e2e8f0' }}>
            {/* Column headers */}
            <div className="flex items-center gap-4 pb-3 border-b mb-2" style={{ borderColor: '#f1f5f9' }}>
              <div className="w-36 flex-shrink-0">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>Habit</span>
              </div>
              <div className="flex-1">
                <div className="flex gap-1">
                  {Array.from({ length: 14 }, (_, i) => {
                    const d = addDays(today, -13 + i)
                    const isToday = i === 13
                    return (
                      <div key={i} className="flex-1 text-center">
                        <div className="text-[8px] font-medium" style={{ color: isToday ? '#d97706' : '#94a3b8' }}>
                          {format(d, 'EEE')[0]}
                        </div>
                        <div className="text-[9px]" style={{ color: isToday ? '#d97706' : '#cbd5e1', fontWeight: isToday ? 700 : 400 }}>
                          {format(d, 'd')}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="w-14 flex-shrink-0 text-right">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>Streak</span>
              </div>
              <div className="w-4" />
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm" style={{ color: '#94a3b8' }}>Loading habits...</div>
            ) : habits.length === 0 ? (
              <div className="py-12 text-center">
                <CheckSquare size={28} className="mx-auto mb-2 opacity-20" style={{ color: '#94a3b8' }} />
                <p className="text-sm mb-3" style={{ color: '#94a3b8' }}>No habits tracked yet</p>
                <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#16a34a' }}>
                  <Plus size={14} /> Add First Habit
                </button>
              </div>
            ) : (
              <div>
                {habits.map(habit => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    logs14={logs}
                    today={today}
                    onToggle={handleToggle}
                    expanded={expanded === habit.id}
                    onExpand={() => setExpanded(e => e === habit.id ? null : habit.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="col-span-12 lg:col-span-4 space-y-4">

          {/* Consistency donut */}
          <div className="rounded-xl border bg-white p-5" style={{ borderColor: '#e2e8f0' }}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={15} style={{ color: '#16a34a' }} />
              <span className="text-sm font-semibold" style={{ color: '#374151' }}>This Month</span>
            </div>
            {monthStats.possible > 0 ? (
              <>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed', value: monthStats.completed },
                          { name: 'Missed',    value: Math.max(0, monthStats.missed) },
                        ]}
                        cx="50%" cy="50%"
                        innerRadius={38} outerRadius={55}
                        paddingAngle={2} dataKey="value"
                      >
                        <Cell fill="#16a34a" />
                        <Cell fill="#f1f5f9" />
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center -mt-2">
                  <p className="text-2xl font-bold" style={{ color: '#16a34a' }}>
                    {monthStats.possible > 0 ? Math.round((monthStats.completed / monthStats.possible) * 100) : 0}%
                  </p>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>consistency</p>
                </div>
                <div className="flex justify-around mt-3 pt-3 border-t" style={{ borderColor: '#f1f5f9' }}>
                  <div className="text-center">
                    <p className="text-base font-bold" style={{ color: '#16a34a' }}>{monthStats.completed}</p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-bold" style={{ color: '#dc2626' }}>{Math.max(0, monthStats.missed)}</p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>missed</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: '#94a3b8' }}>No data yet</p>
            )}
          </div>

          {/* Insights */}
          <div className="rounded-xl border bg-white p-5" style={{ borderColor: '#e2e8f0' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: '#374151' }}>Habit Insights</p>
            {habits.length > 0 ? (
              <div className="space-y-3">
                {habits.map(h => {
                  const hLogs = logs.filter(l => l.habit_id === h.id && l.completed)
                  let streak = 0
                  for (let i = 13; i >= 0; i--) {
                    const d = format(addDays(today, -i), 'yyyy-MM-dd')
                    if (hLogs.some(l => l.date === d)) streak++
                    else if (i < 13) break
                  }
                  const catColor = CAT_COLORS[h.category] || '#64748b'
                  return (
                    <div key={h.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
                      <span className="text-sm flex-1 truncate" style={{ color: '#374151' }}>{h.name}</span>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Flame size={11} style={{ color: streak > 0 ? '#d97706' : '#cbd5e1' }} />
                        <span className="text-xs font-bold" style={{ color: streak > 0 ? '#d97706' : '#94a3b8' }}>{streak}d</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm" style={{ color: '#94a3b8' }}>Add habits to see insights</p>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
