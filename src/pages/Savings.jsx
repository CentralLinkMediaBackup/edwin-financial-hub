import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PiggyBank, Plus, Trash2, Pencil, X, ChevronDown, ChevronUp, Target, Calendar } from 'lucide-react'
import { format, differenceInWeeks, parseISO, addWeeks } from 'date-fns'
import { useStore } from '../store/useStore'
import { formatCurrency, formatDate } from '../lib/formatters'

function weeksFromNow(targetDate) {
  if (!targetDate) return null
  const today = new Date()
  const target = parseISO(targetDate)
  const weeks = differenceInWeeks(target, today)
  return Math.max(1, weeks)
}

function weeklyNeeded(remaining, targetDate) {
  const weeks = weeksFromNow(targetDate)
  if (!weeks) return null
  return remaining / weeks
}

function projectedCompletion(currentAmount, targetAmount, weeklyContrib) {
  if (!weeklyContrib || weeklyContrib <= 0) return null
  const remaining = targetAmount - currentAmount
  if (remaining <= 0) return format(new Date(), 'yyyy-MM-dd')
  const weeks = Math.ceil(remaining / weeklyContrib)
  return format(addWeeks(new Date(), weeks), 'yyyy-MM-dd')
}

// Animated count-up hook
function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0)
  const prevTarget = useRef(target)

  useEffect(() => {
    if (target === prevTarget.current) return
    const start = prevTarget.current
    prevTarget.current = target
    const startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const pct = Math.min(elapsed / duration, 1)
      setValue(start + (target - start) * pct)
      if (pct < 1) requestAnimationFrame(tick)
      else setValue(target)
    }
    requestAnimationFrame(tick)
  }, [target, duration])

  return value
}

function GoalCard({ goal, onDeposit, onEdit, onDelete }) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [depositMode, setDepositMode] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')

  const pct = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)
  const isGoalMode = !!goal.targetDate
  const weekly = isGoalMode ? weeklyNeeded(remaining, goal.targetDate) : null
  const projCompletion = isGoalMode && weekly ? projectedCompletion(goal.currentAmount, goal.targetAmount, weekly) : null
  const animatedPct = useCountUp(pct)

  const handleDeposit = () => {
    const amt = parseFloat(depositAmount)
    if (!amt || amt <= 0) return
    onDeposit(goal.id, amt)
    setDepositAmount('')
    setDepositMode(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-glass p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">{goal.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
              isGoalMode
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
            }`}>
              {isGoalMode ? 'Goal' : 'Open'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">Target: {formatCurrency(goal.targetAmount)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-white font-bold font-mono">{formatCurrency(goal.currentAmount)}</span>
          <span className="text-slate-400">{animatedPct.toFixed(1)}%</span>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </div>
        {goal.currentAmount >= goal.targetAmount && (
          <p className="text-xs text-emerald-400 mt-1 font-medium">Goal reached!</p>
        )}
      </div>

      {/* Info chips */}
      {isGoalMode && (
        <div className="flex flex-wrap gap-2 mb-4">
          {weekly !== null && remaining > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
              <Target size={12} className="text-amber-400" />
              <span className="text-slate-400">Save <span className="text-amber-400 font-bold">{formatCurrency(weekly)}</span>/week</span>
            </div>
          )}
          {goal.targetDate && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
              <Calendar size={12} className="text-blue-400" />
              <span className="text-slate-400">Target: <span className="text-blue-400 font-bold">{formatDate(goal.targetDate)}</span></span>
            </div>
          )}
          {projCompletion && remaining > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
              <span className="text-slate-400">Projected: <span className="text-slate-300">{formatDate(projCompletion)}</span></span>
            </div>
          )}
        </div>
      )}

      {/* Deposit */}
      <AnimatePresence mode="wait">
        {depositMode ? (
          <motion.div
            key="deposit"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 mb-3 overflow-hidden"
          >
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:outline-none"
                autoFocus
                min="0"
                step="0.01"
                onKeyDown={e => e.key === 'Enter' && handleDeposit()}
              />
            </div>
            <button
              onClick={handleDeposit}
              className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setDepositMode(false); setDepositAmount('') }}
              className="px-3 py-2 rounded-lg bg-white/10 text-slate-400 text-sm hover:bg-white/15 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setDepositMode(true)}
            className="w-full py-2 rounded-xl border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/10 transition-colors mb-3"
          >
            Log Deposit
          </motion.button>
        )}
      </AnimatePresence>

      {/* Deposit history */}
      {goal.deposits && goal.deposits.length > 0 && (
        <div>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {historyOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {goal.deposits.length} deposit{goal.deposits.length !== 1 ? 's' : ''}
          </button>
          <AnimatePresence>
            {historyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-2"
              >
                <div className="space-y-1">
                  {goal.deposits.map((dep, i) => (
                    <div key={i} className="flex justify-between text-xs px-3 py-1.5 rounded-lg bg-white/5">
                      <span className="text-slate-400">{dep.date ? formatDate(dep.date) : 'Unknown date'}</span>
                      <span className="text-emerald-400 font-mono">+{formatCurrency(dep.amount)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

function GoalModal({ goal, onClose, onSave }) {
  const [name, setName] = useState(goal?.name || '')
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount || '')
  const [targetDate, setTargetDate] = useState(goal?.targetDate || '')

  const handleSave = () => {
    if (!name || !targetAmount) return
    onSave({ name, targetAmount: Number(targetAmount), targetDate: targetDate || null })
    onClose()
  }

  const weekly = targetDate && targetAmount
    ? weeklyNeeded(Number(targetAmount), targetDate)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 overflow-hidden"
        style={{ backgroundColor: '#0F1629' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">{goal ? 'Edit Goal' : 'New Savings Goal'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Goal Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Emergency Fund, Vacation"
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Target Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                value={targetAmount}
                onChange={e => setTargetAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Target Date (optional)</label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          {weekly !== null && weekly > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-300">
                You need to save <strong>{formatCurrency(weekly)}/week</strong> to reach this goal by {formatDate(targetDate)}.
              </p>
            </div>
          )}
          {!targetDate && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-slate-400">
                No target date set — this goal will run open-ended. You can always add a date later.
              </p>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-white/10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={!name || !targetAmount}
            className="w-full py-3 rounded-xl font-semibold text-white bg-amber-500 hover:bg-amber-400 transition-colors disabled:opacity-40"
          >
            {goal ? 'Save Changes' : 'Create Goal'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export default function Savings() {
  const savingsGoals = useStore(s => s.savingsGoals)
  const addSavingsGoal = useStore(s => s.addSavingsGoal)
  const updateSavingsGoal = useStore(s => s.updateSavingsGoal)
  const deleteSavingsGoal = useStore(s => s.deleteSavingsGoal)
  const contributeToGoal = useStore(s => s.contributeToGoal)
  const addToast = useStore(s => s.addToast)

  const [showAdd, setShowAdd] = useState(false)
  const [editGoal, setEditGoal] = useState(null)

  const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0)
  const totalTarget = savingsGoals.reduce((s, g) => s + g.targetAmount, 0)
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0

  const handleContribute = (goalId, amount) => {
    const goal = savingsGoals.find(g => g.id === goalId)
    if (!goal) return
    const deposit = { amount, date: format(new Date(), 'yyyy-MM-dd') }
    const existingDeposits = goal.deposits || []
    updateSavingsGoal(goalId, {
      currentAmount: goal.currentAmount + amount,
      deposits: [...existingDeposits, deposit],
    })
    addToast(`+${formatCurrency(amount)} added to ${goal.name}`)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <PiggyBank size={24} className="text-emerald-400" />
            Savings Goals
          </h1>
          <p className="text-slate-400 text-sm mt-1">{savingsGoals.length} goal{savingsGoals.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-400 transition-colors"
        >
          <Plus size={16} />
          Add Goal
        </motion.button>
      </div>

      {/* Summary */}
      {savingsGoals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-slate-400">Total Saved</p>
              <p className="text-2xl font-bold font-mono text-emerald-400">{formatCurrency(totalSaved)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Total Target</p>
              <p className="text-xl font-bold font-mono text-white">{formatCurrency(totalTarget)}</p>
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${overallPct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1 text-right">{overallPct.toFixed(1)}% of all goals</p>
        </motion.div>
      )}

      {/* Goals */}
      {savingsGoals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-glass p-12 text-center"
        >
          <PiggyBank size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">No savings goals yet</h3>
          <p className="text-slate-400 text-sm mb-4">Create your first goal to start tracking your savings progress.</p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAdd(true)}
            className="px-5 py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-400 transition-colors"
          >
            Create Goal
          </motion.button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {savingsGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onDeposit={handleContribute}
              onEdit={() => setEditGoal(goal)}
              onDelete={() => {
                deleteSavingsGoal(goal.id)
                addToast('Goal deleted')
              }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAdd && (
          <GoalModal
            onClose={() => setShowAdd(false)}
            onSave={(data) => {
              addSavingsGoal({ ...data, deposits: [] })
            }}
          />
        )}
        {editGoal && (
          <GoalModal
            goal={editGoal}
            onClose={() => setEditGoal(null)}
            onSave={(data) => updateSavingsGoal(editGoal.id, data)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
