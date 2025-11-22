import { useState, useMemo } from 'react'

function WIPTab({ data }) {
  const { gapProjections, profile } = data
  const projections = gapProjections?.projections || []

  // State for year slider
  const [selectedYear, setSelectedYear] = useState(1)
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
      netWorth: p.netWorth
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

            {/* Income - Nominal (Future Dollars) */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Income (Future $)</span>
                <span className="text-lg">💵</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">
                {fmtCompact(yearMetrics.incomeNominal)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Nominal value in Year {selectedYear}
              </p>
            </div>

            {/* Income - Present Value (Today's Dollars) */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Income (Today's $)</span>
                <span className="text-lg">💰</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {fmtCompact(yearMetrics.incomePV)}
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

      {/* Coming Soon Section */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">🔮 Coming Soon</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl mb-2">📊</div>
            <h4 className="font-medium text-gray-800">Impact Analysis</h4>
            <p className="text-xs text-gray-500 mt-1">See how expense/income changes affect FIRE metrics</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl mb-2">🔬</div>
            <h4 className="font-medium text-gray-800">Sensitivity Analysis</h4>
            <p className="text-xs text-gray-500 mt-1">Test different growth rates and inflation scenarios</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl mb-2">👨‍👩‍👧</div>
            <h4 className="font-medium text-gray-800">Life Planner</h4>
            <p className="text-xs text-gray-500 mt-1">Plan for children, partners, education, relocations</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WIPTab
