import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { AIAssistant } from './AIAssistant'
import { ToastContainer } from '../ui/ToastContainer'

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
}

const pageTransition = { duration: 0.2, ease: 'easeOut' }

export function Layout({ children }) {
  const location = useLocation()
  const mainRef  = useRef(null)

  // Force light mode always
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.remove('light')
    document.body.style.backgroundColor = '#f8fafc'
  }, [])

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#f8fafc' }}>
      <Sidebar />

      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto"
        style={{ backgroundColor: '#f8fafc' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="min-h-full pt-16 pb-24 md:pt-0 md:pb-0"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <ToastContainer />
      <AIAssistant />
    </div>
  )
}
