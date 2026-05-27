import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Wallet, CalendarDays, TrendingUp, TrendingDown, AlertTriangle,
  ArrowRight, Zap, CheckCircle2, Circle, DollarSign, CreditCard,
  ShoppingCart, Utensils, Car, HeartPulse, MoreHorizontal
} from 'lucide-react'
import {
  format, parseISO, isAfter, isBefore, addDays, startOfMonth, endOfMonth,
  isToday, differenceInDays, isSameMonth
} from 'date-fns'
import { useStore } from '../store/useStore'
import { useAnimatedCounter } from '../hooks/useAnimatedCounter'
import { formatCurrency, formatDate } from '../lib/formatters'

// ── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, className = '', style = {} }) {
  return (
    <div
      className={`card-glass p-5 ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

function CardHeader({ icon: Icon, iconColor = 'text-amber-400', iconBg = 'bg-amber-500/15', title, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon size={16} className={iconColor} />
        </div>
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
      </div>
      {action}
    </div>
  )
}

// ── Animated number ───────────────────────────────────────────────────────────
function AnimatedCurrency({ value, className = '', prefix = '$', duration = 1500 }) {
  const animated = useAnimatedCounter(Math.abs(value), duration)
  const sign = value < 0 ? '-' : ''
  return (
    <span className={className}>
      {sign}{prefix}{animated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

// ── Category icon map ─────────────────────────────────────────────────────────
const categoryConfig = {
  Food:          { icon: Utensils,      color: '#F59E0B' },
  Bills:         { icon: CreditCard,    color: '#3B82F6' },
  Transport:     { icon: Car,           color: '#8B5CF6' },
  Entertainment: { icon: ShoppingCart,  color: '#EC4899' },
  Health:        { icon: HeartPulse,    color: '#10B981' },
  Other:         { icon: MoreHorizontal, color: '#64748B' },
}

const PIE_COLORS = ['#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#64748B']

// ── TILT Arc ─────────────────────────────────────────────────────────────────
function TiltArc({ used, max }) {
  const pct = max > 0 ? Math.min(1, used / max) : 0
  const r = 54
  const circumference = 2 * Math.PI * r
  const strokeDash = pct * circumference * 0.75 // 270° arc
  const rotation = -135

  return (
    <svg width="140" height="100" viewBox="0 0 140 100">
      {/* Background track */}
      <circle cx="70" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10"
        strokeDasharray={`${circumference * 0.75} ${circumference}`}
        strokeDashoffset="0"
        strokeLinecap="round"
        transform={`rotate(${rotation} 70 80)`}
      />
      {/* Fill */}
      <motion.circle
        cx="70" cy="80" r={r}
        fill="none"
        stroke={pct >= 1 ? '#EF4444' : pct >= 0.75 ? '#F59E0B' : '#10B981'}
        strokeWidth="10"
        strokeDasharray={`${circumference}`}
        strokeLinecap="round"
        transform={`rotate(${rotation} 70 80)`}
        initial={{ strokeDashoffset: circumference * 0.75 }}
        animate={{ strokeDashoffset: circumference * 0.75 - strokeDash }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
      />
      {/* Label */}
      <text x="70" y="72" textAnchor="middle" fill="white" fontSize="18" fontWeight="700" fontFamily="'Sora', sans-serif">
        ${used}
      </text>
      <text x="70" y="88" textAnchor="middle" fill="#94A3B8" fontSize="11">
        of ${max}
      </text>
    </svg>
  )
}

// ── Mini calendar dot ─────────────────────────────────────────────────────────
function MiniCalendar({ events }) {
  const today = new Date()
  const start = startOfMonth(today)
  const end = endOfMonth(today)
  const daysInMonth = end.getDate()
  const startDow = start.getDay() // 0=Sun

  const eventsByDay = useMemo(() => {
    const map = {}
    events.forEach(ev => {
      const d = ev.day
      if (!map[d]) map[d] = []
      map[d].push(ev)
    })
    return map
  }, [events])

  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div>
      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-[10px] text-slate-500 font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const isT = day === today.getDate()
          const evs = eventsByDay[day] || []
          const hasIncome = evs.some(e => e.type === 'income')
          const hasBill = evs.some(e => e.type === 'bill')
          const hasOther = evs.some(e => e.type === 'other')

          return (
            <div
              key={day}
              className={`rounded-lg p-1 flex flex-col items-center min-h-[34px] transition-colors ${
                isT ? 'bg-amber-500/20 border border-amber-500/40' : 'hover:bg-white/5'
              }`}
            >
              <span className={`text-[11px] font-medium ${isT ? 'text-amber-400' : 'text-slate-300'}`}>{day}</span>
              {evs.length > 0 && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                  {hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  {hasBill && <div className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                  {hasOther && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const accounts = useStore(s => s.accounts)
  const transactions = useStore(s => s.transactions)
  const bills = useStore(s => s.bills)
  const paychecks = useStore(s => s.paychecks)
  const tiltLogs = useStore(s => s.tiltLogs)
  const earnInLogs = useStore(s => s.earnInLogs)
  const afterpayItems = useStore(s => s.afterpayItems)

  const today = new Date()

  // Total balance
  const totalBalance = Object.values(accounts).reduce((a, b) => a + b, 0)

  // Next paycheck
  const nextPaycheck = useMemo(() => {
    return paychecks
      .filter(p => !p.received && isAfter(parseISO(p.date), today))
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null
  }, [paychecks, today])

  // Monthly overview
  const monthlyStats = useMemo(() => {
    const monthTxs = transactions.filter(t => isSameMonth(parseISO(t.date), today))
    const income = monthTxs.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0)
    const outgoing = monthTxs.filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0)

    // Add paychecks this month
    const paycheckIncome = paychecks
      .filter(p => isSameMonth(parseISO(p.date), today) && p.received)
      .reduce((s, p) => s + p.amount, 0)

    return {
      income: income + paycheckIncome,
      outgoing,
      net: income + paycheckIncome - outgoing
    }
  }, [transactions, paychecks, today])

  // Projected EOM balance
  const projectedEOM = useMemo(() => {
    const eom = endOfMonth(today)
    let projected = totalBalance
    // Add remaining paychecks this month
    paychecks.forEach(p => {
      const d = parseISO(p.date)
      if (!p.received && isAfter(d, today) && isBefore(d, eom)) projected += p.amount
    })
    // Subtract remaining bills this month
    bills.filter(b => b.isActive && b.frequency === 'monthly').forEach(b => {
      if (b.dueDay) {
        const dueDate = new Date(today.getFullYear(), today.getMonth(), b.dueDay)
        if (isAfter(dueDate, today)) projected -= b.amount
      }
    })
    return projected
  }, [totalBalance, paychecks, bills, today])

  // Spending breakdown by category
  const spendingByCategory = useMemo(() => {
    const monthTxs = transactions.filter(t => t.type === 'out' && isSameMonth(parseISO(t.date), today))
    const cats = {}
    monthTxs.forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + t.amount
    })
    return Object.entries(cats).map(([name, value]) => ({ name, value }))
  }, [transactions, today])

  // Upcoming payments (next 7 days)
  const upcomingPayments = useMemo(() => {
    const events = []
    const in7 = addDays(today, 7)

    // Bills
    bills.filter(b => b.isActive && b.dueDay).forEach(b => {
      const dueDate = new Date(today.getFullYear(), today.getMonth(), b.dueDay)
      if ((isAfter(dueDate, today) || isToday(dueDate)) && isBefore(dueDate, in7)) {
        events.push({ id: b.id, name: b.name, amount: -b.amount, date: dueDate, type: 'bill' })
      }
    })

    // Paychecks
    paychecks.forEach(p => {
      const d = parseISO(p.date)
      if ((isAfter(d, today) || isToday(d)) && isBefore(d, in7)) {
        events.push({ id: p.id, name: 'Paycheck', amount: p.amount, date: d, type: 'income' })
      }
    })

    // TILT repayments
    tiltLogs.filter(t => t.status === 'active').forEach(t => {
      const d = parseISO(t.repaymentDate)
      if ((isAfter(d, today) || isToday(d)) && isBefore(d, in7)) {
        events.push({ id: t.id, name: 'TILT Repayment', amount: -(t.amountUsed + (t.instantDelivery ? t.instantFee : 0)), date: d, type: 'tilt' })
      }
    })

    // Afterpay
    afterpayItems.forEach(item => {
      item.payments.filter(p => p.status !== 'paid').forEach(p => {
        const d = parseISO(p.dueDate)
        if ((isAfter(d, today) || isToday(d)) && isBefore(d, in7)) {
          events.push({ id: p.id, name: `Afterpay: ${item.name}`, amount: -p.amount, date: d, type: 'afterpay' })
        }
      })
    })

    return events.sort((a, b) => a.date - b.date)
  }, [bills, paychecks, tiltLogs, afterpayItems, today])

  // Warning: days with negative balance projection
  const warningDays = useMemo(() => {
    const warnings = []
    let running = totalBalance
    for (let i = 1; i <= 14; i++) {
      const day = addDays(today, i)
      // Bills due
      bills.filter(b => b.isActive && b.dueDay).forEach(b => {
        if (new Date(day.getFullYear(), day.getMonth(), b.dueDay).toDateString() === day.toDateString()) {
          running -= b.amount
        }
      })
      // Paychecks
      paychecks.forEach(p => {
        if (parseISO(p.date).toDateString() === day.toDateString() && !p.received) {
          running += p.amount
        }
      })
      if (running < 0) {
        warnings.push({ date: day, amount: running })
      }
    }
    return warnings
  }, [totalBalance, bills, paychecks, today])

  // Mini calendar events
  const calendarEvents = useMemo(() => {
    const events = []
    bills.filter(b => b.isActive && b.dueDay).forEach(b => {
      if (isSameMonth(new Date(today.getFullYear(), today.getMonth(), b.dueDay), today)) {
        events.push({ day: b.dueDay, type: 'bill', name: b.name })
      }
    })
    paychecks.filter(p => isSameMonth(parseISO(p.date), today)).forEach(p => {
      events.push({ day: parseISO(p.date).getDate(), type: 'income', name: 'Paycheck' })
    })
    transactions.filter(t => isSameMonth(parseISO(t.date), today)).forEach(t => {
      events.push({ day: parseISO(t.date).getDate(), type: 'other', name: t.note || t.category })
    })
    return events
  }, [bills, paychecks, transactions, today])

  // Active TILT log
  const activeTilt = tiltLogs.find(t => t.status === 'active')

  // Current EarnIn cycle
  const activeEarnIn = earnInLogs[0]

  // Recent transactions
  const recentTxs = [...transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10)

  const stagger = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }
  const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }

  return (
    <div className="p-4 md:p-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">{format(today, "EEEE, MMMM d, yyyy")}</p>
      </motion.div>

      {/* Warning Banner */}
      {warningDays.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-xl p-4 border border-red-500/40 flex items-start gap-3"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', boxShadow: '0 0 24px rgba(239,68,68,0.2)' }}
        >
          <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-semibold text-sm mb-1">Projected Negative Balance Warning</p>
            <div className="space-y-0.5">
              {warningDays.slice(0, 3).map((w, i) => (
                <p key={i} className="text-red-400/80 text-xs">
                  {format(w.date, 'EEE, MMM d')} — projected {formatCurrency(w.amount)}
                </p>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {/* 1. Current Balance */}
        <motion.div variants={stagger} className="sm:col-span-2">
          <Card>
            <CardHeader icon={Wallet} title="Current Balance" />
            <AnimatedCurrency
              value={totalBalance}
              className="text-4xl font-bold font-mono text-white"
              duration={1800}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: 'Chase DC', key: 'chaseDebit' },
                { label: 'Cap One DC', key: 'capitalOneDebit' },
                { label: 'Cash App', key: 'cashApp' },
                { label: 'PayPal', key: 'paypal' },
              ].map(({ label, key }) => (
                <div key={key} className="flex justify-between items-center py-1">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-xs text-slate-300 font-mono">{formatCurrency(accounts[key])}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* 2. Next Paycheck */}
        <motion.div variants={stagger}>
          <Card>
            <CardHeader icon={DollarSign} iconColor="text-emerald-400" iconBg="bg-emerald-500/15" title="Next Paycheck" />
            {nextPaycheck ? (
              <>
                <p className="text-2xl font-bold font-mono text-emerald-400">
                  <AnimatedCurrency value={nextPaycheck.amount} className="text-2xl font-bold font-mono text-emerald-400" />
                </p>
                <p className="text-sm text-slate-400 mt-1">{formatDate(nextPaycheck.date)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  In {differenceInDays(parseISO(nextPaycheck.date), today)} days
                </p>
              </>
            ) : (
              <p className="text-slate-500 text-sm">No upcoming paychecks</p>
            )}
          </Card>
        </motion.div>

        {/* 3. Net This Month */}
        <motion.div variants={stagger}>
          <Card style={monthlyStats.net < 0 ? { boxShadow: '0 0 24px rgba(239,68,68,0.35)' } : {}}>
            <CardHeader
              icon={monthlyStats.net >= 0 ? TrendingUp : TrendingDown}
              iconColor={monthlyStats.net >= 0 ? 'text-emerald-400' : 'text-red-400'}
              iconBg={monthlyStats.net >= 0 ? 'bg-emerald-500/15' : 'bg-red-500/15'}
              title="Net This Month"
            />
            <AnimatedCurrency
              value={monthlyStats.net}
              className={`text-2xl font-bold font-mono ${monthlyStats.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
            />
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Income</span>
                <span className="text-emerald-400 font-mono">+{formatCurrency(monthlyStats.income)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Outgoing</span>
                <span className="text-red-400 font-mono">-{formatCurrency(monthlyStats.outgoing)}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 4. Monthly Overview bars */}
        <motion.div variants={stagger} className="sm:col-span-2">
          <Card>
            <CardHeader icon={TrendingUp} title="Monthly Overview" />
            <div className="space-y-3">
              {[
                { label: 'Income', value: monthlyStats.income, color: '#10B981', max: Math.max(monthlyStats.income, monthlyStats.outgoing, 1) },
                { label: 'Outgoing', value: monthlyStats.outgoing, color: '#EF4444', max: Math.max(monthlyStats.income, monthlyStats.outgoing, 1) },
              ].map(({ label, value, color, max }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{label}</span>
                    <span className="font-mono text-white">{formatCurrency(value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* 5. Projected EOM Balance */}
        <motion.div variants={stagger}>
          <Card style={projectedEOM < 0 ? { boxShadow: '0 0 24px rgba(239,68,68,0.5)' } : {}}>
            <CardHeader icon={CalendarDays} title="Projected EOM" />
            <AnimatedCurrency
              value={projectedEOM}
              className={`text-2xl font-bold font-mono ${projectedEOM >= 0 ? 'text-white' : 'text-red-400'}`}
            />
            <p className="text-xs text-slate-500 mt-1">End of {format(today, 'MMMM')}</p>
            {projectedEOM < 0 && (
              <div className="mt-2 flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-red-400" />
                <span className="text-xs text-red-400">Negative projected</span>
              </div>
            )}
          </Card>
        </motion.div>

        {/* 6. Spending Breakdown */}
        <motion.div variants={stagger} className="sm:col-span-2">
          <Card>
            <CardHeader icon={ShoppingCart} iconColor="text-blue-400" iconBg="bg-blue-500/15" title="Spending Breakdown" />
            {spendingByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={spendingByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    animationBegin={300}
                    animationDuration={1200}
                  >
                    {spendingByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => formatCurrency(val)}
                    contentStyle={{ backgroundColor: '#0F1629', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F1F5F9', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                <ShoppingCart size={24} className="mb-2 opacity-40" />
                <p className="text-sm">No spending data yet</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* 7. Upcoming Payments */}
        <motion.div variants={stagger} className="sm:col-span-2">
          <Card>
            <CardHeader icon={CalendarDays} iconColor="text-blue-400" iconBg="bg-blue-500/15" title="Upcoming Payments (7 days)" />
            {upcomingPayments.length > 0 ? (
              <div className="space-y-2">
                {upcomingPayments.map(ev => {
                  const dotColor = {
                    income: 'bg-emerald-400',
                    bill: 'bg-red-400',
                    tilt: 'bg-amber-400',
                    afterpay: 'bg-blue-400',
                  }[ev.type] || 'bg-slate-400'
                  return (
                    <div key={ev.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
                        <div>
                          <p className="text-sm text-white">{ev.name}</p>
                          <p className="text-xs text-slate-500">{format(ev.date, 'EEE, MMM d')}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-mono font-medium ${ev.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {ev.amount >= 0 ? '+' : ''}{formatCurrency(ev.amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">No payments in next 7 days</p>
            )}
          </Card>
        </motion.div>

        {/* 8. TILT Status */}
        <motion.div variants={stagger}>
          <Card>
            <CardHeader icon={Zap} iconColor="text-amber-400" iconBg="bg-amber-500/15" title="TILT Status" />
            {activeTilt ? (
              <>
                <div className="flex justify-center">
                  <TiltArc used={activeTilt.amountUsed} max={activeTilt.creditLimit} />
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Repayment</span>
                    <span className="text-slate-300">{format(parseISO(activeTilt.repaymentDate), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Days left</span>
                    <span className={`font-medium ${differenceInDays(parseISO(activeTilt.repaymentDate), today) <= 3 ? 'text-red-400' : 'text-slate-300'}`}>
                      {Math.max(0, differenceInDays(parseISO(activeTilt.repaymentDate), today))}d
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Fee</span>
                    <span className="text-slate-300">${activeTilt.instantFee}</span>
                  </div>
                </div>
                <div className="mt-2 px-2 py-0.5 rounded-full text-xs font-medium text-center"
                  style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
                  Active
                </div>
              </>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">No active TILT advance</p>
            )}
          </Card>
        </motion.div>

        {/* 9. Earn In */}
        <motion.div variants={stagger}>
          <Card>
            <CardHeader icon={TrendingUp} iconColor="text-emerald-400" iconBg="bg-emerald-500/15" title="Earn In Cycle" />
            {activeEarnIn ? (
              <>
                <p className="text-xs text-slate-500 mb-3">Cycle starting {format(parseISO(activeEarnIn.cycleStartDate), 'MMM d')}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {['fri', 'sat', 'sun', 'mon'].map(day => {
                    const taken = activeEarnIn[`${day}_taken`]
                    const amount = activeEarnIn.amounts[day]
                    return (
                      <div key={day} className="flex flex-col items-center gap-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          taken ? 'bg-emerald-500/30 border border-emerald-500/50' : 'bg-white/5 border border-white/10'
                        }`}>
                          {taken
                            ? <CheckCircle2 size={14} className="text-emerald-400" />
                            : <Circle size={14} className="text-slate-600" />
                          }
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase">{day}</span>
                        <span className="text-[10px] text-slate-400 font-mono">${amount}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-xs">
                  <span className="text-slate-500">Repayment</span>
                  <span className="text-red-400 font-mono">{formatCurrency(activeEarnIn.repaymentAmount)}</span>
                </div>
              </>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">No active Earn In cycle</p>
            )}
          </Card>
        </motion.div>

        {/* 10. Recent Transactions */}
        <motion.div variants={stagger} className="sm:col-span-2 lg:col-span-3">
          <Card>
            <CardHeader icon={Receipt} iconColor="text-slate-400" iconBg="bg-slate-500/15" title="Recent Transactions"
              action={
                <a href="/expenses" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                  View all <ArrowRight size={12} />
                </a>
              }
            />
            {recentTxs.length > 0 ? (
              <div className="space-y-2">
                {recentTxs.map(tx => {
                  const config = categoryConfig[tx.category] || categoryConfig.Other
                  const Icon = config.icon
                  return (
                    <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${config.color}20` }}>
                          <Icon size={14} style={{ color: config.color }} />
                        </div>
                        <div>
                          <p className="text-sm text-white">{tx.note || tx.category}</p>
                          <p className="text-xs text-slate-500">{tx.account} · {format(parseISO(tx.date), 'MMM d')}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-mono font-medium ${tx.type === 'in' ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {tx.type === 'in' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 gap-2 text-slate-500">
                <Receipt size={28} className="opacity-30" />
                <p className="text-sm">No transactions yet</p>
                <a href="/expenses" className="text-xs text-amber-400 hover:text-amber-300">Add your first transaction</a>
              </div>
            )}
          </Card>
        </motion.div>

        {/* 11. Mini Calendar */}
        <motion.div variants={stagger} className="lg:col-span-1">
          <Card>
            <CardHeader icon={CalendarDays} title={format(today, 'MMMM yyyy')} />
            <MiniCalendar events={calendarEvents} />
            <div className="mt-3 flex gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Income</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />Bill</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />Other</span>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}

// Need Receipt import
function Receipt({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
      <path d="M16 8H8m8 4H8m8 4h-4"/>
    </svg>
  )
}
