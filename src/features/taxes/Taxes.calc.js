/**
 * Tax Calculation Logic
 */

import { storage } from '../../core'

/**
 * Helper function for 5 decimal place rounding
 */
const round5 = (value) => Math.round(value * 100000) / 100000

/**
 * Load custom tax brackets from storage or use defaults
 */
function loadTaxBrackets() {
  const customLadders = storage.load('taxLadders')
  if (customLadders) {
    return customLadders
  }
  return null
}

/**
 * California 2025 Tax Brackets
 */
const CA_TAX_BRACKETS_2025 = {
  married: [
    { rate: 0.0100, min: 0, max: 21500, stepTax: 0 },
    { rate: 0.0200, min: 21500, max: 51000, stepTax: 215 },
    { rate: 0.0400, min: 51000, max: 80500, stepTax: 805 },
    { rate: 0.0600, min: 80500, max: 111700, stepTax: 1985 },
    { rate: 0.0800, min: 111700, max: 141200, stepTax: 3857 },
    { rate: 0.0930, min: 141200, max: 721300, stepTax: 6217 },
    { rate: 0.1030, min: 721300, max: 865600, stepTax: 60163 },
    { rate: 0.1130, min: 865600, max: 1400000, stepTax: 75026 },
    { rate: 0.1230, min: 1400000, max: Infinity, stepTax: 135422 }
  ],
  single: [
    { rate: 0.0100, min: 0, max: 10800, stepTax: 0 },
    { rate: 0.0200, min: 10800, max: 25500, stepTax: 108 },
    { rate: 0.0400, min: 25500, max: 40200, stepTax: 402 },
    { rate: 0.0600, min: 40200, max: 55900, stepTax: 990 },
    { rate: 0.0800, min: 55900, max: 70600, stepTax: 1932 },
    { rate: 0.0930, min: 70600, max: 360700, stepTax: 3108 },
    { rate: 0.1030, min: 360700, max: 432800, stepTax: 30081 },
    { rate: 0.1130, min: 432800, max: 721300, stepTax: 37507 },
    { rate: 0.1230, min: 721300, max: Infinity, stepTax: 70108 }
  ],
  head: [
    { rate: 0.0100, min: 0, max: 21500, stepTax: 0 },
    { rate: 0.0200, min: 21500, max: 51000, stepTax: 215 },
    { rate: 0.0400, min: 51000, max: 65700, stepTax: 805 },
    { rate: 0.0600, min: 65700, max: 81400, stepTax: 1393 },
    { rate: 0.0800, min: 81400, max: 96100, stepTax: 2335 },
    { rate: 0.0930, min: 96100, max: 490500, stepTax: 3511 },
    { rate: 0.1030, min: 490500, max: 588600, stepTax: 40180 },
    { rate: 0.1130, min: 588600, max: 981000, stepTax: 50284 },
    { rate: 0.1230, min: 981000, max: Infinity, stepTax: 94616 }
  ]
}

/**
 * Federal 2025 Capital Gains Tax Brackets
 */
const FEDERAL_CAPITAL_GAINS_BRACKETS_2025 = {
  married: [
    { rate: 0.0000, min: 0, max: 94100, stepTax: 0 },
    { rate: 0.1500, min: 94100, max: 583800, stepTax: 0 },
    { rate: 0.2000, min: 583800, max: Infinity, stepTax: 73455 }
  ],
  single: [
    { rate: 0.0000, min: 0, max: 47000, stepTax: 0 },
    { rate: 0.1500, min: 47000, max: 518900, stepTax: 0 },
    { rate: 0.2000, min: 518900, max: Infinity, stepTax: 70785 }
  ],
  head: [
    { rate: 0.0000, min: 0, max: 63000, stepTax: 0 },
    { rate: 0.1500, min: 63000, max: 583800, stepTax: 0 },
    { rate: 0.2000, min: 583800, max: Infinity, stepTax: 78120 }
  ],
  separate: [
    { rate: 0.0000, min: 0, max: 47000, stepTax: 0 },
    { rate: 0.1500, min: 47000, max: 291900, stepTax: 0 },
    { rate: 0.2000, min: 291900, max: Infinity, stepTax: 36735 }
  ]
}

/**
 * Federal 2025 Tax Brackets
 */
const FEDERAL_TAX_BRACKETS_2025 = {
  married: [
    { rate: 0.1000, min: 0, max: 23900, stepTax: 0 },
    { rate: 0.1200, min: 23900, max: 97000, stepTax: 2390 },
    { rate: 0.2200, min: 97000, max: 206700, stepTax: 11162 },
    { rate: 0.2400, min: 206700, max: 394600, stepTax: 35296 },
    { rate: 0.3200, min: 394600, max: 501100, stepTax: 80392 },
    { rate: 0.3500, min: 501100, max: 751600, stepTax: 114472 },
    { rate: 0.3700, min: 751600, max: Infinity, stepTax: 202147 }
  ],
  single: [
    { rate: 0.1000, min: 0, max: 11900, stepTax: 0 },
    { rate: 0.1200, min: 11900, max: 48500, stepTax: 1190 },
    { rate: 0.2200, min: 48500, max: 103400, stepTax: 5582 },
    { rate: 0.2400, min: 103400, max: 197300, stepTax: 17660 },
    { rate: 0.3200, min: 197300, max: 250500, stepTax: 40196 },
    { rate: 0.3500, min: 250500, max: 626400, stepTax: 57220 },
    { rate: 0.3700, min: 626400, max: Infinity, stepTax: 188785 }
  ],
  head: [
    { rate: 0.1000, min: 0, max: 17000, stepTax: 0 },
    { rate: 0.1200, min: 17000, max: 64900, stepTax: 1700 },
    { rate: 0.2200, min: 64900, max: 103400, stepTax: 7448 },
    { rate: 0.2400, min: 103400, max: 197300, stepTax: 15918 },
    { rate: 0.3200, min: 197300, max: 250500, stepTax: 38454 },
    { rate: 0.3500, min: 250500, max: 626400, stepTax: 55478 },
    { rate: 0.3700, min: 626400, max: Infinity, stepTax: 187043 }
  ],
  separate: [
    { rate: 0.1000, min: 0, max: 11900, stepTax: 0 },
    { rate: 0.1200, min: 11900, max: 48500, stepTax: 1190 },
    { rate: 0.2200, min: 48500, max: 103400, stepTax: 5582 },
    { rate: 0.2400, min: 103400, max: 197300, stepTax: 17660 },
    { rate: 0.3200, min: 197300, max: 250500, stepTax: 40196 },
    { rate: 0.3500, min: 250500, max: 375800, stepTax: 57220 },
    { rate: 0.3700, min: 375800, max: Infinity, stepTax: 101073 }
  ]
}

/**
 * FICA Tax Rates (2025)
 * Social Security: 6.2% up to $168,600
 * Medicare: 1.45% on all wages
 * Additional Medicare: 0.9% on wages over $200k (single) or $250k (married)
 */
const FICA_RATES_2025 = {
  socialSecurity: {
    rate: 0.062,
    wageBase: 168600
  },
  medicare: {
    rate: 0.0145
  },
  additionalMedicare: {
    rate: 0.009,
    threshold: {
      single: 200000,
      married: 250000,
      head: 200000,
      separate: 125000
    }
  }
}


/**
 * Calculate tax based on brackets with detailed breakdown
 */
function calculateBracketTax(income, brackets) {
  if (income <= 0) return { total: 0, breakdown: [] }

  let tax = 0
  const breakdown = []

  for (const bracket of brackets) {
    if (income <= bracket.min) {
      break
    }

    const taxableInBracket = Math.min(income, bracket.max) - bracket.min
    if (taxableInBracket > 0) {
      const taxInBracket = taxableInBracket * bracket.rate
      tax = bracket.stepTax + taxInBracket

      breakdown.push({
        min: bracket.min,
        max: bracket.max,
        rate: bracket.rate,
        taxableAmount: taxableInBracket,
        taxAmount: taxInBracket
      })
    }

    if (income <= bracket.max) {
      break
    }
  }

  return {
    total: round5(tax),
    breakdown
  }
}

/**
 * Calculate FICA taxes with inflation adjustment
 */
function calculateFICATax(salary, filingType, inflationMultiplier = 1) {
  if (salary <= 0) {
    return {
      socialSecurity: 0,
      medicare: 0,
      additionalMedicare: 0,
      total: 0
    }
  }

  // Apply inflation to thresholds
  const inflatedWageBase = round5(FICA_RATES_2025.socialSecurity.wageBase * inflationMultiplier)
  const baseThreshold = FICA_RATES_2025.additionalMedicare.threshold[filingType] || 200000
  const inflatedThreshold = round5(baseThreshold * inflationMultiplier)

  // Social Security (capped at inflated wage base)
  const socialSecurity = round5(
    Math.min(salary, inflatedWageBase) * FICA_RATES_2025.socialSecurity.rate
  )

  // Medicare (no cap)
  const medicare = round5(salary * FICA_RATES_2025.medicare.rate)

  // Additional Medicare (over inflated threshold)
  const additionalMedicare = salary > inflatedThreshold
    ? round5((salary - inflatedThreshold) * FICA_RATES_2025.additionalMedicare.rate)
    : 0

  return {
    socialSecurity,
    medicare,
    additionalMedicare,
    total: socialSecurity + medicare + additionalMedicare
  }
}

/**
 * Calculate taxes for a single income source
 * @param {number} income - The income to calculate taxes on
 * @param {string} incomeType - 'salary' or 'investment'
 * @param {string} filingType - Filing status
 * @param {string} state - State for state taxes
 * @param {string} country - Country for federal taxes
 * @param {number} year - Year for inflation adjustment (1 = current year, 2 = next year, etc.)
 * @param {number} inflationRate - Annual inflation rate as percentage (e.g., 2.7 for 2.7%)
 */
export function calculateTaxes(income, incomeType, filingType, state = 'california', country = 'usa', year = 1, inflationRate = 0) {
  console.group('💰 Calculating Taxes')
  console.log('Income:', income)
  console.log('Income Type:', incomeType)
  console.log('Filing Type:', filingType)
  console.log('State:', state)
  console.log('Country:', country)
  console.log('Year:', year)
  console.log('Inflation Rate:', inflationRate + '%')

  // Calculate inflation multiplier for this year
  const yearsOfInflation = year - 1
  const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsOfInflation)

  // Load custom tax brackets if available
  const customLadders = loadTaxBrackets()

  // Helper to convert stored brackets (rate as 1.0-12.3) to calculation format (0.01-0.123)
  const convertBrackets = (brackets) => {
    return brackets.map((b, idx, arr) => ({
      rate: b.rate / 100,
      min: b.min,
      max: b.max,
      stepTax: idx === 0 ? 0 : calculateStepTax(arr, idx)
    }))
  }

  // Calculate step tax for a bracket
  const calculateStepTax = (brackets, index) => {
    let stepTax = 0
    for (let i = 0; i < index; i++) {
      const bracket = brackets[i]
      const range = bracket.max - bracket.min
      stepTax += range * (bracket.rate / 100)
    }
    return stepTax
  }

  // Helper to inflate brackets for a given year
  const inflateBrackets = (brackets, multiplier) => {
    if (multiplier === 1) return brackets

    return brackets.map((bracket, idx) => ({
      rate: bracket.rate,
      min: round5(bracket.min * multiplier),
      max: bracket.max === Infinity ? Infinity : round5(bracket.max * multiplier),
      stepTax: bracket.stepTax * multiplier  // Step tax also needs to be scaled
    }))
  }

  // Get state brackets
  let stateBrackets = CA_TAX_BRACKETS_2025[filingType]
  let actualStateFilingType = filingType

  if (customLadders && customLadders.states && customLadders.states[state]) {
    const stateData = customLadders.states[state]
    const taxType = incomeType === 'salary' ? 'salaryTax' : 'investmentTax'
    let filingTypeData = stateData[taxType]?.filingTypes[filingType]

    // Check if filing type is disabled - if so, use the fallback filing type
    if (filingTypeData && !filingTypeData.enabled) {
      const fallbackFilingType = filingTypeData.useInstead || 'single'
      actualStateFilingType = fallbackFilingType
      filingTypeData = stateData[taxType]?.filingTypes[fallbackFilingType]
    }

    if (filingTypeData && filingTypeData.brackets) {
      stateBrackets = convertBrackets(filingTypeData.brackets)
    }
  }

  // Apply inflation to state brackets
  stateBrackets = inflateBrackets(stateBrackets, inflationMultiplier)

  // Get country/federal brackets
  let federalBrackets
  let actualFederalFilingType = filingType

  if (incomeType === 'investment') {
    federalBrackets = FEDERAL_CAPITAL_GAINS_BRACKETS_2025[filingType]
  } else {
    federalBrackets = FEDERAL_TAX_BRACKETS_2025[filingType]
  }

  if (customLadders && customLadders.countries && customLadders.countries[country]) {
    const countryData = customLadders.countries[country]
    const taxType = incomeType === 'salary' ? 'salaryTax' : 'investmentTax'
    let filingTypeData = countryData[taxType]?.filingTypes[filingType]

    // Check if filing type is disabled - if so, use the fallback filing type
    if (filingTypeData && !filingTypeData.enabled) {
      const fallbackFilingType = filingTypeData.useInstead || 'single'
      actualFederalFilingType = fallbackFilingType
      filingTypeData = countryData[taxType]?.filingTypes[fallbackFilingType]
    }

    if (filingTypeData && filingTypeData.brackets) {
      federalBrackets = convertBrackets(filingTypeData.brackets)
    }
  }

  // Apply inflation to federal brackets
  federalBrackets = inflateBrackets(federalBrackets, inflationMultiplier)

  console.log('Actual State Filing Type Used:', actualStateFilingType)
  console.log('Actual Federal Filing Type Used:', actualFederalFilingType)

  // Calculate state tax
  const stateTaxResult = calculateBracketTax(income, stateBrackets)

  // Calculate federal tax
  const federalTaxResult = calculateBracketTax(income, federalBrackets)

  // Calculate FICA (only on salary, not investment income)
  const fica = incomeType === 'salary'
    ? calculateFICATax(income, filingType, inflationMultiplier)
    : { socialSecurity: 0, medicare: 0, additionalMedicare: 0, total: 0 }

  const result = {
    income,
    incomeType,
    filingType,
    actualStateFilingType,
    actualFederalFilingType,
    state,
    country,
    stateTax: stateTaxResult.total,
    stateTaxBreakdown: stateTaxResult.breakdown,
    federalTax: federalTaxResult.total,
    federalTaxBreakdown: federalTaxResult.breakdown,
    fica,
    totalTax: stateTaxResult.total + federalTaxResult.total + fica.total,
    effectiveRate: income > 0 ? ((stateTaxResult.total + federalTaxResult.total + fica.total) / income) : 0
  }

  console.log('Result:', result)
  console.groupEnd()

  return result
}

/**
 * Validate tax input
 */
export function validateTaxInput(data) {
  const errors = {}

  data.incomes.forEach((item, index) => {
    if (item.amount === '' || item.amount < 0) {
      errors[`${index}-amount`] = 'Amount must be a positive number'
    }

    if (!item.incomeType) {
      errors[`${index}-incomeType`] = 'Income type is required'
    }
  })

  if (!data.filingType) {
    errors.filingType = 'Filing type is required'
  }

  return errors
}
