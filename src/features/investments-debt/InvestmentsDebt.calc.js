/**
 * Investments & Debt Calculation Logic
 */

/**
 * Helper function for 5 decimal place rounding
 */
const round5 = (value) => Math.round(value * 100000) / 100000

/**
 * Validate investment data
 */
export function validateInvestments(data) {
  const errors = {}

  // Validate cash fields
  if (data.currentCash === '' || data.currentCash < 0) {
    errors.currentCash = 'Current cash must be a positive number or zero'
  }

  if (data.targetCash === '' || data.targetCash < 0) {
    errors.targetCash = 'Target cash must be a positive number or zero'
  }

  // Validate 401k fields
  if (data.retirement401k.individualLimit === '' || data.retirement401k.individualLimit < 0) {
    errors['401k-individualLimit'] = 'Individual limit must be a positive number'
  }

  if (data.retirement401k.limitGrowth === '' || data.retirement401k.limitGrowth < -100) {
    errors['401k-limitGrowth'] = 'Limit growth must be a number greater than -100%'
  }

  if (data.retirement401k.currentValue === '' || data.retirement401k.currentValue < 0) {
    errors['401k-currentValue'] = 'Current 401(k) value must be a positive number or zero'
  }

  if (data.retirement401k.growthRate === '' || data.retirement401k.growthRate < -100) {
    errors['401k-growthRate'] = 'Growth rate must be a number greater than -100%'
  }

  // Validate investments
  data.investments.forEach((investment, index) => {
    if (investment.currentValue === '' || investment.currentValue < 0) {
      errors[`${index}-currentValue`] = 'Current value must be a positive number or zero'
    }

    if (investment.costBasis === '' || investment.costBasis < 0) {
      errors[`${index}-costBasis`] = 'Cost basis must be a positive number or zero'
    }

    if (investment.growthRate === '' || investment.growthRate < -100) {
      errors[`${index}-growthRate`] = 'Growth rate must be a number greater than -100%'
    }

    if (investment.portfolioPercent === '' || investment.portfolioPercent < 0) {
      errors[`${index}-portfolioPercent`] = 'Portfolio percent must be a positive number or zero'
    }

    if (investment.portfolioPercent > 100) {
      errors[`${index}-portfolioPercent`] = 'Portfolio percent cannot exceed 100%'
    }
  })

  // Validate total portfolio allocation
  const totalPortfolioPercent = data.investments.reduce((sum, inv) => {
    return sum + (Number(inv.portfolioPercent) || 0)
  }, 0)

  if (totalPortfolioPercent > 100) {
    errors.totalPortfolio = 'Total portfolio allocation exceeds 100%'
  }

  return errors
}

/**
 * Calculate investment projections over time
 */
export function calculateInvestmentProjections(data, yearsToRetirement, profile) {
  console.group('💰 Calculating Investment Projections')

  const currentCash = Number(data.currentCash) || 0
  const targetCash = Number(data.targetCash) || 0

  // 401k parameters
  const retirement401k = {
    individualLimit: Number(data.retirement401k.individualLimit) || 0,
    limitGrowth: Number(data.retirement401k.limitGrowth) || 0,
    currentValue: Number(data.retirement401k.currentValue) || 0,
    growthRate: Number(data.retirement401k.growthRate) || 0,
    companyContribution: Number(data.retirement401k.companyContribution) || 0
  }

  // Process investments
  const investments = data.investments.map(inv => ({
    id: inv.id,
    currentValue: Number(inv.currentValue) || 0,
    costBasis: Number(inv.costBasis) || 0,
    growthRate: Number(inv.growthRate) || 0,
    portfolioPercent: Number(inv.portfolioPercent) || 0
  }))

  // Generate yearly projections
  const chartData = []

  for (let year = 1; year <= yearsToRetirement; year++) {
    const yearsOfGrowth = year - 1

    // Cash remains constant
    const cashValue = currentCash

    // 401k grows with returns and annual contributions
    let retirement401kValue = retirement401k.currentValue

    // Apply growth for each year
    for (let y = 0; y < year; y++) {
      // Growth on existing balance
      retirement401kValue *= (1 + retirement401k.growthRate / 100)

      // Add annual contribution (company match)
      // The individual contribution is already excluded from income
      retirement401kValue += retirement401k.companyContribution
    }

    // Investments grow
    const investmentValues = investments.map(inv => {
      const value = inv.currentValue * Math.pow(1 + inv.growthRate / 100, year)
      return round5(value)
    })

    // Calculate total
    const investmentsTotal = investmentValues.reduce((sum, val) => sum + val, 0)
    const total = cashValue + retirement401kValue + investmentsTotal

    // Build data point
    const dataPoint = {
      year,
      cash: round5(cashValue),
      retirement401k: round5(retirement401kValue),
      total: round5(total)
    }

    // Add individual investments
    investments.forEach((inv, index) => {
      dataPoint[`investment${index + 1}`] = investmentValues[index]
    })

    chartData.push(dataPoint)
  }

  // Calculate summary metrics
  const currentTotalSavings = currentCash + retirement401k.currentValue + investments.reduce((sum, inv) => sum + inv.currentValue, 0)
  const year10Total = chartData[9]?.total || 0
  const retirementTotal = chartData[yearsToRetirement - 1]?.total || 0
  const totalGrowthPercent = currentTotalSavings > 0 ? ((retirementTotal - currentTotalSavings) / currentTotalSavings * 100) : 0

  const summary = {
    currentTotalSavings,
    year10Total,
    retirementTotal,
    totalGrowthPercent
  }

  const result = {
    chartData,
    summary
  }

  console.log('Projections:', result)
  console.groupEnd()

  return result
}
