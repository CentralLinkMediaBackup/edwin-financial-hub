import { format, parseISO, isValid } from 'date-fns'

/**
 * Format a number as US currency
 * @param {number} amount
 * @returns {string} e.g. "$1,234.56"
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a date as "Fri, May 23"
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  return format(d, 'EEE, MMM d')
}

/**
 * Format a date as "May 23"
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDateShort(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  return format(d, 'MMM d')
}

/**
 * Get the day of week abbreviation
 * @param {Date|string} date
 * @returns {string} e.g. "Fri"
 */
export function getDayOfWeek(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  return format(d, 'EEE')
}

/**
 * Format a date as "YYYY-MM-DD" for input fields
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDateInput(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  return format(d, 'yyyy-MM-dd')
}
