# Module Reference Documentation

This directory contains detailed reference documentation for each module in the Finance Project application.

## Quick Reference

**For a comprehensive overview of how all modules interact**, see [DATA-FLOW-MASTER.md](../DATA-FLOW-MASTER.md).

This master reference document provides:
- Complete inputs/outputs table for all modules and their modes
- Net worth impact summary for each module
- Cross-page dependency diagram
- Key formulas and calculations
- Data flow visualization

## Module Overview

The Finance Project is organized into feature modules plus cross-cutting orchestration layers:

1. **Personal Details** - Core user profile information including age, retirement planning, and tax filing status
2. **Income** - Multiple income streams with growth rates, jumps, and equity compensation
3. **Expenses** - Recurring expense categories and one-time expenses with inflation adjustments
4. **Taxes** - Federal, state, and FICA tax calculations with automatic bracket inflation
5. **Investments & Debt** - 401k, investment accounts with growth rates and portfolio allocation
6. **Property** - Home ownership (Own/Buy modes), mortgage amortization, and equity tracking
7. **Gap/Net Worth** - Integrated cash flow analysis and net worth projections over time
8. **Dashboard** - Runs all calculators and renders summary tabs for projections
9. **Scenarios** - Clones/edits full plans and compares projection outcomes
10. **Export** - Generates CSV output from the same projection data the dashboard uses

## Documentation Structure

Each module has documentation in two locations:

- **Alongside code**: `/src/features/[module]/REFERENCE.md` - For developers working directly with the code
- **Centralized docs**: `/docs/modules/[module].md` - For comprehensive reference and learning

## Module Documents

- [Personal Details](./personal-details.md) - Age, retirement, filing status, inflation settings
- [Income](./income.md) - Income streams, growth rates, equity compensation, projections (includes: net worth impact, cross-page dependencies, validation rules)
- [Expenses](./expenses.md) - Mode comparison (Simple vs Detailed), expense categories, one-time expenses, inflation, jumps (includes: net worth impact, cross-page dependencies, validation rules)
- [Taxes](./taxes.md) - Federal, state, FICA calculations with bracket inflation, filing status override (includes: net worth impact, cross-page dependencies, validation rules)
- [Investments & Debt](./investments-debt.md) - Component breakdown (Cash, 401k, Investments), portfolio allocation (includes: net worth impact, cross-page dependencies, validation rules)
- [Property](./property.md) - Mode comparison (None/Own/Buy), home equity, mortgage amortization (includes: net worth impact, cross-page dependencies, validation rules)
- [Gap/Net Worth](./gap-networth.md) - Cash flow analysis, net worth projections, allocation logic, integration of all modules
- [Dashboard](./dashboard.md) - Projection orchestration and tab visualizations
- [Scenarios](./scenarios.md) - Plan cloning, editing, and comparison flow
- [Export](./export.md) - CSV generation pipeline and transformers

## Key Concepts

### Nominal vs Present Value

All projections include both:
- **Nominal values**: Future dollars (inflated)
- **Present values (PV)**: Today's dollars (inflation-adjusted)

### Inflation

- Applied consistently across all modules
- Tax brackets automatically inflate each year
- Expense categories grow at category-specific rates plus optional jumps
- One-time expenses entered in today's dollars

### Data Flow

```
Personal Details → [Profile Settings]
                      ↓
Income → [Projections] ────────────→ Gap Calculation
                      ↓                      ↓
Expenses → [Projections] ──────────→ Tax Calculation → Net Worth
                      ↓                      ↓              ↓
Property → [Home Value, Mortgage] ─→────────┼──────────────┘
                      ↓                      ↓
Investments → [Current Values] ────→ Portfolio Growth
```

### Precision

- All intermediate calculations preserve full precision (no rounding)
- Rounding only applied for display purposes
- Ensures accurate annual totals when aggregating monthly values

## Recent Implementation Notes

### Tax Bracket Inflation (Implemented)
All tax brackets (federal, state, FICA) now automatically inflate based on:
- Year of projection (1, 2, 3, etc.)
- Profile inflation rate setting
- Applies to: bracket minimums, maximums, FICA wage base, Additional Medicare thresholds

### Rounding Precision Fix (Implemented)
Removed intermediate rounding from Income and Expenses calculations to preserve precision:
- Monthly values stored with full precision
- Annual aggregation now accurate (e.g., $100,000 / 12 * 12 = $100,000)
- Display rounding only in UI components

## Usage

When implementing or modifying features:
1. Consult the relevant module reference
2. Understand field validation rules
3. Review calculation formulas with examples
4. Check data dependencies between modules
5. Maintain precision in intermediate calculations
6. Apply rounding only at display time
