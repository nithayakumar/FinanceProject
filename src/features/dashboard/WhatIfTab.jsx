import React, { useState, useMemo, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { formatCompactNumber as fmtCompact } from '../../shared/utils/format'

function WhatIfTab({ data }) {
  const { gapProjections, profile, investmentsData, propertyData } = data
  const projections = gapProjections?.projections || []

  // --- 1. State ---
  // Life Events State
  const [lifeEvents, setLifeEvents] = useState([])
  const [monthlyRetirementSpend, setMonthlyRetirementSpend] = useState('')
  const [viewMode, setViewMode] = useState('pv') // 'pv' or 'nominal'
  const isPV = viewMode === 'pv'

  // --- 2. Constants & Helpers ---
  const currentAge = profile?.age || 30
  const retirementAge = profile?.retirementAge || 65
  const yearsToRetirement = retirementAge - currentAge
  const maxYear = projections.length || 30

  const lifeEventTemplates = {
    child: { name: 'Have a Child', expenseImpact: 15000, incomeImpact: 0, duration: 18, icon: '👶' },
    partner: { name: 'Add Partner', expenseImpact: 10000, incomeImpact: 50000, duration: 0, icon: '💑' },
    home: { name: 'Buy Home', expenseImpact: 25000, incomeImpact: 0, duration: 30, icon: '🏠' },
    sabbatical: { name: 'Sabbatical', expenseImpact: 5000, incomeImpact: -100000, duration: 1, icon: '🌴' },
    layoff: { name: 'Temp Layoff', expenseImpact: 0, incomeImpact: -80000, duration: 1, icon: '📉' },
    wedding: { name: 'Wedding', expenseImpact: 30000, incomeImpact: 0, duration: 1, icon: '💒' },
    relocation: { name: 'Relocate (Higher COL)', expenseImpact: 12000, incomeImpact: 20000, duration: 0, icon: '🏙️' },
    relocationLow: { name: 'Relocate (Lower COL)', expenseImpact: -15000, incomeImpact: -10000, duration: 0, icon: '🏡' },
    careerBreak: { name: 'Career Break', expenseImpact: 0, incomeImpact: -80000, duration: 1, icon: '🏖️' },
    custom: { name: 'Custom Event', expenseImpact: 0, incomeImpact: 0, duration: 1, icon: '⚡' },
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
      return Math.round(Math.abs(expensesPV) / 12)
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

    // Use profile's standard growth and inflation rates
    const growthRate = 0.07 // 7% standard growth rate
    const inflationRate = (profile?.inflationRate || 2.7) / 100

    // Baseline (No Adj) for comparison
    // We assume standard projections are the baseline.
    // But strictly speaking, standard projections use profile.inflation/growth.
    // If we want "Impact" of sliders, we compare Simulated vs Original Projections.

    const baseFireNumber = (monthlyRetirementSpend ? Math.abs(parseFloat(monthlyRetirementSpend)) * 12 : projections[0].annualExpenses) * 25

    // Calculate Simulated Trajectory
    let simNetWorth = startingNetWorth
    let totalExtraExp = 0
    let totalExtraInc = 0
    let totalExtraExpPV = 0
    let totalExtraIncPV = 0

    // Metrics to capture
    let simYearsToFire = null
    let simCoastAge = null
    let simLiquidatedAge = null

    // Identify Year 1 values for the "Core Metrics" Display
    let y1Income = 0
    let y1Expenses = 0
    let y1NetWorth = 0
    let y1SavingsRate = 0

    // --- Deflation Helper ---
    const getDeflator = (yearIndex) => isPV ? Math.pow(1 + inflationRate, yearIndex) : 1

    // Chart Data Container
    const charData = []

    for (let i = 0; i < projections.length; i++) {
      const p = projections[i]
      const year = p.year // 1-based
      const deflator = getDeflator(i)

      // 1. Base Values (no adjustments, use original projections)
      let grossInc = p.grossIncome
      let expenses = p.annualExpenses
      let taxes = p.annualTaxes
      let _401k = (p.totalIndividual401k + p.annualCompany401k)

      // 2. Apply Life Events
      let eventIncPV = 0
      let eventExpPV = 0
      lifeEvents.forEach(e => {
        if (year >= e.startYear && (e.duration === 0 || year < e.startYear + e.duration)) {
          eventIncPV += e.incomeImpact
          eventExpPV += e.expenseImpact
        }
      })

      // Inflate Event impacts? Assuming they are in Today's Dollars (PV), we should inflate them to Nominal.
      // And then later deflate if viewMode is PV.
      // ALWAYS inflate to nominal first for calculation logic.
      const inflationFactor = Math.pow(1 + inflationRate, year - 1)
      const eventIncNominal = eventIncPV * inflationFactor
      const eventExpNominal = eventExpPV * inflationFactor

      // 3. Totals (Nominal for Sim)
      grossInc += eventIncNominal
      expenses += eventExpNominal

      // Track Extras (Nominal & PV)
      totalExtraInc += eventIncNominal
      totalExtraExp += eventExpNominal
      totalExtraIncPV += eventIncPV
      totalExtraExpPV += eventExpPV

      // 4. Gap
      const gap = grossInc - expenses - taxes - p.totalIndividual401k // Gap is what's left for TAXABLE investing

      // Asset Growth
      if (i === 0) {
        simNetWorth = startingNetWorth * (1 + growthRate) + gap
      } else {
        simNetWorth = simNetWorth * (1 + growthRate) + gap
      }

      // Capture Year 1 stats (Display adjusted)
      if (i === 0) {
        y1Income = grossInc / deflator
        y1Expenses = expenses / deflator
        y1NetWorth = simNetWorth / deflator
        y1SavingsRate = grossInc > 0 ? (gap / grossInc) * 100 : 0
      }

      // FIRE Check (Always do logic in Nominal, display specific)
      // Fire Number is escalated by Inflation
      const fireTargetNominal = baseFireNumber * Math.pow(1 + inflationRate, i)

      const ratio = p.netWorth > 0 ? (p.investableAssets !== undefined ? p.investableAssets / p.netWorth : 0.7) : 0.7
      const simLiquid = simNetWorth * ratio

      if (!simYearsToFire && simLiquid >= fireTargetNominal) {
        simYearsToFire = year
      }
      if (!simLiquidatedAge && simNetWorth >= fireTargetNominal) {
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
      // 5. Chart Data Point (Adjusted based on ViewMode)
      charData.push({
        year: year + currentAge, // Display as Age
        originalNW: p.netWorth / deflator,
        simulatedNW: simNetWorth / deflator,
        hasEvents: eventIncNominal !== 0 || eventExpNominal !== 0
      })
    }

    return {
      y1Income, y1Expenses, y1NetWorth, y1SavingsRate,
      baseFireNumber: baseFireNumber, // Base is PV already
      simYearsToFire, simLiquidatedAge, simCoastAge: simCoastAge,
      totalExtraExp, totalExtraInc,
      totalExtraExpPV, totalExtraIncPV,
      chartData: charData,
    }

  }, [projections, lifeEvents, startingNetWorth, monthlyRetirementSpend, currentAge, profile, retirementAge, isPV])


  // --- 5. Robust Impact Metrics (Second Pass for Comparisons) ---
  const metrics = useMemo(() => {
    if (!simulation || !projections || !projections.length) return null

    try {
      // Baseline (Original) FIRE Age calculation
      const origFireNum = (monthlyRetirementSpend ? Math.abs(parseFloat(monthlyRetirementSpend)) * 12 : projections[0].annualExpenses) * 25
      const inflation = (profile?.inflationRate || 2.7) / 100
      let origYearsToFire = null

      // Safe Access for Ret Index
      // 1. Calculate Original FIRE Age consistently
      // Iterate same logic as simulation
      for (let i = 0; i < projections.length; i++) {
        const p = projections[i]
        if (!p) continue
        const fireTargetNominal = origFireNum * Math.pow(1 + inflation, i)
        const assets = p.investableAssets !== undefined ? p.investableAssets : p.netWorth // Fallback if no investable
        if (assets >= fireTargetNominal) {
          origYearsToFire = i + 1
          break
        }
      }

      // Simulated NW at Retirement vs Original
      const simYearsToFire = simulation.simYearsToFire
      const fireAgeDelta = (simYearsToFire && origYearsToFire) ? simYearsToFire - origYearsToFire : null

      // Net Worth Delta at Retirement (or late stage)
      // Compare simulatedNW at retirement age vs original
      // We stored this in simulation.simNetWorthRetire (but that was end of loop).
      // Let's us the loop data.
      // Net Worth Delta at Retirement (Adjusted for PV)
      const retirementIndex = Math.min(yearsToRetirement - 1, simulation.chartData.length - 1)
      const simNWAtRetire = simulation.chartData[retirementIndex]?.simulatedNW || 0
      const origNWAtRetire = simulation.chartData[retirementIndex]?.originalNW || 0
      const nwDelta = simNWAtRetire - origNWAtRetire

      // Lifetime Event Costs
      // If PV mode, use PV sums. If Nominal mode, use Nominal sums.
      const lifetimeEventCost = isPV ? simulation.totalExtraExpPV : simulation.totalExtraExp
      const lifetimeEventInc = isPV ? simulation.totalExtraIncPV : simulation.totalExtraInc

      return {
        // Impact Metrics
        lifetimeEventCost,
        lifetimeEventInc,
        nwDeltaAtRetire: nwDelta,
        fireAgeDelta: fireAgeDelta,

        // Context
        baseFireNumber: simulation.baseFireNumber,
        simFireAge: simYearsToFire ? simYearsToFire + currentAge : null,
        origFireAge: origYearsToFire ? origYearsToFire + currentAge : null
      }

    } catch (e) {
      console.error(e)
      return null
    }
  }, [simulation, projections, monthlyRetirementSpend, currentAge, retirementAge, profile, isPV])


  // --- 6. Render ---
  // Ensure we have a valid component output even if metrics are missing (loading state handled inside)

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-sm">
          <p className="font-bold mb-2">Age {label}</p>
          {payload.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke || p.fill }}></div>
              <span className="text-gray-600">{p.name}:</span>
              <span className="font-medium">{fmtCompact(p.value)}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Simulate Future</h1>
          <p className="text-gray-500 text-sm mt-1">Visualize how life events impact your long-term wealth.</p>
        </div>

        {/* PV/FV Toggle */}
        <div className="bg-gray-100 p-1 rounded-lg flex items-center">
          <button
            onClick={() => setViewMode('pv')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'pv' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Today's Dollars
          </button>
          <button
            onClick={() => setViewMode('nominal')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'nominal' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Future Dollars
          </button>
        </div>
      </div>

      {simulation && metrics && (
        <div className="space-y-8">

          {/* 1. CHART - HERO VISUALIZATION */}
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-6">Net Worth Projection</h3>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulation.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSim" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOrig" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="year"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    dy={10}
                    label={{ value: 'Age', position: 'insideBottom', offset: -5, fill: '#9CA3AF', fontSize: 10 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickFormatter={(val) => fmtCompact(val)}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="originalNW"
                    name="Original Path"
                    stroke="#9CA3AF"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="url(#colorOrig)"
                    fillOpacity={1}
                  />
                  <Area
                    type="monotone"
                    dataKey="simulatedNW"
                    name="New Path"
                    stroke="#2563EB"
                    strokeWidth={3}
                    fill="url(#colorSim)"
                    fillOpacity={1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* 2. KEY IMPACT METRICS (Revised) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Net Worth Delta */}
            <Card className={`p-4 bg-white border-${metrics.nwDeltaAtRetire >= 0 ? 'blue' : 'orange'}-100 ring-1 ring-${metrics.nwDeltaAtRetire >= 0 ? 'blue' : 'orange'}-50`}>
              <p className={`text-xs text-${metrics.nwDeltaAtRetire >= 0 ? 'blue' : 'orange'}-600 font-medium mb-1`}>Net Worth Impact</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.nwDeltaAtRetire > 0 ? '+' : ''}{fmtCompact(metrics.nwDeltaAtRetire)}
              </p>
            </Card>

            {/* FIRE Age Delta */}
            <Card className="p-4 bg-white border-purple-100 ring-1 ring-purple-50">
              <p className="text-xs text-purple-600 font-medium mb-1">FIRE Timing</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.fireAgeDelta === null ? '--' : metrics.fireAgeDelta === 0 ? 'No Change' : `${metrics.fireAgeDelta > 0 ? '+' : ''}${metrics.fireAgeDelta} Years`}
              </p>
              <p className="text-xs text-gray-400 mt-1">New Goal: Age {metrics.simFireAge}</p>
            </Card>

            {/* Lifetime Cost */}
            <Card className="p-4 bg-white border-red-100 ring-1 ring-red-50">
              <p className="text-xs text-red-600 font-medium mb-1">Lifetime Event Cost</p>
              <p className="text-2xl font-bold text-gray-900">{fmtCompact(metrics.lifetimeEventCost)}</p>
            </Card>

            {/* Lifetime Income */}
            <Card className="p-4 bg-white border-green-100 ring-1 ring-green-50">
              <p className="text-xs text-green-600 font-medium mb-1">Lifetime Event Income</p>
              <p className="text-2xl font-bold text-gray-900">{fmtCompact(metrics.lifetimeEventInc)}</p>
            </Card>
          </div>

          {/* 3. RETIREMENT BUDGET */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex-grow">
                <label className="text-sm font-bold text-gray-900 block mb-1">Retirement Spending Goal</label>
                <p className="text-sm text-gray-500">Your desired monthly budget in retirement (Today's Dollars).</p>
              </div>
              <div className="w-full sm:w-48">
                <Input
                  type="number"
                  min="0"
                  prefix="$"
                  value={monthlyRetirementSpend}
                  onChange={(val) => setMonthlyRetirementSpend(Math.max(0, Number(val)))}
                  placeholder="5000"
                />
              </div>
            </div>
          </Card>

          {/* 4. LIFE EVENTS EDITOR (Full Width) */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900">Life Events</h3>

            {/* Templates */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(lifeEventTemplates).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => addLifeEvent(key)}
                  className="px-4 py-3 text-sm rounded-xl border bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-center gap-2 transition duration-200 shadow-sm"
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="font-medium">{t.name}</span>
                </button>
              ))}
            </div>

            {/* Events List */}
            <div className="space-y-4">
              {lifeEvents.map(e => (
                <Card key={e.id} className="p-4 relative border-l-4 border-l-blue-500">
                  <button onClick={() => removeLifeEvent(e.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition px-2 py-1">✕</button>

                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Header & Icon */}
                    <div className="flex items-center gap-3 sm:w-48 flex-shrink-0">
                      <span className="text-3xl bg-gray-50 p-2 rounded-lg">{e.icon}</span>
                      <div>
                        {e.name === 'Custom Event' ? (
                          <input
                            type="text"
                            value={e.name}
                            onChange={(ev) => updateLifeEvent(e.id, 'name', ev.target.value)}
                            className="font-bold text-gray-900 bg-transparent border-b border-dashed border-gray-300 focus:border-blue-500 focus:outline-none w-full"
                          />
                        ) : (
                          <span className="font-bold text-gray-900">{e.name}</span>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Event</p>
                      </div>
                    </div>

                    {/* Interactive Controls */}
                    <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* Timeline Control */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-2">Timeline</label>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-[10px] text-gray-400 font-bold block mb-0.5">Start Year (Age {currentAge + e.startYear})</label>
                            <Input
                              type="number"
                              min="1"
                              max={maxYear}
                              value={e.startYear}
                              onChange={(val) => updateLifeEvent(e.id, 'startYear', Number(val))}
                            />
                          </div>
                          <div className="w-24">
                            <label className="text-[10px] text-gray-400 font-bold block mb-0.5">Duration</label>
                            <Input
                              type="number"
                              min="0"
                              value={e.duration}
                              onChange={(val) => updateLifeEvent(e.id, 'duration', Number(val))}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">{e.duration === 0 ? 'Permanent' : 'Years'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Impact Control */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-2">Annual Impact</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Input
                              label="Income"
                              type="number"
                              prefix="$"
                              value={e.incomeImpact}
                              onChange={(val) => updateLifeEvent(e.id, 'incomeImpact', Number(val))}
                              className={e.incomeImpact > 0 ? "text-green-600 font-bold" : e.incomeImpact < 0 ? "text-red-500 font-bold" : ""}
                            />
                          </div>
                          <div>
                            <Input
                              label="Expense"
                              type="number"
                              prefix="$"
                              value={e.expenseImpact}
                              onChange={(val) => updateLifeEvent(e.id, 'expenseImpact', Number(val))}
                              className={e.expenseImpact > 0 ? "text-red-500 font-bold" : ""}
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </Card>
              ))}

              {lifeEvents.length === 0 && (
                <div className="text-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                  <p className="text-gray-500 font-medium">No life events added yet.</p>
                  <p className="text-gray-400 text-sm mt-1">Select a template above to visualize how major life changes impact your wealth.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

export default WhatIfTab
