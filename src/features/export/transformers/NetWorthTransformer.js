/**
 * Net Worth Data Transformer for CSV Export
 * Transforms annual net worth data into CSV rows
 * Shows year-end summary metrics only (December)
 */

export function transformNetWorthData(gapProjections, inflationRate) {
  const rows = []

  if (!gapProjections || !gapProjections.projections) {
    console.warn('Gap projections data is missing')
    return rows
  }

  gapProjections.projections.forEach(projection => {
    const { year } = projection
    const yearsFromNow = year - 1
    const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsFromNow)

    // Show these metrics only in December (year-end summary)
    const month = 12

    // Define all net worth metrics
    const metrics = [
      {
        category: 'Income',
        subcategory: 'Total',
        value: projection.grossIncome || 0,
        valuePV: projection.grossIncomePV || 0,
        type: 'Flow',
        notes: 'Total annual income'
      },
      {
        category: 'Individual_401k_Contributions',
        subcategory: 'Total',
        value: -(projection.totalIndividual401k || 0),
        valuePV: -(projection.totalIndividual401kPV || 0),
        type: 'Flow',
        notes: 'Employee pretax deferrals'
      },
      {
        category: 'Taxes',
        subcategory: 'Total',
        value: -(projection.annualTaxes || 0),
        valuePV: -(projection.annualTaxesPV || 0),
        type: 'Flow',
        notes: 'Federal + State + FICA'
      },
      {
        category: 'Expenses',
        subcategory: 'Total',
        value: -(projection.annualExpenses || 0),
        valuePV: -(projection.annualExpensesPV || 0),
        type: 'Flow',
        notes: 'Recurring + One-time'
      },
      {
        category: 'Gap',
        subcategory: 'Calculated',
        value: projection.gap || 0,
        valuePV: projection.gapPV || 0,
        type: 'Flow',
        notes: 'Income - 401k - Taxes - Expenses'
      },
      {
        category: 'Cash',
        subcategory: 'Balance',
        value: projection.cash || 0,
        valuePV: projection.cashPV || 0,
        type: 'Balance',
        notes: 'Liquid cash balance'
      },
      {
        category: 'Investments',
        subcategory: 'Market_Value',
        value: projection.totalInvestmentValue || 0,
        valuePV: projection.totalInvestmentValuePV || 0,
        type: 'Balance',
        notes: 'Total investment accounts'
      },
      {
        category: '401k',
        subcategory: 'Balance',
        value: projection.retirement401kValue || 0,
        valuePV: projection.retirement401kValuePV || 0,
        type: 'Balance',
        notes: 'Retirement account balance'
      },
      {
        category: 'Net_Worth',
        subcategory: 'Total',
        value: projection.netWorth || 0,
        valuePV: projection.netWorthPV || 0,
        type: 'Balance',
        notes: 'Cash + Investments + 401k'
      }
    ]

    // Create a row for each metric
    metrics.forEach(metric => {
      rows.push({
        Year: year,
        Month: month,
        Module: 'Net_Worth',
        Primary_Category: metric.category,
        Subcategory: metric.subcategory,
        Sub_Sub_Category: null,
        Value_Type: metric.type,
        Value_Nominal: metric.value.toFixed(2),
        Value_PV: metric.valuePV.toFixed(2),
        Inflation_Multiplier: inflationMultiplier.toFixed(5),
        Growth_Multiplier: 'N/A',
        Growth_Type: 'N/A',
        Notes: metric.notes
      })
    })
  })

  console.log(`Net Worth Transformer: Generated ${rows.length} rows`)
  return rows
}
