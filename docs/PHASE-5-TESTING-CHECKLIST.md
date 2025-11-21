# Phase 5: Testing and Validation Checklist

This document outlines the testing steps to validate the refactoring changes from Phases 1-4.

## Testing Overview

All calculation phases have been refactored:
- ✅ Phase 1: Equity tax treatment fixed
- ✅ Phase 2: Investment calculations unified
- ✅ Phase 3: Rounding standardized
- ✅ Phase 4: WIP dashboard created

## 1. Equity Tax Treatment Validation

**What Changed:**
- Equity compensation is now taxed as ordinary income BEFORE being allocated
- Previously, equity was automatically invested pre-tax (incorrect)
- Now equity flows through gap allocation after taxes (correct)

**Test Steps:**
1. Navigate to Income section
2. Add an income stream with equity compensation (e.g., $100,000 salary + $50,000 equity)
3. Navigate to Dashboard → Net Worth tab
4. Verify in the annual breakdown table:
   - Equity shows up in "Annual Equity" column
   - Equity is included in "Taxable Income"
   - Equity is taxed at ordinary income rates
   - After-tax equity flows into "Gap" column
   - Gap is then allocated to cash/investments

**Expected Result:**
- Equity should be taxed as ordinary income
- Investment values will be 20-30% lower than before (more accurate)
- Net worth should reflect post-tax equity value

**Console Verification:**
```javascript
// Open browser console and run:
const data = JSON.parse(localStorage.getItem('income'))
console.log('Income streams:', data.incomeStreams)

// Check gap projections
const gapData = /* load from Dashboard */
console.log('Year 1 equity:', gapData.projections[0].annualEquity)
console.log('Year 1 taxes:', gapData.projections[0].annualTaxes)
console.log('Year 1 gap:', gapData.projections[0].gap)
```

## 2. Investment Calculation Consistency

**What Changed:**
- Single calculation engine (Gap.calc.js) now used everywhere
- Investment page now calculates using full pipeline: Income → Expenses → Gap
- No more separate calculation logic

**Test Steps:**
1. Set up complete profile data (Income, Expenses, Investments)
2. Navigate to Investments & Debt page
3. Click "Calculate Projections"
4. Note the values in:
   - Annual Contributions Breakdown table
   - Investment Value Over Time chart
5. Navigate to Dashboard → Net Worth tab
6. Compare values with same years in Net Worth table

**Expected Result:**
- 401k values should match exactly between Investment page and Dashboard
- Investment values should match exactly between Investment page and Dashboard
- Cash values should match exactly between Investment page and Dashboard
- Annual contribution amounts should be consistent

**Console Verification:**
```javascript
// Investment page projections
console.log('Investment page year 1:', projections.projections[0])

// Dashboard projections (in Dashboard component)
console.log('Dashboard year 1:', data.gapProjections.projections[0])

// Compare:
// - retirement401kValue should match
// - cash should match
// - investments[0].marketValue should match
```

## 3. 401k Contribution Validation

**What Changed:**
- Lifetime tracking now includes both individual and company contributions
- Values flow through unified calculation engine

**Test Steps:**
1. Navigate to Income section
2. Set up income stream with:
   - Individual 401k: $23,000/year
   - Company 401k: $10,000/year
3. Navigate to Dashboard → Income tab
4. Check the Income Summary table for:
   - "Company 401(k)" row shows lifetime company contributions
5. Navigate to Dashboard → Net Worth tab
6. Check Annual Contributions Breakdown for:
   - "Individual 401k" column
   - "Company 401k" column
7. Verify sum matches "401(k) Value" growth

**Expected Result:**
- Individual 401k contributions should accumulate correctly (23k * years)
- Company 401k contributions should accumulate correctly (10k * years)
- 401k value should equal: contributions + growth from returns
- Values should be consistent across all dashboard tabs

## 4. Rounding Precision Validation

**What Changed:**
- Removed round5() from all calculations
- Calculations now preserve full precision (15+ decimal places)
- Rounding only occurs at display time

**Test Steps:**
1. Open browser DevTools → Console
2. Load dashboard data
3. Inspect raw projection values

**Console Verification:**
```javascript
// Check raw calculation precision
const income = JSON.parse(localStorage.getItem('income'))
const projections = /* get from state or recalculate */

// Values should have many decimal places
console.log('Year 1 salary (full precision):', projections[0].annualSalary)
console.log('Year 1 taxes (full precision):', projections[0].annualTaxes)
console.log('Year 1 gap (full precision):', projections[0].gap)

// Display values should be rounded
// (check in UI - should show clean numbers like $125,000, not $125,000.123456)
```

**Expected Result:**
- Internal calculation values have full precision (many decimals)
- UI displays rounded values (0-2 decimal places)
- No accumulated rounding errors over time
- Year 45 projections should be more accurate than before

## 5. WIP Dashboard Tab

**What Changed:**
- New "🚧 WIP" tab added to dashboard
- Empty placeholder ready for future components

**Test Steps:**
1. Navigate to Dashboard
2. Click on "🚧 WIP" tab
3. Verify empty state displays correctly

**Expected Result:**
- Tab is accessible and loads without errors
- Shows yellow banner explaining it's experimental
- Shows "No Components Added Yet" message
- Shows data availability summary (number of projections)

## 6. Regression Testing

**Test Steps:**
1. Load existing data from export file
2. Verify all sections still work:
   - ✅ Personal Details
   - ✅ Income
   - ✅ Expenses
   - ✅ Investments & Debt
   - ✅ Taxes
   - ✅ Dashboard (all tabs)
3. Create new income stream
4. Create new expense category
5. Export data and verify JSON structure

**Expected Result:**
- No JavaScript errors in console
- All forms save correctly
- Dashboard refreshes when data changes
- Export includes all data

## 7. Performance Testing

**Test Steps:**
1. Load dashboard with complete data
2. Open browser DevTools → Performance tab
3. Record while navigating between tabs
4. Check calculation timing in console logs

**Expected Result:**
- Dashboard loads in < 2 seconds
- Calculations complete in < 1 second
- No memory leaks when switching tabs
- Console shows calculation groups complete successfully

## Known Issues to Verify Are Fixed

From previous bug reports:

### ✅ Bug 1: Childcare expense not growing
- Expense with dollar jump (e.g., $36k starting year 5) should grow at category growth rate after jump year
- **Verify:** Check Expenses dashboard, childcare should increase each year after year 5

### ✅ Bug 2: Equity lifetime contributions showing 0
- Equity should show lifetime contributions in Income tab
- **Verify:** Income summary table should show non-zero equity totals

### ✅ Bug 3: Investment values don't match between pages
- Investment page and Dashboard should show same values
- **Verify:** Compare side-by-side, values should match exactly

### ✅ Bug 4: Expenses dashboard showing NaN
- Expenses tab should show valid numbers and charts
- **Verify:** All numbers should be valid, no NaN or undefined

## Automated Testing (Future)

Consider adding:
- Unit tests for calculation functions
- Integration tests for data flow
- Snapshot tests for dashboard outputs
- Performance benchmarks

## Sign-Off

Once all tests pass:
- [ ] Equity tax treatment verified
- [ ] Investment consistency verified
- [ ] 401k contributions validated
- [ ] Rounding precision confirmed
- [ ] WIP dashboard functional
- [ ] Regression testing passed
- [ ] Performance acceptable
- [ ] No console errors

Date: ___________
Tester: ___________
