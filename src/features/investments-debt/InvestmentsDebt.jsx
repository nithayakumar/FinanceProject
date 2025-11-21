import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../../core'
import { validateInvestments } from './InvestmentsDebt.calc'
import { calculateGapProjections } from '../gap/Gap.calc'
import { calculateIncomeProjections } from '../income/Income.calc'
import { calculateExpenseProjections } from '../expenses/Expenses.calc'
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
import { INVESTMENTS_CONFIG, createDefaultInvestment, createDefault401k } from '../../core'

function InvestmentsDebt() {
  const navigate = useNavigate()
  const [view, setView] = useState('input')
  const [errors, setErrors] = useState({})
  const [isSaved, setIsSaved] = useState(false)

  const [data, setData] = useState({
    currentCash: '',
    targetCash: '',
    retirement401k: createDefault401k(0),
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
        createDefaultInvestment(1, investmentValue, 33.33),
        createDefaultInvestment(2, investmentValue, 33.33),
        createDefaultInvestment(3, investmentValue, 33.34)
      ]

      setData({
        currentCash: currentCash,
        targetCash: targetCash,
        retirement401k: createDefault401k(totalCompany401k),
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
    if (data.investments.length >= INVESTMENTS_CONFIG.MAX_INVESTMENTS) return

    const newInvestment = createDefaultInvestment(data.investments.length + 1, 0, 0)

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
    const yearsToRetirement = profile.retirementAge - profile.age

    // Calculate full pipeline (same as Dashboard) to get realistic projections
    const incomeData = storage.load('income')
    const expensesData = storage.load('expenses')

    if (!incomeData || !expensesData) {
      console.error('Missing income or expenses data. Please complete those sections first.')
      alert('Please complete the Income and Expenses sections before calculating investment projections.')
      console.groupEnd()
      return
    }

    const enrichedProfile = {
      ...profile,
      yearsToRetirement
    }

    // Step 1: Calculate income projections
    const incomeProjections = calculateIncomeProjections(incomeData, enrichedProfile)

    // Step 2: Calculate expense projections
    const expenseProjections = calculateExpenseProjections(
      expensesData,
      enrichedProfile,
      incomeProjections.projections
    )

    // Step 3: Calculate gap projections (includes investment growth + contributions)
    const incomeWithProjections = {
      ...incomeData,
      projections: incomeProjections.projections
    }
    const expensesWithProjections = {
      ...expensesData,
      projections: expenseProjections.projections
    }

    const gapProjections = calculateGapProjections(
      incomeWithProjections,
      expensesWithProjections,
      data, // investmentsData
      enrichedProfile
    )

    setProjections(gapProjections)

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
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-1">Savings & Investments</h1>

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

        {/* Total Savings & Investments Summary with Breakdown */}
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-4">
          <div className="mb-3">
            <p className="text-xs text-blue-700 font-medium mb-1">Total Savings & Investments</p>
            <p className="text-3xl font-bold text-blue-700">${Math.round(currentTotalSavings).toLocaleString()}</p>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-blue-200">
            {/* Cash */}
            <div className="bg-white rounded-lg p-2">
              <p className="text-xs text-gray-600 mb-1">Cash</p>
              <p className="text-base font-bold text-blue-700">
                ${Math.round(Number(data.currentCash || 0)).toLocaleString()}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {currentTotalSavings > 0 ? ((Number(data.currentCash || 0) / currentTotalSavings) * 100).toFixed(1) : 0}%
              </p>
            </div>

            {/* 401k */}
            <div className="bg-white rounded-lg p-2">
              <p className="text-xs text-gray-600 mb-1">401k</p>
              <p className="text-base font-bold text-green-700">
                ${Math.round(Number(data.retirement401k?.currentValue || 0)).toLocaleString()}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {currentTotalSavings > 0 ? ((Number(data.retirement401k?.currentValue || 0) / currentTotalSavings) * 100).toFixed(1) : 0}%
              </p>
            </div>

            {/* Investments */}
            <div className="bg-white rounded-lg p-2">
              <p className="text-xs text-gray-600 mb-1">Investments</p>
              <p className="text-base font-bold text-purple-700">
                ${Math.round(totalInvestments).toLocaleString()}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                {currentTotalSavings > 0 ? ((totalInvestments / currentTotalSavings) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>

          {/* Individual Investment Breakdown */}
          {data.investments && data.investments.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200">
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
            <h2 className="text-base font-semibold mb-2">Cash on Hand <span className="text-xs text-gray-500 font-normal">(Synced)</span></h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Current Cash</label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    value={data.currentCash}
                    onChange={(e) => handleCashChange('currentCash', e.target.value ? Number(e.target.value) : '')}
                    placeholder="50000"
                    className={`w-full pl-8 pr-3 py-1.5 border rounded-md text-sm ${
                      errors.currentCash ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.currentCash && <p className="mt-1 text-xs text-red-600">{errors.currentCash}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Target Cash</label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    value={data.targetCash}
                    onChange={(e) => handleCashChange('targetCash', e.target.value ? Number(e.target.value) : '')}
                    placeholder="100000"
                    className={`w-full pl-8 pr-3 py-1.5 border rounded-md text-sm ${
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
            <h2 className="text-base font-semibold mb-2">401(k) Retirement Account</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Individual Limit (2025)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    value={data.retirement401k.individualLimit}
                    onChange={(e) => handle401kChange('individualLimit', e.target.value ? Number(e.target.value) : '')}
                    placeholder="23500"
                    className={`w-full pl-8 pr-3 py-1.5 border rounded-md text-sm ${
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
                  className={`w-full px-3 py-1.5 border rounded-md text-sm ${
                    errors['401k-limitGrowth'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors['401k-limitGrowth'] && <p className="mt-1 text-xs text-red-600">{errors['401k-limitGrowth']}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Company Match (Annual)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    value={data.retirement401k.companyContribution}
                    disabled
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-600"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">From Income</p>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Current 401(k) Value</label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    value={data.retirement401k.currentValue}
                    onChange={(e) => handle401kChange('currentValue', e.target.value ? Number(e.target.value) : '')}
                    placeholder="250000"
                    className={`w-full pl-8 pr-3 py-1.5 border rounded-md text-sm ${
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
                  className={`w-full px-3 py-1.5 border rounded-md text-sm ${
                    errors['401k-growthRate'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors['401k-growthRate'] && <p className="mt-1 text-xs text-red-600">{errors['401k-growthRate']}</p>}
              </div>
            </div>
          </div>

          {/* Investments - Compact Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-semibold">Investment Portfolio <span className="text-xs text-gray-500 font-normal">(max {INVESTMENTS_CONFIG.MAX_INVESTMENTS})</span></h2>
              {data.investments.length < INVESTMENTS_CONFIG.MAX_INVESTMENTS && (
                <button
                  onClick={addInvestment}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Add
                </button>
              )}
            </div>

            {/* Portfolio Allocation Warning */}
            {data.investments.length > 0 && (
              <div className={`mb-2 p-2 rounded text-xs font-medium ${
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
              <p className="text-xs text-gray-500 italic text-center py-4">No investments added yet</p>
            )}
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            className="w-full bg-blue-600 text-white py-2.5 rounded-md font-medium hover:bg-blue-700 transition"
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

  const profile = storage.load('profile') || {}
  const yearsToRetirement = profile.retirementAge - profile.age

  // Transform gap projections to chart data format
  const chartData = projections.projections.map(p => {
    const chartPoint = {
      year: p.year,
      cash: p.cash,
      retirement401k: p.retirement401kValue
    }

    // Add individual investments
    p.investments.forEach((inv, idx) => {
      chartPoint[`investment${idx + 1}`] = inv.marketValue
    })

    return chartPoint
  })

  // Create summary from gap projections
  const summary = {
    currentTotalSavings: projections.summary.currentNetWorth,
    year10Total: projections.summary.year10NetWorth,
    retirementTotal: projections.summary.retirementNetWorth,
    totalGrowthPercent: projections.summary.netWorthGrowthPercent
  }

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
          <AreaChart data={chartData}>
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
                { year: 'Today', data: chartData[0] },
                { year: 'Year 5', data: chartData[4] },
                { year: 'Year 10', data: chartData[9] },
                { year: 'Year 20', data: chartData[19] },
                { year: `Year ${yearsToRetirement} (Retirement)`, data: chartData[yearsToRetirement - 1] }
              ].map((milestone, index) => {
                if (!milestone.data) return null
                const investmentsTotal = data.investments.reduce((sum, _, i) => {
                  return sum + (milestone.data[`investment${i + 1}`] || 0)
                }, 0)
                const total = (milestone.data.cash || 0) + (milestone.data.retirement401k || 0) + investmentsTotal
                return (
                  <tr key={index} className={`border-b border-gray-100 ${index === 0 || index === 4 ? 'bg-blue-50' : ''}`}>
                    <td className="py-3 px-4 font-medium text-gray-900">{milestone.year}</td>
                    <td className="text-right py-3 px-4">${Math.round(milestone.data.cash || 0).toLocaleString()}</td>
                    <td className="text-right py-3 px-4">${Math.round(milestone.data.retirement401k || 0).toLocaleString()}</td>
                    <td className="text-right py-3 px-4">${Math.round(investmentsTotal).toLocaleString()}</td>
                    <td className="text-right py-3 px-4 font-bold">${Math.round(total).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Annual Contributions Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">Annual Contributions Breakdown</h2>
        <p className="text-sm text-gray-600 mb-4">
          This table shows how your savings grow through contributions (including taxed equity) and compound growth.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-2 px-2">Year</th>
                <th className="text-right py-2 px-2">Gap → Investments</th>
                <th className="text-right py-2 px-2">Individual 401k</th>
                <th className="text-right py-2 px-2">Company 401k</th>
                <th className="text-right py-2 px-2">Total Contributions</th>
                <th className="text-right py-2 px-2">Net Worth</th>
              </tr>
            </thead>
            <tbody>
              {projections.projections.slice(0, Math.min(10, yearsToRetirement)).map((p, index) => {
                const totalContributions = p.investedThisYear + p.totalIndividual401k + p.annualCompany401k
                return (
                  <tr key={p.year} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}>
                    <td className="py-2 px-2 font-medium">{p.year}</td>
                    <td className="text-right py-2 px-2">${Math.round(p.investedThisYear).toLocaleString()}</td>
                    <td className="text-right py-2 px-2">${Math.round(p.totalIndividual401k).toLocaleString()}</td>
                    <td className="text-right py-2 px-2">${Math.round(p.annualCompany401k).toLocaleString()}</td>
                    <td className="text-right py-2 px-2 font-semibold">${Math.round(totalContributions).toLocaleString()}</td>
                    <td className="text-right py-2 px-2 font-bold text-blue-600">${Math.round(p.netWorth).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-semibold">
                <td className="py-3 px-2">Lifetime Total</td>
                <td className="text-right py-3 px-2">${Math.round(projections.summary.lifetimeInvested).toLocaleString()}</td>
                <td className="text-right py-3 px-2">${Math.round(projections.summary.lifetimeIndividual401k).toLocaleString()}</td>
                <td className="text-right py-3 px-2">${Math.round(projections.summary.lifetimeCompany401k).toLocaleString()}</td>
                <td className="text-right py-3 px-2 font-bold">${Math.round(
                  projections.summary.lifetimeInvested +
                  projections.summary.lifetimeIndividual401k +
                  projections.summary.lifetimeCompany401k
                ).toLocaleString()}</td>
                <td className="text-right py-3 px-2 font-bold text-blue-600">${Math.round(projections.summary.retirementNetWorth).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Note:</strong> "Gap → Investments" includes after-tax equity compensation.
            Equity is taxed as ordinary income, then allocated to investments along with other savings.
            Your equity contributions over {yearsToRetirement} years are included in the Gap total.
          </p>
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
