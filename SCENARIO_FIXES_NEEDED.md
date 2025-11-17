# Scenario Module Fixes Needed

## Issues Identified

### Critical Bugs
1. **Delete scenario doesn't work** - Scenario Manager delete button not functioning
2. **Promote to Current Plan doesn't work** - Make Active Plan button not functioning
3. **Compare doesn't work** - Scenario comparison showing errors

### Module Constraint Violations

#### Income Tab (Currently Wrong)
**Current behavior:**
- Can add unlimited income streams
- Can delete all streams (no minimum)
- Missing stream name editing

**Should be (per Income.jsx lines 85, 106):**
- Max 3 streams
- Min 1 stream
- Each stream editable with name field
- Jumps unlimited per stream

#### Expenses Tab (Currently Wrong)
**Current behavior:**
- Free-form expense categories (user can name anything)
- Can add/delete categories freely
- No one-time expenses

**Should be (per Expenses.jsx lines 7-17, 32-45, 144-165):**
- FIXED 9 categories: Housing, Utilities, Transportation, Medical, Childcare, Education, Food, Entertainment, Other
- Categories CANNOT be added or deleted
- Each category has: annualAmount, growthRate, jumps[]
- Separate section for one-time expenses (unlimited add/delete)
- One-time expense fields: year, amount, description

#### Investments Tab (Currently Wrong)
**Current behavior:**
- Can add unlimited investment accounts
- Missing portfolioPercent field
- Can delete all accounts

**Should be (per InvestmentsDebt.jsx lines 145, 180):**
- Max 3 investment accounts
- Min 0 accounts (can delete all)
- Each account fields: currentValue, costBasis, growthRate, portfolioPercent

#### Blank Scenario Template (Currently Wrong)
**Current behavior:**
- Creates empty expense categories array
- Creates empty investments array
- Creates single income stream

**Should be:**
- Income: 1 stream with proper defaults
- Expenses: 9 fixed categories initialized + empty oneTimeExpenses array
- Investments: Empty array (user adds as needed, max 3)

## Implementation Plan

### Phase 1: Fix Critical Bugs
1. Debug and fix scenario delete
2. Debug and fix promote to current plan
3. Debug and fix scenario comparison

### Phase 2: Fix Income Tab
1. Add validation: max 3 streams
2. Add validation: min 1 stream (disable delete on last stream)
3. Update blank scenario template

### Phase 3: Fix Expenses Tab
1. Replace dynamic categories with fixed 9 categories
2. Remove add/delete category buttons
3. Add one-time expenses section
4. Update blank scenario template to include all 9 categories

### Phase 4: Fix Investments Tab
1. Add validation: max 3 accounts
2. Add portfolioPercent field to UI
3. Update blank scenario template

### Phase 5: Testing
1. Test create blank scenario
2. Test clone current plan
3. Test edit scenarios
4. Test promote scenarios
5. Test compare scenarios
6. Test delete scenarios

## Files Requiring Changes
- `src/features/scenarios/ScenarioEditor.jsx` - Major rewrite of all 3 tabs
- `src/features/scenarios/ScenarioManager.jsx` - Fix bugs, update blank template
- `src/features/scenarios/ScenarioCompare.jsx` - Debug comparison issue
- `src/features/expenses/REFERENCE.md` - Document fixed categories constraint
- `src/features/investments-debt/REFERENCE.md` - Document max 3 constraint + portfolioPercent
