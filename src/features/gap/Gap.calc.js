/**
 * Gap Calculation Logic
 *
 * Formula: Gap = Income - Pretax 401k - Taxes - Expenses
 *
 * Allocation:
 * - If Gap > 0: Fill cash to target, invest per allocation %, excess to cash
 * - If Gap < 0: Stop investing, draw from cash (can go negative)
 */

import { calculateTaxes } from '../taxes/Taxes.calc'

/**
 * Helper function for 5 decimal place rounding
 */
const round5 = (value) => Math.round(value * 100000) / 100000

/**
 * Calculate gap projections and net worth over time
 */
export function calculateGapProjections(incomeData, expensesData, investmentsData, profile) {
  console.group('📊 Calculating Gap Projections')

  const yearsToRetirement = profile.yearsToRetirement || 30
  const inflationRate = profile.inflationRate !== undefined ? profile.inflationRate : 2.7

  console.log('Years to Retirement:', yearsToRetirement)
  console.log('Inflation Rate:', inflationRate + '%')

  // Extract starting values
  let cash = Number(investmentsData.currentCash) || 0
  const targetCash = Number(investmentsData.targetCash) || 0

  const retirement401k = {
    value: Number(investmentsData.retirement401k.currentValue) || 0,
    growthRate: Number(investmentsData.retirement401k.growthRate) || 0,
    companyContribution: Number(investmentsData.retirement401k.companyContribution) || 0
  }

  const investments = investmentsData.investments.map(inv => ({
    id: inv.id,
    costBasis: Number(inv.currentValue) || 0,  // Start with current value as initial cost basis
    marketValue: Number(inv.currentValue) || 0,
    growthRate: Number(inv.growthRate) || 0,
    portfolioPercent: Number(inv.portfolioPercent) || 0
  }))

  // Calculate total allocation percentage
  const totalAllocation = investments.reduce((sum, inv) => sum + inv.portfolioPercent, 0)

  console.log('Starting Cash:', cash)
  console.log('Target Cash:', targetCash)
  console.log('Starting 401k:', retirement401k.value)
  console.log('Total Allocation %:', totalAllocation)

  // Generate yearly projections
  const projections = []

  for (let year = 1; year <= yearsToRetirement; year++) {
    // Get annual income from income projections (January of this year, monthly * 12)
    const janIndex = (year - 1) * 12  // Month index for January of this year
    const incomeProjection = incomeData.projections[janIndex] || {}
    const annualIncome = (incomeProjection.totalCompNominal || 0) * 12

    // Calculate total individual 401k contribution across all streams
    const totalIndividual401k = incomeData.incomeStreams.reduce((sum, stream) => {
      if (year <= stream.endWorkYear) {
        // Apply growth to 401k contribution
        const yearsOfGrowth = year - 1
        const growthMultiplier = Math.pow(1 + stream.growthRate / 100, yearsOfGrowth)
        return sum + ((Number(stream.individual401k) || 0) * growthMultiplier)
      }
      return sum
    }, 0)

    // Get annual expenses from expenses projections (January of this year, monthly * 12)
    const expenseProjection = expensesData.projections[janIndex] || {}
    const annualExpenses = (expenseProjection.totalExpensesNominal || 0) * 12

    // Calculate taxes on income after 401k deduction
    // Tax brackets are now automatically inflated within calculateTaxes
    const taxableIncome = annualIncome - totalIndividual401k

    const filingType = profile.filingStatus === 'Married Filing Jointly' ? 'married' :
                       profile.filingStatus === 'Married Filing Separately' ? 'separate' :
                       profile.filingStatus === 'Head of Household' ? 'head' : 'single'
    const taxCalc = calculateTaxes(taxableIncome, 'salary', filingType, 'california', 'usa', year, inflationRate)
    const annualTaxes = taxCalc.totalTax

    // Diagnostic logging for tax % changes
    if (year <= 5) {
      console.log(`\n📊 Year ${year} Tax Breakdown:`)
      console.log(`  Annual Income: $${annualIncome.toLocaleString()}`)
      console.log(`  401(k) Contributions: $${totalIndividual401k.toLocaleString()}`)
      console.log(`  Taxable Income: $${taxableIncome.toLocaleString()}`)
      console.log(`  Annual Taxes: $${annualTaxes.toLocaleString()}`)
      console.log(`  Tax % of Gross Income: ${((annualTaxes / annualIncome) * 100).toFixed(2)}%`)
      console.log(`  Tax % of Taxable Income: ${((annualTaxes / taxableIncome) * 100).toFixed(2)}%`)
      console.log(`  Inflation Multiplier: ${Math.pow(1 + inflationRate / 100, year - 1).toFixed(5)}`)
    }

    // Calculate gap
    const gap = annualIncome - totalIndividual401k - annualTaxes - annualExpenses

    // Track investments made this year
    let investedThisYear = 0
    const investmentAllocations = {}

    if (gap > 0) {
      // Positive gap - allocate funds
      let remainingGap = gap

      // Step 1: Fill cash to target
      if (cash < targetCash) {
        const needed = targetCash - cash
        const toAdd = Math.min(needed, remainingGap)
        cash += toAdd
        remainingGap -= toAdd
      }

      // Step 2: Invest per allocation percentage
      investments.forEach((inv, index) => {
        const toInvest = remainingGap * (inv.portfolioPercent / 100)
        inv.costBasis += toInvest
        investedThisYear += toInvest
        investmentAllocations[`investment${index + 1}`] = toInvest
        remainingGap -= toInvest
      })

      // Step 3: Excess goes to cash (if allocation < 100%)
      if (remainingGap > 0) {
        cash += remainingGap
      }
    } else if (gap < 0) {
      // Negative gap - draw from cash, don't invest
      cash += gap  // gap is negative, so this reduces cash
    }

    // Apply growth to investments (at end of year)
    investments.forEach(inv => {
      inv.marketValue = inv.costBasis * Math.pow(1 + inv.growthRate / 100, year)
    })

    // Apply growth to 401k and add company contribution
    retirement401k.value = retirement401k.value * (1 + retirement401k.growthRate / 100) +
                          totalIndividual401k +
                          retirement401k.companyContribution

    // Calculate net worth
    const totalInvestmentValue = investments.reduce((sum, inv) => sum + inv.marketValue, 0)
    const totalCostBasis = investments.reduce((sum, inv) => sum + inv.costBasis, 0)
    const netWorth = cash + retirement401k.value + totalInvestmentValue

    // Calculate present values
    const yearsFromNow = year - 1
    const discountFactor = Math.pow(1 + inflationRate / 100, yearsFromNow)

    const projection = {
      year,

      // Nominal values
      annualIncome: round5(annualIncome),
      totalIndividual401k: round5(totalIndividual401k),
      annualTaxes: round5(annualTaxes),
      annualExpenses: round5(annualExpenses),
      gap: round5(gap),
      investedThisYear: round5(investedThisYear),
      cash: round5(cash),
      retirement401kValue: round5(retirement401k.value),
      totalCostBasis: round5(totalCostBasis),
      totalInvestmentValue: round5(totalInvestmentValue),
      netWorth: round5(netWorth),

      // Individual investments
      investments: investments.map(inv => ({
        costBasis: round5(inv.costBasis),
        marketValue: round5(inv.marketValue)
      })),

      // Present values
      annualIncomePV: round5(annualIncome / discountFactor),
      totalIndividual401kPV: round5(totalIndividual401k / discountFactor),
      annualTaxesPV: round5(annualTaxes / discountFactor),
      annualExpensesPV: round5(annualExpenses / discountFactor),
      gapPV: round5(gap / discountFactor),
      investedThisYearPV: round5(investedThisYear / discountFactor),
      cashPV: round5(cash / discountFactor),
      retirement401kValuePV: round5(retirement401k.value / discountFactor),
      totalCostBasisPV: round5(totalCostBasis / discountFactor),
      totalInvestmentValuePV: round5(totalInvestmentValue / discountFactor),
      netWorthPV: round5(netWorth / discountFactor)
    }

    // Add individual investment allocations
    Object.keys(investmentAllocations).forEach(key => {
      projection[key] = round5(investmentAllocations[key])
      projection[`${key}PV`] = round5(investmentAllocations[key] / discountFactor)
    })

    projections.push(projection)
  }

  // Calculate summary
  const summary = calculateSummary(projections, yearsToRetirement)

  console.log('Gap projections calculated')
  console.groupEnd()

  return {
    projections,
    summary
  }
}

/**
 * Calculate summary statistics
 */
function calculateSummary(projections, yearsToRetirement) {
  const currentYear = projections[0]
  const year10 = projections[9] || projections[projections.length - 1]
  const retirementYear = projections[yearsToRetirement - 1] || projections[projections.length - 1]

  // Lifetime totals
  const lifetimeGap = projections.reduce((sum, p) => sum + p.gap, 0)
  const lifetimeGapPV = projections.reduce((sum, p) => sum + p.gapPV, 0)
  const lifetimeInvested = projections.reduce((sum, p) => sum + p.investedThisYear, 0)
  const lifetimeInvestedPV = projections.reduce((sum, p) => sum + p.investedThisYearPV, 0)

  // Net worth growth
  const netWorthGrowth = retirementYear.netWorth - currentYear.netWorth
  const netWorthGrowthPercent = currentYear.netWorth > 0
    ? (netWorthGrowth / currentYear.netWorth * 100)
    : 0

  return {
    // Current year
    currentYearGap: currentYear.gap,
    currentYearGapPV: currentYear.gapPV,
    currentNetWorth: currentYear.netWorth,
    currentNetWorthPV: currentYear.netWorthPV,

    // Year 10
    year10Gap: year10.gap,
    year10GapPV: year10.gapPV,
    year10NetWorth: year10.netWorth,
    year10NetWorthPV: year10.netWorthPV,

    // Retirement
    retirementNetWorth: retirementYear.netWorth,
    retirementNetWorthPV: retirementYear.netWorthPV,
    retirementCash: retirementYear.cash,
    retirementCashPV: retirementYear.cashPV,

    // Lifetime
    lifetimeGap,
    lifetimeGapPV,
    lifetimeInvested,
    lifetimeInvestedPV,

    // Growth
    netWorthGrowth,
    netWorthGrowthPercent
  }
}
