/**
 * Investments Data Transformer for CSV Export
 * Transforms annual investment data into monthly CSV rows
 * Shows beginning balance, monthly contributions, year-end returns, ending balance
 */

export function transformInvestmentsData(gapProjections, investmentsData, inflationRate, incomeData) {
  const rows = []

  if (!gapProjections || !gapProjections.projections) {
    console.warn('Gap projections data is missing')
    return rows
  }

  // Track 401k cost basis across years (sum of all contributions)
  let costBasis401k = investmentsData.retirement401k?.currentValue || 0

  gapProjections.projections.forEach((projection, projectionIndex) => {
    const { year } = projection
    const yearsFromNow = year - 1
    const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsFromNow)
    const discountFactor = inflationMultiplier

    // Get previous year's data for beginning balance
    const prevProjection = projectionIndex > 0 ? gapProjections.projections[projectionIndex - 1] : null

    // ===== CASH ACCOUNT =====
    const cashBeginning = prevProjection ? (prevProjection.cash || 0) : (investmentsData.currentCash || 0)
    const cashEnding = projection.cash || 0
    const cashContributionAnnual = projection.cashContribution || 0  // Actual cash contribution tracked in Gap.calc.js

    // Beginning balance (January only)
    rows.push({
      Year: year,
      Month: 1,
      Module: 'Investments',
      Primary_Category: 'Cash',
      Subcategory: 'Beginning_Balance',
      Sub_Sub_Category: null,
      Value_Type: 'Balance',
      Value_Nominal: cashBeginning.toFixed(2),
      Value_PV: (cashBeginning / discountFactor).toFixed(2),
      Inflation_Multiplier: inflationMultiplier.toFixed(5),
      Growth_Multiplier: 'N/A',
      Growth_Type: 'N/A',
      Notes: ''
    })

    // Monthly cash contribution (actual amount allocated to cash, spread across 12 months)
    const monthlyCashFlow = cashContributionAnnual / 12
    for (let month = 1; month <= 12; month++) {
      rows.push({
        Year: year,
        Month: month,
        Module: 'Investments',
        Primary_Category: 'Cash',
        Subcategory: 'Contribution',
        Sub_Sub_Category: null,
        Value_Type: 'Flow',
        Value_Nominal: monthlyCashFlow.toFixed(2),
        Value_PV: (monthlyCashFlow / discountFactor).toFixed(2),
        Inflation_Multiplier: inflationMultiplier.toFixed(5),
        Growth_Multiplier: 'N/A',
        Growth_Type: 'N/A',
        Notes: 'Actual cash contributed (target fill + excess) or withdrawn (negative)'
      })
    }

    // Monthly balances (months 2-11) - linear interpolation of contributions
    for (let month = 2; month <= 11; month++) {
      const progressiveContribution = (month - 1) / 12 * cashContributionAnnual
      const monthlyBalance = cashBeginning + progressiveContribution

      rows.push({
        Year: year,
        Month: month,
        Module: 'Investments',
        Primary_Category: 'Cash',
        Subcategory: 'Balance',
        Sub_Sub_Category: null,
        Value_Type: 'Balance',
        Value_Nominal: monthlyBalance.toFixed(2),
        Value_PV: (monthlyBalance / discountFactor).toFixed(2),
        Inflation_Multiplier: inflationMultiplier.toFixed(5),
        Growth_Multiplier: 'N/A',
        Growth_Type: 'N/A',
        Notes: 'Linear interpolation (contributions only, growth at year-end)'
      })
    }

    // Ending balance (December only)
    rows.push({
      Year: year,
      Month: 12,
      Module: 'Investments',
      Primary_Category: 'Cash',
      Subcategory: 'Ending_Balance',
      Sub_Sub_Category: null,
      Value_Type: 'Balance',
      Value_Nominal: cashEnding.toFixed(2),
      Value_PV: (projection.cashPV || cashEnding / discountFactor).toFixed(2),
      Inflation_Multiplier: inflationMultiplier.toFixed(5),
      Growth_Multiplier: 'N/A',
      Growth_Type: 'N/A',
      Notes: ''
    })

    // ===== INVESTMENT ACCOUNTS =====
    if (projection.investments && investmentsData.investments) {
      projection.investments.forEach((inv, invIndex) => {
        const invAccount = investmentsData.investments[invIndex]
        if (!invAccount) return

        const prevInv = prevProjection?.investments?.[invIndex]
        const invBeginning = prevInv ? (prevInv.marketValue || 0) : (invAccount.currentValue || 0)
        const invEnding = inv.marketValue || 0
        const invContribution = projection[`investment${invIndex + 1}`] || 0
        const invReturns = invEnding - invBeginning - invContribution

        // Cost basis and capital gains
        const costBasisBeginning = prevInv ? (prevInv.costBasis || 0) : (invAccount.currentValue || 0)
        const costBasisEnding = inv.costBasis || 0
        const capitalGainsBeginning = invBeginning - costBasisBeginning
        const capitalGainsEnding = invEnding - costBasisEnding

        const growthRate = invAccount.growthRate || 0
        const growthMultiplier = Math.pow(1 + growthRate / 100, year)

        // Beginning balance - Market Value (January)
        rows.push({
          Year: year,
          Month: 1,
          Module: 'Investments',
          Primary_Category: invAccount.name || `Investment_${invIndex + 1}`,
          Subcategory: 'Beginning_Balance',
          Sub_Sub_Category: invAccount.accountType || null,
          Value_Type: 'Balance',
          Value_Nominal: invBeginning.toFixed(2),
          Value_PV: (invBeginning / discountFactor).toFixed(2),
          Inflation_Multiplier: inflationMultiplier.toFixed(5),
          Growth_Multiplier: growthMultiplier.toFixed(5),
          Growth_Type: 'Investment_Return',
          Notes: 'Market value'
        })

        // Beginning balance - Cost Basis (January)
        rows.push({
          Year: year,
          Month: 1,
          Module: 'Investments',
          Primary_Category: invAccount.name || `Investment_${invIndex + 1}`,
          Subcategory: 'Beginning_Balance_Cost_Basis',
          Sub_Sub_Category: invAccount.accountType || null,
          Value_Type: 'Balance',
          Value_Nominal: costBasisBeginning.toFixed(2),
          Value_PV: (costBasisBeginning / discountFactor).toFixed(2),
          Inflation_Multiplier: inflationMultiplier.toFixed(5),
          Growth_Multiplier: 'N/A',
          Growth_Type: 'N/A',
          Notes: 'Original cost of holdings'
        })

        // Beginning balance - Capital Gains (January)
        rows.push({
          Year: year,
          Month: 1,
          Module: 'Investments',
          Primary_Category: invAccount.name || `Investment_${invIndex + 1}`,
          Subcategory: 'Beginning_Unrealized_Gains',
          Sub_Sub_Category: invAccount.accountType || null,
          Value_Type: 'Balance',
          Value_Nominal: capitalGainsBeginning.toFixed(2),
          Value_PV: (capitalGainsBeginning / discountFactor).toFixed(2),
          Inflation_Multiplier: inflationMultiplier.toFixed(5),
          Growth_Multiplier: 'N/A',
          Growth_Type: 'N/A',
          Notes: 'Market value - cost basis'
        })

        // Monthly contributions (spread across 12 months)
        const monthlyInvContribution = invContribution / 12
        for (let month = 1; month <= 12; month++) {
          rows.push({
            Year: year,
            Month: month,
            Module: 'Investments',
            Primary_Category: invAccount.name || `Investment_${invIndex + 1}`,
            Subcategory: 'Contribution',
            Sub_Sub_Category: invAccount.accountType || null,
            Value_Type: 'Flow',
            Value_Nominal: monthlyInvContribution.toFixed(2),
            Value_PV: (monthlyInvContribution / discountFactor).toFixed(2),
            Inflation_Multiplier: inflationMultiplier.toFixed(5),
            Growth_Multiplier: 'N/A',
            Growth_Type: 'N/A',
            Notes: `${(invAccount.portfolioPercent || 0)}% of gap`
          })
        }

        // Monthly balances (months 2-11) - linear interpolation
        for (let month = 2; month <= 11; month++) {
          const progressiveContribution = (month - 1) / 12 * invContribution
          const monthlyMarketValue = invBeginning + progressiveContribution
          const monthlyContributionToCostBasis = (month - 1) / 12 * invContribution
          const monthlyCostBasis = costBasisBeginning + monthlyContributionToCostBasis
          const monthlyCapitalGains = monthlyMarketValue - monthlyCostBasis

          // Market value balance
          rows.push({
            Year: year,
            Month: month,
            Module: 'Investments',
            Primary_Category: invAccount.name || `Investment_${invIndex + 1}`,
            Subcategory: 'Balance',
            Sub_Sub_Category: invAccount.accountType || null,
            Value_Type: 'Balance',
            Value_Nominal: monthlyMarketValue.toFixed(2),
            Value_PV: (monthlyMarketValue / discountFactor).toFixed(2),
            Inflation_Multiplier: inflationMultiplier.toFixed(5),
            Growth_Multiplier: 'N/A',
            Growth_Type: 'N/A',
            Notes: 'Linear interpolation (contributions only, growth at year-end)'
          })

          // Cost basis balance
          rows.push({
            Year: year,
            Month: month,
            Module: 'Investments',
            Primary_Category: invAccount.name || `Investment_${invIndex + 1}`,
            Subcategory: 'Balance_Cost_Basis',
            Sub_Sub_Category: invAccount.accountType || null,
            Value_Type: 'Balance',
            Value_Nominal: monthlyCostBasis.toFixed(2),
            Value_PV: (monthlyCostBasis / discountFactor).toFixed(2),
            Inflation_Multiplier: inflationMultiplier.toFixed(5),
            Growth_Multiplier: 'N/A',
            Growth_Type: 'N/A',
            Notes: 'Linear interpolation of contributions'
          })

          // Unrealized gains balance
          rows.push({
            Year: year,
            Month: month,
            Module: 'Investments',
            Primary_Category: invAccount.name || `Investment_${invIndex + 1}`,
            Subcategory: 'Unrealized_Gains',
            Sub_Sub_Category: invAccount.accountType || null,
            Value_Type: 'Balance',
            Value_Nominal: monthlyCapitalGains.toFixed(2),
            Value_PV: (monthlyCapitalGains / discountFactor).toFixed(2),
            Inflation_Multiplier: inflationMultiplier.toFixed(5),
            Growth_Multiplier: 'N/A',
            Growth_Type: 'N/A',
            Notes: 'Market value - cost basis (no growth until year-end)'
          })
        }

        // Investment returns (December only - applied at year-end)
        rows.push({
          Year: year,
          Month: 12,
          Module: 'Investments',
          Primary_Category: invAccount.name || `Investment_${invIndex + 1}`,
          Subcategory: 'Investment_Returns',
          Sub_Sub_Category: invAccount.accountType || null,
          Value_Type: 'Flow',
          Value_Nominal: invReturns.toFixed(2),
          Value_PV: (invReturns / discountFactor).toFixed(2),
          Inflation_Multiplier: inflationMultiplier.toFixed(5),
          Growth_Multiplier: growthMultiplier.toFixed(5),
          Growth_Type: 'Investment_Return',
          Notes: 'Applied at year-end'
        })

        // Ending balance - Market Value (December)
        rows.push({
          Year: year,
          Month: 12,
          Module: 'Investments',
          Primary_Category: invAccount.name || `Investment_${invIndex + 1}`,
          Subcategory: 'Ending_Balance',
          Sub_Sub_Category: invAccount.accountType || null,
          Value_Type: 'Balance',
          Value_Nominal: invEnding.toFixed(2),
          Value_PV: ((inv.marketValue || invEnding) / discountFactor).toFixed(2),
          Inflation_Multiplier: inflationMultiplier.toFixed(5),
          Growth_Multiplier: growthMultiplier.toFixed(5),
          Growth_Type: 'Investment_Return',
          Notes: 'Market value'
        })

        // Ending balance - Cost Basis (December)
        rows.push({
          Year: year,
          Month: 12,
          Module: 'Investments',
          Primary_Category: invAccount.name || `Investment_${invIndex + 1}`,
          Subcategory: 'Ending_Balance_Cost_Basis',
          Sub_Sub_Category: invAccount.accountType || null,
          Value_Type: 'Balance',
          Value_Nominal: costBasisEnding.toFixed(2),
          Value_PV: (costBasisEnding / discountFactor).toFixed(2),
          Inflation_Multiplier: inflationMultiplier.toFixed(5),
          Growth_Multiplier: 'N/A',
          Growth_Type: 'N/A',
          Notes: 'Original cost of holdings'
        })

        // Ending balance - Capital Gains (December)
        rows.push({
          Year: year,
          Month: 12,
          Module: 'Investments',
          Primary_Category: invAccount.name || `Investment_${invIndex + 1}`,
          Subcategory: 'Ending_Unrealized_Gains',
          Sub_Sub_Category: invAccount.accountType || null,
          Value_Type: 'Balance',
          Value_Nominal: capitalGainsEnding.toFixed(2),
          Value_PV: (capitalGainsEnding / discountFactor).toFixed(2),
          Inflation_Multiplier: inflationMultiplier.toFixed(5),
          Growth_Multiplier: 'N/A',
          Growth_Type: 'N/A',
          Notes: 'Market value - cost basis'
        })
      })
    }

    // ===== 401k ACCOUNT =====
    const prev401k = prevProjection?.retirement401kValue || investmentsData.retirement401k?.currentValue || 0
    const ending401k = projection.retirement401kValue || 0
    const individual401k = projection.totalIndividual401k || 0

    // Get company 401k from income projections (now grows with income)
    const janIndex = (year - 1) * 12
    const incomeProjection = incomeData?.projections?.[janIndex] || {}
    const company401kAnnual = (incomeProjection.company401kNominal || 0) * 12

    const returns401k = ending401k - prev401k - individual401k - company401kAnnual

    // Track cost basis for 401k (sum of contributions, no growth)
    const costBasisBeginning401k = costBasis401k
    costBasis401k += individual401k + company401kAnnual  // Accumulate contributions
    const costBasisEnding401k = costBasis401k

    // Capital gains = market value - cost basis
    const capitalGainsBeginning401k = prev401k - costBasisBeginning401k
    const capitalGainsEnding401k = ending401k - costBasisEnding401k

    const growthRate401k = investmentsData.retirement401k?.growthRate || 0
    const growthMultiplier401k = Math.pow(1 + growthRate401k / 100, year)

    // Beginning balance - Market Value (January)
    rows.push({
      Year: year,
      Month: 1,
      Module: 'Investments',
      Primary_Category: '401k',
      Subcategory: 'Beginning_Balance',
      Sub_Sub_Category: 'Tax_Deferred',
      Value_Type: 'Balance',
      Value_Nominal: prev401k.toFixed(2),
      Value_PV: (prev401k / discountFactor).toFixed(2),
      Inflation_Multiplier: inflationMultiplier.toFixed(5),
      Growth_Multiplier: growthMultiplier401k.toFixed(5),
      Growth_Type: 'Investment_Return',
      Notes: 'Market value'
    })

    // Beginning balance - Cost Basis (January)
    rows.push({
      Year: year,
      Month: 1,
      Module: 'Investments',
      Primary_Category: '401k',
      Subcategory: 'Beginning_Balance_Cost_Basis',
      Sub_Sub_Category: 'Tax_Deferred',
      Value_Type: 'Balance',
      Value_Nominal: costBasisBeginning401k.toFixed(2),
      Value_PV: (costBasisBeginning401k / discountFactor).toFixed(2),
      Inflation_Multiplier: inflationMultiplier.toFixed(5),
      Growth_Multiplier: 'N/A',
      Growth_Type: 'N/A',
      Notes: 'Sum of all contributions'
    })

    // Beginning balance - Unrealized Gains (January)
    rows.push({
      Year: year,
      Month: 1,
      Module: 'Investments',
      Primary_Category: '401k',
      Subcategory: 'Beginning_Unrealized_Gains',
      Sub_Sub_Category: 'Tax_Deferred',
      Value_Type: 'Balance',
      Value_Nominal: capitalGainsBeginning401k.toFixed(2),
      Value_PV: (capitalGainsBeginning401k / discountFactor).toFixed(2),
      Inflation_Multiplier: inflationMultiplier.toFixed(5),
      Growth_Multiplier: 'N/A',
      Growth_Type: 'N/A',
      Notes: 'Market value - cost basis'
    })

    // Individual contributions (monthly)
    const monthlyIndividual401k = individual401k / 12
    for (let month = 1; month <= 12; month++) {
      rows.push({
        Year: year,
        Month: month,
        Module: 'Investments',
        Primary_Category: '401k',
        Subcategory: 'Individual_Contribution',
        Sub_Sub_Category: 'Tax_Deferred',
        Value_Type: 'Flow',
        Value_Nominal: monthlyIndividual401k.toFixed(2),
        Value_PV: (monthlyIndividual401k / discountFactor).toFixed(2),
        Inflation_Multiplier: inflationMultiplier.toFixed(5),
        Growth_Multiplier: 'N/A',
        Growth_Type: 'N/A',
        Notes: 'Employee pretax deferral'
      })
    }

    // Company contributions (monthly)
    const monthlyCompany401k = company401kAnnual / 12
    for (let month = 1; month <= 12; month++) {
      rows.push({
        Year: year,
        Month: month,
        Module: 'Investments',
        Primary_Category: '401k',
        Subcategory: 'Company_Contribution',
        Sub_Sub_Category: 'Tax_Deferred',
        Value_Type: 'Flow',
        Value_Nominal: monthlyCompany401k.toFixed(2),
        Value_PV: (monthlyCompany401k / discountFactor).toFixed(2),
        Inflation_Multiplier: inflationMultiplier.toFixed(5),
        Growth_Multiplier: 'N/A',
        Growth_Type: 'N/A',
        Notes: 'Employer match'
      })
    }

    // Monthly balances (months 2-11) - linear interpolation
    const total401kContributions = individual401k + company401kAnnual
    for (let month = 2; month <= 11; month++) {
      const progressiveContribution = (month - 1) / 12 * total401kContributions
      const monthlyMarketValue = prev401k + progressiveContribution
      const monthlyContributionToCostBasis = (month - 1) / 12 * total401kContributions
      const monthlyCostBasis = costBasisBeginning401k + monthlyContributionToCostBasis
      const monthlyCapitalGains = monthlyMarketValue - monthlyCostBasis

      // Market value balance
      rows.push({
        Year: year,
        Month: month,
        Module: 'Investments',
        Primary_Category: '401k',
        Subcategory: 'Balance',
        Sub_Sub_Category: 'Tax_Deferred',
        Value_Type: 'Balance',
        Value_Nominal: monthlyMarketValue.toFixed(2),
        Value_PV: (monthlyMarketValue / discountFactor).toFixed(2),
        Inflation_Multiplier: inflationMultiplier.toFixed(5),
        Growth_Multiplier: 'N/A',
        Growth_Type: 'N/A',
        Notes: 'Linear interpolation (contributions only, growth at year-end)'
      })

      // Cost basis balance
      rows.push({
        Year: year,
        Month: month,
        Module: 'Investments',
        Primary_Category: '401k',
        Subcategory: 'Balance_Cost_Basis',
        Sub_Sub_Category: 'Tax_Deferred',
        Value_Type: 'Balance',
        Value_Nominal: monthlyCostBasis.toFixed(2),
        Value_PV: (monthlyCostBasis / discountFactor).toFixed(2),
        Inflation_Multiplier: inflationMultiplier.toFixed(5),
        Growth_Multiplier: 'N/A',
        Growth_Type: 'N/A',
        Notes: 'Linear interpolation of contributions'
      })

      // Unrealized gains balance
      rows.push({
        Year: year,
        Month: month,
        Module: 'Investments',
        Primary_Category: '401k',
        Subcategory: 'Unrealized_Gains',
        Sub_Sub_Category: 'Tax_Deferred',
        Value_Type: 'Balance',
        Value_Nominal: monthlyCapitalGains.toFixed(2),
        Value_PV: (monthlyCapitalGains / discountFactor).toFixed(2),
        Inflation_Multiplier: inflationMultiplier.toFixed(5),
        Growth_Multiplier: 'N/A',
        Growth_Type: 'N/A',
        Notes: 'Market value - cost basis (no growth until year-end)'
      })
    }

    // Investment returns (December only)
    rows.push({
      Year: year,
      Month: 12,
      Module: 'Investments',
      Primary_Category: '401k',
      Subcategory: 'Investment_Returns',
      Sub_Sub_Category: 'Tax_Deferred',
      Value_Type: 'Flow',
      Value_Nominal: returns401k.toFixed(2),
      Value_PV: (returns401k / discountFactor).toFixed(2),
      Inflation_Multiplier: inflationMultiplier.toFixed(5),
      Growth_Multiplier: growthMultiplier401k.toFixed(5),
      Growth_Type: 'Investment_Return',
      Notes: 'Applied at year-end'
    })

    // Ending balance - Market Value (December)
    rows.push({
      Year: year,
      Month: 12,
      Module: 'Investments',
      Primary_Category: '401k',
      Subcategory: 'Ending_Balance',
      Sub_Sub_Category: 'Tax_Deferred',
      Value_Type: 'Balance',
      Value_Nominal: ending401k.toFixed(2),
      Value_PV: (projection.retirement401kValuePV || ending401k / discountFactor).toFixed(2),
      Inflation_Multiplier: inflationMultiplier.toFixed(5),
      Growth_Multiplier: growthMultiplier401k.toFixed(5),
      Growth_Type: 'Investment_Return',
      Notes: 'Market value'
    })

    // Ending balance - Cost Basis (December)
    rows.push({
      Year: year,
      Month: 12,
      Module: 'Investments',
      Primary_Category: '401k',
      Subcategory: 'Ending_Balance_Cost_Basis',
      Sub_Sub_Category: 'Tax_Deferred',
      Value_Type: 'Balance',
      Value_Nominal: costBasisEnding401k.toFixed(2),
      Value_PV: (costBasisEnding401k / discountFactor).toFixed(2),
      Inflation_Multiplier: inflationMultiplier.toFixed(5),
      Growth_Multiplier: 'N/A',
      Growth_Type: 'N/A',
      Notes: 'Sum of all contributions'
    })

    // Ending balance - Unrealized Gains (December)
    rows.push({
      Year: year,
      Month: 12,
      Module: 'Investments',
      Primary_Category: '401k',
      Subcategory: 'Ending_Unrealized_Gains',
      Sub_Sub_Category: 'Tax_Deferred',
      Value_Type: 'Balance',
      Value_Nominal: capitalGainsEnding401k.toFixed(2),
      Value_PV: (capitalGainsEnding401k / discountFactor).toFixed(2),
      Inflation_Multiplier: inflationMultiplier.toFixed(5),
      Growth_Multiplier: 'N/A',
      Growth_Type: 'N/A',
      Notes: 'Market value - cost basis'
    })
  })

  console.log(`Investments Transformer: Generated ${rows.length} rows`)
  return rows
}
