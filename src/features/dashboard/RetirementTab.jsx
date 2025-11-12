import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function RetirementTab({ data }) {
  const { gapProjections, incomeProjections, profile } = data
  const { projections, summary } = gapProjections

  const yearsToRetirement = profile.yearsToRetirement || 30
  const currentAge = profile.currentAge || 30
  const retirementAge = currentAge + yearsToRetirement

  // Get retirement year data (last year)
  const retirementYear = projections[projections.length - 1]
  const finalYearIncome = incomeProjections.projections[(yearsToRetirement - 1) * 12]?.totalCompNominal * 12 || 0

  // Calculate retirement metrics
  const retirementNetWorth = summary.retirementNetWorth
  const retirementNetWorthPV = summary.retirementNetWorthPV
  const safeWithdrawal = retirementNetWorth * 0.04 // 4% rule
  const safeWithdrawalPV = retirementNetWorthPV * 0.04
  const incomeReplacement = finalYearIncome > 0 ? (safeWithdrawal / finalYearIncome) * 100 : 0

  // Asset allocation at retirement
  const allocationData = [
    { name: 'Cash', value: retirementYear.cash, color: '#3b82f6' },
    { name: 'Investments', value: retirementYear.totalInvestmentValue, color: '#8b5cf6' },
    { name: '401k', value: retirementYear.retirement401kValue, color: '#10b981' }
  ]

  // Income comparison
  const comparisonData = [
    {
      category: 'Final Year Income',
      amount: finalYearIncome
    },
    {
      category: 'Safe Withdrawal (4%)',
      amount: safeWithdrawal
    }
  ]

  // Format currency
  const fmt = (val) => `$${Math.abs(val).toLocaleString()}`

  // Readiness assessment
  const getReadinessStatus = () => {
    if (incomeReplacement >= 100) return { text: 'Excellent', color: 'green' }
    if (incomeReplacement >= 80) return { text: 'Good', color: 'blue' }
    if (incomeReplacement >= 60) return { text: 'Fair', color: 'yellow' }
    return { text: 'Needs Improvement', color: 'red' }
  }

  const readinessStatus = getReadinessStatus()

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          title="Years to Retirement"
          value={yearsToRetirement}
          subtitle={`Retire at age ${retirementAge}`}
        />
        <SummaryCard
          title="Net Worth at Retirement"
          value={fmt(retirementNetWorth)}
          subtitle={`PV: ${fmt(retirementNetWorthPV)}`}
        />
        <SummaryCard
          title="Safe Withdrawal Income"
          value={fmt(safeWithdrawal)}
          subtitle={`${fmt(safeWithdrawal / 12)}/month`}
        />
        <SummaryCard
          title="Income Replacement"
          value={`${incomeReplacement.toFixed(1)}%`}
          subtitle={readinessStatus.text}
          highlight={readinessStatus.color}
        />
      </div>

      {/* Readiness Status Banner */}
      <div className={`rounded-lg p-6 mb-8 ${
        readinessStatus.color === 'green' ? 'bg-green-50 border border-green-300' :
        readinessStatus.color === 'blue' ? 'bg-blue-50 border border-blue-300' :
        readinessStatus.color === 'yellow' ? 'bg-yellow-50 border border-yellow-300' :
        'bg-red-50 border border-red-300'
      }`}>
        <h2 className="text-lg font-semibold mb-2">
          Retirement Readiness: <span className={`${
            readinessStatus.color === 'green' ? 'text-green-700' :
            readinessStatus.color === 'blue' ? 'text-blue-700' :
            readinessStatus.color === 'yellow' ? 'text-yellow-700' :
            'text-red-700'
          }`}>{readinessStatus.text}</span>
        </h2>
        <p className="text-sm text-gray-700">
          Based on the 4% safe withdrawal rule, you can withdraw {fmt(safeWithdrawal)} annually in retirement,
          which represents {incomeReplacement.toFixed(1)}% of your final year income ({fmt(finalYearIncome)}).
        </p>
        {incomeReplacement < 100 && (
          <p className="text-sm text-gray-700 mt-2">
            💡 To improve: Increase investment contributions, extend working years, or reduce expected retirement expenses.
          </p>
        )}
      </div>

      {/* Two Column Layout for Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Asset Allocation Donut Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Retirement Asset Allocation</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={(entry) => `${entry.name}: ${fmt(entry.value)}`}
              >
                {allocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(val) => fmt(val)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2 text-sm">
            {allocationData.map((item) => (
              <div key={item.name} className="flex justify-between">
                <span className="flex items-center">
                  <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                  {item.name}
                </span>
                <span className="font-medium">{fmt(item.value)} ({((item.value / retirementNetWorth) * 100).toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Income Comparison Bar Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Income Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="category" width={150} />
              <Tooltip formatter={(val) => fmt(val)} />
              <Bar dataKey="amount" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-4">
            The safe withdrawal amount is based on the 4% rule, which suggests withdrawing 4% of your retirement portfolio annually for a sustainable 30-year retirement.
          </p>
        </div>
      </div>

      {/* Detailed Metrics Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Detailed Retirement Metrics</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-2 font-semibold">Metric</th>
                <th className="text-right py-3 px-2 font-semibold">Nominal Value</th>
                <th className="text-right py-3 px-2 font-semibold">Present Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-2 font-medium">Total Net Worth</td>
                <td className="text-right py-3 px-2">{fmt(retirementNetWorth)}</td>
                <td className="text-right py-3 px-2">{fmt(retirementNetWorthPV)}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-2">Cash Balance</td>
                <td className="text-right py-3 px-2">{fmt(retirementYear.cash)}</td>
                <td className="text-right py-3 px-2">{fmt(retirementYear.cashPV)}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-2">Investment Value</td>
                <td className="text-right py-3 px-2">{fmt(retirementYear.totalInvestmentValue)}</td>
                <td className="text-right py-3 px-2">{fmt(retirementYear.totalInvestmentValuePV)}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-2">401k Balance</td>
                <td className="text-right py-3 px-2">{fmt(retirementYear.retirement401kValue)}</td>
                <td className="text-right py-3 px-2">{fmt(retirementYear.retirement401kValuePV)}</td>
              </tr>
              <tr className="border-b border-gray-200 bg-blue-50">
                <td className="py-3 px-2 font-medium">Safe Annual Withdrawal (4%)</td>
                <td className="text-right py-3 px-2 font-semibold">{fmt(safeWithdrawal)}</td>
                <td className="text-right py-3 px-2 font-semibold">{fmt(safeWithdrawalPV)}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-2">Safe Monthly Withdrawal</td>
                <td className="text-right py-3 px-2">{fmt(safeWithdrawal / 12)}</td>
                <td className="text-right py-3 px-2">{fmt(safeWithdrawalPV / 12)}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-2 font-medium">Final Year Income</td>
                <td className="text-right py-3 px-2">{fmt(finalYearIncome)}</td>
                <td className="text-right py-3 px-2">-</td>
              </tr>
              <tr className="border-b border-gray-200 bg-green-50">
                <td className="py-3 px-2 font-medium">Income Replacement Ratio</td>
                <td className="text-right py-3 px-2 font-semibold" colSpan="2">{incomeReplacement.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-6 text-xs text-gray-500 space-y-1">
        <p><strong>4% Rule:</strong> A guideline that suggests withdrawing 4% of your retirement portfolio annually, adjusted for inflation, for a 30-year retirement.</p>
        <p><strong>Income Replacement Ratio:</strong> The percentage of your final year income that can be replaced by safe withdrawal. Financial advisors typically recommend 70-90%.</p>
        <p><strong>Present Value:</strong> Today's dollar value accounting for inflation over time.</p>
      </div>
    </div>
  )
}

// Summary Card Component
function SummaryCard({ title, value, subtitle, highlight }) {
  const highlightClass = highlight === 'green' ? 'border-green-300 bg-green-50' :
                        highlight === 'blue' ? 'border-blue-300 bg-blue-50' :
                        highlight === 'yellow' ? 'border-yellow-300 bg-yellow-50' :
                        highlight === 'red' ? 'border-red-300 bg-red-50' :
                        'border-gray-200'

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${highlightClass}`}>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  )
}

export default RetirementTab
