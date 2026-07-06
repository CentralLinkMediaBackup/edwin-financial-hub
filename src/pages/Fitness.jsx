import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dumbbell, Plus, X, Save, Trash2, Flame, Activity, Scale } from 'lucide-react'
import { format, addDays, parseISO, subDays } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'

const LS_WORKOUTS = 'eb-workouts-v1'
const LS_WEIGHT   = 'eb-weight-v1'
const lsGet = key => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : [] } catch { return [] } }
const lsSet = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)) } catch {} }

const WORKOUT_TYPES = ['Strength', 'Cardio', 'HIIT', 'Yoga', 'Rest']
const TYPE_COLORS   = {
  Strength: '#16a34a',
  Cardio:   '#2563eb',
  HIIT:     '#dc2626',
  Yoga:     '#8b5cf6',
  Rest:     '#94a3b8',
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

const emptyExercise = () => ({ name: '', sets: '', reps: '', weight_lbs: '' })

function LogWorkoutModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'Strength',
    duration_minutes: '',
    notes: '',
    exercises: [emptyExercise()],
  })

  const addExercise = () => setForm(f => ({ ...f, exercises: [...f.exercises, emptyExercise()] }))
  const updateEx = (i, field, val) => setForm(f => ({
    ...f,
    exercises: f.exercises.map((e, idx) => idx === i ? { ...e, [field]: val } : e),
  }))
  const removeEx = (i) => setForm(f => ({ ...f, exercises: f.exercises.filter((_, idx) => idx !== i) }))

  const handleSave = () => {
    const cleanedExercises = form.exercises
      .filter(e => e.name.trim())
      .map(e => ({
        name:       e.name.trim(),
        sets:       parseInt(e.sets) || 0,
        reps:       parseInt(e.reps) || 0,
        weight_lbs: parseFloat(e.weight_lbs) || 0,
      }))
    onSave({
      date:             form.date,
      type:             form.type,
      duration_minutes: parseInt(form.duration_minutes) || null,
      notes:            form.notes.trim() || null,
      exercises:        cleanedExercises,
    })
    setForm({ date: format(new Date(), 'yyyy-MM-dd'), type: 'Strength', duration_minutes: '', notes: '', exercises: [emptyExercise()] })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#fff' }}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#f1f5f9' }}>
          <h2 className="text-lg font-bold" style={{ color: '#0f172a' }}>Log Workout</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-50" style={{ color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Date</label>
              <input style={inputStyle} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Type</label>
              <select style={inputStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {WORKOUT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Duration (minutes)</label>
            <input style={inputStyle} type="number" placeholder="60" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} />
          </div>

          {/* Exercises */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: '#64748b' }}>Exercises</label>
              <button onClick={addExercise} className="flex items-center gap-1 text-xs font-medium" style={{ color: '#16a34a' }}>
                <Plus size={12} /> Add
              </button>
            </div>

            {form.type !== 'Rest' && form.type !== 'Cardio' && (
              <div className="space-y-2">
                {form.exercises.map((ex, i) => (
                  <div key={i} className="rounded-lg border p-3" style={{ borderColor: '#f1f5f9', backgroundColor: '#fafafa' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <input style={{ ...inputStyle, flex: 1 }} placeholder="Exercise name" value={ex.name} onChange={e => updateEx(i, 'name', e.target.value)} />
                      {i > 0 && (
                        <button onClick={() => removeEx(i)} className="p-1.5 rounded hover:bg-gray-50" style={{ color: '#94a3b8' }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] mb-0.5 block" style={{ color: '#94a3b8' }}>Sets</label>
                        <input style={inputStyle} type="number" placeholder="4" value={ex.sets} onChange={e => updateEx(i, 'sets', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] mb-0.5 block" style={{ color: '#94a3b8' }}>Reps</label>
                        <input style={inputStyle} type="number" placeholder="10" value={ex.reps} onChange={e => updateEx(i, 'reps', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-[10px] mb-0.5 block" style={{ color: '#94a3b8' }}>Weight (lbs)</label>
                        <input style={inputStyle} type="number" placeholder="135" value={ex.weight_lbs} onChange={e => updateEx(i, 'weight_lbs', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Notes</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
              placeholder="How did it feel?"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-2 p-5 border-t" style={{ borderColor: '#f1f5f9' }}>
          <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#16a34a' }}>
            <Save size={15} /> Save Workout
          </button>
          <button onClick={onClose} className="px-5 py-3 rounded-xl text-sm border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Cancel</button>
        </div>
      </motion.div>
    </div>
  )
}

function LogWeightModal({ open, onClose, onSave }) {
  const [weight, setWeight] = useState('')
  const [date, setDate]     = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes]   = useState('')

  const handleSave = () => {
    if (!weight) return
    onSave({ date, weight_lbs: parseFloat(weight), notes: notes.trim() || null })
    setWeight(''); setNotes('')
    onClose()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl shadow-2xl w-full max-w-sm"
        style={{ backgroundColor: '#fff' }}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#f1f5f9' }}>
          <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>Log Weight</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-50" style={{ color: '#64748b' }}><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Date</label>
            <input style={inputStyle} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Weight (lbs)</label>
            <input style={inputStyle} type="number" step="0.1" placeholder="185.0" value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Notes</label>
            <input style={inputStyle} placeholder="Optional" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t" style={{ borderColor: '#f1f5f9' }}>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#16a34a' }}>Save</button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Cancel</button>
        </div>
      </motion.div>
    </div>
  )
}

export default function Fitness() {
  const addToast = useStore(s => s.addToast)
  const [workouts,     setWorkouts]     = useState([])
  const [weightLogs,   setWeightLogs]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showWorkout,  setShowWorkout]  = useState(false)
  const [showWeight,   setShowWeight]   = useState(false)
  const [aiTip,        setAiTip]        = useState('')

  const today    = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const load = async () => {
    const [w, wl] = await Promise.all([
      supabase.from('workouts').select('*').order('date', { ascending: false }).limit(30),
      supabase.from('weight_logs').select('*').order('date', { ascending: false }).limit(30),
    ])
    if (!w.error && w.data) { setWorkouts(w.data); lsSet(LS_WORKOUTS, w.data) }
    else setWorkouts(lsGet(LS_WORKOUTS))
    if (!wl.error && wl.data) { setWeightLogs(wl.data); lsSet(LS_WEIGHT, wl.data) }
    else setWeightLogs(lsGet(LS_WEIGHT))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Fetch AI tip
  useEffect(() => {
    if (workouts.length < 2) return
    const fetchTip = async () => {
      try {
        const recent = workouts.slice(0, 7).map(w =>
          `${w.date}: ${w.type}${w.duration_minutes ? ` (${w.duration_minutes}min)` : ''}${w.notes ? ` - ${w.notes}` : ''}`
        ).join('\n')
        const res = await fetch('/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 120,
            system: 'You are a fitness coach. Give one short, specific tip (1-2 sentences) based on recent workout data.',
            messages: [{ role: 'user', content: `Recent workouts:\n${recent}\n\nGive one actionable tip.` }],
          }),
        })
        const data = await res.json()
        if (data.content?.[0]?.text) setAiTip(data.content[0].text)
      } catch (_) {}
    }
    fetchTip()
  }, [workouts])

  const handleSaveWorkout = async (data) => {
    const newW = { ...data, id: `w-${Date.now()}`, created_at: new Date().toISOString() }
    const { data: saved, error } = await supabase.from('workouts').insert([data]).select()
    const added = (!error && saved) ? saved[0] : newW
    setWorkouts(w => { const u = [added, ...w]; lsSet(LS_WORKOUTS, u); return u })
    setShowWorkout(false); addToast('Workout logged!')
  }

  const handleSaveWeight = async (data) => {
    const newWl = { ...data, id: `wl-${Date.now()}`, created_at: new Date().toISOString() }
    const { data: saved, error } = await supabase.from('weight_logs').insert([data]).select()
    const added = (!error && saved) ? saved[0] : newWl
    setWeightLogs(wl => { const u = [added, ...wl].sort((a, b) => new Date(b.date) - new Date(a.date)); lsSet(LS_WEIGHT, u); return u })
    addToast('Weight logged!')
  }

  // Weekly grid
  const weekGrid = useMemo(() => {
    const dow = today.getDay()
    const monday = addDays(today, -(dow === 0 ? 6 : dow - 1))
    return Array.from({ length: 7 }, (_, i) => {
      const d = format(addDays(monday, i), 'yyyy-MM-dd')
      const w = workouts.find(wo => wo.date === d)
      return { label: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i], date: d, workout: w || null }
    })
  }, [workouts, today])

  const workoutsThisWeek = weekGrid.filter(d => d.workout && d.workout.type !== 'Rest').length
  const latestWeight = weightLogs[0]

  // Weight trend
  const weightTrend = useMemo(() => {
    return [...weightLogs]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30)
      .map(l => ({ date: format(parseISO(l.date), 'MMM d'), value: l.weight_lbs }))
  }, [weightLogs])

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fee2e2' }}>
              <Dumbbell size={20} style={{ color: '#dc2626' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>Fitness Dashboard</h1>
              <p className="text-sm" style={{ color: '#64748b' }}>{format(today, 'EEEE, MMMM d, yyyy')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowWeight(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-gray-50"
              style={{ color: '#374151', borderColor: '#e2e8f0' }}
            >
              <Scale size={14} /> Log Weight
            </button>
            <button
              onClick={() => setShowWorkout(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#dc2626' }}
            >
              <Plus size={14} /> Log Workout
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-5">

        {/* Left: Weekly + Recent Workouts */}
        <div className="col-span-12 lg:col-span-8 space-y-5">

          {/* Weekly grid */}
          <div className="rounded-xl border bg-white p-5" style={{ borderColor: '#e2e8f0' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: '#374151' }}>This Week</h2>
              <span className="text-xs font-medium" style={{ color: '#64748b' }}>
                {workoutsThisWeek} of 7 days active
              </span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekGrid.map(({ label, date, workout }) => {
                const typeColor = workout ? (TYPE_COLORS[workout.type] || '#94a3b8') : '#f1f5f9'
                const isToday   = date === todayStr
                return (
                  <div key={date} className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-full rounded-xl flex flex-col items-center justify-center gap-1 py-4 transition-all"
                      style={{
                        backgroundColor: workout ? `${typeColor}18` : '#f8fafc',
                        border: `1.5px solid ${isToday ? typeColor || '#d97706' : workout ? `${typeColor}40` : '#f1f5f9'}`,
                      }}
                    >
                      {workout ? (
                        <>
                          <Dumbbell size={16} style={{ color: typeColor }} />
                          <span className="text-[9px] font-semibold text-center" style={{ color: typeColor }}>
                            {workout.type}
                          </span>
                          {workout.duration_minutes && (
                            <span className="text-[8px]" style={{ color: '#94a3b8' }}>{workout.duration_minutes}m</span>
                          )}
                        </>
                      ) : (
                        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: '#e2e8f0' }} />
                      )}
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: isToday ? '#d97706' : '#94a3b8' }}>{label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent workouts */}
          <div className="rounded-xl border bg-white p-5" style={{ borderColor: '#e2e8f0' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#374151' }}>Recent Workouts</h2>
            {loading ? (
              <p className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>Loading...</p>
            ) : workouts.length === 0 ? (
              <div className="text-center py-10">
                <Dumbbell size={28} className="mx-auto mb-2 opacity-20" style={{ color: '#94a3b8' }} />
                <p className="text-sm mb-3" style={{ color: '#94a3b8' }}>No workouts logged yet</p>
                <button onClick={() => setShowWorkout(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#dc2626' }}>
                  <Plus size={14} /> Log First Workout
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {workouts.slice(0, 8).map(w => {
                  const typeColor = TYPE_COLORS[w.type] || '#94a3b8'
                  return (
                    <div
                      key={w.id}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                      style={{ borderColor: '#f1f5f9', backgroundColor: '#fafafa' }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${typeColor}18` }}
                      >
                        <Dumbbell size={15} style={{ color: typeColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${typeColor}15`, color: typeColor }}
                          >
                            {w.type}
                          </span>
                          {w.duration_minutes && (
                            <span className="text-xs" style={{ color: '#94a3b8' }}>{w.duration_minutes} min</span>
                          )}
                        </div>
                        {w.notes && <p className="text-xs mt-0.5 truncate" style={{ color: '#64748b' }}>{w.notes}</p>}
                        {w.exercises?.length > 0 && (
                          <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                            {w.exercises.length} exercise{w.exercises.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-medium" style={{ color: '#374151' }}>
                          {w.date === todayStr ? 'Today' : format(parseISO(w.date), 'MMM d')}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-4">

          {/* Summary stats */}
          <div className="rounded-xl border bg-white p-5" style={{ borderColor: '#e2e8f0' }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#374151' }}>Activity Summary</h2>
            <div className="space-y-3">
              {[
                { label: 'Workouts This Week', value: workoutsThisWeek, icon: Activity, color: '#dc2626' },
                { label: 'Total Logged', value: workouts.length, icon: Dumbbell, color: '#16a34a' },
                { label: 'Current Weight', value: latestWeight ? `${latestWeight.weight_lbs} lbs` : '—', icon: Scale, color: '#7c3aed' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#fafafa' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
                    <Icon size={15} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>{label}</p>
                    <p className="text-lg font-bold" style={{ color: '#0f172a' }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weight trend chart */}
          {weightTrend.length > 0 && (
            <div className="rounded-xl border bg-white p-5" style={{ borderColor: '#e2e8f0' }}>
              <div className="flex items-center gap-2 mb-3">
                <Scale size={14} style={{ color: '#7c3aed' }} />
                <h2 className="text-sm font-semibold" style={{ color: '#374151' }}>Weight Trend</h2>
              </div>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      content={({ active, payload }) =>
                        active && payload?.length ? (
                          <div className="text-xs bg-gray-900 text-white px-2 py-1 rounded shadow">
                            {payload[0].value} lbs
                          </div>
                        ) : null
                      }
                    />
                    <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3, fill: '#7c3aed' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* AI fitness tip */}
          {aiTip && (
            <div className="rounded-xl border p-4" style={{ borderColor: '#dcfce7', backgroundColor: '#f0fdf4' }}>
              <div className="flex items-center gap-2 mb-2">
                <Flame size={14} style={{ color: '#16a34a' }} />
                <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>AI Insight</span>
              </div>
              <p className="text-sm" style={{ color: '#374151' }}>{aiTip}</p>
            </div>
          )}

          {/* Log weight card */}
          <div className="rounded-xl border bg-white p-4" style={{ borderColor: '#e2e8f0' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: '#374151' }}>Weight Log</p>
            {weightLogs.slice(0, 5).map(l => (
              <div key={l.id} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: '#f8fafc' }}>
                <span className="text-xs" style={{ color: '#64748b' }}>{format(parseISO(l.date), 'MMM d')}</span>
                <span className="text-sm font-bold font-mono" style={{ color: '#7c3aed' }}>{l.weight_lbs} lbs</span>
              </div>
            ))}
            {weightLogs.length === 0 && (
              <p className="text-xs" style={{ color: '#94a3b8' }}>No weight entries yet</p>
            )}
            <button
              onClick={() => setShowWeight(true)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-50"
              style={{ color: '#374151', borderColor: '#e2e8f0' }}
            >
              <Plus size={12} /> Log Weight
            </button>
          </div>

        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showWorkout && <LogWorkoutModal open={showWorkout} onClose={() => setShowWorkout(false)} onSave={handleSaveWorkout} />}
        {showWeight  && <LogWeightModal  open={showWeight}  onClose={() => setShowWeight(false)}  onSave={handleSaveWeight}  />}
      </AnimatePresence>
    </div>
  )
}
