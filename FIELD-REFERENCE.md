# Field Reference Guide

**Purpose**: Detailed technical blueprint for every field in every feature. Use this to rebuild features 10x faster.

**Last Updated**: 2025-11-09

---

## Table of Contents

1. [Personal Details](#personal-details)
2. [Income](#income)
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

## Next Features (Coming Soon)

- Expenses
- Taxes
- Investments & Debt
- Gap Calculations
- Scenarios

Each will follow the same patterns documented above with feature-specific field logic.

---

**Last Updated**: 2025-11-09
**Version**: 1.0
