/**
 * Gap Calculation Logic
 *
 * Formula: Gap = Income - Pretax 401k - Taxes - Expenses
 *
 * Cash Target: Inflates at inflation rate each year (maintains purchasing power)
 *
 * Allocation (when Gap > 0):
 * 1. Fill cash to inflation-adjusted target
 * 2. Invest per allocation % (e.g., 70% stocks, 30% bonds)
 * 3. Handle excess:
 *    - First: Try to add to cash (up to inflated target)
 *    - Then: Invest proportionally across investments
 *    - Prevents cash from exceeding inflated target
 *
 * Allocation (when Gap < 0):
 * - Draw from cash (no new investments)
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
  const baseTargetCash = Number(investmentsData.targetCash) || 0  // Base target (Year 1 dollars)

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
  console.log('Base Target Cash (Year 1):', baseTargetCash)
  console.log('Starting 401k:', retirement401k.value)
  console.log('Total Allocation %:', totalAllocation)

  // Generate yearly projections
  const projections = []

  for (let year = 1; year <= yearsToRetirement; year++) {
    // Inflate target cash for this year
    const inflationMultiplier = Math.pow(1 + inflationRate / 100, year - 1)
    const targetCash = baseTargetCash * inflationMultiplier

    // Get annual income from income projections (January of this year, monthly * 12)
    const janIndex = (year - 1) * 12  // Month index for January of this year
    const incomeProjection = incomeData.projections[janIndex] || {}
    const annualIncome = (incomeProjection.totalCompNominal || 0) * 12

    // Extract equity and company 401k for tracking (but include in gap calculation)
    const annualEquity = (incomeProjection.equityNominal || 0) * 12
    const annualCompany401k = (incomeProjection.company401kNominal || 0) * 12

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

    // Store tax breakdown for export
    const taxBreakdown = {
      federal: taxCalc.federalTax,
      state: taxCalc.stateTax,
      socialSecurity: taxCalc.fica.socialSecurity,
      medicare: taxCalc.fica.medicare + taxCalc.fica.additionalMedicare
    }

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

    // Calculate gap = disposable income after all deductions (available for cash/investments)
    // Gap includes all income sources and flows through allocation logic
    const gap = annualIncome - totalIndividual401k - annualTaxes - annualExpenses

    // Track investments and cash changes this year
    let investedThisYear = 0
    let cashContribution = 0
    const investmentAllocations = {}

    if (gap > 0) {
      // Positive gap - allocate funds
      let remainingGap = gap

      // Step 1: Fill cash to target
      if (cash < targetCash) {
        const needed = targetCash - cash
        const toAdd = Math.min(needed, remainingGap)
        cash += toAdd
        cashContribution += toAdd  // Track what we added to cash
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

      // Step 3: Handle excess (if allocation < 100%)
      if (remainingGap > 0) {
        // Check if adding to cash would exceed inflated target
        const cashHeadroom = Math.max(0, targetCash - cash)

        if (cashHeadroom > 0) {
          // Can add some to cash without exceeding target
          const toCashFromExcess = Math.min(remainingGap, cashHeadroom)
          cash += toCashFromExcess
          cashContribution += toCashFromExcess
          remainingGap -= toCashFromExcess
        }

        // If still have excess and have investments, distribute proportionally
        if (remainingGap > 0 && investments.length > 0 && totalAllocation > 0) {
          investments.forEach((inv, index) => {
            const additionalInvest = remainingGap * (inv.portfolioPercent / totalAllocation)
            inv.costBasis += additionalInvest
            investedThisYear += additionalInvest
            investmentAllocations[`investment${index + 1}`] = (investmentAllocations[`investment${index + 1}`] || 0) + additionalInvest
          })
          remainingGap = 0  // All allocated
        } else if (remainingGap > 0) {
          // No investments defined - excess goes to cash (even if above target)
          cash += remainingGap
          cashContribution += remainingGap
          remainingGap = 0
        }
      }
    } else if (gap < 0) {
      // Negative gap - draw from cash, don't invest
      cash += gap  // gap is negative, so this reduces cash
      cashContribution = gap  // Track the withdrawal (negative value)
    }

    // Apply growth to investments (at end of year)
    investments.forEach(inv => {
      inv.marketValue = inv.costBasis * Math.pow(1 + inv.growthRate / 100, year)
    })

    // Apply growth to 401k and add contributions
    // Company contribution now comes from income projections (grows with income)
    retirement401k.value = retirement401k.value * (1 + retirement401k.growthRate / 100) +
                          totalIndividual401k +
                          annualCompany401k

    // Calculate net worth
    const totalInvestmentValue = investments.reduce((sum, inv) => sum + inv.marketValue, 0)
    const totalCostBasis = investments.reduce((sum, inv) => sum + inv.costBasis, 0)
    const netWorth = cash + retirement401k.value + totalInvestmentValue

    // Calculate present values
    const yearsFromNow = year - 1
    const discountFactor = Math.pow(1 + inflationRate / 100, yearsFromNow)

    // Calculate income breakdown for cash flow display
    const annualSalary = annualIncome - annualEquity - annualCompany401k
    const grossIncome = annualIncome
    const afterTaxIncome = taxableIncome - annualTaxes
    const disposableIncome = gap  // afterTaxIncome - annualExpenses

    const projection = {
      year,

      // Nominal values - Income Components
      annualSalary: round5(annualSalary),
      annualEquity: round5(annualEquity),
      annualCompany401k: round5(annualCompany401k),
      grossIncome: round5(grossIncome),

      // Nominal values - Deductions and Taxes
      totalIndividual401k: round5(totalIndividual401k),
      taxableIncome: round5(taxableIncome),
      annualTaxes: round5(annualTaxes),
      taxBreakdown: {
        federal: round5(taxBreakdown.federal),
        state: round5(taxBreakdown.state),
        socialSecurity: round5(taxBreakdown.socialSecurity),
        medicare: round5(taxBreakdown.medicare)
      },
      afterTaxIncome: round5(afterTaxIncome),

      // Nominal values - Expenses and Disposable Income
      annualExpenses: round5(annualExpenses),
      disposableIncome: round5(disposableIncome),
      gap: round5(gap),  // Same as disposableIncome

      // Nominal values - Allocations
      investedThisYear: round5(investedThisYear),
      cashContribution: round5(cashContribution),

      // Nominal values - Balances
      cash: round5(cash),
      targetCash: round5(targetCash),  // Inflation-adjusted target for this year
      retirement401kValue: round5(retirement401k.value),
      totalCostBasis: round5(totalCostBasis),
      totalInvestmentValue: round5(totalInvestmentValue),
      netWorth: round5(netWorth),

      // Individual investments
      investments: investments.map(inv => ({
        costBasis: round5(inv.costBasis),
        marketValue: round5(inv.marketValue)
      })),

      // Present values - Income Components
      annualSalaryPV: round5(annualSalary / discountFactor),
      annualEquityPV: round5(annualEquity / discountFactor),
      annualCompany401kPV: round5(annualCompany401k / discountFactor),
      grossIncomePV: round5(grossIncome / discountFactor),

      // Present values - Deductions and Taxes
      totalIndividual401kPV: round5(totalIndividual401k / discountFactor),
      taxableIncomePV: round5(taxableIncome / discountFactor),
      annualTaxesPV: round5(annualTaxes / discountFactor),
      taxBreakdownPV: {
        federal: round5(taxBreakdown.federal / discountFactor),
        state: round5(taxBreakdown.state / discountFactor),
        socialSecurity: round5(taxBreakdown.socialSecurity / discountFactor),
        medicare: round5(taxBreakdown.medicare / discountFactor)
      },
      afterTaxIncomePV: round5(afterTaxIncome / discountFactor),

      // Present values - Expenses and Disposable Income
      annualExpensesPV: round5(annualExpenses / discountFactor),
      disposableIncomePV: round5(disposableIncome / discountFactor),
      gapPV: round5(gap / discountFactor),

      // Present values - Allocations
      investedThisYearPV: round5(investedThisYear / discountFactor),
      cashContributionPV: round5(cashContribution / discountFactor),

      // Present values - Balances
      cashPV: round5(cash / discountFactor),
      targetCashPV: round5(targetCash / discountFactor),  // PV of inflation-adjusted target
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
