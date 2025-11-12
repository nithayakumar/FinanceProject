import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function ExpensesTab({ data }) {
  const { expenseProjections, profile } = data
  const { summary, projections } = expenseProjections

  const yearsToRetirement = profile.yearsToRetirement || 30

  // Prepare chart data - one data point per year
  const chartData = []
  for (let i = 0; i < projections.length; i += 12) {
    const year = Math.floor(i / 12) + 1
    const projection = projections[i]

    const dataPoint = {
      year,
      'Total Expenses': projection.totalExpensesNominal
    }

    // Add categories
    projection.categories?.forEach(cat => {
      dataPoint[cat.name] = cat.totalNominal
    })

    chartData.push(dataPoint)
  }

  // Get category names for the legend
  const categoryNames = projections[0]?.categories?.map(c => c.name) || []

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          title="Current Year Expenses"
          value={`$${Math.round(summary.currentYearExpensesNominal).toLocaleString()}`}
          subtitle={`PV: $${Math.round(summary.currentYearExpensesPV).toLocaleString()}`}
        />
        <SummaryCard
          title="Year 10 Expenses"
          value={`$${Math.round(summary.year10ExpensesNominal).toLocaleString()}`}
          subtitle={`PV: $${Math.round(summary.year10ExpensesPV).toLocaleString()}`}
        />
        <SummaryCard
          title="Lifetime Expenses"
          value={`$${(summary.lifetimeExpensesNominal / 1000000).toFixed(2)}M`}
          subtitle={`PV: $${(summary.lifetimeExpensesPV / 1000000).toFixed(2)}M`}
        />
        <SummaryCard
          title="Average Annual Expenses"
          value={`$${Math.round(summary.avgAnnualExpensesNominal).toLocaleString()}`}
          subtitle={`Over ${yearsToRetirement} years`}
        />
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Expense Projections by Category
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="year"
              label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
              label={{ value: 'Monthly Expenses', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(val) => `$${Math.round(val).toLocaleString()}`}
              labelFormatter={(year) => `Year ${year}`}
            />
            <Legend />
            {categoryNames.map((name, index) => {
              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899']
              return (
                <Bar
                  key={name}
                  dataKey={name}
                  stackId="a"
                  fill={colors[index % colors.length]}
                />
              )
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Category Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-2 font-semibold">Category</th>
                <th className="text-right py-3 px-2 font-semibold">Current Year</th>
                <th className="text-right py-3 px-2 font-semibold">Year 10</th>
                <th className="text-right py-3 px-2 font-semibold">Lifetime Total</th>
                <th className="text-right py-3 px-2 font-semibold">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {summary.perCategorySummaries?.map((cat) => (
                <tr key={cat.categoryName} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{cat.categoryName}</td>
                  <td className="text-right py-3 px-2">
                    ${Math.round(cat.currentYearExpensesNominal).toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-2">
                    ${Math.round(cat.year10ExpensesNominal).toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-2">
                    ${Math.round(cat.lifetimeExpensesNominal).toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-2">
                    {((cat.lifetimeExpensesNominal / summary.lifetimeExpensesNominal) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr className="font-semibold border-t-2 border-gray-300">
                <td className="py-3 px-2">Total</td>
                <td className="text-right py-3 px-2">
                  ${Math.round(summary.currentYearExpensesNominal).toLocaleString()}
                </td>
                <td className="text-right py-3 px-2">
                  ${Math.round(summary.year10ExpensesNominal).toLocaleString()}
                </td>
                <td className="text-right py-3 px-2">
                  ${Math.round(summary.lifetimeExpensesNominal).toLocaleString()}
                </td>
                <td className="text-right py-3 px-2">100.0%</td>
              </tr>
            </tbody>
          </table>
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

export default ExpensesTab
