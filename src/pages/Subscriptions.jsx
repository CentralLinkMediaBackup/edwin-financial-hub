import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Plus, Trash2, Pencil, X, Check,
  ToggleRight, ToggleLeft, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, Ban,
} from 'lucide-react'
import { format, getDaysInMonth, getDate, addMonths } from 'date-fns'
import { useStore } from '../store/useStore'
import { formatCurrency } from '../lib/formatters'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDaysUntilDue(dueDay) {
  if (!dueDay || typeof dueDay !== 'number') return null
  const today = new Date()
  const currentDay = getDate(today)
  const daysInMonth = getDaysInMonth(today)
  const effective = Math.min(dueDay, daysInMonth)
  return effective >= currentDay ? effective - currentDay : daysInMonth - currentDay + effective
}

// Due date to show for an UNPAID bill
function getUnpaidDueDate(dueDay) {
  if (!dueDay || typeof dueDay !== 'number') return 'Flexible'
  const today = new Date()
  const currentDay = getDate(today)
  const year = today.getFullYear()
  const month = today.getMonth()
  const daysInMonth = getDaysInMonth(today)
  const effective = Math.min(dueDay, daysInMonth)
  if (effective >= currentDay) return format(new Date(year, month, effective), 'MMM d')
  const nextMonthDate = addMonths(today, 1)
  const nextEffective = Math.min(dueDay, getDaysInMonth(nextMonthDate))
  return format(new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), nextEffective), 'MMM d')
}

// Next cycle date for a PAID bill (advance to next occurrence)
function getNextCycleDueDate(bill) {
  if (!bill.dueDay) return 'Flexible'
  const today = new Date()
  const months = bill.frequency === 'bimonthly' ? 2 : 1
  const nextMonthDate = addMonths(today, months)
  const nextEffective = Math.min(bill.dueDay, getDaysInMonth(nextMonthDate))
  const next = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), nextEffective)
  return format(next, 'MMM d, yyyy')
}

// Group transactions by "Month Year" for paid history
function groupByMonth(txs) {
  const groups = {}
  txs.forEach(tx => {
    const key = format(new Date(tx.date + 'T12:00:00'), 'MMMM yyyy')
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  })
  return groups
}

// ── Sub-components ────────────────────────────────────────────────────────────

function isCancelled(bill) {
  return !bill.isActive && bill.note?.startsWith('CANCELLED')
}

function cancelledExpiry(bill) {
  const m = bill.note?.match(/(?:expires?|expired)\s+([A-Za-z]+\s+\d+,?\s*\d{4})/i)
  return m ? m[1] : null
}

function DaysChip({ daysUntil }) {
  if (daysUntil === null) return <span className="text-slate-500 text-xs">Flexible</span>
  if (daysUntil <= 3) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
      <AlertTriangle size={11} />
      {daysUntil === 0 ? 'Today' : `${daysUntil}d`}
    </span>
  )
  if (daysUntil <= 7) return <span className="text-xs font-semibold text-amber-400">{daysUntil}d</span>
  return <span className="text-xs font-semibold text-emerald-400">{daysUntil}d</span>
}

function ConfirmDialog({ title, body, confirmLabel, confirmClass, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 p-6 space-y-4"
        style={{ backgroundColor: '#0F1629' }}
      >
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="text-sm text-slate-300">{body}</p>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function BillModal({ bill, onClose, onSave }) {
  const [name, setName]             = useState(bill?.name || '')
  const [amount, setAmount]         = useState(bill?.amount || '')
  const [dueDay, setDueDay]         = useState(bill?.dueDay || '')
  const [flexibleDue, setFlexible]  = useState(!bill?.dueDay)
  const [frequency, setFreq]        = useState(bill?.frequency || 'monthly')
  const [isActive, setIsActive]     = useState(bill?.isActive ?? true)
  const [note, setNote]             = useState(bill?.note || '')
  const [category, setCategory]     = useState(bill?.category || 'Other')

  const CATEGORIES = ['Housing','Utilities','Entertainment','Phone','Transport','Food','Health','Education','Insurance','Shopping','Debt','Business','Other']
  const FREQUENCIES = [
    { key:'monthly',   label:'Monthly' },
    { key:'biweekly',  label:'Bi-weekly' },
    { key:'bimonthly', label:'Every 2 Months' },
  ]

  const handleSave = () => {
    if (!name || !amount) return
    const resolvedDueDay = flexibleDue ? null : (dueDay ? parseInt(dueDay) : null)
    onSave({ name, amount: parseFloat(amount) || 0, dueDay: resolvedDueDay, frequency, isActive, note, category })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 overflow-hidden overflow-y-auto"
        style={{ backgroundColor: '#0F1629', maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">{bill ? 'Edit Bill' : 'Add Bill'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Netflix, Rent, etc."
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
                min="0" step="0.01" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-slate-400">Due Day</label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs text-slate-500">Flexible due date</span>
                <div
                  onClick={() => { setFlexible(f => !f); if (!flexibleDue) setDueDay('') }}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${flexibleDue ? 'bg-amber-500' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${flexibleDue ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </label>
            </div>
            {flexibleDue ? (
              <div className="px-3 py-2 rounded-lg text-sm text-slate-400 bg-white/5 border border-white/10">
                Flexible — no fixed due date
              </div>
            ) : (
              <input type="number" value={dueDay} onChange={e => setDueDay(e.target.value)} placeholder="e.g. 15"
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
                min="1" max="31" />
            )}
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-2">Frequency</label>
            <div className="flex gap-2">
              {FREQUENCIES.map(f => (
                <button key={f.key} onClick={() => setFreq(f.key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                    frequency === f.key ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-white/10 bg-white/5 text-slate-400'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none">
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Note (optional)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none" />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-400">Active</span>
            <button onClick={() => setIsActive(!isActive)} className="text-slate-400 hover:text-amber-400">
              {isActive ? <ToggleRight size={24} className="text-amber-400" /> : <ToggleLeft size={24} className="text-slate-500" />}
            </button>
          </div>
        </div>
        <div className="p-5 border-t border-white/10">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSave} disabled={!name || !amount}
            className="w-full py-3 rounded-xl font-semibold text-white bg-amber-500 hover:bg-amber-400 transition-colors disabled:opacity-40">
            {bill ? 'Save Changes' : 'Add Bill'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

function PaidHistorySection({ transactions }) {
  const [open, setOpen] = useState(false)

  const billTxs = useMemo(() => {
    return transactions
      .filter(tx => tx.source === 'bill-payment' || tx.id?.startsWith?.('auto-bill-'))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions])

  if (billTxs.length === 0) return null

  const grouped = groupByMonth(billTxs)
  const monthKeys = Object.keys(grouped)

  return (
    <div className="card-glass overflow-hidden mt-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <span className="text-base font-semibold text-white flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          Paid History ({billTxs.length} entries)
        </span>
        {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10">
              {monthKeys.map(month => (
                <div key={month}>
                  <div className="px-4 py-2 bg-white/5 border-b border-white/5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{month}</span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {grouped[month].map(tx => (
                        <tr key={tx.id} className="border-b border-white/5 last:border-0">
                          <td className="px-4 py-2.5 text-white font-medium">{tx.note}</td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs">{tx.category}</td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs">
                            {format(new Date(tx.date + 'T12:00:00'), 'MMM d, yyyy')}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-red-400">
                            -{formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const FREQ_LABELS = { monthly: 'Monthly', biweekly: 'Bi-weekly', bimonthly: 'Every 2 Months' }

export default function Subscriptions() {
  const bills               = useStore(s => s.bills)
  const transactions        = useStore(s => s.transactions)
  const addBill             = useStore(s => s.addBill)
  const updateBill          = useStore(s => s.updateBill)
  const deleteBill          = useStore(s => s.deleteBill)
  const markBillManuallyPaid = useStore(s => s.markBillManuallyPaid)
  const unmarkBillPaid      = useStore(s => s.unmarkBillPaid)

  const [showAdd, setShowAdd]       = useState(false)
  const [editBill, setEditBill]     = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [payConfirm, setPayConfirm] = useState(null)   // bill awaiting pay confirm
  const [undoConfirm, setUndoConfirm] = useState(null) // bill awaiting undo confirm

  // Unpaid first (sorted by days until due), paid last, inactive at bottom
  const sortedBills = useMemo(() => {
    const unpaid = bills
      .filter(b => b.isActive && !b.paidThisMonth)
      .sort((a, b) => {
        const dA = getDaysUntilDue(a.dueDay)
        const dB = getDaysUntilDue(b.dueDay)
        if (dA === null && dB === null) return 0
        if (dA === null) return 1
        if (dB === null) return -1
        return dA - dB
      })
    const paid     = bills.filter(b => b.isActive && b.paidThisMonth)
    const inactive = bills.filter(b => !b.isActive)
    return [...unpaid, ...paid, ...inactive]
  }, [bills])

  const activeBills  = bills.filter(b => b.isActive)
  const monthlyTotal = activeBills.filter(b => b.frequency === 'monthly').reduce((s, b) => s + b.amount, 0)
  const yearlyEst    = monthlyTotal * 12
  const nextUnpaid   = sortedBills.find(b => b.isActive && !b.paidThisMonth && b.dueDay !== null)
  const nextDays     = nextUnpaid ? getDaysUntilDue(nextUnpaid.dueDay) : null

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell size={24} className="text-amber-400" />
            Subscriptions & Bills
          </h1>
          <p className="text-slate-400 text-sm mt-1">{activeBills.length} active bills</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-400 transition-colors"
        >
          <Plus size={16} /> Add Bill
        </motion.button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Monthly Total',   value: formatCurrency(monthlyTotal), color: 'text-red-400' },
          { label: 'Yearly Estimate', value: formatCurrency(yearlyEst),    color: 'text-amber-400' },
          { label: 'Active Bills',    value: `${activeBills.length}`,       color: 'text-white' },
          { label: 'Next Due',        value: nextUnpaid ? `${nextUnpaid.name} (${nextDays}d)` : 'All paid!', color: nextUnpaid ? 'text-blue-400' : 'text-emerald-400' },
        ].map(card => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-glass p-4">
            <p className="text-xs text-slate-400 mb-1">{card.label}</p>
            <p className={`text-lg font-bold ${card.color} font-mono truncate`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Bills Table */}
      <div className="card-glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Name', 'Amount', 'Due Day', 'Frequency', 'Next Due', 'Days Until', 'Status', 'Active', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedBills.map((bill, i) => {
                const isPaid     = bill.paidThisMonth
                const daysUntil  = isPaid ? null : getDaysUntilDue(bill.dueDay)
                const displayDue = isPaid ? getNextCycleDueDate(bill) : getUnpaidDueDate(bill.dueDay)

                const cancelled = isCancelled(bill)
                const expiry    = cancelled ? cancelledExpiry(bill) : null

                return (
                  <motion.tr
                    key={bill.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`border-b border-white/5 transition-colors ${
                      isPaid
                        ? 'bg-emerald-500/20 hover:bg-emerald-500/25 cursor-pointer'
                        : cancelled
                        ? 'bg-red-500/5 opacity-70 hover:bg-red-500/10'
                        : !bill.isActive
                        ? 'opacity-50 hover:bg-white/5'
                        : 'hover:bg-white/5'
                    }`}
                    onClick={isPaid ? () => setUndoConfirm(bill) : undefined}
                    title={isPaid ? `Click to undo payment of ${bill.name}` : undefined}
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isPaid && <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />}
                        {cancelled && <Ban size={13} className="text-red-400 flex-shrink-0" />}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-medium ${isPaid ? 'text-emerald-200' : cancelled ? 'text-red-200 line-through' : 'text-white'}`}>{bill.name}</p>
                            {cancelled && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 whitespace-nowrap">
                                Cancelled
                              </span>
                            )}
                          </div>
                          {cancelled && expiry && (
                            <p className="text-xs text-red-400/70 mt-0.5">Access: {expiry}</p>
                          )}
                          {!cancelled && bill.category && (
                            <p className={`text-xs ${isPaid ? 'text-emerald-400/70' : 'text-slate-500'}`}>{bill.category}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className={`px-4 py-3 font-mono font-bold whitespace-nowrap ${isPaid ? 'text-emerald-200' : 'text-white'}`}>
                      {formatCurrency(bill.amount)}
                    </td>

                    {/* Due Day */}
                    <td className={`px-4 py-3 text-xs ${isPaid ? 'text-emerald-400/70' : 'text-slate-400'}`}>
                      {bill.dueDay ? `${bill.dueDay}th` : bill.note || 'Flexible'}
                    </td>

                    {/* Frequency */}
                    <td className={`px-4 py-3 text-xs whitespace-nowrap ${isPaid ? 'text-emerald-400/70' : 'text-slate-400'}`}>
                      {FREQ_LABELS[bill.frequency] || bill.frequency}
                    </td>

                    {/* Next Due */}
                    <td className={`px-4 py-3 text-xs whitespace-nowrap ${isPaid ? 'text-emerald-300' : cancelled ? 'text-red-400/70' : 'text-slate-300'}`}>
                      {isPaid ? (
                        <span className="flex items-center gap-1">
                          <span className="text-emerald-500 text-[10px] font-medium">NEXT:</span>
                          {displayDue}
                        </span>
                      ) : cancelled ? (
                        expiry ? <span>Expires {expiry}</span> : <span>—</span>
                      ) : displayDue}
                    </td>

                    {/* Days Until */}
                    <td className="px-4 py-3">
                      {isPaid
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Paid ✓</span>
                        : cancelled
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">Cancelled</span>
                        : <DaysChip daysUntil={daysUntil} />
                      }
                    </td>

                    {/* Status / Pay button — stop propagation so row click doesn't double-fire */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {isPaid ? (
                        <span className="text-xs text-emerald-400 font-medium">Paid this month</span>
                      ) : cancelled ? (
                        <span className="text-xs text-red-400/70 font-medium">No further charges</span>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setPayConfirm(bill)}
                          disabled={!bill.isActive}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Check size={12} /> Mark Paid
                        </motion.button>
                      )}
                    </td>

                    {/* Active toggle */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => updateBill(bill.id, { isActive: !bill.isActive })}
                        className="text-slate-400 hover:text-amber-400 transition-colors"
                      >
                        {bill.isActive
                          ? <ToggleRight size={20} className="text-amber-400" />
                          : <ToggleLeft size={20} className="text-slate-500" />
                        }
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditBill(bill)}
                          className="p-1.5 rounded text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                        >
                          <Pencil size={12} />
                        </button>
                        {deleteConfirm === bill.id ? (
                          <>
                            <button onClick={() => { deleteBill(bill.id); setDeleteConfirm(null) }} className="p-1.5 rounded text-red-400 hover:bg-red-400/10">
                              <Check size={12} />
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded text-slate-400 hover:bg-white/10">
                              <X size={12} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(bill.id)}
                            className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-sm text-slate-400">Monthly total (active)</span>
          <span className="text-xl font-bold font-mono text-amber-400">{formatCurrency(monthlyTotal)}</span>
        </div>
      </div>

      {/* Paid History */}
      <PaidHistorySection transactions={transactions} />

      {/* ── Modals ── */}
      <AnimatePresence>
        {/* Confirm Pay */}
        {payConfirm && (
          <ConfirmDialog
            title="Confirm Payment"
            body={`Confirm payment of ${payConfirm.name} — ${formatCurrency(payConfirm.amount)}? This will deduct from your current balance.`}
            confirmLabel="Yes, Paid"
            confirmClass="bg-emerald-600 hover:bg-emerald-500"
            onConfirm={() => { markBillManuallyPaid(payConfirm.id); setPayConfirm(null) }}
            onCancel={() => setPayConfirm(null)}
          />
        )}

        {/* Confirm Undo */}
        {undoConfirm && (
          <ConfirmDialog
            title="Undo Payment?"
            body={`Are you sure you want to mark ${undoConfirm.name} as unpaid? This will add ${formatCurrency(undoConfirm.amount)} back to your balance.`}
            confirmLabel="Yes, Undo"
            confirmClass="bg-amber-500 hover:bg-amber-400"
            onConfirm={() => { unmarkBillPaid(undoConfirm.id); setUndoConfirm(null) }}
            onCancel={() => setUndoConfirm(null)}
          />
        )}

        {/* Add / Edit bill */}
        {showAdd && <BillModal onClose={() => setShowAdd(false)} onSave={addBill} />}
        {editBill && (
          <BillModal
            bill={editBill}
            onClose={() => setEditBill(null)}
            onSave={(updates) => updateBill(editBill.id, updates)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
