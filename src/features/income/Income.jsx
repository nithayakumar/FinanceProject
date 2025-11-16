import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../../shared/storage'
import { validateIncome, calculateIncomeProjections } from './Income.calc'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function Income() {
  const navigate = useNavigate()
  const [view, setView] = useState('input')
  const [errors, setErrors] = useState({})
  const [isSaved, setIsSaved] = useState(false)

  // Load profile for retirement year and inflation rate
  const profile = storage.load('profile') || {}
  const yearsToRetirement = profile.retirementAge && profile.age
    ? profile.retirementAge - profile.age
    : 30  // Default to 30 if profile not set
  const inflationRate = profile.inflationRate !== undefined ? profile.inflationRate : 2.7

  const [data, setData] = useState({
    incomeStreams: [
      {
        id: 'stream-1',
        name: 'Income Stream 1',
        annualIncome: '',
        company401k: '',
        individual401k: '',
        equity: '',
        growthRate: inflationRate,  // Default to inflation rate
        endWorkYear: yearsToRetirement,
        jumps: []
      }
    ]
  })

  const [projections, setProjections] = useState(null)
  const [activeTab, setActiveTab] = useState('all')

  // Load saved data on mount
  useEffect(() => {
    const saved = storage.load('income')
    if (saved) {
      setData(saved)
      setIsSaved(saved.incomeStreams && saved.incomeStreams.length > 0)
      console.log('📋 Loaded saved income:', saved)
    }
  }, [])

  const handleStreamChange = (streamId, field, value) => {
    setIsSaved(false)
    setData(prev => ({
      ...prev,
      incomeStreams: prev.incomeStreams.map(stream =>
        stream.id === streamId
          ? { ...stream, [field]: value }
          : stream
      )
    }))

    // Clear errors for this field
    if (errors[`${streamId}-${field}`]) {
      setErrors(prev => ({ ...prev, [`${streamId}-${field}`]: '' }))
    }
  }

  const handleJumpChange = (streamId, jumpId, field, value) => {
    setData(prev => ({
      ...prev,
      incomeStreams: prev.incomeStreams.map(stream =>
        stream.id === streamId
          ? {
              ...stream,
              jumps: stream.jumps.map(jump =>
                jump.id === jumpId
                  ? { ...jump, [field]: value }
                  : jump
              )
            }
          : stream
      )
    }))
  }

  const addIncomeStream = () => {
    if (data.incomeStreams.length >= 3) return

    const newStream = {
      id: `stream-${Date.now()}`,
      name: `Income Stream ${data.incomeStreams.length + 1}`,
      annualIncome: '',
      company401k: '',
      individual401k: '',
      equity: '',
      growthRate: inflationRate,  // Default to inflation rate
      endWorkYear: yearsToRetirement,
      jumps: []
    }

    setData(prev => ({
      ...prev,
      incomeStreams: [...prev.incomeStreams, newStream]
    }))
  }

  const removeIncomeStream = (streamId) => {
    if (data.incomeStreams.length <= 1) return  // Keep at least one

    setData(prev => ({
      ...prev,
      incomeStreams: prev.incomeStreams.filter(s => s.id !== streamId)
    }))
  }

  const addIncomeJump = (streamId) => {
    const newJump = {
      id: `jump-${Date.now()}`,
      year: '',
      jumpPercent: '',
      description: ''
    }

    setData(prev => ({
      ...prev,
      incomeStreams: prev.incomeStreams.map(stream =>
        stream.id === streamId
          ? { ...stream, jumps: [...stream.jumps, newJump] }
          : stream
      )
    }))
  }

  const removeIncomeJump = (streamId, jumpId) => {
    setData(prev => ({
      ...prev,
      incomeStreams: prev.incomeStreams.map(stream =>
        stream.id === streamId
          ? { ...stream, jumps: stream.jumps.filter(j => j.id !== jumpId) }
          : stream
      )
    }))
  }

  const handleContinue = () => {
    console.group('💾 Saving Income')
    console.log('Data:', data)

    // Validate
    const validationErrors = validateIncome(data, yearsToRetirement)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      console.error('Validation errors:', validationErrors)
      console.groupEnd()
      return
    }

    // Save to localStorage
    storage.save('income', data)
    setIsSaved(true)

    // Calculate projections
    console.log('📊 Calculating income projections...')
    const calculated = calculateIncomeProjections(data, profile)
    setProjections(calculated)
    console.log('Projections calculated:', calculated.summary)

    // Switch to output view
    setView('output')
    console.log('✅ Saved and switched to output view')
    console.groupEnd()
  }

  const handleEdit = () => {
    setView('input')
  }

  const handleNextFeature = () => {
    navigate('/expenses')
  }

  // Input View
  if (view === 'input') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-1">Income</h1>

        {/* Save Status Banner - Compact */}
        {isSaved ? (
          <div className="mb-4 bg-green-50 border border-green-200 rounded px-3 py-2 flex items-center text-sm">
            <span className="text-green-600 mr-2">✅</span>
            <span className="text-green-900 font-medium">Saved</span>
          </div>
        ) : (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 flex items-center text-sm">
            <span className="text-yellow-600 mr-2">⚠️</span>
            <span className="text-yellow-900 font-medium">Not saved</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Income Streams */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold mb-2">Income Streams</h2>
            <p className="text-xs text-gray-600 mb-3">Add up to 3 income streams</p>

            <div className="space-y-4">
              {data.incomeStreams.map((stream, index) => (
                <div key={stream.id} className="border border-gray-200 rounded-lg p-4 relative">
                  <div className="flex justify-between items-start mb-4">
                    <input
                      type="text"
                      value={stream.name}
                      onChange={(e) => handleStreamChange(stream.id, 'name', e.target.value)}
                      className="text-lg font-medium border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
                      placeholder="Stream name"
                    />
                    {data.incomeStreams.length > 1 && (
                      <button
                        onClick={() => removeIncomeStream(stream.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Annual Income */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Annual Income
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1.5 text-gray-500">$</span>
                        <input
                          type="number"
                          value={stream.annualIncome}
                          onChange={(e) => handleStreamChange(stream.id, 'annualIncome', e.target.value ? Number(e.target.value) : '')}
                          placeholder="150000"
                          className={`w-full pl-8 pr-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`${stream.id}-annualIncome`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors[`${stream.id}-annualIncome`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`${stream.id}-annualIncome`]}</p>
                      )}
                    </div>

                    {/* Company 401k */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company 401k Match
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1.5 text-gray-500">$</span>
                        <input
                          type="number"
                          value={stream.company401k}
                          onChange={(e) => handleStreamChange(stream.id, 'company401k', e.target.value ? Number(e.target.value) : '')}
                          placeholder="10000"
                          className={`w-full pl-8 pr-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`${stream.id}-company401k`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors[`${stream.id}-company401k`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`${stream.id}-company401k`]}</p>
                      )}
                    </div>

                    {/* Individual 401k Contribution Goal */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        401k Contribution Goal
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1.5 text-gray-500">$</span>
                        <input
                          type="number"
                          value={stream.individual401k}
                          onChange={(e) => handleStreamChange(stream.id, 'individual401k', e.target.value ? Number(e.target.value) : '')}
                          placeholder="23000"
                          className={`w-full pl-8 pr-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`${stream.id}-individual401k`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors[`${stream.id}-individual401k`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`${stream.id}-individual401k`]}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">Reduces taxable income</p>
                    </div>

                    {/* Equity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Equity (RSU)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1.5 text-gray-500">$</span>
                        <input
                          type="number"
                          value={stream.equity}
                          onChange={(e) => handleStreamChange(stream.id, 'equity', e.target.value ? Number(e.target.value) : '')}
                          placeholder="50000"
                          className={`w-full pl-8 pr-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`${stream.id}-equity`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors[`${stream.id}-equity`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`${stream.id}-equity`]}</p>
                      )}
                    </div>

                    {/* Growth Rate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Annual Growth Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={stream.growthRate}
                        onChange={(e) => handleStreamChange(stream.id, 'growthRate', e.target.value ? Number(e.target.value) : '')}
                        placeholder="3.5"
                        className={`w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors[`${stream.id}-growthRate`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors[`${stream.id}-growthRate`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`${stream.id}-growthRate`]}</p>
                      )}
                    </div>

                    {/* End Work Year */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Work Year (relative, max: {yearsToRetirement})
                      </label>
                      <input
                        type="number"
                        value={stream.endWorkYear}
                        onChange={(e) => handleStreamChange(stream.id, 'endWorkYear', e.target.value ? Number(e.target.value) : '')}
                        placeholder={yearsToRetirement.toString()}
                        max={yearsToRetirement}
                        className={`w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors[`${stream.id}-endWorkYear`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors[`${stream.id}-endWorkYear`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`${stream.id}-endWorkYear`]}</p>
                      )}
                    </div>
                  </div>

                  {/* Income Jumps for this stream */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-semibold text-gray-700">Income Jumps</h3>
                      <button
                        onClick={() => addIncomeJump(stream.id)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        + Add Jump
                      </button>
                    </div>

                    {stream.jumps && stream.jumps.length > 0 ? (
                      <div className="space-y-2">
                        {stream.jumps.map((jump) => (
                          <div key={jump.id} className="bg-gray-50 rounded p-2">
                            <div className="flex justify-between items-start mb-1">
                              <input
                                type="text"
                                value={jump.description}
                                onChange={(e) => handleJumpChange(stream.id, jump.id, 'description', e.target.value)}
                                className="text-xs font-medium bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                                placeholder="e.g., Promotion"
                              />
                              <button
                                onClick={() => removeIncomeJump(stream.id, jump.id)}
                                className="text-red-600 hover:text-red-700 text-xs"
                              >
                                Remove
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Year</label>
                                <input
                                  type="number"
                                  value={jump.year}
                                  onChange={(e) => handleJumpChange(stream.id, jump.id, 'year', e.target.value ? Number(e.target.value) : '')}
                                  placeholder="5"
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Jump %</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={jump.jumpPercent}
                                  onChange={(e) => handleJumpChange(stream.id, jump.id, 'jumpPercent', e.target.value ? Number(e.target.value) : '')}
                                  placeholder="7"
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No jumps added yet</p>
                    )}
                  </div>
                </div>
              ))}

              {data.incomeStreams.length < 3 && (
                <button
                  onClick={addIncomeStream}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 transition"
                >
                  + Add Income Stream
                </button>
              )}
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="w-full bg-blue-600 text-white py-2.5 rounded-md font-medium hover:bg-blue-700 transition"
          >
            Calculate Income Projections →
          </button>
        </div>
      </div>
    )
  }

  // Output View
  if (!projections) {
    return <div className="p-8">Loading projections...</div>
  }

  const { summary } = projections

  // Determine which summary to show based on active tab
  const currentSummary = activeTab === 'all'
    ? summary
    : summary.perStreamSummaries?.find(s => s.streamId === activeTab) || summary

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Income Summary</h1>
          <p className="text-gray-600">Your projected income over {yearsToRetirement} years</p>
        </div>
        <button
          onClick={handleEdit}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
        >
          Edit
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 font-medium transition border-b-2 ${
            activeTab === 'all'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          All Streams
        </button>
        {data.incomeStreams.map(stream => (
          <button
            key={stream.id}
            onClick={() => setActiveTab(stream.id)}
            className={`px-4 py-2 font-medium transition border-b-2 ${
              activeTab === stream.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {stream.name}
          </button>
        ))}
      </div>

      {/* Primary Metrics */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${activeTab === 'all' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4 mb-6`}>
        <SummaryCard
          title="Current Year Total Comp"
          value={`$${Math.round(currentSummary.currentYearCompNominal).toLocaleString()}`}
          subtitle={`PV: $${Math.round(currentSummary.currentYearCompPV).toLocaleString()}`}
          highlight
        />
        <SummaryCard
          title="Year 10 Projected Comp"
          value={`$${Math.round(currentSummary.year10CompNominal).toLocaleString()}`}
          subtitle={`PV: $${Math.round(currentSummary.year10CompPV).toLocaleString()}`}
        />
        <SummaryCard
          title="Lifetime Earnings"
          subtext={`${yearsToRetirement} years to retirement`}
          value={`$${(currentSummary.lifetimeEarningsNominal / 1000000).toFixed(2)}M`}
          subtitle={`PV: $${(currentSummary.lifetimeEarningsPV / 1000000).toFixed(2)}M`}
          highlight
        />
        {activeTab === 'all' && (
          <SummaryCard
            title="Average Annual Growth"
            value={`${summary.averageAnnualGrowth.toFixed(1)}%`}
          />
        )}
      </div>

      {/* Income Projection Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Income Projection (Present Value)</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={projections.chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="year"
              label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              label={{ value: 'Annual Income (PV)', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => `$${Math.round(value).toLocaleString()}`}
              labelFormatter={(label) => `Year ${label}`}
            />
            <Legend />
            {activeTab === 'all' ? (
              // Show all streams as stacks
              data.incomeStreams.map((stream, index) => {
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                return (
                  <Bar
                    key={stream.id}
                    dataKey={stream.name}
                    stackId="a"
                    fill={colors[index % colors.length]}
                  />
                )
              })
            ) : (
              // Show only the selected stream
              (() => {
                const selectedStream = data.incomeStreams.find(s => s.id === activeTab)
                return selectedStream ? (
                  <Bar
                    dataKey={selectedStream.name}
                    fill="#3b82f6"
                  />
                ) : null
              })()
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Component Breakdown */}
      <h2 className="text-xl font-semibold mb-4">Lifetime Breakdown by Component</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ComponentCard
          title="Salary"
          nominal={currentSummary.totalSalaryNominal}
          pv={currentSummary.totalSalaryPV}
        />
        <ComponentCard
          title="Equity (RSU)"
          nominal={currentSummary.totalEquityNominal}
          pv={currentSummary.totalEquityPV}
        />
        <ComponentCard
          title="401k Contributions"
          nominal={currentSummary.total401kNominal}
          pv={currentSummary.total401kPV}
        />
      </div>

      {/* Key Milestones */}
      {(() => {
        // Filter milestones based on active tab
        const filteredMilestones = activeTab === 'all'
          ? summary.milestones
          : summary.milestones?.filter(m => {
              const stream = data.incomeStreams.find(s => s.id === activeTab)
              return m.label.includes(stream?.name || '')
            })

        return filteredMilestones && filteredMilestones.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Key Milestones</h2>
            <div className="space-y-4">
              {filteredMilestones.map((milestone, index) => (
                <div key={index} className="py-3 border-b last:border-b-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700">{milestone.label}</span>
                    <span className="text-gray-900 font-semibold">
                      ${Math.round(milestone.compNominal).toLocaleString()}/year
                      <span className="text-gray-500 text-sm ml-2 font-normal">
                        (PV: ${Math.round(milestone.compPV).toLocaleString()})
                      </span>
                    </span>
                  </div>
                  {milestone.streamBreakdown && milestone.streamBreakdown.length > 0 && (
                    <div className="ml-4 mt-2 space-y-1">
                      {milestone.streamBreakdown.map((stream, streamIndex) => (
                        <div key={streamIndex} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">↳ {stream.streamName}</span>
                          <span className="text-gray-700">
                            ${Math.round(stream.compNominal).toLocaleString()}/year
                            <span className="text-gray-500 text-xs ml-2">
                              (PV: ${Math.round(stream.compPV).toLocaleString()})
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      <button
        onClick={handleNextFeature}
        className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition"
      >
        Continue to Expenses →
      </button>
    </div>
  )
}

function SummaryCard({ title, subtext, value, subtitle, highlight }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${highlight ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}>
      <div className="text-sm font-medium text-gray-600 mb-1">{title}</div>
      {subtext && <div className="text-xs text-gray-500 mb-2">{subtext}</div>}
      <div className={`text-2xl font-bold ${highlight ? 'text-blue-600' : 'text-gray-900'}`}>
        {value}
      </div>
      {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
    </div>
  )
}

function ComponentCard({ title, nominal, pv }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="text-sm font-medium text-gray-600 mb-2">{title}</div>
      <div className="text-xl font-bold text-gray-900">
        ${(nominal / 1000000).toFixed(2)}M
      </div>
      <div className="text-sm text-gray-500 mt-1">
        PV: ${(pv / 1000000).toFixed(2)}M
      </div>
    </div>
  )
}

export default Income
