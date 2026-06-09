import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { formatCurrency } from '../../lib/formatters'
import { format, addDays, parseISO, isSameMonth } from 'date-fns'
import { callClaudeProxy } from '../../lib/claude'

const CHAT_STORAGE_KEY  = 'eb-financial-hub-chat'
const USAGE_STORAGE_KEY = 'eb-financial-hub-ai-usage'
const DAILY_LIMIT = 50

const SUGGESTION_CHIPS = [
  'Can I eat out tonight?',
  'Log a transaction',
  "When's my next bill?",
  'Am I safe this week?',
]

// ─── Daily usage helpers (localStorage) ──────────────────────────────────────
function getUsageToday() {
  try {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY)
    if (!raw) return { count: 0, date: new Date().toDateString() }
    const parsed = JSON.parse(raw)
    if (parsed.date !== new Date().toDateString()) return { count: 0, date: new Date().toDateString() }
    return parsed
  } catch {
    return { count: 0, date: new Date().toDateString() }
  }
}

function incrementUsage() {
  const usage = getUsageToday()
  const updated = { count: usage.count + 1, date: usage.date }
  localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(updated))
  return updated.count
}

function isLimitReached() {
  return getUsageToday().count >= DAILY_LIMIT
}

// ─── Claude Tool Declarations ─────────────────────────────────────────────────
const CLAUDE_TOOLS = [
  {
    name: 'log_transaction',
    description: 'Log a financial transaction (expense or income) to the expenses tracker',
    input_schema: {
      type: 'object',
      properties: {
        amount:   { type: 'number',  description: 'Amount in dollars (positive number)' },
        type:     { type: 'string',  description: '"in" for income, "out" for expense' },
        category: { type: 'string',  description: 'Category: Food, Bills, Transport, Entertainment, Health, Other' },
        note:     { type: 'string',  description: 'Description of the transaction' },
        account:  { type: 'string',  description: 'Account: chaseDebit, capitalOneDebit, cashApp, paypal' },
        date:     { type: 'string',  description: 'Date in YYYY-MM-DD format. Use today if not specified.' },
      },
      required: ['amount', 'type', 'category'],
    },
  },
  {
    name: 'update_transaction',
    description: 'Edit an existing transaction — change amount, category, note, date, or account',
    input_schema: {
      type: 'object',
      properties: {
        id:       { type: 'string', description: 'Transaction ID to update' },
        amount:   { type: 'number', description: 'New amount in dollars' },
        type:     { type: 'string', description: '"in" or "out"' },
        category: { type: 'string', description: 'New category' },
        note:     { type: 'string', description: 'New note/description' },
        account:  { type: 'string', description: 'New account key' },
        date:     { type: 'string', description: 'New date YYYY-MM-DD' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_transaction',
    description: 'Delete a transaction by ID',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Transaction ID to delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_account_balance',
    description: "Update the balance of one of the user's accounts",
    input_schema: {
      type: 'object',
      properties: {
        account: { type: 'string', description: 'Account key: chaseDebit, capitalOneDebit, cashApp, paypal' },
        balance: { type: 'number', description: 'New balance in dollars' },
      },
      required: ['account', 'balance'],
    },
  },
  {
    name: 'log_one_time_income',
    description: 'Log a one-time income payment (bonus, client payment, etc.)',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Income amount in dollars' },
        source: { type: 'string', description: 'Source: CLM Client Payment, Gift, Tax Return, Side Income, Other' },
        note:   { type: 'string', description: 'Description' },
        date:   { type: 'string', description: 'Date YYYY-MM-DD' },
      },
      required: ['amount', 'source'],
    },
  },
  {
    name: 'update_pending_income',
    description: "Update a pending income entry — change amount, add/edit breakdown items, or update the note. Use this to add a new line item to Wife's Due or any pending income entry.",
    input_schema: {
      type: 'object',
      properties: {
        id:      { type: 'string', description: 'Pending income ID (e.g. "pending-1")' },
        amount:  { type: 'number', description: 'New total amount in dollars' },
        details: {
          type: 'array',
          description: 'Full updated breakdown array — include ALL existing items plus any new ones',
          items: {
            type: 'object',
            properties: {
              desc:   { type: 'string' },
              amount: { type: 'number' },
            },
          },
        },
        note:   { type: 'string', description: 'Updated note' },
        label:  { type: 'string', description: 'Updated label/title' },
      },
      required: ['id'],
    },
  },
  {
    name: 'mark_pending_income_paid',
    description: "Mark a pending income entry as received/paid — adds the amount to Chase balance and marks it paid",
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Pending income ID to mark as paid' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_bill',
    description: 'Update a bill — change amount, due day, name, or mark it paid/unpaid this month',
    input_schema: {
      type: 'object',
      properties: {
        id:            { type: 'string',  description: 'Bill ID to update' },
        amount:        { type: 'number',  description: 'New bill amount' },
        dueDay:        { type: 'number',  description: 'New due day of month (1-31)' },
        name:          { type: 'string',  description: 'New bill name' },
        paidThisMonth: { type: 'boolean', description: 'true to mark paid this month, false to unmark' },
        isActive:      { type: 'boolean', description: 'true to activate, false to deactivate' },
      },
      required: ['id'],
    },
  },
  {
    name: 'mark_earnin_step',
    description: 'Mark an Earn In step as taken or untaken for the current cycle',
    input_schema: {
      type: 'object',
      properties: {
        day:   { type: 'string',  description: 'Day key: fri, sat, sun, mon' },
        taken: { type: 'boolean', description: 'true to mark as taken, false to unmark' },
      },
      required: ['day', 'taken'],
    },
  },
  {
    name: 'log_savings_deposit',
    description: 'Log a deposit to a savings goal',
    input_schema: {
      type: 'object',
      properties: {
        goalId: { type: 'string', description: 'ID of the savings goal' },
        amount: { type: 'number', description: 'Amount to deposit' },
      },
      required: ['goalId', 'amount'],
    },
  },
  {
    name: 'update_debt',
    description: 'Update a debt entry — change balance, minimum payment, APR, or name',
    input_schema: {
      type: 'object',
      properties: {
        id:             { type: 'string', description: 'Debt ID to update' },
        totalBalance:   { type: 'number', description: 'New total balance owed' },
        minimumPayment: { type: 'number', description: 'New minimum monthly payment' },
        apr:            { type: 'number', description: 'New APR percentage' },
        name:           { type: 'string', description: 'New debt name/label' },
      },
      required: ['id'],
    },
  },
]

// ─── buildSystemPrompt ────────────────────────────────────────────────────────
// Called via useStore.getState() on every send — always fresh, never cached.
function buildSystemPrompt(store) {
  const today    = new Date()
  const todayStr = format(today, 'EEEE, MMMM d yyyy')

  // ── Accounts ──────────────────────────────────────────────────────────────
  const accounts       = store.accounts || {}
  const chaseDebit     = accounts.chaseDebit      || 0
  const capitalOne     = accounts.capitalOneDebit || 0
  const cashApp        = accounts.cashApp         || 0
  const paypal         = accounts.paypal          || 0
  const totalBalance   = chaseDebit + capitalOne + cashApp + paypal

  // ── Settings ────────────────────────────────────────────────────────────────
  const settings       = store.settings    || {}
  const earnInSettings = settings.earnIn   || {}
  const tiltSettings   = settings.tilt     || {}
  const pcSettings     = settings.paycheck || {}
  const tiltMaxCredit  = tiltSettings.maxCredit   || 400
  const tiltFee        = tiltSettings.instantFee  || 12

  // ── EarnIn ──────────────────────────────────────────────────────────────────
  const activeEarnIn = (store.earnInLogs || []).find(l => l.status === 'active')
  const pastEarnIn   = (store.earnInLogs || []).filter(l => l.status !== 'active')
  const EARNIN_DAYS  = [
    { key: 'fri', label: 'Friday',   offset: 0 },
    { key: 'sat', label: 'Saturday', offset: 1 },
    { key: 'sun', label: 'Sunday',   offset: 2 },
    { key: 'mon', label: 'Monday',   offset: 3 },
  ]

  let earnInSection = 'EARN IN — CURRENT CYCLE: No active cycle.'
  let earnInRepayDate = null
  let earnInRepayAmt  = 0
  if (activeEarnIn) {
    const cycleStart = parseISO(activeEarnIn.cycleStartDate)
    earnInRepayDate  = format(addDays(cycleStart, 7), 'yyyy-MM-dd')
    earnInRepayAmt   = activeEarnIn.repaymentAmount || earnInSettings.repaymentAmount || 521.96
    let totalTaken   = 0
    const dayLines   = EARNIN_DAYS.map(d => {
      const taken = activeEarnIn[`${d.key}_taken`]
      const amt   = activeEarnIn.amounts?.[d.key] ?? earnInSettings[d.key] ?? 0
      const date  = format(addDays(cycleStart, d.offset), 'MMM d')
      if (taken) totalTaken += amt
      return `  - ${d.label} ${date}: ${taken ? `TAKEN +$${amt.toFixed(2)}` : `not taken ($${amt.toFixed(2)} available)`}`
    }).join('\n')
    const net = totalTaken - earnInRepayAmt
    earnInSection = `EARN IN — CURRENT CYCLE:
  Cycle Start: ${format(cycleStart, 'EEEE, MMM d yyyy')}
  Repayment Due: ${format(parseISO(earnInRepayDate), 'EEEE, MMM d yyyy')} — $${earnInRepayAmt.toFixed(2)}
  Status: Active
${dayLines}
  Total Taken This Cycle: $${totalTaken.toFixed(2)}
  Running Net (taken - repayment): $${net.toFixed(2)} ${net < 0 ? '(net loss)' : '(net gain)'}`
  }
  if (pastEarnIn.length > 0) {
    const hist = pastEarnIn.slice(0, 3).map(l => {
      const t = EARNIN_DAYS.reduce((s, d) => s + (l[`${d.key}_taken`] ? (l.amounts?.[d.key] || 0) : 0), 0)
      return `  - Cycle ${l.cycleStartDate}: took $${t.toFixed(2)}, repayment $${l.repaymentAmount || 521.96}, status: ${l.status}`
    }).join('\n')
    earnInSection += `\n\nEARN IN — PAST CYCLES (most recent 3):\n${hist}`
  }

  // ── TILT ────────────────────────────────────────────────────────────────────
  const activeTilt = (store.tiltLogs || []).find(l => l.status === 'active')
  const pastTilts  = (store.tiltLogs || []).filter(l => l.status !== 'active')
  let tiltSection  = activeTilt
    ? `TILT STATUS: ACTIVE
  Amount Used: $${activeTilt.amountUsed} / $${tiltMaxCredit}
  Amount Available: $${tiltMaxCredit - activeTilt.amountUsed}
  Repayment Due: ${activeTilt.repaymentDate}
  Repayment Plan: Option ${activeTilt.repaymentOption || 'A'}
  Delivery: ${activeTilt.instantDelivery ? `Instant (fee -$${activeTilt.instantFee || tiltFee})` : 'Standard'}
  Note: ${activeTilt.note || 'N/A'}`
    : `TILT STATUS: CLEAR — $${tiltMaxCredit} available, $0 owed`
  tiltSection += pastTilts.length > 0
    ? '\nTILT HISTORY:\n' + pastTilts.slice(0, 5).map(l =>
        `  - ${l.createdAt?.slice(0,10) || '?'}: $${l.amountUsed} used, repaid ${l.repaidAt?.slice(0,10) || 'unknown'}`
      ).join('\n')
    : '\nTILT HISTORY: No past advances.'

  // ── Afterpay ────────────────────────────────────────────────────────────────
  const afterpayItems = store.afterpayItems || []
  let totalAfterRemaining = 0
  let nextApDate = null
  let nextApAmt  = 0
  const afterpaySection = afterpayItems.length > 0
    ? afterpayItems.map(item => {
        const pmts      = item.payments || []
        const remaining = pmts.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0)
        totalAfterRemaining += remaining
        const next = pmts.filter(p => p.status !== 'paid').sort((a,b) => a.dueDate.localeCompare(b.dueDate))[0]
        if (next && (!nextApDate || next.dueDate < nextApDate)) { nextApDate = next.dueDate; nextApAmt = next.amount }
        return `  ${item.name} | Total: $${(pmts.reduce((s,p)=>s+p.amount,0)).toFixed(2)} | Remaining: $${remaining.toFixed(2)}\n`
          + pmts.map(p => `    Payment ${p.number}: $${p.amount.toFixed(2)} on ${p.dueDate} — ${p.status === 'paid' ? `PAID ${p.paidDate||''}` : 'UPCOMING'}`).join('\n')
      }).join('\n\n')
    : '  No active Afterpay plans.'

  // ── Bills / Subscriptions ────────────────────────────────────────────────────
  const allBills    = store.bills || []
  const activeBills = allBills.filter(b => b.isActive)
  const monthlyBills = activeBills.filter(b => b.frequency === 'monthly')
  const monthlyTotal = monthlyBills.reduce((s, b) => s + b.amount, 0)
  const todayDay = today.getDate()
  const sortedBills = [...activeBills].sort((a, b) => {
    const dA = a.dueDay != null ? (a.dueDay >= todayDay ? a.dueDay - todayDay : 32 - todayDay + a.dueDay) : 999
    const dB = b.dueDay != null ? (b.dueDay >= todayDay ? b.dueDay - todayDay : 32 - todayDay + b.dueDay) : 999
    return dA - dB
  })
  const nextBill = sortedBills.find(b => b.dueDay != null)
  const billLines = activeBills.map(b => {
    const yr = today.getFullYear(); const mo = today.getMonth()
    const nextDue = b.dueDay
      ? (b.dueDay >= todayDay
          ? format(new Date(yr, mo,     b.dueDay), 'MMM d')
          : format(new Date(yr, mo + 1, b.dueDay), 'MMM d'))
      : 'Flexible'
    return `  - [id: ${b.id}] ${b.name} (${b.category}): $${b.amount.toFixed(2)} | ${b.frequency} | due ${nextDue}${b.paidThisMonth ? ' PAID THIS MONTH' : ''}`
  }).join('\n')

  // ── Paychecks ────────────────────────────────────────────────────────────────
  const allPaychecks = store.paychecks || []
  const in30days = addDays(today, 30)
  const upcomingPc = allPaychecks
    .filter(p => { try { const d=parseISO(p.date); return d>=today && d<=in30days && !p.isOneTime } catch{return false} })
    .sort((a,b) => a.date.localeCompare(b.date))
  const pastPc = allPaychecks
    .filter(p => { try { return parseISO(p.date)<today && !p.isOneTime } catch{return false} })
    .sort((a,b) => b.date.localeCompare(a.date)).slice(0, 8)
  const projectedPcIncome = upcomingPc.reduce((s,p) => s+p.amount, 0)
  const nextPc = upcomingPc[0]
  const oneTimeTxs = (store.transactions||[]).filter(t => t.isOneTime && t.type==='in')

  // ── Transactions ─────────────────────────────────────────────────────────────
  const allTxs = store.transactions || []
  const monthTxs = allTxs.filter(t => { try { return isSameMonth(parseISO(t.date), today) } catch{return false} })
  const monthIn  = monthTxs.filter(t=>t.type==='in').reduce((s,t)=>s+t.amount, 0)
  const monthOut = monthTxs.filter(t=>t.type==='out').reduce((s,t)=>s+t.amount, 0)
  const catMap   = {}
  monthTxs.filter(t=>t.type==='out').forEach(t => { catMap[t.category||'Other'] = (catMap[t.category||'Other']||0)+t.amount })
  const catLines = Object.entries(catMap).sort((a,b)=>b[1]-a[1])
    .map(([c,a])=>`  - ${c}: $${a.toFixed(2)}`).join('\n') || '  - None'
  const recentTxLines = [...allTxs].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,15)
    .map(t=>`  - ${t.date} | ${t.type==='in'?'+':'-'}$${t.amount.toFixed(2)} | ${t.category} | ${t.note||'—'}`).join('\n')

  // ── Pending Income ────────────────────────────────────────────────────────────
  const pendingIncome = store.pendingIncome || []
  const pendingLines = pendingIncome.length > 0
    ? pendingIncome.map(p =>
        `  - [id: ${p.id}] ${p.label}: $${p.amount.toFixed(2)} — ${p.status==='paid'?'PAID (counted in balance)':'PENDING — NOT in balance yet'}\n`
        + `    Breakdown: ${(p.details||[]).map(d=>`${d.desc} $${Number(d.amount).toFixed(2)}`).join(', ')}\n`
        + `    Note: ${p.note||''}`
      ).join('\n')
    : '  - None'

  // ── Debts ────────────────────────────────────────────────────────────────────
  const debts    = store.debts || []
  const totalDebt = debts.reduce((s,d)=>s+d.totalBalance, 0)
  const debtLines = debts.map(d => {
    const months = d.minimumPayment>0 ? Math.ceil(d.totalBalance/d.minimumPayment) : '∞'
    return `  - [id: ${d.id}] ${d.name}: $${d.totalBalance.toFixed(2)} balance | $${d.minimumPayment}/mo min | APR ${d.apr||0}% | ~${months} mo payoff | ${(d.paymentHistory||[]).length} payments logged`
  }).join('\n') || '  - No debts logged'

  // ── Savings ──────────────────────────────────────────────────────────────────
  const savingsGoals = store.savingsGoals || []
  const totalSaved   = savingsGoals.reduce((s,g)=>s+(g.currentAmount||0), 0)
  const savingsLines = savingsGoals.length > 0
    ? savingsGoals.map(g => {
        const pct = g.targetAmount>0 ? Math.round((g.currentAmount/g.targetAmount)*100) : 0
        return `  - ${g.name}: $${(g.currentAmount||0).toFixed(2)} / $${(g.targetAmount||0).toFixed(2)} (${pct}%) | Need $${Math.max(0,(g.targetAmount||0)-(g.currentAmount||0)).toFixed(2)} more${g.targetDate?` | Target: ${g.targetDate}`:''}`
      }).join('\n')
    : '  - No savings goals'

  // ── 30-Day Projected Daily Balance ────────────────────────────────────────────
  const eventMap = {}
  const addEvent = (ds, label, amount) => {
    if (!eventMap[ds]) eventMap[ds] = []
    eventMap[ds].push({ label, amount })
  }

  // Paychecks
  upcomingPc.forEach(p => addEvent(p.date, `Paycheck (${p.source||'Employment'})`, +p.amount))

  // Bills — monthly only, current + next month
  const yr = today.getFullYear(); const mo = today.getMonth()
  activeBills.filter(b => b.dueDay && b.frequency==='monthly').forEach(b => {
    addEvent(format(new Date(yr, mo,     b.dueDay), 'yyyy-MM-dd'), `Bill: ${b.name}`, -b.amount)
    addEvent(format(new Date(yr, mo + 1, b.dueDay), 'yyyy-MM-dd'), `Bill: ${b.name}`, -b.amount)
  })

  // EarnIn repayment (already taken days are past; repayment is upcoming)
  if (activeEarnIn && earnInRepayDate) addEvent(earnInRepayDate, 'EarnIn Repayment', -earnInRepayAmt)

  // TILT
  if (activeTilt) addEvent(activeTilt.repaymentDate, 'TILT Repayment', -activeTilt.amountUsed)

  // Afterpay
  afterpayItems.forEach(item => {
    ;(item.payments||[]).filter(p=>p.status!=='paid').forEach(p => addEvent(p.dueDate, `Afterpay: ${item.name} #${p.number}`, -p.amount))
  })

  // Groceries: -$60 every Sunday
  for (let i=0; i<=30; i++) {
    const d = addDays(today, i)
    if (d.getDay()===0) addEvent(format(d,'yyyy-MM-dd'), 'Groceries (weekly Sun)', -60)
  }

  // Gas: -$20 biweekly (day 14 and 28)
  ;[14,28].forEach(n => addEvent(format(addDays(today,n),'yyyy-MM-dd'), 'Gas (biweekly)', -20))

  // Pending income — only if already marked paid
  pendingIncome.forEach(p => {
    if (p.status==='paid') addEvent(format(today,'yyyy-MM-dd'), p.label, +p.amount)
  })

  // Run projection
  let runBal  = totalBalance
  let lowestBal  = totalBalance
  let lowestDate = format(today,'yyyy-MM-dd')
  const projLines = []
  for (let i=0; i<=30; i++) {
    const d      = addDays(today, i)
    const ds     = format(d,'yyyy-MM-dd')
    const lbl    = format(d,'MMM d (EEE)')
    const evs    = eventMap[ds] || []
    let delta    = 0
    const descs  = evs.map(e => { delta+=e.amount; return `${e.amount>=0?'+':'-'}$${Math.abs(e.amount).toFixed(2)} ${e.label}` })
    runBal      += delta
    if (runBal < lowestBal) { lowestBal = runBal; lowestDate = ds }
    const warn   = runBal < 20 ? ' *** BELOW $20 BUFFER ***' : runBal < 100 ? ' (LOW)' : ''
    projLines.push(
      descs.length
        ? `  ${lbl}: ${descs.join(' | ')} → $${runBal.toFixed(2)}${warn}`
        : `  ${lbl}: $${runBal.toFixed(2)}`
    )
  }

  return `You are Edwin Bernal's personal AI financial assistant inside his Financial Hub app.
Today is ${todayStr}. All data below is read live at the moment this message is sent.

ACCOUNT BALANCES
  Chase Debit:   $${chaseDebit.toFixed(2)}
  Capital One:   $${capitalOne.toFixed(2)}
  Cash App:      $${cashApp.toFixed(2)}
  PayPal:        $${paypal.toFixed(2)}
  TOTAL BALANCE: $${totalBalance.toFixed(2)}

SETTINGS
  EarnIn: repayment $${earnInSettings.repaymentAmount||521.96} | Fri $${earnInSettings.fri||155.99} | Sat $${earnInSettings.sat||155.99} | Sun $${earnInSettings.sun||155.99} | Mon $${earnInSettings.mon||53.99}
  TILT: max credit $${tiltMaxCredit} | instant fee $${tiltFee}
  Paycheck: default $${pcSettings.defaultAmount||980} | ${pcSettings.frequency||'weekly'} every Friday

${earnInSection}

${tiltSection}

AFTERPAY — ALL PLANS
${afterpaySection}
  Total Remaining Across All Plans: $${totalAfterRemaining.toFixed(2)}
${nextApDate ? `  Next Payment: $${nextApAmt.toFixed(2)} on ${nextApDate}` : '  No upcoming payments.'}

MONTHLY SUBSCRIPTIONS — ALL ACTIVE (${activeBills.length} bills)
${billLines}
  Monthly Total: $${monthlyTotal.toFixed(2)}
${nextBill ? `  Next Due: ${nextBill.name} $${nextBill.amount.toFixed(2)} on the ${nextBill.dueDay}th` : ''}

PAYCHECKS — UPCOMING (next 30 days, ${upcomingPc.length} paychecks)
${upcomingPc.map(p=>`  - ${format(parseISO(p.date),'EEE MMM d')}: $${p.amount.toFixed(2)} from ${p.source||'Employment'}`).join('\n')||'  - None'}
  Projected Income (30d): $${projectedPcIncome.toFixed(2)}
${nextPc ? `  Next: $${nextPc.amount.toFixed(2)} on ${format(parseISO(nextPc.date),'EEE MMM d')}` : '  None scheduled.'}

PAYCHECKS — PAST HISTORY
${pastPc.map(p=>`  - ${format(parseISO(p.date),'EEE MMM d')}: $${p.amount.toFixed(2)} from ${p.source||'Employment'}`).join('\n')||'  - None'}

ONE-TIME INCOME LOGGED
${oneTimeTxs.length>0 ? oneTimeTxs.map(t=>`  - ${t.date}: $${t.amount.toFixed(2)} (${t.source||t.note||'One-Time'})`).join('\n') : '  - None'}

TRANSACTION TRACKER — CURRENT MONTH
  Month Income:     +$${monthIn.toFixed(2)}
  Month Expenses:   -$${monthOut.toFixed(2)}
  Net:              $${(monthIn-monthOut).toFixed(2)}
  Transactions:     ${monthTxs.length}

Spending by Category (this month):
${catLines}

Recent Transactions (last 15):
${recentTxLines}

PENDING INCOME (not in balance until marked paid)
${pendingLines}

DEBTS
${debtLines}
  Total Debt: $${totalDebt.toFixed(2)}

SAVINGS GOALS
${savingsLines}
  Total Saved: $${totalSaved.toFixed(2)}

30-DAY PROJECTED DAILY BALANCE
  Includes: all paychecks, all monthly bills, EarnIn repayment, TILT repayment,
  Afterpay payments, groceries -$60/Sunday, gas -$20 biweekly.
  Wife's Due and other pending income counted ONLY if already marked as paid.

  *** LOWEST POINT IN 30 DAYS: $${lowestBal.toFixed(2)} on ${lowestDate} ***

${projLines.join('\n')}

FINANCIAL ADVISOR RULES — FOLLOW EXACTLY ON EVERY MESSAGE:
1. NEVER answer a spending question without running the full 30-day map first.
2. $20 buffer is NON-NEGOTIABLE — never OK spending that drops any day below $20.
3. If any day in 30 days projects below $20, warn immediately even if not asked.
4. Count ALL 4 paychecks in a month — never miss the 4th Friday.
5. EarnIn withdrawals = INCOME. EarnIn repayment = EXPENSE on repayment date. Count both.
6. Wife's Due is PENDING — do NOT count it until Mark as Paid is clicked.
7. Groceries -$60 every Sunday, Gas -$20 every 2 weeks. Already baked into the map above.
8. LOWEST POINT is the key number — always reference it in spending answers.
9. If user asks "looking good?" show: all 4 paychecks, lowest point, end-of-month balance.

SPENDING CHECK PROTOCOL:
  Step 1 — Current balance: $${totalBalance.toFixed(2)}
  Step 2 — 30-day map built above with every bill, paycheck, recurring expense
  Step 3 — Lowest point: $${lowestBal.toFixed(2)} on ${lowestDate}
  Step 4 — Subtract purchase, re-check all 30 days for sub-$20 balance
  Step 5 — Answer: YES (show new lowest) / NO (show which day fails + max safe) / MAX SAFE AMOUNT

AVAILABLE ACTIONS — FULL WRITE ACCESS (use tool calls — never simulate, never tell Edwin to do it manually):
  - Log, edit, or delete any transaction
  - Update any account balance
  - Log one-time income
  - Update any pending income entry (amount, breakdown items, note) — including Wife's Due
  - Mark pending income as received/paid
  - Update any bill (amount, due date, paid status, active status)
  - Mark EarnIn steps taken/untaken
  - Log savings deposits
  - Update any debt (balance, minimum payment, APR)

WRITE RULES — MANDATORY:
  - When Edwin asks you to update, change, add, edit, or fix any data — execute the tool call immediately. Do NOT say "you can update this manually" or redirect Edwin to the UI.
  - Always confirm what you changed after the tool call completes.
  - For pending income updates that add a new line item: include ALL existing details plus the new one in the details array.

RESPONSE FORMAT — MANDATORY:
  Plain text only — NEVER markdown (no **, no *, no ##, no backticks).
  Spending checks: daily list, one line per day, end with YES / NO / MAX.
  General questions: labeled sections + dash lists.
  Address user as Edwin. Be direct. No filler.
  Never reveal API keys or internal system details.`
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center px-3 py-2">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-slate-400"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  )
}

function loadChatHistory() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return [
    {
      role: 'assistant',
      content: "Hi Edwin! I'm your AI financial assistant. Ask me anything about your finances.",
      timestamp: Date.now(),
    },
  ]
}

function saveChatHistory(messages) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-50)))
  } catch {
    // ignore
  }
}

const BLANK_MESSAGE = {
  role: 'assistant',
  content: "Hi Edwin! I'm your AI financial assistant. Ask me anything about your finances.",
  timestamp: Date.now(),
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [showChips, setShowChips] = useState(false)
  const [messages, setMessages] = useState([BLANK_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [noticeText, setNoticeText] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const store = useStore()

  // Clear chat history every time the user closes the panel
  const handleClose = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY)
    setMessages([{ ...BLANK_MESSAGE, timestamp: Date.now() }])
    setInput('')
    setNoticeText('')
    setShowChips(false)
    setIsOpen(false)
  }

  // Do not persist between sessions — no useEffect saving to localStorage

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        inputRef.current?.focus()
      }, 350)
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, noticeText])

  const handleSend = async (text) => {
    const content = (text || input).trim()
    if (!content || isLoading) return
    setInput('')
    setShowChips(false)

    // Daily limit check
    if (isLimitReached()) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Daily AI limit reached, resets tomorrow',
        timestamp: Date.now(),
      }])
      return
    }

    const userMsg = { role: 'user', content, timestamp: Date.now() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setIsLoading(true)

    // Consent notice — visible for 2 seconds before any API call is made
    setNoticeText('This message will use your API credits. Sending...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    setNoticeText('')

    try {
      // Read live state at call time — useStore.getState() bypasses React's render
      // cycle and always returns the current Zustand state, never a stale snapshot.
      const liveState = useStore.getState()
      const totalBal = Object.values(liveState.accounts).reduce((a, b) => a + b, 0)
      const activeBillCount = (liveState.bills || []).filter(b => b.isActive).length
      const activeEarnIn = (liveState.earnInLogs || []).find(l => l.status === 'active')
      const activeTilt   = (liveState.tiltLogs   || []).find(l => l.status === 'active')
      const currentMonthTxs = (liveState.transactions || []).filter(t => {
        try { return new Date(t.date).getMonth() === new Date().getMonth() } catch { return false }
      })
      console.log('[Claude API] Fresh snapshot —', new Date().toISOString())
      console.log('[Claude API] Snapshot:', {
        totalBalance:     `$${totalBal.toFixed(2)}`,
        chase:            `$${(liveState.accounts.chaseDebit || 0).toFixed(2)}`,
        capitalOne:       `$${(liveState.accounts.capitalOneDebit || 0).toFixed(2)}`,
        cashApp:          `$${(liveState.accounts.cashApp || 0).toFixed(2)}`,
        paypal:           `$${(liveState.accounts.paypal || 0).toFixed(2)}`,
        activeBills:      activeBillCount,
        paychecks:        (liveState.paychecks || []).length,
        earnIn:           activeEarnIn
          ? `active since ${activeEarnIn.cycleStartDate} | taken: fri=${activeEarnIn.fri_taken} sat=${activeEarnIn.sat_taken} sun=${activeEarnIn.sun_taken} mon=${activeEarnIn.mon_taken} | repayment $${activeEarnIn.repaymentAmount}`
          : 'no active cycle',
        tilt:             activeTilt ? `active $${activeTilt.amountUsed} due ${activeTilt.repaymentDate}` : 'clear',
        afterpayItems:    (liveState.afterpayItems || []).length,
        currentMonthTxs:  currentMonthTxs.length,
        projectedBalance: liveState.projectedBalance ?? 'auto-calculated',
        savingsGoals:     (liveState.savingsGoals || []).length,
        debts:            (liveState.debts || []).map(d => `${d.name}: $${d.totalBalance}`),
      })

      const systemPrompt = buildSystemPrompt(liveState)
      const data = await callClaudeProxy(updatedMessages, systemPrompt, CLAUDE_TOOLS)

      // Console log with timestamp and token counts
      const inputTokens  = data.usage?.input_tokens  || 0
      const outputTokens = data.usage?.output_tokens || 0
      console.log(`[Claude API] ${new Date().toISOString()} | input: ${inputTokens} tokens | output: ${outputTokens} tokens | model: claude-haiku-4-5-20251001`)

      // Track daily usage
      const callCount = incrementUsage()
      console.log(`[Claude API] Daily usage: ${callCount}/${DAILY_LIMIT}`)

      const stopReason = data.stop_reason
      const toolUseBlock = data.content?.find(b => b.type === 'tool_use')

      if (stopReason === 'tool_use' && toolUseBlock) {
        const { name, input: args } = toolUseBlock
        let actionResult = ''

        if (name === 'log_transaction') {
          store.addTransaction({
            id: `tx-${Date.now()}`,
            amount: args.amount,
            type: args.type,
            category: args.category || 'Other',
            note: args.note || '',
            account: args.account || 'chaseDebit',
            date: args.date || format(new Date(), 'yyyy-MM-dd'),
            source: args.type === 'in' ? 'AI Logged' : undefined,
            createdAt: new Date().toISOString(),
          })
          actionResult = `✅ Logged ${args.type === 'in' ? 'income' : 'expense'} of $${args.amount.toFixed(2)} for ${args.category}${args.note ? ` — "${args.note}"` : ''}.`

        } else if (name === 'update_transaction') {
          const existing = (store.transactions || []).find(t => t.id === args.id)
          if (existing) {
            const updates = {}
            if (args.amount   !== undefined) updates.amount   = args.amount
            if (args.type     !== undefined) updates.type     = args.type
            if (args.category !== undefined) updates.category = args.category
            if (args.note     !== undefined) updates.note     = args.note
            if (args.account  !== undefined) updates.account  = args.account
            if (args.date     !== undefined) updates.date     = args.date
            store.updateTransaction(args.id, updates)
            actionResult = `✅ Updated transaction${args.note ? ` "${args.note}"` : ` ${args.id}`}.`
          } else {
            actionResult = `⚠️ Transaction ${args.id} not found.`
          }

        } else if (name === 'delete_transaction') {
          const existing = (store.transactions || []).find(t => t.id === args.id)
          if (existing) {
            store.deleteTransaction(args.id)
            actionResult = `✅ Deleted transaction — ${existing.note || args.id} ($${existing.amount?.toFixed(2)}).`
          } else {
            actionResult = `⚠️ Transaction ${args.id} not found.`
          }

        } else if (name === 'update_account_balance') {
          store.setAccount(args.account, args.balance)
          const accountNames = { chaseDebit: 'Chase', capitalOneDebit: 'Capital One', cashApp: 'Cash App', paypal: 'PayPal' }
          actionResult = `✅ Updated ${accountNames[args.account] || args.account} balance to $${args.balance.toFixed(2)}.`

        } else if (name === 'log_one_time_income') {
          store.addPaycheck({
            id: `paycheck-ot-${Date.now()}`,
            amount: args.amount,
            date: args.date || format(new Date(), 'yyyy-MM-dd'),
            source: args.source,
            note: args.note || '',
            isOneTime: true,
            received: true,
          })
          actionResult = `✅ Logged $${args.amount.toFixed(2)} from "${args.source}"${args.note ? ` — ${args.note}` : ''}.`

        } else if (name === 'update_pending_income') {
          const existing = (store.pendingIncome || []).find(p => p.id === args.id)
          if (existing) {
            const updates = {}
            if (args.amount  !== undefined) updates.amount  = args.amount
            if (args.details !== undefined) updates.details = args.details
            if (args.note    !== undefined) updates.note    = args.note
            if (args.label   !== undefined) updates.label   = args.label
            store.updatePendingIncome(args.id, updates)
            const label = args.label || existing.label
            const newAmt = args.amount ?? existing.amount
            actionResult = `✅ Updated "${label}" — new total: $${newAmt.toFixed(2)}.`
            if (args.details) {
              const lines = args.details.map(d => `  ${d.desc}: $${Number(d.amount).toFixed(2)}`).join('\n')
              actionResult += `\nBreakdown:\n${lines}`
            }
          } else {
            actionResult = `⚠️ Pending income entry ${args.id} not found.`
          }

        } else if (name === 'mark_pending_income_paid') {
          const existing = (store.pendingIncome || []).find(p => p.id === args.id)
          if (existing) {
            store.markPendingPaid(args.id)
            actionResult = `✅ Marked "${existing.label}" as received — $${existing.amount.toFixed(2)} added to Chase balance.`
          } else {
            actionResult = `⚠️ Pending income entry ${args.id} not found.`
          }

        } else if (name === 'update_bill') {
          const existing = (store.bills || []).find(b => b.id === args.id)
          if (existing) {
            const updates = {}
            if (args.amount        !== undefined) updates.amount        = args.amount
            if (args.dueDay        !== undefined) updates.dueDay        = args.dueDay
            if (args.name          !== undefined) updates.name          = args.name
            if (args.paidThisMonth !== undefined) updates.paidThisMonth = args.paidThisMonth
            if (args.isActive      !== undefined) updates.isActive      = args.isActive
            store.updateBill(args.id, updates)
            const billName = args.name || existing.name
            actionResult = `✅ Updated bill "${billName}".`
            if (args.amount        !== undefined) actionResult += ` Amount: $${args.amount.toFixed(2)}.`
            if (args.dueDay        !== undefined) actionResult += ` Due day: ${args.dueDay}.`
            if (args.paidThisMonth !== undefined) actionResult += ` Paid this month: ${args.paidThisMonth ? 'yes' : 'no'}.`
          } else {
            actionResult = `⚠️ Bill ${args.id} not found.`
          }

        } else if (name === 'mark_earnin_step') {
          const activeLog = store.earnInLogs.find(l => l.status === 'active')
          if (activeLog) {
            store.updateEarnInLog(activeLog.id, { [`${args.day}_taken`]: args.taken })
            actionResult = `✅ Marked Earn In ${args.day.charAt(0).toUpperCase() + args.day.slice(1)} as ${args.taken ? 'taken' : 'not taken'}.`
          } else {
            actionResult = '⚠️ No active Earn In cycle found.'
          }

        } else if (name === 'log_savings_deposit') {
          const goal = (store.savingsGoals || []).find(g => g.id === args.goalId)
          if (goal) {
            store.updateSavingsGoal(goal.id, {
              currentAmount: (goal.currentAmount || 0) + args.amount,
            })
            actionResult = `✅ Added $${args.amount.toFixed(2)} deposit to "${goal.name}".`
          } else {
            actionResult = '⚠️ Savings goal not found.'
          }

        } else if (name === 'update_debt') {
          const existing = (store.debts || []).find(d => d.id === args.id)
          if (existing) {
            const updates = {}
            if (args.totalBalance   !== undefined) updates.totalBalance   = args.totalBalance
            if (args.minimumPayment !== undefined) updates.minimumPayment = args.minimumPayment
            if (args.apr            !== undefined) updates.apr            = args.apr
            if (args.name           !== undefined) updates.name           = args.name
            store.updateDebt(args.id, updates)
            const debtName = args.name || existing.name
            actionResult = `✅ Updated debt "${debtName}".`
            if (args.totalBalance !== undefined) actionResult += ` Balance: $${args.totalBalance.toFixed(2)}.`
          } else {
            actionResult = `⚠️ Debt ${args.id} not found.`
          }

        } else {
          actionResult = `✅ Action "${name}" executed.`
        }

        setMessages(prev => [...prev, { role: 'assistant', content: actionResult, timestamp: Date.now() }])
      } else {
        const textBlock = data.content?.find(b => b.type === 'text')
        const reply = textBlock?.text || 'Sorry, I could not generate a response.'
        setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: Date.now() }])
      }
    } catch (err) {
      let errMsg
      if (err.message.startsWith('CLAUDE_ERROR:')) {
        const rest = err.message.slice('CLAUDE_ERROR:'.length)
        const colonIdx = rest.indexOf(':')
        const status = colonIdx >= 0 ? rest.slice(0, colonIdx) : rest
        const detail = colonIdx >= 0 ? rest.slice(colonIdx + 1) : ''
        if (status === '429') {
          errMsg = 'Rate limit reached. Please wait a moment and try again.'
        } else if (status === '401') {
          errMsg = 'API key error — check the ANTHROPIC_API_KEY secret in Cloudflare Pages.'
        } else {
          errMsg = `API error (${status})${detail ? ': ' + detail : ''}. Check the browser console.`
        }
      } else {
        errMsg = `Error: ${err.message}. Check the browser console for details.`
      }
      console.error('[Claude API] Error:', err)
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg, timestamp: Date.now() }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearChat = () => {
    const initial = [{ role: 'assistant', content: "Chat cleared! How can I help you with your finances?", timestamp: Date.now() }]
    setMessages(initial)
    saveChatHistory(initial)
  }

  const formatTime = (ts) => {
    if (!ts) return ''
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      {/* Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-[400px] flex flex-col border-l border-white/10 shadow-2xl"
            style={{ backgroundColor: 'var(--bg-chat)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-4 border-b border-white/10 flex-shrink-0"
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/40 to-amber-600/20 flex items-center justify-center">
                    <Sparkles size={16} className="text-amber-400" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-full border border-amber-500/30"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Claude AI</p>
                  <p className="text-xs text-slate-500">Your financial assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearChat}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/10 transition-colors"
                  title="Clear chat"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex flex-col gap-0.5 max-w-[85%]">
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'rounded-br-sm text-white'
                          : 'rounded-bl-sm border border-white/10'
                      }`}
                      style={{
                        backgroundColor: msg.role === 'user'
                          ? 'rgba(245, 158, 11, 0.85)'
                          : 'var(--bg-card)',
                        color: msg.role === 'user' ? 'white' : 'var(--color-text)',
                      }}
                    >
                      {msg.content}
                    </div>
                    {msg.timestamp && (
                      <span className={`text-[10px] text-slate-600 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        {formatTime(msg.timestamp)}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* 2-second consent notice — shown before every API call */}
              {noticeText && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div
                    className="px-3.5 py-2 rounded-2xl rounded-bl-sm border text-xs italic"
                    style={{
                      backgroundColor: 'rgba(245,158,11,0.08)',
                      borderColor: 'rgba(245,158,11,0.25)',
                      color: '#F59E0B',
                    }}
                  >
                    {noticeText}
                  </div>
                </motion.div>
              )}

              {isLoading && !noticeText && (
                <div className="flex justify-start">
                  <div
                    className="rounded-2xl rounded-bl-sm border border-white/10"
                    style={{ backgroundColor: 'var(--bg-card)' }}
                  >
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestion chips */}
            <AnimatePresence>
              {showChips && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="px-4 pb-2 flex flex-wrap gap-2"
                >
                  {SUGGESTION_CHIPS.map(chip => (
                    <motion.button
                      key={chip}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSend(chip)}
                      className="text-xs px-3 py-1.5 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                    >
                      {chip}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="px-4 pb-4 pt-2 border-t border-white/10 flex-shrink-0">
              <div
                className="flex gap-2 items-center rounded-xl px-3 py-2.5"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <button
                  onClick={() => setShowChips(!showChips)}
                  className="text-slate-500 hover:text-amber-400 transition-colors flex-shrink-0"
                  title="Suggestions"
                >
                  <Sparkles size={15} />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your finances..."
                  className="flex-1 bg-transparent text-sm placeholder-slate-500 outline-none"
                  style={{ color: 'var(--color-text)' }}
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <div
        className="fixed bottom-6 right-6 z-50"
        onMouseEnter={() => !isOpen && setShowChips(false)}
      >
        <AnimatePresence>
          {!isOpen && showChips && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-16 right-0 flex flex-col gap-2 items-end"
            >
              {[...SUGGESTION_CHIPS].reverse().map((chip, i) => (
                <motion.button
                  key={chip}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => { setIsOpen(true); setTimeout(() => handleSend(chip), 400) }}
                  className="text-xs px-3 py-1.5 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 backdrop-blur-sm transition-colors whitespace-nowrap"
                >
                  {chip}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {!isOpen && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-amber-400/40"
            animate={{ scale: [1, 1.6, 1.6], opacity: [0.6, 0, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        <motion.button
          onClick={() => { if (isOpen) handleClose(); else { setIsOpen(true); setShowChips(false) } }}
          onHoverStart={() => !isOpen && setShowChips(true)}
          onHoverEnd={() => !isOpen && setShowChips(false)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          className="relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center"
          style={{
            background: isOpen
              ? 'linear-gradient(135deg, #EF4444, #DC2626)'
              : 'linear-gradient(135deg, #F59E0B, #D97706)',
            boxShadow: isOpen
              ? '0 0 24px rgba(239, 68, 68, 0.5)'
              : '0 0 24px rgba(245, 158, 11, 0.5)',
          }}
          aria-label="Toggle AI Assistant"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="x"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X size={22} className="text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="bot"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Bot size={22} className="text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  )
}
