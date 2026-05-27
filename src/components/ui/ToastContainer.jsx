import { AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { Toast } from './Toast'

export function ToastContainer() {
  const toasts = useStore((s) => s.toasts)

  return (
    <div className="fixed top-4 right-4 z-[9998] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
