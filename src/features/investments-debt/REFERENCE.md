# Investments & Debt Module Reference

## Overview

The Investments & Debt module manages cash holdings, 401(k) retirement accounts, and up to 3 taxable investment accounts. It tracks current balances and projects growth over time based on contribution rates and market returns. Cash values are synced with Personal Details, and company 401(k) match is automatically pulled from Income streams.

## Field Reference

### Cash on Hand (Synced with Personal Details)

#### Current Cash
- **Type**: Number (currency)
- **Default**: From Personal Details module
- **Validation**: Must be ≥ 0
- **Purpose**: Starting cash balance for Gap allocation logic
- **Sync**: Updates Personal Details module when saved

#### Target Cash
- **Type**: Number (currency)
- **Default**: From Personal Details module
- **Validation**: Must be ≥ 0
- **Purpose**: Gap logic fills cash to this target before investing
- **Sync**: Updates Personal Details module when saved

### 401(k) Retirement Account

#### Individual Limit (2025)
- **Type**: Number (currency)
- **Default**: 23,500
- **Validation**: Must be ≥ 0
- **Purpose**: IRS annual contribution limit (inflates over time)

#### Annual Limit Growth
- **Type**: Number (percentage)
- **Default**: 3.0%
- **Validation**: Must be > -100%
- **Purpose**: How fast 401(k) limit increases (historically ~2-3%)

#### Company Match (Annual)
- **Type**: Number (currency, readonly)
- **Source**: Automatically summed from all income streams
- **Purpose**: Employer 401(k) contributions added to balance

#### Current 401(k) Value
- **Type**: Number (currency)
- **Default**: Empty
- **Validation**: Must be ≥ 0
- **Purpose**: Starting 401(k) balance

#### 401(k) Growth Rate
- **Type**: Number (percentage)
- **Default**: 7.0%
- **Validation**: Must be > -100%
- **Purpose**: Expected annual return on 401(k) investments

### Investment Portfolio (Max 3)

Each investment account has:

#### Current Value
- **Type**: Number (currency)
- **Validation**: Must be ≥ 0
- **Purpose**: Current market value of investment

#### Cost Basis
- **Type**: Number (currency)
- **Validation**: Must be ≥ 0
- **Purpose**: Original investment amount (for gain/loss tracking)

#### Growth Rate
- **Type**: Number (percentage)
- **Validation**: Must be > -100%
- **Purpose**: Expected annual return

#### Portfolio Allocation %
- **Type**: Number (percentage)
- **Validation**: 0 ≤ value ≤ 100
- **Purpose**: How future Gap surplus is allocated to this investment
- **Note**: Total across all investments must be ≤ 100%

## Calculations

### 401(k) Growth Projection

```javascript
// Starting value
let value = retirement401k.currentValue

// For each year 1 to N:
for (let year = 1; year <= yearsToRetirement; year++) {
  // Apply growth
  value = value * (1 + retirement401k.growthRate / 100)

  // Add company contribution
  value += retirement401k.companyContribution
}
```

**Example:**
- Current Value: $250,000
- Growth Rate: 7%
- Company Match: $10,000/year
- Year 10:
```
Year 1: $250k * 1.07 + $10k = $277,500
Year 2: $277.5k * 1.07 + $10k = $306,925
...
Year 10: $518,107
```

### Investment Growth Projection

```javascript
// Simple compound growth (no new contributions in projection)
const futureValue = currentValue * Math.pow(1 + growthRate / 100, years)
```

**Example:**
- Current Value: $100,000
- Growth Rate: 7%
- Year 10:
```
$100,000 * 1.07^10 = $196,715
```

**Note:** New contributions come from Gap allocation, handled in Gap module.

### Portfolio Allocation Logic (Used by Gap Module)

When Gap > 0, allocation works as follows:

```javascript
// 1. Fill cash to target
if (cash < targetCash) {
  const toAdd = Math.min(gap, targetCash - cash)
  cash += toAdd
  gap -= toAdd
}

// 2. Allocate remaining gap to investments per portfolio %
investments.forEach(inv => {
  const allocation = gap * (inv.portfolioPercent / 100)
  inv.costBasis += allocation
})

// 3. If total allocation < 100%, remainder goes to cash
const unallocatedPercent = 100 - totalPortfolioPercent
const toCaption = gap * (unallocatedPercent / 100)
cash += toCash
```

**Example:**
- Gap: $50,000
- Current Cash: $40,000
- Target Cash: $60,000
- Investment 1: 40% allocation
- Investment 2: 30% allocation
- Investment 3: 20% allocation
- Total: 90% (10% unallocated)

**Step 1: Fill cash to target**
```
Need: $60k - $40k = $20k
Add $20k to cash → Cash = $60k
Remaining Gap: $30k
```

**Step 2: Allocate to investments**
```
Investment 1: $30k * 40% = $12,000
Investment 2: $30k * 30% = $9,000
Investment 3: $30k * 20% = $6,000
Total Invested: $27,000
```

**Step 3: Remainder to cash**
```
Unallocated: $30k * 10% = $3,000
Cash: $60k + $3k = $63,000
```

## Data Flow

### Inputs
- Personal Details module: currentCash, targetCash (initial sync)
- Income module: company401k values (auto-summed)
- User input: 401(k) settings, investment accounts

### Storage
```javascript
storage.save('investmentsDebt', {
  currentCash: 40000,
  targetCash: 60000,
  retirement401k: {
    individualLimit: 23500,
    limitGrowth: 3,
    currentValue: 250000,
    growthRate: 7,
    companyContribution: 10000  // Auto-calculated from income streams
  },
  investments: [
    {
      id: 'investment-1',
      currentValue: 100000,
      costBasis: 80000,
      growthRate: 7,
      portfolioPercent: 40
    }
    // ... up to 3 total
  ]
})

// Also updates profile
storage.save('profile', {
  ...profile,
  currentCash: 40000,
  targetCash: 60000
})
```

### Outputs
- Gap/Net Worth module: Uses cash and 401(k) values for projections
- Personal Details module: Syncs cash values back

### Dependencies

**Requires:**
- Personal Details: initial cash values, yearsToRetirement
- Income: company401k values from all streams

**Consumed by:**
- Gap/Net Worth module (primary consumer)

## Validation Logic

```javascript
// Cash validation
if (currentCash < 0) error
if (targetCash < 0) error

// 401(k) validation
if (individualLimit < 0) error
if (limitGrowth < -100) error
if (currentValue < 0) error
if (growthRate < -100) error

// Investment validation (per investment)
if (currentValue < 0) error
if (costBasis < 0) error
if (growthRate < -100) error
if (portfolioPercent < 0 or > 100) error

// Total portfolio validation
if (sum of all portfolioPercent > 100) error
```

## UI Behavior

### Input View

**Total Savings Summary:**
- Blue banner showing: Cash + 401(k) + All Investments
- Updates in real-time as user enters values

**Cash on Hand Section:**
- 2-column compact grid
- Note: "(Synced with Personal Details)"
- Changes here update profile when saved

**401(k) Section:**
- 3-column grid layout
- Company Match field is disabled (gray, readonly)
- Shows "(From Income)" helper text

**Investment Portfolio:**
- Table/card view for up to 3 investments
- "+ Add Investment" button (hidden when 3 exist)
- Each investment shows: Current Value, Cost Basis, Growth Rate, Portfolio %
- "Remove" button for each investment
- Real-time portfolio allocation total shown
- Warning if total > 100%

### Output View

**Summary Cards:**
- Current Total Savings
- Year 10 Projected Savings
- Retirement Total Savings
- Total Growth % over retirement period

**Stacked Area Chart:**
- Shows Cash, 401(k), Investment 1, Investment 2, Investment 3 over time
- Different color for each component
- Stacked to show total growth

## Implementation Notes

### Company 401(k) Auto-Sync

On mount, module sums company401k from all income streams:

```javascript
const totalCompany401k = incomeData.incomeStreams.reduce((sum, stream) => {
  return sum + (Number(stream.company401k) || 0)
}, 0)
```

This ensures company match stays synchronized with income projections.

### Profile Cash Sync

When user saves, both `investmentsDebt` and `profile` are updated:

```javascript
storage.save('investmentsDebt', data)

const profile = storage.load('profile') || {}
profile.currentCash = data.currentCash
profile.targetCash = data.targetCash
storage.save('profile', profile)
```

This maintains consistency between Personal Details and Investments modules.

### Pre-loaded Investments

On first load (no saved data), module automatically creates 3 investments:
- Each gets 1/3 of current savings (from profile)
- Default growth rate: 7%
- Default allocation: 33.33%, 33.33%, 33.34% (totals 100%)

This provides a reasonable starting point for users.

### Investment Growth vs Gap Allocation

**Important distinction:**
- Module projections show simple compound growth on current values
- Gap module handles **new contributions** based on portfolio allocation %
- Final net worth combines both: growth on existing + growth on new contributions

### Simplified Projection

This module's projections are simplified (no new contributions shown). The comprehensive projection happens in Gap/Net Worth module which integrates:
- Income projections
- Expense projections
- Tax calculations
- Gap allocation to investments

## Common Use Cases

### Simple 401(k) Tracking
- Current 401(k): $250k
- Growth: 7%
- Company Match: $10k/year
- Shows growth to ~$2M+ at retirement

### Diversified Portfolio
- Investment 1 (Stocks): 60% allocation, 8% growth
- Investment 2 (Bonds): 30% allocation, 4% growth
- Investment 3 (Real Estate): 10% allocation, 5% growth
- Gap surplus allocated proportionally

### Conservative Cash Buffer
- Target Cash: $100k (large emergency fund)
- Gap logic fills to $100k before investing
- Provides security during volatile markets

### Aggressive Investment
- Target Cash: $20k (minimal cash)
- Portfolio allocation: 100% (all to investments)
- Maximizes market exposure, minimizes cash drag
