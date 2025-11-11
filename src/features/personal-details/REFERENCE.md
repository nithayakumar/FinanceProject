# Personal Details Module Reference

## Overview

The Personal Details module captures the core user profile information that drives all other calculations in the Finance Project. It establishes the foundation for retirement planning by defining the user's age, retirement timeline, tax filing status, and inflation assumptions.

## Field Reference

### Location
- **Type**: String (dropdown)
- **Options**: "California" (currently the only option)
- **Default**: "California"
- **Validation**: N/A (dropdown only)
- **Purpose**: Determines state tax calculations

### Filing Status
- **Type**: String (dropdown)
- **Options**:
  - "Single"
  - "Married Filing Jointly"
  - "Married Filing Separately"
  - "Head of Household"
- **Default**: "Single"
- **Validation**: N/A (dropdown only)
- **Purpose**: Determines federal and state tax bracket selections
- **Maps to tax calculations as**:
  - "Married Filing Jointly" → 'married'
  - "Married Filing Separately" → 'separate'
  - "Head of Household" → 'head'
  - "Single" → 'single'

### Age
- **Type**: Number
- **Default**: Empty (required)
- **Validation**:
  - Required, must be > 0
  - Must be ≤ 120
  - Error: "Age is required and must be greater than 0"
  - Error: "Please enter a valid age" (if > 120)
- **Purpose**: Starting point for all projections, used to calculate years to retirement

### Retirement Age
- **Type**: Number
- **Default**: Empty (required)
- **Validation**:
  - Required, must be > 0
  - Must be > Age
  - Must be ≤ 100
  - Error: "Retirement age is required"
  - Error: "Retirement age must be greater than current age"
  - Error: "Please enter a realistic retirement age" (if > 100)
- **Purpose**: Defines the planning horizon for all projections

### Current Cash
- **Type**: Number (currency)
- **Default**: 40000
- **Validation**:
  - Must be ≥ 0
  - Error: "Current cash must be a positive number"
- **Purpose**: Starting cash balance for gap/net worth calculations
- **Display**: Formatted with $ prefix and commas

### Target Cash on Hand
- **Type**: Number (currency)
- **Default**: 60000
- **Validation**:
  - Must be ≥ 0
  - Error: "Target cash must be a positive number"
- **Purpose**: Gap allocation logic fills cash to this target before investing
- **Display**: Formatted with $ prefix and commas

### Current Savings
- **Type**: Number (currency)
- **Default**: Empty (required)
- **Validation**:
  - Required, must be ≥ 0
  - Error: "Current savings is required and must be positive"
- **Purpose**: (Currently not used in calculations - may be for future features)
- **Display**: Formatted with $ prefix and commas

### Inflation Rate
- **Type**: Number (percentage)
- **Default**: 2.7
- **Step**: 0.1
- **Validation**:
  - Must be ≥ 0
  - Must be ≤ 100
  - Error: "Inflation rate must be a positive number"
  - Error: "Inflation rate seems too high" (if > 100)
- **Purpose**:
  - Used for present value calculations (discounting future values)
  - Used to inflate tax brackets each year
  - Applied to expense growth
- **Display**: Shown as percentage with % suffix

## Calculations

### Years to Retirement
```javascript
yearsToRetirement = retirementAge - age
```

**Example:**
- Age: 35
- Retirement Age: 65
- **Years to Retirement: 30**

This value determines:
- How many years of projections to calculate
- The timeline for all income, expense, tax, and investment projections
- When to stop contributions and calculate final net worth

### Inflation Multiplier (used in other modules)
```javascript
// For year N of projections
const yearsOfInflation = year - 1
const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsOfInflation)
```

**Example:**
- Inflation Rate: 2.7%
- Year 1: multiplier = 1.000 (no inflation)
- Year 5: multiplier = 1.111 (11.1% cumulative)
- Year 10: multiplier = 1.308 (30.8% cumulative)
- Year 30: multiplier = 2.237 (123.7% cumulative)

### Present Value Discount Factor (used in other modules)
```javascript
// Converts future dollars to today's dollars
const yearsFromNow = year - 1
const discountFactor = Math.pow(1 + inflationRate / 100, yearsFromNow)
const presentValue = nominalValue / discountFactor
```

**Example:**
- Future value in Year 10: $100,000
- Inflation Rate: 2.7%
- Discount Factor: 1.308
- **Present Value: $76,455** (today's dollars)

## Data Flow

### Inputs
User enters all fields through the UI

### Storage
All profile data saved to localStorage as 'profile' key:
```javascript
storage.save('profile', {
  location: 'California',
  filingStatus: 'Single',
  age: 35,
  retirementAge: 65,
  currentCash: 40000,
  targetCash: 60000,
  currentSavings: 50000,
  inflationRate: 2.7
})
```

### Outputs
- **yearsToRetirement**: Used by all projection modules to determine calculation horizon
- **inflationRate**: Used by:
  - Tax calculations (bracket inflation)
  - Expense calculations (present value discounting)
  - Income calculations (present value discounting)
  - Gap/Net Worth calculations (present value columns)
- **age & retirementAge**: Used to calculate absolute years in projections
- **currentCash & targetCash**: Used by Gap module for cash allocation logic
- **filingStatus**: Used by Tax module to select correct brackets
- **location**: Used by Tax module to select state (currently only California)

### Dependencies
**Consumed by:**
- Income module (yearsToRetirement, inflationRate)
- Expenses module (yearsToRetirement, inflationRate)
- Taxes module (filingStatus, location, inflationRate)
- Investments module (yearsToRetirement, inflationRate)
- Gap/Net Worth module (all fields)

## Validation Logic

All validation is performed in `PersonalDetails.calc.js` by the `validatePersonalDetails()` function:

```javascript
export function validatePersonalDetails(data) {
  const errors = {}

  // Age: required, 0 < age <= 120
  if (!data.age || data.age <= 0) {
    errors.age = 'Age is required and must be greater than 0'
  } else if (data.age > 120) {
    errors.age = 'Please enter a valid age'
  }

  // Retirement Age: required, must be > age, <= 100
  if (!data.retirementAge || data.retirementAge <= 0) {
    errors.retirementAge = 'Retirement age is required'
  } else if (data.retirementAge <= data.age) {
    errors.retirementAge = 'Retirement age must be greater than current age'
  } else if (data.retirementAge > 100) {
    errors.retirementAge = 'Please enter a realistic retirement age'
  }

  // Current Cash: must be >= 0
  if (data.currentCash === '' || data.currentCash < 0) {
    errors.currentCash = 'Current cash must be a positive number'
  }

  // Target Cash: must be >= 0
  if (data.targetCash === '' || data.targetCash < 0) {
    errors.targetCash = 'Target cash must be a positive number'
  }

  // Current Savings: required, must be >= 0
  if (data.currentSavings === '' || data.currentSavings < 0) {
    errors.currentSavings = 'Current savings is required and must be positive'
  }

  // Inflation Rate: must be 0 <= rate <= 100
  if (data.inflationRate === '' || data.inflationRate < 0) {
    errors.inflationRate = 'Inflation rate must be a positive number'
  } else if (data.inflationRate > 100) {
    errors.inflationRate = 'Inflation rate seems too high'
  }

  return errors
}
```

## UI Behavior

### Input View
- Form with all fields
- Real-time validation (errors clear on typing)
- Save status banner:
  - ✅ Green banner when data is saved
  - ⚠️ Yellow banner when data is not saved
- "Continue →" button validates, saves to localStorage, and switches to Output view

### Output View
- Summary of all entered values
- Years to Retirement calculated and highlighted
- "Edit" button returns to Input view
- "Continue to Income →" button navigates to next module

## Implementation Notes

### Save Status Tracking
The module uses `isSaved` state to track whether current data matches localStorage:
- Set to `true` when data is loaded from localStorage or successfully saved
- Set to `false` when user makes any change to form fields
- Visual indicator (green/yellow banner) shows save status

### Number Input Handling
All numeric inputs use a pattern to handle empty strings properly:
```javascript
onChange={(e) => handleChange('age', e.target.value ? Number(e.target.value) : '')}
```

This ensures:
- Empty fields remain empty (not converted to 0)
- Valid numbers are properly converted from strings
- Validation can distinguish between "not entered" and "entered 0"
