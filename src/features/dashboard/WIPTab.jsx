import { useState, useMemo } from 'react'

function WIPTab({ data }) {
  const { gapProjections, profile } = data
  const projections = gapProjections?.projections || []

  // State for year slider
  const [selectedYear, setSelectedYear] = useState(1)

  // State for global adjustments
  const [incomeAdjustment, setIncomeAdjustment] = useState(0)
  const [expenseAdjustment, setExpenseAdjustment] = useState(0)
  const [sensitivityGrowthRate, setSensitivityGrowthRate] = useState(7)
  const [sensitivityInflation, setSensitivityInflation] = useState(profile?.inflationRate || 2.7)

  // State for withdrawal calculator
  const [retirementWithdrawal, setRetirementWithdrawal] = useState('')

  const currentAge = profile?.age || 30
  const retirementAge = profile?.retirementAge || 65
  const maxYear = projections.length || 30

  // Calculate FIRE metrics (uses global adjustments)
  const fireMetrics = useMemo(() => {
    if (!projections.length) return null

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

    // Savings Rate
    const savingsRate = year1GrossIncome > 0 ? (year1Gap / year1GrossIncome) * 100 : 0

    // FIRE Number = Annual Expenses × 25
    const fireNumber = year1Expenses * 25

    // Simulate net worth trajectory
    const yearsToRetirement = retirementAge - currentAge
    const simulatedNetWorths = [year1NetWorth]
    let simNetWorth = year1NetWorth
    for (let i = 1; i <= Math.max(projections.length, yearsToRetirement); i++) {
      simNetWorth = simNetWorth * (1 + growthRate) + year1Gap
      simulatedNetWorths.push(simNetWorth)
    }

    // Years to FIRE
    let yearsToFire = null
    for (let i = 0; i < simulatedNetWorths.length; i++) {
      const inflatedFireNumber = fireNumber * Math.pow(1 + adjInflationRate, i)
      if (simulatedNetWorths[i] >= inflatedFireNumber) {
        yearsToFire = i + 1
        break
      }
    }

    // Coast FIRE Age
    let coastFireAge = null
    for (let i = 0; i < Math.min(simulatedNetWorths.length, yearsToRetirement); i++) {
      const yearNetWorth = simulatedNetWorths[i]
      const yearsRemaining = yearsToRetirement - i
      if (yearsRemaining <= 0) break

      const futureValue = yearNetWorth * Math.pow(1 + growthRate, yearsRemaining)
      const targetFireNumber = fireNumber * Math.pow(1 + adjInflationRate, yearsToRetirement)

      if (futureValue >= targetFireNumber) {
        coastFireAge = currentAge + i
        break
      }
    }

    // Net worth at retirement
    const netWorthAtRetirement = simulatedNetWorths[yearsToRetirement] || simNetWorth
    const netWorthAtRetirementPV = netWorthAtRetirement / Math.pow(1 + adjInflationRate, yearsToRetirement)

    return {
      savingsRate,
      fireNumber,
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
  }, [projections, incomeAdjustment, expenseAdjustment, sensitivityGrowthRate, sensitivityInflation, currentAge, retirementAge])

  // Calculate metrics for selected year
  const yearMetrics = useMemo(() => {
    if (!projections.length || selectedYear < 1 || selectedYear > projections.length) return null

    const yearIndex = selectedYear - 1
    const p = projections[yearIndex]
    const prevP = yearIndex > 0 ? projections[yearIndex - 1] : null

    const incomeMultiplier = 1 + (incomeAdjustment / 100)
    const expenseMultiplier = 1 + (expenseAdjustment / 100)
    const growthRate = sensitivityGrowthRate / 100
    const adjInflationRate = sensitivityInflation / 100

    const noAdjustments = incomeAdjustment === 0 && expenseAdjustment === 0 &&
                          sensitivityGrowthRate === 7 && sensitivityInflation === (profile?.inflationRate || 2.7)

    const adjustedIncome = p.grossIncome * incomeMultiplier
    const adjustedIncomePV = p.grossIncomePV * incomeMultiplier
    const adjustedExpenses = p.annualExpenses * expenseMultiplier
    const adjustedTaxes = p.annualTaxes * incomeMultiplier
    const adjustedGap = adjustedIncome - adjustedTaxes - adjustedExpenses - (p.totalIndividual401k * incomeMultiplier)

    const savingsRate = adjustedIncome > 0 ? (adjustedGap / adjustedIncome) * 100 : 0
    const taxRate = adjustedIncome > 0 ? (adjustedTaxes / adjustedIncome) * 100 : 0

    let adjustedNetWorth = projections[0].netWorth
    for (let i = 1; i <= yearIndex; i++) {
      const yearP = projections[i]
      const yearAdjustedGap = (yearP.grossIncome * incomeMultiplier) -
                              (yearP.annualTaxes * incomeMultiplier) -
                              (yearP.annualExpenses * expenseMultiplier) -
                              (yearP.totalIndividual401k * incomeMultiplier)
      adjustedNetWorth = adjustedNetWorth * (1 + growthRate) + yearAdjustedGap
    }

    const discountFactor = Math.pow(1 + adjInflationRate, yearIndex)
    const adjustedNetWorthPV = adjustedNetWorth / discountFactor

    let netWorthChange = 0
    let investmentGrowth = 0
    let contributions = 0
    let growthPercent = 0

    if (prevP) {
      netWorthChange = p.netWorth - prevP.netWorth
      const investmentMarketGrowth = (p.totalInvestmentValue - prevP.totalInvestmentValue) - p.investedThisYear
      const ret401kGrowth = (p.retirement401kValue - prevP.retirement401kValue) - p.totalIndividual401k - p.annualCompany401k
      investmentGrowth = investmentMarketGrowth + ret401kGrowth
      contributions = p.cashContribution + p.investedThisYear + p.totalIndividual401k + p.annualCompany401k
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

  // Calculate withdrawal duration
  const withdrawalCalculation = useMemo(() => {
    if (!fireMetrics || !retirementWithdrawal) return null

    const withdrawal = parseFloat(retirementWithdrawal)
    if (isNaN(withdrawal) || withdrawal <= 0) return null

    const retirementGrowthRate = sensitivityGrowthRate / 100
    const netWorthAtRetirement = fireMetrics.netWorthAtRetirement

    const simpleYears = netWorthAtRetirement / withdrawal

    let currentNetWorth = netWorthAtRetirement
    let yearsWithGrowth = 0
    const maxYears = 100

    while (currentNetWorth > 0 && yearsWithGrowth < maxYears) {
      currentNetWorth = currentNetWorth * (1 + retirementGrowthRate) - withdrawal
      yearsWithGrowth++
    }

    if (currentNetWorth > 0) {
      yearsWithGrowth = Infinity
    }

    const withdrawalRate = (withdrawal / netWorthAtRetirement) * 100
    const sustainableWithdrawal = netWorthAtRetirement * 0.04

    return {
      withdrawal,
      netWorthAtRetirement,
      simpleYears: Math.round(simpleYears),
      yearsWithGrowth: yearsWithGrowth === Infinity ? 'Forever' : Math.round(yearsWithGrowth),
      withdrawalRate,
      sustainableWithdrawal,
      isSustainable: withdrawalRate <= 4
    }
  }, [fireMetrics, retirementWithdrawal, sensitivityGrowthRate])

  const fmt = (val) => `$${Math.round(val).toLocaleString()}`
  const fmtCompact = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `$${Math.round(val / 1000)}k`
    return `$${Math.round(val)}`
  }

  const resetAllAdjustments = () => {
    setIncomeAdjustment(0)
    setExpenseAdjustment(0)
    setSensitivityGrowthRate(7)
    setSensitivityInflation(profile?.inflationRate || 2.7)
  }

  const hasAdjustments = incomeAdjustment !== 0 || expenseAdjustment !== 0 ||
                         sensitivityGrowthRate !== 7 || sensitivityInflation !== (profile?.inflationRate || 2.7)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-2xl mr-3">🚧</span>
          <div>
            <h2 className="text-lg font-semibold text-yellow-900">Work In Progress Dashboard</h2>
            <p className="text-xs text-yellow-700">Experimental features and FIRE calculations</p>
          </div>
        </div>
      </div>

      {/* Global Assumptions with Quick Scenarios */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h3 className="text-base font-semibold text-gray-800">Assumptions</h3>
          </div>
          {hasAdjustments && (
            <button
              onClick={resetAllAdjustments}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Reset to defaults
            </button>
          )}
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-600">Income</span>
              <span className={`text-xs font-bold ${incomeAdjustment > 0 ? 'text-green-600' : incomeAdjustment < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {incomeAdjustment > 0 ? '+' : ''}{incomeAdjustment}%
              </span>
            </div>
            <input
              type="range" min="-50" max="50" value={incomeAdjustment}
              onChange={(e) => setIncomeAdjustment(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-600">Expenses</span>
              <span className={`text-xs font-bold ${expenseAdjustment < 0 ? 'text-green-600' : expenseAdjustment > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {expenseAdjustment > 0 ? '+' : ''}{expenseAdjustment}%
              </span>
            </div>
            <input
              type="range" min="-50" max="50" value={expenseAdjustment}
              onChange={(e) => setExpenseAdjustment(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-600">Growth</span>
              <span className={`text-xs font-bold ${sensitivityGrowthRate > 7 ? 'text-green-600' : sensitivityGrowthRate < 7 ? 'text-orange-600' : 'text-purple-600'}`}>
                {sensitivityGrowthRate}%
              </span>
            </div>
            <input
              type="range" min="0" max="15" step="0.5" value={sensitivityGrowthRate}
              onChange={(e) => setSensitivityGrowthRate(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-600">Inflation</span>
              <span className={`text-xs font-bold ${sensitivityInflation < 2.7 ? 'text-green-600' : sensitivityInflation > 4 ? 'text-red-600' : 'text-orange-600'}`}>
                {sensitivityInflation.toFixed(1)}%
              </span>
            </div>
            <input
              type="range" min="0" max="8" step="0.1" value={sensitivityInflation}
              onChange={(e) => setSensitivityInflation(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
          </div>
        </div>

        {/* Quick Scenarios */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500 mr-1">Quick scenarios:</span>
          <button onClick={() => { setIncomeAdjustment(10); setExpenseAdjustment(0); }}
            className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100">+10% raise</button>
          <button onClick={() => { setIncomeAdjustment(0); setExpenseAdjustment(-15); }}
            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Cut 15% expenses</button>
          <button onClick={() => { setIncomeAdjustment(-20); setExpenseAdjustment(0); }}
            className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">-20% income</button>
          <button onClick={() => { setIncomeAdjustment(0); setExpenseAdjustment(25); }}
            className="px-2 py-1 text-xs bg-orange-50 text-orange-700 rounded hover:bg-orange-100">+25% expenses</button>
          <button onClick={() => { setSensitivityGrowthRate(4); setSensitivityInflation(4); }}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Bear market</button>
          <button onClick={() => { setSensitivityGrowthRate(10); setSensitivityInflation(2); }}
            className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100">Bull market</button>
        </div>
      </div>

      {/* Key FIRE Metrics */}
      {fireMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Savings Rate */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Savings Rate</p>
            <p className={`text-2xl font-bold ${fireMetrics.savingsRate >= 50 ? 'text-green-600' : fireMetrics.savingsRate >= 25 ? 'text-blue-600' : fireMetrics.savingsRate >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
              {fireMetrics.savingsRate.toFixed(0)}%
            </p>
            <div className="mt-2 h-1 bg-gray-200 rounded-full">
              <div className={`h-1 rounded-full ${fireMetrics.savingsRate >= 50 ? 'bg-green-500' : fireMetrics.savingsRate >= 25 ? 'bg-blue-500' : 'bg-orange-500'}`}
                style={{ width: `${Math.min(Math.max(fireMetrics.savingsRate, 0), 100)}%` }} />
            </div>
          </div>

          {/* FIRE Number */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">FIRE Number</p>
            <p className="text-2xl font-bold text-purple-600">{fmtCompact(fireMetrics.fireNumber)}</p>
            <p className="text-xs text-gray-400 mt-1">25× expenses</p>
          </div>

          {/* Years to FIRE */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Years to FIRE</p>
            <p className="text-2xl font-bold text-green-600">
              {fireMetrics.yearsToFire ? fireMetrics.yearsToFire : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {fireMetrics.fireAge ? `Age ${fireMetrics.fireAge}` : 'Beyond projection'}
            </p>
          </div>

          {/* Coast FIRE Age */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Coast FIRE Age</p>
            <p className="text-2xl font-bold text-teal-600">
              {fireMetrics.coastFireAge ? fireMetrics.coastFireAge : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Stop saving, still retire</p>
          </div>

          {/* Net Worth at Retirement */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">At Retirement</p>
            <p className="text-2xl font-bold text-gray-800">{fmtCompact(fireMetrics.netWorthAtRetirement)}</p>
            <p className="text-xs text-gray-400 mt-1">Future dollars</p>
          </div>

          {/* Net Worth (Today's $) */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">Today's Dollars</p>
            <p className="text-2xl font-bold text-blue-700">{fmtCompact(fireMetrics.netWorthAtRetirementPV)}</p>
            <p className="text-xs text-blue-400 mt-1">Inflation adjusted</p>
          </div>
        </div>
      )}

      {/* Trajectory by Year */}
      {yearMetrics && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">📊 Trajectory by Year</h3>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Year {selectedYear}</span>
              <span className="text-gray-400 ml-2">(Age {currentAge + selectedYear - 1})</span>
            </div>
          </div>

          {/* Year Slider */}
          <div className="mb-5">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-10">Yr 1</span>
              <input
                type="range" min="1" max={maxYear} value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-xs text-gray-500 w-12 text-right">Yr {maxYear}</span>
            </div>
          </div>

          {/* Year Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Savings Rate</p>
              <p className={`text-lg font-bold ${yearMetrics.savingsRate >= 50 ? 'text-green-600' : yearMetrics.savingsRate >= 25 ? 'text-blue-600' : 'text-orange-600'}`}>
                {yearMetrics.savingsRate.toFixed(0)}%
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Income (Today's $)</p>
              <p className="text-lg font-bold text-blue-700">{fmtCompact(yearMetrics.incomePV)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Net Worth</p>
              <p className="text-lg font-bold text-purple-700">{fmtCompact(yearMetrics.netWorth)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Net Worth (Today's $)</p>
              <p className="text-lg font-bold text-blue-600">{fmtCompact(yearMetrics.netWorthPV)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Tax Rate</p>
              <p className={`text-lg font-bold ${yearMetrics.taxRate < 25 ? 'text-green-600' : yearMetrics.taxRate < 35 ? 'text-orange-600' : 'text-red-600'}`}>
                {yearMetrics.taxRate.toFixed(0)}%
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Growth from Investing</p>
              <p className={`text-lg font-bold ${yearMetrics.growthPercent >= 50 ? 'text-purple-600' : 'text-gray-600'}`}>
                {yearMetrics.growthPercent.toFixed(0)}%
              </p>
            </div>
          </div>

          {/* FIRE Progress for selected year */}
          {fireMetrics && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">FIRE Progress</span>
                <span className="font-medium text-green-600">
                  {((yearMetrics.netWorth / fireMetrics.fireNumber) * 100).toFixed(0)}% of {fmtCompact(fireMetrics.fireNumber)}
                </span>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full">
                <div className="h-2 rounded-full bg-gradient-to-r from-green-400 to-green-600"
                  style={{ width: `${Math.min((yearMetrics.netWorth / fireMetrics.fireNumber) * 100, 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Withdrawal Calculator */}
      {fireMetrics && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🧮</span>
            <h3 className="text-base font-semibold text-gray-800">Retirement Withdrawal Calculator</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Side */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Withdrawal (Pre-Tax)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input
                    type="number"
                    value={retirementWithdrawal}
                    onChange={(e) => setRetirementWithdrawal(e.target.value)}
                    placeholder="80,000"
                    className="w-full pl-8 pr-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Your Retirement Nest Egg</p>
                <div className="flex justify-between items-baseline">
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{fmtCompact(fireMetrics.netWorthAtRetirement)}</p>
                    <p className="text-xs text-gray-500">at age {retirementAge}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-blue-600">{fmtCompact(fireMetrics.netWorthAtRetirementPV)}</p>
                    <p className="text-xs text-gray-500">today's dollars</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Based on {sensitivityGrowthRate}% growth and {sensitivityInflation}% inflation
              </p>
            </div>

            {/* Results Side */}
            <div>
              {withdrawalCalculation ? (
                <div className="space-y-4">
                  {/* Main Result */}
                  <div className={`rounded-lg p-5 ${withdrawalCalculation.isSustainable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Your money will last</p>
                        <p className={`text-4xl font-bold ${withdrawalCalculation.isSustainable ? 'text-green-600' : 'text-red-600'}`}>
                          {withdrawalCalculation.yearsWithGrowth === 'Forever' ? '∞' : withdrawalCalculation.yearsWithGrowth}
                        </p>
                        <p className="text-sm text-gray-500">
                          {withdrawalCalculation.yearsWithGrowth === 'Forever' ? 'years (indefinitely)' : 'years'}
                        </p>
                      </div>
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${withdrawalCalculation.isSustainable ? 'bg-green-100' : 'bg-red-100'}`}>
                        <span className="text-2xl">{withdrawalCalculation.isSustainable ? '✓' : '⚠'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Withdrawal Rate</p>
                      <p className={`text-xl font-bold ${withdrawalCalculation.withdrawalRate <= 4 ? 'text-green-600' : withdrawalCalculation.withdrawalRate <= 5 ? 'text-orange-600' : 'text-red-600'}`}>
                        {withdrawalCalculation.withdrawalRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-400">
                        {withdrawalCalculation.withdrawalRate <= 4 ? 'Safe' : withdrawalCalculation.withdrawalRate <= 5 ? 'Moderate' : 'Risky'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">4% Rule Suggests</p>
                      <p className="text-xl font-bold text-blue-600">{fmtCompact(withdrawalCalculation.sustainableWithdrawal)}</p>
                      <p className="text-xs text-gray-400">per year</p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 text-center">
                    Without investment growth: {withdrawalCalculation.simpleYears} years
                  </p>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8">
                  <span className="text-4xl mb-3">💰</span>
                  <p className="text-sm">Enter an amount to see how long it will last</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WIPTab
