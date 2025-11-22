import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../../core'
import { validateIncome, calculateIncomeProjections } from './Income.calc'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { INCOME_CONFIG, createDefaultIncomeStream } from '../../core'
import SplitLayout from '../../shared/components/SplitLayout'

function Income() {
  const navigate = useNavigate()
  const [errors, setErrors] = useState({})
  const [expandedStreams, setExpandedStreams] = useState({}) // Track expanded state for advanced options per stream

  // Load profile for retirement year and inflation rate
  const profile = storage.load('profile') || {}
  const yearsToRetirement = profile.retirementAge && profile.age
    ? profile.retirementAge - profile.age
    : 30
  const inflationRate = profile.inflationRate !== undefined ? profile.inflationRate : 2.7

  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState('PV') // 'PV' or 'Nominal'



  // Initialize state directly from storage to avoid race conditions
  const [data, setData] = useState(() => {
    const saved = storage.load('income')
    if (saved) {
      // Sanitize saved data
      if (saved.incomeStreams) {
        saved.incomeStreams = saved.incomeStreams.map(stream => {
          // Default isEndYearLinked to true for existing streams (migration)
          if (stream.isEndYearLinked === undefined) {
            stream.isEndYearLinked = true
          }

          // Fix invalid endWorkYear
          if (!stream.endWorkYear || stream.endWorkYear < 0) {
            stream.endWorkYear = yearsToRetirement > 0 ? yearsToRetirement : 30
            stream.isEndYearLinked = true
          }
          return stream
        })
      }
      return saved
    }
    return {
      incomeStreams: [
        createDefaultIncomeStream(1, yearsToRetirement, INCOME_CONFIG.DEFAULT_GROWTH_RATE)
      ]
    }
  })

  // Sync endWorkYear with yearsToRetirement if linked
  useEffect(() => {
    setData(prev => ({
      ...prev,
      incomeStreams: prev.incomeStreams.map(stream => {
        if (stream.isEndYearLinked && stream.endWorkYear !== yearsToRetirement) {
          return { ...stream, endWorkYear: yearsToRetirement }
        }
        return stream
      })
    }))
  }, [yearsToRetirement])

  // Auto-save effect
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    // Save to localStorage
    storage.save('income', data)
  }, [data])

  // Calculate projections in real-time
  const projections = useMemo(() => {
    return calculateIncomeProjections(data, profile)
  }, [data, profile])

  const toggleAdvanced = (streamId) => {
    setExpandedStreams(prev => ({
      ...prev,
      [streamId]: !prev[streamId]
    }))
  }

  const handleStreamChange = (streamId, field, fieldValue) => {
    setData(prev => ({
      ...prev,
      incomeStreams: prev.incomeStreams.map(stream => {
        if (stream.id !== streamId) return stream

        const updates = { [field]: fieldValue }

        // If user manually updates endWorkYear, unlink it
        if (field === 'endWorkYear') {
          updates.isEndYearLinked = false
        }

        return { ...stream, ...updates }
      })
    }))

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
    if (data.incomeStreams.length >= INCOME_CONFIG.MAX_STREAMS) return

    const newStream = createDefaultIncomeStream(
      data.incomeStreams.length + 1,
      yearsToRetirement,
      INCOME_CONFIG.DEFAULT_GROWTH_RATE
    )

    // Collapse all other streams to focus on the new one (which will be at the bottom)
    setExpandedStreams({})

    setData(prev => ({
      ...prev,
      incomeStreams: [...prev.incomeStreams, newStream]
    }))
  }

  const removeIncomeStream = (streamId) => {
    if (data.incomeStreams.length <= INCOME_CONFIG.MIN_STREAMS) return

    setData(prev => ({
      ...prev,
      incomeStreams: prev.incomeStreams.filter(s => s.id !== streamId)
    }))
  }

  const JUMP_DESCRIPTIONS = ["Promotion 🚀", "Lateral Move ↔️", "New Job 💼", "Performance Bonus 🌟", "Market Adjustment 📈"]
  const BREAK_DESCRIPTIONS = ["Sabbatical 🏝️", "Parental Leave 👶", "Study Leave 📚", "Travel ✈️", "Personal Time 🧘"]

  const addIncomeJump = (streamId) => {
    const desc = JUMP_DESCRIPTIONS[Math.floor(Math.random() * JUMP_DESCRIPTIONS.length)]

    const newJump = {
      id: `jump-${Date.now()}`,
      year: '',
      jumpPercent: '',
      description: desc
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

  // Career Break Management Functions
  const addCareerBreak = (streamId) => {
    const newBreak = {
      id: `break-${Date.now()}`,
      startYear: '',
      durationMonths: '',
      reductionPercent: 100,
      description: BREAK_DESCRIPTIONS[Math.floor(Math.random() * BREAK_DESCRIPTIONS.length)]
    }

    setData(prev => ({
      ...prev,
      incomeStreams: prev.incomeStreams.map(stream =>
        stream.id === streamId
          ? { ...stream, careerBreaks: [...(stream.careerBreaks || []), newBreak] }
          : stream
      )
    }))
  }

  const handleCareerBreakChange = (streamId, breakId, field, value) => {
    setData(prev => ({
      ...prev,
      incomeStreams: prev.incomeStreams.map(stream =>
        stream.id === streamId
          ? {
            ...stream,
            careerBreaks: (stream.careerBreaks || []).map(breakItem =>
              breakItem.id === breakId
                ? { ...breakItem, [field]: value }
                : breakItem
            )
          }
          : stream
      )
    }))
  }

  const removeCareerBreak = (streamId, breakId) => {
    setData(prev => ({
      ...prev,
      incomeStreams: prev.incomeStreams.map(stream =>
        stream.id === streamId
          ? {
            ...stream,
            careerBreaks: (stream.careerBreaks || []).filter(b => b.id !== breakId)
          }
          : stream
      )
    }))
  }

  const handleNextFeature = () => {
    navigate('/expenses')
  }

  const InputSection = (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Income 💰</h1>
        {data.incomeStreams.length < INCOME_CONFIG.MAX_STREAMS && (
          <button
            onClick={addIncomeStream}
            className="bg-black text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition shadow-sm flex items-center"
          >
            <span className="mr-1">+</span> Add Income Source
          </button>
        )}
      </div>

      <div className="space-y-6">
        {data.incomeStreams.map((stream, index) => (
          <div key={stream.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1 mr-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Stream Name</label>
                <input
                  type="text"
                  value={stream.name}
                  onChange={(e) => handleStreamChange(stream.id, 'name', e.target.value)}
                  className="text-xl font-semibold text-gray-900 bg-transparent border-none p-0 focus:ring-0 placeholder-gray-300 w-full"
                  placeholder="e.g. Primary Job"
                />
              </div>
              {data.incomeStreams.length > 1 && (
                <button
                  onClick={() => removeIncomeStream(stream.id)}
                  className="text-gray-400 hover:text-red-500 transition p-1"
                  title="Remove Stream"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Annual Income */}
              <div className="bg-gray-50 rounded-xl p-3 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-colors">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Annual Income 💵
                </label>
                <div className="relative">
                  <span className="absolute left-0 top-0.5 text-gray-400 font-medium">$</span>
                  <input
                    type="number"
                    value={stream.annualIncome}
                    onChange={(e) => handleStreamChange(stream.id, 'annualIncome', e.target.value ? Number(e.target.value) : '')}
                    placeholder="150000"
                    className="w-full pl-4 bg-transparent border-none p-0 text-lg font-semibold text-gray-900 focus:ring-0 placeholder-gray-300"
                  />
                </div>
              </div>

              {/* Pre-Tax Retirement */}
              <div className="bg-gray-50 rounded-xl p-3 border border-transparent focus-within:border-blue-500 focus-within:bg-white transition-colors">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Pre-Tax Retirement (401k) 🏦
                </label>
                <div className="relative">
                  <span className="absolute left-0 top-0.5 text-gray-400 font-medium">$</span>
                  <input
                    type="number"
                    value={stream.individual401k}
                    onChange={(e) => handleStreamChange(stream.id, 'individual401k', e.target.value ? Number(e.target.value) : '')}
                    placeholder="23000"
                    className="w-full pl-4 bg-transparent border-none p-0 text-lg font-semibold text-gray-900 focus:ring-0 placeholder-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Advanced Section */}
            <div>
              <button
                onClick={() => toggleAdvanced(stream.id)}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900 font-medium group"
              >
                <div className={`mr-2 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-gray-200 transition ${expandedStreams[stream.id] ? 'rotate-90' : ''}`}>
                  ▶
                </div>
                More detail (Growth, Equity, Jumps & Breaks)
              </button>

              {expandedStreams[stream.id] && (
                <div className="mt-4 pl-2 space-y-6 animate-fadeIn">
                  {/* Growth & Equity Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Growth Rate 📈</label>
                      <div className="flex items-center">
                        <input
                          type="number"
                          step="0.1"
                          value={stream.growthRate}
                          onChange={(e) => handleStreamChange(stream.id, 'growthRate', e.target.value ? Number(e.target.value) : '')}
                          className="w-full bg-transparent border-none p-0 text-gray-900 font-medium focus:ring-0"
                        />
                        <span className="text-gray-400 text-sm ml-1">%</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                        Equity (RSU) 📜
                        <span title="Treated like cash" className="cursor-help text-gray-400 hover:text-gray-600">ⓘ</span>
                      </label>
                      <div className="flex items-center">
                        <span className="text-gray-400 text-sm mr-1">$</span>
                        <input
                          type="number"
                          value={stream.equity}
                          onChange={(e) => handleStreamChange(stream.id, 'equity', e.target.value ? Number(e.target.value) : '')}
                          className="w-full bg-transparent border-none p-0 text-gray-900 font-medium focus:ring-0"
                        />
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                        401k Match 🤝
                        <span title="Employer contributions to your retirement" className="cursor-help text-gray-400 hover:text-gray-600">ⓘ</span>
                      </label>
                      <div className="flex items-center">
                        <span className="text-gray-400 text-sm mr-1">$</span>
                        <input
                          type="number"
                          value={stream.company401k}
                          onChange={(e) => handleStreamChange(stream.id, 'company401k', e.target.value ? Number(e.target.value) : '')}
                          className="w-full bg-transparent border-none p-0 text-gray-900 font-medium focus:ring-0"
                        />
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">End Work Year 🏁</label>
                      <input
                        type="number"
                        value={stream.endWorkYear}
                        onChange={(e) => handleStreamChange(stream.id, 'endWorkYear', e.target.value ? Number(e.target.value) : '')}
                        placeholder={yearsToRetirement.toString()}
                        className="w-full bg-transparent border-none p-0 text-gray-900 font-medium focus:ring-0"
                      />
                    </div>
                  </div>

                  {/* Income Jumps Section */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                        Income Jumps 🚀 <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Future changes</span>
                      </h3>
                      <button onClick={() => addIncomeJump(stream.id)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-medium transition">
                        + Add Jump
                      </button>
                    </div>
                    <div className="space-y-2">
                      {stream.jumps?.map((jump) => {

                        return (
                          <div key={jump.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg group hover:bg-gray-100 transition">
                            <input
                              type="text"
                              value={jump.description}
                              onChange={(e) => handleJumpChange(stream.id, jump.id, 'description', e.target.value)}
                              className="flex-1 bg-transparent border-none text-sm text-gray-900 focus:ring-0 p-0"
                              placeholder="Description"
                            />
                            <div className="flex items-center bg-white rounded px-2 py-1 shadow-sm">
                              <span className="text-xs text-gray-400 mr-1">Yr</span>
                              <input
                                type="number"
                                value={jump.year}
                                onChange={(e) => handleJumpChange(stream.id, jump.id, 'year', e.target.value ? Number(e.target.value) : '')}
                                className="w-12 text-xs text-right border-none p-0 focus:ring-0"
                                placeholder="5"
                              />
                            </div>
                            <div className="flex items-center bg-white rounded px-2 py-1 shadow-sm">
                              <input
                                type="number"
                                value={jump.jumpPercent}
                                onChange={(e) => handleJumpChange(stream.id, jump.id, 'jumpPercent', e.target.value ? Number(e.target.value) : '')}
                                className="w-10 text-xs text-right border-none p-0 focus:ring-0"
                                placeholder="10"
                              />
                              <span className="text-xs text-gray-400 ml-1">%</span>
                            </div>
                            <button onClick={() => removeIncomeJump(stream.id, jump.id)} className="text-gray-400 hover:text-red-500 px-1 opacity-0 group-hover:opacity-100 transition">×</button>
                          </div>
                        )
                      })}
                      {(!stream.jumps || stream.jumps.length === 0) && (
                        <div className="text-xs text-gray-400 italic pl-2">No future income jumps added.</div>
                      )}
                    </div>
                  </div>

                  {/* Career Breaks Section */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                        Career Breaks ⏸️ <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Gaps in income</span>
                      </h3>
                      <button onClick={() => addCareerBreak(stream.id)} className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded hover:bg-orange-100 font-medium transition">
                        + Add Break
                      </button>
                    </div>
                    <div className="space-y-2">
                      {stream.careerBreaks?.map((breakItem) => (
                        <div key={breakItem.id} className="flex flex-col gap-2 bg-orange-50/50 p-3 rounded-lg group hover:bg-orange-50 transition border border-orange-100/50">
                          <div className="flex justify-between items-center">
                            <input
                              type="text"
                              value={breakItem.description}
                              onChange={(e) => handleCareerBreakChange(stream.id, breakItem.id, 'description', e.target.value)}
                              className="bg-transparent border-none text-sm text-gray-900 focus:ring-0 p-0 font-medium w-full"
                              placeholder="Description"
                            />
                            <button onClick={() => removeCareerBreak(stream.id, breakItem.id)} className="text-gray-400 hover:text-red-500 px-1 opacity-0 group-hover:opacity-100 transition">×</button>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 flex items-center bg-white rounded px-2 py-1 shadow-sm">
                              <span className="text-xs text-gray-400 mr-1">Start Yr</span>
                              <input
                                type="number"
                                value={breakItem.startYear}
                                onChange={(e) => handleCareerBreakChange(stream.id, breakItem.id, 'startYear', e.target.value ? Number(e.target.value) : '')}
                                className="w-full text-xs text-right border-none p-0 focus:ring-0"
                              />
                            </div>
                            <div className="flex-1 flex items-center bg-white rounded px-2 py-1 shadow-sm">
                              <span className="text-xs text-gray-400 mr-1">Months</span>
                              <input
                                type="number"
                                value={breakItem.durationMonths}
                                onChange={(e) => handleCareerBreakChange(stream.id, breakItem.id, 'durationMonths', e.target.value ? Number(e.target.value) : '')}
                                className="w-full text-xs text-right border-none p-0 focus:ring-0"
                              />
                            </div>
                            <div className="flex-1 flex items-center bg-white rounded px-2 py-1 shadow-sm">
                              <span className="text-xs text-gray-400 mr-1">Pay %</span>
                              <input
                                type="number"
                                value={breakItem.reductionPercent}
                                onChange={(e) => handleCareerBreakChange(stream.id, breakItem.id, 'reductionPercent', e.target.value ? Number(e.target.value) : '')}
                                className="w-full text-xs text-right border-none p-0 focus:ring-0"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!stream.careerBreaks || stream.careerBreaks.length === 0) && (
                        <div className="text-xs text-gray-400 italic pl-2">No career breaks added.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const { summary } = projections
  const currentSummary = activeTab === 'all'
    ? summary
    : summary.perStreamSummaries?.find(s => s.streamId === activeTab) || summary

  const OutputSection = (
    <div className="h-full flex flex-col">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Income Summary</h2>
          {/* View Mode Toggle */}
          <div className="bg-gray-100 p-1 rounded-lg flex text-xs font-medium">
            <button
              onClick={() => setViewMode('PV')}
              className={`px-3 py-1.5 rounded-md transition ${viewMode === 'PV' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Today's Dollars
            </button>
            <button
              onClick={() => setViewMode('Nominal')}
              className={`px-3 py-1.5 rounded-md transition ${viewMode === 'Nominal' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Future Dollars
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition whitespace-nowrap ${activeTab === 'all'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            All Streams
          </button>
          {data.incomeStreams.map(stream => (
            <button
              key={stream.id}
              onClick={() => setActiveTab(stream.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition whitespace-nowrap ${activeTab === stream.id
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {stream.name || 'Unnamed'}
            </button>
          ))}
        </div>

        {/* Primary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SummaryCard
            title="Lifetime Earnings"
            value={viewMode === 'PV'
              ? `$${(currentSummary.lifetimeEarningsPV / 1000000).toFixed(2)}M`
              : `$${(currentSummary.lifetimeEarningsNominal / 1000000).toFixed(2)}M`
            }
            subtitle={viewMode === 'PV'
              ? `Future Value: $${(currentSummary.lifetimeEarningsNominal / 1000000).toFixed(2)}M`
              : `Present Value: $${(currentSummary.lifetimeEarningsPV / 1000000).toFixed(2)}M`
            }
            highlight
          />
          <SummaryCard
            title="Avg Annual Growth"
            value={`${summary.averageAnnualGrowth.toFixed(1)}%`}
          />
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold mb-4 text-gray-700">
            Income Projection ({viewMode === 'PV' ? 'Present Value' : 'Nominal'})
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={viewMode === 'PV' ? projections.chartData.chartDataPV : projections.chartData.chartDataNominal}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12 }}
                interval={Math.floor(projections.chartData.length / 5)}
              />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
                width={60}
              />
              <Tooltip
                formatter={(value) => `$${Math.round(value).toLocaleString()}`}
                labelFormatter={(label) => `Year ${label}`}
              />
              {activeTab === 'all' ? (
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
                <Bar
                  dataKey={data.incomeStreams.find(s => s.id === activeTab)?.name}
                  fill="#3b82f6"
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-xs text-gray-500">Salary</div>
            <div className="font-semibold text-sm">
              ${((viewMode === 'PV' ? currentSummary.totalSalaryPV : currentSummary.totalSalaryNominal) / 1000000).toFixed(2)}M
            </div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-xs text-gray-500">Equity</div>
            <div className="font-semibold text-sm">
              ${((viewMode === 'PV' ? currentSummary.totalEquityPV : currentSummary.totalEquityNominal) / 1000000).toFixed(2)}M
            </div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-xs text-gray-500">401k</div>
            <div className="font-semibold text-sm">
              ${((viewMode === 'PV' ? currentSummary.total401kPV : currentSummary.total401kNominal) / 1000000).toFixed(2)}M
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-2">
        <button
          onClick={handleNextFeature}
          className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition shadow-sm"
        >
          Continue to Expenses →
        </button>
      </div>
    </div>
  )

  return <SplitLayout inputSection={InputSection} outputSection={OutputSection} />
}

function SummaryCard({ title, value, subtitle, subtext, highlight }) {
  return (
    <div className={`p-4 rounded-lg border ${highlight ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-200'}`}>
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{title}</h3>
      <div className={`text-2xl font-bold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>
        {value}
      </div>
      {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
      {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
    </div>
  )
}

export default Income
