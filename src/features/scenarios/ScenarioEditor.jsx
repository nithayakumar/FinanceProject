import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { storage } from "../../core/storage"
import { getAvailableStates, getCountryForState, initializeTaxLadders } from '../taxes/csvTaxLadders'

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
  const [availableStates, setAvailableStates] = useState(['California'])

  // Load scenario
  useEffect(() => {
    const scenarios = storage.load('scenarios') || []
    const found = scenarios.find(s => s.id === id)

    if (found) {
      setScenario(found)
      console.log('📋 Loaded scenario for editing:', found)
    } else {
      alert('Scenario not found')
      navigate('/scenarios')
    }

    initializeTaxLadders()
    const states = getAvailableStates()
    if (states.length > 0) {
      setAvailableStates(states)
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

  const handleLocationChange = (newLocation) => {
    if (!newLocation) {
      handleDataChange('profile', { location: '', state: '', country: '' })
      return
    }
    const country = getCountryForState(newLocation) || 'USA'
    handleDataChange('profile', { location: newLocation, state: newLocation, country })
  }

  // Save scenario
  const handleSave = () => {
    const scenarios = storage.load('scenarios') || []
    const updatedScenario = { ...scenario, isDraft: false, modifiedAt: Date.now() }
    const updatedList = scenarios.map(s =>
      s.id === id ? updatedScenario : s
    )

    storage.save('scenarios', updatedList)
    setScenario(updatedScenario)
    setHasChanges(false)
    console.log('💾 Saved scenario:', updatedScenario)
    alert('Scenario saved successfully!')
  }

  // Save and exit
  const handleSaveAndExit = () => {
    handleSave()
    navigate('/scenarios')
  }

  // Request cancel
  const discardDraftScenario = () => {
    if (scenario?.isDraft) {
      const scenarios = storage.load('scenarios') || []
      const updated = scenarios.filter(s => s.id !== scenario.id)
      storage.save('scenarios', updated)
      console.log('🗑️ Discarded draft scenario:', scenario.id)
    }
  }

  const requestCancel = () => {
    if (scenario?.isDraft && !hasChanges) {
      discardDraftScenario()
      navigate('/scenarios')
      return
    }

    if (hasChanges) {
      setShowCancelConfirm(true)
    } else {
      navigate('/scenarios')
    }
  }

  // Execute cancel after confirmation
  const executeCancel = () => {
    setShowCancelConfirm(false)

    if (scenario?.isDraft) {
      discardDraftScenario()
    }

    navigate('/scenarios')
  }

  if (!scenario) {
    return <div className="p-8">Loading...</div>
  }

  const data = scenario.data || {}
  const profile = data.profile || {}
  const currentLocation = profile.location || ''
  const hasCustomLocation = currentLocation && !availableStates.includes(currentLocation)
  const inferredCountry = profile.country || (currentLocation ? getCountryForState(currentLocation) : '')

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
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <select
                    value={currentLocation}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="">Select location...</option>
                    {hasCustomLocation && (
                      <option value={currentLocation}>{currentLocation}</option>
                    )}
                    {availableStates.map(state => (
                      <option key={state} value={state}>
                        {state} ({getCountryForState(state)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Country</label>
                  <input
                    type="text"
                    value={inferredCountry || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50"
                  />
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
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Income Streams</h3>
                <button
                  onClick={() => {
                    const newStream = {
                      id: `stream-${Date.now()}`,
                      name: `Income Stream ${(data.income?.incomeStreams?.length || 0) + 1}`,
                      annualIncome: 0,
                      company401k: 0,
                      individual401k: 0,
                      equity: 0,
                      growthRate: 2.7,
                      endWorkYear: 30,
                      jumps: []
                    }
                    const updated = [...(data.income?.incomeStreams || []), newStream]
                    handleDataChange('income', { incomeStreams: updated })
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  + Add Income Stream
                </button>
              </div>

              {(!data.income?.incomeStreams || data.income.incomeStreams.length === 0) ? (
                <div className="text-center py-8 text-gray-500">
                  No income streams yet. Click "Add Income Stream" to create one.
                </div>
              ) : (
                data.income.incomeStreams.map((stream, index) => (
                  <div key={stream.id || index} className="mb-6 p-4 border border-gray-200 rounded relative">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">Stream Name</label>
                        <input
                          type="text"
                          value={stream.name || ''}
                          onChange={(e) => {
                            const updated = [...(data.income?.incomeStreams || [])]
                            updated[index] = { ...updated[index], name: e.target.value }
                            handleDataChange('income', { incomeStreams: updated })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                          placeholder={`Income Stream ${index + 1}`}
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Delete this income stream?')) {
                            const updated = data.income.incomeStreams.filter((_, i) => i !== index)
                            handleDataChange('income', { incomeStreams: updated })
                          }
                        }}
                        className="ml-3 mt-6 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Annual Salary ($)</label>
                        <input
                          type="number"
                          value={stream.annualIncome || ''}
                          onChange={(e) => {
                            const updated = [...(data.income?.incomeStreams || [])]
                            updated[index] = { ...updated[index], annualIncome: Number(e.target.value) }
                            handleDataChange('income', { incomeStreams: updated })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Equity ($)</label>
                        <input
                          type="number"
                          value={stream.equity || 0}
                          onChange={(e) => {
                            const updated = [...(data.income?.incomeStreams || [])]
                            updated[index] = { ...updated[index], equity: Number(e.target.value) }
                            handleDataChange('income', { incomeStreams: updated })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Growth Rate (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={stream.growthRate || 0}
                          onChange={(e) => {
                            const updated = [...(data.income?.incomeStreams || [])]
                            updated[index] = { ...updated[index], growthRate: Number(e.target.value) }
                            handleDataChange('income', { incomeStreams: updated })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Individual 401k ($)</label>
                        <input
                          type="number"
                          value={stream.individual401k || 0}
                          onChange={(e) => {
                            const updated = [...(data.income?.incomeStreams || [])]
                            updated[index] = { ...updated[index], individual401k: Number(e.target.value) }
                            handleDataChange('income', { incomeStreams: updated })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Company 401k ($)</label>
                        <input
                          type="number"
                          value={stream.company401k || 0}
                          onChange={(e) => {
                            const updated = [...(data.income?.incomeStreams || [])]
                            updated[index] = { ...updated[index], company401k: Number(e.target.value) }
                            handleDataChange('income', { incomeStreams: updated })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">End Work Year</label>
                        <input
                          type="number"
                          value={stream.endWorkYear || 30}
                          onChange={(e) => {
                            const updated = [...(data.income?.incomeStreams || [])]
                            updated[index] = { ...updated[index], endWorkYear: Number(e.target.value) }
                            handleDataChange('income', { incomeStreams: updated })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
              <p className="text-xs text-gray-500 mt-2">
                Tip: For advanced editing (jumps, multi-year changes), use the JSON tab
              </p>
            </div>
          )}

          {/* Expenses Tab */}
          {activeTab === 'expenses' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Expense Categories</h3>
                <button
                  onClick={() => {
                    const newCategory = {
                      id: `expense-${Date.now()}`,
                      category: `New Expense Category`,
                      annualAmount: 0,
                      growthRate: 2.7,
                      jumps: []
                    }
                    const updated = [...(data.expenses?.expenseCategories || []), newCategory]
                    handleDataChange('expenses', {
                      expenseCategories: updated,
                      oneTimeExpenses: data.expenses?.oneTimeExpenses || []
                    })
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  + Add Expense Category
                </button>
              </div>

              {(!data.expenses?.expenseCategories || data.expenses.expenseCategories.length === 0) ? (
                <div className="text-center py-8 text-gray-500">
                  No expense categories yet. Click "Add Expense Category" to create one.
                </div>
              ) : (
                <div className="space-y-4">
                  {data.expenses.expenseCategories.map((category, index) => (
                    <div key={category.id || index} className="p-4 border border-gray-200 rounded">
                      <div className="grid grid-cols-4 gap-4 items-end">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium mb-1">Category Name</label>
                          <input
                            type="text"
                            value={category.category || ''}
                            onChange={(e) => {
                              const updated = [...(data.expenses?.expenseCategories || [])]
                              updated[index] = { ...updated[index], category: e.target.value }
                              handleDataChange('expenses', {
                                expenseCategories: updated,
                                oneTimeExpenses: data.expenses?.oneTimeExpenses || []
                              })
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                            placeholder="e.g., Housing, Food, Transportation"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Annual Amount ($)</label>
                          <input
                            type="number"
                            value={category.annualAmount || ''}
                            onChange={(e) => {
                              const updated = [...(data.expenses?.expenseCategories || [])]
                              updated[index] = { ...updated[index], annualAmount: Number(e.target.value) }
                              handleDataChange('expenses', {
                                expenseCategories: updated,
                                oneTimeExpenses: data.expenses?.oneTimeExpenses || []
                              })
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${category.category}" expense category?`)) {
                                const updated = data.expenses.expenseCategories.filter((_, i) => i !== index)
                                handleDataChange('expenses', {
                                  expenseCategories: updated,
                                  oneTimeExpenses: data.expenses?.oneTimeExpenses || []
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
              <p className="text-xs text-gray-500 mt-4">
                Tip: For advanced expense editing (growth rate, jumps, one-time expenses), use the JSON tab
              </p>
            </div>
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
                  <h4 className="font-medium">Investment Accounts</h4>
                  <button
                    onClick={() => {
                      const newInvestment = {
                        id: `investment-${Date.now()}`,
                        currentValue: 0,
                        costBasis: 0,
                        growthRate: 7
                      }
                      const updated = [...(data.investmentsDebt?.investments || []), newInvestment]
                      handleDataChange('investmentsDebt', {
                        ...data.investmentsDebt,
                        investments: updated
                      })
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    + Add Investment Account
                  </button>
                </div>

                {(!data.investmentsDebt?.investments || data.investmentsDebt.investments.length === 0) ? (
                  <div className="text-center py-8 text-gray-500 border border-gray-200 rounded">
                    No investment accounts yet. Click "Add Investment Account" to create one.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.investmentsDebt.investments.map((investment, index) => (
                      <div key={investment.id || index} className="p-4 border border-gray-200 rounded">
                        <div className="grid grid-cols-4 gap-4 items-end">
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
                              className="w-full px-3 py-2 border border-gray-300 rounded"
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
                              className="w-full px-3 py-2 border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Growth Rate (%)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={investment.growthRate || 7}
                              onChange={(e) => {
                                const updated = [...(data.investmentsDebt?.investments || [])]
                                updated[index] = { ...updated[index], growthRate: Number(e.target.value) }
                                handleDataChange('investmentsDebt', {
                                  ...data.investmentsDebt,
                                  investments: updated
                                })
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded"
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
            <h3 className="text-xl font-bold mb-4 text-amber-600">Unsaved Changes</h3>
            <p className="text-gray-700 mb-6">
              You have unsaved changes. Are you sure you want to leave without saving?
              <br /><br />
              Your changes will be lost.
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
