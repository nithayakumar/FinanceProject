/**
 * Scenario Calculation Logic
 *
 * NEW ARCHITECTURE: Everything is a scenario (complete data, not overrides)
 * - "Current Plan" = localStorage data (profile, income, expenses, investmentsDebt)
 * - Other scenarios = complete copies with modifications
 * - Module-agnostic: works with ANY module structure
 */

import { calculateGapProjections } from '../gap/Gap.calc'
import { calculateIncomeProjections } from '../income/Income.calc'
import { calculateExpenseProjections } from '../expenses/Expenses.calc'
import { storage } from '../../core'

/**
 * Validate that projection results have the expected structure
 * This helps catch API contract mismatches early
 * @param {Object} projectionResults - Results from calculateScenarioProjections
 * @throws {Error} If structure is invalid
 */
export function validateProjectionResults(projectionResults) {
  if (!projectionResults) {
    throw new Error('ProjectionResults is null or undefined')
  }

  if (!projectionResults.projections || !Array.isArray(projectionResults.projections)) {
    throw new Error('ProjectionResults.projections must be an array')
  }

  if (projectionResults.projections.length === 0) {
    throw new Error('ProjectionResults.projections array is empty')
  }

  const firstYear = projectionResults.projections[0]
  const requiredFields = ['year', 'grossIncome', 'annualTaxes', 'annualExpenses', 'gap', 'netWorth']

  requiredFields.forEach(field => {
    if (!(field in firstYear)) {
      throw new Error(`ProjectionResults.projections[0] is missing required field: ${field}`)
    }
    if (typeof firstYear[field] !== 'number') {
      throw new Error(`ProjectionResults.projections[0].${field} must be a number, got ${typeof firstYear[field]}`)
    }
  })

  return true
}

/**
 * Safely extract first year summary from projection results
 * Helper function to prevent API contract mismatches
 *
 * @param {Object} projectionResults - Results from calculateScenarioProjections
 * @returns {Object} First year summary with income, taxes, expenses, gap
 * @returns {number} return.income - Annual gross income
 * @returns {number} return.taxes - Annual taxes
 * @returns {number} return.expenses - Annual expenses
 * @returns {number} return.gap - Annual gap/savings
 * @returns {number} return.netWorth - Net worth at end of year
 *
 * @example
 * const summary = getFirstYearSummary(projectionResults)
 * console.log(`Income: ${summary.income}, Taxes: ${summary.taxes}`)
 */
export function getFirstYearSummary(projectionResults) {
  validateProjectionResults(projectionResults)

  const firstYear = projectionResults.projections[0]

  return {
    income: firstYear.grossIncome,
    taxes: firstYear.annualTaxes,
    expenses: firstYear.annualExpenses,
    gap: firstYear.gap,
    netWorth: firstYear.netWorth
  }
}

/**
 * Get current plan data from localStorage
 * This is the user's active financial plan
 * @returns {Object} Complete scenario data with proper defaults
 */
export function getCurrentPlanData() {
  const profile = storage.load('profile') || {}
  const income = storage.load('income') || {}
  const expenses = storage.load('expenses') || {}
  const investmentsDebt = storage.load('investmentsDebt') || {}

  // Ensure required arrays exist to prevent .reduce() errors in Gap.calc.js
  return {
    profile: {
      age: 30,
      retirementAge: 65,
      inflationRate: 2.7,
      currentCash: 0,
      targetCash: 0,
      currentSavings: 0,
      ...profile
    },
    income: {
      incomeStreams: income.incomeStreams || [],
      ...income
    },
    expenses: {
      expenseCategories: expenses.expenseCategories || [],
      oneTimeExpenses: expenses.oneTimeExpenses || [],
      ...expenses
    },
    investmentsDebt: {
      currentCash: 0,
      targetCash: 0,
      retirement401k: {
        individualLimit: 23500,
        limitGrowth: 3,
        currentValue: 0,
        growthRate: 7,
        companyContribution: 0,
        ...(investmentsDebt.retirement401k || {})
      },
      investments: investmentsDebt.investments || [],
      ...investmentsDebt
    },
    taxes: storage.load('taxes') || {},
    taxLadders: storage.load('taxLadders') || {},
    filingStatusRemapping: storage.load('filingStatusRemapping') || {},
    customTaxLadder: storage.load('customTaxLadder') || {}
  }
}

/**
 * Load all scenarios (including current plan as special scenario)
 * @returns {Array} Array of scenario objects
 */
export function loadAllScenariosWithCurrent() {
  const currentPlan = getCurrentPlanData()
  const savedScenarios = storage.load('scenarios') || []

  return [
    {
      id: 'current',
      name: 'Current Plan',
      description: 'Your active financial plan',
      isCurrent: true,
      data: currentPlan,
      createdAt: Date.now(),
      modifiedAt: Date.now()
    },
    ...savedScenarios
  ]
}

// Keep for backward compatibility, but now it's just a pass-through
export function mergeScenarioData(baseData, scenarioData) {
  // In new architecture, scenarioData IS complete data, not overrides
  // If scenarioData has a 'data' property, use it; otherwise assume scenarioData IS the data
  return scenarioData.data || scenarioData
}

/**
 * Calculate full financial projections for a scenario
 * NEW: Works with complete scenario data (not base + overrides)
 *
 * @param {Object} scenarioData - Complete scenario data OR scenario object with .data property
 * @param {Object} scenarioData.profile - Profile settings (age, retirementAge, inflationRate, etc.)
 * @param {Object} scenarioData.income - Income data with incomeStreams array
 * @param {Object} scenarioData.expenses - Expense data with expenseCategories and oneTimeExpenses
 * @param {Object} scenarioData.investmentsDebt - Investment/debt data
 *
 * @returns {Object} ProjectionResults
 * @returns {Object} ProjectionResults.incomeData - Income projection data with projections array
 * @returns {Object} ProjectionResults.expensesData - Expense projection data with projections array
 * @returns {Array<Object>} ProjectionResults.projections - Array of yearly projections (1 per year)
 * @returns {number} ProjectionResults.projections[].year - Year number (1, 2, 3, ...)
 * @returns {number} ProjectionResults.projections[].grossIncome - Total annual income (nominal)
 * @returns {number} ProjectionResults.projections[].annualTaxes - Total annual taxes (nominal)
 * @returns {number} ProjectionResults.projections[].annualExpenses - Total annual expenses (nominal)
 * @returns {number} ProjectionResults.projections[].gap - Annual gap/savings (nominal)
 * @returns {number} ProjectionResults.projections[].netWorth - Net worth at end of year (nominal)
 * @returns {Object} ProjectionResults.gapSummary - Summary statistics object
 *
 * @example
 * const results = calculateScenarioProjections(scenarioData)
 * const firstYear = results.projections[0]
 * console.log(firstYear.grossIncome, firstYear.annualTaxes, firstYear.annualExpenses, firstYear.gap)
 */
export function calculateScenarioProjections(scenarioData) {
  console.group('📊 Calculating Scenario Projections')

  // Handle both formats: complete data OR scenario object with .data
  const data = scenarioData.data || scenarioData

  // Calculate income projections
  const incomeProjectionResults = calculateIncomeProjections(
    data.income,
    data.profile
  )

  // Calculate expense projections
  const expensesData = calculateExpenseProjections(
    data.expenses,
    data.profile,
    incomeProjectionResults.projections
  )

  // Build incomeData object with both projections AND raw incomeStreams
  // Gap.calc.js needs incomeStreams to calculate individual 401k contributions
  const incomeData = {
    ...incomeProjectionResults,
    incomeStreams: data.income.incomeStreams || []
  }

  // Calculate gap projections (includes net worth)
  const gapResults = calculateGapProjections(
    incomeData,
    expensesData,
    data.investmentsDebt,
    data.profile
  )

  console.log('Scenario Projections:', gapResults)
  console.groupEnd()

  const results = {
    incomeData,
    expensesData,
    projections: gapResults.projections,  // Extract the array from the result object
    gapSummary: gapResults.summary
  }

  // Validate structure before returning (helps catch API contract issues)
  validateProjectionResults(results)

  return results
}

/**
 * Calculate key summary metrics for a scenario
 * @param {Object} projectionResults - Results from calculateScenarioProjections
 * @returns {Object} Summary metrics for comparison
 */
export function calculateScenarioSummary(projectionResults) {
  const { projections } = projectionResults

  if (!projections || projections.length === 0) {
    return null
  }

  // Get first and last year projections
  const firstYear = projections[0]
  const lastYear = projections[projections.length - 1]

  // Calculate average annual values across all years
  const totalYears = projections.length
  const totals = projections.reduce((acc, year) => ({
    income: acc.income + (year.grossIncome || 0),
    taxes: acc.taxes + (year.annualTaxes || 0),
    expenses: acc.expenses + (year.annualExpenses || 0),
    gap: acc.gap + (year.gap || 0)
  }), { income: 0, taxes: 0, expenses: 0, gap: 0 })

  const avgAnnualIncome = totals.income / totalYears
  const avgAnnualTaxes = totals.taxes / totalYears
  const avgAnnualExpenses = totals.expenses / totalYears
  const avgAnnualGap = totals.gap / totalYears

  // Calculate average savings rate
  const avgSavingsRate = avgAnnualIncome > 0 ? (avgAnnualGap / avgAnnualIncome) * 100 : 0

  return {
    // Annual averages
    avgAnnualIncome: Math.round(avgAnnualIncome),
    avgAnnualTaxes: Math.round(avgAnnualTaxes),
    avgAnnualExpenses: Math.round(avgAnnualExpenses),
    avgAnnualGap: Math.round(avgAnnualGap),
    avgSavingsRate: Math.round(avgSavingsRate * 100) / 100,

    // First year values
    firstYearIncome: Math.round(firstYear.grossIncome || 0),
    firstYearTaxes: Math.round(firstYear.annualTaxes || 0),
    firstYearExpenses: Math.round(firstYear.annualExpenses || 0),
    firstYearGap: Math.round(firstYear.gap || 0),
    firstYearSavingsRate: (firstYear.grossIncome || 0) > 0
      ? Math.round((firstYear.gap / firstYear.grossIncome) * 10000) / 100
      : 0,

    // Retirement values (last year)
    netWorthAtRetirement: Math.round(lastYear.netWorth),
    cashAtRetirement: Math.round(lastYear.cash),
    investmentsAtRetirement: Math.round(lastYear.totalInvestmentValue),
    retirement401kAtRetirement: Math.round(lastYear.retirement401k),

    // Cumulative values
    totalIncomeCumulative: Math.round(totals.income),
    totalTaxesCumulative: Math.round(totals.taxes),
    totalExpensesCumulative: Math.round(totals.expenses),
    totalSavingsCumulative: Math.round(totals.gap),

    // Full projections for charting
    yearlyProjections: projections.map(p => ({
      year: p.year,
      income: Math.round(p.grossIncome || 0),
      taxes: Math.round(p.annualTaxes || 0),
      expenses: Math.round(p.annualExpenses || 0),
      gap: Math.round(p.gap || 0),
      netWorth: Math.round(p.netWorth || 0),
      cash: Math.round(p.cash || 0),
      investments: Math.round(p.totalInvestmentValue || 0),
      retirement401k: Math.round(p.retirement401kValue || 0)
    }))
  }
}

/**
 * Compare multiple scenarios and calculate differences
 * @param {Array} scenarios - Array of scenario objects with projections
 * @returns {Object} Comparison data with differences
 */
export function compareScenarios(scenarios) {
  console.group('⚖️ Comparing Scenarios')

  if (!scenarios || scenarios.length < 2) {
    console.warn('Need at least 2 scenarios to compare')
    console.groupEnd()
    return null
  }

  // Calculate summary for each scenario
  const summaries = scenarios.map(scenario => ({
    id: scenario.id,
    name: scenario.name,
    summary: calculateScenarioSummary(scenario.projectionResults)
  }))

  // Use first scenario as baseline
  const baseline = summaries[0]

  // Calculate differences from baseline
  const comparisons = summaries.map((scenario, index) => {
    if (index === 0) {
      // Baseline has no differences
      return {
        ...scenario,
        differences: null
      }
    }

    const diff = {}
    const baselineSummary = baseline.summary
    const currentSummary = scenario.summary

    // Calculate absolute and percentage differences for key metrics
    const metrics = [
      'avgAnnualIncome', 'avgAnnualTaxes', 'avgAnnualExpenses', 'avgAnnualGap',
      'netWorthAtRetirement', 'totalIncomeCumulative', 'totalTaxesCumulative',
      'totalExpensesCumulative', 'totalSavingsCumulative'
    ]

    metrics.forEach(metric => {
      const baseValue = baselineSummary[metric]
      const currentValue = currentSummary[metric]
      const absolute = currentValue - baseValue
      const percentage = baseValue !== 0 ? (absolute / baseValue) * 100 : 0

      diff[metric] = {
        absolute: Math.round(absolute),
        percentage: Math.round(percentage * 100) / 100,
        better: absolute > 0 && (metric.includes('Income') || metric.includes('Gap') || metric.includes('Worth') || metric.includes('Savings')),
        worse: absolute < 0 && (metric.includes('Income') || metric.includes('Gap') || metric.includes('Worth') || metric.includes('Savings'))
      }

      // For taxes and expenses, negative is better
      if (metric.includes('Taxes') || metric.includes('Expenses')) {
        diff[metric].better = absolute < 0
        diff[metric].worse = absolute > 0
      }
    })

    // Savings rate difference (percentage points)
    diff.avgSavingsRate = {
      absolute: Math.round((currentSummary.avgSavingsRate - baselineSummary.avgSavingsRate) * 100) / 100,
      percentage: null, // Already a percentage, so no % change
      better: currentSummary.avgSavingsRate > baselineSummary.avgSavingsRate,
      worse: currentSummary.avgSavingsRate < baselineSummary.avgSavingsRate
    }

    return {
      ...scenario,
      differences: diff
    }
  })

  console.log('Comparison Results:', comparisons)
  console.groupEnd()

  return {
    baseline: baseline.name,
    scenarios: comparisons
  }
}

/**
 * Validate scenario data before calculation
 * NEW: Works with complete scenario data
 * @param {Object} scenarioData - Complete scenario data OR scenario object with .data
 * @returns {Object} { valid: boolean, errors: Array }
 */
export function validateScenarioData(scenarioData) {
  const errors = []
  const data = scenarioData.data || scenarioData

  // Validate profile
  if (data.profile) {
    if (data.profile.age && (data.profile.age < 18 || data.profile.age > 100)) {
      errors.push('Age must be between 18 and 100')
    }
    if (data.profile.inflationRate && (data.profile.inflationRate < 0 || data.profile.inflationRate > 20)) {
      errors.push('Inflation rate must be between 0% and 20%')
    }
  }

  // Validate income
  if (data.income && data.income.incomeStreams) {
    data.income.incomeStreams.forEach((stream, index) => {
      if (stream.annualIncome && stream.annualIncome < 0) {
        errors.push(`Income stream ${index + 1}: Annual income cannot be negative`)
      }
      if (stream.growthRate && (stream.growthRate < -50 || stream.growthRate > 50)) {
        errors.push(`Income stream ${index + 1}: Growth rate must be between -50% and 50%`)
      }
    })
  }

  // Validate expenses
  if (data.expenses && data.expenses.expenseCategories) {
    const totalExpenses = data.expenses.expenseCategories.reduce((sum, cat) => sum + (Number(cat.annualAmount) || 0), 0)
    if (totalExpenses < 0) {
      errors.push('Total expenses cannot be negative')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
