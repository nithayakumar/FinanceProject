import { useState, useMemo } from 'react'

function WhatIfTab({ data }) {
  const { gapProjections, profile } = data
  const projections = gapProjections?.projections || []

  // State for adjustments
  const [incomeAdjustment, setIncomeAdjustment] = useState(0)
  const [expenseAdjustment, setExpenseAdjustment] = useState(0)
  const [sensitivityGrowthRate, setSensitivityGrowthRate] = useState(7)
  const [sensitivityInflation, setSensitivityInflation] = useState(profile?.inflationRate || 2.7)

  const currentAge = profile?.age || 30
  const retirementAge = profile?.retirementAge || 65
  const baselineInflationRate = (profile?.inflationRate || 2.7) / 100
  const yearsToRetirement = retirementAge - currentAge

  // Calculate baseline metrics (no adjustments)
  const baselineMetrics = useMemo(() => {
    if (!projections.length) return null

    const growthRate = 0.07 // 7% baseline
    const inflationRate = baselineInflationRate
    const currentYear = projections[0]

    // Year 1 baseline values
    const year1GrossIncome = currentYear.grossIncome
    const year1Expenses = currentYear.annualExpenses
    const year1Taxes = currentYear.annualTaxes
    const year1_401k = currentYear.totalIndividual401k
    const year1Gap = year1GrossIncome - year1Taxes - year1Expenses - year1_401k
    const year1NetWorth = currentYear.netWorth

    // Savings Rate
    const savingsRate = year1GrossIncome > 0 ? (year1Gap / year1GrossIncome) * 100 : 0

    // FIRE Number
    const fireNumber = year1Expenses * 25

    // Simulate net worth trajectory
    const simulatedNetWorths = [year1NetWorth]
    let simNetWorth = year1NetWorth
    for (let i = 1; i <= Math.max(projections.length, yearsToRetirement); i++) {
      simNetWorth = simNetWorth * (1 + growthRate) + year1Gap
      simulatedNetWorths.push(simNetWorth)
    }

    // Years to Early Retirement
    let yearsToFire = null
    for (let i = 0; i < simulatedNetWorths.length; i++) {
      const inflatedFireNumber = fireNumber * Math.pow(1 + inflationRate, i)
      if (simulatedNetWorths[i] >= inflatedFireNumber) {
        yearsToFire = i + 1
        break
      }
    }

    // Coast FIRE Age (Live on Investments Age)
    let coastFireAge = null
    for (let i = 0; i < Math.min(simulatedNetWorths.length, yearsToRetirement); i++) {
      const yearNetWorth = simulatedNetWorths[i]
      const yearsRemaining = yearsToRetirement - i
      if (yearsRemaining <= 0) break

      const futureValue = yearNetWorth * Math.pow(1 + growthRate, yearsRemaining)
      const targetFireNumber = fireNumber * Math.pow(1 + inflationRate, yearsToRetirement)

      if (futureValue >= targetFireNumber) {
        coastFireAge = currentAge + i
        break
      }
    }

    // Net worth at retirement
    const netWorthAtRetirement = simulatedNetWorths[yearsToRetirement] || simNetWorth
    const netWorthAtRetirementPV = netWorthAtRetirement / Math.pow(1 + inflationRate, yearsToRetirement)

    // Calculate growth from investing (at retirement)
    const totalContributed = year1Gap * yearsToRetirement
    const growthFromInvesting = netWorthAtRetirement - year1NetWorth - totalContributed
    const growthPercent = (netWorthAtRetirement - year1NetWorth) > 0
      ? (growthFromInvesting / (netWorthAtRetirement - year1NetWorth)) * 100
      : 0

    // Net Worth CAGR
    const netWorthCAGR = year1NetWorth > 0
      ? (Math.pow(netWorthAtRetirement / year1NetWorth, 1 / yearsToRetirement) - 1) * 100
      : 0

    return {
      savingsRate,
      fireNumber,
      yearsToFire,
      coastFireAge,
      year1Gap,
      year1NetWorth,
      netWorthAtRetirement,
      netWorthAtRetirementPV,
      growthPercent,
      netWorthCAGR
    }
  }, [projections, baselineInflationRate, yearsToRetirement, currentAge])

  // Calculate adjusted metrics (with adjustments applied)
  const adjustedMetrics = useMemo(() => {
    if (!projections.length || !baselineMetrics) return null

    const growthRate = sensitivityGrowthRate / 100
    const inflationRate = sensitivityInflation / 100
    const incomeMultiplier = 1 + (incomeAdjustment / 100)
    const expenseMultiplier = 1 + (expenseAdjustment / 100)

    const currentYear = projections[0]

    // Year 1 adjusted values
    const year1GrossIncome = currentYear.grossIncome * incomeMultiplier
    const year1Expenses = currentYear.annualExpenses * expenseMultiplier
    const year1Taxes = currentYear.annualTaxes * incomeMultiplier
    const year1_401k = currentYear.totalIndividual401k * incomeMultiplier
    const year1Gap = year1GrossIncome - year1Taxes - year1Expenses - year1_401k
    const year1NetWorth = currentYear.netWorth

    // Savings Rate
    const savingsRate = year1GrossIncome > 0 ? (year1Gap / year1GrossIncome) * 100 : 0

    // FIRE Number
    const fireNumber = year1Expenses * 25

    // Simulate net worth trajectory
    const simulatedNetWorths = [year1NetWorth]
    let simNetWorth = year1NetWorth
    for (let i = 1; i <= Math.max(projections.length, yearsToRetirement); i++) {
      simNetWorth = simNetWorth * (1 + growthRate) + year1Gap
      simulatedNetWorths.push(simNetWorth)
    }

    // Years to Early Retirement
    let yearsToFire = null
    for (let i = 0; i < simulatedNetWorths.length; i++) {
      const inflatedFireNumber = fireNumber * Math.pow(1 + inflationRate, i)
      if (simulatedNetWorths[i] >= inflatedFireNumber) {
        yearsToFire = i + 1
        break
      }
    }

    // Coast FIRE Age (Live on Investments Age)
    let coastFireAge = null
    for (let i = 0; i < Math.min(simulatedNetWorths.length, yearsToRetirement); i++) {
      const yearNetWorth = simulatedNetWorths[i]
      const yearsRemaining = yearsToRetirement - i
      if (yearsRemaining <= 0) break

      const futureValue = yearNetWorth * Math.pow(1 + growthRate, yearsRemaining)
      const targetFireNumber = fireNumber * Math.pow(1 + inflationRate, yearsToRetirement)

      if (futureValue >= targetFireNumber) {
        coastFireAge = currentAge + i
        break
      }
    }

    // Net worth at retirement
    const netWorthAtRetirement = simulatedNetWorths[yearsToRetirement] || simNetWorth
    const netWorthAtRetirementPV = netWorthAtRetirement / Math.pow(1 + inflationRate, yearsToRetirement)

    // Calculate growth from investing (at retirement)
    const totalContributed = year1Gap * yearsToRetirement
    const growthFromInvesting = netWorthAtRetirement - year1NetWorth - totalContributed
    const growthPercent = (netWorthAtRetirement - year1NetWorth) > 0
      ? (growthFromInvesting / (netWorthAtRetirement - year1NetWorth)) * 100
      : 0

    // Net Worth CAGR
    const netWorthCAGR = year1NetWorth > 0
      ? (Math.pow(netWorthAtRetirement / year1NetWorth, 1 / yearsToRetirement) - 1) * 100
      : 0

    return {
      savingsRate,
      fireNumber,
      yearsToFire,
      coastFireAge,
      year1Gap,
      year1NetWorth,
      netWorthAtRetirement,
      netWorthAtRetirementPV,
      growthPercent,
      netWorthCAGR
    }
  }, [projections, baselineMetrics, incomeAdjustment, expenseAdjustment, sensitivityGrowthRate, sensitivityInflation, yearsToRetirement, currentAge])

  const fmtCompact = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `$${Math.round(val / 1000)}k`
    return `$${Math.round(val)}`
  }

  const fmtChange = (current, baseline, isPercent = false, isYears = false, isAge = false) => {
    if (current === null || baseline === null) return { change: null, changeText: '—' }

    const diff = current - baseline

    if (isAge || isYears) {
      const sign = diff > 0 ? '+' : ''
      return {
        change: diff,
        changeText: diff === 0 ? '—' : `${sign}${diff} ${isYears ? 'yrs' : ''}`
      }
    }

    if (isPercent) {
      const sign = diff > 0 ? '+' : ''
      return {
        change: diff,
        changeText: diff === 0 ? '—' : `${sign}${diff.toFixed(1)}%`
      }
    }

    const sign = diff > 0 ? '+' : ''
    return {
      change: diff,
      changeText: diff === 0 ? '—' : `${sign}${fmtCompact(diff)}`
    }
  }

  const isAdjusted = incomeAdjustment !== 0 || expenseAdjustment !== 0 ||
                     sensitivityGrowthRate !== 7 || sensitivityInflation !== (profile?.inflationRate || 2.7)

  return (
    <div className="space-y-8">
      {/* Global Assumptions */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎛️</span>
            <h3 className="text-sm font-semibold text-gray-800">Global Assumptions</h3>
          </div>
          {isAdjusted && (
            <button
              onClick={() => {
                setIncomeAdjustment(0)
                setExpenseAdjustment(0)
                setSensitivityGrowthRate(7)
                setSensitivityInflation(profile?.inflationRate || 2.7)
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Reset to defaults
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Income Adjustment */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-24">Income</span>
            <input
              type="range"
              min="-50"
              max="50"
              value={incomeAdjustment}
              onChange={(e) => setIncomeAdjustment(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
            <span className={`text-sm font-bold w-14 text-right ${incomeAdjustment > 0 ? 'text-green-600' : incomeAdjustment < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {incomeAdjustment > 0 ? '+' : ''}{incomeAdjustment}%
            </span>
          </div>
          {/* Expense Adjustment */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-24">Expenses</span>
            <input
              type="range"
              min="-50"
              max="50"
              value={expenseAdjustment}
              onChange={(e) => setExpenseAdjustment(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            <span className={`text-sm font-bold w-14 text-right ${expenseAdjustment < 0 ? 'text-green-600' : expenseAdjustment > 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {expenseAdjustment > 0 ? '+' : ''}{expenseAdjustment}%
            </span>
          </div>
          {/* Growth Rate */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-24">Growth Rate</span>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={sensitivityGrowthRate}
              onChange={(e) => setSensitivityGrowthRate(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <span className={`text-sm font-bold w-14 text-right ${sensitivityGrowthRate > 7 ? 'text-green-600' : sensitivityGrowthRate < 7 ? 'text-orange-600' : 'text-purple-600'}`}>
              {sensitivityGrowthRate}%
            </span>
          </div>
          {/* Inflation Rate */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-24">Inflation Rate</span>
            <input
              type="range"
              min="0"
              max="8"
              step="0.1"
              value={sensitivityInflation}
              onChange={(e) => setSensitivityInflation(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
            <span className={`text-sm font-bold w-14 text-right ${sensitivityInflation < 2.7 ? 'text-green-600' : sensitivityInflation > 4 ? 'text-red-600' : 'text-orange-600'}`}>
              {sensitivityInflation.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Quick Scenarios */}
        <div className="pt-3 border-t border-indigo-200">
          <p className="text-xs text-gray-500 mb-2">Quick Scenarios:</p>
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
            <button
              onClick={() => { setSensitivityGrowthRate(4); setSensitivityInflation(4); }}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
            >
              Bear market (4%/4%)
            </button>
            <button
              onClick={() => { setSensitivityGrowthRate(10); setSensitivityInflation(2); }}
              className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200"
            >
              Bull market (10%/2%)
            </button>
          </div>
        </div>
      </div>

      {/* Simulation Results */}
      {adjustedMetrics && baselineMetrics && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Simulation Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Savings Rate */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Savings Rate</span>
                <span className="text-xl">💰</span>
              </div>
              <p className={`text-3xl font-bold ${adjustedMetrics.savingsRate >= 50 ? 'text-green-600' : adjustedMetrics.savingsRate >= 25 ? 'text-blue-600' : adjustedMetrics.savingsRate >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                {adjustedMetrics.savingsRate.toFixed(1)}%
              </p>
              {(() => {
                const { change, changeText } = fmtChange(adjustedMetrics.savingsRate, baselineMetrics.savingsRate, true)
                return (
                  <>
                    <p className={`text-sm font-medium mt-1 ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {changeText}
                    </p>
                    <p className="text-xs text-gray-400">was {baselineMetrics.savingsRate.toFixed(1)}%</p>
                  </>
                )
              })()}
            </div>

            {/* Net Worth CAGR */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Net Worth CAGR</span>
                <span className="text-xl">📈</span>
              </div>
              <p className={`text-3xl font-bold ${adjustedMetrics.netWorthCAGR >= 10 ? 'text-green-600' : adjustedMetrics.netWorthCAGR >= 7 ? 'text-blue-600' : 'text-orange-600'}`}>
                {adjustedMetrics.netWorthCAGR.toFixed(1)}%
              </p>
              {(() => {
                const { change, changeText } = fmtChange(adjustedMetrics.netWorthCAGR, baselineMetrics.netWorthCAGR, true)
                return (
                  <>
                    <p className={`text-sm font-medium mt-1 ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {changeText}
                    </p>
                    <p className="text-xs text-gray-400">was {baselineMetrics.netWorthCAGR.toFixed(1)}%</p>
                  </>
                )
              })()}
            </div>

            {/* Early Retire Net Worth */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Early Retire Net Worth</span>
                <span className="text-xl">🎯</span>
              </div>
              <p className="text-3xl font-bold text-purple-600">
                {fmtCompact(adjustedMetrics.fireNumber)}
              </p>
              {(() => {
                const { change, changeText } = fmtChange(adjustedMetrics.fireNumber, baselineMetrics.fireNumber)
                return (
                  <>
                    <p className={`text-sm font-medium mt-1 ${change < 0 ? 'text-green-600' : change > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {changeText}
                    </p>
                    <p className="text-xs text-gray-400">was {fmtCompact(baselineMetrics.fireNumber)}</p>
                  </>
                )
              })()}
            </div>

            {/* Years to Early Retirement */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Years to Early Retirement</span>
                <span className="text-xl">📅</span>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {adjustedMetrics.yearsToFire ? `${adjustedMetrics.yearsToFire}` : '—'}
              </p>
              {(() => {
                const { change, changeText } = fmtChange(adjustedMetrics.yearsToFire, baselineMetrics.yearsToFire, false, true)
                return (
                  <>
                    <p className={`text-sm font-medium mt-1 ${change < 0 ? 'text-green-600' : change > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {changeText}
                    </p>
                    <p className="text-xs text-gray-400">was {baselineMetrics.yearsToFire || '—'} years</p>
                  </>
                )
              })()}
            </div>

            {/* Live on Investments Age */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Live on Investments Age</span>
                <span className="text-xl">🏖️</span>
              </div>
              <p className="text-3xl font-bold text-teal-600">
                {adjustedMetrics.coastFireAge ? `Age ${adjustedMetrics.coastFireAge}` : '—'}
              </p>
              {(() => {
                const { change, changeText } = fmtChange(adjustedMetrics.coastFireAge, baselineMetrics.coastFireAge, false, false, true)
                return (
                  <>
                    <p className={`text-sm font-medium mt-1 ${change < 0 ? 'text-green-600' : change > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {changeText}
                    </p>
                    <p className="text-xs text-gray-400">was {baselineMetrics.coastFireAge ? `Age ${baselineMetrics.coastFireAge}` : '—'}</p>
                  </>
                )
              })()}
            </div>

            {/* Growth From Investing */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Growth From Investing</span>
                <span className="text-xl">💹</span>
              </div>
              <p className={`text-3xl font-bold ${adjustedMetrics.growthPercent >= 50 ? 'text-purple-600' : adjustedMetrics.growthPercent >= 25 ? 'text-blue-600' : 'text-gray-600'}`}>
                {adjustedMetrics.growthPercent.toFixed(0)}%
              </p>
              {(() => {
                const { change, changeText } = fmtChange(adjustedMetrics.growthPercent, baselineMetrics.growthPercent, true)
                return (
                  <>
                    <p className={`text-sm font-medium mt-1 ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {changeText}
                    </p>
                    <p className="text-xs text-gray-400">was {baselineMetrics.growthPercent.toFixed(0)}%</p>
                  </>
                )
              })()}
            </div>

            {/* Net Worth at Retirement */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Net Worth at Retirement</span>
                <span className="text-xl">🏦</span>
              </div>
              <p className="text-3xl font-bold text-indigo-600">
                {fmtCompact(adjustedMetrics.netWorthAtRetirement)}
              </p>
              {(() => {
                const { change, changeText } = fmtChange(adjustedMetrics.netWorthAtRetirement, baselineMetrics.netWorthAtRetirement)
                return (
                  <>
                    <p className={`text-sm font-medium mt-1 ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {changeText}
                    </p>
                    <p className="text-xs text-gray-400">was {fmtCompact(baselineMetrics.netWorthAtRetirement)}</p>
                  </>
                )
              })()}
            </div>

            {/* Net Worth at Retirement (Today's $) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Net Worth (Today's $)</span>
                <span className="text-xl">💵</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {fmtCompact(adjustedMetrics.netWorthAtRetirementPV)}
              </p>
              {(() => {
                const { change, changeText } = fmtChange(adjustedMetrics.netWorthAtRetirementPV, baselineMetrics.netWorthAtRetirementPV)
                return (
                  <>
                    <p className={`text-sm font-medium mt-1 ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {changeText}
                    </p>
                    <p className="text-xs text-gray-400">was {fmtCompact(baselineMetrics.netWorthAtRetirementPV)}</p>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WhatIfTab
