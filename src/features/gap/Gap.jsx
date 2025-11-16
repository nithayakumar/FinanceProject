import { useState, useEffect } from 'react'
import { storage } from '../../shared/storage'
import { calculateGapProjections } from './Gap.calc'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function Gap() {
  const [calculations, setCalculations] = useState(null)
  const [viewMode, setViewMode] = useState('nominal') // 'nominal' or 'pv'

  // Load data and calculate on mount
  useEffect(() => {
    console.group('📊 Loading Gap Calculations')

    const incomeData = storage.load('income')
    const expensesData = storage.load('expenses')
    const investmentsData = storage.load('investmentsDebt')
    const profile = storage.load('profile')

    if (!incomeData || !expensesData || !investmentsData || !profile) {
      console.error('Missing required data for gap calculations')
      console.groupEnd()
      return
    }

    console.log('Income Data:', incomeData)
    console.log('Expenses Data:', expensesData)
    console.log('Investments Data:', investmentsData)
    console.log('Profile:', profile)

    const results = calculateGapProjections(incomeData, expensesData, investmentsData, profile)
    setCalculations(results)

    console.log('Gap Calculations Complete:', results)
    console.groupEnd()
  }, [])

  if (!calculations) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading gap calculations...</p>
        </div>
      </div>
    )
  }

  const { projections, summary } = calculations
  const isPV = viewMode === 'pv'

  // Prepare chart data
  const chartData = projections.map(p => ({
    year: p.year,
    Cash: isPV ? p.cashPV : p.cash,
    '401k': isPV ? p.retirement401kValuePV : p.retirement401kValue,
    Investments: isPV ? p.totalInvestmentValuePV : p.totalInvestmentValue,
    NetWorth: isPV ? p.netWorthPV : p.netWorth
  }))

  // Filter to every 5 years for the table
  const milestoneData = projections.filter(p => p.year % 5 === 0 || p.year === 1)

  // Format currency
  const fmt = (val) => `$${Math.abs(val).toLocaleString()}`
  const fmtSigned = (val) => val >= 0 ? fmt(val) : `($${Math.abs(val).toLocaleString()})`

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gap Analysis</h1>
          <p className="text-gray-600">
            Income - 401k Contributions - Expenses = Gap
          </p>
        </div>
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
          title="Current Year Gap"
          value={fmtSigned(isPV ? summary.currentYearGapPV : summary.currentYearGap)}
          isPositive={summary.currentYearGap >= 0}
        />
        <SummaryCard
          title="Lifetime Gap"
          value={fmtSigned(isPV ? summary.lifetimeGapPV : summary.lifetimeGap)}
          isPositive={summary.lifetimeGap >= 0}
          subtitle="Total surplus/deficit"
        />
        <SummaryCard
          title="Retirement Net Worth"
          value={fmt(isPV ? summary.retirementNetWorthPV : summary.retirementNetWorth)}
          subtitle="At retirement"
        />
        <SummaryCard
          title="Net Worth Growth"
          value={`${summary.netWorthGrowthPercent.toFixed(1)}%`}
          subtitle={fmt(isPV ? (summary.netWorthGrowth / Math.pow(1.027, projections.length)) : summary.netWorthGrowth)}
        />
      </div>

      {/* Net Worth Chart */}
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
              dataKey="401k"
              stackId="1"
              stroke="#10b981"
              fill="#10b981"
            />
            <Area
              type="monotone"
              dataKey="Investments"
              stackId="1"
              stroke="#8b5cf6"
              fill="#8b5cf6"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 5-Year Milestone Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          5-Year Milestones {isPV && <span className="text-sm font-normal text-gray-500">(Present Value)</span>}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-2 font-semibold">Year</th>
                <th className="text-right py-3 px-2 font-semibold">Income</th>
                <th className="text-right py-3 px-2 font-semibold">401k Contrib</th>
                <th className="text-right py-3 px-2 font-semibold">Expenses</th>
                <th className="text-right py-3 px-2 font-semibold">Gap</th>
                <th className="text-right py-3 px-2 font-semibold">Invested</th>
                <th className="text-right py-3 px-2 font-semibold">Cost Basis</th>
                <th className="text-right py-3 px-2 font-semibold">Inv. Value</th>
                <th className="text-right py-3 px-2 font-semibold">401k Value</th>
                <th className="text-right py-3 px-2 font-semibold">Cash</th>
                <th className="text-right py-3 px-2 font-semibold">Net Worth</th>
              </tr>
            </thead>
            <tbody>
              {milestoneData.map((p) => (
                <tr key={p.year} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{p.year}</td>
                  <td className="text-right py-3 px-2">
                    {fmt(isPV ? p.grossIncomePV : p.grossIncome)}
                  </td>
                  <td className="text-right py-3 px-2">
                    {fmt(isPV ? p.totalIndividual401kPV : p.totalIndividual401k)}
                  </td>
                  <td className="text-right py-3 px-2">
                    {fmt(isPV ? p.annualExpensesPV : p.annualExpenses)}
                  </td>
                  <td className={`text-right py-3 px-2 font-medium ${
                    p.gap >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {fmtSigned(isPV ? p.gapPV : p.gap)}
                  </td>
                  <td className="text-right py-3 px-2">
                    {fmt(isPV ? p.investedThisYearPV : p.investedThisYear)}
                  </td>
                  <td className="text-right py-3 px-2">
                    {fmt(isPV ? p.totalCostBasisPV : p.totalCostBasis)}
                  </td>
                  <td className="text-right py-3 px-2">
                    {fmt(isPV ? p.totalInvestmentValuePV : p.totalInvestmentValue)}
                  </td>
                  <td className="text-right py-3 px-2">
                    {fmt(isPV ? p.retirement401kValuePV : p.retirement401kValue)}
                  </td>
                  <td className={`text-right py-3 px-2 ${
                    (isPV ? p.cashPV : p.cash) < 0 ? 'text-red-600 font-medium' : ''
                  }`}>
                    {fmtSigned(isPV ? p.cashPV : p.cash)}
                  </td>
                  <td className="text-right py-3 px-2 font-semibold">
                    {fmt(isPV ? p.netWorthPV : p.netWorth)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 text-xs text-gray-500 space-y-1">
        <p><strong>Gap:</strong> Annual Income - 401k Contributions - Expenses</p>
        <p><strong>Positive Gap:</strong> Fill cash to target → Invest per allocation % → Excess to cash</p>
        <p><strong>Negative Gap:</strong> Stop investing, draw from cash (can go negative)</p>
        <p><strong>Net Worth:</strong> Cash + 401k Value + Investment Value</p>
        {isPV && (
          <p><strong>Present Value:</strong> All values discounted by inflation rate to today's dollars</p>
        )}
      </div>
    </div>
  )
}

// Summary Card Component
function SummaryCard({ title, value, subtitle, isPositive }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className={`text-2xl font-bold ${
        isPositive !== undefined
          ? (isPositive ? 'text-green-600' : 'text-red-600')
          : 'text-gray-900'
      }`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  )
}

export default Gap
