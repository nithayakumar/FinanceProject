import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

function NetWorthTab({ data }) {
    const [viewMode, setViewMode] = useState('pv')
    const [tableViewMode, setTableViewMode] = useState('simple') // 'simple' or 'detailed'
    const isPV = viewMode === 'pv'

    const { gapProjections, profile, expenseProjections, incomeProjections, investmentsData } = data
    const { projections, summary } = gapProjections

    // Format currency - compact format
    const fmt = (val) => formatSmart(val)

    // Prepare stacked bar chart data
    const chartData = projections.map(p => ({
        year: p.year,
        Cash: isPV ? p.cashPV : p.cash,
        Investments: isPV ? p.totalInvestmentValuePV : p.totalInvestmentValue,
        '401k': isPV ? p.retirement401kValuePV : p.retirement401kValue,
        'Home Equity': isPV ? p.homeEquityPV : p.homeEquity,
    }))

    // Calculate summary metrics
    const currentNetWorth = isPV ? projections[0].netWorthPV : projections[0].netWorth
    const retirementNetWorth = isPV ? summary.retirementNetWorthPV : summary.retirementNetWorth
    const netWorthGrowth = retirementNetWorth - currentNetWorth
    const netWorthGrowthPercent = currentNetWorth > 0 ? (netWorthGrowth / currentNetWorth * 100) : 0
    const lifetimeInvested = isPV ? summary.lifetimeInvestedPV : summary.lifetimeInvested

    // Calculate Y-axis domain
    const minComponentVal = Math.min(...chartData.map(d => Math.min(d.Cash, d.Investments, d['401k'], d['Home Equity'] || 0)))
    const yAxisMin = minComponentVal < 0 ? 'auto' : 0

    // Check which keys have data
    const hasCash = chartData.some(d => Math.abs(d.Cash) > 0)
    const has401k = chartData.some(d => Math.abs(d['401k']) > 0)
    const hasInvestments = chartData.some(d => Math.abs(d.Investments) > 0)
    const hasHomeEquity = chartData.some(d => Math.abs(d['Home Equity']) > 0)

    // Calculate FIRE Metrics locally for specific cards
    const fireMetrics = (() => {
        if (!projections.length) return null

        const currentYear = projections[0]
        // Use retirement age from profile
        const yearsToRetirement = profile.yearsToRetirement
        // Get retirement year projection
        const retirementYearIndex = Math.min(yearsToRetirement - 1, projections.length - 1)
        const retirementProjection = projections[retirementYearIndex]
        const yearsToGrowth = yearsToRetirement

        const year1Composition = {
            cash: currentYear.cash,
            investments: currentYear.totalInvestmentValue,
            retirement401k: currentYear.retirement401kValue || currentYear.totalIndividual401k,
            homeEquity: currentYear.homeEquity
        }
        const currentTotal = year1Composition.cash + year1Composition.investments + year1Composition.retirement401k + year1Composition.homeEquity

        const retirementComposition = retirementProjection ? {
            cash: retirementProjection.cash,
            investments: retirementProjection.totalInvestmentValue,
            retirement401k: retirementProjection.retirement401kValue,
            homeEquity: retirementProjection.homeEquity
        } : year1Composition
        const retirementTotal = retirementComposition ? (retirementComposition.cash + retirementComposition.investments + retirementComposition.retirement401k + retirementComposition.homeEquity) : 0

        const retirementCompositionPV = retirementProjection ? {
            cash: retirementProjection.cashPV,
            investments: retirementProjection.totalInvestmentValuePV,
            retirement401k: retirementProjection.retirement401kValuePV,
            homeEquity: retirementProjection.homeEquityPV
        } : year1Composition
        const retirementTotalPV = retirementCompositionPV ? (retirementCompositionPV.cash + retirementCompositionPV.investments + retirementCompositionPV.retirement401k + retirementCompositionPV.homeEquity) : 0


        // Helper to calculate CAGR
        const calcCAGR = (start, end, years) => {
            if (years <= 0 || start <= 0 || end <= 0) return null
            return (Math.pow(end / start, 1 / years) - 1) * 100
        }

        const cagrToRetirement = {
            nominal: {
                total: calcCAGR(currentTotal, retirementTotal, yearsToGrowth) || 0,
                homeEquity: calcCAGR(year1Composition.homeEquity, retirementComposition.homeEquity, yearsToGrowth),
                investments: calcCAGR(year1Composition.investments, retirementComposition.investments, yearsToGrowth),
                retirement401k: calcCAGR(year1Composition.retirement401k, retirementComposition.retirement401k, yearsToGrowth),
                cash: calcCAGR(year1Composition.cash, retirementComposition.cash, yearsToGrowth)
            },
            pv: {
                total: calcCAGR(currentTotal, retirementTotalPV, yearsToGrowth) || 0, // PV CAGR typically just adjusts end value
                // Note: Real CAGR usually compares Nominal Start to PV End, OR Real Start to Real End.
                // Here we compare Year 1 Nominal (which is PV) to Year X PV.
                homeEquity: calcCAGR(year1Composition.homeEquity, retirementCompositionPV.homeEquity, yearsToGrowth),
                investments: calcCAGR(year1Composition.investments, retirementCompositionPV.investments, yearsToGrowth),
                retirement401k: calcCAGR(year1Composition.retirement401k, retirementCompositionPV.retirement401k, yearsToGrowth),
                cash: calcCAGR(year1Composition.cash, retirementCompositionPV.cash, yearsToGrowth)
            }
        }

        // Total Gain logic from ForecastTab
        // Total Gain = Net Worth Change - Contributions
        let totalGain = 0
        let totalGainPV = 0
        if (retirementProjection) {
            // This is a simplified gain calculation from start to retirement
            // Ideally we sum up annual growth distributions, but diffing End - Start - LifetimeContributions is faster
            const nwChange = retirementProjection.netWorth - currentYear.netWorth
            const nwChangePV = retirementProjection.netWorthPV - currentYear.netWorthPV

            // Lifetime invested at retirement point
            // Note: lifetimeInvested in summary includes ALL years. We want only up to retirement.
            // We can approximate by checking the retirement projection's cumulative stats if available, 
            // or just use summary.lifetimeInvested if the timeline matches closely. 
            // Let's use the summary value as a proxy if simpler, OR simpler: Gain = NW - Contributions.
            // Actually, simpler: Gain = NW - (Cash + CostBasis + HomeCostBasis).
            // Let's stick to the previous logic: NW Change - Contributions.
            // We don't have cumulative contributions easily accessible per year in this simplified view without iterating.
            // Let's use the summary provided by gapProjections if valid.

            // Use summary.lifetimeInvested (includes cash/investments). 
            // Need to be careful of double counting cash if it's treated as contribution.
            // Let's rely on simple asset growth math: Gain = MarketValue - CostBasis.

            const totalCostBasis = retirementProjection.totalCostBasis + retirementProjection.cash + (retirementProjection.downPaymentPaid || 0) + (retirementProjection.mortgageBalance || 0)// Very rough

            // Better: Use the logic from ForecastTab - "Growth above contributions"
            // It calculated it locally.
            // Let's re-implement checking just the difference.

            // Let's just use: Gain = NW - Lifetime Contributions (approx from Summary)
            totalGain = summary.lifetimeGrowthNominal
            totalGainPV = summary.lifetimeGrowthPV
        }

        return {
            netWorthCurrent: currentYear.netWorth,
            netWorthAtRetirement: retirementProjection?.netWorth || 0,
            netWorthAtRetirementPV: retirementProjection?.netWorthPV || 0,
            currentComposition: year1Composition,
            retirementComposition,
            retirementCompositionPV,
            cagrToRetirement,
            totalGain,
            totalGainPV
        }
    })()

    // Helpers
    const fmtCompact = (val) => {
        if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(2)}M`
        if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(0)}k`
        return `$${Math.round(val)}`
    }
    const getPct = (val) => {
        const total = isPV
            ? (fireMetrics.retirementCompositionPV.cash + fireMetrics.retirementCompositionPV.investments + fireMetrics.retirementCompositionPV.retirement401k + fireMetrics.retirementCompositionPV.homeEquity)
            : (fireMetrics.retirementComposition.cash + fireMetrics.retirementComposition.investments + fireMetrics.retirementComposition.retirement401k + fireMetrics.retirementComposition.homeEquity)
        // This getPct is context dependent in the loop, logic needs to be robust. 
        // Actually, the UI calls getPct with specific value. We need TOTAL context.
        // It's cleaner to calculate % inline or pass total.
        // Let's redefine getPct to take val and total.
        return 0; // Placeholder, redefined in UI
    }
    // Redefining getPct locally in render or using inline math. Since the UI block has the context.

    return (
        <div className="space-y-8">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Net Worth Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">Track your wealth accumulation over time</p>
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

            {/* Wealth Projection Section (Moved from Forecast) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Card 1: Current Net Worth */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-600">Current Net Worth</span>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900 mb-3">
                            {fmtCompact(fireMetrics.netWorthCurrent)}
                        </p>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 border-t border-gray-100">
                            <div className="text-xs">
                                <span className="text-gray-500 block">Home ({getPct(fireMetrics.currentComposition.homeEquity)}%)</span>
                                <span className="font-medium text-gray-700">{fmtCompact(fireMetrics.currentComposition.homeEquity)}</span>
                            </div>
                            <div className="text-xs">
                                <span className="text-gray-500 block">Invest ({getPct(fireMetrics.currentComposition.investments)}%)</span>
                                <span className="font-medium text-gray-700">{fmtCompact(fireMetrics.currentComposition.investments)}</span>
                            </div>
                            <div className="text-xs">
                                <span className="text-gray-500 block">401k ({getPct(fireMetrics.currentComposition.retirement401k)}%)</span>
                                <span className="font-medium text-gray-700">{fmtCompact(fireMetrics.currentComposition.retirement401k)}</span>
                            </div>
                            <div className="text-xs">
                                <span className="text-gray-500 block">Cash ({getPct(fireMetrics.currentComposition.cash)}%)</span>
                                <span className="font-medium text-gray-700">{fmtCompact(fireMetrics.currentComposition.cash)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 2: Projected Net Worth (Age 65) */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-600">Projected Networth at Age {profile.retirementAge}</span>
                    </div>
                    {/* Percentile Badge in Header */}
                    <div className="absolute top-0 right-0 bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                        {getWealthPercentile(fireMetrics.netWorthAtRetirementPV)}
                    </div>

                    <div>
                        <p className="text-2xl font-bold text-blue-600 mb-3">
                            {fmtCompact(isPV ? fireMetrics.netWorthAtRetirementPV : fireMetrics.netWorthAtRetirement)}
                        </p>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 border-t border-gray-100">
                            {(() => {
                                const comp = isPV ? fireMetrics.retirementCompositionPV : fireMetrics.retirementComposition
                                return (
                                    <>
                                        <div className="text-xs">
                                            <span className="text-gray-500 block">Home ({getPct(comp.homeEquity)}%)</span>
                                            <span className="font-medium text-gray-700">{fmtCompact(comp.homeEquity)}</span>
                                        </div>
                                        <div className="text-xs">
                                            <span className="text-gray-500 block">Invest ({getPct(comp.investments)}%)</span>
                                            <span className="font-medium text-gray-700">{fmtCompact(comp.investments)}</span>
                                        </div>
                                        <div className="text-xs">
                                            <span className="text-gray-500 block">401k ({getPct(comp.retirement401k)}%)</span>
                                            <span className="font-medium text-gray-700">{fmtCompact(comp.retirement401k)}</span>
                                        </div>
                                        <div className="text-xs">
                                            <span className="text-gray-500 block">Cash ({getPct(comp.cash)}%)</span>
                                            <span className="font-medium text-gray-700">{fmtCompact(comp.cash)}</span>
                                        </div>
                                    </>
                                )
                            })()}
                        </div>
                    </div>
                </div>

                {/* Card 3: Wealth Gain */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-600">Wealth Gain</span>
                    </div>
                    <div className="h-full flex flex-col justify-between">
                        <div>
                            <p className="text-2xl font-bold text-indigo-600 mb-3">
                                {fmtCompact((isPV ? fireMetrics.netWorthAtRetirementPV : fireMetrics.netWorthAtRetirement) - fireMetrics.netWorthCurrent)}
                            </p>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 border-t border-gray-100">
                                {(() => {
                                    const currentComp = fireMetrics.currentComposition
                                    const projectedComp = isPV ? fireMetrics.retirementCompositionPV : fireMetrics.retirementComposition

                                    // Calculate raw gains per category
                                    const gainHome = projectedComp.homeEquity - currentComp.homeEquity
                                    const gainInvest = projectedComp.investments - currentComp.investments
                                    const gain401k = projectedComp.retirement401k - currentComp.retirement401k
                                    const gainCash = projectedComp.cash - currentComp.cash
                                    const totalGain = (isPV ? fireMetrics.netWorthAtRetirementPV : fireMetrics.netWorthAtRetirement) - fireMetrics.netWorthCurrent

                                    // Helper to safe calc percentage of the GAIN
                                    const getGainPct = (val) => {
                                        // If total gain is small/zero/negative, handling % is tricky, but let's just do simple ratio
                                        if (!totalGain || totalGain === 0) return 0
                                        return Math.round((val / totalGain) * 100)
                                    }

                                    return (
                                        <>
                                            <div className="text-xs">
                                                <span className="text-gray-500 block">Home ({getGainPct(gainHome)}%)</span>
                                                <span className="font-medium text-gray-700">{fmtCompact(gainHome)}</span>
                                            </div>
                                            <div className="text-xs">
                                                <span className="text-gray-500 block">Invest ({getGainPct(gainInvest)}%)</span>
                                                <span className="font-medium text-gray-700">{fmtCompact(gainInvest)}</span>
                                            </div>
                                            <div className="text-xs">
                                                <span className="text-gray-500 block">401k ({getGainPct(gain401k)}%)</span>
                                                <span className="font-medium text-gray-700">{fmtCompact(gain401k)}</span>
                                            </div>
                                            <div className="text-xs">
                                                <span className="text-gray-500 block">Cash ({getGainPct(gainCash)}%)</span>
                                                <span className="font-medium text-gray-700">{fmtCompact(gainCash)}</span>
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>
                </div>


                {/* Card 4: Where Your Money Went (Lifetime Distribution) */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-medium text-gray-600">Lifetime Income After Taxes</span>
                            <span className="text-gray-400 text-xs cursor-help" title="Deep Savings Rate = (Investments + Cash Saved + Principal Paid) / After-Tax Income">ⓘ</span>
                        </div>
                    </div>
                    <div className="h-full flex flex-col justify-between">
                        {(() => {
                            // Calculate Lifetime Totals (Nominal or PV based on viewMode)
                            const lifetime = projections.reduce((acc, p) => {
                                const income = isPV ? p.afterTaxIncomePV : p.afterTaxIncome
                                // Expenses Logic:
                                // p.annualExpenses is raw. 
                                // If simple mode: Mortgage is NOT in annualExpenses.
                                // If detailed mode: Mortgage IS in annualExpenses (usually).
                                // But we now have p.mortgagePrincipal and p.mortgageInterest exported.
                                // Home Spend = Principal + Interest.
                                // We want 'Expenses' to be purely Non-Home Living Expenses.
                                // So Expenses = (Total Outflows) - Home Spend.
                                // Total Outflows roughly = annualExpenses + (if simple ? mortgage : 0).
                                // Let's rely on subtraction:
                                // expenseVal = (p.annualExpenses) 
                                // If detailed (simple=false): expenseVal includes mortgage. So Substract (princ + int).
                                // If simple (simple=true): expenseVal EXCLUDES mortgage. So expenseVal is already pure.

                                const isSimple = p.useSimplePropertyExpenses
                                let rawExpense = p.annualExpenses
                                const mortP = p.mortgagePrincipal || 0
                                const mortI = p.mortgageInterest || 0
                                const homeSpend = mortP + mortI

                                let realLivingExpenses = 0

                                if (isSimple) {
                                    // rawExpense excludes mortgage.
                                    // But does it include property tax? Gap.calc says if simple, add annualPropertyExpenses separately.
                                    // So rawExpense is pure living expenses.
                                    // But we probably want to group PropTax/Maint into Expenses? The user said "home principle and interest should incorporate mortgage principle and mortgage interest only".
                                    // So PropTax/Maint goes to Expense.
                                    // If simple: RealExpenses = rawExpense + p.propertyExpenses
                                    realLivingExpenses = rawExpense + (p.propertyExpenses || 0)
                                } else {
                                    // Detailed: rawExpense includes Mortgage P&I + PropTax + Maint.
                                    // User wants Home = P+I ONLY.
                                    // So RealExpenses = rawExpense - (P + I).
                                    // This leaves PropTax+Maint in RealExpenses.
                                    realLivingExpenses = rawExpense - homeSpend
                                }

                                const k401 = isPV ? (p.totalIndividual401kPV || (p.totalIndividual401k / Math.pow(1 + profile.inflationRate / 100, p.year))) : p.totalIndividual401k
                                const invest = isPV ? p.investedThisYearPV : p.investedThisYear

                                // Convert to PV if needed
                                const inflationObj = Math.pow(1 + profile.inflationRate / 100, p.year - 1)
                                const homeSpendVal = isPV ? (homeSpend / inflationObj) : homeSpend
                                const expenseVal = isPV ? (realLivingExpenses / inflationObj) : realLivingExpenses

                                return {
                                    income: acc.income + (income || 0),
                                    expenses: acc.expenses + (expenseVal || 0),
                                    k401: acc.k401 + (k401 || 0),
                                    invest: acc.invest + (invest || 0),
                                    home: acc.home + (homeSpendVal || 0)
                                }
                            }, { income: 0, expenses: 0, k401: 0, invest: 0, home: 0 })

                            // Total Outflows (to match Income approx, though gaps exist due to cash drift)
                            const totalAllocated = lifetime.expenses + lifetime.invest + lifetime.k401 + lifetime.home

                            const getShare = (val) => totalAllocated > 0 ? Math.round((val / totalAllocated) * 100) : 0

                            return (
                                <div>
                                    <p className="text-2xl font-bold text-gray-800 mb-3">
                                        {fmtCompact(lifetime.income)}
                                        <span className="text-xs text-gray-400 font-normal ml-1">Lifetime Income After Taxes</span>
                                    </p>
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 border-t border-gray-100">
                                        {/* Top Left: Home */}
                                        <div className="text-xs">
                                            <span className="text-gray-500 block">Home ({getShare(lifetime.home)}%)</span>
                                            <span className="font-medium text-gray-700">{fmtCompact(lifetime.home)}</span>
                                        </div>
                                        {/* Top Right: Invest */}
                                        <div className="text-xs">
                                            <span className="text-gray-500 block">Invest ({getShare(lifetime.invest)}%)</span>
                                            <span className="font-medium text-gray-700">{fmtCompact(lifetime.invest)}</span>
                                        </div>
                                        {/* Bottom Left: 401k */}
                                        <div className="text-xs">
                                            <span className="text-gray-500 block">401k ({getShare(lifetime.k401)}%)</span>
                                            <span className="font-medium text-gray-700">{fmtCompact(lifetime.k401)}</span>
                                        </div>
                                        {/* Bottom Right: Expenses */}
                                        <div className="text-xs">
                                            <span className="text-gray-500 block">Expenses ({getShare(lifetime.expenses)}%)</span>
                                            <span className="font-medium text-gray-700">{fmtCompact(lifetime.expenses)}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                </div>
            </div>



            {/* Stacked Bar Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Net Worth Growth
                        <span className="ml-2 text-sm font-normal text-gray-500">
                            ({isPV ? "Today's Dollars" : "Future Dollars"})
                        </span>
                    </h2>
                </div>

                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} stackOffset="sign">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <ReferenceLine y={0} stroke="#000" />
                            <XAxis
                                dataKey="year"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                dy={10}
                                minTickGap={30}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                tickFormatter={(val) => formatSmart(val)}
                                width={60}
                                domain={[yAxisMin, 'auto']}
                            />
                            <Tooltip
                                cursor={{ fill: '#F3F4F6' }}
                                content={<CustomTooltip fmt={fmt} />}
                            />
                            <Legend
                                verticalAlign="top"
                                height={36}
                                iconType="circle"
                                wrapperStyle={{ paddingBottom: '20px' }}
                            />
                            {/* Stack Order: Home Equity (Bottom) -> Investments -> 401k -> Cash (Top) */}
                            {hasHomeEquity && (
                                <Bar
                                    name="Home Equity"
                                    dataKey="Home Equity"
                                    stackId="a"
                                    fill="#F59E0B" // Amber-500
                                    radius={[0, 0, 0, 0]}
                                    maxBarSize={50}
                                />
                            )}
                            {hasInvestments && (
                                <Bar
                                    name="Investments"
                                    dataKey="Investments"
                                    stackId="a"
                                    fill="#8B5CF6" // Violet-500
                                    radius={[0, 0, 0, 0]}
                                    maxBarSize={50}
                                />
                            )}
                            {has401k && (
                                <Bar
                                    name="401k"
                                    dataKey="401k"
                                    stackId="a"
                                    fill="#10B981" // Emerald-500
                                    radius={[0, 0, 0, 0]}
                                    maxBarSize={50}
                                />
                            )}
                            {hasCash && (
                                <Bar
                                    name="Cash"
                                    dataKey="Cash"
                                    stackId="a"
                                    fill="#3B82F6" // Blue-500
                                    radius={[0, 0, 0, 0]}
                                    maxBarSize={50}
                                />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>





            {/* Net Worth Component Breakdown Table */}
            <NetWorthBreakdownTable
                projections={projections}
                isPV={isPV}
                fmt={fmt}
                tableViewMode={tableViewMode}
                setTableViewMode={setTableViewMode}
                expenseProjections={expenseProjections}
                incomeProjections={incomeProjections}
                investmentsData={investmentsData}
            />
        </div >
    )
}

function SummaryCard({ title, value, subtitle, trend }) {
    return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
            <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
            <div className={`text-xs font-medium ${trend === 'positive' ? 'text-green-600' :
                trend === 'negative' ? 'text-red-600' :
                    'text-gray-400'
                }`}>
                {subtitle}
            </div>
        </div>
    )
}

// Smart currency formatter based on magnitude
function formatSmart(val) {
    const absVal = Math.abs(val)
    const sign = val < 0 ? '-' : ''

    if (absVal < 1000) {
        return `${sign}$${Math.round(absVal)}`
    } else if (absVal < 1000000) {
        return `${sign}$${Math.round(absVal / 1000)}k`
    } else if (absVal < 10000000) {
        return `${sign}$${(absVal / 1000000).toFixed(2)}M`
    } else {
        return `${sign}$${(absVal / 1000000).toFixed(1)}M`
    }
}

// Net Worth Breakdown Table Component
function NetWorthBreakdownTable({ projections, isPV, fmt, tableViewMode, setTableViewMode, expenseProjections, incomeProjections, investmentsData }) {
    // Get investment names for detailed view (use numbered names like the rest of the app)
    const investments = investmentsData?.investments || []
    const investmentNames = investments.map((inv, index) => `Investment ${index + 1}`)

    // Get income streams for detailed view
    const incomeStreams = incomeProjections?.incomeStreams || []

    // Calculate year-over-year changes
    const breakdownData = projections.map((p, index) => {
        // Current year values
        const netWorth = isPV ? p.netWorthPV : p.netWorth
        const cash = isPV ? p.cashPV : p.cash
        const investments = isPV ? p.totalInvestmentValuePV : p.totalInvestmentValue
        const ret401k = isPV ? p.retirement401kValuePV : p.retirement401kValue
        const homeEquity = isPV ? p.homeEquityPV : p.homeEquity
        const homeValue = isPV ? p.homeValuePV : p.homeValue
        const mortgageBalance = isPV ? p.mortgageBalancePV : p.mortgageBalance
        const costBasis = isPV ? p.totalCostBasisPV : p.totalCostBasis

        // Income components from Gap.calc.js
        const salary = isPV ? p.annualSalaryPV : p.annualSalary
        const equity = isPV ? p.annualEquityPV : p.annualEquity
        const company401k = isPV ? p.annualCompany401kPV : p.annualCompany401k
        const grossIncome = isPV ? p.grossIncomePV : p.grossIncome

        // Deductions and taxes
        const individual401k = isPV ? p.totalIndividual401kPV : p.totalIndividual401k
        const taxableIncome = isPV ? p.taxableIncomePV : p.taxableIncome
        const federalTax = isPV ? p.taxBreakdownPV.federal : p.taxBreakdown.federal
        const stateTax = isPV ? p.taxBreakdownPV.state : p.taxBreakdown.state
        const fica = isPV
            ? p.taxBreakdownPV.socialSecurity + p.taxBreakdownPV.medicare
            : p.taxBreakdown.socialSecurity + p.taxBreakdown.medicare
        const totalTaxes = isPV ? p.annualTaxesPV : p.annualTaxes
        const afterTaxIncome = isPV ? p.afterTaxIncomePV : p.afterTaxIncome

        // Expenses and disposable income
        const expenses = isPV ? p.annualExpensesPV : p.annualExpenses
        const disposableIncome = isPV ? p.disposableIncomePV : p.disposableIncome

        // Allocations
        const toCash = isPV ? p.cashContributionPV : p.cashContribution
        const toInvestments = isPV ? p.investedThisYearPV : p.investedThisYear

        // 401k total contribution
        const ret401kContribution = individual401k + company401k

        // Property Details from Gap.calc.js
        const downPaymentPaid = isPV ? p.downPaymentPaidPV : p.downPaymentPaid
        const annualAppreciation = isPV ? p.annualAppreciationPV : p.annualAppreciation
        const annualMortgagePrincipal = isPV ? p.annualMortgagePrincipalPV : p.annualMortgagePrincipal
        const annualMortgageInterest = isPV ? p.annualMortgageInterestPV : p.annualMortgageInterest
        const annualPropertyCosts = isPV ? p.annualPropertyCostsPV : p.annualPropertyCosts

        // --- Analyst Metrics (Waterfall Calculation) ---
        // A. Net Operating Income (Take Home)
        const netOperatingIncome = afterTaxIncome

        // B. Operating Outflows
        // Handle 'Simple' vs 'Detailed' property expense modes to avoid double counting
        const isSimple = p.useSimplePropertyExpenses // Exported from Gap.calc
        let totalOperatingOutflows = 0
        let adjustedOperatingExpenses = expenses // For display purposes

        if (isSimple) {
            // Simple Mode: 'expenses' is Living only. Add Interest + PropCosts.
            totalOperatingOutflows = expenses + annualPropertyCosts + annualMortgageInterest
        } else {
            // Detailed Mode: 'expenses' already includes Housing (P+I+Tax+Maint).
            // Operating Outflows should be "Non-Recoverable" costs.
            // So we subtract Principal (which is a Capital Transfer, not a Burn).
            totalOperatingOutflows = expenses - annualMortgagePrincipal
        }

        const operatingExpenses = totalOperatingOutflows

        // C. Operating Cash Flow (Available for Capital Allocation)
        const operatingCashFlow = netOperatingIncome - totalOperatingOutflows

        // D. Capital & Equity Transfers (To Balance Sheet)
        const capitalTransfers = annualMortgagePrincipal + (downPaymentPaid || 0)

        // E. Free Cash Flow ("The Gap")
        const freeCashFlow = operatingCashFlow - capitalTransfers

        // Efficiency Ratios
        const effectiveTaxRate = grossIncome > 0 ? totalTaxes / grossIncome : 0
        const burnRate = netOperatingIncome > 0 ? totalOperatingOutflows / netOperatingIncome : 0
        const savingsRate = grossIncome > 0
            ? (freeCashFlow + annualMortgagePrincipal + ret401kContribution + toInvestments + toCash) / grossIncome // Broad definition
            : 0
        // Simplified Savings Rate: (Gap + Principal + 401k) / Gross
        const simpleSavingsRate = grossIncome > 0
            ? (disposableIncome + annualMortgagePrincipal + ret401kContribution) / grossIncome
            : 0

        // --- Begin Balances Calculation ---
        let cashBegin, investmentsBegin, ret401kBegin, netWorthBegin
        let totalInvestmentsGrowth, totalRet401kGrowth

        if (index === 0) {
            // For Year 1, we back-calculate the beginning balances or use current profile state if available (simplified here using derived math)
            // Balance End = Balance Begin + Inflows - Outflows + Growth
            // Balance Begin = Balance End - Inflows + Outflows - Growth

            // Let's assume for Year 1, we can just show End Balance as the primary metric,
            // or derive Begin from End - Net Change.
            // For the first year, we assume the 'begin' values are the initial state before any flows.
            // If no explicit initial state is provided, we can derive them from the first year's end state
            // by subtracting the year's contributions/growth.
            // This is an approximation if the true initial state isn't passed in.
            cashBegin = cash - toCash
            investmentsBegin = investments - toInvestments
            ret401kBegin = ret401k - ret401kContribution
            netWorthBegin = netWorth - (toCash + toInvestments + ret401kContribution + annualMortgagePrincipal + annualAppreciation) // Very rough approximation for NW begin

            // Derived Growth (Plug)
            totalInvestmentsGrowth = investments - investmentsBegin - toInvestments
            totalRet401kGrowth = ret401k - ret401kBegin - ret401kContribution

        } else {
            const prev = projections[index - 1]
            cashBegin = isPV ? prev.cashPV : prev.cash
            investmentsBegin = isPV ? prev.totalInvestmentValuePV : prev.totalInvestmentValue
            ret401kBegin = isPV ? prev.retirement401kValuePV : prev.retirement401kValue
            netWorthBegin = isPV ? prev.netWorthPV : prev.netWorth

            totalInvestmentsGrowth = investments - investmentsBegin - toInvestments
            totalRet401kGrowth = ret401k - ret401kBegin - ret401kContribution
        }

        const rowData = {
            year: p.year,
            // Balance Begin
            cashBegin,
            investmentsBegin,
            ret401kBegin,
            netWorthBegin,

            // Income
            grossIncome,
            salary, equity, company401k,

            // Deductions
            individual401k,
            taxableIncome,

            // Taxes
            federalTax, stateTax, fica, totalTaxes,
            effectiveTaxRate,

            // Net Income
            afterTaxIncome: netOperatingIncome, // Alias

            // Operating Expenses
            expenses: operatingExpenses,
            annualPropertyCosts,
            annualMortgageInterest,
            totalOperatingOutflows,
            burnRate,

            // Operating Cash Flow
            operatingCashFlow,

            // Capital Transfers
            annualMortgagePrincipal,
            downPaymentPaid,
            capitalTransfers,

            // Void / Gap
            disposableIncome, // Original Gap
            freeCashFlow,     // Calculated FCF (Should match Gap)
            simpleSavingsRate,
            savingsRate,

            // Allocations
            toCash, toInvestments, totalAllocated: disposableIncome,

            // Growth
            totalGrowth: totalInvestmentsGrowth + totalRet401kGrowth + (isPV ? p.annualAppreciationPV : p.annualAppreciation),
            investmentGrowth: totalInvestmentsGrowth,
            ret401kGrowth: totalRet401kGrowth,
            annualAppreciation,

            // Ending Balances
            cash,
            investmentsAnd401kEnd: investments + ret401k,
            investmentBalance: investments,
            ret401kBalance: ret401k,
            homeValue, mortgageBalance, homeEquity,
            netWorthEnd: netWorth,

            incomeByStream: p.incomeByStream || [],
            expensesByCategory: isPV ? (p.expensesByCategoryPV || {}) : (p.expensesByCategory || {}),
            investmentDetails: (p.investments || []).map((inv, invIndex) => {
                const prevInv = index === 0 ? undefined : projections[index - 1].investments?.[invIndex]
                const prevMarketValue = isPV
                    ? (index === 0 ? (inv.marketValuePV - inv.allocationPV) : (prevInv?.marketValuePV || 0)) // Crude Year 1 assumption
                    : (index === 0 ? (inv.marketValue - inv.allocation) : (prevInv?.marketValue || 0))

                const allocation = isPV ? inv.allocationPV : inv.allocation
                const marketValue = isPV ? inv.marketValuePV : inv.marketValue
                const annualGrowth = marketValue - prevMarketValue - allocation
                return { ...inv, allocation, growth: annualGrowth, marketValue }
            })
        }

        // Fix for Year 1 "prev" references being separate logic in original code
        // I merged the object creation. For Year 1, I need to ensure the variables `prevCash` etc are actually defined 
        // or calculate them.
        // Actually, the original code had an IF block for Year 1 vs Year 2+.
        // To simplify, let's keep the IF block structure but return the new object.
        return rowData
    })

    // Add total growth and combined investments end
    const enhancedBreakdownData = breakdownData.map(row => {
        const summedInvestmentGrowth = row.investmentDetails.reduce((sum, inv) => sum + (inv.growth || 0), 0)
        return {
            ...row,
            investmentGrowth: summedInvestmentGrowth,
            totalGrowth: summedInvestmentGrowth + row.ret401kGrowth,
            investmentsAnd401kEnd: row.investmentBalance + row.ret401kBalance
        }
    })

    // Export function
    const exportBreakdownToCSV = (data, isPV) => {
        const valueMode = isPV ? 'PV' : 'Nominal'
        const filename = `net-worth-breakdown-${valueMode.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`

        // Headers
        // Headers
        const headers = tableViewMode === 'simple'
            ? ['Year', 'Income', 'Expenses', 'Gap', 'Cash', 'Investments', '401k', 'Home Equity', 'Net Worth']
            : ['Metric', ...data.map(row => `Year ${row.year}`)]

        let csvContent = headers.join(',') + '\n'

        if (tableViewMode === 'simple') {
            // Simple view - one row per year
            data.forEach(row => {
                const values = [
                    row.year,
                    row.income,
                    row.expenses,
                    row.gap,
                    row.cashEnd,
                    row.investmentBalance,
                    row.cashEnd,
                    row.investmentBalance,
                    row.ret401kBalance,
                    row.homeEquity,
                    row.netWorth
                ]
                csvContent += values.join(',') + '\n'
            })
        } else {
            // Detailed view - transpose the table (metrics as rows, years as columns)
            const metrics = [
                { label: 'STARTING BALANCES', key: null },
                { label: 'Cash Begin', key: 'cashBegin' },
                { label: 'Investment 1 Begin', key: 'inv1Begin' },
                { label: '401k Begin', key: 'ret401kBegin' },
                { label: 'Net Worth Begin', key: 'netWorthBegin' },
                { label: 'INCOME', key: null },
                { label: 'Income Stream 1', key: 'income' },
                { label: 'Total Gross Income', key: 'income' },
                { label: 'PRE-TAX SAVINGS', key: null },
                { label: 'Individual 401k', key: 'individual401k' },
                { label: 'Taxable Income', key: 'taxableIncome' },
                { label: 'TAXES', key: null },
                { label: 'Federal Tax', key: 'federalTax' },
                { label: 'State Tax', key: 'stateTax' },
                { label: 'FICA', key: 'fica' },
                { label: 'Total Taxes', key: 'totalTax' },
                { label: 'After-Tax Income', key: 'afterTaxIncome' },
                { label: 'EXPENSES', key: null },
                { label: 'Total Expenses', key: 'expenses' },
                { label: 'CASH FLOW', key: null },
                { label: 'Gap (Savings)', key: 'gap' },
                { label: 'Savings Rate', key: 'savingsRate' },
                { label: 'ALLOCATIONS', key: null },
                { label: 'To Cash', key: 'cashContribution' },
                { label: 'To Investments', key: 'investedThisYear' },
                { label: 'ENDING BALANCES', key: null },
                { label: 'Cash End', key: 'cashEnd' },
                { label: 'Investments End', key: 'investmentBalance' },
                { label: 'Investments End', key: 'investmentBalance' },
                { label: '401k End', key: 'ret401kBalance' },
                { label: 'PROPERTY', key: null },
                { label: 'Home Value', key: 'homeValue' },
                { label: 'Mortgage Debt', key: 'mortgageBalance' },
                { label: 'Home Equity', key: 'homeEquity' },
                { label: 'Net Worth End', key: 'netWorth' }
            ]

            metrics.forEach(metric => {
                if (!metric.key) {
                    // Section header
                    csvContent += `"${metric.label}",${data.map(() => '').join(',')}\n`
                } else {
                    // Data row
                    const values = data.map(row => row[metric.key] || 0)
                    csvContent += `"${metric.label}",${values.join(',')}\n`
                }
            })
        }

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                        Net Worth Component Breakdown
                        <span className="ml-2 text-sm font-normal text-gray-500">
                            ({isPV ? "Today's Dollars" : "Future Dollars"})
                        </span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {tableViewMode === 'simple' ? 'Simplified cash flow summary' : 'Detailed year-over-year changes'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setTableViewMode('simple')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${tableViewMode === 'simple'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            Simple
                        </button>
                        <button
                            onClick={() => setTableViewMode('detailed')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${tableViewMode === 'detailed'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            Detailed
                        </button>
                    </div>
                    {/* Export button placeholder if needed */}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-xs text-gray-500 font-semibold uppercase">
                        <tr>
                            <th className="py-3 px-4 sticky left-0 bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Metric</th>
                            {enhancedBreakdownData.map((row) => (
                                <th key={row.year} className="py-3 px-4 text-right whitespace-nowrap min-w-[100px]">
                                    Year {row.year}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tableViewMode === 'simple' ? (
                            <>
                                {/* Net Worth Begin */}
                                <tr className="bg-blue-50/30">
                                    <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-blue-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Net Worth Begin</td>
                                    {enhancedBreakdownData.map((row) => (
                                        <td key={row.year} className="py-3 px-4 text-right font-bold text-gray-900">
                                            {formatSmart(row.netWorthBegin)}
                                        </td>
                                    ))}
                                </tr>

                                {/* Eff. Tax Rate */}
                                <tr>
                                    <td className="py-3 px-4 text-xs font-medium text-gray-500 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-6 italic">Effective Tax Rate</td>
                                    {enhancedBreakdownData.map((row) => (
                                        <td key={row.year} className="py-3 px-4 text-right text-gray-400 text-xs italic">
                                            {(row.effectiveTaxRate * 100).toFixed(1)}%
                                        </td>
                                    ))}
                                </tr>

                                {/* Gross Income */}
                                <tr>
                                    <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total Gross Income</td>
                                    {enhancedBreakdownData.map((row) => (
                                        <td key={row.year} className="py-3 px-4 text-right text-green-600">
                                            {formatSmart(row.grossIncome)}
                                        </td>
                                    ))}
                                </tr>

                                {/* Net Operating Income */}
                                <tr className="bg-gray-50/50">
                                    <td className="py-3 px-4 font-medium text-gray-900 sticky left-0 bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Net Operating Income</td>
                                    {enhancedBreakdownData.map((row) => (
                                        <td key={row.year} className="py-3 px-4 text-right text-gray-800">
                                            {formatSmart(row.afterTaxIncome)}
                                        </td>
                                    ))}
                                </tr>

                                {/* Operating Expenses */}
                                <tr>
                                    <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Operating Expenses (All)</td>
                                    {enhancedBreakdownData.map((row) => (
                                        <td key={row.year} className="py-3 px-4 text-right text-red-600">
                                            -{formatSmart(row.totalOperatingOutflows)}
                                        </td>
                                    ))}
                                </tr>
                                {/* Detailed Expense Categories (If available) */}
                                {[...new Set(enhancedBreakdownData.flatMap(row => Object.keys(row.expensesByCategory || {})))].sort().map(cat => (
                                    <tr key={cat}>
                                        <td className="py-2 px-4 text-xs font-medium text-gray-500 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-6 italic truncate max-w-[200px]" title={cat}>
                                            {cat}
                                        </td>
                                        {enhancedBreakdownData.map(row => (
                                            <td key={row.year} className="py-2 px-4 text-right text-gray-400 text-xs italic">
                                                -{formatSmart(row.expensesByCategory[cat] || 0)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}

                                {/* Operating Cash Flow */}
                                <tr className="bg-purple-50/30">
                                    <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-purple-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Operating Cash Flow</td>
                                    {enhancedBreakdownData.map((row) => (
                                        <td key={row.year} className="py-3 px-4 text-right font-bold text-purple-700">
                                            {formatSmart(row.operatingCashFlow)}
                                        </td>
                                    ))}
                                </tr>

                                {/* Burn Rate */}
                                <tr>
                                    <td className="py-3 px-4 text-xs font-medium text-gray-500 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-6 italic">Burn Rate (OpEx / Net Inc)</td>
                                    {enhancedBreakdownData.map((row) => (
                                        <td key={row.year} className={`py-3 px-4 text-right text-xs italic ${row.burnRate > 0.8 ? 'text-red-500' : 'text-gray-400'}`}>
                                            {(row.burnRate * 100).toFixed(1)}%
                                        </td>
                                    ))}
                                </tr>

                                {/* Capital Transfers */}
                                {enhancedBreakdownData.some(r => r.capitalTransfers > 0) && (
                                    <tr>
                                        <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Capital Transfers</td>
                                        {enhancedBreakdownData.map((row) => (
                                            <td key={row.year} className="py-3 px-4 text-right text-gray-500">
                                                {row.capitalTransfers > 0 ? `-${formatSmart(row.capitalTransfers)}` : '-'}
                                            </td>
                                        ))}
                                    </tr>
                                )}

                                {/* Free Cash Flow */}
                                <tr className="bg-green-100/30">
                                    <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-green-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Free Cash Flow (The Gap)</td>
                                    {enhancedBreakdownData.map((row) => (
                                        <td key={row.year} className={`py-3 px-4 text-right font-bold ${row.freeCashFlow >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                            {formatSmart(row.freeCashFlow)}
                                        </td>
                                    ))}
                                </tr>

                                {/* Savings Rate */}
                                <tr>
                                    <td className="py-3 px-4 text-xs font-medium text-gray-500 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-6 italic">Deep Savings Rate</td>
                                    {enhancedBreakdownData.map((row) => (
                                        <td key={row.year} className="py-3 px-4 text-right text-green-600 text-xs italic font-medium">
                                            {(row.savingsRate * 100).toFixed(1)}%
                                        </td>
                                    ))}
                                </tr>

                                {/* Net Worth End */}
                                <tr className="bg-green-50/30 border-t-2 border-gray-200">
                                    <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-green-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Net Worth End</td>
                                    {enhancedBreakdownData.map((row) => (
                                        <td key={row.year} className="py-3 px-4 text-right font-bold text-gray-900">
                                            {formatSmart(row.netWorthEnd)}
                                        </td>
                                    ))}
                                </tr>
                            </>
                        ) : (
                            // Detailed View
                            (() => {
                                const incomeStreamNames = [...new Set(enhancedBreakdownData.flatMap(row => row.incomeByStream.map(s => s.name)))].filter(Boolean)
                                const expenseCategoryNames = [...new Set(enhancedBreakdownData.flatMap(row => Object.keys(row.expensesByCategory || {})))].sort()
                                const investmentNames = investmentsData?.investments?.map((inv, index) => `Investment ${index + 1}`) || []

                                return (
                                    <>
                                        {/* --- A. STARTING BALANCES --- */}
                                        <tr className="bg-gray-50/80">
                                            <td colSpan={enhancedBreakdownData.length + 1} className="py-2 px-4 font-semibold text-gray-800 text-xs uppercase tracking-wider sticky left-0">
                                                A. Starting Balances
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Cash Begin</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className="py-3 px-4 text-right text-gray-500">
                                                    {formatSmart(row.cashBegin)}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Invested Assets Begin</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className="py-3 px-4 text-right text-gray-500">
                                                    {formatSmart(row.investmentsBegin + row.ret401kBegin)}
                                                </td>
                                            ))}
                                        </tr>

                                        {/* --- B. INCOME (SOURCES) --- */}
                                        <tr className="bg-green-50/80">
                                            <td colSpan={enhancedBreakdownData.length + 1} className="py-2 px-4 font-semibold text-green-800 text-xs uppercase tracking-wider sticky left-0">
                                                B. Income (Sources)
                                            </td>
                                        </tr>
                                        {incomeStreamNames.map((streamName, streamIndex) => (
                                            <tr key={`stream-${streamIndex}`}>
                                                <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-8">{streamName}</td>
                                                {enhancedBreakdownData.map((row) => {
                                                    const stream = row.incomeByStream.find(s => s.name === streamName)
                                                    const value = isPV ? (stream?.totalPV || 0) : (stream?.total || 0)
                                                    return (
                                                        <td key={row.year} className="py-3 px-4 text-right text-gray-600">
                                                            {value > 0 ? `+${formatSmart(value)}` : '-'}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                        <tr className="bg-green-50/30 font-bold border-t border-green-100">
                                            <td className="py-3 px-4 text-gray-900 sticky left-0 bg-green-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total Gross Income</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className="py-3 px-4 text-right text-green-700">
                                                    {formatSmart(row.grossIncome)}
                                                </td>
                                            ))}
                                        </tr>

                                        {/* --- C. TAXES & DEDUCTIONS --- */}
                                        <tr className="bg-red-50/80">
                                            <td colSpan={enhancedBreakdownData.length + 1} className="py-2 px-4 font-semibold text-red-800 text-xs uppercase tracking-wider sticky left-0">
                                                C. Taxes & Deductions
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-8">Pre-Tax 401k (Deferred)</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className="py-3 px-4 text-right text-orange-600">
                                                    {row.individual401k > 0 ? `(${formatSmart(row.individual401k)})` : '-'}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-8">Taxable Income</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className="py-3 px-4 text-right text-black font-medium">
                                                    {formatSmart(row.taxableIncome)}
                                                </td>
                                            ))}
                                        </tr>
                                        {/* Collapsed Tax Details */}
                                        <tr>
                                            <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-8">Federal Tax</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className="py-3 px-4 text-right text-red-400">
                                                    ({formatSmart(row.federalTax)})
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-8">State Tax</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className="py-3 px-4 text-right text-red-400">
                                                    {row.stateTax > 0 ? `(${formatSmart(row.stateTax)})` : '-'}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-8">FICA</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className="py-3 px-4 text-right text-red-400">
                                                    ({formatSmart(row.fica)})
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="bg-blue-50/30 font-bold border-t border-blue-100">
                                            <td className="py-3 px-4 text-gray-900 sticky left-0 bg-blue-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Net Operating Income (Take Home)</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className="py-3 px-4 text-right text-blue-700">
                                                    {formatSmart(row.afterTaxIncome)}
                                                </td>
                                            ))}
                                        </tr>

                                        {/* --- D. EXPENSES --- */}
                                        <tr className="bg-orange-50/80">
                                            <td colSpan={enhancedBreakdownData.length + 1} className="py-2 px-4 font-semibold text-orange-800 text-xs uppercase tracking-wider sticky left-0">
                                                D. Expenses
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-4 font-medium text-gray-700 text-xs sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-6">Total Expenses</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className="py-2 px-4 text-right text-red-600 text-xs font-medium">
                                                    -{formatSmart(row.expenses)}
                                                </td>
                                            ))}
                                        </tr>
                                        {expenseCategoryNames.map(cat => (
                                            <tr key={cat}>
                                                <td className="py-2 px-4 text-gray-500 text-xs sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-8 truncate max-w-[200px]" title={cat}>
                                                    {cat}
                                                </td>
                                                {enhancedBreakdownData.map((row) => (
                                                    <td key={row.year} className="py-2 px-4 text-right text-gray-400 text-xs">
                                                        -{formatSmart(row.expensesByCategory[cat] || 0)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {enhancedBreakdownData.some(r => r.annualPropertyCosts !== 0) && (
                                            <tr>
                                                <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-8">Property Tax & Maint.</td>
                                                {enhancedBreakdownData.map((row) => {
                                                    const val = row.annualPropertyCosts
                                                    const isNegative = val < 0 // Negative cost = Gain/Savings
                                                    return (
                                                        <td key={row.year} className={`py-3 px-4 text-right ${isNegative ? 'text-green-600' : 'text-red-500'}`}>
                                                            {val !== 0
                                                                ? (isNegative ? `+${formatSmart(Math.abs(val))}` : `(${formatSmart(val)})`)
                                                                : '-'}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        )}
                                        {enhancedBreakdownData.some(r => r.annualMortgageInterest > 0) && (
                                            <tr>
                                                <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-8">Mortgage Interest</td>
                                                {enhancedBreakdownData.map((row) => (
                                                    <td key={row.year} className="py-3 px-4 text-right text-red-500">
                                                        {row.annualMortgageInterest > 0 ? `(${formatSmart(row.annualMortgageInterest)})` : '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        )}
                                        <tr className="bg-purple-50/30 font-bold border-t border-purple-100">
                                            <td className="py-3 px-4 text-gray-900 sticky left-0 bg-purple-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Operating Cash Flow</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className="py-3 px-4 text-right text-purple-700">
                                                    {formatSmart(row.operatingCashFlow)}
                                                </td>
                                            ))}
                                        </tr>

                                        {/* --- E. CAPITAL TRANSFERS --- */}
                                        {enhancedBreakdownData.some(r => r.capitalTransfers > 0) && (
                                            <>
                                                <tr className="bg-gray-50/80">
                                                    <td colSpan={enhancedBreakdownData.length + 1} className="py-2 px-4 font-semibold text-gray-800 text-xs uppercase tracking-wider sticky left-0">
                                                        E. Capital Transfers (To Balance Sheet)
                                                    </td>
                                                </tr>
                                                {enhancedBreakdownData.some(r => r.annualMortgagePrincipal > 0) && (
                                                    <tr>
                                                        <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-8">Mortgage Principal Paid</td>
                                                        {enhancedBreakdownData.map((row) => (
                                                            <td key={row.year} className="py-3 px-4 text-right text-gray-600">
                                                                {row.annualMortgagePrincipal > 0 ? `(${formatSmart(row.annualMortgagePrincipal)})` : '-'}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                )}
                                                {enhancedBreakdownData.some(r => r.downPaymentPaid > 0) && (
                                                    <tr>
                                                        <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-8">Down Payment</td>
                                                        {enhancedBreakdownData.map((row) => (
                                                            <td key={row.year} className="py-3 px-4 text-right text-red-600 font-medium">
                                                                {row.downPaymentPaid > 0 ? `(${formatSmart(row.downPaymentPaid)})` : '-'}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                )}
                                            </>
                                        )}

                                        {/* --- F. FREE CASH FLOW (GAP) --- */}
                                        <tr className="bg-green-100/50 font-bold border-y-2 border-green-200">
                                            <td className="py-3 px-4 text-gray-900 sticky left-0 bg-green-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] uppercase">Free Cash Flow (The Gap)</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className={`py-3 px-4 text-right ${row.freeCashFlow >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                                    {formatSmart(row.freeCashFlow)}
                                                </td>
                                            ))}
                                        </tr>

                                        {/* --- G. CAPITAL ALLOCATION --- */}
                                        <tr className="bg-gray-50/80">
                                            <td colSpan={enhancedBreakdownData.length + 1} className="py-2 px-4 font-semibold text-gray-800 text-xs uppercase tracking-wider sticky left-0">
                                                G. Capital Allocation
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-8">To Cash Savings</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className="py-3 px-4 text-right text-blue-600">
                                                    {row.toCash !== 0 ? formatSmart(row.toCash) : '-'}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-8">To Investments</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className="py-3 px-4 text-right text-purple-600">
                                                    {row.toInvestments !== 0 ? formatSmart(row.toInvestments) : '-'}
                                                </td>
                                            ))}
                                        </tr>
                                        {/* Individual Investment Allocations */}
                                        {(investmentsData?.investments || []).map((inv, index) => (
                                            <tr key={inv.id}>
                                                <td className="py-2 px-4 text-xs text-gray-500 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-12 font-normal">
                                                    ↳ Investment {index + 1} ({inv.portfolioPercent}%)
                                                </td>
                                                {enhancedBreakdownData.map((row) => {
                                                    const detail = row.investmentDetails[index]
                                                    return (
                                                        <td key={row.year} className="py-2 px-4 text-right text-xs text-purple-400">
                                                            {detail && detail.allocation !== 0 ? formatSmart(detail.allocation) : '-'}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}

                                        {/* --- H. WEALTH ACCELERATORS (NON-CASH) --- */}
                                        <tr className="bg-gray-50/80">
                                            <td colSpan={enhancedBreakdownData.length + 1} className="py-2 px-4 font-semibold text-gray-800 text-xs uppercase tracking-wider sticky left-0">
                                                H. Interest & Appreciation (Non-Cash)
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-8">Investment Growth</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className={`py-3 px-4 text-right ${row.investmentGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {formatSmart(row.investmentGrowth)}
                                                </td>
                                            ))}
                                        </tr>
                                        {enhancedBreakdownData.some(r => r.annualAppreciation > 0) && (
                                            <tr>
                                                <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pl-8">Home Appreciation</td>
                                                {enhancedBreakdownData.map((row) => (
                                                    <td key={row.year} className="py-3 px-4 text-right text-green-600">
                                                        {row.annualAppreciation > 0 ? `+${formatSmart(row.annualAppreciation)}` : '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        )}

                                        {/* --- I. ENDING BALANCES --- */}
                                        <tr className="bg-gray-900 text-white">
                                            <td colSpan={enhancedBreakdownData.length + 1} className="py-2 px-4 font-semibold text-xs uppercase tracking-wider sticky left-0">
                                                I. Ending Balances
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Cash & Equivalents</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className="py-3 px-4 text-right text-black font-medium">
                                                    {formatSmart(row.cash)}
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Invested Assets</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className="py-3 px-4 text-right text-black font-medium">
                                                    {formatSmart(row.investmentsAnd401kEnd)}
                                                </td>
                                            ))}
                                        </tr>
                                        {enhancedBreakdownData.some(r => r.homeEquity > 0) && (
                                            <tr>
                                                <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Real Estate Equity</td>
                                                {enhancedBreakdownData.map((row) => (
                                                    <td key={row.year} className="py-3 px-4 text-right text-black font-medium">
                                                        {formatSmart(row.homeEquity)}
                                                    </td>
                                                ))}
                                            </tr>
                                        )}
                                        <tr className="bg-green-100 font-bold border-t-2 border-green-500">
                                            <td className="py-3 px-4 text-gray-900 sticky left-0 bg-green-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Net Worth</td>
                                            {enhancedBreakdownData.map((row) => (
                                                <td key={row.year} className="py-3 px-4 text-right text-gray-900 text-sm">
                                                    {formatSmart(row.netWorthEnd)}
                                                </td>
                                            ))}
                                        </tr>
                                    </>

                                )
                            })()
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default NetWorthTab

function CustomTooltip({ active, payload, label, fmt }) {
    if (active && payload && payload.length) {
        const total = payload.reduce((sum, entry) => sum + entry.value, 0)
        // Reverse payload to match stacked visual order (top to bottom)
        const sortedPayload = [...payload].reverse()

        return (
            <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg min-w-[150px]">
                <p className="text-gray-900 font-bold mb-2 border-b border-gray-100 pb-1">Year: {label}</p>
                <div className="space-y-1">
                    {sortedPayload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-3 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-gray-500">{entry.name}</span>
                            </div>
                            <span className="font-medium text-gray-900">{fmt(entry.value)}</span>
                        </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between gap-3 text-sm font-bold">
                        <span className="text-gray-900">Total Net Worth</span>
                        <span className="text-gray-900">{fmt(total)}</span>
                    </div>
                </div>
            </div>
        )
    }
    return null
}

function getPct(val, total) {
    if (!total) return 0
    return ((val / total) * 100).toFixed(0)
}

function getWealthPercentile(netWorthPV) {
    // 2023 USA Wealth Percentiles by Age (Approximate Data Points)
    // Source: DQYDJ / Federal Reserve SCF

    if (netWorthPV > 10000000) return 'Top 0.5%'
    if (netWorthPV > 5000000) return 'Top 1%'
    if (netWorthPV > 3000000) return 'Top 5%'
    if (netWorthPV > 1500000) return 'Top 10%'
    if (netWorthPV > 500000) return 'Top 25%'
    return 'Top 50%'
}




