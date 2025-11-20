import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../../core'
import { getCurrentPlanData } from './Scenario.calc'
import {
  INCOME_CONFIG,
  EXPENSE_CONFIG,
  createDefaultIncomeStream,
  createDefaultExpenseCategories,
  createDefault401k
} from '../../core'

function ScenarioManager() {
  const navigate = useNavigate()
  const [scenarios, setScenarios] = useState([])
  const [currentPlan, setCurrentPlan] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ show: false, type: null, scenarioId: null, scenarioName: null })

  // Load scenarios and current plan
  useEffect(() => {
    const saved = storage.load('scenarios') || []
    const current = getCurrentPlanData()

    // Ensure Current Plan is represented in scenarios array with isActive flag
    let activeScenario = saved.find(s => s.isActive)

    if (!activeScenario) {
      // Create active scenario entry for Current Plan if it doesn't exist
      activeScenario = {
        id: 'active-current-plan',
        name: 'Current Plan',
        description: 'Your active financial plan',
        isActive: true,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        data: {
          profile: JSON.parse(JSON.stringify(current.profile)),
          income: JSON.parse(JSON.stringify(current.income)),
          expenses: JSON.parse(JSON.stringify(current.expenses)),
          investmentsDebt: JSON.parse(JSON.stringify(current.investmentsDebt))
        }
      }
      const updated = [...saved, activeScenario]
      storage.save('scenarios', updated)
      setScenarios(updated)
      console.log('✨ Created active scenario entry for Current Plan')
    } else {
      // Sync localStorage data to active scenario
      activeScenario.data = {
        profile: JSON.parse(JSON.stringify(current.profile)),
        income: JSON.parse(JSON.stringify(current.income)),
        expenses: JSON.parse(JSON.stringify(current.expenses)),
        investmentsDebt: JSON.parse(JSON.stringify(current.investmentsDebt))
      }
      activeScenario.modifiedAt = Date.now()
      const updated = saved.map(s => s.id === activeScenario.id ? activeScenario : s)
      storage.save('scenarios', updated)
      setScenarios(updated)
      console.log('🔄 Synced Current Plan to active scenario')
    }

    setCurrentPlan(current)
    console.log('📋 Loaded scenarios with active tracking')
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
      isDraft: true,
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
    const defaultYearsToRetirement = 35  // 65 - 30
    const defaultInflationRate = EXPENSE_CONFIG.DEFAULT_GROWTH_RATE

    const newScenario = {
      id: `scenario-${Date.now()}`,
      name: 'New Scenario',
      description: '',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      isDraft: true,
      data: {
        profile: {
          location: 'California',
          state: 'California',
          country: 'USA',
          filingStatus: 'Single',
          age: 30,
          retirementAge: 65,
          inflationRate: defaultInflationRate,
          currentCash: 0,
          targetCash: 0,
          currentSavings: 0
        },
        income: {
          incomeStreams: [
            createDefaultIncomeStream(1, defaultYearsToRetirement, defaultInflationRate)
          ]
        },
        expenses: {
          expenseCategories: createDefaultExpenseCategories(defaultInflationRate),
          oneTimeExpenses: []
        },
        investmentsDebt: {
          currentCash: 0,
          targetCash: 0,
          retirement401k: createDefault401k(0),
          investments: []
        }
      }
    }

    const updated = [...scenarios, newScenario]
    saveScenarios(updated)
    navigate(`/scenarios/${newScenario.id}/edit`)
  }

  // Request delete confirmation
  const requestDelete = (scenarioId) => {
    const scenario = scenarios.find(s => s.id === scenarioId)

    // Prevent deleting active scenario
    if (scenario?.isActive) {
      alert('Cannot delete the active Current Plan.\n\nTo remove this plan, first promote a different scenario to make it active.')
      return
    }

    setConfirmDialog({
      show: true,
      type: 'delete',
      scenarioId,
      scenarioName: scenario?.name || 'Unknown'
    })
  }

  // Actually delete scenario after confirmation
  const executeDelete = () => {
    console.log('🗑️ Executing delete for scenario:', confirmDialog.scenarioId)
    try {
      const scenario = scenarios.find(s => s.id === confirmDialog.scenarioId)

      // Safety check: don't delete active scenario
      if (scenario?.isActive) {
        alert('Cannot delete the active scenario')
        setConfirmDialog({ show: false, type: null, scenarioId: null, scenarioName: null })
        return
      }

      const updated = scenarios.filter(s => s.id !== confirmDialog.scenarioId)
      console.log('✂️ Filtered scenarios - Original count:', scenarios.length, '→ New count:', updated.length)
      saveScenarios(updated)
      console.log('✅ Delete successful!')
      setConfirmDialog({ show: false, type: null, scenarioId: null, scenarioName: null })
    } catch (error) {
      console.error('❌ Error deleting scenario:', error)
      alert(`Failed to delete scenario: ${error.message}`)
    }
  }

  // Request promote confirmation
  const requestPromote = (scenarioId) => {
    const scenario = scenarios.find(s => s.id === scenarioId)
    if (!scenario) {
      console.error('❌ Scenario not found!')
      alert('Error: Scenario not found')
      return
    }
    setConfirmDialog({
      show: true,
      type: 'promote',
      scenarioId,
      scenarioName: scenario.name
    })
  }

  // Actually promote scenario after confirmation
  const executePromote = () => {
    console.log('🚀 Executing promote for scenario:', confirmDialog.scenarioId)
    const scenarioToPromote = scenarios.find(s => s.id === confirmDialog.scenarioId)
    const currentActive = scenarios.find(s => s.isActive)

    if (!scenarioToPromote) {
      console.error('❌ Scenario not found!')
      alert('Error: Scenario not found')
      setConfirmDialog({ show: false, type: null, scenarioId: null, scenarioName: null })
      return
    }

    try {
      console.log('💾 Swapping active flags...')
      console.log('  Previous active:', currentActive?.name)
      console.log('  New active:', scenarioToPromote.name)

      // Update scenarios array: swap isActive flags
      const updated = scenarios.map(s => {
        if (s.id === scenarioToPromote.id) {
          // Make this scenario active
          return { ...s, isActive: true, modifiedAt: Date.now() }
        } else if (s.isActive) {
          // Deactivate previous active scenario (keep it in alternatives)
          return { ...s, isActive: false }
        }
        return s
      })

      // Save updated scenarios array
      saveScenarios(updated)

      // Copy promoted scenario data to localStorage (so modules can read it)
      storage.save('profile', scenarioToPromote.data.profile)
      storage.save('income', scenarioToPromote.data.income)
      storage.save('expenses', scenarioToPromote.data.expenses)
      storage.save('investmentsDebt', scenarioToPromote.data.investmentsDebt)

      console.log('✅ Promotion successful!')
      console.log('  Previous plan saved as alternative scenario')
      console.log('  New plan is now active')
      setConfirmDialog({ show: false, type: null, scenarioId: null, scenarioName: null })

      // Show success message and navigate
      alert(`"${scenarioToPromote.name}" is now your active Current Plan!\n\nYour previous plan has been saved as an alternative scenario.\n\nNavigating to Dashboard...`)
      navigate('/dashboard')
    } catch (error) {
      console.error('❌ Promotion failed:', error)
      alert(`Failed to promote scenario: ${error.message}`)
      setConfirmDialog({ show: false, type: null, scenarioId: null, scenarioName: null })
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
    if (alternativeScenarios.length < 1) {
      alert('You need at least 1 alternative scenario to compare with your current plan.')
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

  // Separate active and alternative scenarios
  const activeScenario = scenarios.find(s => s.isActive)
  const alternativeScenarios = scenarios.filter(s => !s.isActive)

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
        {alternativeScenarios.length >= 1 && (
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
          Alternative Scenarios ({alternativeScenarios.length})
        </h2>

        {alternativeScenarios.length === 0 ? (
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
            {alternativeScenarios.map((scenario) => {
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
                        onClick={() => requestPromote(scenario.id)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        title="Make this scenario your active Current Plan"
                      >
                        Make Active Plan
                      </button>
                      <button
                        onClick={() => navigate(`/scenarios/${scenario.id}/edit`)}
                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => requestDelete(scenario.id)}
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

      {/* Confirmation Dialog Modal */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            {confirmDialog.type === 'delete' && (
              <>
                <h3 className="text-xl font-bold mb-4 text-red-600">Delete Scenario?</h3>
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete <strong>"{confirmDialog.scenarioName}"</strong>?
                  <br /><br />
                  This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setConfirmDialog({ show: false, type: null, scenarioId: null, scenarioName: null })}
                    className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}

            {confirmDialog.type === 'promote' && (
              <>
                <h3 className="text-xl font-bold mb-4 text-green-600">Make Active Plan?</h3>
                <p className="text-gray-700 mb-6">
                  Make <strong>"{confirmDialog.scenarioName}"</strong> your active Current Plan?
                  <br /><br />
                  This will replace your current financial data in all modules (Profile, Income, Expenses, Investments).
                  <br /><br />
                  <span className="text-green-600 font-medium">
                    ✓ Your current plan will automatically be saved as an alternative scenario.
                  </span>
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setConfirmDialog({ show: false, type: null, scenarioId: null, scenarioName: null })}
                    className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executePromote}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Make Active Plan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ScenarioManager
