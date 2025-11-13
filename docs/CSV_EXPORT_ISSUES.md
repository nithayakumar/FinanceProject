# CSV Export Issues Analysis

**Date**: 2025-11-12
**Reported By**: User

---

## Issue 1: "Test" appearing in investment names ✅ DOCUMENTED (2025-11-13)

### Problem
Investment account name shows as "Test" in CSV export Primary_Category column.

### Root Cause
This is **user data**, not a code bug. The investment account is named "Test" in localStorage.

### Location
- Data is stored in `localStorage.getItem('investmentsDebt')`
- Investment names come from user input in Investments & Debt section
- CSV export reads from `investmentsData.investments[i].name` (InvestmentsTransformer.js:109)

### Fix
**User Action**:
1. Go to Investments & Debt section
2. Rename investment account from "Test" to actual account name (e.g., "Brokerage", "Robinhood", "Vanguard", etc.)
3. Save changes
4. Re-export CSV

**No code changes needed** - Export is working correctly, just displaying user's input data.

---

## Issue 2: Company 401k Contribution Always 0 ✅ FIXED (2025-11-13)

### Problem
Company 401k contribution showed as $0.00 in the CSV export even when user had configured values in the Income section.

### ✅ SOLUTION IMPLEMENTED

**Root Cause Found:**
CSVExporter was passing raw `incomeData` object to transformers, but this object didn't include the `projections` array. The projections were in a separate `incomeProjections` object.

**Fix Applied** (CSVExporter.js lines 24-25, 43-52, 70, 73):
```javascript
// Extract projections from appData
const { incomeProjections, expenseProjections, ... } = appData

// Merge raw data with projections (like Dashboard does for Gap)
const incomeWithProjections = {
  ...incomeData,
  projections: incomeProjections.projections
}

const expensesWithProjections = {
  ...expensesData,
  projections: expenseProjections.projections
}

// Pass merged objects to transformers
const incomeRows = transformIncomeData(incomeWithProjections, ...)
const investmentsRows = transformInvestmentsData(..., incomeWithProjections)
```

**Diagnostic Logging Added** (InvestmentsTransformer.js lines 258-269):
- Shows company401k data for Years 1-2 to verify values are flowing correctly
- Can be removed after confirming fix works

**Result:**
- Company 401k values now appear in CSV export
- Values grow correctly with income (as designed in Gap.calc.js line 66)
- Data flow: Income.calc.js → Dashboard → CSVExporter → InvestmentsTransformer ✓

---

## Issue 3: Net Worth Module Only Calculated Yearly (Not Monthly)

### Problem
Net Worth module only shows values in December (Month 12), not spread across all months like Income and Expenses.

### Root Cause
**This was intentional in the original design**, but user wants monthly values.

**Current Implementation:**
```javascript
// NetWorthTransformer.js:21
const month = 12  // <-- Hardcoded to December only
```

**Reasoning for yearly-only:**
- Net Worth is a point-in-time balance (stock), not a flow
- Balances only update at year-end when investments grow
- Gap calculation happens annually in Gap.calc.js

### Impact
- Users can't see intra-year Net Worth changes
- Can't track monthly progress
- Gap allocation appears to happen all at once in December

### Fix Options

**Option A: Repeat December values monthly**
- Show same Net Worth balance for all 12 months of each year
- Pro: Fills in monthly data
- Con: Redundant data, no actual monthly changes

**Option B: Calculate monthly Net Worth**
- Would require recalculating Gap.calc.js at monthly level
- Much more complex, affects entire calculation architecture
- See TO_DO.md: "Move all growth calculations from annual to monthly"

**Option C: Show monthly flows, yearly balances**
- Keep Income/Expenses/Taxes monthly (flows)
- Keep Net Worth yearly (balances only in December)
- Add explanation in Notes column

### Recommendation
**Option C** for now (current state), with Option B as future enhancement.

---

## Issue 4: Tax Values Different Between Sections ✅ FIXED (2025-11-12)

### Problem
Tax amounts shown in:
1. Taxes UI section
2. CSV Export
3. Net Worth display

...are all different values.

### ✅ SOLUTION IMPLEMENTED

**What was fixed:**
1. **Gap.calc.js** (lines 93-99, 177-182, 202-207)
   - Now stores detailed tax breakdown in projections: `taxBreakdown` and `taxBreakdownPV`
   - Breakdown includes: federal, state, socialSecurity, medicare
   - Both nominal and present value versions stored

2. **TaxesTransformer.js** (lines 1-30)
   - Removed `import { calculateTaxes }` - no longer needed
   - Now uses pre-calculated `projection.taxBreakdown` values
   - No re-calculation - single source of truth

**Result:**
- All modules (Dashboard, CSV Export, Net Worth) now show **identical** tax values
- Single calculation path: Gap.calc.js → Taxes.calc.js
- Eliminated discrepancies

### Root Cause Analysis (RESOLVED)

**Three different calculation paths:**

**Path 1: Taxes UI Section**
```javascript
// Taxes.jsx or Taxes.calc.js
// Calculates tax on user-entered test income
// May use different income than actual projections
```

**Path 2: CSV Export (TaxesTransformer)**
```javascript
// TaxesTransformer.js:30-38
const taxableIncome = (annualIncome || 0) - (totalIndividual401k || 0)
const taxCalc = calculateTaxes(
  taxableIncome,
  'salary',
  filingType,
  'california',
  'usa',
  year,
  inflationRate
)
```
- Uses income from Gap projections
- Subtracts 401k contributions
- Calls calculateTaxes() for each year

**Path 3: Net Worth Display**
```javascript
// NetWorthTab.jsx or Gap.calc.js
// Uses pre-calculated tax from gapProjections.annualTaxes
```

### Why They're Different

**Potential Discrepancies:**

1. **Different income amounts**
   - Taxes UI: User test input
   - CSV/Net Worth: Actual projected income

2. **401k deduction handling**
   - May be applied differently in each path

3. **Inflation adjustment**
   - Tax brackets inflate over time
   - Year 1 vs Year 10 will have different bracket thresholds

4. **Rounding differences**
   - Taxes UI might show unrounded
   - CSV exports with 2 decimals
   - Net Worth shows rounded to dollars

5. **Re-calculation vs cached**
   - CSV re-calculates taxes (line 31-37 in TaxesTransformer)
   - Net Worth uses cached value from Gap.calc.js
   - These should match, but timing/data differences could cause issues

### Location to Check

**Gap.calc.js tax calculation (the "source of truth"):**
```javascript
// Gap.calc.js:82-88
const taxableIncome = annualIncome - totalIndividual401k
const taxCalc = calculateTaxes(taxableIncome, 'salary', filingType, 'california', 'usa', year, inflationRate)
const annualTaxes = taxCalc.totalTax
```

**TaxesTransformer re-calculation:**
```javascript
// TaxesTransformer.js:30-38
const taxableIncome = (annualIncome || 0) - (totalIndividual401k || 0)
const taxCalc = calculateTaxes(taxableIncome, 'salary', filingType, 'california', 'usa', year, inflationRate)
```

These should produce identical results if given same inputs.

### Fix

**Debugging steps:**
1. Add console.log to both locations showing:
   - `annualIncome`
   - `totalIndividual401k`
   - `taxableIncome`
   - `annualTaxes`
   - `year`
   - `inflationRate`

2. Compare values for Year 1 from both paths

3. Verify they match

**If they don't match:**
- Check if Gap.calc.js is using different data source
- Check if TaxesTransformer has correct gapProjections data
- Check if profile/filingType is passed correctly

**Potential fix:**
Instead of re-calculating taxes in TaxesTransformer, use the pre-calculated value from Gap projections:
```javascript
// Instead of this:
const taxCalc = calculateTaxes(...)

// Use this:
const annualTaxes = projection.annualTaxes
const monthlyTaxes = annualTaxes / 12

// Then lookup detailed breakdown if needed for subcategories
```

---

## Enhancement 1: Cost Basis & Capital Gains Tracking ✅ ADDED (2025-11-13)

### Enhancement
Added detailed cost basis and unrealized capital gains tracking for all investment accounts and 401k in CSV export.

### What Was Added

**New Subcategories for Each Account:**
1. `Beginning_Balance_Cost_Basis` (January) - Original cost of holdings at year start
2. `Ending_Balance_Cost_Basis` (December) - Cumulative cost after year's contributions
3. `Beginning_Unrealized_Gains` (January) - Market value - cost basis at year start
4. `Ending_Unrealized_Gains` (December) - Market value - cost basis at year end

**Implementation Details:**

**Investment Accounts** (InvestmentsTransformer.js lines 95-99, 121-153, 209-241):
- Cost basis tracked from Gap.calc.js projection data (already existed)
- Reads `inv.costBasis` and `inv.marketValue` from projections
- Capital gains = Market value - Cost basis

**401k Account** (InvestmentsTransformer.js lines 15-16, 273-280, 302-334, 410-442):
- Cost basis calculated as sum of all contributions over time
- Tracked across years in `costBasis401k` variable
- Accumulates: individual contributions + company contributions
- Capital gains = Market value - Cost basis

**Benefits:**
- Tax planning: See unrealized gains that would be taxable if sold
- Performance tracking: Separate contributions from investment returns
- Basis step-up planning: Understand cost basis for estate planning
- ROI calculation: Easy to calculate return on invested capital

**CSV Output:**
- 6 additional rows per year per investment account (3 beginning + 3 ending)
- 6 additional rows per year for 401k
- Total: ~138 new rows for 1 investment account over 23 years

---

## Enhancement 2: Cash Contribution Tracking ✅ ADDED (2025-11-13)

### Enhancement
Fixed misleading cash contribution display in CSV export by tracking actual cash allocated instead of showing gap/12.

### Problem
**Before**: CSV showed `gap / 12` as monthly cash contribution, but this was incorrect because gap gets split between:
1. Cash (to fill to target)
2. Investments (per portfolio %)
3. Excess back to cash (if allocation < 100%)

**Example Issue**:
```
Scenario: Gap = $24,000, Fill cash = $10,000, Invest = $14,000
Before: CSV showed $2,000/month ($24k gap / 12)
Reality: Only $833/month went to cash ($10k / 12)
Difference: $1,167/month was actually going to investments!
```

### Solution Implemented

**Gap.calc.js** (lines 118, 130, 146, 151, 190, 216):
- Added `cashContribution` tracking variable
- Tracks cash added to reach target (Step 1 of allocation)
- Tracks excess cash from allocation (Step 3 of allocation)
- Tracks withdrawals on negative gap
- Stores both nominal and PV values in projection

**InvestmentsTransformer.js** (lines 30, 50, 65):
- Gets `cashContribution` from projection (not gap)
- Divides by 12 for monthly value
- Updated notes to clarify "Actual cash contributed (target fill + excess)"

### How It Works

**Positive Gap - Below Target:**
```javascript
// Gap = $40k, Target = $50k, Current = $30k, Allocation = 100%
cashContribution = $20k  // Fills to target
investedThisYear = $20k  // Remainder invests
```

**Positive Gap - Above Target, < 100% Allocation:**
```javascript
// Gap = $30k, Target = $50k, Current = $60k, Allocation = 70%
cashContribution = $9k   // 30% excess returns to cash
investedThisYear = $21k  // 70% invests
```

**Negative Gap (Withdrawal):**
```javascript
// Gap = -$10k
cashContribution = -$10k  // Withdrawn from cash
investedThisYear = $0     // No investing
```

### Benefits
- **Accurate cash flow tracking**: Shows actual monthly cash additions/withdrawals
- **Better budgeting**: Can see real cash accumulation vs investment growth
- **Negative gap visibility**: Shows when drawing from savings (negative values)
- **Debugging**: Easier to verify gap allocation logic

### CSV Impact
- Cash Contribution rows now show correct values
- Can be positive (adding to cash) or negative (withdrawing)
- Notes clearly explain source: "target fill + excess"

---

## Enhancement 3: Monthly Balance Interpolation ✅ ADDED (2025-11-13)

### Enhancement
Added monthly balance tracking for all investment accounts instead of just January (beginning) and December (ending).

### Problem
**Before**: Only 2 balance rows per year per account
- Month 1 (January): Beginning Balance
- Month 12 (December): Ending Balance
- Months 2-11: No balance data

**User Impact**:
- Couldn't track monthly account growth
- No visibility into progressive contribution buildup
- Difficult to create monthly charts/dashboards

### Solution Implemented

**Approach**: Linear interpolation of contributions with year-end growth
- Contributions are interpolated linearly across months
- Investment growth is applied only in December (year-end)
- Formula: `Balance(month) = Beginning + (month-1)/12 * Annual Contribution`

**InvestmentsTransformer.js Changes:**

1. **Cash Account** (lines 69-89):
   - Added 10 monthly balance rows (months 2-11)
   - Shows progressive cash buildup throughout year

2. **Investment Accounts** (lines 200-258):
   - Added 30 monthly rows per account (10 months × 3 types)
   - Market Value: Beginning + progressive contributions
   - Cost Basis: Beginning cost basis + progressive contributions
   - Unrealized Gains: Market Value - Cost Basis

3. **401k Account** (lines 445-504):
   - Added 30 monthly rows (10 months × 3 types)
   - Combines individual + company contributions
   - Same structure as investment accounts

### How It Works

**Example: Cash Account with $20k annual contribution**
```
Month 1:  $30,000  (Beginning balance)
Month 2:  $31,667  (Beginning + 1/12 * $20k)
Month 3:  $33,333  (Beginning + 2/12 * $20k)
Month 6:  $38,333  (Beginning + 5/12 * $20k)
Month 12: $50,000  (Actual ending from Gap.calc.js - includes any growth)
```

**Key Design Decision**: Growth applied only in December
- Matches Gap.calc.js annual calculation model
- Notes clearly state: "Linear interpolation (contributions only, growth at year-end)"
- Honest about estimation method

### CSV Impact

**Rows Added per Year:**
- Cash: 10 balance rows (months 2-11)
- Each investment account: 30 rows (10 months × 3 balance types)
- 401k: 30 rows (10 months × 3 balance types)

**For 23-year projection with 1 investment account:**
- Cash: +230 rows
- Investment: +690 rows
- 401k: +690 rows
- **Total new rows: ~1,610**

**New Subcategories:**
- `Balance` - Monthly market value snapshot
- `Balance_Cost_Basis` - Monthly cost basis buildup
- `Unrealized_Gains` - Monthly unrealized gains (market - cost basis)

### Benefits

✅ **Monthly tracking**: See account balances for all 12 months
✅ **Progressive visibility**: Watch contributions build up over time
✅ **Better charting**: Can create smooth monthly charts instead of year-end snapshots
✅ **Budgeting tool**: Track how close you are to targets throughout the year
✅ **Honest estimation**: Notes clearly explain growth happens at year-end

### Limitations

⚠️ **Approximation**: This is linear interpolation, not true monthly compounding
⚠️ **Growth timing**: All growth applied in December, not distributed monthly
⚠️ **Future enhancement**: True monthly calculation would require Gap.calc.js refactor (see TO_DO.md)

### Validation

Math check formula:
```
Month 6 Balance ≈ Beginning Balance + (5/12 * (Ending - Beginning - Growth))
```

User confirmed: ✅ Tests passed!

---

## Issue 5: Inconsistent Module Naming in CSV Export

### Problem
Module names in the CSV export are inconsistent between singular and plural forms.

**Current State:**
- `Income` - Singular
- `Expenses` - Plural
- `Investments` - Plural
- `Taxes` - Plural
- `Net_Worth` - Underscore separator

### Impact
- **Low**: Functional impact - CSV works fine
- **Medium**: UX/consistency - users may find it confusing
- **Low**: Data analysis - minor issue for pivot tables/grouping

### Options

**Option A: All Plural** (RECOMMENDED)
```
Incomes → Expenses → Investments → Taxes → Net_Worth
```
- Pro: Matches most modules (3/5 already plural)
- Pro: Represents collections of data (multiple income streams, expenses, etc.)
- Con: "Incomes" sounds slightly awkward grammatically

**Option B: All Singular**
```
Income → Expense → Investment → Tax → Net_Worth
```
- Pro: Cleaner grammatically
- Pro: Matches financial statement conventions
- Con: More changes required (3 modules vs 1)

**Option C: Keep As-Is**
- Pro: No work required
- Con: Inconsistency remains

### Recommendation
**Option A (All Plural)** - Less work and represents the data structure better.

### Files to Change (for Option A)
```
src/features/export/transformers/IncomeTransformer.js
  - Change all Module: 'Income' → Module: 'Incomes' (3 locations)
```

### Testing
- Export CSV before and after
- Verify module names updated in all rows
- Update any documentation referencing module names

---

## Summary of Issues

| Issue | Severity | Root Cause | Fix Complexity | Status |
|-------|----------|------------|----------------|--------|
| 1. "Test" in investment name | Low | User data naming | N/A - User action | ✅ **DOCUMENTED** |
| 2. Company 401k always 0 | High | Missing projections in data flow | Medium | ✅ **FIXED** |
| 3. Net Worth only yearly | Medium | Intentional design | High - Architecture change | Open |
| 4. Tax values inconsistent | High | Multiple calculation paths | Medium | ✅ **FIXED** |

| Enhancement | Priority | Complexity | Status |
|-------------|----------|------------|--------|
| Cost Basis & Capital Gains | High | Medium | ✅ **ADDED** |
| Cash Contribution Tracking | High | Medium - Architecture change | ✅ **ADDED** |
| Monthly Balance Interpolation | Medium | Medium - Architecture change | ✅ **ADDED** |
| Standardize Module Naming | Low | Low | Pending |

---

## Recommended Priority

1. ~~**Issue 4 (Tax inconsistency)**~~ - ✅ **FIXED** (2025-11-12)
2. ~~**Issue 2 (Company 401k)**~~ - ✅ **FIXED** (2025-11-13)
3. ~~**Enhancement: Cost Basis tracking**~~ - ✅ **ADDED** (2025-11-13)
4. ~~**Enhancement: Cash Contribution Tracking**~~ - ✅ **ADDED** (2025-11-13)
5. ~~**Enhancement: Monthly Balance Interpolation**~~ - ✅ **ADDED** (2025-11-13)
6. **Enhancement: Standardize Module Naming** - Cosmetic fix - LOW priority - **NEXT**
7. **Issue 3 (Net Worth yearly)** - Requires bigger refactor, defer to future
8. **Enhancement: Inflation-Adjusted Target Cash** - In TO_DO, defer to future

---

## Next Steps

1. Add diagnostic logging to identify exact source of discrepancies
2. Verify data flow: Income → Gap → Export
3. Consider consolidating tax calculations to single source of truth (Gap.calc.js)
4. Add data validation on inputs to prevent "test" data from persisting
