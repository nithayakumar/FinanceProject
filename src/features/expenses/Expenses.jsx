import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../../core'
import { validateExpenses, calculateExpenseProjections } from './Expenses.calc'
import { calculateIncomeProjections } from '../income/Income.calc'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { EXPENSE_CONFIG, createDefaultExpenseCategories } from '../../core'

// Use centralized config
const EXPENSE_CATEGORIES = EXPENSE_CONFIG.CATEGORIES

function Expenses() {
  const navigate = useNavigate()
  const [view, setView] = useState('input')
  const [errors, setErrors] = useState({})
  const [isSaved, setIsSaved] = useState(false)

  // Load profile for retirement year
  const profile = storage.load('profile') || {}
  const yearsToRetirement = profile.retirementAge && profile.age
    ? profile.retirementAge - profile.age
    : 30

  // Initialize with all categories using centralized config
  const inflationRate = profile.inflationRate !== undefined ? profile.inflationRate : EXPENSE_CONFIG.DEFAULT_GROWTH_RATE

  const [data, setData] = useState({
    expenseCategories: createDefaultExpenseCategories(inflationRate),
    oneTimeExpenses: []
  })

  const [projections, setProjections] = useState(null)

  // Normalize categories to ensure new fields exist
  const normalizeCategories = (categories = []) => {
    return categories.map((cat) => ({
      ...cat,
      amountType: cat.amountType || 'dollar',
      percentOfIncome: cat.percentOfIncome !== undefined ? cat.percentOfIncome : '',
      growthRate: cat.growthRate !== undefined ? cat.growthRate : inflationRate,
      jumps: (cat.jumps || []).map((jump) => ({
        ...jump,
        changeType: jump.changeType || 'percent'
      }))
    }))
  }

  // Load saved data on mount
  useEffect(() => {
    const saved = storage.load('expenses')
    if (saved) {
      setData({
        ...saved,
        expenseCategories: normalizeCategories(saved.expenseCategories)
      })
      setIsSaved(true)
      console.log('📋 Loaded saved expenses:', saved)
    }
  }, [])

  const handleCategoryChange = (categoryId, field, value) => {
    setIsSaved(false)
    setData(prev => ({
      ...prev,
      expenseCategories: prev.expenseCategories.map(cat =>
        cat.id === categoryId
          ? { ...cat, [field]: value }
          : cat
      )
    }))

    // Clear error
    if (errors[`${categoryId}-${field}`]) {
      setErrors(prev => ({ ...prev, [`${categoryId}-${field}`]: '' }))
    }
  }

  const handleJumpChange = (categoryId, jumpId, field, value) => {
    setIsSaved(false)
    setData(prev => ({
      ...prev,
      expenseCategories: prev.expenseCategories.map(category =>
        category.id === categoryId
          ? {
              ...category,
              jumps: category.jumps.map(jump =>
                jump.id === jumpId
                  ? { ...jump, [field]: value }
                  : jump
              )
            }
          : category
      )
    }))
  }

  const addJump = (categoryId) => {
    setIsSaved(false)
    const newJump = {
      id: `jump-${Date.now()}`,
      year: '',
      changeType: 'percent', // 'percent' or 'dollar'
      changeValue: '',
      description: ''
    }

    setData(prev => ({
      ...prev,
      expenseCategories: prev.expenseCategories.map(category =>
        category.id === categoryId
          ? { ...category, jumps: [...category.jumps, newJump] }
          : category
      )
    }))
  }

  const removeJump = (categoryId, jumpId) => {
    setIsSaved(false)
    setData(prev => ({
      ...prev,
      expenseCategories: prev.expenseCategories.map(category =>
        category.id === categoryId
          ? { ...category, jumps: category.jumps.filter(j => j.id !== jumpId) }
          : category
      )
    }))
  }

  const handleOneTimeChange = (expenseId, field, value) => {
    setIsSaved(false)
    setData(prev => ({
      ...prev,
      oneTimeExpenses: prev.oneTimeExpenses.map(expense =>
        expense.id === expenseId
          ? { ...expense, [field]: value }
          : expense
      )
    }))

    // Clear error
    if (errors[`${expenseId}-${field}`]) {
      setErrors(prev => ({ ...prev, [`${expenseId}-${field}`]: '' }))
    }
  }

  const addOneTimeExpense = () => {
    setIsSaved(false)
    const newExpense = {
      id: `onetime-${Date.now()}`,
      year: '',
      amount: '',
      description: ''
    }

    setData(prev => ({
      ...prev,
      oneTimeExpenses: [...prev.oneTimeExpenses, newExpense]
    }))
  }

  const removeOneTimeExpense = (expenseId) => {
    setIsSaved(false)
    setData(prev => ({
      ...prev,
      oneTimeExpenses: prev.oneTimeExpenses.filter(e => e.id !== expenseId)
    }))
  }

  const handleContinue = () => {
    console.group('💾 Saving Expenses')
    console.log('Data:', data)

    // Pull income projections (used when categories are % of income)
    const incomeData = storage.load('income') || { incomeStreams: [] }
    const incomeProjectionResults =
      incomeData?.incomeStreams?.length > 0
        ? calculateIncomeProjections(incomeData, profile)
        : {
            // Fallback so % of income categories can still calculate as $0
            projections: Array.from({ length: yearsToRetirement * 12 }, (_, idx) => {
              const year = Math.floor(idx / 12) + 1
              const month = (idx % 12) + 1
              return {
                year,
                month,
                totalCompNominal: 0
              }
            })
          }

    // Validate
    const validationErrors = validateExpenses(data, yearsToRetirement)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      console.error('Validation errors:', validationErrors)
      console.groupEnd()
      return
    }

    // Save to localStorage
    storage.save('expenses', data)
    setIsSaved(true)

    // Calculate projections
    console.log('📊 Calculating expense projections...')
    const calculated = calculateExpenseProjections(data, profile, incomeProjectionResults.projections)
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
    navigate('/taxes')
  }

  // Input View
  if (view === 'input') {
    // Get all expense changes across all categories
    const allExpenseChanges = data.expenseCategories.flatMap(category =>
      category.jumps.map(jump => ({ ...jump, categoryId: category.id, categoryName: category.category }))
    )

    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-1">Expenses</h1>

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
          {/* Expense Categories - Table Format */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold mb-2">Annual Expenses by Category</h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Category</th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Amount</th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Type</th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Growth Rate (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenseCategories.map((category, index) => {
                    const isPercent = category.amountType === 'percentOfIncome'
                    return (
                      <tr key={category.id} className={index !== data.expenseCategories.length - 1 ? 'border-b border-gray-100' : ''}>
                        <td className="py-2 px-3 font-medium text-gray-900">{category.category}</td>
                        <td className="py-2 px-3">
                          <div className="relative max-w-xs">
                            {isPercent ? (
                              <>
                                <input
                                  type="number"
                                  value={category.percentOfIncome}
                                  onChange={(e) => handleCategoryChange(category.id, 'percentOfIncome', e.target.value ? Number(e.target.value) : '')}
                                  placeholder="0"
                                  className={`w-full pr-8 pl-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors[`${category.id}-percentOfIncome`] ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                />
                                <span className="absolute right-3 top-1.5 text-gray-500">%</span>
                              </>
                            ) : (
                              <>
                                <span className="absolute left-3 top-1.5 text-gray-500">$</span>
                                <input
                                  type="number"
                                  value={category.annualAmount}
                                  onChange={(e) => handleCategoryChange(category.id, 'annualAmount', e.target.value ? Number(e.target.value) : '')}
                                  placeholder="0"
                                  className={`w-full pl-8 pr-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors[`${category.id}-annualAmount`] ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                />
                              </>
                            )}
                          </div>
                          {errors[`${category.id}-annualAmount`] && (
                            <p className="mt-1 text-xs text-red-600">{errors[`${category.id}-annualAmount`]}</p>
                          )}
                          {errors[`${category.id}-percentOfIncome`] && (
                            <p className="mt-1 text-xs text-red-600">{errors[`${category.id}-percentOfIncome`]}</p>
                          )}
                          {isPercent && (
                            <p className="mt-1 text-xs text-gray-500">Percent of gross income (auto-scales with income)</p>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={category.amountType}
                            onChange={(e) => handleCategoryChange(category.id, 'amountType', e.target.value)}
                            className="max-w-xs w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 text-sm"
                          >
                            <option value="dollar">$ Amount</option>
                            <option value="percentOfIncome">% of gross income</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          {isPercent ? (
                            <div className="text-sm text-gray-500">N/A (tied to income)</div>
                          ) : (
                            <>
                              <input
                                type="number"
                                step="0.1"
                                value={category.growthRate}
                                onChange={(e) => handleCategoryChange(category.id, 'growthRate', e.target.value ? Number(e.target.value) : '')}
                                placeholder="2.7"
                                className={`max-w-xs w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  errors[`${category.id}-growthRate`] ? 'border-red-500' : 'border-gray-300'
                                }`}
                              />
                              {errors[`${category.id}-growthRate`] && (
                                <p className="mt-1 text-xs text-red-600">{errors[`${category.id}-growthRate`]}</p>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expense Changes Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-lg font-semibold">Expense Changes</h2>
                <p className="text-xs text-gray-600">Add one-time increases or decreases to specific categories</p>
              </div>
            </div>

            {/* Add Change Button with Category Selection */}
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-2">Add a new expense change:</p>
              <div className="flex flex-wrap gap-2">
                {data.expenseCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => addJump(category.id)}
                    className="text-xs px-2 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-blue-50 hover:border-blue-500 transition"
                  >
                    {category.category}
                  </button>
                ))}
              </div>
            </div>

            {allExpenseChanges.length > 0 ? (
              <div className="space-y-2">
                {allExpenseChanges.map((change) => (
                  <div key={change.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-xs text-gray-500 mb-1">{change.categoryName}</div>
                        <input
                          type="text"
                          value={change.description}
                          onChange={(e) => handleJumpChange(change.categoryId, change.id, 'description', e.target.value)}
                          className="w-full text-sm font-medium border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 mb-2"
                          placeholder="Description"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Year</label>
                            <input
                              type="number"
                              value={change.year}
                              onChange={(e) => handleJumpChange(change.categoryId, change.id, 'year', e.target.value ? Number(e.target.value) : '')}
                              placeholder="5"
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Type</label>
                            <select
                              value={change.changeType || 'percent'}
                              onChange={(e) => handleJumpChange(change.categoryId, change.id, 'changeType', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="percent">%</option>
                              <option value="dollar">$</option>
                              <option value="percentOfIncome">% of income</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              {change.changeType === 'dollar' ? 'Amount' : 'Change'}
                            </label>
                            <div className="relative">
                              {change.changeType === 'dollar' && (
                                <span className="absolute left-2 top-1.5 text-gray-500 text-xs">$</span>
                              )}
                              <input
                                type="number"
                                step={change.changeType === 'dollar' ? '1' : '0.1'}
                                value={change.changeValue !== undefined ? change.changeValue : (change.jumpPercent || '')}
                                onChange={(e) => handleJumpChange(change.categoryId, change.id, 'changeValue', e.target.value ? Number(e.target.value) : '')}
                                placeholder={change.changeType === 'dollar' ? '5000' : '-20'}
                                className={`w-full ${change.changeType === 'dollar' ? 'pl-6' : 'pl-2'} pr-8 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                              />
                              {change.changeType === 'percent' && (
                                <span className="absolute right-2 top-1.5 text-gray-500 text-xs">%</span>
                              )}
                              {change.changeType === 'percentOfIncome' && (
                                <span className="absolute right-2 top-1.5 text-gray-500 text-[10px]">% of income</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeJump(change.categoryId, change.id)}
                        className="text-red-600 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No expense changes added yet. Click a category button above to add one.</p>
            )}
          </div>

          {/* One-Time Expenses */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="text-lg font-semibold">One-Time Expenses</h2>
                <p className="text-xs text-gray-600">Add major one-time expenses (wedding, travel, etc.)</p>
              </div>
              <button
                onClick={addOneTimeExpense}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add
              </button>
            </div>

            {data.oneTimeExpenses.length > 0 ? (
              <div className="space-y-3">
                {data.oneTimeExpenses.map((expense) => (
                  <div key={expense.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <input
                        type="text"
                        value={expense.description}
                        onChange={(e) => handleOneTimeChange(expense.id, 'description', e.target.value)}
                        placeholder="Description"
                        className="flex-1 text-sm font-medium border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
                      />
                      <button
                        onClick={() => removeOneTimeExpense(expense.id)}
                        className="text-red-600 hover:text-red-700 text-xs ml-2"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                        <input
                          type="number"
                          value={expense.year}
                          onChange={(e) => handleOneTimeChange(expense.id, 'year', e.target.value ? Number(e.target.value) : '')}
                          placeholder="3"
                          max={yearsToRetirement}
                          className={`w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`${expense.id}-year`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors[`${expense.id}-year`] && (
                          <p className="mt-1 text-xs text-red-600">{errors[`${expense.id}-year`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1.5 text-gray-500">$</span>
                          <input
                            type="number"
                            value={expense.amount}
                            onChange={(e) => handleOneTimeChange(expense.id, 'amount', e.target.value ? Number(e.target.value) : '')}
                            placeholder="50000"
                            className={`w-full pl-8 pr-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors[`${expense.id}-amount`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        </div>
                        {errors[`${expense.id}-amount`] && (
                          <p className="mt-1 text-xs text-red-600">{errors[`${expense.id}-amount`]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No one-time expenses added yet</p>
            )}
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="w-full bg-blue-600 text-white py-2.5 rounded-md font-medium hover:bg-blue-700 transition"
          >
            Calculate Expense Projections →
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
          <h1 className="text-3xl font-bold mb-2">Expense Summary</h1>
          <p className="text-gray-600">Your projected expenses over {yearsToRetirement} years</p>
        </div>
        <button
          onClick={handleEdit}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
        >
          Edit
        </button>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          title="Current Year Expenses"
          value={`$${Math.round(summary.currentYearExpensesNominal).toLocaleString()}`}
          subtitle={`PV: $${Math.round(summary.currentYearExpensesPV).toLocaleString()}`}
          highlight
        />
        <SummaryCard
          title="Year 10 Projected Expenses"
          value={`$${Math.round(summary.year10ExpensesNominal).toLocaleString()}`}
          subtitle={`PV: $${Math.round(summary.year10ExpensesPV).toLocaleString()}`}
        />
        <SummaryCard
          title="Lifetime Expenses"
          subtext={`${yearsToRetirement} years to retirement`}
          value={`$${(summary.lifetimeExpensesNominal / 1000000).toFixed(2)}M`}
          subtitle={`PV: $${(summary.lifetimeExpensesPV / 1000000).toFixed(2)}M`}
          highlight
        />
      </div>

      {/* Expense Projection Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Expense Projection (Present Value)</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={projections.chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="year"
              label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              label={{ value: 'Annual Expenses (PV)', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => `$${Math.round(value).toLocaleString()}`}
              labelFormatter={(label) => `Year ${label}`}
            />
            <Legend />
            {EXPENSE_CATEGORIES.map((category, index) => {
              const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6b7280']
              return (
                <Bar
                  key={category}
                  dataKey={category}
                  stackId="a"
                  fill={colors[index % colors.length]}
                />
              )
            })}
            {/* One-time expenses bar */}
            <Bar
              key="One-Time"
              dataKey="One-Time"
              stackId="a"
              fill="#1f2937"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category Breakdown */}
      <h2 className="text-xl font-semibold mb-4">Lifetime Breakdown by Category</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {EXPENSE_CATEGORIES.map((category) => (
          <CategoryCard
            key={category}
            title={category}
            nominal={summary.categoryTotals[category] || 0}
            pv={summary.categoryTotalsPV[category] || 0}
          />
        ))}
      </div>

      {/* One-Time Expenses Summary */}
      {summary.oneTimeTotalNominal > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">One-Time Expenses Total</h2>
          <p className="text-xs text-gray-600 mb-3">Amounts entered in today's dollars</p>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Today's Dollars:</span>
            <span className="text-2xl font-bold text-blue-600">${Math.round(summary.oneTimeTotalPV).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-700">Nominal (inflated):</span>
            <span className="text-lg font-semibold text-gray-600">${Math.round(summary.oneTimeTotalNominal).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Key Milestones */}
      {summary.milestones && summary.milestones.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Key Milestones</h2>
          <div className="space-y-2">
            {summary.milestones.map((milestone, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                <span className="font-medium text-gray-700">{milestone.label}</span>
                {milestone.changeType === 'onetime' ? (
                  <span className="text-gray-900">${Math.round(milestone.amount).toLocaleString()}</span>
                ) : (
                  <span className="text-gray-900">
                    ${Math.round(milestone.expensesNominal).toLocaleString()}/year
                    <span className="text-gray-500 text-sm ml-2">
                      (PV: ${Math.round(milestone.expensesPV).toLocaleString()})
                    </span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleNextFeature}
        className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition"
      >
        Continue to Taxes →
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

function CategoryCard({ title, nominal, pv }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="text-sm font-medium text-gray-600 mb-2">{title}</div>
      <div className="text-xl font-bold text-gray-900">
        ${(nominal / 1000).toFixed(0)}k
      </div>
      <div className="text-sm text-gray-500 mt-1">
        PV: ${(pv / 1000).toFixed(0)}k
      </div>
    </div>
  )
}

export default Expenses
