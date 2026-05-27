import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
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
} from 'lucide-react'

const navItems = [
  { path: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/calendar',    icon: Calendar,        label: 'Calendar' },
  { path: '/expenses',    icon: Receipt,         label: 'Expenses Tracker' },
  { path: '/debts',       icon: CreditCard,      label: 'Debts' },
  { path: '/tilt',        icon: Zap,             label: 'TILT' },
  { path: '/earnin',      icon: TrendingUp,      label: 'Earn In' },
  { path: '/afterpay',    icon: ShoppingBag,     label: 'Afterpay' },
  { path: '/savings',     icon: PiggyBank,       label: 'Savings' },
  { path: '/paychecks',   icon: DollarSign,      label: 'Paychecks' },
  { path: '/subscriptions', icon: Bell,          label: 'Monthly Subs' },
  { path: '/settings',   icon: Settings,         label: 'Settings' },
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
              style={{ backgroundColor: '#0F1629', border: '1px solid rgba(255,255,255,0.1)' }}>
              {item.label}
            </div>
          )}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col h-screen sticky top-0 border-r border-white/10"
        style={{ backgroundColor: '#0F1629', width: '220px', minWidth: '220px' }}
      >
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: '#F59E0B', color: '#0A0E1A', fontFamily: "'Sora', sans-serif" }}
          >
            EB
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate" style={{ fontFamily: "'Sora', sans-serif" }}>
              Edwin Bernal
            </p>
            <p className="text-[10px] text-slate-500 truncate">Financial Hub</p>
          </div>
        </div>

        {/* User Card */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 p-2 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: '#F59E0B', color: '#0A0E1A', fontFamily: "'Sora', sans-serif" }}
            >
              EB
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">Edwin Bernal</p>
              <p className="text-[10px] text-slate-500 truncate leading-tight">Central Link Media</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavItem key={item.path} item={item} collapsed={false} />
          ))}
        </nav>
      </aside>

      {/* Tablet Collapsed Sidebar */}
      {/* (handled by making desktop sidebar narrower via CSS) */}

      {/* Mobile Bottom Tab Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 flex items-center justify-around px-2 py-2"
        style={{ backgroundColor: '#0F1629' }}
      >
        {navItems.slice(0, 6).map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                  isActive ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-amber-400/15' : ''}`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-[9px] leading-none font-medium">{item.label.split(' ')[0]}</span>
                </>
              )}
            </NavLink>
          )
        })}
        {/* More button for remaining tabs */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
              isActive ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-amber-400/15' : ''}`}>
                <Settings size={18} />
              </div>
              <span className="text-[9px] leading-none font-medium">More</span>
            </>
          )}
        </NavLink>
      </nav>
    </>
  )
}
