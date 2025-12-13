import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function IncomeTab({ data }) {
  const { incomeProjections, incomeData, profile } = data
  const { summary, projections } = incomeProjections
  const [activeStream, setActiveStream] = useState('all')

  const yearsToRetirement = profile.yearsToRetirement || 30

  // Determine which summary to show
  const currentSummary = activeStream === 'all'
    ? summary
    : summary.perStreamSummaries?.find(s => s.streamId === activeStream) || summary

  // Prepare chart data
  const chartData = []
  for (let i = 0; i < projections.length; i += 12) {
    const year = Math.floor(i / 12) + 1
    const projection = projections[i]

    if (activeStream === 'all') {
      chartData.push({
        year,
        'Total Comp': projection.totalCompNominal,
        'Base Salary': projection.baseSalaryNominal,
        'Total Bonus': projection.totalBonusNominal
      })
    } else {
      const streamData = projection.streams?.find(s => s.streamId === activeStream)
      if (streamData) {
        chartData.push({
          year,
          'Total Comp': streamData.totalCompNominal,
          'Base Salary': streamData.baseSalaryNominal,
          'Total Bonus': streamData.totalBonusNominal
        })
      }
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveStream('all')}
          className={`px-4 py-2 font-medium transition border-b-2 ${activeStream === 'all'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
        >
          All Streams
        </button>
        {incomeData.incomeStreams.map(stream => (
          <button
            key={stream.id}
            onClick={() => setActiveStream(stream.id)}
            className={`px-4 py-2 font-medium transition border-b-2 ${activeStream === stream.id
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
          >
            {stream.name}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          title="Current Year Total Comp"
          value={`$${Math.round(currentSummary.currentYearCompNominal).toLocaleString()}`}
          subtitle={`PV: $${Math.round(currentSummary.currentYearCompPV).toLocaleString()}`}
        />
        <SummaryCard
          title="Year 10 Projected Comp"
          value={`$${Math.round(currentSummary.year10CompNominal).toLocaleString()}`}
          subtitle={`PV: $${Math.round(currentSummary.year10CompPV).toLocaleString()}`}
        />
        <SummaryCard
          title="Lifetime Earnings"
          value={`$${(currentSummary.lifetimeEarningsNominal / 1000000).toFixed(2)}M`}
          subtitle={`PV: $${(currentSummary.lifetimeEarningsPV / 1000000).toFixed(2)}M`}
        />
        <SummaryCard
          title="Average Annual Comp"
          value={`$${Math.round(currentSummary.avgAnnualCompNominal).toLocaleString()}`}
          subtitle={`Over ${yearsToRetirement} years`}
        />
      </div>

      {/* Line Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">
          Income Projections Over Time
        </h2>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                label={{ value: 'Annual Compensation', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(val) => `$${Math.round(val).toLocaleString()}`}
                labelFormatter={(year) => `Year ${year}`}
              />
              <Legend />
              <Line type="monotone" dataKey="Total Comp" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="Base Salary" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="Total Bonus" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
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

export default IncomeTab
