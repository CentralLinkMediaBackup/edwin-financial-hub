import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react'
import { useStore } from '../../store/useStore'

const toastConfig = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    textColor: 'text-emerald-100',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    iconColor: 'text-red-400',
    textColor: 'text-red-100',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    textColor: 'text-amber-100',
  },
}

export function Toast({ toast }) {
  const removeToast = useStore((s) => s.removeToast)
  const config = toastConfig[toast.type] || toastConfig.success
  const Icon = config.icon

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), 3500)
    return () => clearTimeout(timer)
  }, [toast.id, removeToast])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg min-w-[260px] max-w-xs ${config.bg} ${config.border}`}
    >
      <Icon size={18} className={`flex-shrink-0 ${config.iconColor}`} />
      <p className={`text-sm flex-1 leading-snug ${config.textColor}`}>
        {toast.message}
      </p>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 p-0.5 rounded text-slate-400 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}
