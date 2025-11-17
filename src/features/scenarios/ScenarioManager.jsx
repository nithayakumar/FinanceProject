import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../../shared/storage'
import { getCurrentPlanData } from './Scenario.calc'

function ScenarioManager() {
  const navigate = useNavigate()
  const [scenarios, setScenarios] = useState([])
  const [currentPlan, setCurrentPlan] = useState(null)

  // Load scenarios and current plan
  useEffect(() => {
    const saved = storage.load('scenarios') || []
    setScenarios(saved)

    const current = getCurrentPlanData()
    setCurrentPlan(current)

    console.log('📋 Loaded scenarios:', saved)
    console.log('📋 Current plan:', current)
  }, [])

  // Save scenarios to localStorage
  const saveScenarios = (updatedScenarios) => {
    storage.save('scenarios', updatedScenarios)
    setScenarios(updatedScenarios)
    console.log('💾 Saved scenarios:', updatedScenarios)
  }

  // Create new scenario from current plan
  const handleCloneCurrentPlan = () => {
    const current = getCurrentPlanData()

    const newScenario = {
      id: `scenario-${Date.now()}`,
      name: 'Copy of Current Plan',
      description: 'Clone of your current financial plan',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      data: {
        profile: { ...current.profile },
        income: JSON.parse(JSON.stringify(current.income)), // Deep copy
        expenses: JSON.parse(JSON.stringify(current.expenses)),
        investmentsDebt: JSON.parse(JSON.stringify(current.investmentsDebt))
      }
    }

    const updated = [...scenarios, newScenario]
    saveScenarios(updated)
    navigate(`/scenarios/${newScenario.id}/edit`)
  }

  // Create blank scenario
  const handleCreateBlank = () => {
    const newScenario = {
      id: `scenario-${Date.now()}`,
      name: 'New Scenario',
      description: '',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      data: {
        profile: {
          location: '',
          filingStatus: 'Single',
          age: 30,
          retirementAge: 65,
          inflationRate: 2.7,
          currentCash: 0,
          targetCash: 0,
          currentSavings: 0
        },
        income: {
          incomeStreams: [{
            id: 'stream-1',
            name: 'Income Stream 1',
            annualIncome: 0,
            company401k: 0,
            individual401k: 0,
            equity: 0,
            growthRate: 2.7,
            endWorkYear: 35,
            jumps: []
          }]
        },
        expenses: {
          expenseCategories: [],
          oneTimeExpenses: []
        },
        investmentsDebt: {
          currentCash: 0,
          targetCash: 0,
          retirement401k: {
            individualLimit: 23500,
            limitGrowth: 3,
            currentValue: 0,
            growthRate: 7,
            companyContribution: 0
          },
          investments: []
        }
      }
    }

    const updated = [...scenarios, newScenario]
    saveScenarios(updated)
    navigate(`/scenarios/${newScenario.id}/edit`)
  }

  // Delete scenario
  const handleDelete = (scenarioId) => {
    if (confirm('Are you sure you want to delete this scenario?')) {
      const updated = scenarios.filter(s => s.id !== scenarioId)
      saveScenarios(updated)
    }
  }

  // Format date
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Navigate to comparison view
  const handleCompare = () => {
    if (scenarios.length < 1) {
      alert('You need at least 1 scenario to compare with your current plan.')
      return
    }
    navigate('/scenarios/compare')
  }

  // Get summary info for current plan
  const getCurrentPlanSummary = () => {
    if (!currentPlan) return null

    const totalIncome = currentPlan.income?.incomeStreams?.reduce((sum, stream) =>
      sum + (Number(stream.annualIncome) || 0), 0) || 0

    const totalExpenses = currentPlan.expenses?.expenseCategories?.reduce((sum, cat) =>
      sum + (Number(cat.annualAmount) || 0), 0) || 0

    return {
      income: totalIncome,
      expenses: totalExpenses,
      gap: totalIncome - totalExpenses
    }
  }

  const summary = getCurrentPlanSummary()

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Scenarios</h1>
        <p className="text-gray-600">
          Create and compare different financial scenarios to make better decisions
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={handleCloneCurrentPlan}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Clone Current Plan
        </button>
        <button
          onClick={handleCreateBlank}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Create Blank Scenario
        </button>
        {scenarios.length >= 1 && (
          <button
            onClick={handleCompare}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Compare Scenarios
          </button>
        )}
      </div>

      {/* Current Plan Card */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Current Plan</h2>
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Your Active Financial Plan</h3>
              <p className="text-gray-600 text-sm mb-3">
                This is your current plan (managed via Profile, Income, Expenses, Investments modules)
              </p>
              {summary && (
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-600">Annual Income:</span>
                    <span className="ml-2 font-semibold">${summary.income.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Annual Expenses:</span>
                    <span className="ml-2 font-semibold">${summary.expenses.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Annual Gap:</span>
                    <span className={`ml-2 font-semibold ${summary.gap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${summary.gap.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-3 py-1 text-sm bg-white border border-blue-300 rounded hover:bg-blue-50"
              >
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scenarios List */}
      <div>
        <h2 className="text-xl font-semibold mb-3">
          Alternative Scenarios ({scenarios.length})
        </h2>

        {scenarios.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">
              No alternative scenarios yet. Create your first scenario to start comparing options.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleCloneCurrentPlan}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Clone Current Plan
              </button>
              <button
                onClick={handleCreateBlank}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Start from Scratch
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {scenarios.map((scenario) => {
              // Get quick summary of scenario
              const scenarioIncome = scenario.data?.income?.incomeStreams?.reduce((sum, stream) =>
                sum + (Number(stream.annualIncome) || 0), 0) || 0
              const scenarioExpenses = scenario.data?.expenses?.expenseCategories?.reduce((sum, cat) =>
                sum + (Number(cat.annualAmount) || 0), 0) || 0

              return (
                <div
                  key={scenario.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        {scenario.name}
                      </h3>
                      {scenario.description && (
                        <p className="text-gray-600 text-sm mb-2">
                          {scenario.description}
                        </p>
                      )}
                      <div className="flex gap-4 text-xs text-gray-500 mb-2">
                        <span>Created: {formatDate(scenario.createdAt)}</span>
                        <span>Modified: {formatDate(scenario.modifiedAt)}</span>
                      </div>

                      {/* Quick Summary */}
                      <div className="flex gap-4 text-sm mt-2">
                        <span className="text-gray-600">
                          Income: <span className="font-medium">${scenarioIncome.toLocaleString()}</span>
                        </span>
                        <span className="text-gray-600">
                          Expenses: <span className="font-medium">${scenarioExpenses.toLocaleString()}</span>
                        </span>
                        <span className="text-gray-600">
                          Gap: <span className={`font-medium ${(scenarioIncome - scenarioExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${(scenarioIncome - scenarioExpenses).toLocaleString()}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => navigate(`/scenarios/${scenario.id}/edit`)}
                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(scenario.id)}
                        className="px-3 py-1 text-sm bg-white border border-red-300 text-red-600 rounded hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Tips */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">How It Works</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Your <strong>Current Plan</strong> is what you build in the main modules (Profile, Income, Expenses, etc.)</li>
          <li>• <strong>Clone Current Plan</strong> to create a scenario based on your current data</li>
          <li>• <strong>Create Blank Scenario</strong> to start from scratch (e.g., model a completely different career path)</li>
          <li>• Edit scenarios to model different life choices (new job, new location, lifestyle changes)</li>
          <li>• <strong>Compare</strong> scenarios side-by-side to see which option is financially better</li>
        </ul>
      </div>
    </div>
  )
}

export default ScenarioManager
