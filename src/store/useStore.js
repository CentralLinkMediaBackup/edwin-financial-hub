import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addWeeks, format, startOfWeek, nextFriday, isFriday, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'

// Generate paychecks: $980 every Friday starting May 22 2026, next 52 weeks
function generatePaychecks() {
  const paychecks = []
  // May 22, 2026 is a Friday
  const startDate = new Date(2026, 4, 22) // month is 0-indexed
  for (let i = 0; i < 52; i++) {
    const date = addWeeks(startDate, i)
    paychecks.push({
      id: `paycheck-${i + 1}`,
      date: format(date, 'yyyy-MM-dd'),
      amount: 980,
      source: 'Prosperity Fire Protection, LLC',
      account: 'chaseDebit',
      note: 'Weekly paycheck',
      received: i === 0, // first one received
    })
  }
  return paychecks
}

// Get the most recent Friday on or before today
function getLatestFriday() {
  const today = new Date()
  const day = today.getDay() // 0=Sun, 5=Fri
  const diff = day >= 5 ? day - 5 : day + 2
  const friday = new Date(today)
  friday.setDate(today.getDate() - diff)
  return format(friday, 'yyyy-MM-dd')
}

const defaultBills = [
  { id: 'bill-1',  name: 'Netflix',              amount: 8.65,    dueDay: 23,  frequency: 'monthly',    isActive: true,  category: 'Entertainment' },
  { id: 'bill-2',  name: 'Amazon Prime',          amount: 0.00,    dueDay: 7,   frequency: 'monthly',    isActive: true,  category: 'Shopping' },
  { id: 'bill-3',  name: 'TXU Electric',          amount: 110.00,  dueDay: 26,  frequency: 'monthly',    isActive: true,  category: 'Utilities' },
  { id: 'bill-4',  name: 'Spectrum Internet',     amount: 50.26,   dueDay: 25,  frequency: 'monthly',    isActive: true,  category: 'Utilities' },
  { id: 'bill-5',  name: 'Spectrum Mobile',       amount: 2.22,    dueDay: 19,  frequency: 'monthly',    isActive: true,  category: 'Phone' },
  { id: 'bill-6',  name: 'iPhone Data',           amount: 55.00,   dueDay: null, frequency: 'monthly',   isActive: true,  category: 'Phone', note: 'Flexible due date' },
  { id: 'bill-7',  name: 'Rent',                  amount: 1433.03, dueDay: 1,   frequency: 'monthly',    isActive: true,  category: 'Housing', note: '1st-3rd' },
  { id: 'bill-8',  name: 'Apt Insurance',         amount: 19.17,   dueDay: 2,   frequency: 'monthly',    isActive: true,  category: 'Insurance' },
  { id: 'bill-9',  name: 'Amazon Kindle',         amount: 12.98,   dueDay: 21,  frequency: 'monthly',    isActive: true,  category: 'Entertainment' },
  { id: 'bill-10', name: 'Spotify',               amount: 14.06,   dueDay: 21,  frequency: 'monthly',    isActive: true,  category: 'Entertainment' },
  { id: 'bill-11', name: 'Capital One CR',        amount: 61.00,   dueDay: 17,  frequency: 'monthly',    isActive: true,  category: 'Debt' },
  { id: 'bill-12', name: 'Chase CR',              amount: 40.00,   dueDay: 6,   frequency: 'monthly',    isActive: true,  category: 'Debt' },
  { id: 'bill-13', name: 'Car Payment',           amount: 530.00,  dueDay: 15,  frequency: 'monthly',    isActive: true,  category: 'Transport' },
  { id: 'bill-14', name: 'Marcus Medicine',       amount: 50.00,   dueDay: 23,  frequency: 'monthly',    isActive: true,  category: 'Health' },
  { id: 'bill-15', name: 'Marcus Food',           amount: 50.87,   dueDay: 16,  frequency: 'bimonthly',  isActive: true,  category: 'Food', note: 'Every 2 months' },
  { id: 'bill-16', name: 'Oliver Food',           amount: 3.00,    dueDay: null, frequency: 'biweekly',  isActive: true,  category: 'Food', note: 'Bi-weekly' },
  { id: 'bill-17', name: 'College',               amount: 135.00,  dueDay: 28,  frequency: 'monthly',    isActive: true,  category: 'Education', note: 'Before EOM' },
  { id: 'bill-18', name: 'IONOS',                 amount: 1.00,    dueDay: 21,  frequency: 'monthly',    isActive: true,  category: 'Business' },
  { id: 'bill-19', name: 'Uber Subscription',     amount: 9.99,    dueDay: 21,  frequency: 'monthly',    isActive: true,  category: 'Transport' },
]

const defaultDebts = [
  { id: 'debt-1', name: 'Chase Credit Card',       totalBalance: 570.58,   minimumPayment: 40,  apr: 0,     paymentHistory: [] },
  { id: 'debt-2', name: 'Capital One Credit Card', totalBalance: 2102.40,  minimumPayment: 61,  apr: 24.49, paymentHistory: [] },
  { id: 'debt-3', name: 'College',                 totalBalance: 2695.12,  minimumPayment: 135, apr: 0,     paymentHistory: [] },
]

const defaultAfterPayItems = [
  {
    id: 'afterpay-1',
    name: 'Walmart Gift Card',
    totalAmount: 150,
    payments: [
      { id: 'ap-p1', number: 1, amount: 37.50, dueDate: '2026-05-03', status: 'paid',     paidDate: '2026-05-03' },
      { id: 'ap-p2', number: 2, amount: 37.50, dueDate: '2026-05-17', status: 'paid',     paidDate: '2026-05-17' },
      { id: 'ap-p3', number: 3, amount: 37.50, dueDate: '2026-05-31', status: 'upcoming', paidDate: null },
      { id: 'ap-p4', number: 4, amount: 37.50, dueDate: '2026-06-14', status: 'upcoming', paidDate: null, label: 'FINAL' },
    ],
  },
]

const defaultTiltLogs = [
  {
    id: 'tilt-1',
    amountUsed: 400,
    creditLimit: 400,
    instantDelivery: true,
    instantFee: 12,
    repaymentDate: '2026-05-29',
    repaymentOption: 'A',
    status: 'active',
    createdAt: '2026-05-22',
    note: 'Option A repayment',
  },
]

const defaultEarnInLogs = [
  {
    id: 'earnin-1',
    cycleStartDate: getLatestFriday(),
    fri_taken: false,
    sat_taken: false,
    sun_taken: false,
    mon_taken: false,
    amounts: { fri: 155.99, sat: 155.99, sun: 155.99, mon: 53.99 },
    repaymentAmount: 521.96,
    status: 'active',
  },
]

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const useStore = create(
  persist(
    (set, get) => ({
      // ─── THEME ────────────────────────────────────────────────
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        localStorage.setItem('theme', next)
      },

      // ─── LOADING / SYNC ───────────────────────────────────────
      isLoading: false,
      syncing: false,
      setLoading: (val) => set({ isLoading: val }),
      setSyncing: (val) => set({ syncing: val }),

      // ─── TOASTS ───────────────────────────────────────────────
      toasts: [],
      addToast: (message, type = 'success') => {
        const id = generateId()
        set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
        setTimeout(() => get().removeToast(id), 3500)
      },
      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),

      // ─── ACCOUNTS ─────────────────────────────────────────────
      accounts: {
        chaseDebit: 0,
        capitalOneDebit: 0,
        cashApp: 0,
        paypal: 0,
      },
      setAccount: (account, value) => {
        set((state) => ({
          accounts: { ...state.accounts, [account]: Number(value) }
        }))
      },
      get totalBalance() {
        const a = get().accounts
        return a.chaseDebit + a.capitalOneDebit + a.cashApp + a.paypal
      },

      // ─── TRANSACTIONS ─────────────────────────────────────────
      transactions: [],
      addTransaction: (transaction) => {
        const newTx = { ...transaction, id: generateId(), createdAt: new Date().toISOString() }
        set((state) => ({ transactions: [newTx, ...state.transactions] }))
        get().addToast('Transaction added', 'success')
        return newTx
      },
      updateTransaction: (id, updates) => {
        set((state) => ({
          transactions: state.transactions.map(t => t.id === id ? { ...t, ...updates } : t)
        }))
        get().addToast('Transaction updated', 'success')
      },
      deleteTransaction: (id) => {
        set((state) => ({ transactions: state.transactions.filter(t => t.id !== id) }))
        get().addToast('Transaction deleted', 'success')
      },

      // ─── BILLS ────────────────────────────────────────────────
      bills: defaultBills,
      addBill: (bill) => {
        const newBill = { ...bill, id: generateId() }
        set((state) => ({ bills: [...state.bills, newBill] }))
        get().addToast('Bill added', 'success')
      },
      updateBill: (id, updates) => {
        set((state) => ({
          bills: state.bills.map(b => b.id === id ? { ...b, ...updates } : b)
        }))
        get().addToast('Bill updated', 'success')
      },
      deleteBill: (id) => {
        set((state) => ({ bills: state.bills.filter(b => b.id !== id) }))
        get().addToast('Bill deleted', 'success')
      },

      // ─── PAYCHECKS ────────────────────────────────────────────
      paychecks: generatePaychecks(),
      addPaycheck: (paycheck) => {
        const newP = { ...paycheck, id: generateId() }
        set((state) => ({ paychecks: [newP, ...state.paychecks] }))
        get().addToast('Paycheck added', 'success')
      },
      updatePaycheck: (id, updates) => {
        set((state) => ({
          paychecks: state.paychecks.map(p => p.id === id ? { ...p, ...updates } : p)
        }))
      },
      deletePaycheck: (id) => {
        set((state) => ({ paychecks: state.paychecks.filter(p => p.id !== id) }))
      },
      markPaycheckReceived: (id) => {
        set((state) => ({
          paychecks: state.paychecks.map(p => p.id === id ? { ...p, received: true } : p)
        }))
        get().addToast('Paycheck marked as received', 'success')
      },

      // ─── TILT LOGS ────────────────────────────────────────────
      tiltLogs: defaultTiltLogs,
      addTiltLog: (log) => {
        const newLog = { ...log, id: generateId(), createdAt: new Date().toISOString() }
        set((state) => ({ tiltLogs: [newLog, ...state.tiltLogs] }))
        get().addToast('TILT advance logged', 'success')
      },
      updateTiltLog: (id, updates) => {
        set((state) => ({
          tiltLogs: state.tiltLogs.map(l => l.id === id ? { ...l, ...updates } : l)
        }))
      },
      deleteTiltLog: (id) => {
        set((state) => ({ tiltLogs: state.tiltLogs.filter(l => l.id !== id) }))
      },
      markTiltRepaid: (id) => {
        set((state) => ({
          tiltLogs: state.tiltLogs.map(l => l.id === id ? { ...l, status: 'repaid', repaidAt: new Date().toISOString() } : l)
        }))
        get().addToast('TILT advance marked as repaid', 'success')
      },

      // ─── EARN IN LOGS ─────────────────────────────────────────
      earnInLogs: defaultEarnInLogs,
      addEarnInLog: (log) => {
        const newLog = { ...log, id: generateId(), createdAt: new Date().toISOString() }
        set((state) => ({ earnInLogs: [newLog, ...state.earnInLogs] }))
        get().addToast('Earn In cycle added', 'success')
      },
      updateEarnInLog: (id, updates) => {
        set((state) => ({
          earnInLogs: state.earnInLogs.map(l => l.id === id ? { ...l, ...updates } : l)
        }))
      },
      deleteEarnInLog: (id) => {
        set((state) => ({ earnInLogs: state.earnInLogs.filter(l => l.id !== id) }))
      },
      markStepTaken: (logId, step) => {
        // step: 'fri' | 'sat' | 'sun' | 'mon'
        set((state) => ({
          earnInLogs: state.earnInLogs.map(l =>
            l.id === logId ? { ...l, [`${step}_taken`]: true } : l
          )
        }))
        get().addToast(`Earn In ${step.charAt(0).toUpperCase() + step.slice(1)} step marked`, 'success')
      },

      // ─── AFTERPAY ─────────────────────────────────────────────
      afterpayItems: defaultAfterPayItems,
      addAfterpayItem: (item) => {
        const newItem = { ...item, id: generateId() }
        set((state) => ({ afterpayItems: [...state.afterpayItems, newItem] }))
        get().addToast('Afterpay item added', 'success')
      },
      updateAfterpayItem: (id, updates) => {
        set((state) => ({
          afterpayItems: state.afterpayItems.map(i => i.id === id ? { ...i, ...updates } : i)
        }))
      },
      deleteAfterpayItem: (id) => {
        set((state) => ({ afterpayItems: state.afterpayItems.filter(i => i.id !== id) }))
      },
      markAfterpayPayment: (itemId, paymentId) => {
        set((state) => ({
          afterpayItems: state.afterpayItems.map(item => {
            if (item.id !== itemId) return item
            return {
              ...item,
              payments: item.payments.map(p =>
                p.id === paymentId
                  ? { ...p, status: 'paid', paidDate: format(new Date(), 'yyyy-MM-dd') }
                  : p
              )
            }
          })
        }))
        get().addToast('Afterpay payment marked as paid', 'success')
      },
      unmarkAfterpayPayment: (itemId, paymentId) => {
        set((state) => ({
          afterpayItems: state.afterpayItems.map(item => {
            if (item.id !== itemId) return item
            const payments = item.payments
            const idx = payments.findIndex(p => p.id === paymentId)
            const isLast = idx === payments.length - 1
            return {
              ...item,
              payments: payments.map((p, i) =>
                p.id === paymentId
                  ? { ...p, status: isLast ? 'final' : 'upcoming', paidDate: null }
                  : p
              )
            }
          })
        }))
        get().addToast('Afterpay payment unmarked', 'success')
      },

      // ─── DEBTS ────────────────────────────────────────────────
      debts: defaultDebts,
      updateDebt: (id, updates) => {
        set((state) => ({
          debts: state.debts.map(d => d.id === id ? { ...d, ...updates } : d)
        }))
        get().addToast('Debt updated', 'success')
      },
      addDebt: (debt) => {
        const newDebt = { ...debt, id: generateId(), paymentHistory: [] }
        set((state) => ({ debts: [...state.debts, newDebt] }))
        get().addToast('Debt added', 'success')
      },
      deleteDebt: (id) => {
        set((state) => ({ debts: state.debts.filter(d => d.id !== id) }))
      },
      logDebtPayment: (debtId, payment) => {
        const newPayment = { ...payment, id: generateId(), date: format(new Date(), 'yyyy-MM-dd') }
        set((state) => ({
          debts: state.debts.map(d => {
            if (d.id !== debtId) return d
            const newBalance = Math.max(0, d.totalBalance - payment.amount)
            return {
              ...d,
              totalBalance: newBalance,
              paymentHistory: [newPayment, ...d.paymentHistory]
            }
          })
        }))
        get().addToast('Payment logged', 'success')
      },

      // ─── SAVINGS GOALS ────────────────────────────────────────
      savingsGoals: [],
      addSavingsGoal: (goal) => {
        const newGoal = { ...goal, id: generateId(), currentAmount: 0, createdAt: new Date().toISOString() }
        set((state) => ({ savingsGoals: [...state.savingsGoals, newGoal] }))
        get().addToast('Savings goal created', 'success')
      },
      updateSavingsGoal: (id, updates) => {
        set((state) => ({
          savingsGoals: state.savingsGoals.map(g => g.id === id ? { ...g, ...updates } : g)
        }))
        get().addToast('Goal updated', 'success')
      },
      deleteSavingsGoal: (id) => {
        set((state) => ({ savingsGoals: state.savingsGoals.filter(g => g.id !== id) }))
      },
      contributeToGoal: (id, amount) => {
        set((state) => ({
          savingsGoals: state.savingsGoals.map(g =>
            g.id === id ? { ...g, currentAmount: g.currentAmount + Number(amount) } : g
          )
        }))
        get().addToast('Contribution added', 'success')
      },

      // ─── SETTINGS ─────────────────────────────────────────────
      settings: {
        earnIn: {
          repaymentAmount: 521.96,
          fri: 155.99,
          sat: 155.99,
          sun: 155.99,
          mon: 53.99,
        },
        tilt: {
          maxCredit: 400,
          instantFee: 12,
        },
        paycheck: {
          defaultAmount: 980,
          frequency: 'weekly',
        },
      },
      updateSettings: (section, updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [section]: { ...state.settings[section], ...updates }
          }
        }))
        get().addToast('Settings saved', 'success')
      },

      // ─── SUPABASE SYNC (optimistic) ───────────────────────────
      syncToSupabase: async (table, data, operation = 'upsert') => {
        set({ syncing: true })
        try {
          if (operation === 'upsert') {
            const { error } = await supabase.from(table).upsert(data)
            if (error) throw error
          } else if (operation === 'delete') {
            const { error } = await supabase.from(table).delete().eq('id', data.id)
            if (error) throw error
          }
        } catch (err) {
          console.error(`Supabase sync error (${table}):`, err)
          // Note: In a full implementation, we'd revert here
        } finally {
          set({ syncing: false })
        }
      },
    }),
    {
      name: 'edwin-financial-hub',
      partialize: (state) => ({
        theme: state.theme,
        accounts: state.accounts,
        transactions: state.transactions,
        bills: state.bills,
        paychecks: state.paychecks,
        tiltLogs: state.tiltLogs,
        earnInLogs: state.earnInLogs,
        afterpayItems: state.afterpayItems,
        debts: state.debts,
        savingsGoals: state.savingsGoals,
        settings: state.settings,
      }),
    }
  )
)
