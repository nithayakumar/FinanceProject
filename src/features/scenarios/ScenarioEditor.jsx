import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { storage } from '../../core'
import {
  INCOME_CONFIG,
  EXPENSE_CONFIG,
  INVESTMENTS_CONFIG,
  createDefaultIncomeStream,
  createDefaultExpenseCategories,
  createDefaultInvestment
} from '../../core'
import Income from '../income/Income'
import Expenses from '../expenses/Expenses'

/**
 * ScenarioEditor - Comprehensive scenario editor with tabbed interface
 *
 * NEW ARCHITECTURE:
 * - Edits complete scenario data (not overrides)
 * - Module-agnostic: Add new module? Just add a new tab
 * - Uses same structure as actual modules for consistency
 */

function ScenarioEditor() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [scenario, setScenario] = useState(null)
  const [activeTab, setActiveTab] = useState('basic')
  const [hasChanges, setHasChanges] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isNeverSaved, setIsNeverSaved] = useState(false)  // Track if user ever saved

  // Load scenario
  useEffect(() => {
    const scenarios = storage.load('scenarios') || []
    const found = scenarios.find(s => s.id === id)

    if (found) {
      setScenario(found)
      // If modifiedAt equals createdAt, this is a newly created scenario that was never saved
      setIsNeverSaved(found.modifiedAt === found.createdAt)
      console.log('📋 Loaded scenario for editing:', found)
    } else {
      alert('Scenario not found')
      navigate('/scenarios')
    }
  }, [id, navigate])

  // Handle scenario metadata change (name, description)
  const handleMetadataChange = (field, value) => {
    setScenario(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  // Handle data change (generic - works for any module)
  const handleDataChange = (module, updates) => {
    setScenario(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [module]: {
          ...prev.data[module],
          ...updates
        }
      }
    }))
    setHasChanges(true)
  }

  // Save scenario
  const handleSave = () => {
    const scenarios = storage.load('scenarios') || []
    const updated = scenarios.map(s =>
      s.id === id
        ? { ...scenario, modifiedAt: Date.now() }
        : s
    )

    storage.save('scenarios', updated)
    setHasChanges(false)
    setIsNeverSaved(false)  // User has now saved at least once
    console.log('💾 Saved scenario:', scenario)
    alert('Scenario saved successfully!')
  }

  // Save and exit
  const handleSaveAndExit = () => {
    handleSave()
    navigate('/scenarios')
  }

  // Delete scenario if it was never saved
  const deleteUnsavedScenario = () => {
    if (isNeverSaved) {
      const scenarios = storage.load('scenarios') || []
      const updated = scenarios.filter(s => s.id !== id)
      storage.save('scenarios', updated)
      console.log('🗑️ Deleted unsaved scenario:', id)
    }
  }

  // Request cancel
  const requestCancel = () => {
    if (hasChanges || isNeverSaved) {
      setShowCancelConfirm(true)
    } else {
      navigate('/scenarios')
    }
  }

  // Execute cancel after confirmation
  const executeCancel = () => {
    setShowCancelConfirm(false)
    deleteUnsavedScenario()  // Delete if never saved
    navigate('/scenarios')
  }

  if (!scenario) {
    return <div className="p-8">Loading...</div>
  }

  const data = scenario.data || {}

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Edit Scenario</h1>
        <p className="text-gray-600">
          Modify all aspects of this scenario - changes are independent of your Current Plan
        </p>
      </div>

      {/* Basic Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Scenario Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={scenario.name}
              onChange={(e) => handleMetadataChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="e.g., Texas Remote Job, Career Change to Tech"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={scenario.description || ''}
              onChange={(e) => handleMetadataChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              placeholder="Brief description..."
            />
          </div>
        </div>
      </div>

      {/* Tabbed Editor */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {[
            { id: 'basic', label: 'Profile & Basics' },
            { id: 'income', label: 'Income' },
            { id: 'expenses', label: 'Expenses' },
            { id: 'investments', label: 'Investments' },
            { id: 'json', label: 'Raw JSON' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile & Basics Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Profile & Retirement Settings</h3>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Location/City</label>
                  <input
                    type="text"
                    value={data.profile?.location || ''}
                    onChange={(e) => handleDataChange('profile', { location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="e.g., San Francisco, Austin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <select
                    value={data.profile?.state || ''}
                    onChange={(e) => handleDataChange('profile', { state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="">Select state...</option>
                    <option value="CA">California</option>
                    <option value="TX">Texas</option>
                    <option value="NY">New York</option>
                    <option value="FL">Florida</option>
                    <option value="WA">Washington</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Note: Only CA taxes currently supported</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Filing Status</label>
                  <select
                    value={data.profile?.filingStatus || 'Single'}
                    onChange={(e) => handleDataChange('profile', { filingStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="Single">Single</option>
                    <option value="Married Filing Jointly">Married Filing Jointly</option>
                    <option value="Married Filing Separately">Married Filing Separately</option>
                    <option value="Head of Household">Head of Household</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Current Age</label>
                  <input
                    type="number"
                    value={data.profile?.age || ''}
                    onChange={(e) => handleDataChange('profile', { age: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Retirement Age</label>
                  <input
                    type="number"
                    value={data.profile?.retirementAge || ''}
                    onChange={(e) => handleDataChange('profile', { retirementAge: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Inflation Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={data.profile?.inflationRate || 2.7}
                    onChange={(e) => handleDataChange('profile', { inflationRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Current Cash ($)</label>
                  <input
                    type="number"
                    value={data.profile?.currentCash || 0}
                    onChange={(e) => handleDataChange('profile', { currentCash: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Target Cash ($)</label>
                  <input
                    type="number"
                    value={data.profile?.targetCash || 0}
                    onChange={(e) => handleDataChange('profile', { targetCash: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Current Savings ($)</label>
                  <input
                    type="number"
                    value={data.profile?.currentSavings || 0}
                    onChange={(e) => handleDataChange('profile', { currentSavings: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Income Tab */}
          {activeTab === 'income' && (
            <Income
              embedded
              value={data.income}
              onChange={(newData) => handleDataChange('income', newData)}
              profileData={data.profile}
            />
          )}

          {/* Expenses Tab */}
          {activeTab === 'expenses' && (
            <Expenses
              embedded
              value={data.expenses}
              onChange={(newData) => handleDataChange('expenses', newData)}
              profileData={data.profile}
            />
          )}

          {/* Investments Tab */}
          {activeTab === 'investments' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Investments & Cash</h3>

              <div className="mb-6">
                <h4 className="font-medium mb-3">Cash Reserves</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Current Cash ($)</label>
                    <input
                      type="number"
                      value={data.investmentsDebt?.currentCash || 0}
                      onChange={(e) => handleDataChange('investmentsDebt', {
                        ...data.investmentsDebt,
                        currentCash: Number(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Target Cash ($)</label>
                    <input
                      type="number"
                      value={data.investmentsDebt?.targetCash || 0}
                      onChange={(e) => handleDataChange('investmentsDebt', {
                        ...data.investmentsDebt,
                        targetCash: Number(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium mb-3">401(k) Account</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Current Value ($)</label>
                    <input
                      type="number"
                      value={data.investmentsDebt?.retirement401k?.currentValue || 0}
                      onChange={(e) => handleDataChange('investmentsDebt', {
                        ...data.investmentsDebt,
                        retirement401k: {
                          ...data.investmentsDebt?.retirement401k,
                          currentValue: Number(e.target.value)
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Growth Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={data.investmentsDebt?.retirement401k?.growthRate || 7}
                      onChange={(e) => handleDataChange('investmentsDebt', {
                        ...data.investmentsDebt,
                        retirement401k: {
                          ...data.investmentsDebt?.retirement401k,
                          growthRate: Number(e.target.value)
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Company Contribution ($)</label>
                    <input
                      type="number"
                      value={data.investmentsDebt?.retirement401k?.companyContribution || 0}
                      onChange={(e) => handleDataChange('investmentsDebt', {
                        ...data.investmentsDebt,
                        retirement401k: {
                          ...data.investmentsDebt?.retirement401k,
                          companyContribution: Number(e.target.value)
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Investment Accounts <span className="text-sm text-gray-500 font-normal">(max {INVESTMENTS_CONFIG.MAX_INVESTMENTS})</span></h4>
                  {(data.investmentsDebt?.investments?.length || 0) < INVESTMENTS_CONFIG.MAX_INVESTMENTS && (
                    <button
                      onClick={() => {
                        const currentInvestments = data.investmentsDebt?.investments || []
                        const newInvestment = createDefaultInvestment(currentInvestments.length + 1, 0, 0)
                        const updated = [...currentInvestments, newInvestment]
                        handleDataChange('investmentsDebt', {
                          ...data.investmentsDebt,
                          investments: updated
                        })
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      + Add Investment Account
                    </button>
                  )}
                </div>

                {(!data.investmentsDebt?.investments || data.investmentsDebt.investments.length === 0) ? (
                  <div className="text-center py-8 text-gray-500 border border-gray-200 rounded">
                    No investment accounts yet. Click "Add Investment Account" to create one.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.investmentsDebt.investments.map((investment, index) => (
                      <div key={investment.id || index} className="p-4 border border-gray-200 rounded">
                        <div className="grid grid-cols-5 gap-4 items-end">
                          <div>
                            <label className="block text-sm font-medium mb-1">Current Value ($)</label>
                            <input
                              type="number"
                              value={investment.currentValue || ''}
                              onChange={(e) => {
                                const updated = [...(data.investmentsDebt?.investments || [])]
                                updated[index] = { ...updated[index], currentValue: Number(e.target.value) }
                                handleDataChange('investmentsDebt', {
                                  ...data.investmentsDebt,
                                  investments: updated
                                })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Cost Basis ($)</label>
                            <input
                              type="number"
                              value={investment.costBasis || ''}
                              onChange={(e) => {
                                const updated = [...(data.investmentsDebt?.investments || [])]
                                updated[index] = { ...updated[index], costBasis: Number(e.target.value) }
                                handleDataChange('investmentsDebt', {
                                  ...data.investmentsDebt,
                                  investments: updated
                                })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Growth Rate (%)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={investment.growthRate || INVESTMENTS_CONFIG.DEFAULT_GROWTH_RATE}
                              onChange={(e) => {
                                const updated = [...(data.investmentsDebt?.investments || [])]
                                updated[index] = { ...updated[index], growthRate: Number(e.target.value) }
                                handleDataChange('investmentsDebt', {
                                  ...data.investmentsDebt,
                                  investments: updated
                                })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Portfolio %</label>
                            <input
                              type="number"
                              step="0.01"
                              value={investment.portfolioPercent || 0}
                              onChange={(e) => {
                                const updated = [...(data.investmentsDebt?.investments || [])]
                                updated[index] = { ...updated[index], portfolioPercent: Number(e.target.value) }
                                handleDataChange('investmentsDebt', {
                                  ...data.investmentsDebt,
                                  investments: updated
                                })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              placeholder="33.33"
                            />
                          </div>
                          <div>
                            <button
                              onClick={() => {
                                if (confirm('Delete this investment account?')) {
                                  const updated = data.investmentsDebt.investments.filter((_, i) => i !== index)
                                  handleDataChange('investmentsDebt', {
                                    ...data.investmentsDebt,
                                    investments: updated
                                  })
                                }
                              }}
                              className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Raw JSON Tab */}
          {activeTab === 'json' && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Raw JSON Editor</h3>
                <p className="text-sm text-gray-600">
                  Advanced: Edit the complete scenario data structure. Be careful - invalid JSON will cause errors.
                </p>
              </div>
              <textarea
                value={JSON.stringify(data, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    setScenario(prev => ({ ...prev, data: parsed }))
                    setHasChanges(true)
                  } catch (err) {
                    // Invalid JSON - don't update
                    console.error('Invalid JSON:', err)
                  }
                }}
                className="w-full h-96 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                style={{ fontFamily: 'monospace' }}
              />
              <p className="text-xs text-gray-500 mt-2">
                Tip: Copy this JSON to backup your scenario, or paste in JSON from another scenario
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Save
        </button>
        <button
          onClick={handleSaveAndExit}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Save & Exit
        </button>
        <button
          onClick={requestCancel}
          className="px-6 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        {hasChanges && (
          <span className="flex items-center text-sm text-amber-600">
            ⚠️ Unsaved changes
          </span>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-amber-600">
              {isNeverSaved ? 'Discard New Scenario?' : 'Unsaved Changes'}
            </h3>
            <p className="text-gray-700 mb-6">
              {isNeverSaved
                ? 'This scenario has never been saved. Are you sure you want to discard it?'
                : 'You have unsaved changes. Are you sure you want to leave without saving?'
              }
              <br /><br />
              {isNeverSaved
                ? 'The scenario will be permanently deleted.'
                : 'Your changes will be lost.'
              }
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Keep Editing
              </button>
              <button
                onClick={executeCancel}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScenarioEditor
