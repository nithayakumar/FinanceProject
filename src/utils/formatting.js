/**
 * Formatting Utilities
 *
 * Central place for all display formatting logic.
 * Calculations should use full precision - only format at display time.
 */

/**
 * Format a number as currency
 * @param {number} value - The value to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0'
  }

  const rounded = decimals === 0 ? Math.round(value) : Number(value.toFixed(decimals))
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(rounded)
}

/**
 * Format a number as percentage
 * @param {number} value - The value to format (e.g., 5.5 for 5.5%)
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage string
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%'
  }

  const rounded = Number(value.toFixed(decimals))
  return `${rounded.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}%`
}

/**
 * Format a large number in millions
 * @param {number} value - The value to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted string with 'M' suffix
 */
export function formatMillions(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0.00M'
  }

  const millions = value / 1000000
  const rounded = Number(millions.toFixed(decimals))
  return `$${rounded.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}M`
}

/**
 * Format a number with commas
 * @param {number} value - The value to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted number string
 */
export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0'
  }

  const rounded = decimals === 0 ? Math.round(value) : Number(value.toFixed(decimals))
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

/**
 * Round to 5 decimal places for precision in intermediate calculations
 * Use sparingly - only when combining multiple operations needs precision.
 * Prefer keeping full precision throughout calculations.
 * @param {number} value - The value to round
 * @returns {number} Rounded value
 */
export function round5(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 0
  }
  return Math.round(value * 100000) / 100000
}

/**
 * Format a year range
 * @param {number} startYear - Starting year
 * @param {number} endYear - Ending year
 * @returns {string} Formatted year range
 */
export function formatYearRange(startYear, endYear) {
  return `${startYear} - ${endYear}`
}

/**
 * Format an age range
 * @param {number} startAge - Starting age
 * @param {number} endAge - Ending age
 * @returns {string} Formatted age range
 */
export function formatAgeRange(startAge, endAge) {
  return `Age ${startAge} - ${endAge}`
}
