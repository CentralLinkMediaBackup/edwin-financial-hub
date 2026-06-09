// SUPABASE IS THE SOURCE OF TRUTH
// Never reset or re-seed this data on deploy
// Check for existing records before inserting
// All user data persists in Supabase independently of code changes
//
// Run once: node scripts/seed.js
// Safe to re-run — uses upsert, never truncates.

const { createClient } = require('../node_modules/@supabase/supabase-js')

const SUPABASE_URL = 'https://upcxutjuqjiilwxmszgl.supabase.co'
const SUPABASE_KEY = 'sb_publishable_wAsZm4RDNGYnD70xBmlSrg_rqiGAGYu'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Helpers ────────────────────────────────────────────────────────────────────
function addWeeks(date, weeks) {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}
function fmt(date) {
  return date.toISOString().split('T')[0]
}
function log(msg) { console.log('  ' + msg) }
function warn(msg) { console.warn('  ⚠️  ' + msg) }

// ── Seed data ──────────────────────────────────────────────────────────────────

const ACCOUNTS = [
  { key: 'chaseDebit',      balance: 1971.32 },
  { key: 'capitalOneDebit', balance: 0 },
  { key: 'cashApp',         balance: 0 },
  { key: 'paypal',          balance: 0 },
]

const BILLS = [
  { id:'bill-1',  name:'Netflix',           amount:8.65,    due_day:23,  frequency:'monthly',   is_active:true, category:'Entertainment' },
  { id:'bill-2',  name:'Amazon Prime',      amount:0.00,    due_day:7,   frequency:'monthly',   is_active:true, category:'Shopping' },
  { id:'bill-3',  name:'TXU Electric',      amount:110.00,  due_day:26,  frequency:'monthly',   is_active:true, category:'Utilities' },
  { id:'bill-4',  name:'Spectrum Internet', amount:50.26,   due_day:25,  frequency:'monthly',   is_active:true, category:'Utilities' },
  { id:'bill-5',  name:'Spectrum Mobile',   amount:2.22,    due_day:19,  frequency:'monthly',   is_active:true, category:'Phone' },
  { id:'bill-6',  name:'iPhone Data',       amount:55.00,   due_day:null,frequency:'monthly',   is_active:true, category:'Phone',          note:'Flexible due date' },
  { id:'bill-7',  name:'Rent',              amount:1433.03, due_day:3,   frequency:'monthly',   is_active:true, category:'Housing',        note:'Due Jun 3' },
  { id:'bill-8',  name:'Apt Insurance',     amount:19.17,   due_day:2,   frequency:'monthly',   is_active:true, category:'Insurance' },
  { id:'bill-9',  name:'Amazon Kindle',     amount:12.98,   due_day:21,  frequency:'monthly',   is_active:true, category:'Entertainment' },
  { id:'bill-10', name:'Spotify',           amount:14.06,   due_day:21,  frequency:'monthly',   is_active:true, category:'Entertainment' },
  { id:'bill-11', name:'Capital One CR',    amount:61.00,   due_day:17,  frequency:'monthly',   is_active:true, category:'Debt' },
  { id:'bill-12', name:'Chase CR',          amount:40.00,   due_day:6,   frequency:'monthly',   is_active:true, category:'Debt' },
  { id:'bill-13', name:'Car Payment',       amount:530.00,  due_day:15,  frequency:'monthly',   is_active:true, category:'Transport' },
  { id:'bill-14', name:'Marcus Medicine',   amount:50.00,   due_day:23,  frequency:'monthly',   is_active:true, category:'Health' },
  { id:'bill-15', name:'Marcus Food',       amount:50.87,   due_day:16,  frequency:'bimonthly', is_active:true, category:'Food',           note:'Every 2 months' },
  { id:'bill-17', name:'College',           amount:135.00,  due_day:28,  frequency:'monthly',   is_active:true, category:'Education',      note:'Before EOM' },
  { id:'bill-18', name:'IONOS',             amount:1.00,    due_day:21,  frequency:'monthly',   is_active:true, category:'Business' },
  { id:'bill-19', name:'Uber Subscription', amount:9.99,    due_day:21,  frequency:'monthly',   is_active:true, category:'Transport' },
]

const TILT_LOGS = [
  {
    id:'tilt-1', amount_used:400, credit_limit:400, instant_delivery:true, instant_fee:12,
    repayment_date:'2026-05-29', repayment_option:'A', status:'repaid', repaid_at:'2026-05-29',
    note:'Option A repayment', created_at:'2026-05-22T00:00:00.000Z',
  },
]

const EARNIN_LOGS = [
  {
    id:'earnin-1', cycle_start_date:'2026-05-29',
    fri_taken:true, sat_taken:true, sun_taken:true, mon_taken:true,
    amounts:{ fri:155.99, sat:155.99, sun:155.99, mon:53.99 },
    repayment_amount:521.96, status:'active',
  },
]

const AFTERPAY_ITEMS = [
  {
    id:'afterpay-1', name:'Walmart Gift Card', total_amount:150,
    payments:[
      { id:'ap-p1', number:1, amount:37.50, dueDate:'2026-05-03', status:'paid',     paidDate:'2026-05-03' },
      { id:'ap-p2', number:2, amount:37.50, dueDate:'2026-05-17', status:'paid',     paidDate:'2026-05-17' },
      { id:'ap-p3', number:3, amount:37.50, dueDate:'2026-05-31', status:'upcoming', paidDate:null },
      { id:'ap-p4', number:4, amount:37.50, dueDate:'2026-06-14', status:'upcoming', paidDate:null, label:'FINAL' },
    ],
  },
]

const DEBTS = [
  { id:'debt-1', name:'Chase Credit Card',       total_balance:570.58,  minimum_payment:40,  apr:0,     payment_history:[] },
  { id:'debt-2', name:'Capital One Credit Card', total_balance:2102.40, minimum_payment:61,  apr:24.49, payment_history:[] },
  { id:'debt-3', name:'College',                 total_balance:2695.12, minimum_payment:135, apr:0,     payment_history:[] },
]

// ── Paychecks ──────────────────────────────────────────────────────────────────
function buildPaychecks() {
  const rows = [
    { id:'paycheck-may1',  date:'2026-05-01', amount:994.23,  source:'Prosperity Fire Protection, LLC', account:'chaseDebit', note:'Weekly paycheck', received:true,  is_one_time:false },
    { id:'paycheck-may8',  date:'2026-05-08', amount:983.95,  source:'Prosperity Fire Protection, LLC', account:'chaseDebit', note:'Weekly paycheck', received:true,  is_one_time:false },
    { id:'paycheck-may15', date:'2026-05-15', amount:984.81,  source:'Prosperity Fire Protection, LLC', account:'chaseDebit', note:'Weekly paycheck', received:true,  is_one_time:false },
  ]
  const start = new Date(2026, 4, 22) // May 22 2026
  const amounts = { 1: 993.21, 2: 1061.47 }
  for (let i = 0; i < 52; i++) {
    const d = addWeeks(start, i)
    rows.push({
      id: `paycheck-${i+1}`,
      date: fmt(d),
      amount: amounts[i+1] ?? 980,
      source: 'Prosperity Fire Protection, LLC',
      account: 'chaseDebit',
      note: 'Weekly paycheck',
      received: i < 2,
      is_one_time: false,
    })
  }
  return rows
}

// ── Transactions (all 87) ──────────────────────────────────────────────────────
const TRANSACTIONS = [
  // May 1
  { id:'tx-m1-1',  date:'2026-05-01', type:'out', amount:886.89, category:'Housing',       note:'Rent (Cash App transfer)',               account:'chaseDebit', is_one_time:false, created_at:'2026-05-01T08:00:00.000Z' },
  { id:'tx-m1-2',  date:'2026-05-01', type:'out', amount:350.00, category:'Housing',       note:'Rent portion (Cash App)',                account:'chaseDebit', is_one_time:false, created_at:'2026-05-01T08:01:00.000Z' },
  { id:'tx-m1-3',  date:'2026-05-01', type:'out', amount:202.45, category:'Housing',       note:'Rent portion (Cash App)',                account:'chaseDebit', is_one_time:false, created_at:'2026-05-01T08:02:00.000Z' },
  { id:'tx-m1-4',  date:'2026-05-01', type:'out', amount:19.17,  category:'Insurance',     note:'Apt Insurance',                         account:'chaseDebit', is_one_time:false, created_at:'2026-05-01T08:03:00.000Z' },
  // May 3
  { id:'tx-m3-1',  date:'2026-05-03', type:'out', amount:37.50,  category:'Shopping',      note:'Afterpay',                              account:'chaseDebit', is_one_time:false, created_at:'2026-05-03T08:00:00.000Z' },
  { id:'tx-m3-2',  date:'2026-05-03', type:'out', amount:104.44, category:'Other',         note:'Cash App',                              account:'chaseDebit', is_one_time:false, created_at:'2026-05-03T08:01:00.000Z' },
  { id:'tx-m3-3',  date:'2026-05-03', type:'out', amount:250.00, category:'Other',         note:'Cash App',                              account:'chaseDebit', is_one_time:false, created_at:'2026-05-03T08:02:00.000Z' },
  // May 4
  { id:'tx-m4-1',  date:'2026-05-04', type:'out', amount:6.00,   category:'Other',         note:'Cash App',                              account:'chaseDebit', is_one_time:false, created_at:'2026-05-04T08:00:00.000Z' },
  // May 8
  { id:'tx-m8-1',  date:'2026-05-08', type:'out', amount:40.00,  category:'Debt',          note:'Chase CR payment',                      account:'chaseDebit', is_one_time:false, created_at:'2026-05-08T08:00:00.000Z' },
  { id:'tx-m8-2',  date:'2026-05-08', type:'out', amount:1.07,   category:'Shopping',      note:'Amazon Prime',                          account:'chaseDebit', is_one_time:false, created_at:'2026-05-08T08:01:00.000Z' },
  // May 9
  { id:'tx-m9-1',  date:'2026-05-09', type:'out', amount:37.50,  category:'Shopping',      note:'Afterpay',                              account:'chaseDebit', is_one_time:false, created_at:'2026-05-09T08:00:00.000Z' },
  { id:'tx-m9-2',  date:'2026-05-09', type:'out', amount:133.72, category:'Food',          note:'Walmart groceries',                     account:'chaseDebit', is_one_time:false, created_at:'2026-05-09T08:01:00.000Z' },
  { id:'tx-m9-3',  date:'2026-05-09', type:'out', amount:21.62,  category:'Shopping',      note:'Walmart',                               account:'chaseDebit', is_one_time:false, created_at:'2026-05-09T08:02:00.000Z' },
  { id:'tx-m9-4',  date:'2026-05-09', type:'out', amount:8.06,   category:'Dining',        note:'Grubhub',                               account:'chaseDebit', is_one_time:false, created_at:'2026-05-09T08:03:00.000Z' },
  // May 10
  { id:'tx-m10-1', date:'2026-05-10', type:'out', amount:49.88,  category:'Food',          note:'ALDI groceries',                        account:'chaseDebit', is_one_time:false, created_at:'2026-05-10T08:00:00.000Z' },
  { id:'tx-m10-2', date:'2026-05-10', type:'out', amount:28.25,  category:'Dining',        note:'In-N-Out',                              account:'chaseDebit', is_one_time:false, created_at:'2026-05-10T08:01:00.000Z' },
  // May 11
  { id:'tx-m11-1', date:'2026-05-11', type:'out', amount:39.60,  category:'Shopping',      note:'Amazon purchases',                      account:'chaseDebit', is_one_time:false, created_at:'2026-05-11T08:00:00.000Z' },
  { id:'tx-m11-2', date:'2026-05-11', type:'out', amount:9.73,   category:'Shopping',      note:'Amazon',                                account:'chaseDebit', is_one_time:false, created_at:'2026-05-11T08:01:00.000Z' },
  { id:'tx-m11-3', date:'2026-05-11', type:'out', amount:22.73,  category:'Shopping',      note:'Dollar Tree',                           account:'chaseDebit', is_one_time:false, created_at:'2026-05-11T08:02:00.000Z' },
  // May 13
  { id:'tx-m13-1', date:'2026-05-13', type:'out', amount:13.72,  category:'Dining',        note:"McDonald's",                            account:'chaseDebit', is_one_time:false, created_at:'2026-05-13T08:00:00.000Z' },
  { id:'tx-m13-2', date:'2026-05-13', type:'out', amount:25.01,  category:'Other',         note:'7-Eleven',                              account:'chaseDebit', is_one_time:false, created_at:'2026-05-13T08:01:00.000Z' },
  // May 14
  { id:'tx-m14-1', date:'2026-05-14', type:'out', amount:43.10,  category:'Pet/Marcus',    note:'Chewy (Marcus)',                        account:'chaseDebit', is_one_time:false, created_at:'2026-05-14T08:00:00.000Z' },
  // May 15
  { id:'tx-m15-1', date:'2026-05-15', type:'out', amount:24.22,  category:'Dining',        note:'Sonic',                                 account:'chaseDebit', is_one_time:false, created_at:'2026-05-15T08:00:00.000Z' },
  { id:'tx-m15-2', date:'2026-05-15', type:'out', amount:360.50, category:'Other',         note:'Tilt repayment',                        account:'chaseDebit', is_one_time:false, created_at:'2026-05-15T08:01:00.000Z' },
  { id:'tx-m15-3', date:'2026-05-15', type:'out', amount:529.94, category:'Transport',     note:'Cash App (car payment)',                account:'chaseDebit', is_one_time:false, created_at:'2026-05-15T08:02:00.000Z' },
  // May 16
  { id:'tx-m16-1', date:'2026-05-16', type:'out', amount:29.22,  category:'Shopping',      note:'Barnes & Noble',                        account:'chaseDebit', is_one_time:false, created_at:'2026-05-16T08:00:00.000Z' },
  { id:'tx-m16-2', date:'2026-05-16', type:'out', amount:97.41,  category:'Shopping',      note:'Foot Locker (shoes)',                   account:'chaseDebit', is_one_time:false, created_at:'2026-05-16T08:01:00.000Z' },
  { id:'tx-m16-3', date:'2026-05-16', type:'out', amount:50.87,  category:'Pet/Marcus',    note:'PetSmart (Marcus food)',                account:'chaseDebit', is_one_time:false, created_at:'2026-05-16T08:02:00.000Z' },
  // May 17
  { id:'tx-m17-1', date:'2026-05-17', type:'out', amount:37.50,  category:'Shopping',      note:'Afterpay',                              account:'chaseDebit', is_one_time:false, created_at:'2026-05-17T08:00:00.000Z' },
  // May 18
  { id:'tx-m18-1', date:'2026-05-18', type:'out', amount:3.99,   category:'Transport',     note:'Gas',                                   account:'chaseDebit', is_one_time:false, created_at:'2026-05-18T08:00:00.000Z' },
  { id:'tx-m18-2', date:'2026-05-18', type:'out', amount:61.00,  category:'Debt',          note:'Capital One payment',                   account:'chaseDebit', is_one_time:false, created_at:'2026-05-18T08:01:00.000Z' },
  { id:'tx-m18-3', date:'2026-05-18', type:'out', amount:55.00,  category:'Phone',         note:'iPhone Data (Zelle to Father)',         account:'chaseDebit', is_one_time:false, created_at:'2026-05-18T08:02:00.000Z' },
  // May 19
  { id:'tx-m19-1', date:'2026-05-19', type:'out', amount:2.22,   category:'Phone',         note:'Spectrum Mobile',                       account:'chaseDebit', is_one_time:false, created_at:'2026-05-19T08:00:00.000Z' },
  // May 21
  { id:'tx-m21-1', date:'2026-05-21', type:'out', amount:14.06,  category:'Entertainment', note:'Spotify',                               account:'chaseDebit', is_one_time:false, created_at:'2026-05-21T08:00:00.000Z' },
  { id:'tx-m21-2', date:'2026-05-21', type:'out', amount:12.98,  category:'Entertainment', note:'Kindle',                                account:'chaseDebit', is_one_time:false, created_at:'2026-05-21T08:01:00.000Z' },
  { id:'tx-m21-3', date:'2026-05-21', type:'out', amount:9.99,   category:'Transport',     note:'Uber Subscription',                     account:'chaseDebit', is_one_time:false, created_at:'2026-05-21T08:02:00.000Z' },
  // May 22
  { id:'tx-m22-1', date:'2026-05-22', type:'out', amount:37.50,  category:'Shopping',      note:'Afterpay',                              account:'chaseDebit', is_one_time:false, created_at:'2026-05-22T08:00:00.000Z' },
  { id:'tx-m22-2', date:'2026-05-22', type:'out', amount:1.00,   category:'Business',      note:'IONOS',                                 account:'chaseDebit', is_one_time:false, created_at:'2026-05-22T08:01:00.000Z' },
  { id:'tx-m22-3', date:'2026-05-22', type:'in',  amount:150.00, category:'Income',        note:'Earn In 1',                             account:'chaseDebit', is_one_time:false, created_at:'2026-05-22T08:02:00.000Z' },
  // May 23
  { id:'tx-m23-1', date:'2026-05-23', type:'out', amount:9.73,   category:'Entertainment', note:'Netflix',                               account:'chaseDebit', is_one_time:false, created_at:'2026-05-23T08:00:00.000Z' },
  { id:'tx-m23-2', date:'2026-05-23', type:'out', amount:23.00,  category:'Dining',        note:'Sonic',                                 account:'chaseDebit', is_one_time:false, created_at:'2026-05-23T08:01:00.000Z' },
  { id:'tx-m23-3', date:'2026-05-23', type:'out', amount:4.54,   category:'Dining',        note:'Sonic',                                 account:'chaseDebit', is_one_time:false, created_at:'2026-05-23T08:02:00.000Z' },
  { id:'tx-m23-4', date:'2026-05-23', type:'out', amount:25.01,  category:'Transport',     note:'7-Eleven (gas)',                        account:'chaseDebit', is_one_time:false, created_at:'2026-05-23T08:03:00.000Z' },
  { id:'tx-m23-5', date:'2026-05-23', type:'out', amount:25.98,  category:'Dining',        note:"Domino's",                              account:'chaseDebit', is_one_time:false, created_at:'2026-05-23T08:04:00.000Z' },
  { id:'tx-m23-6', date:'2026-05-23', type:'out', amount:53.48,  category:'Shopping',      note:'Amazon',                                account:'chaseDebit', is_one_time:false, created_at:'2026-05-23T08:05:00.000Z' },
  // May 24
  { id:'tx-m24-1', date:'2026-05-24', type:'in',  amount:150.00, category:'Income',        note:'Earn In 3',                             account:'chaseDebit', is_one_time:false, created_at:'2026-05-24T08:00:00.000Z' },
  { id:'tx-m24-2', date:'2026-05-24', type:'out', amount:2.96,   category:'Shopping',      note:'Amazon',                                account:'chaseDebit', is_one_time:false, created_at:'2026-05-24T08:01:00.000Z' },
  { id:'tx-m24-3', date:'2026-05-24', type:'out', amount:4.99,   category:'Shopping',      note:'Amazon',                                account:'chaseDebit', is_one_time:false, created_at:'2026-05-24T08:02:00.000Z' },
  { id:'tx-m24-4', date:'2026-05-24', type:'out', amount:5.94,   category:'Shopping',      note:'Amazon',                                account:'chaseDebit', is_one_time:false, created_at:'2026-05-24T08:03:00.000Z' },
  { id:'tx-m24-5', date:'2026-05-24', type:'out', amount:11.03,  category:'Shopping',      note:'Amazon',                                account:'chaseDebit', is_one_time:false, created_at:'2026-05-24T08:04:00.000Z' },
  { id:'tx-m24-6', date:'2026-05-24', type:'out', amount:28.56,  category:'Shopping',      note:'Amazon',                                account:'chaseDebit', is_one_time:false, created_at:'2026-05-24T08:05:00.000Z' },
  // May 25
  { id:'tx-m25-1', date:'2026-05-25', type:'out', amount:30.88,  category:'Food',          note:'ALDI groceries',                        account:'chaseDebit', is_one_time:false, created_at:'2026-05-25T08:00:00.000Z' },
  { id:'tx-m25-2', date:'2026-05-25', type:'out', amount:8.93,   category:'Shopping',      note:'Dollar Tree',                           account:'chaseDebit', is_one_time:false, created_at:'2026-05-25T08:01:00.000Z' },
  { id:'tx-m25-3', date:'2026-05-25', type:'out', amount:16.18,  category:'Entertainment', note:'Audible',                               account:'chaseDebit', is_one_time:false, created_at:'2026-05-25T08:02:00.000Z' },
  { id:'tx-m25-4', date:'2026-05-25', type:'in',  amount:50.00,  category:'Income',        note:'Earn In 4',                             account:'chaseDebit', is_one_time:false, created_at:'2026-05-25T08:03:00.000Z' },
  // May 26
  { id:'tx-m26-1', date:'2026-05-26', type:'out', amount:50.26,  category:'Utilities',     note:'Spectrum Internet',                     account:'chaseDebit', is_one_time:false, created_at:'2026-05-26T08:00:00.000Z' },
  { id:'tx-m26-2', date:'2026-05-26', type:'out', amount:7.77,   category:'Transport',     note:'Gas',                                   account:'chaseDebit', is_one_time:false, created_at:'2026-05-26T08:01:00.000Z' },
  { id:'tx-m26-3', date:'2026-05-26', type:'out', amount:9.18,   category:'Dining',        note:"McDonald's",                            account:'chaseDebit', is_one_time:false, created_at:'2026-05-26T08:02:00.000Z' },
  // May 27
  { id:'tx-m27-1', date:'2026-05-27', type:'out', amount:8.31,   category:'Transport',     note:'Gas',                                   account:'chaseDebit', is_one_time:false, created_at:'2026-05-27T08:00:00.000Z' },
  { id:'tx-m27-2', date:'2026-05-27', type:'out', amount:30.00,  category:'Phone',         note:'Zelle to Father (iPhone Data)',         account:'chaseDebit', is_one_time:false, created_at:'2026-05-27T08:01:00.000Z' },
  // May 28
  { id:'tx-m28-1', date:'2026-05-28', type:'out', amount:110.00, category:'Utilities',     note:'TXU Electric',                          account:'chaseDebit', is_one_time:false, created_at:'2026-05-28T08:00:00.000Z' },
  { id:'tx-m28-2', date:'2026-05-28', type:'out', amount:140.71, category:'Shopping',      note:'Amazon',                                account:'chaseDebit', is_one_time:false, created_at:'2026-05-28T08:01:00.000Z' },
  { id:'tx-m28-3', date:'2026-05-28', type:'out', amount:12.98,  category:'Entertainment', note:'Kindle',                                account:'chaseDebit', is_one_time:false, created_at:'2026-05-28T08:02:00.000Z' },
  { id:'tx-m28-4', date:'2026-05-28', type:'out', amount:16.29,  category:'Other',         note:'Zelle to Father',                       account:'chaseDebit', is_one_time:false, created_at:'2026-05-28T08:03:00.000Z' },
  { id:'tx-m28-5', date:'2026-05-28', type:'out', amount:24.33,  category:'Dining',        note:'Sonic',                                 account:'chaseDebit', is_one_time:false, created_at:'2026-05-28T08:04:00.000Z' },
  // May 29
  { id:'tx-m29-1', date:'2026-05-29', type:'in',  amount:849.18, category:'Income',        note:'Paycheck (Prosperity Fire)',             account:'chaseDebit', is_one_time:false, created_at:'2026-05-29T08:00:00.000Z' },
  { id:'tx-m29-2', date:'2026-05-29', type:'out', amount:7.19,   category:'Shopping',      note:'Amazon',                                account:'chaseDebit', is_one_time:false, created_at:'2026-05-29T08:01:00.000Z' },
  { id:'tx-m29-3', date:'2026-05-29', type:'out', amount:18.79,  category:'Shopping',      note:'Amazon',                                account:'chaseDebit', is_one_time:false, created_at:'2026-05-29T08:02:00.000Z' },
  { id:'tx-m29-4', date:'2026-05-29', type:'in',  amount:150.00, category:'Income',        note:'Earn In 1',                             account:'chaseDebit', is_one_time:false, created_at:'2026-05-29T08:03:00.000Z' },
  { id:'tx-m29-5', date:'2026-05-29', type:'out', amount:155.99, category:'Other',         note:'Earn In repayment',                     account:'chaseDebit', is_one_time:false, created_at:'2026-05-29T08:04:00.000Z' },
  { id:'tx-m29-6', date:'2026-05-29', type:'out', amount:155.99, category:'Other',         note:'Earn In repayment',                     account:'chaseDebit', is_one_time:false, created_at:'2026-05-29T08:05:00.000Z' },
  { id:'tx-m29-7', date:'2026-05-29', type:'out', amount:155.99, category:'Other',         note:'Earn In repayment',                     account:'chaseDebit', is_one_time:false, created_at:'2026-05-29T08:06:00.000Z' },
  { id:'tx-m29-8', date:'2026-05-29', type:'out', amount:53.99,  category:'Other',         note:'Earn In repayment',                     account:'chaseDebit', is_one_time:false, created_at:'2026-05-29T08:07:00.000Z' },
  // May 31 – Grapevine Mills
  { id:'tx-m31-1',  date:'2026-05-31', type:'out', amount:13.48,  category:'Dining',       note:'Feng Cha (Grapevine Mills)',             account:'chaseDebit', is_one_time:false, created_at:'2026-05-31T08:00:00.000Z' },
  { id:'tx-m31-2',  date:'2026-05-31', type:'out', amount:54.12,  category:'Shopping',     note:'Custom Engraving (Grapevine Mills)',     account:'chaseDebit', is_one_time:false, created_at:'2026-05-31T08:01:00.000Z' },
  { id:'tx-m31-3',  date:'2026-05-31', type:'out', amount:47.63,  category:'Shopping',     note:'Primark (Grapevine Mills)',              account:'chaseDebit', is_one_time:false, created_at:'2026-05-31T08:02:00.000Z' },
  { id:'tx-m31-4',  date:'2026-05-31', type:'out', amount:54.10,  category:'Shopping',     note:'Old Navy (Grapevine Mills)',             account:'chaseDebit', is_one_time:false, created_at:'2026-05-31T08:03:00.000Z' },
  { id:'tx-m31-5',  date:'2026-05-31', type:'out', amount:57.35,  category:'Shopping',     note:'Kawaii Kollections (Grapevine Mills)',   account:'chaseDebit', is_one_time:false, created_at:'2026-05-31T08:04:00.000Z' },
  { id:'tx-m31-6',  date:'2026-05-31', type:'out', amount:30.31,  category:'Shopping',     note:'Five Below (Grapevine Mills)',           account:'chaseDebit', is_one_time:false, created_at:'2026-05-31T08:05:00.000Z' },
  { id:'tx-m31-7',  date:'2026-05-31', type:'out', amount:12.57,  category:'Shopping',     note:'Hot Topic (Grapevine Mills)',            account:'chaseDebit', is_one_time:false, created_at:'2026-05-31T08:06:00.000Z' },
  { id:'tx-m31-8',  date:'2026-05-31', type:'out', amount:36.95,  category:'Dining',       note:'Basil Thai (Grapevine Mills)',           account:'chaseDebit', is_one_time:false, created_at:'2026-05-31T08:07:00.000Z' },
  { id:'tx-m31-9',  date:'2026-05-31', type:'out', amount:35.70,  category:'Pet/Marcus',   note:'PetSmart (Grapevine Mills)',             account:'chaseDebit', is_one_time:false, created_at:'2026-05-31T08:08:00.000Z' },
  { id:'tx-m31-10', date:'2026-05-31', type:'out', amount:18.40,  category:'Pet/Marcus',   note:'PetSmart (Grapevine Mills)',             account:'chaseDebit', is_one_time:false, created_at:'2026-05-31T08:09:00.000Z' },
  { id:'tx-m31-11', date:'2026-05-31', type:'out', amount:25.95,  category:'Dining',       note:"Domino's (Grapevine Mills)",             account:'chaseDebit', is_one_time:false, created_at:'2026-05-31T08:10:00.000Z' },
  { id:'tx-m31-12', date:'2026-05-31', type:'out', amount:12.10,  category:'Food',         note:'Lone Star Markets (Grapevine Mills)',    account:'chaseDebit', is_one_time:false, created_at:'2026-05-31T08:11:00.000Z' },
  // June 1
  { id:'tx-j1-1',  date:'2026-06-01', type:'in',  amount:237.29, category:'Income',        note:'Paycheck savings portion transferred back', account:'chaseDebit', is_one_time:false, created_at:'2026-06-01T08:00:00.000Z' },
  { id:'tx-j1-2',  date:'2026-06-01', type:'out', amount:37.50,  category:'Shopping',      note:'Afterpay payment (Walmart Gift Card 3/4)',   account:'chaseDebit', is_one_time:false, created_at:'2026-06-01T08:01:00.000Z' },
]

// ── Seed function ──────────────────────────────────────────────────────────────
async function upsert(table, rows) {
  if (!rows.length) return log(`${table}: nothing to seed`)
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' })
  if (error) warn(`${table}: ${error.message}`)
  else log(`${table}: ${rows.length} row(s) seeded ✓`)
}

async function upsertAccounts() {
  const rows = ACCOUNTS.map(a => ({ ...a, updated_at: new Date().toISOString() }))
  const { error } = await supabase.from('accounts').upsert(rows, { onConflict: 'key' })
  if (error) warn(`accounts: ${error.message}`)
  else log(`accounts: ${rows.length} row(s) seeded ✓`)
}

async function seedSettings() {
  const row = {
    id: 'singleton',
    earn_in: { repaymentAmount: 521.96, fri: 155.99, sat: 155.99, sun: 105.99, mon: 53.99 },
    tilt_cfg: { maxCredit: 400, instantFee: 12 },
    paycheck_cfg: { defaultAmount: 980, frequency: 'weekly' },
    theme: 'dark',
    projected_balance: 2469.45,
  }
  const { error } = await supabase.from('settings').upsert([row], { onConflict: 'id' })
  if (error) warn(`settings: ${error.message} — run 001_create_schema.sql in Supabase SQL Editor first`)
  else log('settings: 1 row seeded ✓')
}

async function seedPendingIncome() {
  const rows = [{
    id: 'pending-1',
    label: "Wife's Due",
    amount: 224.57,
    details: [
      { desc: 'Zelle from Father', amount: 150.00 },
      { desc: 'Zelle from Father', amount: 37.00 },
      { desc: 'Hot Topic', amount: 12.57 },
      { desc: 'Additional', amount: 25.00 },
    ],
    note: 'More owed, amount pending confirmation',
    status: 'pending',
    created_at: '2026-06-02',
  }]
  const { error } = await supabase.from('pending_income').upsert(rows, { onConflict: 'id' })
  if (error) warn(`pending_income: ${error.message} — run 001_create_schema.sql in Supabase SQL Editor first`)
  else log('pending_income: 1 row seeded ✓')
}

async function main() {
  console.log('\n🌱 Seeding Financial Hub database...\n')

  await upsertAccounts()
  await upsert('bills',          BILLS)
  await upsert('tilt_logs',      TILT_LOGS)
  await upsert('earnin_logs',    EARNIN_LOGS)
  await upsert('afterpay_items', AFTERPAY_ITEMS)
  await upsert('debts',          DEBTS)
  await upsert('savings_goals',  [])
  await upsert('transactions',   TRANSACTIONS)
  await upsert('paychecks',      buildPaychecks())
  await seedSettings()
  await seedPendingIncome()

  console.log('\n✅ Seed complete.\n')
}

main().catch(console.error)
