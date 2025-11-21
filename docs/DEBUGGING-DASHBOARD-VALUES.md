# Debugging Dashboard Values - Detailed Field Mapping

This document provides exact field mappings to help debug discrepancies between different views in the application.

## Table of Contents
- [Understanding the Two Investment Views](#understanding-the-two-investment-views)
- [Net Worth Tab - Line by Line](#net-worth-tab---line-by-line)
- [Income Tab - Line by Line](#income-tab---line-by-line)
- [Expenses Tab - Line by Line](#expenses-tab---line-by-line)
- [Common Discrepancies Explained](#common-discrepancies-explained)

---

## Understanding the Two Investment Views

### ⚠️ Critical: There are TWO Different Investment Calculations

**1. Investments Page (`/investments`)** - Static Projection
- **File:** `src/features/investments-debt/InvestmentsDebt.calc.js`
- **Function:** `calculateInvestmentProjections()`
- **Purpose:** Shows what investments would be worth with NO new contributions
- **Formula:** `currentValue × (1 + growthRate/100)^year`
- **Does NOT include:**
  - Equity compensation
  - Gap allocations (new savings each year)
  - Individual 401k contributions
- **Only includes:**
  - Company 401k match
  - Growth on existing balances

**2. Dashboard Net Worth Tab** - Dynamic with Contributions
- **File:** `src/features/gap/Gap.calc.js`
- **Function:** `calculateGapProjections()`
- **Purpose:** Shows what investments will be with all contributions
- **Formula:** Complex allocation logic (see below)
- **Includes:**
  - Equity compensation (invested automatically)
  - Gap allocations (new savings each year)
  - Individual AND company 401k contributions
  - Growth on all accumulated balances

### Why They're Different

| Aspect | Investments Page | Dashboard |
|--------|------------------|-----------|
| Starting Point | `currentValue` | `currentValue` (as costBasis) |
| New Contributions | ❌ None (except company 401k) | ✅ Equity + Gap + 401k |
| Formula | Simple growth | Complex allocation |
| Purpose | What you have now | What you'll have at retirement |
| Updates | Static snapshot | Dynamic projection |

---

## Net Worth Tab - Line by Line

### Summary Cards

**Current Net Worth**
```javascript
Source: gapProjections.summary.currentNetWorth
Calculation: projections[0].netWorth
Formula: cash + retirement401kValue + totalInvestmentValue

Where:
  cash = starting cash from investmentsData.currentCash
  retirement401kValue = starting 401k from investmentsData.retirement401k.currentValue
  totalInvestmentValue = sum of investmentsData.investments[].currentValue
```

**Year 10 Net Worth**
```javascript
Source: gapProjections.summary.year10NetWorth
Calculation: projections[9].netWorth
Formula: cash + retirement401kValue + totalInvestmentValue

Where (Year 10):
  cash = starting cash + 10 years of contributions/withdrawals
  retirement401kValue = (starting 401k × growth^10) + sum of 10 years contributions
  totalInvestmentValue = sum of each investment's market value at year 10
```

**Retirement Net Worth**
```javascript
Source: gapProjections.summary.retirementNetWorth
Calculation: projections[yearsToRetirement-1].netWorth
Formula: Same as Year 10, but at retirement year
```

**Net Worth Growth**
```javascript
Source: gapProjections.summary.netWorthGrowth
Formula: retirementNetWorth - currentNetWorth
Percentage: (growth / currentNetWorth) × 100
```

### Line Chart: Net Worth Over Time

**Chart Data:**
```javascript
Source: gapProjections.projections[]
X-axis: projection.year (1 to yearsToRetirement)
Y-axis: projection.netWorth (nominal dollars)

Each point = cash + retirement401kValue + totalInvestmentValue at that year
```

### Net Worth Components Table

**Table Rows:** Shows years 1, 5, 10, 15, 20, and retirement

**Columns:**

1. **Year**
   - Source: `projection.year`

2. **Cash**
   - Source: `projection.cash`
   - Calculation in Gap.calc.js (lines 161-221):
   ```javascript
   Starting: investmentsData.currentCash
   Each year:
     if (gap > 0):
       1. Fill to targetCash (inflation-adjusted)
       2. Remainder goes to investments
       3. Excess back to cash if allocations < 100%
     if (gap < 0):
       Cash = Cash + gap (withdraws from cash)
     if (equity > 0 && no investments):
       Cash += equity
   ```

3. **401k**
   - Source: `projection.retirement401kValue`
   - Calculation in Gap.calc.js (lines 228-232):
   ```javascript
   Starting: investmentsData.retirement401k.currentValue
   Each year:
     value = value × (1 + growthRate/100)  // Growth
           + totalIndividual401k           // Your contributions
           + annualCompany401k              // Company match

   Where:
     totalIndividual401k = sum across all income streams:
       stream.individual401k × (1 + stream.growthRate/100)^(year-1)

     annualCompany401k = sum across all income streams:
       stream.company401k × (1 + stream.growthRate/100)^(year-1)
   ```

4. **Investments** (columns per investment)
   - Source: `projection.investments[].marketValue`
   - Calculation in Gap.calc.js (lines 166-186, 224-226):
   ```javascript
   Starting: investmentsData.investments[].currentValue (as costBasis)

   Each year, BEFORE regular gap allocation:
     // Equity goes directly to investments
     if (equity > 0):
       equityPerInvestment = equity × (portfolioPercent / totalAllocation)
       costBasis += equityPerInvestment

   Then, regular gap allocation:
     if (gap > 0):
       gapAllocation = remainingGap × (portfolioPercent / 100)
       costBasis += gapAllocation

   At end of year:
     marketValue = costBasis × (1 + growthRate/100)^year

   Important: marketValue compounds on costBasis each year
   ```

5. **Total**
   - Source: `projection.netWorth`
   - Formula: `cash + retirement401kValue + sum(investments[].marketValue)`

---

## Income Tab - Line by Line

### Summary Cards

**Current Year Income**
```javascript
Source: incomeProjections.summary.currentYearCompNominal
Calculation: sum of projections[0-11].totalCompNominal
Formula: For each month in year 1, sum all income streams:
  salary + equity + company401k
PV: Same calculation / (1 + inflationRate/100)^0 = same value
```

**Year 10 Income**
```javascript
Source: incomeProjections.summary.year10CompNominal
Calculation: sum of projections[108-119].totalCompNominal (months 109-120)
Formula: For each month in year 10:
  For each active stream (year <= endWorkYear):
    salary × (1 + growthRate/100)^9 × jumpMultipliers
PV: Monthly values / (1 + inflationRate/100)^9
```

**Lifetime Earnings**
```javascript
Source: incomeProjections.summary.lifetimeEarningsNominal
Calculation: sum of all monthly projections up to retirement month
Formula: Sum of all months where (monthIndex <= yearsToRetirement × 12 - 1):
  totalCompNominal for each month
PV: Sum of totalCompPV for each month
```

**Average Growth**
```javascript
Source: incomeProjections.summary.averageAnnualGrowth
Calculation: Weighted average of all stream growth rates
Formula:
  sum(stream.growthRate × stream.annualIncome) / sum(stream.annualIncome)
Only includes active months
```

### Stacked Bar Chart: Income by Stream

**Chart Data:**
```javascript
Source: incomeProjections.chartData[]
Pre-aggregated in Income.calc.js (lines 209-273)

Each bar represents one year (1 to yearsToRetirement)
Stacks: One per income stream name

For each stream in each year:
  1. Calculate annual income with growth:
     annualIncome × (1 + growthRate/100)^(year-1)

  2. Apply cumulative jumps (up to this year):
     × product of (1 + jumpPercent/100) for all jumps up to year

  3. Discount to PV:
     / (1 + inflationRate/100)^(year-1)

  4. Divide by 12 for monthly, sum 12 months for annual

Result: PV dollars stacked by stream
```

### Income Components Table

**Rows:**

1. **Salary**
   - Source: `incomeProjections.summary.totalSalaryNominal`
   - Calculation in Income.calc.js (lines 302-303):
   ```javascript
   Lifetime sum of: salaryNominal for each month
   Where salaryNominal = annualIncome × growth × jumps / 12

   PV: totalSalaryPV (same but divided by discount factor each month)
   ```

2. **Equity**
   - Source: `incomeProjections.summary.totalEquityNominal`
   - Calculation in Income.calc.js (lines 305-306):
   ```javascript
   Lifetime sum of: equityNominal for each month
   Where equityNominal = equity × growth × jumps / 12

   PV: totalEquityPV
   ```

3. **Company 401k**
   - Source: `incomeProjections.summary.total401kNominal`
   - Calculation in Income.calc.js (lines 308-309):
   ```javascript
   Lifetime sum of: company401kNominal for each month
   Where company401kNominal = company401k × growth × jumps / 12

   PV: total401kPV
   ```

4. **Total**
   - Formula: salary + equity + company401k
   - Should equal lifetimeEarningsNominal

**Columns:**

- **Current Year:** Year 1 sum (12 months)
- **Year 10:** Year 10 sum (12 months)
- **Lifetime Total:** Sum all months to retirement
- **% of Total:** Component / Total × 100

---

## Expenses Tab - Line by Line

### Summary Cards

**Current Year Expenses**
```javascript
Source: expenseProjections.summary.currentYearExpensesNominal
Calculation: sum of projections[0-11].totalExpensesNominal
Formula: For each month in year 1:
  sum of all category amounts + one-time expenses / 12
PV: currentYearExpensesPV (same months, PV values)
```

**Year 10 Expenses**
```javascript
Source: expenseProjections.summary.year10ExpensesNominal
Calculation: sum of projections[108-119].totalExpensesNominal
Formula: For each month in year 10:
  For each category:
    baseAmount × (1 + growthRate/100)^9 × percentJumps + dollarJumps(grown)
PV: year10ExpensesPV
```

**Lifetime Expenses**
```javascript
Source: expenseProjections.summary.lifetimeExpensesNominal
Calculation: sum of all monthly projections up to retirement
Formula: Sum of totalExpensesNominal for months 0 to (yearsToRetirement × 12 - 1)
PV: lifetimeExpensesPV
```

**Average Annual Expenses**
```javascript
Source: expenseProjections.summary.avgAnnualExpensesNominal
Calculation: lifetimeExpensesNominal / yearsToRetirement
PV: lifetimeExpensesPV / yearsToRetirement
```

### Stacked Bar Chart: Expenses by Category

**Chart Data:**
```javascript
Source: Aggregated in ExpensesTab.jsx (lines 11-33)
From: expenseProjections.projections[]

Each bar represents one year (1 to yearsToRetirement)
Stacks: One per expense category name

For each year:
  Get months i to i+11 (12 months)
  For each category:
    sum = 0
    For each month in year:
      sum += projection.categoryBreakdownNominal[categoryName]

    bar_height = sum (annual total for category)

Result: Nominal dollars stacked by category
```

### Category Breakdown Table

**Data Source:** `expenseProjections.summary.perCategorySummaries[]`

Built in Expenses.calc.js (lines 399-416):

**For each category:**

1. **Category Name**
   - Source: `category.category`

2. **Current Year**
   - Source: `perCategorySummary.currentYearExpensesNominal`
   - Calculation:
   ```javascript
   Sum of categoryBreakdownNominal[categoryName] for months 0-11
   ```

3. **Year 10**
   - Source: `perCategorySummary.year10ExpensesNominal`
   - Calculation:
   ```javascript
   Sum of categoryBreakdownNominal[categoryName] for months 108-119
   ```

4. **Lifetime Total**
   - Source: `perCategorySummary.lifetimeExpensesNominal`
   - From `summary.categoryTotals[categoryName]`
   - Calculation:
   ```javascript
   Sum of categoryBreakdownNominal[categoryName] for all months to retirement
   ```

5. **% of Total**
   - Formula: `(lifetimeExpensesNominal / summary.lifetimeExpensesNominal) × 100`

**Total Row:** Sums all categories

---

## Common Discrepancies Explained

### 1. Investment Values: Investments Page vs Dashboard

**Scenario:** Investment 1 shows $100k on Investments page but $250k on Dashboard

**Root Cause:** Different calculations entirely

**Investments Page:**
```javascript
Year 10 value = $100k (current) × (1.08)^10 = $215,892
// Only growth, no new contributions
```

**Dashboard:**
```javascript
Year 10 value = costBasis × (1.08)^10
Where costBasis = starting $100k
                + equity contributions years 1-10
                + gap allocations years 1-10
                + growth compounded each year

Example:
  Year 1: $100k + $5k equity + $10k gap = $115k → $124.2k
  Year 2: $124.2k + $5k equity + $10k gap = $139.2k → $150.3k
  ... continuing to year 10 = $250k
```

**How to Debug:**
1. Open browser console
2. Look for "💰 Calculating Investment Projections" (Investments page)
3. Look for "📊 Calculating Gap Projections" (Dashboard)
4. Compare `chartData[9].investment1` between both
5. Check `projections[9].investments[0].marketValue` for dashboard
6. Verify equity and gap allocations are being added

**Which is correct?**
- **Investments Page:** Shows passive growth only
- **Dashboard:** Shows realistic projection with contributions
- **Use Dashboard for retirement planning**

---

### 2. 401k Values Don't Match

**Scenario:** 401k shows $50k on Investments page but $180k on Dashboard

**Root Cause:** Individual contributions included in Dashboard but not Investments page

**Investments Page:**
```javascript
401k = starting value × (1 + rate)^year + (company match × year)
Example: $50k × 1.08^10 + ($5k × 10) = $157,908
```

**Dashboard:**
```javascript
401k each year:
  value = value × (1 + rate/100)
        + individual contributions (from income streams, grows each year)
        + company match (from income streams, grows each year)

Example Year 1:
  $50k × 1.08 + $23.5k (individual) + $5k (company) = $82.5k

Year 2:
  $82.5k × 1.08 + $24.2k (individual, 3% growth) + $5.15k (company) = $118.5k

... continuing to year 10 = $180k+
```

**How to Debug:**
1. Check `incomeData.incomeStreams[].individual401k` - should be ~$23.5k
2. Check `incomeData.incomeStreams[].company401k` - should be ~$5k
3. In console, look for "Total individual 401k: $XX" in gap calculations
4. Verify both are being added in Gap.calc.js line 230-232

**Which is correct?**
- **Dashboard** - includes all contributions
- Investments page is **missing individual contributions**

---

### 3. Net Worth Components Don't Sum to Total

**Scenario:** Cash $50k + 401k $180k + Investments $250k = $480k but Total shows $500k

**Root Cause:** Rounding at different stages or timing of calculations

**How to Debug:**
```javascript
// Open browser console on Dashboard
// Type:
window.gapData = data.gapProjections.projections[9]
console.log('Cash:', gapData.cash)
console.log('401k:', gapData.retirement401kValue)
console.log('Investments:', gapData.investments)
console.log('Total InvestmentValue:', gapData.totalInvestmentValue)
console.log('Net Worth:', gapData.netWorth)
console.log('Manual Sum:', gapData.cash + gapData.retirement401kValue + gapData.totalInvestmentValue)
```

**Common Issues:**
- Rounding: Values rounded to 5 decimals, display rounds to 2
- Missing investment: One investment not included in sum
- Old data: Browser cached old calculation

**Fix:**
1. Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
2. Clear localStorage: Go to dev tools → Application → Local Storage → Clear All
3. Re-enter all data

---

### 4. Lifetime Equity Shows $0 but Annual Shows $1k

**Scenario:** Income tab shows $1k annual equity but $0 lifetime contribution

**Root Cause:** Equity in income projections but not being summed in summary (BUG in older versions)

**Fixed In:** Commit `22d348a` - Now tracks `lifetimeEquity` in gap summary

**How to Debug:**
```javascript
// Check income projections
const year1 = incomeProjections.projections.slice(0,12)
year1.forEach(m => console.log('Equity:', m.equityNominal))

// Check gap summary (should have lifetimeEquity now)
console.log(gapProjections.summary.lifetimeEquity)
console.log(gapProjections.summary.lifetimeEquityPV)
```

**If still $0:**
1. Update to latest code
2. Re-calculate (hard refresh)
3. Check that equity is being invested in Gap.calc.js lines 166-178

---

### 5. Expenses Growing But Chart Stays Flat

**Scenario:** Expense categories have 5% growth but chart shows flat bars

**Root Cause:** Dollar jumps not growing after being applied (BUG in older versions)

**Fixed In:** Commit `22d348a` - Dollar jumps now grow from jump year forward

**How to Debug:**
```javascript
// Check expense projection for year with jump
const year5 = expenseProjections.projections.slice(48, 60) // Year 5 months
year5.forEach(m => console.log('Childcare:', m.categoryBreakdownNominal['Childcare']))

// Should see $36k in year 5, then $37.8k in year 6 with 5% growth
```

**If not growing:**
1. Update to latest code
2. Check Expenses.calc.js lines 176-187 for dollar jump growth logic
3. Verify `categoryDollarJumpYears` is being populated

---

## Debugging Workflow

### Step 1: Identify the Discrepancy
- Note exact values that don't match
- Note which screens show each value
- Note which year/time period

### Step 2: Open Browser Console
- F12 (or Cmd+Option+I on Mac)
- Go to Console tab
- Refresh page to see calculation logs

### Step 3: Find the Calculation
- Search for log groups:
  - "📊 Calculating Income Projections"
  - "📊 Calculating Expense Projections"
  - "📊 Calculating Gap Projections"
  - "💰 Calculating Investment Projections"
- Expand to see inputs and outputs

### Step 4: Compare to Expected
- Use formulas in this document
- Calculate manually
- Check if formula matches what you see in console

### Step 5: Check Data Sources
```javascript
// In console:
const profile = JSON.parse(localStorage.getItem('profile'))
const income = JSON.parse(localStorage.getItem('income'))
const expenses = JSON.parse(localStorage.getItem('expenses'))
const investments = JSON.parse(localStorage.getItem('investmentsDebt'))

console.log('Profile:', profile)
console.log('Income:', income)
console.log('Expenses:', expenses)
console.log('Investments:', investments)
```

### Step 6: Trace Through Code
1. Find the calculation file (see references above)
2. Add `console.log()` statements
3. Rebuild/refresh
4. Follow the data flow

### Step 7: Report Issue
If still stuck, report with:
- Screenshots of both views showing discrepancy
- Console logs from calculation
- localStorage data (export JSON)
- Which commit/version you're on

---

## Quick Reference: File Locations

### Calculations
- Income: `src/features/income/Income.calc.js`
- Expenses: `src/features/expenses/Expenses.calc.js`
- Gap/Net Worth: `src/features/gap/Gap.calc.js`
- Investments: `src/features/investments-debt/InvestmentsDebt.calc.js`

### Dashboard Tabs
- Net Worth: `src/features/dashboard/NetWorthTab.jsx`
- Income: `src/features/dashboard/IncomeTab.jsx`
- Expenses: `src/features/dashboard/ExpensesTab.jsx`
- Retirement: `src/features/dashboard/RetirementTab.jsx`

### Dashboard Controller
- Main: `src/features/dashboard/Dashboard.jsx` (lines 87-113)

---

## Testing Checklist

Use this checklist to verify calculations:

- [ ] **Income**: Salary × (1 + growth)^year × jumps = expected?
- [ ] **Expenses**: Base × (1 + growth)^year + dollarJumps(grown) = expected?
- [ ] **401k**: Previous × growth + individual + company = expected?
- [ ] **Investments**: (CostBasis + equity + gap) × growth = expected?
- [ ] **Net Worth**: Sum of cash + 401k + investments = total?
- [ ] **Investments Page vs Dashboard**: Different by design, confirmed?
- [ ] **Lifetime Sums**: Match sum of annual values?
- [ ] **PV vs Nominal**: PV < Nominal for future years?

---

## Additional Resources

- [DASHBOARD-DATA-FLOW.md](DASHBOARD-DATA-FLOW.md) - Complete data structures
- [FIELD-REFERENCE.md](FIELD-REFERENCE.md) - All field definitions
- [modules/gap.md](modules/gap.md) - Gap calculation deep dive
