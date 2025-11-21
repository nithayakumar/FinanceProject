# Dashboard Data Flow Documentation

This document provides a comprehensive overview of all data inputs, calculations, and visualizations across all dashboard tabs.

## Table of Contents
- [Data Sources](#data-sources)
- [Calculation Pipeline](#calculation-pipeline)
- [Dashboard Tabs](#dashboard-tabs)
  - [Net Worth Tab](#net-worth-tab)
  - [Income Tab](#income-tab)
  - [Expenses Tab](#expenses-tab)
  - [Retirement Tab](#retirement-tab)

---

## Data Sources

All dashboard data comes from localStorage with the following keys:

### 1. Profile (`storage.load('profile')`)
**Required Fields:**
- `age` (number) - Current age
- `retirementAge` (number) - Target retirement age
- `inflationRate` (number) - Annual inflation rate %
- `currentCash` (number) - Current cash balance
- `targetCash` (number) - Target cash reserve
- `currentSavings` (number) - Current total savings
- `location` (string) - State/province for tax calculations
- `filingStatus` (string) - Tax filing status
- `country` (string) - Country (USA/Canada)

**Derived Fields:**
- `yearsToRetirement = retirementAge - age`

---

### 2. Income (`storage.load('income')`)
**Structure:**
```javascript
{
  incomeStreams: [
    {
      id: string,
      name: string,
      annualIncome: number,      // Annual salary/wages
      company401k: number,        // Company 401k match
      individual401k: number,     // Individual 401k contribution
      equity: number,             // Annual equity compensation
      growthRate: number,         // Annual growth rate %
      endWorkYear: number,        // Year to stop working
      jumps: [                    // Salary jumps
        {
          id: string,
          year: number,
          jumpPercent: number,
          description: string
        }
      ]
    }
  ]
}
```

**Used By:**
- Income Tab
- Gap projections (for annual income)
- Tax calculations (taxable income)

---

### 3. Expenses (`storage.load('expenses')`)
**Structure:**
```javascript
{
  expenseCategories: [
    {
      id: string,
      category: string,           // Category name (Housing, Food, etc.)
      annualAmount: number,       // Annual expense amount
      growthRate: number,         // Annual growth rate %
      amountType: string,         // 'dollar' or 'percentOfIncome'
      percentOfIncome: number,    // If amountType is 'percentOfIncome'
      jumps: [                    // Expense changes
        {
          id: string,
          year: number,
          changeType: string,     // 'percent', 'dollar', 'setAmountPV', 'percentOfIncome'
          changeValue: number,
          description: string
        }
      ]
    }
  ],
  oneTimeExpenses: [
    {
      id: string,
      description: string,
      amount: number,             // In today's dollars
      year: number                // Year when expense occurs
    }
  ]
}
```

**Used By:**
- Expenses Tab
- Gap projections (for annual expenses)

---

### 4. Investments & Debt (`storage.load('investmentsDebt')`)
**Structure:**
```javascript
{
  currentCash: number,
  targetCash: number,
  retirement401k: {
    currentValue: number,
    growthRate: number,
    companyContribution: number,  // From income streams (aggregated)
    limitGrowth: number,           // Growth rate for contribution limits
    individualLimit: number        // Current 401k contribution limit
  },
  investments: [
    {
      id: string,
      name: string,
      currentValue: number,
      costBasis: number,
      growthRate: number,
      portfolioPercent: number    // Allocation percentage
    }
  ]
}
```

**Used By:**
- Net Worth Tab
- Gap projections (for investment growth and allocation)

---

## Calculation Pipeline

Dashboard calculations happen in this order:

### Step 1: Calculate Income Projections
**File:** `src/features/income/Income.calc.js`
**Function:** `calculateIncomeProjections(incomeData, profile)`

**Inputs:**
- `incomeData.incomeStreams[]`
- `profile.inflationRate`
- `profile.yearsToRetirement`

**Outputs:**
```javascript
{
  projections: [         // 1,200 monthly rows (100 years)
    {
      year: number,
      month: number,
      salaryNominal: number,
      equityNominal: number,
      company401kNominal: number,
      totalCompNominal: number,
      salaryPV: number,
      equityPV: number,
      company401kPV: number,
      totalCompPV: number,
      appliedGrowthRate: number,
      activeStreams: string[]
    }
  ],
  summary: {
    currentYearCompNominal: number,
    currentYearCompPV: number,
    year10CompNominal: number,
    year10CompPV: number,
    lifetimeEarningsNominal: number,
    lifetimeEarningsPV: number,
    totalSalaryNominal: number,
    totalSalaryPV: number,
    totalEquityNominal: number,
    totalEquityPV: number,
    total401kNominal: number,
    total401kPV: number,
    averageAnnualGrowth: number,
    milestones: []
  },
  chartData: [           // Annual aggregation for charts
    {
      year: number,
      total: number,
      [streamName]: number   // Per-stream breakdown
    }
  ]
}
```

**Growth Calculation:**
- Base salary grows at `growthRate` each year
- Jumps are multiplicative (applied cumulatively)
- Formula: `salary × (1 + growthRate/100)^(year-1) × jumpMultipliers`

---

### Step 2: Calculate Expense Projections
**File:** `src/features/expenses/Expenses.calc.js`
**Function:** `calculateExpenseProjections(expensesData, profile, incomeProjections)`

**Inputs:**
- `expensesData.expenseCategories[]`
- `expensesData.oneTimeExpenses[]`
- `profile.inflationRate`
- `profile.yearsToRetirement`
- `incomeProjections` (for % of income expenses)

**Outputs:**
```javascript
{
  projections: [         // 1,200 monthly rows (100 years)
    {
      year: number,
      month: number,
      totalRecurringNominal: number,
      oneTimeNominal: number,
      totalExpensesNominal: number,
      totalRecurringPV: number,
      oneTimePV: number,
      totalExpensesPV: number,
      categoryBreakdownNominal: {
        [categoryName]: number
      },
      categoryBreakdownPV: {
        [categoryName]: number
      }
    }
  ],
  summary: {
    currentYearExpensesNominal: number,
    currentYearExpensesPV: number,
    year10ExpensesNominal: number,
    year10ExpensesPV: number,
    lifetimeExpensesNominal: number,
    lifetimeExpensesPV: number,
    avgAnnualExpensesNominal: number,
    avgAnnualExpensesPV: number,
    categoryTotals: { [categoryName]: number },
    categoryTotalsPV: { [categoryName]: number },
    perCategorySummaries: [
      {
        categoryName: string,
        currentYearExpensesNominal: number,
        year10ExpensesNominal: number,
        lifetimeExpensesNominal: number,
        lifetimeExpensesPV: number
      }
    ],
    oneTimeTotalNominal: number,
    oneTimeTotalPV: number,
    milestones: []
  },
  chartData: [           // Annual aggregation for charts
    {
      year: number,
      total: number,
      [categoryName]: number,
      'One-Time': number
    }
  ]
}
```

**Growth Calculation:**
- Dollar expenses grow at category `growthRate` (or inflation if not set)
- Dollar jumps: Added amount grows from jump year forward
- Percent jumps: Multiplicative, applied cumulatively
- Set amount jumps: Override base, then grow from that year
- Formula: `(baseAmount × growthMultiplier + dollarJumps) × percentMultipliers`

---

### Step 3: Calculate Gap Projections
**File:** `src/features/gap/Gap.calc.js`
**Function:** `calculateGapProjections(incomeDataWithProjections, expensesDataWithProjections, investmentsData, profile)`

**Inputs:**
- Income projections (monthly)
- Expense projections (monthly)
- `investmentsData.currentCash`
- `investmentsData.targetCash`
- `investmentsData.retirement401k`
- `investmentsData.investments[]`
- `profile.inflationRate`
- `profile.yearsToRetirement`
- `profile.location`
- `profile.filingStatus`

**Outputs:**
```javascript
{
  projections: [         // Annual rows (yearsToRetirement)
    {
      year: number,

      // Income components (nominal)
      annualSalary: number,
      annualEquity: number,
      annualCompany401k: number,
      grossIncome: number,

      // Deductions (nominal)
      totalIndividual401k: number,
      taxableIncome: number,
      annualTaxes: number,
      taxBreakdown: {
        federal: number,
        state: number,
        socialSecurity: number,
        medicare: number
      },
      afterTaxIncome: number,

      // Expenses and Gap (nominal)
      annualExpenses: number,
      disposableIncome: number,
      gap: number,

      // Allocations (nominal)
      investedThisYear: number,
      cashContribution: number,
      investment1: number,    // Per-investment allocations
      investment2: number,

      // Balances (nominal)
      cash: number,
      targetCash: number,
      retirement401kValue: number,
      totalCostBasis: number,
      totalInvestmentValue: number,
      netWorth: number,
      investments: [
        {
          costBasis: number,
          marketValue: number
        }
      ],

      // Present values (PV)
      annualSalaryPV: number,
      annualEquityPV: number,
      annualCompany401kPV: number,
      grossIncomePV: number,
      totalIndividual401kPV: number,
      taxableIncomePV: number,
      annualTaxesPV: number,
      taxBreakdownPV: { ... },
      afterTaxIncomePV: number,
      annualExpensesPV: number,
      disposableIncomePV: number,
      gapPV: number,
      investedThisYearPV: number,
      cashContributionPV: number,
      investment1PV: number,
      investment2PV: number,
      cashPV: number,
      targetCashPV: number,
      retirement401kValuePV: number,
      totalCostBasisPV: number,
      totalInvestmentValuePV: number,
      netWorthPV: number
    }
  ],
  summary: {
    currentYearGap: number,
    currentYearGapPV: number,
    currentNetWorth: number,
    currentNetWorthPV: number,
    year10Gap: number,
    year10GapPV: number,
    year10NetWorth: number,
    year10NetWorthPV: number,
    retirementNetWorth: number,
    retirementNetWorthPV: number,
    retirementCash: number,
    retirementCashPV: number,
    retirement401k: number,
    retirement401kPV: number,
    lifetimeGap: number,
    lifetimeGapPV: number,
    lifetimeInvested: number,
    lifetimeInvestedPV: number,
    lifetimeEquity: number,
    lifetimeEquityPV: number,
    lifetimeIndividual401k: number,
    lifetimeIndividual401kPV: number,
    lifetimeCompany401k: number,
    lifetimeCompany401kPV: number,
    netWorthGrowth: number,
    netWorthGrowthPercent: number
  }
}
```

**Gap Calculation:**
```
Gap = Gross Income - Individual 401k - Taxes - Expenses

Allocation (when Gap > 0):
1. Equity → Investments (per portfolio %)
2. Fill cash to inflation-adjusted target
3. Invest remaining gap per portfolio %
4. Handle excess (if allocation < 100%)

Allocation (when Gap < 0):
- Draw from cash (no new investments)
```

**Tax Calculation:**
- Uses CSV tax ladders (federal and state)
- Automatically inflates brackets each year
- Taxable income = Gross income - Individual 401k
- Includes federal, state, Social Security, Medicare

**Investment Growth:**
- Cost basis: Cumulative contributions
- Market value: Cost basis × (1 + growthRate)^year
- 401k grows at its own rate + contributions

---

## Dashboard Tabs

### Net Worth Tab
**File:** `src/features/dashboard/NetWorthTab.jsx`

**Data Source:** `gapProjections`

**Visualizations:**

1. **Summary Cards**
   - Current Net Worth: `summary.currentNetWorth` (nominal)
   - Year 10 Net Worth: `summary.year10NetWorth` (nominal)
   - Retirement Net Worth: `summary.retirementNetWorth` (nominal)
   - Net Worth Growth: `summary.netWorthGrowth` & `summary.netWorthGrowthPercent`

2. **Line Chart: Net Worth Over Time**
   - X-axis: Year (1 to yearsToRetirement)
   - Y-axis: Net Worth (nominal dollars)
   - Data: `projections[].netWorth`
   - Shows growth trajectory to retirement

3. **Net Worth Components Table**
   - Columns: Year | Cash | 401k | Investments | Total
   - Data: `projections[]` filtered to show key years (1, 5, 10, 15, 20, retirement)
   - Values: All nominal dollars

**Inputs Required:**
- `profile.yearsToRetirement`
- `investmentsData` (for starting balances)
- `gapProjections.projections[]`
- `gapProjections.summary`

---

### Income Tab
**File:** `src/features/dashboard/IncomeTab.jsx`

**Data Source:** `incomeProjections`

**Visualizations:**

1. **Summary Cards**
   - Current Year Income: `summary.currentYearCompNominal` (with PV)
   - Year 10 Income: `summary.year10CompNominal` (with PV)
   - Lifetime Earnings: `summary.lifetimeEarningsNominal` (with PV)
   - Average Growth: `summary.averageAnnualGrowth`

2. **Stacked Bar Chart: Income by Stream**
   - X-axis: Year (1 to yearsToRetirement)
   - Y-axis: Annual Income (PV dollars)
   - Stacks: One per income stream
   - Data: `chartData[]` (pre-aggregated annually with PV)
   - Colors: Different color per stream

3. **Income Components Table**
   - Rows: Salary, Equity, Company 401k, Total
   - Columns: Current Year | Year 10 | Lifetime Total | % of Total
   - Data: `summary.totalSalaryNominal`, `summary.totalEquityNominal`, `summary.total401kNominal`

**Inputs Required:**
- `profile.yearsToRetirement`
- `incomeData.incomeStreams[]` (for names)
- `incomeProjections.projections[]`
- `incomeProjections.summary`
- `incomeProjections.chartData[]`

---

### Expenses Tab
**File:** `src/features/dashboard/ExpensesTab.jsx`

**Data Source:** `expenseProjections`

**Visualizations:**

1. **Summary Cards**
   - Current Year Expenses: `summary.currentYearExpensesNominal` (with PV)
   - Year 10 Expenses: `summary.year10ExpensesNominal` (with PV)
   - Lifetime Expenses: `summary.lifetimeExpensesNominal` (with PV)
   - Average Annual: `summary.avgAnnualExpensesNominal`

2. **Stacked Bar Chart: Expenses by Category**
   - X-axis: Year (1 to yearsToRetirement)
   - Y-axis: Annual Expenses (nominal dollars)
   - Stacks: One per expense category
   - Data: Aggregated from `projections[].categoryBreakdownNominal`
   - Aggregation: Sum 12 months for each year
   - Colors: Different color per category

3. **Category Breakdown Table**
   - Rows: One per category + Total row
   - Columns: Category | Current Year | Year 10 | Lifetime Total | % of Total
   - Data: `summary.perCategorySummaries[]`

**Inputs Required:**
- `profile.yearsToRetirement`
- `expensesData.expenseCategories[]` (for names)
- `expenseProjections.projections[]`
- `expenseProjections.summary`

---

### Retirement Tab
**File:** `src/features/dashboard/RetirementTab.jsx`

**Data Source:** `gapProjections`

**Visualizations:**

1. **Summary Cards**
   - Retirement Net Worth: `summary.retirementNetWorth` (with PV)
   - Retirement Cash: `summary.retirementCash` (with PV)
   - Retirement 401k: `summary.retirement401k` (with PV)
   - Years to Retirement: `profile.yearsToRetirement`

2. **Pie Chart: Retirement Asset Allocation**
   - Segments: Cash, 401k, Investment 1, Investment 2, etc.
   - Data: Last projection row (retirement year)
   - Values: `projections[last].cash`, `projections[last].retirement401kValue`, `projections[last].investments[]`

3. **Lifetime Contribution Summary Table**
   - Rows: Equity, Individual 401k, Company 401k, Gap Investments
   - Columns: Lifetime Nominal | Lifetime PV
   - Data:
     - Equity: `summary.lifetimeEquity` / `summary.lifetimeEquityPV`
     - Individual 401k: `summary.lifetimeIndividual401k` / `summary.lifetimeIndividual401kPV`
     - Company 401k: `summary.lifetimeCompany401k` / `summary.lifetimeCompany401kPV`
     - Gap Investments: `summary.lifetimeInvested` / `summary.lifetimeInvestedPV`

**Inputs Required:**
- `profile.yearsToRetirement`
- `profile.retirementAge`
- `investmentsData.investments[]` (for names)
- `gapProjections.projections[]`
- `gapProjections.summary`

---

## Data Validation

Dashboard validates all required inputs before calculation:

```javascript
const hasProfile = !!(profile && profile.age && profile.retirementAge)
const hasIncome = !!(incomeData && incomeData.incomeStreams && incomeData.incomeStreams.length > 0)
const hasExpenses = !!(expensesData && expensesData.expenseCategories && expensesData.expenseCategories.length > 0)
const hasInvestments = !!(investmentsData &&
                          investmentsData.currentCash !== undefined &&
                          investmentsData.targetCash !== undefined)
```

If any validation fails, dashboard shows an error state with guidance.

---

## Common Issues & Troubleshooting

### NaN Values in Dashboard
- **Cause:** Missing required fields in data
- **Check:** All required fields listed above are present and are numbers
- **Fix:** Ensure all input forms save complete data

### Empty Charts
- **Cause:** Projections array is empty or missing expected fields
- **Check:** Browser console for calculation errors
- **Fix:** Verify data structure matches expected format

### Mismatched Totals
- **Cause:** Rounding differences or calculation order issues
- **Check:** Verify 5-decimal rounding is applied consistently
- **Fix:** Use `round5()` helper throughout calculations

### Performance Issues
- **Cause:** Calculating 1,200 months × 3 projection types
- **Optimization:** Use memoization for projections
- **Alternative:** Only calculate up to 50 years instead of 100

---

## Future Enhancements

1. **Caching:** Add projection caching to avoid recalculation
2. **Incremental Updates:** Only recalculate affected projections on data change
3. **Web Workers:** Move heavy calculations off main thread
4. **Data Export:** Add CSV/Excel export for all projections
5. **Scenario Comparison:** Show multiple scenarios side-by-side
6. **What-If Analysis:** Interactive sliders to adjust assumptions

---

## Related Documentation

- **[Field Reference](FIELD-REFERENCE.md)** - Complete field definitions
- **[Scenarios Module](modules/scenarios.md)** - Scenario comparison system
- **[Gap Calculations](modules/gap.md)** - Detailed gap calculation logic
- **[Tax System](modules/taxes.md)** - Tax ladder and calculation details
