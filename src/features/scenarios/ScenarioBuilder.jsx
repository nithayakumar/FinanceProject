import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { storage } from '../../shared/storage'

function ScenarioBuilder() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [scenarioData, setScenarioData] = useState({
    name: '',
    description: '',
    overrides: {
      profile: {},
      income: { incomeStreams: [] },
      expenses: { recurring: {} }
    }
  })

  const [baseData, setBaseData] = useState(null)

  // Load base data and scenario if editing
  useEffect(() => {
    // Load base profile data
    const profile = storage.load('profile') || {}
    const income = storage.load('income') || {}
    const expenses = storage.load('expenses') || {}

    setBaseData({ profile, income, expenses })

    // If editing, load scenario
    if (isEditing) {
      const scenarios = storage.load('scenarios') || []
      const scenario = scenarios.find(s => s.id === id)
      if (scenario) {
        setScenarioData(scenario)
      } else {
        alert('Scenario not found')
        navigate('/scenarios')
      }
    }
  }, [id, isEditing, navigate])

  // Handle basic info change
  const handleChange = (field, value) => {
    setScenarioData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle profile overrides
  const handleProfileOverride = (field, value) => {
    setScenarioData(prev => ({
      ...prev,
      overrides: {
        ...prev.overrides,
        profile: {
          ...prev.overrides.profile,
          [field]: value === '' ? undefined : value
        }
      }
    }))
  }

  // Handle income override (simple - just first stream salary)
  const handleIncomeOverride = (salary) => {
    if (!baseData || !baseData.income.incomeStreams || baseData.income.incomeStreams.length === 0) {
      return
    }

    const firstStream = baseData.income.incomeStreams[0]
    setScenarioData(prev => ({
      ...prev,
      overrides: {
        ...prev.overrides,
        income: {
          incomeStreams: salary !== '' ? [{
            ...firstStream,
            salary: Number(salary)
          }] : []
        }
      }
    }))
  }

  // Handle expense override
  const handleExpenseOverride = (category, value) => {
    setScenarioData(prev => ({
      ...prev,
      overrides: {
        ...prev.overrides,
        expenses: {
          ...prev.overrides.expenses,
          recurring: {
            ...prev.overrides.expenses.recurring,
            [category]: value === '' ? undefined : Number(value)
          }
        }
      }
    }))
  }

  // Save scenario
  const handleSave = () => {
    if (!scenarioData.name.trim()) {
      alert('Please enter a scenario name')
      return
    }

    const scenarios = storage.load('scenarios') || []

    if (isEditing) {
      // Update existing
      const updated = scenarios.map(s =>
        s.id === id
          ? { ...scenarioData, modifiedAt: Date.now() }
          : s
      )
      storage.save('scenarios', updated)
    } else {
      // Create new
      const newScenario = {
        id: `scenario-${Date.now()}`,
        ...scenarioData,
        createdAt: Date.now(),
        modifiedAt: Date.now()
      }
      storage.save('scenarios', [...scenarios, newScenario])
    }

    navigate('/scenarios')
  }

  if (!baseData) {
    return <div className="p-8">Loading...</div>
  }

  const currentSalary = baseData.income.incomeStreams?.[0]?.salary || 0
  const overrideSalary = scenarioData.overrides.income.incomeStreams?.[0]?.salary

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        {isEditing ? 'Edit Scenario' : 'Create New Scenario'}
      </h1>

      {/* Basic Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Scenario Name *
          </label>
          <input
            type="text"
            value={scenarioData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            placeholder="e.g., Texas Remote Job, California Tech Company"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            value={scenarioData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            rows="3"
            placeholder="Brief description of this scenario..."
          />
        </div>
      </div>

      {/* Location/Tax Overrides */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Location & Tax Changes</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              State
            </label>
            <select
              value={scenarioData.overrides.profile.state || ''}
              onChange={(e) => handleProfileOverride('state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="">Use base profile ({baseData.profile.state || 'Not set'})</option>
              <option value="CA">California</option>
              <option value="TX">Texas</option>
              <option value="NY">New York</option>
              <option value="FL">Florida</option>
              <option value="WA">Washington</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Location
            </label>
            <input
              type="text"
              value={scenarioData.overrides.profile.location || ''}
              onChange={(e) => handleProfileOverride('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder={baseData.profile.location || 'City/Metro area'}
            />
          </div>
        </div>
      </div>

      {/* Income Overrides */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Income Changes</h2>

        <div>
          <label className="block text-sm font-medium mb-1">
            Annual Salary
          </label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={overrideSalary || ''}
              onChange={(e) => handleIncomeOverride(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder={`Base: $${currentSalary.toLocaleString()}`}
            />
            {overrideSalary && overrideSalary !== currentSalary && (
              <span className={`text-sm font-medium ${overrideSalary > currentSalary ? 'text-green-600' : 'text-red-600'}`}>
                {overrideSalary > currentSalary ? '+' : ''}
                ${(overrideSalary - currentSalary).toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Leave blank to use base profile salary
          </p>
        </div>
      </div>

      {/* Expense Overrides */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Expense Changes</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Housing (Monthly)
            </label>
            <input
              type="number"
              value={scenarioData.overrides.expenses.recurring?.housing || ''}
              onChange={(e) => handleExpenseOverride('housing', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder={`Base: $${(baseData.expenses.recurring?.housing || 0).toLocaleString()}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Transportation (Monthly)
            </label>
            <input
              type="number"
              value={scenarioData.overrides.expenses.recurring?.transportation || ''}
              onChange={(e) => handleExpenseOverride('transportation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder={`Base: $${(baseData.expenses.recurring?.transportation || 0).toLocaleString()}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Food (Monthly)
            </label>
            <input
              type="number"
              value={scenarioData.overrides.expenses.recurring?.food || ''}
              onChange={(e) => handleExpenseOverride('food', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder={`Base: $${(baseData.expenses.recurring?.food || 0).toLocaleString()}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Discretionary (Monthly)
            </label>
            <input
              type="number"
              value={scenarioData.overrides.expenses.recurring?.discretionary || ''}
              onChange={(e) => handleExpenseOverride('discretionary', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder={`Base: $${(baseData.expenses.recurring?.discretionary || 0).toLocaleString()}`}
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Leave fields blank to use base profile values
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {isEditing ? 'Save Changes' : 'Create Scenario'}
        </button>
        <button
          onClick={() => navigate('/scenarios')}
          className="px-6 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default ScenarioBuilder
