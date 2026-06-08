// One-time script: insert Jun 1-8 transactions, update earnin logs, fix balance
// Run: node scripts/insert-jun-transactions.cjs
// Safe to re-run: checks for duplicates before inserting

const { createClient } = require('../node_modules/@supabase/supabase-js')

const SUPABASE_URL = 'https://upcxutjuqjiilwxmszgl.supabase.co'
const SUPABASE_KEY = 'sb_publishable_wAsZm4RDNGYnD70xBmlSrg_rqiGAGYu'
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

function log(msg)  { console.log('  ✓ ' + msg) }
function skip(msg) { console.log('  — ' + msg + ' (already exists, skipped)') }
function warn(msg) { console.warn('  ⚠ ' + msg) }

// Deduplicate: match by date + amount + type + note substring
function isDuplicate(existing, date, type, amount, note) {
  return existing.some(t =>
    t.date === date &&
    t.type === type &&
    Math.abs(Number(t.amount) - amount) < 0.005 &&
    (t.note || '').toLowerCase().includes((note || '').toLowerCase().split(' ')[0].toLowerCase())
  )
}

async function run() {
  console.log('\n=== Edwin Financial Hub — Jun 1-8 2026 Update ===\n')

  // ── 1. Fetch existing Jun 1-8 transactions for duplicate check ────────────
  const { data: existing, error: fetchErr } = await sb
    .from('transactions')
    .select('date,type,amount,note')
    .gte('date', '2026-06-01')
    .lte('date', '2026-06-08')
  if (fetchErr) { warn('Could not fetch existing transactions: ' + fetchErr.message); return }
  console.log(`Found ${existing.length} existing Jun 1-8 transaction(s) — will skip any duplicates.\n`)

  // ── 2. All new transactions (ordered by date) ────────────────────────────
  const newTxs = [
    // Jun 1
    { id:'tx-j1-3', date:'2026-06-01', type:'in',  amount:150.00,   category:'Earn In',           note:'EARNIN FI — Earn In 2 (May 31 cycle)' },
    { id:'tx-j1-4', date:'2026-06-01', type:'in',  amount:150.00,   category:'Earn In',           note:'EARNIN EE — Earn In 3 (Jun 1)' },
    { id:'tx-j1-5', date:'2026-06-01', type:'out', amount:2.99,     category:'Subscriptions',     note:'PAYPAL APPLE.COM BILL' },
    // Jun 2
    { id:'tx-j2-1', date:'2026-06-02', type:'in',  amount:50.00,    category:'Earn In',           note:'EARNIN AD — Earn In 4 (Mon Jun 1 cycle)' },
    { id:'tx-j2-2', date:'2026-06-02', type:'out', amount:19.17,    category:'Bills',             note:'MSI Insurance (Apt Insurance)' },
    { id:'tx-j2-3', date:'2026-06-02', type:'out', amount:35.36,    category:'Shopping',          note:'Amazon.com' },
    { id:'tx-j2-4', date:'2026-06-02', type:'out', amount:3.59,     category:'Shopping',          note:'Amazon.com' },
    { id:'tx-j2-5', date:'2026-06-02', type:'out', amount:7.23,     category:'Shopping',          note:'Dollar Tree' },
    // Jun 3
    { id:'tx-j3-1', date:'2026-06-03', type:'out', amount:11.01,    category:'Transport',         note:'Gas Trip Dallas' },
    { id:'tx-j3-2', date:'2026-06-03', type:'out', amount:1394.24,  category:'Housing',           note:'YSI Los Altos Rent' },
    // Jun 4
    { id:'tx-j4-1', date:'2026-06-04', type:'out', amount:9.99,     category:'Subscriptions',     note:'Amazon Grocery Subscription' },
    // Jun 5 — earnin repayments for May 29 cycle ($521.96 total)
    { id:'tx-j5-2', date:'2026-06-05', type:'out', amount:155.99,   category:'Earn In',           note:'Earnin Repayment 1 (May 29 cycle)' },
    { id:'tx-j5-3', date:'2026-06-05', type:'out', amount:155.99,   category:'Earn In',           note:'Earnin Repayment 2 (May 29 cycle)' },
    { id:'tx-j5-4', date:'2026-06-05', type:'out', amount:155.99,   category:'Earn In',           note:'Earnin Repayment 3 (May 29 cycle)' },
    { id:'tx-j5-5', date:'2026-06-05', type:'out', amount:53.99,    category:'Earn In',           note:'Earnin Repayment 4 (May 29 cycle)' },
    // Jun 6
    { id:'tx-j6-1', date:'2026-06-06', type:'out', amount:28.25,    category:'Dining',            note:'In-N-Out' },
    { id:'tx-j6-2', date:'2026-06-06', type:'out', amount:9.28,     category:'Dining',            note:"McDonald's" },
    // Jun 8
    { id:'tx-j8-1', date:'2026-06-08', type:'in',  amount:222.25,   category:'Internal Transfer', note:'Online Transfer from SAV' },
    { id:'tx-j8-2', date:'2026-06-08', type:'out', amount:67.60,    category:'Shopping',          note:'Amazon.com' },
    { id:'tx-j8-3', date:'2026-06-08', type:'out', amount:2.63,     category:'Shopping',          note:'Amazon.com' },
    { id:'tx-j8-4', date:'2026-06-08', type:'in',  amount:46.26,    category:'Pet/Marcus',        note:'Chewy.com refund' },
    { id:'tx-j8-5', date:'2026-06-08', type:'out', amount:46.26,    category:'Pet/Marcus',        note:'Chewy.com charge' },
    { id:'tx-j8-6', date:'2026-06-08', type:'out', amount:37.13,    category:'Dining',            note:"Raising Cane's" },
    { id:'tx-j8-7', date:'2026-06-08', type:'out', amount:27.87,    category:'Shopping',          note:'Otter Dulce Vida' },
    { id:'tx-j8-8', date:'2026-06-08', type:'out', amount:15.64,    category:'Dining',            note:'Starbucks' },
    { id:'tx-j8-9', date:'2026-06-08', type:'out', amount:145.00,   category:'Personal/Beauty',   note:'SQ Los Espejos Salon' },
    { id:'tx-j8-10',date:'2026-06-08', type:'in',  amount:150.00,   category:'Earn In',           note:'Earnin payment (Jun 8)' },
  ]

  // ── 3. Insert non-duplicate transactions ─────────────────────────────────
  console.log('--- Inserting transactions ---')
  let insertedCount = 0
  let netDelta = 0

  for (const tx of newTxs) {
    const dup = isDuplicate(existing, tx.date, tx.type, tx.amount, tx.note)
    if (dup) {
      skip(`${tx.date} ${tx.type} $${tx.amount} "${tx.note}"`)
      continue
    }
    const row = {
      id:         tx.id,
      date:       tx.date,
      type:       tx.type,
      amount:     tx.amount,
      category:   tx.category,
      note:       tx.note,
      account:    'chaseDebit',
      is_one_time: false,
      source:     null,
      created_at: `${tx.date}T08:00:00+00:00`,
    }
    const { error } = await sb.from('transactions').insert([row])
    if (error) {
      warn(`Failed to insert ${tx.note}: ${error.message}`)
    } else {
      log(`${tx.date} ${tx.type} $${tx.amount} "${tx.note}"`)
      netDelta += tx.type === 'in' ? tx.amount : -tx.amount
      insertedCount++
    }
  }
  console.log(`\nInserted ${insertedCount} transaction(s). Net delta: $${netDelta.toFixed(2)}\n`)

  // ── 4. Update Jun 5 paycheck: actual amount + mark received ─────────────
  console.log('--- Paycheck update ---')
  const { error: pcErr } = await sb
    .from('paychecks')
    .update({ amount: 789.01, received: true })
    .eq('id', 'paycheck-3')
  if (pcErr) warn('Paycheck update failed: ' + pcErr.message)
  else log('paycheck-3 (Jun 5): updated to $789.01, marked received')
  const paycheckDelta = 789.01
  console.log()

  // ── 5. Mark May 29 Earn In cycle as repaid ───────────────────────────────
  console.log('--- Earn In logs ---')
  const { error: ei1Err } = await sb
    .from('earnin_logs')
    .update({ status: 'repaid' })
    .eq('id', 'earnin-1')
  if (ei1Err) warn('Failed to mark earnin-1 repaid: ' + ei1Err.message)
  else log('earnin-1 (May 29 cycle): marked as repaid')

  // Create Jun 5 cycle
  const { data: existing5 } = await sb.from('earnin_logs').select('id').eq('id', 'earnin-2')
  if (existing5 && existing5.length > 0) {
    skip('earnin-2 (Jun 5 cycle) already exists')
  } else {
    const { error: ei2Err } = await sb.from('earnin_logs').insert([{
      id:               'earnin-2',
      cycle_start_date: '2026-06-05',
      fri_taken:        true,
      sat_taken:        false,
      sun_taken:        false,
      mon_taken:        false,
      amounts:          { fri: 155.99, sat: 155.99, sun: 155.99, mon: 53.99 },
      repayment_amount: 155.99,
      status:           'active',
      created_at:       '2026-06-05T08:00:00+00:00',
    }])
    if (ei2Err) warn('Failed to create earnin-2: ' + ei2Err.message)
    else log('earnin-2 (Jun 5 cycle): created — fri taken $155.99, repayment $155.99')
  }
  console.log()

  // ── 6. Mark Rent and Apt Insurance bills as paid this month ──────────────
  console.log('--- Bills: mark paid-this-month ─')
  for (const [billId, name] of [['bill-7','Rent'],['bill-8','Apt Insurance']]) {
    const { error } = await sb.from('bills').update({ paid_this_month: true }).eq('id', billId)
    if (error) warn(`Failed to mark ${name} paid: ${error.message}`)
    else log(`${name} (${billId}): marked paid_this_month = true`)
  }
  console.log()

  // ── 7. Set bills_reset_month in settings (inside paycheck_cfg JSONB) ─────
  console.log('--- Settings update ---')
  const { data: settingsRow } = await sb.from('settings').select('*').eq('id','singleton').single()
  const existingPaycheckCfg = settingsRow?.paycheck_cfg || {}
  const updatedPaycheckCfg  = { ...existingPaycheckCfg, _billsResetMonth: '2026-06' }
  const { error: settingsErr } = await sb.from('settings').upsert({
    id:           'singleton',
    paycheck_cfg: updatedPaycheckCfg,
  }, { onConflict: 'id' })
  if (settingsErr) warn('Failed to update settings: ' + settingsErr.message)
  else log('settings: _billsResetMonth = "2026-06" saved in paycheck_cfg')
  console.log()

  // ── 8. Compute and update Chase balance ──────────────────────────────────
  console.log('--- Balance update ---')
  const { data: accRow } = await sb.from('accounts').select('balance').eq('key','chaseDebit').single()
  const currentBalance = Number(accRow?.balance || 0)
  const newBalance = parseFloat((currentBalance + netDelta + paycheckDelta).toFixed(2))
  const { error: balErr } = await sb
    .from('accounts')
    .upsert({ key: 'chaseDebit', balance: newBalance, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (balErr) warn('Balance update failed: ' + balErr.message)
  else {
    log(`Chase balance: $${currentBalance.toFixed(2)} → $${newBalance.toFixed(2)}`)
    log(`  (net transactions: $${netDelta.toFixed(2)} + paycheck: $${paycheckDelta.toFixed(2)})`)
  }
  console.log()

  console.log('=== Done ===\n')
}

run().catch(err => { console.error('Fatal error:', err); process.exit(1) })
