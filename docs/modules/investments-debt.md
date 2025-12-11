# Investments & Debt Module Reference

## Overview

The Investments & Debt module manages cash holdings, 401(k) retirement accounts, and up to 3 taxable investment accounts. It tracks current balances and projects growth over time based on contribution rates and market returns. Cash values are synced with Personal Details, and company 401(k) match is automatically pulled from Income streams.

## Module Architecture & References
- **Components:** `src/features/investments-debt/InvestmentsDebt.jsx` renders inputs; `InvestmentsDebt.calc.js` houses growth/validation helpers.
- **Storage:** Saves data under `investmentsDebt` and mirrors `currentCash`/`targetCash` into the `profile` entry for cross-module consistency.
- **Dependencies:** Consumes company 401k totals calculated in the Income module; Gap/Net Worth uses cash/portfolio settings to allocate positive or negative gap each year.

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

---

## Component Breakdown

The Investments-Debt module tracks three distinct components that contribute to net worth:

### 1. Cash Component
**Purpose**: Liquidity buffer and emergency fund

**Key Features:**
- **Current Cash**: Starting liquid assets
- **Target Cash**: Goal amount (inflation-adjusted annually)
- **Buffer Logic**: Gap fills cash to target before investing
- **Withdrawal**: Negative gaps draw from cash

**Net Worth Role**: Immediate liquidity, protects against income disruptions

### 2. Retirement 401k Component
**Purpose**: Tax-advantaged retirement savings

**Key Features:**
- **Current Value**: Existing 401k balance
- **Growth Rate**: Annual compounding (typically 7%)
- **Individual Limit**: Annual contribution cap ($23,500 in 2025, grows 3%/year)
- **Company Contribution**: Auto-populated from Income module (employer match)

**Tax Treatment:**
- Contributions are PRE-TAX (reduce taxable income)
- Growth is tax-deferred
- Not accessible until retirement (assumed)

**Net Worth Role**: Long-term retirement asset, compounding tax-free

### 3. Investments Component (1-3 Accounts)
**Purpose**: Post-tax investment growth

**Key Features:**
- **Current Value**: Starting investment balance
- **Cost Basis**: Original investment amount (for future tax calculations)
- **Growth Rate**: Expected annual return (can vary by account)
- **Portfolio Percent**: Allocation of surplus gap (must sum ≤ 100%)

**Gap Allocation:**
- After cash reaches target and 401k contributions made
- Surplus gap allocated by portfolioPercent
- Example: 60% to stocks, 30% to bonds, 10% to REITs

**Net Worth Role**: Post-tax wealth accumulation, flexible access

---

## Net Worth Impact

Each component contributes differently to net worth:

### Cash Impact
```
Cash Balance (Year N) = Starting Cash
                      + Gap Surplus (until target reached)
                      - Negative Gap Withdrawals
                      + Inflation Adjustment to Target
```

**Key Points:**
- Grows to inflated target, then stops receiving gap allocations
- Buffer for negative gaps (income loss, large expenses)
- Does NOT compound (no growth rate)
- Target inflates annually: `Target Year N = Base Target × (1 + inflation)^(N-1)`

### 401k Impact
```
401k Value (Year N) = Previous Value × (1 + growthRate)
                     + Individual Contributions (from Gap, up to limit)
                     + Company Contributions (from Income, auto)
```

**Key Points:**
- **Dual Contribution Sources**:
  - Individual: Comes from Gap (pre-tax), reduces taxable income
  - Company: Free money from employer, does NOT reduce gap
- **Compounds tax-free** at growth rate
- **Limit Enforcement**: Individual contributions capped at inflated limit
- **Major Net Worth Driver**: Tax advantages + employer match + long compounding period

**Example Impact:**
```
Year 1:
  Starting 401k: $100,000
  Individual Contribution: $23,000 (from gap, reduces taxes)
  Company Match: $10,000 (from income, free money)
  Growth (7%): $7,000
  Ending 401k: $140,000

Net Worth Contribution: +$40,000
Tax Savings: $23,000 × 25% = $5,750 (not directly tracked, but real benefit)
```

### Investments Impact
```
Investment Value (Year N) = Previous Value × (1 + growthRate)
                          + Gap Allocations (by portfolioPercent)
```

**Key Points:**
- **Post-Tax Growth**: No tax advantages, but flexible access
- **Diversification**: Up to 3 accounts with different growth rates
- **Allocation Logic**: Surplus gap after cash target and 401k contributions
- **Portfolio Percent Constraint**: Sum must be ≤ 100%

**Example Impact (3 Investments):**
```
Annual Gap Surplus: $50,000 (after cash target and 401k)

Investment 1 (Stocks, 60% allocation, 8% growth):
  Allocation: $50,000 × 60% = $30,000
  Year 1: $30,000 × 1.08 = $32,400

Investment 2 (Bonds, 30% allocation, 4% growth):
  Allocation: $50,000 × 30% = $15,000
  Year 1: $15,000 × 1.04 = $15,600

Investment 3 (REITs, 10% allocation, 5% growth):
  Allocation: $50,000 × 10% = $5,000
  Year 1: $5,000 × 1.05 = $5,250

Total Net Worth Contribution: $53,250
```

### Combined Net Worth Formula
```
Net Worth = Cash Balance
          + 401k Value
          + Sum(Investment Values)
          + Home Equity (from Property module)
          - Mortgage Remaining (from Property module)
```

---

## Cross-Page Dependencies

### Provides Data To:

1. **Gap/Net Worth Module**:
   - **Purpose**: Track all investment assets
   - **Data**: Cash balance, 401k value, investment values (all with PV)
   - **Formula**: Net Worth = Cash + 401k + Investments + Property - Debt
   - **Impact**: Primary net worth components

2. **Property Module**:
   - **Purpose**: Cash provides down payment funds
   - **Data**: Current cash balance
   - **Flow**: Down payment withdraws from cash in purchase year
   - **Impact**: Large one-time cash reduction

### Depends On:

1. **Income Module**:
   - **Purpose**: 401k company contributions
   - **Data**: `company401k` from all income streams
   - **Auto-Sync**: Totaled and populated in `retirement401k.companyContribution`
   - **Formula**: `Total Company 401k = Sum(stream.company401k for all active streams)`
   - **Impact**: Free employer match increases 401k growth

2. **Profile Module**:
   - **Purpose**: 401k limits and inflation
   - **Data**:
     - `inflationRate`: Inflates target cash annually
     - Current year for 401k limit inflation
   - **401k Limit Growth**: `Limit Year N = Base Limit × (1 + limitGrowth)^(N-1)`
   - **Impact**: Determines maximum pre-tax contributions

3. **Gap Calculation** (from Gap module):
   - **Purpose**: Receives surplus gap for allocations
   - **Data**: Monthly gap after taxes and expenses
   - **Allocation Priority**:
     1. Fill cash to inflated target
     2. 401k contributions (up to limit)
     3. Investments (by portfolioPercent)
     4. Excess stays in cash
   - **Impact**: All investment growth originates from positive gap

### Automatic Syncing

**Income to 401k Company Contribution:**
```
Income (Sum of company401k) → Investments (retirement401k.companyContribution)
```
- Read-only in Investments module
- Updates when income streams change
- Prevents double-counting

**Profile to Target Cash:**
```
Profile (inflationRate) → Investments (targetCash inflation)
```
- Target cash inflates annually
- Keeps emergency fund purchasing power constant
- Formula: `Inflated Target = Base Target × (1 + inflation)^years`

---

## Validation Rules Summary

Quick reference for all validation constraints:

### Cash Validation

| Field | Min | Max | Required | Type | Notes |
|-------|-----|-----|----------|------|-------|
| **currentCash** | ≥ 0 | No limit | Yes | Currency | Starting liquid assets |
| **targetCash** | ≥ 0 | No limit | Yes | Currency | Inflation-adjusted goal; warning if < currentCash |

### 401k Validation

| Field | Min | Max | Required | Type | Notes |
|-------|-----|-----|----------|------|-------|
| **currentValue** | ≥ 0 | No limit | Yes | Currency | Existing 401k balance |
| **growthRate** | -20% | 30% | Yes | Percentage | Expected annual return |
| **individualLimit** | ≥ 0 | No limit | Yes (default: $23,500) | Currency | Annual contribution cap (2025) |
| **limitGrowth** | 0% | 10% | Yes (default: 3%) | Percentage | Annual limit increase rate |
| **companyContribution** | ≥ 0 | No limit | Auto-calculated | Currency | From Income module (read-only) |

### Investment Validation (Per Account)

| Field | Min | Max | Required | Type | Notes |
|-------|-----|-----|----------|------|-------|
| **currentValue** | ≥ 0 | No limit | Yes | Currency | Starting investment balance |
| **costBasis** | ≥ 0 | ≤ currentValue | Yes | Currency | Original investment (for tax calcs) |
| **growthRate** | -20% | 30% | Yes | Percentage | Expected annual return |
| **portfolioPercent** | 0% | 100% | Yes | Percentage | Allocation of surplus gap |

### Portfolio Constraints

- **Total Investments**: 0 to 3 (MAX_INVESTMENTS: 3)
- **Portfolio Allocation Sum**: Must be ≤ 100%
  - Validation: `Sum(investment.portfolioPercent) ≤ 100`
  - Error if > 100%: "Portfolio allocation cannot exceed 100%"
- **Under-allocation Allowed**: Sum < 100% → excess gap stays in cash
- **Cost Basis**: Warning if costBasis > currentValue (unrealized loss scenario)

### Error Messages

| Validation Failure | Error Message |
|-------------------|---------------|
| Current Cash < 0 | "Current cash must be a positive number or 0" |
| Target Cash < 0 | "Target cash must be a positive number or 0" |
| 401k Current Value < 0 | "401k current value must be a positive number or 0" |
| 401k Growth Rate out of range | "Growth rate must be between -20% and 30%" |
| Investment Current Value < 0 | "Investment value must be a positive number or 0" |
| Cost Basis > Current Value | "Warning: Cost basis exceeds current value (unrealized loss)" |
| Portfolio allocation > 100% | "Portfolio allocation cannot exceed 100%" |

### Calculation Rules

- **Cash**: No compounding; grows only to inflated target, then stops
- **401k**: Compounds at growth rate + receives contributions (individual + company)
- **Investments**: Compound at individual growth rates + receive gap allocations
- **Precision**: No rounding in calculations; preserve full floating-point precision
- **Gap Priority**: Cash fills first, then 401k (to limit), then investments (by %), then excess to cash
