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

  // Prepare waterfall data for every 5 years
  const waterfallData = []
  for (let i = 0; i < projections.length; i++) {
    const year = projections[i].year
    if (year % 5 === 0 || year === 1) {
      const current = projections[i]
      const previous = i > 0 ? projections[i - 1] : null

      if (previous) {
        // Calculate changes
        const startNetWorth = isPV ? previous.netWorthPV : previous.netWorth
        const endNetWorth = isPV ? current.netWorthPV : current.netWorth

        const cashChange = (isPV ? current.cashPV : current.cash) - (isPV ? previous.cashPV : previous.cash)
        const investmentContributions = (isPV ? current.totalCostBasisPV : current.totalCostBasis) - (isPV ? previous.totalCostBasisPV : previous.totalCostBasis)
        const investmentGrowth = (isPV ? current.totalInvestmentValuePV : current.totalInvestmentValue) - (isPV ? previous.totalInvestmentValuePV : previous.totalInvestmentValue) - investmentContributions
        const retirement401kContribution = isPV ? current.totalIndividual401kPV : current.totalIndividual401k
        const retirement401kGrowth = (isPV ? current.retirement401kValuePV : current.retirement401kValue) - (isPV ? previous.retirement401kValuePV : previous.retirement401kValue) - retirement401kContribution

        waterfallData.push({
          year,
          startNetWorth,
          cashChange,
          investmentContributions,
          investmentGrowth,
          retirement401kContribution,
          retirement401kGrowth,
          endNetWorth
        })
      }
    }
  }

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

      {/* Waterfall Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          Year-over-Year Net Worth Changes {isPV && <span className="text-sm font-normal text-gray-500">(Present Value)</span>}
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Shows what drove net worth changes for milestone years (every 5 years)
        </p>

        {waterfallData.map((item) => (
          <div key={item.year} className="mb-8 pb-8 border-b border-gray-200 last:border-b-0">
            <h3 className="font-semibold text-lg mb-4">Year {item.year}</h3>
            <div className="space-y-3">
              <WaterfallRow
                label="Starting Net Worth"
                value={item.startNetWorth}
                isStart
              />
              <WaterfallRow
                label="Cash Change"
                value={item.cashChange}
                color={item.cashChange >= 0 ? 'blue' : 'red'}
              />
              <WaterfallRow
                label="Investment Contributions"
                value={item.investmentContributions}
                color="purple"
              />
              <WaterfallRow
                label="Investment Growth"
                value={item.investmentGrowth}
                color="purple"
              />
              <WaterfallRow
                label="401k Contributions"
                value={item.retirement401kContribution}
                color="green"
              />
              <WaterfallRow
                label="401k Growth"
                value={item.retirement401kGrowth}
                color="green"
              />
              <WaterfallRow
                label="Ending Net Worth"
                value={item.endNetWorth}
                isEnd
              />
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 text-xs text-gray-500 space-y-1">
        <p><strong>Net Worth:</strong> Cash + Investment Market Value + 401k Value</p>
        <p><strong>Investment Contributions:</strong> New money added to investments (cost basis)</p>
        <p><strong>Investment Growth:</strong> Market appreciation on invested funds</p>
        <p><strong>401k Contributions:</strong> Individual contributions (pre-tax)</p>
        <p><strong>401k Growth:</strong> Growth on 401k balance + company match</p>
      </div>

      {/* Detailed Year-by-Year Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">
          Detailed Year-by-Year Breakdown (First 10 Years) {isPV && <span className="text-sm font-normal text-gray-500">(Present Value)</span>}
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
              {projections.slice(0, 10).map((p) => {
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
    </div>
  )
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

// Waterfall Row Component
function WaterfallRow({ label, value, isStart, isEnd, color }) {
  const fmt = (val) => `$${Math.abs(val).toLocaleString()}`

  const colorClasses = {
    blue: 'bg-blue-100 border-blue-300 text-blue-900',
    purple: 'bg-purple-100 border-purple-300 text-purple-900',
    green: 'bg-green-100 border-green-300 text-green-900',
    red: 'bg-red-100 border-red-300 text-red-900'
  }

  const bgClass = isStart || isEnd
    ? 'bg-gray-100 border-gray-400 text-gray-900 font-semibold'
    : colorClasses[color] || 'bg-gray-50 border-gray-300 text-gray-900'

  const prefix = isStart || isEnd ? '' : value >= 0 ? '+ ' : '- '

  return (
    <div className={`flex justify-between items-center p-3 rounded-md border ${bgClass}`}>
      <span className="text-sm">{label}</span>
      <span className="font-medium">{prefix}{fmt(value)}</span>
    </div>
  )
}

export default NetWorthTab
