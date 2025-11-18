/**
 * Income Feature Module
 *
 * Public API for the income feature.
 * Import from here: import { Income, calculateIncomeProjections } from '../income'
 */

// Main component
export { default as Income } from './Income'

// Calculations
export { calculateIncomeProjections, validateIncome } from './Income.calc'

// Routes
export { incomeRoutes } from './routes'
