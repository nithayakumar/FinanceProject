# Codebase Simplification Recommendations

The goals are to keep current behavior intact while trimming surface area and better compartmentalizing responsibilities. These changes are additive and can be shipped incrementally.

## 1) Centralize Projection Orchestration
- **Issue:** `Dashboard.jsx`, `CSVExporter.js`, and `Scenario.calc.js` all repeat the same sequence: load profile/income/expenses/investments → run `calculateIncomeProjections` → `calculateExpenseProjections` → `calculateGapProjections`.
- **Action:** Extract a shared `runProjections(dataBundle)` helper (or `useProjections` hook) under `src/lib` that returns `{ incomeProjections, expenseProjections, gapProjections, profile }`. Each caller then only handles UI concerns. This cuts duplicated validation/merge logic and ensures a single source of truth for how projections are stitched together.

## 2) Isolate Storage Concerns
- **Issue:** Storage reads/writes and change-event wiring live inside feature components (Dashboard, Scenarios, individual modules), making each component handle persistence details.
- **Action:** Introduce a lightweight storage service with typed accessors (e.g., `loadProfile()`, `saveIncome()`, `onStorageChange(key, cb)`). Components then import intent-level functions, shrink in size, and reduce risk of inconsistent key names across features.

## 3) Split Oversized Components
- **Issue:** `ScenarioManager.jsx` and `Dashboard.jsx` handle UI rendering, orchestration, dialogs, and navigation in a single file.
- **Action:** Break them into presentational pieces plus small controllers:
  - `ScenarioManager`: extract a `ScenarioList` component and `ConfirmDialog` component; keep data mutations inside a dedicated hook (e.g., `useScenarios()`).
  - `Dashboard`: move validation-empty-state UI to a small `DashboardMissingData` component and loading state to `DashboardLoader`.
  These splits make files composable and reduce re-renders to affected subtrees.

## 4) Normalize Data Shapes at the Edge
- **Issue:** Multiple calculators defensively patch missing arrays/fields (e.g., `income.incomeStreams || []`, `expenses.expenseCategories || []`), and Scenario logic deep-clones blobs in several places.
- **Action:** Add a `normalizeAppData(raw)` function that enforces defaults once (arrays, numbers, computed `yearsToRetirement`). Call it before any calculator/export usage. Calculators can then assume normalized inputs, simplifying function bodies and reducing defensive code.

## 5) Consolidate UI Copy/Labels
- **Issue:** Status banners, continue-button labels, and helper texts repeat across modules with slight variations, bloating component size and risking divergence.
- **Action:** Create a `copy.ts` (or JSON) map keyed by module + state (`notSaved`, `saved`, `cta`) and import these where needed. This shrinks JSX noise and enables future localization without touching feature logic.

## 6) Shared Chart/Data Mappers
- **Issue:** Each tab manually reshapes projections for charts. While fine today, the logic is similar (aggregate by year, slice by stream/category, attach PV toggles).
- **Action:** Add small pure mappers (e.g., `toIncomeChartData`, `toExpenseChartData`, `toNetWorthSeries`) in `src/features/dashboard/charting`. Tabs become declarative consumers, and transformations are reusable for reports/exports with minimal duplication.
