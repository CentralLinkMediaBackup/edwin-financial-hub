import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, DollarSign, Target, CheckSquare, Dumbbell, Calendar,
  Settings, Menu, X, ChevronDown, Receipt, CreditCard, Zap, TrendingUp,
  PiggyBank, Wallet, Bell, UtensilsCrossed, Leaf,
} from 'lucide-react'

const SIDEBAR_BG    = '#1e293b'
const ACTIVE_BG     = 'rgba(245,158,11,0.15)'
const ACTIVE_BORDER = 'rgba(245,158,11,0.4)'
const ACTIVE_TEXT   = '#f59e0b'
const INACTIVE_TEXT = '#94a3b8'
const HOVER_BG      = 'rgba(255,255,255,0.06)'

const financeSubItems = [
  { path: '/expenses',      icon: Receipt,     label: 'Transactions' },
  { path: '/debts',         icon: CreditCard,  label: 'Debts' },
  { path: '/tilt',          icon: Zap,         label: 'TILT' },
  { path: '/earnin',        icon: TrendingUp,  label: 'Earn In' },
  { path: '/afterpay',      icon: CreditCard,  label: 'Afterpay' },
  { path: '/savings',       icon: PiggyBank,   label: 'Savings' },
  { path: '/paychecks',     icon: Wallet,      label: 'Paychecks' },
  { path: '/subscriptions', icon: Bell,        label: 'Subscriptions' },
  { path: '/calendar',      icon: Calendar,    label: 'Calendar' },
]
const lifestyleItems = [
  { path: '/cooking', icon: UtensilsCrossed, label: 'Cooking' },
  { path: '/fitness', icon: Dumbbell,        label: 'Fitness' },
]
const growthItems = [
  { path: '/goals',  icon: Target,      label: 'Goals' },
  { path: '/habits', icon: CheckSquare, label: 'Habits' },
]

const financeRoutes   = new Set(financeSubItems.map(i => i.path).concat(['/finances']))
const lifestyleRoutes = new Set(lifestyleItems.map(i => i.path))
const growthRoutes    = new Set(growthItems.map(i => i.path))

function NavItem({ path, icon: Icon, label, end, onClick }) {
  return (
    <NavLink to={path} end={end} onClick={onClick}
      className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative mx-1 ${isActive ? 'font-medium' : ''}`}
      style={({ isActive }) => ({
        color: isActive ? ACTIVE_TEXT : INACTIVE_TEXT,
        backgroundColor: isActive ? ACTIVE_BG : 'transparent',
        border: isActive ? `1px solid ${ACTIVE_BORDER}` : '1px solid transparent',
      })}>
      {({ isActive }) => (
        <>
          {!isActive && <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: HOVER_BG }} />}
          <Icon size={16} className="relative flex-shrink-0" />
          <span className="relative text-sm truncate">{label}</span>
        </>
      )}
    </NavLink>
  )
}

function NavGroup({ label, items, routes, icon: Icon, onNavigate }) {
  const location = useLocation()
  const isActive = routes.has(location.pathname)
  const [open, setOpen] = useState(isActive)
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group mx-1 relative"
        style={{ width: 'calc(100% - 8px)', color: isActive ? ACTIVE_TEXT : INACTIVE_TEXT, backgroundColor: isActive && !open ? ACTIVE_BG : 'transparent', border: isActive && !open ? `1px solid ${ACTIVE_BORDER}` : '1px solid transparent' }}>
        {!(isActive && !open) && <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: HOVER_BG }} />}
        <Icon size={16} className="relative flex-shrink-0" />
        <span className="relative text-sm flex-1 text-left">{label}</span>
        <motion.div className="relative" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="ml-4 mt-0.5 border-l pl-2 pb-1" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {items.map(item => (
                <NavLink key={item.path} to={item.path} onClick={onNavigate}
                  className={({ isActive }) => `flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 group relative mx-0.5 mt-0.5 ${isActive ? 'font-medium' : ''}`}
                  style={({ isActive }) => ({ color: isActive ? ACTIVE_TEXT : '#64748b', backgroundColor: isActive ? ACTIVE_BG : 'transparent', border: isActive ? `1px solid ${ACTIVE_BORDER}` : '1px solid transparent', fontSize: '13px' })}>
                  {({ isActive }) => (
                    <>
                      {!isActive && <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: HOVER_BG }} />}
                      <item.icon size={14} className="relative flex-shrink-0" />
                      <span className="relative truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Just the nav items — shared between desktop and mobile
function NavItems({ onNavigate }) {
  return (
    <nav className="flex-1 overflow-y-auto py-3 flex flex-col gap-0.5 sidebar-scroll">
      <NavItem path="/" icon={LayoutDashboard} label="Dashboard" end onClick={onNavigate} />

      <div className="px-4 pt-3 pb-1">
        <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#334155' }}>Finances</span>
      </div>
      <NavGroup label="Finances" items={financeSubItems} routes={financeRoutes} icon={DollarSign} onNavigate={onNavigate} />

      <div className="mx-4 my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
      <div className="px-4 pb-1">
        <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#334155' }}>Lifestyle</span>
      </div>
      <NavGroup label="Lifestyle" items={lifestyleItems} routes={lifestyleRoutes} icon={UtensilsCrossed} onNavigate={onNavigate} />

      <div className="mx-4 my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
      <div className="px-4 pb-1">
        <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#334155' }}>Growth</span>
      </div>
      <NavGroup label="Growth" items={growthItems} routes={growthRoutes} icon={Leaf} onNavigate={onNavigate} />

      <div className="mx-4 my-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
      <NavItem path="/settings" icon={Settings} label="Settings" onClick={onNavigate} />
    </nav>
  )
}

export function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* ── Desktop Sidebar ────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col h-screen sticky top-0"
        style={{ backgroundColor: SIDEBAR_BG, width: '240px', minWidth: '240px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Logo */}
        <div className="flex flex-col items-center px-5 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <img src="/logo-dark.png" alt="Personal Hub" className="w-full object-contain" style={{ maxHeight: '80px' }} />
          <p className="text-xs mt-1.5 font-medium tracking-widest" style={{ color: '#475569', fontSize: '10px' }}>PERSONAL HUB</p>
        </div>
        <NavItems onNavigate={null} />
        <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs" style={{ color: '#334155' }}>Edwin Bernal</p>
          <p className="text-xs" style={{ color: '#1e3a5f', fontSize: '10px' }}>Personal Hub v2.0</p>
        </div>
      </aside>

      {/* ── Mobile: Toggle button ─────────────────────────────────── */}
      <button className="md:hidden fixed top-4 left-4 z-40 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: SIDEBAR_BG, border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}
        onClick={() => setDrawerOpen(true)} aria-label="Open navigation">
        <Menu size={17} style={{ color: '#94a3b8' }} />
      </button>

      {/* ── Mobile: Drawer ────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div className="md:hidden fixed inset-0 z-[45] bg-black/50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)} />
            <motion.div className="md:hidden fixed top-0 left-0 bottom-0 z-[46] flex flex-col overflow-hidden"
              style={{ width: '280px', backgroundColor: SIDEBAR_BG, borderRight: '1px solid rgba(255,255,255,0.08)', boxShadow: '4px 0 24px rgba(0,0,0,0.3)' }}
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', stiffness: 360, damping: 36 }}>
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <img src="/logo-dark.png" alt="Personal Hub" className="object-contain" style={{ maxHeight: '60px', width: '140px' }} />
                <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-lg transition-colors" style={{ color: '#64748b' }} aria-label="Close menu">
                  <X size={18} />
                </button>
              </div>
              <NavItems onNavigate={() => setDrawerOpen(false)} />
              <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs" style={{ color: '#334155' }}>Edwin Bernal</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
