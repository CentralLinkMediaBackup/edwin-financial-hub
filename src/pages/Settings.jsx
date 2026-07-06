import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Save, Download, Trash2, User, Check, Globe } from 'lucide-react'
import { format } from 'date-fns'
import { useStore } from '../store/useStore'
import { formatCurrency } from '../lib/formatters'

const TABS = [
  { id: 'general',  label: 'General' },
  { id: 'finance',  label: 'Finance' },
  { id: 'profile',  label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
]

function Field({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b" style={{ borderColor: '#f1f5f9' }}>
      <label className="text-sm font-medium" style={{ color: '#374151' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  padding: '8px 12px',
  fontSize: '13px',
  color: '#0f172a',
  backgroundColor: '#fafafa',
  outline: 'none',
  width: '160px',
}

const inputFullStyle = {
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  padding: '8px 12px',
  fontSize: '13px',
  color: '#0f172a',
  backgroundColor: '#fafafa',
  outline: 'none',
  width: '100%',
}

const currencyInputStyle = {
  ...inputStyle,
  paddingLeft: '28px',
}

function CurrencyInput({ value, onChange, ...rest }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94a3b8' }}>$</span>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={currencyInputStyle}
        {...rest}
      />
    </div>
  )
}

function SaveBtn({ onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
      style={{ backgroundColor: '#d97706' }}
    >
      <Save size={12} /> Save
    </motion.button>
  )
}

// ── General Tab ───────────────────────────────────────────────────────────────
function GeneralTab() {
  const settings      = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const addToast      = useStore(s => s.addToast)
  const [displayName, setDisplayName] = useState(settings?.displayName || 'Zack')
  const [timezone,    setTimezone]    = useState(settings?.timezone || 'America/Los_Angeles')

  const handleSave = () => {
    updateSettings('general', { displayName, timezone })
    addToast('General settings saved')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold" style={{ color: '#0f172a' }}>General</h2>
        <SaveBtn onClick={handleSave} />
      </div>
      <div className="rounded-xl border bg-white p-5" style={{ borderColor: '#e2e8f0' }}>
        <Field label="Display Name">
          <input
            style={inputStyle}
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Zack"
          />
        </Field>
        <Field label="Site Name">
          <span className="text-sm" style={{ color: '#94a3b8' }}>Edwin's Personal Hub</span>
        </Field>
        <Field label="Timezone">
          <select style={inputStyle} value={timezone} onChange={e => setTimezone(e.target.value)}>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/New_York">Eastern Time</option>
          </select>
        </Field>
        <div className="py-3">
          <p className="text-sm" style={{ color: '#374151' }}>Theme</p>
          <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Light mode only — optimized for productivity</p>
        </div>
      </div>
    </div>
  )
}

// ── Finance Tab ───────────────────────────────────────────────────────────────
function FinanceTab() {
  const settings      = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const accounts      = useStore(s => s.accounts)
  const setAccount    = useStore(s => s.setAccount)
  const addToast      = useStore(s => s.addToast)

  const [localSettings, setLocalSettings] = useState(settings)
  const [localAccounts, setLocalAccounts] = useState({ ...accounts })
  const [clearConfirm,  setClearConfirm]  = useState(false)

  useEffect(() => { setLocalAccounts({ ...accounts }) }, [accounts])

  const totalBalance = Object.values(localAccounts).reduce((a, b) => a + Number(b), 0)

  const ACCOUNT_LABELS = [
    { key: 'chaseDebit',      label: 'Chase Debit Card' },
    { key: 'capitalOneDebit', label: 'Capital One Debit Card' },
    { key: 'cashApp',         label: 'Cash App Debit Card' },
    { key: 'paypal',          label: 'PayPal Debit Card' },
    { key: 'cash',            label: 'Cash (Wallet)' },
  ]

  const handleSaveAccounts = () => {
    Object.entries(localAccounts).forEach(([key, val]) => setAccount(key, Number(val)))
    addToast('Account balances saved')
  }

  const handleExport = () => {
    const store = useStore.getState()
    const data  = {
      exportedAt: new Date().toISOString(),
      accounts: store.accounts, transactions: store.transactions,
      bills: store.bills, paychecks: store.paychecks,
      tiltLogs: store.tiltLogs, earnInLogs: store.earnInLogs,
      afterpayItems: store.afterpayItems, debts: store.debts,
      savingsGoals: store.savingsGoals, settings: store.settings,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `hub-export-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
    addToast('Data exported')
  }

  const Section = ({ title, action, children }) => (
    <div className="rounded-xl border bg-white p-5 mb-5" style={{ borderColor: '#e2e8f0' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: '#374151' }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )

  return (
    <div>
      <h2 className="text-base font-semibold mb-5" style={{ color: '#0f172a' }}>Finance Settings</h2>

      {/* Account Balances */}
      <Section title="Account Balances" action={<SaveBtn onClick={handleSaveAccounts} />}>
        <div className="space-y-2">
          {ACCOUNT_LABELS.map(({ key, label }) => (
            <Field key={key} label={label}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94a3b8' }}>$</span>
                <input
                  type="number"
                  value={localAccounts[key]}
                  onChange={e => setLocalAccounts(p => ({ ...p, [key]: e.target.value }))}
                  onBlur={handleSaveAccounts}
                  style={currencyInputStyle}
                  step="0.01"
                />
              </div>
            </Field>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t flex justify-between items-center" style={{ borderColor: '#f1f5f9' }}>
          <span className="text-sm font-medium" style={{ color: '#374151' }}>Total Balance</span>
          <span className="text-xl font-bold font-mono" style={{ color: '#d97706' }}>{formatCurrency(totalBalance)}</span>
        </div>
      </Section>

      {/* Earn In */}
      <Section title="Earn In Settings" action={<SaveBtn onClick={() => { updateSettings('earnIn', localSettings.earnIn); addToast('Earn In settings saved') }} />}>
        <div className="space-y-1">
          {[
            { key: 'repaymentAmount', label: 'Repayment Amount' },
            { key: 'fri', label: 'Friday Amount' },
            { key: 'sat', label: 'Saturday Amount' },
            { key: 'sun', label: 'Sunday Amount' },
            { key: 'mon', label: 'Monday Amount' },
          ].map(({ key, label }) => (
            <Field key={key} label={label}>
              <CurrencyInput
                value={localSettings.earnIn[key]}
                onChange={val => setLocalSettings(p => ({ ...p, earnIn: { ...p.earnIn, [key]: parseFloat(val) || 0 } }))}
              />
            </Field>
          ))}
        </div>
      </Section>

      {/* TILT */}
      <Section title="TILT Settings" action={<SaveBtn onClick={() => { updateSettings('tilt', localSettings.tilt); addToast('TILT settings saved') }} />}>
        <div className="space-y-1">
          <Field label="Max Credit Limit">
            <CurrencyInput
              value={localSettings.tilt.maxCredit}
              onChange={val => setLocalSettings(p => ({ ...p, tilt: { ...p.tilt, maxCredit: parseFloat(val) || 0 } }))}
            />
          </Field>
          <Field label="Instant Delivery Fee">
            <CurrencyInput
              value={localSettings.tilt.instantFee}
              onChange={val => setLocalSettings(p => ({ ...p, tilt: { ...p.tilt, instantFee: parseFloat(val) || 0 } }))}
            />
          </Field>
        </div>
      </Section>

      {/* Paycheck */}
      <Section title="Paycheck Settings" action={<SaveBtn onClick={() => { updateSettings('paycheck', localSettings.paycheck); addToast('Paycheck settings saved') }} />}>
        <div className="space-y-1">
          <Field label="Default Amount">
            <CurrencyInput
              value={localSettings.paycheck.defaultAmount}
              onChange={val => setLocalSettings(p => ({ ...p, paycheck: { ...p.paycheck, defaultAmount: parseFloat(val) || 0 } }))}
            />
          </Field>
          <Field label="Frequency">
            <span className="text-sm px-3 py-1.5 rounded-lg border text-sm" style={{ color: '#64748b', borderColor: '#e2e8f0', backgroundColor: '#fafafa' }}>
              Weekly (every Friday)
            </span>
          </Field>
        </div>
      </Section>

      {/* Data Management */}
      <Section title="Data Management">
        <div className="space-y-2">
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors hover:bg-gray-50"
            style={{ color: '#374151', borderColor: '#e2e8f0' }}
          >
            <Download size={15} /> Export All Data (JSON)
          </button>
          {clearConfirm ? (
            <div className="p-4 rounded-xl border" style={{ borderColor: '#fecaca', backgroundColor: '#fff5f5' }}>
              <p className="text-sm mb-3" style={{ color: '#b91c1c' }}>This will clear all stored data and reload the app. Are you sure?</p>
              <div className="flex gap-2">
                <button onClick={() => { localStorage.removeItem('edwin-financial-hub'); window.location.reload() }} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: '#dc2626' }}>Yes, Clear Data</button>
                <button onClick={() => setClearConfirm(false)} className="flex-1 py-2 rounded-lg text-sm border" style={{ color: '#64748b', borderColor: '#e2e8f0' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setClearConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors hover:bg-red-50"
              style={{ color: '#dc2626', borderColor: '#fecaca' }}
            >
              <Trash2 size={15} /> Clear Session Data
            </button>
          )}
        </div>
      </Section>
    </div>
  )
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab() {
  return (
    <div>
      <h2 className="text-base font-semibold mb-5" style={{ color: '#0f172a' }}>Profile</h2>
      <div className="rounded-xl border bg-white p-6" style={{ borderColor: '#e2e8f0' }}>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fef3c7' }}>
            <User size={28} style={{ color: '#d97706' }} />
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: '#0f172a' }}>Zack Bernal</p>
            <p className="text-sm" style={{ color: '#64748b' }}>Founder of Central Link Media</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Edwin Bernal's Personal Hub</p>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ borderColor: '#f1f5f9', backgroundColor: '#fafafa' }}>
          <p className="text-sm font-medium mb-1" style={{ color: '#374151' }}>Profile customization</p>
          <p className="text-sm" style={{ color: '#94a3b8' }}>Coming soon — photo upload, bio, and social links.</p>
        </div>
      </div>
    </div>
  )
}

// ── Notifications Tab ─────────────────────────────────────────────────────────
function NotificationsTab() {
  return (
    <div>
      <h2 className="text-base font-semibold mb-5" style={{ color: '#0f172a' }}>Notifications</h2>
      <div className="rounded-xl border bg-white p-6" style={{ borderColor: '#e2e8f0' }}>
        <div className="p-4 rounded-xl border" style={{ borderColor: '#f1f5f9', backgroundColor: '#fafafa' }}>
          <p className="text-sm font-medium mb-1" style={{ color: '#374151' }}>Push notifications</p>
          <p className="text-sm" style={{ color: '#94a3b8' }}>Coming soon — bill reminders, goal deadlines, and habit streaks.</p>
        </div>
      </div>
    </div>
  )
}

// ── Main Settings ─────────────────────────────────────────────────────────────
export default function Settings() {
  const [activeTab, setActiveTab] = useState('general')

  return (
    <div className="p-5 md:p-7 max-w-[900px] mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f1f5f9' }}>
            <SettingsIcon size={20} style={{ color: '#64748b' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>Settings</h1>
            <p className="text-sm" style={{ color: '#64748b' }}>Configure your Personal Hub</p>
          </div>
        </div>
      </motion.div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl border" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent',
              color:           activeTab === tab.id ? '#0f172a' : '#64748b',
              boxShadow:       activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'general'       && <GeneralTab />}
        {activeTab === 'finance'       && <FinanceTab />}
        {activeTab === 'profile'       && <ProfileTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
      </motion.div>
    </div>
  )
}
