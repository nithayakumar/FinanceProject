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
  }))

  // Calculate summary metrics
  const currentNetWorth = isPV ? projections[0].netWorthPV : projections[0].netWorth
  const retirementNetWorth = isPV ? summary.retirementNetWorthPV : summary.retirementNetWorth
  const netWorthGrowth = retirementNetWorth - currentNetWorth
  const netWorthGrowthPercent = currentNetWorth > 0 ? (netWorthGrowth / currentNetWorth * 100) : 0
  const lifetimeInvested = isPV ? summary.lifetimeInvestedPV : summary.lifetimeInvested

  // Calculate Y-axis domain
  const minComponentVal = Math.min(...chartData.map(d => Math.min(d.Cash, d.Investments, d['401k'])))
  const yAxisMin = minComponentVal < 0 ? 'auto' : 0

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Current Net Worth"
          value={fmt(currentNetWorth)}
          subtitle="Year 1"
          trend="neutral"
        />
        <SummaryCard
          title="Retirement Net Worth"
          value={fmt(retirementNetWorth)}
          subtitle={`Year ${profile.yearsToRetirement || 30}`}
          trend="positive"
        />
        <SummaryCard
          title="Net Worth Growth"
          value={fmt(netWorthGrowth)}
          subtitle={`${netWorthGrowthPercent.toFixed(0)}% increase`}
          trend="positive"
        />
        <SummaryCard
          title="Lifetime Invested"
          value={fmt(lifetimeInvested)}
          subtitle="Total contributions"
          trend="neutral"
        />
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
              <Bar
                name="Investments"
                dataKey="Investments"
                stackId="a"
                fill="#8B5CF6" // Violet-500
                radius={[0, 0, 0, 0]}
                maxBarSize={50}
              />
              <Bar
                name="401k"
                dataKey="401k"
                stackId="a"
                fill="#10B981" // Emerald-500
                radius={[0, 0, 0, 0]}
                maxBarSize={50}
              />
              <Bar
                name="Cash"
                dataKey="Cash"
                stackId="a"
                fill="#3B82F6" // Blue-500
                radius={[0, 0, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Year-by-Year Table */}
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
                    <td className="py-3 px-4 text-right text-gray-600">{formatSmart(income)}</td>
                    <td className="py-3 px-4 text-right text-orange-600">-{formatSmart(isPV ? p.totalIndividual401kPV : p.totalIndividual401k)}</td>
                    <td className="py-3 px-4 text-right text-red-600">-{formatSmart(taxes)}</td>
                    <td className="py-3 px-4 text-right text-gray-500 text-xs">{taxPercent}%</td>
                    <td className="py-3 px-4 text-right text-red-600">-{formatSmart(expenses)}</td>
                    <td className="py-3 px-4 text-right text-gray-500 text-xs">{expensePercent}%</td>
                    <td className={`py-3 px-4 text-right font-medium bg-blue-50/30 ${gap >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {gap >= 0 ? '+' : ''}{formatSmart(gap)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">{formatSmart(isPV ? p.cashPV : p.cash)}</td>
                    <td className="py-3 px-4 text-right text-purple-600">{formatSmart(isPV ? p.totalInvestmentValuePV : p.totalInvestmentValue)}</td>
                    <td className="py-3 px-4 text-right text-green-600">{formatSmart(isPV ? p.retirement401kValuePV : p.retirement401kValue)}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900 bg-green-50/30">{formatSmart(isPV ? p.netWorthPV : p.netWorth)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span><strong>Gap:</strong> Income - (401k + Taxes + Expenses)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span><strong>Net Worth:</strong> Cash + Investments + 401k</span>
            </div>
          </div>
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
    </div>
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

    if (index === 0) {
      // Year 1: Calculate beginning values by working backwards
      const beginCash = cash - toCash
      const beginRet401k = ret401k - ret401kContribution
      const ret401kGrowth = ret401k - beginRet401k - ret401kContribution
      const beginInvestments = investments - toInvestments
      const beginCostBasis = costBasis - toInvestments
      const beginNetWorth = beginCash + beginRet401k + beginInvestments

      const investmentGrowth = (investments - beginInvestments) - (costBasis - beginCostBasis)

      return {
        year: p.year,
        cashBegin: beginCash,
        investmentsBegin: beginInvestments,
        ret401kBegin: beginRet401k,
        netWorthBegin: beginNetWorth,
        salary, equity, company401k, grossIncome,
        individual401k, taxableIncome,
        federalTax, stateTax, fica, totalTaxes, afterTaxIncome,
        expenses, disposableIncome,
        toCash, toInvestments, totalAllocated: disposableIncome,
        investmentGrowth, ret401kGrowth,
        cash, investmentBalance: investments, ret401kBalance: ret401k, netWorthEnd: netWorth,
        incomeByStream: p.incomeByStream || [],
        expensesByCategory: p.expensesByCategory || [],
        investmentDetails: (p.investments || []).map((inv, invIndex) => {
          const allocation = isPV ? inv.allocationPV : inv.allocation
          const marketValue = isPV ? inv.marketValuePV : inv.marketValue
          const beginValue = marketValue - allocation - (inv.growth || 0)
          const annualGrowth = marketValue - beginValue - allocation
          return { ...inv, allocation, growth: annualGrowth, marketValue }
        })
      }
    }

    // Years 2+
    const prev = projections[index - 1]
    const prevNetWorth = isPV ? prev.netWorthPV : prev.netWorth
    const prevCash = isPV ? prev.cashPV : prev.cash
    const prevInvestments = isPV ? prev.totalInvestmentValuePV : prev.totalInvestmentValue
    const prevRet401k = isPV ? prev.retirement401kValuePV : prev.retirement401kValue
    const prevCostBasis = isPV ? prev.totalCostBasisPV : prev.totalCostBasis

    const ret401kGrowth = (ret401k - prevRet401k) - ret401kContribution
    const investmentGrowth = (investments - prevInvestments) - (costBasis - prevCostBasis)

    return {
      year: p.year,
      cashBegin: prevCash,
      investmentsBegin: prevInvestments,
      ret401kBegin: prevRet401k,
      netWorthBegin: prevNetWorth,
      salary, equity, company401k, grossIncome,
      individual401k, taxableIncome,
      federalTax, stateTax, fica, totalTaxes, afterTaxIncome,
      expenses, disposableIncome,
      toCash, toInvestments, totalAllocated: disposableIncome,
      investmentGrowth, ret401kGrowth,
      cash, investmentBalance: investments, ret401kBalance: ret401k, netWorthEnd: netWorth,
      incomeByStream: p.incomeByStream || [],
      expensesByCategory: p.expensesByCategory || [],
      investmentDetails: (p.investments || []).map((inv, invIndex) => {
        const prevInv = prev.investments?.[invIndex]
        const prevMarketValue = isPV ? (prevInv?.marketValuePV || 0) : (prevInv?.marketValue || 0)
        const allocation = isPV ? inv.allocationPV : inv.allocation
        const marketValue = isPV ? inv.marketValuePV : inv.marketValue
        const annualGrowth = marketValue - prevMarketValue - allocation
        return { ...inv, allocation, growth: annualGrowth, marketValue }
      })
    }
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
    const headers = tableViewMode === 'simple'
      ? ['Year', 'Income', 'Expenses', 'Gap', 'Cash', 'Investments', '401k', 'Net Worth']
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
          row.ret401kBalance,
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
        { label: '401k End', key: 'ret401kBalance' },
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
                {/* Total Gross Income */}
                <tr>
                  <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total Gross Income</td>
                  {enhancedBreakdownData.map((row) => (
                    <td key={row.year} className="py-3 px-4 text-right text-green-600">
                      {formatSmart(row.grossIncome)}
                    </td>
                  ))}
                </tr>
                {/* 401k Contribution (Self) */}
                <tr>
                  <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">401k Contribution (Self)</td>
                  {enhancedBreakdownData.map((row) => (
                    <td key={row.year} className="py-3 px-4 text-right text-orange-600">
                      -{formatSmart(row.individual401k)}
                    </td>
                  ))}
                </tr>
                {/* Taxable Income */}
                <tr>
                  <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Taxable Income</td>
                  {enhancedBreakdownData.map((row) => (
                    <td key={row.year} className="py-3 px-4 text-right text-gray-600">
                      {formatSmart(row.taxableIncome)}
                    </td>
                  ))}
                </tr>
                {/* After Tax Income */}
                <tr>
                  <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">After Tax Income</td>
                  {enhancedBreakdownData.map((row) => (
                    <td key={row.year} className="py-3 px-4 text-right text-gray-600">
                      {formatSmart(row.afterTaxIncome)}
                    </td>
                  ))}
                </tr>
                {/* Total Expenses */}
                <tr>
                  <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total Expenses</td>
                  {enhancedBreakdownData.map((row) => (
                    <td key={row.year} className="py-3 px-4 text-right text-red-600">
                      -{formatSmart(row.expenses)}
                    </td>
                  ))}
                </tr>
                {/* Disposable Income */}
                <tr className="bg-purple-50/30">
                  <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-purple-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Disposable Income</td>
                  {enhancedBreakdownData.map((row) => (
                    <td key={row.year} className={`py-3 px-4 text-right font-bold ${row.disposableIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatSmart(row.disposableIncome)}
                    </td>
                  ))}
                </tr>
                {/* Allocation to Cash */}
                <tr>
                  <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Allocation to Cash</td>
                  {enhancedBreakdownData.map((row) => (
                    <td key={row.year} className={`py-3 px-4 text-right ${row.toCash >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatSmart(row.toCash)}
                    </td>
                  ))}
                </tr>
                {/* Allocation to Investments */}
                <tr>
                  <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Allocation to Investments</td>
                  {enhancedBreakdownData.map((row) => (
                    <td key={row.year} className="py-3 px-4 text-right text-purple-600">
                      {formatSmart(row.toInvestments)}
                    </td>
                  ))}
                </tr>
                {/* Investments Growth */}
                <tr>
                  <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Investments Growth (All)</td>
                  {enhancedBreakdownData.map((row) => (
                    <td key={row.year} className={`py-3 px-4 text-right ${row.totalGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatSmart(row.totalGrowth)}
                    </td>
                  ))}
                </tr>
                {/* Cash End */}
                <tr>
                  <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Cash End</td>
                  {enhancedBreakdownData.map((row) => (
                    <td key={row.year} className="py-3 px-4 text-right text-blue-600">
                      {formatSmart(row.cash)}
                    </td>
                  ))}
                </tr>
                {/* Investments + 401k End */}
                <tr>
                  <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Investments + 401k End</td>
                  {enhancedBreakdownData.map((row) => (
                    <td key={row.year} className="py-3 px-4 text-right text-purple-600">
                      {formatSmart(row.investmentsAnd401kEnd)}
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
                const investmentNames = investmentsData?.investments?.map((inv, index) => `Investment ${index + 1}`) || []

                return (
                  <>
                    {/* Starting Balances */}
                    <tr className="bg-gray-50/80">
                      <td colSpan={enhancedBreakdownData.length + 1} className="py-2 px-4 font-semibold text-gray-800 text-xs uppercase tracking-wider sticky left-0">
                        Starting Balances
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Cash Begin</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className="py-3 px-4 text-right text-blue-600">
                          {formatSmart(row.cashBegin)}
                        </td>
                      ))}
                    </tr>
                    {investmentNames.map((name, invIndex) => (
                      <tr key={`inv-begin-${invIndex}`}>
                        <td className="py-3 px-4 text-gray-500 pl-8 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{name} Begin</td>
                        {enhancedBreakdownData.map((row, rowIndex) => {
                          const inv = row.investmentDetails?.[invIndex]
                          const beginValue = rowIndex === 0
                            ? (inv?.marketValue || 0) - (inv?.allocation || 0) - (inv?.growth || 0)
                            : breakdownData[rowIndex - 1]?.investmentDetails?.[invIndex]?.marketValue || 0
                          return (
                            <td key={row.year} className="py-3 px-4 text-right text-purple-600">
                              {formatSmart(beginValue)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">401k Begin</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className="py-3 px-4 text-right text-green-600">
                          {formatSmart(row.ret401kBegin)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-blue-50/30">
                      <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-blue-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Net Worth Begin</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className="py-3 px-4 text-right font-bold text-gray-900">
                          {formatSmart(row.netWorthBegin)}
                        </td>
                      ))}
                    </tr>

                    {/* Income */}
                    <tr className="bg-gray-50/80">
                      <td colSpan={enhancedBreakdownData.length + 1} className="py-2 px-4 font-semibold text-gray-800 text-xs uppercase tracking-wider sticky left-0">
                        Income
                      </td>
                    </tr>
                    {incomeStreamNames.map((streamName, streamIndex) => (
                      <tr key={`stream-${streamIndex}`}>
                        <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{streamName}</td>
                        {enhancedBreakdownData.map((row) => {
                          const stream = row.incomeByStream.find(s => s.name === streamName)
                          const value = isPV ? (stream?.totalPV || 0) : (stream?.total || 0)
                          return (
                            <td key={row.year} className="py-3 px-4 text-right text-gray-600">
                              {formatSmart(value)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    <tr className="bg-green-50/30">
                      <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-green-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total Gross Income</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className="py-3 px-4 text-right font-bold text-gray-900">
                          {formatSmart(row.grossIncome)}
                        </td>
                      ))}
                    </tr>

                    {/* Pre-Tax Savings */}
                    <tr className="bg-gray-50/80">
                      <td colSpan={enhancedBreakdownData.length + 1} className="py-2 px-4 font-semibold text-gray-800 text-xs uppercase tracking-wider sticky left-0">
                        Pre-Tax Savings
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Individual 401k</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className="py-3 px-4 text-right text-orange-600">
                          -{formatSmart(row.individual401k)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-yellow-50/30">
                      <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-yellow-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Taxable Income</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className="py-3 px-4 text-right font-bold text-gray-900">
                          {formatSmart(row.taxableIncome)}
                        </td>
                      ))}
                    </tr>

                    {/* Taxes */}
                    <tr className="bg-gray-50/80">
                      <td colSpan={enhancedBreakdownData.length + 1} className="py-2 px-4 font-semibold text-gray-800 text-xs uppercase tracking-wider sticky left-0">
                        Taxes
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Federal Tax</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className="py-3 px-4 text-right text-red-600">
                          -{formatSmart(row.federalTax)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">State Tax</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className="py-3 px-4 text-right text-red-600">
                          -{formatSmart(row.stateTax)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">FICA</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className="py-3 px-4 text-right text-red-600">
                          -{formatSmart(row.fica)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-red-50/30">
                      <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-red-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total Taxes</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className="py-3 px-4 text-right font-bold text-red-600">
                          -{formatSmart(row.totalTaxes)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-blue-50/30">
                      <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-blue-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">After Tax Income</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className="py-3 px-4 text-right font-bold text-gray-900">
                          {formatSmart(row.afterTaxIncome)}
                        </td>
                      ))}
                    </tr>

                    {/* Expenses */}
                    <tr className="bg-gray-50/80">
                      <td colSpan={enhancedBreakdownData.length + 1} className="py-2 px-4 font-semibold text-gray-800 text-xs uppercase tracking-wider sticky left-0">
                        Expenses
                      </td>
                    </tr>
                    {(() => {
                      const expenseCategoryNames = [...new Set(enhancedBreakdownData.flatMap(row => row.expensesByCategory.map(c => c.name)))].filter(Boolean)

                      // If in Simple Mode (only 'Total Expenses' category), hide the breakdown rows 
                      // to avoid redundancy with the "Total Expenses" summary row below
                      if (expenseCategoryNames.length === 1 && expenseCategoryNames[0] === 'Total Expenses') {
                        return null
                      }

                      return expenseCategoryNames.map((catName, catIndex) => (
                        <tr key={`expense-${catIndex}`}>
                          <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{catName}</td>
                          {enhancedBreakdownData.map((row) => {
                            const cat = row.expensesByCategory.find(c => c.name === catName)
                            const value = isPV ? (cat?.totalPV || 0) : (cat?.total || 0)
                            return (
                              <td key={row.year} className="py-3 px-4 text-right text-red-600">
                                -{formatSmart(value)}
                              </td>
                            )
                          })}
                        </tr>
                      ))
                    })()}
                    <tr className="bg-orange-50/30">
                      <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-orange-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total Expenses</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className="py-3 px-4 text-right font-bold text-red-600">
                          -{formatSmart(row.expenses)}
                        </td>
                      ))}
                    </tr>

                    {/* Disposable Income */}
                    <tr className="bg-purple-50/30 border-t-2 border-gray-200">
                      <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-purple-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Disposable Income (Gap)</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className={`py-3 px-4 text-right font-bold ${row.disposableIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatSmart(row.disposableIncome)}
                        </td>
                      ))}
                    </tr>

                    {/* Allocations */}
                    <tr className="bg-gray-50/80">
                      <td colSpan={enhancedBreakdownData.length + 1} className="py-2 px-4 font-semibold text-gray-800 text-xs uppercase tracking-wider sticky left-0">
                        Allocations
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">To Cash</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className={`py-3 px-4 text-right ${row.toCash >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatSmart(row.toCash)}
                        </td>
                      ))}
                    </tr>
                    {investmentNames.map((name, invIndex) => (
                      <tr key={`inv-alloc-${invIndex}`}>
                        <td className="py-3 px-4 text-gray-500 pl-8 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">To {name}</td>
                        {enhancedBreakdownData.map((row) => {
                          const inv = row.investmentDetails?.[invIndex]
                          return (
                            <td key={row.year} className="py-3 px-4 text-right text-purple-600">
                              {formatSmart(inv?.allocation || 0)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">To 401k (Individual + Company)</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className="py-3 px-4 text-right text-green-600">
                          {formatSmart(row.individual401k + row.company401k)}
                        </td>
                      ))}
                    </tr>

                    {/* Growth */}
                    <tr className="bg-gray-50/80">
                      <td colSpan={enhancedBreakdownData.length + 1} className="py-2 px-4 font-semibold text-gray-800 text-xs uppercase tracking-wider sticky left-0">
                        Investment Growth
                      </td>
                    </tr>
                    {investmentNames.map((name, invIndex) => (
                      <tr key={`inv-growth-${invIndex}`}>
                        <td className="py-3 px-4 text-gray-500 pl-8 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{name} Growth</td>
                        {enhancedBreakdownData.map((row) => {
                          const inv = row.investmentDetails?.[invIndex]
                          return (
                            <td key={row.year} className={`py-3 px-4 text-right ${(inv?.growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatSmart(inv?.growth || 0)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">401k Growth</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className={`py-3 px-4 text-right ${row.ret401kGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatSmart(row.ret401kGrowth)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-green-50/30">
                      <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-green-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Total Growth</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className={`py-3 px-4 text-right font-bold ${row.totalGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatSmart(row.totalGrowth)}
                        </td>
                      ))}
                    </tr>

                    {/* Ending Balances */}
                    <tr className="bg-gray-50/80">
                      <td colSpan={enhancedBreakdownData.length + 1} className="py-2 px-4 font-semibold text-gray-800 text-xs uppercase tracking-wider sticky left-0">
                        Ending Balances
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Cash End</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className={`py-3 px-4 text-right ${row.cash >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatSmart(row.cash)}
                        </td>
                      ))}
                    </tr>
                    {investmentNames.map((name, invIndex) => (
                      <tr key={`inv-end-${invIndex}`}>
                        <td className="py-3 px-4 text-gray-500 pl-8 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{name} End</td>
                        {enhancedBreakdownData.map((row) => {
                          const inv = row.investmentDetails?.[invIndex]
                          return (
                            <td key={row.year} className="py-3 px-4 text-right text-purple-600">
                              {formatSmart(inv?.marketValue || 0)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td className="py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">401k End</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className="py-3 px-4 text-right text-green-600">
                          {formatSmart(row.ret401kBalance)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-green-50/50 border-t-2 border-gray-200">
                      <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-green-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Net Worth End</td>
                      {enhancedBreakdownData.map((row) => (
                        <td key={row.year} className="py-3 px-4 text-right font-bold text-gray-900">
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
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg min-w-[150px]">
        <p className="text-gray-900 font-bold mb-2 border-b border-gray-100 pb-1">Year: {label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-500">{entry.name}</span>
              </div>
              <span className="font-medium text-gray-900">{fmt(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}
