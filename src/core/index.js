/**
 * Core Services
 *
 * Re-exports all shared services that features can use.
 * Import from here: import { storage, INCOME_CONFIG } from '../../core'
 */

// Storage service
export { storage } from './storage'

// Configuration
export {
  INCOME_CONFIG,
  EXPENSE_CONFIG,
  INVESTMENTS_CONFIG,
  createDefaultIncomeStream,
  createDefaultExpenseCategories,
  createDefaultInvestment,
  createDefault401k
} from './config'

// Auth (future)
// export { useAuth, AuthProvider } from './auth'
