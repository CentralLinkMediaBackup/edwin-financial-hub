import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  Wallet, CalendarDays, TrendingUp, AlertTriangle,
  ArrowRight, Zap, CheckCircle2, Circle, DollarSign,
  Target, CheckSquare, Dumbbell, Plus, ChevronRight,
  Flame, Activity, Receipt, BarChart2, CreditCard
} from 'lucide-react'
import {
  format, parseISO, isAfter, isBefore, addDays,
  endOfMonth, differenceInDays, isSameMonth
} from 'date-fns'
import { useStore } from '../store/useStore'
import { WEEK_MEAL_PLAN } from './Cooking'
import { useAnimatedCounter } from '../hooks/useAnimatedCounter'
import { formatCurrency, formatDate } from '../lib/formatters'
import { supabase } from '../lib/supabase'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

// ── Helpers ───────────────────────────────────────────────────────────────────
function AnimatedCurrency({ value, className = '', duration = 1200 }) {
  const animated = useAnimatedCounter(Math.abs(value), duration)
  const sign = value < 0 ? '-' : ''
  return (
    <span className={className}>
      {sign}${animated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const card = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ children, className = '', style = {} }) {
  return (
    <div
      className={`bg-white rounded-xl border p-5 ${className}`}
      style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', ...style }}
    >
      {children}
    </div>
  )
}

function CardHeader({ icon: Icon, iconBg, iconColor, title, linkTo, linkLabel }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
          <Icon size={15} style={{ color: iconColor }} />
        </div>
        <span className="text-sm font-semibold" style={{ color: '#374151' }}>{title}</span>
      </div>
      {linkTo && (
        <Link to={linkTo} className="text-xs flex items-center gap-1 font-medium hover:opacity-70 transition-opacity" style={{ color: '#d97706' }}>
          {linkLabel || 'View all'} <ArrowRight size={12} />
        </Link>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const accounts      = useStore(s => s.accounts)
  const transactions  = useStore(s => s.transactions)
  const bills         = useStore(s => s.bills)
  const paychecks     = useStore(s => s.paychecks)
  const tiltLogs      = useStore(s => s.tiltLogs)
  const earnInLogs    = useStore(s => s.earnInLogs)
  const settings      = useStore(s => s.settings)
  const navigate      = useNavigate()

  const [goals,    setGoals]    = useState([])
  const [habits,   setHabits]   = useState([])
  const [habitLogs, setHabitLogs] = useState([])
  const [workouts, setWorkouts] = useState([])

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  // Load new Supabase tables
  useEffect(() => {
    const load = async () => {
      try {
        const [g, h, hl, w] = await Promise.all([
          supabase.from('goals').select('*').eq('status', 'active').limit(5),
          supabase.from('habits').select('*').limit(10),
          supabase.from('habit_logs').select('*').gte('date', format(addDays(today, -7), 'yyyy-MM-dd')),
          supabase.from('workouts').select('*').order('date', { ascending: false }).limit(7),
        ])
        if (g.data) setGoals(g.data)
        if (h.data) setHabits(h.data)
        if (hl.data) setHabitLogs(hl.data)
        if (w.data) setWorkouts(w.data)
      } catch (_) {}
    }
    load()
  }, [])

  const totalBalance     = Object.values(accounts).reduce((a, b) => a + b, 0)
  const chaseBalance     = accounts.chaseDebit || 0
  const cashBalance      = accounts.cash || 0
  const spendableBalance = chaseBalance + cashBalance

  const nextPaycheck = useMemo(() =>
    paychecks
      .filter(p => !p.received && isAfter(parseISO(p.date), today))
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null
  , [paychecks])

  const daysUntilPay = nextPaycheck
    ? differenceInDays(parseISO(nextPaycheck.date), today)
    : null

  const nextBill = useMemo(() => {
    const upcoming = bills
      .filter(b => b.isActive && b.dueDay)
      .map(b => {
        const d = new Date(today.getFullYear(), today.getMonth(), b.dueDay)
        if (d < today) d.setMonth(d.getMonth() + 1)
        return { ...b, nextDue: d }
      })
      .sort((a, b) => a.nextDue - b.nextDue)
    return upcoming[0] || null
  }, [bills])

  const warningDays = useMemo(() => {
    let running = totalBalance
    const warnings = []
    for (let i = 1; i <= 30; i++) {
      const day = addDays(today, i)
      // Monthly bills: dueDay is day-of-month
      bills.filter(b => b.isActive && b.dueDay && b.frequency !== 'weekly').forEach(b => {
        if (new Date(day.getFullYear(), day.getMonth(), b.dueDay).toDateString() === day.toDateString())
          running -= b.amount
      })
      // Weekly bills: dueDay is JS day-of-week (1=Mon, 2=Tue, …)
      bills.filter(b => b.isActive && b.dueDay != null && b.frequency === 'weekly').forEach(b => {
        if (day.getDay() === b.dueDay)
          running -= b.amount
      })
      paychecks.forEach(p => {
        if (parseISO(p.date).toDateString() === day.toDateString() && !p.received)
          running += p.amount
      })
      if (running < 20) warnings.push({ date: day, amount: running })
    }
    return warnings
  }, [totalBalance, bills, paychecks])

  // 30-day balance trend (fake from transactions)
  const balanceTrend = useMemo(() => {
    const days = []
    for (let i = 29; i >= 0; i--) {
      const d = addDays(today, -i)
      const dStr = format(d, 'yyyy-MM-dd')
      const dayTxs = transactions.filter(t => t.date === dStr)
      const delta = dayTxs.reduce((s, t) => t.type === 'in' ? s + t.amount : s - t.amount, 0)
      days.push({ date: format(d, 'MMM d'), delta })
    }
    let running = totalBalance
    return days.map((d, i) => {
      if (i < days.length - 1) running -= d.delta
      return { ...d, value: Math.max(0, running) }
    }).reverse().map((d, i, arr) => {
      let v = totalBalance
      for (let j = 0; j < i; j++) v -= arr[j].delta
      return { ...d, value: Math.max(0, v) }
    })
  }, [transactions, totalBalance])

  // Habit streaks
  const habitStreaks = useMemo(() => {
    return habits.slice(0, 3).map(h => {
      const logs = habitLogs
        .filter(l => l.habit_id === h.id && l.completed)
        .map(l => l.date)
        .sort()
        .reverse()
      let streak = 0
      let checkDate = todayStr
      for (const logDate of logs) {
        if (logDate === checkDate) {
          streak++
          const d = parseISO(checkDate)
          checkDate = format(addDays(d, -1), 'yyyy-MM-dd')
        } else break
      }
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = format(addDays(today, -6 + i), 'yyyy-MM-dd')
        return logs.includes(d)
      })
      return { ...h, streak, last7 }
    })
  }, [habits, habitLogs, todayStr])

  // Today's goals
  const todaysGoals = goals.slice(0, 4)
  const completedGoals = todaysGoals.filter(g => g.progress >= 100).length

  // Weekly workout summary
  const weekWorkouts = useMemo(() => {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    return days.map((label, i) => {
      const d = format(addDays(today, -(today.getDay() === 0 ? 6 : today.getDay() - 1) + i), 'yyyy-MM-dd')
      const w = workouts.find(wo => wo.date === d)
      return { label, workout: w || null, date: d }
    })
  }, [workouts, today])

  const latestWorkout = workouts[0] || null
  const workoutsThisWeek = weekWorkouts.filter(d => d.workout && d.workout.type !== 'Rest').length

  const afterpayItems = useStore(s => s.afterpayItems) || []

  const activeTilt   = tiltLogs.find(t => t.status === 'active')
  const activeEarnIn = earnInLogs.find(l => l.status === 'active') || earnInLogs[0]

  // Tonight's dinner
  const todayMealPlan = WEEK_MEAL_PLAN[today.getDay()]

  // Afterpay — find active plan + next payment
  const activeAP = afterpayItems[0] || null
  const nextAP = activeAP
    ? (activeAP.payments || []).filter(p => p.status !== 'paid').sort((a,b) => a.dueDate.localeCompare(b.dueDate))[0]
    : null
  const apPaidCount = activeAP ? (activeAP.payments || []).filter(p => p.status === 'paid').length : 0
  const apTotalCount = activeAP ? (activeAP.payments || []).length : 0

  const displayName = settings?.general?.displayName || settings?.displayName || 'Zack'

  const typeColors = {
    Strength: '#10b981',
    Cardio:   '#2563eb',
    HIIT:     '#ef4444',
    Yoga:     '#8b5cf6',
    Rest:     '#94a3b8',
  }

  return (
    <div className="p-5 md:p-7 max-w-[1400px] mx-auto">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0f172a', fontFamily: 'Inter, sans-serif' }}>
            {greeting()}, {displayName}!
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            {format(today, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/fitness')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-50"
            style={{ color: '#374151', borderColor: '#e2e8f0' }}
          >
            <Activity size={13} /> Log Workout
          </button>
          <button
            onClick={() => navigate('/expenses')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
            style={{ backgroundColor: '#d97706' }}
          >
            <Plus size={13} /> Add Transaction
          </button>
        </div>
      </motion.div>

      {/* ── Warning banner ───────────────────────────────────────────── */}
      {warningDays.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-5 rounded-xl p-3.5 flex items-start gap-3 border"
          style={{ background: '#fff5f5', borderColor: '#fecaca' }}
        >
          <AlertTriangle size={16} className="flex-shrink-0 mt-px" style={{ color: '#dc2626' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#b91c1c' }}>Balance drops below $20 in the next 14 days</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
              {warningDays.slice(0, 3).map((w, i) => (
                <p key={i} className="text-xs" style={{ color: '#dc2626' }}>
                  {format(w.date, 'EEE MMM d')} → {formatCurrency(w.amount)}
                </p>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Main grid ────────────────────────────────────────────────── */}
      <motion.div variants={container} initial="hidden" animate="show">
        <div className="grid grid-cols-12 gap-5">

          {/* ─── LEFT/MAIN ─────────────────────────────────────────── */}
          <div className="col-span-12 xl:col-span-9 space-y-5">

            {/* Row 1: Finance + Goals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* FINANCES CARD */}
              <motion.div variants={card}>
                <Card>
                  <CardHeader icon={Wallet} iconBg="#fef3c7" iconColor="#d97706" title="Finances" linkTo="/finances" linkLabel="Finances" />

                  <div className="mb-4">
                    <p className="text-xs font-medium mb-0.5" style={{ color: '#94a3b8' }}>Real Spendable Total</p>
                    <AnimatedCurrency
                      value={spendableBalance}
                      className="text-3xl font-bold"
                      duration={1200}
                    />
                    {/* Chase + Cash breakdown */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs" style={{ color: '#64748b' }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: '#2563eb' }} />
                        Chase {chaseBalance < 0
                          ? <span style={{ color: '#dc2626' }}>{formatCurrency(chaseBalance)}</span>
                          : <span style={{ color: '#374151' }}>{formatCurrency(chaseBalance)}</span>
                        }
                      </span>
                      <span className="text-xs" style={{ color: '#cbd5e1' }}>+</span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: '#64748b' }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: '#d97706' }} />
                        Cash <span style={{ color: '#374151' }}>{formatCurrency(cashBalance)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Trend sparkline */}
                  <div className="h-14 mb-4 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={balanceTrend.slice(-14)}>
                        <Line type="monotone" dataKey="value" stroke="#d97706" strokeWidth={2} dot={false} />
                        <Tooltip
                          content={({ active, payload }) =>
                            active && payload?.length ? (
                              <div className="text-xs bg-gray-900 text-white px-2 py-1 rounded shadow">
                                {formatCurrency(payload[0].value)}
                              </div>
                            ) : null
                          }
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Info rows */}
                  <div className="space-y-2">
                    {nextBill && (
                      <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: '#f1f5f9' }}>
                        <span className="text-xs" style={{ color: '#64748b' }}>
                          Next bill: <span style={{ color: '#374151' }} className="font-medium">{nextBill.name}</span>
                        </span>
                        <span className="text-xs font-medium" style={{ color: '#dc2626' }}>
                          -{formatCurrency(nextBill.amount)}
                        </span>
                      </div>
                    )}
                    {daysUntilPay !== null && (
                      <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: '#f1f5f9' }}>
                        <span className="text-xs" style={{ color: '#64748b' }}>Next paycheck</span>
                        <span className="text-xs font-medium" style={{ color: '#059669' }}>
                          in {daysUntilPay} day{daysUntilPay !== 1 ? 's' : ''} · {formatCurrency(nextPaycheck.amount)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quick links */}
                  <div className="mt-3 flex gap-2">
                    <Link
                      to="/expenses"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-50"
                      style={{ color: '#374151', borderColor: '#e2e8f0' }}
                    >
                      <Receipt size={12} /> Transactions →
                    </Link>
                    <Link
                      to="/finances"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-50"
                      style={{ color: '#374151', borderColor: '#e2e8f0' }}
                    >
                      <BarChart2 size={12} /> Accounts →
                    </Link>
                  </div>
                </Card>
              </motion.div>

              {/* TODAY'S GOALS CARD */}
              <motion.div variants={card}>
                <Card>
                  <CardHeader icon={Target} iconBg="#ede9fe" iconColor="#7c3aed" title="Today's Goals" linkTo="/goals" />

                  {todaysGoals.length > 0 ? (
                    <>
                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs" style={{ color: '#64748b' }}>
                            {completedGoals} of {todaysGoals.length} complete
                          </span>
                          <span className="text-xs font-semibold" style={{ color: '#7c3aed' }}>
                            {Math.round((completedGoals / todaysGoals.length) * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ backgroundColor: '#f1f5f9' }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: '#7c3aed' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round((completedGoals / todaysGoals.length) * 100)}%` }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        {todaysGoals.map(g => (
                          <div key={g.id} className="flex items-center gap-2.5">
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                              style={{
                                backgroundColor: g.progress >= 100 ? '#ede9fe' : '#f8fafc',
                                border: `1.5px solid ${g.progress >= 100 ? '#7c3aed' : '#e2e8f0'}`,
                              }}
                            >
                              {g.progress >= 100 && <CheckCircle2 size={10} style={{ color: '#7c3aed' }} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate" style={{ color: g.progress >= 100 ? '#94a3b8' : '#374151', textDecoration: g.progress >= 100 ? 'line-through' : 'none' }}>
                                {g.title}
                              </p>
                              <div className="h-1 rounded-full mt-1" style={{ backgroundColor: '#f1f5f9' }}>
                                <div className="h-full rounded-full" style={{ width: `${g.progress}%`, backgroundColor: '#7c3aed', opacity: 0.6 }} />
                              </div>
                            </div>
                            <span className="text-xs flex-shrink-0" style={{ color: '#94a3b8' }}>{g.progress}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center">
                      <Target size={28} className="mx-auto mb-2 opacity-20" style={{ color: '#94a3b8' }} />
                      <p className="text-sm" style={{ color: '#94a3b8' }}>No active goals yet</p>
                      <Link
                        to="/goals"
                        className="inline-flex items-center gap-1 mt-2 text-xs font-medium"
                        style={{ color: '#7c3aed' }}
                      >
                        <Plus size={12} /> Add a goal
                      </Link>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t" style={{ borderColor: '#f1f5f9' }}>
                    <Link
                      to="/goals"
                      className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-50"
                      style={{ color: '#374151', borderColor: '#e2e8f0' }}
                    >
                      <Plus size={12} /> Add Goal
                    </Link>
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Row 2: Habits + Fitness */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* HABIT STREAKS CARD */}
              <motion.div variants={card}>
                <Card>
                  <CardHeader icon={CheckSquare} iconBg="#dcfce7" iconColor="#16a34a" title="Habit Streaks" linkTo="/habits" />

                  {habitStreaks.length > 0 ? (
                    <>
                      <div className="space-y-4">
                        {habitStreaks.map(h => (
                          <div key={h.id}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: h.color || '#16a34a' }}
                                />
                                <span className="text-sm font-medium" style={{ color: '#374151' }}>{h.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Flame size={12} style={{ color: '#d97706' }} />
                                <span className="text-xs font-bold" style={{ color: '#d97706' }}>{h.streak}</span>
                              </div>
                            </div>
                            {/* 7-day dot grid */}
                            <div className="flex gap-1">
                              {h.last7.map((done, i) => (
                                <div
                                  key={i}
                                  className="flex-1 h-2.5 rounded-sm"
                                  style={{
                                    backgroundColor: done
                                      ? (h.color || '#16a34a')
                                      : '#f1f5f9',
                                    opacity: done ? 1 : 1,
                                  }}
                                />
                              ))}
                            </div>
                            <div className="flex justify-between mt-0.5">
                              {['M','T','W','T','F','S','S'].map((d, i) => (
                                <span key={i} className="flex-1 text-center" style={{ fontSize: '9px', color: '#cbd5e1' }}>{d}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: '#f1f5f9' }}>
                        <span className="text-xs" style={{ color: '#94a3b8' }}>
                          Total active: {habits.length} habit{habits.length !== 1 ? 's' : ''}
                        </span>
                        <Link to="/habits" className="text-xs font-medium" style={{ color: '#16a34a' }}>
                          View all →
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center">
                      <CheckSquare size={28} className="mx-auto mb-2 opacity-20" style={{ color: '#94a3b8' }} />
                      <p className="text-sm" style={{ color: '#94a3b8' }}>No habits tracked yet</p>
                      <Link
                        to="/habits"
                        className="inline-flex items-center gap-1 mt-2 text-xs font-medium"
                        style={{ color: '#16a34a' }}
                      >
                        <Plus size={12} /> Add a habit
                      </Link>
                    </div>
                  )}
                </Card>
              </motion.div>

              {/* GYM & FITNESS CARD */}
              <motion.div variants={card}>
                <Card>
                  <CardHeader icon={Dumbbell} iconBg="#fee2e2" iconColor="#dc2626" title="Gym & Fitness" linkTo="/fitness" />

                  <div className="mb-4">
                    {latestWorkout ? (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${typeColors[latestWorkout.type] || '#94a3b8'}18`,
                              color: typeColors[latestWorkout.type] || '#94a3b8',
                            }}
                          >
                            {latestWorkout.type || 'Workout'}
                          </span>
                          <span className="text-xs" style={{ color: '#94a3b8' }}>
                            {latestWorkout.date === todayStr ? 'Today' : format(parseISO(latestWorkout.date), 'MMM d')}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: '#374151' }}>
                          {latestWorkout.notes || `${latestWorkout.duration_minutes || '--'} min workout`}
                        </p>
                        {latestWorkout.exercises?.length > 0 && (
                          <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                            {latestWorkout.exercises.length} exercise{latestWorkout.exercises.length !== 1 ? 's' : ''} logged
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm" style={{ color: '#94a3b8' }}>No workouts logged yet</p>
                    )}
                  </div>

                  {/* Weekly activity bar */}
                  <div className="mb-4">
                    <p className="text-xs mb-2 font-medium" style={{ color: '#64748b' }}>
                      This week — {workoutsThisWeek}/7 days active
                    </p>
                    <div className="grid grid-cols-7 gap-1">
                      {weekWorkouts.map(({ label, workout }, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded"
                            style={{
                              height: '28px',
                              backgroundColor: workout
                                ? (typeColors[workout.type] || '#10b981')
                                : '#f1f5f9',
                              opacity: workout?.type === 'Rest' ? 0.4 : 1,
                            }}
                          />
                          <span style={{ fontSize: '9px', color: '#94a3b8' }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/fitness')}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-50"
                    style={{ color: '#374151', borderColor: '#e2e8f0' }}
                  >
                    <Plus size={12} /> Log Workout
                  </button>
                </Card>
              </motion.div>
            </div>

            {/* Row 3: Financial detail cards (TILT + EarnIn) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* TILT summary */}
              <motion.div variants={card}>
                <Card>
                  <CardHeader icon={Zap} iconBg="#fef3c7" iconColor="#d97706" title="TILT Credit" linkTo="/tilt" />
                  {activeTilt ? (
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-2xl font-bold" style={{ color: '#374151' }}>
                          {formatCurrency(activeTilt.amountUsed)}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                          of {formatCurrency(activeTilt.creditLimit || 400)} limit
                        </p>
                        <div className="h-1.5 rounded-full mt-2" style={{ backgroundColor: '#f1f5f9' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (activeTilt.amountUsed / (activeTilt.creditLimit || 400)) * 100)}%`,
                              backgroundColor: '#d97706',
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: '#94a3b8' }}>Due</p>
                        <p className="text-sm font-semibold mt-0.5" style={{ color: '#374151' }}>
                          {format(parseISO(activeTilt.repaymentDate), 'MMM d')}
                        </p>
                        <p className="text-lg font-bold" style={{ color: differenceInDays(parseISO(activeTilt.repaymentDate), today) <= 2 ? '#dc2626' : '#d97706' }}>
                          {Math.max(0, differenceInDays(parseISO(activeTilt.repaymentDate), today))}d
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-sm font-medium" style={{ color: '#059669' }}>✓ No active advance</p>
                      <Link to="/tilt" className="text-xs mt-1 inline-block" style={{ color: '#d97706' }}>
                        Take advance →
                      </Link>
                    </div>
                  )}
                </Card>
              </motion.div>

              {/* EarnIn summary */}
              <motion.div variants={card}>
                <Card>
                  <CardHeader icon={TrendingUp} iconBg="#dcfce7" iconColor="#059669" title="Earn In" linkTo="/earnin" />
                  {activeEarnIn ? (
                    <div>
                      <div className="grid grid-cols-4 gap-1 mb-3">
                        {['fri','sat','sun','mon'].map(day => {
                          const taken = activeEarnIn[`${day}_taken`]
                          const defAmts = { fri: 155.99, sat: 155.99, sun: 155.99, mon: 53.99 }
                          const amt = activeEarnIn.amounts?.[day] || defAmts[day]
                          return (
                            <div key={day} className="flex flex-col items-center gap-1">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center border"
                                style={{
                                  backgroundColor: taken ? '#dcfce7' : '#f8fafc',
                                  borderColor: taken ? '#16a34a' : '#e2e8f0',
                                }}
                              >
                                {taken
                                  ? <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
                                  : <Circle size={14} style={{ color: '#cbd5e1' }} />
                                }
                              </div>
                              <span className="text-[9px] uppercase font-medium" style={{ color: '#94a3b8' }}>{day}</span>
                              <span className="text-[9px] font-mono" style={{ color: '#64748b' }}>${amt}</span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex justify-between text-xs pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
                        <span style={{ color: '#64748b' }}>Repayment</span>
                        <span className="font-semibold font-mono" style={{ color: '#dc2626' }}>
                          -{formatCurrency(activeEarnIn.repaymentAmount || 521.96)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-sm" style={{ color: '#94a3b8' }}>No active cycle</p>
                      <Link to="/earnin" className="text-xs mt-1 inline-block" style={{ color: '#059669' }}>
                        Start cycle →
                      </Link>
                    </div>
                  )}
                </Card>
              </motion.div>
            </div>

            {/* Row 4: Afterpay + Tonight's Dinner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* AFTERPAY CARD */}
              <motion.div variants={card}>
                <Card>
                  <CardHeader icon={CreditCard} iconBg="#fce7f3" iconColor="#db2777" title="Afterpay" linkTo="/afterpay" linkLabel="View" />
                  {activeAP ? (
                    <div>
                      <p className="text-sm font-semibold mb-1" style={{ color: '#374151' }}>{activeAP.name}</p>
                      {nextAP && (
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-xs" style={{ color: '#94a3b8' }}>Next payment</p>
                            <p className="text-lg font-bold" style={{ color: '#db2777' }}>${nextAP.amount.toFixed(2)}</p>
                            <p className="text-xs" style={{ color: '#64748b' }}>{format(parseISO(nextAP.dueDate), 'MMM d, yyyy')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs" style={{ color: '#94a3b8' }}>Progress</p>
                            <p className="text-xl font-bold" style={{ color: '#374151' }}>{apPaidCount}/{apTotalCount}</p>
                            <p className="text-xs" style={{ color: '#94a3b8' }}>payments</p>
                          </div>
                        </div>
                      )}
                      {/* Progress bar */}
                      <div className="h-2 rounded-full mb-2" style={{ backgroundColor: '#f1f5f9' }}>
                        <div className="h-full rounded-full" style={{ width: `${apTotalCount > 0 ? (apPaidCount / apTotalCount) * 100 : 0}%`, backgroundColor: '#db2777' }} />
                      </div>
                      <p className="text-xs font-medium text-center" style={{ color: '#059669' }}>💚 Dad covers it — $0 net cost</p>
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-sm" style={{ color: '#94a3b8' }}>No active Afterpay plans</p>
                    </div>
                  )}
                </Card>
              </motion.div>

              {/* TONIGHT'S DINNER CARD */}
              <motion.div variants={card}>
                <Card>
                  <CardHeader icon={CalendarDays} iconBg="#fef9ee" iconColor="#d97706" title="Tonight's Dinner 🍳" linkTo="/cooking" linkLabel="Cooking" />
                  {todayMealPlan ? (
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-4xl">{todayMealPlan.emoji}</div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#374151' }}>{todayMealPlan.title}</p>
                          {todayMealPlan.eatOut && <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>Enjoy your date night!</p>}
                        </div>
                      </div>
                      {!todayMealPlan.eatOut ? (
                        <Link to="/cooking" className="flex items-center justify-center gap-1.5 py-2 w-full rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#d97706' }}>
                          View Recipe →
                        </Link>
                      ) : (
                        <div className="rounded-lg py-2 px-3 text-center text-xs font-medium" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                          🎉 Date Night — No cooking tonight!
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-sm" style={{ color: '#94a3b8' }}>No meal planned for today</p>
                      <Link to="/cooking" className="text-xs mt-1 inline-block" style={{ color: '#d97706' }}>View meal plan →</Link>
                    </div>
                  )}
                </Card>
              </motion.div>
            </div>

          </div>

          {/* ─── RIGHT SIDEBAR (QUICK ACTIONS) ─────────────────────── */}
          <div className="col-span-12 xl:col-span-3">
            <motion.div variants={card} className="xl:sticky xl:top-7">
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f1f5f9' }}>
                    <Plus size={15} style={{ color: '#64748b' }} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#374151' }}>Quick Actions</span>
                </div>

                <div className="space-y-2">
                  {[
                    { label: 'Log Workout',      icon: Dumbbell,    to: '/fitness',  color: '#fee2e2', iconColor: '#dc2626' },
                    { label: 'Add Habit',         icon: CheckSquare, to: '/habits',   color: '#dcfce7', iconColor: '#16a34a' },
                    { label: 'New Goal',          icon: Target,      to: '/goals',    color: '#ede9fe', iconColor: '#7c3aed' },
                    { label: 'Add Transaction',   icon: Plus,        to: '/expenses', color: '#fef3c7', iconColor: '#d97706' },
                  ].map(({ label, icon: Icon, to, color, iconColor }) => (
                    <Link
                      key={label}
                      to={to}
                      className="flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm hover:-translate-y-px"
                      style={{ borderColor: '#e2e8f0', backgroundColor: '#fafafa' }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
                        <Icon size={15} style={{ color: iconColor }} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: '#374151' }}>{label}</span>
                      <ChevronRight size={14} className="ml-auto flex-shrink-0" style={{ color: '#cbd5e1' }} />
                    </Link>
                  ))}
                </div>

                {/* Upcoming bills / next 7 days */}
                <div className="mt-5 pt-4 border-t" style={{ borderColor: '#f1f5f9' }}>
                  <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                    Next 7 Days
                  </p>
                  {(() => {
                    const evs = []
                    const in7 = addDays(today, 7)
                    // Monthly bills
                    bills.filter(b => b.isActive && b.dueDay && b.frequency !== 'weekly').forEach(b => {
                      const d = new Date(today.getFullYear(), today.getMonth(), b.dueDay)
                      if ((isAfter(d, today) || d.toDateString() === today.toDateString()) && isBefore(d, in7))
                        evs.push({ name: b.name, amount: -b.amount, date: d, type: 'bill' })
                    })
                    // Weekly bills — find each matching day-of-week in the next 7 days
                    bills.filter(b => b.isActive && b.dueDay != null && b.frequency === 'weekly').forEach(b => {
                      for (let j = 0; j <= 7; j++) {
                        const d = addDays(today, j)
                        if (d.getDay() === b.dueDay && (isAfter(d, today) || d.toDateString() === today.toDateString()) && isBefore(d, in7))
                          evs.push({ name: b.name, amount: -b.amount, date: d, type: 'bill' })
                      }
                    })
                    paychecks.forEach(p => {
                      const d = parseISO(p.date)
                      if ((isAfter(d, today) || d.toDateString() === today.toDateString()) && isBefore(d, in7))
                        evs.push({ name: p.source || 'Paycheck', amount: p.amount, date: d, type: 'income' })
                    })
                    evs.sort((a, b) => a.date - b.date)
                    if (!evs.length) return (
                      <p className="text-xs" style={{ color: '#94a3b8' }}>Nothing due this week</p>
                    )
                    return evs.slice(0, 4).map((ev, i) => (
                      <div key={i} className="flex items-center gap-2 py-1.5 border-b last:border-0" style={{ borderColor: '#f8fafc' }}>
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ev.type === 'income' ? '#059669' : '#dc2626' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate" style={{ color: '#374151' }}>{ev.name}</p>
                          <p className="text-[10px]" style={{ color: '#94a3b8' }}>{format(ev.date, 'EEE, MMM d')}</p>
                        </div>
                        <span
                          className="text-xs font-mono font-medium flex-shrink-0"
                          style={{ color: ev.amount >= 0 ? '#059669' : '#dc2626' }}
                        >
                          {ev.amount >= 0 ? '+' : ''}{formatCurrency(ev.amount)}
                        </span>
                      </div>
                    ))
                  })()}
                </div>

                {/* Nav shortcuts */}
                <div className="mt-4 pt-4 border-t space-y-1" style={{ borderColor: '#f1f5f9' }}>
                  <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#94a3b8' }}>Finance</p>
                  {[
                    { label: 'Accounts & Debts', to: '/debts' },
                    { label: 'Savings Goals', to: '/savings' },
                    { label: 'Calendar', to: '/calendar' },
                  ].map(({ label, to }) => (
                    <Link
                      key={to}
                      to={to}
                      className="flex items-center justify-between py-1.5 text-xs transition-colors hover:opacity-70"
                      style={{ color: '#64748b' }}
                    >
                      <span>{label}</span>
                      <ChevronRight size={12} />
                    </Link>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

        </div>
      </motion.div>
    </div>
  )
}
