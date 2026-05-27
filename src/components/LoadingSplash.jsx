import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const letterVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.8 + i * 0.06, duration: 0.4, ease: 'easeOut' }
  })
}

export function LoadingSplash({ onComplete }) {
  const [visible, setVisible] = useState(true)
  const [showSplash] = useState(() => {
    const shown = sessionStorage.getItem('splashShown')
    if (shown) return false
    sessionStorage.setItem('splashShown', 'true')
    return true
  })

  useEffect(() => {
    if (!showSplash) {
      onComplete?.()
      return
    }
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onComplete?.(), 600)
    }, 2800)
    return () => clearTimeout(timer)
  }, [showSplash, onComplete])

  if (!showSplash) return null

  const nameLetters = 'Edwin Bernal'.split('')
  const subtitleLetters = 'Financial Hub'.split('')

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ backgroundColor: '#0A0E1A' }}
        >
          {/* Grain overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
              opacity: 0.5
            }}
          />

          {/* EB SVG initials with stroke animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mb-8"
          >
            <svg
              width="200"
              height="180"
              viewBox="0 0 200 180"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* E letter */}
              <motion.path
                d="M20 20 L20 160 M20 20 L85 20 M20 88 L75 88 M20 160 L85 160"
                stroke="#F59E0B"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.1 }}
              />
              {/* B letter */}
              <motion.path
                d="M110 20 L110 160 M110 20 L165 20 Q185 20 185 52 Q185 84 155 88 Q185 88 185 124 Q185 160 155 160 L110 160"
                stroke="#F59E0B"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.3 }}
              />
              {/* Subtle glow */}
              <motion.circle
                cx="100"
                cy="90"
                r="75"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="1"
                opacity="0.15"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.15 }}
                transition={{ duration: 1.0, delay: 0.5 }}
              />
            </svg>
          </motion.div>

          {/* Name letters */}
          <div className="flex gap-[1px] mb-3" aria-label="Edwin Bernal">
            {nameLetters.map((char, i) => (
              <motion.span
                key={i}
                custom={i}
                variants={letterVariants}
                initial="hidden"
                animate="visible"
                className="text-2xl font-semibold tracking-widest"
                style={{
                  fontFamily: "'Sora', sans-serif",
                  color: char === ' ' ? 'transparent' : '#F1F5F9',
                  width: char === ' ' ? '12px' : 'auto'
                }}
              >
                {char === ' ' ? ' ' : char}
              </motion.span>
            ))}
          </div>

          {/* Subtitle */}
          <div className="flex gap-[1px]" aria-label="Financial Hub">
            {subtitleLetters.map((char, i) => (
              <motion.span
                key={i}
                custom={i}
                variants={letterVariants}
                initial="hidden"
                animate="visible"
                className="text-sm tracking-[0.3em]"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  color: char === ' ' ? 'transparent' : '#F59E0B',
                  width: char === ' ' ? '10px' : 'auto',
                  transitionDelay: `${1.2 + i * 0.05}s`
                }}
              >
                {char === ' ' ? ' ' : char}
              </motion.span>
            ))}
          </div>

          {/* Progress bar */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-[3px]"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}
          >
            <motion.div
              className="h-full"
              style={{ backgroundColor: '#F59E0B' }}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.6, ease: 'linear', delay: 0.2 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
