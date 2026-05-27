import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Plus, Trash2, Pencil, X, Check, CheckCircle2, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { format, addDays, parseISO } from 'date-fns'
import { useStore } from '../store/useStore'
import { formatCurrency, formatDate } from '../lib/formatters'

function generatePaymentSchedule(totalAmount, purchaseDate) {
  const base = parseISO(purchaseDate)
  const perPayment = totalAmount / 4
  return [
    { id: `p1-${Date.now()}`, number: 1, amount: perPayment, dueDate: format(base, 'yyyy-MM-dd'), status: 'upcoming', paidDate: null },
    { id: `p2-${Date.now()}`, number: 2, amount: perPayment, dueDate: format(addDays(base, 14), 'yyyy-MM-dd'), status: 'upcoming', paidDate: null },
    { id: `p3-${Date.now()}`, number: 3, amount: perPayment, dueDate: format(addDays(base, 28), 'yyyy-MM-dd'), status: 'upcoming', paidDate: null },
    { id: `p4-${Date.now()}`, number: 4, amount: perPayment, dueDate: format(addDays(base, 42), 'yyyy-MM-dd'), status: 'upcoming', paidDate: null, label: 'FINAL' },
  ]
}

function PaymentStep({ payment, index }) {
  const statusColors = {
    paid: 'border-emerald-500/40 bg-emerald-500/10',
    upcoming: 'border-amber-500/40 bg-amber-500/10',
  }
  const defaultColor = 'border-white/10 bg-white/5'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border ${statusColors[payment.status] || defaultColor}`}
    >
      <div>
        {payment.status === 'paid' ? (
          <CheckCircle2 size={20} className="text-emerald-400" />
        ) : payment.status === 'upcoming' ? (
          <Clock size={20} className="text-amber-400" />
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
        )}
      </div>
      <p className="text-xs font-bold text-white">#{payment.number}</p>
      <p className="text-xs text-slate-400">{formatDate(payment.dueDate)}</p>
      <p className="text-sm font-bold font-mono text-amber-400">{formatCurrency(payment.amount)}</p>
      {payment.label && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
          {payment.label}
        </span>
      )}
      <span className={`text-xs font-medium ${
        payment.status === 'paid' ? 'text-emerald-400' : payment.status === 'upcoming' ? 'text-amber-400' : 'text-slate-500'
      }`}>
        {payment.status === 'paid' ? 'Paid' : payment.status === 'upcoming' ? 'Due Soon' : 'Upcoming'}
      </span>
    </motion.div>
  )
}

function AfterpayCard({ item, onMarkPaid, onEdit, onDelete }) {
  const paidCount = item.payments.filter(p => p.status === 'paid').length
  const totalPaid = item.payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const totalRemaining = item.totalAmount - totalPaid
  const progressPct = (totalPaid / item.totalAmount) * 100
  const upcomingPayment = item.payments.find(p => p.status === 'upcoming')
  const isComplete = paidCount === item.payments.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card-glass p-5 ${isComplete ? 'opacity-60' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white">{item.name}</h3>
          <p className="text-sm text-slate-400">{formatCurrency(item.totalAmount)} total</p>
        </div>
        <div className="flex items-center gap-2">
          {isComplete && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Complete
            </span>
          )}
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

      {/* Payment steps */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {item.payments.map((p, i) => (
          <PaymentStep key={p.id} payment={p} index={i} />
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>{formatCurrency(totalPaid)} paid</span>
          <span>{progressPct.toFixed(0)}% complete</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* CTA */}
      {!isComplete && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Remaining</p>
            <p className="text-base font-bold font-mono text-red-400">{formatCurrency(totalRemaining)}</p>
          </div>
          {upcomingPayment && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onMarkPaid(item.id, upcomingPayment.id)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
            >
              Mark #{upcomingPayment.number} Paid
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  )
}

function AddItemModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [preview, setPreview] = useState(false)

  const canPreview = name && totalAmount && purchaseDate
  const schedule = canPreview ? generatePaymentSchedule(Number(totalAmount), purchaseDate) : []

  const handleSave = () => {
    const payments = generatePaymentSchedule(Number(totalAmount), purchaseDate)
    onSave({ name, totalAmount: Number(totalAmount), payments })
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
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 overflow-hidden"
        style={{ backgroundColor: '#0F1629' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Add Afterpay Item</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Item Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Amazon TV, Walmart Gift Card"
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Total Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                value={totalAmount}
                onChange={e => setTotalAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
                step="0.01"
                min="0"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Purchase Date</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={e => setPurchaseDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          {canPreview && (
            <div>
              <button
                onClick={() => setPreview(!preview)}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 mb-2"
              >
                {preview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {preview ? 'Hide' : 'Show'} Payment Schedule Preview
              </button>
              <AnimatePresence>
                {preview && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1.5">
                      {schedule.map(p => (
                        <div key={p.id} className="flex justify-between text-xs px-3 py-1.5 rounded-lg bg-white/5">
                          <span className="text-slate-400">Payment #{p.number} — {formatDate(p.dueDate)}</span>
                          <span className="font-mono text-amber-400">{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-white/10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={!canPreview}
            className="w-full py-3 rounded-xl font-semibold text-white bg-amber-500 hover:bg-amber-400 transition-colors disabled:opacity-40"
          >
            Add Item
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

function EditItemModal({ item, onClose, onSave }) {
  const [name, setName] = useState(item.name)
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
          <h2 className="text-lg font-bold text-white">Edit Item</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="mb-4">
          <label className="text-sm text-slate-400 block mb-1">Item Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none"
          />
        </div>
        <button
          onClick={() => { onSave({ name }); onClose() }}
          className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-400 transition-colors"
        >
          Save
        </button>
      </motion.div>
    </div>
  )
}

export default function Afterpay() {
  const afterpayItems = useStore(s => s.afterpayItems)
  const addAfterpayItem = useStore(s => s.addAfterpayItem)
  const updateAfterpayItem = useStore(s => s.updateAfterpayItem)
  const deleteAfterpayItem = useStore(s => s.deleteAfterpayItem)
  const markAfterpayPayment = useStore(s => s.markAfterpayPayment)
  const addToast = useStore(s => s.addToast)

  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [archivedOpen, setArchivedOpen] = useState(false)

  const activeItems = afterpayItems.filter(i => i.payments.some(p => p.status !== 'paid'))
  const archivedItems = afterpayItems.filter(i => i.payments.every(p => p.status === 'paid'))

  const handleDelete = (id) => {
    deleteAfterpayItem(id)
    setDeleteConfirm(null)
    addToast('Afterpay item deleted')
  }

  const totalMonthlyRemaining = activeItems.reduce((sum, item) => {
    return sum + item.payments.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0)
  }, 0)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag size={24} className="text-blue-400" />
            Afterpay
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {activeItems.length} active plan{activeItems.length !== 1 ? 's' : ''} — {formatCurrency(totalMonthlyRemaining)} remaining
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-400 transition-colors"
        >
          <Plus size={16} />
          Add Item
        </motion.button>
      </div>

      {/* Active Plans */}
      <div className="space-y-4 mb-6">
        {activeItems.length === 0 ? (
          <div className="card-glass p-8 text-center">
            <ShoppingBag size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No active Afterpay plans. Add an item to get started.</p>
          </div>
        ) : (
          activeItems.map(item => (
            <AfterpayCard
              key={item.id}
              item={item}
              onMarkPaid={markAfterpayPayment}
              onEdit={() => setEditItem(item)}
              onDelete={() => {
                if (deleteConfirm === item.id) handleDelete(item.id)
                else setDeleteConfirm(item.id)
              }}
            />
          ))
        )}
      </div>

      {/* Archived */}
      {archivedItems.length > 0 && (
        <div className="card-glass overflow-hidden">
          <button
            onClick={() => setArchivedOpen(!archivedOpen)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
          >
            <span className="text-base font-semibold text-slate-400">
              Completed Plans ({archivedItems.length})
            </span>
            {archivedOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </button>
          <AnimatePresence>
            {archivedOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-white/10 p-4 space-y-4">
                  {archivedItems.map(item => (
                    <AfterpayCard
                      key={item.id}
                      item={item}
                      onMarkPaid={() => {}}
                      onEdit={() => setEditItem(item)}
                      onDelete={() => handleDelete(item.id)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAdd && (
          <AddItemModal
            onClose={() => setShowAdd(false)}
            onSave={addAfterpayItem}
          />
        )}
        {editItem && (
          <EditItemModal
            item={editItem}
            onClose={() => setEditItem(null)}
            onSave={(updates) => updateAfterpayItem(editItem.id, updates)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
