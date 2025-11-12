import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storage } from '../../shared/storage'
import { validatePersonalDetails } from './PersonalDetails.calc'

function PersonalDetails() {
  const navigate = useNavigate()
  const [view, setView] = useState('input') // 'input' or 'output'
  const [data, setData] = useState({
    location: 'California',
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

  // Load saved data on mount
  useEffect(() => {
    const saved = storage.load('profile')
    if (saved) {
      setData(saved)
      setIsSaved(true)
      console.log('📋 Loaded saved profile:', saved)
    }
  }, [])

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

    // Save to localStorage
    storage.save('profile', data)
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
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2">Personal Details</h1>
        <p className="text-gray-600 mb-4">Tell us about yourself and your financial goals</p>

        {/* Save Status Banner */}
        {isSaved ? (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-green-600 text-xl mr-3">✅</span>
              <div>
                <p className="text-green-900 font-medium">Data Saved</p>
                <p className="text-green-700 text-sm">This section is ready for the Dashboard</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-yellow-600 text-xl mr-3">⚠️</span>
              <div>
                <p className="text-yellow-900 font-medium">Not Saved Yet</p>
                <p className="text-yellow-700 text-sm">Fill out the form and click "Continue" to save</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Where do you live?
            </label>
            <select
              value={data.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="California">California</option>
            </select>
          </div>

          {/* Filing Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How do you file?
            </label>
            <select
              value={data.filingStatus}
              onChange={(e) => handleChange('filingStatus', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Single">Single</option>
              <option value="Married Filing Jointly">Married Filing Jointly</option>
              <option value="Married Filing Separately">Married Filing Separately</option>
              <option value="Head of Household">Head of Household</option>
            </select>
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Age
            </label>
            <input
              type="number"
              value={data.age}
              onChange={(e) => handleChange('age', e.target.value ? Number(e.target.value) : '')}
              placeholder="Enter your age"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.age ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.age && <p className="mt-1 text-sm text-red-600">{errors.age}</p>}
          </div>

          {/* Retirement Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Retirement Age
            </label>
            <input
              type="number"
              value={data.retirementAge}
              onChange={(e) => handleChange('retirementAge', e.target.value ? Number(e.target.value) : '')}
              placeholder="When do you plan to retire?"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.retirementAge ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.retirementAge && <p className="mt-1 text-sm text-red-600">{errors.retirementAge}</p>}
          </div>

          {/* Current Cash */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Cash
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={data.currentCash}
                onChange={(e) => handleChange('currentCash', e.target.value ? Number(e.target.value) : '')}
                placeholder="40000"
                className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.currentCash ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.currentCash && <p className="mt-1 text-sm text-red-600">{errors.currentCash}</p>}
          </div>

          {/* Target Cash on Hand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Cash on Hand
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={data.targetCash}
                onChange={(e) => handleChange('targetCash', e.target.value ? Number(e.target.value) : '')}
                placeholder="60000"
                className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.targetCash ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.targetCash && <p className="mt-1 text-sm text-red-600">{errors.targetCash}</p>}
          </div>

          {/* Current Savings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Savings
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                value={data.currentSavings}
                onChange={(e) => handleChange('currentSavings', e.target.value ? Number(e.target.value) : '')}
                placeholder="Enter your current savings"
                className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.currentSavings ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.currentSavings && <p className="mt-1 text-sm text-red-600">{errors.currentSavings}</p>}
          </div>

          {/* Inflation Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inflation Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={data.inflationRate}
              onChange={(e) => handleChange('inflationRate', e.target.value ? Number(e.target.value) : '')}
              placeholder="2.7"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.inflationRate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.inflationRate && <p className="mt-1 text-sm text-red-600">{errors.inflationRate}</p>}
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition"
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
        <SummaryRow label="Location" value={data.location} />
        <SummaryRow label="Filing Status" value={data.filingStatus} />
        <SummaryRow label="Age" value={data.age} />
        <SummaryRow label="Retirement Age" value={data.retirementAge} />
        <SummaryRow label="Current Cash" value={`$${Math.round(data.currentCash).toLocaleString()}`} />
        <SummaryRow label="Target Cash on Hand" value={`$${Math.round(data.targetCash).toLocaleString()}`} />
        <SummaryRow label="Current Savings" value={`$${Math.round(Number(data.currentSavings)).toLocaleString()}`} />
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
