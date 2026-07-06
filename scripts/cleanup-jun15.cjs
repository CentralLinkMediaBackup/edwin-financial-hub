// Cleanup: remove old duplicate Jun 15 entries, move Amazon x3 to Jun 15, fix notes
// Run: node scripts/cleanup-jun15.cjs

const { createClient } = require('../node_modules/@supabase/supabase-js')
const sb = createClient('https://upcxutjuqjiilwxmszgl.supabase.co', 'sb_publishable_wAsZm4RDNGYnD70xBmlSrg_rqiGAGYu')

function log(msg)  { console.log('  ✓ ' + msg) }
function warn(msg) { console.warn('  ⚠ ' + msg) }

// Old duplicate IDs to delete (timestamp-style IDs and bad auto-bill)
const DELETE_IDS = [
  '1781557748036-hmm6vyl', // Car Payment $534.94 on Jun 15 (wrong date; Jun 16 has correct)
  '1781557748037-w6a95gk', // PetSmart $68.18 (dup of tx-j15-06)
  '1781557748038-n35xl2p', // Marshalls $84.37 (dup of tx-j15-10)
  '1781557748039-x08877t', // Amazon $1.98 (will be on Jun 15 via tx-j16-03 date update)
  '1781557748040-du5k79e', // Amazon $3.07 (same)
  '1781557748041-gydqssx', // Amazon $126.12 — WRONG AMOUNT, delete
  '1781557748042-8s5rd9o', // Amazon Marketplace $32.46 (dup of tx-j15-09)
  '1781557748043-1z64osf', // Amazon Prime $8.11 (dup of tx-j15-20)
  '1781557748044-hz7p42i', // Anthropic Claude Sub (dup of tx-j15-03)
  '1781557748045-q1qdo17', // Five Below $41 (dup of tx-j15-11)
  '1781557748046-kob0u9f', // Dollar Tree $17.11 (dup of tx-j15-01)
  '1781557748047-vprzxer', // Lone Star Markets $8.65 (extra — have 3x in tx-j15-02,14,15)
  '1781557748048-bsabf1d', // Lone Star Markets $8.65 (extra)
  '1781557748049-sidlkvq', // Lone Star Markets $8.65 (extra)
  '1781557748050-tu28nbe', // Starbucks $17.10 (dup of tx-j15-07)
  '1781557748051-dn33xn7', // Half Price Books $27.38 (dup of tx-j15-08)
  '1781557748052-37uh9ij', // Sonic $28 (dup of tx-j15-12)
  '1781557748053-36de997', // ATM Withdrawal $180 — WRONG (should be $80 + $100 separately)
  '1781557748054-vyj4ji4', // ATM Deposit $60 (dup of tx-j15-19)
  '1781557748055-kficsld', // Savings transfer in (dup of tx-j15-18)
  '1781557748056-38ttg7g', // Savings transfer out (dup of tx-j15-13)
  'auto-bill-bill-13-2026-06', // Car Payment auto-deducted on Jun 15 — Jun 16 has correct entry
]

async function run() {
  console.log('\n=== Jun 15 Cleanup + Amazon x3 Date Fix ===\n')

  // ── 1. Delete old duplicate entries ─────────────────────────────────────────
  console.log('--- Deleting old duplicate entries ---')
  const { error: delErr } = await sb.from('transactions').delete().in('id', DELETE_IDS)
  if (delErr) warn('Delete failed: ' + delErr.message)
  else log(`Deleted ${DELETE_IDS.length} old/duplicate entries`)

  // ── 2. Move Amazon x3 from Jun 16 → Jun 15 (latest user spec) ─────────────
  console.log('\n--- Moving Amazon x3 to Jun 15 ---')
  const AMAZON_IDS = ['tx-j16-01', 'tx-j16-02', 'tx-j16-03']
  for (const id of AMAZON_IDS) {
    const { error } = await sb.from('transactions').update({ date: '2026-06-15' }).eq('id', id)
    if (error) warn(`Failed to move ${id}: ${error.message}`)
    else log(`${id}: date updated to 2026-06-15`)
  }

  // ── 3. Fix notes to match latest user spec ────────────────────────────────
  console.log('\n--- Fixing transaction notes ---')
  const NOTE_FIXES = [
    { id: 'tx-j15-03',  note: 'Anthropic Claude Pro Sub' },
    { id: 'tx-j17-api', note: 'Anthropic API Credits' },
  ]
  for (const { id, note } of NOTE_FIXES) {
    const { error } = await sb.from('transactions').update({ note }).eq('id', id)
    if (error) warn(`Failed to fix note for ${id}: ${error.message}`)
    else log(`${id}: note → "${note}"`)
  }

  // ── 4. Final verification ─────────────────────────────────────────────────
  console.log('\n--- Final Jun 15-19 transaction list ---')
  const { data: rows } = await sb
    .from('transactions')
    .select('id,date,type,amount,note,account')
    .gte('date', '2026-06-15')
    .order('date')
    .order('created_at')
  for (const t of (rows || [])) {
    const sign = t.type === 'in' ? '+' : '-'
    console.log(`  ${t.date}  ${sign}$${Number(t.amount).toFixed(2).padStart(7)}  ${(t.note||'').padEnd(35)}  [${t.account}]  (${t.id})`)
  }
  console.log(`\n  Total Jun 15-19: ${rows?.length} transactions`)

  // Jun 15 count check
  const jun15 = rows?.filter(r => r.date === '2026-06-15') || []
  console.log(`  Jun 15: ${jun15.length} entries (expected 23)`)

  console.log('\n=== Done ===\n')
}

run().catch(err => { console.error('Fatal:', err); process.exit(1) })
