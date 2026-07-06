// Data update script — June 15, 2026
// Run: node scripts/update-june15.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://upcxutjuqjiilwxmszgl.supabase.co',
  'sb_publishable_wAsZm4RDNGYnD70xBmlSrg_rqiGAGYu'
)

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function run() {
  const errors = []

  // ─── 1. ACCOUNT BALANCES ──────────────────────────────────────────────────
  console.log('\n1. Updating account balances…')

  const { error: chaseErr } = await supabase
    .from('accounts')
    .upsert({ key: 'chaseDebit', balance: -11.28, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (chaseErr) { console.error('  ✗ Chase:', chaseErr.message); errors.push('Chase balance') }
  else console.log('  ✓ Chase checking → -$11.28')

  const { error: cashErr } = await supabase
    .from('accounts')
    .upsert({ key: 'cash', balance: 120.00, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (cashErr) { console.error('  ✗ Cash:', cashErr.message); errors.push('Cash balance') }
  else console.log('  ✓ Cash (Wallet) → $120.00')

  // ─── 2. EARN IN — MARK ALL CLEAR / SUSPENDED ─────────────────────────────
  console.log('\n2. Clearing Earn In…')

  // Mark all active earnin cycles as repaid
  const { error: einErr } = await supabase
    .from('earnin_logs')
    .update({ status: 'repaid' })
    .eq('status', 'active')
  if (einErr) { console.error('  ✗ Earn In update:', einErr.message); errors.push('EarnIn status') }
  else console.log('  ✓ All active EarnIn cycles marked repaid')

  // Verify
  const { data: einLogs } = await supabase.from('earnin_logs').select('*').order('created_at', { ascending: false }).limit(5)
  console.log('  Current EarnIn logs:', einLogs?.map(l => `${l.cycle_start_date} → ${l.status}`).join(', ') || 'none')

  // ─── 3. CAR PAYMENT BILL UPDATE ───────────────────────────────────────────
  console.log('\n3. Updating car payment bill…')

  // Find the car payment bill
  const { data: bills } = await supabase.from('bills').select('*')
  const carBill = bills?.find(b =>
    b.name?.toLowerCase().includes('car') ||
    b.name?.toLowerCase().includes('westlake') ||
    b.name?.toLowerCase().includes('auto') ||
    b.name?.toLowerCase().includes('aci') ||
    b.amount === 530 || b.amount === 530.00
  )

  if (carBill) {
    const { error: carBillErr } = await supabase
      .from('bills')
      .update({ amount: 534.94 })
      .eq('id', carBill.id)
    if (carBillErr) { console.error('  ✗ Car bill update:', carBillErr.message); errors.push('Car bill') }
    else console.log(`  ✓ Car bill "${carBill.name}" updated: $${carBill.amount} → $534.94`)
  } else {
    console.log('  ! No car bill found at $530 — listing all bills:')
    bills?.forEach(b => console.log(`    - ${b.name}: $${b.amount} (id: ${b.id})`))
  }

  // Find and update the car payment transaction logged at -$530.00
  const { data: txns } = await supabase
    .from('transactions')
    .select('*')
    .eq('amount', 530)
    .eq('type', 'out')
    .order('date', { ascending: false })
    .limit(10)

  if (txns?.length) {
    // Find most recent one
    const carTx = txns[0]
    const { error: txErr } = await supabase
      .from('transactions')
      .update({ amount: 534.94, note: carTx.note || 'ACI Westlake Car Payment' })
      .eq('id', carTx.id)
    if (txErr) { console.error('  ✗ Car tx update:', txErr.message); errors.push('Car tx') }
    else console.log(`  ✓ Car payment transaction updated: $530.00 → $534.94 (${carTx.date}, "${carTx.note}")`)
  } else {
    console.log('  ! No $530 outgoing transaction found — checking all recent outgoing transactions:')
    const { data: recent } = await supabase.from('transactions').select('*').eq('type','out').order('date', { ascending: false }).limit(10)
    recent?.forEach(t => console.log(`    - ${t.date}: ${t.note || t.category} — $${t.amount}`))
  }

  // ─── 4. ADD MISSING TRANSACTIONS ─────────────────────────────────────────
  console.log('\n4. Adding missing transactions…')

  const newTransactions = [
    // Jun 13
    {
      id: id(), date: '2026-06-13', type: 'out', amount: 47.35,
      category: 'Health', note: 'Chewy.com (Marcus Medicine)',
      account: 'chaseDebit', is_one_time: false,
      created_at: '2026-06-13T12:00:00.000Z',
    },
    {
      id: id(), date: '2026-06-13', type: 'out', amount: 23.79,
      category: 'Food', note: "Domino's",
      account: 'chaseDebit', is_one_time: false,
      created_at: '2026-06-13T18:00:00.000Z',
    },
    // Jun 12
    {
      id: id(), date: '2026-06-12', type: 'out', amount: 155.99,
      category: 'Earn In', note: 'Earn In Repayment (FINAL)',
      account: 'chaseDebit', is_one_time: true,
      created_at: '2026-06-12T10:00:00.000Z',
    },
    {
      id: id(), date: '2026-06-12', type: 'in', amount: 813.77,
      category: 'Income', note: 'Prosperity Fire Payroll',
      account: 'chaseDebit', is_one_time: false,
      created_at: '2026-06-12T09:00:00.000Z',
    },
    {
      id: id(), date: '2026-06-12', type: 'in', amount: 203.44,
      category: 'Transfer', note: 'Savings Transfer In',
      account: 'chaseDebit', is_one_time: false,
      created_at: '2026-06-12T11:00:00.000Z',
    },
    {
      id: id(), date: '2026-06-12', type: 'out', amount: 10.30,
      category: 'Business', note: 'Anthropic API Top Up',
      account: 'chaseDebit', is_one_time: false,
      created_at: '2026-06-12T14:00:00.000Z',
    },
    // Jun 11
    {
      id: id(), date: '2026-06-11', type: 'out', amount: 173.89,
      category: 'Food', note: 'TST Pesca (Anniversary Dinner)',
      account: 'chaseDebit', is_one_time: true,
      created_at: '2026-06-11T19:00:00.000Z',
    },
    {
      id: id(), date: '2026-06-11', type: 'out', amount: 17.73,
      category: 'Food', note: "McDonald's",
      account: 'chaseDebit', is_one_time: false,
      created_at: '2026-06-11T13:00:00.000Z',
    },
    {
      id: id(), date: '2026-06-11', type: 'out', amount: 14.07,
      category: 'Shopping', note: 'Amazon Purchase for Wife',
      account: 'chaseDebit', is_one_time: true,
      created_at: '2026-06-11T10:00:00.000Z',
    },
    {
      id: id(), date: '2026-06-11', type: 'out', amount: 37.50,
      category: 'Shopping', note: 'Afterpay Final Payment',
      account: 'chaseDebit', is_one_time: false,
      created_at: '2026-06-11T15:00:00.000Z',
    },
    {
      id: id(), date: '2026-06-11', type: 'out', amount: 134.77,
      category: 'Bills', note: 'ETAMU College (May Payment)',
      account: 'chaseDebit', is_one_time: false,
      created_at: '2026-06-11T16:00:00.000Z',
    },
  ]

  // Check which of these already exist (to avoid dupes)
  const { data: existingTxns } = await supabase
    .from('transactions')
    .select('note, date, amount, type')
    .gte('date', '2026-06-11')
    .lte('date', '2026-06-13')

  const toInsert = newTransactions.filter(nt => {
    const exists = existingTxns?.some(et =>
      et.date === nt.date &&
      Math.abs(Number(et.amount) - nt.amount) < 0.01 &&
      et.type === nt.type
    )
    if (exists) {
      console.log(`  ~ Skipping duplicate: ${nt.date} ${nt.note} $${nt.amount}`)
      return false
    }
    return true
  })

  if (toInsert.length > 0) {
    const { error: txInsertErr } = await supabase
      .from('transactions')
      .insert(toInsert)
    if (txInsertErr) {
      console.error('  ✗ Insert transactions:', txInsertErr.message)
      errors.push('Transactions insert')
    } else {
      toInsert.forEach(t => {
        const sign = t.type === 'in' ? '+' : '-'
        console.log(`  ✓ ${t.date} — ${t.note} — ${sign}$${t.amount}`)
      })
    }
  } else {
    console.log('  ! All transactions already exist — none inserted')
  }

  // ─── 5. WIFE OWES ME — PENDING INCOME ────────────────────────────────────
  console.log('\n5. Updating Wife Owes Me pending income…')

  // Check current pending income
  const { data: pendingRows } = await supabase
    .from('pending_income')
    .select('*')
  console.log('  Current pending income rows:', pendingRows?.map(p => `${p.label} ($${p.amount})`).join(', ') || 'none')

  // Delete old wife-owes entries and replace with fresh one
  const wifeIds = pendingRows
    ?.filter(p =>
      p.label?.toLowerCase().includes('wife') ||
      p.label?.toLowerCase().includes('owes') ||
      p.label?.toLowerCase().includes('zelle')
    )
    .map(p => p.id) || []

  if (wifeIds.length) {
    await supabase.from('pending_income').delete().in('id', wifeIds)
    console.log(`  ✓ Removed ${wifeIds.length} old wife/owes entries`)
  }

  const wifeDetails = [
    { item: 'Zelle from Father', amount: 150.00 },
    { item: 'Zelle from Father (2)', amount: 37.00 },
    { item: 'Hot Topic', amount: 12.57 },
    { item: 'Additional', amount: 25.00 },
    { item: 'Hairstylist (Los Espejos Salon)', amount: 145.00 },
    { item: 'Half Price Books', amount: 27.38 },
    { item: 'Five Below', amount: 11.99 },
    { item: 'Marshalls', amount: 65.00 },
  ]

  const { error: wifeErr } = await supabase
    .from('pending_income')
    .upsert([{
      id:         'wife-owes-me',
      label:      "Wife Owes Me",
      amount:     473.94,
      details:    wifeDetails,
      note:       'Awaiting reimbursement — not yet received',
      status:     'pending',
      created_at: '2026-06-15',
    }], { onConflict: 'id' })

  if (wifeErr) {
    // Try insert instead
    const { error: wifeInsertErr } = await supabase
      .from('pending_income')
      .insert([{
        id:         'wife-owes-me-' + Date.now(),
        label:      "Wife Owes Me",
        amount:     473.94,
        details:    wifeDetails,
        note:       'Awaiting reimbursement — not yet received',
        status:     'pending',
        created_at: '2026-06-15',
      }])
    if (wifeInsertErr) { console.error('  ✗ Wife pending income:', wifeInsertErr.message); errors.push('Pending income') }
    else console.log('  ✓ Wife Owes Me created — $473.94 (8 items)')
  } else {
    console.log('  ✓ Wife Owes Me upserted — $473.94 (8 items)')
  }

  // ─── SUMMARY ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════')
  if (errors.length === 0) {
    console.log('✅ All updates applied successfully!')
  } else {
    console.log(`⚠️  Completed with ${errors.length} error(s):`, errors.join(', '))
  }

  // Final balance check
  const { data: finalAccounts } = await supabase.from('accounts').select('*')
  console.log('\nFinal account balances:')
  finalAccounts?.forEach(a => console.log(`  ${a.key}: $${Number(a.balance).toFixed(2)}`))
}

run().catch(console.error)
