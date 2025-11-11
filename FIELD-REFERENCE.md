# Field Reference Guide

> # ⚠️ DEPRECATED - DO NOT USE
>
> **This document is outdated and no longer maintained.**
>
> **→ Use the new module references instead**: [`/docs/modules/README.md`](./docs/modules/README.md)
>
> The new documentation includes:
> - Up-to-date field definitions with examples
> - Calculation formulas with worked examples
> - Recent implementation details (tax bracket inflation, precision fixes)
> - Data flow and dependencies
> - Common use cases
>
> Individual module references:
> - [Personal Details](./docs/modules/personal-details.md)
> - [Income](./docs/modules/income.md)
> - [Expenses](./docs/modules/expenses.md)
> - [Taxes](./docs/modules/taxes.md)
> - [Investments & Debt](./docs/modules/investments-debt.md)
> - [Gap/Net Worth](./docs/modules/gap-networth.md)

---

## ⬇️ OLD CONTENT BELOW (Preserved for reference only)

**Purpose**: Detailed technical blueprint for every field in every feature. Use this to rebuild features 10x faster.

**Last Updated**: 2025-11-10 (DEPRECATED - See above for new docs)

---

## Table of Contents

1. [Data Persistence (localStorage)](#data-persistence-localstorage)
2. [Personal Details](#personal-details)
3. [Income](#income)
4. [Expenses](#expenses-coming-soon)
5. [Taxes](#taxes-coming-soon)
6. [Investments & Debt](#investments--debt-coming-soon)
7. [Gap Calculations](#gap-calculations-coming-soon)
8. [Scenarios](#scenarios-coming-soon)

---

## Data Persistence (localStorage)

### Overview

**All app data is stored in the browser's localStorage** as JSON strings. This allows data to persist between sessions without requiring a backend server.

**Storage Utility**: `src/shared/storage.js`

### localStorage Keys

The app uses the following localStorage keys:

| Key | Feature | When Saved | Required For Dashboard |
|-----|---------|------------|----------------------|
| `profile` | Personal Details | On "Continue" button | ✅ Yes |
| `income` | Income | On "Calculate Projections" button | ✅ Yes |
| `expenses` | Expenses | On "Calculate Projections" button | ✅ Yes |
| `investmentsDebt` | Investments & Debt | On "Continue" button | ✅ Yes |
| `taxes` | Taxes | Auto-calculated on load | ❌ No |
| `taxLadders` | Tax Bracket Manager | On "Save Changes" button | ❌ No |

### Dashboard Requirements

The Dashboard requires specific fields to be present:

**1. Profile (`localStorage.profile`)**
- ✅ `currentAge` - Must be set
- ✅ `yearsToRetirement` - Must be set
- ❌ Other fields optional but recommended

**2. Income (`localStorage.income`)**
- ✅ `incomeStreams` - Array with at least 1 stream
- ✅ Each stream must have `annualIncome` set

**3. Expenses (`localStorage.expenses`)**
- ✅ `categories` - Array with at least 1 category
- ✅ Each category must have `baseAmount` set

**4. Investments (`localStorage.investmentsDebt`)**
- ✅ `currentCash` - Must be defined (can be 0)
- ✅ `targetCash` - Must be defined (can be 0)
- ❌ Investments array optional
- ❌ 401k optional

### Checking Dashboard Readiness

**Method 1: Browser DevTools**
1. Open browser DevTools (F12)
2. Go to "Application" or "Storage" tab
3. Expand "Local Storage" → `http://localhost:5173`
4. Check for keys: `profile`, `income`, `expenses`, `investmentsDebt`

**Method 2: Console**
```javascript
// Check what's stored
console.log('Profile:', localStorage.getItem('profile'))
console.log('Income:', localStorage.getItem('income'))
console.log('Expenses:', localStorage.getItem('expenses'))
console.log('Investments:', localStorage.getItem('investmentsDebt'))

// Or use the storage utility
import { storage } from './shared/storage'
console.log(storage.exportAll())
```

**Method 3: Dashboard Console Logs**
- Navigate to `/dashboard`
- Open browser console (F12 → Console)
- Look for "📊 Loading Dashboard Data" group
- Check which sections show as missing

### Data Structure Examples

**Profile** (`localStorage.profile`):
```javascript
{
  currentAge: 35,
  retirementAge: 65,
  yearsToRetirement: 30,  // Calculated: retirementAge - currentAge
  filingStatus: 'Single',
  location: 'California',
  inflationRate: 2.7
}
```

**Income** (`localStorage.income`):
```javascript
{
  incomeStreams: [
    {
      id: 'stream-1',
      name: 'Primary Job',
      annualIncome: 150000,
      individual401k: 23000,
      companyContribution: 5000,
      equity: 50000,
      growthRate: 3,
      endWorkYear: 30,
      jumps: [
        { id: 'jump-1', year: 5, jumpPercent: 7 }
      ]
    }
  ]
}
```

**Expenses** (`localStorage.expenses`):
```javascript
{
  categories: [
    {
      id: 'cat-1',
      name: 'Housing',
      baseAmount: 3000,
      inflationRate: 3.5,
      startYear: 1,
      endYear: 30,
      jumps: [
        { id: 'jump-1', year: 5, jumpPercent: 20 }
      ]
    }
  ]
}
```

**Investments** (`localStorage.investmentsDebt`):
```javascript
{
  currentCash: 40000,
  targetCash: 60000,
  retirement401k: {
    currentValue: 150000,
    growthRate: 8,
    companyContribution: 5000  // Auto-loaded from income
  },
  investments: [
    {
      id: 'inv-1',
      name: 'Investment 1',
      currentValue: 50000,
      growthRate: 7,
      portfolioPercent: 33.33
    }
  ]
}
```

### Troubleshooting

**Dashboard shows "Not Ready" but I completed all sections:**

1. **Check Browser Console** (F12 → Console)
   - Look for error messages
   - Check which sections are marked as missing

2. **Verify Each Section Was Saved**
   - Personal Details: Click "Continue" button (not just filling fields)
   - Income: Click "Calculate Income Projections →" button
   - Expenses: Click "Calculate Expense Projections →" button
   - Investments: Click "Continue" button

3. **Check localStorage Keys**
   - Verify all 4 keys exist and contain data
   - Use browser DevTools → Application → Local Storage

4. **Clear and Re-enter Data**
   ```javascript
   // In browser console
   localStorage.clear()
   // Then re-enter all data through the UI
   ```

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

## Income

### Overview

**Feature Type**: Input + Output (two-page pattern)
**localStorage Key**: `income`
**File**: `src/features/income/Income.jsx`
**Validation**: `src/features/income/Income.calc.js`

### Data Structure

```javascript
{
  incomeStreams: [
    {
      id: 'stream-1234567890',      // string (unique ID)
      name: 'Primary Job',           // string
      annualIncome: 150000,          // number
      company401k: 9000,             // number (dollar amount, not %)
      equity: 40000,                 // number (RSU value)
      growthRate: 3,                 // number (percentage)
      endWorkYear: 30,               // number (relative year)
      jumps: [                       // array of jumps for this stream
        {
          id: 'jump-1234567890',     // string (unique ID)
          year: 5,                   // number (relative year)
          jumpPercent: 7,            // number (percentage increase)
          description: 'Promotion'   // string
        }
        // ... multiple jumps allowed per stream
      ]
    }
    // ... up to 3 streams
  ]
}
```

### Projections Output Structure

**Generated by**: `calculateIncomeProjections()` in `Income.calc.js`
**Records**: 1,200 monthly rows (100 years)

```javascript
{
  projections: [
    {
      year: 1,                          // Relative year (1-100)
      month: 1,                         // Month (1-12)
      absoluteYear: 2025,               // Calendar year
      monthIndex: 0,                    // 0-1199

      // Nominal values (not adjusted for inflation)
      salaryNominal: 12500,
      equityNominal: 3333,
      company401kNominal: 750,
      totalCompNominal: 16583,

      // Present values (inflation-adjusted)
      salaryPV: 12500,
      equityPV: 3333,
      company401kPV: 750,
      totalCompPV: 16583,

      // Metadata
      appliedGrowthRate: 3.0,
      activeStreams: ['stream-1234567890']
    }
    // ... 1,199 more rows
  ],
  summary: {
    // Current year totals (all streams combined)
    currentYearCompNominal: 199000,
    currentYearCompPV: 199000,

    // Year 10 projections (all streams combined)
    year10CompNominal: 260000,
    year10CompPV: 190000,

    // Lifetime earnings (to retirement, all streams combined)
    lifetimeEarningsNominal: 8500000,
    lifetimeEarningsPV: 6200000,

    // Component breakdowns (all streams combined)
    totalSalaryNominal: 5000000,
    totalSalaryPV: 3700000,
    totalEquityNominal: 2000000,
    totalEquityPV: 1500000,
    total401kNominal: 1500000,
    total401kPV: 1000000,

    // Average growth
    averageAnnualGrowth: 3.2,

    // Milestones (from all streams)
    milestones: [
      {
        year: 5,
        label: 'Year 5: Primary Job - Promotion (+7%)',
        compNominal: 215000,
        compPV: 180000
      }
    ],

    // Per-stream summaries (NEW: for tabs feature)
    perStreamSummaries: [
      {
        streamId: 'stream-1234567890',
        streamName: 'Primary Job',
        currentYearCompNominal: 199000,
        currentYearCompPV: 199000,
        year10CompNominal: 260000,
        year10CompPV: 190000,
        lifetimeEarningsNominal: 8500000,
        lifetimeEarningsPV: 6200000,
        totalSalaryNominal: 5000000,
        totalSalaryPV: 3700000,
        totalEquityNominal: 2000000,
        totalEquityPV: 1500000,
        total401kNominal: 1500000,
        total401kPV: 1000000
      }
      // ... one object per income stream
    ]
  }
}
```

### Fields - Income Streams

---

#### Income Stream: ID

**Purpose**: Unique identifier for each income stream

**Field Type**: Auto-generated string

**Pattern**: `stream-${Date.now()}`

**Example**: `'stream-1730912345678'`

**Used In**:
- Tracking which streams are active
- Error message keys in validation
- Removing specific streams

**Code Pattern**:
```javascript
const newStream = {
  id: `stream-${Date.now()}`,
  // ... other fields
}
```

---

#### Income Stream: Name

**Purpose**: User-friendly label for the income stream

**Field Type**: Text input

**Default Value**: Auto-filled based on order (`'Primary Job'`, `'Secondary Job'`, `'Side Business'`)

**Required**: No (validation allows empty, uses default label)

**Validation**: None (text field, any value accepted)

**Used In**:
- Display headers in input form
- Output summaries

**Code Pattern**:
```jsx
<input
  type="text"
  value={stream.name}
  onChange={(e) => updateStream(stream.id, 'name', e.target.value)}
  placeholder="Job name"
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```

---

#### Income Stream: Annual Income

**Purpose**: Base salary/income per year before 401k and equity

**Field Type**: Number input with dollar sign ($) prefix

**Default Value**: `0`

**Required**: Yes

**Validation Rules**:
```javascript
if (stream.annualIncome === '' || stream.annualIncome < 0) {
  errors[`${stream.id}-annualIncome`] = 'Annual income must be a positive number'
}
```

**Used In**:
- Monthly salary calculations: `annualIncome / 12`
- Total comp calculations
- Weighted average growth rate
- Lifetime earnings projections

**Calculations**:
```javascript
// Apply growth over years
const yearsOfGrowth = year - 1
const growthMultiplier = Math.pow(1 + stream.growthRate / 100, yearsOfGrowth)

// Apply permanent jumps
const jumpMultiplier = streamMultipliers[stream.id]

// Calculate annual with growth and jumps
const annualSalary = stream.annualIncome * growthMultiplier * jumpMultiplier

// Convert to monthly
const monthlySalary = annualSalary / 12
```

**Display Format**: `$150,000`

**Code Pattern**:
```jsx
<div className="relative">
  <span className="absolute left-3 top-2 text-gray-500">$</span>
  <input
    type="number"
    value={stream.annualIncome}
    onChange={(e) => updateStream(stream.id, 'annualIncome', e.target.value ? Number(e.target.value) : '')}
    placeholder="0"
    className={`w-full pl-8 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      errors[`${stream.id}-annualIncome`] ? 'border-red-500' : 'border-gray-300'
    }`}
  />
</div>
{errors[`${stream.id}-annualIncome`] && (
  <p className="mt-1 text-sm text-red-600">{errors[`${stream.id}-annualIncome`]}</p>
)}
```

**Storage**: Saved to `localStorage.income.incomeStreams[].annualIncome`

---

#### Income Stream: Company 401k

**Purpose**: Annual employer 401k contribution (dollar amount, not percentage)

**Field Type**: Number input with dollar sign ($) prefix

**Default Value**: `0`

**Required**: Yes (can be 0)

**Validation Rules**:
```javascript
if (stream.company401k === '' || stream.company401k < 0) {
  errors[`${stream.id}-company401k`] = 'Company 401k must be a positive number or 0'
}
```

**⚠️ FUTURE ENHANCEMENT NOTE**: 401k contribution limits and automatic limit growth will be implemented in a future update. Currently, 401k contributions grow at the same rate as the income stream's growth rate. In the future:
- Annual 401k contribution limits will be tracked (e.g., $23,000 for 2024)
- Limits will grow annually based on IRS adjustments
- Employer contributions will be capped at these limits
- Catch-up contributions (age 50+) will be supported

**Used In**:
- Pre-tax retirement contribution tracking
- Total comp calculations
- Lifetime 401k contribution totals

**Calculations**: Same growth and jump logic as Annual Income (currently no limit enforcement)

**Display Format**: `$9,000`

**Code Pattern**: Same as Annual Income (see above)

**Storage**: Saved to `localStorage.income.incomeStreams[].company401k`

---

#### Income Stream: Equity

**Purpose**: Annual equity compensation value (RSUs, stock options, etc.)

**Field Type**: Number input with dollar sign ($) prefix

**Default Value**: `0`

**Required**: Yes (can be 0)

**Validation Rules**:
```javascript
if (stream.equity === '' || stream.equity < 0) {
  errors[`${stream.id}-equity`] = 'Equity must be a positive number or 0'
}
```

**Used In**:
- Total comp calculations
- Equity-specific summaries
- Component breakdown charts

**Calculations**: Same growth and jump logic as Annual Income

**Display Format**: `$40,000`

**Code Pattern**: Same as Annual Income (see above)

**Storage**: Saved to `localStorage.income.incomeStreams[].equity`

---

#### Income Stream: Growth Rate (%)

**Purpose**: Expected annual salary growth percentage for this income stream

**Field Type**: Number input (decimal allowed)

**Default Value**: `0`

**Required**: Yes

**Step**: `0.1` (allows decimal input)

**Validation Rules**:
```javascript
if (stream.growthRate === '' || stream.growthRate < 0) {
  errors[`${stream.id}-growthRate`] = 'Growth rate must be a positive number'
} else if (stream.growthRate > 50) {
  errors[`${stream.id}-growthRate`] = 'Growth rate seems unrealistic (> 50%)'
}
```

**Used In**:
- Yearly income compounding
- Weighted average growth calculation
- Long-term projections

**Calculations**:
```javascript
// Compound growth over years
const yearsOfGrowth = year - 1  // Year 1 has 0 years of growth
const growthMultiplier = Math.pow(1 + stream.growthRate / 100, yearsOfGrowth)

// Example: 3% growth for 5 years
// growthMultiplier = (1.03)^4 = 1.1255 (12.55% total growth)
```

**Display Format**: `3.0%`

**Code Pattern**:
```jsx
<input
  type="number"
  step="0.1"
  value={stream.growthRate}
  onChange={(e) => updateStream(stream.id, 'growthRate', e.target.value ? Number(e.target.value) : '')}
  placeholder="0"
  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    errors[`${stream.id}-growthRate`] ? 'border-red-500' : 'border-gray-300'
  }`}
/>
```

**Storage**: Saved to `localStorage.income.incomeStreams[].growthRate`

---

#### Income Stream: End Work Year

**Purpose**: Relative year when this income stream stops (retirement, job change, etc.)

**Field Type**: Number input

**Default Value**: Defaults to `yearsToRetirement` (from profile)

**Required**: Yes

**Max Value**: Cannot exceed retirement year

**Validation Rules**:
```javascript
if (stream.endWorkYear === '' || stream.endWorkYear <= 0) {
  errors[`${stream.id}-endWorkYear`] = 'End work year must be greater than 0'
} else if (stream.endWorkYear > yearsToRetirement) {
  errors[`${stream.id}-endWorkYear`] = `Cannot exceed retirement year (${yearsToRetirement})`
}
```

**Used In**:
- Determining which streams are active in each projection month
- Modeling scenarios like early retirement, side business duration, consulting gigs

**Calculations**:
```javascript
// Check if stream is still active
if (year <= stream.endWorkYear) {
  // Include this stream in calculations
  activeStreams.push(stream.id)
  // ... calculate income
}
```

**Example Scenarios**:
- Primary job until retirement: `endWorkYear = 30` (if 30 years to retirement)
- Side business for 10 years: `endWorkYear = 10`
- Consulting gig for 5 years: `endWorkYear = 5`

**Display Format**: `30 years`

**Code Pattern**:
```jsx
<input
  type="number"
  value={stream.endWorkYear}
  onChange={(e) => updateStream(stream.id, 'endWorkYear', e.target.value ? Number(e.target.value) : '')}
  placeholder={yearsToRetirement.toString()}
  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    errors[`${stream.id}-endWorkYear`] ? 'border-red-500' : 'border-gray-300'
  }`}
/>
<p className="text-xs text-gray-500 mt-1">Max: {yearsToRetirement} years (retirement)</p>
```

**Storage**: Saved to `localStorage.income.incomeStreams[].endWorkYear`

---

### Fields - Income Jumps (Per Stream)

Income jumps are defined within each income stream, allowing different streams to have different promotion/raise events.

---

#### Income Jump: ID

**Purpose**: Unique identifier for each income jump within a stream

**Field Type**: Auto-generated string

**Pattern**: `jump-${Date.now()}`

**Example**: `'jump-1730912345678'`

**Used In**: Removing specific jumps

**Code Pattern**:
```javascript
const newJump = {
  id: `jump-${Date.now()}`,
  // ... other fields
}
```

---

#### Income Jump: Year

**Purpose**: Relative year when the income jump occurs

**Field Type**: Number input

**Default Value**: `''` (empty, user must enter)

**Required**: No (jumps are optional)

**Validation**: None for jumps (they're optional events)

**Used In**:
- Determining when to apply permanent salary increases
- Milestone tracking in output summaries

**Calculations**:
```javascript
// Check if any jumps occur this year
const jumpThisYear = sortedJumps.find(j => j.year === year)
if (jumpThisYear && month === 1) {  // Apply jump in January
  const jumpMultiplier = 1 + (jumpPercent / 100)

  // Update all active stream multipliers permanently
  Object.keys(streamMultipliers).forEach(streamId => {
    streamMultipliers[streamId] *= jumpMultiplier
  })
}
```

**Example**: `5` means the jump happens in Year 5 (5 years from now)

**Display Format**: `Year 5`

**Code Pattern**:
```jsx
<input
  type="number"
  value={jump.year}
  onChange={(e) => updateJump(jump.id, 'year', e.target.value ? Number(e.target.value) : '')}
  placeholder="Year"
  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```

**Storage**: Saved to `localStorage.income.incomeStreams[].jumps[].year`

---

#### Income Jump: Jump Percent (%)

**Purpose**: Percentage increase applied to this specific income stream

**Field Type**: Number input (decimal allowed)

**Default Value**: `''` (empty, user must enter)

**Required**: No (jumps are optional)

**Step**: `0.1` (allows decimal input)

**Validation**: None for jumps (they're optional events)

**Important**: This is a PERMANENT increase, not one-time. Future years grow from the new higher base. Jumps only affect their specific income stream.

**Used In**:
- Permanent salary adjustments for specific streams (promotions, job changes, etc.)
- Milestone summaries

**Calculations**:
```javascript
// Jump is applied permanently to its specific stream only
const jumpMultiplier = 1 + (jumpPercent / 100)
streamMultipliers[streamId] *= jumpMultiplier

// Example: 7% jump in Year 5 for Primary Job
// Primary Job income from Year 5 onwards is 7% higher
// Other income streams are NOT affected
// Future growth compounds on this new higher base
```

**Example Scenarios**:
- `7%` = Promotion
- `15%` = Job change
- `20%` = Major promotion or career shift

**Display Format**: `+7%`

**Code Pattern**:
```jsx
<input
  type="number"
  step="0.1"
  value={jump.jumpPercent}
  onChange={(e) => updateJump(jump.id, 'jumpPercent', e.target.value ? Number(e.target.value) : '')}
  placeholder="%"
  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```

**Storage**: Saved to `localStorage.income.incomeStreams[].jumps[].jumpPercent`

---

#### Income Jump: Description

**Purpose**: User-friendly label for the income jump event

**Field Type**: Text input

**Default Value**: `''` (empty, user can optionally add)

**Required**: No

**Validation**: None

**Used In**:
- Milestone labels in output summaries (combined with stream name)
- Making projections more readable

**Display Format**: Shows in milestones as `"Year 5: Primary Job - Promotion (+7%)"`

**Code Pattern**:
```jsx
<input
  type="text"
  value={jump.description}
  onChange={(e) => updateJump(jump.id, 'description', e.target.value)}
  placeholder="Description (optional)"
  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```

**Storage**: Saved to `localStorage.income.incomeStreams[].jumps[].description`

---

### Calculated Fields & Outputs

---

#### Present Value Formula

**Purpose**: Convert future nominal dollars to today's dollars using inflation

**Formula**:
```javascript
const yearsFromNow = monthIndex / 12
const discountFactor = Math.pow(1 + inflationRate / 100, yearsFromNow)
const presentValue = nominalValue / discountFactor
```

**Example**:
- Nominal value in Year 10: $200,000
- Inflation rate: 2.7%
- Years from now: 10
- Discount factor: (1.027)^10 = 1.306
- Present value: $200,000 / 1.306 = $153,139

**Applied To**: All dollar fields (salary, equity, 401k, total comp)

**Used In**: All summary cards show both nominal and PV

---

#### Current Year Total Comp

**Purpose**: Total compensation for Year 1 (current year)

**Calculation**:
```javascript
const year1Months = projections.filter(p => p.year === 1)
const currentYearCompNominal = year1Months.reduce((sum, p) => sum + p.totalCompNominal, 0)
const currentYearCompPV = year1Months.reduce((sum, p) => sum + p.totalCompPV, 0)
```

**Display**: Card showing both values

**File**: Income.calc.js:202-204

---

#### Year 10 Projected Comp

**Purpose**: Total compensation projected for Year 10

**Calculation**:
```javascript
const year10Months = projections.filter(p => p.year === 10)
const year10CompNominal = year10Months.reduce((sum, p) => sum + p.totalCompNominal, 0)
const year10CompPV = year10Months.reduce((sum, p) => sum + p.totalCompPV, 0)
```

**Display**: Card showing both values with "In 10 Years" label

**File**: Income.calc.js:207-213

---

#### Lifetime Earnings

**Purpose**: Total earnings from now until retirement

**Calculation**:
```javascript
const retirementMonthIndex = yearsToRetirement * 12 - 1
const lifetimeMonths = projections.filter(p => p.monthIndex <= retirementMonthIndex)
const lifetimeEarningsNominal = lifetimeMonths.reduce((sum, p) => sum + p.totalCompNominal, 0)
const lifetimeEarningsPV = lifetimeMonths.reduce((sum, p) => sum + p.totalCompPV, 0)
```

**Display**: Large card showing both values

**File**: Income.calc.js:216-220

---

#### Component Breakdowns

**Purpose**: Show salary, equity, and 401k totals separately

**Calculation**:
```javascript
// Lifetime totals for each component
const totalSalaryNominal = lifetimeMonths.reduce((sum, p) => sum + p.salaryNominal, 0)
const totalSalaryPV = lifetimeMonths.reduce((sum, p) => sum + p.salaryPV, 0)

const totalEquityNominal = lifetimeMonths.reduce((sum, p) => sum + p.equityNominal, 0)
const totalEquityPV = lifetimeMonths.reduce((sum, p) => sum + p.equityPV, 0)

const total401kNominal = lifetimeMonths.reduce((sum, p) => sum + p.company401kNominal, 0)
const total401kPV = lifetimeMonths.reduce((sum, p) => sum + p.company401kPV, 0)
```

**Display**: Three separate cards for Salary, Equity, and 401k

**File**: Income.calc.js:223-230

---

#### Average Annual Growth

**Purpose**: Weighted average growth rate across all active income streams

**Calculation**:
```javascript
// Filter to active months up to retirement
const growthRates = projections
  .filter(p => p.year <= yearsToRetirement && p.appliedGrowthRate > 0)
  .map(p => p.appliedGrowthRate)

const averageAnnualGrowth = growthRates.length > 0
  ? growthRates.reduce((sum, r) => sum + r, 0) / growthRates.length
  : 0
```

**Display**: Percentage value in summary

**File**: Income.calc.js:233-238

---

#### Key Milestones

**Purpose**: Show income jump events with their impact

**Calculation**:
```javascript
const milestones = incomeJumps
  .filter(jump => jump.year && jump.jumpPercent)
  .map(jump => {
    const jumpYearMonths = projections.filter(p => p.year === jump.year)
    const compNominal = jumpYearMonths.reduce((sum, p) => sum + p.totalCompNominal, 0)
    const compPV = jumpYearMonths.reduce((sum, p) => sum + p.totalCompPV, 0)

    return {
      label: `Year ${jump.year}: ${jump.description || 'Income Jump'} (+${jump.jumpPercent}%)`,
      compNominal: Math.round(compNominal),
      compPV: Math.round(compPV)
    }
  })
  .filter(m => m !== null)
```

**Display**: List of milestone cards showing year, description, jump %, and resulting comp

**File**: Income.calc.js:241-257

---

### Dynamic UI Patterns

---

#### Add Income Stream

**Max Streams**: 3

**Code Pattern**:
```javascript
const addIncomeStream = () => {
  if (data.incomeStreams.length >= 3) {
    return  // Don't allow more than 3
  }

  const streamNumber = data.incomeStreams.length + 1
  const streamNames = ['Primary Job', 'Secondary Job', 'Side Business']

  const newStream = {
    id: `stream-${Date.now()}`,
    name: streamNames[streamNumber - 1],
    annualIncome: 0,
    company401k: 0,
    equity: 0,
    growthRate: 0,
    endWorkYear: yearsToRetirement,
    jumps: []
  }

  setData(prev => ({
    ...prev,
    incomeStreams: [...prev.incomeStreams, newStream]
  }))
}
```

**Button Display**:
```jsx
{data.incomeStreams.length < 3 && (
  <button
    onClick={addIncomeStream}
    className="text-blue-600 hover:text-blue-700 font-medium"
  >
    + Add Income Stream
  </button>
)}
```

---

#### Remove Income Stream

**Min Streams**: 1 (must keep at least one)

**Code Pattern**:
```javascript
const removeStream = (streamId) => {
  if (data.incomeStreams.length <= 1) {
    return  // Don't allow removing the last stream
  }

  setData(prev => ({
    ...prev,
    incomeStreams: prev.incomeStreams.filter(s => s.id !== streamId)
  }))

  // Clear related errors
  const updatedErrors = { ...errors }
  Object.keys(updatedErrors).forEach(key => {
    if (key.startsWith(streamId)) {
      delete updatedErrors[key]
    }
  })
  setErrors(updatedErrors)
}
```

**Button Display**:
```jsx
{data.incomeStreams.length > 1 && (
  <button
    onClick={() => removeStream(stream.id)}
    className="text-red-600 hover:text-red-700 text-sm"
  >
    Remove
  </button>
)}
```

---

#### Add Income Jump (Per Stream)

**Max Jumps**: Unlimited per stream

**Code Pattern**:
```javascript
const addIncomeJump = (streamId) => {
  const newJump = {
    id: `jump-${Date.now()}`,
    year: '',
    jumpPercent: '',
    description: ''
  }

  setData(prev => ({
    ...prev,
    incomeStreams: prev.incomeStreams.map(stream =>
      stream.id === streamId
        ? { ...stream, jumps: [...stream.jumps, newJump] }
        : stream
    )
  }))
}
```

---

#### Remove Income Jump (Per Stream)

**Min Jumps**: 0 (jumps are optional)

**Code Pattern**:
```javascript
const removeIncomeJump = (streamId, jumpId) => {
  setData(prev => ({
    ...prev,
    incomeStreams: prev.incomeStreams.map(stream =>
      stream.id === streamId
        ? { ...stream, jumps: stream.jumps.filter(j => j.id !== jumpId) }
        : stream
    )
  }))
}
```

---

#### Update Stream Field

**Code Pattern**:
```javascript
const updateStream = (streamId, field, value) => {
  setData(prev => ({
    ...prev,
    incomeStreams: prev.incomeStreams.map(stream =>
      stream.id === streamId
        ? { ...stream, [field]: value }
        : stream
    )
  }))

  // Clear error for this field
  const errorKey = `${streamId}-${field}`
  if (errors[errorKey]) {
    setErrors(prev => ({ ...prev, [errorKey]: '' }))
  }
}
```

---

#### Update Jump Field (Per Stream)

**Code Pattern**:
```javascript
const handleJumpChange = (streamId, jumpId, field, value) => {
  setData(prev => ({
    ...prev,
    incomeStreams: prev.incomeStreams.map(stream =>
      stream.id === streamId
        ? {
            ...stream,
            jumps: stream.jumps.map(jump =>
              jump.id === jumpId
                ? { ...jump, [field]: value }
                : jump
            )
          }
        : stream
    )
  }))
}
```

---

### Output Page Patterns

---

#### Per-Stream Tabs

**Purpose**: Allow users to view income summaries for each income stream individually or combined

**Feature Type**: Tabbed interface with state management

**State Required**:
```javascript
const [activeTab, setActiveTab] = useState('all')  // 'all' or streamId
```

**Tab Selection Logic**:
```javascript
// Determine which summary to show based on active tab
const currentSummary = activeTab === 'all'
  ? summary
  : summary.perStreamSummaries?.find(s => s.streamId === activeTab) || summary
```

**Tabs UI Pattern**:
```jsx
{/* Tabs */}
<div className="flex gap-2 mb-6 border-b border-gray-200">
  <button
    onClick={() => setActiveTab('all')}
    className={`px-4 py-2 font-medium transition border-b-2 ${
      activeTab === 'all'
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-600 hover:text-gray-900'
    }`}
  >
    All Streams
  </button>
  {data.incomeStreams.map(stream => (
    <button
      key={stream.id}
      onClick={() => setActiveTab(stream.id)}
      className={`px-4 py-2 font-medium transition border-b-2 ${
        activeTab === stream.id
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-600 hover:text-gray-900'
      }`}
    >
      {stream.name}
    </button>
  ))}
</div>
```

**Milestone Filtering by Tab**:
```javascript
// Filter milestones based on active tab
const filteredMilestones = activeTab === 'all'
  ? summary.milestones
  : summary.milestones?.filter(m => {
      const stream = data.incomeStreams.find(s => s.id === activeTab)
      return m.label.includes(stream?.name || '')
    })
```

**Dynamic Grid Layout**:
```jsx
{/* Show 4 columns for "All Streams" tab, 3 for individual streams */}
<div className={`grid grid-cols-1 md:grid-cols-2 ${
  activeTab === 'all' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
} gap-4 mb-6`}>
  {/* Summary cards using currentSummary */}
</div>
```

**Per-Stream Summary Calculation**:
- Implemented in `calculatePerStreamSummaries()` in `Income.calc.js`
- Recalculates each stream's income separately with its own growth, jumps, and active dates
- Returns array of summary objects (one per stream)
- Each summary has same structure as overall summary

---

#### Summary Card Component

**Code Pattern**:
```jsx
function SummaryCard({ title, nominalValue, presentValue, highlight }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${
      highlight ? 'border-blue-500 border-2' : 'border-gray-200'
    }`}>
      <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Nominal:</span>
          <span className="font-bold text-gray-900">
            ${nominalValue.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Present Value:</span>
          <span className="font-bold text-blue-600">
            ${presentValue.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}
```

---

#### Milestone Display

**Code Pattern**:
```jsx
{projections.summary.milestones.length > 0 && (
  <div className="mt-8">
    <h2 className="text-2xl font-bold mb-4">Key Milestones</h2>
    <div className="space-y-4">
      {projections.summary.milestones.map((milestone, idx) => (
        <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-2">{milestone.label}</h3>
          <div className="flex gap-4">
            <div>
              <span className="text-sm text-gray-600">Nominal: </span>
              <span className="font-bold">${milestone.compNominal.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Present Value: </span>
              <span className="font-bold text-blue-600">${milestone.compPV.toLocaleString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

---

### Key Algorithms

---

#### Monthly Projection Loop

**File**: Income.calc.js:84-181

**Logic**:
1. Loop through 1,200 months (0-1199)
2. For each month:
   - Calculate relative year and month
   - Check for income jumps per stream (apply in January)
   - For each active stream:
     - Apply years of growth compounding
     - Apply cumulative jump multipliers (specific to that stream)
     - Calculate monthly values (annual / 12)
   - Sum all active streams
   - Calculate present values using inflation discount
   - Store monthly projection row

**Pseudo-code**:
```javascript
for (let monthIndex = 0; monthIndex < 1200; monthIndex++) {
  const year = Math.floor(monthIndex / 12) + 1
  const month = (monthIndex % 12) + 1

  // Check for jumps in January (per stream)
  if (month === 1) {
    data.incomeStreams.forEach(stream => {
      const jumpThisYear = stream.jumps.find(j => j.year === year)
      if (jumpThisYear && jumpThisYear.jumpPercent) {
        const jumpMultiplier = 1 + (jumpThisYear.jumpPercent / 100)
        streamMultipliers[stream.id] *= jumpMultiplier
      }
    })
  }

  // Calculate income from all active streams
  let totalNominal = 0
  data.incomeStreams.forEach(stream => {
    if (year <= stream.endWorkYear) {
      const withGrowth = applyGrowth(stream, year)
      const withJumps = withGrowth * streamMultipliers[stream.id]
      totalNominal += withJumps / 12
    }
  })

  // Convert to present value
  const totalPV = totalNominal / inflationDiscountFactor(monthIndex)

  projections.push({ year, month, totalNominal, totalPV, ... })
}
```

---

#### Growth Compounding

**Formula**:
```javascript
const yearsOfGrowth = year - 1  // Year 1 has 0 years of growth
const growthMultiplier = Math.pow(1 + stream.growthRate / 100, yearsOfGrowth)
```

**Example**:
- Base salary: $150,000
- Growth rate: 3%
- Year 5 calculation:
  - Years of growth: 4
  - Growth multiplier: (1.03)^4 = 1.1255
  - Salary in Year 5: $150,000 × 1.1255 = $168,825

---

#### Jump Application (Per Stream)

**Logic**:
- Jumps are permanent multipliers
- Applied cumulatively to future income for THEIR SPECIFIC stream only
- Applied in January of the jump year
- Only affect their own income stream (not other streams)

**Code**:
```javascript
// Track cumulative jump multipliers per stream
const streamMultipliers = {}
data.incomeStreams.forEach(stream => {
  streamMultipliers[stream.id] = 1.0
})

// When a jump occurs for a specific stream
if (month === 1) {
  data.incomeStreams.forEach(stream => {
    const jumpThisYear = stream.jumps.find(j => j.year === year)
    if (jumpThisYear && jumpThisYear.jumpPercent) {
      const jumpMultiplier = 1 + (jumpThisYear.jumpPercent / 100)
      streamMultipliers[stream.id] *= jumpMultiplier
    }
  })
}
```

**Example**:
- Primary Job base salary Year 4: $160,000
- Primary Job jump in Year 5: +7%
- Primary Job new base Year 5: $160,000 × 1.07 = $171,200
- All future years of Primary Job grow from $171,200 (not $160,000)
- Side Business income is NOT affected by this jump

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

---

## Taxes

### Overview

**Feature Type**: Input + Output (two-page pattern) with auto-loading from other features
**localStorage Key**: `taxes`
**File**: `src/features/taxes/Taxes.jsx`
**Calculation**: `src/features/taxes/Taxes.calc.js`
**Related Feature**: Tax Bracket Manager (separate administrative tool)

**Auto-Loading Behavior**:
- Filing type automatically loaded from Personal Details (`profile.filingStatus`)
- Total income automatically calculated from Income feature (`income.incomeStreams`)
- Excludes 401k contributions from income calculation
- User can adjust values or add additional income sources

### Data Structure

```javascript
{
  filingType: 'single',              // string (mapped from profile)
  state: 'california',               // string (state/province ID)
  incomes: [                         // array of income sources
    {
      id: 'salary-income',           // string (unique ID)
      description: 'Total Annual Income (excl. 401k)',  // string
      amount: 150000,                // number
      incomeType: 'salary'           // string: 'salary' or 'investment'
    }
    // ... additional incomes can be added
  ]
}
```

### Fields

---

#### Filing Type

**Purpose**: Tax filing status for calculating correct tax brackets

**Field Type**: Dropdown (select)

**Options**:
- `single` - Single
- `married` - Married Filing Jointly
- `separate` - Married Filing Separately
- `head` - Head of Household

**Default Value**: Auto-mapped from Personal Details

**Mapping from Profile**:
```javascript
const mapFilingStatus = (status) => {
  const mapping = {
    'Single': 'single',
    'Married Filing Jointly': 'married',
    'Married Filing Separately': 'separate',
    'Head of Household': 'head'
  }
  return mapping[status] || 'single'
}
```

**Required**: Yes (always has value)

**Validation**: None (dropdown ensures valid value)

**Used In**:
- Tax bracket selection for both state and federal
- FICA threshold calculations
- Fallback filing type resolution (if jurisdiction has it disabled)

**Code Pattern**:
```jsx
<select
  value={data.filingType}
  onChange={(e) => handleFilingTypeChange(e.target.value)}
  className="w-full px-3 py-2 border rounded-md"
>
  <option value="single">Single</option>
  <option value="married">Married Filing Jointly</option>
  <option value="separate">Married Filing Separately</option>
  <option value="head">Head of Household</option>
</select>
```

**Storage**: Saved to `localStorage.taxes.filingType`

---

#### State

**Purpose**: Determines which state/provincial tax brackets to apply

**Field Type**: Dropdown (select)

**Options**: Currently only `california`, but expandable via Tax Bracket Manager

**Default Value**: `'california'`

**Required**: Yes

**Validation**: None (dropdown ensures valid value)

**Used In**:
- State tax bracket selection
- State-specific filing type fallback resolution

**Code Pattern**:
```jsx
<select
  value={data.state}
  onChange={(e) => handleStateChange(e.target.value)}
  className="w-full px-3 py-2 border rounded-md"
>
  <option value="california">California</option>
</select>
```

**Storage**: Saved to `localStorage.taxes.state`

---

#### Income Sources (Array)

**Purpose**: Track all sources of taxable income with their types

**Field Type**: Dynamic array of income objects

**Default Value**: Auto-populated from Income feature with total salary (excluding 401k)

**Auto-Loading Logic**:
```javascript
// On component mount
const incomeData = storage.load('income') || { incomeStreams: [] }

// Calculate total salary (excluding 401k)
const totalSalary = incomeData.incomeStreams.reduce((sum, stream) => {
  const annualIncome = Number(stream.annualIncome) || 0
  return sum + annualIncome
}, 0)

// Auto-populate
setData(prev => ({
  ...prev,
  incomes: totalSalary > 0 ? [{
    id: 'salary-income',
    description: 'Total Annual Income (excl. 401k)',
    amount: totalSalary,
    incomeType: 'salary'
  }] : []
}))
```

**User Actions**:
- Can add additional income sources (investments, side income, etc.)
- Can edit amounts and types
- Can remove income sources

**Required**: At least one income source (validation)

**Validation**: Handled per income source (see Income Source fields below)

**Storage**: Saved to `localStorage.taxes.incomes`

---

### Income Source Fields

Each income source in the `incomes` array has the following fields:

---

#### Income Source: ID

**Purpose**: Unique identifier for each income entry

**Field Type**: Auto-generated string

**Pattern**: `income-${Date.now()}` or custom (e.g., `'salary-income'` for auto-loaded)

**Example**: `'income-1730912345678'`

**Used In**: Tracking and removing specific income sources

---

#### Income Source: Description

**Purpose**: Label for the income source

**Field Type**: Text input

**Default Value**: Auto-filled as `'Total Annual Income (excl. 401k)'` for main income, empty for additional

**Required**: No (optional, for user clarity)

**Validation**: None

**Placeholder**: `'Description (e.g., W-2 Salary, Dividends)'`

**Code Pattern**:
```jsx
<input
  type="text"
  value={income.description}
  onChange={(e) => handleIncomeChange(income.id, 'description', e.target.value)}
  placeholder="Description (e.g., W-2 Salary, Dividends)"
  className="w-full px-3 py-2 border rounded-md"
/>
```

---

#### Income Source: Amount

**Purpose**: Dollar amount of income from this source

**Field Type**: Number input with dollar ($) prefix

**Default Value**: Auto-filled from Income feature for primary, `''` for additional

**Required**: Yes

**Validation Rules**:
```javascript
if (income.amount === '' || income.amount < 0) {
  errors[`${index}-amount`] = 'Amount must be a positive number'
}
```

**Used In**: Tax calculations for this specific income source

**Display Format**: `$150,000`

**Code Pattern**:
```jsx
<div className="relative">
  <span className="absolute left-3 top-2 text-gray-500">$</span>
  <input
    type="number"
    value={income.amount}
    onChange={(e) => handleIncomeChange(income.id, 'amount',
      e.target.value ? Number(e.target.value) : '')}
    placeholder="100000"
    className={`w-full pl-8 pr-3 py-2 border rounded-md ${
      errors[`${index}-amount`] ? 'border-red-500' : 'border-gray-300'
    }`}
  />
</div>
```

---

#### Income Source: Income Type

**Purpose**: Determines which tax brackets to use (ordinary income vs capital gains)

**Field Type**: Dropdown (select)

**Options**:
- `salary` - Ordinary income (W-2, 1099, etc.) - uses standard tax brackets
- `investment` - Investment income (capital gains, dividends) - uses capital gains brackets

**Default Value**: `'salary'` (auto-loaded income is salary type)

**Required**: Yes

**Validation Rules**:
```javascript
if (!income.incomeType) {
  errors[`${index}-incomeType`] = 'Income type is required'
}
```

**Used In**:
- Selecting federal tax brackets (capital gains vs ordinary income)
- Selecting state tax brackets (some states tax them differently)
- FICA calculations (only salary has FICA)

**Code Pattern**:
```jsx
<select
  value={income.incomeType}
  onChange={(e) => handleIncomeChange(income.id, 'incomeType', e.target.value)}
  className="w-full px-3 py-2 border rounded-md"
>
  <option value="salary">Salary</option>
  <option value="investment">Investment Income</option>
</select>
```

**Storage**: Saved to `localStorage.taxes.incomes[].incomeType`

---

### Tax Calculations

**Function**: `calculateTaxes(income, incomeType, filingType, state, country)`

**Called For**: Each income source individually

**Returns**: Tax calculation object with breakdown

---

#### Tax Calculation Flow

1. **Load Custom Brackets**: Check `localStorage.taxLadders` for custom brackets
2. **Resolve Filing Type**: Check if requested filing type is disabled, use fallback if needed
3. **Get State Brackets**: Load appropriate state tax brackets (salary vs investment)
4. **Get Federal Brackets**: Load appropriate federal tax brackets (ordinary vs capital gains)
5. **Calculate State Tax**: Apply progressive brackets to income
6. **Calculate Federal Tax**: Apply progressive brackets to income
7. **Calculate FICA**: If salary income, calculate FICA taxes
8. **Aggregate**: Sum all tax components

**Filing Type Fallback Logic**:
```javascript
// Check if filing type is disabled for this jurisdiction
if (filingTypeData && !filingTypeData.enabled) {
  const fallbackFilingType = filingTypeData.useInstead || 'single'
  actualFilingType = fallbackFilingType
  // Use fallback brackets instead
}
```

---

#### Tax Calculation Output Structure

**Per Income Source**:
```javascript
{
  income: 150000,                    // Original income amount
  incomeType: 'salary',              // 'salary' or 'investment'
  filingType: 'married',             // User-requested filing type
  actualStateFilingType: 'single',   // Filing type actually used for state (after fallback)
  actualFederalFilingType: 'married',// Filing type actually used for federal
  state: 'california',
  country: 'usa',

  stateTax: 12500,                   // Total state tax
  stateTaxBreakdown: [               // Bracket-by-bracket breakdown
    {
      min: 0,
      max: 21500,
      rate: 0.01,
      taxableAmount: 21500,
      taxAmount: 215
    },
    // ... more brackets
  ],

  federalTax: 25000,                 // Total federal tax
  federalTaxBreakdown: [             // Bracket-by-bracket breakdown
    // ... same structure as state
  ],

  fica: {                            // FICA breakdown (salary only)
    socialSecurity: 9300,            // 6.2% up to wage base
    medicare: 2175,                  // 1.45% unlimited
    additionalMedicare: 0,           // 0.9% over threshold
    total: 11475
  },

  totalTax: 48975,                   // Sum of state + federal + FICA
  effectiveRate: 0.3265              // totalTax / income
}
```

**Aggregated Totals**:
```javascript
{
  individual: [/* array of per-income calculations */],
  totals: {
    totalIncome: 150000,
    totalStateTax: 12500,
    totalFederalTax: 25000,
    totalFICA: 11475,
    totalTax: 48975,
    effectiveRate: 0.3265
  }
}
```

---

### Output Display Components

---

#### Tax Summary Cards

**Shows**: Totals across all income sources

**Cards**:
1. Total Income
2. State Tax
3. Federal Tax
4. FICA Tax
5. Total Tax Liability
6. Effective Tax Rate

**Code Pattern**:
```jsx
<div className="bg-white rounded-lg shadow-sm border p-6">
  <h3 className="text-lg font-semibold mb-2">Total Tax Liability</h3>
  <p className="text-3xl font-bold text-red-600">
    ${calculations.totals.totalTax.toLocaleString()}
  </p>
</div>
```

---

#### Income-by-Income Breakdown

**Shows**: Tax details for each income source

**For Each Income**:
- Description and amount
- Income type label
- State tax breakdown table
- Federal tax breakdown table
- FICA breakdown table (if salary)

---

#### Tax Breakdown Tables

**State Tax Breakdown**:
- Shows filing type used (including fallback if applicable)
- Table with columns: Rate, Bracket Range, Taxable Amount, Tax
- Note if capital gains taxed as ordinary income

**Federal Tax Breakdown**:
- Shows filing type used
- Same table structure as state
- Note if capital gains rates applied

**FICA Breakdown** (Salary Only):
- Social Security: 6.2% up to $168,600 wage base
- Medicare: 1.45% unlimited
- Additional Medicare: 0.9% over threshold (based on filing type)
- Note about employer match

**Code Pattern**:
```jsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b">
      <th>Rate</th>
      <th>Bracket Range</th>
      <th>Taxable Amount</th>
      <th>Tax</th>
    </tr>
  </thead>
  <tbody>
    {calc.stateTaxBreakdown.map((bracket, idx) => (
      <tr key={idx} className="border-b">
        <td>{(bracket.rate * 100).toFixed(1)}%</td>
        <td>${bracket.min.toLocaleString()} - ${bracket.max === Infinity ? '∞' : bracket.max.toLocaleString()}</td>
        <td>${bracket.taxableAmount.toLocaleString()}</td>
        <td className="font-semibold">${bracket.taxAmount.toLocaleString()}</td>
      </tr>
    ))}
  </tbody>
</table>
```

---

### Dynamic UI Features

---

#### Add Income Source

**Button**: "+ Add Income"

**Code Pattern**:
```javascript
const addIncome = () => {
  const newIncome = {
    id: `income-${Date.now()}`,
    description: '',
    amount: '',
    incomeType: 'salary'
  }

  setData(prev => ({
    ...prev,
    incomes: [...prev.incomes, newIncome]
  }))
}
```

---

#### Remove Income Source

**Button**: "Remove" (per income, shown inline)

**Code Pattern**:
```javascript
const removeIncome = (incomeId) => {
  setData(prev => ({
    ...prev,
    incomes: prev.incomes.filter(i => i.id !== incomeId)
  }))
}
```

---

#### Manage Tax Brackets Button

**Location**: Output view header

**Action**: Navigates to `/tax-brackets` route

**Purpose**: Access administrative Tax Bracket Manager

**Code Pattern**:
```jsx
<button
  onClick={() => navigate('/tax-brackets')}
  className="px-4 py-2 border rounded-md"
>
  Manage Tax Brackets
</button>
```

---

## Tax Bracket Manager

### Overview

**Feature Type**: Administrative tool (separate from main tax calculation flow)
**localStorage Key**: `taxLadders`
**File**: `src/features/taxes/TaxBracketManager.jsx`
**Route**: `/tax-brackets`
**Purpose**: Configure custom tax brackets for multiple jurisdictions and income types

**Key Distinction**: This is NOT part of the main user flow. It's an administrative interface for configuring tax rules that the Taxes feature uses.

### Data Structure

```javascript
{
  states: {                          // State/provincial jurisdictions
    california: {
      id: 'california',
      name: 'California',
      salaryTax: {                   // Ordinary income tax brackets
        filingTypes: {
          single: {
            enabled: true,
            useInstead: 'single',    // Fallback if disabled
            brackets: [
              { rate: 1.0, min: 0, max: 10800 },
              { rate: 2.0, min: 10800, max: 25500 },
              // ... more brackets
            ]
          },
          married: { /* same structure */ },
          separate: {
            enabled: false,          // Disabled filing type
            useInstead: 'single',    // Falls back to single
            brackets: [/* ... */]
          },
          head: { /* same structure */ }
        }
      },
      investmentTax: {               // Capital gains/investment tax brackets
        filingTypes: {
          // ... same structure as salaryTax
        }
      }
    }
    // ... more states can be added dynamically
  },

  countries: {                       // Country/federal jurisdictions
    usa: {
      id: 'usa',
      name: 'United States',
      salaryTax: {                   // Federal ordinary income
        filingTypes: {
          single: { /* ... */ },
          married: { /* ... */ },
          separate: { /* ... */ },
          head: { /* ... */ }
        }
      },
      investmentTax: {               // Federal capital gains
        filingTypes: {
          // ... same structure
        }
      }
    }
    // ... more countries can be added dynamically
  }
}
```

### Key Architectural Decisions

---

#### Hierarchical Structure

**Top Level**: `states` vs `countries`
- Separates state/provincial tax rules from federal/country rules
- Allows independent configuration
- UI has two top-level tabs

**Jurisdiction Level**: Individual state or country
- Each has unique ID and display name
- Can be added/removed dynamically
- Examples: `california`, `new-york`, `usa`, `canada`

**Income Type Level**: `salaryTax` vs `investmentTax`
- Salary: Ordinary income (W-2, wages, etc.)
- Investment: Capital gains, dividends, etc.
- Allows different bracket structures for different income types
- Some jurisdictions tax them the same, others differently

**Filing Type Level**: `single`, `married`, `separate`, `head`
- All four always present (even if disabled)
- Each has enable/disable toggle
- Each has fallback specification

---

#### Bracket Rate Storage Format

**Storage Format**: Rates stored as percentages (1.0 to 37.0)
- User-friendly for editing
- Example: `{ rate: 12.3, min: 721300, max: Infinity }`

**Calculation Format**: Rates converted to decimals (0.01 to 0.37)
- Used in actual tax calculations
- Converted via: `rate / 100`
- Example: `{ rate: 0.123, min: 721300, max: Infinity }`

**Conversion Function**:
```javascript
const convertBrackets = (brackets) => {
  return brackets.map((b, idx, arr) => ({
    rate: b.rate / 100,              // 12.3 → 0.123
    min: b.min,
    max: b.max,
    stepTax: idx === 0 ? 0 : calculateStepTax(arr, idx)
  }))
}
```

**Step Tax Calculation**:
```javascript
const calculateStepTax = (brackets, index) => {
  let stepTax = 0
  for (let i = 0; i < index; i++) {
    const bracket = brackets[i]
    const range = bracket.max - bracket.min
    stepTax += range * (bracket.rate / 100)
  }
  return stepTax
}
```

**Purpose of Step Tax**: Pre-calculated cumulative tax from all previous brackets
- Speeds up progressive tax calculation
- Example: For 3rd bracket, stepTax = tax from bracket 1 + tax from bracket 2

---

### UI Components

---

#### Top-Level Tabs

**Tabs**: "States / Provinces" and "Countries / Federal"

**State Management**:
```javascript
const [topLevelTab, setTopLevelTab] = useState('states')  // 'states' or 'countries'
```

**Purpose**: Separate state-level configuration from federal-level

**Code Pattern**:
```jsx
<div className="flex gap-4 mb-6 border-b-2">
  <button
    onClick={() => setTopLevelTab('states')}
    className={topLevelTab === 'states' ? 'active' : 'inactive'}
  >
    States / Provinces
  </button>
  <button
    onClick={() => setTopLevelTab('countries')}
    className={topLevelTab === 'countries' ? 'active' : 'inactive'}
  >
    Countries / Federal
  </button>
</div>
```

---

#### Jurisdiction Sidebar

**Location**: Left side (1/4 width on desktop)

**Shows**: List of all jurisdictions in current tab (states or countries)

**Features**:
- Click to select jurisdiction for editing
- "+ Add" button to create new jurisdiction
- "✕" button on hover to remove jurisdiction
- Highlights selected jurisdiction

**Add Jurisdiction Dialog**:
```jsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
  <div className="bg-white rounded-lg p-6 w-96">
    <h3>Add {topLevelTab === 'states' ? 'State' : 'Country'}</h3>
    <input
      type="text"
      value={newJurisdictionName}
      onChange={(e) => setNewJurisdictionName(e.target.value)}
      placeholder="Enter name"
    />
    <button onClick={addJurisdiction}>Add</button>
    <button onClick={() => setShowAddDialog(false)}>Cancel</button>
  </div>
</div>
```

**Add Logic**:
```javascript
const addJurisdiction = () => {
  const id = newJurisdictionName.toLowerCase().replace(/\s+/g, '-')

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
      // ... same structure
    }
  }

  // Add to appropriate top-level category
  updated[topLevelTab][id] = newJurisdiction
  saveLadders(updated)
}
```

**Remove Logic**:
```javascript
const removeJurisdiction = (id) => {
  if (!confirm(`Are you sure?`)) return

  const updated = JSON.parse(JSON.stringify(ladders))
  delete updated[topLevelTab][id]
  saveLadders(updated)

  if (selectedJurisdiction === id) {
    setSelectedJurisdiction(null)
  }
}
```

---

#### Income Type Sections

**Location**: Main content area (3/4 width on desktop)

**Shows**: Two sections per jurisdiction
1. Salary Income Tax
2. Investment Income Tax

**Each Section Contains**:
- Filing type tabs (Single, Married, Separate, Head)
- Enable/disable toggle for current filing type
- Fallback dropdown (when disabled)
- Bracket editing table (when enabled)
- Add/Remove bracket buttons

---

#### Filing Type Tabs

**Tabs**: Single, Married, Separate, Head

**Always Show All Four**: Even if some are disabled

**State Management**:
```javascript
const [selectedFilingType, setSelectedFilingType] = useState('single')
```

**Code Pattern**:
```jsx
<div className="flex gap-2 mb-6 border-b">
  {['single', 'married', 'separate', 'head'].map((filingType) => (
    <button
      key={filingType}
      onClick={() => setSelectedFilingType(filingType)}
      className={selectedFilingType === filingType ? 'active' : 'inactive'}
    >
      {filingType === 'single' ? 'Single' : /* ... format name */}
    </button>
  ))}
</div>
```

---

#### Enable/Disable Toggle

**Purpose**: Turn filing types on or off for a jurisdiction

**Shows**: Checkbox with label

**When Disabled**:
- Bracket table is grayed out and non-interactive
- Fallback dropdown appears
- Explanatory message shows which filing type will be used instead

**Code Pattern**:
```jsx
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    checked={isEnabled}
    onChange={() => toggleFilingType(incomeType, selectedFilingType)}
  />
  <span>Enable {selectedFilingType} filing type</span>
</label>

{!isEnabled && (
  <div className="ml-6">
    <label>Use instead:</label>
    <select
      value={filingTypeData.useInstead}
      onChange={(e) => updateUseInstead(incomeType, selectedFilingType, e.target.value)}
    >
      <option value="single">Single</option>
      <option value="married">Married</option>
      <option value="separate">Separate</option>
      <option value="head">Head</option>
    </select>
    <span>(When user selects {selectedFilingType}, use this filing type instead)</span>
  </div>
)}
```

**Toggle Function**:
```javascript
const toggleFilingType = (incomeType, filingType) => {
  const updated = JSON.parse(JSON.stringify(ladders))
  const jurisdiction = updated[topLevelTab][selectedJurisdiction]
  jurisdiction[incomeType].filingTypes[filingType].enabled =
    !jurisdiction[incomeType].filingTypes[filingType].enabled
  saveLadders(updated)
}
```

---

#### Fallback Selection (Use Instead)

**Purpose**: Specify which filing type to use when requested filing type is disabled

**Shows**: Dropdown with all four filing types

**Only Visible**: When filing type is disabled

**Default Values**:
- single → single
- married → married
- separate → single (common: CA doesn't have MFS)
- head → head

**Update Function**:
```javascript
const updateUseInstead = (incomeType, filingType, useInsteadValue) => {
  const updated = JSON.parse(JSON.stringify(ladders))
  const jurisdiction = updated[topLevelTab][selectedJurisdiction]
  jurisdiction[incomeType].filingTypes[filingType].useInstead = useInsteadValue
  saveLadders(updated)
}
```

**Example Use Case**:
- User filing as "Separate" in California
- California has "Separate" disabled, useInstead: "Single"
- Tax calculation automatically uses "Single" brackets
- Result shows: `actualStateFilingType: 'single'` but `filingType: 'separate'`

---

#### Bracket Editing Table

**Columns**:
1. Rate (%) - Editable number input
2. Min Income - Editable currency input
3. Max Income - Editable currency input or "∞ (No limit)"
4. Actions - Remove button

**Editable When**: Filing type is enabled

**Disabled When**: Filing type is disabled (grayed out, pointer-events: none)

**Code Pattern**:
```jsx
<table className="w-full">
  <thead>
    <tr className="border-b">
      <th>Rate (%)</th>
      <th>Min Income</th>
      <th>Max Income</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {brackets.map((bracket, index) => (
      <tr key={index}>
        <td>
          <input
            type="number"
            step="0.1"
            value={bracket.rate}
            onChange={(e) => updateBracket(incomeType, selectedFilingType, index, 'rate', e.target.value)}
            disabled={!isEnabled}
          />
        </td>
        <td>
          <div className="relative">
            <span className="absolute left-2 top-1">$</span>
            <input
              type="number"
              value={bracket.min}
              onChange={(e) => updateBracket(incomeType, selectedFilingType, index, 'min', e.target.value)}
              disabled={!isEnabled}
            />
          </div>
        </td>
        <td>
          {bracket.max === Infinity ? (
            <span>∞ (No limit)</span>
          ) : (
            <div className="relative">
              <span className="absolute left-2 top-1">$</span>
              <input
                type="number"
                value={bracket.max}
                onChange={(e) => updateBracket(incomeType, selectedFilingType, index, 'max', e.target.value)}
                disabled={!isEnabled}
              />
            </div>
          )}
        </td>
        <td>
          {brackets.length > 1 && (
            <button
              onClick={() => removeBracket(incomeType, selectedFilingType, index)}
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
```

**Update Function**:
```javascript
const updateBracket = (incomeType, filingType, bracketIndex, field, value) => {
  const updated = JSON.parse(JSON.stringify(ladders))
  const bracket = updated[topLevelTab][selectedJurisdiction][incomeType]
    .filingTypes[filingType].brackets[bracketIndex]

  if (field === 'rate') {
    bracket.rate = parseFloat(value) || 0
  } else if (field === 'min') {
    bracket.min = parseInt(value) || 0
  } else if (field === 'max') {
    bracket.max = value === 'Infinity' || value === '' ? Infinity : parseInt(value) || 0
  }

  saveLadders(updated)
}
```

---

#### Add Bracket

**Button**: "+ Add Bracket" (shown below table when filing type enabled)

**Logic**:
```javascript
const addBracket = (incomeType, filingType) => {
  const updated = JSON.parse(JSON.stringify(ladders))
  const brackets = updated[topLevelTab][selectedJurisdiction][incomeType]
    .filingTypes[filingType].brackets
  const lastBracket = brackets[brackets.length - 1]

  // New bracket starts where last one ended
  brackets.push({
    rate: 0,
    min: lastBracket.max === Infinity ? 0 : lastBracket.max,
    max: Infinity
  })

  saveLadders(updated)
}
```

---

#### Remove Bracket

**Button**: "Remove" (in Actions column of each row)

**Constraint**: Cannot remove if only one bracket remains

**Logic**:
```javascript
const removeBracket = (incomeType, filingType, bracketIndex) => {
  const updated = JSON.parse(JSON.stringify(ladders))
  updated[topLevelTab][selectedJurisdiction][incomeType]
    .filingTypes[filingType].brackets.splice(bracketIndex, 1)
  saveLadders(updated)
}
```

---

#### Reset to Defaults

**Button**: "Reset to Defaults" (top-right of page)

**Confirms**: Shows browser confirm dialog

**Logic**:
```javascript
const resetToDefaults = () => {
  if (confirm('Reset all tax brackets to defaults? This cannot be undone.')) {
    saveLadders(DEFAULT_TAX_LADDERS)
    setSelectedJurisdiction(null)
  }
}
```

---

### Integration with Tax Calculations

**How Custom Brackets Are Used**:

1. **Load Custom Ladders**: `calculateTaxes()` calls `loadTaxBrackets()` from storage
2. **Check Jurisdiction**: Looks up state/country in custom ladders
3. **Check Income Type**: Selects salaryTax or investmentTax
4. **Check Filing Type Status**: Determines if enabled or disabled
5. **Resolve Fallback**: If disabled, uses `useInstead` to find alternate filing type
6. **Load Brackets**: Gets bracket array for resolved filing type
7. **Convert Format**: Converts storage format (%) to calculation format (decimal)
8. **Calculate Step Taxes**: Pre-calculates cumulative taxes for progressive calculation
9. **Apply to Income**: Uses resolved brackets in `calculateBracketTax()`

**Code Flow**:
```javascript
// In calculateTaxes()
const customLadders = loadTaxBrackets()

if (customLadders && customLadders.states && customLadders.states[state]) {
  const stateData = customLadders.states[state]
  const taxType = incomeType === 'salary' ? 'salaryTax' : 'investmentTax'
  let filingTypeData = stateData[taxType]?.filingTypes[filingType]

  // Check if filing type is disabled
  if (filingTypeData && !filingTypeData.enabled) {
    const fallbackFilingType = filingTypeData.useInstead || 'single'
    actualStateFilingType = fallbackFilingType
    filingTypeData = stateData[taxType]?.filingTypes[fallbackFilingType]
  }

  // Convert and use brackets
  if (filingTypeData && filingTypeData.brackets) {
    stateBrackets = convertBrackets(filingTypeData.brackets)
  }
}
```

---

### Default Tax Brackets

**Included By Default**:

**States**:
- California (with all filing types for salary and investment)

**Countries**:
- USA (with all filing types for salary and investment)

**California Defaults**:
- Salary Tax: 9 brackets from 1% to 12.3%
- Investment Tax: Same as salary (CA taxes capital gains as ordinary income)
- Separate: Disabled by default, falls back to Single

**USA Defaults**:
- Salary Tax: 7 brackets from 10% to 37%
- Investment Tax: 3 brackets (0%, 15%, 20%) for long-term capital gains
- All filing types enabled

---

### Key Algorithms

---

#### Progressive Tax Calculation

**Function**: `calculateBracketTax(income, brackets)`

**Returns**: `{ total: number, breakdown: array }`

**Logic**:
```javascript
function calculateBracketTax(income, brackets) {
  if (income <= 0) return { total: 0, breakdown: [] }

  let tax = 0
  const breakdown = []

  for (const bracket of brackets) {
    if (income <= bracket.min) break

    // How much income falls in this bracket?
    const taxableInBracket = Math.min(income, bracket.max) - bracket.min

    if (taxableInBracket > 0) {
      const taxInBracket = taxableInBracket * bracket.rate
      tax = bracket.stepTax + taxInBracket

      breakdown.push({
        min: bracket.min,
        max: bracket.max,
        rate: bracket.rate,
        taxableAmount: taxableInBracket,
        taxAmount: taxInBracket
      })
    }

    if (income <= bracket.max) break
  }

  return {
    total: Math.round(tax),
    breakdown
  }
}
```

**Example**:
- Income: $100,000
- Bracket 1: 10% on $0-$11,900 = $1,190 tax
- Bracket 2: 12% on $11,900-$48,500 = $4,392 tax
- Bracket 3: 22% on $48,500-$100,000 = $11,330 tax
- Total: $16,912 tax (16.9% effective rate)

---

#### FICA Tax Calculation

**Function**: `calculateFICATax(salary, filingType)`

**Components**:
1. **Social Security**: 6.2% up to $168,600 wage base (2025)
2. **Medicare**: 1.45% unlimited
3. **Additional Medicare**: 0.9% over threshold (varies by filing type)

**Thresholds** (2025):
- Single: $200,000
- Married: $250,000
- Separate: $125,000
- Head: $200,000

**Code**:
```javascript
function calculateFICATax(salary, filingType) {
  // Social Security (capped)
  const socialSecurity = Math.round(
    Math.min(salary, 168600) * 0.062
  )

  // Medicare (no cap)
  const medicare = Math.round(salary * 0.0145)

  // Additional Medicare (over threshold)
  const threshold = {
    single: 200000,
    married: 250000,
    separate: 125000,
    head: 200000
  }[filingType] || 200000

  const additionalMedicare = salary > threshold
    ? Math.round((salary - threshold) * 0.009)
    : 0

  return {
    socialSecurity,
    medicare,
    additionalMedicare,
    total: socialSecurity + medicare + additionalMedicare
  }
}
```

**Example** (Single filer, $150,000 salary):
- Social Security: $150,000 × 6.2% = $9,300
- Medicare: $150,000 × 1.45% = $2,175
- Additional Medicare: $0 (under $200K threshold)
- Total FICA: $11,475

---

## 🎯 Dashboard

**Route**: `/dashboard`

**Purpose**: Comprehensive financial overview with 4 tabs showing net worth growth, income projections, expense projections, and retirement readiness.

### Tab 1: Net Worth

**Data Source**: `calculateGapProjections()` from Gap.calc.js

**Components**:
1. **Summary Cards**:
   - Current Net Worth (Year 1)
   - Retirement Net Worth (Final Year)
   - Net Worth Growth ($ and %)
   - Lifetime Invested (Total contributions)

2. **Stacked Area Chart**:
   - Shows Cash, Investments, and 401k growth over time
   - X-axis: Years (1 to retirement)
   - Y-axis: Dollar value
   - Toggleable between Nominal and Present Value

3. **Waterfall Breakdown** (every 5 years):
   - Starting Net Worth
   - Cash Change (positive/negative)
   - Investment Contributions (new cost basis)
   - Investment Growth (market appreciation)
   - 401k Contributions (individual)
   - 401k Growth (including company match)
   - Ending Net Worth

**Key Calculations**:
```javascript
// Net Worth Formula
netWorth = cash + retirement401kValue + totalInvestmentValue

// Year-over-Year Deltas
cashChange = currentYear.cash - previousYear.cash
investmentContributions = currentYear.costBasis - previousYear.costBasis
investmentGrowth = (currentYear.investmentValue - previousYear.investmentValue) - investmentContributions
```

### Tab 2: Income

**Data Source**: `calculateIncomeProjections()` from Income.calc.js

**Components**:
- Stream tabs (All Streams + individual streams)
- 4 summary cards (Current Year, Year 10, Lifetime, Average)
- Line chart showing Total Comp, Base Salary, Total Bonus over time

### Tab 3: Expenses

**Data Source**: `calculateExpenseProjections()` from Expenses.calc.js

**Components**:
- 4 summary cards (Current Year, Year 10, Lifetime, Average)
- Stacked bar chart by category
- Category breakdown table with percentages

### Tab 4: Retirement Readiness

**Data Source**: `calculateGapProjections()` from Gap.calc.js

**Components**:
1. **Summary Cards**:
   - Years to Retirement
   - Net Worth at Retirement
   - Safe Withdrawal Income (4% rule)
   - Income Replacement Ratio

2. **Readiness Assessment**:
   - Excellent: ≥100% income replacement
   - Good: 80-99% income replacement
   - Fair: 60-79% income replacement
   - Needs Improvement: <60% income replacement

3. **Visualizations**:
   - Donut chart: Asset allocation at retirement (Cash/Investments/401k)
   - Bar chart: Final year income vs. safe withdrawal
   - Detailed metrics table (nominal and PV)

**Key Calculations**:
```javascript
// 4% Safe Withdrawal Rule
safeWithdrawal = retirementNetWorth * 0.04  // Annual sustainable income

// Income Replacement Ratio
incomeReplacement = (safeWithdrawal / finalYearIncome) * 100
```

**Navigation**: Dashboard link appears first in main navigation (after Home)

---

## ⚙️ Calculation Methodology: Monthly vs Annual

### Annual Calculations (Compounded Yearly)

All **growth rates** are compounded **annually**, not monthly:

1. **Income Growth Rate**:
   ```javascript
   const yearsOfGrowth = year - 1  // Year 1 has 0 years of growth
   const growthMultiplier = Math.pow(1 + stream.growthRate / 100, yearsOfGrowth)
   const annualSalary = stream.annualIncome * growthMultiplier
   ```
   - Growth rate: 3% means 3% per year, not per month
   - Applied once per year (in January)
   - Compounds annually: (1.03)^years

2. **Investment Growth Rate**:
   ```javascript
   // Applied at end of each year
   inv.marketValue = inv.costBasis * Math.pow(1 + inv.growthRate / 100, year)
   ```
   - Growth rate: 7% means 7% per year
   - Applied annually, not monthly
   - Example: $100,000 at 7% = $107,000 after 1 year

3. **401k Growth Rate**:
   ```javascript
   // Applied annually
   retirement401k.value = retirement401k.value * (1 + retirement401k.growthRate / 100) +
                         totalIndividual401k +
                         retirement401k.companyContribution
   ```
   - Growth rate: 8% means 8% per year
   - Applied once per year
   - Includes contributions and growth

4. **Inflation Rate**:
   ```javascript
   const discountFactor = Math.pow(1 + inflationRate / 100, yearsFromNow)
   presentValue = nominalValue / discountFactor
   ```
   - Inflation rate: 2.7% means 2.7% per year
   - Used for Present Value calculations
   - Compounds annually

### Monthly Calculations (For Display Only)

Monthly values are derived by **dividing annual values by 12**:

1. **Monthly Income**:
   ```javascript
   const annualSalary = stream.annualIncome * growthMultiplier
   const monthlySalary = annualSalary / 12  // Display only
   ```
   - Growth is NOT applied monthly
   - Monthly value = Annual / 12
   - Used for monthly projection rows

2. **Monthly Expenses**:
   ```javascript
   const monthlyExpense = (annualExpense * inflationMultiplier) / 12
   ```
   - Inflation is NOT applied monthly
   - Monthly value = Annual / 12

### Important Notes

⚠️ **All growth, inflation, and interest rates are ANNUAL rates**:
- Income growth: Applied annually (January)
- Investment growth: Applied annually (end of year)
- 401k growth: Applied annually (end of year)
- Inflation: Applied annually for PV calculations
- Expense inflation: Applied annually

📊 **Monthly projections are for display purposes only**:
- The app generates monthly projection rows
- BUT growth calculations happen annually
- Monthly rows show: `annualValue / 12`

🔄 **Growth is NOT compounded monthly**:
- A 3% annual growth rate means exactly 3% per year
- NOT 3%/12 = 0.25% per month
- This is standard financial modeling practice

---

**Last Updated**: 2025-11-10
**Version**: 3.0
