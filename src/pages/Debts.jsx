import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, GraduationCap, Car, Plus, ChevronDown, ChevronUp,
  TrendingDown, DollarSign, Calendar, AlertCircle, Check, Info
} from 'lucide-react'
import { format, parseISO, addMonths } from 'date-fns'
import { useStore } from '../store/useStore'
import { formatCurrency } from '../lib/formatters'
import { Modal } from '../components/ui/Modal'

// ── Circular Arc Progress ─────────────────────────────────────────────────────
function CircularProgress({ percent, size = 120, strokeWidth = 10, color = '#F59E0B' }) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, percent))

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - (pct / 100) * circumference }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
      />
    </svg>
  )
}

// ── Payoff date calculator ────────────────────────────────────────────────────
function calcPayoffDate(balance, minPayment, apr) {
  if (balance <= 0 || minPayment <= 0) return null
  if (apr === 0) {
    const months = Math.ceil(balance / minPayment)
    return addMonths(new Date(), months)
  }
  const monthlyRate = apr / 100 / 12
  let remaining = balance
  let months = 0
  while (remaining > 0 && months < 600) {
    const interest = remaining * monthlyRate
    remaining = remaining + interest - minPayment
    if (remaining <= 0) break
    months++
  }
  return addMonths(new Date(), months + 1)
}

function calcTotalInterest(balance, minPayment, apr) {
  if (apr === 0 || balance <= 0 || minPayment <= 0) return 0
  const monthlyRate = apr / 100 / 12
  let remaining = balance
  let totalInterest = 0
  let months = 0
  while (remaining > 0 && months < 600) {
    const interest = remaining * monthlyRate
    totalInterest += interest
    remaining = remaining + interest - minPayment
    months++
  }
  return totalInterest
}

// ── Debt Icon ─────────────────────────────────────────────────────────────────
function debtIcon(name) {
  if (name.toLowerCase().includes('college') || name.toLowerCase().includes('student')) return GraduationCap
  if (name.toLowerCase().includes('car') || name.toLowerCase().includes('auto')) return Car
  return CreditCard
}
const debtColors = ['#3B82F6', '#8B5CF6', '#F59E0B']

// ── Extra Payment Modal ───────────────────────────────────────────────────────
function ExtraPaymentModal({ isOpen, onClose, debt, onPay }) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = () => {
    const amt = parseFloat(amount)
    if (!amt || isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return }
    if (amt > debt.totalBalance) { setError('Amount exceeds remaining balance'); return }
    onPay(debt.id, { amount: amt, note, type: 'extra' })
    onClose()
    setAmount('')
    setNote('')
    setError('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Extra Payment" maxWidth="max-w-sm">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-slate-400 mb-3">
            Remaining balance: <span className="text-white font-mono">{formatCurrency(debt?.totalBalance || 0)}</span>
          </p>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number"
              value={amount}
              onChange={e => { setAmount(e.target.value); setError('') }}
              className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/60 focus:outline-none"
              placeholder="0.00"
              step="0.01"
            />
          </div>
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/60 focus:outline-none"
            placeholder="e.g. Bonus payment"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ backgroundColor: '#F59E0B' }}
        >
          <Check size={16} /> Log Payment
        </motion.button>
      </div>
    </Modal>
  )
}

// ── Debt Card ─────────────────────────────────────────────────────────────────
function DebtCard({ debt, color, index }) {
  const updateDebt = useStore(s => s.updateDebt)
  const logDebtPayment = useStore(s => s.logDebtPayment)

  const [editing, setEditing] = useState(false)
  const [localBalance, setLocalBalance] = useState(debt.totalBalance.toString())
  const [localMin, setLocalMin] = useState(debt.minimumPayment.toString())
  const [localAPR, setLocalAPR] = useState(debt.apr.toString())
  const [historyOpen, setHistoryOpen] = useState(false)
  const [payModal, setPayModal] = useState(false)

  const payoffDate = useMemo(() =>
    calcPayoffDate(debt.totalBalance, debt.minimumPayment, debt.apr),
    [debt.totalBalance, debt.minimumPayment, debt.apr]
  )
  const totalInterest = useMemo(() =>
    calcTotalInterest(debt.totalBalance, debt.minimumPayment, debt.apr),
    [debt.totalBalance, debt.minimumPayment, debt.apr]
  )

  const originalBalance = useMemo(() => {
    return debt.paymentHistory.reduce((sum, p) => sum + p.amount, 0) + debt.totalBalance
  }, [debt.paymentHistory, debt.totalBalance])
  const paidOff = originalBalance > 0 ? ((originalBalance - debt.totalBalance) / originalBalance) * 100 : 0

  const Icon = debtIcon(debt.name)

  const handleSaveEdit = () => {
    updateDebt(debt.id, {
      totalBalance: parseFloat(localBalance) || 0,
      minimumPayment: parseFloat(localMin) || 0,
      apr: parseFloat(localAPR) || 0,
    })
    setEditing(false)
  }

  const inputCls = 'px-3 py-2 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/60 focus:outline-none w-full font-mono'

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
        className="card-glass p-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">{debt.name}</h3>
              <p className="text-xs text-slate-500">Min: {formatCurrency(debt.minimumPayment)}/mo</p>
            </div>
          </div>
          <button
            onClick={() => setEditing(e => !e)}
            className="text-xs px-2.5 py-1 rounded-lg text-slate-400 hover:text-amber-400 border border-white/10 hover:border-amber-500/30 transition-colors"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {/* Circular progress + balance */}
        <div className="flex items-center gap-5 mb-5">
          <div className="relative flex-shrink-0">
            <CircularProgress percent={paidOff} size={100} strokeWidth={8} color={color} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-white">{Math.round(paidOff)}%</span>
              <span className="text-[9px] text-slate-500">paid off</span>
            </div>
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Balance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <input type="number" value={localBalance} onChange={e => setLocalBalance(e.target.value)} className={`${inputCls} pl-6`} step="0.01" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Min. Payment</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <input type="number" value={localMin} onChange={e => setLocalMin(e.target.value)} className={`${inputCls} pl-6`} step="0.01" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">APR %</label>
                  <input type="number" value={localAPR} onChange={e => setLocalAPR(e.target.value)} className={inputCls} step="0.01" placeholder="0.00" />
                </div>
                <button
                  onClick={handleSaveEdit}
                  className="w-full py-2 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1"
                  style={{ backgroundColor: '#F59E0B' }}
                >
                  <Check size={13} /> Save
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500">Remaining</p>
                  <p className="text-2xl font-bold font-mono text-white">{formatCurrency(debt.totalBalance)}</p>
                </div>
                {debt.apr > 0 && (
                  <p className="text-xs text-slate-500">APR: <span className="text-amber-400">{debt.apr}%</span></p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Payoff info */}
        {!editing && debt.totalBalance > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar size={12} className="text-slate-500" />
                <span className="text-xs text-slate-500">Est. Payoff</span>
              </div>
              <p className="text-sm font-medium text-white">
                {payoffDate ? format(payoffDate, 'MMM yyyy') : 'N/A'}
              </p>
            </div>
            {debt.apr > 0 && (
              <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Info size={12} className="text-slate-500" />
                  <span className="text-xs text-slate-500">Total Interest</span>
                </div>
                <p className="text-sm font-medium text-red-400">{formatCurrency(totalInterest)}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {!editing && (
          <button
            onClick={() => setPayModal(true)}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 flex items-center justify-center gap-2 transition-colors mb-3"
          >
            <DollarSign size={14} />
            Log Extra Payment
          </button>
        )}

        {/* Payment history accordion */}
        {debt.paymentHistory.length > 0 && (
          <div>
            <button
              onClick={() => setHistoryOpen(h => !h)}
              className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              <span>Payment History ({debt.paymentHistory.length})</span>
              {historyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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
                  <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {debt.paymentHistory.map(p => (
                      <div key={p.id} className="flex justify-between text-xs py-1 border-b border-white/5">
                        <span className="text-slate-500">{format(parseISO(p.date), 'MMM d, yyyy')} {p.note ? `· ${p.note}` : ''}</span>
                        <span className="text-emerald-400 font-mono">-{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <ExtraPaymentModal
        isOpen={payModal}
        onClose={() => setPayModal(false)}
        debt={debt}
        onPay={logDebtPayment}
      />
    </>
  )
}

// ── Main Debts Page ───────────────────────────────────────────────────────────
export default function Debts() {
  const debts = useStore(s => s.debts)

  const summary = useMemo(() => ({
    totalBalance: debts.reduce((s, d) => s + d.totalBalance, 0),
    totalMinimum: debts.reduce((s, d) => s + d.minimumPayment, 0),
    totalInterest: debts.reduce((s, d) => s + calcTotalInterest(d.totalBalance, d.minimumPayment, d.apr), 0),
  }), [debts])

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Debts</h1>
        <p className="text-slate-400 text-sm mt-1">Track and pay down your balances</p>
      </div>

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glass p-5 mb-6"
      >
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Debt Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5"><TrendingDown size={12} />Total Debt</p>
            <p className="text-2xl font-bold font-mono text-white">{formatCurrency(summary.totalBalance)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5"><DollarSign size={12} />Monthly Minimums</p>
            <p className="text-2xl font-bold font-mono text-red-400">{formatCurrency(summary.totalMinimum)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5"><AlertCircle size={12} />Est. Total Interest</p>
            <p className="text-2xl font-bold font-mono text-amber-400">{formatCurrency(summary.totalInterest)}</p>
          </div>
        </div>
      </motion.div>

      {/* Debt Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {debts.map((debt, i) => (
          <DebtCard key={debt.id} debt={debt} color={debtColors[i % debtColors.length]} index={i} />
        ))}
      </div>
    </div>
  )
}
