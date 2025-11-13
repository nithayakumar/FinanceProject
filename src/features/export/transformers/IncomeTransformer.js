/**
 * Income Data Transformer for CSV Export
 * Transforms monthly income projections into CSV rows
 */

export function transformIncomeData(incomeData, yearsToRetirement, inflationRate) {
  const rows = []

  if (!incomeData || !incomeData.projections || !incomeData.incomeStreams) {
    console.warn('Income data is missing or incomplete')
    return rows
  }

  // Iterate through each monthly projection
  incomeData.projections.forEach(projection => {
    // Only include up to retirement
    if (projection.year > yearsToRetirement) return

    const { year, month, activeStreams } = projection

    // Calculate inflation multiplier for this period
    const yearsFromNow = year - 1
    const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsFromNow)
    const discountFactor = inflationMultiplier

    // For each income stream, create rows for each component
    incomeData.incomeStreams.forEach(stream => {
      // Skip if stream is not active this month
      if (!activeStreams || !activeStreams.includes(stream.id)) return

      // Calculate growth multiplier for this stream
      const yearsOfGrowth = year - 1
      const growthMultiplier = Math.pow(1 + (stream.growthRate || 0) / 100, yearsOfGrowth)

      // Calculate jump multiplier up to this year
      let jumpMultiplier = 1.0
      if (stream.jumps && stream.jumps.length > 0) {
        stream.jumps
          .filter(j => j.year && j.jumpPercent && j.year <= year)
          .forEach(j => {
            jumpMultiplier *= (1 + (j.jumpPercent || 0) / 100)
          })
      }

      const totalMultiplier = growthMultiplier * jumpMultiplier

      // Calculate monthly values
      const monthlySalary = ((stream.annualIncome || 0) * totalMultiplier) / 12
      const monthlyEquity = ((stream.equity || 0) * totalMultiplier) / 12
      const monthlyCompany401k = ((stream.company401k || 0) * totalMultiplier) / 12

      // Check if jump occurred this year (for notes)
      const jumpThisYear = stream.jumps?.find(j => j.year === year)
      const jumpNote = (month === 1 && jumpThisYear) ? `Jump: ${jumpThisYear.description || 'Income Change'}` : ''

      // Create row for Salary component
      rows.push({
        Year: year,
        Month: month,
        Module: 'Income',
        Primary_Category: stream.name || `Stream_${stream.id}`,
        Subcategory: 'Salary',
        Sub_Sub_Category: jumpNote || null,
        Value_Type: 'Flow',
        Value_Nominal: monthlySalary.toFixed(2),
        Value_PV: (monthlySalary / discountFactor).toFixed(2),
        Inflation_Multiplier: inflationMultiplier.toFixed(5),
        Growth_Multiplier: totalMultiplier.toFixed(5),
        Growth_Type: 'Income_Growth',
        Notes: jumpNote
      })

      // Create row for Equity component
      rows.push({
        Year: year,
        Month: month,
        Module: 'Income',
        Primary_Category: stream.name || `Stream_${stream.id}`,
        Subcategory: 'Equity_RSU',
        Sub_Sub_Category: jumpNote || null,
        Value_Type: 'Flow',
        Value_Nominal: monthlyEquity.toFixed(2),
        Value_PV: (monthlyEquity / discountFactor).toFixed(2),
        Inflation_Multiplier: inflationMultiplier.toFixed(5),
        Growth_Multiplier: totalMultiplier.toFixed(5),
        Growth_Type: 'Income_Growth',
        Notes: jumpNote
      })

      // Create row for Company 401k component
      rows.push({
        Year: year,
        Month: month,
        Module: 'Income',
        Primary_Category: stream.name || `Stream_${stream.id}`,
        Subcategory: 'Company_401k',
        Sub_Sub_Category: jumpNote || null,
        Value_Type: 'Flow',
        Value_Nominal: monthlyCompany401k.toFixed(2),
        Value_PV: (monthlyCompany401k / discountFactor).toFixed(2),
        Inflation_Multiplier: inflationMultiplier.toFixed(5),
        Growth_Multiplier: totalMultiplier.toFixed(5),
        Growth_Type: 'Income_Growth',
        Notes: jumpNote
      })
    })
  })

  console.log(`Income Transformer: Generated ${rows.length} rows`)
  return rows
}
