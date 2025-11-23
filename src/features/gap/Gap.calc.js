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

import { calculateTaxesCSV } from '../taxes/csvTaxCalculator'
import { initializeTaxLadders } from '../taxes/csvTaxLadders'

const STATE_ABBREVIATIONS = {
  CA: 'California',
  TX: 'Texas',
  NY: 'New York',
  FL: 'Florida',
  WA: 'Washington'
}

const normalizeLocation = (value) => {
  if (!value) return ''
  const trimmed = String(value).trim()
  const upper = trimmed.toUpperCase()
  return STATE_ABBREVIATIONS[upper] || trimmed
}

/**
 * Calculate gap projections and net worth over time
 *
 * Note: All calculations preserve full precision. Rounding only occurs at display time.
 */
export function calculateGapProjections(incomeData, expensesData, investmentsData, profile) {
  console.group('📊 Calculating Gap Projections')

  initializeTaxLadders()

  const yearsToRetirement = profile.yearsToRetirement || 30
  const inflationRate = profile.inflationRate !== undefined ? profile.inflationRate : 2.7
  const inflationRateDecimal = (Number(inflationRate) || 0) / 100
  const profileLocation = normalizeLocation(profile.location || profile.state || 'California')
  const filingStatus = profile.filingStatus || 'Single'
  const startYear = new Date().getFullYear()

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

    // Get annual income from income projections (SUM all 12 months, not January * 12)
    // This is critical for career breaks where months may have different values
    let annualIncome = 0
    let annualEquity = 0
    let annualCompany401k = 0

    for (let month = 0; month < 12; month++) {
      const monthIndex = (year - 1) * 12 + month
      const monthProjection = incomeData.projections[monthIndex] || {}
      annualIncome += (monthProjection.totalCompNominal || 0)
      annualEquity += (monthProjection.equityNominal || 0)
      annualCompany401k += (monthProjection.company401kNominal || 0)
    }

    // Debug logging for first 5 years
    if (year <= 5) {
      console.log(`Year ${year} annual values (summed from 12 months):`, {
        annualIncome,
        annualEquity,
        annualCompany401k
      })
    }

    // Calculate total individual 401k contribution across all streams
    // Note: 401k contributions can be made during career breaks using savings/debt
    // The contribution grows with the 401k limit growth rate (not the income growth rate)
    const limitGrowthRate = Number(investmentsData.retirement401k?.limitGrowth) || 0

    const totalIndividual401k = incomeData.incomeStreams.reduce((sum, stream) => {
      if (year <= stream.endWorkYear) {
        // Apply 401k limit growth to the contribution (not income growth)
        const yearsOfGrowth = year - 1
        const growthMultiplier = Math.pow(1 + limitGrowthRate / 100, yearsOfGrowth)
        return sum + ((Number(stream.individual401k) || 0) * growthMultiplier)
      }
      return sum
    }, 0)

    // Get annual expenses from expenses projections (SUM all 12 months, not January * 12)
    // This is critical for expense patterns that vary by month
    let annualExpenses = 0
    for (let month = 0; month < 12; month++) {
      const monthIndex = (year - 1) * 12 + month
      const expenseProjection = expensesData.projections[monthIndex] || {}
      annualExpenses += (expenseProjection.totalExpensesNominal || 0)
    }

    // Calculate taxes on income after 401k deduction
    // Tax brackets are now automatically inflated within calculateTaxes
    const taxableIncome = annualIncome - totalIndividual401k

    const taxYear = startYear + (year - 1)
    const taxCalc = calculateTaxesCSV(
      taxableIncome,
      'salary',
      filingStatus,
      profileLocation,
      taxYear,
      inflationRateDecimal
    )
    const annualTaxes = taxCalc.totalTax

    // Store tax breakdown for export
    const payroll = taxCalc.payrollTaxes || {}
    const socialSecurityTax = payroll.socialSecurity || payroll.cpp || 0
    const medicareTax = (payroll.medicare || 0) + (payroll.additionalMedicare || 0) + (payroll.ei || 0)
    const taxBreakdown = {
      federal: taxCalc.federalTax?.amount || 0,
      state: taxCalc.stateTax?.amount || 0,
      socialSecurity: socialSecurityTax,
      medicare: medicareTax
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
    // Gap includes all income sources (salary + equity + company 401k) minus deductions
    // Equity compensation is TAXED as ordinary income, then flows through gap allocation
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
          // No investments defined OR no allocation % defined - excess goes to cash (even if above target)
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

      // Nominal values - Income Components (full precision)
      annualSalary,
      annualEquity,
      annualCompany401k,
      grossIncome,

      // Nominal values - Deductions and Taxes (full precision)
      totalIndividual401k,
      taxableIncome,
      annualTaxes,
      taxBreakdown: {
        federal: taxBreakdown.federal,
        state: taxBreakdown.state,
        socialSecurity: taxBreakdown.socialSecurity,
        medicare: taxBreakdown.medicare
      },
      afterTaxIncome,

      // Nominal values - Expenses and Disposable Income (full precision)
      annualExpenses,
      disposableIncome,
      gap,  // Same as disposableIncome

      // Nominal values - Allocations (full precision)
      investedThisYear,
      cashContribution,

      // Nominal values - Balances (full precision)
      cash,
      targetCash,  // Inflation-adjusted target for this year
      retirement401kValue: retirement401k.value,
      totalCostBasis,
      totalInvestmentValue,
      netWorth,

      // Individual investments (full precision)
      investments: investments.map(inv => ({
        costBasis: inv.costBasis,
        marketValue: inv.marketValue,
        marketValuePV: inv.marketValue / discountFactor
      })),

      // Present values - Income Components (full precision)
      annualSalaryPV: annualSalary / discountFactor,
      annualEquityPV: annualEquity / discountFactor,
      annualCompany401kPV: annualCompany401k / discountFactor,
      grossIncomePV: grossIncome / discountFactor,

      // Present values - Deductions and Taxes (full precision)
      totalIndividual401kPV: totalIndividual401k / discountFactor,
      taxableIncomePV: taxableIncome / discountFactor,
      annualTaxesPV: annualTaxes / discountFactor,
      taxBreakdownPV: {
        federal: taxBreakdown.federal / discountFactor,
        state: taxBreakdown.state / discountFactor,
        socialSecurity: taxBreakdown.socialSecurity / discountFactor,
        medicare: taxBreakdown.medicare / discountFactor
      },
      afterTaxIncomePV: afterTaxIncome / discountFactor,

      // Present values - Expenses and Disposable Income (full precision)
      annualExpensesPV: annualExpenses / discountFactor,
      disposableIncomePV: disposableIncome / discountFactor,
      gapPV: gap / discountFactor,

      // Present values - Allocations (full precision)
      investedThisYearPV: investedThisYear / discountFactor,
      cashContributionPV: cashContribution / discountFactor,

      // Present values - Balances (full precision)
      cashPV: cash / discountFactor,
      targetCashPV: targetCash / discountFactor,  // PV of inflation-adjusted target
      retirement401kValuePV: retirement401k.value / discountFactor,
      totalCostBasisPV: totalCostBasis / discountFactor,
      totalInvestmentValuePV: totalInvestmentValue / discountFactor,
      netWorthPV: netWorth / discountFactor
    }

    // Add individual investment allocations (full precision)
    Object.keys(investmentAllocations).forEach(key => {
      projection[key] = investmentAllocations[key]
      projection[`${key}PV`] = investmentAllocations[key] / discountFactor
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

  // Lifetime 401k contributions
  // Note: Equity is now included in gap (taxed as ordinary income), not tracked separately
  const lifetimeIndividual401k = projections.reduce((sum, p) => sum + p.totalIndividual401k, 0)
  const lifetimeIndividual401kPV = projections.reduce((sum, p) => sum + p.totalIndividual401kPV, 0)
  const lifetimeCompany401k = projections.reduce((sum, p) => sum + p.annualCompany401k, 0)
  const lifetimeCompany401kPV = projections.reduce((sum, p) => sum + p.annualCompany401kPV, 0)

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
    retirement401k: retirementYear.retirement401kValue,
    retirement401kPV: retirementYear.retirement401kValuePV,

    // Lifetime
    lifetimeGap,
    lifetimeGapPV,
    lifetimeInvested,
    lifetimeInvestedPV,
    lifetimeIndividual401k,
    lifetimeIndividual401kPV,
    lifetimeCompany401k,
    lifetimeCompany401kPV,

    // Growth
    netWorthGrowth,
    netWorthGrowthPercent
  }
}
