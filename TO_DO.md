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

## General
- [ ] **Standardize Module naming in CSV export**
  - Current naming is inconsistent:
    - Income (singular)
    - Expenses (plural)
    - Investments (plural)
    - Taxes (plural)
    - Net_Worth (underscore)
  - Decision needed: All singular or all plural?
  - Recommendation: All plural for consistency (Incomes, Expenses, Investments, Taxes, Net_Worth)
  - OR: All singular (Income, Expense, Investment, Tax, Net_Worth)
  - Affects all transformer files in src/features/export/transformers/
  - Update CSV_EXPORT_ISSUES.md documentation after change
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
    - [ ] **FIX: Company 401k contribution showing as $0** (HIGH PRIORITY)
      - Company 401k values not appearing in CSV export
      - Check data flow from Income → InvestmentsTransformer
      - Verify incomeData is passed correctly to transformer
      - May be missing from Income input or not calculated
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
