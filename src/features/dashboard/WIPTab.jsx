import { useState, useMemo } from 'react'

function WIPTab({ data }) {
  const { gapProjections, profile } = data
  const projections = gapProjections?.projections || []

  // State for year slider
  const [selectedYear, setSelectedYear] = useState(1)

  // State for impact analysis
  const [incomeAdjustment, setIncomeAdjustment] = useState(0) // -50% to +50%
  const [expenseAdjustment, setExpenseAdjustment] = useState(0) // -50% to +50%

  // State for sensitivity analysis
  const [sensitivityGrowthRate, setSensitivityGrowthRate] = useState(7) // 0% to 15%
  const [sensitivityInflation, setSensitivityInflation] = useState(profile?.inflationRate || 2.7) // 0% to 8%

  // State for life planner
  const [lifeEvents, setLifeEvents] = useState([])

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

  // Calculate metrics for selected year
  const yearMetrics = useMemo(() => {
    if (!projections.length || selectedYear < 1 || selectedYear > projections.length) return null

    const yearIndex = selectedYear - 1
    const p = projections[yearIndex]
    const prevP = yearIndex > 0 ? projections[yearIndex - 1] : null

    // Savings Rate = Gap / Gross Income
    const savingsRate = p.grossIncome > 0 ? (p.gap / p.grossIncome) * 100 : 0

    // Income - Nominal (future dollars) and Present Value (today's dollars)
    const incomeNominal = p.grossIncome
    const incomePV = p.grossIncomePV

    // Tax %
    const taxRate = p.grossIncome > 0 ? (p.annualTaxes / p.grossIncome) * 100 : 0

    // % of Net Worth Growth from Investment Growth (vs contributions)
    // Net Worth change this year
    let netWorthChange = 0
    let investmentGrowth = 0
    let contributions = 0
    let growthPercent = 0

    if (prevP) {
      // Year 2+: compare to previous year
      netWorthChange = p.netWorth - prevP.netWorth

      // Investment growth = market value changes minus new contributions
      // For investments: market value change - cost basis change
      const investmentMarketGrowth = (p.totalInvestmentValue - prevP.totalInvestmentValue) - p.investedThisYear

      // For 401k: value change - contributions (individual + company)
      const ret401kGrowth = (p.retirement401kValue - prevP.retirement401kValue) - p.totalIndividual401k - p.annualCompany401k

      investmentGrowth = investmentMarketGrowth + ret401kGrowth
      contributions = p.cashContribution + p.investedThisYear + p.totalIndividual401k + p.annualCompany401k

      // Percent of growth from investments (not contributions)
      if (netWorthChange > 0) {
        growthPercent = (investmentGrowth / netWorthChange) * 100
      }
    } else {
      // Year 1: estimate based on beginning balances
      // We don't have accurate beginning-of-year data, so show N/A or estimate
      netWorthChange = p.netWorth // Total at end of year 1
      contributions = p.cashContribution + p.investedThisYear + p.totalIndividual401k + p.annualCompany401k
      investmentGrowth = netWorthChange - contributions
      if (netWorthChange > 0) {
        growthPercent = (investmentGrowth / netWorthChange) * 100
      }
    }

    return {
      savingsRate,
      incomeNominal,
      incomePV,
      taxRate,
      netWorthChange,
      investmentGrowth,
      contributions,
      growthPercent,
      // Additional data for display
      gap: p.gap,
      expenses: p.annualExpenses,
      taxes: p.annualTaxes,
      netWorth: p.netWorth,
      netWorthPV: p.netWorthPV
    }
  }, [projections, selectedYear])

  // Calculate FIRE metrics (static, based on Year 1)
  const fireMetrics = useMemo(() => {
    if (!projections.length) return null

    const currentYear = projections[0]

    // Year 1 values
    const year1GrossIncome = currentYear.grossIncome
    const year1Expenses = currentYear.annualExpenses
    const year1Gap = currentYear.gap
    const year1NetWorth = currentYear.netWorth

    // Savings Rate = Gap / Gross Income (what % of income you're saving)
    const savingsRate = year1GrossIncome > 0 ? (year1Gap / year1GrossIncome) * 100 : 0

    // FIRE Number = Annual Expenses × 25 (4% safe withdrawal rate)
    const fireNumber = year1Expenses * 25

    // Years to FIRE = Find first year where Net Worth >= FIRE Number (inflation-adjusted)
    let yearsToFire = null
    for (let i = 0; i < projections.length; i++) {
      const yearProjection = projections[i]
      const inflatedFireNumber = fireNumber * Math.pow(1 + inflationRate, i)
      if (yearProjection.netWorth >= inflatedFireNumber) {
        yearsToFire = i + 1
        break
      }
    }

    // Coast FIRE Age calculation
    const assumedGrowthRate = 0.07 // 7% real return
    const yearsToRetirement = retirementAge - currentAge

    // Find coast FIRE age by simulating when current investments can coast
    let coastFireAge = null
    for (let i = 0; i < projections.length; i++) {
      const yearNetWorth = projections[i].netWorth
      const yearsRemaining = yearsToRetirement - i
      if (yearsRemaining <= 0) break

      const futureValue = yearNetWorth * Math.pow(1 + assumedGrowthRate, yearsRemaining)
      const targetFireNumber = fireNumber * Math.pow(1 + inflationRate, yearsToRetirement)

      if (futureValue >= targetFireNumber) {
        coastFireAge = currentAge + i
        break
      }
    }

    return {
      savingsRate,
      fireNumber,
      yearsToFire,
      fireAge: yearsToFire ? currentAge + yearsToFire : null,
      coastFireAge,
      year1GrossIncome,
      year1Expenses,
      year1Gap,
      year1NetWorth
    }
  }, [projections, profile, inflationRate, currentAge, retirementAge])

  // Calculate impact analysis metrics
  const impactAnalysis = useMemo(() => {
    if (!projections.length || !fireMetrics) return null

    const incomeMultiplier = 1 + (incomeAdjustment / 100)
    const expenseMultiplier = 1 + (expenseAdjustment / 100)

    // Adjusted Year 1 values
    const adjustedIncome = fireMetrics.year1GrossIncome * incomeMultiplier
    const adjustedExpenses = fireMetrics.year1Expenses * expenseMultiplier

    // Estimate adjusted gap (simplified - assumes taxes scale proportionally)
    // More accurate would recalculate taxes, but this gives a good approximation
    const taxRate = fireMetrics.year1GrossIncome > 0
      ? (projections[0].annualTaxes / fireMetrics.year1GrossIncome)
      : 0.3
    const adjustedTaxes = adjustedIncome * taxRate
    const adjusted401k = projections[0].totalIndividual401k * incomeMultiplier
    const adjustedGap = adjustedIncome - adjusted401k - adjustedTaxes - adjustedExpenses

    // Adjusted savings rate
    const adjustedSavingsRate = adjustedIncome > 0 ? (adjustedGap / adjustedIncome) * 100 : 0

    // Adjusted FIRE number (based on adjusted expenses)
    const adjustedFireNumber = adjustedExpenses * 25

    // Estimate years to FIRE with adjusted values
    // Simplified calculation: use average growth and savings rate
    const avgGrowthRate = 0.07 // 7% real return assumption
    let adjustedYearsToFire = null
    let simulatedNetWorth = fireMetrics.year1NetWorth
    const annualSavings = adjustedGap

    for (let year = 1; year <= 100; year++) {
      // Inflate FIRE number
      const inflatedFireNumber = adjustedFireNumber * Math.pow(1 + inflationRate, year - 1)

      if (simulatedNetWorth >= inflatedFireNumber) {
        adjustedYearsToFire = year
        break
      }

      // Grow existing wealth and add savings
      simulatedNetWorth = simulatedNetWorth * (1 + avgGrowthRate) + annualSavings
    }

    // Calculate Coast FIRE age with adjusted values
    const yearsToRetirement = retirementAge - currentAge
    let adjustedCoastFireAge = null

    for (let i = 0; i < Math.min(projections.length, yearsToRetirement); i++) {
      // Simulate net worth growth with adjusted savings
      let simNetWorth = fireMetrics.year1NetWorth
      for (let j = 0; j < i; j++) {
        simNetWorth = simNetWorth * (1 + avgGrowthRate) + annualSavings
      }

      const yearsRemaining = yearsToRetirement - i
      if (yearsRemaining <= 0) break

      const futureValue = simNetWorth * Math.pow(1 + avgGrowthRate, yearsRemaining)
      const targetFireNumber = adjustedFireNumber * Math.pow(1 + inflationRate, yearsToRetirement)

      if (futureValue >= targetFireNumber) {
        adjustedCoastFireAge = currentAge + i
        break
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

    return {
      // Baseline
      baselineIncome: fireMetrics.year1GrossIncome,
      baselineExpenses: fireMetrics.year1Expenses,
      baselineSavingsRate: fireMetrics.savingsRate,
      baselineFireNumber: fireMetrics.fireNumber,
      baselineYearsToFire: fireMetrics.yearsToFire,
      baselineCoastFireAge: fireMetrics.coastFireAge,

      // Adjusted
      adjustedIncome,
      adjustedExpenses,
      adjustedSavingsRate,
      adjustedFireNumber,
      adjustedYearsToFire,
      adjustedCoastFireAge,

      // Changes
      savingsRateChange,
      fireNumberChange,
      yearsToFireChange,
      coastFireAgeChange
    }
  }, [projections, fireMetrics, incomeAdjustment, expenseAdjustment, inflationRate, currentAge, retirementAge])

  // Calculate sensitivity analysis
  const sensitivityAnalysis = useMemo(() => {
    if (!projections.length || !fireMetrics) return null

    const baselineGrowthRate = 0.07 // Assume 7% baseline
    const baselineInflationRate = inflationRate

    const adjGrowthRate = sensitivityGrowthRate / 100
    const adjInflationRate = sensitivityInflation / 100

    // Real return = nominal - inflation (simplified)
    const baselineRealReturn = baselineGrowthRate - baselineInflationRate
    const adjustedRealReturn = adjGrowthRate - adjInflationRate

    const yearsToRetirement = retirementAge - currentAge
    const year1Gap = fireMetrics.year1Gap
    const startingNetWorth = fireMetrics.year1NetWorth

    // Simulate net worth at retirement with baseline assumptions
    let baselineNetWorth = startingNetWorth
    for (let i = 0; i < yearsToRetirement; i++) {
      baselineNetWorth = baselineNetWorth * (1 + baselineGrowthRate) + year1Gap
    }

    // Simulate net worth at retirement with adjusted assumptions
    let adjustedNetWorth = startingNetWorth
    for (let i = 0; i < yearsToRetirement; i++) {
      adjustedNetWorth = adjustedNetWorth * (1 + adjGrowthRate) + year1Gap
    }

    // Calculate FIRE metrics with adjusted parameters
    const adjustedFireNumber = fireMetrics.year1Expenses * 25 * Math.pow(1 + adjInflationRate, yearsToRetirement)
    const baselineFireNumber = fireMetrics.year1Expenses * 25 * Math.pow(1 + baselineInflationRate, yearsToRetirement)

    // Years to FIRE with adjusted growth
    let adjustedYearsToFire = null
    let simNetWorth = startingNetWorth
    for (let year = 1; year <= 100; year++) {
      const inflatedFireNumber = fireMetrics.fireNumber * Math.pow(1 + adjInflationRate, year - 1)
      if (simNetWorth >= inflatedFireNumber) {
        adjustedYearsToFire = year
        break
      }
      simNetWorth = simNetWorth * (1 + adjGrowthRate) + year1Gap
    }

    // Baseline years to FIRE (from fireMetrics)
    const baselineYearsToFire = fireMetrics.yearsToFire

    // Calculate different scenarios for comparison table
    const scenarios = [
      { name: 'Bear Market', growth: 4, inflation: 4 },
      { name: 'Conservative', growth: 5, inflation: 3 },
      { name: 'Moderate', growth: 7, inflation: 2.7 },
      { name: 'Optimistic', growth: 9, inflation: 2 },
      { name: 'Bull Market', growth: 12, inflation: 2 },
    ].map(scenario => {
      const g = scenario.growth / 100
      const i = scenario.inflation / 100

      // Simulate net worth
      let nw = startingNetWorth
      for (let y = 0; y < yearsToRetirement; y++) {
        nw = nw * (1 + g) + year1Gap
      }

      // Years to FIRE
      let ytf = null
      let simNW = startingNetWorth
      for (let year = 1; year <= 100; year++) {
        const target = fireMetrics.fireNumber * Math.pow(1 + i, year - 1)
        if (simNW >= target) {
          ytf = year
          break
        }
        simNW = simNW * (1 + g) + year1Gap
      }

      return {
        ...scenario,
        netWorthAtRetirement: nw,
        yearsToFire: ytf,
        fireAge: ytf ? currentAge + ytf : null
      }
    })

    return {
      baselineGrowthRate: baselineGrowthRate * 100,
      baselineInflationRate: baselineInflationRate * 100,
      baselineRealReturn: baselineRealReturn * 100,
      baselineNetWorth,
      baselineFireNumber,
      baselineYearsToFire,

      adjustedGrowthRate: sensitivityGrowthRate,
      adjustedInflationRate: sensitivityInflation,
      adjustedRealReturn: adjustedRealReturn * 100,
      adjustedNetWorth,
      adjustedFireNumber,
      adjustedYearsToFire,

      netWorthChange: adjustedNetWorth - baselineNetWorth,
      yearsToFireChange: adjustedYearsToFire && baselineYearsToFire
        ? adjustedYearsToFire - baselineYearsToFire
        : null,

      scenarios
    }
  }, [projections, fireMetrics, sensitivityGrowthRate, sensitivityInflation, inflationRate, currentAge, retirementAge])

  // Calculate life planner impact
  const lifePlannerImpact = useMemo(() => {
    if (!projections.length || !fireMetrics || lifeEvents.length === 0) return null

    const yearsToRetirement = retirementAge - currentAge
    const year1Gap = fireMetrics.year1Gap
    const year1Income = fireMetrics.year1GrossIncome
    const year1Expenses = fireMetrics.year1Expenses
    const startingNetWorth = fireMetrics.year1NetWorth
    const growthRate = 0.07

    // Simulate without life events (baseline)
    let baselineNetWorth = startingNetWorth
    for (let i = 0; i < yearsToRetirement; i++) {
      baselineNetWorth = baselineNetWorth * (1 + growthRate) + year1Gap
    }

    // Simulate with life events
    let adjustedNetWorth = startingNetWorth
    let totalExtraExpenses = 0
    let totalExtraIncome = 0

    for (let year = 1; year <= yearsToRetirement; year++) {
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

      // Adjusted gap for this year
      const adjustedGap = year1Gap + yearlyIncomeImpact - yearlyExpenseImpact
      adjustedNetWorth = adjustedNetWorth * (1 + growthRate) + adjustedGap
    }

    // Calculate years to FIRE with life events
    let adjustedYearsToFire = null
    let simNetWorth = startingNetWorth
    for (let year = 1; year <= 100; year++) {
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

      const adjustedGap = year1Gap + yearlyIncomeImpact - yearlyExpenseImpact
      const inflatedFireNumber = fireMetrics.fireNumber * Math.pow(1 + inflationRate, year - 1)

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
  }, [projections, fireMetrics, lifeEvents, inflationRate, currentAge, retirementAge])

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
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `$${Math.round(val / 1000)}k`
    return `$${Math.round(val)}`
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-2xl mr-3">🚧</span>
          <div>
            <h2 className="text-lg font-semibold text-yellow-900">
              Work In Progress Dashboard
            </h2>
            <p className="text-xs text-yellow-700">
              Experimental features and FIRE calculations
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics with Year Slider */}
      {yearMetrics && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">📊 Key Metrics</h3>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Year {selectedYear}</span>
              <span className="text-gray-400 ml-2">(Age {currentAge + selectedYear - 1})</span>
            </div>
          </div>

          {/* Year Slider */}
          <div className="mb-6">
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

            {/* Income - Present Value (Today's Dollars) */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Income (Today's $)</span>
                <span className="text-lg">💵</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {fmtCompact(yearMetrics.incomePV)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Present value (inflation-adjusted)
              </p>
            </div>

            {/* Net Worth - Present Value (Today's Dollars) */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Net Worth (Today's $)</span>
                <span className="text-lg">💎</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">
                {fmtCompact(yearMetrics.netWorthPV)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Present value (inflation-adjusted)
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

            {/* FIRE Progress */}
            {fireMetrics && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">FIRE Progress</span>
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
              <span className="font-medium">Net Worth:</span> {fmtCompact(yearMetrics.netWorth)}
            </div>
            <div className="text-gray-600">
              <span className="font-medium">YoY Change:</span>{' '}
              <span className={yearMetrics.netWorthChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                {yearMetrics.netWorthChange >= 0 ? '+' : ''}{fmtCompact(yearMetrics.netWorthChange)}
              </span>
            </div>
            <div className="text-gray-500 text-xs">
              Slide to explore different years →
            </div>
          </div>
        </div>
      )}

      {/* FIRE Metrics Summary */}
      {fireMetrics && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">🔥 FIRE Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* FIRE Number */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">FIRE Number</span>
                <span className="text-2xl">🎯</span>
              </div>
              <p className="text-3xl font-bold text-purple-600">
                {fmtCompact(fireMetrics.fireNumber)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                25× annual expenses ({fmtCompact(fireMetrics.year1Expenses)})
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Based on 4% safe withdrawal rate
              </p>
            </div>

            {/* Years to FIRE */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Years to FIRE</span>
                <span className="text-2xl">📅</span>
              </div>
              {fireMetrics.yearsToFire ? (
                <>
                  <p className="text-3xl font-bold text-green-600">
                    {fireMetrics.yearsToFire} years
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    FIRE at age {fireMetrics.fireAge}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-400">
                    {projections.length}+ years
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Beyond projection window
                  </p>
                </>
              )}
            </div>

            {/* Coast FIRE Age */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Coast FIRE Age</span>
                <span className="text-2xl">🏖️</span>
              </div>
              {fireMetrics.coastFireAge ? (
                <>
                  <p className="text-3xl font-bold text-teal-600">
                    Age {fireMetrics.coastFireAge}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Stop saving, still retire on time
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-400">
                    Not reached
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Within projection window
                  </p>
                </>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Assumes 7% real returns
              </p>
            </div>

            {/* Current Progress */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">FIRE Progress</span>
                <span className="text-2xl">🚀</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {((fireMetrics.year1NetWorth / fireMetrics.fireNumber) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {fmtCompact(fireMetrics.year1NetWorth)} of {fmtCompact(fireMetrics.fireNumber)}
              </p>
              <div className="mt-3 h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${Math.min((fireMetrics.year1NetWorth / fireMetrics.fireNumber) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Impact Analysis */}
      {impactAnalysis && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">📊 Impact Analysis</h3>
            <button
              onClick={() => { setIncomeAdjustment(0); setExpenseAdjustment(0); }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Reset to baseline
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            See how changes to income or expenses affect your FIRE metrics
          </p>

          {/* Adjustment Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Income Adjustment */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Income Adjustment</span>
                <span className={`text-lg font-bold ${incomeAdjustment > 0 ? 'text-green-600' : incomeAdjustment < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {incomeAdjustment > 0 ? '+' : ''}{incomeAdjustment}%
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={incomeAdjustment}
                onChange={(e) => setIncomeAdjustment(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>-50%</span>
                <span>0%</span>
                <span>+50%</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {fmtCompact(impactAnalysis.baselineIncome)} → {fmtCompact(impactAnalysis.adjustedIncome)}
              </p>
            </div>

            {/* Expense Adjustment */}
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Expense Adjustment</span>
                <span className={`text-lg font-bold ${expenseAdjustment < 0 ? 'text-green-600' : expenseAdjustment > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {expenseAdjustment > 0 ? '+' : ''}{expenseAdjustment}%
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={expenseAdjustment}
                onChange={(e) => setExpenseAdjustment(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>-50%</span>
                <span>0%</span>
                <span>+50%</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {fmtCompact(impactAnalysis.baselineExpenses)} → {fmtCompact(impactAnalysis.adjustedExpenses)}
              </p>
            </div>
          </div>

          {/* Results Comparison */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Savings Rate */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Savings Rate</p>
              <p className="text-xl font-bold text-gray-800">{impactAnalysis.adjustedSavingsRate.toFixed(1)}%</p>
              <p className={`text-sm font-medium ${impactAnalysis.savingsRateChange > 0 ? 'text-green-600' : impactAnalysis.savingsRateChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {impactAnalysis.savingsRateChange > 0 ? '+' : ''}{impactAnalysis.savingsRateChange.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400 mt-1">was {impactAnalysis.baselineSavingsRate.toFixed(1)}%</p>
            </div>

            {/* FIRE Number */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">FIRE Number</p>
              <p className="text-xl font-bold text-gray-800">{fmtCompact(impactAnalysis.adjustedFireNumber)}</p>
              <p className={`text-sm font-medium ${impactAnalysis.fireNumberChange < 0 ? 'text-green-600' : impactAnalysis.fireNumberChange > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {impactAnalysis.fireNumberChange > 0 ? '+' : ''}{fmtCompact(impactAnalysis.fireNumberChange)}
              </p>
              <p className="text-xs text-gray-400 mt-1">was {fmtCompact(impactAnalysis.baselineFireNumber)}</p>
            </div>

            {/* Years to FIRE */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Years to FIRE</p>
              <p className="text-xl font-bold text-gray-800">
                {impactAnalysis.adjustedYearsToFire ? `${impactAnalysis.adjustedYearsToFire} yrs` : '—'}
              </p>
              {impactAnalysis.yearsToFireChange !== null ? (
                <p className={`text-sm font-medium ${impactAnalysis.yearsToFireChange < 0 ? 'text-green-600' : impactAnalysis.yearsToFireChange > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {impactAnalysis.yearsToFireChange > 0 ? '+' : ''}{impactAnalysis.yearsToFireChange} yrs
                </p>
              ) : (
                <p className="text-sm text-gray-400">—</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                was {impactAnalysis.baselineYearsToFire ? `${impactAnalysis.baselineYearsToFire} yrs` : '—'}
              </p>
            </div>

            {/* Coast FIRE Age */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Coast FIRE Age</p>
              <p className="text-xl font-bold text-gray-800">
                {impactAnalysis.adjustedCoastFireAge ? `Age ${impactAnalysis.adjustedCoastFireAge}` : '—'}
              </p>
              {impactAnalysis.coastFireAgeChange !== null ? (
                <p className={`text-sm font-medium ${impactAnalysis.coastFireAgeChange < 0 ? 'text-green-600' : impactAnalysis.coastFireAgeChange > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {impactAnalysis.coastFireAgeChange > 0 ? '+' : ''}{impactAnalysis.coastFireAgeChange} yrs
                </p>
              ) : (
                <p className="text-sm text-gray-400">—</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                was {impactAnalysis.baselineCoastFireAge ? `Age ${impactAnalysis.baselineCoastFireAge}` : '—'}
              </p>
            </div>
          </div>

          {/* Quick Scenarios */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-3">Quick scenarios:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setIncomeAdjustment(10); setExpenseAdjustment(0); }}
                className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200"
              >
                +10% raise
              </button>
              <button
                onClick={() => { setIncomeAdjustment(20); setExpenseAdjustment(0); }}
                className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200"
              >
                +20% raise
              </button>
              <button
                onClick={() => { setIncomeAdjustment(0); setExpenseAdjustment(-10); }}
                className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
              >
                Cut 10% expenses
              </button>
              <button
                onClick={() => { setIncomeAdjustment(0); setExpenseAdjustment(-20); }}
                className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
              >
                Cut 20% expenses
              </button>
              <button
                onClick={() => { setIncomeAdjustment(-20); setExpenseAdjustment(0); }}
                className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200"
              >
                -20% income (layoff)
              </button>
              <button
                onClick={() => { setIncomeAdjustment(0); setExpenseAdjustment(30); }}
                className="px-3 py-1.5 text-xs bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200"
              >
                +30% expenses (kid)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Tracker */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🏆 Net Worth Milestones</h3>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Milestone</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Year</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Age</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Actual Value</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((m, i) => (
                <tr key={m.target} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-3 px-4 font-medium text-gray-900">{fmtCompact(m.target)}</td>
                  <td className="py-3 px-4 text-center text-gray-700">
                    {m.year ? `Year ${m.year}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-700">
                    {m.age ? `Age ${m.age}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700">
                    {m.actualValue ? fmt(m.actualValue) : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {m.year ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Achieved
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Beyond scope
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Income Sources Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">💵 Income Sources Breakdown</h3>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Year</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Salary</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Equity</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Company 401k</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 bg-blue-50">Total Income</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Salary %</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Equity %</th>
              </tr>
            </thead>
            <tbody>
              {projections.slice(0, 10).map((p, i) => {
                const salaryPct = p.grossIncome > 0 ? (p.annualSalary / p.grossIncome) * 100 : 0
                const equityPct = p.grossIncome > 0 ? (p.annualEquity / p.grossIncome) * 100 : 0
                return (
                  <tr key={p.year} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-4 font-medium text-gray-900">Year {p.year}</td>
                    <td className="py-2 px-4 text-right text-gray-700">{fmtCompact(p.annualSalary)}</td>
                    <td className="py-2 px-4 text-right text-purple-700">{fmtCompact(p.annualEquity)}</td>
                    <td className="py-2 px-4 text-right text-green-700">{fmtCompact(p.annualCompany401k)}</td>
                    <td className="py-2 px-4 text-right font-semibold text-gray-900 bg-blue-50">{fmtCompact(p.grossIncome)}</td>
                    <td className="py-2 px-4 text-right text-gray-600">{salaryPct.toFixed(0)}%</td>
                    <td className="py-2 px-4 text-right text-purple-600">{equityPct.toFixed(0)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {projections.length > 10 && (
            <div className="text-center py-2 text-xs text-gray-500 bg-gray-50 border-t">
              Showing first 10 years of {projections.length}
            </div>
          )}
        </div>
      </div>

      {/* Sensitivity Analysis */}
      {sensitivityAnalysis && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">🔬 Sensitivity Analysis</h3>
            <button
              onClick={() => { setSensitivityGrowthRate(7); setSensitivityInflation(profile?.inflationRate || 2.7); }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Reset to defaults
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            See how different market conditions affect your retirement outcomes
          </p>

          {/* Adjustment Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Growth Rate */}
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Investment Growth Rate</span>
                <span className="text-lg font-bold text-purple-600">{sensitivityGrowthRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="0.5"
                value={sensitivityGrowthRate}
                onChange={(e) => setSensitivityGrowthRate(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>7.5%</span>
                <span>15%</span>
              </div>
            </div>

            {/* Inflation Rate */}
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Inflation Rate</span>
                <span className="text-lg font-bold text-orange-600">{sensitivityInflation}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="0.1"
                value={sensitivityInflation}
                onChange={(e) => setSensitivityInflation(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>4%</span>
                <span>8%</span>
              </div>
            </div>
          </div>

          {/* Real Return Display */}
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Real Return (Growth - Inflation)</span>
              <span className={`text-xl font-bold ${sensitivityAnalysis.adjustedRealReturn >= 4 ? 'text-green-600' : sensitivityAnalysis.adjustedRealReturn >= 2 ? 'text-blue-600' : sensitivityAnalysis.adjustedRealReturn >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                {sensitivityAnalysis.adjustedRealReturn.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Historical average real return: ~4-5% for stocks
            </p>
          </div>

          {/* Results */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Net Worth at Retirement</p>
              <p className="text-xl font-bold text-gray-800">{fmtCompact(sensitivityAnalysis.adjustedNetWorth)}</p>
              <p className={`text-sm font-medium ${sensitivityAnalysis.netWorthChange > 0 ? 'text-green-600' : sensitivityAnalysis.netWorthChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {sensitivityAnalysis.netWorthChange > 0 ? '+' : ''}{fmtCompact(sensitivityAnalysis.netWorthChange)} vs baseline
              </p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Years to FIRE</p>
              <p className="text-xl font-bold text-gray-800">
                {sensitivityAnalysis.adjustedYearsToFire ? `${sensitivityAnalysis.adjustedYearsToFire} years` : '100+'}
              </p>
              {sensitivityAnalysis.yearsToFireChange !== null && (
                <p className={`text-sm font-medium ${sensitivityAnalysis.yearsToFireChange < 0 ? 'text-green-600' : sensitivityAnalysis.yearsToFireChange > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {sensitivityAnalysis.yearsToFireChange > 0 ? '+' : ''}{sensitivityAnalysis.yearsToFireChange} years
                </p>
              )}
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">FIRE Age</p>
              <p className="text-xl font-bold text-gray-800">
                {sensitivityAnalysis.adjustedYearsToFire ? `Age ${currentAge + sensitivityAnalysis.adjustedYearsToFire}` : '—'}
              </p>
            </div>
          </div>

          {/* Scenario Comparison Table */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Market Scenario Comparison</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Scenario</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">Growth</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">Inflation</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">Real Return</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-700">Net Worth</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">FIRE Age</th>
                  </tr>
                </thead>
                <tbody>
                  {sensitivityAnalysis.scenarios.map((s, i) => (
                    <tr key={s.name} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${s.name === 'Moderate' ? 'font-medium bg-blue-50' : ''}`}>
                      <td className="py-2 px-3 text-gray-900">{s.name}</td>
                      <td className="py-2 px-3 text-center text-purple-700">{s.growth}%</td>
                      <td className="py-2 px-3 text-center text-orange-700">{s.inflation}%</td>
                      <td className={`py-2 px-3 text-center ${s.growth - s.inflation >= 4 ? 'text-green-600' : s.growth - s.inflation >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {(s.growth - s.inflation).toFixed(1)}%
                      </td>
                      <td className="py-2 px-3 text-right text-gray-900">{fmtCompact(s.netWorthAtRetirement)}</td>
                      <td className="py-2 px-3 text-center text-gray-700">
                        {s.fireAge ? `Age ${s.fireAge}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Life Planner */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">👨‍👩‍👧 Life Planner</h3>
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
          Add life events to see how they impact your FIRE timeline
        </p>

        {/* Event Templates */}
        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-3">Click to add a life event:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(lifeEventTemplates).map(([key, template]) => (
              <button
                key={key}
                onClick={() => addLifeEvent(key)}
                className={`px-3 py-2 text-xs rounded-lg border transition flex items-center gap-2 ${
                  template.incomeImpact > 0 || template.expenseImpact < 0
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

export default WIPTab
