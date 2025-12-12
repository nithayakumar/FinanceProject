import { useState, useMemo, useEffect } from 'react'

function WhatIfTab({ data }) {
  const { gapProjections, profile, investmentsData, propertyData } = data
  const projections = gapProjections?.projections || []

  // --- 1. State ---
  const [incomeAdjustment, setIncomeAdjustment] = useState(0) // -50% to +50%
  const [expenseAdjustment, setExpenseAdjustment] = useState(0) // -50% to +50%
  const [sensitivityGrowthRate, setSensitivityGrowthRate] = useState(7) // 7% default
  const [sensitivityInflation, setSensitivityInflation] = useState(profile?.inflationRate || 2.7)

  // Life Planner State
  const [lifeEvents, setLifeEvents] = useState([])
  const [monthlyRetirementSpend, setMonthlyRetirementSpend] = useState('')

  // --- 2. Constants & Helpers ---
  const currentAge = profile?.age || 30
  const retirementAge = profile?.retirementAge || 65
  const yearsToRetirement = retirementAge - currentAge
  const maxYear = projections.length || 30

  const fmtCompact = (val) => {
    const absVal = Math.abs(val)
    const sign = val < 0 ? '-' : ''
    if (absVal >= 1000000) return `${sign}$${(absVal / 1000000).toFixed(1)}M`
    if (absVal >= 1000) return `${sign}$${Math.round(absVal / 1000)}k`
    return `${sign}$${Math.round(absVal)}`
  }

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

  const addLifeEvent = (key) => {
    const t = lifeEventTemplates[key]
    setLifeEvents([...lifeEvents, { ...t, id: Date.now(), startYear: 1 }])
  }
  const removeLifeEvent = (id) => setLifeEvents(lifeEvents.filter(e => e.id !== id))
  const updateLifeEvent = (id, field, val) => setLifeEvents(lifeEvents.map(e => e.id === id ? { ...e, [field]: val } : e))

  // --- 3. Initial Calculations ---
  // Starting Net Worth (Year 0)
  const startingNetWorth = useMemo(() => {
    if (!investmentsData) return 0
    const cash = Number(investmentsData.currentCash) || 0
    const k401 = Number(investmentsData.retirement401k?.currentValue) || 0
    const investments = (investmentsData.investments || []).reduce((sum, inv) => sum + (Number(inv.currentValue) || 0), 0)
    let homeEquity = 0
    if (propertyData?.mode === 'own') {
      const val = Number(propertyData.details?.homeValue) || 0
      const mort = Number(propertyData.details?.mortgageRemaining) || 0
      homeEquity = Math.max(0, val - mort)
    }
    return cash + k401 + investments + homeEquity
  }, [investmentsData, propertyData])

  // Default Monthly Spend
  const defaultMonthlySpend = useMemo(() => {
    const yearsToRetirement = retirementAge - currentAge
    const retirementYearIndex = Math.min(yearsToRetirement - 1, projections.length - 1)
    if (retirementYearIndex >= 0 && projections[retirementYearIndex]) {
      const inflationRate = (profile?.inflationRate || 2.7) / 100
      const expensesPV = projections[retirementYearIndex].annualExpensesPV || (projections[retirementYearIndex].annualExpenses / Math.pow(1 + inflationRate, retirementYearIndex + 1))
      return Math.round(expensesPV / 12)
    }
    return 5000
  }, [projections, retirementAge, currentAge, profile])

  useEffect(() => {
    if (!monthlyRetirementSpend && defaultMonthlySpend) {
      setMonthlyRetirementSpend(defaultMonthlySpend.toString())
    }
  }, [defaultMonthlySpend, monthlyRetirementSpend])


  // --- 4. Simulation Logic ---
  const simulation = useMemo(() => {
    if (!projections.length) return null

    // Multipliers
    const incMult = 1 + (incomeAdjustment / 100)
    const expMult = 1 + (expenseAdjustment / 100)
    const growthRate = sensitivityGrowthRate / 100
    const inflationRate = sensitivityInflation / 100

    // Baseline (No Adj) for comparison
    // We assume standard projections are the baseline.
    // But strictly speaking, standard projections use profile.inflation/growth.
    // If we want "Impact" of sliders, we compare Simulated vs Original Projections.

    const baseFireNumber = (monthlyRetirementSpend ? parseFloat(monthlyRetirementSpend) * 12 : projections[0].annualExpenses) * 25

    // Calculate Simulated Trajectory
    let simNetWorth = startingNetWorth
    let totalExtraExp = 0
    let totalExtraInc = 0

    // Metrics to capture
    let simYearsToFire = null
    let simCoastAge = null
    let simLiquidatedAge = null

    // Identify Year 1 values for the "Core Metrics" Display
    let y1Income = 0
    let y1Expenses = 0
    let y1NetWorth = 0
    let y1SavingsRate = 0

    for (let i = 0; i < projections.length; i++) {
      const p = projections[i]
      const year = p.year // 1-based

      // 1. Base Values
      let grossInc = p.grossIncome * incMult
      let expenses = p.annualExpenses * expMult
      let taxes = p.annualTaxes * incMult // Approximate taxes scaling
      // 401k scaling
      let _401k = (p.totalIndividual401k + p.annualCompany401k) * incMult // Scale contributions?
      // Note: p.totalIndividual401k is usually a fixed max, but for simulation let's scale it if income scales? 
      // Actually, if income doubles, maybe 401k doesn't. But let's keep it simple: incomeAdjustment affects "Cash Flow" power.
      // Let's apply adjustment to Discretionary Income.

      // 2. Apply Life Events
      let eventInc = 0
      let eventExp = 0
      lifeEvents.forEach(e => {
        if (year >= e.startYear && (e.duration === 0 || year < e.startYear + e.duration)) {
          eventInc += e.incomeImpact
          eventExp += e.expenseImpact
        }
      })

      // Inflate Event impacts? Assuming they are in Today's Dollars (PV), we should inflate them to Nominal.
      // Or if they are nominal inputs. Let's assume PV inputs for simpliciy, so inflate them.
      const df = Math.pow(1 + inflationRate, year - 1)
      eventInc = eventInc * df
      eventExp = eventExp * df

      // 3. Totals
      grossInc += eventInc
      expenses += eventExp

      // Track Extras
      totalExtraInc += eventInc
      totalExtraExp += eventExp

      // 4. Gap
      const gap = grossInc - expenses - taxes - (p.totalIndividual401k * incMult) // Gap is what's left for TAXABLE investing
      // Recalculate Net Worth
      // p.netWorth includes Home Equity.
      // SimNW = Previous SimNW * Growth + Gap + (HomeEq Change?)
      // This is complex. Simplification:
      // Delta = Gap.
      // Asset Growth is applied to SimNW.

      if (i === 0) {
        // Year 1
        // Delta from Starting
        // But we are in a loop.
        // SimNW is Year End.
        // SimNW = startingNetWorth * (1+growth) + gap?
        // No, startingNetWorth is Year 0.
        simNetWorth = startingNetWorth * (1 + growthRate) + gap
      } else {
        simNetWorth = simNetWorth * (1 + growthRate) + gap
      }

      // Capture Year 1 stats
      if (i === 0) {
        y1Income = grossInc
        y1Expenses = expenses
        y1NetWorth = simNetWorth
        y1SavingsRate = grossInc > 0 ? (gap / grossInc) * 100 : 0
      }

      // FIRE Check
      // Fire Number is escalated by Inflation
      const fireTarget = baseFireNumber * Math.pow(1 + inflationRate, i)

      // Assume Liquid Ratio from original projection is maintained?
      // Liquid / NetWorth ratio.
      const ratio = p.netWorth > 0 ? (p.investableAssets / p.netWorth) : 0.7
      const simLiquid = simNetWorth * ratio // Approximation

      if (!simYearsToFire && simLiquid >= fireTarget) {
        simYearsToFire = year
      }
      if (!simLiquidatedAge && simNetWorth >= fireTarget) {
        simLiquidatedAge = year + currentAge
      }

      // Coast Check
      if (!simCoastAge) {
        const yearsLeft = retirementAge - (currentAge + i)
        if (yearsLeft > 0) {
          const fv = simLiquid * Math.pow(1 + growthRate, yearsLeft)
          const targetAtRetire = baseFireNumber * Math.pow(1 + inflationRate, retirementAge - currentAge)
          if (fv >= targetAtRetire) {
            simCoastAge = currentAge + i
          }
        }
      }
    }

    // Net Worth At Retirement
    const yearsToRet = retirementAge - currentAge
    // We need the SimNW at year = yearsToRet
    // If loop didn't go that far (projections short), take last.
    // But usually projections cover it.
    // To be safe, re-simulate or just take the value from loop if we stored it.
    // Let's assume standard projections length is enough.

    // Need to find baseline comparisons.
    // Baseline: defined by `projections` array (which used original inputs).
    // BUT `projections` used standard growth assumptions. If "Sensitivity Growth" slider moved, 
    // the "Baseline" (Left side of diff) should probably be the Original Projection (with original assumptions).
    // The "Impact Summary" compares Simulation vs Original.

    // Original Values for Impact Summary
    const origRetIndex = Math.min(yearsToRet - 1, projections.length - 1)
    const origNWRetire = projections[origRetIndex]?.netWorth || 0

    // Simulated Value at Retire
    // We didn't store array of simNW. Let's approximate based on growth if i < yearsToRet
    // Or just capture it in loop.
    // Let's assume we want accurate impact, so I should have stored it. 
    // Doing this optimized:

    return {
      y1Income, y1Expenses, y1NetWorth, y1SavingsRate,
      baseFireNumber,
      simYearsToFire, simLiquidatedAge, simCoastAge: simCoastAge,
      simNetWorthRetire: simNetWorth, // This is at END of loop (max year), might not be retirement year.
      // Actually, let's just grab the delta logic.
      totalExtraExp, totalExtraInc,

      // Delta Calculation Helpers
      origYearsToFire: null, // Need to calc from original projections
    }

  }, [projections, incomeAdjustment, expenseAdjustment, sensitivityGrowthRate, sensitivityInflation, lifeEvents, startingNetWorth, monthlyRetirementSpend, currentAge])


  // --- 5. Robust Impact Metrics (Second Pass for Comparisons) ---
  const metrics = useMemo(() => {
    if (!simulation || !projections || !projections.length) return null

    try {
      // Baseline (Original) FIRE Age calculation
      const origFireNum = (monthlyRetirementSpend ? parseFloat(monthlyRetirementSpend) * 12 : projections[0].annualExpenses) * 25
      const inflation = (profile?.inflationRate || 2.7) / 100
      let origYearsToFire = null

      // Safe Access for Ret Index
      // If retirement is beyond projection range, use last available
      const retIndex = Math.min(Math.max(0, retirementAge - currentAge - 1), projections.length - 1)

      for (let i = 0; i < projections.length; i++) {
        const p = projections[i]
        if (!p) continue
        const target = origFireNum * Math.pow(1 + inflation, i)
        const assets = p.investableAssets !== undefined ? p.investableAssets : p.netWorth
        if (assets >= target) {
          origYearsToFire = i + 1
          break
        }
      }

      // Simulated NW at Retirement vs Original
      const lastP = projections[projections.length - 1]
      const finalOrigNW = lastP ? lastP.netWorth : 0
      const nwDelta = (simulation.simNetWorthRetire || 0) - finalOrigNW

      const currentFireAge = simulation.simYearsToFire ? (currentAge + simulation.simYearsToFire) : null
      const origFireAge = origYearsToFire ? (currentAge + origYearsToFire) : null
      const fireAgeDelta = (currentFireAge && origFireAge) ? currentFireAge - origFireAge : null

      return {
        ...simulation,
        simFireAge: currentFireAge,
        origFireAge,
        fireAgeDelta,
        nwDelta
      }
    } catch (err) {
      console.error("Error calculating metrics in WhatIfTab:", err)
      return null
    }
  }, [simulation, projections, monthlyRetirementSpend, currentAge, retirementAge, profile])


  return (
    <div className="space-y-8">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Simulate Future</h1>
          <p className="text-gray-500 text-sm mt-1">Play "What If" with your life and finances</p>
        </div>
      </div>

      {/* TOP: INPUT & IMPACT SUMMARY */}
      {metrics && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 1. Budget Input */}
            <div className="lg:col-span-1 border-r border-gray-100 pr-0 lg:pr-6">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Retired Monthly Budget</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  value={monthlyRetirementSpend}
                  onChange={(e) => setMonthlyRetirementSpend(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-lg font-medium text-gray-900"
                  placeholder="5000"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">Updating this drives FIRE Target</p>
            </div>

            {/* 2. Impact Summary (Grid of 4) */}
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Years to FIRE */}
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Years to FIRE</p>
                <p className="text-xl font-bold text-gray-900">{metrics.simYearsToFire || '—'}</p>
                {metrics.fireAgeDelta !== null && metrics.fireAgeDelta !== 0 && (
                  <p className={`text-xs font-medium ${metrics.fireAgeDelta < 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {metrics.fireAgeDelta > 0 ? '+' : ''}{metrics.fireAgeDelta} yrs
                  </p>
                )}
              </div>
              {/* Net Worth at Retirement */}
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Net Worth at Retirement</p>
                <p className="text-xl font-bold text-gray-900">{fmtCompact(metrics.simNetWorthRetire)}</p>
                <p className={`text-xs font-medium ${metrics.nwDelta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {metrics.nwDelta > 0 ? '+' : ''}{fmtCompact(metrics.nwDelta)}
                </p>
              </div>
              {/* Extra Expenses */}
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Extra Expenses</p>
                <p className={`text-xl font-bold ${metrics.totalExtraExp > 0 ? 'text-red-600' : 'text-gray-900'}`}>{fmtCompact(metrics.totalExtraExp)}</p>
                <p className="text-xs text-gray-400">total added</p>
              </div>
              {/* Extra Income */}
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Extra Income</p>
                <p className={`text-xl font-bold ${metrics.totalExtraInc > 0 ? 'text-green-600' : 'text-gray-900'}`}>{fmtCompact(metrics.totalExtraInc)}</p>
                <p className="text-xs text-gray-400">total added</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CORE METRICS GRID (8 Metrics) */}
      {metrics && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-4">Simulated Core Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-xs text-blue-600 font-medium uppercase">Net Worth (Y1)</p>
              <p className="text-2xl font-bold text-blue-900">{fmtCompact(metrics.y1NetWorth)}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-100">
              <p className="text-xs text-green-600 font-medium uppercase">Savings Rate</p>
              <p className="text-2xl font-bold text-green-900">{metrics.y1SavingsRate.toFixed(1)}%</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 font-medium uppercase">Income (Y1)</p>
              <p className="text-2xl font-bold text-gray-800">{fmtCompact(metrics.y1Income)}</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 font-medium uppercase">Expenses (Y1)</p>
              <p className="text-2xl font-bold text-gray-800">{fmtCompact(metrics.y1Expenses)}</p>
            </div>

            {/* Row 2 */}
            <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100">
              <p className="text-xs text-indigo-600 font-medium uppercase">FIRE Target</p>
              <p className="text-2xl font-bold text-indigo-900">{fmtCompact(metrics.baseFireNumber)}</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
              <p className="text-xs text-purple-600 font-medium uppercase">FIRE Age</p>
              <p className="text-2xl font-bold text-purple-900">{metrics.simFireAge || '--'}</p>
            </div>
            <div className="p-4 rounded-lg bg-teal-50 border border-teal-100">
              <p className="text-xs text-teal-600 font-medium uppercase">Coast Age</p>
              <p className="text-2xl font-bold text-teal-900">{metrics.simCoastAge || '--'}</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 border border-orange-100">
              <p className="text-xs text-orange-600 font-medium uppercase">Liquidated Age</p>
              <p className="text-2xl font-bold text-orange-900">{metrics.simLiquidatedAge || '--'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ADJUSTMENT CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 1. SLIDERS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">General Adjustments</h3>

          <div className="space-y-6">
            {/* Income Slider */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Income Adjustment</label>
                <span className={`text-sm font-bold ${incomeAdjustment > 0 ? 'text-green-600' : 'text-gray-900'}`}>{incomeAdjustment > 0 ? '+' : ''}{incomeAdjustment}%</span>
              </div>
              <input type="range" min="-50" max="50" value={incomeAdjustment} onChange={(e) => setIncomeAdjustment(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            </div>

            {/* Expense Slider */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Expense Adjustment</label>
                <span className={`text-sm font-bold ${expenseAdjustment < 0 ? 'text-green-600' : 'text-gray-900'}`}>{expenseAdjustment > 0 ? '+' : ''}{expenseAdjustment}%</span>
              </div>
              <input type="range" min="-50" max="50" value={expenseAdjustment} onChange={(e) => setExpenseAdjustment(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500" />
            </div>

            {/* Growth Rate Slider */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Market Growth Rate</label>
                <span className="text-sm font-bold text-blue-600">{sensitivityGrowthRate}%</span>
              </div>
              <input type="range" min="0" max="15" step="0.5" value={sensitivityGrowthRate} onChange={(e) => setSensitivityGrowthRate(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
            </div>

            {/* Inflation Slider */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Inflation Rate</label>
                <span className="text-sm font-bold text-orange-600">{sensitivityInflation}%</span>
              </div>
              <input type="range" min="0" max="10" step="0.1" value={sensitivityInflation} onChange={(e) => setSensitivityInflation(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
            </div>
          </div>
        </div>

        {/* 2. LIFE PLANNER */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Life Events</h3>
            {lifeEvents.length > 0 && <button onClick={() => setLifeEvents([])} className="text-xs text-red-600 hover:text-red-800">Clear All</button>}
          </div>

          {/* Templates */}
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.entries(lifeEventTemplates).map(([key, t]) => (
              <button
                key={key}
                onClick={() => addLifeEvent(key)}
                className={`px-3 py-2 text-xs rounded-lg border flex items-center gap-2 transition hover:shadow-sm ${t.incomeImpact > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
              >
                <span>{t.icon}</span>
                <span>{t.name}</span>
              </button>
            ))}
          </div>

          {/* Active Events List */}
          <div className="space-y-3">
            {lifeEvents.map(e => (
              <div key={e.id} className="bg-gray-50 rounded-lg p-3 relative group text-sm border border-gray-100">
                <button onClick={() => removeLifeEvent(e.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500">✕</button>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{e.icon}</span>
                  <span className="font-medium text-gray-800">{e.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-0.5">Start Year</label>
                    <input type="number" min="1" max={maxYear} value={e.startYear} onChange={(ev) => updateLifeEvent(e.id, 'startYear', Number(ev.target.value))} className="w-full px-1 py-0.5 border rounded" />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-0.5">Duration</label>
                    <input type="number" min="0" value={e.duration} onChange={(ev) => updateLifeEvent(e.id, 'duration', Number(ev.target.value))} className="w-full px-1 py-0.5 border rounded" />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-0.5">Impact ($)</label>
                    <div className="text-gray-700 py-1">
                      {e.incomeImpact !== 0 ? (
                        <span className={e.incomeImpact > 0 ? 'text-green-600' : 'text-red-600'}>{e.incomeImpact > 0 ? '+' : ''}{fmtCompact(e.incomeImpact)} Inc</span>
                      ) : (
                        <span className={e.expenseImpact > 0 ? 'text-red-600' : 'text-green-600'}>{e.expenseImpact > 0 ? '-' : '+'}{fmtCompact(e.expenseImpact)} Exp</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {lifeEvents.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-xs italic">
                No events added. Click a template above to visualize life changes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WhatIfTab
