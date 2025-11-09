/**
 * Validation for Personal Details
 */

export function validatePersonalDetails(data) {
  console.group('✅ Validating Personal Details')
  console.log('Input:', data)

  const errors = {}

  // Age validation
  if (!data.age || data.age <= 0) {
    errors.age = 'Age is required and must be greater than 0'
  } else if (data.age > 120) {
    errors.age = 'Please enter a valid age'
  }

  // Retirement Age validation
  if (!data.retirementAge || data.retirementAge <= 0) {
    errors.retirementAge = 'Retirement age is required'
  } else if (data.retirementAge <= data.age) {
    errors.retirementAge = 'Retirement age must be greater than current age'
  } else if (data.retirementAge > 100) {
    errors.retirementAge = 'Please enter a realistic retirement age'
  }

  // Current Cash validation
  if (data.currentCash === '' || data.currentCash < 0) {
    errors.currentCash = 'Current cash must be a positive number'
  }

  // Target Cash validation
  if (data.targetCash === '' || data.targetCash < 0) {
    errors.targetCash = 'Target cash must be a positive number'
  }

  // Current Savings validation
  if (data.currentSavings === '' || data.currentSavings < 0) {
    errors.currentSavings = 'Current savings is required and must be positive'
  }

  // Inflation Rate validation
  if (data.inflationRate === '' || data.inflationRate < 0) {
    errors.inflationRate = 'Inflation rate must be a positive number'
  } else if (data.inflationRate > 100) {
    errors.inflationRate = 'Inflation rate seems too high'
  }

  console.log('Errors found:', Object.keys(errors).length)
  if (Object.keys(errors).length > 0) {
    console.log('Validation errors:', errors)
  }
  console.groupEnd()

  return errors
}
