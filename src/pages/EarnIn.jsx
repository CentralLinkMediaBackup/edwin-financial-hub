import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, CheckCircle2, Circle, AlertTriangle, ChevronDown, ChevronUp, Trash2, X, Check } from 'lucide-react'
import { format, addDays, parseISO } from 'date-fns'
import { useStore } from '../store/useStore'
import { formatCurrency, formatDate } from '../lib/formatters'

const DAYS = [
  { key: 'fri', label: 'Friday', offset: 0, warningKey: false },
  { key: 'sat', label: 'Saturday', offset: 1, warningKey: false },
  { key: 'sun', label: 'Sunday', offset: 2, warningKey: false },
  { key: 'mon', label: 'Monday', offset: 3, warningKey: true },
]

function getCycleEnd(startDate) {
  const d = parseISO(startDate)
  return format(addDays(d, 6), 'yyyy-MM-dd')
}

function getRepaymentDate(startDate) {
  const d = parseISO(startDate)
  // Next Friday = start + 7 days
  return format(addDays(d, 7), 'yyyy-MM-dd')
}

function CycleCard({ log, onMarkTaken, isActive }) {
  const settings = useStore(s => s.settings.earnIn)
  const cycleEnd = getCycleEnd(log.cycleStartDate)
  const repayDate = getRepaymentDate(log.cycleStartDate)
  const totalTaken = DAYS.reduce((sum, d) => {
    return log[`${d.key}_taken`] ? sum + (log.amounts?.[d.key] || settings[d.key]) : sum
  }, 0)

  return (
    <div className="space-y-4">
      {/* Cycle header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold">
            {formatDate(log.cycleStartDate)} — {formatDate(cycleEnd)}
          </p>
          <p className="text-slate-400 text-sm">Repayment: {formatDate(repayDate)} · {formatCurrency(log.repaymentAmount || settings.repaymentAmount)}</p>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          log.status === 'active'
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        }`}>
          {log.status === 'active' ? 'Active' : 'Repaid'}
        </span>
      </div>

      {/* Step tracker */}
      <div className="relative">
        {/* Connection line */}
        <div className="absolute top-8 left-[12%] right-[12%] h-0.5 bg-white/10 z-0" />
        <motion.div
          className="absolute top-8 left-[12%] h-0.5 bg-amber-500/60 z-0"
          initial={{ width: 0 }}
          animate={{
            width: (() => {
              const takenCount = DAYS.filter(d => log[`${d.key}_taken`]).length
              if (takenCount === 0) return '0%'
              const pct = ((takenCount - 1) / (DAYS.length - 1)) * 76
              return `${pct}%`
            })()
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        <div className="relative z-10 grid grid-cols-4 gap-2">
          {DAYS.map((day, i) => {
            const taken = log[`${day.key}_taken`]
            const amount = log.amounts?.[day.key] || settings[day.key]
            const dayDate = format(addDays(parseISO(log.cycleStartDate), day.offset), 'MMM d')

            return (
              <motion.div
                key={day.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  taken
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                {/* Icon */}
                <motion.div
                  animate={taken ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {taken
                    ? <CheckCircle2 size={20} className="text-emerald-400" />
                    : <Circle size={20} className="text-slate-600" />
                  }
                </motion.div>

                <div className="text-center">
                  <p className={`text-xs font-semibold ${taken ? 'text-emerald-400' : 'text-white'}`}>
                    {day.label}
                  </p>
                  <p className="text-xs text-slate-500">{dayDate}</p>
                  <p className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                    {formatCurrency(amount)}
                  </p>
                </div>

                {day.warningKey && !taken && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30">
                    <AlertTriangle size={9} className="text-orange-400" />
                    <span className="text-orange-400 text-[9px] font-medium">Caution</span>
                  </div>
                )}

                {taken ? (
                  <span className="text-xs text-emerald-500 font-medium">Taken</span>
                ) : isActive && onMarkTaken ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onMarkTaken(log.id, day.key)}
                    className="text-xs px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                  >
                    Take
                  </motion.button>
                ) : null}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Monday warning */}
      {!log.mon_taken && isActive && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <AlertTriangle size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-orange-300">
            <strong>Monday caution:</strong> Only take if needed to avoid a negative balance on repayment day.
          </p>
        </div>
      )}

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
          <p className="text-xs text-slate-400">Taken</p>
          <p className="text-base font-bold font-mono text-amber-400">{formatCurrency(totalTaken)}</p>
        </div>
        <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
          <p className="text-xs text-slate-400">Repayment</p>
          <p className="text-base font-bold font-mono text-red-400">-{formatCurrency(log.repaymentAmount || settings.repaymentAmount)}</p>
        </div>
        <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
          <p className="text-xs text-slate-400">Net</p>
          <p className={`text-base font-bold font-mono ${totalTaken - (log.repaymentAmount || settings.repaymentAmount) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(totalTaken - (log.repaymentAmount || settings.repaymentAmount))}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function EarnIn() {
  const earnInLogs = useStore(s => s.earnInLogs)
  const markStepTaken = useStore(s => s.markStepTaken)
  const deleteEarnInLog = useStore(s => s.deleteEarnInLog)
  const addToast = useStore(s => s.addToast)

  const [historyOpen, setHistoryOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [expandedHistory, setExpandedHistory] = useState(null)

  const activeLog = earnInLogs.find(l => l.status === 'active')
  const historyLogs = earnInLogs.filter(l => l.status !== 'active')

  const handleDelete = (id) => {
    deleteEarnInLog(id)
    setDeleteConfirm(null)
    addToast('Earn In cycle deleted')
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp size={24} className="text-emerald-400" />
          Earn In
        </h1>
        <p className="text-slate-400 text-sm mt-1">Weekly cash advance — new cycle every Friday</p>
      </div>

      {/* Current Cycle */}
      {activeLog ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-base font-semibold text-white">Current Cycle</h2>
          </div>
          <CycleCard log={activeLog} onMarkTaken={markStepTaken} isActive />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-glass p-8 mb-6 text-center"
        >
          <TrendingUp size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No active Earn In cycle. A new cycle starts every Friday.</p>
        </motion.div>
      )}

      {/* History */}
      {historyLogs.length > 0 && (
        <div className="card-glass overflow-hidden">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
          >
            <span className="text-base font-semibold text-white">
              Past Cycles ({historyLogs.length})
            </span>
            {historyOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </button>

          <AnimatePresence>
            {historyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="border-t border-white/10 divide-y divide-white/5">
                  {historyLogs.map(log => (
                    <div key={log.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => setExpandedHistory(expandedHistory === log.id ? null : log.id)}
                          className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white"
                        >
                          {expandedHistory === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          Cycle: {formatDate(log.cycleStartDate)}
                        </button>
                        {deleteConfirm === log.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleDelete(log.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(log.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      {/* Day chips */}
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map(d => (
                          <span
                            key={d.key}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              log[`${d.key}_taken`]
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-white/5 text-slate-500 border border-white/10'
                            }`}
                          >
                            {d.label.slice(0, 3)} {log[`${d.key}_taken`] ? `+${formatCurrency(log.amounts?.[d.key] || 0)}` : 'Skipped'}
                          </span>
                        ))}
                      </div>

                      <AnimatePresence>
                        {expandedHistory === log.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-3"
                          >
                            <CycleCard log={log} isActive={false} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
