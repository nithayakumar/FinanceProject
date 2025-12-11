# Property Module Reference

**Last Updated**: 2025-12-10

## Overview

The Property module manages home ownership and purchase planning with three modes: None, Own (already own), and Buy (plan to purchase). It calculates home value appreciation, mortgage amortization, and equity buildup over time. The module integrates with Expenses (mortgage payment) and Investments (down payment from cash) to provide comprehensive property planning.

## Module Architecture

- **Component**: `src/features/property/Property.jsx`
- **Calculations**: `src/features/property/Property.calc.js`
- **Storage Key**: `property`
- **Consumers**: Gap/Net Worth (adds home equity, subtracts mortgage), Expenses (mortgage payment syncs to housing category)

---

## Mode Comparison

### None Mode

**When to Use:**
- No current or planned home ownership
- Renting indefinitely
- Want to exclude property from financial plan

**Features:**
- No inputs required
- No property-related calculations
- No impact on net worth

**Net Worth Impact**: Zero

---

### Own Mode

**When to Use:**
- Currently own a home
- Want to track equity growth
- Model existing mortgage payoff

**Inputs:**

| Field | Type | Default | Required | Notes |
|-------|------|---------|----------|-------|
| **homeValue** | Currency | - | Yes | Current home value |
| **growthRate** | Percentage | 3% | Yes | Annual appreciation rate |
| **mortgageRemaining** | Currency | - | Yes | Current mortgage balance |
| **monthlyPayment** | Currency | - | Yes | Monthly mortgage payment (P&I) |

**Auto-Calculated:**
- **Remaining Term**: Calculated from mortgage balance, payment, and rate
  ```
  Months = ln(Payment / (Payment - Principal × MonthlyRate)) / ln(1 + MonthlyRate)
  ```

**Outputs:**
- Home value projection (30+ years)
- Equity buildup: `Equity = homeValue × (1 + growthRate)^years - mortgageRemaining`
- Mortgage amortization schedule
- Payoff timeline

**Net Worth Impact:**
- **Asset**: Home value appreciating at growthRate
- **Liability**: Mortgage balance amortizing
- **Equity**: Net of home value minus mortgage
- **Cash Flow**: Monthly payment reduces gap

**Example:**
```
Home Value: $800,000
Growth Rate: 3%
Mortgage Remaining: $400,000
Monthly Payment: $3,000

Year 1:
  Home Value: $824,000 ($800K × 1.03)
  Mortgage Paid Down: ~$12,000 (varies with rate)
  Remaining Mortgage: ~$388,000
  Equity: $824,000 - $388,000 = $436,000
  Annual Payment Impact on Gap: -$36,000
```

---

### Buy Mode

**When to Use:**
- Plan to purchase a home in the future
- Need to save for down payment
- Model purchase timing and affordability

**Inputs:**

| Field | Type | Default | Required | Notes |
|-------|------|---------|----------|-------|
| **homePrice** | Currency | - | Yes | Purchase price (in today's dollars) |
| **downPayment** | Number | - | Yes | Down payment amount |
| **downPaymentType** | Enum | "percent" | Yes | "percent" or "dollar" |
| **purchaseYear** | Integer | - | Yes | Year of purchase (relative to year 1) |
| **mortgageRate** | Percentage | - | Yes | Annual mortgage interest rate |
| **term** | Integer | 30 | Yes | Mortgage term in years (10-30) |

**Auto-Calculated:**
- **Monthly Payment**: Standard mortgage formula
  ```
  Payment = Principal × [r(1+r)^n] / [(1+r)^n - 1]

  where:
    Principal = homePrice - downPayment
    r = monthlyRate = mortgageRate / 12 / 100
    n = totalPayments = term × 12
  ```
- **Loan Amount**: `homePrice - downPayment`
- **Total Interest**: Sum of interest payments over term

**Outputs:**
- Home value projection from purchase year onward
- Down payment impact on cash (withdrawal in purchase year)
- Mortgage creation and amortization
- Equity buildup from purchase year

**Net Worth Impact:**
- **Year of Purchase**:
  - Cash: -downPayment (withdrawn from Investments cash)
  - Asset: +homePrice (new home value)
  - Liability: +loanAmount (new mortgage)
  - Net: -downPayment + homePrice - loanAmount = 0 (but cash reduced)
- **Subsequent Years**:
  - Home appreciates at growth rate
  - Mortgage principal paid down
  - Equity increases: appreciation + paydown

**Example:**
```
Home Price: $600,000 (today's dollars)
Down Payment: 20% ($120,000)
Purchase Year: 3
Mortgage Rate: 6.5%
Term: 30 years

Year 3 Purchase:
  Down Payment: $120,000 (from cash)
  Loan Amount: $480,000
  Monthly Payment: $3,033

  Cash Impact: -$120,000
  New Asset: +$600,000 (home)
  New Liability: -$480,000 (mortgage)
  Equity: $120,000

Year 4:
  Home Value: $600,000 × 1.03 = $618,000
  Mortgage Remaining: ~$475,000
  Equity: $618,000 - $475,000 = $143,000
  Equity Gain: $23,000 ($18K appreciation + $5K paydown)
```

---

## Expense Integration

The Property module syncs with the Expenses module to prevent double-counting:

### Detailed Expense Mode Sync

**When Property Mode = "Own" or "Buy":**
- Mortgage payment automatically flows to Expenses Housing category
- Housing category set to `annualAmount = monthlyPayment × 12`
- User can manually adjust if housing includes more than mortgage (HOA, taxes, insurance)

### Simple Expense Mode

**When Expenses in Simple Mode:**
- Property expenses entered separately in Property module
- Fields: Property Tax Rate (%), Insurance Rate (%), Maintenance Rate (%), Additional Monthly Expense
- These are NOT synced to Expenses (separate accounting)
- Total property cost = Mortgage + (Home Value × (Tax% + Insurance% + Maintenance%)) / 12 + Additional

**Calculation:**
```
Monthly Property Expense = Monthly Mortgage Payment
                         + (Home Value × Property Tax Rate / 100 / 12)
                         + (Home Value × Insurance Rate / 100 / 12)
                         + (Home Value × Maintenance Rate / 100 / 12)
                         + Additional Monthly Expense
```

---

## Net Worth Impact

### Direct Net Worth Contribution

```
Net Worth = Cash + 401k + Investments + Home Equity - Mortgage Remaining

where:
  Home Equity = Home Value - Mortgage Remaining
```

### Home Value Growth
```
Home Value (Year N) = Purchase Price × (1 + growthRate)^(years since purchase)
```
- Grows with annual appreciation rate
- Typical rates: 2-4% (matches or slightly exceeds inflation)
- Appreciation is tax-free until sale (not modeled)

### Mortgage Amortization

**Principal Paydown:**
- Early years: Mostly interest, little principal
- Later years: Mostly principal, little interest
- Accelerates equity growth over time

**Standard 30-Year Mortgage Breakdown:**
```
Year 1: ~80% interest, ~20% principal
Year 15: ~50% interest, ~50% principal
Year 30: ~5% interest, ~95% principal
```

### Gap Impact

**Mortgage Payment Reduces Gap:**
```
Monthly Gap = Income - Pre-tax 401k - Taxes - Expenses - Mortgage Payment
```
- Monthly payment is a cash outflow
- Reduces available funds for investments
- BUT builds equity (forced savings)

**Down Payment (Buy Mode):**
- Large one-time withdrawal from cash in purchase year
- Can create temporary negative gap if insufficient cash
- Requires planning and saving

**Example Impact on Net Worth Growth:**
```
Scenario: Own home vs. Rent

Own (Year 10):
  Home Value: $800K → $1,074K (3% growth)
  Mortgage: $400K → $320K (paid down $80K)
  Equity: $754K
  Annual Payment: $36K (reduces gap, but builds equity)
  Net Worth Impact: +$754K from property

Rent (Year 10):
  Rent: $3,000/month = $36K/year (same cash outflow)
  Equity: $0
  But: Extra $400K invested (no down payment tied up)
       → At 7% return: $786K
  Net Worth Impact: +$786K from investments (potentially higher)

Trade-off: Leverage & diversification vs. liquidity & returns
```

---

## Cross-Page Dependencies

### Provides Data To:

1. **Gap/Net Worth Module**:
   - **Purpose**: Track home equity and mortgage liability
   - **Data**:
     - Home value (asset)
     - Mortgage remaining (liability)
     - Equity (home value - mortgage)
   - **Formula**: `Net Worth = ... + Home Equity - Mortgage`
   - **Impact**: Major net worth component (often largest asset)

2. **Expenses Module** (Detailed Mode):
   - **Purpose**: Sync mortgage payment to housing category
   - **Data**: Monthly mortgage payment
   - **Auto-Sync**: Property payment → Expenses Housing annualAmount
   - **Impact**: Prevents double-counting expenses

### Depends On:

1. **Investments Module**:
   - **Purpose**: Down payment source (Buy mode)
   - **Data**: Current cash balance
   - **Flow**: Down payment withdraws from cash in purchase year
   - **Validation**: Warning if down payment > current cash
   - **Impact**: Large cash reduction can affect investment capacity

2. **Profile Module**:
   - **Purpose**: Inflation and timeline validation
   - **Data**:
     - `inflationRate`: Can be used for property tax/insurance growth
     - `yearsToRetirement`: Maximum allowed purchase year
   - **Validation**: Purchase year must be ≤ yearsToRetirement
   - **Impact**: Ensures property purchase happens within working years

3. **Expenses Module** (Two-Way):
   - **Purpose**: Housing expense coordination
   - **Data**:
     - Detailed mode: Mortgage payment syncs to Housing category
     - Simple mode: Additional property expenses entered in Property module
   - **Impact**: Total housing cost reflected in gap calculation

### Automatic Syncing

**Property Payment to Expenses Housing (Detailed Mode):**
```
Property (monthlyPayment) → Expenses Housing (annualAmount = monthlyPayment × 12)
```
- Prevents entering mortgage twice
- User can override if housing includes HOA, utilities, etc.
- One-way sync: Property → Expenses (Expenses doesn't write back)

**Down Payment from Cash:**
```
Property (downPayment, purchaseYear) → Investments (cash withdrawal)
```
- In purchase year, down payment amount withdrawn from cash
- Reduces cash balance immediately
- May trigger negative gap if insufficient cash reserves

---

## Validation Rules Summary

### Own Mode Validation

| Field | Min | Max | Required | Type | Notes |
|-------|-----|-----|----------|------|-------|
| **homeValue** | > 0 | No limit | Yes | Currency | Current home value |
| **growthRate** | -10% | 20% | Yes | Percentage | Annual appreciation rate |
| **mortgageRemaining** | ≥ 0 | ≤ homeValue | Yes | Currency | Current mortgage balance |
| **monthlyPayment** | ≥ 0 | No limit | Yes | Currency | Monthly P&I payment |

### Buy Mode Validation

| Field | Min | Max | Required | Type | Notes |
|-------|-----|-----|----------|------|-------|
| **homePrice** | > 0 | No limit | Yes | Currency | Purchase price (today's dollars) |
| **downPayment** | ≥ 0 | Varies | Yes | Number | Amount or percent based on type |
| **downPaymentType** | N/A | N/A | Yes | Enum | "percent" or "dollar" |
| **purchaseYear** | ≥ 1 | ≤ yearsToRetirement | Yes | Integer | When to purchase (relative year) |
| **mortgageRate** | 0% | 20% | Yes | Percentage | Annual interest rate |
| **term** | 10 years | 30 years | Yes | Integer | Mortgage term in years |

**Down Payment Type-Specific Validation:**
- **Percent**: 0% to 100% (of home price)
- **Dollar**: ≥ 0 and < homePrice

### Property Expense Validation (Simple Mode Only)

| Field | Min | Max | Required | Type | Notes |
|-------|-----|-----|----------|------|-------|
| **propertyTaxRate** | 0% | 10% | No (default: 1.2%) | Percentage | Annual property tax rate |
| **insuranceRate** | 0% | 5% | No (default: 0.5%) | Percentage | Annual insurance rate |
| **maintenanceRate** | 0% | 10% | No (default: 1%) | Percentage | Annual maintenance rate |
| **additionalExpense** | ≥ 0 | No limit | No | Currency | Extra monthly costs (HOA, etc.) |

### Error Messages

| Validation Failure | Error Message |
|-------------------|---------------|
| Home Value ≤ 0 | "Home value must be greater than 0" |
| Mortgage > Home Value | "Mortgage cannot exceed home value" |
| Down Payment > Home Price | "Down payment cannot exceed home price" |
| Purchase Year > Retirement | "Purchase year cannot exceed retirement year (X)" |
| Mortgage Rate < 0 or > 20% | "Mortgage rate must be between 0% and 20%" |
| Term < 10 or > 30 | "Mortgage term must be between 10 and 30 years" |

### Calculation Rules

- **Home Value Growth**: Compounding annual appreciation
- **Mortgage Amortization**: Standard amortization formula (fixed payment, decreasing interest)
- **Down Payment**: One-time withdrawal in purchase year
- **Precision**: No rounding in calculations; preserve full floating-point precision
- **Equity**: Continuously updated as home appreciates and mortgage pays down

---

## Common Use Cases

### First-Time Home Purchase
```
Mode: Buy
Home Price: $500,000
Down Payment: 20% ($100,000)
Purchase Year: 3
Mortgage Rate: 6.5%
Term: 30 years

Strategy: Save for down payment in Years 1-3, purchase in Year 3
```

### Current Homeowner
```
Mode: Own
Home Value: $750,000
Mortgage Remaining: $300,000
Monthly Payment: $2,500
Growth Rate: 3%

Track: Equity growth, payoff timeline, appreciation
```

### Downsize in Retirement
```
Mode: Own (Years 1-20)
Then: Switch to Buy (smaller home in Year 21)

Year 20: Sell large home, realize equity
Year 21: Buy smaller home with cash (no mortgage)
```

### Rent vs. Buy Analysis
```
Compare:
1. Property Mode = "None" + Higher Rent in Expenses
   → More cash to invest

2. Property Mode = "Buy" + Mortgage Payment
   → Build equity, but less liquid

Net Worth Comparison: Model both scenarios and compare
```
