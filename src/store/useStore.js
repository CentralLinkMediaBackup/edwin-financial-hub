import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addWeeks, format, parseISO, nextFriday, isFriday } from 'date-fns'
import { supabase } from '../lib/supabase'

// Generate paychecks: every Friday starting May 22 2026, next 52 weeks
function generatePaychecks() {
  const paychecks = []
  const startDate = new Date(2026, 4, 22)
  for (let i = 0; i < 52; i++) {
    const date = addWeeks(startDate, i)
    paychecks.push({
      id: `paycheck-${i + 1}`,
      date: format(date, 'yyyy-MM-dd'),
      amount: 980,
      source: 'Prosperity Fire Protection, LLC',
      account: 'chaseDebit',
      note: 'Weekly paycheck',
      received: false,
    })
  }
  return paychecks
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Static defaults ──────────────────────────────────────────────────────────

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

// TILT — the $400 advance was repaid May 29
const defaultTiltLogs = [
  {
    id: 'tilt-1',
    amountUsed: 400,
    creditLimit: 400,
    instantDelivery: true,
    instantFee: 12,
    repaymentDate: '2026-05-29',
    repaymentOption: 'A',
    status: 'repaid',
    repaidAt: '2026-05-29',
    createdAt: '2026-05-22',
    note: 'Option A repayment',
  },
]

// EarnIn — May 29 cycle complete/repaid, next cycle June 5
const defaultEarnInLogs = [
  {
    id: 'earnin-1',
    cycleStartDate: '2026-05-29',
    fri_taken: true,
    sat_taken: true,
    sun_taken: true,
    mon_taken: true,
    amounts: { fri: 155.99, sat: 155.99, sun: 105.99, mon: 53.99 },
    repaymentAmount: 521.96,
    status: 'repaid',
  },
  {
    id: 'earnin-2',
    cycleStartDate: '2026-06-05',
    fri_taken: false,
    sat_taken: false,
    sun_taken: false,
    mon_taken: false,
    amounts: { fri: 155.99, sat: 155.99, sun: 155.99, mon: 53.99 },
    repaymentAmount: 521.96,
    status: 'active',
  },
]

// All May–Jun 1 transactions from Chase debit card
const v3Transactions = [
  // ── May 1 ──────────────────────────────────────────────────────────────────
  { id: 'tx-m1-1',  date: '2026-05-01', type: 'out', amount: 886.89, category: 'Housing',       note: 'Rent (Cash App transfer)',               account: 'chaseDebit', createdAt: '2026-05-01T08:00:00.000Z' },
  { id: 'tx-m1-2',  date: '2026-05-01', type: 'out', amount: 350.00, category: 'Housing',       note: 'Rent portion (Cash App)',                account: 'chaseDebit', createdAt: '2026-05-01T08:01:00.000Z' },
  { id: 'tx-m1-3',  date: '2026-05-01', type: 'out', amount: 202.45, category: 'Housing',       note: 'Rent portion (Cash App)',                account: 'chaseDebit', createdAt: '2026-05-01T08:02:00.000Z' },
  { id: 'tx-m1-4',  date: '2026-05-01', type: 'out', amount: 19.17,  category: 'Insurance',     note: 'Apt Insurance',                         account: 'chaseDebit', createdAt: '2026-05-01T08:03:00.000Z' },
  // ── May 3 ──────────────────────────────────────────────────────────────────
  { id: 'tx-m3-1',  date: '2026-05-03', type: 'out', amount: 37.50,  category: 'Shopping',      note: 'Afterpay',                              account: 'chaseDebit', createdAt: '2026-05-03T08:00:00.000Z' },
  { id: 'tx-m3-2',  date: '2026-05-03', type: 'out', amount: 104.44, category: 'Other',         note: 'Cash App',                              account: 'chaseDebit', createdAt: '2026-05-03T08:01:00.000Z' },
  { id: 'tx-m3-3',  date: '2026-05-03', type: 'out', amount: 250.00, category: 'Other',         note: 'Cash App',                              account: 'chaseDebit', createdAt: '2026-05-03T08:02:00.000Z' },
  // ── May 4 ──────────────────────────────────────────────────────────────────
  { id: 'tx-m4-1',  date: '2026-05-04', type: 'out', amount: 6.00,   category: 'Other',         note: 'Cash App',                              account: 'chaseDebit', createdAt: '2026-05-04T08:00:00.000Z' },
  // ── May 8 ──────────────────────────────────────────────────────────────────
  { id: 'tx-m8-1',  date: '2026-05-08', type: 'out', amount: 40.00,  category: 'Debt',          note: 'Chase CR payment',                      account: 'chaseDebit', createdAt: '2026-05-08T08:00:00.000Z' },
  { id: 'tx-m8-2',  date: '2026-05-08', type: 'out', amount: 1.07,   category: 'Shopping',      note: 'Amazon Prime',                          account: 'chaseDebit', createdAt: '2026-05-08T08:01:00.000Z' },
  // ── May 9 ──────────────────────────────────────────────────────────────────
  { id: 'tx-m9-1',  date: '2026-05-09', type: 'out', amount: 37.50,  category: 'Shopping',      note: 'Afterpay',                              account: 'chaseDebit', createdAt: '2026-05-09T08:00:00.000Z' },
  { id: 'tx-m9-2',  date: '2026-05-09', type: 'out', amount: 133.72, category: 'Food',          note: 'Walmart groceries',                     account: 'chaseDebit', createdAt: '2026-05-09T08:01:00.000Z' },
  { id: 'tx-m9-3',  date: '2026-05-09', type: 'out', amount: 21.62,  category: 'Shopping',      note: 'Walmart',                               account: 'chaseDebit', createdAt: '2026-05-09T08:02:00.000Z' },
  { id: 'tx-m9-4',  date: '2026-05-09', type: 'out', amount: 8.06,   category: 'Dining',        note: 'Grubhub',                               account: 'chaseDebit', createdAt: '2026-05-09T08:03:00.000Z' },
  // ── May 10 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m10-1', date: '2026-05-10', type: 'out', amount: 49.88,  category: 'Food',          note: 'ALDI groceries',                        account: 'chaseDebit', createdAt: '2026-05-10T08:00:00.000Z' },
  { id: 'tx-m10-2', date: '2026-05-10', type: 'out', amount: 28.25,  category: 'Dining',        note: 'In-N-Out',                              account: 'chaseDebit', createdAt: '2026-05-10T08:01:00.000Z' },
  // ── May 11 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m11-1', date: '2026-05-11', type: 'out', amount: 39.60,  category: 'Shopping',      note: 'Amazon purchases',                      account: 'chaseDebit', createdAt: '2026-05-11T08:00:00.000Z' },
  { id: 'tx-m11-2', date: '2026-05-11', type: 'out', amount: 9.73,   category: 'Shopping',      note: 'Amazon',                                account: 'chaseDebit', createdAt: '2026-05-11T08:01:00.000Z' },
  { id: 'tx-m11-3', date: '2026-05-11', type: 'out', amount: 22.73,  category: 'Shopping',      note: 'Dollar Tree',                           account: 'chaseDebit', createdAt: '2026-05-11T08:02:00.000Z' },
  // ── May 13 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m13-1', date: '2026-05-13', type: 'out', amount: 13.72,  category: 'Dining',        note: "McDonald's",                            account: 'chaseDebit', createdAt: '2026-05-13T08:00:00.000Z' },
  { id: 'tx-m13-2', date: '2026-05-13', type: 'out', amount: 25.01,  category: 'Other',         note: '7-Eleven',                              account: 'chaseDebit', createdAt: '2026-05-13T08:01:00.000Z' },
  // ── May 14 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m14-1', date: '2026-05-14', type: 'out', amount: 43.10,  category: 'Pet/Marcus',    note: 'Chewy (Marcus)',                        account: 'chaseDebit', createdAt: '2026-05-14T08:00:00.000Z' },
  // ── May 15 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m15-1', date: '2026-05-15', type: 'out', amount: 24.22,  category: 'Dining',        note: 'Sonic',                                 account: 'chaseDebit', createdAt: '2026-05-15T08:00:00.000Z' },
  { id: 'tx-m15-2', date: '2026-05-15', type: 'out', amount: 360.50, category: 'Other',         note: 'Tilt repayment',                        account: 'chaseDebit', createdAt: '2026-05-15T08:01:00.000Z' },
  { id: 'tx-m15-3', date: '2026-05-15', type: 'out', amount: 529.94, category: 'Transport',     note: 'Cash App (car payment)',                account: 'chaseDebit', createdAt: '2026-05-15T08:02:00.000Z' },
  // ── May 16 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m16-1', date: '2026-05-16', type: 'out', amount: 29.22,  category: 'Shopping',      note: 'Barnes & Noble',                        account: 'chaseDebit', createdAt: '2026-05-16T08:00:00.000Z' },
  { id: 'tx-m16-2', date: '2026-05-16', type: 'out', amount: 97.41,  category: 'Shopping',      note: 'Foot Locker (shoes)',                   account: 'chaseDebit', createdAt: '2026-05-16T08:01:00.000Z' },
  { id: 'tx-m16-3', date: '2026-05-16', type: 'out', amount: 50.87,  category: 'Pet/Marcus',    note: 'PetSmart (Marcus food)',                account: 'chaseDebit', createdAt: '2026-05-16T08:02:00.000Z' },
  // ── May 17 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m17-1', date: '2026-05-17', type: 'out', amount: 37.50,  category: 'Shopping',      note: 'Afterpay',                              account: 'chaseDebit', createdAt: '2026-05-17T08:00:00.000Z' },
  // ── May 18 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m18-1', date: '2026-05-18', type: 'out', amount: 3.99,   category: 'Transport',     note: 'Gas',                                   account: 'chaseDebit', createdAt: '2026-05-18T08:00:00.000Z' },
  { id: 'tx-m18-2', date: '2026-05-18', type: 'out', amount: 61.00,  category: 'Debt',          note: 'Capital One payment',                   account: 'chaseDebit', createdAt: '2026-05-18T08:01:00.000Z' },
  { id: 'tx-m18-3', date: '2026-05-18', type: 'out', amount: 55.00,  category: 'Phone',         note: 'iPhone Data (Zelle to Father)',         account: 'chaseDebit', createdAt: '2026-05-18T08:02:00.000Z' },
  // ── May 19 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m19-1', date: '2026-05-19', type: 'out', amount: 2.22,   category: 'Phone',         note: 'Spectrum Mobile',                       account: 'chaseDebit', createdAt: '2026-05-19T08:00:00.000Z' },
  // ── May 21 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m21-1', date: '2026-05-21', type: 'out', amount: 14.06,  category: 'Entertainment', note: 'Spotify',                               account: 'chaseDebit', createdAt: '2026-05-21T08:00:00.000Z' },
  { id: 'tx-m21-2', date: '2026-05-21', type: 'out', amount: 12.98,  category: 'Entertainment', note: 'Kindle',                                account: 'chaseDebit', createdAt: '2026-05-21T08:01:00.000Z' },
  { id: 'tx-m21-3', date: '2026-05-21', type: 'out', amount: 9.99,   category: 'Transport',     note: 'Uber Subscription',                     account: 'chaseDebit', createdAt: '2026-05-21T08:02:00.000Z' },
  // ── May 22 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m22-1', date: '2026-05-22', type: 'out', amount: 37.50,  category: 'Shopping',      note: 'Afterpay',                              account: 'chaseDebit', createdAt: '2026-05-22T08:00:00.000Z' },
  { id: 'tx-m22-2', date: '2026-05-22', type: 'out', amount: 1.00,   category: 'Business',      note: 'IONOS',                                 account: 'chaseDebit', createdAt: '2026-05-22T08:01:00.000Z' },
  { id: 'tx-m22-3', date: '2026-05-22', type: 'in',  amount: 150.00, category: 'Income',        note: 'Earn In 1',                             account: 'chaseDebit', createdAt: '2026-05-22T08:02:00.000Z' },
  // ── May 23 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m23-1', date: '2026-05-23', type: 'out', amount: 9.73,   category: 'Entertainment', note: 'Netflix',                               account: 'chaseDebit', createdAt: '2026-05-23T08:00:00.000Z' },
  { id: 'tx-m23-2', date: '2026-05-23', type: 'out', amount: 23.00,  category: 'Dining',        note: 'Sonic',                                 account: 'chaseDebit', createdAt: '2026-05-23T08:01:00.000Z' },
  { id: 'tx-m23-3', date: '2026-05-23', type: 'out', amount: 4.54,   category: 'Dining',        note: 'Sonic',                                 account: 'chaseDebit', createdAt: '2026-05-23T08:02:00.000Z' },
  { id: 'tx-m23-4', date: '2026-05-23', type: 'out', amount: 25.01,  category: 'Transport',     note: '7-Eleven (gas)',                        account: 'chaseDebit', createdAt: '2026-05-23T08:03:00.000Z' },
  { id: 'tx-m23-5', date: '2026-05-23', type: 'out', amount: 25.98,  category: 'Dining',        note: "Domino's",                              account: 'chaseDebit', createdAt: '2026-05-23T08:04:00.000Z' },
  { id: 'tx-m23-6', date: '2026-05-23', type: 'out', amount: 53.48,  category: 'Shopping',      note: 'Amazon',                                account: 'chaseDebit', createdAt: '2026-05-23T08:05:00.000Z' },
  // ── May 24 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m24-1', date: '2026-05-24', type: 'in',  amount: 150.00, category: 'Income',        note: 'Earn In 3',                             account: 'chaseDebit', createdAt: '2026-05-24T08:00:00.000Z' },
  { id: 'tx-m24-2', date: '2026-05-24', type: 'out', amount: 2.96,   category: 'Shopping',      note: 'Amazon',                                account: 'chaseDebit', createdAt: '2026-05-24T08:01:00.000Z' },
  { id: 'tx-m24-3', date: '2026-05-24', type: 'out', amount: 4.99,   category: 'Shopping',      note: 'Amazon',                                account: 'chaseDebit', createdAt: '2026-05-24T08:02:00.000Z' },
  { id: 'tx-m24-4', date: '2026-05-24', type: 'out', amount: 5.94,   category: 'Shopping',      note: 'Amazon',                                account: 'chaseDebit', createdAt: '2026-05-24T08:03:00.000Z' },
  { id: 'tx-m24-5', date: '2026-05-24', type: 'out', amount: 11.03,  category: 'Shopping',      note: 'Amazon',                                account: 'chaseDebit', createdAt: '2026-05-24T08:04:00.000Z' },
  { id: 'tx-m24-6', date: '2026-05-24', type: 'out', amount: 28.56,  category: 'Shopping',      note: 'Amazon',                                account: 'chaseDebit', createdAt: '2026-05-24T08:05:00.000Z' },
  // ── May 25 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m25-1', date: '2026-05-25', type: 'out', amount: 30.88,  category: 'Food',          note: 'ALDI groceries',                        account: 'chaseDebit', createdAt: '2026-05-25T08:00:00.000Z' },
  { id: 'tx-m25-2', date: '2026-05-25', type: 'out', amount: 8.93,   category: 'Shopping',      note: 'Dollar Tree',                           account: 'chaseDebit', createdAt: '2026-05-25T08:01:00.000Z' },
  { id: 'tx-m25-3', date: '2026-05-25', type: 'out', amount: 16.18,  category: 'Entertainment', note: 'Audible',                               account: 'chaseDebit', createdAt: '2026-05-25T08:02:00.000Z' },
  { id: 'tx-m25-4', date: '2026-05-25', type: 'in',  amount: 50.00,  category: 'Income',        note: 'Earn In 4',                             account: 'chaseDebit', createdAt: '2026-05-25T08:03:00.000Z' },
  // ── May 26 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m26-1', date: '2026-05-26', type: 'out', amount: 50.26,  category: 'Utilities',     note: 'Spectrum Internet',                     account: 'chaseDebit', createdAt: '2026-05-26T08:00:00.000Z' },
  { id: 'tx-m26-2', date: '2026-05-26', type: 'out', amount: 7.77,   category: 'Transport',     note: 'Gas',                                   account: 'chaseDebit', createdAt: '2026-05-26T08:01:00.000Z' },
  { id: 'tx-m26-3', date: '2026-05-26', type: 'out', amount: 9.18,   category: 'Dining',        note: "McDonald's",                            account: 'chaseDebit', createdAt: '2026-05-26T08:02:00.000Z' },
  // ── May 27 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m27-1', date: '2026-05-27', type: 'out', amount: 8.31,   category: 'Transport',     note: 'Gas',                                   account: 'chaseDebit', createdAt: '2026-05-27T08:00:00.000Z' },
  { id: 'tx-m27-2', date: '2026-05-27', type: 'out', amount: 30.00,  category: 'Phone',         note: 'Zelle to Father (iPhone Data)',         account: 'chaseDebit', createdAt: '2026-05-27T08:01:00.000Z' },
  // ── May 28 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m28-1', date: '2026-05-28', type: 'out', amount: 110.00, category: 'Utilities',     note: 'TXU Electric',                          account: 'chaseDebit', createdAt: '2026-05-28T08:00:00.000Z' },
  { id: 'tx-m28-2', date: '2026-05-28', type: 'out', amount: 140.71, category: 'Shopping',      note: 'Amazon',                                account: 'chaseDebit', createdAt: '2026-05-28T08:01:00.000Z' },
  { id: 'tx-m28-3', date: '2026-05-28', type: 'out', amount: 12.98,  category: 'Entertainment', note: 'Kindle',                                account: 'chaseDebit', createdAt: '2026-05-28T08:02:00.000Z' },
  { id: 'tx-m28-4', date: '2026-05-28', type: 'out', amount: 16.29,  category: 'Other',         note: 'Zelle to Father',                       account: 'chaseDebit', createdAt: '2026-05-28T08:03:00.000Z' },
  { id: 'tx-m28-5', date: '2026-05-28', type: 'out', amount: 24.33,  category: 'Dining',        note: 'Sonic',                                 account: 'chaseDebit', createdAt: '2026-05-28T08:04:00.000Z' },
  // ── May 29 ─────────────────────────────────────────────────────────────────
  { id: 'tx-m29-1', date: '2026-05-29', type: 'in',  amount: 849.18, category: 'Income',        note: 'Paycheck (Prosperity Fire)',             account: 'chaseDebit', createdAt: '2026-05-29T08:00:00.000Z' },
  { id: 'tx-m29-2', date: '2026-05-29', type: 'out', amount: 7.19,   category: 'Shopping',      note: 'Amazon',                                account: 'chaseDebit', createdAt: '2026-05-29T08:01:00.000Z' },
  { id: 'tx-m29-3', date: '2026-05-29', type: 'out', amount: 18.79,  category: 'Shopping',      note: 'Amazon',                                account: 'chaseDebit', createdAt: '2026-05-29T08:02:00.000Z' },
  { id: 'tx-m29-4', date: '2026-05-29', type: 'in',  amount: 150.00, category: 'Income',        note: 'Earn In 1',                             account: 'chaseDebit', createdAt: '2026-05-29T08:03:00.000Z' },
  { id: 'tx-m29-5', date: '2026-05-29', type: 'out', amount: 155.99, category: 'Other',         note: 'Earn In repayment',                     account: 'chaseDebit', createdAt: '2026-05-29T08:04:00.000Z' },
  { id: 'tx-m29-6', date: '2026-05-29', type: 'out', amount: 155.99, category: 'Other',         note: 'Earn In repayment',                     account: 'chaseDebit', createdAt: '2026-05-29T08:05:00.000Z' },
  { id: 'tx-m29-7', date: '2026-05-29', type: 'out', amount: 155.99, category: 'Other',         note: 'Earn In repayment',                     account: 'chaseDebit', createdAt: '2026-05-29T08:06:00.000Z' },
  { id: 'tx-m29-8', date: '2026-05-29', type: 'out', amount: 53.99,  category: 'Other',         note: 'Earn In repayment',                     account: 'chaseDebit', createdAt: '2026-05-29T08:07:00.000Z' },
  // ── May 31 — Grapevine Mills mall trip ─────────────────────────────────────
  { id: 'tx-m31-1',  date: '2026-05-31', type: 'out', amount: 13.48,  category: 'Dining',       note: 'Feng Cha (Grapevine Mills)',             account: 'chaseDebit', createdAt: '2026-05-31T08:00:00.000Z' },
  { id: 'tx-m31-2',  date: '2026-05-31', type: 'out', amount: 54.12,  category: 'Shopping',     note: 'Custom Engraving (Grapevine Mills)',     account: 'chaseDebit', createdAt: '2026-05-31T08:01:00.000Z' },
  { id: 'tx-m31-3',  date: '2026-05-31', type: 'out', amount: 47.63,  category: 'Shopping',     note: 'Primark (Grapevine Mills)',              account: 'chaseDebit', createdAt: '2026-05-31T08:02:00.000Z' },
  { id: 'tx-m31-4',  date: '2026-05-31', type: 'out', amount: 54.10,  category: 'Shopping',     note: 'Old Navy (Grapevine Mills)',             account: 'chaseDebit', createdAt: '2026-05-31T08:03:00.000Z' },
  { id: 'tx-m31-5',  date: '2026-05-31', type: 'out', amount: 57.35,  category: 'Shopping',     note: 'Kawaii Kollections (Grapevine Mills)',   account: 'chaseDebit', createdAt: '2026-05-31T08:04:00.000Z' },
  { id: 'tx-m31-6',  date: '2026-05-31', type: 'out', amount: 30.31,  category: 'Shopping',     note: 'Five Below (Grapevine Mills)',           account: 'chaseDebit', createdAt: '2026-05-31T08:05:00.000Z' },
  { id: 'tx-m31-7',  date: '2026-05-31', type: 'out', amount: 12.57,  category: 'Shopping',     note: 'Hot Topic (Grapevine Mills)',            account: 'chaseDebit', createdAt: '2026-05-31T08:06:00.000Z' },
  { id: 'tx-m31-8',  date: '2026-05-31', type: 'out', amount: 36.95,  category: 'Dining',       note: 'Basil Thai (Grapevine Mills)',           account: 'chaseDebit', createdAt: '2026-05-31T08:07:00.000Z' },
  { id: 'tx-m31-9',  date: '2026-05-31', type: 'out', amount: 35.70,  category: 'Pet/Marcus',   note: 'PetSmart (Grapevine Mills)',             account: 'chaseDebit', createdAt: '2026-05-31T08:08:00.000Z' },
  { id: 'tx-m31-10', date: '2026-05-31', type: 'out', amount: 18.40,  category: 'Pet/Marcus',   note: 'PetSmart (Grapevine Mills)',             account: 'chaseDebit', createdAt: '2026-05-31T08:09:00.000Z' },
  { id: 'tx-m31-11', date: '2026-05-31', type: 'out', amount: 25.95,  category: 'Dining',       note: "Domino's (Grapevine Mills)",             account: 'chaseDebit', createdAt: '2026-05-31T08:10:00.000Z' },
  { id: 'tx-m31-12', date: '2026-05-31', type: 'out', amount: 12.10,  category: 'Food',         note: 'Lone Star Markets (Grapevine Mills)',    account: 'chaseDebit', createdAt: '2026-05-31T08:11:00.000Z' },
  // ── June 1 ─────────────────────────────────────────────────────────────────
  { id: 'tx-j1-1',  date: '2026-06-01', type: 'in',  amount: 237.29, category: 'Income',        note: 'Paycheck savings portion transferred back', account: 'chaseDebit', createdAt: '2026-06-01T08:00:00.000Z' },
  { id: 'tx-j1-2',  date: '2026-06-01', type: 'out', amount: 37.50,  category: 'Shopping',      note: 'Afterpay payment (Walmart Gift Card 3/4)',   account: 'chaseDebit', createdAt: '2026-06-01T08:01:00.000Z' },
]

// May paychecks to add (May 1, 8, 15 are before generated range; May 22 & 29 update generated entries)
const v3NewPaychecks = [
  { id: 'paycheck-may1',  date: '2026-05-01', amount: 994.23,  source: 'Prosperity Fire Protection, LLC', account: 'chaseDebit', note: 'Weekly paycheck', received: true },
  { id: 'paycheck-may8',  date: '2026-05-08', amount: 983.95,  source: 'Prosperity Fire Protection, LLC', account: 'chaseDebit', note: 'Weekly paycheck', received: true },
  { id: 'paycheck-may15', date: '2026-05-15', amount: 984.81,  source: 'Prosperity Fire Protection, LLC', account: 'chaseDebit', note: 'Weekly paycheck', received: true },
]

// ─── Store ────────────────────────────────────────────────────────────────────

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
        chaseDebit: 1960.27,
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

      // ─── PROJECTED BALANCE OVERRIDE ───────────────────────────
      projectedBalance: 2469.45,
      setProjectedBalance: (val) => set({ projectedBalance: val }),

      // ─── TRANSACTIONS ─────────────────────────────────────────
      transactions: v3Transactions,
      addTransaction: (transaction) => {
        const newTx = { ...transaction, id: generateId(), createdAt: new Date().toISOString() }
        set((state) => {
          const current = state.accounts[transaction.account] ?? 0
          const delta = transaction.type === 'in' ? transaction.amount : -transaction.amount
          return {
            transactions: [newTx, ...state.transactions],
            accounts: { ...state.accounts, [transaction.account]: current + delta },
          }
        })
        get().addToast('Transaction added', 'success')
        return newTx
      },
      updateTransaction: (id, updates) => {
        set((state) => {
          const old = state.transactions.find(t => t.id === id)
          const accounts = { ...state.accounts }
          if (old) {
            const oldDelta = old.type === 'in' ? -old.amount : old.amount
            accounts[old.account] = (accounts[old.account] ?? 0) + oldDelta
          }
          const newAmount = parseFloat(updates.amount ?? old?.amount)
          const newType = updates.type ?? old?.type
          const newAccount = updates.account ?? old?.account
          const newDelta = newType === 'in' ? newAmount : -newAmount
          accounts[newAccount] = (accounts[newAccount] ?? 0) + newDelta
          return {
            transactions: state.transactions.map(t => t.id === id ? { ...t, ...updates } : t),
            accounts,
          }
        })
        get().addToast('Transaction updated', 'success')
      },
      deleteTransaction: (id) => {
        set((state) => {
          const tx = state.transactions.find(t => t.id === id)
          const accounts = { ...state.accounts }
          if (tx) {
            const delta = tx.type === 'in' ? -tx.amount : tx.amount
            accounts[tx.account] = (accounts[tx.account] ?? 0) + delta
          }
          return {
            transactions: state.transactions.filter(t => t.id !== id),
            accounts,
          }
        })
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
      paychecks: [
        ...v3NewPaychecks,
        ...generatePaychecks().map(p => {
          if (p.id === 'paycheck-1') return { ...p, amount: 993.21,  received: true }
          if (p.id === 'paycheck-2') return { ...p, amount: 1061.47, received: true }
          return p
        }),
      ],
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
            return {
              ...item,
              payments: payments.map((p, i) =>
                p.id === paymentId
                  ? { ...p, status: idx === payments.length - 1 ? 'final' : 'upcoming', paidDate: null }
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

      // ─── SUPABASE SYNC ────────────────────────────────────────
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
        } finally {
          set({ syncing: false })
        }
      },
    }),
    {
      name: 'edwin-financial-hub',
      version: 3,
      migrate: (persisted, version) => {
        if (version < 2) {
          persisted = { ...persisted, accounts: { ...persisted.accounts, chaseDebit: 389.82 } }
        }
        if (version < 3) {
          // Balance
          const accounts = { ...persisted.accounts, chaseDebit: 1960.27 }

          // TILT — mark repaid
          const tiltLogs = (persisted.tiltLogs || defaultTiltLogs).map(l =>
            l.id === 'tilt-1'
              ? { ...l, status: 'repaid', repaidAt: '2026-05-29' }
              : l
          )

          // EarnIn — replace with updated cycles
          const earnInLogs = defaultEarnInLogs

          // Bills — remove Oliver Food (bill-16)
          const bills = (persisted.bills || defaultBills).filter(b => b.id !== 'bill-16')

          // Transactions — merge, skip any that already exist by id
          const existingIds = new Set((persisted.transactions || []).map(t => t.id))
          const newTxs = v3Transactions.filter(t => !existingIds.has(t.id))
          const transactions = [...newTxs, ...(persisted.transactions || [])]

          // Paychecks — add May 1/8/15, update May 22 & 29 amounts
          const existingPaycheckIds = new Set((persisted.paychecks || []).map(p => p.id))
          const addedPast = v3NewPaychecks.filter(p => !existingPaycheckIds.has(p.id))
          const updatedPaychecks = (persisted.paychecks || generatePaychecks()).map(p => {
            if (p.id === 'paycheck-1') return { ...p, amount: 993.21,  received: true }
            if (p.id === 'paycheck-2') return { ...p, amount: 1061.47, received: true }
            return p
          })
          const paychecks = [...addedPast, ...updatedPaychecks]

          // Afterpay — apply correct payment statuses
          const afterpayItems = defaultAfterPayItems

          // Projected balance override
          const projectedBalance = 2469.45

          persisted = {
            ...persisted,
            accounts,
            tiltLogs,
            earnInLogs,
            bills,
            transactions,
            paychecks,
            afterpayItems,
            projectedBalance,
          }
        }
        return persisted
      },
      partialize: (state) => ({
        theme: state.theme,
        accounts: state.accounts,
        projectedBalance: state.projectedBalance,
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
