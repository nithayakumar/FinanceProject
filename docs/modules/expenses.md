# Expenses Module Reference

## Overview

The Expenses module tracks recurring annual expenses across 9 predefined categories and allows for one-time expense events. Each category has its own growth rate (typically matching inflation) and can have expense changes (jumps) applied at specific years. The module generates comprehensive projections over 100 years (1,200 months) with both nominal and present value calculations.

## Field Reference

### Expense Categories

The module provides 9 predefined expense categories:
1. Housing
2. Utilities
3. Transportation
4. Medical
5. Childcare
6. Education
7. Food
8. Entertainment
9. Other

#### Annual Amount (per category)
- **Type**: Number (currency)
- **Default**: Empty (can be 0)
- **Validation**:
  - Must be ≥ 0
  - Error: "Annual amount must be a positive number or 0"
- **Purpose**: Base annual expense for this category in today's dollars
- **Note**: Will grow by Growth Rate and be affected by Expense Changes

#### Growth Rate (per category)
- **Type**: Number (percentage)
- **Default**: Profile inflation rate (e.g., 2.7%)
- **Step**: 0.1
- **Validation**:
  - Must be ≥ 0
  - Must be ≤ 50
  - Error: "Growth rate must be a positive number"
  - Error: "Growth rate seems unrealistic (> 50%)"
- **Purpose**: Category-specific annual compound growth rate
- **Note**: Typically set to inflation rate, but can be higher/lower for specific categories (e.g., healthcare often grows faster than inflation)

### Expense Changes (Jumps)

Each category can have multiple expense changes representing life events, relocations, or lifestyle adjustments:

#### Category
- **Type**: Implicit (determined by which category the jump is added to)
- **Purpose**: Associates this change with a specific expense category
- **Display**: Shown as label on each change card

#### Description
- **Type**: String
- **Default**: Empty
- **Validation**: None (free text)
- **Purpose**: Labels the expense change event (e.g., "Move to cheaper area", "Kids leave for college")

#### Year
- **Type**: Number (relative year)
- **Default**: Empty
- **Validation**:
  - Must be > 0
  - Must be ≤ yearsToRetirement
  - Error: "Jump year cannot exceed retirement year (X)"
- **Purpose**: When the expense change occurs (relative to start of projections)

#### Change Type
- **Type**: String (dropdown)
- **Options**: "percent" or "dollar"
- **Default**: "percent"
- **Purpose**: Determines how the change is applied
  - **percent**: Multiplies current amount by (1 + changeValue / 100)
  - **dollar**: Adds changeValue to current amount

#### Change Value
- **Type**: Number
- **Default**: Empty
- **Validation**: Required when jump is defined
- **Purpose**:
  - If changeType is "percent": percentage change (can be positive or negative)
  - If changeType is "dollar": dollar amount to add (can be positive or negative)
- **Examples**:
  - Percent: -20 means 20% decrease
  - Percent: +15 means 15% increase
  - Dollar: +5000 adds $5,000 per year
  - Dollar: -3000 removes $3,000 per year

### One-Time Expenses

Separate from recurring categories, for major one-time events:

#### Description
- **Type**: String
- **Default**: Empty
- **Validation**: None (free text)
- **Purpose**: Labels the one-time expense (e.g., "Wedding", "Major home repair", "World trip")

#### Year
- **Type**: Number (relative year)
- **Default**: Empty
- **Validation**:
  - Required, must be > 0
  - Must be ≤ yearsToRetirement
  - Error: "Year must be greater than 0"
  - Error: "Year cannot exceed retirement year (X)"
- **Purpose**: When the one-time expense occurs

#### Amount
- **Type**: Number (currency)
- **Default**: Empty
- **Validation**:
  - Required, must be > 0
  - Error: "Amount must be a positive number"
- **Purpose**: Cost of the one-time expense in today's dollars
- **Note**: Amount is entered in today's dollars and will be inflated to nominal dollars for the specified year

## Calculations

### Recurring Expense Calculation (Monthly)

For each month in the projection:

```javascript
// 1. Calculate growth multiplier (from base year)
const yearsOfGrowth = year - 1  // Year 1 has 0 years of growth
const growthMultiplier = Math.pow(1 + category.growthRate / 100, yearsOfGrowth)

// 2. Calculate cumulative jump multipliers (percentage changes)
let jumpMultiplier = 1.0
category.jumps
  .filter(j => j.changeType === 'percent' && j.year <= currentYear)
  .forEach(j => {
    jumpMultiplier *= (1 + j.changeValue / 100)
  })

// 3. Calculate cumulative dollar additions
let dollarAddition = 0
category.jumps
  .filter(j => j.changeType === 'dollar' && j.year <= currentYear)
  .forEach(j => {
    dollarAddition += j.changeValue
  })

// 4. Calculate annual expense (nominal)
const annualExpense = (category.annualAmount * growthMultiplier * jumpMultiplier) + dollarAddition

// 5. Convert to monthly
const monthlyExpense = annualExpense / 12

// 6. Calculate present value
const yearsFromNow = year - 1
const discountFactor = Math.pow(1 + inflationRate / 100, yearsFromNow)
const monthlyExpensePV = monthlyExpense / discountFactor
```

### Example Calculation: Recurring Expense

**Given:**
- Category: Housing
- Annual Amount: $36,000 (today's dollars)
- Growth Rate: 2.7% (matches inflation)
- Jump in Year 5: -20% (move to cheaper area)
- Jump in Year 10: +$3,000 (property tax increase)
- Profile Inflation Rate: 2.7%

**Year 1:**
```
Growth Multiplier = 1.027^0 = 1.000
Jump Multiplier = 1.000
Dollar Addition = $0

Annual Expense = ($36,000 * 1.000 * 1.000) + $0 = $36,000
Monthly Expense = $36,000 / 12 = $3,000

Discount Factor = 1.027^0 = 1.000
Monthly Expense PV = $3,000 / 1.000 = $3,000
```

**Year 5:**
```
Growth Multiplier = 1.027^4 = 1.1125
Jump Multiplier = 0.80 (20% decrease)
Dollar Addition = $0

Annual Expense = ($36,000 * 1.1125 * 0.80) + $0 = $32,040
Monthly Expense = $32,040 / 12 = $2,670

Discount Factor = 1.027^4 = 1.1125
Monthly Expense PV = $2,670 / 1.1125 = $2,400
```

**Year 10:**
```
Growth Multiplier = 1.027^9 = 1.2723
Jump Multiplier = 0.80 (still applied)
Dollar Addition = $3,000 (property tax increase)

Annual Expense = ($36,000 * 1.2723 * 0.80) + $3,000 = $39,642
Monthly Expense = $39,642 / 12 = $3,303.50

Discount Factor = 1.027^9 = 1.2723
Monthly Expense PV = $3,303.50 / 1.2723 = $2,595.97
```

### Example Calculation: One-Time Expense

**Given:**
- Description: "Wedding"
- Year: 3
- Amount: $50,000 (in today's dollars)
- Profile Inflation Rate: 2.7%

**Calculation:**
```javascript
// Year 3, January (spread over 12 months for monthly view)
const yearsOfInflation = 3 - 1 = 2
const inflationMultiplier = 1.027^2 = 1.0547

// Nominal value (inflated to Year 3 dollars)
const oneTimeNominal = $50,000 * 1.0547 / 12 = $4,394.58 per month

// Present value (already in today's dollars, so no discount needed)
const oneTimePV = $50,000 / 12 = $4,166.67 per month
```

**Key Insight:** One-time expenses are entered in today's dollars, so:
- PV = entered amount (no discounting)
- Nominal = entered amount × inflation multiplier for that year

### Total Monthly Expenses

```javascript
// Sum all category expenses for this month
let totalRecurringNominal = 0
categories.forEach(category => {
  totalRecurringNominal += calculateMonthlyExpense(category, year, month)
})

// Add one-time expenses (if any occur this month)
let oneTimeNominal = 0
oneTimeExpenses.forEach(expense => {
  if (expense.year === year && month === 1) {  // Applied in January
    oneTimeNominal += (expense.amount * inflationMultiplier) / 12
  }
})

const totalExpensesNominal = totalRecurringNominal + oneTimeNominal

// Present values
const totalRecurringPV = totalRecurringNominal / discountFactor
const oneTimePV = oneTimeTodayDollars  // Already in today's dollars
const totalExpensesPV = totalRecurringPV + oneTimePV
```

### Summary Statistics

**Current Year Expenses:**
```javascript
const year1Months = projections.filter(p => p.year === 1)
const currentYearExpensesNominal = year1Months.reduce((sum, p) => sum + p.totalExpensesNominal, 0)
const currentYearExpensesPV = year1Months.reduce((sum, p) => sum + p.totalExpensesPV, 0)
```

**Lifetime Expenses (to retirement):**
```javascript
const retirementMonthIndex = yearsToRetirement * 12 - 1
const lifetimeMonths = projections.filter(p => p.monthIndex <= retirementMonthIndex)

const lifetimeExpensesNominal = lifetimeMonths.reduce((sum, p) => sum + p.totalExpensesNominal, 0)
const lifetimeExpensesPV = lifetimeMonths.reduce((sum, p) => sum + p.totalExpensesPV, 0)
```

**Category Breakdown (Lifetime):**
```javascript
const categoryTotals = {}
lifetimeMonths.forEach(proj => {
  Object.keys(proj.categoryBreakdownNominal).forEach(cat => {
    categoryTotals[cat] = (categoryTotals[cat] || 0) + proj.categoryBreakdownNominal[cat]
  })
})
```

## Data Flow

### Inputs
- User enters annual amounts for each of the 9 categories
- User sets growth rate for each category (defaults to profile inflation rate)
- User adds expense changes (jumps) for specific categories at specific years
- User adds one-time expenses with year and amount
- Profile data (yearsToRetirement, inflationRate) loaded from localStorage

### Storage
All expense data saved to localStorage as 'expenses' key:
```javascript
storage.save('expenses', {
  expenseCategories: [
    {
      id: 'category-housing',
      category: 'Housing',
      annualAmount: 36000,
      growthRate: 2.7,
      jumps: [
        {
          id: 'jump-123',
          year: 5,
          changeType: 'percent',
          changeValue: -20,
          description: 'Move to cheaper area'
        },
        {
          id: 'jump-456',
          year: 10,
          changeType: 'dollar',
          changeValue: 3000,
          description: 'Property tax increase'
        }
      ]
    },
    // ... 8 more categories
  ],
  oneTimeExpenses: [
    {
      id: 'onetime-789',
      year: 3,
      amount: 50000,
      description: 'Wedding'
    }
  ]
})
```

### Outputs (Used by other modules)

**Gap/Net Worth Module:**
- Uses `projections` array (monthly data)
- Extracts: `annualExpenses`, `annualExpensesPV`
- Formula: `Gap = Income - Individual401k - Taxes - Expenses`

### Dependencies

**Requires:**
- Personal Details module: `yearsToRetirement`, `inflationRate`

**Consumed by:**
- Gap/Net Worth module (primary consumer)

## Validation Logic

All validation is performed in `Expenses.calc.js` by the `validateExpenses()` function:

```javascript
export function validateExpenses(data, yearsToRetirement) {
  const errors = {}

  // Validate each expense category
  data.expenseCategories.forEach((category) => {
    // Annual Amount: must be >= 0
    if (category.annualAmount === '' || category.annualAmount < 0) {
      errors[`${category.id}-annualAmount`] = 'Annual amount must be a positive number or 0'
    }

    // Growth Rate: must be 0 <= rate <= 50
    if (category.growthRate === '' || category.growthRate < 0) {
      errors[`${category.id}-growthRate`] = 'Growth rate must be a positive number'
    } else if (category.growthRate > 50) {
      errors[`${category.id}-growthRate`] = 'Growth rate seems unrealistic (> 50%)'
    }

    // Validate jumps for this category
    if (category.jumps && category.jumps.length > 0) {
      category.jumps.forEach((jump) => {
        if (jump.year && jump.year > yearsToRetirement) {
          errors[`${category.id}-jump-${jump.id}-year`] = `Jump year cannot exceed retirement year (${yearsToRetirement})`
        }
        if (jump.changeValue === '' || jump.changeValue === undefined) {
          errors[`${category.id}-jump-${jump.id}-changeValue`] = 'Change value is required'
        }
      })
    }
  })

  // Validate one-time expenses
  data.oneTimeExpenses.forEach((expense) => {
    if (expense.amount === '' || expense.amount < 0) {
      errors[`${expense.id}-amount`] = 'Amount must be a positive number'
    }

    if (expense.year === '' || expense.year <= 0) {
      errors[`${expense.id}-year`] = 'Year must be greater than 0'
    } else if (expense.year > yearsToRetirement) {
      errors[`${expense.id}-year`] = `Year cannot exceed retirement year (${yearsToRetirement})`
    }
  })

  return errors
}
```

## UI Behavior

### Input View

**Expense Categories Table:**
- All 9 categories displayed in a table format
- Columns: Category (label), Annual Amount ($), Growth Rate (%)
- Annual amounts can be 0 (for categories not applicable to user)
- Growth rates default to profile inflation rate

**Expense Changes Section:**
- Shows all expense changes across all categories
- Button row at top to add change to specific category (9 category buttons)
- Each change card shows:
  - Category name (gray label)
  - Description field
  - Year, Type (% or $), Change Value in grid layout
  - Remove button
- Empty state: "No expense changes added yet. Click a category button above to add one."

**One-Time Expenses Section:**
- "+ Add One-Time Expense" button at top right
- Each one-time expense card shows:
  - Description field (inline editable)
  - Year input (max = yearsToRetirement)
  - Amount input with $ prefix
  - Remove button
- Empty state: "No one-time expenses added yet"

**Save Status:**
- Green banner: "Data Saved - This section is ready for the Dashboard"
- Yellow banner: "Not Saved Yet - Fill out the form and click 'Calculate Expense Projections' to save"

**Continue Button:**
- Text: "Calculate Expense Projections →"
- Validates data
- Saves to localStorage
- Calculates projections
- Switches to Output view

### Output View

**Summary Cards:**
- Current Year Expenses (Nominal & PV) - highlighted
- Year 10 Projected Expenses (Nominal & PV)
- Lifetime Expenses (Nominal & PV) - highlighted

**Expense Projection Chart:**
- Stacked bar chart showing annual expenses in Present Value
- Each category shown in different color
- One-time expenses shown in dark gray (#1f2937)
- Legend shows all categories

**Category Breakdown:**
- Grid of cards (3 columns)
- Each card shows lifetime total for that category
- Nominal and PV values
- Format: $Xk for display

**One-Time Expenses Summary:**
- Only shown if oneTimeTotalNominal > 0
- Blue background card
- Shows: Today's Dollars (PV) and Nominal (inflated) totals
- Note: "Amounts entered in today's dollars"

**Key Milestones:**
- Lists all expense changes and one-time expenses by year
- For recurring changes: shows annual expense after change (nominal & PV)
- For one-time: shows amount in today's dollars
- Sorted by year

**Edit Button:**
- Returns to Input view
- Preserves all data

**Continue Button:**
- Text: "Continue to Taxes →"
- Navigates to Taxes module

## Implementation Notes

### Precision Handling

**Important:** As of the rounding precision fix, monthly projections preserve full precision:

```javascript
// ✅ NEW (preserves precision):
projections.push({
  totalRecurringNominal,  // Keeps full precision: $1,458.333...
  // When multiplied by 12: $1,458.333... * 12 = $17,500 ✅
})

// ❌ OLD (caused rounding errors):
projections.push({
  totalRecurringNominal: Math.round(totalRecurringNominal),  // Rounds: $1,458
  // When multiplied by 12: $1,458 * 12 = $17,496 (lost $4) ❌
})
```

**Rule:** Never round intermediate calculations. Only round for display purposes in summary and UI.

### Jump Application Logic

**Percentage Changes (Multiplicative):**
```javascript
// Multiple percentage changes are cumulative and multiplicative
// Example: -20% in Year 5, +10% in Year 10
// Year 1-4: jumpMultiplier = 1.0
// Year 5-9: jumpMultiplier = 1.0 * 0.80 = 0.80 (20% reduction)
// Year 10+:  jumpMultiplier = 0.80 * 1.10 = 0.88 (12% reduction overall)
```

**Dollar Changes (Additive):**
```javascript
// Multiple dollar changes are cumulative and additive
// Example: +$2,000 in Year 5, +$3,000 in Year 10
// Year 1-4: dollarAddition = $0
// Year 5-9: dollarAddition = $2,000
// Year 10+:  dollarAddition = $2,000 + $3,000 = $5,000
```

**Combined Application:**
```javascript
// Growth and percentage jumps apply to base amount, then dollar changes added
const annualExpense = (baseAmount * growth * percentJumps) + dollarChanges
```

### One-Time Expense Treatment

One-time expenses have special handling for inflation:
- **Input**: User enters amount in today's dollars
- **Storage**: Stored as-is (today's dollars)
- **Nominal Calculation**: Inflated to future year dollars
- **PV Calculation**: No discounting (already in today's dollars)

This simplifies user experience - they don't need to guess future costs.

### Chart Data Preparation

Chart data aggregates monthly projections annually:
- Monthly values summed by year
- Each category calculated separately for stacking
- One-time expenses included as separate bar segment
- Present values used for consistent comparison across years

### Default Growth Rates

When initializing categories, growth rates default to profile inflation rate:
```javascript
const initializeCategories = () => {
  return EXPENSE_CATEGORIES.map(category => ({
    id: `category-${category.toLowerCase()}`,
    category,
    annualAmount: '',
    growthRate: profile.inflationRate || 2.7,  // Defaults to inflation
    jumps: []
  }))
}
```

This is a sensible default since most expenses grow with inflation, but users can adjust per category (e.g., healthcare might be higher).

## Performance Considerations

- Generates 1,200 monthly projections (100 years)
- Recalculates jump multipliers and dollar additions each month (could be optimized with caching)
- All calculations performed synchronously on "Calculate Projections" button click
- Typical performance: <100ms for 9 categories with multiple jumps and one-time expenses

## Common Use Cases

### Basic Tracking (Simple)
- Enter annual amounts for applicable categories
- Use default growth rate (matches inflation)
- No jumps or one-time expenses
- Straightforward projection with inflation

### Life Event Changes (Intermediate)
- Base expenses with inflation growth
- Housing: -30% reduction in Year 15 (move to lower COL area after kids leave)
- Childcare: -$25,000 in Year 12 (kids enter public school)
- Education: +$40,000 one-time in Year 18 (college tuition)

### Complex Lifestyle Planning (Advanced)
- Multiple expense changes per category
- Housing: +20% in Year 3 (move to larger home), -40% in Year 20 (downsize)
- Childcare: $30k/year Years 1-5, $15k/year Years 6-12, $0 after Year 12
- Medical: Growth rate 4.5% (above inflation), +$10k one-time in Year 8 (surgery)
- Multiple one-time expenses: Wedding Year 2, Home renovation Year 7, Sabbatical travel Year 15

### Retirement Modeling
- Different growth rates by category
- Healthcare: 4.5% (above inflation)
- Transportation: 1.5% (below inflation, driving less)
- Entertainment: 3.0% (slightly above inflation, more travel)
- Childcare/Education: 0% (children grown)
