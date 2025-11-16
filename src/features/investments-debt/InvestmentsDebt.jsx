import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../../shared/storage'
import { validateInvestments, calculateInvestmentProjections } from './InvestmentsDebt.calc'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'

function InvestmentsDebt() {
  const navigate = useNavigate()
  const [view, setView] = useState('input')
  const [errors, setErrors] = useState({})
  const [isSaved, setIsSaved] = useState(false)

  const [data, setData] = useState({
    currentCash: '',
    targetCash: '',
    retirement401k: {
      individualLimit: 23500,
      limitGrowth: 3,
      currentValue: '',
      growthRate: '',
      companyContribution: 0
    },
    investments: []
  })

  const [projections, setProjections] = useState(null)

  // Load saved data and sync from profile and income
  useEffect(() => {
    const saved = storage.load('investmentsDebt')
    const profile = storage.load('profile') || {}
    const incomeData = storage.load('income') || { incomeStreams: [] }

    // Calculate total company 401k contribution from all income streams
    const totalCompany401k = incomeData.incomeStreams.reduce((sum, stream) => {
      return sum + (Number(stream.company401k) || 0)
    }, 0)

    if (saved) {
      // Always sync targetCash from profile (in case it was updated in Personal Details)
      const profileTargetCash = profile.targetCash || saved.targetCash || 0

      setData(prev => ({
        ...saved,
        targetCash: profileTargetCash,  // Use profile's targetCash if available
        retirement401k: {
          ...saved.retirement401k,
          companyContribution: totalCompany401k
        }
      }))
      setIsSaved(true)
      console.log('📋 Loaded saved investments:', saved)
      console.log('💰 Synced targetCash from profile:', profileTargetCash)
    } else {
      // Initialize from profile
      const currentCash = profile.currentCash || 0
      const targetCash = profile.targetCash || 0

      // Calculate total savings (currentCash from profile is our savings)
      const totalSavings = currentCash

      // Pre-load 3 investments, each at 1/3 of savings
      const investmentValue = Math.round(totalSavings / 3)

      const preloadedInvestments = [
        {
          id: 'investment-1',
          currentValue: investmentValue,
          costBasis: investmentValue,
          growthRate: 7,
          portfolioPercent: 33.33
        },
        {
          id: 'investment-2',
          currentValue: investmentValue,
          costBasis: investmentValue,
          growthRate: 7,
          portfolioPercent: 33.33
        },
        {
          id: 'investment-3',
          currentValue: investmentValue,
          costBasis: investmentValue,
          growthRate: 7,
          portfolioPercent: 33.34
        }
      ]

      setData({
        currentCash: currentCash,
        targetCash: targetCash,
        retirement401k: {
          individualLimit: 23500,
          limitGrowth: 3,
          currentValue: '',
          growthRate: 7,
          companyContribution: totalCompany401k
        },
        investments: totalSavings > 0 ? preloadedInvestments : []
      })
    }
  }, [])

  const handleCashChange = (field, value) => {
    setData(prev => ({
      ...prev,
      [field]: value
    }))
    // Mark as not saved when user makes changes
    setIsSaved(false)
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handle401kChange = (field, value) => {
    setData(prev => ({
      ...prev,
      retirement401k: {
        ...prev.retirement401k,
        [field]: value
      }
    }))
    // Mark as not saved when user makes changes
    setIsSaved(false)
    if (errors[`401k-${field}`]) {
      setErrors(prev => ({ ...prev, [`401k-${field}`]: '' }))
    }
  }

  const addInvestment = () => {
    if (data.investments.length >= 3) return

    const newInvestment = {
      id: `investment-${Date.now()}`,
      currentValue: '',
      costBasis: '',
      growthRate: '',
      portfolioPercent: ''
    }

    setData(prev => ({
      ...prev,
      investments: [...prev.investments, newInvestment]
    }))
    // Mark as not saved when user adds investment
    setIsSaved(false)
  }

  const handleInvestmentChange = (investmentId, field, value) => {
    setData(prev => ({
      ...prev,
      investments: prev.investments.map(inv =>
        inv.id === investmentId
          ? { ...inv, [field]: value }
          : inv
      )
    }))
    // Mark as not saved when user makes changes
    setIsSaved(false)
    const index = data.investments.findIndex(i => i.id === investmentId)
    if (errors[`${index}-${field}`]) {
      setErrors(prev => ({ ...prev, [`${index}-${field}`]: '' }))
    }
  }

  const removeInvestment = (investmentId) => {
    setData(prev => ({
      ...prev,
      investments: prev.investments.filter(i => i.id !== investmentId)
    }))
    // Mark as not saved when user removes investment
    setIsSaved(false)
  }

  const handleCalculate = () => {
    console.group('💾 Calculating Investments')
    console.log('Data:', data)

    // Validate
    const validationErrors = validateInvestments(data)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      console.error('Validation errors:', validationErrors)
      console.groupEnd()
      return
    }

    // Save to localStorage
    storage.save('investmentsDebt', data)
    setIsSaved(true)

    // Also update profile with current and target cash, and sync non-cash savings
    const profile = storage.load('profile') || {}
    profile.currentCash = data.currentCash
    profile.targetCash = data.targetCash

    // Calculate non-cash savings (401k + investments) and sync to Personal Details
    const nonCashSavings = (Number(data.retirement401k.currentValue) || 0) +
                           data.investments.reduce((sum, inv) => sum + (Number(inv.currentValue) || 0), 0)
    profile.currentSavings = nonCashSavings

    storage.save('profile', profile)
    console.log('✅ Updated profile with cash values and savings:', {
      currentCash: data.currentCash,
      targetCash: data.targetCash,
      currentSavings: nonCashSavings
    })

    // Get years to retirement from profile
    const yearsToRetirement = profile.yearsToRetirement || 30

    // Calculate projections
    const calculatedProjections = calculateInvestmentProjections(data, yearsToRetirement, profile)
    setProjections(calculatedProjections)

    // Switch to output view
    setView('output')
    console.log('✅ Investments calculated and saved')
    console.groupEnd()
  }

  const handleEdit = () => {
    setView('input')
  }

  // Calculate total portfolio allocation and total savings for display
  const totalPortfolioPercent = data.investments.reduce((sum, inv) => {
    return sum + (Number(inv.portfolioPercent) || 0)
  }, 0)

  const currentTotalSavings = (Number(data.currentCash) || 0) +
                               (Number(data.retirement401k.currentValue) || 0) +
                               data.investments.reduce((sum, inv) => sum + (Number(inv.currentValue) || 0), 0)

  const totalInvestments = data.investments.reduce((sum, inv) => sum + (Number(inv.currentValue) || 0), 0)

  // Input View
  if (view === 'input') {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2">Savings & Investments</h1>
        <p className="text-gray-600 mb-4">
          Manage your cash, 401k, and investments
          <span className="ml-2 text-xs text-blue-600">(Synced with Personal Details)</span>
        </p>

        {/* Save Status Banner */}
        {isSaved ? (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-green-600 text-xl mr-3">✅</span>
              <div>
                <p className="text-green-900 font-medium">Data Saved</p>
                <p className="text-green-700 text-sm">This section is ready for the Dashboard</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-yellow-600 text-xl mr-3">⚠️</span>
              <div>
                <p className="text-yellow-900 font-medium">Not Saved Yet</p>
                <p className="text-yellow-700 text-sm">Fill out the form and click "Calculate Projections" to save</p>
              </div>
            </div>
          </div>
        )}

        {/* Total Savings & Investments Summary with Breakdown */}
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <p className="text-sm text-blue-700 font-medium mb-1">Total Savings & Investments</p>
            <p className="text-4xl font-bold text-blue-700">${Math.round(currentTotalSavings).toLocaleString()}</p>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-blue-200">
            {/* Cash */}
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Cash</p>
              <p className="text-lg font-bold text-blue-700">
                ${Math.round(Number(data.currentCash || 0)).toLocaleString()}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {currentTotalSavings > 0 ? ((Number(data.currentCash || 0) / currentTotalSavings) * 100).toFixed(1) : 0}%
              </p>
            </div>

            {/* 401k */}
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">401k</p>
              <p className="text-lg font-bold text-green-700">
                ${Math.round(Number(data.retirement401k?.currentValue || 0)).toLocaleString()}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {currentTotalSavings > 0 ? ((Number(data.retirement401k?.currentValue || 0) / currentTotalSavings) * 100).toFixed(1) : 0}%
              </p>
            </div>

            {/* Investments */}
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Investments</p>
              <p className="text-lg font-bold text-purple-700">
                ${Math.round(totalInvestments).toLocaleString()}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                {currentTotalSavings > 0 ? ((totalInvestments / currentTotalSavings) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>

          {/* Individual Investment Breakdown */}
          {data.investments && data.investments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-xs text-blue-700 font-medium mb-2">Investment Breakdown:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {data.investments.map((inv, index) => (
                  <div key={inv.id} className="bg-white rounded p-2">
                    <p className="text-xs text-gray-600">Investment {index + 1}</p>
                    <p className="text-sm font-semibold text-purple-700">
                      ${Math.round(Number(inv.currentValue || 0)).toLocaleString()}
                    </p>
                    <p className="text-xs text-purple-600">
                      {currentTotalSavings > 0 ? ((Number(inv.currentValue || 0) / currentTotalSavings) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Cash on Hand - Compact */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold mb-3">Cash on Hand <span className="text-xs text-gray-500 font-normal">(Synced with Personal Details)</span></h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Current Cash</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    value={data.currentCash}
                    onChange={(e) => handleCashChange('currentCash', e.target.value ? Number(e.target.value) : '')}
                    placeholder="50000"
                    className={`w-full pl-8 pr-3 py-2 border rounded-md text-sm ${
                      errors.currentCash ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.currentCash && <p className="mt-1 text-xs text-red-600">{errors.currentCash}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Target Cash</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    value={data.targetCash}
                    onChange={(e) => handleCashChange('targetCash', e.target.value ? Number(e.target.value) : '')}
                    placeholder="100000"
                    className={`w-full pl-8 pr-3 py-2 border rounded-md text-sm ${
                      errors.targetCash ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.targetCash && <p className="mt-1 text-xs text-red-600">{errors.targetCash}</p>}
              </div>
            </div>
          </div>

          {/* 401k */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold mb-3">401(k) Retirement Account</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Individual Limit (2025)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    value={data.retirement401k.individualLimit}
                    onChange={(e) => handle401kChange('individualLimit', e.target.value ? Number(e.target.value) : '')}
                    placeholder="23500"
                    className={`w-full pl-8 pr-3 py-2 border rounded-md text-sm ${
                      errors['401k-individualLimit'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors['401k-individualLimit'] && <p className="mt-1 text-xs text-red-600">{errors['401k-individualLimit']}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Annual Limit Growth (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={data.retirement401k.limitGrowth}
                  onChange={(e) => handle401kChange('limitGrowth', e.target.value ? Number(e.target.value) : '')}
                  placeholder="3.0"
                  className={`w-full px-3 py-2 border rounded-md text-sm ${
                    errors['401k-limitGrowth'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors['401k-limitGrowth'] && <p className="mt-1 text-xs text-red-600">{errors['401k-limitGrowth']}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Company Match (Annual)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    value={data.retirement401k.companyContribution}
                    disabled
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-600"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">From Income</p>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Current 401(k) Value</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    value={data.retirement401k.currentValue}
                    onChange={(e) => handle401kChange('currentValue', e.target.value ? Number(e.target.value) : '')}
                    placeholder="250000"
                    className={`w-full pl-8 pr-3 py-2 border rounded-md text-sm ${
                      errors['401k-currentValue'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors['401k-currentValue'] && <p className="mt-1 text-xs text-red-600">{errors['401k-currentValue']}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">401(k) Growth Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={data.retirement401k.growthRate}
                  onChange={(e) => handle401kChange('growthRate', e.target.value ? Number(e.target.value) : '')}
                  placeholder="7.0"
                  className={`w-full px-3 py-2 border rounded-md text-sm ${
                    errors['401k-growthRate'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors['401k-growthRate'] && <p className="mt-1 text-xs text-red-600">{errors['401k-growthRate']}</p>}
              </div>
            </div>
          </div>

          {/* Investments - Compact Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">Investment Portfolio <span className="text-xs text-gray-500 font-normal">(max 3)</span></h2>
              {data.investments.length < 3 && (
                <button
                  onClick={addInvestment}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add Investment
                </button>
              )}
            </div>

            {/* Portfolio Allocation Warning */}
            {data.investments.length > 0 && (
              <div className={`mb-3 p-2 rounded text-xs font-medium ${
                totalPortfolioPercent === 100
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : totalPortfolioPercent > 100
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              }`}>
                Total Allocation: {totalPortfolioPercent.toFixed(1)}%
                {totalPortfolioPercent === 100 && ' ✓'}
                {totalPortfolioPercent > 100 && ' - Exceeds 100%!'}
                {totalPortfolioPercent < 100 && totalPortfolioPercent > 0 && ' - ' + (100 - totalPortfolioPercent).toFixed(1) + '% unallocated'}
              </div>
            )}

            {data.investments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 text-xs font-semibold text-gray-700">Investment</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-gray-700">Current Value</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-gray-700">Cost Basis</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-gray-700">Growth Rate</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-gray-700">% Portfolio</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.investments.map((investment, index) => (
                      <tr key={investment.id} className="border-b border-gray-100">
                        <td className="py-2 px-2 font-medium text-gray-900">Investment {index + 1}</td>
                        <td className="py-2 px-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1.5 text-gray-500 text-xs">$</span>
                            <input
                              type="number"
                              value={investment.currentValue}
                              onChange={(e) => handleInvestmentChange(investment.id, 'currentValue', e.target.value ? Number(e.target.value) : '')}
                              placeholder="100000"
                              className={`w-full pl-6 pr-2 py-1.5 border rounded text-sm ${
                                errors[`${index}-currentValue`] ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1.5 text-gray-500 text-xs">$</span>
                            <input
                              type="number"
                              value={investment.costBasis}
                              onChange={(e) => handleInvestmentChange(investment.id, 'costBasis', e.target.value ? Number(e.target.value) : '')}
                              placeholder="80000"
                              className={`w-full pl-6 pr-2 py-1.5 border rounded text-sm ${
                                errors[`${index}-costBasis`] ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.1"
                            value={investment.growthRate}
                            onChange={(e) => handleInvestmentChange(investment.id, 'growthRate', e.target.value ? Number(e.target.value) : '')}
                            placeholder="7.0"
                            className={`w-full px-2 py-1.5 border rounded text-sm ${
                              errors[`${index}-growthRate`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.1"
                            value={investment.portfolioPercent}
                            onChange={(e) => handleInvestmentChange(investment.id, 'portfolioPercent', e.target.value ? Number(e.target.value) : '')}
                            placeholder="33.33"
                            className={`w-full px-2 py-1.5 border rounded text-sm ${
                              errors[`${index}-portfolioPercent`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => removeInvestment(investment.id)}
                            className="text-red-600 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic text-center py-4">No investments added yet</p>
            )}
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition"
          >
            Calculate Projections →
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
  const profile = storage.load('profile') || {}
  const yearsToRetirement = profile.yearsToRetirement || 30

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Savings & Investments Projections</h1>
          <p className="text-gray-600">Growth projections over {yearsToRetirement} years</p>
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
          title="Current Total Savings"
          value={`$${(summary.currentTotalSavings / 1000).toFixed(0)}k`}
          subtitle={`Cash + 401k + Investments`}
          highlight
        />
        <SummaryCard
          title="Year 10 Projected"
          value={`$${(summary.year10Total / 1000).toFixed(0)}k`}
          subtitle={`+$${((summary.year10Total - summary.currentTotalSavings) / 1000).toFixed(0)}k growth`}
        />
        <SummaryCard
          title="Retirement Total"
          value={`$${(summary.retirementTotal / 1000000).toFixed(2)}M`}
          subtitle={`Year ${yearsToRetirement}`}
          highlight
        />
        <SummaryCard
          title="Total Growth"
          value={`+${summary.totalGrowthPercent.toFixed(1)}%`}
          subtitle={`$${((summary.retirementTotal - summary.currentTotalSavings) / 1000).toFixed(0)}k gains`}
        />
      </div>

      {/* Portfolio Growth Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Portfolio Growth Over Time</h2>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={projections.chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="year"
              label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              label={{ value: 'Portfolio Value ($)', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => `$${Math.round(value).toLocaleString()}`}
              labelFormatter={(label) => `Year ${label}`}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="cash"
              stackId="1"
              stroke="#10b981"
              fill="#10b981"
              name="Cash"
            />
            <Area
              type="monotone"
              dataKey="retirement401k"
              stackId="1"
              stroke="#3b82f6"
              fill="#3b82f6"
              name="401(k)"
            />
            {data.investments.map((_, index) => (
              <Area
                key={`inv-${index}`}
                type="monotone"
                dataKey={`investment${index + 1}`}
                stackId="1"
                stroke={['#8b5cf6', '#f59e0b', '#ef4444'][index]}
                fill={['#8b5cf6', '#f59e0b', '#ef4444'][index]}
                name={`Investment ${index + 1}`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Projected Values at Key Milestones</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Milestone</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Cash</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">401(k)</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Investments</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {[
                { year: 'Today', data: projections.chartData[0] },
                { year: 'Year 5', data: projections.chartData[4] },
                { year: 'Year 10', data: projections.chartData[9] },
                { year: 'Year 20', data: projections.chartData[19] },
                { year: `Year ${yearsToRetirement} (Retirement)`, data: projections.chartData[yearsToRetirement - 1] }
              ].map((milestone, index) => {
                if (!milestone.data) return null
                const investmentsTotal = data.investments.reduce((sum, _, i) => {
                  return sum + (milestone.data[`investment${i + 1}`] || 0)
                }, 0)
                return (
                  <tr key={index} className={`border-b border-gray-100 ${index === 0 || index === 4 ? 'bg-blue-50' : ''}`}>
                    <td className="py-3 px-4 font-medium text-gray-900">{milestone.year}</td>
                    <td className="text-right py-3 px-4">${Math.round(milestone.data.cash || 0).toLocaleString()}</td>
                    <td className="text-right py-3 px-4">${Math.round(milestone.data.retirement401k || 0).toLocaleString()}</td>
                    <td className="text-right py-3 px-4">${Math.round(investmentsTotal).toLocaleString()}</td>
                    <td className="text-right py-3 px-4 font-bold">${Math.round(milestone.data.total || 0).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Summary Card Component
function SummaryCard({ title, subtitle, value, highlight }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${
      highlight ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
    }`}>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mb-2">{subtitle}</p>}
      <p className={`text-2xl font-bold ${highlight ? 'text-blue-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  )
}

export default InvestmentsDebt
