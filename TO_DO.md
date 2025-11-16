# Priority 1

## General
- [ ] Add a % version of the net worth dashboard (a toggle)
- [ ] Add a detailed version of the net worth dashboard (a toggle) where it adds each income stream, expense category, and investment # to the net worth dashboard.
- [ ] Add scenarios comparison (side-by-side)


## Income
- [ ] Validate that individual 401k contributions don't exceed annual limit (considering couples may have 2x the limit)
  - Consider adding a "number of earners" field to Personal Details
  - Check individual401k against (limit * number of earners)
  - Show warning if exceeded

## Investments & Debt
- [ ] Add debt tracking and payoff calculations
- [ ] Model loan payments and interest

## Taxes
- [ ] Add state tax support beyond California
- [ ] Allow custom tax years beyond 2025

## Gap
- [ ] Rename "Gap"
- [ ] Add notifications when cash goes negative
- [ ] Model borrowing/credit when cash is negative

# Priority 2
 Here’s a more detailed playbook for each recommendation—what to inspect and how to execute.

  1) Efficiency: reuse projections for charts/summaries

  - Inspect: src/features/income/Income.calc.js chart prep (round 212-274) and summary (round 279-354); expenses chart/summary in src/features/
    expenses/Expenses.calc.js (round 90-193, 241-275).
  - Do: During the primary 1,200-month projection loop, accumulate per-stream monthly and annual totals (nominal and PV) into a cache keyed by
    streamId and year. Then build chartData/summaries from that cache without re-running growth/jump math.
  - Outcome: Complexity drops to O(months × streams). Fewer filters per year, less recalculation of jump multipliers. Validated by comparing
    before/after totals.

  2) Structure: shared validation/jump helpers

  - Inspect: Income and Expenses validators (validateIncome, validateExpenses), jump handling in both calc files.
  - Do: Create a shared helper (e.g., src/shared/validation.js) with common numeric field checks (required, ≥0, max cap) and with jump-year
    bounds. Create a jump utility to compute cumulative multipliers once per stream/category, reused in projections and summaries.
  - Outcome: Reduced duplication, single place to adjust validation rules, fewer divergence bugs. Add unit-style tests for helpers if test setup
    exists.

  3) Data safety: Home snapshot and storage usage

  - Inspect: src/features/Home.jsx lines 4-35 and storage.load consumers across features (search for storage.load().
  - Do: Add shape guards (ensure income.incomeStreams is an array with numeric fields) and memoize snapshot calculations with useMemo keyed on
    storage versions (e.g., lastModified) or add a useEffect to refresh on localStorageChange. Handle missing data by short-circuiting before math
    to avoid NaN.
  - Outcome: No runtime warnings when partial data exists; stable snapshot display.

  4) Documentation hygiene: single source + freshness

  - Inspect: docs/modules/*.md and src/features/*/REFERENCE.md pairs; README pointers.
  - Do: Pick docs/modules/*.md as canonical. Convert src/features/*/REFERENCE.md to thin “See docs/modules/<name>.md” stubs or generate them from
    templates. Add “Last updated: YYYY-MM-DD” and “Applies to commit: <short SHA>” to each module doc. Add a short “Doc convention” section to
    docs/modules/README.md explaining the canonical source and sync rule.
  - Outcome: Lower drift risk; contributors know where to edit; reviewers can see doc freshness.

  5) UX/docs linkage for export/import

  - Inspect: src/shared/storage.js (exportAll/importAll/clearAll) and src/shared/components/Navigation.jsx (Export Data button placeholder).
  - Do: Wire the Export button to trigger storage.exportAll() and download JSON (use URL.createObjectURL(new Blob(...))). Add an Import affordance
    (file input or drag/drop) gated behind a confirm. Document these flows in README under a “Data portability” section and link to storage.js
    behavior (custom event, lastModified semantics).
  - Outcome: Users can export/import cleanly; docs explain the behavior and caveats (e.g., overwriting localStorage).

## Priority 3
- [ ] Complex: Determine right database structure and implement DB
- [ ] Complex: Implement sharing with a URL








## Calculation Methodology
- [ ] **Move all growth calculations from annual to monthly** -> Or confirm if this is done
  - Currently all growth rates (income, investments, 401k, inflation) are compounded annually
  - Target: Compound growth on a monthly basis for more accurate projections
  - Affects: Income.calc.js, Gap.calc.js, Expenses.calc.js
  - Formula change: `Math.pow(1 + rate/100, years)` → `Math.pow(1 + rate/1200, months)`
  - Note: This will provide more accurate month-to-month projections
