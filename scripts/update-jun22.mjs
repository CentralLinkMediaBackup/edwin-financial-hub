// Financial Hub — June 22 bulk update script
// Run: node scripts/update-jun22.mjs

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
  // 1. DELETE the 4 auto-bill transactions (wrong dates — will re-add on Jun 22)
  // ─────────────────────────────────────────────────────────────────────────
  const autoIds = [
    'auto-bill-bill-5-2026-06',   // Spectrum Mobile Jun 19
    'auto-bill-bill-10-2026-06',  // Spotify Jun 21
    'auto-bill-bill-9-2026-06',   // Amazon Kindle Jun 21
    'auto-bill-bill-19-2026-06',  // Uber Subscription Jun 21
  ]
  for (const aid of autoIds) {
    check(`delete auto-bill ${aid}`, await supabase.from('transactions').delete().eq('id', aid))
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. INSERT Jun 19 transactions
  // ─────────────────────────────────────────────────────────────────────────
  const jun19 = [
    {
      id: id('tx'),
      date: '2026-06-19',
      type: 'out',
      amount: 96.45,
      category: 'Entertainment',
      note: 'Concert tickets for parents - Dad reimburses',
      account: 'chaseDebit',
      is_one_time: true,
      source: null,
      created_at: now,
    },
    {
      id: id('tx'),
      date: '2026-06-19',
      type: 'in',
      amount: 100.00,
      category: 'Income',
      note: 'Dad concert ticket reimbursement 1 of 4',
      account: 'chaseDebit',
      is_one_time: true,
      source: null,
      created_at: now,
    },
  ]
  check('insert Jun 19 transactions (2)', await supabase.from('transactions').insert(jun19))

  // ─────────────────────────────────────────────────────────────────────────
  // 3. INSERT Jun 22 transactions
  // ─────────────────────────────────────────────────────────────────────────
  const jun22 = [
    { date: '2026-06-22', type: 'out', amount: 14.06,  category: 'Entertainment', note: 'Spotify'         },
    { date: '2026-06-22', type: 'out', amount: 15.64,  category: 'Food',          note: 'Starbucks'       },
    { date: '2026-06-22', type: 'out', amount: 12.99,  category: 'Shopping',      note: 'SQ Dallas FFF'   },
    { date: '2026-06-22', type: 'out', amount: 25.44,  category: 'Shopping',      note: 'Dollar Tree'     },
    { date: '2026-06-22', type: 'out', amount: 19.46,  category: 'Shopping',      note: 'Burlington'      },
    { date: '2026-06-22', type: 'out', amount: 21.64,  category: 'Shopping',      note: 'Marshalls'       },
    { date: '2026-06-22', type: 'out', amount: 7.57,   category: 'Pet',           note: 'PetSmart'        },
    { date: '2026-06-22', type: 'out', amount: 110.29, category: 'Shopping',      note: 'Ross'            },
    { date: '2026-06-22', type: 'out', amount: 9.99,   category: 'Transport',     note: 'Uber One Membership' },
    { date: '2026-06-22', type: 'out', amount: 12.98,  category: 'Entertainment', note: 'Amazon Kindle'   },
    { date: '2026-06-22', type: 'out', amount: 10.14,  category: 'Food',          note: "McDonald's"      },
    { date: '2026-06-22', type: 'out', amount: 13.80,  category: 'Shopping',      note: 'Dollar Tree'     },
    { date: '2026-06-22', type: 'out', amount: 20.64,  category: 'Food',          note: "Domino's"        },
    { date: '2026-06-22', type: 'out', amount: 185.00, category: 'Bills',         note: 'Zelle to Dad — Car insurance downpayment $130 + iPhone bill $55 paid via dad' },
    { date: '2026-06-22', type: 'out', amount: 26.72,  category: 'Food',          note: 'Sonic'           },
    { date: '2026-06-22', type: 'out', amount: 96.45,  category: 'Entertainment', note: 'Don Omar Afterpay — Concert tickets - Dad reimburses' },
    { date: '2026-06-22', type: 'out', amount: 10.36,  category: 'Food',          note: 'Lone Star Markets' },
    { date: '2026-06-22', type: 'in',  amount: 242.76, category: 'Transfer',      note: 'Savings Transfer In' },
    { date: '2026-06-22', type: 'out', amount: 13.68,  category: 'Shopping',      note: 'Amazon Marketplace' },
    { date: '2026-06-22', type: 'in',  amount: 100.00, category: 'Income',        note: 'Zelle from Dad — concert reimbursement 1 of 4' },
    { date: '2026-06-22', type: 'out', amount: 25.00,  category: 'Transfer',      note: 'Savings Transfer Out' },
    { date: '2026-06-22', type: 'out', amount: 2.22,   category: 'Phone',         note: 'Spectrum Mobile' },
  ].map(t => ({
    id: id('tx'),
    account: 'chaseDebit',
    is_one_time: true,
    source: null,
    created_at: now,
    ...t,
  }))

  check(`insert Jun 22 transactions (${jun22.length})`, await supabase.from('transactions').insert(jun22))

  // ─────────────────────────────────────────────────────────────────────────
  // 4. BILLS — update Capital One CR
  // ─────────────────────────────────────────────────────────────────────────
  check('update Capital One CR — amount $104, unpaid',
    await supabase.from('bills').update({ amount: 104.00, paid_this_month: false }).eq('id', 'bill-11')
  )

  // ─────────────────────────────────────────────────────────────────────────
  // 5. BILLS — update iPhone Data (fixed due 19th, mark paid)
  // ─────────────────────────────────────────────────────────────────────────
  check('update iPhone Data — due_day 19, mark paid',
    await supabase.from('bills').update({
      due_day: 19,
      note: 'Payment method: Zelle to dad',
      paid_this_month: true,
    }).eq('id', 'bill-6')
  )

  // ─────────────────────────────────────────────────────────────────────────
  // 6. BILLS — add Car Insurance
  // ─────────────────────────────────────────────────────────────────────────
  check('insert Car Insurance bill',
    await supabase.from('bills').insert([{
      id: 'bill-car-insurance',
      name: 'Car Insurance',
      amount: 86.00,
      due_day: 5,
      frequency: 'monthly',
      is_active: true,
      category: 'Transport',
      note: 'Zelle to dad on the 5th — June was a $130 downpayment (logged as Jun 22 transaction)',
      paid_this_month: false,
    }])
  )

  // ─────────────────────────────────────────────────────────────────────────
  // 7. DEBTS — update Capital One minimum payment
  // ─────────────────────────────────────────────────────────────────────────
  check('update Capital One debt — min payment $104',
    await supabase.from('debts').update({ minimum_payment: 104.00 }).eq('id', 'debt-2')
  )

  // ─────────────────────────────────────────────────────────────────────────
  // 8. AFTERPAY — add Don Omar Concert
  // ─────────────────────────────────────────────────────────────────────────
  check('insert Don Omar Concert Afterpay',
    await supabase.from('afterpay_items').insert([{
      id: 'afterpay-don-omar',
      name: 'Don Omar Concert — Afterpay',
      total_amount: 385.80,
      payments: [
        { id: 'don-omar-p1', number: 1, amount: 96.45, status: 'paid',     dueDate: '2026-06-19', paidDate: '2026-06-19', note: 'Dad reimburses via Zelle' },
        { id: 'don-omar-p2', number: 2, amount: 96.45, status: 'upcoming', dueDate: '2026-07-03',                          note: 'Dad Zelles $100' },
        { id: 'don-omar-p3', number: 3, amount: 96.45, status: 'upcoming', dueDate: '2026-07-17',                          note: 'Dad Zelles $100' },
        { id: 'don-omar-p4', number: 4, amount: 96.45, status: 'final',    dueDate: '2026-07-31',                          note: 'Dad Zelles $100' },
      ],
    }])
  )

  // ─────────────────────────────────────────────────────────────────────────
  // 9. ACCOUNTS — set Chase to $559.09
  // ─────────────────────────────────────────────────────────────────────────
  check('set Chase checking to $559.09',
    await supabase.from('accounts').upsert(
      { key: 'chaseDebit', balance: 559.09, updated_at: now },
      { onConflict: 'key' }
    )
  )

  // Cash is already $100 — skip

  console.log('\n─────────────────────────────────────')
  if (errors === 0) console.log('✅ All changes applied successfully.')
  else console.log(`⚠️  Done with ${errors} error(s). Check above.`)
}

run().catch(err => { console.error('Fatal:', err); process.exit(1) })
