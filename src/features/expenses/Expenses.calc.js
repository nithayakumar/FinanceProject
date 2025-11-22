/**
 * Expense Validation and Projection Calculations
 *
 * Note: All calculations preserve full precision. Rounding only occurs at display time.
 */

/**
 * Validate expense input data
 */
export function validateExpenses(data, yearsToRetirement) {
  console.group('✅ Validating Expenses')
  console.log('Input:', data)

  const errors = {}

  // Validate each expense category
  data.expenseCategories.forEach((category) => {
    const amountType = category.amountType || 'dollar'

    // Annual Amount
    if (amountType === 'dollar') {
      if (category.annualAmount < 0) {
        errors[`${category.id}-annualAmount`] = 'Annual amount must be a positive number or 0'
      }
    } else if (category.percentOfIncome < 0) {
      errors[`${category.id}-percentOfIncome`] = 'Percent of income must be 0 or greater'
    }

    // Growth Rate
    if (amountType === 'dollar') {
      if (category.growthRate !== '' && category.growthRate < 0) {
        errors[`${category.id}-growthRate`] = 'Growth rate must be a positive number'
      } else if (category.growthRate !== '' && category.growthRate > 50) {
        errors[`${category.id}-growthRate`] = 'Growth rate seems unrealistic (> 50%)'
      }
    }

    // Validate jumps for this category
    if (category.jumps && category.jumps.length > 0) {
      category.jumps.forEach((jump) => {
        if (jump.year && jump.year > yearsToRetirement) {
          errors[`${category.id}-jump-${jump.id}-year`] = `Jump year cannot exceed retirement year (${yearsToRetirement})`
        }
        // Validate changeValue exists
        if (jump.changeValue === '' || jump.changeValue === undefined) {
          errors[`${category.id}-jump-${jump.id}-changeValue`] = 'Change value is required'
        }
      })
    }
  })

  // Validate one-time expenses
  data.oneTimeExpenses.forEach((expense) => {
    if (expense.amount === '' || expense.amount < 0) {
      errors[`${expense.id}-amount`] = 'Amount must be a positive number'
    }

    if (expense.year === '' || expense.year <= 0) {
      errors[`${expense.id}-year`] = 'Year must be greater than 0'
    } else if (expense.year > yearsToRetirement) {
      errors[`${expense.id}-year`] = `Year cannot exceed retirement year (${yearsToRetirement})`
    }
  })

  console.log('Errors found:', Object.keys(errors).length)
  if (Object.keys(errors).length > 0) {
    console.log('Validation errors:', errors)
  }
  console.groupEnd()

  return errors
}

/**
 * Calculate comprehensive expense projections for 100 years (1,200 months)
 * Returns one unified table with nominal and present value columns
 * @param {Object} incomeProjectionData Optional income projection results to support % of income expenses
 */
export function calculateExpenseProjections(data, profile, incomeProjectionData) {
  console.log('🔴 EXPENSE CALC STARTING')
  console.group('📊 Calculating Expense Projections')

  const inflationRate = profile.inflationRate !== undefined ? profile.inflationRate : 2.7
  const yearsToRetirement = profile.retirementAge && profile.age
    ? profile.retirementAge - profile.age
    : 30
  const currentYear = new Date().getFullYear()
  const incomeProjections = incomeProjectionData?.projections || incomeProjectionData || null

  console.log('Inflation Rate:', inflationRate + '%')
  console.log('Years to Retirement:', yearsToRetirement)
  console.log('🔴 Income projections provided:', incomeProjections ? `Yes (${incomeProjections.length} months)` : 'NO - THIS IS THE PROBLEM')
  console.log('🔴 One-time expenses:', data.oneTimeExpenses)

  // Log percent of income categories
  const percentCategories = data.expenseCategories.filter(c => c.amountType === 'percentOfIncome')
  console.log('🔴 Percent categories found:', percentCategories.length)
  if (percentCategories.length > 0) {
    console.log('Percent of income categories:', percentCategories.map(c => `${c.category}: ${c.percentOfIncome}%`))
  }

  // Generate monthly projections (1,200 months = 100 years)
  const projections = []

  // Track cumulative changes for each category (multipliers for %, additions/overrides for $)
  const categoryMultipliers = {}
  const categoryDollarAdditions = {}
  const categoryDollarJumpYears = {}  // Track when dollar jumps were applied for growth calculation
  const categoryPercentOverrides = {}
  const categoryAmountOverrides = {}
  data.expenseCategories.forEach(category => {
    categoryMultipliers[category.id] = 1.0
    categoryDollarAdditions[category.id] = 0
    categoryDollarJumpYears[category.id] = []  // Array of {year, basePVAmount, growthRate}
    categoryPercentOverrides[category.id] = null
    categoryAmountOverrides[category.id] = null
  })

  // Generate 1,200 monthly rows
  for (let monthIndex = 0; monthIndex < 1200; monthIndex++) {
    const year = Math.floor(monthIndex / 12) + 1
    const month = (monthIndex % 12) + 1
    const absoluteYear = currentYear + year - 1

    // Check if any categories have changes this year (apply in January)
    if (month === 1) {
      data.expenseCategories.forEach(category => {
        if (category.jumps && category.jumps.length > 0) {
          const changeThisYear = category.jumps.find(j => Number(j.year) === year)
          // Check for both new 'value' and legacy 'changeValue'
          const val = changeThisYear?.value !== undefined ? changeThisYear.value : changeThisYear?.changeValue

          if (changeThisYear && val !== undefined && val !== '') {
            const delta = Number(val) || 0
            const yearsFromStart = year - 1
            const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsFromStart)

            // Check for both new 'type' and legacy 'changeType'
            // Map legacy types to new types if needed, or just handle them
            let type = changeThisYear.type || changeThisYear.changeType || 'change_percent'

            // Map legacy 'dollar' to 'change_amount' if needed, though we can just check for both
            if (type === 'dollar') type = 'change_amount'
            if (type === 'percentOfIncome') type = 'set_percent_income'
            if (type === 'setAmountPV') type = 'set_amount'

            if (type === 'change_amount') {
              // Dollar-based change: track jump for growth calculation
              // The dollar amount entered is in today's dollars and should grow from this year forward
              const growthRate = category.growthRate !== '' && category.growthRate !== undefined
                ? category.growthRate
                : inflationRate
              categoryDollarJumpYears[category.id].push({
                jumpYear: year,
                basePVAmount: delta,  // In today's dollars
                growthRate: growthRate
              })
            } else if (type === 'set_percent_income') {
              // Override percent of income for this category from this year onward
              categoryPercentOverrides[category.id] = delta
            } else if (type === 'set_amount') {
              // Override base amount (entered in today's dollars; inflate to nominal for this year onward)
              categoryAmountOverrides[category.id] = delta * inflationMultiplier
              // Reset prior adjustments when setting a new absolute amount
              categoryMultipliers[category.id] = 1.0
              categoryDollarAdditions[category.id] = 0
              categoryDollarJumpYears[category.id] = []
            } else {
              // 'change_percent': Percentage-based change (multiplier)
              // e.g. 10 means increase by 10% -> multiplier 1.10
              const jumpMultiplier = 1 + (delta / 100)
              categoryMultipliers[category.id] *= jumpMultiplier
            }
          }
        }
      })
    }

    // Calculate recurring expenses for each category
    let totalRecurringNominal = 0
    const categoryBreakdown = {}

    data.expenseCategories.forEach(category => {
      const amountType = category.amountType || 'percent' // Default to percent now

      // Calculate annual values with growth and changes
      const yearsOfGrowth = year - 1
      const growthRate = category.growthRate !== '' && category.growthRate !== undefined
        ? category.growthRate
        : inflationRate

      // If amountType is percent, base growth is driven by income growth, so no explicit inflation unless specified?
      // Actually, if it's % of income, it grows with income.
      // If it's fixed amount, it grows by inflation/growthRate.
      const growthMultiplier = amountType === 'percent'
        ? 1 // Growth derives from income
        : Math.pow(1 + growthRate / 100, yearsOfGrowth)

      const jumpMultiplier = categoryMultipliers[category.id]

      // Calculate dollar additions with growth from jump year
      let dollarAddition = 0
      categoryDollarJumpYears[category.id].forEach(jump => {
        if (year >= jump.jumpYear) {
          // Apply growth from jump year to current year
          const yearsOfGrowthFromJump = year - jump.jumpYear
          const jumpGrowthMultiplier = Math.pow(1 + jump.growthRate / 100, yearsOfGrowthFromJump)
          // Inflate to nominal dollars at jump year, then grow
          const jumpYearInflation = Math.pow(1 + inflationRate / 100, jump.jumpYear - 1)
          dollarAddition += (jump.basePVAmount * jumpYearInflation) * jumpGrowthMultiplier
        }
      })

      // Base amount can be dollar or % of gross income, or overridden by setAmountPV
      const incomeRow = incomeProjections ? incomeProjections[monthIndex] : null
      const grossMonthlyIncome = incomeRow ? incomeRow.totalCompNominal : 0
      const effectivePercentOfIncome = categoryPercentOverrides[category.id] !== null
        ? categoryPercentOverrides[category.id]
        : (category.percentOfIncome || 0)

      let baseAnnual
      if (categoryAmountOverrides[category.id] !== null) {
        baseAnnual = categoryAmountOverrides[category.id]
      } else if (amountType === 'percent') {
        baseAnnual = grossMonthlyIncome * 12 * ((Number(effectivePercentOfIncome) || 0) / 100)
      } else {
        // Fixed Amount
        const annualAmount = Number(category.annualAmount) || 0
        baseAnnual = annualAmount * growthMultiplier
      }

      // Apply dollar adjustments first, then percentage changes to the whole
      const annualWithDollars = baseAnnual + dollarAddition
      const annualExpense = annualWithDollars * jumpMultiplier
      const monthlyExpense = annualExpense / 12

      // Debug: Log first month calculations for percent of income categories
      if (monthIndex === 0 && amountType === 'percentOfIncome' && monthlyExpense > 0) {
        console.log(`${category.category}: ${effectivePercentOfIncome}% of $${grossMonthlyIncome.toFixed(2)} = $${monthlyExpense.toFixed(2)}/month`)
      }

      categoryBreakdown[category.category] = monthlyExpense
      totalRecurringNominal += monthlyExpense
    })

    // Add one-time expenses for this month
    let oneTimeNominal = 0
    let oneTimeTodayDollars = 0
    if (data.oneTimeExpenses && data.oneTimeExpenses.length > 0) {
      data.oneTimeExpenses.forEach(expense => {
        // One-time expenses occur in January of their specified year
        // Amounts are entered in today's dollars, so inflate to nominal
        const expenseYear = Number(expense.year)
        const expenseAmount = Number(expense.amount) || 0

        if (expenseYear === year && month === 1 && expenseAmount > 0) {
          oneTimeTodayDollars += expenseAmount / 12  // Spread over the year for monthly view

          // Inflate to nominal dollars for this year
          const yearsOfInflation = year - 1
          const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsOfInflation)
          oneTimeNominal += (expenseAmount * inflationMultiplier) / 12
        }
      })
    }

    const totalExpensesNominal = totalRecurringNominal + oneTimeNominal

    // Calculate present values (discounted by inflation at start of each year)
    const yearsFromNow = year - 1
    const discountFactor = Math.pow(1 + inflationRate / 100, yearsFromNow)

    const totalRecurringPV = totalRecurringNominal / discountFactor
    // One-time expenses are entered in today's dollars, so PV = entered amount (no discount needed)
    const oneTimePV = oneTimeTodayDollars
    const totalExpensesPV = totalRecurringPV + oneTimePV

    // Also discount category breakdown
    const categoryBreakdownPV = {}
    Object.keys(categoryBreakdown).forEach(cat => {
      categoryBreakdownPV[cat] = categoryBreakdown[cat] / discountFactor
    })

    // Store monthly projection (keep full precision, round only on display)
    projections.push({
      year,
      month,
      absoluteYear,
      monthIndex,

      // Nominal values (no rounding - preserve precision)
      totalRecurringNominal,
      oneTimeNominal,
      totalExpensesNominal,
      categoryBreakdownNominal: categoryBreakdown,

      // Present values (no rounding - preserve precision)
      totalRecurringPV,
      oneTimePV,
      totalExpensesPV,
      categoryBreakdownPV: categoryBreakdownPV
    })
  }

  console.log(`Generated ${projections.length} monthly projections`)

  // Log first month for debugging
  if (projections.length > 0) {
    const firstMonth = projections[0]
    console.log('🔴 First month total expenses:', firstMonth.totalExpensesNominal)
    console.log('🔴 First month breakdown:', firstMonth.categoryBreakdownNominal)
  }

  // Calculate summary statistics
  const summary = calculateSummary(projections, yearsToRetirement, data, inflationRate)

  // Prepare chart data
  const chartData = prepareChartData(projections, data.expenseCategories, yearsToRetirement, inflationRate, data.oneTimeExpenses)

  console.log('Summary calculated:', summary)
  console.log('🔴 EXPENSE CALC COMPLETE')
  console.groupEnd()

  return {
    projections,
    summary,
    chartData
  }
}

/**
 * Calculate summary statistics from projections
 */
function calculateSummary(projections, yearsToRetirement, data, inflationRate) {
  // Current year (Year 1)
  const year1Months = projections.filter(p => p.year === 1)
  const currentYearExpensesNominal = year1Months.reduce((sum, p) => sum + p.totalExpensesNominal, 0)
  const currentYearExpensesPV = year1Months.reduce((sum, p) => sum + p.totalExpensesPV, 0)

  // Year 10
  const year10Months = projections.filter(p => p.year === 10)
  const year10ExpensesNominal = year10Months.length > 0
    ? year10Months.reduce((sum, p) => sum + p.totalExpensesNominal, 0)
    : 0
  const year10ExpensesPV = year10Months.length > 0
    ? year10Months.reduce((sum, p) => sum + p.totalExpensesPV, 0)
    : 0

  // Lifetime expenses (to retirement)
  const retirementMonthIndex = yearsToRetirement * 12 - 1
  const lifetimeMonths = projections.filter(p => p.monthIndex <= retirementMonthIndex)

  const lifetimeExpensesNominal = lifetimeMonths.reduce((sum, p) => sum + p.totalExpensesNominal, 0)
  const lifetimeExpensesPV = lifetimeMonths.reduce((sum, p) => sum + p.totalExpensesPV, 0)

  // Category breakdowns (lifetime)
  const categoryTotals = {}
  const categoryTotalsPV = {}

  data.expenseCategories.forEach(category => {
    categoryTotals[category.category] = 0
    categoryTotalsPV[category.category] = 0
  })

  lifetimeMonths.forEach(proj => {
    Object.keys(proj.categoryBreakdownNominal).forEach(cat => {
      categoryTotals[cat] = (categoryTotals[cat] || 0) + proj.categoryBreakdownNominal[cat]
      categoryTotalsPV[cat] = (categoryTotalsPV[cat] || 0) + proj.categoryBreakdownPV[cat]
    })
  })

  // Category totals are kept at full precision

  // One-time expenses total (in today's dollars as entered)
  const oneTimeTotalTodayDollars = data.oneTimeExpenses
    .filter(e => e.year && e.year <= yearsToRetirement)
    .reduce((sum, e) => sum + (e.amount || 0), 0)

  // Calculate nominal total for one-time expenses (inflated to future years)
  let oneTimeTotalNominal = 0
  data.oneTimeExpenses.forEach(expense => {
    if (expense.year && expense.year <= yearsToRetirement && expense.amount) {
      const yearsOfInflation = expense.year - 1
      const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsOfInflation)
      oneTimeTotalNominal += expense.amount * inflationMultiplier
    }
  })

  // PV for one-time expenses = entered amounts (already in today's dollars)
  const oneTimeTotalPV = oneTimeTotalTodayDollars

  // Key milestones (where jumps/drops occur)
  const milestones = []
  data.expenseCategories.forEach(category => {
    if (category.jumps && category.jumps.length > 0) {
      category.jumps
        .filter(jump => jump.year && jump.jumpPercent !== undefined && jump.jumpPercent !== '')
        .forEach(jump => {
          const jumpYearMonths = projections.filter(p => p.year === jump.year)
          if (jumpYearMonths.length > 0) {
            const expensesNominal = jumpYearMonths.reduce((sum, p) => sum + p.totalExpensesNominal, 0)
            const expensesPV = jumpYearMonths.reduce((sum, p) => sum + p.totalExpensesPV, 0)

            const changeType = jump.jumpPercent > 0 ? 'increase' : 'decrease'
            milestones.push({
              year: jump.year,
              label: `Year ${jump.year}: ${category.category} - ${jump.description || 'Expense change'} (${jump.jumpPercent > 0 ? '+' : ''}${jump.jumpPercent}%)`,
              expensesNominal,
              expensesPV,
              changeType
            })
          }
        })
    }
  })

  // Add one-time expense milestones
  data.oneTimeExpenses.forEach(expense => {
    if (expense.year && expense.amount && expense.year <= yearsToRetirement) {
      milestones.push({
        year: expense.year,
        label: `Year ${expense.year}: One-time - ${expense.description || 'Expense'}`,
        amount: expense.amount,
        changeType: 'onetime'
      })
    }
  })

  // Sort milestones by year
  milestones.sort((a, b) => a.year - b.year)

  // Calculate average annual expenses
  const avgAnnualExpensesNominal = yearsToRetirement > 0
    ? lifetimeExpensesNominal / yearsToRetirement
    : 0
  const avgAnnualExpensesPV = yearsToRetirement > 0
    ? lifetimeExpensesPV / yearsToRetirement
    : 0

  // Build per-category summaries for table display
  const perCategorySummaries = data.expenseCategories.map(category => {
    // Current year breakdown
    const currentYearCat = year1Months.reduce((sum, p) =>
      sum + (p.categoryBreakdownNominal[category.category] || 0), 0)

    // Year 10 breakdown
    const year10Cat = year10Months.reduce((sum, p) =>
      sum + (p.categoryBreakdownNominal[category.category] || 0), 0)

    return {
      categoryName: category.category,
      currentYearExpensesNominal: currentYearCat,
      year10ExpensesNominal: year10Cat,
      lifetimeExpensesNominal: categoryTotals[category.category] || 0,
      lifetimeExpensesPV: categoryTotalsPV[category.category] || 0
    }
  })

  return {
    currentYearExpensesNominal,
    currentYearExpensesPV,

    year10ExpensesNominal,
    year10ExpensesPV,

    lifetimeExpensesNominal,
    lifetimeExpensesPV,

    avgAnnualExpensesNominal,
    avgAnnualExpensesPV,

    categoryTotals,
    categoryTotalsPV,
    perCategorySummaries,

    oneTimeTotalNominal,
    oneTimeTotalPV,

    milestones
  }
}

/**
 * Prepare chart data for stacked column chart
 */
function prepareChartData(projections, expenseCategories, yearsToRetirement, inflationRate, oneTimeExpenses) {
  const chartDataPV = []
  const chartDataNominal = []

  // Aggregate by year (up to retirement)
  for (let year = 1; year <= yearsToRetirement; year++) {
    const yearDataPV = { year, total: 0 }
    const yearDataNominal = { year, total: 0 }

    // Get all months for this year
    const yearMonths = projections.filter(p => p.year === year)

    // Calculate annual totals for each category
    expenseCategories.forEach(category => {
      let categoryAnnualPV = 0
      let categoryAnnualNominal = 0

      yearMonths.forEach(monthProj => {
        if (monthProj.categoryBreakdownPV[category.category]) {
          categoryAnnualPV += monthProj.categoryBreakdownPV[category.category]
        }
        if (monthProj.categoryBreakdownNominal[category.category]) {
          categoryAnnualNominal += monthProj.categoryBreakdownNominal[category.category]
        }
      })

      yearDataPV[category.category] = categoryAnnualPV
      yearDataPV.total += categoryAnnualPV

      yearDataNominal[category.category] = categoryAnnualNominal
      yearDataNominal.total += categoryAnnualNominal
    })

    // Add one-time expenses for this year
    let oneTimeForYearPV = 0
    let oneTimeForYearNominal = 0

    oneTimeExpenses.forEach(expense => {
      if (expense.year === year && expense.amount) {
        // PV is the entered amount (today's dollars)
        oneTimeForYearPV += expense.amount

        // Nominal is inflated amount
        const yearsOfInflation = year - 1
        const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsOfInflation)
        oneTimeForYearNominal += expense.amount * inflationMultiplier
      }
    })

    yearDataPV['One-Time'] = oneTimeForYearPV
    yearDataPV.total += oneTimeForYearPV

    yearDataNominal['One-Time'] = oneTimeForYearNominal
    yearDataNominal.total += oneTimeForYearNominal

    chartDataPV.push(yearDataPV)
    chartDataNominal.push(yearDataNominal)
  }

  return { chartDataPV, chartDataNominal }
}
