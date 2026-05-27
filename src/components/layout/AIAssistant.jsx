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

async function callGemini(messages, systemPrompt) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('No Gemini API key configured. Add VITE_GEMINI_API_KEY to your .env file.')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`

  const contents = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 400,
    },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API error: ${err}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.'
}

function buildSystemPrompt(store) {
  const today = format(new Date(), 'EEEE, MMMM d yyyy')
  const totalBalance = Object.values(store.accounts).reduce((a, b) => a + b, 0)
  const accounts = store.accounts

  // Bills
  const activeBills = store.bills.filter(b => b.isActive)
  const monthlyBills = activeBills.filter(b => b.frequency === 'monthly').reduce((s, b) => s + b.amount, 0)
  const billsList = activeBills.slice(0, 10).map(b => `${b.name}: ${formatCurrency(b.amount)} due ${b.dueDay ? `on ${b.dueDay}th` : 'flexible'}`).join('; ')

  // Paychecks
  const todayDate = new Date()
  const upcomingPaychecks = store.paychecks
    .filter(p => parseISO(p.date) >= todayDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
  const nextPaycheck = upcomingPaychecks[0]

  // TILT
  const activeTilt = store.tiltLogs.find(l => l.status === 'active')
  const tiltStatus = activeTilt
    ? `ACTIVE — $${activeTilt.amountUsed} used, repayment due ${activeTilt.repaymentDate}`
    : 'CLEAR (no active advances)'

  // Earn In
  const activeEarnIn = store.earnInLogs.find(l => l.status === 'active')
  const earnInStatus = activeEarnIn
    ? `Active cycle started ${activeEarnIn.cycleStartDate}. Fri: ${activeEarnIn.fri_taken ? 'taken' : 'not taken'}, Sat: ${activeEarnIn.sat_taken ? 'taken' : 'not taken'}, Sun: ${activeEarnIn.sun_taken ? 'taken' : 'not taken'}, Mon: ${activeEarnIn.mon_taken ? 'taken' : 'not taken'}. Repayment: $${activeEarnIn.repaymentAmount}`
    : 'No active cycle'

  // Savings
  const totalSaved = store.savingsGoals.reduce((s, g) => s + g.currentAmount, 0)
  const totalSavingsTarget = store.savingsGoals.reduce((s, g) => s + g.targetAmount, 0)

  // Debts
  const totalDebt = store.debts.reduce((s, d) => s + d.totalBalance, 0)

  // Projected balance (simple: balance + next paycheck - upcoming bills this week)
  const weeklyBills = monthlyBills / 4
  const projectedBalance = totalBalance + (nextPaycheck?.amount || 0) - weeklyBills

  return `You are Edwin Bernal's personal AI financial assistant inside his Financial Hub app.
Today is ${today}.

FINANCIAL SNAPSHOT:
- Total Balance: ${formatCurrency(totalBalance)}
  - Chase Debit: ${formatCurrency(accounts.chaseDebit)}
  - Capital One Debit: ${formatCurrency(accounts.capitalOneDebit)}
  - Cash App: ${formatCurrency(accounts.cashApp)}
  - PayPal: ${formatCurrency(accounts.paypal)}
- Monthly Bills Total: ${formatCurrency(monthlyBills)}
- Bills: ${billsList}
- Total Debt: ${formatCurrency(totalDebt)}
- Savings: ${formatCurrency(totalSaved)} / ${formatCurrency(totalSavingsTarget)} target

PAYCHECKS:
- Next paycheck: ${nextPaycheck ? `${formatDate(nextPaycheck.date)} — ${formatCurrency(nextPaycheck.amount)}` : 'None scheduled'}

TILT Status: ${tiltStatus}
Earn In Status: ${earnInStatus}

PROJECTED (rough estimate after next pay, minus weekly bills): ${formatCurrency(projectedBalance)}

Rules:
- Address the user as Edwin.
- Be concise and direct — under 150 words unless asked for detail.
- Give actionable financial advice based on the actual data above.
- If asked whether Edwin can spend money, consider his balance, upcoming bills, and TILT/EarnIn repayments.
- For "log a transaction", tell him to use the Expenses tab.
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
      const reply = await callGemini(updatedMessages, systemPrompt)
      setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: Date.now() }])
    } catch (err) {
      const errMsg = err.message.includes('No Gemini API key')
        ? 'No API key configured. Add VITE_GEMINI_API_KEY to your .env file to enable AI responses.'
        : "Sorry, I'm having trouble connecting right now. Please try again."
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
            style={{ backgroundColor: '#0B1120' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-4 border-b border-white/10 flex-shrink-0"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.06)' }}
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
                  <p className="text-sm font-bold text-white">Gemini AI</p>
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
                          : 'rounded-bl-sm text-slate-200 border border-white/10'
                      }`}
                      style={{
                        backgroundColor: msg.role === 'user'
                          ? 'rgba(245, 158, 11, 0.85)'
                          : 'rgba(255, 255, 255, 0.06)',
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
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
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
                  backgroundColor: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
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
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
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
