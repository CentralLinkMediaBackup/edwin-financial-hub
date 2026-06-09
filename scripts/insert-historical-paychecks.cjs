// One-time script: insert all historical paychecks from Prosperity Fire Protection, LLC
// Run: node scripts/insert-historical-paychecks.cjs
// Safe to re-run: checks for duplicates by date before inserting
// Does NOT touch the Chase balance — these are historical records only.

const { createClient } = require('../node_modules/@supabase/supabase-js')

const SUPABASE_URL = 'https://upcxutjuqjiilwxmszgl.supabase.co'
const SUPABASE_KEY = 'sb_publishable_wAsZm4RDNGYnD70xBmlSrg_rqiGAGYu'
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

function log(msg)  { console.log('  ✓ ' + msg) }
function skip(msg) { console.log('  — ' + msg + ' (date already exists, skipped)') }
function warn(msg) { console.warn('  ⚠ ' + msg) }

const HISTORICAL_PAYCHECKS = [
  // 2025
  { date: '2025-07-11', amount: 305.55 },
  { date: '2025-07-18', amount: 840.68 },
  { date: '2025-07-25', amount: 714.14 },
  { date: '2025-08-01', amount: 758.96 },
  { date: '2025-08-08', amount: 793.10 },
  { date: '2025-08-15', amount: 875.44 },
  { date: '2025-08-22', amount: 837.46 },
  { date: '2025-08-29', amount: 706.68 },
  { date: '2025-09-05', amount: 919.09 },
  { date: '2025-09-12', amount: 832.50 },
  { date: '2025-09-19', amount: 867.58 },
  { date: '2025-09-26', amount: 872.99 },
  { date: '2025-10-03', amount: 885.20 },
  { date: '2025-10-10', amount: 887.92 },
  { date: '2025-10-17', amount: 883.56 },
  { date: '2025-10-24', amount: 884.40 },
  { date: '2025-10-31', amount: 810.62 },
  { date: '2025-11-07', amount: 860.79 },
  { date: '2025-11-14', amount: 896.58 },
  { date: '2025-11-21', amount: 893.06 },
  { date: '2025-11-28', amount: 1332.39, note: 'Weekly paycheck (includes $600 bonus)' },
  { date: '2025-12-05', amount: 671.06 },
  { date: '2025-12-12', amount: 873.81 },
  { date: '2025-12-19', amount: 877.06 },
  { date: '2025-12-26', amount: 906.62 },
  // 2026
  { date: '2026-01-02', amount: 714.09 },
  { date: '2026-01-09', amount: 765.07 },
  { date: '2026-01-16', amount: 887.12 },
  { date: '2026-01-23', amount: 903.91 },
  { date: '2026-01-30', amount: 906.09 },
  { date: '2026-02-06', amount: 1048.99 },
  { date: '2026-02-13', amount: 904.20 },
  { date: '2026-02-20', amount: 902.56 },
  { date: '2026-02-27', amount: 909.62 },
  { date: '2026-03-06', amount: 910.70 },
  { date: '2026-03-13', amount: 912.05 },
  { date: '2026-03-20', amount: 913.68 },
  { date: '2026-03-27', amount: 802.50 },
  { date: '2026-04-03', amount: 920.46 },
  { date: '2026-04-10', amount: 919.11 },
  { date: '2026-04-17', amount: 924.52 },
  { date: '2026-04-24', amount: 928.60 },
  { date: '2026-05-01', amount: 994.23 },
  { date: '2026-05-08', amount: 983.95 },
  { date: '2026-05-15', amount: 984.81 },
  { date: '2026-05-22', amount: 993.21 },
  { date: '2026-05-29', amount: 1061.47 },
  { date: '2026-06-05', amount: 986.26 },
]

async function run() {
  console.log('\n=== Edwin Financial Hub — Historical Paychecks Import ===\n')

  // Fetch all existing paycheck dates for duplicate check
  const { data: existing, error: fetchErr } = await sb
    .from('paychecks')
    .select('date')
  if (fetchErr) { warn('Could not fetch existing paychecks: ' + fetchErr.message); return }

  const existingDates = new Set((existing || []).map(p => p.date))
  console.log(`Found ${existingDates.size} existing paycheck date(s) in Supabase.\n`)

  // Insert historical paychecks
  console.log('--- Inserting historical paychecks ---')
  let inserted = 0
  let skipped = 0

  for (const pc of HISTORICAL_PAYCHECKS) {
    if (existingDates.has(pc.date)) {
      skip(`${pc.date} $${pc.amount.toFixed(2)}`)
      skipped++
      continue
    }

    const row = {
      id:          `hist-pc-${pc.date}`,
      date:        pc.date,
      amount:      pc.amount,
      source:      'Prosperity Fire Protection, LLC',
      account:     'chaseDebit',
      note:        pc.note || 'Weekly paycheck',
      received:    true,
      is_one_time: false,
    }

    const { error } = await sb.from('paychecks').insert([row])
    if (error) {
      warn(`Failed to insert ${pc.date}: ${error.message}`)
    } else {
      log(`${pc.date} — $${pc.amount.toFixed(2)}`)
      inserted++
    }
  }

  console.log(`\nInserted ${inserted} paycheck(s). Skipped ${skipped} duplicate(s).\n`)

  // Update paycheck default amount to $986 in settings
  console.log('--- Updating paycheck default amount to $986 ---')
  const { data: settingsRow, error: sErr } = await sb.from('settings').select('*').eq('id', 'singleton').single()
  if (sErr) {
    warn('Could not fetch settings: ' + sErr.message)
  } else {
    const existingPaycheckCfg = settingsRow?.paycheck_cfg || {}
    const updatedPaycheckCfg  = { ...existingPaycheckCfg, defaultAmount: 986 }
    const { error: updateErr } = await sb.from('settings').upsert(
      { id: 'singleton', paycheck_cfg: updatedPaycheckCfg },
      { onConflict: 'id' }
    )
    if (updateErr) warn('Failed to update settings: ' + updateErr.message)
    else log('settings: paycheck_cfg.defaultAmount updated to 986')
  }

  console.log('\n=== Done ===\n')
  console.log('Note: Chase balance was NOT modified. All inserted paychecks are historical records only.\n')
}

run().catch(err => { console.error('Fatal error:', err); process.exit(1) })
