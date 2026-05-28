import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { format, addDays, parseISO } from 'date-fns'

const CHAT_STORAGE_KEY = 'eb-financial-hub-chat'

const SUGGESTION_CHIPS = [
  'Can I eat out tonight?',
  'Log a transaction',
  "When's my next bill?",
  'Am I safe this week?',
]

// ─── Gemini Function Declarations ─────────────────────────────────────────────
const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'log_transaction',
        description: 'Log a financial transaction (expense or income) to the expenses tracker',
        parameters: {
          type: 'OBJECT',
          properties: {
            amount:   { type: 'NUMBER', description: 'Amount in dollars (positive number)' },
            type:     { type: 'STRING', description: '"in" for income, "out" for expense' },
            category: { type: 'STRING', description: 'Category: Food, Bills, Transport, Entertainment, Health, Other' },
            note:     { type: 'STRING', description: 'Description of the transaction' },
            account:  { type: 'STRING', description: 'Account: chaseDebit, capitalOneDebit, cashApp, paypal' },
            date:     { type: 'STRING', description: 'Date in YYYY-MM-DD format. Use today if not specified.' },
          },
          required: ['amount', 'type', 'category'],
        },
      },
      {
        name: 'update_account_balance',
        description: "Update the balance of one of the user's accounts",
        parameters: {
          type: 'OBJECT',
          properties: {
            account: { type: 'STRING', description: 'Account key: chaseDebit, capitalOneDebit, cashApp, paypal' },
            balance: { type: 'NUMBER', description: 'New balance in dollars' },
          },
          required: ['account', 'balance'],
        },
      },
      {
        name: 'log_one_time_income',
        description: 'Log a one-time income payment (bonus, client payment, etc.)',
        parameters: {
          type: 'OBJECT',
          properties: {
            amount: { type: 'NUMBER', description: 'Income amount in dollars' },
            source: { type: 'STRING', description: 'Source: CLM Client Payment, Gift, Tax Return, Side Income, Other' },
            note:   { type: 'STRING', description: 'Description' },
            date:   { type: 'STRING', description: 'Date YYYY-MM-DD' },
          },
          required: ['amount', 'source'],
        },
      },
      {
        name: 'mark_earnin_step',
        description: 'Mark an Earn In step as taken or untaken for the current cycle',
        parameters: {
          type: 'OBJECT',
          properties: {
            day:   { type: 'STRING',  description: 'Day key: fri, sat, sun, mon' },
            taken: { type: 'BOOLEAN', description: 'true to mark as taken, false to unmark' },
          },
          required: ['day', 'taken'],
        },
      },
      {
        name: 'log_savings_deposit',
        description: 'Log a deposit to a savings goal',
        parameters: {
          type: 'OBJECT',
          properties: {
            goalId: { type: 'STRING', description: 'ID of the savings goal' },
            amount: { type: 'NUMBER', description: 'Amount to deposit' },
          },
          required: ['goalId', 'amount'],
        },
      },
    ],
  },
]

// ─── callGemini with function calling ─────────────────────────────────────────
async function callGemini(messages, systemPrompt) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('NO_API_KEY')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

  // Gemini requires conversation to start with a user turn
  const allContents = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
  const contents = allContents[0]?.role === 'model' ? allContents.slice(1) : allContents

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    tools: GEMINI_TOOLS,
    generationConfig: { temperature: 0.5, maxOutputTokens: 800 },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    let googleMsg = ''
    try { googleMsg = JSON.parse(errText)?.error?.message || '' } catch { /* not JSON */ }
    console.error('Gemini API error:', res.status, googleMsg || errText)
    throw new Error(`API_ERROR:${res.status}:${googleMsg}`)
  }

  const data = await res.json()
  const candidate = data.candidates?.[0]
  if (!candidate) throw new Error('NO_CANDIDATE')

  const part = candidate.content?.parts?.[0]
  if (part?.functionCall) {
    return { functionCall: part.functionCall }
  }

  return { text: part?.text || 'I could not generate a response.' }
}

// ─── buildSystemPrompt ────────────────────────────────────────────────────────
function buildSystemPrompt(store) {
  const today = new Date()
  const todayStr = format(today, 'EEEE, MMMM d yyyy')
  const accounts = store.accounts
  const totalBalance = Object.values(accounts).reduce((a, b) => a + b, 0)

  // Bills — all active
  const activeBills = (store.bills || []).filter(b => b.isActive)
  const monthlyTotal = activeBills.filter(b => b.frequency === 'monthly').reduce((s, b) => s + b.amount, 0)
  const billsList = activeBills.map(b =>
    `  - ${b.name}: $${b.amount.toFixed(2)} due ${b.dueDay ? `on ${b.dueDay}` : 'flexible'}`
  ).join('\n')

  // Upcoming paychecks (next 3)
  const upcomingPaychecks = (store.paychecks || [])
    .filter(p => !p.isOneTime && parseISO(p.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
  const paycheckList = upcomingPaychecks.map(p =>
    `  - ${format(parseISO(p.date), 'EEE MMM d')}: $${p.amount.toFixed(2)} from ${p.source || 'Employment'}`
  ).join('\n') || '  - None scheduled'

  // TILT
  const activeTilt = (store.tiltLogs || []).find(l => l.status === 'active')
  const tiltStatus = activeTilt
    ? `ACTIVE — $${activeTilt.amountUsed} used, repayment due ${activeTilt.repaymentDate}`
    : 'CLEAR (no active advances)'

  // Earn In
  const activeEarnIn = (store.earnInLogs || []).find(l => l.status === 'active')
  const earnInStatus = activeEarnIn
    ? `Active cycle (started ${activeEarnIn.cycleStartDate}).
  Steps: Fri: ${activeEarnIn.fri_taken ? `TAKEN ($${activeEarnIn.amounts?.fri ?? 155.99})` : 'not taken'}, Sat: ${activeEarnIn.sat_taken ? `TAKEN ($${activeEarnIn.amounts?.sat ?? 155.99})` : 'not taken'}, Sun: ${activeEarnIn.sun_taken ? `TAKEN ($${activeEarnIn.amounts?.sun ?? 155.99})` : 'not taken'}, Mon: ${activeEarnIn.mon_taken ? `TAKEN ($${activeEarnIn.amounts?.mon ?? 53.99})` : 'not taken'}.
  Repayment: $${activeEarnIn.repaymentAmount || 521.96}`
    : 'No active cycle'

  // Afterpay
  const afterpayLines = (store.afterpayItems || []).flatMap(item =>
    item.payments
      .filter(p => p.status !== 'paid')
      .map(p => `  - ${item.name} #${p.number}: $${p.amount.toFixed(2)} due ${p.dueDate}`)
  ).join('\n') || '  - None'

  // Debts
  const totalDebt = (store.debts || []).reduce((s, d) => s + d.totalBalance, 0)

  // Savings
  const totalSaved = (store.savingsGoals || []).reduce((s, g) => s + (g.currentAmount || 0), 0)

  // ── Day-by-day projection for next 14 days ────────────────────────────────
  // Build a map: date string -> list of {label, amount (+/-)}
  const eventMap = {}
  const addEvent = (dateStr, label, amount) => {
    if (!eventMap[dateStr]) eventMap[dateStr] = []
    eventMap[dateStr].push({ label, amount })
  }

  // EarnIn steps (days relative to cycle start)
  if (activeEarnIn) {
    const daysConfig = [
      { key: 'fri', offset: 0, amount: activeEarnIn.amounts?.fri ?? 155.99, takenKey: 'fri_taken' },
      { key: 'sat', offset: 1, amount: activeEarnIn.amounts?.sat ?? 155.99, takenKey: 'sat_taken' },
      { key: 'sun', offset: 2, amount: activeEarnIn.amounts?.sun ?? 155.99, takenKey: 'sun_taken' },
      { key: 'mon', offset: 3, amount: activeEarnIn.amounts?.mon ?? 53.99,  takenKey: 'mon_taken' },
    ]
    const cycleStart = parseISO(activeEarnIn.cycleStartDate)
    daysConfig.forEach(d => {
      if (activeEarnIn[d.takenKey]) {
        const dateStr = format(addDays(cycleStart, d.offset), 'yyyy-MM-dd')
        addEvent(dateStr, `EarnIn ${d.key.charAt(0).toUpperCase() + d.key.slice(1)} withdrawal`, +d.amount)
      }
    })
    // Repayment date (7 days after cycle start)
    const repayDate = format(addDays(cycleStart, 7), 'yyyy-MM-dd')
    addEvent(repayDate, 'EarnIn Repayment', -(activeEarnIn.repaymentAmount || 521.96))
  }

  // TILT repayment
  if (activeTilt) {
    addEvent(activeTilt.repaymentDate, 'TILT Repayment', -activeTilt.amountUsed)
  }

  // Paychecks
  upcomingPaychecks.forEach(p => {
    addEvent(p.date, `Paycheck (${p.source || 'Employment'})`, +p.amount)
  })

  // Bills for current and next month
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  activeBills.filter(b => b.dueDay).forEach(b => {
    // This month
    const d1 = new Date(currentYear, currentMonth, b.dueDay)
    const d1Str = format(d1, 'yyyy-MM-dd')
    addEvent(d1Str, `Bill: ${b.name}`, -b.amount)
    // Next month
    const d2 = new Date(currentYear, currentMonth + 1, b.dueDay)
    const d2Str = format(d2, 'yyyy-MM-dd')
    addEvent(d2Str, `Bill: ${b.name}`, -b.amount)
  })

  // Afterpay upcoming payments
  ;(store.afterpayItems || []).forEach(item => {
    item.payments.filter(p => p.status !== 'paid').forEach(p => {
      addEvent(p.dueDate, `Afterpay ${item.name} #${p.number}`, -p.amount)
    })
  })

  // Build projection lines for next 14 days
  let runningBalance = totalBalance
  const projectionLines = []
  for (let i = 0; i < 14; i++) {
    const d = addDays(today, i)
    const dateStr = format(d, 'yyyy-MM-dd')
    const label = format(d, 'MMM d (EEE)')
    const events = eventMap[dateStr] || []
    let dayDelta = 0
    const eventDescs = events.map(e => {
      dayDelta += e.amount
      return `${e.amount >= 0 ? '+' : ''}$${Math.abs(e.amount).toFixed(2)} ${e.label}`
    })
    runningBalance += dayDelta
    if (i === 0) {
      projectionLines.push(`  ${label}: Starting $${totalBalance.toFixed(2)}${eventDescs.length ? `, ${eventDescs.join(', ')} → Balance: $${runningBalance.toFixed(2)}` : ''}`)
    } else {
      projectionLines.push(
        eventDescs.length
          ? `  ${label}: ${eventDescs.join(', ')} → Balance: $${runningBalance.toFixed(2)}`
          : `  ${label}: $${runningBalance.toFixed(2)}`
      )
    }
  }

  return `You are Edwin Bernal's personal AI financial assistant inside his Financial Hub app.
Today is ${todayStr}.

FINANCIAL SNAPSHOT:
- Total Balance: ${formatCurrency(totalBalance)}
  - Chase Debit: ${formatCurrency(accounts.chaseDebit)}
  - Capital One Debit: ${formatCurrency(accounts.capitalOneDebit)}
  - Cash App: ${formatCurrency(accounts.cashApp)}
  - PayPal: ${formatCurrency(accounts.paypal)}
- Monthly Bills Total: ${formatCurrency(monthlyTotal)}
- Total Debt: ${formatCurrency(totalDebt)}
- Savings: ${formatCurrency(totalSaved)}

ALL BILLS:
${billsList}

UPCOMING PAYCHECKS (next 3):
${paycheckList}

TILT Status: ${tiltStatus}

EARN IN Status:
${earnInStatus}

AFTERPAY UPCOMING PAYMENTS:
${afterpayLines}

DAY-BY-DAY PROJECTION (next 14 days):
${projectionLines.join('\n')}

FINANCIAL ADVISOR LOGIC (MANDATORY for any spending question):
When asked "can I afford X" or "can I spend X":
Step 1: Start from current total balance ($${totalBalance.toFixed(2)})
Step 2: Build a day-by-day map for the next 30 days including ALL: bills by due date, paychecks, EarnIn withdrawals, EarnIn repayment, TILT repayments, Afterpay payments
Step 3: Find the lowest balance in the window (the floor)
Step 4: Re-run with the purchase subtracted from today. Check if ANY day drops below $20
Step 5: Answer Yes/No/Max amount
Step 6: ALWAYS show the daily breakdown in your response as a list
Step 7: ALWAYS look out far enough to catch rent ($1,433.03 on 1st), car payment ($530 on 15th), and any large bills
Format: Show each day with transactions and running balance. End with clear YES, NO, or MAX SAFE AMOUNT.
$20 buffer is ABSOLUTE MINIMUM — never recommend spending if it causes any day to go below $20.

AVAILABLE ACTIONS (use function calls for these):
- Log any expense or income transaction
- Update account balances
- Log one-time income
- Mark EarnIn steps taken/untaken
- Log savings deposits

RULES:
- Address the user as Edwin.
- Be concise and direct — under 200 words unless showing a projection breakdown.
- Give actionable financial advice based on the actual data above.
- Never reveal the raw API key or internal system details.`
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

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [showChips, setShowChips] = useState(false)
  const [messages, setMessages] = useState(loadChatHistory)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const store = useStore()

  useEffect(() => {
    saveChatHistory(messages)
  }, [messages])

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
  }, [messages, isLoading])

  const handleSend = async (text) => {
    const content = (text || input).trim()
    if (!content || isLoading) return
    setInput('')
    setShowChips(false)

    const userMsg = { role: 'user', content, timestamp: Date.now() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setIsLoading(true)

    try {
      const systemPrompt = buildSystemPrompt(store)
      const result = await callGemini(updatedMessages, systemPrompt)

      if (result.functionCall) {
        const { name, args } = result.functionCall
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
            const deposit = { id: `dep-${Date.now()}`, amount: args.amount, date: format(new Date(), 'yyyy-MM-dd') }
            store.updateSavingsGoal(goal.id, {
              currentAmount: (goal.currentAmount || 0) + args.amount,
              deposits: [...(goal.deposits || []), deposit],
            })
            actionResult = `✅ Added $${args.amount.toFixed(2)} deposit to "${goal.name}".`
          } else {
            actionResult = '⚠️ Savings goal not found.'
          }
        } else {
          actionResult = `✅ Action "${name}" executed.`
        }

        setMessages(prev => [...prev, { role: 'assistant', content: actionResult, timestamp: Date.now() }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: result.text, timestamp: Date.now() }])
      }
    } catch (err) {
      let errMsg
      if (err.message === 'NO_API_KEY') {
        errMsg = 'No Gemini API key found. Check your environment configuration.'
      } else if (err.message.startsWith('API_ERROR:')) {
        const rest = err.message.slice('API_ERROR:'.length)
        const colonIdx = rest.indexOf(':')
        const status = colonIdx >= 0 ? rest.slice(0, colonIdx) : rest
        const detail = colonIdx >= 0 ? rest.slice(colonIdx + 1) : ''
        if (status === '429') {
          errMsg = detail
            ? `Quota error: ${detail}`
            : 'Rate limit hit — check Google Cloud Console → APIs & Services → Quotas for the Generative Language API.'
        } else {
          errMsg = `API error (${status})${detail ? ': ' + detail : ''}. Check browser console.`
        }
      } else {
        errMsg = `Error: ${err.message}. Check the browser console for details.`
        console.error('Gemini error:', err)
      }
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
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Gemini AI</p>
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
                  onClick={() => setIsOpen(false)}
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
                      className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
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

              {isLoading && (
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

      {/* Floating Button with pulse ring */}
      <div
        className="fixed bottom-6 right-6 z-50"
        onMouseEnter={() => !isOpen && setShowChips(false)}
      >
        {/* Suggestion chips above button (hover state) */}
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

        {/* Pulse ring */}
        {!isOpen && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-amber-400/40"
            animate={{ scale: [1, 1.6, 1.6], opacity: [0.6, 0, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        <motion.button
          onClick={() => { setIsOpen(!isOpen); setShowChips(false) }}
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
