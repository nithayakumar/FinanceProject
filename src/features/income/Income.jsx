import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../../shared/storage'
import { validateIncome, calculateIncomeProjections } from './Income.calc'

function Income() {
  const navigate = useNavigate()
  const [view, setView] = useState('input')
  const [errors, setErrors] = useState({})

  // Load profile for retirement year
  const profile = storage.load('profile') || {}
  const yearsToRetirement = profile.retirementAge && profile.age
    ? profile.retirementAge - profile.age
    : 30  // Default to 30 if profile not set

  const [data, setData] = useState({
    incomeStreams: [
      {
        id: 'stream-1',
        name: 'Income Stream 1',
        annualIncome: '',
        company401k: '',
        equity: '',
        growthRate: '',
        endWorkYear: yearsToRetirement
      }
    ],
    incomeJumps: []
  })

  const [projections, setProjections] = useState(null)

  // Load saved data on mount
  useEffect(() => {
    const saved = storage.load('income')
    if (saved) {
      setData(saved)
      console.log('📋 Loaded saved income:', saved)
    }
  }, [])

  const handleStreamChange = (streamId, field, value) => {
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

  const handleJumpChange = (jumpId, field, value) => {
    setData(prev => ({
      ...prev,
      incomeJumps: prev.incomeJumps.map(jump =>
        jump.id === jumpId
          ? { ...jump, [field]: value }
          : jump
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
      equity: '',
      growthRate: '',
      endWorkYear: yearsToRetirement
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

  const addIncomeJump = () => {
    const newJump = {
      id: `jump-${Date.now()}`,
      year: '',
      jumpPercent: '',
      description: ''
    }

    setData(prev => ({
      ...prev,
      incomeJumps: [...prev.incomeJumps, newJump]
    }))
  }

  const removeIncomeJump = (jumpId) => {
    setData(prev => ({
      ...prev,
      incomeJumps: prev.incomeJumps.filter(j => j.id !== jumpId)
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
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2">Income</h1>
        <p className="text-gray-600 mb-8">Tell us about your income streams and expected growth</p>

        <div className="space-y-6">
          {/* Income Streams */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Income Streams</h2>
            <p className="text-sm text-gray-600 mb-4">Add up to 3 income streams</p>

            <div className="space-y-6">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Annual Income
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={stream.annualIncome}
                          onChange={(e) => handleStreamChange(stream.id, 'annualIncome', e.target.value ? Number(e.target.value) : '')}
                          placeholder="150000"
                          className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`${stream.id}-annualIncome`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors[`${stream.id}-annualIncome`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`${stream.id}-annualIncome`]}</p>
                      )}
                    </div>

                    {/* Company 401k */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company 401k Contribution
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={stream.company401k}
                          onChange={(e) => handleStreamChange(stream.id, 'company401k', e.target.value ? Number(e.target.value) : '')}
                          placeholder="10000"
                          className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`${stream.id}-company401k`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors[`${stream.id}-company401k`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`${stream.id}-company401k`]}</p>
                      )}
                    </div>

                    {/* Equity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Equity (RSU)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={stream.equity}
                          onChange={(e) => handleStreamChange(stream.id, 'equity', e.target.value ? Number(e.target.value) : '')}
                          placeholder="50000"
                          className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`${stream.id}-equity`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors[`${stream.id}-equity`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`${stream.id}-equity`]}</p>
                      )}
                    </div>

                    {/* Growth Rate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Annual Growth Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={stream.growthRate}
                        onChange={(e) => handleStreamChange(stream.id, 'growthRate', e.target.value ? Number(e.target.value) : '')}
                        placeholder="3.5"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors[`${stream.id}-growthRate`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors[`${stream.id}-growthRate`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`${stream.id}-growthRate`]}</p>
                      )}
                    </div>

                    {/* End Work Year */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Work Year (relative, max: {yearsToRetirement})
                      </label>
                      <input
                        type="number"
                        value={stream.endWorkYear}
                        onChange={(e) => handleStreamChange(stream.id, 'endWorkYear', e.target.value ? Number(e.target.value) : '')}
                        placeholder={yearsToRetirement.toString()}
                        max={yearsToRetirement}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors[`${stream.id}-endWorkYear`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors[`${stream.id}-endWorkYear`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`${stream.id}-endWorkYear`]}</p>
                      )}
                    </div>
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

          {/* Income Jumps */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Income Jumps</h2>
            <p className="text-sm text-gray-600 mb-4">Add expected promotions or raises (permanent increases)</p>

            <div className="space-y-4">
              {data.incomeJumps.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No income jumps added yet</p>
              ) : (
                data.incomeJumps.map((jump) => (
                  <div key={jump.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <input
                        type="text"
                        value={jump.description}
                        onChange={(e) => handleJumpChange(jump.id, 'description', e.target.value)}
                        className="font-medium border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
                        placeholder="e.g., Promotion to Senior"
                      />
                      <button
                        onClick={() => removeIncomeJump(jump.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Year */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Year (relative)
                        </label>
                        <input
                          type="number"
                          value={jump.year}
                          onChange={(e) => handleJumpChange(jump.id, 'year', e.target.value ? Number(e.target.value) : '')}
                          placeholder="5"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Jump Percent */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Jump Percent (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={jump.jumpPercent}
                          onChange={(e) => handleJumpChange(jump.id, 'jumpPercent', e.target.value ? Number(e.target.value) : '')}
                          placeholder="7"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}

              <button
                onClick={addIncomeJump}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 transition"
              >
                + Add Income Jump
              </button>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition"
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

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Current Year Total Comp"
          value={`$${summary.currentYearCompNominal.toLocaleString()}`}
          subtitle={`PV: $${summary.currentYearCompPV.toLocaleString()}`}
          highlight
        />
        <SummaryCard
          title="Year 10 Projected Comp"
          value={`$${summary.year10CompNominal.toLocaleString()}`}
          subtitle={`PV: $${summary.year10CompPV.toLocaleString()}`}
        />
        <SummaryCard
          title="Lifetime Earnings"
          subtext={`${yearsToRetirement} years to retirement`}
          value={`$${(summary.lifetimeEarningsNominal / 1000000).toFixed(2)}M`}
          subtitle={`PV: $${(summary.lifetimeEarningsPV / 1000000).toFixed(2)}M`}
          highlight
        />
        <SummaryCard
          title="Average Annual Growth"
          value={`${summary.averageAnnualGrowth.toFixed(1)}%`}
        />
      </div>

      {/* Component Breakdown */}
      <h2 className="text-xl font-semibold mb-4">Lifetime Breakdown by Component</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ComponentCard
          title="Salary"
          nominal={summary.totalSalaryNominal}
          pv={summary.totalSalaryPV}
        />
        <ComponentCard
          title="Equity (RSU)"
          nominal={summary.totalEquityNominal}
          pv={summary.totalEquityPV}
        />
        <ComponentCard
          title="401k Contributions"
          nominal={summary.total401kNominal}
          pv={summary.total401kPV}
        />
      </div>

      {/* Key Milestones */}
      {summary.milestones && summary.milestones.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Key Milestones</h2>
          <div className="space-y-2">
            {summary.milestones.map((milestone, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                <span className="font-medium text-gray-700">{milestone.label}</span>
                <span className="text-gray-900">
                  ${milestone.compNominal.toLocaleString()}/year
                  <span className="text-gray-500 text-sm ml-2">
                    (PV: ${milestone.compPV.toLocaleString()})
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
