/**
 * Investments & Debt Validation Logic
 *
 * Note: Projection calculations now use Gap.calc.js for consistency across the app.
 * This file only contains validation logic.
 */

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
