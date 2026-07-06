import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, CalendarDays, DollarSign, Receipt,
  Zap, ShoppingBag, Bell, X, TrendingUp
} from 'lucide-react'
import {
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths,
  isAfter, isBefore, isSameDay as isSame
} from 'date-fns'
import { useStore } from '../store/useStore'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '../lib/formatters'
import { WEEK_MEAL_PLAN } from './Cooking'

// ── Build calendar events from all stores ─────────────────────────────────────
function useCalendarEvents(bills, paychecks, tiltLogs, afterpayItems, transactions, month) {
  return useMemo(() => {
    const events = []
    const year = month.getFullYear()
    const m = month.getMonth()

    // Bills (by dueDay, current month)
    bills.filter(b => b.isActive && b.dueDay).forEach(b => {
      const day = new Date(year, m, b.dueDay)
      if (isSameMonth(day, month)) {
        events.push({
          date: day,
          type: 'bill',
          name: b.name,
          amount: -b.amount,
          icon: Bell,
          color: '#EF4444',
          bg: 'rgba(239,68,68,0.15)',
        })
      }
    })

    // Paychecks
    paychecks.forEach(p => {
      const d = parseISO(p.date)
      if (isSameMonth(d, month)) {
        events.push({
          date: d,
          type: 'income',
          name: `Paycheck`,
          amount: p.amount,
          icon: DollarSign,
          color: '#10B981',
          bg: 'rgba(16,185,129,0.15)',
          source: p.source,
        })
      }
    })

    // TILT repayments
    tiltLogs.filter(t => t.status === 'active' && t.repaymentDate).forEach(t => {
      const d = parseISO(t.repaymentDate)
      if (isSameMonth(d, month)) {
        events.push({
          date: d,
          type: 'tilt',
          name: 'TILT Repayment',
          amount: -(t.amountUsed + (t.instantDelivery ? t.instantFee : 0)),
          icon: Zap,
          color: '#F59E0B',
          bg: 'rgba(245,158,11,0.15)',
        })
      }
    })

    // Afterpay payments
    afterpayItems.forEach(item => {
      item.payments.forEach(p => {
        const d = parseISO(p.dueDate)
        if (isSameMonth(d, month)) {
          events.push({
            date: d,
            type: 'afterpay',
            name: `Afterpay: ${item.name}`,
            amount: -p.amount,
            icon: ShoppingBag,
            color: '#3B82F6',
            bg: 'rgba(59,130,246,0.15)',
            status: p.status,
          })
        }
      })
    })

    // Transactions
    transactions.forEach(t => {
      const d = parseISO(t.date)
      if (isSameMonth(d, month)) {
        events.push({
          date: d,
          type: 'transaction',
          name: t.note || t.category,
          amount: t.type === 'in' ? t.amount : -t.amount,
          icon: Receipt,
          color: '#64748B',
          bg: 'rgba(100,116,139,0.15)',
        })
      }
    })

    return events
  }, [bills, paychecks, tiltLogs, afterpayItems, transactions, month])
}

// ── Day Drawer ────────────────────────────────────────────────────────────────
function DayDrawer({ day, events, onClose }) {
  const dayEvents = events.filter(e => isSameDay(e.date, day))
  const totalIn = dayEvents.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0)
  const totalOut = dayEvents.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0)

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="fixed right-0 top-0 h-full z-40 flex flex-col border-l border-white/10 shadow-2xl"
      style={{ width: '320px', backgroundColor: '#0F1629' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-5 border-b border-white/10">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">{format(day, 'EEEE')}</p>
          <h2 className="text-xl font-bold text-white mt-0.5">{format(day, 'MMMM d, yyyy')}</h2>
          {(totalIn > 0 || totalOut > 0) && (
            <div className="flex gap-3 mt-2 text-xs">
              {totalIn > 0 && <span className="text-emerald-400">+{formatCurrency(totalIn)}</span>}
              {totalOut > 0 && <span className="text-red-400">-{formatCurrency(totalOut)}</span>}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors mt-1"
        >
          <X size={18} />
        </button>
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {dayEvents.length > 0 ? (
          <div className="space-y-3">
            {dayEvents.map((ev, i) => {
              const Icon = ev.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: ev.bg, border: `1px solid ${ev.color}30` }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${ev.color}30` }}>
                    <Icon size={15} style={{ color: ev.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{ev.name}</p>
                    {ev.source && <p className="text-xs text-slate-500">{ev.source}</p>}
                    {ev.status && (
                      <p className="text-xs mt-0.5" style={{ color: ev.status === 'paid' ? '#10B981' : '#F59E0B' }}>
                        {ev.status.toUpperCase()}
                      </p>
                    )}
                  </div>
                  <span className={`text-sm font-mono font-medium flex-shrink-0 ${ev.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {ev.amount >= 0 ? '+' : ''}{formatCurrency(ev.amount)}
                  </span>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <CalendarDays size={28} className="text-slate-600 mb-2" />
            <p className="text-sm text-slate-500">No events on this day</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Pill ──────────────────────────────────────────────────────────────────────
function EventPill({ ev }) {
  return (
    <div
      className="text-[10px] px-1.5 py-0.5 rounded-full truncate leading-tight"
      style={{ backgroundColor: ev.bg, color: ev.color, border: `1px solid ${ev.color}40` }}
    >
      {ev.name.split(':')[0].split(' ').slice(0, 2).join(' ')}
    </div>
  )
}

// ── Dinner pill ───────────────────────────────────────────────────────────────
function DinnerPill({ day, onNavigate }) {
  const meal = WEEK_MEAL_PLAN[day.getDay()]
  if (!meal) return null
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onNavigate() }}
      title={meal.title}
      style={{ display:'flex', alignItems:'center', gap:2, background:'rgba(245,158,11,0.18)', border:'1px solid rgba(245,158,11,0.35)', borderRadius:99, padding:'1px 5px', cursor:'pointer', marginTop:2, width:'fit-content' }}
    >
      <span style={{ fontSize:10 }}>{meal.emoji}</span>
      {meal.eatOut && <span style={{ fontSize:8, color:'#f59e0b', fontWeight:600 }}>Eat Out</span>}
    </div>
  )
}

// ── Calendar Page ─────────────────────────────────────────────────────────────
export default function Calendar() {
  const bills = useStore(s => s.bills)
  const paychecks = useStore(s => s.paychecks)
  const tiltLogs = useStore(s => s.tiltLogs)
  const afterpayItems = useStore(s => s.afterpayItems)
  const transactions = useStore(s => s.transactions)

  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [slideDir, setSlideDir] = useState(1)

  const events = useCalendarEvents(bills, paychecks, tiltLogs, afterpayItems, transactions, currentMonth)

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const goToPrev = () => {
    setSlideDir(-1)
    setCurrentMonth(m => subMonths(m, 1))
    setSelectedDay(null)
  }
  const goToNext = () => {
    setSlideDir(1)
    setCurrentMonth(m => addMonths(m, 1))
    setSelectedDay(null)
  }
  const goToToday = () => {
    const now = new Date()
    setSlideDir(isAfter(now, currentMonth) ? 1 : -1)
    setCurrentMonth(now)
    setSelectedDay(null)
  }

  const dayEvents = useCallback((day) => events.filter(e => isSameDay(e.date, day)), [events])

  const monthKey = format(currentMonth, 'yyyy-MM')

  return (
    <div className="p-4 md:p-6 flex gap-0 relative">
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={goToPrev}
              className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <AnimatePresence mode="wait">
              <motion.h1
                key={monthKey}
                initial={{ opacity: 0, x: slideDir * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: slideDir * -20 }}
                transition={{ duration: 0.2 }}
                className="text-2xl font-bold text-white min-w-[200px] text-center"
              >
                {format(currentMonth, 'MMMM yyyy')}
              </motion.h1>
            </AnimatePresence>
            <button
              onClick={goToNext}
              className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-xl text-xs font-medium border border-white/10 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-4 flex-wrap text-xs text-slate-500">
          {[
            { label: 'Income', color: '#10B981' },
            { label: 'Bill', color: '#EF4444' },
            { label: 'TILT/Earn In', color: '#F59E0B' },
            { label: 'Afterpay', color: '#3B82F6' },
            { label: 'Transaction', color: '#64748B' },
          { label: 'Dinner 🍳', color: '#F59E0B' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: l.color }} />
              {l.label}
            </span>
          ))}
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-slate-500 py-2">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={monthKey}
            initial={{ opacity: 0, x: slideDir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDir * -40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="grid grid-cols-7 gap-1"
          >
            {calendarDays.map((day, i) => {
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              const isT = isToday(day)
              const evs = dayEvents(day)
              const maxPills = 2

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative min-h-[80px] p-1.5 rounded-xl text-left transition-all border flex flex-col ${
                    !isCurrentMonth ? 'opacity-30' : ''
                  } ${
                    isSelected
                      ? 'border-amber-500/50 bg-amber-500/10'
                      : isT
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-transparent hover:border-white/10 hover:bg-white/[0.03]'
                  }`}
                >
                  <span
                    className={`text-xs font-semibold self-start mb-1 ${
                      isT
                        ? 'text-amber-400'
                        : isCurrentMonth
                          ? 'text-slate-300'
                          : 'text-slate-600'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="flex flex-col gap-0.5 w-full">
                    {evs.slice(0, maxPills).map((ev, j) => (
                      <EventPill key={j} ev={ev} />
                    ))}
                    {evs.length > maxPills && (
                      <span className="text-[9px] text-slate-500 pl-1">+{evs.length - maxPills} more</span>
                    )}
                    {isCurrentMonth && <DinnerPill day={day} onNavigate={() => navigate('/cooking')} />}
                  </div>
                </button>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Day Drawer */}
      <AnimatePresence>
        {selectedDay && (
          <>
            {/* Backdrop on mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 md:hidden"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
              onClick={() => setSelectedDay(null)}
            />
            <DayDrawer
              day={selectedDay}
              events={events}
              onClose={() => setSelectedDay(null)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
