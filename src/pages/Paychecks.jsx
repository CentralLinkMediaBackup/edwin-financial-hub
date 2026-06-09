import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Plus, Trash2, Pencil, X, Check, Clock, FileText } from 'lucide-react'
import { format, parseISO, isAfter, isBefore, startOfDay, addDays } from 'date-fns'
import { useStore } from '../store/useStore'
import { formatCurrency, formatDate } from '../lib/formatters'

const SOURCES = ['CLM Client Payment', 'Gift', 'Tax Return', 'Side Income', 'Other']

// Animated count-up hook
function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(target)
  const prevTarget = useRef(target)
  const frame = useRef(null)

  useEffect(() => {
    if (target === prevTarget.current) return
    const start = prevTarget.current
    prevTarget.current = target
    const startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const pct = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - pct, 3)
      setValue(start + (target - start) * eased)
      if (pct < 1) frame.current = requestAnimationFrame(tick)
      else setValue(target)
    }
    if (frame.current) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(tick)
    return () => { if (frame.current) cancelAnimationFrame(frame.current) }
  }, [target, duration])

  return value
}

function AddOneTimeModal({ onClose, onSave }) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [source, setSource] = useState(SOURCES[0])
  const [note, setNote] = useState('')

  const handleSave = () => {
    if (!amount || !date) return
    onSave({ amount: Number(amount), date, source, note, type: 'in', isOneTime: true })
    onClose()
  }

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
          <h2 className="text-lg font-bold text-white">Log One-Time Income</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Source</label>
            <select
              value={source}
              onChange={e => setSource(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
            >
              {SOURCES.map(s => (
                <option key={s} value={s} className="bg-slate-900">{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Additional details..."
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
        </div>
        <div className="p-5 border-t border-white/10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={!amount || !date}
            className="w-full py-3 rounded-xl font-semibold text-white bg-amber-500 hover:bg-amber-400 transition-colors disabled:opacity-40"
          >
            Log Income
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

function EditPaycheckModal({ paycheck, onClose, onSave }) {
  const isOneTime = paycheck.isOneTime
  const [amount, setAmount] = useState(paycheck.amount)
  const [date, setDate] = useState(paycheck.date || format(new Date(), 'yyyy-MM-dd'))
  const [source, setSource] = useState(paycheck.source || (isOneTime ? SOURCES[0] : 'Prosperity Fire Protection, LLC'))
  const [note, setNote] = useState(paycheck.note || '')

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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 p-6"
        style={{ backgroundColor: 'var(--bg-panel)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{isOneTime ? 'Edit One-Time Income' : 'Edit Paycheck'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
                step="0.01"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Source</label>
            {isOneTime ? (
              <select
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
              >
                {SOURCES.map(s => (
                  <option key={s} value={s} className="bg-slate-900">{s}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
              />
            )}
          </div>
          {isOneTime && (
            <div>
              <label className="text-sm text-slate-400 block mb-1">Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
          )}
        </div>
        <button
          onClick={() => { onSave({ amount, date, source, note }); onClose() }}
          className="w-full mt-5 py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-400 transition-colors"
        >
          Save
        </button>
      </motion.div>
    </div>
  )
}

export default function Paychecks() {
  const paychecks = useStore(s => s.paychecks)
  const transactions = useStore(s => s.transactions)
  const addTransaction = useStore(s => s.addTransaction)
  const updateTransaction = useStore(s => s.updateTransaction)
  const updatePaycheck = useStore(s => s.updatePaycheck)
  const deletePaycheck = useStore(s => s.deletePaycheck)
  const addToast = useStore(s => s.addToast)

  const [projectionDays, setProjectionDays] = useState(30)
  const [activeTab, setActiveTab] = useState('recurring')
  const [showOneTime, setShowOneTime] = useState(false)
  const [editPaycheck, setEditPaycheck] = useState(null)
  const [editTransaction, setEditTransaction] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const today = startOfDay(new Date())

  // Split paychecks into upcoming and past
  const upcomingPaychecks = paychecks
    .filter(p => isAfter(parseISO(p.date), today) || p.date === format(today, 'yyyy-MM-dd'))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8)

  const pastPaychecks = paychecks
    .filter(p => isBefore(parseISO(p.date), today))
    .sort((a, b) => b.date.localeCompare(a.date))

  const oneTimeIncome = transactions.filter(t => t.isOneTime && t.type === 'in')

  // Projected income calculation
  const projectionEnd = addDays(today, projectionDays)
  const projectedTotal = paychecks
    .filter(p => {
      const d = parseISO(p.date)
      return (isAfter(d, today) || p.date === format(today, 'yyyy-MM-dd')) && isBefore(d, projectionEnd)
    })
    .reduce((s, p) => s + p.amount, 0)

  const animatedProjected = useCountUp(projectedTotal)

  // Monthly/yearly stats
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const thisYearStart = new Date(today.getFullYear(), 0, 1)

  const thisMonthIncome = pastPaychecks
    .filter(p => isAfter(parseISO(p.date), thisMonthStart))
    .reduce((s, p) => s + p.amount, 0)

  const thisYearIncome = pastPaychecks
    .filter(p => isAfter(parseISO(p.date), thisYearStart))
    .reduce((s, p) => s + p.amount, 0)

  const handleDelete = (id) => {
    deletePaycheck(id)
    setDeleteConfirm(null)
    addToast('Paycheck deleted')
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign size={24} className="text-emerald-400" />
            Paychecks
          </h1>
          <p className="text-slate-400 text-sm mt-1">$980 every Friday — recurring schedule</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowOneTime(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-400 transition-colors"
        >
          <Plus size={16} />
          One-Time Income
        </motion.button>
      </div>

      {/* Projected Income */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glass p-5 mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white">Projected Income</h2>
          <div className="flex gap-1">
            {[30, 60, 90].map(d => (
              <button
                key={d}
                onClick={() => setProjectionDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  projectionDays === d
                    ? 'bg-amber-500 text-white'
                    : 'bg-white/10 text-slate-400 hover:bg-white/15'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-3xl font-bold font-mono text-emerald-400">
            {formatCurrency(animatedProjected)}
          </p>
          <span className="text-slate-400 text-sm">next {projectionDays} days</span>
        </div>
      </motion.div>

      {/* Upcoming Paychecks */}
      <div className="card-glass overflow-hidden mb-6">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">Upcoming Paychecks</h2>
        </div>
        <div className="divide-y divide-white/5">
          {upcomingPaychecks.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{formatDate(p.date)}</p>
                  <p className="text-xs text-slate-500">{p.source || 'Employment'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-emerald-400">{formatCurrency(p.amount)}</span>
                <button
                  onClick={() => setEditPaycheck(p)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                >
                  <Pencil size={13} />
                </button>
                {deleteConfirm === p.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10">
                      <Check size={13} />
                    </button>
                    <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(p.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="card-glass overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {['recurring', 'one-time'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab === 'recurring' ? `Recurring (${pastPaychecks.length})` : `One-Time (${oneTimeIncome.length})`}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'recurring' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500">Source</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pastPaychecks.slice(0, 20).map(p => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-2.5 text-slate-300">{formatDate(p.date)}</td>
                    <td className="px-4 py-2.5 font-mono text-emerald-400 font-bold">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-2.5 text-slate-400">{p.source || 'Employment'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => deletePaycheck(p.id)}
                        className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {pastPaychecks.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No past paychecks yet</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500">Source</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500">Note</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {oneTimeIncome.map(t => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-2.5 text-slate-300">{formatDate(t.date)}</td>
                    <td className="px-4 py-2.5 font-mono text-emerald-400 font-bold">{formatCurrency(t.amount)}</td>
                    <td className="px-4 py-2.5 text-slate-400">{t.source}</td>
                    <td className="px-4 py-2.5 text-slate-500">{t.note || '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => setEditTransaction(t)}
                        className="p-1 rounded text-slate-500 hover:text-amber-400 transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {oneTimeIncome.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No one-time income logged</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer stats */}
        <div className="p-4 border-t border-white/10 flex gap-6">
          <div>
            <p className="text-xs text-slate-400">This Month</p>
            <p className="text-base font-bold font-mono text-white">{formatCurrency(thisMonthIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">This Year</p>
            <p className="text-base font-bold font-mono text-amber-400">{formatCurrency(thisYearIncome)}</p>
          </div>
        </div>
      </div>

      {/* W2 Summary — Tax Year 2025 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glass overflow-hidden mb-6"
      >
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <FileText size={16} className="text-amber-400" />
          <h2 className="text-base font-semibold text-white">W-2 Summary — Tax Year 2025</h2>
          <span className="ml-auto text-xs text-slate-500">Prosperity Fire Protection, LLC</span>
        </div>
        <div className="divide-y divide-white/5">
          {[
            { box: 'Box 1',  label: 'Total Wages',            amount: 24959.82, color: 'text-emerald-400' },
            { box: 'Box 2',  label: 'Federal Tax Withheld',   amount: 2063.15,  color: 'text-red-400' },
            { box: 'Box 4',  label: 'Social Security Tax',    amount: 1547.51,  color: 'text-red-400' },
            { box: 'Box 6',  label: 'Medicare Tax',           amount: 361.92,   color: 'text-red-400' },
          ].map(({ box, label, amount, color }) => (
            <div key={box} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-10">{box}</span>
                <span className="text-sm text-slate-300">{label}</span>
              </div>
              <span className={`font-mono font-bold text-sm ${color}`}>${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 bg-white/5">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-10"></span>
              <span className="text-sm font-semibold text-white">Total Tax Paid</span>
            </div>
            <span className="font-mono font-bold text-sm text-amber-400">$3,972.58</span>
          </div>
        </div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showOneTime && (
          <AddOneTimeModal
            onClose={() => setShowOneTime(false)}
            onSave={addTransaction}
          />
        )}
        {editPaycheck && (
          <EditPaycheckModal
            paycheck={editPaycheck}
            onClose={() => setEditPaycheck(null)}
            onSave={(updates) => updatePaycheck(editPaycheck.id, updates)}
          />
        )}
        {editTransaction && (
          <EditPaycheckModal
            paycheck={{ ...editTransaction, isOneTime: true }}
            onClose={() => setEditTransaction(null)}
            onSave={(updates) => updateTransaction(editTransaction.id, updates)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
