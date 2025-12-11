# Income Module Reference

## Overview

The Income module manages multiple income streams with independent growth rates, one-time jumps (promotions/raises), and equity compensation. It generates comprehensive projections over 100 years (1,200 months) with both nominal and present value calculations. The module supports up to 3 concurrent income streams, each with configurable end dates and contribution rates.

## Module Architecture & References
- **Components:** `src/features/income/Income.jsx` renders the input/output views; `Income.calc.js` contains all validation and projection logic.
- **Storage:** Persists under the `income` key; projections are computed on-demand and not stored.
- **Consumers:** Gap/Net Worth uses `projections` and raw `incomeStreams` to calculate gap, taxes, and 401k contributions; Taxes uses taxable income after individual 401k deductions; Investments reads company 401k totals.

## Field Reference

### Income Stream Fields

Each income stream contains the following fields:

#### Stream Name
- **Type**: String
- **Default**: "Income Stream N" (where N is 1, 2, or 3)
- **Validation**: None (free text)
- **Purpose**: Identifies the income source for display and filtering

#### Annual Income
- **Type**: Number (currency)
- **Default**: Empty (required)
- **Validation**:
  - Required, must be ≥ 0
  - Error: "Annual income must be a positive number"
- **Purpose**: Base salary before any growth or jumps
- **Note**: Does not include equity or 401k match

#### Company 401k Match
- **Type**: Number (currency)
- **Default**: Empty (required)
- **Validation**:
  - Required, must be ≥ 0
  - Error: "Company 401k must be a positive number or 0"
- **Purpose**: Annual employer 401k contribution (match or profit sharing)
- **Note**: Not included in taxable income, added directly to 401k balance

#### 401k Contribution Goal (Individual)
- **Type**: Number (currency)
- **Default**: Empty (required)
- **Validation**:
  - Required, must be ≥ 0
  - Error: "Individual 401k contribution must be a positive number or 0"
- **Purpose**: Pre-tax 401k contributions that reduce taxable income
- **Note**: Used by Gap calculation: `Gap = Income - Individual401k - Taxes - Expenses`
- **Display**: "Reduces taxable income" helper text shown

#### Equity (RSU)
- **Type**: Number (currency)
- **Default**: Empty (required)
- **Validation**:
  - Required, must be ≥ 0
  - Error: "Equity must be a positive number or 0"
- **Purpose**: Annual equity compensation (RSUs, stock grants)
- **Note**: Fully taxable as ordinary income

#### Annual Growth Rate
- **Type**: Number (percentage)
- **Default**: Empty (required)
- **Step**: 0.1
- **Validation**:
  - Required, must be ≥ 0
  - Must be ≤ 50
  - Error: "Growth rate must be a positive number"
  - Error: "Growth rate seems unrealistic (> 50%)"
- **Purpose**: Compound annual growth rate applied to all stream components
- **Applies to**: Annual Income, Company 401k, Individual 401k, Equity

#### End Work Year
- **Type**: Number (relative year)
- **Default**: yearsToRetirement
- **Validation**:
  - Required, must be > 0
  - Must be ≤ yearsToRetirement
  - Error: "End work year must be greater than 0"
  - Error: "Cannot exceed retirement year (X)"
- **Purpose**: When this income stream stops (job change, retirement, etc.)
- **Note**: Relative year (1 = first year of projection)

### Income Jumps (Per Stream)

Each stream can have multiple jumps representing promotions, raises, or bonuses:

#### Jump Description
- **Type**: String
- **Default**: Empty
- **Validation**: None (free text)
- **Purpose**: Labels the jump event (e.g., "Promotion to Senior")
- **Display**: Shows in milestones and chart annotations

#### Jump Year
- **Type**: Number (relative year)
- **Default**: Empty
- **Validation**: Automatically validated with stream (must be ≤ endWorkYear)
- **Purpose**: When the jump occurs (relative to start of projections)

#### Jump Percent
- **Type**: Number (percentage)
- **Default**: Empty
- **Step**: 0.1
- **Validation**: Can be positive or negative
- **Purpose**: Percentage increase/decrease applied to all stream components
- **Note**: Cumulative with previous jumps (multiplied)

## Calculations

### Monthly Projection Calculation

For each month in each active stream:

```javascript
// 1. Calculate growth multiplier
const yearsOfGrowth = year - 1  // Year 1 has 0 years of growth
const growthMultiplier = Math.pow(1 + stream.growthRate / 100, yearsOfGrowth)

// 2. Calculate cumulative jump multiplier (applied in January each year)
let jumpMultiplier = 1.0
stream.jumps
  .filter(j => j.year <= currentYear)
  .forEach(j => {
    jumpMultiplier *= (1 + j.jumpPercent / 100)
  })

// 3. Calculate annual nominal values
const annualSalary = stream.annualIncome * growthMultiplier * jumpMultiplier
const annualEquity = stream.equity * growthMultiplier * jumpMultiplier
const annual401k = stream.company401k * growthMultiplier * jumpMultiplier

// 4. Convert to monthly
const monthlySalary = annualSalary / 12
const monthlyEquity = annualEquity / 12
const monthly401k = annual401k / 12
const totalComp = monthlySalary + monthlyEquity + monthly401k

// 5. Calculate present values
const yearsFromNow = year - 1
const discountFactor = Math.pow(1 + inflationRate / 100, yearsFromNow)
const totalCompPV = totalComp / discountFactor
```

### Example Calculation

**Given:**
- Annual Income: $150,000
- Equity (RSU): $50,000
- Company 401k: $10,000
- Individual 401k Goal: $23,000
- Growth Rate: 3.5%
- Jump in Year 5: +10% (promotion)
- Inflation Rate: 2.7%

**Year 1:**
```
Growth Multiplier = 1.035^0 = 1.000
Jump Multiplier = 1.000

Annual Salary = $150,000 * 1.000 * 1.000 = $150,000
Annual Equity = $50,000 * 1.000 * 1.000 = $50,000
Annual 401k = $10,000 * 1.000 * 1.000 = $10,000

Monthly Salary = $150,000 / 12 = $12,500.00
Monthly Equity = $50,000 / 12 = $4,166.67
Monthly 401k = $10,000 / 12 = $833.33
Total Monthly Comp = $17,500.00

Discount Factor = 1.027^0 = 1.000
Monthly Comp PV = $17,500.00 / 1.000 = $17,500.00
```

**Year 5:**
```
Growth Multiplier = 1.035^4 = 1.1475
Jump Multiplier = 1.100 (10% promotion)

Annual Salary = $150,000 * 1.1475 * 1.100 = $189,338
Annual Equity = $50,000 * 1.1475 * 1.100 = $63,113
Annual 401k = $10,000 * 1.1475 * 1.100 = $12,623

Monthly Total = ($189,338 + $63,113 + $12,623) / 12 = $22,089.50

Discount Factor = 1.027^4 = 1.1125
Monthly Comp PV = $22,089.50 / 1.1125 = $19,858.34
```

**Year 10:**
```
Growth Multiplier = 1.035^9 = 1.3629
Jump Multiplier = 1.100

Annual Total = ($150,000 + $50,000 + $10,000) * 1.3629 * 1.100
             = $210,000 * 1.4992
             = $314,832

Monthly Total = $314,832 / 12 = $26,236.00

Discount Factor = 1.027^9 = 1.2723
Monthly Comp PV = $26,236.00 / 1.2723 = $20,620.89
```

### Multiple Streams Calculation

When multiple streams are active, values are simply summed:

```javascript
let totalSalaryNominal = 0
let totalEquityNominal = 0
let total401kNominal = 0

data.incomeStreams.forEach(stream => {
  if (year <= stream.endWorkYear) {
    // Calculate this stream's values (as shown above)
    totalSalaryNominal += monthlySalary
    totalEquityNominal += monthlyEquity
    total401kNominal += monthly401k
  }
})

const totalCompNominal = totalSalaryNominal + totalEquityNominal + total401kNominal
```

### Summary Statistics

**Current Year Total Comp:**
```javascript
const year1Months = projections.filter(p => p.year === 1)
const currentYearCompNominal = year1Months.reduce((sum, p) => sum + p.totalCompNominal, 0)
const currentYearCompPV = year1Months.reduce((sum, p) => sum + p.totalCompPV, 0)
```

**Lifetime Earnings (to retirement):**
```javascript
const retirementMonthIndex = yearsToRetirement * 12 - 1
const lifetimeMonths = projections.filter(p => p.monthIndex <= retirementMonthIndex)

const lifetimeEarningsNominal = lifetimeMonths.reduce((sum, p) => sum + p.totalCompNominal, 0)
const lifetimeEarningsPV = lifetimeMonths.reduce((sum, p) => sum + p.totalCompPV, 0)
```

**Average Annual Growth:**
```javascript
// Weighted average of active streams' growth rates
const averageAnnualGrowth =
  activeStreams.reduce((sum, stream) => sum + (stream.growthRate * stream.annualIncome), 0)
  / activeStreams.reduce((sum, stream) => sum + stream.annualIncome, 0)
```

## Data Flow

### Inputs
- User enters income stream details through the UI
- Profile data (yearsToRetirement, inflationRate) loaded from localStorage

### Storage
All income data saved to localStorage as 'income' key:
```javascript
storage.save('income', {
  incomeStreams: [
    {
      id: 'stream-1',
      name: 'Income Stream 1',
      annualIncome: 150000,
      company401k: 10000,
      individual401k: 23000,
      equity: 50000,
      growthRate: 3.5,
      endWorkYear: 30,
      jumps: [
        {
          id: 'jump-123',
          year: 5,
          jumpPercent: 10,
          description: 'Promotion to Senior'
        }
      ]
    }
  ]
})
```

### Outputs (Used by other modules)

**Gap/Net Worth Module:**
- Uses `projections` array (monthly data)
- Extracts: `annualIncome`, `totalIndividual401k`, `annualIncomePV`, `totalIndividual401kPV`
- Formula: `Gap = Income - Individual401k - Taxes - Expenses`

**Tax Module:**
- Taxable income = `annualIncome - totalIndividual401k`
- Individual 401k contributions reduce taxable income

**Investments Module:**
- Company 401k match added to 401k balance each year
- Individual 401k contributions come from Gap calculation

### Dependencies

**Requires:**
- Personal Details module: `yearsToRetirement`, `inflationRate`, `age`

**Consumed by:**
- Gap/Net Worth module (primary consumer)
- Tax module (for taxable income calculation)

## Validation Logic

All validation is performed in `Income.calc.js` by the `validateIncome()` function:

```javascript
export function validateIncome(data, yearsToRetirement) {
  const errors = {}

  data.incomeStreams.forEach((stream) => {
    // Annual Income: required, >= 0
    if (stream.annualIncome === '' || stream.annualIncome < 0) {
      errors[`${stream.id}-annualIncome`] = 'Annual income must be a positive number'
    }

    // Company 401k: required, >= 0
    if (stream.company401k === '' || stream.company401k < 0) {
      errors[`${stream.id}-company401k`] = 'Company 401k must be a positive number or 0'
    }

    // Individual 401k: required, >= 0
    if (stream.individual401k === '' || stream.individual401k < 0) {
      errors[`${stream.id}-individual401k`] = 'Individual 401k contribution must be a positive number or 0'
    }

    // Equity: required, >= 0
    if (stream.equity === '' || stream.equity < 0) {
      errors[`${stream.id}-equity`] = 'Equity must be a positive number or 0'
    }

    // Growth Rate: required, 0 <= rate <= 50
    if (stream.growthRate === '' || stream.growthRate < 0) {
      errors[`${stream.id}-growthRate`] = 'Growth rate must be a positive number'
    } else if (stream.growthRate > 50) {
      errors[`${stream.id}-growthRate`] = 'Growth rate seems unrealistic (> 50%)'
    }

    // End Work Year: required, 0 < year <= yearsToRetirement
    if (stream.endWorkYear === '' || stream.endWorkYear <= 0) {
      errors[`${stream.id}-endWorkYear`] = 'End work year must be greater than 0'
    } else if (stream.endWorkYear > yearsToRetirement) {
      errors[`${stream.id}-endWorkYear`] = `Cannot exceed retirement year (${yearsToRetirement})`
    }
  })

  return errors
}
```

**Note:** Jump validation is not strict - jumps with empty fields are simply ignored during calculations.

## UI Behavior

### Input View

**Income Streams:**
- Minimum 1 stream, maximum 3 streams
- Each stream in its own bordered card
- "Remove" button shown when more than 1 stream exists
- "+ Add Income Stream" button shown when fewer than 3 streams
- Stream name is editable inline

**Income Jumps:**
- Each stream has its own jumps section
- "+ Add Jump" button in each stream
- Jumps displayed in gray background cards
- Description, Year, and Jump % fields
- "Remove" button for each jump

**Save Status:**
- Green banner: "Data Saved - This section is ready for the Dashboard"
- Yellow banner: "Not Saved Yet - Fill out the form and click 'Calculate Income Projections' to save"

**Continue Button:**
- Text: "Calculate Income Projections →"
- Validates data
- Saves to localStorage
- Calculates projections
- Switches to Output view

### Output View

**Tabs:**
- "All Streams" tab shows combined data
- Individual tabs for each income stream
- Active tab highlighted in blue

**Summary Cards:**
- Current Year Total Comp (Nominal & PV) - highlighted
- Year 10 Projected Comp (Nominal & PV)
- Lifetime Earnings (Nominal & PV) - highlighted
- Average Annual Growth (All Streams tab only)

**Charts:**
- Stacked bar chart showing annual income in Present Value
- All Streams: stacked by stream name with different colors
- Individual Stream: single bar series

**Component Breakdown:**
- Lifetime totals by component: Salary, Equity (RSU), 401k Contributions
- Both Nominal and PV shown for each

**Key Milestones:**
- Lists all jumps with year, description, and resulting compensation
- Filters to current tab's stream when viewing individual streams
- Shows both nominal and PV values

**Edit Button:**
- Returns to Input view
- Preserves all data

**Continue Button:**
- Text: "Continue to Expenses →"
- Navigates to Expenses module

## Implementation Notes

### Precision Handling

**Important:** As of the rounding precision fix (see conversation summary), monthly projections preserve full precision:

```javascript
// ❌ OLD (caused $100,000 → $99,996 error):
projections.push({
  salaryNominal: Math.round(salaryNominal),  // Rounds monthly: $8,333
  // When multiplied by 12: $8,333 * 12 = $99,996 ❌
})

// ✅ NEW (preserves precision):
projections.push({
  salaryNominal,  // Keeps: $8,333.333...
  // When multiplied by 12: $8,333.333... * 12 = $100,000 ✅
})
```

**Rule:** Never round intermediate calculations. Only round for display purposes in UI components.

### Jump Multiplier Tracking

Jumps are cumulative and multiplicative:
```javascript
// Example: Two jumps: +10% in Year 3, +15% in Year 5
// Year 1-2: jumpMultiplier = 1.0
// Year 3-4: jumpMultiplier = 1.0 * 1.10 = 1.10
// Year 5+:   jumpMultiplier = 1.10 * 1.15 = 1.265 (26.5% total increase)
```

### Stream Ending Behavior

When a stream reaches its `endWorkYear`:
- All income from that stream stops immediately
- Other active streams continue unaffected
- Jump multipliers reset for that stream
- Chart shows the stream disappearing

### Per-Stream Summaries

The module calculates separate summaries for each stream (used in individual tabs):
- Requires recalculation because monthly projections store only totals
- Jump multipliers must be recalculated for accurate per-stream values
- Used for filtering chart data and summary cards by tab

### Chart Data Preparation

Chart data is aggregated annually with per-stream breakdown:
- Monthly values summed by year
- Each stream calculated separately for stacking
- Present values used for consistent comparison
- Rounded only for display

## Performance Considerations

- Generates 1,200 monthly projections (100 years)
- Per-stream summaries recalculate stream values (not cached from projections)
- Chart data preparation involves re-computation of stream contributions
- All calculations performed synchronously on "Calculate Projections" button click
- Typical performance: <100ms for 3 streams with multiple jumps each

## Common Use Cases

### Single Income Stream (Simple)
- 1 stream with base salary, 401k, equity
- Steady growth rate (e.g., 3.5%)
- No jumps
- Works until retirement

### Multiple Income Streams (Complex)
- Primary job (Stream 1): ends at retirement
- Side business (Stream 2): starts Year 5, ends Year 20
- Consulting (Stream 3): starts Year 10, continues past retirement

### Promotions and Raises
- Base salary with 3.5% growth
- Jump 1 (Year 3): +10% promotion
- Jump 2 (Year 7): +15% promotion to senior
- Jump 3 (Year 12): +20% promotion to principal
- Each jump is cumulative with growth and previous jumps

### Early Retirement
- Set endWorkYear to less than yearsToRetirement
- Income stops, but projections continue
- Allows modeling gap period before retirement age

---

## Net Worth Impact

The Income module is the **primary driver** of net worth growth through the Gap calculation:

### Direct Impact on Gap
```
Monthly Gap = Gross Income
            - Pre-tax 401k Contributions (Individual)
            - Taxes (calculated on Income - Individual 401k)
            - Expenses
            - Mortgage Payment (if applicable)
```

**Key Points:**
- **Gross Income** = `annualIncome + equity + company401k` (all streams combined)
- **Individual 401k** contributions reduce taxable income AND reduce available gap
- **Company 401k** does NOT reduce gap (it's added directly to 401k balance)
- Higher income → Higher gap → More funds for investments and cash accumulation

### Components Breakdown
Each income component flows to net worth differently:

1. **Salary (annualIncome)**:
   - Fully taxable
   - Provides primary cash flow for Gap
   - Grows with growthRate and jumps

2. **Equity/RSUs**:
   - Fully taxable as ordinary income
   - Adds to Gap for investments or cash
   - Often has higher volatility than salary

3. **Individual 401k Contributions**:
   - **Reduces** taxable income (pre-tax)
   - **Reduces** available Gap (money locked in 401k)
   - **Increases** 401k balance (retirement asset in net worth)
   - Formula: `After-tax Income = (Gross - Individual 401k) - Taxes`

4. **Company 401k Match**:
   - NOT taxable (direct to 401k)
   - Does NOT reduce Gap
   - **Increases** 401k balance (retirement asset)
   - "Free money" that compounds in 401k

### Example Net Worth Impact

**Scenario**:
- Gross Income: $200,000/year (Salary: $150K, Equity: $50K)
- Individual 401k: $23,000/year
- Company 401k: $10,000/year
- Taxes (effective 25%): $44,250 on ($200K - $23K = $177K taxable)
- Expenses: $80,000/year

**Gap Calculation**:
```
Annual Gap = $200,000 (Gross)
           - $23,000 (Individual 401k - reduces taxable income)
           - $44,250 (Taxes on $177K)
           - $80,000 (Expenses)
           = $52,750 available for investments/cash
```

**Net Worth Contribution (Year 1)**:
- Cash/Investments: +$52,750 (from Gap)
- 401k Balance: +$33,000 ($23K individual + $10K company match)
- **Total**: +$85,750 to net worth

### Income Jumps Impact
Salary jumps create **step changes** in net worth growth:
- 10% jump on $200K income → +$20K/year gross → ~+$10K/year after-tax Gap (assuming 50% total tax+expense rate)
- Jump impact is **permanent** and **compounds** with future growth
- Critical for reaching financial independence faster

### Career Breaks Impact
Career breaks create **temporary reductions** in net worth accumulation:
- 100% reduction (sabbatical) → Zero Gap → Must draw from cash reserves
- 50% reduction (part-time) → Half Gap → Slower net worth growth
- Break duration in months precisely models the income gap
- Net worth may decrease if expenses exceed reduced income

---

## Cross-Page Dependencies

The Income module is highly interconnected with other modules:

### Provides Data To:

1. **Expenses Module**:
   - **Purpose**: % of Income expense calculations
   - **Data**: Monthly gross income projections
   - **Example**: Housing = 25% of Income requires `monthlyIncomeNominal`
   - **Impact**: Expense changes dynamically with income jumps/growth

2. **Investments Module**:
   - **Purpose**: 401k company contribution tracking
   - **Data**: `company401k` totals per year
   - **Auto-sync**: Company 401k from all streams flows to retirement 401k balance
   - **Impact**: Free employer match increases retirement savings

3. **Taxes Module**:
   - **Purpose**: Calculate taxes on earned income
   - **Data**: `(annualIncome + equity) - individual401k` = Taxable Income
   - **Formula**: Taxes calculated on gross minus pre-tax 401k
   - **Impact**: Higher income → higher tax bracket

4. **Gap/Net Worth Module**:
   - **Purpose**: Primary income source for gap calculation
   - **Data**: All projection fields (gross, 401k, equity, PV values)
   - **Formula**: `Gap = Income - Individual401k - Taxes - Expenses`
   - **Impact**: All net worth growth originates from income

### Depends On:

1. **Personal Details (Profile)**:
   - **Fields Used**:
     - `age`: Starting point for projections
     - `retirementAge`: Default for `endWorkYear`
     - `yearsToRetirement`: Maximum allowed `endWorkYear`
     - `inflationRate`: Used for PV discounting
   - **Linking**: `endWorkYear` can auto-link to retirement age (`isEndYearLinked` flag)
   - **Validation**: Cannot set `endWorkYear > yearsToRetirement`

### Automatic Syncing

**401k Contributions**:
```
Income (company401k) → Investments (retirement401k.companyContribution)
```
- Company 401k from all active streams summed
- Auto-populated in Investments module (read-only)
- No user intervention needed

**Retirement Year Linking**:
```
Profile (retirementAge) → Income (endWorkYear) [if isEndYearLinked = true]
```
- When retirement age changes, endWorkYear updates automatically
- Prevents inconsistencies between modules
- User can "unlink" to set custom end year

**Income to Expense % Mode**:
```
Income (monthlyGrossNominal) → Expenses (category.percentOfIncome calculation)
```
- Expenses recalculate when income projections change
- Creates dynamic relationship: Income jump → Expense jump
- Only applies to categories with `amountType: "percent"`

---

## Validation Rules Summary

Quick reference for all validation constraints:

### Income Stream Constraints

| Field | Min | Max | Required | Type | Notes |
|-------|-----|-----|----------|------|-------|
| **annualIncome** | ≥ 0 | No limit | Yes | Currency | Base salary before growth/jumps |
| **company401k** | ≥ 0 | No limit | Yes | Currency | Employer match/contribution |
| **individual401k** | ≥ 0 | No limit | Yes | Currency | Pre-tax contribution (reduces taxable income) |
| **equity** | ≥ 0 | No limit | Yes | Currency | RSUs, stock grants (fully taxable) |
| **growthRate** | ≥ 0 | ≤ 50% | Yes | Percentage | Annual compound growth; warning if > 50% |
| **startYear** | ≥ 1 | No limit | Yes (default: 1) | Integer | Year 1 = first projection year |
| **endWorkYear** | > 0 | ≤ yearsToRetirement | Yes | Integer | When this income stream stops |
| **isEndYearLinked** | N/A | N/A | No (default: false) | Boolean | Auto-sync endWorkYear to retirement age |

### Income Jump Constraints

| Field | Min | Max | Required | Type | Notes |
|-------|-----|-----|----------|------|-------|
| **description** | N/A | N/A | No | String | Free text, shown in milestones |
| **year** | ≥ 1 | ≤ endWorkYear | Yes | Integer | Must be within stream's working years |
| **jumpPercent** | No limit | No limit | Yes | Percentage | Can be negative (pay cut); cumulative |

### Stream-Level Constraints

- **Total Streams**: 1 to 3 (MIN_STREAMS: 1, MAX_STREAMS: 3)
- **Stream Naming**: Free text, defaults to "Income Stream N"
- **Stream Overlap**: Streams can overlap or be sequential
- **Jump Order**: Jumps automatically sorted by year (not enforced at input)

### Error Messages

| Validation Failure | Error Message |
|-------------------|---------------|
| Annual Income missing or < 0 | "Annual income must be a positive number" |
| Company 401k missing or < 0 | "Company 401k must be a positive number or 0" |
| Individual 401k missing or < 0 | "Individual 401k contribution must be a positive number or 0" |
| Equity missing or < 0 | "Equity must be a positive number or 0" |
| Growth rate missing or < 0 | "Growth rate must be a positive number" |
| Growth rate > 50% | "Growth rate seems unrealistic (> 50%)" |
| End work year ≤ 0 | "End work year must be greater than 0" |
| End work year > retirement | "Cannot exceed retirement year (X)" |

### Calculation Rules

- **Jumps**: Empty/incomplete jumps are ignored (not validated strictly)
- **Multiple Jumps**: Cumulative and multiplicative: `total = base × (1+j1%) × (1+j2%) × ...`
- **Growth**: Compounding annual growth: `value_year_N = base × (1 + rate)^(N-1)`
- **Stream End**: All income stops immediately at `endWorkYear` (no partial-year logic)
- **Precision**: No rounding in calculations; preserve full floating-point precision
