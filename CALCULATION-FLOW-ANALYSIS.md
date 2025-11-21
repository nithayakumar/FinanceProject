# Career Break Calculation Flow Analysis

## The Problem

User sets 50% reduction for Year 5, but tables show $0 income instead of 50%.

## Root Cause

**Gap.calc.js uses January income × 12 for annual income**

```javascript
// Line 94-95 in Gap.calc.js
const incomeProjection = incomeData.projections[janIndex] || {}
const annualIncome = (incomeProjection.totalCompNominal || 0) * 12
```

This ASSUMES all months in a year have the same income.

## Why This Breaks with Career Breaks

### Scenario 1: Full year at 50% reduction
- Income.calc.js: Correctly calculates each month at 50%
- Gap.calc.js: Takes January (50%) × 12 = 50% annual ✓ WORKS

### Scenario 2: Partial year (18-month break starting Year 5)
- Year 5: All 12 months at 0% (on break)
- Income.calc.js: Each month = $0
- Gap.calc.js: January ($0) × 12 = $0 ✓ WORKS

- Year 6: Months 1-6 at 0% (still on break), months 7-12 at 100% (back to work)
- Income.calc.js: Correctly calculates each month
  * Jan-Jun: $0
  * Jul-Dec: Full income
- Gap.calc.js: January ($0) × 12 = $0 ✗ **WRONG!**
  * Should be: Sum of all 12 months = 50% annual

### Scenario 3: Mid-year career break start
- Year 5: Months 1-6 at 100%, months 7-12 at 0%
- Income.calc.js: Correctly calculates each month
- Gap.calc.js: January (100%) × 12 = 100% annual ✗ **WRONG!**
  * Should be: 50% annual

## The Disconnect

**Multiple Sources of Truth:**

1. **Income.calc.js** - Calculates income at MONTH level (1200 months)
   - ✓ Correctly applies career breaks per month
   - ✓ Used by Income charts

2. **Gap.calc.js** - Calculates gap/net worth at YEAR level
   - ✗ Samples January only
   - ✗ Assumes entire year matches January
   - ✓ Used by Net Worth tables, Gap calculations

3. **Chart displays** - Use Income.calc.js monthly data
   - ✓ Show correct proration

4. **Table displays** - Use Gap.calc.js yearly data
   - ✗ Show incorrect values for partial-year breaks

## The Fix

**Gap.calc.js should SUM all 12 months, not multiply January by 12**

```javascript
// BEFORE (WRONG):
const annualIncome = (incomeProjection.totalCompNominal || 0) * 12

// AFTER (CORRECT):
let annualIncome = 0
for (let month = 0; month < 12; month++) {
  const monthIndex = (year - 1) * 12 + month
  const monthProjection = incomeData.projections[monthIndex] || {}
  annualIncome += (monthProjection.totalCompNominal || 0)
}
```

This ensures accurate proration for any career break pattern.

## Implementation Status

✅ **FIXED** - All issues have been resolved in Gap.calc.js:

- ✅ Annual income (was line 95): Now SUMS all 12 months
- ✅ Annual equity (was line 98): Now SUMS all 12 months
- ✅ Annual company 401k (was line 99): Now SUMS all 12 months
- ✅ Annual expenses (was line 149): Now SUMS all 12 months
- ✅ Individual 401k proration removed: Can now contribute during career breaks using savings/debt

## Why This Happened

**Performance optimization that broke correctness:**
- Multiplying by 12 is faster than summing 12 values
- Works fine when all months are identical (no career breaks)
- Silently breaks when months differ (career breaks, mid-year changes)

## Prevention Strategies

1. **Single Source of Truth**: All calculations should use the same monthly data
2. **Validation Tests**: Add tests that verify annual sums match monthly aggregations
3. **Documentation**: Document assumptions (e.g., "assumes all months equal")
4. **Code Review Checklist**: Check for sampling vs aggregation
5. **Integration Tests**: Test with mid-year career breaks to catch this pattern
