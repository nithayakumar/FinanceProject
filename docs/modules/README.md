# Module Reference Documentation

This directory contains detailed reference documentation for each module in the Finance Project application.

## Module Overview

The Finance Project is organized into six main modules:

1. **Personal Details** - Core user profile information including age, retirement planning, and tax filing status
2. **Income** - Multiple income streams with growth rates, jumps, and equity compensation
3. **Expenses** - Recurring expense categories and one-time expenses with inflation adjustments
4. **Taxes** - Federal, state, and FICA tax calculations with automatic bracket inflation
5. **Investments & Debt** - 401k, investment accounts with growth rates and portfolio allocation
6. **Gap/Net Worth** - Integrated cash flow analysis and net worth projections over time

## Documentation Structure

Each module has documentation in two locations:

- **Alongside code**: `/src/features/[module]/REFERENCE.md` - For developers working directly with the code
- **Centralized docs**: `/docs/modules/[module].md` - For comprehensive reference and learning

## Module Documents

- [Personal Details](./personal-details.md) - Age, retirement, filing status, inflation settings
- [Income](./income.md) - Income streams, growth rates, equity compensation, projections
- [Expenses](./expenses.md) - Expense categories, one-time expenses, inflation, jumps
- [Taxes](./taxes.md) - Federal, state, FICA calculations with bracket inflation
- [Investments & Debt](./investments-debt.md) - 401k, investment accounts, portfolio allocation
- [Gap/Net Worth](./gap-networth.md) - Cash flow analysis, net worth projections, allocation logic

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
Income → [Projections] ────→ Gap Calculation
                      ↓              ↓
Expenses → [Projections] ──→ Tax Calculation → Net Worth
                      ↓              ↓
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
