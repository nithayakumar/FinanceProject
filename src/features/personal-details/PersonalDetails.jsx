import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../../core'
import { validatePersonalDetails } from './PersonalDetails.calc'
import { getAvailableStates, getCountryForState, initializeTaxLadders } from '../taxes/csvTaxLadders'
import SplitLayout from '../../shared/components/SplitLayout'

function PersonalDetails() {
  const navigate = useNavigate()
  const [availableStates, setAvailableStates] = useState(['California'])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [errors, setErrors] = useState({})

  // Initialize state directly from storage to avoid race conditions
  const [data, setData] = useState(() => {
    const saved = storage.load('profile')
    if (saved) {
      // Ensure country is set if not already
      if (!saved.country && saved.location) {
        saved.country = getCountryForState(saved.location) || 'USA'
      }
      return saved
    }
    return {
      location: 'California',
      country: 'USA',
      filingStatus: 'Single',
      age: '',
      retirementAge: '',
      currentCash: 0,
      targetCash: 10000,
      inflationRate: 2.7,
      currentSavings: 0
    }
  })

  // Filing status options
  const filingStatusOptions = [
    'Single',
    'Married Filing Jointly',
    'Married Filing Separately',
    'Head of Household'
  ]

  // Load available states on mount
  useEffect(() => {
    initializeTaxLadders()
    const states = getAvailableStates()
    setAvailableStates(states)
  }, [])

  // Auto-save effect
  const isFirstRender = useRef(true)
  useEffect(() => {
    // Skip validation/save on first render if you want, but saving immediately is usually fine 
    // since we loaded from storage. However, to be safe and avoid unnecessary writes:
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // Validate
    const validationErrors = validatePersonalDetails(data)

    // Custom validation: Max Cash >= Cash
    if (Number(data.targetCash) < Number(data.currentCash)) {
      validationErrors.targetCash = 'Max Cash must be greater than or equal to Cash'
    }

    setErrors(validationErrors)

    // Save to localStorage
    storage.save('profile', data)

    // Sync targetCash and currentSavings to Investments section
    const investmentsData = storage.load('investmentsDebt')
    if (investmentsData) {
      investmentsData.targetCash = data.targetCash
      storage.save('investmentsDebt', investmentsData)
    }
  }, [data])

  // Update country when location changes
  const handleLocationChange = (newLocation) => {
    const country = getCountryForState(newLocation) || 'USA'
    setData(prev => ({
      ...prev,
      location: newLocation,
      country: country
    }))
  }

  const handleChange = (field, value) => {
    setData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNextFeature = () => {
    navigate('/income')
  }

  const InputSection = (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">Personal Details</h1>

      <div className="space-y-4">
        {/* Row 1: Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <select
            value={data.location}
            onChange={(e) => handleLocationChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableStates.map(state => (
              <option key={state} value={state}>
                {state} ({getCountryForState(state)})
              </option>
            ))}
          </select>
        </div>

        {/* Row 2: Age & Retirement Age */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Age
            </label>
            <input
              type="number"
              value={data.age}
              onChange={(e) => handleChange('age', e.target.value ? Number(e.target.value) : '')}
              placeholder="30"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.age ? 'border-red-500' : 'border-gray-300'
                }`}
            />
            {errors.age && <p className="mt-1 text-xs text-red-600">{errors.age}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Retirement Age
            </label>
            <input
              type="number"
              value={data.retirementAge}
              onChange={(e) => handleChange('retirementAge', e.target.value ? Number(e.target.value) : '')}
              placeholder="65"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.retirementAge ? 'border-red-500' : 'border-gray-300'
                }`}
            />
            {errors.retirementAge && <p className="mt-1 text-xs text-red-600">{errors.retirementAge}</p>}
          </div>
        </div>

        {/* Advanced Section */}
        <div className="pt-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            <span className="mr-1">{showAdvanced ? '▼' : '▶'}</span>
            More detail (like cash, investments, and filing status)
          </button>

          {showAdvanced && (
            <div className="mt-3 pl-4 border-l-2 border-gray-100 space-y-4 animate-fadeIn">
              {/* Total Investments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Investments <span className="text-xs text-gray-500">(401k + stocks)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={data.currentSavings}
                    onChange={(e) => handleChange('currentSavings', e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="0"
                    className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.currentSavings ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                </div>
                {errors.currentSavings && <p className="mt-1 text-xs text-red-600">{errors.currentSavings}</p>}
              </div>

              {/* Cash & Max Cash */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cash
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={data.currentCash}
                      onChange={(e) => handleChange('currentCash', e.target.value === '' ? 0 : Number(e.target.value))}
                      placeholder="0"
                      className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.currentCash ? 'border-red-500' : 'border-gray-300'
                        }`}
                    />
                  </div>
                  {errors.currentCash && <p className="mt-1 text-xs text-red-600">{errors.currentCash}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Cash on Hand
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={data.targetCash}
                      onChange={(e) => handleChange('targetCash', e.target.value === '' ? 0 : Number(e.target.value))}
                      placeholder="10000"
                      className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.targetCash ? 'border-red-500' : 'border-gray-300'
                        }`}
                    />
                  </div>
                  {errors.targetCash && <p className="mt-1 text-xs text-red-600">{errors.targetCash}</p>}
                </div>
              </div>

              {/* Filing Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filing Status
                </label>
                <select
                  value={data.filingStatus}
                  onChange={(e) => handleChange('filingStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {filingStatusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Inflation Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inflation Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={data.inflationRate}
                  onChange={(e) => handleChange('inflationRate', e.target.value ? Number(e.target.value) : '')}
                  placeholder="2.7"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.inflationRate ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.inflationRate && <p className="mt-1 text-xs text-red-600">{errors.inflationRate}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const OutputSection = (
    <div className="h-full flex flex-col">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <h2 className="text-xl font-bold mb-4">Summary</h2>

        <SummaryRow label="Location" value={`${data.location} (${data.country || getCountryForState(data.location)})`} />
        <SummaryRow label="Age" value={data.age} />
        <SummaryRow label="Retirement Age" value={data.retirementAge} />

        {/* Advanced Summary Items */}
        {showAdvanced && (
          <>
            <div className="border-t border-gray-100 my-2"></div>
            <SummaryRow label="Total Investments" value={`$${Math.round(Number(data.currentSavings || 0)).toLocaleString()}`} />
            <SummaryRow label="Cash" value={`$${Math.round(data.currentCash || 0).toLocaleString()}`} />
            <SummaryRow label="Max Cash" value={`$${Math.round(data.targetCash || 0).toLocaleString()}`} />
            <SummaryRow label="Filing Status" value={data.filingStatus} />
            <SummaryRow label="Inflation Rate" value={`${data.inflationRate}%`} />
          </>
        )}

        {/* Years to Retirement */}
        <div className="pt-4 border-t border-gray-200">
          <SummaryRow
            label="Years to Retirement"
            value={data.retirementAge && data.age ? data.retirementAge - data.age : '-'}
            highlight
          />
        </div>
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={handleNextFeature}
          className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition shadow-sm"
        >
          Continue to Income →
        </button>
      </div>
    </div>
  )

  return <SplitLayout inputSection={InputSection} outputSection={OutputSection} />
}

function SummaryRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`font-medium ${highlight ? 'text-blue-600 text-lg' : 'text-gray-700'}`}>
        {label}
      </span>
      <span className={`${highlight ? 'text-blue-600 text-lg font-semibold' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  )
}

export default PersonalDetails
