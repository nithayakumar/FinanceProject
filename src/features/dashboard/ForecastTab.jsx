import { useState, useMemo, useEffect } from 'react'

function ForecastTab({ data }) {
  const { gapProjections, profile } = data
  const projections = gapProjections?.projections || []

  // State for year slider
  const [selectedYear, setSelectedYear] = useState(1)
  const [viewMode, setViewMode] = useState('pv') // 'pv' (Today's Dollars) or 'nominal' (Future Dollars)

  // State for impact analysis
  const [incomeAdjustment, setIncomeAdjustment] = useState(0) // -50% to +50%
  const [expenseAdjustment, setExpenseAdjustment] = useState(0) // -50% to +50%

  // State for sensitivity analysis
  const [sensitivityGrowthRate, setSensitivityGrowthRate] = useState(7) // 0% to 15%
  const [sensitivityInflation, setSensitivityInflation] = useState(profile?.inflationRate || 2.7) // 0% to 8%

  // State for life planner
  const [lifeEvents, setLifeEvents] = useState([])

  // State for monthly retirement spend
  const [monthlyRetirementSpend, setMonthlyRetirementSpend] = useState('')

  // Life event templates
  const lifeEventTemplates = {
    child: { name: 'Have a Child', expenseImpact: 15000, incomeImpact: 0, duration: 18, icon: '👶' },
    partner: { name: 'Add Partner', expenseImpact: 10000, incomeImpact: 50000, duration: 0, icon: '💑' },
    losePartner: { name: 'Lose Partner Income', expenseImpact: -5000, incomeImpact: -50000, duration: 0, icon: '💔' },
    tuition: { name: 'College Tuition', expenseImpact: 40000, incomeImpact: 0, duration: 4, icon: '🎓' },
    wedding: { name: 'Wedding', expenseImpact: 30000, incomeImpact: 0, duration: 1, icon: '💒' },
    relocation: { name: 'Relocate (Higher COL)', expenseImpact: 12000, incomeImpact: 20000, duration: 0, icon: '🏠' },
    relocationLow: { name: 'Relocate (Lower COL)', expenseImpact: -15000, incomeImpact: -10000, duration: 0, icon: '🏡' },
    careerBreak: { name: 'Career Break', expenseImpact: 0, incomeImpact: -80000, duration: 1, icon: '🏖️' },
  }

  const addLifeEvent = (templateKey) => {
    const template = lifeEventTemplates[templateKey]
    const newEvent = {
      id: Date.now(),
      ...template,
      startYear: 5, // Default to year 5
    }
    setLifeEvents([...lifeEvents, newEvent])
  }

  const updateLifeEvent = (id, field, value) => {
    setLifeEvents(lifeEvents.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  const removeLifeEvent = (id) => {
    setLifeEvents(lifeEvents.filter(e => e.id !== id))
  }
  const currentAge = profile?.age || 30
  const retirementAge = profile?.retirementAge || 65
  const inflationRate = (profile?.inflationRate || 2.7) / 100
  const maxYear = projections.length || 30

  // Calculate default monthly spend from last year before retirement (in today's dollars)
  const defaultMonthlySpend = useMemo(() => {
    const yearsToRetirement = retirementAge - currentAge
    const retirementYearIndex = Math.min(yearsToRetirement - 1, projections.length - 1)
    if (retirementYearIndex >= 0 && projections[retirementYearIndex]) {
      // Use annualExpensesPV (present value / today's dollars)
      const expensesPV = projections[retirementYearIndex].annualExpensesPV ||
        (projections[retirementYearIndex].annualExpenses / Math.pow(1 + inflationRate, retirementYearIndex + 1))
      return Math.round(expensesPV / 12)
    }
    return 5000 // Fallback default
  }, [projections, retirementAge, currentAge, inflationRate])

  // Set default monthly spend on mount or when it changes
  useEffect(() => {
    if (!monthlyRetirementSpend && defaultMonthlySpend) {
      setMonthlyRetirementSpend(defaultMonthlySpend.toString())
    }
  }, [defaultMonthlySpend, monthlyRetirementSpend])

  // Calculate metrics for selected year (with adjustments applied)
  const yearMetrics = useMemo(() => {
    if (!projections.length || selectedYear < 1 || selectedYear > projections.length) return null

    const yearIndex = selectedYear - 1
    const p = projections[yearIndex]
    const prevP = yearIndex > 0 ? projections[yearIndex - 1] : null

    // Apply income and expense adjustments
    const incomeMultiplier = 1 + (incomeAdjustment / 100)
    const expenseMultiplier = 1 + (expenseAdjustment / 100)

    // Use global sensitivity sliders
    const growthRate = sensitivityGrowthRate / 100
    const adjInflationRate = sensitivityInflation / 100

    // Check if any adjustments are active
    const noAdjustments = incomeAdjustment === 0 && expenseAdjustment === 0 &&
      sensitivityGrowthRate === 7 && sensitivityInflation === (profile?.inflationRate || 2.7)

    // Adjusted values
    const adjustedIncome = p.grossIncome * incomeMultiplier
    const adjustedIncomePV = p.grossIncomePV * incomeMultiplier
    const adjustedExpenses = p.annualExpenses * expenseMultiplier
    const adjustedTaxes = p.annualTaxes * incomeMultiplier // Taxes scale with income
    const adjustedGap = adjustedIncome - adjustedTaxes - adjustedExpenses - (p.totalIndividual401k * incomeMultiplier)

    // Savings Rate = Gap / Gross Income
    const savingsRate = adjustedIncome > 0 ? (adjustedGap / adjustedIncome) * 100 : 0

    // Tax %
    const taxRate = adjustedIncome > 0 ? (adjustedTaxes / adjustedIncome) * 100 : 0

    // Simulate adjusted net worth for this year
    // Start from year 1 and compound with adjusted gap
    let adjustedNetWorth = projections[0].netWorth
    for (let i = 1; i <= yearIndex; i++) {
      const yearP = projections[i]
      const yearAdjustedGap = (yearP.grossIncome * incomeMultiplier) -
        (yearP.annualTaxes * incomeMultiplier) -
        (yearP.annualExpenses * expenseMultiplier) -
        (yearP.totalIndividual401k * incomeMultiplier)
      adjustedNetWorth = adjustedNetWorth * (1 + growthRate) + yearAdjustedGap
    }

    // Calculate adjusted net worth PV using sensitivity inflation
    const discountFactor = Math.pow(1 + adjInflationRate, yearIndex)
    const adjustedNetWorthPV = adjustedNetWorth / discountFactor

    // % of Net Worth Growth from Investment Growth (vs contributions)
    let netWorthChange = 0
    let netWorthChangePV = 0
    let investmentGrowth = 0
    let contributions = 0
    let growthPercent = 0

    if (prevP) {
      netWorthChange = p.netWorth - prevP.netWorth
      netWorthChangePV = p.netWorthPV - prevP.netWorthPV
      const investmentMarketGrowth = (p.totalInvestmentValue - prevP.totalInvestmentValue) - p.investedThisYear
      const ret401kGrowth = (p.retirement401kValue - prevP.retirement401kValue) - p.totalIndividual401k - p.annualCompany401k
      investmentGrowth = investmentMarketGrowth + ret401kGrowth
      contributions = p.cashContribution + p.investedThisYear + p.totalIndividual401k + p.annualCompany401k
      if (netWorthChange > 0) {
        growthPercent = (investmentGrowth / netWorthChange) * 100
      }
    } else {
      netWorthChange = p.netWorth
      netWorthChangePV = p.netWorthPV
      contributions = p.cashContribution + p.investedThisYear + p.totalIndividual401k + p.annualCompany401k
      investmentGrowth = netWorthChange - contributions
      if (netWorthChange > 0) {
        growthPercent = (investmentGrowth / netWorthChange) * 100
      }
    }

    return {
      savingsRate,
      incomeNominal: adjustedIncome,
      incomePV: adjustedIncomePV,
      taxRate,
      netWorthChange,
      netWorthChangePV,
      investmentGrowth,
      contributions,
      growthPercent,
      gap: adjustedGap,
      expenses: adjustedExpenses,
      taxes: adjustedTaxes,
      netWorth: noAdjustments ? p.netWorth : adjustedNetWorth,
      netWorthPV: noAdjustments ? p.netWorthPV : adjustedNetWorthPV
    }
  }, [projections, selectedYear, incomeAdjustment, expenseAdjustment, sensitivityGrowthRate, sensitivityInflation, profile])

  // Calculate FIRE metrics (uses global sensitivity sliders)
  const fireMetrics = useMemo(() => {
    if (!projections.length) return null

    // Use global sensitivity sliders
    const growthRate = sensitivityGrowthRate / 100
    const adjInflationRate = sensitivityInflation / 100
    const incomeMultiplier = 1 + (incomeAdjustment / 100)
    const expenseMultiplier = 1 + (expenseAdjustment / 100)

    const currentYear = projections[0]

    // Year 1 values (adjusted)
    const year1GrossIncome = currentYear.grossIncome * incomeMultiplier
    const year1Expenses = currentYear.annualExpenses * expenseMultiplier
    const year1Taxes = currentYear.annualTaxes * incomeMultiplier
    const year1_401k = currentYear.totalIndividual401k * incomeMultiplier
    const year1Gap = year1GrossIncome - year1Taxes - year1Expenses - year1_401k
    const year1NetWorth = currentYear.netWorth

    // Savings Rate = Gap / Gross Income (what % of income you're saving)
    const savingsRate = year1GrossIncome > 0 ? (year1Gap / year1GrossIncome) * 100 : 0

    // Annual Retirement Spend - use user input if available, otherwise Year 1 expenses
    const annualRetirementSpend = monthlyRetirementSpend
      ? parseFloat(monthlyRetirementSpend) * 12
      : year1Expenses

    // FIRE Number = Annual Retirement Spend × 25 (4% safe withdrawal rate)
    const fireNumber = annualRetirementSpend * 25

    // Years to FIRE - use actual Gap projections instead of simplified simulation
    const yearsToRetirement = retirementAge - currentAge

    // Find first year where actual Net Worth >= inflation-adjusted FIRE Number
    let yearsToFire = null
    for (let i = 0; i < projections.length; i++) {
      const inflatedFireNumber = fireNumber * Math.pow(1 + adjInflationRate, i)
      if (projections[i].netWorth >= inflatedFireNumber) {
        yearsToFire = i + 1
        break
      }
    }

    // Coast FIRE Age - find when current investments can grow to cover retirement
    let coastFireAge = null
    for (let i = 0; i < Math.min(projections.length, yearsToRetirement); i++) {
      const yearNetWorth = projections[i].netWorth
      const yearsRemaining = yearsToRetirement - i
      if (yearsRemaining <= 0) break

      // Project current net worth forward at growth rate (no new contributions)
      const futureValue = yearNetWorth * Math.pow(1 + growthRate, yearsRemaining)
      const targetFireNumber = fireNumber * Math.pow(1 + adjInflationRate, yearsToRetirement)

      if (futureValue >= targetFireNumber) {
        coastFireAge = currentAge + i
        break
      }
    }

    // Net worth at retirement - use actual projection data instead of simplified simulation
    const retirementYearIndex = Math.min(yearsToRetirement - 1, projections.length - 1)
    const retirementProjection = projections[retirementYearIndex]
    const netWorthAtRetirement = retirementProjection?.netWorth || year1NetWorth
    const netWorthAtRetirementPV = retirementProjection?.netWorthPV || year1NetWorth

    return {
      savingsRate,
      fireNumber,
      annualRetirementSpend,
      yearsToFire,
      fireAge: yearsToFire ? currentAge + yearsToFire : null,
      coastFireAge,
      year1GrossIncome,
      year1Expenses,
      year1Gap,
      year1NetWorth,
      netWorthAtRetirement,
      netWorthAtRetirementPV
    }
  }, [projections, incomeAdjustment, expenseAdjustment, sensitivityGrowthRate, sensitivityInflation, currentAge, retirementAge, monthlyRetirementSpend])

  // Calculate impact analysis metrics
  const impactAnalysis = useMemo(() => {
    if (!projections.length || !fireMetrics) return null

    const incomeMultiplier = 1 + (incomeAdjustment / 100)
    const expenseMultiplier = 1 + (expenseAdjustment / 100)

    // Use sensitivity sliders for growth and inflation
    const adjGrowthRate = sensitivityGrowthRate / 100
    const adjInflationRate = sensitivityInflation / 100

    // Adjusted Year 1 values
    const adjustedIncome = fireMetrics.year1GrossIncome * incomeMultiplier
    const adjustedExpenses = fireMetrics.year1Expenses * expenseMultiplier

    // Estimate adjusted gap (simplified - assumes taxes scale proportionally)
    const taxRate = fireMetrics.year1GrossIncome > 0
      ? (projections[0].annualTaxes / fireMetrics.year1GrossIncome)
      : 0.3
    const adjustedTaxes = adjustedIncome * taxRate
    const adjusted401k = projections[0].totalIndividual401k * incomeMultiplier
    const adjustedGap = adjustedIncome - adjusted401k - adjustedTaxes - adjustedExpenses

    // Adjusted savings rate
    const adjustedSavingsRate = adjustedIncome > 0 ? (adjustedGap / adjustedIncome) * 100 : 0

    // Annual Retirement Spend - use user input if available, otherwise adjusted expenses
    const annualRetirementSpend = monthlyRetirementSpend
      ? parseFloat(monthlyRetirementSpend) * 12
      : adjustedExpenses

    // Adjusted FIRE number (based on retirement spending goal)
    const adjustedFireNumber = annualRetirementSpend * 25

    // If no adjustments, use actual values from fireMetrics
    const noAdjustments = incomeAdjustment === 0 && expenseAdjustment === 0 &&
      sensitivityGrowthRate === 7 && sensitivityInflation === (profile?.inflationRate || 2.7)

    let adjustedYearsToFire = null
    let adjustedCoastFireAge = null

    // Calculate net worth at retirement
    const yearsToRetirement = retirementAge - currentAge
    let netWorthAtRetirement = fireMetrics.year1NetWorth
    for (let i = 0; i < yearsToRetirement; i++) {
      netWorthAtRetirement = netWorthAtRetirement * (1 + adjGrowthRate) + adjustedGap
    }
    // Calculate present value (today's dollars)
    const netWorthAtRetirementPV = netWorthAtRetirement / Math.pow(1 + adjInflationRate, yearsToRetirement)

    // Baseline net worth at retirement (7% growth, profile inflation)
    let baselineNetWorthAtRetirement = fireMetrics.year1NetWorth
    for (let i = 0; i < yearsToRetirement; i++) {
      baselineNetWorthAtRetirement = baselineNetWorthAtRetirement * 1.07 + fireMetrics.year1Gap
    }
    const baselineNetWorthAtRetirementPV = baselineNetWorthAtRetirement / Math.pow(1 + inflationRate, yearsToRetirement)

    if (noAdjustments) {
      // Use actual values from fireMetrics when no adjustments
      adjustedYearsToFire = fireMetrics.yearsToFire
      adjustedCoastFireAge = fireMetrics.coastFireAge
    } else {
      // Simulate years to FIRE with adjusted values
      let simulatedNetWorth = fireMetrics.year1NetWorth
      const annualSavings = adjustedGap

      for (let year = 1; year <= 100; year++) {
        const inflatedFireNumber = adjustedFireNumber * Math.pow(1 + adjInflationRate, year - 1)

        if (simulatedNetWorth >= inflatedFireNumber) {
          adjustedYearsToFire = year
          break
        }

        simulatedNetWorth = simulatedNetWorth * (1 + adjGrowthRate) + annualSavings
      }

      // Calculate Coast FIRE age with adjusted values
      for (let i = 0; i < Math.min(projections.length, yearsToRetirement); i++) {
        let simNetWorth = fireMetrics.year1NetWorth
        for (let j = 0; j < i; j++) {
          simNetWorth = simNetWorth * (1 + adjGrowthRate) + annualSavings
        }

        const yearsRemaining = yearsToRetirement - i
        if (yearsRemaining <= 0) break

        const futureValue = simNetWorth * Math.pow(1 + adjGrowthRate, yearsRemaining)
        const targetFireNumber = adjustedFireNumber * Math.pow(1 + adjInflationRate, yearsToRetirement)

        if (futureValue >= targetFireNumber) {
          adjustedCoastFireAge = currentAge + i
          break
        }
      }
    }

    // Calculate changes
    const savingsRateChange = adjustedSavingsRate - fireMetrics.savingsRate
    const fireNumberChange = adjustedFireNumber - fireMetrics.fireNumber
    const yearsToFireChange = adjustedYearsToFire && fireMetrics.yearsToFire
      ? adjustedYearsToFire - fireMetrics.yearsToFire
      : null
    const coastFireAgeChange = adjustedCoastFireAge && fireMetrics.coastFireAge
      ? adjustedCoastFireAge - fireMetrics.coastFireAge
      : null
    const netWorthAtRetirementChange = netWorthAtRetirement - baselineNetWorthAtRetirement
    const netWorthAtRetirementPVChange = netWorthAtRetirementPV - baselineNetWorthAtRetirementPV

    return {
      // Baseline
      baselineIncome: fireMetrics.year1GrossIncome,
      baselineExpenses: fireMetrics.year1Expenses,
      baselineSavingsRate: fireMetrics.savingsRate,
      baselineFireNumber: fireMetrics.fireNumber,
      baselineYearsToFire: fireMetrics.yearsToFire,
      baselineCoastFireAge: fireMetrics.coastFireAge,
      baselineNetWorthAtRetirement,
      baselineNetWorthAtRetirementPV,

      // Adjusted
      adjustedIncome,
      adjustedExpenses,
      adjustedSavingsRate,
      adjustedFireNumber,
      adjustedYearsToFire,
      adjustedCoastFireAge,
      netWorthAtRetirement,
      netWorthAtRetirementPV,

      // Changes
      savingsRateChange,
      fireNumberChange,
      yearsToFireChange,
      coastFireAgeChange,
      netWorthAtRetirementChange,
      netWorthAtRetirementPVChange,

      // Real return for display
      realReturn: adjGrowthRate - adjInflationRate
    }
  }, [projections, fireMetrics, incomeAdjustment, expenseAdjustment, sensitivityGrowthRate, sensitivityInflation, inflationRate, currentAge, retirementAge, profile, monthlyRetirementSpend])

  // Calculate life planner impact
  const lifePlannerImpact = useMemo(() => {
    if (!projections.length || !fireMetrics || lifeEvents.length === 0) return null

    // Use global sensitivity sliders
    const growthRate = sensitivityGrowthRate / 100
    const adjInflationRate = sensitivityInflation / 100

    const yearsToRetirement = retirementAge - currentAge
    const retirementYearIndex = Math.min(yearsToRetirement - 1, projections.length - 1)

    // Use actual Gap projections for baseline (not simplified simulation)
    const baselineNetWorth = projections[retirementYearIndex]?.netWorth || projections[0].netWorth

    // Simulate with life events - apply deltas to actual yearly gap values
    let adjustedNetWorth = projections[0].netWorth
    let totalExtraExpenses = 0
    let totalExtraIncome = 0

    for (let year = 1; year <= yearsToRetirement; year++) {
      const yearIndex = year - 1
      const yearProjection = projections[yearIndex] || projections[projections.length - 1]

      // Calculate impact for this year from all events
      let yearlyExpenseImpact = 0
      let yearlyIncomeImpact = 0

      lifeEvents.forEach(event => {
        const eventEndYear = event.duration > 0 ? event.startYear + event.duration - 1 : yearsToRetirement

        if (year >= event.startYear && year <= eventEndYear) {
          yearlyExpenseImpact += event.expenseImpact
          yearlyIncomeImpact += event.incomeImpact
        }
      })

      totalExtraExpenses += yearlyExpenseImpact
      totalExtraIncome += yearlyIncomeImpact

      // Use actual gap from projections, adjusted for life events
      const baseGap = yearProjection.gap
      const adjustedGap = baseGap + yearlyIncomeImpact - yearlyExpenseImpact
      adjustedNetWorth = adjustedNetWorth * (1 + growthRate) + adjustedGap
    }

    // Calculate years to FIRE with life events - use actual projections as base
    let adjustedYearsToFire = null
    let simNetWorth = projections[0].netWorth
    for (let year = 1; year <= Math.min(100, projections.length); year++) {
      const yearIndex = year - 1
      const yearProjection = projections[yearIndex] || projections[projections.length - 1]

      // Calculate impact for this year
      let yearlyExpenseImpact = 0
      let yearlyIncomeImpact = 0

      lifeEvents.forEach(event => {
        const eventEndYear = event.duration > 0 ? event.startYear + event.duration - 1 : 100

        if (year >= event.startYear && year <= eventEndYear) {
          yearlyExpenseImpact += event.expenseImpact
          yearlyIncomeImpact += event.incomeImpact
        }
      })

      const baseGap = yearProjection.gap
      const adjustedGap = baseGap + yearlyIncomeImpact - yearlyExpenseImpact
      const inflatedFireNumber = fireMetrics.fireNumber * Math.pow(1 + adjInflationRate, year - 1)

      if (simNetWorth >= inflatedFireNumber) {
        adjustedYearsToFire = year
        break
      }

      simNetWorth = simNetWorth * (1 + growthRate) + adjustedGap
    }

    const netWorthChange = adjustedNetWorth - baselineNetWorth
    const yearsToFireChange = adjustedYearsToFire && fireMetrics.yearsToFire
      ? adjustedYearsToFire - fireMetrics.yearsToFire
      : null

    return {
      baselineNetWorth,
      adjustedNetWorth,
      netWorthChange,
      baselineYearsToFire: fireMetrics.yearsToFire,
      adjustedYearsToFire,
      yearsToFireChange,
      totalExtraExpenses,
      totalExtraIncome,
      eventCount: lifeEvents.length
    }
  }, [projections, fireMetrics, lifeEvents, sensitivityGrowthRate, sensitivityInflation, currentAge, retirementAge, monthlyRetirementSpend])

  // Calculate monthly spend metrics (withdrawal duration and rate)
  const monthlySpendMetrics = useMemo(() => {
    if (!fireMetrics || !monthlyRetirementSpend) return null

    const monthlySpend = parseFloat(monthlyRetirementSpend)
    if (isNaN(monthlySpend) || monthlySpend <= 0) return null

    const annualWithdrawal = monthlySpend * 12

    // Use global sensitivity sliders for retirement growth (typically lower than accumulation)
    const retirementGrowthRate = sensitivityGrowthRate / 100
    const adjInflationRate = sensitivityInflation / 100

    const netWorthAtRetirement = fireMetrics.netWorthAtRetirement

    // Return null for invalid net worth scenarios
    if (!netWorthAtRetirement || netWorthAtRetirement <= 0) return null

    // Simple calculation: years = net worth / withdrawal (no growth)
    const simpleYears = netWorthAtRetirement / annualWithdrawal

    // With growth calculation: simulate year by year
    let currentNetWorth = netWorthAtRetirement
    let yearsWithGrowth = 0
    const maxYears = 100

    while (currentNetWorth > 0 && yearsWithGrowth < maxYears) {
      // Apply growth first, then withdraw
      currentNetWorth = currentNetWorth * (1 + retirementGrowthRate) - annualWithdrawal
      yearsWithGrowth++
    }

    if (currentNetWorth > 0) {
      yearsWithGrowth = Infinity // Money never runs out
    }

    // Calculate safe withdrawal rate (what % is the withdrawal of net worth)
    const withdrawalRate = (annualWithdrawal / netWorthAtRetirement) * 100

    // Calculate max sustainable withdrawal (4% rule)
    const sustainableWithdrawal = netWorthAtRetirement * 0.04

    // Format withdrawal term
    const withdrawalTerm = yearsWithGrowth === Infinity ? 'Funds last forever' : `Funds last ${Math.round(yearsWithGrowth)} years`

    return {
      monthlySpend,
      annualWithdrawal,
      netWorthAtRetirement,
      simpleYears: Math.round(simpleYears),
      yearsWithGrowth: yearsWithGrowth === Infinity ? 'Forever' : Math.round(yearsWithGrowth),
      withdrawalRate,
      sustainableWithdrawal,
      isSustainable: withdrawalRate <= 4,
      withdrawalTerm
    }
  }, [fireMetrics, monthlyRetirementSpend, sensitivityGrowthRate, sensitivityInflation])

  // Calculate milestones
  const milestones = useMemo(() => {
    if (!projections.length) return []

    const currentAge = profile?.age || 30
    const targets = [100000, 250000, 500000, 750000, 1000000, 2000000, 5000000]
    const results = []

    for (const target of targets) {
      const yearIndex = projections.findIndex(p => p.netWorth >= target)
      if (yearIndex !== -1) {
        results.push({
          target,
          year: yearIndex + 1,
          age: currentAge + yearIndex,
          actualValue: projections[yearIndex].netWorth
        })
      } else {
        results.push({
          target,
          year: null,
          age: null,
          actualValue: null
        })
      }
    }

    return results
  }, [projections, profile])

  const fmt = (val) => `$${Math.round(val).toLocaleString()}`
  const fmtCompact = (val) => {
    const absVal = Math.abs(val)
    const sign = val < 0 ? '-' : ''
    if (absVal >= 1000000) return `${sign}$${(absVal / 1000000).toFixed(1)}M`
    if (absVal >= 1000) return `${sign}$${Math.round(absVal / 1000)}k`
    return `${sign}$${Math.round(absVal)}`
  }

  return (
    <div className="space-y-8">
      {/* Early Retirement Metrics Summary */}
      {fireMetrics && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🎯 Early Retirement Targets</h1>
              <p className="text-gray-500 text-sm mt-1">Plan your path to financial independence</p>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('pv')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'pv'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                Today's Dollars
              </button>
              <button
                onClick={() => setViewMode('nominal')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'nominal'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                Future Dollars
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Monthly Retired Spend (Today's Dollars) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-600">Monthly Retired Spend (Today's Dollars)</span>
                <span className="text-2xl">🧮</span>
              </div>
              <div className="relative mb-1.5">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={monthlyRetirementSpend}
                  onChange={(e) => setMonthlyRetirementSpend(e.target.value)}
                  placeholder="Monthly spend"
                  className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {monthlySpendMetrics ? (
                <>
                  <p className={`text-2xl font-bold ${monthlySpendMetrics.isSustainable ? 'text-green-600' : 'text-red-600'}`}>
                    {fmtCompact(monthlySpendMetrics.annualWithdrawal)} <span className="text-base">({monthlySpendMetrics.withdrawalRate.toFixed(1)}% annual)</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {monthlySpendMetrics.withdrawalTerm}
                  </p>
                </>
              ) : monthlyRetirementSpend && parseFloat(monthlyRetirementSpend) > 0 ? (
                <p className="text-xs text-gray-400 mt-1">
                  N/A — Net worth at retirement unavailable
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">
                  Enter your monthly retirement budget
                </p>
              )}
            </div>

            {/* Net Worth for Early Retirement */}
            {(() => {
              // Calculate FIRE number in both present and future dollars
              const yearsToRetirement = retirementAge - currentAge
              const fireNumberPV = fireMetrics.fireNumber // Already in today's dollars
              const fireNumberNominal = fireMetrics.fireNumber * Math.pow(1 + inflationRate, yearsToRetirement)
              const displayValue = viewMode === 'pv' ? fireNumberPV : fireNumberNominal
              const alternateValue = viewMode === 'pv' ? fireNumberNominal : fireNumberPV
              const alternateLabel = viewMode === 'pv' ? 'Future Dollars' : "Today's Dollars"

              return (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Net Worth for Early Retirement</span>
                    <span className="text-2xl">🎯</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-600">
                    {fmtCompact(displayValue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    25× annual expenses • {fmtCompact(alternateValue)} in {alternateLabel}
                  </p>
                </div>
              )
            })()}

            {/* Early Retirement Age */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Early Retirement Age</span>
                <span className="text-2xl">📅</span>
              </div>
              {fireMetrics.fireAge ? (
                <>
                  <p className="text-3xl font-bold text-green-600">
                    Age {fireMetrics.fireAge}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {fireMetrics.yearsToFire} years away
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-400">
                    {projections.length}+ years
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Beyond projection range
                  </p>
                </>
              )}
            </div>

            {/* Investments Cover Expenses */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Investments Cover Expenses</span>
                <span className="text-2xl">🏖️</span>
              </div>
              {fireMetrics.coastFireAge ? (
                <>
                  <p className="text-3xl font-bold text-teal-600">
                    Age {fireMetrics.coastFireAge}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {fireMetrics.coastFireAge - currentAge} years away
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-400">
                    Not reached
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Keep saving to hit coast FIRE
                  </p>
                </>
              )}
            </div>

            {/* Household Net Worth Percentile */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Household Net Worth Percentile</span>
                <span className="text-2xl">📊</span>
              </div>
              {(() => {
                const netWorthPV = fireMetrics.netWorthAtRetirementPV
                let percentile = 'Below Top 50%'
                let color = 'text-gray-600'
                if (netWorthPV >= 11600000) {
                  percentile = 'Top 1%'
                  color = 'text-purple-600'
                } else if (netWorthPV >= 2700000) {
                  percentile = 'Top 2%'
                  color = 'text-indigo-600'
                } else if (netWorthPV >= 1170000) {
                  percentile = 'Top 5%'
                  color = 'text-blue-600'
                } else if (netWorthPV >= 970900) {
                  percentile = 'Top 10%'
                  color = 'text-teal-600'
                } else if (netWorthPV >= 585000) {
                  percentile = 'Top 50%'
                  color = 'text-green-600'
                }
                return (
                  <>
                    <p className={`text-3xl font-bold ${color}`}>
                      {percentile}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {fmtCompact(netWorthPV)} at retirement
                    </p>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics with Year Slider */}
      {yearMetrics && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">📊 Your Current Trajectory by Year</h3>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Year {selectedYear}</span>
              <span className="text-gray-400 ml-2">(Age {currentAge + selectedYear - 1})</span>
            </div>
          </div>

          {/* Year Slider */}
          <div className="mb-4">
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500 w-12">Year 1</span>
              <input
                type="range"
                min="1"
                max={maxYear}
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-xs text-gray-500 w-16 text-right">Year {maxYear}</span>
            </div>
            <div className="flex justify-between mt-1 px-12">
              <span className="text-xs text-gray-400">Age {currentAge}</span>
              <span className="text-xs text-gray-400">Age {currentAge + maxYear - 1}</span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Savings Rate */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Savings Rate</span>
                <span className="text-lg">💰</span>
              </div>
              <p className={`text-2xl font-bold ${yearMetrics.savingsRate >= 50 ? 'text-green-600' : yearMetrics.savingsRate >= 25 ? 'text-blue-600' : yearMetrics.savingsRate >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                {yearMetrics.savingsRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {fmtCompact(yearMetrics.gap)} saved
              </p>
              <div className="mt-2 h-1.5 bg-gray-200 rounded-full">
                <div
                  className={`h-1.5 rounded-full ${yearMetrics.savingsRate >= 50 ? 'bg-green-500' : yearMetrics.savingsRate >= 25 ? 'bg-blue-500' : yearMetrics.savingsRate >= 0 ? 'bg-orange-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(Math.max(yearMetrics.savingsRate, 0), 100)}%` }}
                />
              </div>
            </div>

            {/* Income */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Income ({viewMode === 'pv' ? "Today's $" : "Future $"})
                </span>
                <span className="text-lg">💵</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {fmtCompact(viewMode === 'pv' ? yearMetrics.incomePV : yearMetrics.incomeNominal)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {viewMode === 'pv' ? 'Inflation-adjusted' : 'Nominal value'}
              </p>
            </div>

            {/* Net Worth */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Net Worth ({viewMode === 'pv' ? "Today's $" : "Future $"})
                </span>
                <span className="text-lg">💎</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">
                {fmtCompact(viewMode === 'pv' ? yearMetrics.netWorthPV : yearMetrics.netWorth)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {viewMode === 'pv' ? 'Inflation-adjusted' : 'Nominal value'}
              </p>
            </div>

            {/* Tax Rate */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tax Rate</span>
                <span className="text-lg">🏛️</span>
              </div>
              <p className={`text-2xl font-bold ${yearMetrics.taxRate < 25 ? 'text-green-600' : yearMetrics.taxRate < 35 ? 'text-orange-600' : 'text-red-600'}`}>
                {yearMetrics.taxRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {fmtCompact(yearMetrics.taxes)} in taxes
              </p>
            </div>

            {/* % Growth from Investments */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Growth from Investing</span>
                <span className="text-lg">📈</span>
              </div>
              <p className={`text-2xl font-bold ${yearMetrics.growthPercent >= 50 ? 'text-purple-600' : yearMetrics.growthPercent >= 25 ? 'text-blue-600' : 'text-gray-600'}`}>
                {yearMetrics.growthPercent.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {fmtCompact(yearMetrics.investmentGrowth)} from returns
              </p>
              <p className="text-xs text-gray-400">
                vs {fmtCompact(yearMetrics.contributions)} contributed
              </p>
            </div>

            {/* Early Retirement Progress */}
            {fireMetrics && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Early Retirement Progress</span>
                  <span className="text-lg">🚀</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {((yearMetrics.netWorth / fireMetrics.fireNumber) * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {fmtCompact(yearMetrics.netWorth)} of {fmtCompact(fireMetrics.fireNumber)}
                </p>
                <div className="mt-2 h-1.5 bg-gray-200 rounded-full">
                  <div
                    className="h-1.5 rounded-full bg-green-500"
                    style={{ width: `${Math.min((yearMetrics.netWorth / fireMetrics.fireNumber) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Summary Row */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center text-sm">
            <div className="text-gray-600">
              <span className="font-medium">Net Worth ({viewMode === 'pv' ? "Today's $" : "Future $"}):</span> {fmtCompact(viewMode === 'pv' ? yearMetrics.netWorthPV : yearMetrics.netWorth)}
            </div>
            <div className="text-gray-600">
              <span className="font-medium">YoY Change:</span>{' '}
              <span className={(viewMode === 'pv' ? yearMetrics.netWorthChangePV : yearMetrics.netWorthChange) >= 0 ? 'text-green-600' : 'text-red-600'}>
                {(viewMode === 'pv' ? yearMetrics.netWorthChangePV : yearMetrics.netWorthChange) >= 0 ? '+' : ''}{fmtCompact(viewMode === 'pv' ? yearMetrics.netWorthChangePV : yearMetrics.netWorthChange)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Life Events / What If */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">👨‍👩‍👧 Life Events / What If</h3>
          {lifeEvents.length > 0 && (
            <button
              onClick={() => setLifeEvents([])}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Clear all events
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Add life events to see how they impact your retirement timeline
        </p>

        {/* Event Templates */}
        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-3">Click to add a life event:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(lifeEventTemplates).map(([key, template]) => (
              <button
                key={key}
                onClick={() => addLifeEvent(key)}
                className={`px-3 py-2 text-xs rounded-lg border transition flex items-center gap-2 ${template.incomeImpact > 0 || template.expenseImpact < 0
                  ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                  : template.incomeImpact < 0 || template.expenseImpact > 0
                    ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <span>{template.icon}</span>
                <span>{template.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Events */}
        {lifeEvents.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Your Life Events</h4>
            <div className="space-y-3">
              {lifeEvents.map((event) => (
                <div key={event.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{event.icon}</span>
                      <span className="font-medium text-gray-800">{event.name}</span>
                    </div>
                    <button
                      onClick={() => removeLifeEvent(event.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {/* Start Year */}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Start Year</label>
                      <input
                        type="number"
                        min="1"
                        max={maxYear}
                        value={event.startYear}
                        onChange={(e) => updateLifeEvent(event.id, 'startYear', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Duration (years)</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={event.duration}
                        onChange={(e) => updateLifeEvent(event.id, 'duration', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <p className="text-xs text-gray-400 mt-1">{event.duration === 0 ? 'Permanent' : `${event.duration} years`}</p>
                    </div>

                    {/* Expense Impact */}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Annual Expense</label>
                      <input
                        type="number"
                        value={event.expenseImpact}
                        onChange={(e) => updateLifeEvent(event.id, 'expenseImpact', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <p className={`text-xs mt-1 ${event.expenseImpact > 0 ? 'text-red-600' : event.expenseImpact < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {event.expenseImpact > 0 ? '+' : ''}{fmtCompact(event.expenseImpact)}/yr
                      </p>
                    </div>

                    {/* Income Impact */}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Annual Income</label>
                      <input
                        type="number"
                        value={event.incomeImpact}
                        onChange={(e) => updateLifeEvent(event.id, 'incomeImpact', Number(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <p className={`text-xs mt-1 ${event.incomeImpact > 0 ? 'text-green-600' : event.incomeImpact < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {event.incomeImpact > 0 ? '+' : ''}{fmtCompact(event.incomeImpact)}/yr
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Impact Summary */}
        {lifePlannerImpact && (
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">Impact Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Net Worth at Retirement</p>
                <p className="text-xl font-bold text-gray-800">{fmtCompact(lifePlannerImpact.adjustedNetWorth)}</p>
                <p className={`text-sm font-medium ${lifePlannerImpact.netWorthChange > 0 ? 'text-green-600' : lifePlannerImpact.netWorthChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {lifePlannerImpact.netWorthChange > 0 ? '+' : ''}{fmtCompact(lifePlannerImpact.netWorthChange)}
                </p>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Years to FIRE</p>
                <p className="text-xl font-bold text-gray-800">
                  {lifePlannerImpact.adjustedYearsToFire ? `${lifePlannerImpact.adjustedYearsToFire} yrs` : '—'}
                </p>
                {lifePlannerImpact.yearsToFireChange !== null && (
                  <p className={`text-sm font-medium ${lifePlannerImpact.yearsToFireChange < 0 ? 'text-green-600' : lifePlannerImpact.yearsToFireChange > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {lifePlannerImpact.yearsToFireChange > 0 ? '+' : ''}{lifePlannerImpact.yearsToFireChange} yrs
                  </p>
                )}
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Extra Expenses</p>
                <p className={`text-xl font-bold ${lifePlannerImpact.totalExtraExpenses > 0 ? 'text-red-600' : lifePlannerImpact.totalExtraExpenses < 0 ? 'text-green-600' : 'text-gray-800'}`}>
                  {fmtCompact(Math.abs(lifePlannerImpact.totalExtraExpenses))}
                </p>
                <p className="text-xs text-gray-500">over career</p>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Extra Income</p>
                <p className={`text-xl font-bold ${lifePlannerImpact.totalExtraIncome > 0 ? 'text-green-600' : lifePlannerImpact.totalExtraIncome < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  {fmtCompact(Math.abs(lifePlannerImpact.totalExtraIncome))}
                </p>
                <p className="text-xs text-gray-500">over career</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {lifeEvents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-sm">No life events added yet</p>
            <p className="text-xs text-gray-400 mt-1">Click the buttons above to plan your future</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ForecastTab
