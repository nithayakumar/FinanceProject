# Layoffs/Career Break Feature - Detailed Implementation Plan

## Executive Summary

Add a "Career Breaks" feature to income streams that allows modeling temporary income reductions (0-100%) for a specified duration in months. The reduction should prorate all income components (salary, 401k, company match, equity) while maintaining growth rate application on the reduced amounts.

**Also includes**: Adding missing expense features to Scenario Editor (% of income, jumps).

---

## Part 1: Career Break Feature Analysis

### Current State

**What Exists:**
- Income Jumps: Permanent percentage changes applied in January of specified years
- Cumulative multiplier system: Jumps compound forever
- Data structure: `stream.jumps = [{ id, year, jumpPercent, description }]`

**What's Missing:**
- Temporary reductions (layoffs, sabbaticals, parental leave)
- Duration-based changes (X months, not permanent)
- Proration for partial years
- Ability to return to previous income level automatically

---

## Part 2: Design Decisions

### 2.1 Data Structure

Add a new `careerBreaks` array to each income stream (separate from `jumps`):

```javascript
{
  id: 'stream-123',
  name: 'Main Job',
  annualIncome: 150000,
  // ... existing fields ...
  jumps: [...],           // Existing permanent changes
  careerBreaks: [         // NEW: Temporary reductions
    {
      id: 'break-456',
      startYear: 5,                    // Year when break starts (relative)
      durationMonths: 18,              // Total duration in months
      reductionPercent: 100,           // 0-100% reduction (100 = full layoff)
      description: 'Parental Leave'    // User-friendly label
    }
  ]
}
```

**Why Separate Array:**
- Different behavior: Temporary vs permanent
- Different UI pattern: Duration-based vs single year
- Easier to validate and manage independently
- Clear separation of concerns

### 2.2 Calculation Logic

**Key Principles:**
1. **Monthly Granularity**: Calculate reduction at monthly level for accurate proration
2. **Growth Still Applies**: Even if income is $0, growth rate compounds
3. **Affects All Components**: Salary, equity, 401k contributions, company match all reduced proportionally
4. **Multiple Breaks Supported**: Can have multiple breaks in different years
5. **Overlapping Breaks**: If breaks overlap, apply the maximum reduction (not cumulative)

**Calculation Flow:**

```javascript
For each month (monthIndex 0-1199):
  year = floor(monthIndex / 12) + 1
  month = (monthIndex % 12) + 1

  // Calculate base amounts with growth and jumps
  baseAnnualSalary = stream.annualIncome * growthMultiplier * jumpMultiplier

  // Check if ANY career break is active this month
  activeBreakReduction = 0  // 0-100%

  stream.careerBreaks.forEach(break => {
    startMonth = (break.startYear - 1) * 12 + 1  // Break starts in January of startYear
    endMonth = startMonth + break.durationMonths - 1

    if (monthIndex >= startMonth && monthIndex <= endMonth) {
      // This break is active this month
      activeBreakReduction = Math.max(activeBreakReduction, break.reductionPercent)
    }
  })

  // Apply reduction to all components
  reductionMultiplier = 1 - (activeBreakReduction / 100)

  monthlySalary = (baseAnnualSalary / 12) * reductionMultiplier
  monthlyEquity = (baseAnnualEquity / 12) * reductionMultiplier
  monthlyCompany401k = (baseAnnualCompany401k / 12) * reductionMultiplier
  monthlyIndividual401k = (baseAnnualIndividual401k / 12) * reductionMultiplier
```

**Why This Approach:**
- Monthly calculation allows accurate partial-year proration
- Growth compounds on the reduced base (mathematically correct)
- Maximum reduction handles overlapping breaks (conservative approach)
- All components scale proportionally (maintains financial ratios)

### 2.3 Interaction with Existing Features

**Career Break + Jump Interaction:**

Scenario: 10% raise in Year 3, 100% layoff for 6 months in Year 5

```
Year 1: $150,000 * 1.0 (jump multiplier) = $150,000
Year 2: $150,000 * 1.0 * growth = $155,250 (3.5% growth)
Year 3: $155,250 * 1.10 (jump applied) = $170,775
Year 4: $170,775 * growth = $176,752
Year 5 months 1-6: $183,018 * 0 (100% reduction) = $0
Year 5 months 7-12: $183,018 * 1 (break ends) = $183,018
Year 6: Back to full amount with continued growth
```

**Key Point**: Jumps are applied BEFORE career breaks. The break temporarily reduces the already-jumped amount.

**Career Break + Multiple Streams:**
- Each stream's breaks are independent
- Stream 1 on break doesn't affect Stream 2
- Useful for modeling:
  - Primary job layoff while side income continues
  - One spouse taking leave while other works

**Career Break + Growth Rate:**
- Growth rate continues to compound even during break
- When returning from break, you return to the grown amount (not the pre-break amount)
- Example:
  - Year 5 start: $183,018
  - 12-month full layoff ($0 income)
  - Year 6 start: $183,018 * 1.035 = $189,424 (growth still applied)

---

## Part 3: UI Design

### 3.1 Income.jsx - Career Breaks Section

Add a new section after Income Jumps within each income stream card:

```jsx
{/* Career Breaks Section */}
<div className="mt-4 pt-4 border-t border-gray-200">
  <div className="flex justify-between items-center mb-3">
    <h3 className="text-xs font-semibold text-gray-700 uppercase">
      Career Breaks
      <span className="ml-2 text-gray-500 font-normal normal-case text-[10px]">
        (Temporary reductions: layoffs, sabbaticals, parental leave)
      </span>
    </h3>
    <button
      onClick={() => addCareerBreak(stream.id)}
      className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 font-medium"
    >
      + Add Career Break
    </button>
  </div>

  {stream.careerBreaks && stream.careerBreaks.length > 0 ? (
    <div className="space-y-3">
      {stream.careerBreaks.map((breakItem) => (
        <div key={breakItem.id} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          {/* Description */}
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={breakItem.description}
              onChange={(e) => handleCareerBreakChange(stream.id, breakItem.id, 'description', e.target.value)}
              placeholder="e.g., Parental Leave, Sabbatical, Layoff"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Start Year, Duration, Reduction % */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start Year
              </label>
              <input
                type="number"
                min="1"
                value={breakItem.startYear}
                onChange={(e) => handleCareerBreakChange(stream.id, breakItem.id, 'startYear', Number(e.target.value))}
                placeholder="5"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Duration (months)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={breakItem.durationMonths}
                onChange={(e) => handleCareerBreakChange(stream.id, breakItem.id, 'durationMonths', Number(e.target.value))}
                placeholder="18"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reduction %
                <span className="ml-1 text-gray-500">(0-100)</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={breakItem.reductionPercent}
                onChange={(e) => handleCareerBreakChange(stream.id, breakItem.id, 'reductionPercent', Number(e.target.value))}
                placeholder="100"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Duration Helper Text */}
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[10px] text-gray-600">
              {breakItem.durationMonths && breakItem.startYear ? (
                <>
                  From <strong>Jan Year {breakItem.startYear}</strong> for{' '}
                  <strong>{breakItem.durationMonths} months</strong>{' '}
                  ({(breakItem.durationMonths / 12).toFixed(2)} years)
                </>
              ) : (
                'Fill in values to see timeline'
              )}
            </p>

            <button
              onClick={() => removeCareerBreak(stream.id, breakItem.id)}
              className="text-xs px-2 py-1 bg-white border border-red-300 text-red-600 rounded hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-xs text-gray-500 italic">
      No career breaks added yet. Add one to model layoffs, sabbaticals, or parental leave.
    </p>
  )}
</div>
```

**Visual Design:**
- **Purple color scheme** to differentiate from green income jumps
- **Clear labels** with helper text for months-to-years conversion
- **Inline timeline preview** shows "From Jan Year 5 for 18 months (1.50 years)"
- **Validation hints** in placeholder and labels (0-100%, minimum 1 month)

### 3.2 State Management Functions

Add to Income.jsx:

```javascript
// Add Career Break
const addCareerBreak = (streamId) => {
  const newBreak = {
    id: `break-${Date.now()}`,
    startYear: '',
    durationMonths: '',
    reductionPercent: 100,  // Default to 100% (full layoff)
    description: ''
  }

  setData(prev => ({
    ...prev,
    incomeStreams: prev.incomeStreams.map(stream =>
      stream.id === streamId
        ? { ...stream, careerBreaks: [...(stream.careerBreaks || []), newBreak] }
        : stream
    )
  }))
}

// Update Career Break Field
const handleCareerBreakChange = (streamId, breakId, field, value) => {
  setData(prev => ({
    ...prev,
    incomeStreams: prev.incomeStreams.map(stream =>
      stream.id === streamId
        ? {
            ...stream,
            careerBreaks: (stream.careerBreaks || []).map(breakItem =>
              breakItem.id === breakId
                ? { ...breakItem, [field]: value }
                : breakItem
            )
          }
        : stream
    )
  }))
}

// Remove Career Break
const removeCareerBreak = (streamId, breakId) => {
  setData(prev => ({
    ...prev,
    incomeStreams: prev.incomeStreams.map(stream =>
      stream.id === streamId
        ? {
            ...stream,
            careerBreaks: (stream.careerBreaks || []).filter(b => b.id !== breakId)
          }
        : stream
    )
  }))
}
```

---

## Part 4: Calculation Implementation

### 4.1 Modify Income.calc.js

**Current Structure:**
- Monthly loop (1200 months)
- Jumps applied in January of each year
- Cumulative multiplier tracks jump effects

**New Structure:**
- Keep monthly loop
- Jumps still applied in January (line ~93-104)
- **NEW:** Check active career breaks each month
- Apply career break reduction to monthly income

**Code Changes:**

```javascript
// Line ~82-85: Add careerBreak tracking
const streamMultipliers = {}
const streamCareerBreakReductions = {}  // NEW: Track active break reduction per stream
data.incomeStreams.forEach(stream => {
  streamMultipliers[stream.id] = 1.0
  streamCareerBreakReductions[stream.id] = 0  // 0 = no reduction, 100 = full layoff
})

// Line ~107-132: Modified stream calculation loop
data.incomeStreams.forEach(stream => {
  if (year <= stream.endWorkYear) {
    // Calculate growth multiplier (compound growth from year 1)
    const yearsOfGrowth = year - 1
    const growthMultiplier = Math.pow(1 + stream.growthRate / 100, yearsOfGrowth)

    // Get the cumulative jump multiplier for this stream
    const jumpMultiplier = streamMultipliers[stream.id]

    // **NEW: Calculate career break reduction for THIS SPECIFIC MONTH**
    let activeBreakReduction = 0  // 0-100%

    if (stream.careerBreaks && stream.careerBreaks.length > 0) {
      stream.careerBreaks.forEach(breakItem => {
        // Career breaks start in January of startYear
        const breakStartMonthIndex = (breakItem.startYear - 1) * 12  // 0-indexed month
        const breakEndMonthIndex = breakStartMonthIndex + breakItem.durationMonths - 1

        if (monthIndex >= breakStartMonthIndex && monthIndex <= breakEndMonthIndex) {
          // This break is active this month
          // If multiple breaks overlap, use the maximum reduction
          activeBreakReduction = Math.max(activeBreakReduction, breakItem.reductionPercent || 0)
        }
      })
    }

    // Calculate reduction multiplier (0% reduction = 1.0, 100% reduction = 0.0)
    const careerBreakMultiplier = 1 - (activeBreakReduction / 100)

    // Apply growth, jumps, AND career break reduction together
    const annualSalary = stream.annualIncome * growthMultiplier * jumpMultiplier * careerBreakMultiplier
    const annualEquity = stream.equity * growthMultiplier * jumpMultiplier * careerBreakMultiplier
    const annual401k = stream.company401k * growthMultiplier * jumpMultiplier * careerBreakMultiplier

    // Convert to monthly
    salaryNominal += annualSalary / 12
    equityNominal += annualEquity / 12
    company401kNominal += annual401k / 12

    // Individual 401k also reduced during career break
    // (You can't contribute if you're not earning)
    const annualIndividual401k = stream.individual401k * growthMultiplier * jumpMultiplier * careerBreakMultiplier
    individual401kNominal += annualIndividual401k / 12
  }
})
```

**Key Points:**
1. **Check each month**: Career break active status checked for every monthIndex
2. **Maximum reduction**: If multiple breaks overlap, take the max (conservative)
3. **All components reduced**: Salary, equity, 401k contributions, company match
4. **Growth still applies**: Growth multiplier applied first, then reduction
5. **Month-level precision**: Allows accurate proration for partial years

### 4.2 Validation

Add to Income.calc.js `validateIncome()` function:

```javascript
// Validate career breaks for this stream
if (stream.careerBreaks && stream.careerBreaks.length > 0) {
  stream.careerBreaks.forEach((breakItem, breakIndex) => {
    const breakId = breakItem.id || breakIndex

    // Start year must be valid
    if (!breakItem.startYear || breakItem.startYear < 1) {
      errors[`${stream.id}-break-${breakId}-startYear`] = 'Start year must be 1 or greater'
    }
    if (breakItem.startYear > yearsToRetirement) {
      errors[`${stream.id}-break-${breakId}-startYear`] = `Start year cannot exceed retirement year (${yearsToRetirement})`
    }

    // Duration must be at least 1 month
    if (!breakItem.durationMonths || breakItem.durationMonths < 1) {
      errors[`${stream.id}-break-${breakId}-durationMonths`] = 'Duration must be at least 1 month'
    }

    // Reduction must be 0-100%
    if (breakItem.reductionPercent === '' || breakItem.reductionPercent === undefined) {
      errors[`${stream.id}-break-${breakId}-reductionPercent`] = 'Reduction percent is required'
    }
    if (breakItem.reductionPercent < 0 || breakItem.reductionPercent > 100) {
      errors[`${stream.id}-break-${breakId}-reductionPercent`] = 'Reduction must be between 0% and 100%'
    }

    // Optional: Check if break extends past retirement
    const breakEndYear = breakItem.startYear + Math.ceil(breakItem.durationMonths / 12)
    if (breakEndYear > yearsToRetirement) {
      errors[`${stream.id}-break-${breakId}-duration`] = `Career break extends past retirement (ends Year ${breakEndYear}, retirement Year ${yearsToRetirement})`
    }
  })
}
```

---

## Part 5: Scenario Editor Updates

### 5.1 Missing Features in Scenario Editor

**Current State (ScenarioEditor.jsx):**
- **Income Tab**: Basic fields only (salary, 401k, equity, growth, endWorkYear)
  - ❌ Missing: Income jumps
  - ❌ Missing: Career breaks (NEW)
- **Expense Tab**: Only category name and annual amount
  - ❌ Missing: Growth rate
  - ❌ Missing: Amount type (dollar vs % of income)
  - ❌ Missing: Expense jumps
  - ❌ Missing: One-time expenses

**User Pain Point**: Scenario editor says "For advanced editing (jumps, multi-year changes), use the JSON tab" (line 464)

### 5.2 Enhanced Income Tab - Add Jumps and Career Breaks

**Option A: Collapsible Sections (RECOMMENDED)**

```jsx
{/* Income Tab - Enhanced */}
{activeTab === 'income' && (
  <div>
    {data.income.incomeStreams.map((stream, index) => (
      <div key={stream.id} className="mb-6 p-4 border border-gray-200 rounded">
        {/* Basic Fields - Always Visible */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Stream name, salary, equity, growth, 401k, endWorkYear */}
        </div>

        {/* Collapsible: Income Jumps */}
        <details className="mt-3 border-t pt-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-blue-600">
            Income Jumps ({stream.jumps?.length || 0})
          </summary>
          <div className="mt-3 space-y-2">
            {/* Render jump editing UI (similar to Income.jsx) */}
          </div>
        </details>

        {/* Collapsible: Career Breaks */}
        <details className="mt-3 border-t pt-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-blue-600">
            Career Breaks ({stream.careerBreaks?.length || 0})
          </summary>
          <div className="mt-3 space-y-2">
            {/* Render career break editing UI (NEW) */}
          </div>
        </details>
      </div>
    ))}
  </div>
)}
```

**Benefits:**
- Keeps simple scenarios simple (collapsed by default)
- Shows count in summary line
- Familiar `<details>` HTML element (native browser support)
- No additional state management needed

**Option B: Full UI Replication**

Copy the exact UI from Income.jsx (jumps and career breaks sections) into ScenarioEditor.jsx.

**Benefits:**
- 100% feature parity
- Consistent UX with main module

**Drawback:**
- More code duplication
- Larger file size

**Recommendation**: Use Option A (collapsible) for scenario editor to keep it compact.

### 5.3 Enhanced Expense Tab - Add All Missing Features

```jsx
{/* Expense Tab - Enhanced */}
{activeTab === 'expenses' && (
  <div>
    {/* Expense Categories */}
    <div className="space-y-4">
      {data.expenses.expenseCategories.map((category, index) => (
        <div key={category.id} className="p-4 border border-gray-200 rounded">
          {/* Category Name */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Category Name</label>
            <input type="text" value={category.category} />
          </div>

          {/* Amount Type Selector */}
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Amount Type</label>
              <select
                value={category.amountType || 'dollar'}
                onChange={(e) => {
                  const updated = [...data.expenses.expenseCategories]
                  updated[index] = { ...updated[index], amountType: e.target.value }
                  handleDataChange('expenses', { expenseCategories: updated })
                }}
              >
                <option value="dollar">$ Fixed Amount</option>
                <option value="percentOfIncome">% of Gross Income</option>
              </select>
            </div>

            {category.amountType === 'percentOfIncome' ? (
              <div>
                <label className="block text-sm font-medium mb-1">Percent of Income</label>
                <input type="number" step="0.1" value={category.percentOfIncome} />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">Annual Amount ($)</label>
                <input type="number" value={category.annualAmount} />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Growth Rate (%)</label>
              <input type="number" step="0.1" value={category.growthRate} />
            </div>
          </div>

          {/* Collapsible: Expense Jumps */}
          <details className="mt-3 border-t pt-3">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              Expense Changes ({category.jumps?.length || 0})
            </summary>
            <div className="mt-3">
              {/* Render expense jump editing UI */}
            </div>
          </details>

          <button className="mt-3 px-3 py-1 bg-red-600 text-white rounded">
            Delete Category
          </button>
        </div>
      ))}
    </div>

    {/* One-Time Expenses Section */}
    <details className="mt-6 border-t pt-4">
      <summary className="cursor-pointer text-lg font-semibold text-gray-700">
        One-Time Expenses ({data.expenses.oneTimeExpenses?.length || 0})
      </summary>
      <div className="mt-4">
        {/* Render one-time expense editing UI */}
      </div>
    </details>
  </div>
)}
```

**Features Added:**
- ✅ Amount type selector (dollar vs % of income)
- ✅ Conditional fields based on amount type
- ✅ Growth rate input
- ✅ Expense jumps (all 4 types: percent, dollar, setAmountPV, percentOfIncome)
- ✅ One-time expenses
- ✅ Full feature parity with main Expenses module

---

## Part 6: Implementation Steps

### Phase 1: Career Breaks Core Feature (Income Module)

**Step 1.1**: Update data model and default creation
- File: `/src/core/config/index.js`
- Add `careerBreaks: []` to `createDefaultIncomeStream()`
- Test: Verify new streams have empty careerBreaks array

**Step 1.2**: Add UI components to Income.jsx
- File: `/src/features/income/Income.jsx`
- Add Career Breaks section after Income Jumps (line ~433)
- Implement: `addCareerBreak()`, `handleCareerBreakChange()`, `removeCareerBreak()`
- Styling: Purple theme to differentiate from green jumps
- Test: Add/edit/remove career breaks in UI

**Step 1.3**: Implement calculation logic
- File: `/src/features/income/Income.calc.js`
- Add `streamCareerBreakReductions` tracking (line ~85)
- Add monthly career break check (line ~120-145)
- Apply reduction multiplier to all components
- Test: Verify proration works for partial years

**Step 1.4**: Add validation
- File: `/src/features/income/Income.calc.js`
- Add career break validation to `validateIncome()` (line ~45-60)
- Validate: startYear, durationMonths, reductionPercent ranges
- Test: Invalid inputs show proper error messages

**Step 1.5**: Update documentation
- File: `/docs/modules/income.md`
- Add Career Breaks section
- Include examples and use cases
- Test: Documentation is clear and accurate

### Phase 2: Career Breaks in Scenario Editor

**Step 2.1**: Add collapsible career breaks section
- File: `/src/features/scenarios/ScenarioEditor.jsx`
- Add `<details>` section for career breaks in income tab (line ~460)
- Implement state management functions
- Test: Can add/edit/remove career breaks in scenario

**Step 2.2**: Add income jumps section (while we're there)
- File: `/src/features/scenarios/ScenarioEditor.jsx`
- Add `<details>` section for income jumps in income tab
- Test: Can add/edit/remove jumps in scenario

### Phase 3: Enhanced Expenses in Scenario Editor

**Step 3.1**: Add amount type selector
- File: `/src/features/scenarios/ScenarioEditor.jsx`
- Add dropdown for dollar vs % of income (line ~520)
- Add conditional rendering for percentOfIncome vs annualAmount
- Test: Can switch between types

**Step 3.2**: Add growth rate field
- File: `/src/features/scenarios/ScenarioEditor.jsx`
- Add growth rate input field
- Test: Growth rate persists and calculates correctly

**Step 3.3**: Add expense jumps section
- File: `/src/features/scenarios/ScenarioEditor.jsx`
- Add `<details>` section for expense jumps
- Implement all 4 jump types (percent, dollar, setAmountPV, percentOfIncome)
- Test: All jump types work in scenario

**Step 3.4**: Add one-time expenses section
- File: `/src/features/scenarios/ScenarioEditor.jsx`
- Add collapsible one-time expenses section
- Implement add/edit/remove functions
- Test: One-time expenses calculate correctly

### Phase 4: Testing & Documentation

**Step 4.1**: Create test scenarios
- Full layoff (100% for 12 months)
- Partial leave (50% for 18 months)
- Multiple breaks (layoff in year 5, sabbatical in year 10)
- Overlapping breaks
- Career break + income jump combination

**Step 4.2**: Verify calculations
- Check proration for partial years
- Verify growth still applies during break
- Validate return to full income after break
- Check all components (salary, 401k, equity) reduced proportionally

**Step 4.3**: Update API documentation
- File: `/src/features/scenarios/API-CONTRACT.md`
- Document career breaks data structure
- Add examples

---

## Part 7: Use Cases & Examples

### Use Case 1: Parental Leave

**Scenario**: 6 months full leave (100% reduction) followed by 6 months part-time (50% reduction) in Year 3

```javascript
careerBreaks: [
  {
    id: 'break-1',
    startYear: 3,
    durationMonths: 6,
    reductionPercent: 100,
    description: 'Parental Leave (Full)'
  },
  {
    id: 'break-2',
    startYear: 3.5,  // Can specify mid-year start
    durationMonths: 6,
    reductionPercent: 50,
    description: 'Parental Leave (Part-Time)'
  }
]
```

**Calculation**:
- Year 3 Jan-Jun: $0 income
- Year 3 Jul-Dec: 50% income
- Year 3 annual income: (0 * 6 + 50% * 6) / 12 = 25% of annual
- Year 4: Back to 100%, with growth applied

### Use Case 2: Layoff with Severance

**Scenario**: Layoff in Year 8, 3 months severance (100% pay), then 9 months unemployment (0%)

**Implementation**: Can't model severance directly with career breaks, but can use income jump:
- Jump in Year 8: Add severance package as one-time income bump
- Career break in Year 8: 100% reduction for 9 months starting month 4

### Use Case 3: Sabbatical

**Scenario**: 1-year sabbatical at 20% consulting income in Year 15

```javascript
careerBreaks: [
  {
    id: 'break-sabbatical',
    startYear: 15,
    durationMonths: 12,
    reductionPercent: 80,  // 20% income remains
    description: 'Sabbatical (20% consulting)'
  }
]
```

### Use Case 4: Phased Retirement

**Scenario**: Part-time work (50%) for 2 years before full retirement

```javascript
{
  endWorkYear: 35,  // Full retirement at year 35
  careerBreaks: [
    {
      id: 'break-phased',
      startYear: 33,
      durationMonths: 24,  // 2 years
      reductionPercent: 50,
      description: 'Phased Retirement (50%)'
    }
  ]
}
```

---

## Part 8: Edge Cases & Considerations

### Edge Case 1: Career Break Extends Past endWorkYear

**Scenario**: Career break starts Year 28, lasts 36 months (3 years), but endWorkYear is 30

**Handling**: Break ends when income ends
- Validation warning: "Career break extends past retirement"
- Calculation: Only applies reduction while stream is active (Years 28-30)

### Edge Case 2: Overlapping Career Breaks

**Scenario**: Two breaks overlap in Year 5

Break 1: 50% reduction, months 1-12
Break 2: 100% reduction, months 7-18

**Handling**: Use maximum reduction
- Months 1-6: 50% reduction
- Months 7-12: 100% reduction (max of 50% and 100%)
- Months 13-18 (Year 6): 100% reduction

**Rationale**: Conservative approach, represents worst-case scenario

### Edge Case 3: Career Break During Jump Year

**Scenario**:
- Jump: +15% raise in Year 5
- Career Break: 100% layoff for 6 months in Year 5

**Handling**: Jump applied first, then reduction
- Year 5 base after jump: $150,000 * 1.15 = $172,500
- Months 1-6: $172,500 * 0 = $0
- Months 7-12: $172,500 * 1 = $172,500
- Annual: $86,250 average

### Edge Case 4: Multiple Streams with Different Breaks

**Scenario**:
- Stream 1 (main job): Layoff year 5, 12 months, 100%
- Stream 2 (side gig): Continues at 100%

**Handling**: Each stream independent
- Stream 1 Year 5: $0
- Stream 2 Year 5: Full income
- Total income in Year 5: Stream 2 only

---

## Part 9: Migration & Backward Compatibility

### Backward Compatibility Strategy

**Issue**: Existing income streams don't have `careerBreaks` field

**Solution**: Defensive programming

```javascript
// In Income.calc.js
if (stream.careerBreaks && stream.careerBreaks.length > 0) {
  // Apply career break logic
} else {
  // No career breaks, continue as normal
}

// In Income.jsx
{stream.careerBreaks && stream.careerBreaks.length > 0 ? (
  // Render career breaks
) : (
  <p>No career breaks added yet</p>
)}
```

**Migration Not Required**: Existing data continues to work without changes

### Data Validation on Load

Add to Income.jsx `useEffect`:

```javascript
useEffect(() => {
  const loadedData = storage.load('income')

  // Ensure careerBreaks array exists for each stream
  if (loadedData && loadedData.incomeStreams) {
    loadedData.incomeStreams = loadedData.incomeStreams.map(stream => ({
      ...stream,
      careerBreaks: stream.careerBreaks || []  // Add empty array if missing
    }))
  }

  setData(loadedData)
}, [])
```

---

## Part 10: Testing Checklist

### Unit Tests (Calculation Logic)

- [ ] Career break reduces income correctly (100% reduction = $0)
- [ ] Career break reduces all components (salary, 401k, equity, company match)
- [ ] Partial reduction works (50% reduction = 50% income)
- [ ] Multi-month break prorates correctly across years
- [ ] Growth rate still applies during break
- [ ] Return to full income after break ends
- [ ] Multiple breaks in different years work independently
- [ ] Overlapping breaks use maximum reduction
- [ ] Career break + jump interaction works correctly
- [ ] Validation catches invalid inputs (year, duration, percent)

### Integration Tests (UI + Calc)

- [ ] Add career break in Income module UI
- [ ] Edit existing career break fields
- [ ] Remove career break
- [ ] Career break persists after save
- [ ] Career break calculations show in Dashboard
- [ ] Career break works in scenarios
- [ ] Add career break in Scenario Editor
- [ ] Scenario comparison shows career break effects

### UI Tests

- [ ] Career break section renders correctly
- [ ] Timeline helper text shows correct date range
- [ ] Validation errors display properly
- [ ] Purple styling differentiates from green jumps
- [ ] Collapsible sections work in Scenario Editor

### End-to-End Tests

- [ ] Create scenario with layoff, compare to current plan
- [ ] Model parental leave with phased return
- [ ] Model sabbatical with partial consulting income
- [ ] Model phased retirement with gradual reduction
- [ ] Export scenario with career breaks to CSV/JSON

---

## Part 11: Documentation Plan

### Files to Create/Update

**1. Feature Documentation**
- File: `/docs/features/career-breaks.md` (NEW)
- Content: Overview, use cases, examples, FAQ

**2. Module Documentation**
- File: `/docs/modules/income.md`
- Update: Add Career Breaks section

**3. Scenario Editor Guide**
- File: `/docs/modules/scenarios.md`
- Update: Document new scenario editor features

**4. API Contract**
- File: `/src/features/scenarios/API-CONTRACT.md`
- Update: Document careerBreaks data structure

**5. CHANGELOG**
- File: `/CHANGELOG.md`
- Add: Version entry with feature summary

---

## Part 12: Estimated Effort

| Phase | Task | Est. Time | Priority |
|-------|------|-----------|----------|
| 1.1 | Data model updates | 30 min | P0 |
| 1.2 | Income UI components | 2 hours | P0 |
| 1.3 | Calculation logic | 2 hours | P0 |
| 1.4 | Validation | 1 hour | P0 |
| 1.5 | Income documentation | 1 hour | P1 |
| 2.1 | Scenario editor career breaks | 1.5 hours | P0 |
| 2.2 | Scenario editor income jumps | 1 hour | P1 |
| 3.1-3.4 | Scenario editor expenses | 3 hours | P1 |
| 4.1-4.3 | Testing & verification | 2 hours | P0 |
| **Total** | | **14 hours** | |

**P0**: Must-have for release
**P1**: Should-have, can be separate PR

---

## Part 13: Success Criteria

### Feature Complete When:

1. ✅ User can add/edit/remove career breaks in Income module
2. ✅ Career breaks reduce all income components proportionally
3. ✅ Proration works correctly for partial years (18 months = 1.5 years)
4. ✅ Growth rate continues to compound during break
5. ✅ Multiple career breaks work independently
6. ✅ Career breaks work in scenarios and scenario editor
7. ✅ Scenario editor has income jumps
8. ✅ Scenario editor has full expense features (% of income, jumps, one-time)
9. ✅ All validations working and showing clear errors
10. ✅ Documentation complete and accurate

---

## Summary

This plan provides a comprehensive roadmap for implementing Career Breaks alongside enhancing the Scenario Editor. The feature is well-scoped, backward compatible, and follows existing patterns in the codebase. Implementation can proceed incrementally with clear phases and success criteria.
