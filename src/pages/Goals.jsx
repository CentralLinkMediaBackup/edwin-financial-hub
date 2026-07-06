import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Plus, X, Save, Check, ChevronDown, ChevronUp, Trash2, Filter } from 'lucide-react'
import { format, parseISO, isAfter } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

const LS_GOALS = 'eb-goals-v1'
const lsGet = key => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : [] } catch { return [] } }
const lsSet = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)) } catch {} }

const CATEGORIES = ['Business / CLM', 'Personal Development', 'Health & Fitness', 'Financial']
const STATUSES   = ['active', 'completed', 'backlog']

const catColors = {
  'Business / CLM':       { bg: '#dbeafe', text: '#1d4ed8' },
  'Personal Development': { bg: '#fae8ff', text: '#9333ea' },
  'Health & Fitness':     { bg: '#dcfce7', text: '#16a34a' },
  'Financial':            { bg: '#fef3c7', text: '#d97706' },
}

const statusColors = {
  active:    { bg: '#dcfce7', text: '#16a34a', label: 'Active' },
  completed: { bg: '#dbeafe', text: '#2563eb', label: 'Completed' },
  backlog:   { bg: '#f1f5f9', text: '#64748b', label: 'Backlog' },
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

function GoalCard({ goal, onUpdate, onDelete }) {
  const [expanded,  setExpanded]  = useState(false)
  const [editing,   setEditing]   = useState(false)
  const [editForm,  setEditForm]  = useState({
    title:       goal.title,
    category:    goal.category || 'Personal Development',
    deadline:    goal.deadline || '',
    progress:    goal.progress || 0,
    key_results: goal.key_results || [],
  })
  const [newKR, setNewKR] = useState('')

  const cat    = catColors[goal.category] || { bg: '#f1f5f9', text: '#64748b' }
  const status = statusColors[goal.status] || statusColors.active

  const toggleKR = (i) => {
    const updated = goal.key_results.map((kr, idx) =>
      idx === i ? { ...kr, done: !kr.done } : kr
    )
    onUpdate(goal.id, { key_results: updated })
  }

  const handleSave = () => {
    onUpdate(goal.id, {
      title:       editForm.title,
      category:    editForm.category,
      deadline:    editForm.deadline || null,
      progress:    Number(editForm.progress),
      key_results: editForm.key_results,
    })
    setEditing(false)
  }

  const addKR = () => {
    if (!newKR.trim()) return
    setEditForm(f => ({ ...f, key_results: [...f.key_results, { text: newKR.trim(), done: false }] }))
    setNewKR('')
  }

  const doneKRs = (goal.key_results || []).filter(kr => kr.done).length
  const totalKRs = (goal.key_results || []).length

  return (
    <motion.div
      layout
      className="rounded-xl border bg-white overflow-hidden"
      style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      {editing ? (
        <div className="p-5">
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Goal Title</label>
              <input style={inputStyle} value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Category</label>
                <select style={inputStyle} value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Deadline</label>
                <input style={inputStyle} type="date" value={editForm.deadline} onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Progress ({editForm.progress}%)</label>
              <input
                type="range" min="0" max="100"
                value={editForm.progress}
                onChange={e => setEditForm(f => ({ ...f, progress: e.target.value }))}
                style={{ width: '100%', accentColor: '#7c3aed' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: '#64748b' }}>Key Results</label>
              <div className="space-y-1.5 mb-2">
                {editForm.key_results.map((kr, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex-1 text-sm" style={{ color: '#374151' }}>{kr.text}</span>
                    <button
                      onClick={() => setEditForm(f => ({ ...f, key_results: f.key_results.filter((_, j) => j !== i) }))}
                      className="p-1 rounded hover:bg-gray-50"
                      style={{ color: '#94a3b8' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input style={{ ...inputStyle, flex: 1 }} placeholder="Add key result..." value={newKR} onChange={e => setNewKR(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKR()} />
                <button onClick={addKR} className="px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#7c3aed' }}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#7c3aed' }}>
              <Save size={14} /> Save
            </button>
            <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Cancel</button>
            <button onClick={() => onDelete(goal.id)} className="ml-auto p-2 rounded-lg text-sm hover:bg-red-50 transition-colors" style={{ color: '#dc2626' }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={cat}>{goal.category}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: status.bg, color: status.text }}>{status.label}</span>
                  {goal.deadline && (
                    <span className="text-xs" style={{ color: '#94a3b8' }}>
                      Due {format(parseISO(goal.deadline), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold" style={{ color: '#0f172a' }}>{goal.title}</h3>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
                  style={{ color: '#64748b', borderColor: '#e2e8f0' }}
                >
                  Edit
                </button>
                <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors" style={{ color: '#94a3b8' }}>
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: '#64748b' }}>Progress</span>
                <span className="text-xs font-bold" style={{ color: '#7c3aed' }}>{goal.progress}%</span>
              </div>
              <div className="h-2 rounded-full" style={{ backgroundColor: '#f1f5f9' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: '#7c3aed' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${goal.progress}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </div>

            {/* Quick KR count */}
            {totalKRs > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <Check size={11} style={{ color: '#16a34a' }} />
                <span className="text-xs" style={{ color: '#64748b' }}>{doneKRs}/{totalKRs} key results complete</span>
              </div>
            )}
          </div>

          {/* Expanded key results */}
          <AnimatePresence>
            {expanded && (goal.key_results || []).length > 0 && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t"
                style={{ borderColor: '#f1f5f9' }}
              >
                <div className="px-5 py-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#94a3b8' }}>Key Results</p>
                  {goal.key_results.map((kr, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <button
                        onClick={() => toggleKR(i)}
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border"
                        style={{
                          backgroundColor: kr.done ? '#ede9fe' : '#fff',
                          borderColor: kr.done ? '#7c3aed' : '#e2e8f0',
                        }}
                      >
                        {kr.done && <Check size={9} style={{ color: '#7c3aed' }} />}
                      </button>
                      <span className="text-sm" style={{ color: kr.done ? '#94a3b8' : '#374151', textDecoration: kr.done ? 'line-through' : 'none' }}>
                        {kr.text}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  )
}

export default function Goals() {
  const addToast = useStore(s => s.addToast)
  const [goals,       setGoals]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showAdd,     setShowAdd]     = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCat,   setFilterCat]   = useState('all')
  const [form, setForm] = useState({
    title: '', category: 'Personal Development', deadline: '', progress: 0, status: 'active', key_results: [],
  })
  const [newKR, setNewKR] = useState('')

  const load = async () => {
    const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
    if (!error && data) {
      setGoals(data)
      lsSet(LS_GOALS, data)
    } else {
      setGoals(lsGet(LS_GOALS))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.title.trim()) return addToast('Title required', 'error')
    const newGoal = {
      id: `g-${Date.now()}`, created_at: new Date().toISOString(),
      title: form.title.trim(), category: form.category, deadline: form.deadline || null,
      progress: Number(form.progress), status: form.status, key_results: form.key_results,
    }
    const { data, error } = await supabase.from('goals').insert([{ ...newGoal }]).select()
    const added = (!error && data) ? data[0] : newGoal
    setGoals(g => { const u = [added, ...g]; lsSet(LS_GOALS, u); return u })
    setForm({ title: '', category: 'Personal Development', deadline: '', progress: 0, status: 'active', key_results: [] })
    setNewKR(''); setShowAdd(false); addToast('Goal added')
  }

  const handleUpdate = async (id, updates) => {
    await supabase.from('goals').update(updates).eq('id', id)
    setGoals(g => { const u = g.map(goal => goal.id === id ? { ...goal, ...updates } : goal); lsSet(LS_GOALS, u); return u })
  }

  const handleDelete = async (id) => {
    await supabase.from('goals').delete().eq('id', id)
    setGoals(g => { const u = g.filter(goal => goal.id !== id); lsSet(LS_GOALS, u); return u })
    addToast('Goal deleted')
  }

  const addFormKR = () => {
    if (!newKR.trim()) return
    setForm(f => ({ ...f, key_results: [...f.key_results, { text: newKR.trim(), done: false }] }))
    setNewKR('')
  }

  const filtered = goals.filter(g => {
    if (filterStatus !== 'all' && g.status !== filterStatus) return false
    if (filterCat !== 'all' && g.category !== filterCat) return false
    return true
  })

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    const catGoals = filtered.filter(g => g.category === cat)
    if (catGoals.length) acc[cat] = catGoals
    return acc
  }, {})

  const activeCount = goals.filter(g => g.status === 'active').length

  return (
    <div className="p-5 md:p-7 max-w-[1100px] mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#ede9fe' }}>
              <Target size={20} style={{ color: '#7c3aed' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>Your Goals</h1>
              <p className="text-sm" style={{ color: '#64748b' }}>{activeCount} active goal{activeCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#7c3aed' }}
          >
            <Plus size={15} /> Add Goal
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
              <h3 className="text-sm font-semibold mb-4" style={{ color: '#374151' }}>New Goal</h3>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Goal Title *</label>
                  <input style={inputStyle} placeholder="e.g. Launch CLM redesign" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Category</label>
                    <select style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Status</label>
                    <select style={inputStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Deadline</label>
                    <input style={inputStyle} type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Initial Progress ({form.progress}%)</label>
                    <input type="range" min="0" max="100" value={form.progress} onChange={e => setForm(f => ({ ...f, progress: e.target.value }))} style={{ width: '100%', marginTop: '8px', accentColor: '#7c3aed' }} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: '#64748b' }}>Key Results</label>
                  <div className="space-y-1.5 mb-2">
                    {form.key_results.map((kr, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#f8fafc' }}>
                        <span className="flex-1 text-sm" style={{ color: '#374151' }}>{kr.text}</span>
                        <button onClick={() => setForm(f => ({ ...f, key_results: f.key_results.filter((_, j) => j !== i) }))} className="p-0.5" style={{ color: '#94a3b8' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder="Add a key result..."
                      value={newKR}
                      onChange={e => setNewKR(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addFormKR()}
                    />
                    <button onClick={addFormKR} className="px-3 py-2 rounded-lg text-white text-sm" style={{ backgroundColor: '#7c3aed' }}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#7c3aed' }}>
                  <Save size={14} /> Save Goal
                </button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="text-xs font-medium flex items-center gap-1" style={{ color: '#64748b' }}><Filter size={12} /> Filter:</span>
        <div className="flex gap-1.5">
          {['all', ...STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
              style={{
                backgroundColor: filterStatus === s ? '#7c3aed' : '#fff',
                color:           filterStatus === s ? '#fff' : '#64748b',
                borderColor:     filterStatus === s ? '#7c3aed' : '#e2e8f0',
              }}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {['all', ...CATEGORIES].map(c => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
              style={{
                backgroundColor: filterCat === c ? '#0f172a' : '#fff',
                color:           filterCat === c ? '#fff' : '#64748b',
                borderColor:     filterCat === c ? '#0f172a' : '#e2e8f0',
              }}
            >
              {c === 'all' ? 'All Categories' : c.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Goals by category */}
      {loading ? (
        <div className="text-center py-12" style={{ color: '#94a3b8' }}>Loading goals...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border bg-white" style={{ borderColor: '#e2e8f0' }}>
          <Target size={32} className="mx-auto mb-3 opacity-20" style={{ color: '#94a3b8' }} />
          <p className="font-medium mb-1" style={{ color: '#374151' }}>No goals found</p>
          <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>Create your first goal to get started</p>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#7c3aed' }}>
            <Plus size={14} /> Add Goal
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byCategory).map(([cat, catGoals]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold" style={{ color: '#374151' }}>{cat}</h2>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={catColors[cat] || { bg: '#f1f5f9', text: '#64748b' }}
                >
                  {catGoals.length}
                </span>
              </div>
              <div className="space-y-3">
                {catGoals.map(goal => (
                  <GoalCard key={goal.id} goal={goal} onUpdate={handleUpdate} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
