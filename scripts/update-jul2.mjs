// Financial Hub — July 2 bulk update script
// Run: node scripts/update-jul2.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://upcxutjuqjiilwxmszgl.supabase.co',
  'sb_publishable_wAsZm4RDNGYnD70xBmlSrg_rqiGAGYu'
)

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

async function run() {
  const now = new Date().toISOString()
  let errors = 0

  const check = (label, { error }) => {
    if (error) { console.error(`✗ ${label}:`, error.message); errors++ }
    else console.log(`✓ ${label}`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Fix dates on existing TXU Electric / Amazon txns — logged as Jun 29,
  //    should be Jun 30
  // ─────────────────────────────────────────────────────────────────────────
  check('fix tx-j29-1 (TXU Electric) date -> Jun 30',
    await supabase.from('transactions').update({ date: '2026-06-30' }).eq('id', 'tx-j29-1')
  )
  check('fix tx-j29-2 (Amazon $12.97) date -> Jun 30',
    await supabase.from('transactions').update({ date: '2026-06-30' }).eq('id', 'tx-j29-2')
  )

  // ─────────────────────────────────────────────────────────────────────────
  // 2. INSERT missing transactions
  // ─────────────────────────────────────────────────────────────────────────
  const newTx = [
    { date: '2026-06-29', amount: 50.17, category: 'Health',   note: 'CVS Pharmacy' },
    { date: '2026-07-01', amount: 64.72, category: 'Shopping', note: 'Amazon' },
    { date: '2026-07-01', amount: 13.00, category: 'Shopping', note: 'Amazon' },
    { date: '2026-07-01', amount: 22.79, category: 'Shopping', note: 'Amazon' },
    { date: '2026-07-01', amount: 7.34,  category: 'Shopping', note: 'Amazon' },
    { date: '2026-07-01', amount: 9.43,  category: 'Shopping', note: 'Amazon' },
  ].map(t => ({
    id: id('tx'),
    type: 'out',
    account: 'chaseDebit',
    is_one_time: true,
    source: null,
    created_at: now,
    ...t,
  }))
  check(`insert missing transactions (${newTx.length})`, await supabase.from('transactions').insert(newTx))

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Correct the Jul 2 Apt Insurance auto-bill transaction: $19.17 -> $19.13
  // ─────────────────────────────────────────────────────────────────────────
  check('correct Apt Insurance Jul 2 transaction to $19.13',
    await supabase.from('transactions').update({ amount: 19.13 }).eq('id', 'auto-bill-bill-8-2026-07')
  )

  // ─────────────────────────────────────────────────────────────────────────
  // 4. BILLS — mark paid, update Apt Insurance amount going forward
  // ─────────────────────────────────────────────────────────────────────────
  check('mark TXU Electric paid this month',
    await supabase.from('bills').update({ paid_this_month: true }).eq('id', 'bill-3')
  )
  check('update Apt Insurance amount to $19.13, mark paid',
    await supabase.from('bills').update({ amount: 19.13, paid_this_month: true }).eq('id', 'bill-8')
  )

  // ─────────────────────────────────────────────────────────────────────────
  // 5. PENDING INCOME — add item labels (fixes desc/item field mismatch that
  //    was causing labels to not render at all), fix duplicate/format labels
  // ─────────────────────────────────────────────────────────────────────────
  const wifeOwesDetails = [
    { desc: 'Zelle from Father',                  amount: 150.00 },
    { desc: 'Zelle from Father',                  amount: 37.00 },
    { desc: 'Hot Topic',                          amount: 12.57 },
    { desc: 'Additional',                         amount: 25.00 },
    { desc: 'Hairstylist (Los Espejos Salon)',    amount: 145.00 },
    { desc: 'Half Price Books (Jun 14)',          amount: 27.38 },
    { desc: 'Five Below',                         amount: 11.99 },
    { desc: 'Marshalls',                          amount: 65.00 },
    { desc: 'Half Price Books (Jun 29)',          amount: 54.81 },
  ]
  check('update Wife Owes Me item labels',
    await supabase.from('pending_income').update({ details: wifeOwesDetails }).eq('id', 'wife-owes-me')
  )

  // ─────────────────────────────────────────────────────────────────────────
  // 6. ACCOUNTS — set Chase to $660.95
  // ─────────────────────────────────────────────────────────────────────────
  check('set Chase checking to $660.95',
    await supabase.from('accounts').upsert(
      { key: 'chaseDebit', balance: 660.95, updated_at: now },
      { onConflict: 'key' }
    )
  )

  // Cash is already $100 — skip

  console.log('\n─────────────────────────────────────')
  if (errors === 0) console.log('✅ All changes applied successfully.')
  else console.log(`⚠️  Done with ${errors} error(s). Check above.`)
}

run().catch(err => { console.error('Fatal:', err); process.exit(1) })
