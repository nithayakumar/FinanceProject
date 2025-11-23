# Investments Graph Calculation Explanation

The investments graph on the Investments page shows **Net Worth** over time, which is calculated as:

```
Net Worth = Cash + 401(k) Value + Total Investment Value
```

## How Each Component Grows

### 1. **401(k) Growth** (Lines 249-253 in Gap.calc.js)

The 401(k) value increases each year through:

```javascript
retirement401k.value = 
    retirement401k.value * (1 + retirement401k.growthRate / 100) +  // Market growth
    totalIndividual401k +                                            // Your contributions
    annualCompany401k                                                // Company match
```

**Components:**
- **Market Growth**: Your existing 401(k) balance grows by the growth rate (e.g., 7% per year)
- **Individual Contributions**: Your pre-tax contributions from income (set in Income page)
  - These grow each year by the "Annual Limit Growth" rate (e.g., 3%)
  - Example: $23,000 in Year 1 → $23,690 in Year 2 (if 3% growth)
- **Company Match**: Employer contributions (calculated from Income page's "401k Match" field)
  - These grow with your income growth rate

### 2. **Investment Growth** (Lines 245-247)

Regular investments (stocks, bonds, etc.) grow through:

```javascript
inv.marketValue = inv.costBasis * Math.pow(1 + inv.growthRate / 100, year)
```

**Components:**
- **Cost Basis**: Total amount you've invested (contributions accumulate each year)
- **Market Growth**: Compounds annually at the growth rate (e.g., 7%)
- **New Contributions**: Each year, your "gap" (disposable income) is allocated to investments

### 3. **Cash Growth** (Lines 184-242)

Cash changes based on your "gap" (disposable income):

```
Gap = Income - 401(k) Contributions - Taxes - Expenses
```

**Allocation Logic:**
- If Gap > 0 (surplus):
  1. Fill cash to target (inflation-adjusted)
  2. Invest remaining per portfolio allocation %
  3. Excess goes to investments or cash
- If Gap < 0 (deficit):
  - Draw from cash (no new investments)

## Example Year-by-Year Calculation

**Starting Values:**
- Cash: $10,000
- 401(k): $100,000 (7% growth rate)
- Investments: $50,000 (7% growth rate)

**Year 1:**
- Income: $150,000
- 401(k) Contribution: $23,000
- Taxes: $35,000
- Expenses: $60,000
- Gap: $150,000 - $23,000 - $35,000 - $60,000 = $32,000

**Allocation:**
1. Cash target: $10,000 (already met)
2. Invest $32,000 → New cost basis: $82,000
3. 401(k) growth: $100,000 × 1.07 + $23,000 + $5,000 (company) = $135,000
4. Investment value: $82,000 × 1.07 = $87,740
5. **Net Worth**: $10,000 + $135,000 + $87,740 = $232,740

**Year 2:**
- 401(k) Contribution: $23,690 (grew by 3% limit growth)
- Similar calculation with compounding growth...

## Key Drivers of Growth

1. **Compound Growth**: Both 401(k) and investments compound annually
2. **Consistent Contributions**: Your gap (disposable income) adds to investments each year
3. **401(k) Limit Growth**: Your contributions increase with IRS limits (3% annually)
4. **Income Growth**: As income grows, so do company 401(k) contributions
5. **Tax-Advantaged Growth**: 401(k) grows tax-deferred

## Why Net Worth Accelerates Over Time

The graph typically shows exponential growth because:
- **Compounding**: Growth on growth (7% of a larger number each year)
- **Increasing Contributions**: As income grows and limits increase, you contribute more
- **Accumulation**: Each year's contributions add to the base that compounds

This creates a "snowball effect" where later years show much larger absolute gains than early years, even with the same percentage growth rate.
