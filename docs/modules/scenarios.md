# Scenarios Module Reference

## Overview
The Scenarios module lets users clone the current plan, create blank variants, edit them, and compare alternatives against the active plan. Each scenario is a full copy of profile, income, expenses, and investments data, so calculations are deterministic and module-agnostic.

## Module Architecture
- **Entry:** `src/features/scenarios/Scenarios.jsx` renders `ScenarioManager`.
- **Manager:** `ScenarioManager.jsx` handles loading/saving scenarios from `localStorage` (`scenarios` key), tracks the active "Current Plan", and wires navigation to editors and comparisons.
- **Calculator:** `Scenario.calc.js` owns projection workflows:
  - `getCurrentPlanData()` loads/sanitizes profile/income/expenses/investments from storage.
  - `calculateScenarioProjections()` runs the same calculators as the dashboard (`Income.calc`, `Expenses.calc`, `Gap.calc`) and returns `{ incomeData, expensesData, projections, gapSummary }`.
  - `calculateScenarioSummary()` builds comparison-ready aggregates (avg annual income/expenses/taxes/gap, retirement net worth).
  - `compareScenarios()` computes deltas vs a baseline scenario.
- **Views:** `ScenarioEditor.jsx` (editing a scenario snapshot) and `ScenarioCompare.jsx` (baseline vs alternatives charts/tables) consume calculator outputs.

## Module References
- **Consumes:** All downstream calculators (`income`, `expenses`, `gap`, `taxes`) plus storage helpers.
- **Produces:** Full projection arrays and summary objects that mirror dashboard structures, enabling cross-feature reuse without duplicate logic in the UI layer.
- **Sync with Current Plan:** The active plan is always mirrored into the scenarios list with `isActive: true` and updates whenever profile/income/expenses/investments change.

## Calculation Logic & Examples
Scenarios reuse the base calculators rather than custom math. The flow:
1. Start with complete data object (profile, income, expenses, investments).
2. Run `calculateIncomeProjections(data.income, data.profile)` to obtain monthly incomes.
3. Run `calculateExpenseProjections(data.expenses, data.profile)` for monthly expenses.
4. Pass income + expense projections plus raw stream/category data into `calculateGapProjections(...)` to derive annual gap, taxes, and net worth.
5. Summaries average annual values and pick first/last-year metrics for quick comparison.

### Example: Comparing Two Scenarios
Baseline (Current Plan):
- Avg Annual Income: $220,000
- Avg Annual Expenses: $140,000
- Avg Annual Taxes: $52,000
- Avg Annual Gap: $28,000
- Net Worth at Retirement: $3.1M

Alternative (More conservative spending):
- Avg Annual Income: $220,000 (unchanged)
- Avg Annual Expenses: $120,000
- Avg Annual Taxes: $52,000
- Avg Annual Gap: $48,000
- Net Worth at Retirement: $3.9M

`compareScenarios()` reports:
- `avgAnnualExpenses`: absolute -$20,000 (better), savings rate higher by +9.1 pp.
- `netWorthAtRetirement`: +$800,000 (better).

### Validation
`validateScenarioData()` enforces guardrails before calculation:
- Profile age must be between 18–100; inflation 0–20%.
- Income streams cannot have negative annual income and growth must be between -50% and 50%.
- Aggregate expenses cannot be negative.
