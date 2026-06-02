import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { format, addDays, parseISO } from 'date-fns'
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
]

// ─── buildSystemPrompt ────────────────────────────────────────────────────────
// Preserved exactly — no changes to the financial logic.
function buildSystemPrompt(store) {
  const today = new Date()
  const todayStr = format(today, 'EEEE, MMMM d yyyy')
  const accounts = store.accounts
  const totalBalance = Object.values(accounts).reduce((a, b) => a + b, 0)

  const activeBills = (store.bills || []).filter(b => b.isActive)
  const monthlyTotal = activeBills.filter(b => b.frequency === 'monthly').reduce((s, b) => s + b.amount, 0)
  const billsList = activeBills.map(b =>
    `  - ${b.name}: $${b.amount.toFixed(2)} due ${b.dueDay ? `on ${b.dueDay}` : 'flexible'}`
  ).join('\n')

  const upcomingPaychecks = (store.paychecks || [])
    .filter(p => !p.isOneTime && parseISO(p.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
  const paycheckList = upcomingPaychecks.map(p =>
    `  - ${format(parseISO(p.date), 'EEE MMM d')}: $${p.amount.toFixed(2)} from ${p.source || 'Employment'}`
  ).join('\n') || '  - None scheduled'

  const activeTilt = (store.tiltLogs || []).find(l => l.status === 'active')
  const tiltStatus = activeTilt
    ? `ACTIVE — $${activeTilt.amountUsed} used, repayment due ${activeTilt.repaymentDate}`
    : 'CLEAR (no active advances)'

  const activeEarnIn = (store.earnInLogs || []).find(l => l.status === 'active')
  const earnInStatus = activeEarnIn
    ? `Active cycle (started ${activeEarnIn.cycleStartDate}).
  Steps: Fri: ${activeEarnIn.fri_taken ? `TAKEN ($${activeEarnIn.amounts?.fri ?? 155.99})` : 'not taken'}, Sat: ${activeEarnIn.sat_taken ? `TAKEN ($${activeEarnIn.amounts?.sat ?? 155.99})` : 'not taken'}, Sun: ${activeEarnIn.sun_taken ? `TAKEN ($${activeEarnIn.amounts?.sun ?? 155.99})` : 'not taken'}, Mon: ${activeEarnIn.mon_taken ? `TAKEN ($${activeEarnIn.amounts?.mon ?? 53.99})` : 'not taken'}.
  Repayment: $${activeEarnIn.repaymentAmount || 521.96}`
    : 'No active cycle'

  const afterpayLines = (store.afterpayItems || []).flatMap(item =>
    item.payments
      .filter(p => p.status !== 'paid')
      .map(p => `  - ${item.name} #${p.number}: $${p.amount.toFixed(2)} due ${p.dueDate}`)
  ).join('\n') || '  - None'

  const totalDebt  = (store.debts || []).reduce((s, d) => s + d.totalBalance, 0)
  const totalSaved = (store.savingsGoals || []).reduce((s, g) => s + (g.currentAmount || 0), 0)

  const eventMap = {}
  const addEvent = (dateStr, label, amount) => {
    if (!eventMap[dateStr]) eventMap[dateStr] = []
    eventMap[dateStr].push({ label, amount })
  }

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
    const repayDate = format(addDays(cycleStart, 7), 'yyyy-MM-dd')
    addEvent(repayDate, 'EarnIn Repayment', -(activeEarnIn.repaymentAmount || 521.96))
  }

  if (activeTilt) addEvent(activeTilt.repaymentDate, 'TILT Repayment', -activeTilt.amountUsed)

  upcomingPaychecks.forEach(p => addEvent(p.date, `Paycheck (${p.source || 'Employment'})`, +p.amount))

  const currentMonth = today.getMonth()
  const currentYear  = today.getFullYear()
  activeBills.filter(b => b.dueDay).forEach(b => {
    addEvent(format(new Date(currentYear, currentMonth, b.dueDay), 'yyyy-MM-dd'), `Bill: ${b.name}`, -b.amount)
    addEvent(format(new Date(currentYear, currentMonth + 1, b.dueDay), 'yyyy-MM-dd'), `Bill: ${b.name}`, -b.amount)
  })

  ;(store.afterpayItems || []).forEach(item => {
    item.payments.filter(p => p.status !== 'paid').forEach(p => {
      addEvent(p.dueDate, `Afterpay ${item.name} #${p.number}`, -p.amount)
    })
  })

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

FINANCIAL ADVISOR LOGIC (MANDATORY — follow this EXACT logic every time the user asks if they can afford anything):

You are a personal finance advisor embedded in this app. You have full access to all of the user's financial data including current balance, upcoming bills, earn in cycles, tilt status, afterpay payments, paychecks, and all recurring charges.

When the user asks if they can afford to spend money on anything — food, a purchase, afterpay, anything — follow this exact logic every single time:

Step 1 — Get the current balance
Pull the user's current confirmed balance from the app data. Never assume or estimate. Current total balance: $${totalBalance.toFixed(2)}

Step 2 — Map every day forward
Starting from today, lay out every single day until you hit the next major danger zone. A danger zone is any day with rent, a car payment, or any bill over $200. Include every transaction that is scheduled or expected on each day — bills, paychecks, earn in withdrawals, earn in repayments, tilt repayments, afterpay payments, groceries, gas, and anything else in the system.

Step 3 — Find the floor
Identify the single lowest balance point in that entire window. That is the floor. Everything depends on this number.

Step 4 — Apply the purchase
Subtract the amount the user wants to spend from today's balance and re-run the map. Check if any day in the window now goes below $20. The $20 buffer is non-negotiable — never recommend spending if it causes any day to drop below $20.

Step 5 — Answer
- If no day drops below $20 → Yes. Tell them the lowest balance they'll hit after the purchase.
- If any day drops below $20 → No. Tell them exactly which day, what the balance would be, and what the max they can safely spend is.
- If it's borderline → Give them the max safe amount to spend.

Step 6 — Long term awareness
Never only look at today or this week. Always look far enough forward to catch rent ($1,433.03 on 1st), car payment ($530 on 15th), and any large bills coming up. A purchase might look fine today but wipe them out on the 1st of next month. Always catch that.

Step 7 — Format
Always respond in the daily list format. Never paragraphs. Show each day, the transactions, and the running balance. End with a clear ✅ YES, ❌ NO, or 💰 MAX SAFE AMOUNT.

$20 buffer is ABSOLUTE MINIMUM — never recommend spending if it causes any day to drop below $20.

AVAILABLE ACTIONS (use tool calls for these):
- Log any expense or income transaction
- Update account balances
- Log one-time income
- Mark EarnIn steps taken/untaken
- Log savings deposits

RESPONSE FORMAT RULES (MANDATORY — follow for EVERY single message):

CRITICAL: This chat renders PLAIN TEXT only. NEVER use markdown: no **, no *, no ##, no __, no backticks. Those characters will show up literally and look broken.

Use this exact style instead:

For expense/date lists:
📅 Upcoming Expenses — Edwin
May 2026
- Thursday, May 28
  College — $135.00

- Friday, May 29
  EarnIn Repayment — $521.96
  TILT Repayment — $400.00

June 2026
- Monday, June 1
  Rent — $1,433.03

Total: $X,XXX.XX

For spending checks (day-by-day):
📊 Can You Spend $X? — Edwin
- Thursday, May 28  →  Balance: $XXX.XX
- Friday, May 29  →  Paycheck +$980  →  Balance: $XXX.XX
- Sunday, May 31  →  Afterpay -$37.50  →  Balance: $XXX.XX
...
Verdict: ✅ YES / ❌ NO / 💰 MAX: $X.XX

For simple questions:
💰 Quick Answer — Edwin
- Fact one
- Fact two
- Fact three

RULES:
- Use emojis only at the START of section headers (📅 💰 📊 ⚠️ ✅ ❌ 💳 🏦 💸 🎯)
- Use a dash + space ( - ) for ALL list items
- Indent sub-items with 2 spaces
- No paragraphs ever — structure everything as labeled sections + dashes
- Address the user as Edwin
- Never reveal API keys or internal system details`
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
  const [noticeText, setNoticeText] = useState('')
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
      const systemPrompt = buildSystemPrompt(store)
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
            store.updateSavingsGoal(goal.id, {
              currentAmount: (goal.currentAmount || 0) + args.amount,
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
