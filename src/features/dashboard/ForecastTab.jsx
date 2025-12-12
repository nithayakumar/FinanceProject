import { useState, useMemo, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

function ForecastTab({ data }) {
  const { gapProjections, profile, investmentsData, propertyData, incomeProjections, expenseProjections } = data
  const projections = gapProjections?.projections || []

  // Calculate Starting Net Worth (Year 0) for Year 1 Change Calc
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

  // State
  // Default to retirement year (relative to current age) or Year 1 if not available
  const [selectedYear, setSelectedYear] = useState(() => {
    const age = profile?.age || 30
    const retAge = profile?.retirementAge || 65
    const len = projections.length || 30
    const targetYear = Math.max(1, retAge - age)
    return Math.min(targetYear, len)
  })
  const [viewMode, setViewMode] = useState('pv') // 'pv' or 'nominal'
  const isPV = viewMode === 'pv'
  const [monthlyRetirementSpend, setMonthlyRetirementSpend] = useState('')

  const currentAge = profile?.age || 30
  const retirementAge = profile?.retirementAge || 65
  const maxYear = projections.length || 30

  // Format Helper
  const fmtCompact = (val) => {
    const absVal = Math.abs(val)
    const sign = val < 0 ? '-' : ''
    if (absVal >= 1000000) return `${sign}$${(absVal / 1000000).toFixed(1)}M`
    if (absVal >= 1000) return `${sign}$${Math.round(absVal / 1000)}k`
    return `${sign}$${Math.round(absVal)}`
  }
  const formatSmart = fmtCompact // Alias for copied table code if needed, but table uses formatSmart

  // Default Monthly Spend Logic
  const defaultMonthlySpend = useMemo(() => {
    const yearsToRetirement = retirementAge - currentAge
    const retirementYearIndex = Math.min(yearsToRetirement - 1, projections.length - 1)
    if (retirementYearIndex >= 0 && projections[retirementYearIndex]) {
      const inflationRate = (profile?.inflationRate || 2.7) / 100
      const expensesPV = projections[retirementYearIndex].annualExpensesPV ||
        (projections[retirementYearIndex].annualExpenses / Math.pow(1 + inflationRate, retirementYearIndex + 1))
      return Math.round(Math.abs(expensesPV) / 12)
    }
    return 5000
  }, [projections, retirementAge, currentAge, profile])

  useEffect(() => {
    if (!monthlyRetirementSpend && defaultMonthlySpend) {
      setMonthlyRetirementSpend(defaultMonthlySpend.toString())
    }
  }, [defaultMonthlySpend, monthlyRetirementSpend])

  // --- Metrics Calculations (No Simulated Adjustments) ---

  // 1. FIRE Metrics
  const fireMetrics = useMemo(() => {
    if (!projections.length) return null
    const currentYear = projections[0]
    const year1GrossIncome = currentYear.grossIncome
    const year1Expenses = currentYear.annualExpenses
    const year1Gap = currentYear.gap
    const year1NetWorth = currentYear.netWorth
    const savingsRate = year1GrossIncome > 0 ? (year1Gap / year1GrossIncome) * 100 : 0

    // Budget
    const annualRetirementSpend = monthlyRetirementSpend ? parseFloat(monthlyRetirementSpend) * 12 : year1Expenses
    const fireNumber = annualRetirementSpend * 25

    // FIRE Age (Liquid Assets Check)
    const inflationRate = (profile?.inflationRate || 2.7) / 100
    let yearsToFire = null
    for (let i = 0; i < projections.length; i++) {
      const inflatedFireNumber = fireNumber * Math.pow(1 + inflationRate, i)
      const liquidAssets = projections[i].investableAssets || projections[i].netWorth
      if (liquidAssets >= inflatedFireNumber) {
        yearsToFire = i + 1
        break
      }
    }

    // Liquidated FIRE Age
    let liquidatedYearsToFire = null
    for (let i = 0; i < projections.length; i++) {
      const inflatedFireNumber = fireNumber * Math.pow(1 + inflationRate, i)
      if (projections[i].netWorth >= inflatedFireNumber) {
        liquidatedYearsToFire = i + 1
        break
      }
    }

    // Coast FIRE Age
    let coastFireAge = null
    const yearsToRetirement = retirementAge - currentAge
    const growthRate = 0.07 // 7% assumption for Coast
    for (let i = 0; i < Math.min(projections.length, yearsToRetirement); i++) {
      const currentInvestable = projections[i].investableAssets || projections[i].netWorth
      const yearsRemaining = yearsToRetirement - i
      if (yearsRemaining <= 0) break
      const futureValue = currentInvestable * Math.pow(1 + growthRate, yearsRemaining)
      const targetFireNumber = fireNumber * Math.pow(1 + inflationRate, yearsToRetirement)
      if (futureValue >= targetFireNumber) {
        coastFireAge = currentAge + i
        break
      }
    }

    return {
      savingsRate, fireNumber, yearsToFire, fireAge: yearsToFire ? currentAge + yearsToFire : null,
      liquidatedYearsToFire, liquidatedFireAge: liquidatedYearsToFire ? currentAge + liquidatedYearsToFire : null,
      coastFireAge, year1Composition: { homeEquity: currentYear.homeEquity }
    }
  }, [projections, monthlyRetirementSpend, profile, currentAge, retirementAge])

  // 2. Year Metrics (Slider)
  const yearMetrics = useMemo(() => {
    if (!projections.length || selectedYear < 1 || selectedYear > projections.length) return null
    const idx = selectedYear - 1
    const p = projections[idx]
    const pPrev = idx > 0 ? projections[idx - 1] : null

    // 1. Net Worth Change (The Flow)
    // Year 1 change is (End - Start). Year N change is (End - PrevEnd).
    const netWorthChange = selectedYear === 1 ? (p.netWorth - startingNetWorth) : (p.netWorth - (pPrev?.netWorth || 0))
    const netWorthChangePV = selectedYear === 1 ? (p.netWorthPV - startingNetWorth) : (p.netWorthPV - (pPrev?.netWorthPV || 0))
    // YoY % for the Change Flow itself isn't usually helpful.
    // But we might want YoY of the Total Net Worth (Stock).

    // 2. Income YoY
    const prevIncome = pPrev ? pPrev.grossIncome : 0
    const prevIncomePV = pPrev ? pPrev.grossIncomePV : 0
    const incomeChange = pPrev ? (p.grossIncome - prevIncome) : 0
    const incomeChangePV = pPrev ? (p.grossIncomePV - prevIncomePV) : 0
    const incomeChangePct = prevIncome > 0 ? (incomeChange / prevIncome) * 100 : 0

    // 3. Net Worth Stock YoY
    const prevNW = pPrev ? pPrev.netWorth : startingNetWorth
    const prevNWPV = pPrev ? pPrev.netWorthPV : startingNetWorth
    const nwStockChange = p.netWorth - prevNW // This is theoretically same as 'netWorthChange' above
    const nwStockChangePV = p.netWorthPV - prevNWPV
    const nwChangePct = prevNW > 0 ? (nwStockChange / prevNW) * 100 : 0

    // 4. Liquid Assets
    const liquid = (p.totalInvestmentValue || 0) + (p.cash || 0) + (p.retirement401kValue || 0)
    const liquidPV = (p.totalInvestmentValuePV || 0) + (p.cashPV || 0) + (p.retirement401kValuePV || 0)
    const liquidPct = p.netWorth > 0 ? (liquid / p.netWorth) * 100 : 0

    return {
      incomeNominal: p.grossIncome, incomePV: p.grossIncomePV,
      incomeChange, incomeChangePV, incomeChangePct,

      netWorth: p.netWorth, netWorthPV: p.netWorthPV,
      netWorthChange, netWorthChangePV, nwChangePct,

      liquid, liquidPV, liquidPct,

      expenses: p.annualExpenses, expensesPV: p.annualExpensesPV,
      taxRate: p.grossIncome > 0 ? (p.annualTaxes / p.grossIncome) * 100 : 0,
      taxes: p.annualTaxes, taxesPV: p.annualTaxesPV,

      savingsRate: p.grossIncome > 0 ? (p.gap / p.grossIncome) * 100 : 0,
      gap: p.gap,
      hasPrev: !!pPrev
    }
  }, [projections, selectedYear, startingNetWorth])

  // 3. Monthly Spend Metrics
  const monthlySpendMetrics = useMemo(() => {
    if (!fireMetrics || !monthlyRetirementSpend) return null
    const monthlySpend = parseFloat(monthlyRetirementSpend)
    if (isNaN(monthlySpend) || monthlySpend <= 0) return null
    const annualWithdrawal = monthlySpend * 12
    // Using last projection net worth (usually retirement age or max age)
    const retirementIndex = Math.min((retirementAge - currentAge) - 1, projections.length - 1)
    const pRetire = projections[retirementIndex < 0 ? 0 : retirementIndex]
    const netWorthAtRetirement = pRetire?.investableAssets || pRetire?.netWorth || 0

    const withdrawalRate = netWorthAtRetirement > 0 ? (annualWithdrawal / netWorthAtRetirement) * 100 : 0
    const isSustainable = withdrawalRate <= 4

    // Simple duration check
    const simpleYears = netWorthAtRetirement > 0 ? netWorthAtRetirement / annualWithdrawal : 0

    return {
      annualWithdrawal, withdrawalRate, isSustainable, simpleYears,
      term: isSustainable ? 'Forever (Sustainable)' : `${Math.round(simpleYears)} years`
    }
  }, [fireMetrics, monthlyRetirementSpend, projections, retirementAge, currentAge])


  // --- Chart Data Preparation (MOVED FROM NET WORTH TAB) ---
  const chartData = useMemo(() => {
    return projections.map((p, i) => {
      const prev = i > 0 ? projections[i - 1] : null
      const inflationRate = (profile?.inflationRate || 2.7) / 100
      const discountFactor = Math.pow(1 + inflationRate, p.year - 1)
      const df = isPV ? discountFactor : 1

      const getVal = (nom, pvKey) => isPV ? (p[pvKey] !== undefined ? p[pvKey] : nom / df) : nom

      // 1. Growth
      const invVal = getVal(p.totalInvestmentValue, 'totalInvestmentValuePV')
      const prevInv = i === 0 ? (investmentsData?.investments?.reduce((sum, inv) => sum + Number(inv.currentValue), 0) || 0) / df : (isPV ? prev.totalInvestmentValuePV : prev.totalInvestmentValue)
      const invContrib = getVal(p.investedThisYear, 'investedThisYearPV')
      const invGrowth = (invVal - prevInv) - invContrib

      const k401Val = getVal(p.retirement401kValue, 'retirement401kValuePV')
      const prevK401 = i === 0 ? (Number(investmentsData?.retirement401k?.currentValue) || 0) / df : (isPV ? prev.retirement401kValuePV : prev.retirement401kValue)
      const k401ContribSafe = isPV ? (p.totalIndividual401kPV + p.annualCompany401kPV) : (p.totalIndividual401k + p.annualCompany401k)
      const k401Growth = (k401Val - prevK401) - k401ContribSafe

      // Home
      const principalNom = (p.annualMortgagePrincipal || 0) + (p.downPaymentPaid || 0)
      const principal = isPV ? (principalNom / df) : principalNom
      const homeValCurr = isPV ? p.homeValuePV : p.homeValue
      const homeValPrev = i === 0 ? (homeValCurr / (1 + (p.homeGrowthRate || 0))) : (isPV ? prev.homeValuePV : prev.homeValue)
      let appreciation = 0
      if (p.downPaymentPaid > 0) appreciation = 0
      else appreciation = homeValCurr - homeValPrev

      // Cash
      const rawCashContrib = isPV ? p.cashContributionPV : p.cashContribution
      const downPmt = isPV ? (p.downPaymentPaidPV || 0) : (p.downPaymentPaid || 0)
      const cashContrib = (rawCashContrib || 0) - downPmt

      // Outflows
      const baseExpenses = isPV ? p.annualExpensesPV : p.annualExpenses
      const interest = isPV ? (p.annualMortgageInterestPV || 0) : (p.annualMortgageInterest || 0)
      const propCosts = isPV ? (p.annualPropertyCostsPV || 0) : (p.annualPropertyCosts || 0)
      const principalPaid = isPV ? ((p.annualMortgagePrincipalPV || 0)) : (p.annualMortgagePrincipal || 0)

      // Simple vs Detailed Mode logic
      let finalExpenses = 0
      if (p.useSimplePropertyExpenses) {
        finalExpenses = baseExpenses + interest + propCosts
      } else {
        finalExpenses = baseExpenses - principalPaid
      }
      const expenses = finalExpenses * -1
      const taxes = (isPV ? p.annualTaxesPV : p.annualTaxes) * -1

      // True Delta
      let trueDelta = 0
      if (i === 0) {
        trueDelta = invGrowth + k401Growth + appreciation + invContrib + k401ContribSafe + principal + cashContrib - finalExpenses - (isPV ? p.annualTaxesPV : p.annualTaxes)
      } else {
        trueDelta = (isPV ? p.netWorthPV : p.netWorth) - (isPV ? prev.netWorthPV : prev.netWorth)
      }

      return {
        year: p.year,
        'Investment Growth': invGrowth,
        '401k Growth': k401Growth,
        'Home Appreciation': appreciation,
        'Investment Contribution': invContrib,
        '401k Contribution': k401ContribSafe,
        'Home Principal': principal,
        'Cash Added': Math.max(0, cashContrib),
        'Cash Drawn': Math.min(0, cashContrib),
        Taxes: taxes, // Ensure Taxes are here if needed for tooltip order, though chart uses stackId
        Expenses: expenses,
        trueNetWorthChange: trueDelta
      }
    })
  }, [projections, isPV, investmentsData, profile])

  return (
    <div className="space-y-8">
      {/* HEADER & VIEW CONTROLS */}
      {fireMetrics && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Financial Independence Forecast</h1>
              <p className="text-gray-500 text-sm mt-1">Projecting your wealth and retirement timeline</p>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setViewMode('pv')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'pv' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Today's Dollars</button>
              <button onClick={() => setViewMode('nominal')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'nominal' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Future Dollars</button>
            </div>
          </div>

          {/* FIRE CORE METRICS */}
          <div className="space-y-4">
            {/* ... (Keep existing FIRE metrics grid) ... */}
            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2">Financial Independence (Liquid Assets Only)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* 1. Monthly Budget */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-600">Monthly Budget (Today's $)</span>
                  <span className="text-2xl">🧮</span>
                </div>
                <div className="relative mb-1.5">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={monthlyRetirementSpend} onChange={(e) => setMonthlyRetirementSpend(e.target.value)} className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500" />
                </div>
                {monthlySpendMetrics ? (
                  <div>
                    <p className={`text-2xl font-bold ${monthlySpendMetrics.isSustainable ? 'text-green-600' : 'text-red-600'}`}>
                      {(() => {
                        // User requested to always show Future Dollars at Retirement Age
                        const yearsToRetirement = Math.max(0, retirementAge - currentAge)
                        // Use yearsToRetirement for inflation, not yearsToFire
                        const years = yearsToRetirement

                        const inflation = (profile?.inflationRate || 2.7) / 100
                        const val = isPV ? monthlySpendMetrics.annualWithdrawal : monthlySpendMetrics.annualWithdrawal * Math.pow(1 + inflation, years)
                        return fmtCompact(val)
                      })()} <span className="text-base text-gray-400 font-normal">/yr</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {isPV ? "In today's dollars" : `In future dollars (Age ${retirementAge})`}
                    </p>
                  </div>
                ) : <p className="text-xs text-gray-400">Enter budget</p>}
              </div>

              {/* 2. FIRE Target */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">FIRE Target</span>
                  <span className="text-2xl">🎯</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">
                  {(() => {
                    const yearsToRetirement = Math.max(0, retirementAge - currentAge)
                    const inflation = (profile?.inflationRate || 2.7) / 100

                    const valPV = fireMetrics.fireNumber
                    const valFuture = fireMetrics.fireNumber * Math.pow(1 + inflation, yearsToRetirement)

                    return fmtCompact(isPV ? valPV : valFuture)
                  })()}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {(() => {
                    const yearsToRetirement = Math.max(0, retirementAge - currentAge)
                    const inflation = (profile?.inflationRate || 2.7) / 100

                    const valPV = fireMetrics.fireNumber
                    const valFuture = fireMetrics.fireNumber * Math.pow(1 + inflation, yearsToRetirement)

                    if (isPV) {
                      return <>{fmtCompact(valFuture)} in future dollars (Age {retirementAge})</>
                    } else {
                      return <>{fmtCompact(valPV)} in today's dollars</>
                    }
                  })()}
                </p>
              </div>

              {/* 3. FIRE Age */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">FIRE Age</span>
                  <span className="text-2xl">📅</span>
                </div>
                {fireMetrics.fireAge ? (
                  <>
                    <p className="text-3xl font-bold text-green-600">Age {fireMetrics.fireAge}</p>
                    <p className="text-xs text-gray-500 mt-2">in {Math.max(0, fireMetrics.fireAge - currentAge)} years</p>
                  </>
                ) : <p className="text-3xl font-bold text-gray-400">--</p>}
              </div>

              {/* 4. If Liquidated */}
              <div className="bg-white rounded-lg shadow-sm border border-orange-100 p-5 bg-orange-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">If Liquidated</span>
                  <span className="text-2xl">🏚️</span>
                </div>
                {fireMetrics.liquidatedFireAge ? (
                  <>
                    <p className="text-3xl font-bold text-orange-600">Age {fireMetrics.liquidatedFireAge}</p>
                    <p className="text-xs text-gray-500 mt-2">if you sell home</p>
                  </>
                ) : <p className="text-3xl font-bold text-gray-400">--</p>}
              </div>

              {/* 5. Coast FIRE */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Coast FIRE Age</span>
                  <span className="text-2xl">🏖️</span>
                </div>
                {fireMetrics.coastFireAge ? (
                  <>
                    <p className="text-3xl font-bold text-teal-600">Age {fireMetrics.coastFireAge}</p>
                    <p className="text-xs text-gray-500 mt-2">Stop saving now</p>
                  </>
                ) : <p className="text-3xl font-bold text-gray-400">--</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORECAST TRAJECTORY (SLIDER) - HIDDEN */}
      {/* {yearMetrics && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">📊 Your Current Trajectory by Year</h3>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Year {selectedYear}</span>
              <span className="text-gray-400 ml-2">(Age {currentAge + selectedYear - 1})</span>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-4">
            <span className="text-xs text-gray-500 w-12">Year 1</span>
            <input type="range" min="1" max={maxYear} value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            <span className="text-xs text-gray-500 w-16 text-right">Age {currentAge + maxYear - 1}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <span className="text-xs font-medium text-gray-500 uppercase">Year Start Net Worth</span>
              <p className="text-2xl font-bold text-gray-700 mt-1">{fmtCompact(isPV ? (yearMetrics.netWorthPV - yearMetrics.netWorthChangePV) : (yearMetrics.netWorth - yearMetrics.netWorthChange))}</p>
              <p className="text-xs text-gray-500 mt-1">Starting Balance</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <span className="text-xs font-medium text-gray-500 uppercase">Income</span>
              <p className="text-2xl font-bold text-blue-700 mt-1">{fmtCompact(isPV ? yearMetrics.incomePV : yearMetrics.incomeNominal)}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-500">
                  Taxes: <span className="font-medium text-gray-700">{fmtCompact(isPV ? yearMetrics.taxesPV : yearMetrics.taxes)}</span> ({yearMetrics.taxRate.toFixed(1)}%)
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-gray-500 uppercase">Increase</span>
                {yearMetrics.hasPrev && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${yearMetrics.nwChangePct >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {yearMetrics.nwChangePct >= 0 ? '+' : ''}{yearMetrics.nwChangePct.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-blue-600 mt-1">{fmtCompact(isPV ? yearMetrics.netWorthChangePV : yearMetrics.netWorthChange)}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  Expenses: <span className="font-medium text-gray-700">{fmtCompact(isPV ? yearMetrics.expensesPV : yearMetrics.expenses)}</span>
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <span className="text-xs font-medium text-gray-500 uppercase">Year End Net Worth</span>
              <p className="text-2xl font-bold text-purple-700 mt-1">{fmtCompact(isPV ? yearMetrics.netWorthPV : yearMetrics.netWorth)}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-500">
                  Liquid: <span className="font-medium text-gray-700">{fmtCompact(isPV ? yearMetrics.liquidPV : yearMetrics.liquid)}</span> ({yearMetrics.liquidPct.toFixed(0)}%)
                </p>
              </div>
            </div>
          </div>
        </div>
      )} */}

      {/* ANNUAL NET WORTH CHANGE BREAKDOWN CHART (Moved from Net Worth Tab) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Annual Net Worth Change Breakdown
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({isPV ? "Today's Dollars" : "Future Dollars"})
            </span>
          </h2>
        </div>
        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} stackOffset="sign">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <ReferenceLine y={0} stroke="#000" />
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} minTickGap={30} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={fmtCompact} width={60} />
              <Tooltip cursor={{ fill: '#F3F4F6' }} content={<NetWorthChangeTooltip fmt={fmtCompact} />} />
              <Legend content={<SimpleLegend />} verticalAlign="top" height={50} wrapperStyle={{ paddingBottom: '20px' }} />

              <Bar name="Investment Growth" dataKey="Investment Growth" stackId="a" fill="#60A5FA" radius={[0, 0, 0, 0]} />
              <Bar name="401k Growth" dataKey="401k Growth" stackId="a" fill="#A78BFA" radius={[0, 0, 0, 0]} />
              <Bar name="Home Appreciation" dataKey="Home Appreciation" stackId="a" fill="#FBBF24" radius={[0, 0, 0, 0]} />

              <Bar name="Investment Contribution" dataKey="Investment Contribution" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
              <Bar name="401k Contribution" dataKey="401k Contribution" stackId="a" fill="#8B5CF6" radius={[0, 0, 0, 0]} />
              <Bar name="Home Principal" dataKey="Home Principal" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
              <Bar name="Cash Added" dataKey="Cash Added" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />

              <Bar name="Cash Drawn" dataKey="Cash Drawn" stackId="a" fill="#DC2626" radius={[0, 0, 0, 0]} />
              <Bar name="Expenses" dataKey="Expenses" stackId="a" fill="#F87171" radius={[0, 0, 0, 0]} />
              <Bar name="Taxes" dataKey="Taxes" stackId="a" fill="#EF4444" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* YEAR-BY-YEAR BREAKDOWN TABLE (Moved from Net Worth Tab) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Year-by-Year Breakdown
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({isPV ? "Today's Dollars" : "Future Dollars"})
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Year</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Income</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">401k Contrib</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Taxes</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Tax %</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Expenses</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Exp %</th>
                <th className="py-3 px-4 text-right whitespace-nowrap bg-blue-50/50 text-blue-800">Gap</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Cash</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Investments</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">401k</th>
                <th className="py-3 px-4 text-right whitespace-nowrap text-amber-600">Home Eq</th>
                <th className="py-3 px-4 text-right whitespace-nowrap bg-green-50/50 text-green-800">Net Worth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projections.map((p) => {
                const income = isPV ? p.grossIncomePV : p.grossIncome
                const taxes = isPV ? p.annualTaxesPV : p.annualTaxes
                const expenses = isPV ? p.annualExpensesPV : p.annualExpenses
                const taxPercent = income > 0 ? (taxes / income * 100).toFixed(1) : '0.0'
                const expensePercent = income > 0 ? (expenses / income * 100).toFixed(1) : '0.0'
                const gap = isPV ? p.gapPV : p.gap

                return (
                  <tr key={p.year} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900">{p.year}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{fmtCompact(income)}</td>
                    <td className="py-3 px-4 text-right text-orange-600">{fmtCompact((isPV ? p.totalIndividual401kPV : p.totalIndividual401k) * -1)}</td>
                    <td className="py-3 px-4 text-right text-red-600">{fmtCompact(taxes * -1)}</td>
                    <td className="py-3 px-4 text-right text-gray-500 text-xs">{taxPercent}%</td>
                    <td className="py-3 px-4 text-right text-red-600">{fmtCompact(expenses * -1)}</td>
                    <td className="py-3 px-4 text-right text-gray-500 text-xs">{expensePercent}%</td>
                    <td className={`py-3 px-4 text-right font-medium bg-blue-50/30 ${gap >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {gap >= 0 ? '+' : ''}{fmtCompact(gap)}
                    </td>
                    <td className="py-3 px-4 text-right text-blue-600">{fmtCompact(isPV ? p.cashPV : p.cash)}</td>
                    <td className="py-3 px-4 text-right text-purple-600">{fmtCompact(isPV ? p.totalInvestmentValuePV : p.totalInvestmentValue)}</td>
                    <td className="py-3 px-4 text-right text-emerald-600">{fmtCompact(isPV ? p.retirement401kValuePV : p.retirement401kValue)}</td>
                    <td className="py-3 px-4 text-right text-amber-600">{fmtCompact(isPV ? p.homeEquityPV : p.homeEquity)}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900 bg-green-50/30">{fmtCompact(isPV ? p.netWorthPV : p.netWorth)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// --- Helpers ---
function SimpleLegend() {
  const items = [
    { label: 'Investments', color: '#60A5FA' },
    { label: '401k', color: '#A78BFA' },
    { label: 'Home', color: '#FBBF24' },
    { label: 'Cash', color: '#10B981' },
    { label: 'Outflows', color: '#F87171' },
  ]
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 mb-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-sm font-medium text-gray-600">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function NetWorthChangeTooltip({ active, payload, label, fmt }) {
  if (active && payload && payload.length) {
    const trueNetWorthChange = payload[0]?.payload?.trueNetWorthChange || 0
    const displayPayload = payload.filter(p => !p.name.includes('trueNetWorthChange')).sort((a, b) => b.value - a.value)

    return (
      <div className="bg-white p-4 border border-gray-200 shadow-xl rounded-xl min-w-[240px]">
        <div className="flex justify-between items-baseline mb-3 pb-2 border-b border-gray-100">
          <span className="text-gray-500 font-medium">Year {label}</span>
          <div className="text-right">
            <div className={`text-lg font-bold ${trueNetWorthChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {trueNetWorthChange > 0 ? '+' : ''}{fmt(trueNetWorthChange)}
            </div>
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Net Worth Delta</div>
          </div>
        </div>
        <div className="space-y-1.5">
          {displayPayload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-600 font-medium">{entry.name}</span>
              </div>
              <span className="font-semibold text-gray-900 tabular-nums">{fmt(entry.value)}</span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-gray-100">
            <div className="text-[10px] text-center text-gray-400 italic">Headline follows strict Net Worth Delta</div>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default ForecastTab
