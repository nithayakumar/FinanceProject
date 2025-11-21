# Scenario Calculation API Contract

This document defines the API contract for scenario calculation functions to prevent future mismatches.

## Core Functions

### `calculateScenarioProjections(scenarioData)`

**Purpose**: Calculate full financial projections for a scenario over all years to retirement.

**Input**: Complete scenario data object containing profile, income, expenses, and investmentsDebt.

**Output**: ProjectionResults object with the following structure:

```javascript
{
  incomeData: {
    // Income projection data
    projections: [...] // Monthly income projections
  },
  expensesData: {
    // Expense projection data
    projections: [...] // Monthly expense projections
  },
  projections: [
    // ⚠️ IMPORTANT: This is an ARRAY of yearly projections
    {
      year: 1,              // Year number (1, 2, 3, ...)
      grossIncome: 140250,  // Total annual income (nominal $)
      annualTaxes: 32157,   // Total annual taxes (nominal $)
      annualExpenses: 48750,// Total annual expenses (nominal $)
      gap: 59343,           // Annual savings/gap (nominal $)
      netWorth: 65000,      // Net worth at end of year (nominal $)
      // ... many more fields
    },
    { year: 2, ... },
    { year: 3, ... },
    ...
  ],
  gapSummary: {
    // Summary statistics
  }
}
```

**⚠️ CRITICAL**: The `projections` field is an **ARRAY**, not an object with individual year properties.

### `getFirstYearSummary(projectionResults)`

**Purpose**: Safely extract first year summary data from projection results.

**Input**: ProjectionResults object from `calculateScenarioProjections()`

**Output**: First year summary object:

```javascript
{
  income: 140250,    // Annual gross income
  taxes: 32157,      // Annual taxes
  expenses: 48750,   // Annual expenses
  gap: 59343,        // Annual gap/savings
  netWorth: 65000    // Net worth at end of year
}
```

**Benefits**:
- ✅ Validates structure automatically
- ✅ Throws clear errors if structure is wrong
- ✅ Returns properly named fields
- ✅ Prevents silent failures

### `validateProjectionResults(projectionResults)`

**Purpose**: Validate that projection results have the expected structure.

**Input**: ProjectionResults object

**Output**: Returns `true` if valid, throws descriptive error if invalid

**Example Errors**:
- `"ProjectionResults.projections must be an array"`
- `"ProjectionResults.projections[0] is missing required field: annualTaxes"`
- `"ProjectionResults.projections[0].gap must be a number, got undefined"`

## Usage Examples

### ✅ CORRECT Usage

```javascript
import { calculateScenarioProjections, getFirstYearSummary } from './Scenario.calc'

// Calculate projections
const projectionResults = calculateScenarioProjections(scenarioData)

// Get first year summary using helper (RECOMMENDED)
const summary = getFirstYearSummary(projectionResults)
console.log(`Income: ${summary.income}, Taxes: ${summary.taxes}`)

// OR manually extract if you need more control
const firstYear = projectionResults.projections[0]
console.log(`Income: ${firstYear.grossIncome}, Taxes: ${firstYear.annualTaxes}`)
```

### ❌ WRONG Usage (What Caused the Bug)

```javascript
// DON'T DO THIS - these properties don't exist!
const summary = {
  income: projections.firstYearIncome || 0,      // ❌ Doesn't exist
  expenses: projections.firstYearExpenses || 0,  // ❌ Doesn't exist
  gap: projections.firstYearGap || 0            // ❌ Doesn't exist
}
// This silently returns all zeros due to the || 0 fallback
```

## Field Name Reference

When accessing projection data, use these exact field names:

| Concept | Projection Field Name | Summary Helper Name |
|---------|----------------------|---------------------|
| Total Income | `grossIncome` | `income` |
| Taxes | `annualTaxes` | `taxes` |
| Expenses | `annualExpenses` | `expenses` |
| Savings/Gap | `gap` | `gap` |
| Net Worth | `netWorth` | `netWorth` |

## Best Practices

1. **Use the helper function**: `getFirstYearSummary()` is the safest way to extract first year data
2. **Don't assume structure**: Always validate or use helpers instead of directly accessing nested properties
3. **Check console logs**: The validation will throw clear errors if structure is wrong
4. **Add JSDoc types**: When creating new functions, document the expected input/output structure
5. **Test with real data**: Don't rely on fallbacks like `|| 0` to hide structural issues

## Why This Matters

The original bug occurred because:
1. Code assumed `projections.firstYearIncome` existed (it didn't)
2. Fallback `|| 0` silently masked the error
3. All values appeared as `0`, including taxes
4. No errors were thrown, making debugging difficult

The new system:
1. ✅ Validates structure automatically
2. ✅ Throws clear, descriptive errors
3. ✅ Provides helper functions for common operations
4. ✅ Documents expected structure in JSDoc
5. ✅ Catches mismatches during development, not production

## TypeScript Note

If this project is ever converted to TypeScript, these interfaces should be defined:

```typescript
interface ProjectionYear {
  year: number
  grossIncome: number
  annualTaxes: number
  annualExpenses: number
  gap: number
  netWorth: number
  // ... other fields
}

interface ProjectionResults {
  incomeData: any
  expensesData: any
  projections: ProjectionYear[]
  gapSummary: any
}
```

This would catch these issues at compile time instead of runtime.
