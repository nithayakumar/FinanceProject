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
import { storage } from '../../shared/storage'

/**
 * Get current plan data from localStorage
 * This is the user's active financial plan
 * @returns {Object} Complete scenario data
 */
export function getCurrentPlanData() {
  return {
    profile: storage.load('profile') || {},
    income: storage.load('income') || {},
    expenses: storage.load('expenses') || {},
    investmentsDebt: storage.load('investmentsDebt') || {}
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
 * @param {Object} scenarioData - Complete scenario data OR scenario object with .data property
 * @returns {Object} Full projection results
 */
export function calculateScenarioProjections(scenarioData) {
  console.group('📊 Calculating Scenario Projections')

  // Handle both formats: complete data OR scenario object with .data
  const data = scenarioData.data || scenarioData

  // Calculate income projections
  const incomeData = calculateIncomeProjections(
    data.income,
    data.profile.yearsToRetirement || 30,
    data.profile.inflationRate || 2.7
  )

  // Calculate expense projections
  const expensesData = calculateExpenseProjections(
    data.expenses,
    data.profile.yearsToRetirement || 30,
    data.profile.inflationRate || 2.7
  )

  // Calculate gap projections (includes net worth)
  const projections = calculateGapProjections(
    incomeData,
    expensesData,
    data.investmentsDebt,
    data.profile
  )

  console.log('Scenario Projections:', projections)
  console.groupEnd()

  return {
    incomeData,
    expensesData,
    projections
  }
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
    income: acc.income + year.annualIncome,
    taxes: acc.taxes + year.totalTaxes,
    expenses: acc.expenses + year.annualExpenses,
    gap: acc.gap + year.gap
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
    firstYearIncome: Math.round(firstYear.annualIncome),
    firstYearTaxes: Math.round(firstYear.totalTaxes),
    firstYearExpenses: Math.round(firstYear.annualExpenses),
    firstYearGap: Math.round(firstYear.gap),
    firstYearSavingsRate: firstYear.annualIncome > 0
      ? Math.round((firstYear.gap / firstYear.annualIncome) * 10000) / 100
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
      income: Math.round(p.annualIncome),
      taxes: Math.round(p.totalTaxes),
      expenses: Math.round(p.annualExpenses),
      gap: Math.round(p.gap),
      netWorth: Math.round(p.netWorth),
      cash: Math.round(p.cash),
      investments: Math.round(p.totalInvestmentValue),
      retirement401k: Math.round(p.retirement401k)
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
