import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Plus, Check, X, Edit2, Save, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { format } from 'date-fns'
import { useStore } from '../store/useStore'
import { formatCurrency } from '../lib/formatters'

function PageHeader() {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#e0f2fe' }}>
          <FileText size={20} style={{ color: '#0284c7' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>Monthly Bills</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </div>
    </div>
  )
}

export default function Bills() {
  const bills       = useStore(s => s.bills)
  const addBill     = useStore(s => s.addBill)
  const updateBill  = useStore(s => s.updateBill)
  const deleteBill  = useStore(s => s.deleteBill)
  const markBillManuallyPaid = useStore(s => s.markBillManuallyPaid)
  const unmarkBillPaid = useStore(s => s.unmarkBillPaid)
  const addToast    = useStore(s => s.addToast)

  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId]   = useState(null)
  const [form, setForm]       = useState({ name: '', amount: '', dueDay: '', category: 'Other', frequency: 'monthly', note: '' })
  const [editForm, setEditForm] = useState({})

  const activeBills   = bills.filter(b => b.isActive)
  const inactiveBills = bills.filter(b => !b.isActive)
  const totalMonthly  = activeBills.reduce((s, b) => {
    if (b.frequency === 'weekly') return s + b.amount * 4.33
    return s + b.amount
  }, 0)
  const paidCount     = activeBills.filter(b => b.paidThisMonth).length

  const handleAdd = () => {
    if (!form.name || !form.amount) return addToast('Name and amount required', 'error')
    addBill({
      name:      form.name.trim(),
      amount:    parseFloat(form.amount) || 0,
      dueDay:    parseInt(form.dueDay) || null,
      category:  form.category,
      frequency: form.frequency,
      note:      form.note.trim(),
      isActive:  true,
    })
    setForm({ name: '', amount: '', dueDay: '', category: 'Other', frequency: 'monthly', note: '' })
    setShowAdd(false)
    addToast('Bill added')
  }

  const handleEdit = (bill) => {
    setEditId(bill.id)
    setEditForm({ name: bill.name, amount: bill.amount, dueDay: bill.dueDay || '', category: bill.category, frequency: bill.frequency, note: bill.note || '' })
  }

  const handleSaveEdit = () => {
    updateBill(editId, {
      name:      editForm.name,
      amount:    parseFloat(editForm.amount) || 0,
      dueDay:    parseInt(editForm.dueDay) || null,
      category:  editForm.category,
      frequency: editForm.frequency,
      note:      editForm.note,
    })
    setEditId(null)
    addToast('Bill updated')
  }

  const categories = ['Bills', 'Subscriptions', 'Utilities', 'Insurance', 'Rent', 'Other']

  const inputStyle = {
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    padding: '8px 10px',
    fontSize: '13px',
    color: '#0f172a',
    backgroundColor: '#fafafa',
    outline: 'none',
    width: '100%',
  }

  return (
    <div className="p-5 md:p-7 max-w-[900px] mx-auto">
      <PageHeader />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Monthly', value: formatCurrency(totalMonthly), color: '#dc2626' },
          { label: 'Paid This Month', value: `${paidCount} / ${activeBills.length}`, color: '#059669' },
          { label: 'Remaining', value: formatCurrency(activeBills.filter(b => !b.paidThisMonth).reduce((s,b) => s+b.amount, 0)), color: '#d97706' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4 border bg-white" style={{ borderColor: '#e2e8f0' }}>
            <p className="text-xs" style={{ color: '#94a3b8' }}>{label}</p>
            <p className="text-xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Add bill button */}
      <div className="mb-5">
        <button
          onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: '#0284c7' }}
        >
          <Plus size={15} /> Add Bill
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-5"
          >
            <div className="rounded-xl border p-5 bg-white" style={{ borderColor: '#e2e8f0' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: '#374151' }}>New Bill</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Bill Name *</label>
                  <input style={inputStyle} placeholder="e.g. Netflix" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Amount *</label>
                  <input style={inputStyle} type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Due Day</label>
                  <input style={inputStyle} type="number" min="1" max="31" placeholder="e.g. 15" value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Category</label>
                  <select style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Frequency</label>
                  <select style={inputStyle} value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#64748b' }}>Note</label>
                  <input style={inputStyle} placeholder="Optional note" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#0284c7' }}>
                  <Save size={14} /> Save
                </button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bills list */}
      <div className="space-y-2">
        {activeBills.length === 0 && (
          <div className="text-center py-12 rounded-xl border bg-white" style={{ borderColor: '#e2e8f0' }}>
            <FileText size={28} className="mx-auto mb-2 opacity-20" style={{ color: '#94a3b8' }} />
            <p className="text-sm" style={{ color: '#94a3b8' }}>No active bills yet</p>
          </div>
        )}

        {activeBills.map(bill => (
          <motion.div
            key={bill.id}
            layout
            className="rounded-xl border bg-white"
            style={{ borderColor: '#e2e8f0' }}
          >
            {editId === bill.id ? (
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input style={inputStyle} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" />
                  <input style={inputStyle} type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} placeholder="Amount" />
                  <input style={inputStyle} type="number" value={editForm.dueDay} onChange={e => setEditForm(f => ({ ...f, dueDay: e.target.value }))} placeholder="Due day" />
                  <select style={inputStyle} value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#0284c7' }}>
                    <Save size={12} /> Save
                  </button>
                  <button onClick={() => setEditId(null)} className="px-3 py-1.5 rounded-lg text-xs border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => bill.paidThisMonth ? unmarkBillPaid(bill.id) : markBillManuallyPaid(bill.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors"
                  style={{
                    backgroundColor: bill.paidThisMonth ? '#dcfce7' : '#fff',
                    borderColor: bill.paidThisMonth ? '#16a34a' : '#e2e8f0',
                  }}
                >
                  {bill.paidThisMonth && <Check size={13} style={{ color: '#16a34a' }} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: bill.paidThisMonth ? '#94a3b8' : '#374151', textDecoration: bill.paidThisMonth ? 'line-through' : 'none' }}>
                      {bill.name}
                    </p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                      {bill.category}
                    </span>
                    {bill.frequency === 'weekly' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                        Weekly
                      </span>
                    )}
                  </div>
                  {bill.dueDay != null && (
                    <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                      {bill.frequency === 'weekly'
                        ? `Every ${{ 0:'Sunday',1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday',6:'Saturday' }[bill.dueDay] || 'Week'}`
                        : `Due on the ${bill.dueDay}${bill.dueDay === 1 ? 'st' : bill.dueDay === 2 ? 'nd' : bill.dueDay === 3 ? 'rd' : 'th'}`}
                    </p>
                  )}
                  {bill.frequency === 'weekly' && bill.note && (
                    <p className="text-xs" style={{ color: '#94a3b8' }}>{bill.note}</p>
                  )}
                </div>

                <p className="text-base font-bold font-mono flex-shrink-0" style={{ color: '#dc2626' }}>
                  {formatCurrency(bill.amount)}
                </p>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleEdit(bill)} className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors" style={{ color: '#94a3b8' }}>
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => { updateBill(bill.id, { isActive: false }); addToast('Bill deactivated') }}
                    className="p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    style={{ color: '#94a3b8' }}
                  >
                    <ToggleRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Inactive bills */}
      {inactiveBills.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: '#94a3b8' }}>
            Inactive / Paused ({inactiveBills.length})
          </p>
          <div className="space-y-2">
            {inactiveBills.map(bill => (
              <div key={bill.id} className="flex items-center gap-3 p-4 rounded-xl border" style={{ borderColor: '#f1f5f9', backgroundColor: '#fafafa' }}>
                <p className="flex-1 text-sm" style={{ color: '#94a3b8' }}>{bill.name}</p>
                <p className="text-sm font-mono" style={{ color: '#94a3b8' }}>{formatCurrency(bill.amount)}</p>
                <button
                  onClick={() => { updateBill(bill.id, { isActive: true }); addToast('Bill reactivated') }}
                  className="text-xs px-2 py-1 rounded border transition-colors hover:bg-gray-50"
                  style={{ color: '#64748b', borderColor: '#e2e8f0' }}
                >
                  Reactivate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
