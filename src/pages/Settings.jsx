import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings as SettingsIcon, Moon, Sun, Save, Download, Trash2, X, Check, User, CreditCard } from 'lucide-react'
import { useStore } from '../store/useStore'
import { formatCurrency } from '../lib/formatters'

function SectionCard({ title, children, action }) {
  return (
    <section className="card-glass p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function NumberInput({ label, value, onChange, prefix = '$', step = '0.01', className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <label className="text-sm text-slate-300 flex-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`${prefix ? 'pl-7' : 'pl-3'} pr-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none w-32`}
          step={step}
        />
      </div>
    </div>
  )
}

export default function Settings() {
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const theme = useStore(s => s.theme)
  const toggleTheme = useStore(s => s.toggleTheme)
  const accounts = useStore(s => s.accounts)
  const setAccount = useStore(s => s.setAccount)
  const addToast = useStore(s => s.addToast)

  const [localSettings, setLocalSettings] = useState(settings)
  const [localAccounts, setLocalAccounts] = useState({ ...accounts })
  const [clearConfirm, setClearConfirm] = useState(false)

  const totalBalance = Object.values(localAccounts).reduce((a, b) => a + Number(b), 0)

  const handleSaveAccounts = () => {
    Object.entries(localAccounts).forEach(([key, val]) => setAccount(key, Number(val)))
    addToast('Account balances saved')
  }

  const handleSaveEarnIn = () => {
    updateSettings('earnIn', localSettings.earnIn)
  }

  const handleSaveTilt = () => {
    updateSettings('tilt', localSettings.tilt)
  }

  const handleSavePaycheck = () => {
    updateSettings('paycheck', localSettings.paycheck)
  }

  const handleExportData = () => {
    const store = useStore.getState()
    const exportData = {
      exportedAt: new Date().toISOString(),
      accounts: store.accounts,
      transactions: store.transactions,
      bills: store.bills,
      paychecks: store.paychecks,
      tiltLogs: store.tiltLogs,
      earnInLogs: store.earnInLogs,
      afterpayItems: store.afterpayItems,
      debts: store.debts,
      savingsGoals: store.savingsGoals,
      settings: store.settings,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `edwin-financial-hub-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    addToast('Data exported successfully')
  }

  const handleClearSession = () => {
    localStorage.removeItem('edwin-financial-hub')
    window.location.reload()
  }

  const ACCOUNT_LABELS = [
    { key: 'chaseDebit', label: 'Chase Debit Card' },
    { key: 'capitalOneDebit', label: 'Capital One Debit Card' },
    { key: 'cashApp', label: 'Cash App Debit Card' },
    { key: 'paypal', label: 'PayPal Debit Card' },
  ]

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-500/20 flex items-center justify-center">
          <SettingsIcon size={20} className="text-slate-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 text-sm">Configure your financial hub</p>
        </div>
      </div>

      {/* Section 1 — Account Balances */}
      <SectionCard
        title="Account Balances"
        action={
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSaveAccounts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
          >
            <Save size={12} />
            Save
          </motion.button>
        }
      >
        <div className="grid gap-3">
          {ACCOUNT_LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <label className="text-sm text-slate-300 flex-1">{label}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  value={localAccounts[key]}
                  onChange={e => setLocalAccounts(prev => ({ ...prev, [key]: e.target.value }))}
                  onBlur={handleSaveAccounts}
                  className="pl-7 pr-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none w-36"
                  step="0.01"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
          <span className="text-slate-400 font-medium text-sm">Total Balance</span>
          <motion.span
            key={totalBalance}
            initial={{ opacity: 0.5, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-2xl font-bold text-amber-400 font-mono"
          >
            {formatCurrency(totalBalance)}
          </motion.span>
        </div>
      </SectionCard>

      {/* Section 2 — Earn In Settings */}
      <SectionCard
        title="Earn In Settings"
        action={
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSaveEarnIn}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
          >
            <Save size={12} />
            Save
          </motion.button>
        }
      >
        <div className="space-y-3">
          {[
            { key: 'repaymentAmount', label: 'Repayment Amount' },
            { key: 'fri', label: 'Friday Amount' },
            { key: 'sat', label: 'Saturday Amount' },
            { key: 'sun', label: 'Sunday Amount' },
            { key: 'mon', label: 'Monday Amount' },
          ].map(({ key, label }) => (
            <NumberInput
              key={key}
              label={label}
              value={localSettings.earnIn[key]}
              onChange={val => setLocalSettings(prev => ({
                ...prev,
                earnIn: { ...prev.earnIn, [key]: parseFloat(val) || 0 }
              }))}
            />
          ))}
        </div>
      </SectionCard>

      {/* Section 3 — TILT Settings */}
      <SectionCard
        title="TILT Settings"
        action={
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSaveTilt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
          >
            <Save size={12} />
            Save
          </motion.button>
        }
      >
        <div className="space-y-3">
          <NumberInput
            label="Max Credit Limit"
            value={localSettings.tilt.maxCredit}
            onChange={val => setLocalSettings(prev => ({
              ...prev,
              tilt: { ...prev.tilt, maxCredit: parseFloat(val) || 0 }
            }))}
          />
          <NumberInput
            label="Instant Delivery Fee"
            value={localSettings.tilt.instantFee}
            onChange={val => setLocalSettings(prev => ({
              ...prev,
              tilt: { ...prev.tilt, instantFee: parseFloat(val) || 0 }
            }))}
          />
        </div>
      </SectionCard>

      {/* Section 4 — Paycheck Settings */}
      <SectionCard
        title="Paycheck Settings"
        action={
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSavePaycheck}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
          >
            <Save size={12} />
            Save
          </motion.button>
        }
      >
        <div className="space-y-3">
          <NumberInput
            label="Default Amount"
            value={localSettings.paycheck.defaultAmount}
            onChange={val => setLocalSettings(prev => ({
              ...prev,
              paycheck: { ...prev.paycheck, defaultAmount: parseFloat(val) || 0 }
            }))}
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Frequency</span>
            <span className="text-sm text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              Weekly (every Friday)
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Section 5 — Profile */}
      <SectionCard title="Profile">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
            <User size={22} className="text-amber-400" />
          </div>
          <div>
            <p className="text-white font-semibold">Zack Bernal</p>
            <p className="text-slate-400 text-sm">Founder of Central Link Media</p>
            <p className="text-slate-500 text-xs mt-0.5">Edwin Bernal's Financial Hub</p>
          </div>
        </div>
      </SectionCard>

      {/* Section 6 — Theme */}
      <SectionCard title="Theme">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: theme === 'dark' ? 0 : 180 }}
              transition={{ duration: 0.4 }}
            >
              {theme === 'dark'
                ? <Moon size={20} className="text-slate-300" />
                : <Sun size={20} className="text-amber-400" />
              }
            </motion.div>
            <div>
              <p className="text-white font-medium">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
              <p className="text-xs text-slate-500">{theme === 'dark' ? 'Easy on the eyes' : 'Bright & clear'}</p>
            </div>
          </div>
          <motion.button
            onClick={toggleTheme}
            whileTap={{ scale: 0.95 }}
            className="relative w-14 h-7 rounded-full transition-colors duration-300"
            style={{ backgroundColor: theme === 'dark' ? 'rgba(245, 158, 11, 0.8)' : 'rgba(100, 116, 139, 0.5)' }}
          >
            <motion.div
              className="w-6 h-6 rounded-full bg-white absolute top-0.5"
              animate={{ left: theme === 'dark' ? '30px' : '2px' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          </motion.button>
        </div>
      </SectionCard>

      {/* Section 7 — Data */}
      <SectionCard title="Data Management">
        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleExportData}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
          >
            <Download size={16} />
            Export All Data (JSON)
          </motion.button>

          <AnimatePresence>
            {clearConfirm ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10">
                  <p className="text-sm text-red-300 mb-3">
                    This will clear all stored data and reload the app. Are you sure?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearSession}
                      className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-colors"
                    >
                      Yes, Clear Data
                    </button>
                    <button
                      onClick={() => setClearConfirm(false)}
                      className="flex-1 py-2 rounded-lg bg-white/10 text-slate-400 text-sm hover:bg-white/15 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setClearConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={16} />
                Clear Session Data
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </SectionCard>
    </div>
  )
}
