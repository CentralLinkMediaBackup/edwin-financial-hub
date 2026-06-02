import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Link } from 'react-router-dom'
import {
  Wallet, CalendarDays, TrendingUp, TrendingDown, AlertTriangle,
  ArrowRight, Zap, CheckCircle2, Circle, DollarSign,
  Utensils, Car, HeartPulse, MoreHorizontal, ShoppingCart, CreditCard,
  ReceiptText, Clock, ChevronRight
} from 'lucide-react'
import {
  format, parseISO, isAfter, isBefore, addDays,
  startOfMonth, endOfMonth, isToday, differenceInDays, isSameMonth
} from 'date-fns'
import { useStore } from '../store/useStore'
import { useAnimatedCounter } from '../hooks/useAnimatedCounter'
import { formatCurrency, formatDate } from '../lib/formatters'

// ── Animated currency ─────────────────────────────────────────────────────────
function AnimatedCurrency({ value, className = '', duration = 1500 }) {
  const animated = useAnimatedCounter(Math.abs(value), duration)
  const sign = value < 0 ? '-' : ''
  return (
    <span className={className}>
      {sign}${animated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

// ── Category config ───────────────────────────────────────────────────────────
const categoryConfig = {
  Food:          { icon: Utensils,      color: '#F59E0B' },
  Bills:         { icon: CreditCard,    color: '#3B82F6' },
  Transport:     { icon: Car,           color: '#8B5CF6' },
  Entertainment: { icon: ShoppingCart,  color: '#EC4899' },
  Health:        { icon: HeartPulse,    color: '#10B981' },
  Other:         { icon: MoreHorizontal, color: '#64748B' },
}
const PIE_COLORS = ['#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#64748B']

// ── Stagger animation ─────────────────────────────────────────────────────────
const card = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

// ── TILT mini arc ─────────────────────────────────────────────────────────────
function TiltMiniArc({ used, max }) {
  const pct = max > 0 ? Math.min(1, used / max) : 0
  const r = 44, sw = 8
  const circ = 2 * Math.PI * r
  const arc = circ * 0.75
  const fill = pct * arc

  const strokeColor = pct >= 1 ? '#EF4444' : pct >= 0.75 ? '#F59E0B' : '#10B981'

  return (
    <svg width="110" height="78" viewBox="0 0 110 78">
      <circle cx="55" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw}
        strokeDasharray={`${arc} ${circ}`} strokeDashoffset="0"
        strokeLinecap="round" transform="rotate(-135 55 65)"
      />
      <motion.circle
        cx="55" cy="65" r={r} fill="none" stroke={strokeColor} strokeWidth={sw}
        strokeDasharray={`${circ}`} strokeLinecap="round"
        transform="rotate(-135 55 65)"
        initial={{ strokeDashoffset: arc }}
        animate={{ strokeDashoffset: arc - fill }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
      />
      <text x="55" y="56" textAnchor="middle" fill="white" fontSize="15" fontWeight="700" fontFamily="'Sora',sans-serif">
        ${used}
      </text>
      <text x="55" y="70" textAnchor="middle" fill="#94A3B8" fontSize="10">
        of ${max}
      </text>
    </svg>
  )
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ events }) {
  const today = new Date()
  const start = startOfMonth(today)
  const end = endOfMonth(today)
  const daysInMonth = end.getDate()
  const startDow = start.getDay()

  const eventsByDay = useMemo(() => {
    const map = {}
    events.forEach(ev => {
      if (!map[ev.day]) map[ev.day] = []
      map[ev.day].push(ev)
    })
    return map
  }, [events])

  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d, i) => (
          <div key={i} className="text-[9px] text-slate-500 font-medium text-center py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const isT = day === today.getDate()
          const evs = eventsByDay[day] || []
          const hasIncome = evs.some(e => e.type === 'income')
          const hasBill = evs.some(e => e.type === 'bill')
          const hasOther = evs.some(e => e.type === 'other')
          return (
            <div key={day} className={`rounded-md flex flex-col items-center py-1 ${
              isT ? 'bg-amber-500/20' : 'hover:bg-white/5'
            }`}>
              <span className={`text-[10px] font-medium leading-none ${isT ? 'text-amber-400' : 'text-slate-400'}`}>{day}</span>
              <div className="flex gap-0.5 mt-0.5">
                {hasIncome && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
                {hasBill && <div className="w-1 h-1 rounded-full bg-red-400" />}
                {hasOther && <div className="w-1 h-1 rounded-full bg-amber-400" />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Greeting helper ───────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const accounts        = useStore(s => s.accounts)
  const transactions    = useStore(s => s.transactions)
  const bills           = useStore(s => s.bills)
  const paychecks       = useStore(s => s.paychecks)
  const tiltLogs        = useStore(s => s.tiltLogs)
  const earnInLogs      = useStore(s => s.earnInLogs)
  const afterpayItems   = useStore(s => s.afterpayItems)
  const projectedBalance = useStore(s => s.projectedBalance)

  const today = new Date()

  const totalBalance = Object.values(accounts).reduce((a, b) => a + b, 0)

  // Next paycheck
  const nextPaycheck = useMemo(() =>
    paychecks
      .filter(p => !p.received && isAfter(parseISO(p.date), today))
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null
  , [paychecks])

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const monthTxs = transactions.filter(t => isSameMonth(parseISO(t.date), today))
    const income   = monthTxs.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0)
    const outgoing = monthTxs.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0)
    const paycheckIncome = paychecks
      .filter(p => isSameMonth(parseISO(p.date), today) && p.received)
      .reduce((s, p) => s + p.amount, 0)
    return { income: income + paycheckIncome, outgoing, net: income + paycheckIncome - outgoing }
  }, [transactions, paychecks])

  // Projected EOM
  const projectedEOM = useMemo(() => {
    const eom = endOfMonth(today)
    let proj = totalBalance
    paychecks.forEach(p => {
      const d = parseISO(p.date)
      if (!p.received && isAfter(d, today) && isBefore(d, eom)) proj += p.amount
    })
    bills.filter(b => b.isActive && b.frequency === 'monthly' && b.dueDay).forEach(b => {
      const due = new Date(today.getFullYear(), today.getMonth(), b.dueDay)
      if (isAfter(due, today)) proj -= b.amount
    })
    return proj
  }, [totalBalance, paychecks, bills])

  // Spending by category
  const spendingByCategory = useMemo(() => {
    const cats = {}
    transactions
      .filter(t => t.type === 'out' && isSameMonth(parseISO(t.date), today))
      .forEach(t => { cats[t.category] = (cats[t.category] || 0) + t.amount })
    return Object.entries(cats).map(([name, value]) => ({ name, value }))
  }, [transactions])

  // Upcoming 7 days
  const upcomingPayments = useMemo(() => {
    const evs = []
    const in7 = addDays(today, 7)

    bills.filter(b => b.isActive && b.dueDay).forEach(b => {
      const d = new Date(today.getFullYear(), today.getMonth(), b.dueDay)
      if ((isAfter(d, today) || isToday(d)) && isBefore(d, in7))
        evs.push({ id: b.id, name: b.name, amount: -b.amount, date: d, type: 'bill' })
    })
    paychecks.forEach(p => {
      const d = parseISO(p.date)
      if ((isAfter(d, today) || isToday(d)) && isBefore(d, in7))
        evs.push({ id: p.id, name: p.source || 'Paycheck', amount: p.amount, date: d, type: 'income' })
    })
    tiltLogs.filter(t => t.status === 'active').forEach(t => {
      const d = parseISO(t.repaymentDate)
      if ((isAfter(d, today) || isToday(d)) && isBefore(d, in7))
        evs.push({ id: t.id, name: 'TILT Repayment', amount: -t.amountUsed, date: d, type: 'tilt' })
    })
    afterpayItems.forEach(item =>
      item.payments.filter(p => p.status !== 'paid').forEach(p => {
        const d = parseISO(p.dueDate)
        if ((isAfter(d, today) || isToday(d)) && isBefore(d, in7))
          evs.push({ id: p.id, name: `Afterpay · ${item.name}`, amount: -p.amount, date: d, type: 'afterpay' })
      })
    )
    return evs.sort((a, b) => a.date - b.date)
  }, [bills, paychecks, tiltLogs, afterpayItems])

  // Warning days
  const warningDays = useMemo(() => {
    const w = []; let running = totalBalance
    for (let i = 1; i <= 14; i++) {
      const day = addDays(today, i)
      bills.filter(b => b.isActive && b.dueDay).forEach(b => {
        if (new Date(day.getFullYear(), day.getMonth(), b.dueDay).toDateString() === day.toDateString())
          running -= b.amount
      })
      paychecks.forEach(p => {
        if (parseISO(p.date).toDateString() === day.toDateString() && !p.received)
          running += p.amount
      })
      if (running < 20) w.push({ date: day, amount: running })
    }
    return w
  }, [totalBalance, bills, paychecks])

  // Calendar events
  const calendarEvents = useMemo(() => {
    const evs = []
    bills.filter(b => b.isActive && b.dueDay).forEach(b => {
      if (isSameMonth(new Date(today.getFullYear(), today.getMonth(), b.dueDay), today))
        evs.push({ day: b.dueDay, type: 'bill', name: b.name })
    })
    paychecks.filter(p => isSameMonth(parseISO(p.date), today)).forEach(p =>
      evs.push({ day: parseISO(p.date).getDate(), type: 'income', name: 'Paycheck' })
    )
    transactions.filter(t => isSameMonth(parseISO(t.date), today)).forEach(t =>
      evs.push({ day: parseISO(t.date).getDate(), type: 'other', name: t.note || t.category })
    )
    return evs
  }, [bills, paychecks, transactions])

  const activeTilt  = tiltLogs.find(t => t.status === 'active')
  const activeEarnIn = earnInLogs.find(l => l.status === 'active') || earnInLogs[0]
  const recentTxs   = [...transactions]
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
    .slice(0, 6)

  // Month progress %
  const daysInMonth  = endOfMonth(today).getDate()
  const monthProgress = Math.round((today.getDate() / daysInMonth) * 100)

  const accountItems = [
    { label: 'Chase',    key: 'chaseDebit' },
    { label: 'Cap One',  key: 'capitalOneDebit' },
    { label: 'Cash App', key: 'cashApp' },
    { label: 'PayPal',   key: 'paypal' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-5 flex items-end justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
            {greeting()}, Zack
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{format(today, "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <Clock size={12} />
          <span>Live balance</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </motion.div>

      {/* ── Warning banner ───────────────────────────────────────────── */}
      {warningDays.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-xl p-3.5 border border-red-500/40 flex items-start gap-3"
          style={{ background: 'rgba(239,68,68,0.08)', boxShadow: '0 0 20px rgba(239,68,68,0.15)' }}
        >
          <AlertTriangle size={17} className="text-red-400 flex-shrink-0 mt-px" />
          <div>
            <p className="text-red-300 font-semibold text-sm">Balance warning in the next 14 days</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
              {warningDays.slice(0, 3).map((w, i) => (
                <p key={i} className="text-red-400/80 text-xs">
                  {format(w.date, 'EEE MMM d')} → {formatCurrency(w.amount)}
                </p>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">

        {/* ══════════════════════════════════════════════════════════════
            ROW 1 — Balance hero + paycheck + net
            ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-12 gap-4">

          {/* Balance hero */}
          <motion.div variants={card} className="col-span-12 lg:col-span-7">
            <div
              className="rounded-2xl p-6 h-full border"
              style={{
                background: 'linear-gradient(135deg, #0F1629 0%, #141E38 60%, #0D1526 100%)',
                borderColor: 'rgba(245,158,11,0.18)',
                boxShadow: '0 0 40px rgba(245,158,11,0.05)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Wallet size={14} className="text-amber-400" />
                </div>
                <span className="text-xs text-slate-400 uppercase tracking-widest font-medium">Total Balance</span>
              </div>

              <AnimatedCurrency
                value={totalBalance}
                className="text-5xl font-bold text-white mt-1"
                duration={1800}
              />

              {/* Account pills */}
              <div className="flex flex-wrap gap-2 mt-4">
                {accountItems.map(({ label, key }) => {
                  const bal = accounts[key]
                  const hasBalance = bal > 0
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-xs"
                      style={{
                        background: hasBalance ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)',
                        borderColor: hasBalance ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasBalance ? 'bg-amber-400' : 'bg-slate-600'}`} />
                      <span className="text-slate-400">{label}</span>
                      <span className={`font-mono font-semibold ${hasBalance ? 'text-white' : 'text-slate-600'}`}>
                        {formatCurrency(bal)}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* EOM projection footer */}
              <div
                className="mt-4 pt-4 border-t flex items-center justify-between"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <div>
                  <p className="text-xs text-slate-500">Projected end of {format(today, 'MMMM')}</p>
                  <p className={`text-lg font-bold font-mono mt-0.5 ${(projectedBalance ?? projectedEOM) < 0 ? 'text-red-400' : 'text-slate-200'}`}>
                    {formatCurrency(projectedBalance ?? projectedEOM)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{monthProgress}% through {format(today, 'MMMM')}</p>
                  <div className="w-32 h-1.5 rounded-full mt-1.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <motion.div
                      className="h-full rounded-full bg-amber-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${monthProgress}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Paycheck + Net (stacked) */}
          <div className="col-span-12 lg:col-span-5 grid grid-rows-2 gap-4">

            {/* Next paycheck */}
            <motion.div variants={card}>
              <div className="card-glass p-5 h-full flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}
                >
                  <DollarSign size={20} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Next Paycheck</p>
                  {nextPaycheck ? (
                    <>
                      <p className="text-2xl font-bold font-mono text-emerald-400">
                        <AnimatedCurrency value={nextPaycheck.amount} className="text-2xl font-bold font-mono text-emerald-400" duration={1200} />
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{formatDate(nextPaycheck.date)}</p>
                    </>
                  ) : (
                    <p className="text-slate-500 text-sm">None scheduled</p>
                  )}
                </div>
                {nextPaycheck && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-white">{differenceInDays(parseISO(nextPaycheck.date), today)}</p>
                    <p className="text-[10px] text-slate-500">days away</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Net this month */}
            <motion.div variants={card}>
              <div
                className="card-glass p-5 h-full"
                style={monthlyStats.net < 0 ? { boxShadow: '0 0 20px rgba(239,68,68,0.25)' } : {}}
              >
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">This Month</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Income</span>
                      <span className="text-emerald-400 font-mono">+{formatCurrency(monthlyStats.income)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 mb-2.5">
                      <motion.div
                        className="h-full rounded-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, monthlyStats.income / Math.max(monthlyStats.income, monthlyStats.outgoing, 1) * 100)}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Outgoing</span>
                      <span className="text-red-400 font-mono">-{formatCurrency(monthlyStats.outgoing)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5">
                      <motion.div
                        className="h-full rounded-full bg-red-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, monthlyStats.outgoing / Math.max(monthlyStats.income, monthlyStats.outgoing, 1) * 100)}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.6 }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-slate-500 mb-0.5">Net</p>
                    <AnimatedCurrency
                      value={monthlyStats.net}
                      className={`text-xl font-bold font-mono ${monthlyStats.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      duration={1000}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            ROW 2 — TILT | Earn In | Upcoming payments
            ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-12 gap-4">

          {/* TILT */}
          <motion.div variants={card} className="col-span-12 sm:col-span-6 lg:col-span-4">
            <div className="card-glass p-5 h-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Zap size={14} className="text-amber-400" />
                </div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">TILT Credit</span>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  activeTilt ? 'bg-red-500/20 text-red-400 border border-red-500/25' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/25'
                }`}>
                  {activeTilt ? 'Active' : 'Clear'}
                </span>
              </div>

              {activeTilt ? (
                <div className="flex items-center gap-4">
                  <TiltMiniArc used={activeTilt.amountUsed} max={activeTilt.creditLimit || 400} />
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-[10px] text-slate-500">Repayment due</p>
                      <p className="text-sm font-semibold text-white mt-0.5">
                        {format(parseISO(activeTilt.repaymentDate), 'EEE, MMM d')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Days remaining</p>
                      <p className={`text-lg font-bold font-mono mt-0.5 ${
                        differenceInDays(parseISO(activeTilt.repaymentDate), today) <= 2 ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {Math.max(0, differenceInDays(parseISO(activeTilt.repaymentDate), today))}d
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Amount owed</p>
                      <p className="text-sm font-bold font-mono text-white mt-0.5">{formatCurrency(activeTilt.amountUsed)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <Zap size={20} className="text-emerald-400" />
                  </div>
                  <p className="text-sm text-slate-400">No active advance</p>
                  <Link to="/tilt" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                    Take advance <ChevronRight size={11} />
                  </Link>
                </div>
              )}

              <Link to="/tilt" className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 hover:text-amber-400 transition-colors">
                <span>TILT details</span>
                <ChevronRight size={12} />
              </Link>
            </div>
          </motion.div>

          {/* Earn In */}
          <motion.div variants={card} className="col-span-12 sm:col-span-6 lg:col-span-4">
            <div className="card-glass p-5 h-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <TrendingUp size={14} className="text-emerald-400" />
                </div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Earn In</span>
                {activeEarnIn && (
                  <span className="ml-auto text-[10px] text-slate-500">
                    Cycle: {format(parseISO(activeEarnIn.cycleStartDate), 'MMM d')}
                  </span>
                )}
              </div>

              {activeEarnIn ? (
                <>
                  {/* 4-step tracker */}
                  <div className="relative mb-3">
                    <div className="absolute top-4 left-[12%] right-[12%] h-0.5 bg-white/8" />
                    <motion.div
                      className="absolute top-4 left-[12%] h-0.5 bg-emerald-500/50"
                      initial={{ width: 0 }}
                      animate={{
                        width: (() => {
                          const taken = ['fri','sat','sun','mon'].filter(d => activeEarnIn[`${d}_taken`]).length
                          if (!taken) return '0%'
                          return `${((taken - 1) / 3) * 76}%`
                        })()
                      }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                    <div className="relative z-10 grid grid-cols-4 gap-1">
                      {['fri','sat','sun','mon'].map((day, i) => {
                        const taken = activeEarnIn[`${day}_taken`]
                        const amounts = { fri: 155.99, sat: 155.99, sun: 155.99, mon: 53.99 }
                        const amt = activeEarnIn.amounts?.[day] || amounts[day]
                        return (
                          <div key={day} className="flex flex-col items-center gap-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                              taken
                                ? 'bg-emerald-500/25 border-emerald-500/50'
                                : 'bg-white/5 border-white/10'
                            }`}>
                              {taken
                                ? <CheckCircle2 size={14} className="text-emerald-400" />
                                : <Circle size={14} className="text-slate-600" />
                              }
                            </div>
                            <span className="text-[9px] text-slate-500 uppercase font-medium">{day}</span>
                            <span className="text-[9px] font-mono text-slate-400">${amt}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                    <div>
                      <p className="text-[10px] text-slate-500">Taken so far</p>
                      <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                        {formatCurrency(['fri','sat','sun','mon'].reduce((sum, d) => {
                          const amounts = { fri: 155.99, sat: 155.99, sun: 155.99, mon: 53.99 }
                          return activeEarnIn[`${d}_taken`] ? sum + (activeEarnIn.amounts?.[d] || amounts[d]) : sum
                        }, 0))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500">Repayment</p>
                      <p className="text-sm font-bold font-mono text-red-400 mt-0.5">
                        -{formatCurrency(activeEarnIn.repaymentAmount || 521.96)}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-slate-500 gap-1">
                  <TrendingUp size={22} className="opacity-30" />
                  <p className="text-sm">No active cycle</p>
                </div>
              )}

              <Link to="/earnin" className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 hover:text-amber-400 transition-colors">
                <span>Earn In details</span>
                <ChevronRight size={12} />
              </Link>
            </div>
          </motion.div>

          {/* Upcoming 7 days */}
          <motion.div variants={card} className="col-span-12 lg:col-span-4">
            <div className="card-glass p-5 h-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <CalendarDays size={14} className="text-blue-400" />
                </div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Next 7 Days</span>
              </div>

              {upcomingPayments.length > 0 ? (
                <div className="space-y-1.5">
                  {upcomingPayments.slice(0, 5).map(ev => {
                    const typeStyles = {
                      income:   { dot: 'bg-emerald-400', text: 'text-emerald-400' },
                      bill:     { dot: 'bg-red-400',     text: 'text-red-400' },
                      tilt:     { dot: 'bg-amber-400',   text: 'text-amber-400' },
                      afterpay: { dot: 'bg-blue-400',    text: 'text-blue-400' },
                    }
                    const s = typeStyles[ev.type] || { dot: 'bg-slate-400', text: 'text-slate-300' }
                    return (
                      <div key={ev.id} className="flex items-center gap-2.5 py-1.5 border-b border-white/5 last:border-0">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-200 truncate">{ev.name}</p>
                          <p className="text-[10px] text-slate-500">{format(ev.date, 'EEE, MMM d')}</p>
                        </div>
                        <span className={`text-xs font-mono font-semibold flex-shrink-0 ${s.text}`}>
                          {ev.amount >= 0 ? '+' : ''}{formatCurrency(ev.amount)}
                        </span>
                      </div>
                    )
                  })}
                  {upcomingPayments.length > 5 && (
                    <p className="text-[10px] text-slate-500 text-center pt-1">
                      +{upcomingPayments.length - 5} more
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-1">
                  <CalendarDays size={22} className="opacity-30" />
                  <p className="text-sm">All clear next 7 days</p>
                </div>
              )}

              <Link to="/calendar" className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 hover:text-amber-400 transition-colors">
                <span>Full calendar</span>
                <ChevronRight size={12} />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            ROW 3 — Monthly spending + Mini calendar
            ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-12 gap-4">

          {/* Spending breakdown */}
          <motion.div variants={card} className="col-span-12 lg:col-span-7">
            <div className="card-glass p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <ShoppingCart size={14} className="text-blue-400" />
                </div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                  Spending Breakdown — {format(today, 'MMMM')}
                </span>
              </div>

              {spendingByCategory.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="42%" height={150}>
                    <PieChart>
                      <Pie
                        data={spendingByCategory}
                        cx="50%" cy="50%"
                        innerRadius={42} outerRadius={65}
                        paddingAngle={3} dataKey="value"
                        animationBegin={300} animationDuration={1200}
                      >
                        {spendingByCategory.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={v => formatCurrency(v)}
                        contentStyle={{ backgroundColor: 'var(--bg-panel)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {spendingByCategory.map((cat, i) => {
                      const total = spendingByCategory.reduce((s, c) => s + c.value, 0)
                      const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0
                      return (
                        <div key={cat.name}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                              {cat.name}
                            </span>
                            <span className="text-slate-300 font-mono">{formatCurrency(cat.value)}</span>
                          </div>
                          <div className="h-1 rounded-full bg-white/5">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, delay: 0.3 + i * 0.08 }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-500">
                  <ShoppingCart size={24} className="opacity-30" />
                  <p className="text-sm">No spending logged yet</p>
                  <Link to="/expenses" className="text-xs text-amber-400 hover:text-amber-300">Add a transaction</Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* Mini calendar */}
          <motion.div variants={card} className="col-span-12 lg:col-span-5">
            <div className="card-glass p-5 h-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <CalendarDays size={14} className="text-amber-400" />
                </div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                  {format(today, 'MMMM yyyy')}
                </span>
              </div>
              <MiniCalendar events={calendarEvents} />
              <div className="mt-3 flex gap-3 text-[10px] text-slate-500 border-t border-white/5 pt-2.5">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Income</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />Bill</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />Other</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            ROW 4 — Recent transactions
            ══════════════════════════════════════════════════════════════ */}
        <motion.div variants={card}>
          <div className="card-glass p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-500/15 flex items-center justify-center">
                  <ReceiptText size={14} className="text-slate-400" />
                </div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Recent Transactions</span>
              </div>
              <Link to="/expenses" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {recentTxs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0.5">
                {recentTxs.map((tx, i) => {
                  const config = categoryConfig[tx.category] || categoryConfig.Other
                  const Icon = config.icon
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${config.color}18` }}
                      >
                        <Icon size={15} style={{ color: config.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{tx.note || tx.category}</p>
                        <p className="text-[10px] text-slate-500">{tx.category} · {format(parseISO(tx.date), 'MMM d')}</p>
                      </div>
                      <span className={`text-sm font-mono font-semibold flex-shrink-0 ${tx.type === 'in' ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {tx.type === 'in' ? '+' : '−'}{formatCurrency(tx.amount)}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 gap-2 text-slate-500">
                <ReceiptText size={28} className="opacity-20" />
                <p className="text-sm">No transactions logged yet</p>
                <Link to="/expenses" className="text-xs text-amber-400 hover:text-amber-300 mt-1">
                  Add your first transaction
                </Link>
              </div>
            )}
          </div>
        </motion.div>

      </motion.div>
    </div>
  )
}
