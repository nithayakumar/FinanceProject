import { useState, useMemo } from 'react'

function WIPTab({ data }) {
  const { gapProjections, profile } = data
  const projections = gapProjections?.projections || []

  // Calculate FIRE metrics
  const fireMetrics = useMemo(() => {
    if (!projections.length) return null

    const currentYear = projections[0]
    const currentAge = profile?.age || 30
    const retirementAge = profile?.retirementAge || 65
    const inflationRate = (profile?.inflationRate || 2.7) / 100

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
    // Coast FIRE = Age at which your current investments will grow to FIRE Number by retirement
    // without any additional contributions
    // Formula: PV * (1 + r)^n = FV, solve for n where PV = current net worth, FV = FIRE number at retirement
    const assumedGrowthRate = 0.07 // 7% real return
    const yearsToRetirement = retirementAge - currentAge
    const fireNumberAtRetirement = fireNumber * Math.pow(1 + inflationRate, yearsToRetirement)

    // Find coast FIRE age by simulating when current investments can coast
    let coastFireAge = null
    for (let i = 0; i < projections.length; i++) {
      const yearNetWorth = projections[i].netWorth
      const yearsRemaining = yearsToRetirement - i
      if (yearsRemaining <= 0) break

      // Will this net worth grow to FIRE number by retirement?
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
  }, [projections, profile])

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

      {/* FIRE KPI Cards */}
      {fireMetrics && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">🔥 FIRE Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Savings Rate */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Savings Rate</span>
                <span className="text-2xl">💰</span>
              </div>
              <p className={`text-3xl font-bold ${fireMetrics.savingsRate >= 50 ? 'text-green-600' : fireMetrics.savingsRate >= 25 ? 'text-blue-600' : 'text-orange-600'}`}>
                {fireMetrics.savingsRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {fmtCompact(fireMetrics.year1Gap)} of {fmtCompact(fireMetrics.year1GrossIncome)} (Year 1)
              </p>
              <div className="mt-3 h-2 bg-gray-200 rounded-full">
                <div
                  className={`h-2 rounded-full ${fireMetrics.savingsRate >= 50 ? 'bg-green-500' : fireMetrics.savingsRate >= 25 ? 'bg-blue-500' : 'bg-orange-500'}`}
                  style={{ width: `${Math.min(fireMetrics.savingsRate, 100)}%` }}
                />
              </div>
            </div>

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
