# Field Reference Guide

**Purpose**: Detailed technical blueprint for every field in every feature. Use this to rebuild features 10x faster.

**Last Updated**: 2025-11-09

---

## Table of Contents

1. [Personal Details](#personal-details)
2. [Income](#income-coming-soon)
3. [Expenses](#expenses-coming-soon)
4. [Taxes](#taxes-coming-soon)
5. [Investments & Debt](#investments--debt-coming-soon)
6. [Gap Calculations](#gap-calculations-coming-soon)
7. [Scenarios](#scenarios-coming-soon)

---

## Personal Details

### Overview

**Feature Type**: Input + Output (two-page pattern)
**localStorage Key**: `profile`
**File**: `src/features/personal-details/PersonalDetails.jsx`
**Validation**: `src/features/personal-details/PersonalDetails.calc.js`

### Data Structure

```javascript
{
  location: 'California',          // string
  filingStatus: 'Single',          // string (enum)
  age: 35,                         // number
  retirementAge: 65,               // number
  currentCash: 40000,              // number
  targetCash: 60000,               // number
  inflationRate: 2.7,              // number (percentage)
  currentSavings: 150000           // number
}
```

### Fields

---

#### 1. Location

**Purpose**: Determines which state tax rates to use in calculations

**Field Type**: Dropdown (select)

**Options**:
- `California` (only option for now)

**Default Value**: `'California'`

**Required**: Yes (always has value from dropdown)

**Validation**: None (dropdown ensures valid value)

**Used In**:
- Tax calculations (Phase 4)
- State-specific expense adjustments (future)

**Code Pattern**:
```jsx
<select
  value={data.location}
  onChange={(e) => handleChange('location', e.target.value)}
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <option value="California">California</option>
</select>
```

**Storage**: Saved to `localStorage.profile.location`

---

#### 2. Filing Status

**Purpose**: Determines tax brackets and deductions

**Field Type**: Dropdown (select)

**Options**:
- `Single`
- `Married Filing Jointly`
- `Married Filing Separately`
- `Head of Household`

**Default Value**: `'Single'`

**Required**: Yes (always has value from dropdown)

**Validation**: None (dropdown ensures valid value)

**Used In**:
- Federal tax calculations
- State tax calculations
- Standard deduction calculations

**Code Pattern**:
```jsx
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
```

**Storage**: Saved to `localStorage.profile.filingStatus`

---

#### 3. Age

**Purpose**: Current age, used to calculate years to retirement and timeline projections

**Field Type**: Number input

**Default Value**: `''` (empty string, user must enter)

**Required**: Yes

**Validation Rules**:
```javascript
if (!data.age || data.age <= 0) {
  errors.age = 'Age is required and must be greater than 0'
} else if (data.age > 120) {
  errors.age = 'Please enter a valid age'
}
```

**Used In**:
- Years to retirement calculation: `retirementAge - age`
- Timeline projections (Phase 8)
- Life milestone planning

**Calculations**:
```javascript
yearsToRetirement = data.retirementAge - data.age
```

**Code Pattern**:
```jsx
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
```

**Storage**: Saved to `localStorage.profile.age`

---

#### 4. Retirement Age

**Purpose**: Target retirement age, used for timeline planning

**Field Type**: Number input

**Default Value**: `''` (empty string, user must enter)

**Required**: Yes

**Validation Rules**:
```javascript
if (!data.retirementAge || data.retirementAge <= 0) {
  errors.retirementAge = 'Retirement age is required'
} else if (data.retirementAge <= data.age) {
  errors.retirementAge = 'Retirement age must be greater than current age'
} else if (data.retirementAge > 100) {
  errors.retirementAge = 'Please enter a realistic retirement age'
}
```

**Cross-field Validation**: Must be greater than `age`

**Used In**:
- Years to retirement calculation
- Retirement planning scenarios
- Timeline projections

**Code Pattern**:
```jsx
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
```

**Storage**: Saved to `localStorage.profile.retirementAge`

---

#### 5. Current Cash

**Purpose**: Amount of liquid cash currently on hand (emergency fund baseline)

**Field Type**: Number input with dollar sign ($) prefix

**Default Value**: `40000` (pre-filled)

**Required**: Yes

**Validation Rules**:
```javascript
if (data.currentCash === '' || data.currentCash < 0) {
  errors.currentCash = 'Current cash must be a positive number'
}
```

**Used In**:
- Emergency fund runway calculations
- Gap analysis (Phase 6)
- Cash flow planning

**Display Format**: `$40,000` (with thousand separators)

**Code Pattern**:
```jsx
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
```

**Output Display**:
```jsx
<SummaryRow label="Current Cash" value={`$${data.currentCash.toLocaleString()}`} />
```

**Storage**: Saved to `localStorage.profile.currentCash`

---

#### 6. Target Cash on Hand

**Purpose**: Desired emergency fund target (goal to reach)

**Field Type**: Number input with dollar sign ($) prefix

**Default Value**: `60000` (pre-filled)

**Required**: Yes

**Validation Rules**:
```javascript
if (data.targetCash === '' || data.targetCash < 0) {
  errors.targetCash = 'Target cash must be a positive number'
}
```

**Used In**:
- Gap analysis: how much more cash needed?
- Emergency fund progress tracking
- Financial health scoring

**Future Calculations**:
```javascript
cashGap = data.targetCash - data.currentCash
percentToGoal = (data.currentCash / data.targetCash) * 100
```

**Display Format**: `$60,000` (with thousand separators)

**Code Pattern**: Same as Current Cash (see above)

**Storage**: Saved to `localStorage.profile.targetCash`

---

#### 7. Current Savings

**Purpose**: Total savings/investments currently held (retirement accounts, brokerage, etc.)

**Field Type**: Number input with dollar sign ($) prefix

**Default Value**: `''` (empty string, user must enter)

**Required**: Yes

**Validation Rules**:
```javascript
if (data.currentSavings === '' || data.currentSavings < 0) {
  errors.currentSavings = 'Current savings is required and must be positive'
}
```

**Used In**:
- Net worth calculations
- Retirement readiness assessment
- Savings rate calculations
- Investment growth projections

**Display Format**: `$150,000` (with thousand separators)

**Code Pattern**: Same as Current Cash (see above)

**Storage**: Saved to `localStorage.profile.currentSavings`

---

#### 8. Inflation Rate (%)

**Purpose**: Expected annual inflation rate for long-term projections

**Field Type**: Number input (decimal allowed)

**Default Value**: `2.7` (pre-filled, recent US average)

**Required**: Yes

**Step**: `0.1` (allows decimal input)

**Validation Rules**:
```javascript
if (data.inflationRate === '' || data.inflationRate < 0) {
  errors.inflationRate = 'Inflation rate must be a positive number'
} else if (data.inflationRate > 100) {
  errors.inflationRate = 'Inflation rate seems too high'
}
```

**Used In**:
- Future value calculations
- Expense projections over time
- Real vs nominal returns
- Retirement planning

**Future Calculations**:
```javascript
futureValue = presentValue * Math.pow((1 + inflationRate/100), years)
realReturn = nominalReturn - inflationRate
```

**Display Format**: `2.7%`

**Code Pattern**:
```jsx
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
```

**Storage**: Saved to `localStorage.profile.inflationRate`

---

### Calculated Fields

#### Years to Retirement

**Formula**: `retirementAge - age`

**Example**: If age = 35 and retirementAge = 65, then `65 - 35 = 30 years`

**Display Location**: Output page, highlighted in blue

**Code**:
```jsx
<SummaryRow
  label="Years to Retirement"
  value={data.retirementAge - data.age}
  highlight
/>
```

---

## Component Patterns

### State Management Pattern

**For all features, use this state structure:**

```javascript
const [view, setView] = useState('input')  // 'input' or 'output'
const [data, setData] = useState({
  // field1: defaultValue1,
  // field2: defaultValue2,
  // ...
})
const [errors, setErrors] = useState({})
```

### Load from localStorage on Mount

```javascript
useEffect(() => {
  const saved = storage.load('storageKey')
  if (saved) {
    setData(saved)
    console.log('📋 Loaded saved data:', saved)
  }
}, [])
```

### Handle Field Change

```javascript
const handleChange = (field, value) => {
  setData(prev => ({
    ...prev,
    [field]: value
  }))
  // Clear error for this field when user types
  if (errors[field]) {
    setErrors(prev => ({ ...prev, [field]: '' }))
  }
}
```

### Save and Switch to Output

```javascript
const handleContinue = () => {
  console.group('💾 Saving Feature Name')
  console.log('Data:', data)

  // Validate
  const validationErrors = validateFunction(data)
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors)
    console.error('Validation errors:', validationErrors)
    console.groupEnd()
    return
  }

  // Save to localStorage
  storage.save('storageKey', data)

  // Switch to output view
  setView('output')
  console.log('✅ Saved and switched to output view')
  console.groupEnd()
}
```

### Input View Structure

```jsx
if (view === 'input') {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Feature Name</h1>
      <p className="text-gray-600 mb-8">Description</p>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Fields go here */}

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
```

### Output View Structure

```jsx
return (
  <div className="max-w-2xl mx-auto p-8">
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Feature Name Summary</h1>
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
      <SummaryRow label="Field 1" value={data.field1} />
      <SummaryRow label="Field 2" value={data.field2} />
      {/* More rows */}
    </div>

    <button
      onClick={handleNextFeature}
      className="w-full mt-6 bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition"
    >
      Continue to Next Feature →
    </button>
  </div>
)
```

### SummaryRow Component

```jsx
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
```

---

## Validation Patterns

### Validation File Structure

**File**: `FeatureName.calc.js`

```javascript
export function validateFeatureName(data) {
  console.group('✅ Validating Feature Name')
  console.log('Input:', data)

  const errors = {}

  // Validation logic here

  console.log('Errors found:', Object.keys(errors).length)
  if (Object.keys(errors).length > 0) {
    console.log('Validation errors:', errors)
  }
  console.groupEnd()

  return errors
}
```

### Common Validation Patterns

**Required number field:**
```javascript
if (!data.fieldName || data.fieldName <= 0) {
  errors.fieldName = 'Field name is required and must be greater than 0'
}
```

**Required positive number:**
```javascript
if (data.fieldName === '' || data.fieldName < 0) {
  errors.fieldName = 'Field name must be a positive number'
}
```

**Range validation:**
```javascript
if (data.fieldName > maxValue) {
  errors.fieldName = `Field name must be less than ${maxValue}`
}
```

**Cross-field validation:**
```javascript
if (data.field2 <= data.field1) {
  errors.field2 = 'Field 2 must be greater than Field 1'
}
```

---

## Input Field Patterns

### Text Input

```jsx
<input
  type="text"
  value={data.fieldName}
  onChange={(e) => handleChange('fieldName', e.target.value)}
  placeholder="Enter value"
  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    errors.fieldName ? 'border-red-500' : 'border-gray-300'
  }`}
/>
{errors.fieldName && <p className="mt-1 text-sm text-red-600">{errors.fieldName}</p>}
```

### Number Input

```jsx
<input
  type="number"
  value={data.fieldName}
  onChange={(e) => handleChange('fieldName', e.target.value ? Number(e.target.value) : '')}
  placeholder="Enter number"
  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    errors.fieldName ? 'border-red-500' : 'border-gray-300'
  }`}
/>
{errors.fieldName && <p className="mt-1 text-sm text-red-600">{errors.fieldName}</p>}
```

### Number Input with Decimal (e.g., percentages)

```jsx
<input
  type="number"
  step="0.1"
  value={data.fieldName}
  onChange={(e) => handleChange('fieldName', e.target.value ? Number(e.target.value) : '')}
  placeholder="0.0"
  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    errors.fieldName ? 'border-red-500' : 'border-gray-300'
  }`}
/>
```

### Currency Input (with $ prefix)

```jsx
<div className="relative">
  <span className="absolute left-3 top-2 text-gray-500">$</span>
  <input
    type="number"
    value={data.fieldName}
    onChange={(e) => handleChange('fieldName', e.target.value ? Number(e.target.value) : '')}
    placeholder="0"
    className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      errors.fieldName ? 'border-red-500' : 'border-gray-300'
    }`}
  />
</div>
{errors.fieldName && <p className="mt-1 text-sm text-red-600">{errors.fieldName}</p>}
```

### Dropdown/Select

```jsx
<select
  value={data.fieldName}
  onChange={(e) => handleChange('fieldName', e.target.value)}
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
  <option value="option3">Option 3</option>
</select>
```

---

## Display/Formatting Patterns

### Currency Display

```javascript
`$${value.toLocaleString()}`
// Example: 150000 → "$150,000"
```

### Percentage Display

```javascript
`${value}%`
// Example: 2.7 → "2.7%"
```

### Number with Decimal Places

```javascript
value.toFixed(2)
// Example: 3.456 → "3.46"
```

---

## localStorage Patterns

### Save Data

```javascript
storage.save('storageKey', data)
```

### Load Data

```javascript
const saved = storage.load('storageKey')
```

### Export All Data (for debugging)

```javascript
const allData = storage.exportAll()
console.log('All data:', allData)
```

---

## Navigation Patterns

### Navigate to Next Feature

```javascript
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()

const handleNextFeature = () => {
  navigate('/next-feature-path')
}
```

### Back to Input View

```javascript
const handleEdit = () => {
  setView('input')
}
```

---

## Console Logging Patterns

### Feature Save

```javascript
console.group('💾 Saving Feature Name')
console.log('Data:', data)
// ... save logic
console.log('✅ Saved successfully')
console.groupEnd()
```

### Validation

```javascript
console.group('✅ Validating Feature Name')
console.log('Input:', data)
// ... validation logic
console.log('Errors found:', Object.keys(errors).length)
console.groupEnd()
```

### Data Load

```javascript
console.log('📋 Loaded saved data:', data)
```

---

## Quick Reference: Build New Feature in 10 Steps

1. **Create component file**: `src/features/feature-name/FeatureName.jsx`
2. **Define data structure**: List all fields with types and defaults
3. **Add state**: `view`, `data`, `errors`
4. **Add useEffect**: Load from localStorage
5. **Create validation file**: `FeatureName.calc.js`
6. **Build input view**: Use field patterns from above
7. **Build output view**: Use SummaryRow components
8. **Add handleContinue**: Validate → Save → Switch view
9. **Add navigation**: Edit button and Next Feature button
10. **Test**: Try all validation cases, check localStorage

---

## Next Features (Coming Soon)

- Income
- Expenses
- Taxes
- Investments & Debt
- Gap Calculations
- Scenarios

Each will follow the same patterns documented above with feature-specific field logic.

---

**Last Updated**: 2025-11-09
**Version**: 1.0
