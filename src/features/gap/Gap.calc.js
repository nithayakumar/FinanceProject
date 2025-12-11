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
export function calculateGapProjections(incomeData, expensesData, investmentsData, propertyData, profile) {
  // console.group('📊 Calculating Gap Projections')

  initializeTaxLadders()

  const yearsToRetirement = profile.yearsToRetirement || 30
  const inflationRate = profile.inflationRate !== undefined ? profile.inflationRate : 2.7
  const inflationRateDecimal = (Number(inflationRate) || 0) / 100
  const profileLocation = normalizeLocation(profile.location || profile.state || 'California')
  const filingStatus = profile.filingStatus || 'Single'
  const startYear = new Date().getFullYear()

  // console.log('Years to Retirement:', yearsToRetirement)
  // console.log('Inflation Rate:', inflationRate + '%')

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

  // --- Property Initialization ---
  const hasProperty = propertyData && propertyData.mode && propertyData.mode !== 'none'
  const isBuyMode = propertyData?.mode === 'buy'
  const isOwnMode = propertyData?.mode === 'own'
  const useSimplePropertyExpenses = expensesData?.simpleMode // Check if using simple expenses

  let homeValue = 0
  let mortgageBalance = 0
  let monthlyMortgagePayment = 0
  let mortgageInterestRate = 0
  let homeGrowthRate = 0
  // Buy Mode Specifics
  let purchaseYear = 0 // Relative year index (1 = Year 1)
  let homePriceAtPurchase = 0
  let downPaymentAmount = 0
  let downPaymentIsPercent = false

  if (hasProperty) {
    const details = propertyData.details || {}
    homeGrowthRate = (Number(details.growthRate) || 0) / 100

    if (isOwnMode) {
      homeValue = Number(details.homeValue) || 0
      mortgageBalance = Number(details.mortgageRemaining) || 0
      monthlyMortgagePayment = Number(details.monthlyPayment) || 0
      // Infer rate or default to 3.5%
      mortgageInterestRate = 0.035
    } else if (isBuyMode) {
      homePriceAtPurchase = Number(details.homePrice) || 0
      purchaseYear = Number(details.purchaseYear) || 1
      monthlyMortgagePayment = 0 // Will calc at purchase
      mortgageInterestRate = (Number(details.mortgageRate) || 0) / 100
      downPaymentAmount = Number(details.downPayment) || 0
      downPaymentIsPercent = details.downPaymentType === 'percent'
      // Initial state is 0, will update when year == purchaseYear
    }
  }
  // -------------------------------

  // Calculate total allocation percentage
  const totalAllocation = investments.reduce((sum, inv) => sum + inv.portfolioPercent, 0)

  // console.log('Starting Cash:', cash)
  // console.log('Base Target Cash (Year 1):', baseTargetCash)
  // console.log('Starting 401k:', retirement401k.value)
  // console.log('Total Allocation %:', totalAllocation)
  // console.log('Property Mode:', propertyData?.mode, 'Simple Expenses:', useSimplePropertyExpenses)

  // Generate yearly projections
  const projections = []

  // Pre-loop logic for Buy mode "Historical" purchase
  // If purchaseYear < 1, we need to initialize values as if purchased in past?
  // Simply: If purchaseYear <= 0, we treat it as "Already Owned" but with dynamic start values?
  // Current logic in Property.calc handles this complexity.
  // For Gap model simplicity: IF purchaseYear <= 0, we can assume "Own" mode logic effectively?
  // Or just initialize triggers in the loop relative to start.
  // We'll stick to loop Index checks.

  for (let year = 1; year <= yearsToRetirement; year++) {
    // Inflate target cash for this year
    const inflationMultiplier = Math.pow(1 + inflationRate / 100, year - 1)
    const targetCash = baseTargetCash * inflationMultiplier

    // --- Property Logic: Purchase Trigger ---
    let purchaseOccurredThisYear = false
    let downPaymentPaid = 0
    let annualAppreciation = 0
    if (isBuyMode && year === purchaseYear) {
      purchaseOccurredThisYear = true
      // Calculate Price with appreciation if purchase is in future
      const yearsComparison = Math.max(0, purchaseYear - 1)
      const purchasePrice = homePriceAtPurchase * Math.pow(1 + homeGrowthRate, yearsComparison)

      const downPayment = downPaymentIsPercent
        ? purchasePrice * (downPaymentAmount / 100)
        : downPaymentAmount

      downPaymentPaid = downPayment

      homeValue = purchasePrice
      mortgageBalance = Math.max(0, purchasePrice - downPayment)
      const term = Number(propertyData.details.term) || 30

      // Calculate monthly payment
      const r = mortgageInterestRate / 12
      const n = term * 12
      if (r === 0) monthlyMortgagePayment = mortgageBalance / n
      else monthlyMortgagePayment = mortgageBalance * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)

      // Deduct down payment from Cash !!!
      // This is a major cash flow event. Gap will reflect this massive outflow.
      // Or do we treat it as an Allocation?
      // Gap = Income - Expenses.
      // DownPayment is usually from SAVINGs (Cash).
      // So 'Gap' (Annual Savings) might be negative if we subtract it?
      // No, DownPayment is a Balance Sheet transfer (Cash -> Equity).
      // It shouldn't reduce "Gap" (Disposable Income), but it REDUCES CASH BALANCE.
      // We handle this by subtracting from 'cash' directly below.
      cash -= downPayment
    }
    // ----------------------------------------


    // Get annual income from income projections (SUM all 12 months, not January * 12)
    // This is critical for career breaks where months may have different values
    let annualIncome = 0
    let annualEquity = 0
    let annualCompany401k = 0

    // Track income by stream for detailed view
    const incomeByStream = {}
    incomeData.incomeStreams.forEach(stream => {
      incomeByStream[stream.id] = { name: stream.name, salary: 0, equity: 0, company401k: 0, total: 0 }
    })

    // --- Monthly Loop for Income & Property Amortization ---
    let annualMortgagePayment = 0 // P + I
    let annualMortgageInterest = 0
    let annualMortgagePrincipal = 0
    let annualPropertyExpenses = 0 // Tax, Maint, PMI

    let annualRentalSavings = 0

    for (let month = 0; month < 12; month++) {
      const monthIndex = (year - 1) * 12 + month
      const monthProjection = incomeData.projections[monthIndex] || {}
      annualIncome += (monthProjection.totalCompNominal || 0)
      annualEquity += (monthProjection.equityNominal || 0)
      annualCompany401k += (monthProjection.company401kNominal || 0)

      // Calculate per-stream income for this month
      incomeData.incomeStreams.forEach(stream => {
        if (year <= stream.endWorkYear && monthProjection.activeStreams?.includes(stream.id)) {
          const yearsOfGrowth = year - 1
          const growthMultiplier = Math.pow(1 + stream.growthRate / 100, yearsOfGrowth)

          // Get jump multiplier for this stream up to this year
          let jumpMultiplier = 1.0
          if (stream.jumps && stream.jumps.length > 0) {
            stream.jumps
              .filter(j => j.year && j.jumpPercent && j.year <= year)
              .forEach(j => { jumpMultiplier *= (1 + j.jumpPercent / 100) })
          }

          // Check career break reduction for this month
          let careerBreakMultiplier = 1.0
          if (stream.careerBreaks && stream.careerBreaks.length > 0) {
            stream.careerBreaks.forEach(breakItem => {
              const breakStartMonthIndex = (breakItem.startYear - 1) * 12
              const breakEndMonthIndex = breakStartMonthIndex + breakItem.durationMonths - 1
              if (monthIndex >= breakStartMonthIndex && monthIndex <= breakEndMonthIndex) {
                careerBreakMultiplier = Math.min(careerBreakMultiplier, 1 - (breakItem.reductionPercent || 0) / 100)
              }
            })
          }

          const monthSalary = (stream.annualIncome / 12) * growthMultiplier * jumpMultiplier * careerBreakMultiplier
          const monthEquity = (stream.equity / 12) * growthMultiplier * jumpMultiplier * careerBreakMultiplier
          const month401k = (stream.company401k / 12) * growthMultiplier * jumpMultiplier * careerBreakMultiplier

          incomeByStream[stream.id].salary += monthSalary
          incomeByStream[stream.id].equity += monthEquity
          incomeByStream[stream.id].company401k += month401k
          incomeByStream[stream.id].total += monthSalary + monthEquity + month401k
        }
      })

      // --- Property Amortization (Monthly) ---
      if (homeValue > 0) { // If owned
        // Appreciation (Simple annual compounding applied monthly? No, usually annual update is cleaner for growth)
        // Let's apply growth at END of year for value.

        // Amortization
        if (mortgageBalance > 0) {
          const monthlyRate = mortgageInterestRate / 12
          const interest = mortgageBalance * monthlyRate
          // Payment is fixed. Principal = Payment - Interest
          // If payment < interest (neg amort), principal is negative?
          const principal = Math.min(Math.max(0, monthlyMortgagePayment - interest), mortgageBalance)

          mortgageBalance -= principal
          annualMortgageInterest += interest
          annualMortgagePrincipal += principal
          annualMortgagePayment += monthlyMortgagePayment
        }

        // --- Simple Property Expenses (Tax, Maint, PMI) ---
        if (useSimplePropertyExpenses) {
          const details = propertyData.details
          // Calculate Cost basis for expenses.
          // Fees usually % of VALUE or % of Loan.
          // Simplified:
          // Ownership Costs (Tax/Maint) -> % of Value OR Fixed $.
          // Ownership Costs (Tax/Maint) -> % of Value OR Fixed $.
          // User Requirement: "Home Ownership Costs" only displayed/used for BUY mode.
          // Owners assumed to have this in base expenses.
          let ownershipCost = 0
          if (isBuyMode) {
            if (details.ownershipExpenseType === 'percent') {
              const annualCost = homeValue * (Number(details.ownershipExpenseAmount || 0) / 100)
              ownershipCost = annualCost / 12
            } else {
              // Fixed amount, inflate?
              const baseAmount = Number(details.ownershipExpenseAmount || 0)
              // Should inflate expenses? Usually yes.
              const inflatedAmount = baseAmount * inflationMultiplier
              ownershipCost = inflatedAmount / 12
            }
          }

          // Mortgage Fees (PMI) -> Usually fixed $ or % of LOAN.
          // User input "Mortgage Related Fees".
          // If mortgage is paid off, should this stop? usually yes for PMI, no for HOA.
          // Let's assume it's PMI/HOA connected to mortgage existence?
          // "Mortgage Related Fees" usually implies PMI or servicing fees.
          // Should stop if balance is 0.
          let mortgageFees = 0
          if (mortgageBalance > 0) {
            if (details.pmiType === 'percent') {
              // % of Loan? or % of Value? Usually % of Loan Amount.
              const annualFee = mortgageBalance * (Number(details.pmiAmount || 0) / 100)
              mortgageFees = annualFee / 12
            } else {
              const baseFee = Number(details.pmiAmount || 0)
              // Fixed fees often don't inflate as much, but let's inflate to be safe
              mortgageFees = (baseFee * inflationMultiplier) / 12
            }
          }

          // Rental Fees Avoided (Offset of expenses)
          // Since the user's base 'Annual Expenses' likely includes rent, we need to subtract the rent they NO LONGER pay
          let rentalOffset = 0
          if (isBuyMode) {
            if (details.rentalIncomeOffsetType === 'percent') {
              // % of Home Value (Yield equivalent)
              const annualOffset = homeValue * (Number(details.rentalIncomeOffsetAmount || 0) / 100)
              rentalOffset = annualOffset / 12
            } else {
              // Fixed $ amount - User Input is MONTHLY now per request
              const monthlyOffset = Number(details.rentalIncomeOffsetAmount || 0)
              // Inflate it (per user request to ensure it grows with inflation)
              const inflatedMonthlyOffset = monthlyOffset * inflationMultiplier
              rentalOffset = inflatedMonthlyOffset
            }
          }

          // Updated Logic: Keep Annual Property Expenses pure (Costs ONLY)
          // Accumulate Rental Savings to subtract from General Living Expenses later
          annualPropertyExpenses += (ownershipCost + mortgageFees)
          annualRentalSavings += rentalOffset
        }
      }
      // ---------------------------------------
    } // End Monthly Loop

    // Update Home Value (Annual Appreciation)
    if (homeValue > 0) {
      annualAppreciation = homeValue * homeGrowthRate
      homeValue = homeValue + annualAppreciation
    }

    // Debug logging for first 5 years
    if (year <= 5) {
      /* console.log(`Year ${year} annual values (summed from 12 months):`, {
        annualIncome,
        annualEquity,
        annualCompany401k,
        annualMortgagePayment,
        annualPropertyExpenses
      }) */
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
    let annualExpensesPV = 0
    const expensesByCategory = {}
    const expensesByCategoryPV = {}

    for (let month = 0; month < 12; month++) {
      const monthIndex = (year - 1) * 12 + month
      const expenseProjection = expensesData.projections[monthIndex] || {}
      annualExpenses += (expenseProjection.totalExpensesNominal || 0)
      annualExpensesPV += (expenseProjection.totalExpensesPV || 0)

      // Track expenses by category for detailed view
      if (expenseProjection.categoryBreakdownNominal) {
        Object.keys(expenseProjection.categoryBreakdownNominal).forEach(category => {
          expensesByCategory[category] = (expensesByCategory[category] || 0) +
            (expenseProjection.categoryBreakdownNominal[category] || 0)
        })
      }
      if (expenseProjection.categoryBreakdownPV) {
        Object.keys(expenseProjection.categoryBreakdownPV).forEach(category => {
          expensesByCategoryPV[category] = (expensesByCategoryPV[category] || 0) +
            (expenseProjection.categoryBreakdownPV[category] || 0)
        })
      }
    }

    // Apply Rental Savings to General Living Expenses
    if (annualRentalSavings > 0) {
      annualExpenses -= annualRentalSavings
      // Add a category entry for the savings (negative expense) - affecting Nominal Only?
      // Should affect PV too.
      const rentalSavingsPV = annualRentalSavings / Math.pow(1 + inflationRate / 100, year - 1)
      annualExpensesPV -= rentalSavingsPV

      expensesByCategory['Rental Savings (Avoided Cost)'] = -annualRentalSavings
      expensesByCategoryPV['Rental Savings (Avoided Cost)'] = -rentalSavingsPV
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
      /* console.log(`\n📊 Year ${year} Tax Breakdown:`)
      // console.log(`  Annual Income: $${annualIncome.toLocaleString()}`)
      // console.log(`  401(k) Contributions: $${totalIndividual401k.toLocaleString()}`)
      // console.log(`  Taxable Income: $${taxableIncome.toLocaleString()}`)
      // console.log(`  Annual Taxes: $${annualTaxes.toLocaleString()}`)
      // console.log(`  Tax % of Gross Income: ${((annualTaxes / annualIncome) * 100).toFixed(2)}%`)
      // console.log(`  Tax % of Taxable Income: ${((annualTaxes / taxableIncome) * 100).toFixed(2)}%`)
      // console.log(`  Inflation Multiplier: ${Math.pow(1 + inflationRate / 100, year - 1).toFixed(5)}`) */
    }

    // Calculate gap = disposable income after all deductions (available for cash/investments)
    // Gap includes all income sources (salary + equity + company 401k) minus deductions
    // Equity compensation is TAXED as ordinary income, then flows through gap allocation

    // --- GAP UPDATE for Property ---
    // If simple expenses: Deduct Mortgage Payment + Property Expenses
    // If detailed: Assume annualExpenses includes Housing.

    let totalOutflows = annualTaxes + annualExpenses

    if (useSimplePropertyExpenses) {
      totalOutflows += (annualMortgagePayment + annualPropertyExpenses)

      // Add to detailed breakdown for viewing
      // Just merge into a virtual 'Housing' category for display if missing?
      expensesByCategory['Housing (Mortgage + Expenses)'] = (expensesByCategory['Housing'] || 0) + annualMortgagePayment + annualPropertyExpenses

      const mortPV = annualMortgagePayment / Math.pow(1 + inflationRate / 100, year - 1) // Approx
      const propPV = annualPropertyExpenses / Math.pow(1 + inflationRate / 100, year - 1) // Approx
      expensesByCategoryPV['Housing (Mortgage + Expenses)'] = (expensesByCategoryPV['Housing'] || 0) + mortPV + propPV
    }

    // Explicitly add Interest and Property Expenses to total expenses for pure Expense tracking metric
    // But for Gap Calc, we used totalOutflows.

    const gap = annualIncome - totalIndividual401k - totalOutflows

    // Track investments and cash changes this year
    let investedThisYear = 0
    let cashContribution = 0
    const investmentAllocations = {}

    // Capture previous market values BEFORE allocations (for accurate growth calculation)
    const previousMarketValues = investments.map(inv => inv.marketValue)

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
            remainingGap -= additionalInvest
          })
        }

        // Final fallback: Cash overflow
        if (remainingGap > 0) {
          cash += remainingGap
          cashContribution += remainingGap
        }
      }

    } else {
      // Negative gap - withdraw funds
      // Priority: 1. Cash, 2. Debt (Negative Cash)
      // We do NOT liquidate investments automatically.
      let deficit = -gap

      // 1. Withdraw from Cash (even if it goes negative)
      cash -= deficit
      cashContribution -= deficit
    }

    // Apply growth to investments (at end of year)
    // Existing balance gets full year growth, new allocation gets half year growth (mid-year assumption)
    investments.forEach((inv, index) => {
      const growthRate = inv.growthRate / 100
      const fullYearMultiplier = 1 + growthRate
      const halfYearMultiplier = Math.pow(1 + growthRate, 0.5) // ~6 months growth for new contributions

      const previousValue = previousMarketValues[index]
      const allocation = investmentAllocations[`investment${index + 1}`] || 0

      // Previous balance grows full year, new allocation grows half year
      inv.marketValue = (previousValue * fullYearMultiplier) + (allocation * halfYearMultiplier)
    })

    // Apply growth to 401k and add contributions
    // Company contribution now comes from income projections (grows with income)
    retirement401k.value = retirement401k.value * (1 + retirement401k.growthRate / 100) +
      totalIndividual401k +
      annualCompany401k

    // Calculate net worth
    const totalInvestmentValue = investments.reduce((sum, inv) => sum + inv.marketValue, 0)
    const totalCostBasis = investments.reduce((sum, inv) => sum + inv.costBasis, 0)

    // Net Worth = Cash + 401k + Investments + (Home Value - Mortgage Debt)
    // Net Worth = Cash + 401k + Investments + (Home Value - Mortgage Debt)
    const homeEquity = Math.max(0, homeValue - mortgageBalance)
    const investableAssets = cash + retirement401k.value + totalInvestmentValue
    const netWorth = investableAssets + homeEquity

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
        socialSecurity: socialSecurityTax,
        medicare: medicareTax
      },
      afterTaxIncome,
      useSimplePropertyExpenses,
      mortgagePrincipal: annualMortgagePrincipal,
      mortgageInterest: annualMortgageInterest,
      propertyExpenses: annualPropertyExpenses,

      // Nominal values - Expenses and Disposable Income (full precision)
      // FIX: Do NOT add property expenses here if they are displayed separately downstream
      // If Simple Table needs Total Expenses, it should sum them there.
      // But for consistency with "Operating Expenses", let's keep it pure base expenses here.
      // Wait, 'annualExpenses' in the loop already sums up the BASE expenses.
      // If we remove the addition, 'netWorthTab' (which adds them again) will be correct.
      annualExpenses: annualExpenses,
      expensesByCategory,
      expensesByCategoryPV, // Added detailed PV breakdown
      disposableIncome,
      gap,  // Same as disposableIncome

      // Nominal values - Allocations (full precision)
      investedThisYear,

      // Nominal values - Balances (full precision)
      cash,
      targetCash,  // Inflation-adjusted target for this year
      retirement401kValue: retirement401k.value,
      totalCostBasis,
      totalInvestmentValue,
      homeValue,
      mortgageBalance,
      homeEquity,
      netWorth,

      // Individual investments (full precision)
      investments: investments.map((inv, index) => ({
        id: inv.id,
        costBasis: inv.costBasis,
        marketValue: inv.marketValue,
        marketValuePV: inv.marketValue / discountFactor,
        allocation: investmentAllocations[`investment${index + 1}`] || 0,
        allocationPV: (investmentAllocations[`investment${index + 1}`] || 0) / discountFactor,
        growth: inv.marketValue - inv.costBasis,
        growthPV: (inv.marketValue - inv.costBasis) / discountFactor
      })),

      // Income by stream (for detailed view)
      incomeByStream: Object.values(incomeByStream).map(stream => ({
        name: stream.name,
        salary: stream.salary,
        equity: stream.equity,
        company401k: stream.company401k,
        total: stream.total,
        salaryPV: stream.salary / discountFactor,
        equityPV: stream.equity / discountFactor,
        company401kPV: stream.company401k / discountFactor,
        totalPV: stream.total / discountFactor
      })),

      // Expenses by category (for detailed view)
      expensesByCategory: Object.entries(expensesByCategory).map(([category, amount]) => ({
        name: category,
        category,
        total: amount,
        totalPV: amount / discountFactor
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
      // FIX: Same here, remove the property expenses addition
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
      homeValuePV: homeValue / discountFactor,
      mortgageBalancePV: mortgageBalance / discountFactor,
      homeEquityPV: homeEquity / discountFactor,
      investableAssets,
      investableAssetsPV: investableAssets / discountFactor,
      netWorthPV: netWorth / discountFactor,

      // Property Details (Nominal)
      downPaymentPaid,
      annualAppreciation,
      annualMortgagePrincipal,
      annualMortgageInterest,
      annualPropertyCosts: annualPropertyExpenses, // Renamed for clarity

      // Property Details (PV)
      downPaymentPaidPV: downPaymentPaid / discountFactor,
      annualAppreciationPV: annualAppreciation / discountFactor,
      annualMortgagePrincipalPV: annualMortgagePrincipal / discountFactor,
      annualMortgageInterestPV: annualMortgageInterest / discountFactor,
      annualPropertyCostsPV: annualPropertyExpenses / discountFactor
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

  // console.log('Gap projections calculated')
  // console.groupEnd()

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
