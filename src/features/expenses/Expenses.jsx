import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../../shared/storage'
import { validateExpenses, calculateExpenseProjections } from './Expenses.calc'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const EXPENSE_CATEGORIES = [
  'Housing',
  'Utilities',
  'Transportation',
  'Medical',
  'Childcare',
  'Education',
  'Food',
  'Entertainment',
  'Other'
]

function Expenses() {
  const navigate = useNavigate()
  const [view, setView] = useState('input')
  const [errors, setErrors] = useState({})

  // Load profile for retirement year
  const profile = storage.load('profile') || {}
  const yearsToRetirement = profile.retirementAge && profile.age
    ? profile.retirementAge - profile.age
    : 30

  // Initialize with all categories
  const initializeCategories = () => {
    return EXPENSE_CATEGORIES.map(category => ({
      id: `category-${category.toLowerCase()}`,
      category,
      annualAmount: '',
      growthRate: profile.inflationRate || 2.7,  // Default to inflation rate
      jumps: []
    }))
  }

  const [data, setData] = useState({
    expenseCategories: initializeCategories(),
    oneTimeExpenses: []
  })

  const [projections, setProjections] = useState(null)

  // Load saved data on mount
  useEffect(() => {
    const saved = storage.load('expenses')
    if (saved) {
      setData(saved)
      console.log('📋 Loaded saved expenses:', saved)
    }
  }, [])

  const handleCategoryChange = (categoryId, field, value) => {
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
    const newJump = {
      id: `jump-${Date.now()}`,
      year: '',
      jumpPercent: '',
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
    setData(prev => ({
      ...prev,
      oneTimeExpenses: prev.oneTimeExpenses.filter(e => e.id !== expenseId)
    }))
  }

  const handleContinue = () => {
    console.group('💾 Saving Expenses')
    console.log('Data:', data)

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

    // Calculate projections
    console.log('📊 Calculating expense projections...')
    const calculated = calculateExpenseProjections(data, profile)
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
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2">Expenses</h1>
        <p className="text-gray-600 mb-8">Track your expected expenses by category</p>

        <div className="space-y-6">
          {/* Expense Categories */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Expense Categories</h2>
            <p className="text-sm text-gray-600 mb-4">
              Set annual amounts and growth rates for each category
            </p>

            <div className="space-y-6">
              {data.expenseCategories.map((category) => (
                <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">{category.category}</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Annual Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Annual Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={category.annualAmount}
                          onChange={(e) => handleCategoryChange(category.id, 'annualAmount', e.target.value ? Number(e.target.value) : '')}
                          placeholder="0"
                          className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`${category.id}-annualAmount`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors[`${category.id}-annualAmount`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`${category.id}-annualAmount`]}</p>
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
                        value={category.growthRate}
                        onChange={(e) => handleCategoryChange(category.id, 'growthRate', e.target.value ? Number(e.target.value) : '')}
                        placeholder="2.7"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors[`${category.id}-growthRate`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors[`${category.id}-growthRate`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`${category.id}-growthRate`]}</p>
                      )}
                    </div>
                  </div>

                  {/* Jumps/Drops for this category */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-semibold text-gray-700">Expense Changes (Increases/Decreases)</h4>
                      <button
                        onClick={() => addJump(category.id)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Add Change
                      </button>
                    </div>

                    {category.jumps && category.jumps.length > 0 ? (
                      <div className="space-y-3">
                        {category.jumps.map((jump) => (
                          <div key={jump.id} className="bg-gray-50 rounded p-3">
                            <div className="flex justify-between items-start mb-2">
                              <input
                                type="text"
                                value={jump.description}
                                onChange={(e) => handleJumpChange(category.id, jump.id, 'description', e.target.value)}
                                className="text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                                placeholder="e.g., Move to cheaper area"
                              />
                              <button
                                onClick={() => removeJump(category.id, jump.id)}
                                className="text-red-600 hover:text-red-700 text-xs"
                              >
                                Remove
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Year</label>
                                <input
                                  type="number"
                                  value={jump.year}
                                  onChange={(e) => handleJumpChange(category.id, jump.id, 'year', e.target.value ? Number(e.target.value) : '')}
                                  placeholder="5"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Change % (+ or -)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={jump.jumpPercent}
                                  onChange={(e) => handleJumpChange(category.id, jump.id, 'jumpPercent', e.target.value ? Number(e.target.value) : '')}
                                  placeholder="-20"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No changes added yet</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* One-Time Expenses */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">One-Time Expenses</h2>
                <p className="text-sm text-gray-600">Add major one-time expenses (wedding, travel, medical procedure, etc.)</p>
              </div>
              <button
                onClick={addOneTimeExpense}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add One-Time Expense
              </button>
            </div>

            {data.oneTimeExpenses.length > 0 ? (
              <div className="space-y-4">
                {data.oneTimeExpenses.map((expense) => (
                  <div key={expense.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <input
                        type="text"
                        value={expense.description}
                        onChange={(e) => handleOneTimeChange(expense.id, 'description', e.target.value)}
                        placeholder="Description (e.g., Wedding)"
                        className="flex-1 text-base font-medium border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
                      />
                      <button
                        onClick={() => removeOneTimeExpense(expense.id)}
                        className="text-red-600 hover:text-red-700 text-sm ml-2"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                        <input
                          type="number"
                          value={expense.year}
                          onChange={(e) => handleOneTimeChange(expense.id, 'year', e.target.value ? Number(e.target.value) : '')}
                          placeholder="3"
                          max={yearsToRetirement}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`${expense.id}-year`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors[`${expense.id}-year`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`${expense.id}-year`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500">$</span>
                          <input
                            type="number"
                            value={expense.amount}
                            onChange={(e) => handleOneTimeChange(expense.id, 'amount', e.target.value ? Number(e.target.value) : '')}
                            placeholder="50000"
                            className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors[`${expense.id}-amount`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        </div>
                        {errors[`${expense.id}-amount`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`${expense.id}-amount`]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No one-time expenses added yet</p>
            )}
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition"
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
          value={`$${summary.currentYearExpensesNominal.toLocaleString()}`}
          subtitle={`PV: $${summary.currentYearExpensesPV.toLocaleString()}`}
          highlight
        />
        <SummaryCard
          title="Year 10 Projected Expenses"
          value={`$${summary.year10ExpensesNominal.toLocaleString()}`}
          subtitle={`PV: $${summary.year10ExpensesPV.toLocaleString()}`}
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
              formatter={(value) => `$${value.toLocaleString()}`}
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
      {summary.oneTimeTotal > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">One-Time Expenses Total</h2>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Total Amount:</span>
            <span className="text-2xl font-bold text-blue-600">${summary.oneTimeTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-700">Present Value:</span>
            <span className="text-lg font-semibold text-blue-600">${summary.oneTimeTotalPV.toLocaleString()}</span>
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
                  <span className="text-gray-900">${milestone.amount.toLocaleString()}</span>
                ) : (
                  <span className="text-gray-900">
                    ${milestone.expensesNominal.toLocaleString()}/year
                    <span className="text-gray-500 text-sm ml-2">
                      (PV: ${milestone.expensesPV.toLocaleString()})
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
