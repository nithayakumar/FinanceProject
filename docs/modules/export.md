# Export Module Reference

## Overview
The Export module produces a CSV snapshot of every major projection (income, expenses, taxes, investments, net worth) so users can audit or further model the data. It receives the same hydrated data bundle the Dashboard uses and runs deterministic transformers to emit tidy rows per module.

## Module Architecture
- **Orchestrator:** `src/features/export/CSVExporter.js` validates inputs, merges raw data with projections, runs all transformers, sorts rows by year/month/module, and invokes PapaParse to generate CSV text.
- **Transformers:** Separate files under `src/features/export/transformers/`
  - `IncomeTransformer` – monthly income per stream, with PV and nominal.
  - `ExpensesTransformer` – monthly recurring and one-time expenses.
  - `TaxesTransformer` – annual taxes pulled from Gap projections (federal, state, FICA).
  - `InvestmentsTransformer` – contributions/growth per allocation from Gap results and investment settings.
  - `NetWorthTransformer` – annual balances (cash, investments, 401k) and flows.
- **Download Helpers:** `downloadCSV()` turns the CSV string into a blob + anchor download; `generateFilename()` builds a YYYY-based filename using the profile horizon.

## Module References
- **Required Inputs:** `incomeData`, `expensesData`, `incomeProjections`, `expenseProjections`, `gapProjections`, `investmentsData`, `profile`.
- **Sensor Values:** Uses `profile.inflationRate` and `profile.yearsToRetirement` to compute inflation multipliers and loop lengths identical to the dashboard.
- **Shared Shapes:** The orchestrator mirrors the Dashboard's merge pattern by attaching `projections` arrays to raw income/expense inputs before passing them to transformers.

## Transformation & Calculation Logic
Each transformer emits normalized rows with both nominal and PV values. Key calculations include:
- **Inflation Multiplier:** `inflationMultiplier = (1 + inflationRate/100)^(year-1)` stored on every row for traceability.
- **Present Value:** PV fields divide nominal values by the inflation multiplier so the CSV mirrors on-screen PV toggles.
- **Growth Multiplier Notes:** Investment rows include growth multipliers when calculating compounded balances; income/expense rows rely on their source projections, which already apply growth/jumps.

### Example Row (Net Worth Transformer)
For Year 3, Month 12 with net worth $720,000 (PV $680,000) and inflation 2.7%:
```
Year: 3
Month: 12
Module: Net_Worth
Primary_Category: Net_Worth
Subcategory: Total
Value_Type: Balance
Value_Nominal: "720000.00"
Value_PV: "680000.00"
Inflation_Multiplier: "1.05473"
Growth_Multiplier: "N/A"
Notes: "Cash + Investments + 401k"
```

### Export Flow Walkthrough
1. `generateCSVExport(appData)` validates required modules and computes `inflationRate` + `yearsToRetirement`.
2. Runs transformers to generate per-module row arrays.
3. Concatenates and sorts rows by Year → Month → Module for easy post-processing.
4. `Papa.unparse` turns rows into CSV with headers and quoted cells.
5. `downloadCSV(csv, filename)` initiates the browser download with the suggested filename from `generateFilename(profile)`.
