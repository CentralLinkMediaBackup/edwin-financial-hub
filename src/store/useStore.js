// SUPABASE IS THE SOURCE OF TRUTH
// Never reset or re-seed this data on deploy
// Check for existing records before inserting
// All user data persists in Supabase independently of code changes
//
// This store loads live from Supabase on every app start.
// All mutations update local state immediately (optimistic) then write to Supabase async.
// The old localStorage persist/version/migrate system has been removed — that was the bug.

import { create } from 'zustand'
import { format, addWeeks } from 'date-fns'
import { supabase } from '../lib/supabase'

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── DB row → store object transforms ────────────────────────────────────────

const txFromRow = (r) => ({
  id:        r.id,
  date:      r.date,
  type:      r.type,
  amount:    Number(r.amount),
  category:  r.category  || 'Other',
  note:      r.note      || '',
  account:   r.account   || 'chaseDebit',
  isOneTime: r.is_one_time || false,
  source:    r.source    || undefined,
  createdAt: r.created_at || r.date,
})

const txToRow = (tx) => ({
  id:          tx.id,
  date:        tx.date,
  type:        tx.type,
  amount:      tx.amount,
  category:    tx.category   || null,
  note:        tx.note       || null,
  account:     tx.account    || 'chaseDebit',
  is_one_time: tx.isOneTime  || false,
  source:      tx.source     || null,
  created_at:  tx.createdAt  || new Date().toISOString(),
})

const billFromRow = (r) => ({
  id:            r.id,
  name:          r.name,
  amount:        Number(r.amount) || 0,
  dueDay:        r.due_day,
  frequency:     r.frequency    || 'monthly',
  isActive:      r.is_active     ?? true,
  category:      r.category      || 'Other',
  note:          r.note          || undefined,
  paidThisMonth: r.paid_this_month || false,
})

const billToRow = (b) => ({
  id:              b.id,
  name:            b.name,
  amount:          b.amount,
  due_day:         b.dueDay       ?? null,
  frequency:       b.frequency    || 'monthly',
  is_active:       b.isActive     ?? true,
  category:        b.category     || null,
  note:            b.note         || null,
  paid_this_month: b.paidThisMonth || false,
})

const pcFromRow = (r) => ({
  id:        r.id,
  date:      r.date,
  amount:    Number(r.amount),
  source:    r.source    || 'Prosperity Fire Protection, LLC',
  account:   r.account   || 'chaseDebit',
  note:      r.note      || 'Weekly paycheck',
  received:  r.received  || false,
  isOneTime: r.is_one_time || false,
})

const pcToRow = (p) => ({
  id:          p.id,
  date:        p.date,
  amount:      p.amount,
  source:      p.source     || null,
  account:     p.account    || 'chaseDebit',
  note:        p.note       || null,
  received:    p.received   || false,
  is_one_time: p.isOneTime  || false,
})

const tiltFromRow = (r) => ({
  id:               r.id,
  amountUsed:       Number(r.amount_used)   || 0,
  creditLimit:      Number(r.credit_limit)  || 400,
  instantDelivery:  r.instant_delivery      ?? true,
  instantFee:       Number(r.instant_fee)   || 12,
  repaymentDate:    r.repayment_date,
  repaymentOption:  r.repayment_option      || 'A',
  status:           r.status               || 'active',
  repaidAt:         r.repaid_at            || undefined,
  note:             r.note                 || undefined,
  createdAt:        r.created_at,
})

const tiltToRow = (l) => ({
  id:               l.id,
  amount_used:      l.amountUsed,
  credit_limit:     l.creditLimit     || 400,
  instant_delivery: l.instantDelivery ?? true,
  instant_fee:      l.instantFee      || 12,
  repayment_date:   l.repaymentDate   || null,
  repayment_option: l.repaymentOption || 'A',
  status:           l.status         || 'active',
  repaid_at:        l.repaidAt       || null,
  note:             l.note           || null,
  created_at:       l.createdAt      || new Date().toISOString(),
})

const earnInFromRow = (r) => ({
  id:              r.id,
  cycleStartDate:  r.cycle_start_date,
  fri_taken:       r.fri_taken   || false,
  sat_taken:       r.sat_taken   || false,
  sun_taken:       r.sun_taken   || false,
  mon_taken:       r.mon_taken   || false,
  amounts:         r.amounts     || { fri: 155.99, sat: 155.99, sun: 155.99, mon: 53.99 },
  repaymentAmount: Number(r.repayment_amount) || 521.96,
  status:          r.status     || 'active',
})

const earnInToRow = (l) => ({
  id:               l.id,
  cycle_start_date: l.cycleStartDate,
  fri_taken:        l.fri_taken   || false,
  sat_taken:        l.sat_taken   || false,
  sun_taken:        l.sun_taken   || false,
  mon_taken:        l.mon_taken   || false,
  amounts:          l.amounts     || { fri: 155.99, sat: 155.99, sun: 155.99, mon: 53.99 },
  repayment_amount: l.repaymentAmount || 521.96,
  status:           l.status     || 'active',
})

const afterpayFromRow = (r) => ({
  id:          r.id,
  name:        r.name,
  totalAmount: Number(r.total_amount) || 0,
  payments:    r.payments || [],
})

const afterpayToRow = (i) => ({
  id:           i.id,
  name:         i.name,
  total_amount: i.totalAmount || 0,
  payments:     i.payments    || [],
})

const debtFromRow = (r) => ({
  id:             r.id,
  name:           r.name,
  totalBalance:   Number(r.total_balance)   || 0,
  minimumPayment: Number(r.minimum_payment) || 0,
  apr:            Number(r.apr)             || 0,
  paymentHistory: r.payment_history         || [],
})

const debtToRow = (d) => ({
  id:              d.id,
  name:            d.name,
  total_balance:   d.totalBalance,
  minimum_payment: d.minimumPayment,
  apr:             d.apr,
  payment_history: d.paymentHistory || [],
})

const savingsFromRow = (r) => ({
  id:            r.id,
  name:          r.name,
  targetAmount:  Number(r.target_amount)  || 0,
  currentAmount: Number(r.current_amount) || 0,
  targetDate:    r.target_date  || undefined,
  createdAt:     r.created_at,
})

const savingsToRow = (g) => ({
  id:             g.id,
  name:           g.name,
  target_amount:  g.targetAmount  || 0,
  current_amount: g.currentAmount || 0,
  target_date:    g.targetDate    || null,
})

const pendingFromRow = (r) => ({
  id:        r.id,
  label:     r.label,
  amount:    Number(r.amount),
  details:   r.details   || [],
  note:      r.note      || '',
  status:    r.status    || 'pending',
  createdAt: r.created_at,
})

const pendingToRow = (p) => ({
  id:         p.id,
  label:      p.label,
  amount:     p.amount,
  details:    p.details   || [],
  note:       p.note      || null,
  status:     p.status    || 'pending',
  created_at: p.createdAt || format(new Date(), 'yyyy-MM-dd'),
})

// ─── Supabase write helpers ───────────────────────────────────────────────────
// All writes are fire-and-forget. Local state is updated immediately (optimistic).
function sbWrite(promise, label) {
  promise.then(({ error }) => {
    if (error) console.error(`[Supabase] ${label}:`, error.message)
  }).catch(err => console.error(`[Supabase] ${label}:`, err))
}

function sbUpdateBalance(account, balance) {
  sbWrite(
    supabase.from('accounts').upsert({ key: account, balance, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
    `updateBalance(${account})`
  )
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useStore = create((set, get) => ({

  // ── Loading state ──────────────────────────────────────────────────────────
  initialized: false,
  syncing:     false,

  // ── Theme (localStorage only — display preference, not financial data) ─────
  theme: localStorage.getItem('theme') || 'dark',
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    set({ theme: next })
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('dark',  next === 'dark')
    document.documentElement.classList.toggle('light', next === 'light')
  },

  // ── Toasts ─────────────────────────────────────────────────────────────────
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = generateId()
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => get().removeToast(id), 3500)
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  // ── Data (empty until initialized from Supabase) ───────────────────────────
  accounts:      { chaseDebit: 0, capitalOneDebit: 0, cashApp: 0, paypal: 0, cash: 0 },
  projectedBalance: null,
  transactions:  [],
  bills:         [],
  paychecks:     [],
  tiltLogs:      [],
  earnInLogs:    [],
  afterpayItems: [],
  debts:         [],
  savingsGoals:  [],
  settings: {
    earnIn:   { repaymentAmount: 521.96, fri: 155.99, sat: 155.99, sun: 105.99, mon: 53.99 },
    tilt:     { maxCredit: 400, instantFee: 12 },
    paycheck: { defaultAmount: 986, frequency: 'weekly' },
    billsResetMonth: null,
  },
  pendingIncome: [],

  // ── INITIALIZE FROM SUPABASE ───────────────────────────────────────────────
  // Called once in App.jsx on mount. Loads all tables and populates the store.
  // If Supabase tables are empty, seeds all initial data automatically.
  initialize: async () => {
    try {
      // Check accounts first — if empty, seed everything
      const { data: accRows, error: accErr } = await supabase.from('accounts').select('*')
      if (accErr) {
        console.error('[Supabase] accounts load failed:', accErr.message)
        console.warn('[Supabase] Run supabase/migrations/002_reset_and_correct_schema.sql in the Supabase SQL Editor.')
        set({ initialized: true })
        return
      }

      if (!accRows || accRows.length === 0) {
        console.log('[Supabase] Empty database — auto-seeding...')
        await get()._seedAll()
        return get().initialize() // reload after seed
      }

      // Load all tables in parallel
      const [
        { data: txRows },
        { data: billRows },
        { data: pcRows },
        { data: tiltRows },
        { data: earnInRows },
        { data: apRows },
        { data: debtRows },
        { data: sgRows },
        { data: settingsRows },
        { data: piRows },
      ] = await Promise.all([
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('bills').select('*'),
        supabase.from('paychecks').select('*').order('date'),
        supabase.from('tilt_logs').select('*').order('created_at', { ascending: false }),
        supabase.from('earnin_logs').select('*').order('created_at', { ascending: false }),
        supabase.from('afterpay_items').select('*'),
        supabase.from('debts').select('*'),
        supabase.from('savings_goals').select('*'),
        supabase.from('settings').select('*').eq('id', 'singleton'),
        supabase.from('pending_income').select('*'),
      ])

      const accountsObj = {}
      accRows.forEach(r => { accountsObj[r.key] = Number(r.balance) })

      const settingsRow = settingsRows?.[0]
      const settings = settingsRow ? {
        earnIn:   settingsRow.earn_in      || { repaymentAmount: 521.96, fri: 155.99, sat: 155.99, sun: 105.99, mon: 53.99 },
        tilt:     settingsRow.tilt_cfg     || { maxCredit: 400, instantFee: 12 },
        paycheck: settingsRow.paycheck_cfg || { defaultAmount: 980, frequency: 'weekly' },
        billsResetMonth: settingsRow.paycheck_cfg?._billsResetMonth || null,
      } : get().settings

      set({
        accounts:        accountsObj,
        projectedBalance: settingsRow?.projected_balance ?? null,
        transactions:    (txRows     || []).map(txFromRow),
        bills:           (billRows   || []).map(billFromRow),
        paychecks:       (pcRows     || []).map(pcFromRow),
        tiltLogs:        (tiltRows   || []).map(tiltFromRow),
        earnInLogs:      (earnInRows || []).map(earnInFromRow),
        afterpayItems:   (apRows     || []).map(afterpayFromRow),
        debts:           (debtRows   || []).map(debtFromRow),
        savingsGoals:    (sgRows     || []).map(savingsFromRow),
        settings,
        pendingIncome:   (piRows     || []).map(pendingFromRow),
        initialized: true,
      })
      console.log('[Supabase] Loaded:', {
        accounts: accRows.length, transactions: txRows?.length,
        bills: billRows?.length, paychecks: pcRows?.length,
      })
      // Auto-deduct overdue bills (Option A)
      get()._autoProcessBills()
    } catch (err) {
      console.error('[Supabase] initialize error:', err)
      set({ initialized: true }) // unblock UI on unexpected error
    }
  },

  // ── AUTO-SEED (runs once on empty database) ────────────────────────────────
  _seedAll: async () => {
    const { seedAll } = await import('../lib/supabase-seed.js')
    await seedAll(supabase)
  },

  // ── ACCOUNTS ───────────────────────────────────────────────────────────────
  setAccount: (account, value) => {
    set(s => ({ accounts: { ...s.accounts, [account]: Number(value) } }))
    sbUpdateBalance(account, Number(value))
  },
  setProjectedBalance: (val) => {
    set({ projectedBalance: val })
    sbWrite(
      supabase.from('settings').upsert({ id: 'singleton', projected_balance: val }, { onConflict: 'id' }),
      'setProjectedBalance'
    )
  },

  // ── TRANSACTIONS ───────────────────────────────────────────────────────────
  addTransaction: (transaction) => {
    const newTx = { ...transaction, id: generateId(), createdAt: new Date().toISOString() }
    const delta = transaction.type === 'in' ? transaction.amount : -transaction.amount
    set(s => ({
      transactions: [newTx, ...s.transactions],
      accounts: { ...s.accounts, [transaction.account]: (s.accounts[transaction.account] || 0) + delta },
    }))
    const newBal = get().accounts[transaction.account]
    sbWrite(supabase.from('transactions').insert([txToRow(newTx)]), 'addTransaction')
    sbUpdateBalance(transaction.account, newBal)
    get().addToast('Transaction added', 'success')
    return newTx
  },

  updateTransaction: (id, updates) => {
    set(s => {
      const old = s.transactions.find(t => t.id === id)
      const accounts = { ...s.accounts }
      if (old) {
        const oldDelta = old.type === 'in' ? -old.amount : old.amount
        accounts[old.account] = (accounts[old.account] || 0) + oldDelta
      }
      const newAmount  = parseFloat(updates.amount  ?? old?.amount)
      const newType    = updates.type    ?? old?.type
      const newAccount = updates.account ?? old?.account
      const newDelta   = newType === 'in' ? newAmount : -newAmount
      accounts[newAccount] = (accounts[newAccount] || 0) + newDelta
      return {
        transactions: s.transactions.map(t => t.id === id ? { ...t, ...updates } : t),
        accounts,
      }
    })
    const updated = get().transactions.find(t => t.id === id)
    if (updated) {
      sbWrite(supabase.from('transactions').update(txToRow(updated)).eq('id', id), 'updateTransaction')
      sbUpdateBalance(updated.account, get().accounts[updated.account])
    }
    get().addToast('Transaction updated', 'success')
  },

  deleteTransaction: (id) => {
    set(s => {
      const tx = s.transactions.find(t => t.id === id)
      const accounts = { ...s.accounts }
      if (tx) {
        const delta = tx.type === 'in' ? -tx.amount : tx.amount
        accounts[tx.account] = (accounts[tx.account] || 0) + delta
      }
      return { transactions: s.transactions.filter(t => t.id !== id), accounts }
    })
    sbWrite(supabase.from('transactions').delete().eq('id', id), 'deleteTransaction')
    get().addToast('Transaction deleted', 'success')
  },

  // ── BILLS ──────────────────────────────────────────────────────────────────
  addBill: (bill) => {
    const newBill = { ...bill, id: generateId() }
    set(s => ({ bills: [...s.bills, newBill] }))
    sbWrite(supabase.from('bills').insert([billToRow(newBill)]), 'addBill')
    get().addToast('Bill added', 'success')
  },

  updateBill: (id, updates) => {
    set(s => ({ bills: s.bills.map(b => b.id === id ? { ...b, ...updates } : b) }))
    const updated = get().bills.find(b => b.id === id)
    if (updated) sbWrite(supabase.from('bills').update(billToRow(updated)).eq('id', id), 'updateBill')
    get().addToast('Bill updated', 'success')
  },

  deleteBill: (id) => {
    set(s => ({ bills: s.bills.filter(b => b.id !== id) }))
    sbWrite(supabase.from('bills').delete().eq('id', id), 'deleteBill')
    get().addToast('Bill deleted', 'success')
  },

  markBillManuallyPaid: (billId) => {
    const state = get()
    const bill = state.bills.find(b => b.id === billId)
    if (!bill || bill.paidThisMonth) return
    const today = format(new Date(), 'yyyy-MM-dd')
    const currentMonth = format(new Date(), 'yyyy-MM')
    const txId = `manual-bill-${billId}-${currentMonth}`
    const newTx = {
      id: txId, date: today, type: 'out', amount: bill.amount,
      category: bill.category || 'Bills', note: bill.name,
      account: 'chaseDebit', isOneTime: false, source: 'bill-payment',
      createdAt: new Date().toISOString(),
    }
    const newBal = parseFloat(((state.accounts.chaseDebit || 0) - bill.amount).toFixed(2))
    set(s => ({
      bills: s.bills.map(b => b.id === billId ? { ...b, paidThisMonth: true } : b),
      transactions: [newTx, ...s.transactions],
      accounts: { ...s.accounts, chaseDebit: newBal },
    }))
    sbWrite(supabase.from('transactions').insert([txToRow(newTx)]), 'markBillManuallyPaid-tx')
    sbUpdateBalance('chaseDebit', newBal)
    sbWrite(supabase.from('bills').update({ paid_this_month: true }).eq('id', billId), 'markBillManuallyPaid')
    get().addToast(`${bill.name} marked as paid`, 'success')
  },

  unmarkBillPaid: (billId) => {
    const state = get()
    const bill = state.bills.find(b => b.id === billId)
    if (!bill) return
    const currentMonth = format(new Date(), 'yyyy-MM')
    const manualTxId = `manual-bill-${billId}-${currentMonth}`
    const autoBillTxId = `auto-bill-${billId}-${currentMonth}`
    const txToRemove = state.transactions.find(t => t.id === manualTxId || t.id === autoBillTxId)
    const amountToAdd = txToRemove ? txToRemove.amount : bill.amount
    const newBal = parseFloat(((state.accounts.chaseDebit || 0) + amountToAdd).toFixed(2))
    set(s => ({
      bills: s.bills.map(b => b.id === billId ? { ...b, paidThisMonth: false } : b),
      transactions: s.transactions.filter(t => t.id !== manualTxId && t.id !== autoBillTxId),
      accounts: { ...s.accounts, chaseDebit: newBal },
    }))
    sbWrite(supabase.from('transactions').delete().eq('id', manualTxId), 'unmarkBillPaid-manual')
    sbWrite(supabase.from('transactions').delete().eq('id', autoBillTxId), 'unmarkBillPaid-auto')
    sbUpdateBalance('chaseDebit', newBal)
    sbWrite(supabase.from('bills').update({ paid_this_month: false }).eq('id', billId), 'unmarkBillPaid')
    get().addToast(`${bill.name} marked as unpaid`, 'success')
  },

  // ── PAYCHECKS ──────────────────────────────────────────────────────────────
  addPaycheck: (paycheck) => {
    const newP = { ...paycheck, id: paycheck.id || generateId() }
    set(s => ({ paychecks: [newP, ...s.paychecks] }))
    sbWrite(supabase.from('paychecks').insert([pcToRow(newP)]), 'addPaycheck')
    get().addToast('Paycheck added', 'success')
  },

  updatePaycheck: (id, updates) => {
    set(s => ({ paychecks: s.paychecks.map(p => p.id === id ? { ...p, ...updates } : p) }))
    const updated = get().paychecks.find(p => p.id === id)
    if (updated) sbWrite(supabase.from('paychecks').update(pcToRow(updated)).eq('id', id), 'updatePaycheck')
  },

  deletePaycheck: (id) => {
    set(s => ({ paychecks: s.paychecks.filter(p => p.id !== id) }))
    sbWrite(supabase.from('paychecks').delete().eq('id', id), 'deletePaycheck')
  },

  markPaycheckReceived: (id) => {
    set(s => ({ paychecks: s.paychecks.map(p => p.id === id ? { ...p, received: true } : p) }))
    sbWrite(supabase.from('paychecks').update({ received: true }).eq('id', id), 'markPaycheckReceived')
    get().addToast('Paycheck marked as received', 'success')
  },

  // ── TILT LOGS ──────────────────────────────────────────────────────────────
  addTiltLog: (log) => {
    const newLog = { ...log, id: generateId(), createdAt: new Date().toISOString() }
    set(s => ({ tiltLogs: [newLog, ...s.tiltLogs] }))
    sbWrite(supabase.from('tilt_logs').insert([tiltToRow(newLog)]), 'addTiltLog')
    get().addToast('TILT advance logged', 'success')
  },

  updateTiltLog: (id, updates) => {
    set(s => ({ tiltLogs: s.tiltLogs.map(l => l.id === id ? { ...l, ...updates } : l) }))
    const updated = get().tiltLogs.find(l => l.id === id)
    if (updated) sbWrite(supabase.from('tilt_logs').update(tiltToRow(updated)).eq('id', id), 'updateTiltLog')
  },

  deleteTiltLog: (id) => {
    set(s => ({ tiltLogs: s.tiltLogs.filter(l => l.id !== id) }))
    sbWrite(supabase.from('tilt_logs').delete().eq('id', id), 'deleteTiltLog')
  },

  markTiltRepaid: (id) => {
    const now = format(new Date(), 'yyyy-MM-dd')
    set(s => ({ tiltLogs: s.tiltLogs.map(l => l.id === id ? { ...l, status: 'repaid', repaidAt: now } : l) }))
    sbWrite(supabase.from('tilt_logs').update({ status: 'repaid', repaid_at: now }).eq('id', id), 'markTiltRepaid')
    get().addToast('TILT advance marked as repaid', 'success')
  },

  // ── EARN IN LOGS ───────────────────────────────────────────────────────────
  addEarnInLog: (log) => {
    const newLog = { ...log, id: generateId(), createdAt: new Date().toISOString() }
    set(s => ({ earnInLogs: [newLog, ...s.earnInLogs] }))
    sbWrite(supabase.from('earnin_logs').insert([earnInToRow(newLog)]), 'addEarnInLog')
    get().addToast('Earn In cycle added', 'success')
  },

  updateEarnInLog: (id, updates) => {
    set(s => ({ earnInLogs: s.earnInLogs.map(l => l.id === id ? { ...l, ...updates } : l) }))
    const updated = get().earnInLogs.find(l => l.id === id)
    if (updated) sbWrite(supabase.from('earnin_logs').update(earnInToRow(updated)).eq('id', id), 'updateEarnInLog')
  },

  deleteEarnInLog: (id) => {
    set(s => ({ earnInLogs: s.earnInLogs.filter(l => l.id !== id) }))
    sbWrite(supabase.from('earnin_logs').delete().eq('id', id), 'deleteEarnInLog')
  },

  logNewEarnInUsage: (log) => {
    const state = get()
    const totalTaken = ['fri', 'sat', 'sun', 'mon'].reduce((sum, day) =>
      log[`${day}_taken`] ? sum + (log.amounts?.[day] || 0) : sum, 0)
    const newLog = {
      ...log, id: generateId(), status: 'active',
      repaymentAmount: totalTaken, createdAt: new Date().toISOString(),
    }
    const newBal = parseFloat(((state.accounts.chaseDebit || 0) + totalTaken).toFixed(2))
    set(s => ({
      earnInLogs: [newLog, ...s.earnInLogs],
      accounts: { ...s.accounts, chaseDebit: newBal },
    }))
    sbWrite(supabase.from('earnin_logs').insert([earnInToRow(newLog)]), 'logNewEarnInUsage')
    sbUpdateBalance('chaseDebit', newBal)
    get().addToast('Earn In usage logged — balance updated', 'success')
  },

  markStepTaken: (logId, step) => {
    set(s => ({
      earnInLogs: s.earnInLogs.map(l => l.id === logId ? { ...l, [`${step}_taken`]: true } : l)
    }))
    sbWrite(supabase.from('earnin_logs').update({ [`${step}_taken`]: true }).eq('id', logId), 'markStepTaken')
    get().addToast(`Earn In ${step.charAt(0).toUpperCase() + step.slice(1)} step marked`, 'success')
  },

  // ── AFTERPAY ───────────────────────────────────────────────────────────────
  addAfterpayItem: (item) => {
    const newItem = { ...item, id: generateId() }
    set(s => ({ afterpayItems: [...s.afterpayItems, newItem] }))
    sbWrite(supabase.from('afterpay_items').insert([afterpayToRow(newItem)]), 'addAfterpayItem')
    get().addToast('Afterpay item added', 'success')
  },

  updateAfterpayItem: (id, updates) => {
    set(s => ({ afterpayItems: s.afterpayItems.map(i => i.id === id ? { ...i, ...updates } : i) }))
    const updated = get().afterpayItems.find(i => i.id === id)
    if (updated) sbWrite(supabase.from('afterpay_items').update(afterpayToRow(updated)).eq('id', id), 'updateAfterpayItem')
  },

  deleteAfterpayItem: (id) => {
    set(s => ({ afterpayItems: s.afterpayItems.filter(i => i.id !== id) }))
    sbWrite(supabase.from('afterpay_items').delete().eq('id', id), 'deleteAfterpayItem')
  },

  markAfterpayPayment: (itemId, paymentId) => {
    const today = format(new Date(), 'yyyy-MM-dd')
    set(s => ({
      afterpayItems: s.afterpayItems.map(item => {
        if (item.id !== itemId) return item
        const payments = item.payments.map(p =>
          p.id === paymentId ? { ...p, status: 'paid', paidDate: today } : p
        )
        sbWrite(supabase.from('afterpay_items').update({ payments }).eq('id', itemId), 'markAfterpayPayment')
        return { ...item, payments }
      })
    }))
    get().addToast('Afterpay payment marked as paid', 'success')
  },

  unmarkAfterpayPayment: (itemId, paymentId) => {
    set(s => ({
      afterpayItems: s.afterpayItems.map(item => {
        if (item.id !== itemId) return item
        const idx = item.payments.findIndex(p => p.id === paymentId)
        const payments = item.payments.map((p, i) =>
          p.id === paymentId ? { ...p, status: i === item.payments.length - 1 ? 'final' : 'upcoming', paidDate: null } : p
        )
        sbWrite(supabase.from('afterpay_items').update({ payments }).eq('id', itemId), 'unmarkAfterpayPayment')
        return { ...item, payments }
      })
    }))
    get().addToast('Afterpay payment unmarked', 'success')
  },

  // ── DEBTS ──────────────────────────────────────────────────────────────────
  addDebt: (debt) => {
    const newDebt = { ...debt, id: generateId(), paymentHistory: [] }
    set(s => ({ debts: [...s.debts, newDebt] }))
    sbWrite(supabase.from('debts').insert([debtToRow(newDebt)]), 'addDebt')
    get().addToast('Debt added', 'success')
  },

  updateDebt: (id, updates) => {
    set(s => ({ debts: s.debts.map(d => d.id === id ? { ...d, ...updates } : d) }))
    const updated = get().debts.find(d => d.id === id)
    if (updated) sbWrite(supabase.from('debts').update(debtToRow(updated)).eq('id', id), 'updateDebt')
    get().addToast('Debt updated', 'success')
  },

  deleteDebt: (id) => {
    set(s => ({ debts: s.debts.filter(d => d.id !== id) }))
    sbWrite(supabase.from('debts').delete().eq('id', id), 'deleteDebt')
  },

  logDebtPayment: (debtId, payment) => {
    const newPayment = { ...payment, id: generateId(), date: format(new Date(), 'yyyy-MM-dd') }
    set(s => ({
      debts: s.debts.map(d => {
        if (d.id !== debtId) return d
        const newBalance = Math.max(0, d.totalBalance - payment.amount)
        const updated = { ...d, totalBalance: newBalance, paymentHistory: [newPayment, ...d.paymentHistory] }
        sbWrite(supabase.from('debts').update(debtToRow(updated)).eq('id', debtId), 'logDebtPayment')
        return updated
      })
    }))
    get().addToast('Payment logged', 'success')
  },

  // ── SAVINGS GOALS ──────────────────────────────────────────────────────────
  addSavingsGoal: (goal) => {
    const newGoal = { ...goal, id: generateId(), currentAmount: 0, createdAt: new Date().toISOString() }
    set(s => ({ savingsGoals: [...s.savingsGoals, newGoal] }))
    sbWrite(supabase.from('savings_goals').insert([savingsToRow(newGoal)]), 'addSavingsGoal')
    get().addToast('Savings goal created', 'success')
  },

  updateSavingsGoal: (id, updates) => {
    set(s => ({ savingsGoals: s.savingsGoals.map(g => g.id === id ? { ...g, ...updates } : g) }))
    const updated = get().savingsGoals.find(g => g.id === id)
    if (updated) sbWrite(supabase.from('savings_goals').update(savingsToRow(updated)).eq('id', id), 'updateSavingsGoal')
    get().addToast('Goal updated', 'success')
  },

  deleteSavingsGoal: (id) => {
    set(s => ({ savingsGoals: s.savingsGoals.filter(g => g.id !== id) }))
    sbWrite(supabase.from('savings_goals').delete().eq('id', id), 'deleteSavingsGoal')
  },

  contributeToGoal: (id, amount) => {
    set(s => ({
      savingsGoals: s.savingsGoals.map(g =>
        g.id === id ? { ...g, currentAmount: g.currentAmount + Number(amount) } : g
      )
    }))
    const updated = get().savingsGoals.find(g => g.id === id)
    if (updated) sbWrite(supabase.from('savings_goals').update({ current_amount: updated.currentAmount }).eq('id', id), 'contributeToGoal')
    get().addToast('Contribution added', 'success')
  },

  // ── SETTINGS ───────────────────────────────────────────────────────────────
  updateSettings: (section, updates) => {
    set(s => ({
      settings: { ...s.settings, [section]: { ...s.settings[section], ...updates } }
    }))
    const s = get().settings
    const row = {
      id:           'singleton',
      earn_in:      s.earnIn,
      tilt_cfg:     s.tilt,
      paycheck_cfg: { ...s.paycheck, _billsResetMonth: s.billsResetMonth },
    }
    sbWrite(supabase.from('settings').upsert(row, { onConflict: 'id' }), 'updateSettings')
    get().addToast('Settings saved', 'success')
  },

  // ── PENDING INCOME ─────────────────────────────────────────────────────────
  markPendingPaid: (id) => {
    set(s => {
      const item = s.pendingIncome.find(p => p.id === id)
      if (!item || item.status === 'paid') return s
      const newTx = {
        id: generateId(), date: format(new Date(), 'yyyy-MM-dd'),
        type: 'in', amount: item.amount, category: 'Income',
        note: item.label, account: 'chaseDebit', createdAt: new Date().toISOString(),
      }
      const newBal = (s.accounts.chaseDebit || 0) + item.amount
      sbWrite(supabase.from('pending_income').update({ status: 'paid' }).eq('id', id), 'markPendingPaid')
      sbWrite(supabase.from('transactions').insert([txToRow(newTx)]), 'markPendingPaid-tx')
      sbUpdateBalance('chaseDebit', newBal)
      return {
        pendingIncome: s.pendingIncome.map(p => p.id === id ? { ...p, status: 'paid' } : p),
        transactions:  [newTx, ...s.transactions],
        accounts:      { ...s.accounts, chaseDebit: newBal },
      }
    })
    get().addToast("Wife's Due received — balance updated", 'success')
  },

  addPendingIncome: (item) => {
    const newItem = { ...item, id: item.id || generateId() }
    set(s => ({ pendingIncome: [...s.pendingIncome, newItem] }))
    sbWrite(supabase.from('pending_income').insert([pendingToRow(newItem)]), 'addPendingIncome')
  },

  updatePendingIncome: (id, updates) => {
    set(s => ({
      pendingIncome: s.pendingIncome.map(p => p.id === id ? { ...p, ...updates } : p),
    }))
    const updated = useStore.getState().pendingIncome.find(p => p.id === id)
    if (updated) sbWrite(supabase.from('pending_income').update(pendingToRow(updated)).eq('id', id), 'updatePendingIncome')
  },

  removePendingIncome: (id) => {
    set(s => ({ pendingIncome: s.pendingIncome.filter(p => p.id !== id) }))
    sbWrite(supabase.from('pending_income').delete().eq('id', id), 'removePendingIncome')
  },

  // ── AUTO-PROCESS BILLS (Option A) ──────────────────────────────────────────
  // Called on every app load. Resets paidThisMonth at start of new month,
  // then auto-deducts overdue unpaid bills from the Chase balance.
  // Guards: paidThisMonth flag + deterministic tx ID prevent double-deduction.
  _autoProcessBills: async () => {
    const today        = new Date()
    const currentMonth = format(today, 'yyyy-MM')
    const currentDay   = today.getDate()
    const state        = get()
    const storedMonth  = state.settings.billsResetMonth

    // Monthly reset (only when transitioning to a new month)
    if (storedMonth !== currentMonth) {
      if (storedMonth !== null) {
        // Reset all bills to unpaid for the new month
        await Promise.all(
          state.bills.map(b =>
            supabase.from('bills').update({ paid_this_month: false }).eq('id', b.id)
          )
        )
        set(s => ({ bills: s.bills.map(b => ({ ...b, paidThisMonth: false })) }))
        console.log('[AutoBill] New month — all bills reset')
      }
      const newPaycheckCfg = { ...get().settings.paycheck, _billsResetMonth: currentMonth }
      await supabase.from('settings').upsert(
        { id: 'singleton', paycheck_cfg: newPaycheckCfg },
        { onConflict: 'id' }
      )
      set(s => ({ settings: { ...s.settings, billsResetMonth: currentMonth } }))
    }

    // Find bills that are past their due date and haven't been paid
    const overdue = get().bills.filter(b =>
      b.isActive &&
      b.frequency === 'monthly' &&
      b.dueDay &&
      b.dueDay <= currentDay &&
      !b.paidThisMonth &&
      b.amount > 0
    )
    if (overdue.length === 0) return

    console.log(`[AutoBill] Auto-deducting ${overdue.length} overdue bill(s)`)

    for (const bill of overdue) {
      const txDate = format(new Date(today.getFullYear(), today.getMonth(), bill.dueDay), 'yyyy-MM-dd')
      const txId   = `auto-bill-${bill.id}-${currentMonth}`

      // Re-run guard: skip if we already inserted this auto-bill transaction
      const { data: existing } = await supabase.from('transactions').select('id').eq('id', txId)
      if (existing && existing.length > 0) {
        await supabase.from('bills').update({ paid_this_month: true }).eq('id', bill.id)
        set(s => ({ bills: s.bills.map(b => b.id === bill.id ? { ...b, paidThisMonth: true } : b) }))
        continue
      }

      const newTx = {
        id: txId, date: txDate, type: 'out', amount: bill.amount,
        category: bill.category || 'Bills', note: bill.name,
        account: 'chaseDebit', isOneTime: false, createdAt: new Date().toISOString(),
      }

      const { error: txErr } = await supabase.from('transactions').insert([txToRow(newTx)])
      if (txErr) { console.error('[AutoBill] Insert failed for', bill.name, txErr.message); continue }

      const newBal = parseFloat(((get().accounts.chaseDebit || 0) - bill.amount).toFixed(2))
      sbUpdateBalance('chaseDebit', newBal)
      await supabase.from('bills').update({ paid_this_month: true }).eq('id', bill.id)

      set(s => ({
        transactions: [newTx, ...s.transactions],
        accounts:     { ...s.accounts, chaseDebit: newBal },
        bills:        s.bills.map(b => b.id === bill.id ? { ...b, paidThisMonth: true } : b),
      }))
      console.log(`[AutoBill] ${bill.name} — -$${bill.amount.toFixed(2)} on ${txDate}`)
    }
  },
}))
