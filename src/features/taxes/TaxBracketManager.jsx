import { useState, useEffect } from 'react'
import { storage } from '../../core'

// Default tax ladders
const DEFAULT_TAX_LADDERS = {
  states: {
    california: {
      id: 'california',
      name: 'California',
      salaryTax: {
        filingTypes: {
          single: {
            enabled: true,
            useInstead: 'single',
            brackets: [
              { rate: 1.0, min: 0, max: 10800 },
              { rate: 2.0, min: 10800, max: 25500 },
              { rate: 4.0, min: 25500, max: 40200 },
              { rate: 6.0, min: 40200, max: 55900 },
              { rate: 8.0, min: 55900, max: 70600 },
              { rate: 9.3, min: 70600, max: 360700 },
              { rate: 10.3, min: 360700, max: 432800 },
              { rate: 11.3, min: 432800, max: 721300 },
              { rate: 12.3, min: 721300, max: Infinity }
            ]
          },
          married: {
            enabled: true,
            useInstead: 'married',
            brackets: [
              { rate: 1.0, min: 0, max: 21500 },
              { rate: 2.0, min: 21500, max: 51000 },
              { rate: 4.0, min: 51000, max: 80500 },
              { rate: 6.0, min: 80500, max: 111700 },
              { rate: 8.0, min: 111700, max: 141200 },
              { rate: 9.3, min: 141200, max: 721300 },
              { rate: 10.3, min: 721300, max: 865600 },
              { rate: 11.3, min: 865600, max: 1400000 },
              { rate: 12.3, min: 1400000, max: Infinity }
            ]
          },
          separate: {
            enabled: false,
            useInstead: 'single',
            brackets: [{ rate: 0.0, min: 0, max: Infinity }]
          },
          head: {
            enabled: true,
            useInstead: 'head',
            brackets: [
              { rate: 1.0, min: 0, max: 21500 },
              { rate: 2.0, min: 21500, max: 51000 },
              { rate: 4.0, min: 51000, max: 65700 },
              { rate: 6.0, min: 65700, max: 81400 },
              { rate: 8.0, min: 81400, max: 96100 },
              { rate: 9.3, min: 96100, max: 490500 },
              { rate: 10.3, min: 490500, max: 588600 },
              { rate: 11.3, min: 588600, max: 981000 },
              { rate: 12.3, min: 981000, max: Infinity }
            ]
          }
        }
      },
      investmentTax: {
        filingTypes: {
          single: {
            enabled: true,
            useInstead: 'single',
            brackets: [
              { rate: 1.0, min: 0, max: 10800 },
              { rate: 2.0, min: 10800, max: 25500 },
              { rate: 4.0, min: 25500, max: 40200 },
              { rate: 6.0, min: 40200, max: 55900 },
              { rate: 8.0, min: 55900, max: 70600 },
              { rate: 9.3, min: 70600, max: 360700 },
              { rate: 10.3, min: 360700, max: 432800 },
              { rate: 11.3, min: 432800, max: 721300 },
              { rate: 12.3, min: 721300, max: Infinity }
            ]
          },
          married: {
            enabled: true,
            useInstead: 'married',
            brackets: [
              { rate: 1.0, min: 0, max: 21500 },
              { rate: 2.0, min: 21500, max: 51000 },
              { rate: 4.0, min: 51000, max: 80500 },
              { rate: 6.0, min: 80500, max: 111700 },
              { rate: 8.0, min: 111700, max: 141200 },
              { rate: 9.3, min: 141200, max: 721300 },
              { rate: 10.3, min: 721300, max: 865600 },
              { rate: 11.3, min: 865600, max: 1400000 },
              { rate: 12.3, min: 1400000, max: Infinity }
            ]
          },
          separate: {
            enabled: false,
            useInstead: 'single',
            brackets: [{ rate: 0.0, min: 0, max: Infinity }]
          },
          head: {
            enabled: true,
            useInstead: 'head',
            brackets: [
              { rate: 1.0, min: 0, max: 21500 },
              { rate: 2.0, min: 21500, max: 51000 },
              { rate: 4.0, min: 51000, max: 65700 },
              { rate: 6.0, min: 65700, max: 81400 },
              { rate: 8.0, min: 81400, max: 96100 },
              { rate: 9.3, min: 96100, max: 490500 },
              { rate: 10.3, min: 490500, max: 588600 },
              { rate: 11.3, min: 588600, max: 981000 },
              { rate: 12.3, min: 981000, max: Infinity }
            ]
          }
        }
      }
    }
  },
  countries: {
    usa: {
      id: 'usa',
      name: 'United States',
      salaryTax: {
        filingTypes: {
          single: {
            enabled: true,
            useInstead: 'single',
            brackets: [
              { rate: 10.0, min: 0, max: 11900 },
              { rate: 12.0, min: 11900, max: 48500 },
              { rate: 22.0, min: 48500, max: 103400 },
              { rate: 24.0, min: 103400, max: 197300 },
              { rate: 32.0, min: 197300, max: 250500 },
              { rate: 35.0, min: 250500, max: 626400 },
              { rate: 37.0, min: 626400, max: Infinity }
            ]
          },
          married: {
            enabled: true,
            useInstead: 'married',
            brackets: [
              { rate: 10.0, min: 0, max: 23900 },
              { rate: 12.0, min: 23900, max: 97000 },
              { rate: 22.0, min: 97000, max: 206700 },
              { rate: 24.0, min: 206700, max: 394600 },
              { rate: 32.0, min: 394600, max: 501100 },
              { rate: 35.0, min: 501100, max: 751600 },
              { rate: 37.0, min: 751600, max: Infinity }
            ]
          },
          separate: {
            enabled: true,
            useInstead: 'separate',
            brackets: [
              { rate: 10.0, min: 0, max: 11900 },
              { rate: 12.0, min: 11900, max: 48500 },
              { rate: 22.0, min: 48500, max: 103400 },
              { rate: 24.0, min: 103400, max: 197300 },
              { rate: 32.0, min: 197300, max: 250500 },
              { rate: 35.0, min: 250500, max: 375800 },
              { rate: 37.0, min: 375800, max: Infinity }
            ]
          },
          head: {
            enabled: true,
            useInstead: 'head',
            brackets: [
              { rate: 10.0, min: 0, max: 17000 },
              { rate: 12.0, min: 17000, max: 64900 },
              { rate: 22.0, min: 64900, max: 103400 },
              { rate: 24.0, min: 103400, max: 197300 },
              { rate: 32.0, min: 197300, max: 250500 },
              { rate: 35.0, min: 250500, max: 626400 },
              { rate: 37.0, min: 626400, max: Infinity }
            ]
          }
        }
      },
      investmentTax: {
        filingTypes: {
          single: {
            enabled: true,
            useInstead: 'single',
            brackets: [
              { rate: 0.0, min: 0, max: 47000 },
              { rate: 15.0, min: 47000, max: 518900 },
              { rate: 20.0, min: 518900, max: Infinity }
            ]
          },
          married: {
            enabled: true,
            useInstead: 'married',
            brackets: [
              { rate: 0.0, min: 0, max: 94100 },
              { rate: 15.0, min: 94100, max: 583800 },
              { rate: 20.0, min: 583800, max: Infinity }
            ]
          },
          separate: {
            enabled: true,
            useInstead: 'separate',
            brackets: [
              { rate: 0.0, min: 0, max: 47000 },
              { rate: 15.0, min: 47000, max: 291900 },
              { rate: 20.0, min: 291900, max: Infinity }
            ]
          },
          head: {
            enabled: true,
            useInstead: 'head',
            brackets: [
              { rate: 0.0, min: 0, max: 63000 },
              { rate: 15.0, min: 63000, max: 583800 },
              { rate: 20.0, min: 583800, max: Infinity }
            ]
          }
        }
      }
    }
  }
}

function TaxBracketManager() {
  const [ladders, setLadders] = useState(DEFAULT_TAX_LADDERS)
  const [topLevelTab, setTopLevelTab] = useState('states') // 'states' or 'countries'
  const [selectedJurisdiction, setSelectedJurisdiction] = useState(null)
  const [selectedFilingType, setSelectedFilingType] = useState('single')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newJurisdictionName, setNewJurisdictionName] = useState('')

  // Load saved ladders
  useEffect(() => {
    const saved = storage.load('taxLadders')
    if (saved) {
      setLadders(saved)
    }
  }, [])

  const saveLadders = (updatedLadders) => {
    setLadders(updatedLadders)
    storage.save('taxLadders', updatedLadders)
  }

  const addJurisdiction = () => {
    if (!newJurisdictionName.trim()) return

    const id = newJurisdictionName.toLowerCase().replace(/\s+/g, '-')
    const updated = JSON.parse(JSON.stringify(ladders))

    // Create default structure with 0% tax
    const newJurisdiction = {
      id,
      name: newJurisdictionName,
      salaryTax: {
        filingTypes: {
          single: { enabled: false, useInstead: 'single', brackets: [{ rate: 0.0, min: 0, max: Infinity }] },
          married: { enabled: false, useInstead: 'married', brackets: [{ rate: 0.0, min: 0, max: Infinity }] },
          separate: { enabled: false, useInstead: 'single', brackets: [{ rate: 0.0, min: 0, max: Infinity }] },
          head: { enabled: false, useInstead: 'head', brackets: [{ rate: 0.0, min: 0, max: Infinity }] }
        }
      },
      investmentTax: {
        filingTypes: {
          single: { enabled: false, useInstead: 'single', brackets: [{ rate: 0.0, min: 0, max: Infinity }] },
          married: { enabled: false, useInstead: 'married', brackets: [{ rate: 0.0, min: 0, max: Infinity }] },
          separate: { enabled: false, useInstead: 'single', brackets: [{ rate: 0.0, min: 0, max: Infinity }] },
          head: { enabled: false, useInstead: 'head', brackets: [{ rate: 0.0, min: 0, max: Infinity }] }
        }
      }
    }

    updated[topLevelTab][id] = newJurisdiction
    saveLadders(updated)
    setNewJurisdictionName('')
    setShowAddDialog(false)
    setSelectedJurisdiction(id)
  }

  const removeJurisdiction = (id) => {
    if (!confirm(`Are you sure you want to remove this ${topLevelTab === 'states' ? 'state' : 'country'}?`)) {
      return
    }

    const updated = JSON.parse(JSON.stringify(ladders))
    delete updated[topLevelTab][id]
    saveLadders(updated)

    if (selectedJurisdiction === id) {
      setSelectedJurisdiction(null)
    }
  }

  const toggleFilingType = (incomeType, filingType) => {
    const updated = JSON.parse(JSON.stringify(ladders))
    const jurisdiction = updated[topLevelTab][selectedJurisdiction]
    jurisdiction[incomeType].filingTypes[filingType].enabled = !jurisdiction[incomeType].filingTypes[filingType].enabled
    saveLadders(updated)
  }

  const updateUseInstead = (incomeType, filingType, useInsteadValue) => {
    const updated = JSON.parse(JSON.stringify(ladders))
    const jurisdiction = updated[topLevelTab][selectedJurisdiction]
    jurisdiction[incomeType].filingTypes[filingType].useInstead = useInsteadValue
    saveLadders(updated)
  }

  const updateBracket = (incomeType, filingType, bracketIndex, field, value) => {
    const updated = JSON.parse(JSON.stringify(ladders))
    const bracket = updated[topLevelTab][selectedJurisdiction][incomeType].filingTypes[filingType].brackets[bracketIndex]

    if (field === 'rate') {
      bracket.rate = parseFloat(value) || 0
    } else if (field === 'min') {
      bracket.min = parseInt(value) || 0
    } else if (field === 'max') {
      bracket.max = value === 'Infinity' || value === '' ? Infinity : parseInt(value) || 0
    }

    saveLadders(updated)
  }

  const addBracket = (incomeType, filingType) => {
    const updated = JSON.parse(JSON.stringify(ladders))
    const brackets = updated[topLevelTab][selectedJurisdiction][incomeType].filingTypes[filingType].brackets
    const lastBracket = brackets[brackets.length - 1]

    brackets.push({
      rate: 0,
      min: lastBracket.max === Infinity ? 0 : lastBracket.max,
      max: Infinity
    })

    saveLadders(updated)
  }

  const removeBracket = (incomeType, filingType, bracketIndex) => {
    const updated = JSON.parse(JSON.stringify(ladders))
    updated[topLevelTab][selectedJurisdiction][incomeType].filingTypes[filingType].brackets.splice(bracketIndex, 1)
    saveLadders(updated)
  }

  const resetToDefaults = () => {
    if (confirm('Reset all tax brackets to defaults? This cannot be undone.')) {
      saveLadders(DEFAULT_TAX_LADDERS)
      setSelectedJurisdiction(null)
    }
  }

  const allFilingTypes = ['single', 'married', 'separate', 'head']
  const currentJurisdictions = ladders[topLevelTab] || {}
  const currentJurisdiction = selectedJurisdiction ? currentJurisdictions[selectedJurisdiction] : null

  const renderIncomeTaxEditor = (incomeType) => {
    if (!currentJurisdiction) return null

    const taxData = currentJurisdiction[incomeType]
    const filingTypeData = taxData.filingTypes[selectedFilingType]
    const isEnabled = filingTypeData.enabled
    const brackets = filingTypeData.brackets
    const incomeLabel = incomeType === 'salaryTax' ? 'Salary' : 'Investment'

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">{incomeLabel} Income Tax</h3>

        {/* Filing Type Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          {allFilingTypes.map((filingType) => (
            <button
              key={filingType}
              onClick={() => setSelectedFilingType(filingType)}
              className={`px-4 py-2 text-sm font-medium transition ${
                selectedFilingType === filingType
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {filingType === 'single' ? 'Single' : filingType === 'married' ? 'Married' : filingType === 'separate' ? 'Separate' : 'Head'}
            </button>
          ))}
        </div>

        {/* Enable/Disable Toggle */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={() => toggleFilingType(incomeType, selectedFilingType)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">
              Enable {selectedFilingType === 'single' ? 'Single' : selectedFilingType === 'married' ? 'Married' : selectedFilingType === 'separate' ? 'Separate' : 'Head'} filing type
            </span>
          </label>
          {!isEnabled && (
            <div className="ml-6 flex items-center gap-3">
              <label className="text-sm text-gray-700">Use instead:</label>
              <select
                value={filingTypeData.useInstead || 'single'}
                onChange={(e) => updateUseInstead(incomeType, selectedFilingType, e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                {allFilingTypes.map((ft) => (
                  <option key={ft} value={ft}>
                    {ft === 'single' ? 'Single' : ft === 'married' ? 'Married' : ft === 'separate' ? 'Separate' : 'Head'}
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-500">
                (When user selects {selectedFilingType === 'single' ? 'Single' : selectedFilingType === 'married' ? 'Married' : selectedFilingType === 'separate' ? 'Separate' : 'Head'}, use this filing type instead)
              </span>
            </div>
          )}
        </div>

        {/* Brackets Table */}
        <div className={`overflow-x-auto ${!isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Rate (%)</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Min Income</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Max Income</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {brackets.map((bracket, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      step="0.1"
                      value={bracket.rate}
                      onChange={(e) => updateBracket(incomeType, selectedFilingType, index, 'rate', e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      disabled={!isEnabled}
                    />
                  </td>
                  <td className="py-3 px-2">
                    <div className="relative">
                      <span className="absolute left-2 top-1 text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        value={bracket.min}
                        onChange={(e) => updateBracket(incomeType, selectedFilingType, index, 'min', e.target.value)}
                        className="w-32 pl-6 pr-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={!isEnabled}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="relative">
                      {bracket.max === Infinity ? (
                        <span className="px-2 py-1 text-sm text-gray-600">∞ (No limit)</span>
                      ) : (
                        <>
                          <span className="absolute left-2 top-1 text-gray-500 text-sm">$</span>
                          <input
                            type="number"
                            value={bracket.max}
                            onChange={(e) => updateBracket(incomeType, selectedFilingType, index, 'max', e.target.value)}
                            className="w-32 pl-6 pr-2 py-1 border border-gray-300 rounded text-sm"
                            disabled={!isEnabled}
                          />
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    {brackets.length > 1 && (
                      <button
                        onClick={() => removeBracket(incomeType, selectedFilingType, index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                        disabled={!isEnabled}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isEnabled && (
          <button
            onClick={() => addBracket(incomeType, selectedFilingType)}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add Bracket
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Tax Bracket Manager</h1>
          <p className="text-gray-600">Manage tax brackets for states and countries</p>
        </div>
        <button
          onClick={resetToDefaults}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition text-sm"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Top Level Tabs */}
      <div className="flex gap-4 mb-6 border-b-2">
        <button
          onClick={() => {
            setTopLevelTab('states')
            setSelectedJurisdiction(null)
          }}
          className={`px-6 py-3 font-medium transition ${
            topLevelTab === 'states'
              ? 'border-b-2 border-blue-500 text-blue-600 -mb-0.5'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          States / Provinces
        </button>
        <button
          onClick={() => {
            setTopLevelTab('countries')
            setSelectedJurisdiction(null)
          }}
          className={`px-6 py-3 font-medium transition ${
            topLevelTab === 'countries'
              ? 'border-b-2 border-blue-500 text-blue-600 -mb-0.5'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Countries / Federal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar - Jurisdiction Selection */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-gray-700">
                {topLevelTab === 'states' ? 'States' : 'Countries'}
              </h2>
              <button
                onClick={() => setShowAddDialog(true)}
                className="text-blue-600 hover:text-blue-700 text-xs font-medium"
              >
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {Object.values(currentJurisdictions).map((jurisdiction) => (
                <div
                  key={jurisdiction.id}
                  className={`relative group rounded-md transition text-sm ${
                    selectedJurisdiction === jurisdiction.id
                      ? 'bg-blue-50 border border-blue-500 text-blue-700'
                      : 'border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() => setSelectedJurisdiction(jurisdiction.id)}
                    className="w-full text-left px-3 py-2"
                  >
                    {jurisdiction.name}
                  </button>
                  <button
                    onClick={() => removeJurisdiction(jurisdiction.id)}
                    className="absolute right-2 top-2 text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content - Tax Editors */}
        <div className="md:col-span-3">
          {currentJurisdiction ? (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{currentJurisdiction.name}</h2>
              </div>
              {renderIncomeTaxEditor('salaryTax')}
              {renderIncomeTaxEditor('investmentTax')}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                Select a {topLevelTab === 'states' ? 'state' : 'country'} from the left to edit tax brackets
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">
              Add {topLevelTab === 'states' ? 'State' : 'Country'}
            </h3>
            <input
              type="text"
              value={newJurisdictionName}
              onChange={(e) => setNewJurisdictionName(e.target.value)}
              placeholder={`Enter ${topLevelTab === 'states' ? 'state' : 'country'} name`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              onKeyDown={(e) => e.key === 'Enter' && addJurisdiction()}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAddDialog(false)
                  setNewJurisdictionName('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={addJurisdiction}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaxBracketManager
