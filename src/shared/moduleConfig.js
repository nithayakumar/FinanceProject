/**
 * Centralized Module Configuration
 *
 * SINGLE SOURCE OF TRUTH for all module constraints and structure.
 * Change limits here to update everywhere in the app.
 */

// ============================
// INCOME MODULE
// ============================
export const INCOME_CONFIG = {
  MIN_STREAMS: 1,
  MAX_STREAMS: 3,
  DEFAULT_GROWTH_RATE: 2.7  // Inflation rate
}

// ============================
// EXPENSE MODULE
// ============================
export const EXPENSE_CONFIG = {
  // Fixed 9 expense categories (cannot add/remove)
  CATEGORIES: [
    'Housing',
    'Utilities',
    'Transportation',
    'Medical',
    'Childcare',
    'Education',
    'Food',
    'Entertainment',
    'Other'
  ],
  DEFAULT_GROWTH_RATE: 2.7  // Inflation rate
}

// ============================
// INVESTMENTS & DEBT MODULE
// ============================
export const INVESTMENTS_CONFIG = {
  MAX_INVESTMENTS: 3,
  DEFAULT_GROWTH_RATE: 7,
  RETIREMENT_401K: {
    INDIVIDUAL_LIMIT: 23500,
    LIMIT_GROWTH: 3,
    DEFAULT_GROWTH_RATE: 7
  }
}

// ============================
// HELPER FUNCTIONS
// ============================

/**
 * Initialize default income stream
 * @param {number} index - Stream index (1-based)
 * @param {number} yearsToRetirement
 * @param {number} inflationRate
 * @returns {Object} Default income stream structure
 */
export function createDefaultIncomeStream(index = 1, yearsToRetirement = 30, inflationRate = 2.7) {
  return {
    id: `stream-${Date.now()}-${index}`,
    name: `Income Stream ${index}`,
    annualIncome: '',
    company401k: '',
    individual401k: '',
    equity: '',
    growthRate: inflationRate,
    endWorkYear: yearsToRetirement,
    jumps: []
  }
}

/**
 * Initialize all expense categories with default structure
 * @param {number} inflationRate
 * @returns {Array} Array of expense category objects
 */
export function createDefaultExpenseCategories(inflationRate = 2.7) {
  return EXPENSE_CONFIG.CATEGORIES.map(category => ({
    id: `category-${category.toLowerCase()}`,
    category,
    annualAmount: '',
    amountType: 'dollar',      // 'dollar' | 'percentOfIncome'
    percentOfIncome: '',
    growthRate: inflationRate,
    jumps: []
  }))
}

/**
 * Initialize default investment account
 * @param {number} index - Investment index (1-based)
 * @param {number} currentValue
 * @param {number} portfolioPercent
 * @returns {Object} Default investment structure
 */
export function createDefaultInvestment(index = 1, currentValue = 0, portfolioPercent = 33.33) {
  return {
    id: `investment-${Date.now()}-${index}`,
    currentValue,
    costBasis: currentValue,
    growthRate: INVESTMENTS_CONFIG.DEFAULT_GROWTH_RATE,
    portfolioPercent
  }
}

/**
 * Initialize default 401k structure
 * @param {number} companyContribution
 * @returns {Object} Default 401k structure
 */
export function createDefault401k(companyContribution = 0) {
  return {
    individualLimit: INVESTMENTS_CONFIG.RETIREMENT_401K.INDIVIDUAL_LIMIT,
    limitGrowth: INVESTMENTS_CONFIG.RETIREMENT_401K.LIMIT_GROWTH,
    currentValue: '',
    growthRate: INVESTMENTS_CONFIG.RETIREMENT_401K.DEFAULT_GROWTH_RATE,
    companyContribution
  }
}
