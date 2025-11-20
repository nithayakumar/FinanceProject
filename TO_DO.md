# CRITICAL ISSUES - SCENARIOS MODULE ⚠️

**Status:** ✅ ALL 7 CRITICAL ISSUES RESOLVED!

### Bugs (All Fixed! ✅)
1. ✅ **FIXED: Delete scenario now works**
   - Fixed: Replaced window.confirm() with React modal (ScenarioManager.jsx)
   - Fixed: Added protection against deleting active scenario
   - Status: Working as expected

2. ✅ **FIXED: Promote to Current Plan now works**
   - Fixed: Implemented state tracking architecture with isActive flag
   - Fixed: Previous plan auto-saved as alternative (no data loss!)
   - Fixed: Promoted scenario removed from alternatives list
   - Status: Working as expected

3. ✅ **FIXED: Compare scenarios now works**
   - Fixed: Added incomeStreams to incomeData for Gap.calc.js
   - Fixed: Extract projections array from Gap results object
   - Fixed: Field name mismatches (grossIncome, annualTaxes, retirement401kValue)
   - Fixed: Added proper defaults to active scenario data
   - Status: Working as expected - comparison table and charts display correctly

### Module Constraint Violations (All Fixed! ✅)
4. ✅ **FIXED: Income tab constraints implemented** (max 3, min 1)
   - Created: src/shared/moduleConfig.js - Single source of truth
   - Updated: ScenarioEditor.jsx Income tab
   - Now: Max 3 streams enforced, min 1 stream enforced (delete button hidden)
   - Future-proof: Change INCOME_CONFIG.MAX_STREAMS in one place

5. ✅ **FIXED: Expenses tab has correct structure** (fixed 9 categories)
   - Updated: ScenarioEditor.jsx Expenses tab
   - Now: Fixed 9 categories (Housing, Utilities, Transportation, Medical, Childcare, Education, Food, Entertainment, Other)
   - Categories cannot be added or removed, only amounts can be edited
   - Future-proof: Uses EXPENSE_CONFIG.CATEGORIES from moduleConfig

6. ✅ **FIXED: Investments tab has portfolioPercent** (max 3 accounts)
   - Updated: ScenarioEditor.jsx Investments tab
   - Now: Max 3 accounts enforced, portfolioPercent field added
   - Future-proof: Uses INVESTMENTS_CONFIG.MAX_INVESTMENTS from moduleConfig

7. ✅ **FIXED: Blank scenario template matches module structure**
   - Updated: ScenarioManager.jsx handleCreateBlank()
   - Now: Uses createDefaultIncomeStream(), createDefaultExpenseCategories(), createDefault401k()
   - Blank scenarios have all 9 expense categories pre-populated
   - Future-proof: Uses helper functions from moduleConfig

### Fix Priority
**Phase 1 (Immediate):** ✅ COMPLETE - All bugs #1-3 (delete, promote, compare)
**Phase 2 (Next):** ✅ COMPLETE - All constraints #4-6 (income, expenses, investments tabs)
**Phase 3 (Final):** ✅ COMPLETE - Template #7 (blank scenario initialization)

### Summary of All Fixes
**Session 1:** Bugs #1-3 fixed (delete modal, promote state tracking, compare calculations)
**Session 2:** Constraints #4-7 fixed with centralized moduleConfig

**Key Architecture Change:** Created `src/shared/moduleConfig.js` as single source of truth.
To change limits (e.g., max income streams from 3 to 5), edit ONE file only.

**Result:** Scenarios module is fully functional! All constraints match main modules.

---

# Future Enhancements

## Income
- [ ] **Apply 401k contribution limit at income stream level**
  - Add validation per income stream to ensure individual401k doesn't exceed IRS limit
  - 2025 limit: $23,000 (under 50), $30,500 (50+)
  - Show warning if stream exceeds limit
  - Calculate total across all streams and warn if aggregate exceeds household limit
  - Consider age-based catch-up contributions (50+)

- [ ] **Improve income jump UI**
  - Make jump interface more intuitive and compact
  - Add inline editing for jumps instead of modal/separate section
  - Show visual timeline of when jumps occur
  - Allow easier adding/removing of jumps
  - Show jump preview in main income form

- [ ] **Condense Income UI**
  - Reduce vertical space per income stream
  - Use collapsible sections for advanced settings (jumps, 401k, equity)
  - Implement grid layout for better space utilization
  - Minimize whitespace while maintaining readability
  - Consider tabbed interface for multiple streams

- [ ] **Add Nominal and Present Value toggle to Income Output**
  - Implement view toggle similar to NetWorthTab (Nominal vs PV)
  - Show all projections in both nominal (future dollars) and present value (today's dollars)
  - Update charts to reflect selected view
  - Update summary cards to show both values
  - Make it consistent with Dashboard's PV toggle

- [x] **Fix key milestones display** ✅ FIXED (2025-11-12)
  - Now shows breakdown by individual income stream
  - Income.calc.js:332-371 - Calculates per-stream breakdown for milestone years
  - Income.jsx:626-640 - Displays each stream's contribution below total
  - Shows both per-stream amounts AND total with PV values
  - Format: Main total (bold), then indented per-stream breakdown with ↳ arrow

- [x] **Fix lifetime 401k sum calculation** ✅ RESOLVED (2025-11-12)
  - Income.calc.js:308-309 calculation is CORRECT
  - Sums all monthly company401k values which grow with income
  - **Root Issue**: Gap.calc.js was using static company contribution (now fixed)
  - Mismatch between Income module (correct) and Gap module (was wrong) is now resolved
  - Lifetime "401k Contributions" = sum of employer match over time
  - Note: This is different from final 401k BALANCE (which includes investment growth)

- [x] **Verify equity growth behavior** ✅ VERIFIED CORRECT (2025-11-12)
  - Equity DOES grow with income growth rate
  - Income.calc.js:127 - `stream.equity * growthMultiplier * jumpMultiplier`
  - Equity correctly grows at same rate as salary/income stream
  - No bug found - working as expected

- [x] **Fix company 401k contribution growth** ✅ FIXED (2025-11-12)
  - Company 401k contribution now grows with INCOME growth rate
  - Gap.calc.js:66 - Now pulls annualCompany401k from income projections
  - Gap.calc.js:151 - Uses year-specific annualCompany401k (not static value)
  - Company match correctly grows as salary grows

## Personal Details
- [ ] **Condense Personal Details UI**
  - Reduce vertical space and make form more compact
  - Better visual hierarchy for readability
  - Consider collapsible sections for less frequently used fields

- [ ] **Clarify Cash/Savings terminology and workflow**
  - Current terminology is confusing: "Current Savings" vs "Cash" vs "Cash on Hand"
  - Standardize naming across Personal Details and Investments sections
  - Suggested flow:
    - Personal Details has simple "Current Savings" field (used initially)
    - Once user fills out Investments & Debt, switch to using those detailed values
    - Grey out or minimize Personal Details cash section when Investments is filled
    - Add visual indicator showing which value is being used in calculations

- [ ] **Use Personal Details savings until Investments filled out**
  - PersonalDetails "Current Savings" should be the default cash value
  - Once Investments section has "Current Cash" filled, use that instead
  - Add logic to detect when to switch between the two sources
  - Display clear indication to user which source is active

## Savings & Investments (formerly "Investments & Debt")
- [ ] **Rename module from "Investments & Debt" to "Savings & Investments"**
  - Update component name: InvestmentsDebt.jsx → SavingsInvestments.jsx
  - Update navigation labels in App.jsx
  - Update section headers and titles
  - Better reflects the purpose: tracking savings (cash, 401k) and investment accounts
- [ ] **Target cash limit should grow with inflation**
  - Currently target cash is static throughout projection period
  - Should inflate at inflation rate to maintain real purchasing power
  - Example: $50k target in Year 1 → $51,350 in Year 2 (at 2.7% inflation)
  - Affects Gap.calc.js cash allocation logic (lines 124-130)
  - When gap fills cash to target, use inflated target for that year
- [ ] Add debt tracking and payoff calculations
- [ ] Model loan payments and interest

## Taxes
- [ ] **Make custom tax bracket picklists dynamic**
  - Filing status dropdown should dynamically update available bracket options
  - State selection should load state-specific brackets
  - Tax year selection should load year-specific rates
  - Brackets should update in real-time as user changes selections

- [ ] **Add input validation for custom tax brackets**
  - Validate bracket ranges don't overlap
  - Ensure brackets cover full income range (0 to Infinity)
  - Validate tax rates are between 0-100%
  - Check that brackets are in ascending order
  - Show clear error messages for invalid configurations

- [ ] **Add Save button for Taxes section**
  - Taxes section currently auto-calculates but doesn't save explicitly
  - Add "Save & Continue" button like other sections
  - Store custom tax configurations to localStorage
  - Show confirmation when tax settings are saved
  - Disable Dashboard until taxes are saved

- [ ] Add state tax support beyond California
- [ ] Allow custom tax years beyond 2025

## Gap
- [ ] Add notifications when cash goes negative
- [ ] Model borrowing/credit when cash is negative
- [ ] Add emergency fund targets and warnings

## Dashboard
- [ ] **Add detailed year-by-year Net Worth breakdown table**
  - Show annual changes in net worth components:
    - Income after taxes and expenses (annual available cash flow)
    - Increased cost basis (contributions to investments)
    - Increased capital gains (investment growth)
    - Increased 401k value (contributions + growth)
    - Increased cash on hand (change in cash balance)
  - Show % of net worth by component (cash %, 401k %, investments %)
  - Display as table with columns:
    - Year
    - Net Worth (beginning, ending, change)
    - Income After Tax & Expenses
    - Cash Change ($ and %)
    - 401k Change ($ and %)
    - Investment Cost Basis Change ($ and %)
    - Investment Capital Gains Change ($ and %)
  - Include both nominal and present value views
  - Add export to CSV functionality for this table
  - Helps users understand drivers of net worth growth year-over-year

## General
- [ ] **Add Input Configuration Export**
  - Export all user inputs to JSON or CSV file
  - Should include:
    - Personal Details (name, age, retirement year, inflation rate, etc.)
    - All income streams (salary, equity, 401k settings, growth rates, jumps)
    - All expense categories (recurring amounts, growth rates, jumps)
    - All one-time expenses
    - Investment accounts (names, current values, growth rates, allocations)
    - Cash settings (current cash, target cash)
    - 401k settings (current value, growth rate, company contribution)
    - Tax configuration (filing status, state, custom brackets if any)
  - Use cases:
    - Backup configuration before making changes
    - Share configuration with financial advisor
    - Transfer to another device
    - Version control / scenario planning
    - Debug data issues
  - Format: JSON for readability and re-import capability
  - Add "Export Inputs" button in Dashboard next to "Export Data" button
  - Future: Add "Import Inputs" to restore configuration
- [x] **Standardize Module naming in CSV export** ✅ FIXED (2025-11-13)
  - Changed to all plural for consistency:
    - Incomes (was Income)
    - Expenses (unchanged)
    - Savings & Investments (was Investments)
    - Taxes (unchanged)
    - Net_Worth (unchanged)
  - Also fixed: "Large Purchase" → "Large_Purchase" fallback
  - Files updated: IncomeTransformer.js, InvestmentsTransformer.js, ExpensesTransformer.js
  - Documentation updated in CSV_EXPORT_ISSUES.md
- [x] **Add CSV data export** ✅ COMPLETED (2025-11-12) ⚠️ **ISSUES FOUND**
  - Single CSV file with monthly-level financial projections
  - 13 columns: Year, Month, Module, Primary_Category, Subcategory, Sub_Sub_Category, Value_Type, Value_Nominal, Value_PV, Inflation_Multiplier, Growth_Multiplier, Growth_Type, Notes
  - Covers all 5 modules: Income, Expenses, Taxes, Investments, Net_Worth
  - Per-stream income breakdown (Salary, Equity, Company 401k)
  - Per-category expense breakdown (Recurring, One-time)
  - Detailed tax breakdown (Federal, State, FICA)
  - Investment account waterfall (Beginning, Contributions, Returns, Ending)
  - Export button in Dashboard (top right)
  - Files created:
    - `/src/features/export/CSVExporter.js` - Main orchestrator
    - `/src/features/export/transformers/IncomeTransformer.js`
    - `/src/features/export/transformers/ExpensesTransformer.js`
    - `/src/features/export/transformers/TaxesTransformer.js`
    - `/src/features/export/transformers/InvestmentsTransformer.js`
    - `/src/features/export/transformers/NetWorthTransformer.js`
    - `/src/components/ExportButton.jsx`
  - Estimated ~15,000 rows for 30-year projection
  - Uses `papaparse` library for CSV generation
  - **Known Issues (see docs/CSV_EXPORT_ISSUES.md for details):**
    - [x] **FIX: Company 401k contribution showing as $0** ✅ FIXED (2025-11-13)
      - **Root Cause**: CSVExporter wasn't passing projections array with incomeData
      - **Fix**: Merged incomeProjections with incomeData before passing to transformers
      - Company 401k values now appear correctly and grow with income
    - [x] **FIX: Tax values inconsistent across sections** ✅ FIXED (2025-11-12)
      - **Issue**: Taxes UI, CSV Export, and Net Worth showed different tax amounts
      - **Root Cause**: TaxesTransformer was re-calculating taxes instead of using Gap.calc.js values
      - **Fix Applied**:
        - Gap.calc.js now stores detailed tax breakdown (federal, state, socialSecurity, medicare)
        - TaxesTransformer now uses pre-calculated values from Gap projections
        - Single source of truth: Gap.calc.js → Taxes.calc.js
        - Removed unnecessary re-calculation in TaxesTransformer
      - **Impact**: All modules (Dashboard, CSV Export, Net Worth) now show identical tax values
    - [ ] **FIX: "test for" appearing in category names** (LOW PRIORITY)
      - Test/placeholder data persisting in localStorage
      - Add input validation to prevent test prefixes
      - User should clear and re-enter real data
    - [ ] **ENHANCE: Net Worth monthly values** (MEDIUM PRIORITY)
      - Currently only shows December values (yearly)
      - User wants monthly Net Worth tracking
      - Options: A) Repeat Dec values monthly, B) Recalc monthly, C) Document yearly-only
      - Requires architecture change for full monthly calculation
- [ ] Add PDF export
- [ ] Add scenarios comparison (side-by-side)
- [ ] Multi-currency support

## Calculation Methodology
- [ ] **Move all growth calculations from annual to monthly**
  - Currently all growth rates (income, investments, 401k, inflation) are compounded annually
  - Target: Compound growth on a monthly basis for more accurate projections
  - Affects: Income.calc.js, Gap.calc.js, Expenses.calc.js
  - Formula change: `Math.pow(1 + rate/100, years)` → `Math.pow(1 + rate/1200, months)`
  - Note: This will provide more accurate month-to-month projections

---

# COMPREHENSIVE IMPLEMENTATION PLAN: Advanced Financial Planning Features

**Implementation Date:** 2025-11-16
**Goal:** Enable 8 critical use cases for advanced financial planning

**Use Cases:**
1. Compare income scenarios (job choices)
2. Compare tax scenarios (location changes)
3. Model work breaks (sabbaticals/layoffs)
4. Calculate "when can I retire?"
5. Calculate "how much can I withdraw in retirement?"
6. Plan retirement withdrawals (tax-efficient)
7. Prioritize and manage existing debt
8. Model new debt (home purchases, cars)

---

## PHASE 1: SCENARIOS MODULE 🎯 Priority: HIGH
**Goal:** Enable side-by-side comparison of different financial scenarios (jobs, locations, lifestyle changes)
**Use Cases Unlocked:** #1 (Job comparison), #2 (Location comparison)

### 1.1 Core Scenario Engine
- [ ] **Create Scenario.calc.js** - Core scenario calculation engine
  - `mergeScenarioData(baseData, scenarioOverrides)` - Deep merge base + overrides
  - `calculateScenarioProjections(scenarioData)` - Run full Gap projection with merged data
  - `compareScenarios(scenarios)` - Calculate differences between scenarios
  - Support overriding any module: profile, income, expenses, investments, taxes
  - Return normalized comparison data structure
  - Technical note: Reuse existing Gap.calc.js, just with different input data

- [ ] **Create ScenarioManager.jsx** - Scenario creation and management UI
  - List all saved scenarios (name, description, last modified)
  - "Create New Scenario" button → opens scenario builder
  - "Clone Current Profile" button → creates scenario from current localStorage data
  - Edit existing scenario (inline or modal)
  - Delete scenario (with confirmation)
  - Storage: localStorage key `scenarios` = array of scenario objects
  - Data structure:
    ```javascript
    {
      id: 'scenario-uuid',
      name: 'Texas Remote Job',
      description: 'Same job, remote from Austin',
      createdAt: timestamp,
      modifiedAt: timestamp,
      overrides: {
        profile: { state: 'TX', location: 'Austin' },
        income: { incomeStreams: [{ salary: 145000 }] },
        expenses: { housing: { rent: 1800 } }
      }
    }
    ```

- [ ] **Create ScenarioBuilder.jsx** - Guided scenario creation form
  - Step 1: Name and description
  - Step 2: Choose what to override (checkboxes for modules)
  - Step 3: For each selected module, show simplified override form
  - Step 4: Preview comparison before saving
  - Save scenario to localStorage
  - "Quick Templates" for common scenarios:
    - "New Job Offer" - override income only
    - "Move to New State" - override profile.state, expenses.housing
    - "Lifestyle Change" - override expenses
  - Validation: Ensure overrides are valid

- [ ] **Create ScenarioCompare.jsx** - Side-by-side comparison view
  - Select 2-4 scenarios to compare (dropdown multi-select)
  - Comparison table with key metrics:
    - Annual income (gross, post-tax, post-expense)
    - Annual taxes (federal, state, total)
    - Annual expenses
    - Annual savings (gap)
    - Savings rate (%)
    - Net worth at retirement
  - Difference columns showing Δ$ and Δ%
  - Color coding: green for better, red for worse
  - Charts:
    - Net worth trajectory (line chart, multiple lines)
    - Tax comparison (bar chart)
    - Savings comparison (bar chart)
  - Export comparison to CSV/PDF

- [ ] **Integrate Scenarios into Navigation**
  - Add "Scenarios" to main navigation
  - Route: `/scenarios` → ScenarioManager
  - Route: `/scenarios/compare` → ScenarioCompare
  - Route: `/scenarios/new` → ScenarioBuilder
  - Route: `/scenarios/:id/edit` → ScenarioBuilder (edit mode)

### 1.2 Scenario Templates
- [ ] **Create ScenarioTemplates.js** - Pre-built scenario templates
  - Template: "Move to Texas" (state → TX, state tax → 0, optional COL adjust)
  - Template: "Move to California" (state → CA, state tax → CA brackets)
  - Template: "New Job Offer" (override income streams)
  - Template: "Lifestyle Upgrade" (override expenses)
  - Template: "Aggressive Savings" (expenses down, investment allocation up)
  - User can select template, then customize before saving

### 1.3 Scenario Validation & Testing
- [ ] **Ensure scenario calculations match base calculations**
  - Test: Scenario with no overrides should match base profile exactly
  - Test: Override income only → taxes and gap should recalculate correctly
  - Test: Override state → state taxes should update
  - Add validation to prevent invalid overrides (negative income, etc.)

---

## PHASE 2: LIFE EVENTS MODULE 🎯 Priority: HIGH
**Goal:** Model temporary and permanent life events that impact finances over time
**Use Cases Unlocked:** #3 (Work breaks), #8 (New debt/home purchases)

### 2.1 Core Life Events Engine
- [ ] **Create LifeEvents.calc.js** - Life event calculation logic
  - `applyLifeEventToYear(year, event, baseData)` - Modify projections based on active events
  - `isEventActiveInYear(year, event)` - Check if event affects this year
  - Support event types:
    - SABBATICAL - Temporary income reduction
    - LAYOFF - Temporary income loss + optional severance
    - CAREER_CHANGE - Permanent income change
    - HOME_PURCHASE - One-time cash outflow + new debt + new expenses
    - CAR_PURCHASE - One-time cash outflow + optional debt
    - CHILD_BIRTH - Income reduction + expense increase + tax credits
    - EDUCATION - Temporary income loss + tuition expenses
  - Each event type has specific impact formula

- [ ] **Create LifeEvents.jsx** - Life events management UI
  - View: Timeline visualization of all planned events
  - List view: All events with start date, duration, type, impact summary
  - "Add Life Event" button → Event creation modal
  - Edit/delete existing events
  - Drag-and-drop timeline interface (optional enhancement)
  - Storage: localStorage key `lifeEvents` = array of event objects

- [ ] **Create EventBuilder.jsx** - Event creation wizard
  - Step 1: Select event type (cards with icons)
  - Step 2: Event-specific form based on type
  - Step 3: Preview financial impact (before/after comparison)
  - Step 4: Save event

  Event-specific forms:

  **Sabbatical:**
  - Start year/month, Duration (months)
  - Income reduction (% or $)
  - Expense changes (travel budget, etc.)

  **Layoff:**
  - Layoff year/month, Duration unemployed (months)
  - Severance amount ($), Unemployment benefits ($/month)
  - New job income (if different)

  **Home Purchase:**
  - Purchase year/month, Purchase price
  - Down payment (% or $)
  - Mortgage: rate, term (15/30 year)
  - Property tax (annual), Insurance (annual), HOA fees (monthly)
  - Maintenance budget (% of value or $/year)
  - Home appreciation rate
  - Impact: Cash -down payment -closing costs, Debt +mortgage, Expenses +taxes +insurance +HOA +maintenance, Assets +home value

  **Career Change:**
  - Change year, New income, New 401k match, New equity compensation

  **Child Birth:**
  - Birth year, Parent leave (months, income reduction %)
  - Childcare years (ages 0-5), Childcare cost ($/month)
  - General child expenses ($/month)
  - Tax credits (child tax credit), Duration: 18 years

### 2.2 Integration with Gap Calculations
- [ ] **Enhance Gap.calc.js to support life events**
  - Import LifeEvents.calc.js
  - For each projection year, check for active life events
  - Apply event impacts to income, expenses, cash, debt
  - Example: In projection loop, filter activeEvents, apply impacts before gap calculation

- [ ] **Update Dashboard to show life events on timeline**
  - Add event markers to net worth chart
  - Tooltips showing event details when hovering over markers
  - Visual indication of event impacts (income drop, expense spike, etc.)

### 2.3 Life Events in Scenarios
- [ ] **Allow scenarios to include/exclude life events**
  - Scenario override: `lifeEvents: [event1, event2]`
  - Comparison: "With sabbatical" vs "Without sabbatical"
  - Template: "Buy House in 2027" (pre-fills home purchase event)

---

## PHASE 3: DEBT MODULE 🎯 Priority: MEDIUM
**Goal:** Track and optimize existing debt, plan for new debt (mortgages, car loans)
**Use Cases Unlocked:** #7 (Manage debt), #8 (New debt modeling - runtime)

### 3.1 Core Debt Engine
- [ ] **Create Debt.calc.js** - Debt calculation logic
  - `calculateAmortization(principal, rate, payment, term)` - Amortization schedule
  - `calculatePayoffDate(principal, rate, payment)` - When debt is paid off
  - `calculateTotalInterest(principal, rate, payment, term)` - Lifetime interest
  - `calculateMinimumPayment(principal, rate, term)` - Required minimum
  - `optimizePayoffStrategy(debts, extraPayment, strategy)` - Avalanche/snowball
  - `projectDebtOverTime(debts, years)` - Year-by-year debt balances
  - Payoff strategies: Avalanche (highest rate first), Snowball (smallest balance first), Custom

- [ ] **Create Debt.jsx** - Debt management UI
  - Input View:
    - List of debts (table)
    - Add debt button, Edit/delete debt
    - Fields per debt: Name, Current balance, Interest rate (APR), Minimum monthly payment, Loan term, Type (secured/unsecured, tax-deductible)
    - Extra payment allocation: Monthly extra payment amount, Payoff strategy (avalanche/snowball/custom)
    - Save button

  - Output View:
    - Summary cards: Total debt balance, Weighted average interest rate, Total minimum payment, Debt-free date, Total interest
    - Debt payoff timeline (Gantt-style chart)
    - Amortization schedule table (expandable per debt)
    - Strategy comparison: Avalanche vs Snowball (show difference in payoff time and interest)
    - Debt-to-income ratio
    - Net worth impact chart

- [ ] **Create DebtForm.jsx** - Add/edit debt modal
  - Form fields for single debt
  - Validation: Positive balance, valid rate (0-100%), positive payment
  - Calculate minimum payment if user doesn't know it
  - Optional: Loan calculator to reverse-engineer payment from term

### 3.2 Integration with Gap Calculations
- [ ] **Enhance Gap.calc.js to include debt payments**
  - Load debt data from localStorage
  - For each year, calculate: Required debt payments (minimum + extra), Debt balance reduction, Interest paid (expense), Debt payoff events
  - Cash flow formula: `gap = income - taxes - expenses - debtPayments`
  - Net worth formula: `netWorth = cash + investments + 401k + homeValue - debtBalances`

- [ ] **Update Net Worth calculations**
  - Track debt balances as liabilities
  - As debt is paid down, net worth increases (principal reduction + freed cash flow)

### 3.3 Debt in Scenarios
- [ ] **Allow scenario overrides for debt**
  - Scenario: "Aggressive debt payoff" (increase extra payment)
  - Scenario: "Keep debt longer" (decrease extra payment, invest more)
  - Compare: Debt payoff vs investing (opportunity cost analysis)

### 3.4 Separate Debt from Investments Module
- [ ] **Rename InvestmentsDebt → SavingsInvestments**
  - Remove debt fields from this module
  - Focus on: Cash, 401k, investment accounts
  - Update navigation, routes, storage keys

- [ ] **Create separate Debt module**
  - New navigation item: "Debt"
  - Routes: `/debt` → Debt.jsx (input/output toggle)
  - Storage: localStorage key `debts` = array of debt objects

---

## PHASE 4: RETIREMENT PLANNING MODULE 🎯 Priority: HIGH
**Goal:** Answer "When can I retire?" and "How much can I withdraw?" with tax-efficient withdrawal planning
**Use Cases Unlocked:** #4 (When to retire), #5 (Withdrawal amount), #6 (Withdrawal strategy)

### 4.1 Core Retirement Engine
- [ ] **Create RetirementPlanning.calc.js** - Retirement calculation logic

  **Direction 1: When can I retire?**
  - `calculateRetirementDate(targetIncome, currentAge, currentNetWorth, savingsRate, lifeExpectancy)`
    - Iterate year by year, project net worth growth (using Gap.calc.js)
    - Test: `netWorth * (withdrawalRate / 100) >= targetIncome`
    - Account for Social Security (starts at age 62-70)
    - Return: { retirementAge, retirementYear, netWorthAtRetirement }

  **Direction 2: How much can I withdraw?**
  - `calculateSustainableWithdrawal(retirementAge, netWorthAtRetirement, lifeExpectancy, withdrawalRate)`
    - Calculate: `sustainableIncome = netWorth * (withdrawalRate / 100)`
    - Run full retirement projection (forward to life expectancy)
    - Verify portfolio doesn't run out
    - Return: { annualWithdrawal, monthlyWithdrawal, successProbability }

  **Withdrawal Strategy:**
  - `calculateWithdrawalSequence(accounts, annualWithdrawal, taxRules)`
    - Accounts: [{ name: '401k', balance, type: 'taxDeferred' }, { name: 'Roth', balance, type: 'taxFree' }, ...]
    - Strategies: Tax-optimized (Taxable → Tax-deferred → Roth), Pro-rata (proportional), Custom
    - Calculate year-by-year withdrawals and tax implications
    - Handle RMDs (Required Minimum Distributions) starting age 73

  **RMD Calculation:**
  - `calculateRMD(age, accountBalance)`
    - IRS Uniform Lifetime Table
    - Age 73: divisor = 26.5, RMD = balance / 26.5
    - Age 74: divisor = 25.5, etc.
    - RMDs are ordinary income (taxed)

- [ ] **Create RetirementPlanner.jsx** - Retirement planning UI

  **Input View:**
  - Retirement Goals: Target retirement income (annual, today's dollars), Desired retirement age (or "earliest possible"), Life expectancy (default: 95), Withdrawal rate (default: 4%, adjustable 3-5%)
  - Retirement Income Sources: Social Security (estimated monthly benefit, start age), Pension (monthly, if applicable), Part-time income (optional), Rental income (optional)
  - Retirement Expenses: Use current expenses as starting point, Adjustment factor (e.g., 80%), Or custom retirement budget, Healthcare costs (before/after Medicare age 65), Travel/discretionary budget
  - Withdrawal Strategy: Account priority order (drag-and-drop), Strategy selection (tax-optimized, pro-rata, custom), RMD handling (auto-calculated)

  **Output View:**
  - Key Metrics: Earliest retirement date, Net worth required, Sustainable annual/monthly withdrawal, Success probability
  - Retirement Timeline Chart: X-axis: Age, Y-axis: Net worth, Two phases: Accumulation (current age → retirement) and Decumulation (retirement → life expectancy), Show net worth trajectory with withdrawals
  - Withdrawal Schedule Table: Year-by-year: Age, Beginning balance (by account), Withdrawal source, Withdrawal amount, Investment growth, Ending balance, Taxes on withdrawal, After-tax income
  - Tax Projection: Annual taxes in retirement, Effective tax rate, Social Security taxation (up to 85% taxable), RMD impact
  - Sensitivity Analysis: What if withdrawal rate is 3% vs 5%? What if market returns are lower? What if you live to 100?

### 4.2 Two-Phase Gap Projections
- [ ] **Enhance Gap.calc.js for retirement phase**
  - Currently: Projects year 1 → retirement year (accumulation only)
  - Add Phase 2: Retirement year + 1 → life expectancy (decumulation)

  **Phase 1: Accumulation (Working Years)**
  - Current behavior (no changes)
  - Gap = Income - Taxes - Expenses - Debt
  - Gap > 0: Invest (fill cash, then allocate), Gap < 0: Draw from cash/investments

  **Phase 2: Decumulation (Retirement Years)**
  - Income sources: Social Security, pension, part-time, rental
  - Expenses: Retirement expenses (different from working expenses)
  - Withdrawal needed: `incomeShortfall = retirementExpenses - totalRetirementIncome`
  - Determine withdrawal source (strategy-based)
  - Calculate taxes on withdrawal + other income
  - Update account balances (withdrawals, investment growth)
  - Check for RMDs (age 73+), if RMD > withdrawal, must withdraw RMD
  - Update net worth, check if running out of money
  - Store projection: year, age, phase, income, withdrawal, taxes, expenses, netWorth, accounts

### 4.3 Retirement Expenses Module
- [ ] **Enhance Expenses.jsx to support retirement expenses**
  - Add section: "Retirement Expenses" (separate from current expenses)
  - Options: "Use current expenses with adjustment" (multiply by factor), "Custom retirement budget" (separate category entry)
  - Retirement-specific categories: Healthcare (before/after Medicare), Travel/leisure, Housing (paid-off mortgage?), Essential vs discretionary

- [ ] **Create RetirementExpenses.calc.js**
  - `calculateRetirementExpenses(year, retirementAge, expensesData, retirementExpenseOverrides)`
  - Handle healthcare cost increases (higher than general inflation)
  - Medicare enrollment at age 65 (reduces healthcare costs)
  - Return monthly and annual retirement expenses

### 4.4 Social Security Integration
- [ ] **Create SocialSecurity.calc.js**
  - `estimateSocialSecurity(fullRetirementBenefit, claimAge)`
    - Full Retirement Age (FRA): 67
    - Claim early (62): ~70% of FRA benefit
    - Claim at FRA (67): 100% of benefit
    - Claim late (70): ~124% of benefit
  - `calculateSocialSecurityTax(benefit, otherIncome)`
    - 0% taxable if income < $25k (single) or $32k (married)
    - 50% taxable if income $25k-$34k (single) or $32k-$44k (married)
    - 85% taxable if income > $34k (single) or $44k (married)

- [ ] **Add Social Security to RetirementPlanner input**
  - Estimated monthly benefit (user enters or link to SSA.gov estimator)
  - Claim age (default: 67, adjustable 62-70)
  - Married couple: Second person's benefit (optional)

### 4.5 Retirement Tax Calculations
- [ ] **Enhance Taxes.calc.js for retirement**
  - `calculateRetirementTaxes(withdrawals, socialSecurity, pension, age, state)`
    - Tax 401k withdrawals as ordinary income
    - Tax Social Security (up to 85%)
    - Tax pension as ordinary income
    - Tax Roth withdrawals at 0%
    - Tax investment withdrawals as capital gains
  - Capital gains tax is currently disabled until we model withdrawals (see APPLY_CAPITAL_GAINS in csvTaxCalculator.js)
    - Handle RMDs (forced ordinary income)
  - Return detailed tax breakdown by source

---

## PHASE 5: ENHANCED UI & VISUALIZATIONS 🎯 Priority: MEDIUM
**Goal:** Improve user experience with better visualizations and comparison tools

### 5.1 Dashboard Enhancements
- [ ] **Add retirement phase to Dashboard charts**
  - Currently: Dashboard shows accumulation phase only
  - Extend net worth chart to life expectancy
  - Visual separator at retirement age
  - Different shading for working vs retirement phases
  - Show withdrawal phase clearly

- [ ] **Add life events to Dashboard timeline**
  - Markers on chart for each life event
  - Tooltips with event details
  - Visual impact indicators (income drop, expense spike)

- [ ] **Add "At Retirement" summary cards**
  - Net worth at retirement
  - Estimated retirement income
  - Years of retirement funded
  - Success probability

### 5.2 Comparison Visualizations
- [ ] **Scenario comparison charts**
  - Multi-line net worth chart (all scenarios)
  - Bar chart: Key metrics side-by-side
  - Difference heatmap (red/green for worse/better)

- [ ] **Retirement strategy comparison**
  - Withdrawal strategy A vs B
  - Tax implications comparison
  - Longevity of portfolio comparison

### 5.3 Interactive Controls
- [ ] **Sliders for key assumptions**
  - Inflation rate, Investment returns, Withdrawal rate, Life expectancy
  - Real-time recalculation with debounce

- [ ] **What-if analyzer**
  - Quick toggles: "What if I retire 2 years earlier?"
  - Quick toggles: "What if I increase savings by $500/month?"
  - Show immediate impact without saving

---

## IMPLEMENTATION ROADMAP

**Sprint 1-2: Scenarios (Weeks 1-2)**
- Week 1: Scenario.calc.js, ScenarioManager.jsx
- Week 2: ScenarioCompare.jsx, Templates, Testing

**Sprint 3-4: Life Events (Weeks 3-4)**
- Week 3: LifeEvents.calc.js, LifeEvents.jsx, EventBuilder.jsx
- Week 4: Gap.calc.js integration, Dashboard visualization

**Sprint 5-6: Debt Module (Weeks 5-6)**
- Week 5: Debt.calc.js, Debt.jsx, DebtForm.jsx
- Week 6: Gap.calc.js integration, Rename InvestmentsDebt

**Sprint 7-10: Retirement Planning (Weeks 7-10)**
- Week 7: RetirementPlanning.calc.js (basic calculations)
- Week 8: RetirementPlanner.jsx (input/output views)
- Week 9: Two-phase Gap.calc.js (accumulation + decumulation)
- Week 10: Withdrawal strategies, RMDs, Social Security

**Sprint 11-12: Polish (Weeks 11-12)**
- Week 11: Dashboard enhancements, visualizations
- Week 12: Testing, refinement, documentation

---

## TECHNICAL NOTES

### Storage Structure
```javascript
localStorage keys:
- 'profile' (existing)
- 'income' (existing)
- 'expenses' (existing) → add retirementExpenses
- 'taxes' (existing)
- 'investmentsDebt' → rename to 'savingsInvestments'
- 'debts' (NEW) - array of debt objects
- 'scenarios' (NEW) - array of scenario objects
- 'lifeEvents' (NEW) - array of life event objects
- 'retirementPlan' (NEW) - retirement planning inputs
```

### Module Dependencies
```
RetirementPlanning
  ↓ depends on
Gap (two-phase)
  ↓ depends on
Income, Expenses, Taxes, SavingsInvestments, Debts, LifeEvents
  ↓ depends on
PersonalDetails

Scenarios (orchestrator)
  ↓ merges and runs
ALL modules
```

### Calculation Performance
- Current: ~30 years × 12 months = 360 iterations
- With retirement phase: ~60 years × 12 months = 720 iterations
- Consider: Optimization for large projections
- Consider: Web workers for heavy calculations
