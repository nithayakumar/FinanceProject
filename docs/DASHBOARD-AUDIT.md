# Dashboard Metrics Audit

**Generated**: 2025-12-12
**Scope**: Net Worth Tab, FIRE/Forecast Tab, Simulate/What-If Tab
**Purpose**: Document every metric calculation, identify bugs, logic issues, and communication problems

---

## Executive Summary

### Key Findings

| Category | Count | Critical |
|----------|-------|----------|
| **Bugs** | 4 | 1 Critical, 2 High, 1 Medium |
| **Logic Concerns** | 5 | 2 Medium, 3 Low |
| **Communication Issues** | 4 | 1 High, 2 Medium, 1 Low |
| **Hidden/Deprecated Code** | ~3,500 lines | Scenarios feature + unused tabs |

### Critical Issues
1. **Missing `summary.lifetimeGrowthNominal/PV`** - Referenced but never calculated (will cause undefined values)
2. **Linear Tax Scaling in Simulate** - Progressive taxes treated as simple multiplier (inaccurate)
3. **Hardcoded 7% Growth** - Coast FIRE ignores user's investment growth settings

---

## 1. Net Worth Tab Audit

**File**: `/Users/nish/FinanceProject/src/features/dashboard/NetWorthTab.jsx`
**Lines**: 1,468
**Data Source**: `Gap.calc.js`

### 1.1 Summary Cards

#### Card 1: Current Net Worth
**Location**: `NetWorthTab.jsx:25`
```javascript
const currentNetWorth = isPV ? projections[0].netWorthPV : projections[0].netWorth
```
**Explanation**: Shows Year 1 ending net worth from gap projections, toggled by PV/Nominal switch.
**Assessment**: ✓ **Correct** - Direct read from projections array.

---

#### Card 2: Projected Net Worth at Retirement
**Location**: `NetWorthTab.jsx:48-50`
```javascript
const retirementYearIndex = Math.min(yearsToRetirement - 1, projections.length - 1)
const retirementProjection = projections[retirementYearIndex]
```
**Explanation**: Gets net worth at user's retirement age, capped by projection array length.
**Assessment**: ✓ **Correct** - Proper bounds checking with `Math.min`.

---

#### Card 3: Wealth Gain
**Location**: `NetWorthTab.jsx:27-28`
```javascript
const netWorthGrowth = retirementNetWorth - currentNetWorth
const netWorthGrowthPercent = currentNetWorth > 0 ? (netWorthGrowth / currentNetWorth * 100) : 0
```
**Explanation**: Simple difference between retirement and current net worth.
**Assessment**: ✓ **Correct** - Straightforward calculation with zero-division protection.

---

#### Card 4: Lifetime Income Distribution (Total Gain)
**Location**: `NetWorthTab.jsx:134-135`
```javascript
totalGain = summary.lifetimeGrowthNominal
totalGainPV = summary.lifetimeGrowthPV
```
**Explanation**: Attempts to display lifetime growth (market appreciation above contributions).
**Assessment**: ❌ **BUG** - These fields are **never calculated** in `Gap.calc.js calculateSummary()`. Will show `undefined`.

**Priority**: Critical
**Effort**: Low
**Fix**: Add to `Gap.calc.js` in `calculateSummary()`:
```javascript
const startingNetWorth = projections[0]?.netWorth || 0
const endingNetWorth = projections[projections.length - 1]?.netWorth || 0
const lifetimeGrowthNominal = endingNetWorth - startingNetWorth - lifetimeInvested
const lifetimeGrowthPV = (endingNetWorth / inflationFactor) - startingNetWorth - lifetimeInvestedPV
```

---

### 1.2 Chart: Net Worth Growth Stacked Bar

**Location**: `NetWorthTab.jsx:16-22`
```javascript
const chartData = projections.map(p => ({
    year: p.year,
    Cash: isPV ? p.cashPV : p.cash,
    Investments: isPV ? p.totalInvestmentValuePV : p.totalInvestmentValue,
    '401k': isPV ? p.retirement401kValuePV : p.retirement401kValue,
    'Home Equity': isPV ? p.homeEquityPV : p.homeEquity,
}))
```
**Explanation**: Stacked bar chart showing asset composition over time (Cash, Investments, 401k, Home Equity).
**Assessment**: ✓ **Correct** - Properly maps both PV and Nominal values per toggle.

---

### 1.3 Table: Net Worth Breakdown

**Simple View Columns** (12 columns):
- Net Worth Begin, Effective Tax Rate, Total Gross Income, Net Operating Income
- Operating Expenses, Operating Cash Flow, Burn Rate, Capital Transfers
- Free Cash Flow (Gap), Deep Savings Rate, Net Worth End

**Detailed View Columns** (~25 columns):
- Starting Balances (Cash, Invested Assets)
- Income by Stream
- Taxes & Deductions (Pre-Tax 401k, Taxable Income, Federal, State, FICA)
- Expenses by Category
- Capital Transfers (Mortgage Principal, Down Payment)
- Free Cash Flow
- Capital Allocation (To Cash, To Investments)
- Interest & Appreciation (Investment Growth, Home Appreciation)
- Ending Balances

#### Year 1 Beginning Balance Logic
**Location**: `NetWorthTab.jsx:680-709`
```javascript
if (index === 0) {
    cashBegin = cash - toCash
    investmentsBegin = investments - toInvestments
    ret401kBegin = ret401k - ret401kContribution
} else {
    const prev = projections[index - 1]
    cashBegin = isPV ? prev.cashPV : prev.cash
    // ...
}
```
**Explanation**: Year 1 beginning balances are **derived backwards** from Year 1 ending minus contributions. Year 2+ uses previous year end.
**Assessment**: ⚠️ **Logic Concern** - Derived backwards calculation may confuse users expecting to see their actual input starting balances.

**Priority**: Low
**Effort**: Medium
**Fix**: Consider showing "Starting Balance" from actual `investmentsData` inputs for Year 1, not derived.

---

## 2. FIRE/Forecast Tab Audit

**File**: `/Users/nish/FinanceProject/src/features/dashboard/ForecastTab.jsx`
**Data Source**: `Gap.calc.js`

### 2.1 Summary Cards

#### Card 1: Monthly Budget (Input)
**Location**: `ForecastTab.jsx:52-62`
```javascript
const defaultMonthlySpend = useMemo(() => {
  const retirementYearIndex = Math.min(yearsToRetirement - 1, projections.length - 1)
  if (retirementYearIndex >= 0 && projections[retirementYearIndex]) {
    const expensesPV = projections[retirementYearIndex].annualExpensesPV || (...)
    return Math.round(Math.abs(expensesPV) / 12)
  }
  return 5000
}, [projections, retirementAge, currentAge, profile])
```
**Explanation**: Defaults to projected retirement year expenses (PV) divided by 12, with $5,000 fallback.
**Assessment**: ✓ **Correct** - Sensible default with proper fallback.

---

#### Card 2: FIRE Target
**Location**: `ForecastTab.jsx:83-84`
```javascript
const annualRetirementSpend = monthlyRetirementSpend ? parseFloat(monthlyRetirementSpend) * 12 : year1Expenses
const fireNumber = annualRetirementSpend * 25
```
**Explanation**: Standard 4% rule: FIRE target = 25x annual retirement spending.
**Assessment**: ✓ **Correct** - Industry-standard formula.

---

#### Card 3: FIRE Age (Liquid Assets)
**Location**: `ForecastTab.jsx:86-96`
```javascript
let yearsToFire = null
for (let i = 0; i < projections.length; i++) {
  const inflatedFireNumber = fireNumber * Math.pow(1 + inflationRate, i)
  const liquidAssets = projections[i].investableAssets || projections[i].netWorth
  if (liquidAssets >= inflatedFireNumber) {
    yearsToFire = i + 1
    break
  }
}
```
**Explanation**: Finds first year where liquid assets >= inflation-adjusted FIRE target.
**Assessment**: ⚠️ **Logic Concern** - Falls back to `netWorth` (includes home equity) if `investableAssets` is undefined. This inconsistency could give different results.

**Priority**: Medium
**Effort**: Low
**Fix**: Ensure `investableAssets` is always calculated in `Gap.calc.js`, or be explicit about fallback behavior in UI.

---

#### Card 4: Liquidated FIRE Age
**Location**: `ForecastTab.jsx:98-106`
```javascript
let liquidatedYearsToFire = null
for (let i = 0; i < projections.length; i++) {
  const inflatedFireNumber = fireNumber * Math.pow(1 + inflationRate, i)
  if (projections[i].netWorth >= inflatedFireNumber) {
    liquidatedYearsToFire = i + 1
    break
  }
}
```
**Explanation**: Finds first year where **total** net worth (including home) >= FIRE target. Represents "sell everything" scenario.
**Assessment**: ✓ **Correct** - Intentionally uses full netWorth.

---

#### Card 5: Coast FIRE Age
**Location**: `ForecastTab.jsx:108-122`
```javascript
let coastFireAge = null
const growthRate = 0.07 // 7% assumption for Coast
for (let i = 0; i < Math.min(projections.length, yearsToRetirement); i++) {
  const currentInvestable = projections[i].investableAssets || projections[i].netWorth
  const yearsRemaining = yearsToRetirement - i
  const futureValue = currentInvestable * Math.pow(1 + growthRate, yearsRemaining)
  const targetFireNumber = fireNumber * Math.pow(1 + inflationRate, yearsToRetirement)
  if (futureValue >= targetFireNumber) {
    coastFireAge = currentAge + i
    break
  }
}
```
**Explanation**: Age when current assets, growing at 7% with NO new contributions, will reach FIRE target by retirement.
**Assessment**: ⚠️ **Logic Concern** - **Hardcoded 7% growth rate** ignores user's actual investment growth rate settings.

**Priority**: Medium
**Effort**: Low
**Fix**: Use weighted average of user's investment growth rates:
```javascript
const growthRate = investmentsData.investments.reduce((sum, inv) =>
  sum + (inv.growthRate * inv.portfolioPercent / 100), 0) / 100
```
Or add tooltip: "Assumes 7% annual growth"

---

### 2.2 Chart: Annual Net Worth Change Breakdown

**Location**: `ForecastTab.jsx:201-273` (chartData useMemo)

Stacked bar showing:
- Investment Growth (market returns)
- 401k Growth
- Home Appreciation
- Investment Contribution (new money)
- 401k Contribution
- Home Principal (mortgage paydown)
- Cash Added/Drawn
- Taxes (negative)
- Expenses (negative)

**Assessment**: ✓ **Correct** - Comprehensive breakdown of net worth drivers.

---

### 2.3 Table: Year-by-Year Projection

**Columns** (13):
| Column | Calculation |
|--------|-------------|
| Year | `p.year` |
| Income | `p.grossIncome` or `p.grossIncomePV` |
| 401k Contrib | `p.totalIndividual401k` |
| Taxes | `p.annualTaxes` |
| Tax % | `(annualTaxes / grossIncome) * 100` |
| Expenses | `p.annualExpenses` |
| Exp % | `(annualExpenses / grossIncome) * 100` |
| Gap | `p.gap` |
| Cash | `p.cash` |
| Investments | `p.totalInvestmentValue` |
| 401k | `p.retirement401kValue` |
| Home Eq | `p.homeEquity` |
| Net Worth | `p.netWorth` |

**Assessment**: ✓ **Correct** - Direct reads from projections with proper PV toggling.

---

## 3. Simulate/What-If Tab Audit

**File**: `/Users/nish/FinanceProject/src/features/dashboard/WhatIfTab.jsx`

### 3.1 Impact Summary Cards (4)

#### Card: Years to FIRE
**Location**: `WhatIfTab.jsx:182-184`
```javascript
if (!simYearsToFire && simLiquid >= fireTarget) {
  simYearsToFire = year
}
```
**Assessment**: ⚠️ **Logic Concern** - Uses `simLiquid` which is an **approximation** (see below).

---

#### Card: Net Worth at Retirement
**Location**: `WhatIfTab.jsx:230`
```javascript
simNetWorthRetire: simNetWorth, // This is at END of loop (max year), might not be retirement year.
```
**Assessment**: ⚠️ **Logic Concern** - Comment in code acknowledges this may not be the actual retirement year value.

---

#### Cards: Extra Expenses / Extra Income
**Location**: `WhatIfTab.jsx:141-142`
```javascript
totalExtraInc += eventInc
totalExtraExp += eventExp
```
**Assessment**: ✓ **Correct** - Simple accumulation of life event impacts.

---

### 3.2 Simulated Metrics Cards (8)

#### Card: Net Worth (Y1)
**Location**: `WhatIfTab.jsx:160-162`
```javascript
if (i === 0) {
  simNetWorth = startingNetWorth * (1 + growthRate) + gap
} else {
  simNetWorth = simNetWorth * (1 + growthRate) + gap
}
```
**Explanation**: Applies growth to starting balance, then adds gap.
**Assessment**: ⚠️ **Logic Concern** - Growth is applied **before** gap is added. Order affects compounding.

**Priority**: Medium
**Effort**: Low
**Fix**: Either change formula to `(startingNetWorth + gap) * (1 + growthRate)` or document the assumption.

---

#### Card: Savings Rate
**Location**: `WhatIfTab.jsx:170`
```javascript
y1SavingsRate = grossInc > 0 ? (gap / grossInc) * 100 : 0
```
**Assessment**: ✓ **Correct** - Standard savings rate formula.

---

#### Card: FIRE Target
Uses same `baseFireNumber = annualSpend * 25` formula.
**Assessment**: ✓ **Correct**

---

### 3.3 Critical Simulation Issues

#### Issue 1: Liquid Assets Approximation
**Location**: `WhatIfTab.jsx:179-180`
```javascript
const ratio = p.netWorth > 0 ? (p.investableAssets / p.netWorth) : 0.7
const simLiquid = simNetWorth * ratio // Approximation
```
**Explanation**: Instead of tracking actual simulated liquid assets, uses ratio from original projection as a proxy.
**Assessment**: ❌ **BUG** - This approximation becomes increasingly inaccurate as life events change asset composition.

**Priority**: High
**Effort**: Medium
**Fix**: Track `simCash`, `sim401k`, `simInvestments` separately in the simulation loop:
```javascript
let simCash = startingCash
let sim401k = starting401k
let simInvestments = startingInvestments
// Then allocate gap to each component
```

---

#### Issue 2: Linear Tax Scaling
**Location**: `WhatIfTab.jsx:117`
```javascript
let taxes = p.annualTaxes
// Note: taxes are NOT recalculated when income changes!
```
**Explanation**: When life events add/remove income, taxes should be recalculated using progressive brackets. Currently uses original tax amount.
**Assessment**: ❌ **BUG** - Tax burden is significantly underestimated for income increases (progressive taxes are higher than linear extrapolation).

**Priority**: High
**Effort**: High
**Fix**: Call `calculateTaxesCSV()` with adjusted income:
```javascript
const adjustedTaxes = calculateTaxesCSV(
  grossInc - _401k, // taxable income
  'salary',
  filingStatus,
  state,
  taxYear,
  inflationRate
).totalTax
```

---

#### Issue 3: Uncapped 401k Contributions
**Location**: `WhatIfTab.jsx:118`
```javascript
let _401k = (p.totalIndividual401k + p.annualCompany401k)
```
**Explanation**: 401k contributions from original projections are used directly. If income increases significantly, user might want to increase 401k, but IRS limits apply.
**Assessment**: ❌ **BUG** - When simulating income changes, 401k contributions should be capped at IRS limit.

**Priority**: Medium
**Effort**: Low
**Fix**:
```javascript
const IRS_401K_LIMIT = 23500 // 2025 limit
const inflatedLimit = IRS_401K_LIMIT * Math.pow(1 + inflationRate, year - 1)
let _401k = Math.min(p.totalIndividual401k + p.annualCompany401k, inflatedLimit)
```

---

### 3.4 Life Events

**Location**: `WhatIfTab.jsx:26-35`
```javascript
const lifeEventTemplates = {
  child: { name: 'Have a Child', expenseImpact: 15000, incomeImpact: 0, duration: 18 },
  partner: { name: 'Add Partner', expenseImpact: 10000, incomeImpact: 50000, duration: 0 },
  losePartner: { name: 'Lose Partner Income', expenseImpact: -5000, incomeImpact: -50000, duration: 0 },
  tuition: { name: 'College Tuition', expenseImpact: 40000, incomeImpact: 0, duration: 4 },
  wedding: { name: 'Wedding', expenseImpact: 30000, incomeImpact: 0, duration: 1 },
  relocation: { name: 'Relocate (Higher COL)', expenseImpact: 12000, incomeImpact: 20000, duration: 0 },
  relocationLow: { name: 'Relocate (Lower COL)', expenseImpact: -15000, incomeImpact: -10000, duration: 0 },
  careerBreak: { name: 'Career Break', expenseImpact: 0, incomeImpact: -80000, duration: 1 },
}
```

**Inflation Adjustment** (`WhatIfTab.jsx:132-134`):
```javascript
const df = Math.pow(1 + inflationRate, year - 1)
eventInc = eventInc * df
eventExp = eventExp * df
```
**Assessment**: ✓ **Correct** - Life event impacts are properly inflated from today's dollars.

---

## 4. Communication/UX Issues

### Issue 1: "Liquid Assets" Not Defined
**Location**: Multiple cards use "liquid assets" without explanation.
**Assessment**: 💬 **Communication Issue**

**Priority**: Medium
**Effort**: Low
**Fix**: Add tooltip: "Liquid assets = Cash + Investments + 401k (excludes home equity)"

---

### Issue 2: Coast FIRE Hidden 7% Assumption
**Location**: `ForecastTab.jsx:111`
**Assessment**: 💬 **Communication Issue** - Users may not know this assumes 7% growth.

**Priority**: High
**Effort**: Low
**Fix**: Display "(assumes 7% growth)" next to Coast FIRE age.

---

### Issue 3: Inconsistent Terminology
**Location**: Various files use `investableAssets`, `liquidAssets`, `netWorth` interchangeably.
**Assessment**: 💬 **Communication Issue**

**Priority**: Low
**Effort**: Low
**Fix**: Standardize to "Liquid Assets" (excluding home) and "Total Net Worth" (including home).

---

### Issue 4: PV vs Nominal Toggle
**Location**: `NetWorthTab.jsx:186-195`
The toggle shows "Today's Dollars" vs "Future Dollars" but doesn't explain what this means.
**Assessment**: 💬 **Communication Issue**

**Priority**: Medium
**Effort**: Medium
**Fix**: Add info icon with tooltip:
- Today's Dollars: "Values adjusted for inflation - shows real purchasing power"
- Future Dollars: "Actual dollar amounts you'll see - includes inflation"

---

## 5. Hidden Features & Unused Code

### 5.1 DEPRECATED: Scenarios Feature (~3,186 lines)

**Location**: `/Users/nish/FinanceProject/src/features/scenarios/`

| File | Lines | Purpose |
|------|-------|---------|
| `ScenarioEditor.jsx` | 1,310 | Create/edit scenarios |
| `ScenarioManager.jsx` | 610 | CRUD operations |
| `ScenarioCompare.jsx` | 471 | Side-by-side comparison |
| `Scenarios.jsx` | 313 | Main page |
| `Scenario.calc.js` | 454 | Calculations |
| `hooks/useScenarioData.js` | 155 | Data hook (returns stubs) |

**Status**: Entire feature disabled. Hook returns stub data. Navigation items commented out.

**Recommendation**: **DELETE** - Remove entire `/features/scenarios/` directory and related imports to reduce codebase by ~3,200 lines.

---

### 5.2 Unused Dashboard Tabs

| Tab | File | Status |
|-----|------|--------|
| ExpensesTab | `ExpensesTab.jsx` | Built but not integrated |
| IncomeTab | `IncomeTab.jsx` | Built but not integrated |
| RetirementTab | `RetirementTab.jsx` | Built but not integrated |

**Recommendation**: Document only - keep for potential future use.

---

### 5.3 Cleanup Candidates

| Item | Location | Recommendation |
|------|----------|----------------|
| `NetWorthTab_backup.jsx` | `/features/dashboard/` | **DELETE** - only contains backup comment |
| Disabled console.log markers | `/features/scenarios/*.js` | DELETE with scenarios |
| Commented export code | `/shared/jsonExport.js` | DELETE with scenarios |

---

## 6. Issue Summary

### ❌ Bugs (Must Fix)

| # | Issue | Location | Priority | Effort |
|---|-------|----------|----------|--------|
| 1 | Missing `summary.lifetimeGrowthNominal/PV` | `NetWorthTab.jsx:134-135` | Critical | Low |
| 2 | Liquid Assets Approximation | `WhatIfTab.jsx:179-180` | High | Medium |
| 3 | Linear Tax Scaling | `WhatIfTab.jsx:117` | High | High |
| 4 | Uncapped 401k in Simulate | `WhatIfTab.jsx:118` | Medium | Low |

### ⚠️ Logic Concerns (Should Review)

| # | Issue | Location | Priority | Effort |
|---|-------|----------|----------|--------|
| 1 | Hardcoded 7% for Coast FIRE | `ForecastTab.jsx:111` | Medium | Low |
| 2 | `investableAssets` fallback to `netWorth` | `ForecastTab.jsx:91` | Medium | Low |
| 3 | Year 1 Beginning Balance derived backwards | `NetWorthTab.jsx:680-709` | Low | Medium |
| 4 | Growth applied before Gap in Simulate | `WhatIfTab.jsx:160` | Medium | Low |
| 5 | `simNetWorthRetire` may not be retirement year | `WhatIfTab.jsx:230` | Low | Low |

### 💬 Communication Issues (UX)

| # | Issue | Priority | Effort |
|---|-------|----------|--------|
| 1 | Coast FIRE hidden 7% assumption | High | Low |
| 2 | "Liquid Assets" not defined | Medium | Low |
| 3 | PV vs Nominal toggle unexplained | Medium | Medium |
| 4 | Inconsistent terminology | Low | Low |

---

## 7. Self-Review & Validation

### Validation Checks Performed

1. ✓ Traced each metric from UI display back to calculation source
2. ✓ Verified formula accuracy against financial standards (4% rule, FIRE calculations)
3. ✓ Checked for edge cases (zero division, undefined values, array bounds)
4. ✓ Identified all hardcoded assumptions
5. ✓ Documented PV vs Nominal handling for each metric

### Confidence Assessment

| Finding | Confidence | Notes |
|---------|------------|-------|
| Missing `lifetimeGrowthNominal/PV` | **High** | Verified fields not in `calculateSummary()` |
| Liquid Assets Approximation | **High** | Code explicitly uses `ratio` proxy |
| Linear Tax Scaling | **High** | No tax recalculation in simulation |
| Hardcoded 7% Growth | **High** | Line 111: `const growthRate = 0.07` |
| Scenarios deprecated | **High** | Hook returns stub data |

### Areas Requiring Further Investigation

1. **Investment growth mid-year assumption** - Half-year growth for new contributions in `Gap.calc.js` - need to verify if this matches user expectations
2. **Property expense modes** - Complex interaction between Simple vs Detailed expense modes needs separate audit
3. **Home.jsx FIRE calculation** - Different inflation handling than ForecastTab - needs standardization

---

## 8. Recommendations

### Immediate Actions (Critical/High Priority)

1. **Add missing `lifetimeGrowthNominal/PV` to `calculateSummary()`** - Prevents undefined display
2. **Add tooltip to Coast FIRE** - "Assumes 7% annual growth"
3. **Fix liquid assets approximation in WhatIfTab** - Track components separately

### Short-term Improvements (Medium Priority)

4. **Recalculate taxes in simulation** - Use `calculateTaxesCSV()` with adjusted income
5. **Cap 401k contributions at IRS limit** - In simulation when income changes
6. **Add info tooltips** - For PV/Nominal toggle and "Liquid Assets"

### Cleanup (Technical Debt)

7. **Delete Scenarios feature** - Remove ~3,200 lines of deprecated code
8. **Delete NetWorthTab_backup.jsx** - Unnecessary backup file
9. **Standardize terminology** - Use "Liquid Assets" and "Total Net Worth" consistently

---

*End of Audit*
