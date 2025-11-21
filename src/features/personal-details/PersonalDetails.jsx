import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../../core'
import { validatePersonalDetails } from './PersonalDetails.calc'
import { getAvailableStates, getCountryForState, initializeTaxLadders } from '../taxes/csvTaxLadders'

function PersonalDetails() {
  const navigate = useNavigate()
  const [view, setView] = useState('input') // 'input' or 'output'
  const [availableStates, setAvailableStates] = useState(['California'])
  const [data, setData] = useState({
    location: 'California',
    country: 'USA',
    filingStatus: 'Single',
    age: '',
    retirementAge: '',
    currentCash: 40000,
    targetCash: 60000,
    inflationRate: 2.7,
    currentSavings: ''
  })
  const [errors, setErrors] = useState({})
  const [isSaved, setIsSaved] = useState(false)

  // Filing status options
  const filingStatusOptions = [
    'Single',
    'Married Filing Jointly',
    'Married Filing Separately',
    'Head of Household'
  ]

  // Load saved data and available states on mount
  useEffect(() => {
    // Initialize tax ladders and get available states
    initializeTaxLadders()
    const states = getAvailableStates()
    setAvailableStates(states)

    const saved = storage.load('profile')
    if (saved) {
      // Ensure country is set if not already
      if (!saved.country && saved.location) {
        saved.country = getCountryForState(saved.location) || 'USA'
      }
      setData(saved)
      setIsSaved(true)
      console.log('📋 Loaded saved profile:', saved)
    }
  }, [])

  // Update country when location changes
  const handleLocationChange = (newLocation) => {
    const country = getCountryForState(newLocation) || 'USA'
    setData(prev => ({
      ...prev,
      location: newLocation,
      country: country
    }))
    setIsSaved(false)
  }

  const handleChange = (field, value) => {
    setData(prev => ({
      ...prev,
      [field]: value
    }))
    // Mark as not saved when user makes changes
    setIsSaved(false)
    // Clear error for this field when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleContinue = () => {
    console.group('💾 Saving Personal Details')
    console.log('Data:', data)

    // Validate
    const validationErrors = validatePersonalDetails(data)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      console.error('Validation errors:', validationErrors)
      console.groupEnd()
      return
    }

    // Get old savings BEFORE saving new profile
    const oldSavings = storage.load('profile')?.currentSavings || 0
    const newSavings = data.currentSavings

    // Save to localStorage
    storage.save('profile', data)

    // Sync targetCash and currentSavings to Investments section
    const investmentsData = storage.load('investmentsDebt')
    if (investmentsData) {
      // Sync targetCash
      investmentsData.targetCash = data.targetCash

      // If currentSavings changed and there's investment data, update proportionally
      if (oldSavings !== newSavings && oldSavings > 0) {
        // Calculate current non-cash total (401k + investments)
        const current401k = investmentsData.retirement401k?.currentValue || 0
        const currentInvestments = investmentsData.investments?.reduce((sum, inv) => sum + (inv.currentValue || 0), 0) || 0
        const currentNonCashTotal = current401k + currentInvestments

        if (currentNonCashTotal > 0) {
          // Calculate the scale factor
          const scaleFactor = newSavings / currentNonCashTotal

          // Update 401k proportionally
          if (investmentsData.retirement401k) {
            investmentsData.retirement401k.currentValue = Math.round(current401k * scaleFactor)
          }

          // Update each investment proportionally
          if (investmentsData.investments) {
            investmentsData.investments = investmentsData.investments.map(inv => ({
              ...inv,
              currentValue: Math.round((inv.currentValue || 0) * scaleFactor)
            }))
          }

          console.log(`✅ Proportionally updated non-cash savings from $${currentNonCashTotal.toLocaleString()} to $${newSavings.toLocaleString()}`)
        }
      }

      storage.save('investmentsDebt', investmentsData)
      console.log('✅ Synced targetCash and savings to Investments section')
    }

    setIsSaved(true)

    // Switch to output view
    setView('output')
    console.log('✅ Saved and switched to output view')
    console.groupEnd()
  }

  const handleEdit = () => {
    setView('input')
  }

  const handleNextFeature = () => {
    navigate('/income')
  }

  // Input View
  if (view === 'input') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-1">Personal Details</h1>

        {/* Save Status Banner - Compact */}
        {isSaved ? (
          <div className="mb-4 bg-green-50 border border-green-200 rounded px-3 py-2 flex items-center text-sm">
            <span className="text-green-600 mr-2">✅</span>
            <span className="text-green-900 font-medium">Saved</span>
          </div>
        ) : (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 flex items-center text-sm">
            <span className="text-yellow-600 mr-2">⚠️</span>
            <span className="text-yellow-900 font-medium">Not saved</span>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
          {/* Row 1: Location & Filing Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                value={data.location}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableStates.map(state => (
                  <option key={state} value={state}>
                    {state} ({getCountryForState(state)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filing Status
              </label>
              <select
                value={data.filingStatus}
                onChange={(e) => handleChange('filingStatus', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {filingStatusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Age & Retirement Age */}
          <div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  value={data.age}
                  onChange={(e) => handleChange('age', e.target.value ? Number(e.target.value) : '')}
                  placeholder="30"
                  className={`w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.age ? 'border-red-500' : 'border-gray-300'
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
                  className={`w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.retirementAge ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.retirementAge && <p className="mt-1 text-xs text-red-600">{errors.retirementAge}</p>}
              </div>
            </div>

            {/* Working Years Remaining - Compact */}
            {data.age && data.retirementAge && data.retirementAge > data.age && (
              <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm">
                <span className="font-medium text-blue-900">
                  {data.retirementAge - data.age} working years ahead
                </span>
                <span className="text-blue-700 ml-2">
                  (Age {data.age} → {data.retirementAge})
                </span>
              </div>
            )}
          </div>

          {/* Row 3: Cash */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Cash
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1.5 text-gray-500">$</span>
                <input
                  type="number"
                  value={data.currentCash}
                  onChange={(e) => handleChange('currentCash', e.target.value ? Number(e.target.value) : '')}
                  placeholder="40000"
                  className={`w-full pl-8 pr-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.currentCash ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.currentCash && <p className="mt-1 text-xs text-red-600">{errors.currentCash}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Cash
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1.5 text-gray-500">$</span>
                <input
                  type="number"
                  value={data.targetCash}
                  onChange={(e) => handleChange('targetCash', e.target.value ? Number(e.target.value) : '')}
                  placeholder="60000"
                  className={`w-full pl-8 pr-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.targetCash ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.targetCash && <p className="mt-1 text-xs text-red-600">{errors.targetCash}</p>}
            </div>
          </div>

          {/* Row 4: Investments & Inflation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Investments <span className="text-xs text-gray-500">(401k + stocks)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1.5 text-gray-500">$</span>
                <input
                  type="number"
                  value={data.currentSavings}
                  onChange={(e) => handleChange('currentSavings', e.target.value ? Number(e.target.value) : '')}
                  placeholder="600000"
                  className={`w-full pl-8 pr-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.currentSavings ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                → This populates your Investments & Debt page
              </p>
              {errors.currentSavings && <p className="mt-1 text-xs text-red-600">{errors.currentSavings}</p>}
            </div>

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
                className={`w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.inflationRate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.inflationRate && <p className="mt-1 text-xs text-red-600">{errors.inflationRate}</p>}
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="w-full bg-blue-600 text-white py-2.5 rounded-md font-medium hover:bg-blue-700 transition"
          >
            Continue →
          </button>
        </div>
      </div>
    )
  }

  // Output View
  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Personal Details Summary</h1>
          <p className="text-gray-600">Review your information</p>
        </div>
        <button
          onClick={handleEdit}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
        >
          Edit
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <SummaryRow label="Location" value={`${data.location} (${data.country || getCountryForState(data.location)})`} />
        <SummaryRow label="Filing Status" value={data.filingStatus} />
        <SummaryRow label="Age" value={data.age} />
        <SummaryRow label="Retirement Age" value={data.retirementAge} />
        <SummaryRow label="Current Cash" value={`$${Math.round(data.currentCash).toLocaleString()}`} />
        <SummaryRow label="Target Cash on Hand" value={`$${Math.round(data.targetCash).toLocaleString()}`} />
        <SummaryRow label="Total Investments" value={`$${Math.round(Number(data.currentSavings)).toLocaleString()}`} />
        <SummaryRow label="Inflation Rate" value={`${data.inflationRate}%`} />

        {/* Years to Retirement */}
        <div className="pt-4 border-t border-gray-200">
          <SummaryRow
            label="Years to Retirement"
            value={data.retirementAge - data.age}
            highlight
          />
        </div>
      </div>

      <button
        onClick={handleNextFeature}
        className="w-full mt-6 bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition"
      >
        Continue to Income →
      </button>
    </div>
  )
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
