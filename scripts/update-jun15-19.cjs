// One-time script: Add Jun 15-18 missing transactions, mark bills paid, set balances
// Run: node scripts/update-jun15-19.cjs
// Safe to re-run: uses deterministic IDs — skips already-inserted rows

const { createClient } = require('../node_modules/@supabase/supabase-js')

const SUPABASE_URL = 'https://upcxutjuqjiilwxmszgl.supabase.co'
const SUPABASE_KEY = 'sb_publishable_wAsZm4RDNGYnD70xBmlSrg_rqiGAGYu'
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

function log(msg)  { console.log('  ✓ ' + msg) }
function skip(msg) { console.log('  — ' + msg + ' (skipped)') }
function warn(msg) { console.warn('  ⚠ ' + msg) }

// All new transactions with deterministic IDs
const NEW_TXS = [
  // ── Jun 15 ──────────────────────────────────────────────────────────────────
  { id:'tx-j15-01', date:'2026-06-15', type:'out', amount:17.11,  category:'Shopping',     note:'Dollar Tree',                      account:'chaseDebit' },
  { id:'tx-j15-02', date:'2026-06-15', type:'out', amount:8.65,   category:'Food',         note:'Lone Star Markets',                account:'chaseDebit' },
  { id:'tx-j15-03', date:'2026-06-15', type:'out', amount:21.32,  category:'Business',     note:'Anthropic Claude Sub',             account:'chaseDebit' },
  { id:'tx-j15-04', date:'2026-06-15', type:'out', amount:80.00,  category:'Cash',         note:'ATM Withdrawal',                   account:'chaseDebit' },
  { id:'tx-j15-05', date:'2026-06-15', type:'out', amount:100.00, category:'Cash',         note:'ATM Withdrawal',                   account:'chaseDebit' },
  { id:'tx-j15-06', date:'2026-06-15', type:'out', amount:68.18,  category:'Pet',          note:'PetSmart',                         account:'chaseDebit' },
  { id:'tx-j15-07', date:'2026-06-15', type:'out', amount:17.10,  category:'Food',         note:'Starbucks',                        account:'chaseDebit' },
  { id:'tx-j15-08', date:'2026-06-15', type:'out', amount:27.38,  category:'Shopping',     note:'Half Price Books',                 account:'chaseDebit' },
  { id:'tx-j15-09', date:'2026-06-15', type:'out', amount:32.46,  category:'Shopping',     note:'Amazon Marketplace',               account:'chaseDebit' },
  { id:'tx-j15-10', date:'2026-06-15', type:'out', amount:84.37,  category:'Shopping',     note:'Marshalls',                        account:'chaseDebit' },
  { id:'tx-j15-11', date:'2026-06-15', type:'out', amount:41.00,  category:'Shopping',     note:'Five Below',                       account:'chaseDebit' },
  { id:'tx-j15-12', date:'2026-06-15', type:'out', amount:28.00,  category:'Food',         note:'Sonic',                            account:'chaseDebit' },
  { id:'tx-j15-13', date:'2026-06-15', type:'out', amount:25.00,  category:'Transfer',     note:'Savings Transfer Out',             account:'chaseDebit' },
  { id:'tx-j15-14', date:'2026-06-15', type:'out', amount:8.65,   category:'Food',         note:'Lone Star Markets',                account:'chaseDebit' },
  { id:'tx-j15-15', date:'2026-06-15', type:'out', amount:8.65,   category:'Food',         note:'Lone Star Markets',                account:'chaseDebit' },
  { id:'tx-j15-16', date:'2026-06-15', type:'out', amount:23.79,  category:'Food',         note:"Domino's",                         account:'chaseDebit' },
  { id:'tx-j15-17', date:'2026-06-15', type:'out', amount:47.35,  category:'Health',       note:'Chewy.com (Marcus Medicine)',       account:'chaseDebit' },
  { id:'tx-j15-18', date:'2026-06-15', type:'in',  amount:25.00,  category:'Transfer',     note:'Savings Transfer In',              account:'chaseDebit' },
  { id:'tx-j15-19', date:'2026-06-15', type:'in',  amount:60.00,  category:'Cash',         note:'ATM Cash Deposit',                 account:'chaseDebit' },
  { id:'tx-j15-20', date:'2026-06-15', type:'out', amount:8.11,   category:'Subscriptions',note:'Amazon Prime',                     account:'chaseDebit' },
  // ── Jun 16 — Amazon x3 posted Jun 16 per bank; car payment Jun 16 ─────────
  { id:'tx-j16-01', date:'2026-06-16', type:'out', amount:104.82, category:'Shopping',     note:'Amazon.com',                       account:'chaseDebit' },
  { id:'tx-j16-02', date:'2026-06-16', type:'out', amount:3.07,   category:'Shopping',     note:'Amazon.com',                       account:'chaseDebit' },
  { id:'tx-j16-03', date:'2026-06-16', type:'out', amount:1.98,   category:'Shopping',     note:'Amazon.com',                       account:'chaseDebit' },
  { id:'tx-j16-04', date:'2026-06-16', type:'out', amount:534.94, category:'Transport',    note:'ACI Westlake Car Payment',         account:'chaseDebit' },
  // ── Jun 17 ──────────────────────────────────────────────────────────────────
  { id:'tx-j17-api', date:'2026-06-17', type:'out', amount:10.66, category:'Business',     note:'Anthropic API',                    account:'chaseDebit' },
  // ── Jun 18 ──────────────────────────────────────────────────────────────────
  { id:'tx-j18-01', date:'2026-06-18', type:'in',  amount:871.04, category:'Income',       note:'Prosperity Fire Payroll',          account:'chaseDebit' },
  // ── Jun 17 — Gas cash expense (wallet) ─────────────────────────────────────
  { id:'tx-j17-gas', date:'2026-06-17', type:'out', amount:20.00, category:'Transport',    note:'Gas (Cash)',                       account:'cash' },
]

async function run() {
  console.log('\n=== Edwin Financial Hub — Jun 15-19 2026 Update ===\n')

  // ── 1. Insert transactions (skip by deterministic ID) ─────────────────────
  console.log('--- Inserting transactions ---')
  const ids = NEW_TXS.map(t => t.id)
  const { data: existingRows } = await sb.from('transactions').select('id').in('id', ids)
  const existingIds = new Set((existingRows || []).map(r => r.id))

  let insertedCount = 0
  for (const tx of NEW_TXS) {
    if (existingIds.has(tx.id)) {
      skip(`${tx.date} $${tx.amount} "${tx.note}"`)
      continue
    }
    const row = {
      id:          tx.id,
      date:        tx.date,
      type:        tx.type,
      amount:      tx.amount,
      category:    tx.category,
      note:        tx.note,
      account:     tx.account,
      is_one_time: false,
      source:      null,
      created_at:  `${tx.date}T08:00:00+00:00`,
    }
    const { error } = await sb.from('transactions').insert([row])
    if (error) warn(`Failed to insert "${tx.note}": ${error.message}`)
    else { log(`${tx.date} ${tx.type} $${tx.amount} "${tx.note}" [${tx.account}]`); insertedCount++ }
  }
  console.log(`\nInserted ${insertedCount} of ${NEW_TXS.length} transaction(s).\n`)

  // ── 2. Mark bills as paid (no balance deduction — balance set explicitly below)
  console.log('--- Marking bills as paid ---')
  const { data: allBills, error: billsErr } = await sb.from('bills').select('id,name,paid_this_month')
  if (billsErr) { warn('Could not fetch bills: ' + billsErr.message) }
  else {
    const BILL_NAMES_TO_MARK = [
      'Capital One CR',
      'Spectrum Mobile',
      'Claude Pro',
      'Amazon Prime',
      'Car Payment',
    ]
    for (const targetName of BILL_NAMES_TO_MARK) {
      const bill = allBills.find(b =>
        b.name.toLowerCase().includes(targetName.toLowerCase()) ||
        targetName.toLowerCase().includes(b.name.toLowerCase())
      )
      if (!bill) {
        warn(`Bill not found by name: "${targetName}"`)
        continue
      }
      if (bill.paid_this_month) {
        skip(`${bill.name} (${bill.id}) already marked paid`)
        continue
      }
      const { error } = await sb.from('bills').update({ paid_this_month: true }).eq('id', bill.id)
      if (error) warn(`Failed to mark ${bill.name} paid: ${error.message}`)
      else log(`${bill.name} (${bill.id}): paid_this_month = true`)
    }
  }
  console.log()

  // ── 3. Set exact balances (as of Jun 19, 2026) ───────────────────────────
  console.log('--- Setting account balances ---')
  const BALANCES = [
    { key: 'chaseDebit', balance: 1172.26, label: 'Chase Checking' },
    { key: 'cash',       balance: 100.00,  label: 'Cash (Wallet)' },
  ]
  for (const { key, balance, label } of BALANCES) {
    const { error } = await sb.from('accounts').upsert(
      { key, balance, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
    if (error) warn(`Failed to set ${label}: ${error.message}`)
    else log(`${label}: $${balance.toFixed(2)}`)
  }
  console.log()

  // ── 4. Verify final state ─────────────────────────────────────────────────
  console.log('--- Final account balances ---')
  const { data: accRows } = await sb.from('accounts').select('key,balance').in('key', ['chaseDebit','cash'])
  for (const r of (accRows || [])) {
    console.log(`  ${r.key}: $${Number(r.balance).toFixed(2)}`)
  }

  const { data: paidBills } = await sb.from('bills').select('name,paid_this_month').eq('paid_this_month', true)
  console.log('\n--- Bills paid this month ---')
  for (const b of (paidBills || [])) console.log(`  ✓ ${b.name}`)

  const { data: recentTxs } = await sb
    .from('transactions')
    .select('date,type,amount,note,account')
    .gte('date', '2026-06-15')
    .order('date')
    .order('created_at')
  console.log(`\n--- Jun 15+ transactions (${recentTxs?.length || 0} total) ---`)
  for (const t of (recentTxs || [])) {
    const sign = t.type === 'in' ? '+' : '-'
    console.log(`  ${t.date}  ${sign}$${Number(t.amount).toFixed(2).padStart(7)}  ${t.note}  [${t.account}]`)
  }

  console.log('\n=== Done ===\n')
}

run().catch(err => { console.error('Fatal error:', err); process.exit(1) })
