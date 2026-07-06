import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { LoadingSplash } from './components/LoadingSplash'
import { useStore } from './store/useStore'

// Existing pages
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

// New pages
import FinancesLanding from './pages/FinancesLanding'
import Goals from './pages/Goals'
import Habits from './pages/Habits'
import Fitness from './pages/Fitness'
import Cooking from './pages/Cooking'

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/"              element={<Dashboard />} />
        <Route path="/finances"      element={<FinancesLanding />} />
        <Route path="/calendar"      element={<Calendar />} />
        <Route path="/expenses"      element={<ExpensesTracker />} />
        <Route path="/debts"         element={<Debts />} />
        <Route path="/tilt"          element={<TILT />} />
        <Route path="/earnin"        element={<EarnIn />} />
        <Route path="/afterpay"      element={<Afterpay />} />
        <Route path="/savings"       element={<Savings />} />
        <Route path="/paychecks"     element={<Paychecks />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/goals"         element={<Goals />} />
        <Route path="/habits"        element={<Habits />} />
        <Route path="/fitness"       element={<Fitness />} />
        <Route path="/cooking"       element={<Cooking />} />
        <Route path="/settings"      element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false)
  const initialize = useStore(s => s.initialize)

  useEffect(() => { initialize() }, [])

  // Force light mode on mount
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.remove('light')
    document.body.style.backgroundColor = '#f8fafc'
  }, [])

  return (
    <>
      <LoadingSplash onComplete={() => setSplashDone(true)} />
      {splashDone && <AppRoutes />}
    </>
  )
}
