import { useState } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

function NetWorthTab({ data }) {
  const [viewMode, setViewMode] = useState('nominal')
  const isPV = viewMode === 'pv'

  const { gapProjections, profile } = data
  const { projections, summary } = gapProjections

  // Format currency
  const fmt = (val) => `$${Math.abs(val).toLocaleString()}`

  // Prepare stacked area chart data
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

  return (
    <div>
      {/* Toggle */}
      <div className="flex justify-end mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('nominal')}
            className={`px-4 py-2 text-sm rounded-md transition ${
              viewMode === 'nominal'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Nominal
          </button>
          <button
            onClick={() => setViewMode('pv')}
            className={`px-4 py-2 text-sm rounded-md transition ${
              viewMode === 'pv'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Present Value
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          title="Current Net Worth"
          value={fmt(currentNetWorth)}
          subtitle="Year 1"
        />
        <SummaryCard
          title="Retirement Net Worth"
          value={fmt(retirementNetWorth)}
          subtitle={`Year ${profile.yearsToRetirement || 30}`}
        />
        <SummaryCard
          title="Net Worth Growth"
          value={fmt(netWorthGrowth)}
          subtitle={`${netWorthGrowthPercent.toFixed(1)}% increase`}
        />
        <SummaryCard
          title="Lifetime Invested"
          value={fmt(lifetimeInvested)}
          subtitle="Total contributions"
        />
      </div>

      {/* Stacked Area Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Net Worth Growth Over Time {isPV && <span className="text-sm font-normal text-gray-500">(Present Value)</span>}
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="year"
              label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
              label={{ value: isPV ? 'Present Value' : 'Nominal Value', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(val) => fmt(val)}
              labelFormatter={(year) => `Year ${year}`}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="Cash"
              stackId="1"
              stroke="#3b82f6"
              fill="#3b82f6"
            />
            <Area
              type="monotone"
              dataKey="Investments"
              stackId="1"
              stroke="#8b5cf6"
              fill="#8b5cf6"
            />
            <Area
              type="monotone"
              dataKey="401k"
              stackId="1"
              stroke="#10b981"
              fill="#10b981"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Year-by-Year Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">
          Detailed Year-by-Year Breakdown {isPV && <span className="text-sm font-normal text-gray-500">(Present Value)</span>}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-2 px-2 font-semibold text-gray-700">Year</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Income</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">401k Contrib</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Taxes</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Tax %</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Expenses</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Expense %</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700 bg-blue-50">Gap</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Cash</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Investments</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">401k</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700 bg-green-50">Net Worth</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((p) => {
                const income = isPV ? p.annualIncomePV : p.annualIncome
                const taxes = isPV ? p.annualTaxesPV : p.annualTaxes
                const expenses = isPV ? p.annualExpensesPV : p.annualExpenses
                const taxPercent = income > 0 ? (taxes / income * 100).toFixed(2) : '0.00'
                const expensePercent = income > 0 ? (expenses / income * 100).toFixed(2) : '0.00'

                return (
                  <tr key={p.year} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 font-medium text-gray-900">{p.year}</td>
                    <td className="text-right py-2 px-2 text-gray-700">${Math.round(income).toLocaleString()}</td>
                    <td className="text-right py-2 px-2 text-orange-700">-${Math.round(isPV ? p.totalIndividual401kPV : p.totalIndividual401k).toLocaleString()}</td>
                    <td className="text-right py-2 px-2 text-red-700">-${Math.round(taxes).toLocaleString()}</td>
                    <td className="text-right py-2 px-2 text-red-600 font-medium">{taxPercent}%</td>
                    <td className="text-right py-2 px-2 text-red-700">-${Math.round(expenses).toLocaleString()}</td>
                    <td className="text-right py-2 px-2 text-red-600 font-medium">{expensePercent}%</td>
                    <td className={`text-right py-2 px-2 font-semibold bg-blue-50 ${(isPV ? p.gapPV : p.gap) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                      {(isPV ? p.gapPV : p.gap) >= 0 ? '+' : ''}${Math.round(isPV ? p.gapPV : p.gap).toLocaleString()}
                    </td>
                    <td className="text-right py-2 px-2 text-gray-700">${Math.round(isPV ? p.cashPV : p.cash).toLocaleString()}</td>
                    <td className="text-right py-2 px-2 text-purple-700">${Math.round(isPV ? p.totalInvestmentValuePV : p.totalInvestmentValue).toLocaleString()}</td>
                    <td className="text-right py-2 px-2 text-green-700">${Math.round(isPV ? p.retirement401kValuePV : p.retirement401kValue).toLocaleString()}</td>
                    <td className="text-right py-2 px-2 font-bold text-gray-900 bg-green-50">${Math.round(isPV ? p.netWorthPV : p.netWorth).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-gray-500 space-y-1">
          <p><strong>Formula:</strong> Gap = Income - 401k Contributions - Taxes - Expenses</p>
          <p><strong>Net Worth:</strong> Cash + Investments + 401k</p>
          <p className="text-blue-600"><strong>Positive Gap:</strong> Excess funds are allocated to cash (up to target), then investments per allocation %, then remaining to cash</p>
          <p className="text-red-600"><strong>Negative Gap:</strong> Shortfall is drawn from cash (can go negative)</p>
        </div>
      </div>

      {/* Net Worth Component Breakdown Table */}
      <NetWorthBreakdownTable projections={projections} isPV={isPV} fmt={fmt} />
    </div>
  )
}

// Net Worth Breakdown Table Component
function NetWorthBreakdownTable({ projections, isPV, fmt }) {
  // Calculate year-over-year changes
  const breakdownData = projections.map((p, index) => {
    if (index === 0) {
      // First year - show beginning balances
      const netWorth = isPV ? p.netWorthPV : p.netWorth
      const cash = isPV ? p.cashPV : p.cash
      const investments = isPV ? p.totalInvestmentValuePV : p.totalInvestmentValue
      const ret401k = isPV ? p.retirement401kValuePV : p.retirement401kValue
      const costBasis = isPV ? p.totalCostBasisPV : p.totalCostBasis
      const capGains = investments - costBasis

      return {
        year: p.year,
        netWorthBegin: netWorth,
        netWorthEnd: netWorth,
        netWorthChange: 0,
        incomeAfterTaxExp: 0,
        cashChange: 0,
        cashPercent: netWorth > 0 ? (cash / netWorth * 100) : 0,
        ret401kChange: 0,
        ret401kPercent: netWorth > 0 ? (ret401k / netWorth * 100) : 0,
        costBasisChange: 0,
        capGainsChange: 0,
        investmentPercent: netWorth > 0 ? (investments / netWorth * 100) : 0
      }
    }

    const prev = projections[index - 1]

    // Current year values
    const netWorth = isPV ? p.netWorthPV : p.netWorth
    const cash = isPV ? p.cashPV : p.cash
    const investments = isPV ? p.totalInvestmentValuePV : p.totalInvestmentValue
    const ret401k = isPV ? p.retirement401kValuePV : p.retirement401kValue
    const costBasis = isPV ? p.totalCostBasisPV : p.totalCostBasis
    const capGains = investments - costBasis
    const gap = isPV ? p.gapPV : p.gap

    // Previous year values
    const prevNetWorth = isPV ? prev.netWorthPV : prev.netWorth
    const prevCash = isPV ? prev.cashPV : prev.cash
    const prevInvestments = isPV ? prev.totalInvestmentValuePV : prev.totalInvestmentValue
    const prevRet401k = isPV ? prev.retirement401kValuePV : prev.retirement401kValue
    const prevCostBasis = isPV ? prev.totalCostBasisPV : prev.totalCostBasis
    const prevCapGains = prevInvestments - prevCostBasis

    // Calculate changes
    const netWorthChange = netWorth - prevNetWorth
    const cashChange = cash - prevCash
    const ret401kChange = ret401k - prevRet401k
    const costBasisChange = costBasis - prevCostBasis
    const capGainsChange = capGains - prevCapGains

    return {
      year: p.year,
      netWorthBegin: prevNetWorth,
      netWorthEnd: netWorth,
      netWorthChange,
      incomeAfterTaxExp: gap,
      cashChange,
      cashPercent: netWorth > 0 ? (cash / netWorth * 100) : 0,
      ret401kChange,
      ret401kPercent: netWorth > 0 ? (ret401k / netWorth * 100) : 0,
      costBasisChange,
      capGainsChange,
      investmentPercent: netWorth > 0 ? (investments / netWorth * 100) : 0
    }
  })

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-semibold">
            Net Worth Component Breakdown {isPV && <span className="text-sm font-normal text-gray-500">(Present Value)</span>}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Year-over-year changes in net worth components and asset allocation
          </p>
        </div>
        <button
          onClick={() => exportBreakdownToCSV(breakdownData, isPV)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition"
        >
          Export Table
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Year</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700 bg-green-50">Net Worth Begin</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700 bg-green-50">Net Worth End</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700 bg-green-100">Δ Net Worth</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Income After Tax/Exp</th>
              <th className="text-right py-2 px-2 font-semibold text-blue-700">Δ Cash</th>
              <th className="text-right py-2 px-2 font-semibold text-blue-600">Cash %</th>
              <th className="text-right py-2 px-2 font-semibold text-green-700">Δ 401k</th>
              <th className="text-right py-2 px-2 font-semibold text-green-600">401k %</th>
              <th className="text-right py-2 px-2 font-semibold text-purple-700">Δ Cost Basis</th>
              <th className="text-right py-2 px-2 font-semibold text-purple-700">Δ Cap Gains</th>
              <th className="text-right py-2 px-2 font-semibold text-purple-600">Investment %</th>
            </tr>
          </thead>
          <tbody>
            {breakdownData.map((row) => (
              <tr key={row.year} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-2 font-medium text-gray-900">{row.year}</td>
                <td className="text-right py-2 px-2 text-gray-700 bg-green-50">${Math.round(row.netWorthBegin).toLocaleString()}</td>
                <td className="text-right py-2 px-2 text-gray-700 bg-green-50">${Math.round(row.netWorthEnd).toLocaleString()}</td>
                <td className={`text-right py-2 px-2 font-semibold bg-green-100 ${row.netWorthChange >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {row.netWorthChange >= 0 ? '+' : ''}${Math.round(row.netWorthChange).toLocaleString()}
                </td>
                <td className={`text-right py-2 px-2 ${row.incomeAfterTaxExp >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {row.incomeAfterTaxExp >= 0 ? '+' : ''}${Math.round(row.incomeAfterTaxExp).toLocaleString()}
                </td>
                <td className={`text-right py-2 px-2 ${row.cashChange >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {row.cashChange >= 0 ? '+' : ''}${Math.round(row.cashChange).toLocaleString()}
                </td>
                <td className="text-right py-2 px-2 text-blue-600 font-medium">{row.cashPercent.toFixed(1)}%</td>
                <td className={`text-right py-2 px-2 ${row.ret401kChange >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {row.ret401kChange >= 0 ? '+' : ''}${Math.round(row.ret401kChange).toLocaleString()}
                </td>
                <td className="text-right py-2 px-2 text-green-600 font-medium">{row.ret401kPercent.toFixed(1)}%</td>
                <td className={`text-right py-2 px-2 ${row.costBasisChange >= 0 ? 'text-purple-700' : 'text-red-700'}`}>
                  {row.costBasisChange >= 0 ? '+' : ''}${Math.round(row.costBasisChange).toLocaleString()}
                </td>
                <td className={`text-right py-2 px-2 ${row.capGainsChange >= 0 ? 'text-purple-700' : 'text-red-700'}`}>
                  {row.capGainsChange >= 0 ? '+' : ''}${Math.round(row.capGainsChange).toLocaleString()}
                </td>
                <td className="text-right py-2 px-2 text-purple-600 font-medium">{row.investmentPercent.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p><strong>Δ Net Worth:</strong> Total change in net worth from previous year</p>
        <p><strong>Income After Tax/Exp:</strong> Gap (available cash flow after taxes and expenses)</p>
        <p><strong>Δ Cost Basis:</strong> New investment contributions (not including growth)</p>
        <p><strong>Δ Cap Gains:</strong> Investment growth (change in unrealized gains)</p>
        <p><strong>% Columns:</strong> Percentage of ending net worth in each asset category</p>
      </div>
    </div>
  )
}

// Export breakdown table to CSV
function exportBreakdownToCSV(breakdownData, isPV) {
  const headers = [
    'Year',
    'Net Worth Begin',
    'Net Worth End',
    'Net Worth Change',
    'Income After Tax & Expenses',
    'Cash Change',
    'Cash %',
    '401k Change',
    '401k %',
    'Cost Basis Change',
    'Capital Gains Change',
    'Investment %'
  ]

  const rows = breakdownData.map(row => [
    row.year,
    Math.round(row.netWorthBegin),
    Math.round(row.netWorthEnd),
    Math.round(row.netWorthChange),
    Math.round(row.incomeAfterTaxExp),
    Math.round(row.cashChange),
    row.cashPercent.toFixed(2),
    Math.round(row.ret401kChange),
    row.ret401kPercent.toFixed(2),
    Math.round(row.costBasisChange),
    Math.round(row.capGainsChange),
    row.investmentPercent.toFixed(2)
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  const valueType = isPV ? 'PresentValue' : 'Nominal'
  const filename = `NetWorth_Breakdown_${valueType}_${new Date().toISOString().split('T')[0]}.csv`

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  console.log(`✅ Net Worth breakdown exported as ${filename}`)
}

// Summary Card Component
function SummaryCard({ title, value, subtitle }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  )
}

export default NetWorthTab
