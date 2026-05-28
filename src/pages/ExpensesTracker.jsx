import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
  Plus, Search, Download, Pencil, Trash2,
  Check, X, Utensils, CreditCard, Car, ShoppingCart,
  HeartPulse, MoreHorizontal, FileText
} from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth, isAfter, isBefore } from 'date-fns'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useStore } from '../store/useStore'
import { formatCurrency, formatDateInput } from '../lib/formatters'

const CATEGORIES = ['Food', 'Bills', 'Transport', 'Entertainment', 'Health', 'Other']
const ACCOUNTS = [
  { value: 'chaseDebit', label: 'Chase DC' },
  { value: 'capitalOneDebit', label: 'Capital One DC' },
  { value: 'cashApp', label: 'Cash App DC' },
  { value: 'paypal', label: 'PayPal DC' },
]
const CATEGORY_COLORS = {
  Food: '#F59E0B',
  Bills: '#3B82F6',
  Transport: '#8B5CF6',
  Entertainment: '#EC4899',
  Health: '#10B981',
  Other: '#64748B',
}
const CATEGORY_ICONS = {
  Food: Utensils,
  Bills: CreditCard,
  Transport: Car,
  Entertainment: ShoppingCart,
  Health: HeartPulse,
  Other: MoreHorizontal,
}

const emptyForm = {
  amount: '',
  date: formatDateInput(new Date()),
  category: 'Food',
  account: 'chaseDebit',
  note: '',
  type: 'out',
}

function FormField({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

function TxModal({ isOpen, onClose, initial = null }) {
  const addTransaction = useStore(s => s.addTransaction)
  const updateTransaction = useStore(s => s.updateTransaction)

  const [form, setForm] = useState(initial || emptyForm)
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) e.amount = 'Enter a valid amount'
    if (!form.date) e.date = 'Date is required'
    if (!form.note.trim()) e.note = 'Add a note'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const tx = { ...form, amount: parseFloat(form.amount) }
    if (initial) {
      updateTransaction(initial.id, tx)
    } else {
      addTransaction(tx)
    }
    onClose()
    setForm(emptyForm)
    setErrors({})
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/60 focus:outline-none placeholder-slate-600'
  const activeCls = 'border-amber-500/60 bg-amber-500/10'
  const inactiveCls = 'border-white/10 bg-white/5'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Edit Transaction' : 'Add Transaction'}>
      <div className="space-y-4">
        {/* In / Out toggle */}
        <div className="grid grid-cols-2 rounded-xl overflow-hidden border border-white/10">
          {['out', 'in'].map(t => (
            <button
              key={t}
              onClick={() => set('type', t)}
              className={`py-2.5 text-sm font-medium transition-all ${
                form.type === t
                  ? t === 'out'
                    ? 'bg-red-500/20 text-red-300 border-r border-red-500/30'
                    : 'bg-emerald-500/20 text-emerald-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t === 'out' ? 'Expense (Out)' : 'Income (In)'}
            </button>
          ))}
        </div>

        {/* Amount */}
        <FormField label="Amount" error={errors.amount}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              className={`${inputCls} pl-7`}
              placeholder="0.00"
              step="0.01"
            />
          </div>
        </FormField>

        {/* Date */}
        <FormField label="Date" error={errors.date}>
          <input
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            className={inputCls}
            style={{ colorScheme: 'dark' }}
          />
        </FormField>

        {/* Category */}
        <FormField label="Category">
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => set('category', cat)}
                className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                  form.category === cat ? activeCls : inactiveCls
                } ${form.category === cat ? 'text-amber-300' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </FormField>

        {/* Account */}
        <FormField label="Account">
          <select
            value={form.account}
            onChange={e => set('account', e.target.value)}
            className={`${inputCls} appearance-none`}
            style={{ colorScheme: 'dark' }}
          >
            {ACCOUNTS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </FormField>

        {/* Note */}
        <FormField label="Note" error={errors.note}>
          <input
            type="text"
            value={form.note}
            onChange={e => set('note', e.target.value)}
            className={inputCls}
            placeholder="e.g. Grocery run at Walmart"
          />
        </FormField>

        {/* Submit */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ backgroundColor: '#F59E0B' }}
        >
          <Check size={16} />
          {initial ? 'Save Changes' : 'Add Transaction'}
        </motion.button>
      </div>
    </Modal>
  )
}

export default function ExpensesTracker() {
  const transactions = useStore(s => s.transactions)
  const deleteTransaction = useStore(s => s.deleteTransaction)

  const [showAdd, setShowAdd] = useState(false)
  const [editTx, setEditTx] = useState(null)
  const [deleteTx, setDeleteTx] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [filterAccount, setFilterAccount] = useState('All')
  const [filterType, setFilterType] = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (search && !tx.note?.toLowerCase().includes(search.toLowerCase()) && !tx.category?.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCat !== 'All' && tx.category !== filterCat) return false
      if (filterAccount !== 'All' && tx.account !== filterAccount) return false
      if (filterType !== 'All' && tx.type !== filterType) return false
      if (dateFrom && isBefore(parseISO(tx.date), parseISO(dateFrom))) return false
      if (dateTo && isAfter(parseISO(tx.date), parseISO(dateTo))) return false
      return true
    }).sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [transactions, search, filterCat, filterAccount, filterType, dateFrom, dateTo])

  const totals = useMemo(() => ({
    in: filtered.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0),
    out: filtered.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0),
  }), [filtered])

  const categoryBreakdown = useMemo(() => {
    const cats = {}
    filtered.filter(t => t.type === 'out').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + t.amount
    })
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [filtered])

  const exportCSV = () => {
    const rows = [
      ['Date', 'Account', 'Category', 'Note', 'Amount', 'Type'],
      ...filtered.map(t => [
        t.date,
        ACCOUNTS.find(a => a.value === t.account)?.label || t.account,
        t.category,
        t.note,
        t.amount,
        t.type === 'in' ? 'Income' : 'Expense'
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectCls = 'px-3 py-2 rounded-xl text-sm text-slate-300 bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none appearance-none'

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Transaction Tracker</h1>
          <p className="text-slate-400 text-sm mt-1">{filtered.length} transactions</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={exportCSV}
            className="px-3 py-2 rounded-xl text-sm text-slate-300 border border-white/10 flex items-center gap-1.5 hover:bg-white/5 transition-colors"
          >
            <Download size={14} />
            Export
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-1.5"
            style={{ backgroundColor: '#F59E0B' }}
          >
            <Plus size={16} />
            Add Transaction
          </motion.button>
        </div>
      </div>

      {/* Category breakdown chart */}
      {categoryBreakdown.length > 0 && (
        <div className="card-glass p-5 mb-4">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Expense Breakdown</h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={categoryBreakdown} layout="vertical" barCategoryGap="30%">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} width={90} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => formatCurrency(v)}
                contentStyle={{ backgroundColor: '#0F1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F1F5F9', fontSize: '12px' }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {categoryBreakdown.map((entry, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#64748B'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="card-glass p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none placeholder-slate-600"
          />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={selectCls} style={{ colorScheme: 'dark' }}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className={selectCls} style={{ colorScheme: 'dark' }}>
          <option value="All">All Accounts</option>
          {ACCOUNTS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className={selectCls} style={{ colorScheme: 'dark' }}>
          <option value="All">All Types</option>
          <option value="in">Income</option>
          <option value="out">Expenses</option>
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={selectCls} style={{ colorScheme: 'dark' }} placeholder="From" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={selectCls} style={{ colorScheme: 'dark' }} placeholder="To" />
        {(search || filterCat !== 'All' || filterAccount !== 'All' || filterType !== 'All' || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(''); setFilterCat('All'); setFilterAccount('All'); setFilterType('All'); setDateFrom(''); setDateTo('') }}
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Transactions table */}
      <div className="card-glass overflow-hidden">
        {filtered.length > 0 ? (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-3 px-4 py-2.5 border-b border-white/10 text-xs text-slate-500 font-medium">
              <div className="w-6" />
              <div>Note / Category</div>
              <div className="hidden sm:block">Account</div>
              <div className="hidden sm:block">Date</div>
              <div className="text-right">Amount</div>
              <div className="w-16 text-center">Actions</div>
            </div>

            <AnimatePresence>
              {filtered.map((tx, i) => {
                const Icon = CATEGORY_ICONS[tx.category] || MoreHorizontal
                const color = CATEGORY_COLORS[tx.category] || '#64748B'
                const accountLabel = ACCOUNTS.find(a => a.value === tx.account)?.label || tx.account

                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    className="grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-3 px-4 py-3 border-b border-white/5 last:border-0 items-center hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Icon */}
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${color}20` }}>
                      <Icon size={13} style={{ color }} />
                    </div>

                    {/* Note / Category */}
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{tx.note || '—'}</p>
                      <p className="text-xs text-slate-500">{tx.category}</p>
                    </div>

                    {/* Account */}
                    <div className="hidden sm:block text-xs text-slate-400">{accountLabel}</div>

                    {/* Date */}
                    <div className="hidden sm:block text-xs text-slate-400">
                      {format(parseISO(tx.date), 'MMM d, yyyy')}
                    </div>

                    {/* Amount */}
                    <div className={`text-sm font-mono font-medium text-right ${tx.type === 'in' ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {tx.type === 'in' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => setEditTx(tx)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteTx(tx)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Footer totals */}
            <div className="px-4 py-3 border-t border-white/10 flex flex-wrap gap-4 justify-between text-sm">
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">In:</span>
                  <span className="text-emerald-400 font-mono font-medium">+{formatCurrency(totals.in)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Out:</span>
                  <span className="text-red-400 font-mono font-medium">-{formatCurrency(totals.out)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Net:</span>
                <span className={`font-mono font-bold ${totals.in - totals.out >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(totals.in - totals.out)}
                </span>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
              <FileText size={28} className="text-slate-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-300">No transactions yet</h3>
            <p className="text-sm text-slate-500">Start tracking your spending by adding a transaction.</p>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowAdd(true)}
              className="mt-2 px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2"
              style={{ backgroundColor: '#F59E0B' }}
            >
              <Plus size={15} />
              Add Transaction
            </motion.button>
          </div>
        )}
      </div>

      {/* Modals */}
      <TxModal isOpen={showAdd} onClose={() => setShowAdd(false)} />
      <TxModal isOpen={!!editTx} onClose={() => setEditTx(null)} initial={editTx} />
      <ConfirmDialog
        isOpen={!!deleteTx}
        onClose={() => setDeleteTx(null)}
        onConfirm={() => { deleteTransaction(deleteTx.id); setDeleteTx(null) }}
        title="Delete Transaction"
        message={`Are you sure you want to delete "${deleteTx?.note || deleteTx?.category}"? This action cannot be undone.`}
      />
    </div>
  )
}

