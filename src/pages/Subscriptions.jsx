import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Plus, Trash2, Pencil, X, Check, ToggleRight, ToggleLeft, AlertTriangle, Calendar } from 'lucide-react'
import { format, getDaysInMonth, getDate, getDay } from 'date-fns'
import { useStore } from '../store/useStore'
import { formatCurrency } from '../lib/formatters'

function getDaysUntilDue(dueDay) {
  if (!dueDay || typeof dueDay !== 'number') return null
  const today = new Date()
  const currentDay = getDate(today)
  const daysInMonth = getDaysInMonth(today)
  if (dueDay >= currentDay) {
    return dueDay - currentDay
  } else {
    // Next month
    const daysLeft = daysInMonth - currentDay + dueDay
    return daysLeft
  }
}

function getNextDueDate(dueDay) {
  if (!dueDay || typeof dueDay !== 'number') return 'Flexible'
  const today = new Date()
  const currentDay = getDate(today)
  const year = today.getFullYear()
  const month = today.getMonth()
  if (dueDay >= currentDay) {
    return format(new Date(year, month, dueDay), 'MMM d')
  } else {
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    return format(new Date(nextYear, nextMonth, dueDay), 'MMM d')
  }
}

function DaysChip({ daysUntil }) {
  if (daysUntil === null) return <span className="text-slate-500 text-xs">Flexible</span>
  if (daysUntil <= 3) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
      <AlertTriangle size={11} />
      {daysUntil === 0 ? 'Today' : `${daysUntil}d`}
    </span>
  )
  if (daysUntil <= 7) return (
    <span className="text-xs font-semibold text-amber-400">{daysUntil}d</span>
  )
  return <span className="text-xs font-semibold text-emerald-400">{daysUntil}d</span>
}

function BillModal({ bill, onClose, onSave }) {
  const [name, setName] = useState(bill?.name || '')
  const [amount, setAmount] = useState(bill?.amount || '')
  const [dueDay, setDueDay] = useState(bill?.dueDay || '')
  const [frequency, setFrequency] = useState(bill?.frequency || 'monthly')
  const [isActive, setIsActive] = useState(bill?.isActive ?? true)
  const [note, setNote] = useState(bill?.note || '')
  const [category, setCategory] = useState(bill?.category || 'Other')

  const CATEGORIES = ['Housing', 'Utilities', 'Entertainment', 'Phone', 'Transport', 'Food', 'Health', 'Education', 'Insurance', 'Shopping', 'Debt', 'Business', 'Other']
  const FREQUENCIES = [
    { key: 'monthly', label: 'Monthly' },
    { key: 'biweekly', label: 'Bi-weekly' },
    { key: 'bimonthly', label: 'Every 2 Months' },
  ]

  const handleSave = () => {
    if (!name || !amount) return
    onSave({
      name,
      amount: parseFloat(amount) || 0,
      dueDay: dueDay ? parseInt(dueDay) : null,
      frequency,
      isActive,
      note,
      category,
    })
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
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Netflix, Rent, etc."
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
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
            <label className="text-sm text-slate-400 block mb-1">Due Day (number, e.g. 15)</label>
            <input
              type="number"
              value={dueDay}
              onChange={e => setDueDay(e.target.value)}
              placeholder="Leave blank for flexible"
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
              min="1"
              max="31"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-2">Frequency</label>
            <div className="flex gap-2">
              {FREQUENCIES.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFrequency(f.key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                    frequency === f.key ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-white/10 bg-white/5 text-slate-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-400">Active</span>
            <button
              onClick={() => setIsActive(!isActive)}
              className="text-slate-400 hover:text-amber-400"
            >
              {isActive
                ? <ToggleRight size={24} className="text-amber-400" />
                : <ToggleLeft size={24} className="text-slate-500" />
              }
            </button>
          </div>
        </div>
        <div className="p-5 border-t border-white/10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={!name || !amount}
            className="w-full py-3 rounded-xl font-semibold text-white bg-amber-500 hover:bg-amber-400 transition-colors disabled:opacity-40"
          >
            {bill ? 'Save Changes' : 'Add Bill'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export default function Subscriptions() {
  const bills = useStore(s => s.bills)
  const addBill = useStore(s => s.addBill)
  const updateBill = useStore(s => s.updateBill)
  const deleteBill = useStore(s => s.deleteBill)

  const [showAdd, setShowAdd] = useState(false)
  const [editBill, setEditBill] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Sort by days until due
  const sortedBills = useMemo(() => {
    return [...bills].sort((a, b) => {
      const dA = getDaysUntilDue(a.dueDay)
      const dB = getDaysUntilDue(b.dueDay)
      if (dA === null && dB === null) return 0
      if (dA === null) return 1
      if (dB === null) return -1
      return dA - dB
    })
  }, [bills])

  const activeBills = bills.filter(b => b.isActive)
  const monthlyTotal = activeBills
    .filter(b => b.frequency === 'monthly')
    .reduce((s, b) => s + b.amount, 0)
  const yearlyEstimate = monthlyTotal * 12
  const nextBill = sortedBills.find(b => b.isActive && b.dueDay !== null)
  const nextBillDays = nextBill ? getDaysUntilDue(nextBill.dueDay) : null

  const FREQ_LABELS = {
    monthly: 'Monthly',
    biweekly: 'Bi-weekly',
    bimonthly: 'Every 2 Months',
  }

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
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-400 transition-colors"
        >
          <Plus size={16} />
          Add Bill
        </motion.button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Monthly Total', value: formatCurrency(monthlyTotal), color: 'text-red-400' },
          { label: 'Yearly Estimate', value: formatCurrency(yearlyEstimate), color: 'text-amber-400' },
          { label: 'Active Bills', value: `${activeBills.length}`, color: 'text-white' },
          { label: 'Next Due', value: nextBill ? `${nextBill.name} (${nextBillDays}d)` : 'None', color: 'text-blue-400' },
        ].map(card => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-glass p-4"
          >
            <p className="text-xs text-slate-400 mb-1">{card.label}</p>
            <p className={`text-lg font-bold ${card.color} font-mono truncate`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <div className="card-glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Name', 'Amount', 'Due Day', 'Frequency', 'Next Due', 'Days Until', 'Paid', 'Active', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedBills.map((bill, i) => {
                const daysUntil = getDaysUntilDue(bill.dueDay)
                const nextDue = getNextDueDate(bill.dueDay)
                return (
                  <motion.tr
                    key={bill.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${!bill.isActive ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white font-medium">{bill.name}</p>
                        {bill.category && <p className="text-xs text-slate-500">{bill.category}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-white whitespace-nowrap">
                      {formatCurrency(bill.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {bill.dueDay ? `${bill.dueDay}th` : bill.note || 'Flexible'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {FREQ_LABELS[bill.frequency] || bill.frequency}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">{nextDue}</td>
                    <td className="px-4 py-3">
                      <DaysChip daysUntil={daysUntil} />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={bill.paidThisMonth || false}
                        onChange={e => updateBill(bill.id, { paidThisMonth: e.target.checked })}
                        className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3">
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

        {/* Footer total */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-sm text-slate-400">Monthly total (active)</span>
          <span className="text-xl font-bold font-mono text-amber-400">{formatCurrency(monthlyTotal)}</span>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAdd && (
          <BillModal onClose={() => setShowAdd(false)} onSave={addBill} />
        )}
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
