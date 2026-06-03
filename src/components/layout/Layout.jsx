import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { AIAssistant } from './AIAssistant'
import { ToastContainer } from '../ui/ToastContainer'
import { useStore } from '../../store/useStore'

const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

const pageTransition = {
  duration: 0.25,
  ease: 'easeOut',
}

export function Layout({ children }) {
  const location = useLocation()
  const theme = useStore((s) => s.theme)
  const mainRef = useRef(null)

  // Apply theme class to html element
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
      root.classList.remove('light')
    }
  }, [theme])

  // Scroll to top on every tab/route change
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ zIndex: 1 }}>
      <Sidebar />

      {/* Main content area */}
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto relative"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="min-h-full pb-20 md:pb-0"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Toast notifications */}
      <ToastContainer />

      {/* AI Assistant floating bubble */}
      <AIAssistant />
    </div>
  )
}
