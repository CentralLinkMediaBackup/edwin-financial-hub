import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Receipt, CreditCard, Zap, TrendingUp, FileText,
  PiggyBank, Wallet, Bell, ShoppingBag, ArrowRight, DollarSign
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { formatCurrency } from '../lib/formatters'
import { format } from 'date-fns'

const financeLinks = [
  {
    path: '/expenses',
    icon: Receipt,
    label: 'Transaction Tracker',
    desc: 'Log and review all income & expenses',
    color: '#fef3c7',
    iconColor: '#d97706',
  },
  {
    path: '/debts',
    icon: CreditCard,
    label: 'Debts',
    desc: 'Track balances, APR, and payoff dates',
    color: '#fee2e2',
    iconColor: '#dc2626',
  },
  {
    path: '/tilt',
    icon: Zap,
    label: 'TILT',
    desc: 'Manage your TILT credit advances',
    color: '#fef9c3',
    iconColor: '#ca8a04',
  },
  {
    path: '/earnin',
    icon: TrendingUp,
    label: 'Earn In',
    desc: 'Track your EarnIn advance cycles',
    color: '#dcfce7',
    iconColor: '#16a34a',
  },
  {
    path: '/bills',
    icon: FileText,
    label: 'Monthly Bills',
    desc: 'View and manage recurring bills',
    color: '#e0f2fe',
    iconColor: '#0284c7',
  },
  {
    path: '/savings',
    icon: PiggyBank,
    label: 'Savings',
    desc: 'Savings goals and deposit history',
    color: '#f0fdf4',
    iconColor: '#059669',
  },
  {
    path: '/paychecks',
    icon: Wallet,
    label: 'Paychecks',
    desc: 'Upcoming and past paycheck history',
    color: '#faf5ff',
    iconColor: '#7c3aed',
  },
  {
    path: '/subscriptions',
    icon: Bell,
    label: 'Monthly Subscriptions',
    desc: 'Track recurring subscription costs',
    color: '#fff7ed',
    iconColor: '#ea580c',
  },
  {
    path: '/afterpay',
    icon: ShoppingBag,
    label: 'Afterpay',
    desc: 'Manage Afterpay payment plans',
    color: '#fdf4ff',
    iconColor: '#9333ea',
  },
]

const card = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.28 } } }
const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }

export default function FinancesLanding() {
  const accounts = useStore(s => s.accounts)
  const bills    = useStore(s => s.bills)
  const debts    = useStore(s => s.debts)

  const totalBalance  = Object.values(accounts).reduce((a, b) => a + b, 0)
  const totalDebt     = debts.reduce((s, d) => s + d.totalBalance, 0)
  const monthlyBills  = bills.filter(b => b.isActive && b.frequency === 'monthly').reduce((s, b) => s + b.amount, 0)

  const accountItems = [
    { label: 'Chase Checking', key: 'chaseDebit',      color: '#2563eb' },
    { label: 'Capital One',    key: 'capitalOneDebit', color: '#dc2626' },
    { label: 'Cash App',       key: 'cashApp',         color: '#16a34a' },
    { label: 'PayPal',         key: 'paypal',          color: '#0284c7' },
    { label: 'Cash',           key: 'cash',            color: '#d97706' },
  ]

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-7"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fef3c7' }}>
            <DollarSign size={20} style={{ color: '#d97706' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>Finances</h1>
            <p className="text-sm" style={{ color: '#64748b' }}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </div>
      </motion.div>

      {/* Account summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[
          { label: 'Total Balance', value: totalBalance, color: '#059669' },
          { label: 'Total Debt',    value: -totalDebt,   color: '#dc2626' },
          { label: 'Monthly Bills', value: -monthlyBills, color: '#d97706' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl p-5 border"
            style={{ backgroundColor: '#fff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <p className="text-xs font-medium mb-1.5" style={{ color: '#64748b' }}>{label}</p>
            <p className="text-2xl font-bold font-mono" style={{ color }}>
              {value < 0 ? '-' : ''}{formatCurrency(Math.abs(value))}
            </p>
          </div>
        ))}
      </div>

      {/* Account breakdown */}
      <div
        className="rounded-xl border p-5 mb-7"
        style={{ backgroundColor: '#fff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#374151' }}>Account Balances</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {accountItems.map(({ label, key, color }) => (
            <div
              key={key}
              className="rounded-lg p-3 border"
              style={{ borderColor: '#f1f5f9', backgroundColor: '#fafafa' }}
            >
              <div className="w-2 h-2 rounded-full mb-2" style={{ backgroundColor: color }} />
              <p className="text-xs font-medium mb-0.5" style={{ color: '#64748b' }}>{label}</p>
              <p className="text-sm font-bold font-mono" style={{ color: '#0f172a' }}>
                {formatCurrency(accounts[key] || 0)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Finance section links */}
      <h2 className="text-sm font-semibold mb-4" style={{ color: '#374151' }}>Finance Sections</h2>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
      >
        {financeLinks.map(({ path, icon: Icon, label, desc, color, iconColor }) => (
          <motion.div key={path} variants={card}>
            <Link
              to={path}
              className="flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5"
              style={{ backgroundColor: '#fff', borderColor: '#e2e8f0' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: color }}
              >
                <Icon size={18} style={{ color: iconColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#374151' }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{desc}</p>
              </div>
              <ArrowRight size={16} className="flex-shrink-0" style={{ color: '#cbd5e1' }} />
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
