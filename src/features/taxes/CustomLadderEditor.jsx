import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from "../../core/storage"

function CustomLadderEditor() {
  const navigate = useNavigate()
  const [isSaved, setIsSaved] = useState(false)

  const [customLadder, setCustomLadder] = useState({
    name: 'Custom Region',
    enabled: false,
    incomeTax: [
      { min: 0, max: 50000, rate: 0.10 },
      { min: 50000, max: 100000, rate: 0.20 },
      { min: 100000, max: 99999999, rate: 0.30 }
    ],
    capitalGainsTax: [
      { min: 0, max: 50000, rate: 0.00 },
      { min: 50000, max: 500000, rate: 0.15 },
      { min: 500000, max: 99999999, rate: 0.20 }
    ],
    payrollTaxes: ['FICA Social Security', 'FICA Medicare']
  })

  const payrollTaxOptions = [
    { id: 'FICA Social Security', label: 'FICA Social Security (US)', description: '6.2% up to wage base' },
    { id: 'FICA Medicare', label: 'FICA Medicare (US)', description: '1.45% + 0.9% additional' },
    { id: 'CPP', label: 'CPP (Canada)', description: 'Canada Pension Plan' },
    { id: 'EI', label: 'EI (Canada)', description: 'Employment Insurance' }
  ]

  // Load saved custom ladder on mount
  useEffect(() => {
    const saved = storage.load('customTaxLadder')
    if (saved) {
      setCustomLadder(saved)
      setIsSaved(true)
      console.log('Loaded custom tax ladder:', saved)
    }
  }, [])

  const handleNameChange = (name) => {
    setCustomLadder(prev => ({ ...prev, name }))
    setIsSaved(false)
  }

  const handleEnabledChange = (enabled) => {
    setCustomLadder(prev => ({ ...prev, enabled }))
    setIsSaved(false)
  }

  const handleBracketChange = (ladderType, index, field, value) => {
    setCustomLadder(prev => {
      const newLadder = { ...prev }
      newLadder[ladderType] = [...prev[ladderType]]
      newLadder[ladderType][index] = {
        ...newLadder[ladderType][index],
        [field]: field === 'rate' ? parseFloat(value) / 100 : parseInt(value) || 0
      }
      return newLadder
    })
    setIsSaved(false)
  }

  const addBracket = (ladderType) => {
    setCustomLadder(prev => {
      const lastBracket = prev[ladderType][prev[ladderType].length - 1]
      const newMin = lastBracket ? lastBracket.max : 0
      return {
        ...prev,
        [ladderType]: [
          ...prev[ladderType],
          { min: newMin, max: 99999999, rate: 0.10 }
        ]
      }
    })
    setIsSaved(false)
  }

  const removeBracket = (ladderType, index) => {
    if (customLadder[ladderType].length <= 1) return
    setCustomLadder(prev => ({
      ...prev,
      [ladderType]: prev[ladderType].filter((_, i) => i !== index)
    }))
    setIsSaved(false)
  }

  const handlePayrollTaxToggle = (taxId) => {
    setCustomLadder(prev => {
      const newPayrollTaxes = prev.payrollTaxes.includes(taxId)
        ? prev.payrollTaxes.filter(id => id !== taxId)
        : [...prev.payrollTaxes, taxId]
      return { ...prev, payrollTaxes: newPayrollTaxes }
    })
    setIsSaved(false)
  }

  const handleSave = () => {
    // Validate and sort brackets
    const validateLadder = (brackets) => {
      return brackets
        .sort((a, b) => a.min - b.min)
        .map((bracket, index, arr) => ({
          ...bracket,
          max: index < arr.length - 1 ? arr[index + 1].min : 99999999
        }))
    }

    const validatedLadder = {
      ...customLadder,
      incomeTax: validateLadder(customLadder.incomeTax),
      capitalGainsTax: validateLadder(customLadder.capitalGainsTax)
    }

    storage.save('customTaxLadder', validatedLadder)
    setCustomLadder(validatedLadder)
    setIsSaved(true)
    console.log('Saved custom tax ladder:', validatedLadder)
  }

  const renderBracketEditor = (ladderType, title) => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <button
          onClick={() => addBracket(ladderType)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          + Add Bracket
        </button>
      </div>

      <div className="space-y-2">
        {customLadder[ladderType].map((bracket, index) => (
          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Min ($)</label>
              <input
                type="number"
                value={bracket.min}
                onChange={(e) => handleBracketChange(ladderType, index, 'min', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">Max ($)</label>
              <input
                type="number"
                value={bracket.max === 99999999 ? '' : bracket.max}
                onChange={(e) => handleBracketChange(ladderType, index, 'max', e.target.value || '99999999')}
                placeholder="No limit"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div className="w-20">
              <label className="text-xs text-gray-500">Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={(bracket.rate * 100).toFixed(1)}
                onChange={(e) => handleBracketChange(ladderType, index, 'rate', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <button
              onClick={() => removeBracket(ladderType, index)}
              className="mt-4 text-red-500 hover:text-red-700 disabled:text-gray-300"
              disabled={customLadder[ladderType].length <= 1}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Custom Tax Ladder</h1>
          <p className="text-gray-600">Create custom tax brackets for regions not in the system</p>
        </div>
        <button
          onClick={() => navigate('/taxes')}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Back to Taxes
        </button>
      </div>

      {/* Save Status */}
      {isSaved ? (
        <div className="mb-4 bg-green-50 border border-green-200 rounded px-3 py-2 flex items-center text-sm">
          <span className="text-green-600 mr-2">✓</span>
          <span className="text-green-900">Saved</span>
        </div>
      ) : (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 flex items-center text-sm">
          <span className="text-yellow-600 mr-2">!</span>
          <span className="text-yellow-900">Unsaved changes</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Name and Enable */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ladder Name
            </label>
            <input
              type="text"
              value={customLadder.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enable Custom Ladder
            </label>
            <div className="flex items-center mt-2">
              <button
                onClick={() => handleEnabledChange(!customLadder.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  customLadder.enabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    customLadder.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`ml-3 text-sm ${customLadder.enabled ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                {customLadder.enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {customLadder.enabled && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            When enabled, custom ladder will override state and federal tax calculations.
          </div>
        )}

        {/* Income Tax Ladder */}
        {renderBracketEditor('incomeTax', 'Income Tax Brackets')}

        {/* Capital Gains Tax Ladder */}
        {renderBracketEditor('capitalGainsTax', 'Capital Gains Tax Brackets')}

        {/* Payroll Taxes */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Payroll Taxes</h3>
          <p className="text-sm text-gray-600 mb-3">
            Select which payroll taxes to apply with this custom ladder
          </p>
          <div className="grid grid-cols-2 gap-3">
            {payrollTaxOptions.map(option => (
              <label
                key={option.id}
                className={`flex items-start p-3 border rounded cursor-pointer transition ${
                  customLadder.payrollTaxes.includes(option.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={customLadder.payrollTaxes.includes(option.id)}
                  onChange={() => handlePayrollTaxToggle(option.id)}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition"
        >
          Save Custom Ladder
        </button>
      </div>
    </div>
  )
}

export default CustomLadderEditor
