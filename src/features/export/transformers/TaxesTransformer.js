/**
 * Taxes Data Transformer for CSV Export
 * Transforms annual tax calculations into monthly CSV rows
 * Uses pre-calculated tax values from Gap projections (single source of truth)
 */

export function transformTaxesData(gapProjections, inflationRate, profile) {
  const rows = []

  if (!gapProjections || !gapProjections.projections) {
    console.warn('Gap projections data is missing')
    return rows
  }

  gapProjections.projections.forEach(projection => {
    const { year, taxBreakdown } = projection

    // Use pre-calculated tax breakdown from Gap projections (DO NOT recalculate!)
    // This ensures consistency across all modules
    if (!taxBreakdown) {
      console.warn(`Missing tax breakdown for year ${year}`)
      return
    }

    // Calculate monthly allocations (divide annual by 12)
    const monthlyFederal = (taxBreakdown.federal || 0) / 12
    const monthlyState = (taxBreakdown.state || 0) / 12
    const monthlySS = (taxBreakdown.socialSecurity || 0) / 12
    const monthlyMedicare = (taxBreakdown.medicare || 0) / 12

    // Calculate inflation multiplier
    const yearsFromNow = year - 1
    const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsFromNow)
    const discountFactor = inflationMultiplier

    // Create rows for each month (12 months)
    for (let month = 1; month <= 12; month++) {
      // Federal Income Tax
      rows.push({
        Year: year,
        Month: month,
        Module: 'Taxes',
        Primary_Category: 'Federal',
        Subcategory: 'Income_Tax',
        Sub_Sub_Category: null,
        Value_Type: 'Flow',
        Value_Nominal: monthlyFederal.toFixed(2),
        Value_PV: (monthlyFederal / discountFactor).toFixed(2),
        Inflation_Multiplier: inflationMultiplier.toFixed(5),
        Growth_Multiplier: 'N/A',
        Growth_Type: 'N/A',
        Notes: 'Annual tax / 12'
      })

      // State Income Tax
      rows.push({
        Year: year,
        Month: month,
        Module: 'Taxes',
        Primary_Category: 'State_California',
        Subcategory: 'Income_Tax',
        Sub_Sub_Category: null,
        Value_Type: 'Flow',
        Value_Nominal: monthlyState.toFixed(2),
        Value_PV: (monthlyState / discountFactor).toFixed(2),
        Inflation_Multiplier: inflationMultiplier.toFixed(5),
        Growth_Multiplier: 'N/A',
        Growth_Type: 'N/A',
        Notes: 'Annual tax / 12'
      })

      // FICA - Social Security
      rows.push({
        Year: year,
        Month: month,
        Module: 'Taxes',
        Primary_Category: 'FICA',
        Subcategory: 'Social_Security',
        Sub_Sub_Category: null,
        Value_Type: 'Flow',
        Value_Nominal: monthlySS.toFixed(2),
        Value_PV: (monthlySS / discountFactor).toFixed(2),
        Inflation_Multiplier: inflationMultiplier.toFixed(5),
        Growth_Multiplier: 'N/A',
        Growth_Type: 'N/A',
        Notes: '6.2% up to wage base'
      })

      // FICA - Medicare (combined regular + additional)
      rows.push({
        Year: year,
        Month: month,
        Module: 'Taxes',
        Primary_Category: 'FICA',
        Subcategory: 'Medicare',
        Sub_Sub_Category: null,
        Value_Type: 'Flow',
        Value_Nominal: monthlyMedicare.toFixed(2),
        Value_PV: (monthlyMedicare / discountFactor).toFixed(2),
        Inflation_Multiplier: inflationMultiplier.toFixed(5),
        Growth_Multiplier: 'N/A',
        Growth_Type: 'N/A',
        Notes: '1.45% + 0.9% above threshold'
      })
    }
  })

  console.log(`Taxes Transformer: Generated ${rows.length} rows`)
  return rows
}
