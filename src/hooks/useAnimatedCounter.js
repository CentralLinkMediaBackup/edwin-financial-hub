import { useEffect, useState } from 'react'

/**
 * Animates a number from 0 to target over the given duration (ms)
 * @param {number} target
 * @param {number} duration - ms, default 1500
 * @returns {number} current animated value
 */
export function useAnimatedCounter(target, duration = 1500) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (target === 0) {
      setCount(0)
      return
    }
    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(start)
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])

  return count
}
