import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Calendar,
  Receipt,
  CreditCard,
  Zap,
  TrendingUp,
  ShoppingBag,
  PiggyBank,
  DollarSign,
  Bell,
  Settings,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { path: '/',              icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/calendar',     icon: Calendar,        label: 'Calendar' },
  { path: '/expenses',     icon: Receipt,         label: 'Transaction Tracker' },
  { path: '/debts',        icon: CreditCard,      label: 'Debts' },
  { path: '/tilt',         icon: Zap,             label: 'TILT' },
  { path: '/earnin',       icon: TrendingUp,      label: 'Earn In' },
  { path: '/afterpay',     icon: ShoppingBag,     label: 'Afterpay' },
  { path: '/savings',      icon: PiggyBank,       label: 'Savings' },
  { path: '/paychecks',    icon: DollarSign,      label: 'Paychecks' },
  { path: '/subscriptions',icon: Bell,            label: 'Monthly Subs' },
  { path: '/settings',     icon: Settings,        label: 'Settings' },
]

function NavItem({ item, collapsed }) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
          isActive
            ? 'text-amber-400'
            : 'text-slate-400 hover:text-slate-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="activeNavBg"
              className="absolute inset-0 rounded-xl"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)' }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          {!isActive && (
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
            />
          )}
          <div className="relative flex-shrink-0">
            <Icon size={18} />
          </div>
          {!collapsed && (
            <span className="relative text-sm font-medium truncate">
              {item.label}
            </span>
          )}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
              style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {item.label}
            </div>
          )}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* ── Desktop Sidebar (unchanged) ───────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col h-screen sticky top-0 border-r border-white/10"
        style={{ backgroundColor: 'var(--bg-panel)', width: '220px', minWidth: '220px' }}
      >
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <img
            src="/EdwinBernalLogo.png"
            alt="Edwin Bernal"
            className="w-9 h-9 object-contain flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate" style={{ fontFamily: "'Sora', sans-serif" }}>
              Edwin Bernal
            </p>
            <p className="text-[10px] text-slate-500 truncate">Financial Hub</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} collapsed={false} />
          ))}
        </nav>
      </aside>

      {/* ── Mobile: Floating circle menu button ───────────────────────────────── */}
      <button
        className="md:hidden fixed top-4 left-4 z-40 w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: 'rgba(15, 22, 41, 0.82)',
          border: '1px solid rgba(255, 255, 255, 0.13)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        }}
        onClick={() => setDrawerOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu size={17} className="text-slate-300" />
      </button>

      {/* ── Mobile: Nav Drawer ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="md:hidden fixed inset-0 z-[45] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              className="md:hidden fixed top-0 left-0 bottom-0 z-[46] flex flex-col overflow-hidden"
              style={{
                width: '280px',
                backgroundColor: 'var(--bg-panel)',
                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '4px 0 32px rgba(0,0,0,0.5)',
              }}
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-5 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <img
                    src="/EdwinBernalLogo.png"
                    alt="Edwin Bernal"
                    className="w-9 h-9 object-contain flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
                      Edwin Bernal
                    </p>
                    <p className="text-[10px] text-slate-500">Financial Hub</p>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Nav items */}
              <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => setDrawerOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 relative ${
                          isActive ? 'text-amber-400' : 'text-slate-400'
                        }`
                      }
                      style={({ isActive }) =>
                        isActive
                          ? { backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)' }
                          : {}
                      }
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </NavLink>
                  )
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
