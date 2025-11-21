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
  console.group('📊 Calculating Expense Projections')

  const inflationRate = profile.inflationRate !== undefined ? profile.inflationRate : 2.7
  const yearsToRetirement = profile.retirementAge && profile.age
    ? profile.retirementAge - profile.age
    : 30
  const currentYear = new Date().getFullYear()
  const incomeProjections = incomeProjectionData?.projections || incomeProjectionData || null

  console.log('Inflation Rate:', inflationRate + '%')
  console.log('Years to Retirement:', yearsToRetirement)

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
          const changeThisYear = category.jumps.find(j => j.year === year)
          if (changeThisYear && changeThisYear.changeValue !== undefined && changeThisYear.changeValue !== '') {
            const delta = Number(changeThisYear.changeValue) || 0
            const yearsFromStart = year - 1
            const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsFromStart)

            if (changeThisYear.changeType === 'dollar') {
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
            } else if (changeThisYear.changeType === 'percentOfIncome') {
              // Override percent of income for this category from this year onward
              categoryPercentOverrides[category.id] = delta
            } else if (changeThisYear.changeType === 'setAmountPV') {
              // Override base amount (entered in today's dollars; inflate to nominal for this year onward)
              categoryAmountOverrides[category.id] = delta * inflationMultiplier
              // Reset prior adjustments when setting a new absolute amount
              categoryMultipliers[category.id] = 1.0
              categoryDollarAdditions[category.id] = 0
              categoryDollarJumpYears[category.id] = []
            } else {
              // Percentage-based change: multiply
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
      const amountType = category.amountType || 'dollar'

      // Calculate annual values with growth and changes
      const yearsOfGrowth = year - 1
      const growthRate = category.growthRate !== '' && category.growthRate !== undefined
        ? category.growthRate
        : inflationRate
      const growthMultiplier = amountType === 'percentOfIncome'
        ? 1 // Growth derives from income, so no explicit growth applied
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
      } else if (amountType === 'percentOfIncome') {
        baseAnnual = grossMonthlyIncome * 12 * (effectivePercentOfIncome / 100)
      } else {
        baseAnnual = (category.annualAmount || 0) * growthMultiplier
      }

      // Apply dollar adjustments first, then percentage changes to the whole
      const annualWithDollars = baseAnnual + dollarAddition
      const annualExpense = annualWithDollars * jumpMultiplier
      const monthlyExpense = annualExpense / 12

      categoryBreakdown[category.category] = monthlyExpense
      totalRecurringNominal += monthlyExpense
    })

    // Add one-time expenses for this month
    let oneTimeNominal = 0
    let oneTimeTodayDollars = 0
    data.oneTimeExpenses.forEach(expense => {
      // One-time expenses occur in January of their specified year
      // Amounts are entered in today's dollars, so inflate to nominal
      if (expense.year === year && month === 1) {
        oneTimeTodayDollars += expense.amount / 12  // Spread over the year for monthly view

        // Inflate to nominal dollars for this year
        const yearsOfInflation = year - 1
        const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsOfInflation)
        oneTimeNominal += (expense.amount * inflationMultiplier) / 12
      }
    })

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

  // Calculate summary statistics
  const summary = calculateSummary(projections, yearsToRetirement, data, inflationRate)

  // Prepare chart data
  const chartData = prepareChartData(projections, data.expenseCategories, yearsToRetirement, inflationRate, data.oneTimeExpenses)

  console.log('Summary calculated:', summary)
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
  const chartData = []

  // Aggregate by year (up to retirement)
  for (let year = 1; year <= yearsToRetirement; year++) {
    const yearData = {
      year,
      total: 0
    }

    // Get all months for this year
    const yearMonths = projections.filter(p => p.year === year)

    // Calculate annual PV total for each category
    expenseCategories.forEach(category => {
      let categoryAnnualPV = 0

      yearMonths.forEach(monthProj => {
        if (monthProj.categoryBreakdownPV[category.category]) {
          categoryAnnualPV += monthProj.categoryBreakdownPV[category.category]
        }
      })

      yearData[category.category] = categoryAnnualPV
      yearData.total += categoryAnnualPV
    })

    // Add one-time expenses for this year (in today's dollars = PV)
    let oneTimeForYear = 0
    oneTimeExpenses.forEach(expense => {
      if (expense.year === year && expense.amount) {
        oneTimeForYear += expense.amount
      }
    })

    yearData['One-Time'] = oneTimeForYear
    yearData.total += oneTimeForYear

    chartData.push(yearData)
  }

  return chartData
}
