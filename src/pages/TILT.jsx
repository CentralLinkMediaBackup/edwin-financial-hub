import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Zap, Plus, Trash2, Pencil, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { format, addDays, addWeeks, parseISO, nextFriday } from 'date-fns'
import { useStore } from '../store/useStore'
import { formatCurrency, formatDate } from '../lib/formatters'

function getNextFriday(from = new Date()) {
  const d = new Date(from)
  const day = d.getDay()
  if (day === 5) {
    // Already Friday — next one is +7
    d.setDate(d.getDate() + 7)
  } else {
    const daysUntilFriday = (5 - day + 7) % 7 || 7
    d.setDate(d.getDate() + daysUntilFriday)
  }
  return format(d, 'yyyy-MM-dd')
}

function getFollowingFriday(from) {
  const d = parseISO(from)
  d.setDate(d.getDate() + 7)
  return format(d, 'yyyy-MM-dd')
}

function computePlan(amount, delivery, option) {
  const received = delivery === 'instant' ? amount - 12 : amount
  const nextFri = getNextFriday()
  const followFri = getFollowingFriday(nextFri)
  const thirdFri = getFollowingFriday(followFri)
  const fourthFri = getFollowingFriday(thirdFri)

  if (option === 'A') {
    return {
      label: 'Full Repay Next Friday',
      apr: '0%',
      payments: [{ date: nextFri, amount }],
      total: amount,
    }
  }
  if (option === 'B') {
    return {
      label: '2 Payments (35.99% APR)',
      apr: '35.99%',
      payments: [
        { date: nextFri, amount: 216.15 * (amount / 400) },
        { date: followFri, amount: 204.15 * (amount / 400) },
      ],
      total: (216.15 + 204.15) * (amount / 400),
    }
  }
  // Option C
  return {
    label: '4 Payments (35.99% APR)',
    apr: '35.99%',
    payments: [
      { date: nextFri, amount: 116.84 * (amount / 400) },
      { date: followFri, amount: 104.84 * (amount / 400) },
      { date: thirdFri, amount: 104.84 * (amount / 400) },
      { date: fourthFri, amount: 104.84 * (amount / 400) },
    ],
    total: (116.84 + 104.84 * 3) * (amount / 400),
  }
}

// SVG Circular Arc Gauge
function TiltGauge({ used, max }) {
  const radius = 90
  const stroke = 12
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const pct = Math.min(used / max, 1)

  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      <svg width={220} height={220} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={110}
          cy={110}
          r={normalizedRadius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        {/* Animated fill */}
        <motion.circle
          cx={110}
          cy={110}
          r={normalizedRadius}
          fill="none"
          stroke="#F59E0B"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - pct * circumference }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl font-bold text-amber-400 font-mono"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {formatCurrency(used)}
        </motion.span>
        <span className="text-slate-400 text-sm mt-1">/ {formatCurrency(max)}</span>
        <span className="text-xs text-slate-500 mt-0.5">credit used</span>
      </div>
    </div>
  )
}

// Log New TILT Modal
function LogTiltModal({ onClose, onSave }) {
  const settings = useStore(s => s.settings.tilt)
  const [amount, setAmount] = useState(100)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reason, setReason] = useState('')
  const [delivery, setDelivery] = useState('instant')
  const [option, setOption] = useState('A')

  const fee = delivery === 'instant' ? settings.instantFee : 0
  const received = amount - fee
  const plan = computePlan(amount, delivery, option)

  const handleSave = () => {
    onSave({ amount, date, reason, delivery, option, plan, fee })
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
        className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden overflow-y-auto"
        style={{ backgroundColor: '#0F1629', maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Log New TILT</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Amount Slider */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-slate-400">Amount</label>
              <span className="text-amber-400 font-bold font-mono text-lg">{formatCurrency(amount)}</span>
            </div>
            <input
              type="range"
              min={10}
              max={settings.maxCredit}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>$10</span>
              <span>{formatCurrency(settings.maxCredit)}</span>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-sm text-slate-400 block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="text-sm text-slate-400 block mb-1">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="What's this advance for?"
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          {/* Delivery Toggle */}
          <div>
            <label className="text-sm text-slate-400 block mb-2">Delivery</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  key: 'instant',
                  label: 'Instant',
                  sub: `You receive ${formatCurrency(amount - settings.instantFee)} ($${settings.instantFee} fee)`,
                },
                {
                  key: 'standard',
                  label: 'Standard',
                  sub: 'Full amount, 1-2 business days',
                },
              ].map(d => (
                <motion.button
                  key={d.key}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDelivery(d.key)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    delivery === d.key
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <p className={`font-semibold text-sm ${delivery === d.key ? 'text-amber-400' : 'text-white'}`}>
                    {d.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{d.sub}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Repayment Plan */}
          <div>
            <label className="text-sm text-slate-400 block mb-2">Repayment Plan</label>
            <div className="space-y-2">
              {['A', 'B', 'C'].map(opt => {
                const p = computePlan(amount, delivery, opt)
                return (
                  <motion.button
                    key={opt}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setOption(opt)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      option === opt
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`font-semibold text-sm ${option === opt ? 'text-amber-400' : 'text-white'}`}>
                        Option {opt} — {p.label}
                      </span>
                      <span className="text-xs text-slate-400">{p.apr} APR</span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {p.payments.map((pay, i) => (
                        <p key={i} className="text-xs text-slate-400">
                          {formatDate(pay.date)}: {formatCurrency(pay.amount)}
                        </p>
                      ))}
                    </div>
                    {opt !== 'A' && (
                      <p className="text-xs text-amber-500/70 mt-1">
                        Total cost: {formatCurrency(p.total)} (+{formatCurrency(p.total - amount)})
                      </p>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-white/10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            className="w-full py-3 rounded-xl font-semibold text-white bg-amber-500 hover:bg-amber-400 transition-colors"
          >
            Log TILT Advance
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

// Edit TILT Modal
function EditTiltModal({ log, onClose, onSave }) {
  const [status, setStatus] = useState(log.status)
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
        style={{ backgroundColor: '#0F1629' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Edit TILT Entry</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="mb-4">
          <label className="text-sm text-slate-400 block mb-2">Status</label>
          <div className="flex gap-2">
            {['active', 'repaid'].map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                  status === s ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-white/10 bg-white/5 text-slate-400'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => { onSave({ status }); onClose() }}
          className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-400 transition-colors"
        >
          Save Changes
        </button>
      </motion.div>
    </div>
  )
}

export default function TILT() {
  const tiltLogs = useStore(s => s.tiltLogs)
  const addTiltLog = useStore(s => s.addTiltLog)
  const updateTiltLog = useStore(s => s.updateTiltLog)
  const deleteTiltLog = useStore(s => s.deleteTiltLog)
  const settings = useStore(s => s.settings.tilt)
  const addToast = useStore(s => s.addToast)

  const [showModal, setShowModal] = useState(false)
  const [editLog, setEditLog] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const activeLog = tiltLogs.find(l => l.status === 'active')
  const isActive = !!activeLog
  const usedAmount = activeLog ? activeLog.amountUsed : 0

  const handleSaveTilt = (data) => {
    const nextFri = getNextFriday()
    addTiltLog({
      amountUsed: data.amount,
      creditLimit: settings.maxCredit,
      instantDelivery: data.delivery === 'instant',
      instantFee: data.fee,
      repaymentDate: data.plan.payments[0].date,
      repaymentOption: data.option,
      status: 'active',
      note: data.reason,
    })
  }

  const handleDelete = (id) => {
    deleteTiltLog(id)
    setDeleteConfirm(null)
    addToast('TILT entry deleted')
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap size={24} className="text-amber-400" />
          TILT Credit Line
        </h1>
        <p className="text-slate-400 text-sm mt-1">Personal credit line — max {formatCurrency(settings.maxCredit)}</p>
      </div>

      {/* Gauge Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glass p-6 mb-4 flex flex-col items-center gap-4"
      >
        <TiltGauge used={usedAmount} max={settings.maxCredit} />

        {activeLog && (
          <div className="text-center">
            <p className="text-slate-400 text-sm">Next Repayment</p>
            <p className="text-white text-xl font-bold mt-0.5">
              {formatDate(activeLog.repaymentDate)}
            </p>
            <p className="text-amber-400 font-mono font-bold text-lg mt-1">
              {formatCurrency(activeLog.amountUsed)}
            </p>
            <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
              Active
            </span>
          </div>
        )}

        {!activeLog && (
          <div className="text-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Clear — Ready to Advance
            </span>
          </div>
        )}

        {/* Lock or CTA */}
        {isActive ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-5 py-3 rounded-xl border border-white/10 bg-white/5 text-slate-400 text-sm"
          >
            <Lock size={18} className="text-amber-500/60 flex-shrink-0" />
            <span>New TILT locked — pay off current advance first</span>
          </motion.div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-400 transition-colors"
          >
            <Plus size={18} />
            Log New TILT
          </motion.button>
        )}
      </motion.div>

      {/* History Table */}
      <div className="card-glass overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">TILT History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Date', 'Amount', 'Received', 'Delivery', 'Plan', 'Repayment Due', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tiltLogs.map((log, i) => {
                const received = log.instantDelivery ? log.amountUsed - (log.instantFee || 12) : log.amountUsed
                return (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-300">{formatDate(log.createdAt || log.repaymentDate)}</td>
                    <td className="px-4 py-3 font-mono text-white">{formatCurrency(log.amountUsed)}</td>
                    <td className="px-4 py-3 font-mono text-amber-400">{formatCurrency(received)}</td>
                    <td className="px-4 py-3 text-slate-400">{log.instantDelivery ? 'Instant' : 'Standard'}</td>
                    <td className="px-4 py-3 text-slate-400">Option {log.repaymentOption}</td>
                    <td className="px-4 py-3 text-slate-300">{formatDate(log.repaymentDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'active'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {log.status === 'active' ? 'Active' : 'Paid'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditLog(log)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                        >
                          <Pencil size={14} />
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
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
              {tiltLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">No TILT entries yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <LogTiltModal
            onClose={() => setShowModal(false)}
            onSave={handleSaveTilt}
          />
        )}
        {editLog && (
          <EditTiltModal
            log={editLog}
            onClose={() => setEditLog(null)}
            onSave={(updates) => updateTiltLog(editLog.id, updates)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
