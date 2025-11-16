import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../../shared/storage'

function ScenarioManager() {
  const navigate = useNavigate()
  const [scenarios, setScenarios] = useState([])
  const [baseProfileName, setBaseProfileName] = useState('Current Plan')

  // Load scenarios from localStorage
  useEffect(() => {
    const saved = storage.load('scenarios') || []
    setScenarios(saved)

    // Get base profile name from personal details
    const profile = storage.load('profile') || {}
    if (profile.name) {
      setBaseProfileName(profile.name + "'s Plan")
    }

    console.log('📋 Loaded scenarios:', saved)
  }, [])

  // Save scenarios to localStorage
  const saveScenarios = (updatedScenarios) => {
    storage.save('scenarios', updatedScenarios)
    setScenarios(updatedScenarios)
    console.log('💾 Saved scenarios:', updatedScenarios)
  }

  // Clone current profile as new scenario
  const handleCloneCurrentProfile = () => {
    const newScenario = {
      id: `scenario-${Date.now()}`,
      name: 'Copy of ' + baseProfileName,
      description: 'Clone of current financial plan',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      overrides: {} // No overrides - exact copy
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

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Scenarios</h1>
        <p className="text-gray-600">
          Compare different financial scenarios to make better decisions
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => navigate('/scenarios/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create New Scenario
        </button>
        <button
          onClick={handleCloneCurrentProfile}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Clone Current Profile
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

      {/* Base Profile Card */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Base Profile</h2>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">{baseProfileName}</h3>
              <p className="text-gray-600 text-sm">
                Your current financial plan (used as baseline for comparisons)
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3 py-1 text-sm bg-white border border-blue-300 rounded hover:bg-blue-50"
            >
              View Details
            </button>
          </div>
        </div>
      </div>

      {/* Scenarios List */}
      <div>
        <h2 className="text-xl font-semibold mb-3">
          Saved Scenarios ({scenarios.length})
        </h2>

        {scenarios.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">
              No scenarios yet. Create your first scenario to start comparing options.
            </p>
            <button
              onClick={() => navigate('/scenarios/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Your First Scenario
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {scenarios.map((scenario) => (
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
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Created: {formatDate(scenario.createdAt)}</span>
                      <span>Modified: {formatDate(scenario.modifiedAt)}</span>
                    </div>

                    {/* Show which modules are overridden */}
                    {scenario.overrides && Object.keys(scenario.overrides).length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {Object.keys(scenario.overrides).map(module => (
                          <span
                            key={module}
                            className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
                          >
                            {module}
                          </span>
                        ))}
                      </div>
                    )}
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
            ))}
          </div>
        )}
      </div>

      {/* Quick Tips */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Quick Tips</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Create scenarios to compare job offers, locations, or lifestyle changes</li>
          <li>• Clone your current profile to make small adjustments</li>
          <li>• Use templates to quickly set up common scenarios like relocations</li>
          <li>• Compare multiple scenarios side-by-side to see differences</li>
        </ul>
      </div>
    </div>
  )
}

export default ScenarioManager
