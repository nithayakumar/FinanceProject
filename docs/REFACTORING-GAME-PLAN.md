# Investment Calculation Refactoring - Game Plan

## Executive Summary

**Goal:** Unify investment calculations across the application so all views show consistent values with proper contribution tracking and tax treatment.

**Current Problems:**
1. ❌ Investments page shows static growth (no contributions)
2. ❌ Dashboard shows dynamic growth (with contributions)
3. ❌ Equity is auto-invested pre-tax (incorrect - should be taxed as income)
4. ❌ Two separate calculation engines create maintenance burden
5. ❌ Rounding errors from rounding at multiple stages

**Desired End State:**
1. ✅ Single calculation engine (Gap.calc.js as source of truth)
2. ✅ All visualizations use same projections
3. ✅ Equity taxed as regular income, then allocated through gap
4. ✅ Investment page shows realistic projections with contributions
5. ✅ Consistent rounding (only at display time)
6. ✅ New "WIP Dash" section for future additions

---

## Phase 1: Fix Equity Tax Treatment

### Current Behavior (INCORRECT)
```javascript
// Gap.calc.js lines 166-178
if (annualEquity > 0) {
  // Equity goes directly to investments BEFORE taxes
  investments.forEach(inv => {
    inv.costBasis += equityToInvest
  })
}
```

**Problem:** Equity is being invested pre-tax, which is incorrect. Equity compensation should be:
1. Included in taxable income (it already is in line 121)
2. Taxed as ordinary income
3. Allocated through the gap like any other after-tax income

### Fixed Behavior (CORRECT)
```javascript
// Gap.calc.js
// Line 98: annualIncome already includes equity
const annualIncome = (incomeProjection.totalCompNominal || 0) * 12

// Line 121: Equity is already in taxable income
const taxableIncome = annualIncome - totalIndividual401k
// This means equity IS being taxed

// Line 159: Gap includes after-tax equity
const gap = annualIncome - totalIndividual401k - annualTaxes - annualExpenses
// The gap allocation (lines 180-216) handles equity naturally

// REMOVE lines 166-178 (auto-investment of equity)
// Equity flows through gap like salary
```

**Impact:**
- Equity will now be properly taxed
- Gap will be smaller (equity is taxed)
- Investment contributions will be lower (but correct)
- Net worth at retirement will be lower (but accurate)

**Changes Required:**
1. Delete lines 166-178 in Gap.calc.js (equity auto-investment)
2. Update comments to clarify equity is in gap
3. Update summary to remove `lifetimeEquity` tracking (redundant - it's in gap)

**Testing:**
- Run with $1k annual equity
- Verify equity shows in taxable income
- Verify taxes increase appropriately
- Verify equity flows through gap to investments

---

## Phase 2: Unify Investment Calculations

### Current State
**Two Separate Calculations:**

1. **InvestmentsDebt.calc.js** (Static)
   - File: `src/features/investments-debt/InvestmentsDebt.calc.js`
   - Function: `calculateInvestmentProjections()`
   - Used by: `/investments` page output view
   - Shows: Static growth only
   - Formula: `currentValue × growth^year`

2. **Gap.calc.js** (Dynamic)
   - File: `src/features/gap/Gap.calc.js`
   - Function: `calculateGapProjections()`
   - Used by: Dashboard Net Worth tab
   - Shows: Growth + contributions
   - Formula: `(costBasis + contributions) × growth`

### Target State
**Single Calculation Engine:**

**Gap.calc.js** becomes the single source of truth for ALL projections:
- Dashboard uses it (already does)
- Investments page uses it (NEW)
- Any future visualizations use it

### Changes Required

**Step 1: Make Investments Page Use Gap Projections**

File: `src/features/investments-debt/InvestmentsDebt.jsx`

**Current:**
```javascript
// Lines 175-185
const handleCalculate = () => {
  const profile = storage.load('profile')
  const yearsToRetirement = profile.retirementAge - profile.age
  const projections = calculateInvestmentProjections(data, yearsToRetirement, profile)
  setProjections(projections)
  setView('output')
}
```

**New:**
```javascript
// Import gap calculations
import { calculateGapProjections } from '../gap/Gap.calc'
import { calculateIncomeProjections } from '../income/Income.calc'
import { calculateExpenseProjections } from '../expenses/Expenses.calc'

const handleCalculate = () => {
  const profile = storage.load('profile')
  const incomeData = storage.load('income')
  const expensesData = storage.load('expenses')

  // Calculate full pipeline to get gap projections
  const enrichedProfile = {
    ...profile,
    yearsToRetirement: profile.retirementAge - profile.age
  }

  const incomeProjections = calculateIncomeProjections(incomeData, enrichedProfile)
  const expenseProjections = calculateExpenseProjections(
    expensesData,
    enrichedProfile,
    incomeProjections.projections
  )

  const incomeWithProjections = {
    ...incomeData,
    projections: incomeProjections.projections
  }
  const expensesWithProjections = {
    ...expensesData,
    projections: expenseProjections.projections
  }

  const gapProjections = calculateGapProjections(
    incomeWithProjections,
    expensesWithProjections,
    data, // investmentsData
    enrichedProfile
  )

  setProjections(gapProjections)
  setView('output')
}
```

**Step 2: Update Output View to Use Gap Data**

File: `src/features/investments-debt/InvestmentsDebt.jsx` (output section)

**Current:** Uses `projections.chartData` from InvestmentsDebt.calc.js

**New:** Use `projections.projections` from Gap.calc.js

```javascript
// Transform gap projections to chart data
const chartData = projections.projections.map(p => ({
  year: p.year,
  cash: p.cash,
  retirement401k: p.retirement401kValue,
  total: p.netWorth,
  // Individual investments
  ...p.investments.reduce((acc, inv, idx) => {
    acc[`investment${idx + 1}`] = inv.marketValue
    return acc
  }, {})
}))

// Summary metrics from gap summary
const summary = {
  currentTotalSavings: projections.summary.currentNetWorth,
  year10Total: projections.summary.year10NetWorth,
  retirementTotal: projections.summary.retirementNetWorth,
  totalGrowthPercent: projections.summary.netWorthGrowthPercent
}
```

**Step 3: Add Contribution Tracking to Output View**

Add new table showing annual contributions:

```javascript
<table>
  <thead>
    <tr>
      <th>Year</th>
      <th>Equity → Investments</th>
      <th>Gap → Investments</th>
      <th>Individual 401k</th>
      <th>Company 401k</th>
      <th>Total Contributions</th>
    </tr>
  </thead>
  <tbody>
    {projections.projections.map(p => (
      <tr key={p.year}>
        <td>{p.year}</td>
        <td>${p.annualEquity.toLocaleString()}</td>
        <td>${p.investedThisYear.toLocaleString()}</td>
        <td>${p.totalIndividual401k.toLocaleString()}</td>
        <td>${p.annualCompany401k.toLocaleString()}</td>
        <td>${(p.annualEquity + p.investedThisYear + p.totalIndividual401k + p.annualCompany401k).toLocaleString()}</td>
      </tr>
    ))}
  </tbody>
</table>
```

**Step 4: Delete Old Calculation File**

File: `src/features/investments-debt/InvestmentsDebt.calc.js`

**Action:** Delete entire file (no longer needed)

**Verify:** No other files import from it

---

## Phase 3: Standardize Rounding

### Current State
Rounding happens at multiple stages:
1. During calculation (round5 in calc files)
2. During aggregation (summary calculations)
3. During display (Math.round, toLocaleString)

This causes:
- Accumulated rounding errors
- Inconsistent precision across views
- Difficult to debug discrepancies

### Target State
**Round only at display time:**
1. Store full precision in projections (no rounding)
2. Store full precision in summary (no rounding)
3. Round ONLY when displaying to user

### Changes Required

**Step 1: Remove Rounding from Calculations**

Files to update:
- `src/features/income/Income.calc.js`
- `src/features/expenses/Expenses.calc.js`
- `src/features/gap/Gap.calc.js`

**Change:**
```javascript
// BEFORE:
projection.year = round5(year)
projection.netWorth = round5(netWorth)

// AFTER:
projection.year = year
projection.netWorth = netWorth
// Let JavaScript handle full precision
```

**Keep round5() ONLY for:**
- Final summary metrics displayed to user
- CSV export values
- Comparison operations where precision matters

**Step 2: Add Display Helpers**

File: `src/utils/formatting.js` (new file)

```javascript
/**
 * Format currency for display
 * @param {number} value - Raw value with full precision
 * @param {number} decimals - Decimal places (default 0)
 */
export function formatCurrency(value, decimals = 0) {
  if (value === null || value === undefined) return '$0'
  return '$' + value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Format percentage for display
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined) return '0%'
  return value.toFixed(decimals) + '%'
}

/**
 * Format large numbers (millions)
 */
export function formatMillions(value, decimals = 2) {
  if (value === null || value === undefined) return '$0M'
  return '$' + (value / 1000000).toFixed(decimals) + 'M'
}

/**
 * Round only when needed for display
 * Maintains 5 decimal precision internally
 */
export function round5(value) {
  return Math.round(value * 100000) / 100000
}
```

**Step 3: Update All Display Components**

Replace manual formatting with helpers:

```javascript
// BEFORE:
<td>${Math.round(value).toLocaleString()}</td>

// AFTER:
import { formatCurrency } from '../../utils/formatting'
<td>{formatCurrency(value)}</td>
```

**Files to update:**
- All dashboard tabs (NetWorthTab.jsx, IncomeTab.jsx, etc.)
- All output views (InvestmentsDebt.jsx, etc.)
- All summary cards

---

## Phase 4: Create WIP Dashboard Section

### Purpose
- Experimental dashboard section for new features
- Can add visualizations incrementally
- Won't affect main dashboard tabs

### Implementation

**Step 1: Create WIP Dashboard Tab Component**

File: `src/features/dashboard/WIPTab.jsx` (new)

```javascript
function WIPTab({ data }) {
  return (
    <div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-yellow-900 mb-2">
          🚧 Work In Progress Dashboard
        </h2>
        <p className="text-sm text-yellow-800">
          This section contains experimental features and visualizations.
          Content will be added incrementally.
        </p>
      </div>

      {/* Empty for now - components will be added as requested */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <p className="text-gray-500 text-center">
          No components added yet. Check back soon!
        </p>
      </div>
    </div>
  )
}

export default WIPTab
```

**Step 2: Add to Dashboard**

File: `src/features/dashboard/Dashboard.jsx`

```javascript
// Import
import WIPTab from './WIPTab'

// Update tab state (line 12)
const [activeTab, setActiveTab] = useState('networth')
// Valid values: 'networth', 'income', 'expenses', 'retirement', 'wip'

// Add tab button (around line 300)
<button
  onClick={() => setActiveTab('wip')}
  className={`px-4 py-2 font-medium rounded-t-lg ${
    activeTab === 'wip'
      ? 'bg-white text-blue-600 border-t border-l border-r border-gray-300'
      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
  }`}
>
  🚧 WIP
</button>

// Add tab content (around line 330)
{activeTab === 'wip' && <WIPTab data={data} />}
```

---

## Phase 5: Testing & Validation

### Test Cases

**1. Equity Tax Treatment**
- [ ] Input: $150k salary + $10k equity
- [ ] Verify: Taxable income = $160k (not $150k)
- [ ] Verify: Taxes calculated on full $160k
- [ ] Verify: Gap is reduced by equity taxes
- [ ] Verify: Investment contributions include after-tax equity

**2. Investment Values Match**
- [ ] Compare Investment page output vs Dashboard Net Worth
- [ ] Values should now be IDENTICAL
- [ ] Both should show contributions breakdown
- [ ] Both should show same growth trajectory

**3. 401k Contributions**
- [ ] Individual 401k deducted from taxable income
- [ ] Company 401k added to 401k balance
- [ ] Both grow with income growth rate
- [ ] Lifetime contributions sum correctly

**4. Rounding Consistency**
- [ ] Net worth components sum to exact total (no rounding errors)
- [ ] Lifetime sums = sum of annual values
- [ ] PV calculations precise
- [ ] Display formatting consistent across all views

**5. WIP Dashboard**
- [ ] Tab appears in dashboard
- [ ] Empty state shows correctly
- [ ] Doesn't break existing tabs
- [ ] Can add components incrementally

### Rollback Plan

If issues arise:
1. Git revert to commit before changes
2. Each phase is independent - can rollback individual phases
3. Keep old InvestmentsDebt.calc.js in a backup branch

---

## Implementation Order

### Phase 1: Equity Fix (30 minutes)
- ✅ Low risk, high impact
- ✅ Remove 13 lines of code
- ✅ Update tests
- ⚠️ Will change investment values (they'll be lower, but correct)

### Phase 2: Unify Calculations (2 hours)
- ⚠️ Medium risk, high impact
- ✅ Makes everything consistent
- ⚠️ Requires updating Investments page
- ⚠️ Users may notice values changed

### Phase 3: Rounding (1 hour)
- ✅ Low risk, medium impact
- ✅ Improves precision
- ✅ Mostly mechanical changes
- ✅ Easy to verify

### Phase 4: WIP Dashboard (15 minutes)
- ✅ Zero risk (new feature)
- ✅ Empty component
- ✅ Can add features later

### Phase 5: Testing (1 hour)
- Run through all test cases
- Compare values before/after
- Document any differences
- Update user documentation

**Total Time: ~4.5 hours**

---

## Breaking Changes & Migration

### What Users Will See Different

**1. Investment Values Will Decrease**
- **Why:** Equity is now taxed (was pre-tax before)
- **Impact:** 20-30% lower investment balances
- **Correct:** New values are accurate

**2. Lifetime Equity Will Disappear**
- **Why:** Equity is now part of gap (not tracked separately)
- **Impact:** Can't see equity contribution breakdown
- **Workaround:** Add to WIP dashboard if needed

**3. Investments Page Values Match Dashboard**
- **Why:** Now using same calculation
- **Impact:** No more confusion about different values
- **Benefit:** Single source of truth

### Migration Steps

**For Existing Users:**
1. Values will change after update
2. Export current data before update (backup)
3. Re-run all calculations
4. Review new values (they'll be more accurate)

**Communication:**
```
Update Notice: Investment Calculation Improvements

We've unified our investment calculations to provide more accurate
projections. You may notice some changes:

✅ Equity compensation is now properly taxed (previously wasn't)
✅ Investment values now match across all views
✅ More accurate retirement projections

Your values may be 20-30% lower than before, but they're now
accurate. This reflects the true tax impact of equity compensation.

Export your data before updating if you want to compare.
```

---

## Code Review Checklist

Before merging:
- [ ] All tests pass
- [ ] No console errors
- [ ] Values match between Investment page and Dashboard
- [ ] Equity is taxed properly
- [ ] Rounding is consistent
- [ ] WIP tab appears and works
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] Migration guide ready

---

## Future Enhancements (Post-Refactor)

Once this refactoring is complete, we can easily:
1. Add more visualizations to WIP dashboard
2. Add scenario comparisons (same calculation engine)
3. Add what-if analysis (adjust inputs, recalculate)
4. Add CSV export (single data source)
5. Add historical tracking (compare projections over time)

---

## Questions to Confirm

1. **Equity Tax Treatment:** Confirm equity should be taxed as ordinary income (not capital gains)
2. **Breaking Changes:** Confirm OK that investment values will decrease (more accurate)
3. **Lifetime Equity Tracking:** Confirm OK to remove from summary (redundant with gap)
4. **Migration:** Should we auto-migrate users or require manual recalculation?
5. **WIP Dashboard:** Any specific visualizations you want in WIP tab to start?

---

## Approval Required

Please review and approve:
- [ ] Phase 1: Equity tax treatment fix
- [ ] Phase 2: Unify investment calculations
- [ ] Phase 3: Standardize rounding
- [ ] Phase 4: Create WIP dashboard
- [ ] Implementation order
- [ ] Breaking changes acceptable
- [ ] Timeline (4.5 hours) acceptable

**Once approved, I'll proceed with implementation in order.**
