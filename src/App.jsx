import { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { LoadingSplash } from './components/LoadingSplash'
import { useStore } from './store/useStore'

// Pages
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import ExpensesTracker from './pages/ExpensesTracker'
import Debts from './pages/Debts'
import TILT from './pages/TILT'
import EarnIn from './pages/EarnIn'
import Afterpay from './pages/Afterpay'
import Savings from './pages/Savings'
import Paychecks from './pages/Paychecks'
import Subscriptions from './pages/Subscriptions'
import Settings from './pages/Settings'

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/"              element={<Dashboard />} />
        <Route path="/calendar"      element={<Calendar />} />
        <Route path="/expenses"      element={<ExpensesTracker />} />
        <Route path="/debts"         element={<Debts />} />
        <Route path="/tilt"          element={<TILT />} />
        <Route path="/earnin"        element={<EarnIn />} />
        <Route path="/afterpay"      element={<Afterpay />} />
        <Route path="/savings"       element={<Savings />} />
        <Route path="/paychecks"     element={<Paychecks />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/settings"      element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false)
  const theme = useStore(s => s.theme)

  // Apply theme to document element
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.classList.toggle('light', theme === 'light')
    document.body.style.backgroundColor = theme === 'light' ? '#F1F5F9' : '#0A0E1A'
  }, [theme])

  return (
    <>
      <LoadingSplash onComplete={() => setSplashDone(true)} />
      {splashDone && <AppRoutes />}
    </>
  )
}
