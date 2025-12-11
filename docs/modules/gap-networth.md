# Gap/Net Worth Module Reference

## Overview

The Gap/Net Worth module is the integration point for all other modules. It calculates yearly cash flow (the "Gap") and projects net worth over time by combining income, expenses, taxes, and investment returns. The Gap determines whether you're saving (positive) or drawing down assets (negative) each year, and the allocation logic automatically invests surplus funds according to your portfolio strategy.

**Gap Formula:**
```
Gap = Income - Individual 401(k) Contributions - Taxes - Expenses - Mortgage Payment
```

*Note: Mortgage Payment is included when Property mode is "Own" or "Buy" (post-purchase years). When Property mode is "None", this term is zero.*

## Module Architecture

This module has:
1. **Gap.calc.js**: Core calculation logic (no UI)
2. **NetWorthTab.jsx**: Dashboard visualization component
3. No dedicated input page - uses data from all other modules

**Projection Timeline**: Generates **1,200 monthly projections** (100 years), with all values calculated in both:
- **Nominal**: Future dollars (inflated)
- **Present Value (PV)**: Today's dollars (inflation-adjusted)

## Core Concepts

### The Gap

The Gap represents your annual cash flow after all obligations:

- **Positive Gap**: You have surplus money to save/invest
- **Negative Gap**: You need to draw from savings to cover expenses

### Allocation Logic

When Gap > 0, funds are allocated in priority order:

1. **Fill Cash to Target**: Replenish emergency fund to inflated target first
2. **Allocate to 401(k)**: Up to individual contribution limit (grows with income)
3. **Allocate to Investments**: Distribute by portfolioPercent to each investment account
4. **Excess to Cash**: Any remainder (if portfolio allocation < 100%) stays in cash
5. **When Gap < 0**: Draw from cash (can go negative, representing debt/shortfall)

### Net Worth Calculation

```
Net Worth = Cash + Investment Market Value + 401(k) Value + Home Equity - Mortgage Remaining
```

*Where Home Equity = Home Value - Mortgage Remaining (when Property mode is "Own" or "Buy" post-purchase)*

All components grow/shrink based on:
- Gap allocation (new contributions)
- Market returns (growth on existing balances)
- 401(k) contributions and company match
- Home appreciation and mortgage amortization (if applicable)

## Calculation Flow

### Yearly Projection Loop

For each year from 1 to yearsToRetirement:

```javascript
// 1. Get income for this year (from Income module projections)
const annualIncome = incomeProjection.totalCompNominal * 12

// 2. Get 401(k) contributions for this year (from Income streams)
const totalIndividual401k = sum of all stream individual401k contributions

// 3. Calculate taxes (call Taxes module)
const taxableIncome = annualIncome - totalIndividual401k
const taxCalc = calculateTaxes(taxableIncome, 'salary', filingType, 'california', 'usa', year, inflationRate)
const annualTaxes = taxCalc.totalTax

// 4. Get expenses for this year (from Expenses module projections)
const annualExpenses = expenseProjection.totalExpensesNominal * 12

// 5. Calculate Gap
const gap = annualIncome - totalIndividual401k - annualTaxes - annualExpenses

// 6. Allocate Gap
if (gap > 0) {
  // Fill cash to target
  if (cash < targetCash) {
    const toAdd = Math.min(gap, targetCash - cash)
    cash += toAdd
    gap -= toAdd
  }

  // Invest per allocation %
  investments.forEach(inv => {
    const toInvest = gap * (inv.portfolioPercent / 100)
    inv.costBasis += toInvest
    gap -= toInvest
  })

  // Excess to cash
  cash += gap
} else if (gap < 0) {
  // Draw from cash
  cash += gap  // gap is negative
}

// 7. Apply investment growth
investments.forEach(inv => {
  inv.marketValue = inv.costBasis * Math.pow(1 + inv.growthRate / 100, year)
})

// 8. Apply 401(k) growth and add contributions
retirement401k.value = retirement401k.value * (1 + retirement401k.growthRate / 100)
                     + totalIndividual401k
                     + retirement401k.companyContribution

// 9. Calculate net worth
const netWorth = cash + totalInvestmentValue + retirement401kValue

// 10. Calculate present values
const discountFactor = Math.pow(1 + inflationRate / 100, year - 1)
const netWorthPV = netWorth / discountFactor
```

### Example: Year 1 Full Calculation

**Inputs:**
- Annual Income: $244,000
- Individual 401(k) Goal: $23,000
- Expenses: $158,949
- Filing Status: Married Filing Jointly
- Current Cash: $40,000
- Target Cash: $60,000
- Investment 1: 40% allocation, 7% growth, $100k current
- Investment 2: 30% allocation, 7% growth, $75k current
- Investment 3: 20% allocation, 7% growth, $50k current
- 401(k): $250k current, 7% growth, $10k company match

**Step 1: Calculate taxable income**
```
Taxable Income = $244,000 - $23,000 = $221,000
```

**Step 2: Calculate taxes**
```
California State Tax (2025 brackets): ~$10,500
Federal Tax (2025 brackets): ~$28,500
FICA:
  Social Security: $13,669 (6.2% of $220,500, capped)
  Medicare: $3,205 (1.45% of $221,000)
  Additional Medicare: $0 ($221k < $250k threshold)

Total Tax: $55,874
```

**Step 3: Calculate Gap**
```
Gap = $244,000 - $23,000 - $55,874 - $158,949 = $6,177
```

**Step 4: Allocate Gap (positive)**
```
Fill Cash:
  Current: $40,000
  Target: $60,000
  Need: $20,000
  But only $6,177 available
  Add $6,177 to cash → Cash = $46,177
  Remaining Gap: $0

(If gap was larger, would invest remainder per allocation %)
```

**Step 5: Apply growth**
```
Investment 1: $100,000 * 1.07 = $107,000
Investment 2: $75,000 * 1.07 = $80,250
Investment 3: $50,000 * 1.07 = $53,500

401(k): $250,000 * 1.07 + $23,000 + $10,000 = $300,500
```

**Step 6: Calculate Net Worth**
```
Net Worth = $46,177 (cash)
          + $240,750 (investments)
          + $300,500 (401k)
          = $587,427
```

## Data Dependencies

### Inputs (from other modules)

**Personal Details:**
- yearsToRetirement
- inflationRate
- filingStatus (mapped for tax calculation)
- currentCash, targetCash

**Income:**
- projections[monthIndex].totalCompNominal (monthly income)
- incomeStreams[].individual401k (contribution goals)
- incomeStreams[].endWorkYear (when income stops)
- incomeStreams[].growthRate (for contribution growth)

**Expenses:**
- projections[monthIndex].totalExpensesNominal (monthly expenses)

**Investments:**
- currentCash, targetCash (cash allocation targets)
- retirement401k (current value, growth rate, company contribution)
- investments[] (current value, growth rate, portfolio allocation %)

**Taxes:**
- Calculated dynamically via calculateTaxes() call

**Property:**
- homeValue (current or purchase price)
- growthRate (home appreciation rate)
- mortgageRemaining (current balance)
- monthlyPayment (P&I payment)
- mode (None/Own/Buy)
- purchaseYear (for Buy mode)
- downPayment (withdrawn from cash in purchase year)

### Storage

No dedicated storage - reads from all other modules.

### Outputs

**Projections Array:** Yearly data with fields:
```javascript
{
  year: 1,

  // Income & Deductions
  annualIncome: 244000,
  totalIndividual401k: 23000,
  annualTaxes: 55874,
  annualExpenses: 158949,
  gap: 6177,
  investedThisYear: 0,

  // Balances
  cash: 46177,
  retirement401kValue: 300500,
  totalCostBasis: 225000,
  totalInvestmentValue: 240750,
  netWorth: 587427,

  // Individual investments
  investments: [
    { costBasis: 100000, marketValue: 107000 },
    { costBasis: 75000, marketValue: 80250 },
    { costBasis: 50000, marketValue: 53500 }
  ],

  // Present values (all fields have PV counterpart)
  annualIncomePV: 244000,
  gapPV: 6177,
  netWorthPV: 587427,
  // ... etc
}
```

**Summary Object:**
```javascript
{
  // Current year (Year 1)
  currentYearGap: 6177,
  currentNetWorth: 587427,

  // Year 10
  year10Gap: 8500,
  year10NetWorth: 1250000,

  // Retirement
  retirementNetWorth: 3500000,
  retirementCash: 75000,

  // Lifetime totals
  lifetimeGap: 450000,
  lifetimeInvested: 420000,

  // Growth
  netWorthGrowth: 2912573,
  netWorthGrowthPercent: 495.8
}
```

## NetWorthTab Visualization

### Summary Cards

- **Current Net Worth**: Year 1 total
- **Retirement Net Worth**: Final year total
- **Net Worth Growth**: Absolute and percentage increase
- **Lifetime Invested**: Total new money added to investments

### Stacked Area Chart

Shows net worth components over time:
- Cash (blue)
- Investments (purple)
- 401(k) (green)

Stacked to show total growth trajectory.

### Waterfall Chart

For milestone years (every 5 years), shows what drove changes:
- Starting Net Worth
- Cash Change
- Investment Contributions
- Investment Growth
- 401(k) Contributions
- 401(k) Growth
- Ending Net Worth

Color-coded: contributions (colored), growth (colored), totals (gray).

### Detailed Year-by-Year Table

First 10 years shown with columns:
- Income
- 401(k) Contributions (subtracted)
- Taxes (subtracted)
- Expenses (subtracted)
- **Gap** (highlighted - can be positive or negative)
- Cash balance
- Investments balance
- 401(k) balance
- **Net Worth** (highlighted)

Includes formula explanation and allocation logic description.

### Toggle: Nominal vs Present Value

User can switch all values between:
- **Nominal**: Future dollars (inflated)
- **Present Value**: Today's dollars (inflation-adjusted)

Allows comparison of real purchasing power vs nominal wealth.

## Implementation Notes

### Tax Calculation Integration

Gap.calc.js calls Taxes module for each year:

```javascript
// Maps filing status from profile
const filingType =
  profile.filingStatus === 'Married Filing Jointly' ? 'married' :
  profile.filingStatus === 'Married Filing Separately' ? 'separate' :
  profile.filingStatus === 'Head of Household' ? 'head' : 'single'

// Critical: passes year and inflationRate for bracket inflation
const taxCalc = calculateTaxes(
  taxableIncome,
  'salary',
  filingType,
  'california',
  'usa',
  year,  // Year 1, 2, 3, etc. for bracket inflation
  inflationRate  // From profile for bracket inflation
)
```

This ensures tax brackets inflate properly (see Taxes module for details).

### Individual 401(k) Growth

Individual 401(k) contributions grow with income:

```javascript
const totalIndividual401k = incomeStreams.reduce((sum, stream) => {
  if (year <= stream.endWorkYear) {
    const yearsOfGrowth = year - 1
    const growthMultiplier = Math.pow(1 + stream.growthRate / 100, yearsOfGrowth)
    return sum + (stream.individual401k * growthMultiplier)
  }
  return sum
}, 0)
```

As your income grows, your ability to contribute grows proportionally.

### Investment Cost Basis vs Market Value

**Cost Basis:** Total money invested (contributions only)
**Market Value:** Current worth (contributions + growth)

Gap calculation affects cost basis:
```javascript
inv.costBasis += newContribution
```

Market value calculated from cost basis + growth:
```javascript
inv.marketValue = inv.costBasis * Math.pow(1 + inv.growthRate / 100, year)
```

This allows tracking capital gains (marketValue - costBasis).

### Present Value Calculations

All nominal values have PV counterparts:

```javascript
const yearsFromNow = year - 1  // Year 1 is "now"
const discountFactor = Math.pow(1 + inflationRate / 100, yearsFromNow)

const nominalValue = 1000000  // Future dollars
const presentValue = nominalValue / discountFactor  // Today's dollars

// Example with 2.7% inflation:
// Year 1: discount = 1.000, PV = $1,000,000
// Year 10: discount = 1.308, PV = $764,413
// Year 30: discount = 2.237, PV = $447,021
```

This shows real purchasing power, not just inflated numbers.

### Negative Cash Handling

If Gap is negative and exceeds available cash:

```javascript
// Cash can go negative
cash += gap  // gap is negative

// Example:
// Cash: $10,000
// Gap: -$50,000
// Result: Cash = -$40,000 (represents debt/shortfall)
```

The dashboard will show negative cash in red, alerting user to unsustainable scenario.

## Common Scenarios

### Scenario 1: Building Wealth (Positive Gap)

- Income: $250k
- Expenses: $150k
- Taxes: $60k
- 401(k): $23k
- **Gap: +$17k**

Allocation:
1. Fill cash to target ($60k)
2. Invest $17k per portfolio allocation
3. Net worth grows from income + market returns

Result: Steady wealth accumulation

### Scenario 2: Break-Even (Near-Zero Gap)

- Income: $200k
- Expenses: $130k
- Taxes: $45k
- 401(k): $25k
- **Gap: $0**

Allocation:
1. No new investments
2. Existing investments still grow
3. Net worth grows only from market returns

Result: Maintaining lifestyle, minimal new savings

### Scenario 3: Drawing Down (Negative Gap)

- Income: $180k
- Expenses: $140k
- Taxes: $42k
- 401(k): $23k
- **Gap: -$25k**

Allocation:
1. Stop investing
2. Draw $25k from cash
3. Net worth grows from returns, shrinks from withdrawals

Result: Unsustainable long-term, need lifestyle adjustment

### Scenario 4: Retirement (No Income)

- Income: $0 (retired)
- Expenses: $80k
- Taxes: $0
- 401(k): $0
- **Gap: -$80k**

Allocation:
1. Draw $80k from cash/investments each year
2. Net worth declining
3. Shows how long savings will last

Result: Spending phase, monitoring runway

## Key Insights from Dashboard

### Positive Indicators

- Gap stays positive throughout retirement
- Net worth grows faster than inflation
- Cash never goes negative
- Retirement net worth > 25x annual expenses

### Warning Signs

- Gap turns negative before retirement
- Cash goes negative
- Net worth grows slower than inflation
- Heavy reliance on market returns vs new contributions

### What-If Analysis

Users can adjust inputs in other modules to see impact:
- Increase income → Gap increases → More invested
- Reduce expenses → Gap increases → Build wealth faster
- Change allocation % → Shift between safety (cash) and growth (stocks)
- Adjust growth rates → See market return sensitivity

## Integration with Other Modules

**Calculation Order:**
1. Personal Details: Sets parameters (years, inflation, filing status)
2. Income: Calculates monthly income projections
3. Expenses: Calculates monthly expense projections
4. Investments: Provides starting balances and allocation rules
5. Property: Provides home value, mortgage, and payment data
6. **Gap/Net Worth**: Integrates all above + calls Taxes for each year

**Data Flow:**
```
Personal Details → [Profile] → All Modules
Income → [Projections] → Gap
Expenses → [Projections] → Gap
Investments → [Balances + Rules] → Gap
Property → [Home Value, Mortgage, Payment] → Gap & Net Worth
Gap → [Taxable Income] → Taxes → [Total Tax] → Gap
Gap → [Down Payment Withdrawal] → Investments (Cash)
Gap → [Projections + Summary] → Dashboard
```

## Future Enhancements

Potential improvements:

1. **Contribution Limits**: Cap 401(k) at IRS limit (with catch-up at age 50)
2. **Tax-Loss Harvesting**: Model capital losses offsetting gains
3. **Roth Conversions**: Add Roth IRA and conversion strategies
4. **Social Security**: Include SS benefits in retirement income
5. **Required Minimum Distributions (RMDs)**: Force 401(k) withdrawals at age 73
6. **Multiple Scenarios**: Compare optimistic/pessimistic cases
7. **Monte Carlo**: Statistical analysis of market volatility
8. **Spending Rules**: 4% rule, guardrails, dynamic withdrawal strategies
