/**
 * Expenses Data Transformer for CSV Export
 * Transforms monthly expense projections into CSV rows
 */

export function transformExpensesData(expensesData, yearsToRetirement, inflationRate) {
  const rows = []

  if (!expensesData || !expensesData.projections) {
    console.warn('Expenses data is missing or incomplete')
    return rows
  }

  // Track one-time expenses already added (avoid duplicates across months)
  const oneTimeAdded = new Set()

  // Iterate through each monthly projection
  expensesData.projections.forEach(projection => {
    if (projection.year > yearsToRetirement) return

    const { year, month } = projection
    const yearsFromNow = year - 1
    const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsFromNow)
    const discountFactor = inflationMultiplier

    // RECURRING EXPENSES by category
    if (expensesData.expenseCategories) {
      expensesData.expenseCategories.forEach(category => {
        // Calculate growth multiplier
        const yearsOfGrowth = year - 1
        const growthMultiplier = Math.pow(1 + (category.growthRate || 0) / 100, yearsOfGrowth)

        // Calculate jump multiplier for this category
        let jumpMultiplier = 1.0
        if (category.jumps && category.jumps.length > 0) {
          category.jumps
            .filter(j => j.year && j.year <= year)
            .forEach(j => {
              if (j.type === 'add') {
                // Additive change: add absolute amount to base
                const baseAmount = category.annualAmount || 0
                if (baseAmount > 0) {
                  jumpMultiplier += ((j.changeValue || 0) / baseAmount)
                }
              } else if (j.type === 'multiply') {
                // Multiplicative change: percentage adjustment
                jumpMultiplier *= (1 + (j.changeValue || 0) / 100)
              }
            })
        }

        const totalMultiplier = growthMultiplier * jumpMultiplier
        const monthlyAmount = ((category.annualAmount || 0) * totalMultiplier) / 12

        rows.push({
          Year: year,
          Month: month,
          Module: 'Expenses',
          Primary_Category: category.name || `Category_${category.id}`,
          Subcategory: 'Recurring',
          Sub_Sub_Category: null,
          Value_Type: 'Flow',
          Value_Nominal: monthlyAmount.toFixed(2),
          Value_PV: (monthlyAmount / discountFactor).toFixed(2),
          Inflation_Multiplier: inflationMultiplier.toFixed(5),
          Growth_Multiplier: totalMultiplier.toFixed(5),
          Growth_Type: 'Expense_Growth',
          Notes: ''
        })
      })
    }

    // ONE-TIME EXPENSES (add only in the month they occur)
    if (expensesData.oneTimeExpenses) {
      expensesData.oneTimeExpenses.forEach(expense => {
        const expenseKey = `${expense.id || expense.description}-${expense.year}`

        // Add only if it occurs this year/month and hasn't been added yet
        if (expense.year === year &&
            expense.month === month &&
            !oneTimeAdded.has(expenseKey)) {
          oneTimeAdded.add(expenseKey)

          const expenseYearsFromNow = (expense.year || year) - 1
          const expenseInflation = Math.pow(1 + inflationRate / 100, expenseYearsFromNow)

          rows.push({
            Year: year,
            Month: month,
            Module: 'Expenses',
            Primary_Category: expense.category || 'One_Time',
            Subcategory: 'One_Time',
            Sub_Sub_Category: expense.description || 'Large Purchase',
            Value_Type: 'Flow',
            Value_Nominal: (expense.amount || 0).toFixed(2),
            Value_PV: ((expense.amount || 0) / expenseInflation).toFixed(2),
            Inflation_Multiplier: expenseInflation.toFixed(5),
            Growth_Multiplier: 'N/A',
            Growth_Type: 'N/A',
            Notes: expense.description || ''
          })
        }
      })
    }
  })

  console.log(`Expenses Transformer: Generated ${rows.length} rows`)
  return rows
}
