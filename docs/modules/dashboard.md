# Dashboard Module Reference

## Overview
The Dashboard module is the consolidation layer that runs all projections and renders summary tabs for net worth, income, expenses, and retirement readiness. It pulls saved data from localStorage, invokes the calculation engines, and keeps the dashboard in sync when any upstream module changes.

## Module Architecture
- **Entry Component:** `src/features/dashboard/Dashboard.jsx` orchestrates load/validate steps, runs calculators, and hands results to tab components.
- **Tabs:** `NetWorthTab.jsx`, `IncomeTab.jsx`, `ExpensesTab.jsx`, and `RetirementTab.jsx` consume the precomputed projections to show charts, milestone cards, and breakdowns. Tabs are switched via local state (`activeTab`).
- **Data Refresh:** A `refreshTrigger` state value increments when storage changes (native `storage` events and custom `localStorageChange` events), forcing a full recompute. A `dashboardLastViewed` timestamp prevents stale data when navigating away.
- **Exports:** `ExportButton` mounts in the header and hands the dashboard data bundle to the Export module to generate a CSV.

## Module References
- **Consumes:** Profile data from `personal-details`, income projections from `income`, expense projections from `expenses`, investment/401k settings from `investments-debt`, and the Gap calculator (`gap/Gap.calc`) for downstream net worth.
- **Produces:** The dashboard data bundle `{ profile, incomeData, expensesData, investmentsData, incomeProjections, expenseProjections, gapProjections }`, which is also passed to the Export module.
- **Validation:** Blocks rendering and surfaces errors if any upstream data is missing (profile, income streams, expense categories, or investment cash targets).

## Calculation Flow
1. **Enrich Profile:** Derive `yearsToRetirement` as `retirementAge - age` for consistent horizons.
2. **Income Projections:** `calculateIncomeProjections()` returns monthly projections plus summaries (current year, year 10, lifetime).
3. **Expense Projections:** `calculateExpenseProjections()` mirrors the income shape with recurring, jump, and one-time expenses.
4. **Gap & Net Worth:** `calculateGapProjections()` receives raw income/expense inputs and their projections, allocates surplus/deficit to cash and investments, calls Taxes for each year, and emits annual net worth.

### Example Pipeline
Given profile age 35 → retirement age 65 (`yearsToRetirement = 30`), one income stream ($180k salary, 3% growth), expenses $120k (2.7% growth), and target cash $60k:
- Income calculator builds 360 monthly rows (30 years) and reports Year 1 monthly comp ~$15,000.
- Expenses calculator inflates the $120k base to ~$123,240 in Year 2.
- Gap calculator uses Year 1 values: Gap = $180k - $23k (401k) - Taxes (~$42k) - $120k = -$5k → draws $5k from cash, net worth falls accordingly.
- Dashboard surfaces the Year 1 gap card, the net worth area chart, and the tax-inclusive waterfall without re-running any math in the tab components.

## Output Tabs
- **Net Worth:** Uses `gapProjections` annual rows to show stacked area (cash/investments/401k), milestone waterfall, and a 10-year table with nominal/PV toggle.
- **Income:** Uses `incomeProjections` to show stacked income by stream with milestones for jumps.
- **Expenses:** Uses `expenseProjections` to show category stack plus one-time expense overlays.
- **Retirement:** Highlights retirement-year balances and compares them to spending needs using the already-computed projections.
